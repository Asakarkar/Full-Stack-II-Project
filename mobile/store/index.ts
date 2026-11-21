import { configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import authReducer from "./authSlice";
import leaderboardReducer from "./leaderboardSlice";
import studentReducer from "./studentSlice";
import pointsReducer from "./pointsSlice";
import { rankForgeApi } from "./api";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    leaderboard: leaderboardReducer,
    students: studentReducer,
    points: pointsReducer,
    [rankForgeApi.reducerPath]: rankForgeApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(rankForgeApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
