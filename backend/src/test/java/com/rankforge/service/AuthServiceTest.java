package com.rankforge.service;

import com.rankforge.config.AppProperties;
import com.rankforge.dto.request.LoginRequest;
import com.rankforge.dto.request.RegisterRequest;
import com.rankforge.dto.response.AuthResponse;
import com.rankforge.entity.Role;
import com.rankforge.entity.StudentProfile;
import com.rankforge.entity.User;
import com.rankforge.exception.ApiException;
import com.rankforge.exception.ConflictException;
import com.rankforge.exception.ForbiddenException;
import com.rankforge.mapper.UserMapper;
import com.rankforge.repository.StudentProfileRepository;
import com.rankforge.repository.UserRepository;
import com.rankforge.security.JwtService;
import com.rankforge.service.impl.AuthServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private StudentProfileRepository studentProfileRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    private UserMapper userMapper;
    private AppProperties appProperties;
    private AuthServiceImpl authService;

    @BeforeEach
    void setUp() {
        userMapper = new UserMapper();
        appProperties = new AppProperties();
        appProperties.getTeacher().setInvitationCode("SECRET-TEACHER-CODE-123");

        authService = new AuthServiceImpl(
                userRepository,
                studentProfileRepository,
                passwordEncoder,
                jwtService,
                userMapper,
                appProperties
        );
    }

    @Test
    @DisplayName("Successfully registers student and creates associated student profile with 0 points")
    void registerStudentSuccess() {
        RegisterRequest request = new RegisterRequest("Student Alpha", "student.alpha@example.com", "Password123!", Role.STUDENT, null);

        when(userRepository.existsByEmail("student.alpha@example.com")).thenReturn(false);
        when(passwordEncoder.encode("Password123!")).thenReturn("encodedHash123");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtService.generateToken(any(User.class))).thenReturn("jwt-token-xyz");
        when(jwtService.getExpirationSeconds()).thenReturn(3600L);

        AuthResponse response = authService.register(request);

        assertNotNull(response);
        assertEquals("jwt-token-xyz", response.accessToken());
        assertEquals("Bearer", response.tokenType());
        assertEquals("student.alpha@example.com", response.user().email());
        assertEquals(Role.STUDENT, response.user().role());

        verify(userRepository).save(any(User.class));
        verify(studentProfileRepository).save(any(StudentProfile.class));
    }

    @Test
    @DisplayName("Successfully registers teacher with valid administrative invitation code")
    void registerTeacherSuccessWithValidCode() {
        RegisterRequest request = new RegisterRequest("Teacher Beta", "teacher.beta@example.com", "Password123!", Role.TEACHER, "SECRET-TEACHER-CODE-123");

        when(userRepository.existsByEmail("teacher.beta@example.com")).thenReturn(false);
        when(passwordEncoder.encode("Password123!")).thenReturn("encodedHash123");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtService.generateToken(any(User.class))).thenReturn("jwt-teacher-token");
        when(jwtService.getExpirationSeconds()).thenReturn(3600L);

        AuthResponse response = authService.register(request);

        assertNotNull(response);
        assertEquals(Role.TEACHER, response.user().role());
        verify(userRepository).save(any(User.class));
        // Teachers do not have student profiles created
        verify(studentProfileRepository, never()).save(any(StudentProfile.class));
    }

    @Test
    @DisplayName("Rejects teacher registration when invitation code is invalid or missing")
    void registerTeacherFailsWithInvalidCode() {
        RegisterRequest requestWrongCode = new RegisterRequest("Candidate Gamma", "gamma@example.com", "Password123!", Role.TEACHER, "WRONG-CODE");

        assertThrows(ForbiddenException.class, () -> authService.register(requestWrongCode));

        RegisterRequest requestNullCode = new RegisterRequest("Candidate Gamma", "gamma2@example.com", "Password123!", Role.TEACHER, null);
        assertThrows(ForbiddenException.class, () -> authService.register(requestNullCode));

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Rejects registration when email already exists")
    void registerFailsWhenEmailExists() {
        RegisterRequest request = new RegisterRequest("Student Delta", "delta@example.com", "Password123!", Role.STUDENT, null);
        when(userRepository.existsByEmail("delta@example.com")).thenReturn(true);

        assertThrows(ConflictException.class, () -> authService.register(request));
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Login succeeds with valid credentials")
    void loginSuccess() {
        LoginRequest request = new LoginRequest("student.alpha@example.com", "Password123!");
        User user = new User("Student Alpha", "student.alpha@example.com", "hashedPassword", Role.STUDENT);

        when(userRepository.findByEmail("student.alpha@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("Password123!", "hashedPassword")).thenReturn(true);
        when(jwtService.generateToken(user)).thenReturn("jwt-token-abc");
        when(jwtService.getExpirationSeconds()).thenReturn(3600L);

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("jwt-token-abc", response.accessToken());
        assertEquals("student.alpha@example.com", response.user().email());
    }

    @Test
    @DisplayName("Login fails with invalid password")
    void loginFailsWithWrongPassword() {
        LoginRequest request = new LoginRequest("student.alpha@example.com", "WrongPassword!");
        User user = new User("Student Alpha", "student.alpha@example.com", "hashedPassword", Role.STUDENT);

        when(userRepository.findByEmail("student.alpha@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("WrongPassword!", "hashedPassword")).thenReturn(false);

        assertThrows(ApiException.class, () -> authService.login(request));
    }
}
