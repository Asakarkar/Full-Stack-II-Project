import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "./index";
import {
  fetchCurrentUser,
  login,
  LoginPayload,
  logout,
  register,
  RegisterPayload,
  restoreSession,
} from "./authSlice";
import { isStudentRole, isTeacherRole } from "@/lib/types";
import { useTheme as useThemeContext } from "@/context/ThemeContext";

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

/**
 * Custom hook providing clean typed access to auth state and actions.
 */
export function useAuth() {
  const dispatch = useAppDispatch();
  const authState = useAppSelector((state) => state.auth);

  const isAuthenticated = authState.authenticationStatus === "AUTHENTICATED";
  const isTeacher = isTeacherRole(authState.user?.role);
  const isStudent = isStudentRole(authState.user?.role);

  return {
    ...authState,
    isAuthenticated,
    isTeacher,
    isStudent,
    register: (payload: RegisterPayload) => dispatch(register(payload)),
    login: (payload: LoginPayload) => dispatch(login(payload)),
    logout: () => dispatch(logout()),
    restoreSession: () => dispatch(restoreSession()),
    fetchCurrentUser: () => dispatch(fetchCurrentUser()),
  };
}

export const useTheme = useThemeContext;
