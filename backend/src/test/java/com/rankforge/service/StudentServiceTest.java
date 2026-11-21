package com.rankforge.service;

import com.rankforge.dto.response.PagedResponse;
import com.rankforge.dto.response.PointTransactionResponse;
import com.rankforge.dto.response.StudentProfileResponse;
import com.rankforge.entity.PointTransaction;
import com.rankforge.entity.Role;
import com.rankforge.entity.StudentProfile;
import com.rankforge.entity.User;
import com.rankforge.exception.ForbiddenException;
import com.rankforge.mapper.PointTransactionMapper;
import com.rankforge.mapper.StudentProfileMapper;
import com.rankforge.repository.PointTransactionRepository;
import com.rankforge.repository.StudentProfileRepository;
import com.rankforge.service.impl.StudentServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StudentServiceTest {

    @Mock
    private StudentProfileRepository studentProfileRepository;

    @Mock
    private PointTransactionRepository pointTransactionRepository;

    private StudentProfileMapper studentProfileMapper;
    private PointTransactionMapper pointTransactionMapper;
    private StudentServiceImpl studentService;

    private User student1User;
    private StudentProfile student1Profile;

    private User student2User;
    private StudentProfile student2Profile;

    private User teacherUser;

    @BeforeEach
    void setUp() {
        studentProfileMapper = new StudentProfileMapper();
        pointTransactionMapper = new PointTransactionMapper();

        studentService = new StudentServiceImpl(
                studentProfileRepository,
                pointTransactionRepository,
                studentProfileMapper,
                pointTransactionMapper
        );

        student1User = new User("Alice", "alice@example.com", "hash", Role.STUDENT);
        student1Profile = new StudentProfile(student1User);
        student1Profile.setTotalPoints(100L);

        student2User = new User("Bob", "bob@example.com", "hash", Role.STUDENT);
        student2Profile = new StudentProfile(student2User);
        student2Profile.setTotalPoints(80L);

        teacherUser = new User("Teacher Tim", "tim@example.com", "hash", Role.TEACHER);
    }

    @Test
    @DisplayName("Student can view their own profile and calculated rank")
    void studentCanViewOwnProfile() {
        when(studentProfileRepository.findByUserId(student1User.getId())).thenReturn(Optional.of(student1Profile));
        when(studentProfileRepository.countDeterministicRank(100L, student1Profile.getId())).thenReturn(1L);

        StudentProfileResponse response = studentService.getMyProfile(student1User);

        assertNotNull(response);
        assertEquals(student1Profile.getId(), response.id());
        assertEquals(100L, response.totalPoints());
        assertEquals(1L, response.rank());
    }

    @Test
    @DisplayName("Student can view their own profile by ID")
    void studentCanViewOwnProfileById() {
        when(studentProfileRepository.findByUserId(student1User.getId())).thenReturn(Optional.of(student1Profile));
        when(studentProfileRepository.findWithUserById(student1Profile.getId())).thenReturn(Optional.of(student1Profile));
        when(studentProfileRepository.countDeterministicRank(100L, student1Profile.getId())).thenReturn(1L);

        StudentProfileResponse response = studentService.getStudentById(student1Profile.getId(), student1User);

        assertNotNull(response);
        assertEquals(student1Profile.getId(), response.id());
    }

    @Test
    @DisplayName("Student is forbidden from viewing another student's private profile by ID")
    void studentForbiddenFromViewingOtherStudentProfile() {
        when(studentProfileRepository.findByUserId(student1User.getId())).thenReturn(Optional.of(student1Profile));

        // Alice tries to view Bob's profile ID
        assertThrows(ForbiddenException.class, () ->
                studentService.getStudentById(student2Profile.getId(), student1User));
    }

    @Test
    @DisplayName("Teacher is authorized to view any student's profile by ID")
    void teacherCanViewAnyStudentProfile() {
        when(studentProfileRepository.findWithUserById(student1Profile.getId())).thenReturn(Optional.of(student1Profile));
        when(studentProfileRepository.countDeterministicRank(100L, student1Profile.getId())).thenReturn(1L);

        StudentProfileResponse response = studentService.getStudentById(student1Profile.getId(), teacherUser);

        assertNotNull(response);
        assertEquals(student1Profile.getId(), response.id());
    }

    @Test
    @DisplayName("Student is forbidden from viewing another student's transaction history")
    void studentForbiddenFromViewingOtherStudentTransactions() {
        when(studentProfileRepository.findByUserId(student1User.getId())).thenReturn(Optional.of(student1Profile));

        assertThrows(ForbiddenException.class, () ->
                studentService.getStudentTransactions(student2Profile.getId(), 0, 20, student1User));
    }

    @Test
    @DisplayName("Teacher is authorized to view any student's transaction history")
    void teacherCanViewAnyStudentTransactions() {
        UUID studentId = student1Profile.getId();
        when(studentProfileRepository.existsById(studentId)).thenReturn(true);

        PointTransaction tx = new PointTransaction(student1Profile, teacherUser, 10, "Great work");
        when(pointTransactionRepository.findByStudentId(eq(studentId), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(tx)));

        PagedResponse<PointTransactionResponse> response = studentService.getStudentTransactions(studentId, 0, 20, teacherUser);

        assertNotNull(response);
        assertEquals(1, response.totalElements());
        assertEquals(10, response.content().get(0).deltaPoints());
    }
}
