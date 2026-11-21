import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { tokenStorage } from "@/lib/storage";
import type { AuthResponse, User } from "@/lib/types";
import { rankForgeApi } from "./api";
import type { RootState } from "./index";

interface AuthState {
  user: User | null;
  token: string | null;
  initialized: boolean;
  status: "idle" | "loading" | "failed";
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  initialized: false,
  status: "idle",
  error: null,
};

export const restoreSession = createAsyncThunk("auth/restoreSession", async (_, { dispatch }) => {
  const saved = await tokenStorage.get();
  if (!saved) return null;
  try {
    const response = await dispatch(rankForgeApi.endpoints.me.initiate()).unwrap();
    return { token: saved, user: response };
  } catch {
    await tokenStorage.clear();
    return null;
  }
});

export const establishSession = createAsyncThunk(
  "auth/establishSession",
  async (response: AuthResponse) => {
    await tokenStorage.set(response.accessToken, response.tokenType);
    return { token: response.accessToken, user: response.user };
  },
);

export const clearSession = createAsyncThunk("auth/clearSession", async () => {
  await tokenStorage.clear();
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreSession.pending, (state) => {
        state.initialized = false;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.initialized = true;
        state.token = action.payload?.token ?? null;
        state.user = action.payload?.user ?? null;
      })
      .addCase(restoreSession.rejected, (state) => {
        state.initialized = true;
      })
      .addCase(establishSession.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(establishSession.fulfilled, (state, action) => {
        state.status = "idle";
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(establishSession.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message ?? "Could not save your session.";
      })
      .addCase(clearSession.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.error = null;
        state.status = "idle";
      });
  },
});

export const { setUser, clearAuthError } = authSlice.actions;
export const selectAuth = (state: RootState) => state.auth;
export default authSlice.reducer;
