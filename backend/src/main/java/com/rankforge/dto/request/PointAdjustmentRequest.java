package com.rankforge.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PointAdjustmentRequest(
        @NotNull(message = "Points value is required")
        @Min(value = -10000, message = "Point deduction cannot exceed 10000 points per transaction")
        @Max(value = 10000, message = "Point award cannot exceed 10000 points per transaction")
        Integer points,

        @NotBlank(message = "Reason is required")
        @Size(min = 3, max = 500, message = "Reason must be between 3 and 500 characters")
        String reason
) {
}
