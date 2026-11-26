import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { apiRequest } from "@/lib/apiClient";
import { tokenStorage } from "@/lib/storage";
import type { AuthenticationStatus, AuthResponse, User } from "@/lib/types";
import type { RootState } from "./index";

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  authenticationStatus: AuthenticationStatus;
  loading: boolean;
  error: string | null;
  initialized: boolean; // For backward compatibility with legacy screen checks
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  authenticationStatus: "IDLE",
  loading: false,
  error: null,
  initialized: false,
};

function normalizeUser(raw: Record<string, unknown>): User {
  const id = String(raw.id || "");
  const username = String(raw.username || "");
  const email = String(raw.email || "");
  const fullName = String(raw.fullName || raw.displayName || "");
  const displayName = fullName || email;
  const role = (String(raw.role || "STUDENT").toUpperCase() === "TEACHER" ? "TEACHER" : "STUDENT") as User["role"];
  const createdAt = String(raw.createdAt || new Date().toISOString());
  const updatedAt = raw.updatedAt ? String(raw.updatedAt) : undefined;
  return { id, username, email, fullName, displayName, role, createdAt, updatedAt };
}

export interface RegisterPayload {
  fullName?: string;
  displayName?: string;
  username: string;
  email: string;
  password: string;
  role?: "STUDENT" | "TEACHER";
  invitationCode?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

/**
 * Register a new user (STUDENT or TEACHER).
 * Never stores passwords; only stores the returned JWT.
 */
export const register = createAsyncThunk<
  { user: User; accessToken: string },
  RegisterPayload,
  { rejectValue: string }
>("auth/register", async (payload, { rejectWithValue }) => {
  try {
    const fullName = payload.fullName || payload.displayName || "";
    const body = {
      fullName,
      username: payload.username.trim(),
      email: payload.email.trim(),
      password: payload.password,
      role: payload.role || "STUDENT",
      invitationCode: payload.invitationCode?.trim() || undefined,
    };
    const response = await apiRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body,
    });
    await tokenStorage.set(response.accessToken, response.tokenType || "Bearer");
    return {
      user: normalizeUser(response.user as unknown as Record<string, unknown>),
      accessToken: response.accessToken,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Registration failed";
    return rejectWithValue(msg);
  }
});

/**
 * Log in with email and password.
 * Never stores passwords; only stores the returned JWT.
 */
export const login = createAsyncThunk<
  { user: User; accessToken: string },
  LoginPayload,
  { rejectValue: string }
>("auth/login", async (payload, { rejectWithValue }) => {
  try {
    const response = await apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: {
        email: payload.email.trim(),
        password: payload.password,
      },
    });
    await tokenStorage.set(response.accessToken, response.tokenType || "Bearer");
    return {
      user: normalizeUser(response.user as unknown as Record<string, unknown>),
      accessToken: response.accessToken,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Login failed";
    return rejectWithValue(msg);
  }
});

/**
 * Validate or restore an existing session on app startup:
 * 1. Reads saved credentials from SecureStore.
 * 2. If present, validates against backend GET /auth/me.
 * 3. Gracefully clears SecureStore if expired or invalid.
 */
export const restoreSession = createAsyncThunk<
  { user: User; accessToken: string } | null,
  void
>("auth/restoreSession", async () => {
  const token = await tokenStorage.get();
  if (!token) {
    return null;
  }
  try {
    const userResponse = await apiRequest<Record<string, unknown>>("/auth/me", {
      customToken: token,
    });
    const user = normalizeUser(userResponse);
    return { user, accessToken: token };
  } catch {
    // Session token expired or invalid: clear cleanly
    await tokenStorage.clear();
    return null;
  }
});

/**
 * Fetch fresh user profile from backend.
 */
export const fetchCurrentUser = createAsyncThunk<
  User,
  void,
  { rejectValue: string; state: RootState }
>("auth/fetchCurrentUser", async (_, { getState, rejectWithValue }) => {
  const state = getState();
  const token = state.auth.accessToken;
  try {
    const userResponse = await apiRequest<Record<string, unknown>>("/auth/me", {
      customToken: token,
    });
    return normalizeUser(userResponse);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch user profile";
    return rejectWithValue(msg);
  }
});

/**
 * Logout and clear credentials securely from SecureStore.
 */
export const logout = createAsyncThunk<void, void>("auth/logout", async () => {
  await tokenStorage.clear();
});

// Legacy backward-compatibility thunks
export const establishSession = createAsyncThunk(
  "auth/establishSession",
  async (response: AuthResponse) => {
    await tokenStorage.set(response.accessToken, response.tokenType || "Bearer");
    return {
      accessToken: response.accessToken,
      user: normalizeUser(response.user as unknown as Record<string, unknown>),
    };
  }
);

export const clearSession = logout;

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User | null>) {
      state.user = action.payload;
    },
    setAccessToken(state, action: PayloadAction<string | null>) {
      state.accessToken = action.payload;
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.authenticationStatus = "AUTHENTICATED";
        state.initialized = true;
        state.error = null;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message || "Registration failed";
      })

      // login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.authenticationStatus = "AUTHENTICATED";
        state.initialized = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message || "Login failed";
      })

      // restoreSession
      .addCase(restoreSession.pending, (state) => {
        state.loading = true;
        state.authenticationStatus = "LOADING";
        state.initialized = false;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.loading = false;
        state.initialized = true;
        if (action.payload) {
          state.user = action.payload.user;
          state.accessToken = action.payload.accessToken;
          state.authenticationStatus = "AUTHENTICATED";
        } else {
          state.user = null;
          state.accessToken = null;
          state.authenticationStatus = "UNAUTHENTICATED";
        }
      })
      .addCase(restoreSession.rejected, (state) => {
        state.loading = false;
        state.initialized = true;
        state.user = null;
        state.accessToken = null;
        state.authenticationStatus = "UNAUTHENTICATED";
      })

      // fetchCurrentUser
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
      })

      // logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.authenticationStatus = "UNAUTHENTICATED";
        state.loading = false;
        state.error = null;
      })

      // establishSession (backward-compatibility)
      .addCase(establishSession.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(establishSession.fulfilled, (state, action) => {
        state.loading = false;
        state.accessToken = action.payload.accessToken;
        state.user = action.payload.user;
        state.authenticationStatus = "AUTHENTICATED";
        state.initialized = true;
      })
      .addCase(establishSession.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Could not save session";
      });
  },
});

export const { setUser, setAccessToken, clearAuthError } = authSlice.actions;
export const selectAuth = (state: RootState) => state.auth;
export const selectUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) =>
  state.auth.authenticationStatus === "AUTHENTICATED";
export default authSlice.reducer;
