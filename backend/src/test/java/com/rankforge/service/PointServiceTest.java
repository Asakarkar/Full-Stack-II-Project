package com.rankforge.service;

import com.rankforge.config.AppProperties;
import com.rankforge.dto.request.PointAdjustmentRequest;
import com.rankforge.dto.response.PointTransactionResponse;
import com.rankforge.entity.PointTransaction;
import com.rankforge.entity.Role;
import com.rankforge.entity.StudentProfile;
import com.rankforge.entity.User;
import com.rankforge.exception.BadRequestException;
import com.rankforge.exception.ForbiddenException;
import com.rankforge.exception.InsufficientPointsException;
import com.rankforge.mapper.PointTransactionMapper;
import com.rankforge.repository.PointTransactionRepository;
import com.rankforge.repository.StudentProfileRepository;
import com.rankforge.service.impl.PointServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PointServiceTest {

    @Mock
    private StudentProfileRepository studentProfileRepository;

    @Mock
    private PointTransactionRepository pointTransactionRepository;

    private PointTransactionMapper pointTransactionMapper;
    private AppProperties appProperties;
    private PointServiceImpl pointService;

    private User teacherUser;
    private User studentUser;
    private StudentProfile studentProfile;

    @BeforeEach
    void setUp() {
        pointTransactionMapper = new PointTransactionMapper();
        appProperties = new AppProperties();
        appProperties.getPoints().setMaxPerTransaction(1000);

        pointService = new PointServiceImpl(
                studentProfileRepository,
                pointTransactionRepository,
                pointTransactionMapper,
                appProperties
        );

        teacherUser = new User("Teacher Alpha", "teacher.alpha@example.com", "hash", Role.TEACHER);
        studentUser = new User("Student Beta", "student.beta@example.com", "hash", Role.STUDENT);
        studentProfile = new StudentProfile(studentUser);
        studentProfile.setTotalPoints(50L);
    }

    @Test
    @DisplayName("Teacher can award points, updating total balance and creating transaction")
    void teacherAwardsPointsSuccess() {
        UUID studentId = studentProfile.getId();
        when(studentProfileRepository.findById(studentId)).thenReturn(Optional.of(studentProfile));
        when(pointTransactionRepository.save(any(PointTransaction.class))).thenAnswer(inv -> inv.getArgument(0));

        PointAdjustmentRequest request = new PointAdjustmentRequest(25, "Excellent performance in potions");
        PointTransactionResponse response = pointService.adjustPoints(studentId, teacherUser, request);

        assertNotNull(response);
        assertEquals(75L, studentProfile.getTotalPoints());
        assertEquals(25, response.deltaPoints());
        assertEquals("Excellent performance in potions", response.reason());

        verify(studentProfileRepository).save(studentProfile);
        verify(pointTransactionRepository).save(any(PointTransaction.class));
    }

    @Test
    @DisplayName("Teacher can deduct points when balance is sufficient")
    void teacherDeductsPointsSuccess() {
        UUID studentId = studentProfile.getId();
        when(studentProfileRepository.findById(studentId)).thenReturn(Optional.of(studentProfile));
        when(pointTransactionRepository.save(any(PointTransaction.class))).thenAnswer(inv -> inv.getArgument(0));

        PointAdjustmentRequest request = new PointAdjustmentRequest(-20, "Late assignment submission");
        PointTransactionResponse response = pointService.adjustPoints(studentId, teacherUser, request);

        assertNotNull(response);
        assertEquals(30L, studentProfile.getTotalPoints());
        assertEquals(-20, response.deltaPoints());

        verify(studentProfileRepository).save(studentProfile);
        verify(pointTransactionRepository).save(any(PointTransaction.class));
    }

    @Test
    @DisplayName("Rejects point adjustment when user is not a teacher")
    void nonTeacherCannotAdjustPoints() {
        UUID studentId = studentProfile.getId();
        PointAdjustmentRequest request = new PointAdjustmentRequest(10, "Attempted self-award");

        assertThrows(ForbiddenException.class, () -> pointService.adjustPoints(studentId, studentUser, request));

        verify(studentProfileRepository, never()).save(any());
        verify(pointTransactionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Rejects zero-value point adjustments")
    void rejectsZeroPointAdjustment() {
        UUID studentId = studentProfile.getId();
        PointAdjustmentRequest request = new PointAdjustmentRequest(0, "Zero change");

        assertThrows(BadRequestException.class, () -> pointService.adjustPoints(studentId, teacherUser, request));

        verify(studentProfileRepository, never()).save(any());
        verify(pointTransactionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Rejects point adjustment exceeding maximum transaction limit")
    void rejectsExceedingLimit() {
        UUID studentId = studentProfile.getId();
        PointAdjustmentRequest request = new PointAdjustmentRequest(5000, "Excessive award");

        assertThrows(BadRequestException.class, () -> pointService.adjustPoints(studentId, teacherUser, request));

        verify(studentProfileRepository, never()).save(any());
        verify(pointTransactionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Rejects deduction that would result in negative balance without modifying balance or writing ledger")
    void rejectsDeductionResultingInNegativeBalance() {
        UUID studentId = studentProfile.getId();
        studentProfile.setTotalPoints(15L);
        when(studentProfileRepository.findById(studentId)).thenReturn(Optional.of(studentProfile));

        PointAdjustmentRequest request = new PointAdjustmentRequest(-20, "Deducting more than balance");

        assertThrows(InsufficientPointsException.class, () -> pointService.adjustPoints(studentId, teacherUser, request));

        // Balance remains unchanged at 15
        assertEquals(15L, studentProfile.getTotalPoints());
        verify(pointTransactionRepository, never()).save(any());
    }
}
