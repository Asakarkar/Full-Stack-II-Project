package com.rankforge.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
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
                Instant updatedAt) {
    @JsonProperty("displayName")
    public String displayName() {
        return fullName;
    }

    @JsonProperty("pointsBalance")
    public Long pointsBalance() {
        return totalPoints;
    }
}
