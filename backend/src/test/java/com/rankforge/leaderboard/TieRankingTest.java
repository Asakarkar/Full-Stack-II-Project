package com.rankforge.leaderboard;

import com.rankforge.dto.response.LeaderboardEntryResponse;
import com.rankforge.dto.response.PagedResponse;
import com.rankforge.entity.Role;
import com.rankforge.entity.StudentProfile;
import com.rankforge.entity.User;
import com.rankforge.repository.StudentProfileRepository;
import com.rankforge.repository.UserRepository;
import com.rankforge.service.LeaderboardService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class TieRankingTest {

    @Autowired
    private LeaderboardService leaderboardService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentProfileRepository studentProfileRepository;

    @Autowired
    private com.rankforge.repository.PointTransactionRepository pointTransactionRepository;

    private User userA;
    private User userB;
    private User userC;
    private User userD;
    private User userE;

    private StudentProfile profileA;
    private StudentProfile profileB;
    private StudentProfile profileC;
    private StudentProfile profileD;
    private StudentProfile profileE;

    @BeforeEach
    void setUp() {
        pointTransactionRepository.deleteAll();
        studentProfileRepository.deleteAll();
        userRepository.deleteAll();

        // Seed 5 students:
        // Student A: 100 points
        // Student B: 100 points (tied with A)
        // Student C: 80 points
        // Student D: 80 points (tied with C)
        // Student E: 50 points
        userA = userRepository.save(new User("Candidate A", "cand.a@rankforge.local", "hash", Role.STUDENT));
        userB = userRepository.save(new User("Candidate B", "cand.b@rankforge.local", "hash", Role.STUDENT));
        userC = userRepository.save(new User("Candidate C", "cand.c@rankforge.local", "hash", Role.STUDENT));
        userD = userRepository.save(new User("Candidate D", "cand.d@rankforge.local", "hash", Role.STUDENT));
        userE = userRepository.save(new User("Candidate E", "cand.e@rankforge.local", "hash", Role.STUDENT));

        profileA = new StudentProfile(userA);
        profileA.setTotalPoints(100L);
        profileA = studentProfileRepository.save(profileA);

        profileB = new StudentProfile(userB);
        profileB.setTotalPoints(100L);
        profileB = studentProfileRepository.save(profileB);

        profileC = new StudentProfile(userC);
        profileC.setTotalPoints(80L);
        profileC = studentProfileRepository.save(profileC);

        profileD = new StudentProfile(userD);
        profileD.setTotalPoints(80L);
        profileD = studentProfileRepository.save(profileD);

        profileE = new StudentProfile(userE);
        profileE.setTotalPoints(50L);
        profileE = studentProfileRepository.save(profileE);
    }

    @Test
    @DisplayName("Leaderboard sorts totalPoints DESC and breaks ties by immutable student UUID ASC")
    void leaderboardBreaksTiesByUuidAscending() {
        PagedResponse<LeaderboardEntryResponse> response = leaderboardService.getLeaderboard(0, 10, "DESC", "totalPoints");
        List<LeaderboardEntryResponse> entries = response.content();

        assertEquals(5, entries.size());

        // Top 2 must both have 100 points
        assertEquals(100L, entries.get(0).totalPoints());
        assertEquals(100L, entries.get(1).totalPoints());

        // Ties broken deterministically by immutable student UUID ASC
        String firstUuid = entries.get(0).studentId().toString();
        String secondUuid = entries.get(1).studentId().toString();
        assertTrue(firstUuid.compareTo(secondUuid) < 0, "When points are equal, smaller UUID appears first");

        // Positions 2 and 3 must both have 80 points
        assertEquals(80L, entries.get(2).totalPoints());
        assertEquals(80L, entries.get(3).totalPoints());
        String thirdUuid = entries.get(2).studentId().toString();
        String fourthUuid = entries.get(3).studentId().toString();
        assertTrue(thirdUuid.compareTo(fourthUuid) < 0, "Ties at 80 points broken by UUID ASC");

        // Position 4 must have 50 points
        assertEquals(50L, entries.get(4).totalPoints());
    }

    @Test
    @DisplayName("Stable competition ranks calculated via database queries (Standard 1224 competition ranking)")
    void stableCompetitionRanksCalculated() {
        PagedResponse<LeaderboardEntryResponse> response = leaderboardService.getLeaderboard(0, 10, "DESC", "totalPoints");
        List<LeaderboardEntryResponse> entries = response.content();

        // Tied at 100 points: both receive competition rank 1
        assertEquals(1L, entries.get(0).rank());
        assertEquals(1L, entries.get(1).rank());

        // Tied at 80 points: both receive competition rank 3 (since 2 students have more points)
        assertEquals(3L, entries.get(2).rank());
        assertEquals(3L, entries.get(3).rank());

        // Student at 50 points: receives competition rank 5 (since 4 students have more points)
        assertEquals(5L, entries.get(4).rank());
    }

    @Test
    @DisplayName("Supports authenticated user's rank lookup without loading all students")
    void authenticatedUserRankLookupDirectQuery() {
        LeaderboardEntryResponse rankA = leaderboardService.getMyRank(userA);
        LeaderboardEntryResponse rankB = leaderboardService.getMyRank(userB);
        LeaderboardEntryResponse rankC = leaderboardService.getMyRank(userC);
        LeaderboardEntryResponse rankE = leaderboardService.getMyRank(userE);

        assertNotNull(rankA);
        assertEquals(1L, rankA.rank());
        assertEquals(1L, rankB.rank());
        assertEquals(3L, rankC.rank());
        assertEquals(5L, rankE.rank());
    }
}
