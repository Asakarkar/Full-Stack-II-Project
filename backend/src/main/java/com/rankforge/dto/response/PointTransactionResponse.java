package com.rankforge.dto.response;

import java.time.Instant;
import java.util.UUID;

public record PointTransactionResponse(
        UUID id,
        UUID studentId,
        String studentName,
        UUID teacherId,
        String teacherName,
        Integer deltaPoints,
        String reason,
        Instant createdAt
) {
}
