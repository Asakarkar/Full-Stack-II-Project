# RankForge API

Java 17 / Spring Boot 3 REST backend. It uses PostgreSQL, Flyway migrations, JPA, BCrypt, stateless signed JWTs, request validation, and Actuator health probes. No demo accounts or leaderboard rows are created. Registration always creates a student account; teacher accounts must be provisioned by a trusted administrator through the deployment's identity/database process, never through public registration.

## Run

Set `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, and `JWT_SECRET` before starting. `JWT_SECRET` must be Base64 encoding of at least 32 cryptographically random bytes. Optional variables: `PORT` (8080), `DB_POOL_SIZE` (10), and `JWT_EXPIRATION_MS` (3,600,000; accepted range 60,000–86,400,000).

```powershell
$env:DB_URL = "jdbc:postgresql://localhost:5432/rankforge"
$env:DB_USERNAME = "..."
$env:DB_PASSWORD = "..."
# Set JWT_SECRET from a deployment secret manager; do not commit it.
mvn spring-boot:run
```

Flyway applies `src/main/resources/db/migration`; Hibernate validates rather than modifies the schema. `/actuator/health` is public and detailed health data is not exposed.

## API contract

All API paths are under `/api`. Authenticated requests use `Authorization: Bearer <accessToken>`. Error responses have `{ timestamp, status, error, message, path, fieldErrors }`.

* `POST /auth/register` `{email,password,displayName}` creates a student and returns `{accessToken,tokenType,expiresInSeconds,user}`. Passwords require 10–72 characters and at most 72 UTF-8 bytes.
* `POST /auth/login` `{email,password}` returns the same shape; `GET /auth/me` returns the current user.
* Student-only: `GET /student/dashboard`, `GET|PATCH /student/profile`, `GET /student/points`, and `GET /student/analytics?from=<ISO instant>&to=<ISO instant>`. Dashboard rank, population, and percentile are server-derived. Percentile is `100 * (studentCount - rank) / (studentCount - 1)` (100 for a single student). `rankMovementLast7Days` is previous rank minus current rank (positive means improvement), derived from signed ledger deltas and the leaderboard's points-descending, display-name-ascending, UUID-ascending ordering; it is `null` when the student did not yet exist or the historical name ordering cannot be reconstructed. Profile patch fields are `displayName`, `grade`, and `bio`; omitted grade/bio values are unchanged and blank values clear them. Analytics defaults to the preceding 30 days and uses a half-open `[from,to)` interval (maximum 366 days).
* Teacher-only: `GET /teacher/dashboard`, `GET /teacher/points` for paginated recent global activity, `GET /teacher/students?search=&grade=&minPoints=&maxPoints=`, `POST /teacher/students/{studentProfileId}/points/award`, `POST /teacher/students/{studentProfileId}/points/deduct`, and `GET /teacher/students/{studentProfileId}/points`. Point changes accept `{points,reason}` with a positive integer; deductions that exceed the current balance return `409` and do not write a transaction.
* Any authenticated user: `GET /leaderboard`.

List endpoints return Spring's standard `Page` shape, default to `page=0&size=20`, cap page size at 100, and accept a single whitelisted `sort=field,asc|desc`. Available student search sort fields: `displayName`, `email`, `grade`, `points`, `updatedAt`; history: `createdAt`, `amount`, `type`; leaderboard: `points`, `displayName`, `grade`. The default leaderboard is points descending, then display name ascending, then UUID ascending. Rank is the 1-based position in the requested ordering, across pages.

Point balances are changed under a database row lock and recorded in the same transaction. The ledger stores signed amounts (positive award, negative deduction), and each row includes the resulting balance. UUIDs are used for IDs; timestamps are UTC instants.
