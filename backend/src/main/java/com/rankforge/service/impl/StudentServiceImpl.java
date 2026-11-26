package com.rankforge.service.impl;

import com.rankforge.dto.response.PagedResponse;
import com.rankforge.dto.response.PointTransactionResponse;
import com.rankforge.dto.response.StudentProfileResponse;
import com.rankforge.entity.PointTransaction;
import com.rankforge.entity.Role;
import com.rankforge.entity.StudentProfile;
import com.rankforge.entity.User;
import com.rankforge.exception.BadRequestException;
import com.rankforge.exception.ForbiddenException;
import com.rankforge.exception.ResourceNotFoundException;
import com.rankforge.mapper.PointTransactionMapper;
import com.rankforge.mapper.StudentProfileMapper;
import com.rankforge.repository.PointTransactionRepository;
import com.rankforge.repository.StudentProfileRepository;
import com.rankforge.service.StudentService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class StudentServiceImpl implements StudentService {

    private final StudentProfileRepository studentProfileRepository;
    private final PointTransactionRepository pointTransactionRepository;
    private final StudentProfileMapper studentProfileMapper;
    private final PointTransactionMapper pointTransactionMapper;

    public StudentServiceImpl(StudentProfileRepository studentProfileRepository,
            PointTransactionRepository pointTransactionRepository,
            StudentProfileMapper studentProfileMapper,
            PointTransactionMapper pointTransactionMapper) {
        this.studentProfileRepository = studentProfileRepository;
        this.pointTransactionRepository = pointTransactionRepository;
        this.studentProfileMapper = studentProfileMapper;
        this.pointTransactionMapper = pointTransactionMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public StudentProfileResponse getMyProfile(User currentUser) {
        StudentProfile profile = studentProfileRepository.findByUserId(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Student profile not found for user: " + currentUser.getEmail()));

        long rank = studentProfileRepository.countDeterministicRank(profile.getTotalPoints(), profile.getId());
        return studentProfileMapper.toResponse(profile, rank);
    }

    @Override
    @Transactional(readOnly = true)
    public StudentProfileResponse getStudentById(UUID studentId, User currentUser) {
        validateAccessToStudentData(studentId, currentUser);

        StudentProfile profile = studentProfileRepository.findWithUserById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + studentId));

        long rank = studentProfileRepository.countDeterministicRank(profile.getTotalPoints(), profile.getId());
        return studentProfileMapper.toResponse(profile, rank);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<PointTransactionResponse> getStudentTransactions(UUID studentId, int page, int size,
            User currentUser) {
        validateAccessToStudentData(studentId, currentUser);

        if (page < 0) {
            throw new BadRequestException("Page index cannot be negative");
        }
        if (size < 1 || size > 100) {
            throw new BadRequestException("Page size must be between 1 and 100");
        }

        if (!studentProfileRepository.existsById(studentId)) {
            throw new ResourceNotFoundException("Student not found with ID: " + studentId);
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<PointTransaction> transactions = pointTransactionRepository.findByStudentId(studentId, pageable);

        Page<PointTransactionResponse> responsePage = transactions.map(pointTransactionMapper::toResponse);
        return PagedResponse.from(responsePage);
    }

    @Override
    @Transactional(readOnly = true)
    public com.rankforge.dto.response.StudentDashboardResponse getStudentDashboard(User currentUser) {
        StudentProfile profile = studentProfileRepository.findByUserId(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Student profile not found for user: " + currentUser.getEmail()));

        long rank = studentProfileRepository.countCompetitionRank(profile.getTotalPoints());
        long studentCount = studentProfileRepository.count();
        long transactionsCount = pointTransactionRepository.countByStudentId(profile.getId());
        long totalPointsEarned = pointTransactionRepository.sumAwardedByStudentId(profile.getId());
        long totalPointsDeducted = pointTransactionRepository.sumDeductedByStudentId(profile.getId());

        double percentile = studentCount <= 1
                ? 100.0
                : Math.round((100.0 * (studentCount - rank) / (studentCount - 1)) * 10.0) / 10.0;

        StudentProfileResponse profileResponse = studentProfileMapper.toResponse(profile, rank);
        return new com.rankforge.dto.response.StudentDashboardResponse(
                profileResponse,
                transactionsCount,
                totalPointsEarned,
                totalPointsDeducted,
                rank,
                studentCount,
                percentile,
                null);
    }

    @Override
    @Transactional(readOnly = true)
    public com.rankforge.dto.response.StudentAnalyticsResponse getStudentAnalytics(User currentUser) {
        StudentProfile profile = studentProfileRepository.findByUserId(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found for user: " + currentUser.getEmail()));

        long earned = pointTransactionRepository.sumAwardedByStudentId(profile.getId());
        long deducted = pointTransactionRepository.sumDeductedByStudentId(profile.getId());
        long transactionCount = pointTransactionRepository.countByStudentId(profile.getId());
        java.time.Instant to = java.time.Instant.now();
        java.time.Instant from = to.minus(30, java.time.temporal.ChronoUnit.DAYS);

        return new com.rankforge.dto.response.StudentAnalyticsResponse(
                from,
                to,
                earned,
                deducted,
                earned - deducted,
                transactionCount
        );
    }

    private void validateAccessToStudentData(UUID studentId, User currentUser) {
        // Teacher has permission to view any student's data.
        if (currentUser.getRole() == Role.TEACHER) {
            return;
        }

        // Student can only access their own private data.
        StudentProfile currentStudent = studentProfileRepository.findByUserId(currentUser.getId())
                .orElseThrow(() -> new ForbiddenException("Authenticated user does not have a student profile"));

        if (!currentStudent.getId().equals(studentId)) {
            throw new ForbiddenException(
                    "Access denied: You are not authorized to view another student's private data");
        }
    }
}
