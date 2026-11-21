package com.rankforge.service.impl;

import com.rankforge.dto.response.LeaderboardEntryResponse;
import com.rankforge.dto.response.PagedResponse;
import com.rankforge.entity.StudentProfile;
import com.rankforge.entity.User;
import com.rankforge.exception.BadRequestException;
import com.rankforge.exception.ResourceNotFoundException;
import com.rankforge.mapper.StudentProfileMapper;
import com.rankforge.repository.StudentProfileRepository;
import com.rankforge.service.LeaderboardService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
public class LeaderboardServiceImpl implements LeaderboardService {

    private static final Set<String> WHITELISTED_SORT_FIELDS = Set.of("totalPoints", "id");

    private final StudentProfileRepository studentProfileRepository;
    private final StudentProfileMapper studentProfileMapper;

    public LeaderboardServiceImpl(StudentProfileRepository studentProfileRepository,
                                  StudentProfileMapper studentProfileMapper) {
        this.studentProfileRepository = studentProfileRepository;
        this.studentProfileMapper = studentProfileMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<LeaderboardEntryResponse> getLeaderboard(int page, int size, String direction, String sortField) {
        if (page < 0) {
            throw new BadRequestException("Page index cannot be negative");
        }
        if (size < 1 || size > 100) {
            throw new BadRequestException("Page size must be between 1 and 100");
        }

        String field = (sortField == null || sortField.isBlank()) ? "totalPoints" : sortField.trim();
        if (!WHITELISTED_SORT_FIELDS.contains(field)) {
            throw new BadRequestException("Invalid sort field: '" + sortField + "'. Whitelisted fields are: " + WHITELISTED_SORT_FIELDS);
        }

        Sort.Direction sortDirection;
        try {
            sortDirection = (direction == null || direction.isBlank())
                    ? Sort.Direction.DESC
                    : Sort.Direction.valueOf(direction.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid sort direction: '" + direction + "'. Allowed values are: ASC, DESC");
        }

        // Leaderboard sorts totalPoints DESC by default, breaking ties by immutable student UUID ASC
        Sort sort;
        if ("totalPoints".equals(field)) {
            sort = Sort.by(new Sort.Order(sortDirection, "totalPoints"), new Sort.Order(Sort.Direction.ASC, "id"));
        } else {
            sort = Sort.by(new Sort.Order(sortDirection, "id"));
        }

        Pageable pageable = PageRequest.of(page, size, sort);
        Page<StudentProfile> profilePage = studentProfileRepository.findAllWithUser(pageable);

        List<LeaderboardEntryResponse> entries = new ArrayList<>(profilePage.getNumberOfElements());
        for (StudentProfile profile : profilePage.getContent()) {
            long competitionRank = studentProfileRepository.countCompetitionRank(profile.getTotalPoints());
            entries.add(studentProfileMapper.toLeaderboardEntry(profile, competitionRank));
        }

        Page<LeaderboardEntryResponse> responsePage = new PageImpl<>(entries, pageable, profilePage.getTotalElements());
        return PagedResponse.from(responsePage);
    }

    @Override
    @Transactional(readOnly = true)
    public LeaderboardEntryResponse getMyRank(User currentUser) {
        StudentProfile profile = studentProfileRepository.findByUserId(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found for user: " + currentUser.getEmail()));

        long rank = studentProfileRepository.countCompetitionRank(profile.getTotalPoints());
        return studentProfileMapper.toLeaderboardEntry(profile, rank);
    }
}
