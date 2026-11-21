import leaderboardReducer, {
  applyPointAwardResult,
  fetchLeaderboard,
  invalidateLeaderboard,
  resetLeaderboard,
  setPage,
  setSort,
} from "../store/leaderboardSlice";
import * as apiClient from "../lib/apiClient";
import type { LeaderboardEntry } from "../lib/types";

jest.mock("../lib/apiClient", () => ({
  apiRequest: jest.fn(),
}));

describe("LEADERBOARD SLICE", () => {
  const mockEntries: LeaderboardEntry[] = [
    {
      rank: 1,
      studentId: "student-1",
      userId: "user-1",
      displayName: "Student Alpha",
      points: 150,
      totalPoints: 150,
      competitionRank: 1,
      deterministicRank: 1,
    },
    {
      rank: 2,
      studentId: "student-2",
      userId: "user-2",
      displayName: "Student Beta",
      points: 120,
      totalPoints: 120,
      competitionRank: 2,
      deterministicRank: 2,
    },
    {
      rank: 2,
      studentId: "student-3",
      userId: "user-3",
      displayName: "Student Gamma",
      points: 120,
      totalPoints: 120,
      competitionRank: 2,
      deterministicRank: 3,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Initial State & Basic Reducers", () => {
    it("returns correct initial state", () => {
      const state = leaderboardReducer(undefined, { type: "UNKNOWN" });
      expect(state.students).toEqual([]);
      expect(state.pagination.page).toBe(0);
      expect(state.currentUserRank).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.refreshing).toBe(false);
      expect(state.error).toBeNull();
      expect(state.activeSort.direction).toBe("DESC");
    });

    it("handles setPage and setSort", () => {
      let state = leaderboardReducer(undefined, setPage(3));
      expect(state.page).toBe(3);
      expect(state.pagination.page).toBe(2);

      state = leaderboardReducer(state, setSort("displayName"));
      expect(state.sort).toBe("displayName");
      expect(state.order).toBe("desc");
      expect(state.activeSort.direction).toBe("DESC");
      expect(state.page).toBe(1);

      state = leaderboardReducer(state, setSort("displayName"));
      expect(state.order).toBe("asc");
      expect(state.activeSort.direction).toBe("ASC");

      state = leaderboardReducer(state, resetLeaderboard());
      expect(state.page).toBe(1);
      expect(state.students).toEqual([]);
    });

    it("handles invalidateLeaderboard", () => {
      let state = leaderboardReducer(undefined, { type: "UNKNOWN" });
      state = { ...state, error: "Some network failure" };
      state = leaderboardReducer(state, invalidateLeaderboard());
      expect(state.error).toBeNull();
    });
  });

  describe("fetchLeaderboard action", () => {
    it("populates students, pagination, and currentUserRank on success", async () => {
      const mockEnvelope = {
        content: [
          {
            id: "student-1",
            userId: "user-1",
            fullName: "Student Alpha",
            totalPoints: 150,
            competitionRank: 1,
            deterministicRank: 1,
          },
          {
            id: "student-2",
            userId: "user-2",
            fullName: "Student Beta",
            totalPoints: 120,
            competitionRank: 2,
            deterministicRank: 2,
          },
        ],
        number: 0,
        size: 20,
        totalElements: 2,
        totalPages: 1,
        first: true,
        last: true,
      };
      (apiClient.apiRequest as jest.Mock).mockResolvedValueOnce(mockEnvelope);

      const dispatch = jest.fn();
      const getState = () => ({
        auth: { user: { id: "user-2" } },
        leaderboard: leaderboardReducer(undefined, { type: "INIT" }),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const thunk = fetchLeaderboard({ page: 0, size: 20, direction: "DESC" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await thunk(dispatch, getState as any, undefined);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state = leaderboardReducer(undefined, result as any);
      expect(state.loading).toBe(false);
      expect(state.students).toHaveLength(2);
      expect(state.students[0].displayName).toBe("Student Alpha");
      expect(state.students[0].points).toBe(150);
      expect(state.students[1].displayName).toBe("Student Beta");
      expect(state.currentUserRank).toBe(2);
      expect(state.pagination.totalElements).toBe(2);
    });

    it("handles fetchLeaderboard.rejected", async () => {
      (apiClient.apiRequest as jest.Mock).mockRejectedValueOnce(new Error("Database connection error"));

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
      expect(state.loading).toBe(false);
      expect(state.error).toBe("Database connection error");
    });
  });

  describe("applyPointAwardResult (immediate score update)", () => {
    it("updates target student score immediately without waiting for server roundtrip", () => {
      const initialStateWithStudents = {
        ...leaderboardReducer(undefined, { type: "INIT" }),
        students: mockEntries,
      };

      // Award 25 points to student-2
      const updatedState = leaderboardReducer(
        initialStateWithStudents,
        applyPointAwardResult({
          studentId: "student-2",
          deltaPoints: 25,
          newTotalPoints: 145,
        })
      );

      const student2 = updatedState.students.find((s) => s.studentId === "student-2");
      expect(student2?.points).toBe(145);
      expect(student2?.totalPoints).toBe(145);

      // Other students unchanged
      const student1 = updatedState.students.find((s) => s.studentId === "student-1");
      expect(student1?.points).toBe(150);
    });
  });
});
