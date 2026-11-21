import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "./index";

interface LeaderboardState {
  page: number;
  limit: number;
  sort: "points" | "displayName" | "grade";
  order: "asc" | "desc";
}

const initialState: LeaderboardState = { page: 1, limit: 20, sort: "points", order: "desc" };

const leaderboardSlice = createSlice({
  name: "leaderboard",
  initialState,
  reducers: {
    setPage(state, action: PayloadAction<number>) {
      state.page = Math.max(1, action.payload);
    },
    setSort(state, action: PayloadAction<LeaderboardState["sort"]>) {
      if (state.sort === action.payload) state.order = state.order === "asc" ? "desc" : "asc";
      else {
        state.sort = action.payload;
        state.order = "desc";
      }
      state.page = 1;
    },
    resetLeaderboard: () => initialState,
  },
});

export const { setPage, setSort, resetLeaderboard } = leaderboardSlice.actions;
export const selectLeaderboard = (state: RootState) => state.leaderboard;
export default leaderboardSlice.reducer;
