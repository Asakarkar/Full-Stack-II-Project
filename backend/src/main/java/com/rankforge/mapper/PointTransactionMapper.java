package com.rankforge.mapper;

import com.rankforge.dto.response.PointTransactionResponse;
import com.rankforge.entity.PointTransaction;
import org.springframework.stereotype.Component;

@Component
public class PointTransactionMapper {

    public PointTransactionResponse toResponse(PointTransaction transaction) {
        if (transaction == null) {
            return null;
        }
        String studentName = transaction.getStudent() != null && transaction.getStudent().getUser() != null
                ? transaction.getStudent().getUser().getFullName()
                : "Unknown";

        String teacherName = transaction.getTeacher() != null
                ? transaction.getTeacher().getFullName()
                : "Unknown";

        return new PointTransactionResponse(
                transaction.getId(),
                transaction.getStudent() != null ? transaction.getStudent().getId() : null,
                studentName,
                transaction.getTeacher() != null ? transaction.getTeacher().getId() : null,
                teacherName,
                transaction.getDeltaPoints(),
                transaction.getReason(),
                transaction.getCreatedAt()
        );
    }
}


