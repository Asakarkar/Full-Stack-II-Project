# RankForge Mobile Client

RankForge is an Expo React Native application built with Expo SDK 58, Expo Router, TypeScript, and Redux Toolkit. It provides responsive student learning and teacher classroom management experiences across mobile phones, tablets, and desktop browsers.

---

## Features

- **Cross-Platform Responsive Design**: Fluid responsive breakpoints (`useResponsive`) supporting mobile screens, tablets (grid views, split columns), and wide desktop displays.
- **Role-Based Workflows**: Tailored navigation tabs and actions for students (personal rank card, tier progress, points ledger) and teachers (classroom metrics, student directory, point award/deduct actions).
- **Public Usernames**: Student sign-up collects a unique username, shown on profiles, student listings, and the leaderboard.
- **Offline & Persistence**: Authentication tokens stored in `Expo SecureStore` (native) and session memory (web). Dark/Light theme preferences persisted in `AsyncStorage`.
- **Real-Time Visuals**: Custom SVG charts for point analytics and milestone progress rings.

---

## Local Setup

### 1. Prerequisites
- Node.js LTS (v20+)
- npm

### 2. Installation
```bash
cd mobile
npm install
```

### 3. Environment Configuration
The API URL is resolved automatically for Expo Go and the web preview. Leave
`EXPO_PUBLIC_API_URL` unset unless you need to connect to a non-local backend.
If you set a localhost URL, the app maps it to the Android emulator host or the
Expo development machine's LAN address on a physical device.

For a remote backend, create or configure `mobile/.env`:
```env
EXPO_PUBLIC_API_URL=https://your-backend.example.com/api/v1
```

### 4. Running the Client
Start the backend in a separate terminal first:
```bash
cd backend
mvn spring-boot:run
```
Wait for the API at `http://localhost:8080/actuator/health` to report `UP`.

Then start Expo from another terminal:
- **Web Browser**:
  ```bash
  npm run web
  ```
- **Expo Development Server (iOS / Android / Web)**:
  ```bash
  npm start
  ```

---

## Development Checks

```bash
# Type check TypeScript codebase
npm run typecheck

# Code formatting & linting
npm run lint

# Test runner
npm test
```
