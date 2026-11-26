package com.rankforge.dto.response;

public record StudentDashboardResponse(
        StudentProfileResponse profile,
        long transactionsCount,
        long totalPointsEarned,
        long totalPointsDeducted,
        long rank,
        long studentCount,
        double percentile,
        Integer rankMovementLast7Days
) {
}
