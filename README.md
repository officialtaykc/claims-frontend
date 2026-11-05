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

## Demo roles

| Role | Demo account |
|---|---|
| Claimant | john.tan@example.com |
| Claims Officer | officer.a@chubb.com |
| Claims Manager | manager@chubb.com |

No password or production authentication is implemented. The selected role is stored in browser local storage.

## Backend integration

API contracts were checked against the sibling Spring Boot controllers and DTOs. The UI uses `POST /api/claims`, claimant listing/detail/history and information-response routes, staff queue/assignment/status/information-request/decision routes, and staff dashboard summary/workload routes. Update `src/environments/environment.ts` to change the API base URL.

The claimant portal loads claim types, markets, currencies, Motor categories and Property types/causes/affected areas from `GET /api/config/claim-form-options`; if the request fails, it shows the API error instead of using stale hardcoded options. The Motor and Property forms submit their claim-specific detail objects using the backend DTO fields. The backend does not accept file contents, and the form explicitly notes that uploads are not available. The backend has no notification or settlement API, so messages are based on current claim statuses and settlement figures are only shown when present in claims/dashboard data. Dashboard exposure has no currency conversion metadata; amounts are shown without a currency symbol.
