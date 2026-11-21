# RankForge REST API

Production-grade Spring Boot 3, Spring Security 6, and PostgreSQL backend for the RankForge student ranking and point transaction system.

---

## Architecture Overview

The backend is structured into clean architectural layers adhering to SOLID design principles and separation of concerns:

```
com.rankforge
├── config/                 # Application properties, CORS, and PasswordEncoder configuration
├── controller/             # REST API controllers (@RestController)
├── dto/
│   ├── request/            # Validated HTTP request payloads (@Valid, @NotBlank, etc.)
│   └── response/           # Strongly-typed API response records
├── entity/                 # JPA database entities (User, StudentProfile, PointTransaction, Role)
├── exception/              # Domain-specific exceptions and @RestControllerAdvice handler
├── mapper/                 # Entity-to-DTO component mappers
├── repository/             # Spring Data JPA repositories with entity graphs & custom queries
├── security/               # Stateless Spring Security 6, JWT filter, and UserDetailsService
└── service/
    ├── [Interfaces]        # Business service abstractions
    └── impl/               # Service implementations (@Transactional, optimistic lock retries)
```

---

## Database Entities & Schema

Flyway manages schema versioning via `src/main/resources/db/migration/V1__init_schema.sql`.

### 1. `users`
- `id` (UUID, Primary Key)
- `full_name` (VARCHAR(100), NOT NULL)
- `email` (VARCHAR(255), UNIQUE, NOT NULL)
- `password_hash` (VARCHAR(255), NOT NULL, BCrypt)
- `role` (`STUDENT` or `TEACHER`, CHECK constraint)
- `created_at`, `updated_at` (TIMESTAMPTZ, UTC)

### 2. `student_profiles`
- `id` (UUID, Primary Key)
- `user_id` (UUID, UNIQUE FK to `users`, ON DELETE CASCADE)
- `total_points` (BIGINT, DEFAULT 0, CHECK `total_points >= 0`)
- `version` (BIGINT, DEFAULT 0, for Optimistic Locking)
- `created_at`, `updated_at` (TIMESTAMPTZ, UTC)

### 3. `point_transactions`
- `id` (UUID, Primary Key)
- `student_id` (UUID, FK to `student_profiles`, ON DELETE RESTRICT)
- `teacher_id` (UUID, FK to `users`, ON DELETE RESTRICT)
- `delta_points` (INTEGER, CHECK `delta_points <> 0`)
- `reason` (VARCHAR(500), NOT NULL)
- `created_at` (TIMESTAMPTZ, UTC)

---

## Security Model & Teacher Provisioning

### Threat Analysis: Public Teacher Registration
Allowing unrestricted registration with `role: TEACHER` poses a critical security vulnerability:
- Untrusted users could self-elevate to administrative privileges.
- Malicious actors could award arbitrary points, manipulate the competition leaderboard, or deplete peers' points.
- Teachers have access to private student transaction histories and analytical summaries.

### Invocation Code Protection
To eliminate this risk during public demonstrations and local development:
- Public sign-ups default to `STUDENT` accounts (which automatically provisions a `StudentProfile` with 0 points).
- Registration with `role: TEACHER` strictly requires an administrative `invitationCode` matching the environment secret `TEACHER_INVITATION_CODE`.
- Unauthorized requests fail with `403 FORBIDDEN`.

---

## Leaderboard & Tie-Ranking Engine

- **Sorting**: Ordered by `totalPoints DESC`.
- **Tie-Breaking**: Ties in points are broken deterministically by immutable student `id ASC` (UUID).
- **Competition Ranking**: Ranks are computed directly in the database (`1 + COUNT(*) WHERE total_points > :points`), implementing standard competition (1224) ranking.
- **Direct User Lookup**: Students can look up their exact competition rank without loading or streaming the entire population.
- **Pagination**: Server-side pagination with whitelisted sort fields (`totalPoints`, `id`), maximum page size of 100, and bounds checking.

---

## Concurrency & Point Distribution Safety

- **Atomic Ledger**: Point balances are never modified without creating a corresponding `PointTransaction` record in the same transaction.
- **Zero-Value Protection**: Zero point deltas are rejected (`400 Bad Request`).
- **Negative Balance Prevention**: Point deductions cannot result in a balance below 0 (`409 Conflict`).
- **Optimistic Locking with Retry**: `StudentProfile` utilizes `@Version`. Point adjustment operations execute with `Propagation.REQUIRES_NEW` and exponential backoff with randomized jitter (up to 12 attempts), safely resolving high-contention race conditions without deadlock.

---

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register a student or teacher (with invitation code)
- `POST /api/v1/auth/login` - Authenticate and receive stateless JWT
- `GET /api/v1/auth/me` - Get current authenticated user profile

### Students
- `GET /api/v1/students/me` - Get authenticated student's profile & rank
- `GET /api/v1/students/{id}` - Get student profile (authorized student or teacher)
- `GET /api/v1/students/{id}/transactions` - Get paginated transaction history

### Leaderboard
- `GET /api/v1/leaderboard?page=0&size=20&direction=DESC` - Paginated competition leaderboard
- `GET /api/v1/leaderboard/me` - Authenticated student's leaderboard rank entry

### Teacher
- `GET /api/v1/teacher/dashboard` - Global platform statistics & daily aggregations
- `GET /api/v1/teacher/students` - Paginated student directory with search
- `POST /api/v1/teacher/students/{id}/points` - Award or deduct student points

---

## Quickstart & Commands

### 1. Launch PostgreSQL
```bash
docker compose up -d
```

### 2. Run Database Migrations & Start Application
```powershell
$env:DB_URL="jdbc:postgresql://localhost:5432/rankforge"
$env:DB_USERNAME="postgres"
$env:DB_PASSWORD="postgrespassword"
$env:JWT_SECRET="dGVzdC1zZWNyZXQta2V5LXNob3VsZC1iZS1hdC1sZWFzdC0yNTYtYml0cy1sb25nLWZvci1oczI1NiE="
$env:TEACHER_INVITATION_CODE="RANKFORGE-TEACHER-SECRET-KEY-2026"

mvn spring-boot:run
```

### 3. Run Test Suite
```powershell
mvn clean test
```

---

## Example Requests (cURL)

### 1. Register a Student
```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Student One",
    "email": "student1@example.com",
    "password": "Password123!",
    "role": "STUDENT"
  }'
```

### 2. Register a Teacher (Requires Invitation Code)
```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Teacher Lead",
    "email": "teacher1@example.com",
    "password": "Password123!",
    "role": "TEACHER",
    "invitationCode": "RANKFORGE-TEACHER-SECRET-KEY-2026"
  }'
```

### 3. Login
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student1@example.com",
    "password": "Password123!"
  }'
```

### 4. Award Points (Teacher Token Required)
```bash
curl -X POST http://localhost:8080/api/v1/teacher/students/<STUDENT_PROFILE_UUID>/points \
  -H "Authorization: Bearer <TEACHER_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "points": 10,
    "reason": "Excellent academic performance"
  }'
```

### 5. Deduct Points (Teacher Token Required)
```bash
curl -X POST http://localhost:8080/api/v1/teacher/students/<STUDENT_PROFILE_UUID>/points \
  -H "Authorization: Bearer <TEACHER_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "points": -5,
    "reason": "Late assignment submission"
  }'
```

### 6. View Leaderboard
```bash
curl -X GET "http://localhost:8080/api/v1/leaderboard?page=0&size=20&direction=DESC" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### 7. View Authenticated Student's Own Rank
```bash
curl -X GET http://localhost:8080/api/v1/students/me \
  -H "Authorization: Bearer <STUDENT_JWT_TOKEN>"
```

### 8. Teacher Dashboard Statistics
```bash
curl -X GET http://localhost:8080/api/v1/teacher/dashboard \
  -H "Authorization: Bearer <TEACHER_JWT_TOKEN>"
```
