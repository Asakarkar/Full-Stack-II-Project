import authReducer, {
  clearAuthError,
  fetchCurrentUser,
  login,
  logout,
  register,
  restoreSession,
  setAccessToken,
  setUser,
} from "../store/authSlice";
import { tokenStorage } from "../lib/storage";
import * as apiClient from "../lib/apiClient";
import type { User } from "../lib/types";

// Mock apiClient.apiRequest
jest.mock("../lib/apiClient", () => ({
  apiRequest: jest.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    payload: unknown;
    constructor(status: number, message: string, payload: unknown = {}) {
      super(message);
      this.status = status;
      this.payload = payload;
    }
  },
}));

describe("AUTH SLICE", () => {
  const mockStudentUser: User = {
    id: "11111111-1111-1111-1111-111111111111",
    email: "student@example.com",
    fullName: "Student One",
    displayName: "Student One",
    role: "STUDENT",
    createdAt: "2026-11-21T00:00:00Z",
  };

  const mockTeacherUser: User = {
    id: "22222222-2222-2222-2222-222222222222",
    email: "teacher@example.com",
    fullName: "Professor Davis",
    displayName: "Professor Davis",
    role: "TEACHER",
    createdAt: "2026-11-21T00:00:00Z",
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await tokenStorage.clear();
  });

  describe("Initial State & Basic Reducers", () => {
    it("returns correct initial state", () => {
      const state = authReducer(undefined, { type: "UNKNOWN" });
      expect(state).toEqual({
        user: null,
        accessToken: null,
        authenticationStatus: "IDLE",
        loading: false,
        error: null,
        initialized: false,
      });
    });

    it("handles setUser and setAccessToken", () => {
      let state = authReducer(undefined, setUser(mockStudentUser));
      expect(state.user).toEqual(mockStudentUser);

      state = authReducer(state, setAccessToken("jwt-token-123"));
      expect(state.accessToken).toBe("jwt-token-123");

      state = authReducer(state, clearAuthError());
      expect(state.error).toBeNull();
    });
  });

  describe("login action", () => {
    it("handles login.pending", () => {
      const state = authReducer(undefined, login.pending("req-1", { email: "test@example.com", password: "pwd" }));
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it("handles login.fulfilled and persists JWT securely", async () => {
      const mockResponse = {
        accessToken: "jwt-token-abc",
        tokenType: "Bearer",
        expiresInSeconds: 86400,
        user: mockStudentUser,
      };
      (apiClient.apiRequest as jest.Mock).mockResolvedValueOnce(mockResponse);

      const dispatch = jest.fn();
      const thunk = login({ email: "student@example.com", password: "Password123!" });
      const result = await thunk(dispatch, () => ({ auth: authReducer(undefined, { type: "INIT" }) }), undefined);

      expect(apiClient.apiRequest).toHaveBeenCalledWith("/auth/login", {
        method: "POST",
        body: {
          email: "student@example.com",
          password: "Password123!",
        },
      });

      // Verify token is saved in SecureStore
      const savedToken = await tokenStorage.get();
      expect(savedToken).toBe("jwt-token-abc");

      // Verify reducer state
      const state = authReducer(undefined, result);
      expect(state.authenticationStatus).toBe("AUTHENTICATED");
      expect(state.accessToken).toBe("jwt-token-abc");
      expect(state.user?.email).toBe("student@example.com");
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("handles login.rejected without storing credentials", async () => {
      (apiClient.apiRequest as jest.Mock).mockRejectedValueOnce(new Error("Invalid email or password"));

      const dispatch = jest.fn();
      const thunk = login({ email: "bad@example.com", password: "wrong" });
      const result = await thunk(dispatch, () => ({ auth: authReducer(undefined, { type: "INIT" }) }), undefined);

      const savedToken = await tokenStorage.get();
      expect(savedToken).toBeNull();

      const state = authReducer(undefined, result);
      expect(state.authenticationStatus).toBe("IDLE");
      expect(state.accessToken).toBeNull();
      expect(state.user).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBe("Invalid email or password");
    });
  });

  describe("register action", () => {
    it("registers student and saves token", async () => {
      const mockResponse = {
        accessToken: "jwt-register-token",
        tokenType: "Bearer",
        user: mockStudentUser,
      };
      (apiClient.apiRequest as jest.Mock).mockResolvedValueOnce(mockResponse);

      const dispatch = jest.fn();
      const thunk = register({
        fullName: "Student One",
        email: "student@example.com",
        password: "Password123!",
        role: "STUDENT",
      });
      const result = await thunk(dispatch, () => ({ auth: authReducer(undefined, { type: "INIT" }) }), undefined);

      expect(apiClient.apiRequest).toHaveBeenCalledWith("/auth/register", {
        method: "POST",
        body: {
          fullName: "Student One",
          email: "student@example.com",
          password: "Password123!",
          role: "STUDENT",
          invitationCode: undefined,
        },
      });

      const state = authReducer(undefined, result);
      expect(state.authenticationStatus).toBe("AUTHENTICATED");
      expect(state.accessToken).toBe("jwt-register-token");
      expect(state.user?.role).toBe("STUDENT");
    });

    it("rejects teacher registration without invitation code", async () => {
      (apiClient.apiRequest as jest.Mock).mockRejectedValueOnce(
        new Error("Invalid or missing teacher invitation code")
      );

      const dispatch = jest.fn();
      const thunk = register({
        fullName: "Fake Teacher",
        email: "fake@teacher.com",
        password: "Password123!",
        role: "TEACHER",
      });
      const result = await thunk(dispatch, () => ({ auth: authReducer(undefined, { type: "INIT" }) }), undefined);

      const state = authReducer(undefined, result);
      expect(state.authenticationStatus).toBe("IDLE");
      expect(state.error).toBe("Invalid or missing teacher invitation code");
      expect(await tokenStorage.get()).toBeNull();
    });
  });

  describe("restoreSession on app startup", () => {
    it("restores session when valid token exists in SecureStore", async () => {
      await tokenStorage.set("valid-stored-token", "Bearer");
      (apiClient.apiRequest as jest.Mock).mockResolvedValueOnce(mockTeacherUser);

      const dispatch = jest.fn();
      const thunk = restoreSession();
      const result = await thunk(dispatch, () => ({ auth: authReducer(undefined, { type: "INIT" }) }), undefined);

      expect(apiClient.apiRequest).toHaveBeenCalledWith("/auth/me", {
        customToken: "valid-stored-token",
      });

      const state = authReducer(undefined, result);
      expect(state.authenticationStatus).toBe("AUTHENTICATED");
      expect(state.accessToken).toBe("valid-stored-token");
      expect(state.user?.role).toBe("TEACHER");
      expect(state.initialized).toBe(true);
    });

    it("sets UNAUTHENTICATED when no token exists in SecureStore", async () => {
      const dispatch = jest.fn();
      const thunk = restoreSession();
      const result = await thunk(dispatch, () => ({ auth: authReducer(undefined, { type: "INIT" }) }), undefined);

      expect(apiClient.apiRequest).not.toHaveBeenCalled();

      const state = authReducer(undefined, result);
      expect(state.authenticationStatus).toBe("UNAUTHENTICATED");
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.initialized).toBe(true);
    });

    it("gracefully clears SecureStore when token is expired/invalid", async () => {
      await tokenStorage.set("expired-token", "Bearer");
      (apiClient.apiRequest as jest.Mock).mockRejectedValueOnce(new Error("401 Unauthorized: Token expired"));

      const dispatch = jest.fn();
      const thunk = restoreSession();
      const result = await thunk(dispatch, () => ({ auth: authReducer(undefined, { type: "INIT" }) }), undefined);

      // Verify SecureStore was cleared
      const stored = await tokenStorage.get();
      expect(stored).toBeNull();

      const state = authReducer(undefined, result);
      expect(state.authenticationStatus).toBe("UNAUTHENTICATED");
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.initialized).toBe(true);
    });
  });

  describe("logout action", () => {
    it("clears token from SecureStore and resets auth state", async () => {
      await tokenStorage.set("token-to-delete", "Bearer");

      const dispatch = jest.fn();
      const thunk = logout();
      const result = await thunk(dispatch, () => ({ auth: authReducer(undefined, { type: "INIT" }) }), undefined);

      expect(await tokenStorage.get()).toBeNull();

      const state = authReducer(
        {
          user: mockStudentUser,
          accessToken: "token-to-delete",
          authenticationStatus: "AUTHENTICATED",
          loading: false,
          error: null,
          initialized: true,
        },
        result
      );

      expect(state.authenticationStatus).toBe("UNAUTHENTICATED");
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
    });
  });

  describe("fetchCurrentUser action", () => {
    it("refreshes user profile in Redux state", async () => {
      const updatedUser: User = {
        ...mockStudentUser,
        fullName: "Student One (Updated)",
        displayName: "Student One (Updated)",
      };
      (apiClient.apiRequest as jest.Mock).mockResolvedValueOnce(updatedUser);

      const dispatch = jest.fn();
      const getState = () => ({
        auth: {
          user: mockStudentUser,
          accessToken: "valid-jwt",
          authenticationStatus: "AUTHENTICATED",
          loading: false,
          error: null,
          initialized: true,
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const thunk = fetchCurrentUser();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await thunk(dispatch, getState as any, undefined);

      const state = authReducer(getState().auth as any, result);
      expect(state.user?.fullName).toBe("Student One (Updated)");
    });
  });
});
