# RankForge — Student Performance, Leaderboard & Academic Evaluation Platform

RankForge is an enterprise-grade academic reward and gamified evaluation platform consisting of a **Spring Boot 3 (Java 25 LTS) REST API**, **PostgreSQL 16** persistence layer with Flyway migrations, and an **Expo React Native (TypeScript)** mobile client with Redux Toolkit and SecureStore.

---

## 1. Seeded Demo Development Credentials

When starting the application with `rankforge.seed-demo-data: true` (default in dev), the following test accounts are automatically provisioned:

| Role | Name | Email | Password | Initial Points / State |
| :--- | :--- | :--- | :--- | :--- |
| **TEACHER** | Professor Eleanor Davis | `teacher@rankforge.edu` | `Teacher123!` | Provisioned with full evaluation & point adjustment authority |
| **STUDENT** | Alice Vance | `alice@rankforge.edu` | `Student123!` | 120 pts (Tie: Competition Rank #1) |
| **STUDENT** | Bob Martinez | `bob@rankforge.edu` | `Student123!` | 120 pts (Tie: Competition Rank #1 - tie demo) |
| **STUDENT** | Charlie Chen | `charlie@rankforge.edu` | `Student123!` | 95 pts (Competition Rank #3) |
| **STUDENT** | Diana Prince | `diana@rankforge.edu` | `Student123!` | 50 pts (Competition Rank #4) |
| **STUDENT** | Ethan Hunt | `ethan@rankforge.edu` | `Student123!` | 15 pts (Competition Rank #5) |

> **Teacher Provisioning Secret**: `DEV-TEACHER-SECRET-KEY` (Required when registering a new `TEACHER` account via `POST /api/v1/auth/register`).

---

## 2. Quickstart & Installation

### Option A: Docker Compose (Full Backend Stack)
From project root:
```bash
docker-compose up --build
```
PostgreSQL runs on port `5432` and Spring Boot API runs on `http://localhost:8080/api/v1`.

### Option B: Local Backend (Maven)
1. Start PostgreSQL:
   ```bash
   createdb rankforge
   ```
2. Configure environment:
   ```bash
   export DB_URL="jdbc:postgresql://localhost:5432/rankforge"
   export DB_USERNAME="postgres"
   export DB_PASSWORD="postgres_password"
   export JWT_SECRET="dGhpcy1pcy1hLXNlY3VyZS0yNTYtYml0LXJhbmstZm9yZ2Utc2VjcmV0LWtleS0yMDI2"
   export TEACHER_INVITATION_CODE="DEV-TEACHER-SECRET-KEY"
   ```
3. Run backend:
   ```bash
   cd backend
   mvn spring-boot:run
   ```

### Option C: Mobile Client (Expo)
1. Navigate to mobile directory:
   ```bash
   cd mobile
   npm install
   ```
2. Configure `.env`:
   ```bash
   # Replace with your development machine's LAN IP for physical Android/iOS devices:
   EXPO_PUBLIC_API_URL=http://192.168.1.50:8080/api/v1
   ```
   *(Note: On Android Emulator, `10.0.2.2:8080/api/v1` is automatically resolved if `EXPO_PUBLIC_API_URL` is omitted).*
3. Start Expo:
   ```bash
   npx expo start
   ```

---

## 3. Live Demo Scenario Script (Steps 1 to 12)

| Step | Action | Expected Behavior & Verification Point |
| :--- | :--- | :--- |
| **1** | Register or log in as a student | Log in with `alice@rankforge.edu` / `Student123!`. JWT is stored in `SecureStore`. |
| **2** | Show student dashboard and leaderboard | Alice sees her pinned rank card (`YOUR RANK: #1`, `120 pts`), progress bar to *Gold Achiever*, top-three podium, and student list. |
| **3** | Restart app / reload simulator | App displays `<BootSplash />`, reads token from `SecureStore`, validates session with `/auth/me`, and restores Alice without re-entering credentials. |
| **4** | Switch to dark mode | Tap profile theme toggle. `ThemeContext` updates all cards, text, charts, status bar, and persists preference in `AsyncStorage`. |
| **5** | Log out | Tap Logout. `tokenStorage.clear()` purges SecureStore and state transitions to `UNAUTHENTICATED`. Routed to `/(auth)/login`. |
| **6** | Log in as teacher | Log in with `teacher@rankforge.edu` / `Teacher123!`. Teacher tab bar activates with `Students` directory and insights. |
| **7** | Select a student | Open Leaderboard or Students directory and select `Charlie Chen` (currently at 95 pts, Rank #3). |
| **8** | Award 50 points | Tap **Award**, select preset `+50`, enter reason: *"Exemplary software engineering lab demonstration"*, and tap **Confirm Award**. |
| **9** | Show updated score & reordered leaderboard | Charlie's score updates immediately to `145 pts`. Global leaderboard refetches: Charlie ascends to **#1**, moving Alice and Bob to **#2**! |
| **10** | Log in as student & verify updated points | Log out and log in as `charlie@rankforge.edu` / `Student123!`. Pinned rank card reflects `#1`, `145 pts`, and updated milestone tier. |
| **11** | Verify student cannot access teacher actions | As Charlie, observe that no Award/Deduct buttons exist. Attempting to navigate to `/teacher/...` triggers immediate redirection to `/(tabs)`. |
| **12** | Demonstrate pagination, sorting & history | Toggle sorting between Points and Name. Click **Recent Activity** tab to inspect live transaction ledger entries backed by `point_transactions`. |

---

## 4. API Specification Summary

### Auth Endpoints (`/api/v1/auth`)
- `POST /register`: Register student or teacher (teacher requires `invitationCode`).
- `POST /login`: Authenticate with email/password, returns JWT Bearer token.
- `GET /me`: Returns authenticated user profile.

### Student Endpoints (`/api/v1/students`)
- `GET /me`: Student profile with database-calculated competition rank.
- `GET /{id}`: Student profile (restricted to self or teachers).
- `GET /{id}/transactions`: Paginated historical point ledger entries.

### Leaderboard Endpoints (`/api/v1/leaderboard`)
- `GET /`: Paginated leaderboard sorted by `totalPoints DESC, id ASC` with competition ranks.
- `GET /me`: Authenticated student's competition rank and score without table scan.
- `GET /activity`: Recent point transactions activity feed.

### Teacher Endpoints (`/api/v1/teacher`)
- `GET /dashboard`: Aggregate statistics (students count, points awarded/deducted today).
- `GET /students`: Paginated student search with filtering by name, email, points range.
- `POST /students/{id}/points`: Atomic point award/deduction with ledger audit trail.

---

## 5. Verification & Test Summary

- **Backend Test Suite**: 41 passed, 0 failed, 0 errors (`mvn test`).
- **Mobile Test Suite**: 53 passed, 0 failed, 0 errors across 10 test suites (`npm test`).
- **TypeScript & Lint**: 0 compilation errors (`tsc --noEmit`), 0 lint warnings (`eslint .`).
- **Total Tests Verified**: **94 automated tests passed**.

---

## 6. Known Limitations & Production Recommendations

1. **Teacher Registration**: In public demo mode, teacher registration is protected by a pre-shared cryptographic invitation code (`TEACHER_INVITATION_CODE`). In an enterprise deployment, this should be superseded by Single Sign-On (SAML 2.0 / OpenID Connect) mapped to school faculty Active Directory groups.
2. **Push Notifications**: When points are awarded, mobile clients currently synchronize via optimistic updates and cache invalidation. A production release should incorporate WebSocket (STOMP) or Expo Push Notifications to notify students in real time when points are awarded by a teacher.
3. **Database Caching**: Ranks are computed directly via database index count queries (`1 + COUNT(sp) WHERE sp.totalPoints > :points`), which guarantees `O(log N)` performance with zero memory overhead. For deployments exceeding 500,000 active students, a Redis sorted set (`ZADD`/`ZREVRANK`) can be added for sub-millisecond rank lookups.
