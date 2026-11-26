# RankForge — Student Performance, Leaderboard & Academic Evaluation Platform

RankForge is an academic reward, gamified evaluation, and classroom management platform. It features a high-performance **Spring Boot 3 (Java 25 LTS) REST API**, a relational persistence layer managed via **Flyway migrations** (configured for **MySQL 8** with native support for **PostgreSQL**), and a responsive **React Native / Expo SDK 58** client built with **TypeScript**, **Redux Toolkit**, and **React Native Web**.

---

## 1. System Architecture

```
├── backend/                  # Spring Boot 3 REST API
│   ├── src/main/java/        # Clean layered architecture (Controllers, Services, DTOs, Entities, Security)
│   ├── src/main/resources/   # Application configuration & Flyway database migrations
│   └── pom.xml               # Maven configuration (Java 25 LTS, Spring Boot 3)
│
├── mobile/                   # Cross-Platform React Native Client (Expo SDK 58)
│   ├── app/                  # Expo Router tab and auth navigation routes
│   ├── components/           # Reusable responsive UI cards, charts, sheets, and inputs
│   ├── hooks/                # Custom responsive and viewport hooks
│   ├── store/                # Redux Toolkit state slices (auth, leaderboard, points)
│   └── lib/                  # API client, secure storage, and TypeScript domain models
```

### Technology Stack
- **Frontend**: React Native, Expo SDK 58, Expo Router, TypeScript, Redux Toolkit, React Native Web, Lucide Icons, Reanimated.
- **Backend**: Java 25 LTS, Spring Boot 3.x, Spring Security 6, Spring Data JPA, Hibernate, Flyway.
- **Database**: MySQL 8.0 (default local configuration) / PostgreSQL compatible, with automated Flyway schema versioning.
- **Design & Layout**: Responsive adaptive design adjusting automatically across mobile phones, tablets, and desktop browsers.

---

## 2. Seeded Demo Development Credentials

When starting the application with `rankforge.seed-demo-data: true` (default in development), the database automatically seeds the following accounts:

| Role | Name | Email | Password | Initial State / Points |
| :--- | :--- | :--- | :--- | :--- |
| **TEACHER** | Professor Eleanor Davis | `teacher@rankforge.edu` | `Teacher123!` | Class evaluation authority, point awards & deductions |
| **STUDENT** | Alice Vance | `alice@rankforge.edu` | `Student123!` | 120 pts (Tie: Competition Rank #1) |
| **STUDENT** | Bob Martinez | `bob@rankforge.edu` | `Student123!` | 120 pts (Tie: Competition Rank #1 - tiebreak demo) |
| **STUDENT** | Charlie Chen | `charlie@rankforge.edu` | `Student123!` | 95 pts (Competition Rank #3) |
| **STUDENT** | Diana Prince | `diana@rankforge.edu` | `Student123!` | 50 pts (Competition Rank #4) |
| **STUDENT** | Ethan Hunt | `ethan@rankforge.edu` | `Student123!` | 15 pts (Competition Rank #5) |

> **Teacher Provisioning Secret**: `DEV-TEACHER-SECRET-KEY` (or `RANKFORGE-TEACHER-SECRET-KEY-2026`). Required when registering a new `TEACHER` account to prevent unauthorized privilege escalation.

---

## 3. Quickstart & Installation

### A. Backend Setup

#### 1. Database Configuration
By default, the backend connects to MySQL on `127.0.0.1:3306`. Configure credentials via environment variables or `backend/.env`:

```env
DB_URL=jdbc:mysql://127.0.0.1:3306/rankforge?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
DB_USERNAME=root
DB_PASSWORD=your_password
PORT=8080
JWT_SECRET=dGVzdC1zZWNyZXQta2V5LXNob3VsZC1iZS1hdC1sZWFzdC0yNTYtYml0cy1sb25nLWZvci1oczI1NiE=
TEACHER_INVITATION_CODE=DEV-TEACHER-SECRET-KEY
SEED_DEMO_DATA=true
```

*(For PostgreSQL, update `DB_URL=jdbc:postgresql://localhost:5432/rankforge` and driver configuration in `application.yml`).*

#### 2. Run the Backend
```bash
cd backend
mvn compile
mvn spring-boot:run
```
The REST API will start at `http://localhost:8080`. Flyway automatically executes migrations on startup.

---

### B. Mobile App Setup (Expo)

#### 1. Install Dependencies
```bash
cd mobile
npm install
```

#### 2. Configure Environment
Create or edit `mobile/.env`:
```env
# For local web development:
EXPO_PUBLIC_API_URL=http://localhost:8080/api/v1

# For physical mobile device on LAN:
# EXPO_PUBLIC_API_URL=http://192.168.x.x:8080/api/v1

# For Android Emulator:
# EXPO_PUBLIC_API_URL=http://10.0.2.2:8080/api/v1
```

#### 3. Start the Application
- **Web Browser (Desktop/Tablet/Mobile view)**:
  ```bash
  npm run web
  ```
- **Expo Go / Emulator (Android / iOS)**:
  ```bash
  npm start
  ```

---

## 4. Key Platform Features

- **Role-Based Access Control**:
  - **Students**: View personalized dashboard, rank movement, milestone progress, competition leaderboard, and private transaction ledger.
  - **Teachers**: Access class management directory, search and filter students, award/deduct points with mandatory reason tracking, and view real-time class activity feeds.
- **Competition Ranking Engine**:
  - Deterministic tie-breaking using student ID.
  - Efficient database ranking without expensive table scans (`1 + COUNT(*) WHERE total_points > :points`).
- **Audit-Logged Point Transactions**:
  - Every point change creates an immutable `point_transactions` audit log.
  - Prevents balance deductions below zero.
  - Uses optimistic locking (`@Version`) with automatic retry to eliminate race conditions under concurrent updates.
- **Adaptive Cross-Platform UI**:
  - Fluid responsiveness with breakpoint detection (`useResponsive`).
  - Optimized layouts for mobile screens, tablets (split view/grids), and wide desktop displays.
  - Integrated theme engine supporting Dark and Light modes persisted across sessions.

---

## 5. API Reference Summary

The backend supports both `/api/v1/` and `/api/` route prefixes.

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/register` | Register student or teacher (teacher requires `invitationCode`) |
| `POST` | `/login` | Authenticate with email/password, returns JWT token |
| `GET` | `/me` | Fetch authenticated user profile |

### Student Endpoints (`/api/v1/students`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/me` (or `/profile`) | Current student profile & calculated rank |
| `GET` | `/dashboard` | Student dashboard statistics & recent performance |
| `GET` | `/analytics` | Reporting period metrics (earned, deducted, net points) |
| `GET` | `/points` | Paginated personal point transaction history |
| `GET` | `/{id}` | Student profile by ID (restricted to self or teachers) |
| `GET` | `/{id}/transactions` | Historical transactions for a student |

### Leaderboard Endpoints (`/api/v1/leaderboard`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Paginated global leaderboard (sorted by points & ID) |
| `GET` | `/me` | Direct lookup of student's own leaderboard standing |
| `GET` | `/activity` | Recent point transactions ledger feed |

### Teacher Endpoints (`/api/v1/teacher`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/dashboard` | Aggregate classroom stats & daily distributed points |
| `GET` | `/students` | Paginated student directory with search & filters |
| `GET` | `/points` | Recent classroom-wide point activity feed |
| `GET` | `/students/{id}/points` | Transaction ledger for a specific student |
| `POST` | `/students/{id}/points` | Adjust points (positive or negative) with audit reason |
| `POST` | `/students/{id}/points/award` | Award points with reason |
| `POST` | `/students/{id}/points/deduct` | Deduct points with reason |

---

## 6. Development & Code Quality Checks

Verify that both frontend and backend are in a clean, development-ready state:

```bash
# Verify backend compilation
mvn -f backend/pom.xml compile

# Verify frontend TypeScript types
npm --prefix mobile run typecheck

# Check mobile test runner
npm --prefix mobile test
```
