package com.rankforge.repository;

import com.rankforge.entity.PointTransaction;
import com.rankforge.entity.Role;
import com.rankforge.entity.StudentProfile;
import com.rankforge.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest
class RepositoryIntegrationTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentProfileRepository studentProfileRepository;

    @Autowired
    private PointTransactionRepository pointTransactionRepository;

    @Test
    @DisplayName("Persists user and enforces email uniqueness")
    void persistUserAndEnforceUniqueEmail() {
        User user1 = new User("John Doe", "john@example.com", "hash1", Role.STUDENT);
        userRepository.saveAndFlush(user1);

        assertNotNull(user1.getId());
        assertNotNull(user1.getCreatedAt());

        User user2 = new User("John Duplicate", "john@example.com", "hash2", Role.STUDENT);
        assertThrows(DataIntegrityViolationException.class, () -> userRepository.saveAndFlush(user2));
    }

    @Test
    @DisplayName("Persists student profile and enforces 1-to-1 unique relationship with user")
    void persistStudentProfileUniqueUser() {
        User user = new User("Jane Student", "jane@example.com", "hash1", Role.STUDENT);
        userRepository.saveAndFlush(user);

        StudentProfile profile = new StudentProfile(user);
        profile.setTotalPoints(150L);
        studentProfileRepository.saveAndFlush(profile);

        Optional<StudentProfile> found = studentProfileRepository.findByUserId(user.getId());
        assertTrue(found.isPresent());
        assertEquals(150L, found.get().getTotalPoints());
        assertEquals(0L, found.get().getVersion());

        // Duplicate student profile for same user must violate unique constraint
        StudentProfile duplicateProfile = new StudentProfile(user);
        assertThrows(DataIntegrityViolationException.class, () -> studentProfileRepository.saveAndFlush(duplicateProfile));
    }

    @Test
    @DisplayName("Calculates competition rank and deterministic tie-break rank using database queries")
    void calculateCompetitionRankAndDeterministicRank() {
        User u1 = userRepository.saveAndFlush(new User("Alice", "alice@test.com", "h", Role.STUDENT));
        User u2 = userRepository.saveAndFlush(new User("Bob", "bob@test.com", "h", Role.STUDENT));
        User u3 = userRepository.saveAndFlush(new User("Charlie", "charlie@test.com", "h", Role.STUDENT));

        StudentProfile sp1 = new StudentProfile(u1);
        sp1.setTotalPoints(100L);
        studentProfileRepository.saveAndFlush(sp1);

        StudentProfile sp2 = new StudentProfile(u2);
        sp2.setTotalPoints(100L); // Tied with Alice
        studentProfileRepository.saveAndFlush(sp2);

        StudentProfile sp3 = new StudentProfile(u3);
        sp3.setTotalPoints(50L);
        studentProfileRepository.saveAndFlush(sp3);

        // Standard competition ranking (1224 ranking): Both Alice and Bob with 100 points have rank 1.
        long compRankAlice = studentProfileRepository.countCompetitionRank(sp1.getTotalPoints());
        long compRankBob = studentProfileRepository.countCompetitionRank(sp2.getTotalPoints());
        long compRankCharlie = studentProfileRepository.countCompetitionRank(sp3.getTotalPoints());

        assertEquals(1L, compRankAlice);
        assertEquals(1L, compRankBob);
        assertEquals(3L, compRankCharlie); // Charlie is #3 because 2 students have more points

        // Deterministic rank (breaks ties by UUID ASC)
        long detRankAlice = studentProfileRepository.countDeterministicRank(sp1.getTotalPoints(), sp1.getId());
        long detRankBob = studentProfileRepository.countDeterministicRank(sp2.getTotalPoints(), sp2.getId());

        assertTrue(detRankAlice == 1L || detRankAlice == 2L);
        assertTrue(detRankBob == 1L || detRankBob == 2L);
        assertTrue(detRankAlice != detRankBob); // Stable sequential rank
    }

    @Test
    @DisplayName("Records point transaction and updates aggregations")
    void recordPointTransactionAndAggregations() {
        User teacher = userRepository.saveAndFlush(new User("Teacher Alpha", "teacher.alpha@test.com", "h", Role.TEACHER));
        User studentUser = userRepository.saveAndFlush(new User("Student Beta", "student.beta@test.com", "h", Role.STUDENT));
        StudentProfile student = studentProfileRepository.saveAndFlush(new StudentProfile(studentUser));

        PointTransaction tx1 = new PointTransaction(student, teacher, 50, "Completed lab work");
        pointTransactionRepository.saveAndFlush(tx1);

        PointTransaction tx2 = new PointTransaction(student, teacher, -15, "Broken flask deduction");
        pointTransactionRepository.saveAndFlush(tx2);

        Page<PointTransaction> transactions = pointTransactionRepository.findByStudentId(student.getId(), PageRequest.of(0, 10));
        assertEquals(2, transactions.getTotalElements());

        long totalAwarded = pointTransactionRepository.sumAllAwardedPoints();
        assertEquals(50L, totalAwarded);
    }
}
