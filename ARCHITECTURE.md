# RankForge Architecture

RankForge is a mobile-first student performance and points platform. The Expo app is an API client; authorization, score changes, pagination, and rankings are enforced by the Spring Boot service.

## System architecture

```text
Expo Router screens
  -> feature components
  -> Redux Toolkit slices / RTK Query
  -> authenticated API client
  -> Spring Security + REST controllers
  -> services (@Transactional where needed)
  -> Spring Data JPA repositories
  -> PostgreSQL
```

The backend is organized as controller → service → repository. Controllers validate and translate HTTP requests, services own authorization-sensitive business rules and transactions, and repositories perform persistence. Flyway owns schema changes. The mobile app never treats client-side role checks as authorization.

## Monorepo structure

```text
rankforge/
├── ARCHITECTURE.md
├── README.md
├── .gitignore
├── backend/
│   ├── pom.xml
│   └── src/main/java/.../
│       ├── config/
│       ├── security/
│       ├── auth/
│       ├── student/
│       ├── leaderboard/
│       ├── points/
│       └── common/
└── mobile/
    ├── app/                 # Expo Router routes and layouts
    ├── src/
    │   ├── components/
    │   ├── features/        # auth, leaderboard, students, points
    │   ├── services/        # RTK Query API and secure token storage
    │   ├── store/           # Redux store and required slices
    │   ├── theme/
    │   └── types/
    └── package.json
```

## Database schema

All primary keys are UUIDs. All tables include `created_at` and `updated_at` timestamps (UTC). PostgreSQL constraints are the final integrity boundary.

| Table | Important columns and constraints |
|---|---|
| `users` | `id`, normalized unique `email`, `password_hash` (BCrypt), `role` (`STUDENT` or `TEACHER`), `display_name`, `active`, timestamps. Index role and active status. |
| `student_profiles` | `id`, unique `user_id` FK to `users`, `points` (non-negative integer), optional permitted profile fields such as class/grade, timestamps. Index points for leaderboard ordering. |
| `point_transactions` | `id`, `student_profile_id` FK, `actor_user_id` FK, non-zero signed `delta`, resulting `balance`, optional reason, timestamps. Index `(student_profile_id, created_at DESC)` and `(actor_user_id, created_at DESC)`. |
| `teacher_profiles` (optional) | `id`, unique `user_id` FK to `users`, optional display/profile fields, timestamps. |

Point adjustments lock the affected student profile, validate the resulting non-negative balance, update the balance, and insert the corresponding transaction within one database transaction. A failure rolls back both writes. A point transaction is immutable after creation.

## REST API contract

The implemented base path is `/api`. Authentication uses `Authorization: Bearer <accessToken>`. Login and registration return `{ "accessToken", "tokenType", "expiresInSeconds", "user": { "id", "email", "displayName", "role", "createdAt" } }`. Register accepts `{ "email", "password", "displayName" }` and creates a student only; teacher access must be provisioned through a trusted process. Login accepts `{ "email", "password" }`. Password hashes are never included in public responses. Errors use this JSON shape (`fieldErrors` is empty when there are no field-specific errors; unexpected errors return a generic message):

```json
{
  "timestamp": "2026-11-21T15:53:29Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Request validation failed",
  "path": "/api/...",
  "fieldErrors": {
    "email": "must be a well-formed email address"
  }
}
```

| Method | Path | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Create a student account. |
| `POST` | `/api/auth/login` | Public | Authenticate and return a JWT and public user summary. |
| `GET` | `/api/auth/me` | Authenticated | Return the current user's public profile summary. |
| `GET` | `/api/student/dashboard` | Student | Personal score, rank, and dashboard summary. |
| `GET` / `PATCH` | `/api/student/profile` | Student | Read or update the authenticated student's permitted profile. |
| `GET` | `/api/student/points` | Student | Own paginated point transaction history. |
| `GET` | `/api/student/analytics` | Student | Own points/performance analytics. |
| `GET` | `/api/leaderboard` | Authenticated | Paginated, sortable leaderboard. |
| `GET` | `/api/teacher/dashboard` | Teacher | Teacher dashboard summary. |
| `GET` | `/api/teacher/students` | Teacher | Search, filter, sort, and paginate students. |
| `GET` | `/api/teacher/points` | Teacher | Paginated global point activity, newest first by default. |
| `GET` | `/api/teacher/students/{studentId}/points` | Teacher | Paginated transaction history for a student profile UUID. |
| `POST` | `/api/teacher/students/{studentId}/points/award` | Teacher | Award points to a student profile UUID. |
| `POST` | `/api/teacher/students/{studentId}/points/deduct` | Teacher | Deduct points from a student profile UUID. |

Collection endpoints accept `page` (zero-based, default `0`), `size` (default `20`, maximum `100`), and `sort=field,asc|desc`. They return Spring's `Page` shape, including `content`, `pageable`, `totalPages`, `totalElements`, `last`, `size`, `number`, `sort`, `numberOfElements`, `first`, and `empty`. Teacher student search also accepts `search`, `grade`, `minPoints`, and `maxPoints`; search matches display name/email, and grade is exact and case-insensitive. Sort allowlists are `displayName,email,grade,points,updatedAt` for teacher student search; `createdAt,amount,type` for point history; and `points,displayName,grade` for leaderboard. Point-history sort defaults to `createdAt,desc`, with UUID descending as a stable tie-breaker. Leaderboard defaults to points descending, then display name and UUID ascending.

Award and deduction requests use `{ "points": 25, "reason": "Completed assignment" }`. `points` is a positive integer and `reason` is nonblank, up to 500 characters; deductions also send a positive amount. The resulting transaction (also used in history responses) contains `id`, `studentId`, `studentName`, `actorId`, `actorName`, `type` (`AWARD` or `DEDUCTION`), `amount`, `reason`, `balanceAfter`, and `createdAt`.

Leaderboard order and rank are server-side and deterministic. Tied scores receive sequential positions in the ordered list, rather than a shared competition rank. The frontend must use backend-provided rank and never ship seeded or hardcoded leaderboard records in production flows.

Key response fields: student dashboard returns `profile`, `transactionsCount`, `totalPointsEarned`, `totalPointsDeducted`, `rank`, `studentCount`, `percentile` (top rank is 100), and nullable `rankMovementLast7Days` (positive means improved rank). The previous rank is reconstructed from signed point-ledger deltas and is null when historical comparison is unavailable. Leaderboard entries include `rank`, `studentId`, `displayName`, `grade`, and `points`; student analytics includes `from`, `to`, `earned`, `deducted`, `netPoints`, and `transactionCount`; teacher dashboard includes `studentCount`, `totalPoints`, `transactionsToday`, `pointsAwardedToday`, and `pointsDeductedToday`; teacher student search entries include `id`, `userId`, `displayName`, `email`, `grade`, and `pointsBalance`. Student profile includes `id`, `userId`, `email`, `displayName`, `grade`, `bio`, `pointsBalance`, `createdAt`, and `updatedAt`.

Teacher endpoints require the teacher role at the API boundary. Student endpoints derive the subject from the authenticated JWT, not a client-supplied user ID. Point operations require a teacher identity and are transactional.

## Mobile navigation and state

Expo Router uses a root provider/layout for Redux, theme, safe-area, and notification handling. The auth bootstrap reads the JWT from Expo SecureStore, then validates it with `/auth/me` before rendering protected routes. Unauthenticated users go to sign-in; authenticated users are routed to role-appropriate student or teacher tabs. Route guards improve UX only; the server remains authoritative. Logout clears SecureStore and Redux state.

Role-specific bottom tabs provide the primary navigation. Student routes cover dashboard, leaderboard, point history, profile, and settings. Teacher routes cover dashboard, leaderboard, student management, point history, award points, and settings. Auth routes include splash/bootstrap, login, and registration. Detail and confirmation flows are pushed above the tabs.

The mobile design system is light-first: background `#F8F9FC`, surface `#FFFFFF`, primary `#635BFF`, soft primary `#EEECFF`, text `#17182B`, secondary text `#7B8094`, and success `#16A085`. Dark mode uses background `#10111B`, surface `#1B1D2B`, primary `#918BFF`, text `#F7F8FC`, and secondary text `#A4A9BD`. Plus Jakarta Sans is used for interface typography and JetBrains Mono for score/rank metrics. Shared tokens govern spacing, radii, typography, and elevation. Gradients and shadows remain restrained; layouts respect safe areas, accessible contrast, and Android screen-size variation.

Dashboard metrics, podium entries, rank movement, and point activity are rendered only when supplied by API responses; absent backend data is shown as unavailable or omitted, not synthesized. Leaderboard and student lists use server-driven pagination/sorting with performant virtualized rows. Refreshable views provide loading skeletons, retryable errors, and intentional empty states.

Required Redux state:

| Slice | Responsibility |
|---|---|
| `authSlice` | Authentication/bootstrap lifecycle and current public user; JWT persistence is delegated to SecureStore/API middleware. |
| `leaderboardSlice` | Current page, sort, filters, and cached leaderboard result state. |
| `studentSlice` | Student profile, dashboard, analytics, teacher student list, filters, and pagination. |
| `pointsSlice` | Current point history and teacher adjustment operation state. |

RTK Query owns server request lifecycle, caching, and invalidation; the required slices retain feature/UI state and normalized selections. `ThemeProvider` persists only the theme preference in AsyncStorage and supplies tokens to all screens. A notification provider may expose success/error feedback without replacing inline field validation.

## Implementation plan

1. **Foundation and contract** — establish monorepo structure, document API/database/navigation/state contracts, and define environment configuration.
2. **Backend** — implement migrations, entities, authentication/security, student and teacher services, pagination, deterministic leaderboard, point transactions, error envelope, and tests.
3. **Mobile** — implement Expo navigation, theme, secure auth persistence, API integration, student/teacher experiences, and loading/error/empty states.
4. **Integration and verification** — run focused backend and TypeScript checks, validate endpoint/DTO alignment, fix defects, and document device and database setup.

## Configuration and runtime notes

Secrets and deployment-specific values belong in environment variables, never in source control. The Expo app uses `EXPO_PUBLIC_API_URL`; on a physical Android device this must point to a backend address reachable over the same network (the device's `localhost` is not the development computer). PostgreSQL connection settings and JWT signing configuration are supplied to the backend through environment variables.
