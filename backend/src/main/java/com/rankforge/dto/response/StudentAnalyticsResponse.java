package com.rankforge.dto.response;

import java.time.Instant;

public record StudentAnalyticsResponse(
        Instant from,
        Instant to,
        long earned,
        long deducted,
        long netPoints,
        long transactionCount
) {
}
