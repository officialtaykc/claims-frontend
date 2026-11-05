# Claims Frontend — Developer Guide

Angular standalone application for the Chubb APAC claims demo. It provides claimant, claims officer and claims manager workspaces and connects to the sibling Spring Boot backend.

## Requirements

- Node.js `^22.22.3`, `^24.15.0` or `^26.0.0`
- npm (included with Node.js)
- The sibling `claims-backend` project for API-backed workflows

On Windows PowerShell, use `npm.cmd` if `npm` is not recognized.

## Install and run

From the frontend repository root:

```powershell
npm.cmd install
npm.cmd start
```

Open [http://localhost:4200](http://localhost:4200).

Run a production build and the test suite:

```powershell
npm.cmd run build
npm.cmd test -- --watch=false
```

## Run with the backend

Start PostgreSQL, Kafka, and both Spring Boot services using the instructions in the sibling backend's README. The frontend calls the public API at `http://localhost:8080/api`; the API service forwards applicable requests to orchestration on port `8081`.

The frontend development origin is `http://localhost:4200`. The backend API must allow this origin for browser requests. Claim submission is asynchronous: the API accepts the claim and publishes it to Kafka, then orchestration persists it. The claim may take a short time to appear in lists and details.

### Configure the API URL

The default API base URL is defined in `src/environments/environment.ts`:

```ts
apiUrl: 'http://localhost:8080/api'
```

Change this value when using a different API host or port. Keep the `/api` path segment.

## Demo sign-in

Choose a role tab on the sign-in page and use one of the local demo accounts:

| Role | Username/email | Password |
|---|---|---|
| Claimant | `john.tan@example.com` | `ClaimantDemo!26` |
| Claims Officer A | `officer.a` | `OfficerDemo!26` |
| Claims Officer B | `officer.b` | `OfficerDemo!26` |
| Claims Manager | `manager` | `ManagerDemo!26` |

The backend seeds these accounts with Flyway. The frontend sends credentials to `POST /api/auth/login` and stores the returned identity in browser local storage. This is demo-only login: it issues no token and does not secure other API endpoints. Registration is a placeholder and does not create an account.

## Development notes

- Use the backend's actual request and response contracts when changing API integration; shared frontend interfaces are in `src/app/core/models/claim.ts`, and HTTP methods are in `src/app/core/services/claim-api.service.ts`.
- Motor and Property claim forms are separate routes and load their dropdown/checkbox choices from the backend configuration endpoints.
- Active policies and officer reassignment choices are retrieved from backend APIs. Do not hardcode account, policy or option data.
- Claim forms accept up to five supporting PDF, JPEG, PNG, text or Word files (10 MB each, 20 MB total). Claim files are uploaded after asynchronous claim creation; officer information-request files and claimant response files are stored with their request.
- Officers see a read-only waiting state while additional information is outstanding; actions return after all open requests are answered.
- Notifications and settlement behavior depend on the endpoints implemented by the backend. The UI does not simulate successful API operations.
