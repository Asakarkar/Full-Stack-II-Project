package com.rankforge.mapper;

import com.rankforge.dto.response.LeaderboardEntryResponse;
import com.rankforge.dto.response.StudentProfileResponse;
import com.rankforge.entity.StudentProfile;
import org.springframework.stereotype.Component;

@Component
public class StudentProfileMapper {

    public StudentProfileResponse toResponse(StudentProfile profile, Long rank) {
        if (profile == null) {
            return null;
        }
        return new StudentProfileResponse(
                profile.getId(),
                profile.getUser() != null ? profile.getUser().getId() : null,
                profile.getUser() != null ? profile.getUser().getFullName() : null,
                profile.getUser() != null ? profile.getUser().getEmail() : null,
                profile.getTotalPoints(),
                rank,
                profile.getCreatedAt(),
                profile.getUpdatedAt()
        );
    }

    public LeaderboardEntryResponse toLeaderboardEntry(StudentProfile profile, Long rank) {
        if (profile == null) {
            return null;
        }
        return new LeaderboardEntryResponse(
                rank,
                profile.getId(),
                profile.getUser() != null ? profile.getUser().getId() : null,
                profile.getUser() != null ? profile.getUser().getFullName() : null,
                profile.getTotalPoints()
        );
    }
}
