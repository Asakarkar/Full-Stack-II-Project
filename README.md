# RankForge

RankForge is a student performance and points platform built as an Expo mobile app backed by a Spring Boot API. It supports student and teacher workflows, protected by server-side role authorization.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the architecture, schema, API contract, mobile navigation/state model, and implementation plan.

## Requirements

- Java 17 or newer and Maven
- Node.js LTS and npm
- PostgreSQL
- Expo Go for basic device testing, or an Expo development build for native modules requiring a custom client

## Local development

1. Create a PostgreSQL database and configure the backend environment (database URL/user/password and a strong JWT signing secret) using the variable names in `backend/README.md` / `backend/src/main/resources/application.yml`.
2. Start the API from `backend/` with `mvn spring-boot:run`. Flyway applies migrations on startup.
3. Configure `mobile/.env` with `EXPO_PUBLIC_API_URL`. For an Android device, use the development computer's LAN IP and an API port reachable from the device, not `localhost`.
4. From `mobile/`, run `npm install` and `npx expo start`; scan the QR code with Expo Go or use the configured development build.

Never use default or committed secrets outside local throwaway development. Public registration creates student accounts; provision teacher accounts through a trusted administrative process.

## Verification

Run backend tests from `backend/` with `mvn test`. Run the mobile TypeScript check from `mobile/` with `npm run typecheck`. See the mobile and backend READMEs for any additional verification and setup details.
