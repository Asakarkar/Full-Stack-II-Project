import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { apiRequest } from "@/lib/apiClient";
import type { LeaderboardEntry, PageEnvelope, PaginationState, PointTransaction } from "@/lib/types";
import type { AppDispatch, RootState } from "./index";

export interface LeaderboardState {
  students: LeaderboardEntry[];
  pagination: PaginationState;
  currentUserRank: number | null;
  myRankEntry: LeaderboardEntry | null;
  activity: PointTransaction[];
  activityLoading: boolean;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  activeSort: {
    field: "totalPoints" | "displayName" | "points";
    direction: "ASC" | "DESC";
  };
  // Legacy filter compatibility
  page: number;
  limit: number;
  sort: "points" | "displayName" | "grade";
  order: "asc" | "desc";
}

const initialPagination: PaginationState = {
  page: 0,
  size: 20,
  totalElements: 0,
  totalPages: 0,
  isFirst: true,
  isLast: true,
};

const initialState: LeaderboardState = {
  students: [],
  pagination: initialPagination,
  currentUserRank: null,
  myRankEntry: null,
  activity: [],
  activityLoading: false,
  loading: false,
  refreshing: false,
  error: null,
  activeSort: {
    field: "totalPoints",
    direction: "DESC",
  },
  page: 1,
  limit: 20,
  sort: "points",
  order: "desc",
};

interface FetchLeaderboardParams {
  page?: number;
  size?: number;
  direction?: "ASC" | "DESC";
  reset?: boolean;
}

function normalizeLeaderboardEntry(raw: Record<string, unknown>, index: number, page: number, size: number): LeaderboardEntry {
  const studentId = String(raw.studentId || raw.id || "");
  const userId = raw.userId ? String(raw.userId) : undefined;
  const fullName = String(raw.fullName || raw.displayName || "");
  const displayName = fullName || "Student";
  const email = raw.email ? String(raw.email) : undefined;
  const grade = raw.grade ? String(raw.grade) : null;
  const totalPoints = typeof raw.totalPoints === "number" ? raw.totalPoints : Number(raw.points || 0);
  const competitionRank = typeof raw.competitionRank === "number" ? raw.competitionRank : undefined;
  const deterministicRank = typeof raw.deterministicRank === "number" ? raw.deterministicRank : page * size + index + 1;
  const rank = typeof raw.rank === "number" ? raw.rank : (competitionRank ?? deterministicRank);

  return {
    rank,
    studentId,
    userId,
    fullName,
    displayName,
    email,
    grade,
    points: totalPoints,
    totalPoints,
    competitionRank,
    deterministicRank,
  };
}

export const fetchMyRank = createAsyncThunk<
  LeaderboardEntry | null,
  void,
  { state: RootState; rejectValue: string }
>("leaderboard/fetchMyRank", async (_, { getState, rejectWithValue }) => {
  const state = getState();
  if (state.auth.user?.role !== "STUDENT") {
    return null;
  }
  try {
    const raw = await apiRequest<Record<string, unknown>>("/leaderboard/me");
    return normalizeLeaderboardEntry(raw, 0, 0, 1);
  } catch {
    try {
      const profile = await apiRequest<Record<string, unknown>>("/students/me");
      const rank = typeof profile.rank === "number" ? profile.rank : 1;
      return {
        rank,
        studentId: String(profile.id || ""),
        userId: String(profile.userId || ""),
        fullName: String(profile.fullName || ""),
        displayName: String(profile.fullName || "You"),
        email: String(profile.email || ""),
        points: Number(profile.totalPoints || 0),
        totalPoints: Number(profile.totalPoints || 0),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch student rank";
      return rejectWithValue(msg);
    }
  }
});

export const fetchActivityFeed = createAsyncThunk<
  PointTransaction[],
  { page?: number; size?: number } | undefined,
  { rejectValue: string }
>("leaderboard/fetchActivityFeed", async (params = {}, { rejectWithValue }) => {
  try {
    const page = params.page ?? 0;
    const size = params.size ?? 15;
    const response = await apiRequest<PageEnvelope<Record<string, unknown>>>("/leaderboard/activity", {
      params: { page, size },
    });
    return (response.content || []).map((raw) => ({
      id: String(raw.id || ""),
      studentId: String(raw.studentId || ""),
      studentName: String(raw.studentName || "Student"),
      teacherId: String(raw.teacherId || ""),
      teacherName: String(raw.teacherName || "Teacher"),
      deltaPoints: Number(raw.deltaPoints || 0),
      reason: String(raw.reason || ""),
      balanceAfter: typeof raw.balanceAfter === "number" ? raw.balanceAfter : undefined,
      createdAt: String(raw.createdAt || new Date().toISOString()),
    }));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load activity feed";
    return rejectWithValue(msg);
  }
});

export const fetchLeaderboard = createAsyncThunk<
  {
    entries: LeaderboardEntry[];
    pagination: PaginationState;
    currentUserRank: number | null;
    page: number;
    reset: boolean;
  },
  FetchLeaderboardParams | undefined,
  { dispatch: AppDispatch; state: RootState; rejectValue: string }
>("leaderboard/fetchLeaderboard", async (params = {}, { getState, dispatch, rejectWithValue }) => {
  const state = getState();
  const page = params.page !== undefined ? params.page : state.leaderboard.pagination.page;
  const size = params.size !== undefined ? params.size : state.leaderboard.pagination.size;
  const direction = params.direction || state.leaderboard.activeSort.direction;
  const reset = params.reset ?? page === 0;

  try {
    if (state.auth.user?.role === "STUDENT" && !state.leaderboard.myRankEntry) {
      void dispatch(fetchMyRank());
    }

    const response = await apiRequest<PageEnvelope<Record<string, unknown>>>("/leaderboard", {
      params: {
        page,
        size,
        direction,
      },
    });

    const entries = (response.content || []).map((item, idx) =>
      normalizeLeaderboardEntry(item, idx, response.number ?? page, response.size ?? size)
    );

    const pagination: PaginationState = {
      page: response.number ?? page,
      size: response.size ?? size,
      totalElements: response.totalElements ?? entries.length,
      totalPages: response.totalPages ?? 1,
      isFirst: response.first ?? (page === 0),
      isLast: response.last ?? true,
    };

    let currentUserRank: number | null = state.leaderboard.currentUserRank;
    const currentUserId = state.auth.user?.id;
    if (currentUserId) {
      const match = entries.find((e) => e.userId === currentUserId || e.studentId === currentUserId);
      if (match) {
        currentUserRank = match.rank;
      }
    }

    return { entries, pagination, currentUserRank, page, reset };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to load leaderboard";
    return rejectWithValue(msg);
  }
});

export const refreshLeaderboard = createAsyncThunk<void, void, { dispatch: AppDispatch }>(
  "leaderboard/refreshLeaderboard",
  async (_, { dispatch }) => {
    await Promise.all([
      dispatch(fetchLeaderboard({ page: 0, reset: true })),
      dispatch(fetchMyRank()),
      dispatch(fetchActivityFeed()),
    ]);
  }
);

export const fetchNextPage = createAsyncThunk<void, void, { dispatch: AppDispatch; state: RootState }>(
  "leaderboard/fetchNextPage",
  async (_, { getState, dispatch }) => {
    const state = getState();
    const { pagination, loading, refreshing, activeSort } = state.leaderboard;
    if (loading || refreshing || pagination.isLast) {
      return;
    }
    const nextPage = pagination.page + 1;
    await dispatch(
      fetchLeaderboard({ page: nextPage, direction: activeSort.direction, reset: false })
    );
  }
);

const leaderboardSlice = createSlice({
  name: "leaderboard",
  initialState,
  reducers: {
    invalidateLeaderboard(state) {
      state.error = null;
    },
    applyPointAwardResult(
      state,
      action: PayloadAction<{ studentId: string; deltaPoints?: number; newTotalPoints?: number }>
    ) {
      const { studentId, deltaPoints = 0, newTotalPoints } = action.payload;
      const target = state.students.find((s) => s.studentId === studentId);
      if (target) {
        if (typeof newTotalPoints === "number") {
          target.points = newTotalPoints;
          target.totalPoints = newTotalPoints;
        } else {
          target.points = Math.max(0, target.points + deltaPoints);
          target.totalPoints = target.points;
        }
      }

      if (state.myRankEntry && state.myRankEntry.studentId === studentId) {
        if (typeof newTotalPoints === "number") {
          state.myRankEntry.points = newTotalPoints;
          state.myRankEntry.totalPoints = newTotalPoints;
        } else {
          state.myRankEntry.points = Math.max(0, state.myRankEntry.points + deltaPoints);
          state.myRankEntry.totalPoints = state.myRankEntry.points;
        }
      }
    },
    // Legacy compatibility reducers
    setPage(state, action: PayloadAction<number>) {
      const pageIndex = Math.max(1, action.payload);
      state.page = pageIndex;
      state.pagination.page = pageIndex - 1;
    },
    setSort(state, action: PayloadAction<LeaderboardState["sort"]>) {
      if (state.sort === action.payload) {
        state.order = state.order === "asc" ? "desc" : "asc";
      } else {
        state.sort = action.payload;
        state.order = "desc";
      }
      state.activeSort.direction = state.order.toUpperCase() as "ASC" | "DESC";
      state.page = 1;
      state.pagination.page = 0;
    },
    resetLeaderboard: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // fetchLeaderboard
      .addCase(fetchLeaderboard.pending, (state, action) => {
        if (action.meta.arg?.reset || action.meta.arg?.page === 0) {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchLeaderboard.fulfilled, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.pagination = action.payload.pagination;
        state.page = action.payload.pagination.page + 1;

        if (action.payload.reset || action.payload.page === 0) {
          state.students = action.payload.entries;
        } else {
          // Append while deduplicating by studentId
          const existingIds = new Set(state.students.map((s) => s.studentId));
          const newUnique = action.payload.entries.filter((e) => !existingIds.has(e.studentId));
          state.students = [...state.students, ...newUnique];
        }

        if (action.payload.currentUserRank !== null) {
          state.currentUserRank = action.payload.currentUserRank;
        }
      })
      .addCase(fetchLeaderboard.rejected, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.error = action.payload || action.error.message || "Failed to load leaderboard";
      })

      // refreshLeaderboard
      .addCase(refreshLeaderboard.pending, (state) => {
        state.refreshing = true;
        state.error = null;
      })
      .addCase(refreshLeaderboard.fulfilled, (state) => {
        state.refreshing = false;
      })
      .addCase(refreshLeaderboard.rejected, (state) => {
        state.refreshing = false;
      })

      // fetchMyRank
      .addCase(fetchMyRank.fulfilled, (state, action) => {
        if (action.payload) {
          state.myRankEntry = action.payload;
          state.currentUserRank = action.payload.rank;
        }
      })

      // fetchActivityFeed
      .addCase(fetchActivityFeed.pending, (state) => {
        state.activityLoading = true;
      })
      .addCase(fetchActivityFeed.fulfilled, (state, action) => {
        state.activityLoading = false;
        state.activity = action.payload;
      })
      .addCase(fetchActivityFeed.rejected, (state) => {
        state.activityLoading = false;
      });
  },
});

export const {
  invalidateLeaderboard,
  applyPointAwardResult,
  setPage,
  setSort,
  resetLeaderboard,
} = leaderboardSlice.actions;

export const selectLeaderboard = (state: RootState) => state.leaderboard;
export const selectLeaderboardStudents = (state: RootState) => state.leaderboard.students;
export const selectLeaderboardLoading = (state: RootState) => state.leaderboard.loading;
export const selectLeaderboardRefreshing = (state: RootState) => state.leaderboard.refreshing;
export const selectLeaderboardError = (state: RootState) => state.leaderboard.error;
export const selectCurrentUserRank = (state: RootState) => state.leaderboard.currentUserRank;
export const selectMyRankEntry = (state: RootState) => state.leaderboard.myRankEntry;
export const selectActivityFeed = (state: RootState) => state.leaderboard.activity;

export default leaderboardSlice.reducer;
