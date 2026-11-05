# Chubb APAC Claims Management — Frontend

Standalone Angular demonstration UI for claimant, claims officer and claims manager workflows. The application uses the Spring Boot API at `http://localhost:8080/api`.

## Run locally

Requirements: Node.js `^22.22.3`, `^24.15.0` or `^26.0.0` and npm.

```powershell
npm.cmd install
npm.cmd start
```

Open [http://localhost:4200](http://localhost:4200). To build and test:

```powershell
npm.cmd run build
npm.cmd test
```

Start the backend separately from the sibling `claims-backend` repository. Its API allows the Angular dev origin `http://localhost:4200`. The backend expects Kafka and its orchestration service for asynchronous claim creation; use that repository's Docker Compose and Maven instructions.

## Demo sign-in credentials

| Role | Username/email | Password |
|---|---|---|
| Claimant | `john.tan@example.com` | `ClaimantDemo!26` |
| Claims Officer | `officer.a` | `OfficerDemo!26` |
| Claims Manager | `manager` | `ManagerDemo!26` |

The orchestration service verifies these credentials against `claimant_accounts` and `claims_staff_accounts` through `POST /api/auth/login`. The backend stores only PBKDF2-SHA256 password hashes; Flyway migration `V4__seed_demo_accounts.sql` adds the local demo accounts. The selected identity is stored in browser local storage after login. This is a localhost demo login only: it does not issue a token or protect the other API endpoints. Registration at `/register` is intentionally a non-persistent placeholder.

## Backend integration

API contracts were checked against the sibling Spring Boot controllers and DTOs. The UI uses `POST /api/claims`, claimant listing/detail/history and information-response routes, staff queue/assignment/status/information-request/decision routes, and staff dashboard summary/workload routes. Update `src/environments/environment.ts` to change the API base URL.

The claimant portal loads claim types from `GET /api/config/motor-claims` and `GET /api/config/property-claims`. Each form loads its options from its matching endpoint; if a request fails, it shows the API error instead of using stale hardcoded options. The Motor and Property forms submit their claim-specific detail objects using the backend DTO fields. Required fields have inline validation and markers; estimated loss and currency are presented in one grouped field while remaining separate values in the API request. The backend does not accept file contents, and the form explicitly notes that uploads are not available. The backend has no notification or settlement API, so messages are based on current claim statuses and settlement figures are only shown when present in claims/dashboard data. Dashboard exposure has no currency conversion metadata; amounts are shown without a currency symbol.
