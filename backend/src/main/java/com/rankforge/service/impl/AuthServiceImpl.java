package com.rankforge.service.impl;

import com.rankforge.config.AppProperties;
import com.rankforge.dto.request.LoginRequest;
import com.rankforge.dto.request.RegisterRequest;
import com.rankforge.dto.response.AuthResponse;
import com.rankforge.dto.response.UserResponse;
import com.rankforge.entity.Role;
import com.rankforge.entity.StudentProfile;
import com.rankforge.entity.User;
import com.rankforge.exception.ApiException;
import com.rankforge.exception.BadRequestException;
import com.rankforge.exception.ConflictException;
import com.rankforge.exception.ForbiddenException;
import com.rankforge.mapper.UserMapper;
import com.rankforge.repository.StudentProfileRepository;
import com.rankforge.repository.UserRepository;
import com.rankforge.security.JwtService;
import com.rankforge.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final UserMapper userMapper;
    private final AppProperties appProperties;

    public AuthServiceImpl(UserRepository userRepository,
            StudentProfileRepository studentProfileRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            UserMapper userMapper,
            AppProperties appProperties) {
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.userMapper = userMapper;
        this.appProperties = appProperties;
    }

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        validatePasswordBytes(request.password());

        String normalizedEmail = request.email().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new ConflictException("An account with email " + request.email() + " already exists");
        }

        String normalizedUsername = request.username().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByAccountUsername(normalizedUsername)) {
            throw new ConflictException("The username " + normalizedUsername + " is already taken");
        }

        Role assignedRole = request.role() != null ? request.role() : Role.STUDENT;

        // Security control: Public registration defaults to STUDENT accounts.
        // Unrestricted TEACHER registration creates severe privilege escalation risks,
        // allowing unauthorized users to award arbitrary points, manipulate ranks, and
        // view
        // private records. Therefore, a valid administrative invitation code is
        // strictly required.
        if (assignedRole == Role.TEACHER) {
            String requiredCode = appProperties.getTeacher().getInvitationCode();
            if (request.invitationCode() == null || !request.invitationCode().equals(requiredCode)) {
                throw new ForbiddenException(
                        "Invalid or missing teacher invitation code. Teacher accounts cannot be self-registered without administrative authorization.");
            }
        }

        String passwordHash = passwordEncoder.encode(request.password());
        User user = new User(normalizedUsername, request.fullName(), normalizedEmail, passwordHash, assignedRole);
        User savedUser = userRepository.save(user);

        if (assignedRole == Role.STUDENT) {
            StudentProfile profile = new StudentProfile(savedUser);
            studentProfileRepository.save(profile);
        }

        String token = jwtService.generateToken(savedUser);
        return new AuthResponse(token, "Bearer", jwtService.getExpirationSeconds(), userMapper.toResponse(savedUser));
    }

    @Override
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        if (request.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        String normalizedEmail = request.email().trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        String token = jwtService.generateToken(user);
        return new AuthResponse(token, "Bearer", jwtService.getExpirationSeconds(), userMapper.toResponse(user));
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(User currentUser) {
        if (currentUser == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication is required");
        }
        return userMapper.toResponse(currentUser);
    }

    private void validatePasswordBytes(String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new BadRequestException("Password must not exceed 72 UTF-8 bytes");
        }
    }
}
