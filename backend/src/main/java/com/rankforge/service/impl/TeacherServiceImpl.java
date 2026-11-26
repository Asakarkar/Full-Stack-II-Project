package com.rankforge.service.impl;

import com.rankforge.dto.response.PagedResponse;
import com.rankforge.dto.response.StudentProfileResponse;
import com.rankforge.dto.response.TeacherDashboardResponse;
import com.rankforge.entity.StudentProfile;
import com.rankforge.exception.BadRequestException;
import com.rankforge.mapper.StudentProfileMapper;
import com.rankforge.repository.PointTransactionRepository;
import com.rankforge.repository.StudentProfileRepository;
import com.rankforge.service.TeacherService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

@Service
public class TeacherServiceImpl implements TeacherService {

    private final StudentProfileRepository studentProfileRepository;
    private final PointTransactionRepository pointTransactionRepository;
    private final StudentProfileMapper studentProfileMapper;

    public TeacherServiceImpl(StudentProfileRepository studentProfileRepository,
            PointTransactionRepository pointTransactionRepository,
            StudentProfileMapper studentProfileMapper) {
        this.studentProfileRepository = studentProfileRepository;
        this.pointTransactionRepository = pointTransactionRepository;
        this.studentProfileMapper = studentProfileMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public TeacherDashboardResponse getDashboard() {
        long totalStudents = studentProfileRepository.count();
        long totalPointsDistributed = pointTransactionRepository.sumAllAwardedPoints();
        long totalTransactions = pointTransactionRepository.count();

        Instant startOfToday = LocalDate.now(ZoneOffset.UTC).atStartOfDay().toInstant(ZoneOffset.UTC);
        long todayTransactions = pointTransactionRepository.countSince(startOfToday);
        long todayAwardedPoints = pointTransactionRepository.sumAwardedSince(startOfToday);
        long todayDeductedPoints = pointTransactionRepository.sumDeductedSince(startOfToday);

        return new TeacherDashboardResponse(
                totalStudents,
                totalPointsDistributed,
                totalTransactions,
                todayTransactions,
                todayAwardedPoints,
                todayDeductedPoints);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<StudentProfileResponse> searchStudents(String search, int page, int size, String sort) {
        if (page < 0) {
            throw new BadRequestException("Page index cannot be negative");
        }
        if (size < 1 || size > 100) {
            throw new BadRequestException("Page size must be between 1 and 100");
        }

        Pageable pageable = PageRequest.of(page, size,
                Sort.by(Sort.Direction.DESC, "totalPoints").and(Sort.by(Sort.Direction.ASC, "id")));
        String normalizedSearch = (search != null && !search.isBlank()) ? search.trim() : null;

        Page<StudentProfile> studentPage = studentProfileRepository.searchStudents(normalizedSearch, pageable);

        Page<StudentProfileResponse> responsePage = studentPage.map(profile -> {
            long rank = studentProfileRepository.countCompetitionRank(profile.getTotalPoints());
            return studentProfileMapper.toResponse(profile, rank);
        });

        return PagedResponse.from(responsePage);
    }
}
