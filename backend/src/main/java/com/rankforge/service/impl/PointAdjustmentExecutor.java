package com.rankforge.service.impl;

import com.rankforge.dto.response.PointTransactionResponse;
import com.rankforge.entity.PointTransaction;
import com.rankforge.entity.StudentProfile;
import com.rankforge.entity.User;
import com.rankforge.exception.BadRequestException;
import com.rankforge.exception.InsufficientPointsException;
import com.rankforge.exception.ResourceNotFoundException;
import com.rankforge.mapper.PointTransactionMapper;
import com.rankforge.repository.PointTransactionRepository;
import com.rankforge.repository.StudentProfileRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Component
public class PointAdjustmentExecutor {

    private final StudentProfileRepository studentProfileRepository;
    private final PointTransactionRepository pointTransactionRepository;
    private final PointTransactionMapper pointTransactionMapper;

    public PointAdjustmentExecutor(StudentProfileRepository studentProfileRepository,
            PointTransactionRepository pointTransactionRepository,
            PointTransactionMapper pointTransactionMapper) {
        this.studentProfileRepository = studentProfileRepository;
        this.pointTransactionRepository = pointTransactionRepository;
        this.pointTransactionMapper = pointTransactionMapper;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public PointTransactionResponse executePointAdjustment(UUID studentId, User teacher, int deltaPoints,
            String reason) {
        StudentProfile student = studentProfileRepository.findWithUserById(studentId)
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
        studentProfileRepository.saveAndFlush(student);

        PointTransaction transaction = new PointTransaction(student, teacher, deltaPoints, reason);
        PointTransaction savedTransaction = pointTransactionRepository.saveAndFlush(transaction);

        return pointTransactionMapper.toResponse(savedTransaction);
    }
}
