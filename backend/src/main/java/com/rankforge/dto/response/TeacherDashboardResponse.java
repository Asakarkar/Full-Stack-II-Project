package com.rankforge.dto.response;

public record TeacherDashboardResponse(
        long totalStudents,
        long totalPointsDistributed,
        long totalTransactions,
        long todayTransactions,
        long todayAwardedPoints,
        long todayDeductedPoints
) {
}
