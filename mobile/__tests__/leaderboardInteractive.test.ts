import leaderboardReducer, {
  applyPointAwardResult,
  fetchActivityFeed,
  fetchLeaderboard,
  fetchMyRank,
} from "../store/leaderboardSlice";
import pointsReducer, { awardPoints } from "../store/pointsSlice";
import * as apiClient from "../lib/apiClient";
import { calculateMilestone, getRankMedal, getStudentBadges } from "../lib/gamification";
import type { LeaderboardEntry } from "../lib/types";

jest.mock("../lib/apiClient", () => ({
  apiRequest: jest.fn(),
}));

describe("LEADERBOARD INTERACTIVE & REWARD SYSTEM", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("1. Rank changes after teacher awards", () => {
    it("updates student score immediately and records new points balance", () => {
      const initialStudents: LeaderboardEntry[] = [
        { rank: 1, studentId: "s-1", displayName: "Student A", points: 100, totalPoints: 100 },
        { rank: 2, studentId: "s-2", displayName: "Student B", points: 80, totalPoints: 80 },
        { rank: 3, studentId: "s-3", displayName: "Student C", points: 60, totalPoints: 60 },
      ];

      const state = {
        ...leaderboardReducer(undefined, { type: "INIT" }),
        students: initialStudents,
      };

      // Teacher awards 30 points to Student B -> new score 110
      const updated = leaderboardReducer(
        state,
        applyPointAwardResult({
          studentId: "s-2",
          deltaPoints: 30,
          newTotalPoints: 110,
        })
      );

      const studentB = updated.students.find((s) => s.studentId === "s-2");
      expect(studentB?.points).toBe(110);
      expect(studentB?.totalPoints).toBe(110);

      // Student A remains untouched
      expect(updated.students.find((s) => s.studentId === "s-1")?.points).toBe(100);
    });
  });

  describe("2. Equal scores & tie-breaking calculation", () => {
    it("assigns equal competition ranks to students with identical scores", async () => {
      // Backend competition rank query gives rank 1 to both 150pt students, then rank 3 to 100pt student
      const mockEnvelope = {
        content: [
          { id: "s-uuid-1", fullName: "Alice", totalPoints: 150, competitionRank: 1, deterministicRank: 1 },
          { id: "s-uuid-2", fullName: "Bob", totalPoints: 150, competitionRank: 1, deterministicRank: 2 },
          { id: "s-uuid-3", fullName: "Charlie", totalPoints: 100, competitionRank: 3, deterministicRank: 3 },
        ],
        number: 0,
        size: 20,
        totalElements: 3,
        totalPages: 1,
        first: true,
        last: true,
      };
      (apiClient.apiRequest as jest.Mock).mockResolvedValueOnce(mockEnvelope);

      const dispatch = jest.fn();
      const getState = () => ({
        auth: { user: null },
        leaderboard: leaderboardReducer(undefined, { type: "INIT" }),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const thunk = fetchLeaderboard({ page: 0 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await thunk(dispatch, getState as any, undefined);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state = leaderboardReducer(undefined, result as any);
      expect(state.students[0].rank).toBe(1);
      expect(state.students[1].rank).toBe(1);
      expect(state.students[2].rank).toBe(3);
      expect(state.students[0].points).toBe(150);
      expect(state.students[1].points).toBe(150);
    });
  });

  describe("3. Page boundaries (cross-page movement)", () => {
    it("handles student crossing page boundaries through global refetch", async () => {
      // Page 0: Top 2 students
      const page0Response = {
        content: [
          { id: "s-1", fullName: "Student 1", totalPoints: 200, competitionRank: 1, deterministicRank: 1 },
          { id: "s-2", fullName: "Student 2", totalPoints: 180, competitionRank: 2, deterministicRank: 2 },
        ],
        number: 0,
        size: 2,
        totalElements: 4,
        totalPages: 2,
        first: true,
        last: false,
      };

      // Page 1: Lower 2 students
      const page1Response = {
        content: [
          { id: "s-3", fullName: "Student 3", totalPoints: 50, competitionRank: 3, deterministicRank: 3 },
          { id: "s-4", fullName: "Student 4", totalPoints: 30, competitionRank: 4, deterministicRank: 4 },
        ],
        number: 1,
        size: 2,
        totalElements: 4,
        totalPages: 2,
        first: false,
        last: true,
      };

      (apiClient.apiRequest as jest.Mock).mockResolvedValueOnce(page0Response);

      const dispatch = jest.fn();
      const getState = () => ({
        auth: { user: null },
        leaderboard: leaderboardReducer(undefined, { type: "INIT" }),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const thunk = fetchLeaderboard({ page: 0, size: 2 });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result0 = await thunk(dispatch, getState as any, undefined);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let state = leaderboardReducer(undefined, result0 as any);

      expect(state.students).toHaveLength(2);
      expect(state.pagination.isLast).toBe(false);

      // Now fetch next page (page 1)
      (apiClient.apiRequest as jest.Mock).mockResolvedValueOnce(page1Response);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const thunk1 = fetchLeaderboard({ page: 1, size: 2, reset: false });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result1 = await thunk1(dispatch, getState as any, undefined);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      state = leaderboardReducer(state, result1 as any);

      expect(state.students).toHaveLength(4);
      expect(state.pagination.page).toBe(1);
      expect(state.pagination.isLast).toBe(true);
    });
  });

  describe("4. Concurrent awards & duplicate rejection", () => {
    it("rejects duplicate submission when award is in progress", async () => {
      const stateWithSubmitting = {
        ...pointsReducer(undefined, { type: "INIT" }),
        submitting: true,
      };

      const dispatch = jest.fn();
      const getState = () => ({ points: stateWithSubmitting });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const thunk = awardPoints({ studentId: "s-1", points: 10, reason: "Fast click" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await thunk(dispatch, getState as any, undefined);

      expect(apiClient.apiRequest).not.toHaveBeenCalled();
      expect(result.payload).toContain("already submitting");
    });
  });

  describe("5. Personal rank card outside visible page", () => {
    it("fetches individual student rank even when on page 2 or 3", async () => {
      const mockPersonalRank = {
        rank: 45,
        studentId: "my-student-id",
        userId: "my-user-id",
        fullName: "Myself",
        totalPoints: 12,
      };
      (apiClient.apiRequest as jest.Mock).mockResolvedValueOnce(mockPersonalRank);

      const dispatch = jest.fn();
      const getState = () => ({
        auth: { user: { role: "STUDENT", id: "my-user-id" } },
        leaderboard: leaderboardReducer(undefined, { type: "INIT" }),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const thunk = fetchMyRank();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await thunk(dispatch, getState as any, undefined);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state = leaderboardReducer(undefined, result as any);
      expect(state.myRankEntry?.rank).toBe(45);
      expect(state.myRankEntry?.points).toBe(12);
      expect(state.currentUserRank).toBe(45);
    });
  });

  describe("6. Activity Feed backed by transactions", () => {
    it("fetches recent point transactions ledger records", async () => {
      const mockTxEnvelope = {
        content: [
          {
            id: "tx-1",
            studentId: "s-1",
            studentName: "Student Alpha",
            teacherId: "t-1",
            teacherName: "Prof. Davis",
            deltaPoints: 25,
            reason: "Outstanding test score",
            createdAt: "2026-11-21T12:00:00Z",
          },
        ],
        number: 0,
        size: 15,
        totalElements: 1,
        totalPages: 1,
        first: true,
        last: true,
      };
      (apiClient.apiRequest as jest.Mock).mockResolvedValueOnce(mockTxEnvelope);

      const dispatch = jest.fn();
      const getState = () => ({
        leaderboard: leaderboardReducer(undefined, { type: "INIT" }),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const thunk = fetchActivityFeed();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await thunk(dispatch, getState as any, undefined);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state = leaderboardReducer(undefined, result as any);
      expect(state.activity).toHaveLength(1);
      expect(state.activity[0].deltaPoints).toBe(25);
      expect(state.activity[0].studentName).toBe("Student Alpha");
      expect(state.activity[0].reason).toBe("Outstanding test score");
    });
  });

  describe("7. Optional Enhancements (Milestones & Medals)", () => {
    it("calculates correct milestone progress and next tier", () => {
      const milestone45 = calculateMilestone(45);
      expect(milestone45.currentTier).toBe("Initiate");
      expect(milestone45.nextTier).toBe("Bronze Scholar");
      expect(milestone45.pointsToNext).toBe(5);

      const milestone120 = calculateMilestone(120);
      expect(milestone120.currentTier).toBe("Silver Scholar");
      expect(milestone120.nextTier).toBe("Gold Achiever");
      expect(milestone120.pointsToNext).toBe(130);
    });

    it("assigns appropriate medal colors to ranks 1, 2, 3 and top 10", () => {
      expect(getRankMedal(1).tier).toBe("gold");
      expect(getRankMedal(2).tier).toBe("silver");
      expect(getRankMedal(3).tier).toBe("bronze");
      expect(getRankMedal(7).tier).toBe("top10");
      expect(getRankMedal(25).tier).toBe("standard");
    });

    it("evaluates student badges based on points", () => {
      const badges = getStudentBadges(150);
      const firstWin = badges.find((b) => b.id === "first_win");
      const century = badges.find((b) => b.id === "century_club");
      const grand = badges.find((b) => b.id === "elite_master");

      expect(firstWin?.earned).toBe(true);
      expect(century?.earned).toBe(true);
      expect(grand?.earned).toBe(false);
    });
  });
});
