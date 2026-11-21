package com.rankforge.service.impl;

import com.rankforge.config.AppProperties;
import com.rankforge.dto.request.PointAdjustmentRequest;
import com.rankforge.dto.response.PointTransactionResponse;
import com.rankforge.entity.PointTransaction;
import com.rankforge.entity.Role;
import com.rankforge.entity.StudentProfile;
import com.rankforge.entity.User;
import com.rankforge.exception.BadRequestException;
import com.rankforge.exception.ForbiddenException;
import com.rankforge.exception.InsufficientPointsException;
import com.rankforge.exception.ResourceNotFoundException;
import com.rankforge.mapper.PointTransactionMapper;
import com.rankforge.repository.PointTransactionRepository;
import com.rankforge.repository.StudentProfileRepository;
import com.rankforge.service.PointService;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class PointServiceImpl implements PointService {

    private static final int MAX_OPTIMISTIC_LOCK_RETRIES = 3;

    private final StudentProfileRepository studentProfileRepository;
    private final PointTransactionRepository pointTransactionRepository;
    private final PointTransactionMapper pointTransactionMapper;
    private final AppProperties appProperties;

    public PointServiceImpl(StudentProfileRepository studentProfileRepository,
                            PointTransactionRepository pointTransactionRepository,
                            PointTransactionMapper pointTransactionMapper,
                            AppProperties appProperties) {
        this.studentProfileRepository = studentProfileRepository;
        this.pointTransactionRepository = pointTransactionRepository;
        this.pointTransactionMapper = pointTransactionMapper;
        this.appProperties = appProperties;
    }

    @Override
    public PointTransactionResponse adjustPoints(UUID studentId, User teacher, PointAdjustmentRequest request) {
        if (teacher.getRole() != Role.TEACHER) {
            throw new ForbiddenException("Only teachers are authorized to award or deduct student points");
        }

        if (request.points() == null || request.points() == 0) {
            throw new BadRequestException("Point adjustment delta cannot be zero");
        }

        int maxLimit = appProperties.getPoints().getMaxPerTransaction();
        if (Math.abs(request.points()) > maxLimit) {
            throw new BadRequestException("Point adjustment delta of " + request.points() +
                    " exceeds the maximum permitted limit of " + maxLimit + " points per transaction");
        }

        // Handle concurrent updates safely using optimistic locking with retry mechanism
        for (int attempt = 1; attempt <= MAX_OPTIMISTIC_LOCK_RETRIES; attempt++) {
            try {
                return executePointAdjustment(studentId, teacher, request.points(), request.reason());
            } catch (OptimisticLockingFailureException ex) {
                if (attempt == MAX_OPTIMISTIC_LOCK_RETRIES) {
                    throw ex;
                }
                // Short backoff before retrying
                try {
                    Thread.sleep(20L * attempt);
                } catch (InterruptedException ignored) {
                    Thread.currentThread().interrupt();
                }
            }
        }

        throw new OptimisticLockingFailureException("Failed to update points after concurrent modification attempts");
    }

    @Transactional
    public PointTransactionResponse executePointAdjustment(UUID studentId, User teacher, int deltaPoints, String reason) {
        StudentProfile student = studentProfileRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + studentId));

        long currentBalance = student.getTotalPoints();
        long newBalance;
        try {
            newBalance = Math.addExact(currentBalance, (long) deltaPoints);
        } catch (ArithmeticException e) {
            throw new BadRequestException("Point calculation resulted in an arithmetic overflow");
        }

        if (newBalance < 0) {
            throw new InsufficientPointsException("Insufficient points balance. Deducting " +
                    Math.abs(deltaPoints) + " points would result in a negative balance (" +
                    newBalance + "). Current balance is " + currentBalance + ".");
        }

        student.setTotalPoints(newBalance);
        studentProfileRepository.save(student);

        PointTransaction transaction = new PointTransaction(student, teacher, deltaPoints, reason);
        PointTransaction savedTransaction = pointTransactionRepository.save(transaction);

        return pointTransactionMapper.toResponse(savedTransaction);
    }
}
