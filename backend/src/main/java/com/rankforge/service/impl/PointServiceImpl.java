package com.rankforge.service.impl;

import com.rankforge.config.AppProperties;
import com.rankforge.dto.request.PointAdjustmentRequest;
import com.rankforge.dto.response.PointTransactionResponse;
import com.rankforge.entity.Role;
import com.rankforge.entity.User;
import com.rankforge.exception.BadRequestException;
import com.rankforge.exception.ForbiddenException;
import com.rankforge.service.PointService;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class PointServiceImpl implements PointService {

    private static final int MAX_OPTIMISTIC_LOCK_RETRIES = 12;

    private final PointAdjustmentExecutor pointAdjustmentExecutor;
    private final AppProperties appProperties;

    public PointServiceImpl(PointAdjustmentExecutor pointAdjustmentExecutor,
                            AppProperties appProperties) {
        this.pointAdjustmentExecutor = pointAdjustmentExecutor;
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

        for (int attempt = 1; attempt <= MAX_OPTIMISTIC_LOCK_RETRIES; attempt++) {
            try {
                return pointAdjustmentExecutor.executePointAdjustment(studentId, teacher, request.points(), request.reason());
            } catch (OptimisticLockingFailureException ex) {
                if (attempt == MAX_OPTIMISTIC_LOCK_RETRIES) {
                    throw ex;
                }
                try {
                    // Exponential backoff with jitter to resolve concurrent lock contention
                    long backoff = 10L + (long) (Math.random() * 20L * (1 << Math.min(attempt, 4)));
                    Thread.sleep(backoff);
                } catch (InterruptedException ignored) {
                    Thread.currentThread().interrupt();
                }
            }
        }

        throw new OptimisticLockingFailureException("Failed to update points after concurrent modification attempts");
    }
}
