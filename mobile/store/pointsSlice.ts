import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { apiRequest } from "@/lib/apiClient";
import type { PointTransaction } from "@/lib/types";
import { applyPointAwardResult, refreshLeaderboard } from "./leaderboardSlice";
import type { AppDispatch, RootState } from "./index";

export interface PointsState {
  submitting: boolean;
  loading: boolean;
  error: string | null;
  lastTransaction: PointTransaction | null;
  page: number;
  limit: number;
  sort: "createdAt" | "amount" | "type";
  order: "asc" | "desc";
}

const initialState: PointsState = {
  submitting: false,
  loading: false,
  error: null,
  lastTransaction: null,
  page: 1,
  limit: 20,
  sort: "createdAt",
  order: "desc",
};

export interface AwardPointsParams {
  studentId: string;
  points: number;
  reason: string;
}

export const awardPoints = createAsyncThunk<
  PointTransaction,
  AwardPointsParams,
  { dispatch: AppDispatch; state: RootState; rejectValue: string }
>("points/awardPoints", async ({ studentId, points, reason }, { getState, dispatch, rejectWithValue }) => {
  const state = getState();
  if (state.points.submitting) {
    return rejectWithValue("A point transaction is already submitting. Please wait.");
  }

  if (!points || points === 0) {
    return rejectWithValue("Point change cannot be zero.");
  }

  try {
    const response = await apiRequest<PointTransaction>(`/teacher/students/${encodeURIComponent(studentId)}/points`, {
      method: "POST",
      body: {
        points,
        reason: reason.trim(),
      },
    });

    dispatch(
      applyPointAwardResult({
        studentId,
        deltaPoints: points,
        newTotalPoints: response.balanceAfter,
      })
    );

    void dispatch(refreshLeaderboard());
    return response;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to record point transaction";
    return rejectWithValue(msg);
  }
});

const pointsSlice = createSlice({
  name: "points",
  initialState,
  reducers: {
    clearPointsError(state) {
      state.error = null;
    },
    setPointsPage(state, action: PayloadAction<number>) {
      state.page = Math.max(1, action.payload);
    },
    setTeacherPointsPage(state, action: PayloadAction<number>) {
      state.page = Math.max(1, action.payload);
    },
    setPointsSort(state, action: PayloadAction<PointsState["sort"]>) {
      if (state.sort === action.payload) {
        state.order = state.order === "asc" ? "desc" : "asc";
      } else {
        state.sort = action.payload;
        state.order = "desc";
      }
      state.page = 1;
    },
    resetPoints: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(awardPoints.pending, (state) => {
        state.submitting = true;
        state.loading = true;
        state.error = null;
      })
      .addCase(awardPoints.fulfilled, (state, action) => {
        state.submitting = false;
        state.loading = false;
        state.lastTransaction = action.payload;
        state.error = null;
      })
      .addCase(awardPoints.rejected, (state, action) => {
        state.submitting = false;
        state.loading = false;
        state.error = action.payload || action.error.message || "Point adjustment failed";
      });
  },
});

export const {
  clearPointsError,
  setPointsPage,
  setTeacherPointsPage,
  setPointsSort,
  resetPoints,
} = pointsSlice.actions;

export const selectPoints = (state: RootState) => state.points;
export const selectPointsSubmitting = (state: RootState) => state.points.submitting;
export const selectPointsError = (state: RootState) => state.points.error;

export default pointsSlice.reducer;
