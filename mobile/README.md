# RankForge Mobile Client

RankForge is an Expo React Native application built with Expo SDK 54, Expo Router, TypeScript, and Redux Toolkit. It provides responsive student learning and teacher classroom management experiences across mobile phones, tablets, and desktop browsers.

---

## Features

- **Cross-Platform Responsive Design**: Fluid responsive breakpoints (`useResponsive`) supporting mobile screens, tablets (grid views, split columns), and wide desktop displays.
- **Role-Based Workflows**: Tailored navigation tabs and actions for students (personal rank card, tier progress, points ledger) and teachers (classroom metrics, student directory, point award/deduct actions).
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
Create or configure `mobile/.env`:
```env
# For local development with web preview:
EXPO_PUBLIC_API_URL=http://localhost:8080/api/v1

# For Android Emulator:
# EXPO_PUBLIC_API_URL=http://10.0.2.2:8080/api/v1

# For physical device on the same local network:
# EXPO_PUBLIC_API_URL=http://192.168.x.x:8080/api/v1
```

### 4. Running the Client
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
