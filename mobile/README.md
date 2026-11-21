# RankForge Mobile

RankForge is an Expo Router React Native app for student learning and teacher classroom management. It uses Redux Toolkit and RTK Query, SecureStore for access tokens, AsyncStorage for theme preference, Reanimated, SVG charts, Lucide icons, Plus Jakarta Sans, and JetBrains Mono.

## Local setup

1. Use Node.js LTS and run `npm install` from `mobile/`.
2. Copy `.env.example` to `.env`. Set `EXPO_PUBLIC_API_URL` to the backend API root, including the `/api` prefix (for example `http://localhost:8080/api`).
3. Run `npm start`, then launch an emulator or scan the Expo Go QR code.

For a physical phone, `localhost` means the phone itself. Use your computer's LAN IP (for example `http://192.168.1.20:8080/api`), connect both devices to the same network, allow the backend port through the firewall, and make the backend listen on `0.0.0.0`. Android emulator uses `http://10.0.2.2:8080/api`; iOS simulator can normally use `http://localhost:8080/api`. The API URL is read from `EXPO_PUBLIC_API_URL` at build/start time. Native apps persist credentials in SecureStore; web preview keeps its token in memory only because browsers do not provide Expo SecureStore.

## Backend contract

The client uses the `/api` prefix exactly; set `EXPO_PUBLIC_API_URL` to the full root such as `https://host.example/api`. It sends JSON and uses the returned `tokenType` and `accessToken` for the authorization header. Roles are `STUDENT` and `TEACHER`.

| Method | Path | Request / response |
| --- | --- | --- |
| POST | `/api/auth/register` | `{ email, password, displayName }` → `{ accessToken, tokenType, expiresInSeconds, user }`; public registration creates students only; password is 10–72 UTF-8 bytes |
| POST | `/api/auth/login` | `{ email, password }` → same session response |
| GET | `/api/auth/me` | Authenticated user `{ id, email, displayName, role, createdAt }` |
| GET | `/api/student/dashboard` | `{ profile, rank, studentCount, percentile, rankMovementLast7Days, transactionsCount, totalPointsEarned, totalPointsDeducted }`; rank movement is `null` when unavailable |
| GET / PATCH | `/api/student/profile` | Profile `{ id, userId, email, displayName, grade, bio, pointsBalance, createdAt, updatedAt }`; PATCH supports optional `displayName` (≤100), `grade` (≤50), `bio` (≤500) |
| GET | `/api/student/points` | Spring `Page` of point transaction DTOs; supports `page`, `size`, `sort=createdAt|amount|type,asc|desc`; default newest first with UUID-desc tie-break |
| GET | `/api/student/analytics` | `{ from, to, earned, deducted, netPoints, transactionCount }`; optional ISO date-time `from`/`to`, defaults to the last 30 days |
| GET | `/api/teacher/dashboard` | `{ studentCount, totalPoints, transactionsToday, pointsAwardedToday, pointsDeductedToday }` |
| GET | `/api/teacher/students` | Spring `Page` of `{ id, userId, displayName, email, grade, pointsBalance }`; supports `search` (name/email), case-insensitive exact `grade`, `minPoints`, `maxPoints`, `page`, `size`, and sort allowlist `displayName|email|grade|points|updatedAt` |
| GET | `/api/teacher/students/{studentId}/points` | Spring `Page` of the exact point transaction DTO; page defaults to 0, size to 20 (max 100), sort allowlist `createdAt|amount|type` |
| POST | `/api/teacher/students/{studentId}/points/award` | `{ points, reason }`; positive integer points, non-blank reason up to 500 characters |
| POST | `/api/teacher/students/{studentId}/points/deduct` | `{ points, reason }`; deduct also sends positive points |
| GET | `/api/teacher/points` | Spring `Page` of recent transactions with page defaults 0/20 (max 100); sort allowlist `createdAt|amount|type`, default newest first with UUID-desc tie-break |
| GET | `/api/leaderboard` | Spring `Page` of `{ rank, studentId, displayName, grade, points }`; supports `page`, `size`, and sort allowlist `points|displayName|grade`, default points descending then display name/UUID ascending |

Every history item is `{ id, studentId, studentName, actorId, actorName, type: "AWARD"|"DEDUCTION", amount, reason, balanceAfter, createdAt }`; amounts and balances are signed 64-bit integers serialized as JSON numbers. Spring Page fields (`content`, `totalPages`, `totalElements`, `last`, `size`, `number`, `first`, `empty`) are normalized by the API layer. The UI converts its one-based page number to Spring's zero-based `page` parameter. Teacher student IDs are student-profile UUIDs, not user UUIDs. Leaderboard does not define a server search parameter, so its search control is scoped to the currently loaded server page.

Backend errors such as `{ timestamp, status, error, message, path, fieldErrors }` are surfaced as readable screen errors. No public teacher registration, fabricated metrics, synthetic chart series, or fake activity is shown. Dashboard rank, student count, and percentile are read directly from the student dashboard response; rank movement is explicitly unavailable when the server returns `null`. The teacher dashboard's recent activity uses the confirmed `/api/teacher/points` endpoint.
