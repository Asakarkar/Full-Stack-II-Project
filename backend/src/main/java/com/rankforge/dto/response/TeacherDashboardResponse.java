package com.rankforge.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;

public record TeacherDashboardResponse(
        long totalStudents,
        long totalPointsDistributed,
        long totalTransactions,
        long todayTransactions,
        long todayAwardedPoints,
        long todayDeductedPoints
) {
    @JsonProperty("studentCount")
    public long studentCount() {
        return totalStudents;
    }

    @JsonProperty("totalPoints")
    public long totalPoints() {
        return totalPointsDistributed;
    }

    @JsonProperty("transactionsToday")
    public long transactionsToday() {
        return todayTransactions;
    }

    @JsonProperty("pointsAwardedToday")
    public long pointsAwardedToday() {
        return todayAwardedPoints;
    }

    @JsonProperty("pointsDeductedToday")
    public long pointsDeductedToday() {
        return todayDeductedPoints;
    }
}


