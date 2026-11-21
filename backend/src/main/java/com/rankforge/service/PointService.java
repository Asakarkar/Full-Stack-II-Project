package com.rankforge.service;

import com.rankforge.dto.request.PointAdjustmentRequest;
import com.rankforge.dto.response.PointTransactionResponse;
import com.rankforge.entity.User;

import java.util.UUID;

public interface PointService {
    PointTransactionResponse adjustPoints(UUID studentId, User teacher, PointAdjustmentRequest request);
}
