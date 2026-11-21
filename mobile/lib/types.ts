export type UserRole = "STUDENT" | "TEACHER";

export function isTeacherRole(role?: UserRole | null) {
  return role?.toUpperCase() === "TEACHER";
}

export function isStudentRole(role?: UserRole | null) {
  return role?.toUpperCase() === "STUDENT";
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: User;
}

export interface Student {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  grade: string | null;
  pointsBalance: number;
}

export interface PageResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
}

export interface PointEntry {
  id: string;
  studentId: string;
  studentName: string;
  actorId: string;
  actorName: string;
  type: "AWARD" | "DEDUCTION";
  amount: number;
  reason: string;
  balanceAfter: number;
  createdAt: string;
}

export interface PointChangeRequest {
  points: number;
  reason: string;
}

export interface TeacherPointChangeArgs extends PointChangeRequest {
  studentId: string;
}

export interface StudentDashboard {
  profile: {
    id: string;
    userId: string;
    email: string;
    displayName: string;
    grade: string | null;
    bio: string | null;
    pointsBalance: number;
    createdAt: string;
    updatedAt: string;
  };
  transactionsCount: number;
  totalPointsEarned: number;
  totalPointsDeducted: number;
  rank: number;
  studentCount: number;
  percentile: number;
  rankMovementLast7Days: number | null;
}

export interface TeacherDashboard {
  studentCount: number;
  totalPoints: number;
  transactionsToday: number;
  pointsAwardedToday: number;
  pointsDeductedToday: number;
}

export interface StudentAnalytics {
  from: string;
  to: string;
  earned: number;
  deducted: number;
  netPoints: number;
  transactionCount: number;
}

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  displayName: string;
  grade?: string | null;
  points: number;
}

export interface PageEnvelope<T> {
  content: T[];
  pageable?: unknown;
  totalPages: number;
  totalElements: number;
  last: boolean;
  size: number;
  number: number;
  sort?: unknown;
  numberOfElements: number;
  first: boolean;
  empty: boolean;
}
