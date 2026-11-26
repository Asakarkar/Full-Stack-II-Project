import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_BASE_URL } from "@/lib/apiConfig";
import { normalizeSpringPage } from "@/lib/pagination";
import { tokenStorage } from "@/lib/storage";
import type {
  AuthResponse,
  LeaderboardEntry,
  PageEnvelope,
  PageResult,
  PointEntry,
  Student,
  StudentAnalytics,
  StudentDashboard,
  TeacherDashboard,
  TeacherPointChangeArgs,
  User,
} from "@/lib/types";

export const rankForgeApi = createApi({
  reducerPath: "rankForgeApi",
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: async (headers) => {
      const token = await tokenStorage.get();
      if (token) headers.set("authorization", `${(await tokenStorage.getType()) || "Bearer"} ${token}`);
      headers.set("content-type", "application/json");
      return headers;
    },
  }),
  tagTypes: ["Dashboard", "Leaderboard", "Students", "Profile", "Points", "Analytics"],
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, { email: string; password: string }>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
    }),
    register: builder.mutation<AuthResponse, { email: string; password: string; displayName: string }>({
      query: (body) => ({ url: "/auth/register", method: "POST", body }),
    }),
    me: builder.query<User, void>({
      query: () => "/auth/me",
      providesTags: ["Profile"],
    }),
    studentDashboard: builder.query<StudentDashboard, void>({
      query: () => "/student/dashboard",
      providesTags: ["Dashboard"],
    }),
    teacherDashboard: builder.query<TeacherDashboard, void>({
      query: () => "/teacher/dashboard",
      providesTags: ["Dashboard"],
    }),
    leaderboard: builder.query<PageResult<LeaderboardEntry>, { page: number; limit: number; sort: "points" | "displayName" | "grade"; order: "asc" | "desc" }>({
      query: ({ page, limit, sort, order }) => ({
        url: "/leaderboard",
        params: {
          page: page - 1,
          size: limit,
          sort: sort === "points" ? "totalPoints" : sort,
          direction: order ? order.toUpperCase() : "DESC",
        },
      }),
      transformResponse: (response: PageEnvelope<LeaderboardEntry>) => {
        const normalized = normalizeSpringPage(response);
        return {
          ...normalized,
          items: (normalized.items || []).map((item: any) => ({
            ...item,
            displayName: item.displayName || item.fullName || "Student",
            points: typeof item.points === "number" ? item.points : Number(item.totalPoints || 0),
          })),
        };
      },
      providesTags: ["Leaderboard"],
    }),
    students: builder.query<PageResult<Student>, {
      page: number;
      limit: number;
      search: string;
      grade: string;
      minPoints: number | null;
      maxPoints: number | null;
      sort: "displayName" | "email" | "grade" | "points" | "updatedAt";
      order: "asc" | "desc";
    }>({
      query: ({ page, limit, search, grade, minPoints, maxPoints, sort, order }) => ({
        url: "/teacher/students",
        params: {
          page: page - 1,
          size: limit,
          search: search || undefined,
          grade: grade || undefined,
          minPoints: minPoints ?? undefined,
          maxPoints: maxPoints ?? undefined,
          sort: `${sort},${order}`,
        },
      }),
      transformResponse: (response: PageEnvelope<Student>) => normalizeSpringPage(response),
      providesTags: ["Students"],
    }),
    studentProfile: builder.query<StudentDashboard["profile"], void>({
      query: () => "/student/profile",
      providesTags: ["Profile"],
    }),
    updateStudentProfile: builder.mutation<StudentDashboard["profile"], Partial<Pick<StudentDashboard["profile"], "displayName" | "grade" | "bio">>>({
      query: (body) => ({ url: "/student/profile", method: "PATCH", body }),
      invalidatesTags: ["Profile", "Dashboard"],
    }),
    studentPoints: builder.query<PageResult<PointEntry>, { page: number; limit: number; sort: "createdAt" | "amount" | "type"; order: "asc" | "desc" }>({
      query: ({ page, limit, sort, order }) => ({ url: "/student/points", params: { page: page - 1, size: limit, sort: `${sort},${order}` } }),
      transformResponse: (response: PageEnvelope<PointEntry>) => normalizeSpringPage(response),
      providesTags: ["Points"],
    }),
    teacherPoints: builder.query<PageResult<PointEntry>, { page: number; limit: number; sort: "createdAt" | "amount" | "type"; order: "asc" | "desc" }>({
      query: ({ page, limit, sort, order }) => ({ url: "/teacher/points", params: { page: page - 1, size: limit, sort: `${sort},${order}` } }),
      transformResponse: (response: PageEnvelope<PointEntry>) => normalizeSpringPage(response),
      providesTags: ["Points"],
    }),
    teacherStudentPoints: builder.query<PageResult<PointEntry>, { studentId: string; page: number; limit: number; sort: "createdAt" | "amount" | "type"; order: "asc" | "desc" }>({
      query: ({ studentId, page, limit, sort, order }) => ({ url: `/teacher/students/${encodeURIComponent(studentId)}/points`, params: { page: page - 1, size: limit, sort: `${sort},${order}` } }),
      transformResponse: (response: PageEnvelope<PointEntry>) => normalizeSpringPage(response),
      providesTags: ["Points"],
    }),
    awardPoints: builder.mutation<PointEntry, TeacherPointChangeArgs>({
      query: ({ studentId, points, reason }) => ({ url: `/teacher/students/${encodeURIComponent(studentId)}/points/award`, method: "POST", body: { points, reason } }),
      invalidatesTags: ["Students", "Points", "Dashboard", "Leaderboard"],
    }),
    deductPoints: builder.mutation<PointEntry, TeacherPointChangeArgs>({
      query: ({ studentId, points, reason }) => ({ url: `/teacher/students/${encodeURIComponent(studentId)}/points/deduct`, method: "POST", body: { points, reason } }),
      invalidatesTags: ["Students", "Points", "Dashboard", "Leaderboard"],
    }),
    studentAnalytics: builder.query<StudentAnalytics, void>({
      query: () => "/student/analytics",
      providesTags: ["Analytics"],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useMeQuery,
  useStudentDashboardQuery,
  useTeacherDashboardQuery,
  useLeaderboardQuery,
  useStudentsQuery,
  useStudentProfileQuery,
  useUpdateStudentProfileMutation,
  useStudentPointsQuery,
  useTeacherPointsQuery,
  useTeacherStudentPointsQuery,
  useAwardPointsMutation,
  useDeductPointsMutation,
  useStudentAnalyticsQuery,
} = rankForgeApi;
