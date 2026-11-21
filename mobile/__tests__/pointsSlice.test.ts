import pointsReducer, {
  awardPoints,
  clearPointsError,
  resetPoints,
  setPointsPage,
  setPointsSort,
  setTeacherPointsPage,
} from "../store/pointsSlice";
import * as apiClient from "../lib/apiClient";

jest.mock("../lib/apiClient", () => ({
  apiRequest: jest.fn(),
}));

describe("POINTS SLICE", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Initial State & Basic Reducers", () => {
    it("returns correct initial state", () => {
      const state = pointsReducer(undefined, { type: "UNKNOWN" });
      expect(state).toEqual({
        submitting: false,
        loading: false,
        error: null,
        lastTransaction: null,
        page: 1,
        limit: 20,
        sort: "createdAt",
        order: "desc",
      });
    });

    it("handles page and sort reducers", () => {
      let state = pointsReducer(undefined, setPointsPage(3));
      expect(state.page).toBe(3);

      state = pointsReducer(state, setTeacherPointsPage(4));
      expect(state.page).toBe(4);

      state = pointsReducer(state, setPointsSort("amount"));
      expect(state.sort).toBe("amount");

      state = pointsReducer(state, clearPointsError());
      expect(state.error).toBeNull();

      state = pointsReducer(state, resetPoints());
      expect(state.page).toBe(1);
    });
  });

  describe("awardPoints thunk", () => {
    it("successfully awards points and records transaction", async () => {
      const mockTransaction = {
        id: "tx-123",
        studentId: "student-abc",
        studentName: "Student Alpha",
        teacherId: "teacher-xyz",
        teacherName: "Professor Davis",
        deltaPoints: 20,
        reason: "Exceptional lab project",
        balanceAfter: 170,
        createdAt: "2026-11-21T00:00:00Z",
      };
      (apiClient.apiRequest as jest.Mock).mockResolvedValueOnce(mockTransaction);

      const dispatch = jest.fn();
      const getState = () => ({
        points: pointsReducer(undefined, { type: "INIT" }),
        leaderboard: { students: [] },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const thunk = awardPoints({ studentId: "student-abc", points: 20, reason: "Exceptional lab project" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await thunk(dispatch, getState as any, undefined);

      expect(apiClient.apiRequest).toHaveBeenCalledWith("/teacher/students/student-abc/points", {
        method: "POST",
        body: {
          points: 20,
          reason: "Exceptional lab project",
        },
      });

      // Verify dispatch was called to update leaderboard immediately
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "leaderboard/applyPointAwardResult",
          payload: {
            studentId: "student-abc",
            deltaPoints: 20,
            newTotalPoints: 170,
          },
        })
      );

      // Verify points slice state
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state = pointsReducer(undefined, result as any);
      expect(state.submitting).toBe(false);
      expect(state.lastTransaction).toEqual(mockTransaction);
      expect(state.error).toBeNull();
    });

    it("prevents duplicate submissions when submission is in progress", async () => {
      const dispatch = jest.fn();
      const getState = () => ({
        points: {
          ...pointsReducer(undefined, { type: "INIT" }),
          submitting: true, // Already submitting
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const thunk = awardPoints({ studentId: "student-abc", points: 10, reason: "Duplicate attempt" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await thunk(dispatch, getState as any, undefined);

      expect(apiClient.apiRequest).not.toHaveBeenCalled();
      expect(result.payload).toContain("already submitting");
    });

    it("rejects zero point adjustment", async () => {
      const dispatch = jest.fn();
      const getState = () => ({
        points: pointsReducer(undefined, { type: "INIT" }),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const thunk = awardPoints({ studentId: "student-abc", points: 0, reason: "Zero points" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await thunk(dispatch, getState as any, undefined);

      expect(apiClient.apiRequest).not.toHaveBeenCalled();
      expect(result.payload).toContain("Point change cannot be zero");
    });

    it("handles failure safely without corrupting state", async () => {
      (apiClient.apiRequest as jest.Mock).mockRejectedValueOnce(
        new Error("Student point balance cannot be negative")
      );

      const dispatch = jest.fn();
      const getState = () => ({
        points: pointsReducer(undefined, { type: "INIT" }),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const thunk = awardPoints({ studentId: "student-abc", points: -500, reason: "Deduct too much" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await thunk(dispatch, getState as any, undefined);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state = pointsReducer(undefined, result as any);
      expect(state.submitting).toBe(false);
      expect(state.error).toBe("Student point balance cannot be negative");
      expect(state.lastTransaction).toBeNull();
    });
  });
});
