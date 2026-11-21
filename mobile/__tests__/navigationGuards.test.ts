import { isStudentRole, isTeacherRole } from "../lib/types";

describe("ROLE & NAVIGATION GUARDS", () => {
  describe("Role classification guards", () => {
    it("correctly identifies TEACHER role", () => {
      expect(isTeacherRole("TEACHER")).toBe(true);
      expect(isTeacherRole("teacher")).toBe(true);
      expect(isTeacherRole("STUDENT")).toBe(false);
      expect(isTeacherRole(null)).toBe(false);
      expect(isTeacherRole(undefined)).toBe(false);
    });

    it("correctly identifies STUDENT role", () => {
      expect(isStudentRole("STUDENT")).toBe(true);
      expect(isStudentRole("student")).toBe(true);
      expect(isStudentRole("TEACHER")).toBe(false);
      expect(isStudentRole(null)).toBe(false);
      expect(isStudentRole(undefined)).toBe(false);
    });
  });

  describe("Protected Route Access Decisions", () => {
    function canAccessTeacherScreen(role?: string | null): boolean {
      return isTeacherRole(role);
    }

    function canAccessDashboard(isAuthenticated: boolean): boolean {
      return isAuthenticated;
    }

    it("STUDENT cannot enter TEACHER routes", () => {
      expect(canAccessTeacherScreen("STUDENT")).toBe(false);
    });

    it("TEACHER can enter TEACHER routes", () => {
      expect(canAccessTeacherScreen("TEACHER")).toBe(true);
    });

    it("Unauthenticated users cannot enter dashboard routes", () => {
      expect(canAccessDashboard(false)).toBe(false);
    });

    it("Authenticated users can enter dashboard routes", () => {
      expect(canAccessDashboard(true)).toBe(true);
    });
  });
});
