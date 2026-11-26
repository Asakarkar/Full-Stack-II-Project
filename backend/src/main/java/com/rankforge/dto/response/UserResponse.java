package com.rankforge.dto.response;

import com.rankforge.entity.Role;

import java.time.Instant;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String fullName,
        String email,
        Role role,
        Instant createdAt,
        Instant updatedAt) {
}
