import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "./index";

interface StudentState {
  page: number;
  limit: number;
  search: string;
  grade: string;
  minPoints: number | null;
  maxPoints: number | null;
  sort: "displayName" | "email" | "grade" | "points" | "updatedAt";
  order: "asc" | "desc";
}

const initialState: StudentState = { page: 1, limit: 20, search: "", grade: "", minPoints: null, maxPoints: null, sort: "displayName", order: "asc" };

const studentSlice = createSlice({
  name: "students",
  initialState,
  reducers: {
    setStudentPage(state, action: PayloadAction<number>) {
      state.page = Math.max(1, action.payload);
    },
    setStudentSearch(state, action: PayloadAction<string>) {
      state.search = action.payload;
      state.page = 1;
    },
    setStudentFilters(state, action: PayloadAction<{ grade: string; minPoints: number | null; maxPoints: number | null }>) {
      state.grade = action.payload.grade;
      state.minPoints = action.payload.minPoints;
      state.maxPoints = action.payload.maxPoints;
      state.page = 1;
    },
    setStudentSort(state, action: PayloadAction<StudentState["sort"]>) {
      if (state.sort === action.payload) state.order = state.order === "asc" ? "desc" : "asc";
      else {
        state.sort = action.payload;
        state.order = "asc";
      }
      state.page = 1;
    },
  },
});

export const { setStudentPage, setStudentSearch, setStudentFilters, setStudentSort } = studentSlice.actions;
export const selectStudentFilters = (state: RootState) => state.students;
export default studentSlice.reducer;
