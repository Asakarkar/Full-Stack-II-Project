package com.rankforge.dto.response;

import java.time.Instant;
import java.util.UUID;

public record StudentProfileResponse(
        UUID id,
        UUID userId,
        String fullName,
        String email,
        Long totalPoints,
        Long rank,
        Instant createdAt,
        Instant updatedAt
) {
}


