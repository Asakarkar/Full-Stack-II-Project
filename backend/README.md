# RankForge REST API

Spring Boot 3, Spring Security 6, and MySQL/PostgreSQL backend for the RankForge student ranking and point transaction system.

---

## Architecture Overview

The backend is structured into clean architectural layers adhering to SOLID design principles and separation of concerns:

```
com.rankforge
├── config/                 # Application properties, CORS, DemoDataSeeder, and PasswordEncoder
├── controller/             # REST API controllers supporting dual /api/v1/ and /api/ routes
├── dto/
│   ├── request/            # Validated HTTP request records (@Valid, @NotBlank, etc.)
│   └── response/           # Strongly-typed API response records
├── entity/                 # JPA database entities (User, StudentProfile, PointTransaction, Role)
├── exception/              # Domain-specific exceptions and @RestControllerAdvice handler
├── mapper/                 # Entity-to-DTO component mappers
├── repository/             # Spring Data JPA repositories with entity graphs & custom count queries
├── security/               # Stateless Spring Security 6, JWT filter, and UserDetailsService
└── service/
    ├── [Interfaces]        # Business service abstractions
    └── impl/               # Service implementations (@Transactional, optimistic lock retries)
```

---

## Database Entities & Schema

Flyway manages schema versioning via `src/main/resources/db/migration/`.

### 1. `users`
- `id` (VARCHAR(36) UUID, Primary Key)
- `full_name` (VARCHAR(100), NOT NULL)
- `username` (VARCHAR(50), UNIQUE, NOT NULL; public profile handle)
- `email` (VARCHAR(255), UNIQUE, NOT NULL)
- `password_hash` (VARCHAR(255), NOT NULL, BCrypt)
- `role` (`STUDENT` or `TEACHER`, CHECK constraint)
- `created_at`, `updated_at` (TIMESTAMP, UTC)

### 2. `student_profiles`
- `id` (VARCHAR(36) UUID, Primary Key)
- `user_id` (VARCHAR(36) UUID, UNIQUE FK to `users`, ON DELETE CASCADE)
- `total_points` (BIGINT, DEFAULT 0, CHECK `total_points >= 0`)
- `version` (BIGINT, DEFAULT 0, for Optimistic Locking)
- `created_at`, `updated_at` (TIMESTAMP, UTC)

### 3. `point_transactions`
- `id` (VARCHAR(36) UUID, Primary Key)
- `student_id` (VARCHAR(36) UUID, FK to `student_profiles`, ON DELETE RESTRICT)
- `teacher_id` (VARCHAR(36) UUID, FK to `users`, ON DELETE RESTRICT)
- `delta_points` (INTEGER, CHECK `delta_points <> 0`)
- `reason` (VARCHAR(500), NOT NULL)
- `created_at` (TIMESTAMP, UTC)

---

## Security Model & Teacher Provisioning

- **Stateless Authentication**: Uses Bearer JWT tokens signed with HMAC-SHA256.
- **Account Names**: Every account has a unique username for display; users continue to sign in with their email address.
- **Role-Based Guards**: Method-level security with `@PreAuthorize("hasRole('TEACHER')")` protects teacher endpoints.
- **Teacher Registration Protection**: Public signups create `STUDENT` profiles. Registering with `role: TEACHER` requires an administrative `invitationCode` matching the server secret `TEACHER_INVITATION_CODE`. Unauthorized attempts fail with `403 FORBIDDEN`.

---

## Concurrency & Point Transaction Safety

- **Atomic Ledger**: Point balances are modified strictly alongside a new `PointTransaction` audit entry in the same transaction.
- **Zero-Value & Negative Balance Protection**: Point deltas of 0 are rejected (`400 Bad Request`). Deductions that would result in a balance below 0 are rejected (`409 Conflict`).
- **Optimistic Locking**: `StudentProfile` uses JPA `@Version` with retry handling to resolve concurrent point modifications gracefully without race conditions.

---

## Quickstart & Commands

### 1. Configure Database Connection
Configure via environment variables or `.env`:
```powershell
$env:DB_URL="jdbc:mysql://127.0.0.1:3306/rankforge?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
$env:DB_USERNAME="root"
$env:DB_PASSWORD="your_mysql_password"
$env:JWT_SECRET="dGVzdC1zZWNyZXQta2V5LXNob3VsZC1iZS1hdC1sZWFzdC0yNTYtYml0cy1sb25nLWZvci1oczI1NiE="
$env:TEACHER_INVITATION_CODE="DEV-TEACHER-SECRET-KEY"
```

### 2. Compile & Run Application
```powershell
mvn clean compile
mvn spring-boot:run
```

The application runs on `http://localhost:8080`.

---

## API Summary

All endpoints are available under both `/api/v1/` and `/api/`:

- **Auth**: `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- **Student**: `GET /students/me`, `GET /students/dashboard`, `GET /students/analytics`, `GET /students/points`, `GET /students/{id}`, `GET /students/{id}/transactions`
- **Leaderboard**: `GET /leaderboard` (supports `page`, `size`, `sort`, `direction`), `GET /leaderboard/me`, `GET /leaderboard/activity`
- **Teacher**: `GET /teacher/dashboard`, `GET /teacher/students`, `GET /teacher/points`, `GET /teacher/students/{id}/points`, `POST /teacher/students/{id}/points`, `POST /teacher/students/{id}/points/award`, `POST /teacher/students/{id}/points/deduct`
