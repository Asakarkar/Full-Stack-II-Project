package com.rankforge.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

public record LeaderboardEntryResponse(
                Long rank,
                UUID studentId,
                UUID userId,
                String username,
                String fullName,
                Long totalPoints) {
        @JsonProperty("displayName")
        public String displayName() {
                return fullName;
        }

        @JsonProperty("points")
        public Long points() {
                return totalPoints;
        }
}
