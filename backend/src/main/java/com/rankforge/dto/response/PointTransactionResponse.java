package com.rankforge.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
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
                Instant createdAt) {
    @JsonProperty("actorId")
    public UUID actorId() {
        return teacherId;
    }

    @JsonProperty("actorName")
    public String actorName() {
        return teacherName;
    }

    @JsonProperty("amount")
    public Integer amount() {
        return deltaPoints != null ? Math.abs(deltaPoints) : 0;
    }

    @JsonProperty("type")
    public String type() {
        return (deltaPoints != null && deltaPoints >= 0) ? "AWARD" : "DEDUCTION";
    }
}
