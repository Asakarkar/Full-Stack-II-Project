package com.rankforge.dto.response;

import java.util.UUID;

public record LeaderboardEntryResponse(
        Long rank,
        UUID studentId,
        UUID userId,
        String fullName,
        Long totalPoints
) {
}


