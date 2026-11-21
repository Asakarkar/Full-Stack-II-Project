import { configureStore } from "@reduxjs/toolkit";
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
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(rankForgeApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export { useAppDispatch, useAppSelector, useAuth, useTheme } from "./hooks";
