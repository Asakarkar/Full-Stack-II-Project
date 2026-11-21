import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "./index";

interface PointsState {
  page: number;
  limit: number;
  sort: "createdAt" | "amount" | "type";
  order: "asc" | "desc";
}

const initialState: PointsState = { page: 1, limit: 20, sort: "createdAt", order: "desc" };

const pointsSlice = createSlice({
  name: "points",
  initialState,
  reducers: {
    setPointsPage(state, action: PayloadAction<number>) {
      state.page = Math.max(1, action.payload);
    },
    setTeacherPointsPage(state, action: PayloadAction<number>) {
      state.page = Math.max(1, action.payload);
    },
    setPointsSort(state, action: PayloadAction<PointsState["sort"]>) {
      if (state.sort === action.payload) state.order = state.order === "asc" ? "desc" : "asc";
      else {
        state.sort = action.payload;
        state.order = "desc";
      }
      state.page = 1;
    },
    resetPoints: () => initialState,
  },
});

export const { setPointsPage, setTeacherPointsPage, setPointsSort, resetPoints } = pointsSlice.actions;
export const selectPoints = (state: RootState) => state.points;
export default pointsSlice.reducer;
