package com.rankforge.service.impl;

import com.rankforge.dto.response.LeaderboardEntryResponse;
import com.rankforge.dto.response.PagedResponse;
import com.rankforge.dto.response.PointTransactionResponse;
import com.rankforge.entity.PointTransaction;
import com.rankforge.entity.StudentProfile;
import com.rankforge.entity.User;
import com.rankforge.exception.BadRequestException;
import com.rankforge.exception.ResourceNotFoundException;
import com.rankforge.mapper.PointTransactionMapper;
import com.rankforge.mapper.StudentProfileMapper;
import com.rankforge.repository.PointTransactionRepository;
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

    private static final Set<String> WHITELISTED_SORT_FIELDS = Set.of(
            "totalPoints", "points", "total_points", "id", "displayName", "name", "fullName", "createdAt", "grade");

    private final StudentProfileRepository studentProfileRepository;
    private final StudentProfileMapper studentProfileMapper;
    private final PointTransactionRepository pointTransactionRepository;
    private final PointTransactionMapper pointTransactionMapper;

    public LeaderboardServiceImpl(StudentProfileRepository studentProfileRepository,
                                  StudentProfileMapper studentProfileMapper,
                                  PointTransactionRepository pointTransactionRepository,
                                  PointTransactionMapper pointTransactionMapper) {
        this.studentProfileRepository = studentProfileRepository;
        this.studentProfileMapper = studentProfileMapper;
        this.pointTransactionRepository = pointTransactionRepository;
        this.pointTransactionMapper = pointTransactionMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<LeaderboardEntryResponse> getLeaderboard(int page, int size, String direction,
            String sortField) {
        if (page < 0) {
            throw new BadRequestException("Page index cannot be negative");
        }
        if (size < 1 || size > 100) {
            throw new BadRequestException("Page size must be between 1 and 100");
        }

        String rawField = (sortField == null || sortField.isBlank()) ? "totalPoints" : sortField.trim();
        String inlineDirection = null;
        if (rawField.contains(",")) {
            String[] parts = rawField.split(",", 2);
            rawField = parts[0].trim();
            if (parts.length > 1 && !parts[1].isBlank()) {
                inlineDirection = parts[1].trim();
            }
        }

        final String fieldToCheck = rawField;
        boolean isWhitelisted = WHITELISTED_SORT_FIELDS.stream()
                .anyMatch(wf -> wf.equalsIgnoreCase(fieldToCheck));
        if (!isWhitelisted) {
            throw new BadRequestException(
                    "Invalid sort field: '" + sortField + "'. Whitelisted fields are: " + WHITELISTED_SORT_FIELDS);
        }

        String effectiveDirection = (direction != null && !direction.isBlank())
                ? direction.trim()
                : (inlineDirection != null ? inlineDirection : "DESC");

        Sort.Direction sortDirection;
        try {
            sortDirection = Sort.Direction.valueOf(effectiveDirection.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException(
                    "Invalid sort direction: '" + effectiveDirection + "'. Allowed values are: ASC, DESC");
        }

        // Leaderboard sorts totalPoints DESC by default, breaking ties by immutable
        // student UUID ASC
        Sort sort;
        if ("totalPoints".equalsIgnoreCase(rawField) || "points".equalsIgnoreCase(rawField)
                || "total_points".equalsIgnoreCase(rawField) || "grade".equalsIgnoreCase(rawField)) {
            sort = Sort.by(new Sort.Order(sortDirection, "totalPoints"), new Sort.Order(Sort.Direction.ASC, "id"));
        } else if ("id".equalsIgnoreCase(rawField)) {
            sort = Sort.by(new Sort.Order(sortDirection, "id"));
        } else if ("displayName".equalsIgnoreCase(rawField) || "name".equalsIgnoreCase(rawField)
                || "fullName".equalsIgnoreCase(rawField)) {
            sort = Sort.by(new Sort.Order(sortDirection, "user.fullName"), new Sort.Order(Sort.Direction.ASC, "id"));
        } else if ("createdAt".equalsIgnoreCase(rawField)) {
            sort = Sort.by(new Sort.Order(sortDirection, "createdAt"), new Sort.Order(Sort.Direction.ASC, "id"));
        } else {
            sort = Sort.by(new Sort.Order(sortDirection, "totalPoints"), new Sort.Order(Sort.Direction.ASC, "id"));
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
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Student profile not found for user: " + currentUser.getEmail()));

        long rank = studentProfileRepository.countCompetitionRank(profile.getTotalPoints());
        return studentProfileMapper.toLeaderboardEntry(profile, rank);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<PointTransactionResponse> getRecentActivity(int page, int size) {
        if (page < 0) {
            throw new BadRequestException("Page index cannot be negative");
        }
        if (size < 1 || size > 100) {
            throw new BadRequestException("Page size must be between 1 and 100");
        }
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<PointTransaction> txPage = pointTransactionRepository.findAll(pageable);
        return PagedResponse.from(txPage.map(pointTransactionMapper::toResponse));
    }
}
