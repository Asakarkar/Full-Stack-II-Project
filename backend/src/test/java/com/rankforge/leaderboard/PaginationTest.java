package com.rankforge.leaderboard;

import com.rankforge.dto.response.LeaderboardEntryResponse;
import com.rankforge.dto.response.PagedResponse;
import com.rankforge.entity.Role;
import com.rankforge.entity.StudentProfile;
import com.rankforge.entity.User;
import com.rankforge.exception.BadRequestException;
import com.rankforge.repository.StudentProfileRepository;
import com.rankforge.repository.UserRepository;
import com.rankforge.service.LeaderboardService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class PaginationTest {

    @Autowired
    private LeaderboardService leaderboardService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentProfileRepository studentProfileRepository;

    @Autowired
    private com.rankforge.repository.PointTransactionRepository pointTransactionRepository;

    @BeforeEach
    void setUp() {
        pointTransactionRepository.deleteAll();
        studentProfileRepository.deleteAll();
        userRepository.deleteAll();

        // Seed 25 students with varying points
        for (int i = 1; i <= 25; i++) {
            User user = new User("Student " + i, "student" + i + "@rankforge.local", "hash", Role.STUDENT);
            userRepository.save(user);
            StudentProfile profile = new StudentProfile(user);
            profile.setTotalPoints((long) (i * 10));
            studentProfileRepository.save(profile);
        }
    }

    @Test
    @DisplayName("Supports server-side pagination returning totalElements, totalPages, page, size, and content")
    void paginationReturnsExpectedStructure() {
        PagedResponse<LeaderboardEntryResponse> response = leaderboardService.getLeaderboard(0, 10, "DESC", "totalPoints");

        assertNotNull(response);
        assertEquals(10, response.content().size());
        assertEquals(0, response.page());
        assertEquals(10, response.size());
        assertEquals(25, response.totalElements());
        assertEquals(3, response.totalPages());
        assertTrue(response.first());
        assertFalse(response.last());
        assertFalse(response.empty());
    }

    @Test
    @DisplayName("Navigates to second and last pages accurately")
    void paginationNavigatesPages() {
        PagedResponse<LeaderboardEntryResponse> pageTwo = leaderboardService.getLeaderboard(1, 10, "DESC", "totalPoints");
        assertEquals(10, pageTwo.content().size());
        assertEquals(1, pageTwo.page());
        assertFalse(pageTwo.first());
        assertFalse(pageTwo.last());

        PagedResponse<LeaderboardEntryResponse> pageThree = leaderboardService.getLeaderboard(2, 10, "DESC", "totalPoints");
        assertEquals(5, pageThree.content().size());
        assertEquals(2, pageThree.page());
        assertFalse(pageThree.first());
        assertTrue(pageThree.last());
    }

    @Test
    @DisplayName("Validates page and size limits (rejects negative page or size exceeding 100)")
    void validatesPageAndSizeLimits() {
        assertThrows(BadRequestException.class, () -> leaderboardService.getLeaderboard(-1, 20, "DESC", "totalPoints"));
        assertThrows(BadRequestException.class, () -> leaderboardService.getLeaderboard(0, 0, "DESC", "totalPoints"));
        assertThrows(BadRequestException.class, () -> leaderboardService.getLeaderboard(0, 101, "DESC", "totalPoints"));
    }

    @Test
    @DisplayName("Enforces sort parameter whitelist (rejects arbitrary unlisted fields)")
    void enforcesSortWhitelist() {
        // Whitelisted sort fields succeed
        assertNotNull(leaderboardService.getLeaderboard(0, 10, "DESC", "totalPoints"));
        assertNotNull(leaderboardService.getLeaderboard(0, 10, "ASC", "id"));

        // Unlisted sort fields are rejected with BadRequestException
        assertThrows(BadRequestException.class, () ->
                leaderboardService.getLeaderboard(0, 10, "DESC", "unauthorizedColumn; DROP TABLE users;"));
        assertThrows(BadRequestException.class, () ->
                leaderboardService.getLeaderboard(0, 10, "DESC", "passwordHash"));
    }
}
