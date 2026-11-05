# Project Journal — Claims Management Frontend

Audit log of the user request and implementation activity. Times are UTC+08:00. The original prompt is summarized below rather than reproduced in full.

---

## 2026-11-05 13:14 — Prompt 1 (frontend requirements)

The user asked whether the sibling `claims-backend` repository is accessible and requested a `HISTORY.md` in this frontend repository to document interactions for audit. They supplied a detailed implementation brief for a localhost Angular demonstration of the Chubb APAC claims platform:

- Inspect the existing Angular project and Spring Boot backend before coding; use the actual backend API contracts.
- Build one role-based standalone Angular application for claimant, claims officer and claims manager; provide demo role selection, navigation, dashboards and claim workflows.
- Integrate claim submission, claimant claim listing/detail/history and information responses; staff queue, assignment, status transitions, information requests and decisions; manager summary and workload.
- Account for Kafka-backed asynchronous submission: treat HTTP 202 as accepted/being registered, show the claim reference and do not fabricate a saved claim.
- Keep the implementation simple, responsive and suitable for a 2–3 hour localhost demonstration. Do not invent backend fields or unsupported integrations.

## 2026-11-05 — Repository inspection

- Confirmed `claims-frontend` initially contained only a short `README.md`; no Angular source, package manifest or configured Angular version was present.
- Confirmed `C:\Users\dark_\IdeaProjects\claims-backend` is readable. Its repositories contain the public API, orchestration service and common DTO/enums.
- Relevant public endpoints are `POST /api/claims`, `GET /api/claims?claimantEmail=...`, `GET /api/claims/{claimReference}`, `GET /api/claims/{claimReference}/history`, claimant information-request response, staff queue/detail/assign/status/information-request/decision, and staff dashboard summary/workload.
- `ClaimSubmissionRequest` supports claimant/policy/incident shared fields, `assetReference`, estimated loss, currency and priority. The 202 response includes `claimReference`, `eventId`, status and message.
- The backend has no file upload, notifications or settlement endpoint. Its dashboard exposure totals do not include a currency/conversion basis. Frontend behavior reflects these limitations instead of simulating successful integrations.
- Pre-existing unrelated IDE staging in the frontend and modified/untracked files in the backend were left untouched.

## 2026-11-05 — Implementation

- Scaffolded a standalone Angular application (Angular 22) in the frontend repository and configured the API base URL.
- Added role selection and persistent demo session, guarded role-specific routes, responsive shell/navigation, dashboard summaries, claimant claim wizard and listings, request/message views, claim detail/status history, staff claim actions and manager workload/exposure views.
- Wired Angular HttpClient to the controllers and request/response field names inspected in the backend. The claimant timeline hides staff names/comments; staff actions refresh claim details/history after success.
- Added explicit UI messaging for the asynchronous 202 flow and backend capabilities not yet implemented. Sample/fake claims are not inserted into the UI.
- Added local run, demo account and API details to `README.md`.

## Validation

- `npm.cmd install` completed successfully.
- `npm.cmd run build` completed successfully.
- `npm.cmd test -- --watch=false` completed successfully (2 tests passed).
- API behavior was checked against source contracts; no live end-to-end backend request was run in this session.

## 2026-11-05 13:35 — Node.js setup

- The user reported `npm.cmd` was unavailable in Git Bash and asked for help installing Node.js.
- Found that the only pre-existing runtime was Node 24.19.0 bundled inside IntelliJ and not exposed through the normal Windows PATH.
- Installed the official Node.js LTS package (`OpenJS.NodeJS.LTS`) with WinGet. Installed version: Node 26.13.0; npm 11.17.0. The installer registered `C:\Program Files\nodejs\` in the machine PATH.
- Updated the documented supported Node.js versions. Existing terminal processes need to be reopened to load the updated PATH.

## 2026-11-05 13:38 — Git Bash PATH follow-up

- The user reported `npm` was still not found in the UCRT64 terminal.
- Confirmed `C:\Program Files\nodejs\node.exe` and `npm.cmd` are installed and working, and the Node.js directory is registered in the Windows machine PATH.
- The Git Bash process environment used for verification did not include that directory, despite its Windows PATH registration. Advised adding `/c/Program Files/nodejs` to Git Bash PATH and sourcing the updated `.bashrc`, or fully restarting the parent IDE so new terminals inherit the updated PATH.

## 2026-11-05 13:46 — Separate Motor and Property claim forms

- The user provided Motor and Property form screenshots and requested a separate page for each form because their fields differ.
- Added a claim-type chooser and distinct `/claimant/claims/new/motor` and `/claimant/claims/new/property` pages.
- Motor form includes claim category, vehicle registration/model, driver/licence, accident date/time/location/description, third-party details and police report number.
- Property form includes residential/commercial type, incident category/date, property address, affected areas, damage description and damaged contents.
- Mapped the respective details into the shared Spring Boot submission DTO without adding unsupported request properties.

## 2026-11-05 13:53 — Dynamic claim form options

- The user pointed out the backend exposes `GET /api/config/claim-form-options` and requested dynamically loaded dropdown options.
- Inspected the backend JSON and confirmed its option groups: claim types, markets, currencies, Motor claim categories, Property types, Property causes of loss and Property affected areas.
- Added API-driven loading for the claim-type chooser and both claim forms. Removed hardcoded dropdown options and the priority selector (there is no priority option group); forms report loading, request errors and invalid configuration rather than silently falling back.
- Updated claim submission to send the backend's supported `motorDetails` or `propertyDetails` DTO, including the selected form options.
- Validation: `npm.cmd run build` passed; `npm.cmd test -- --watch=false` passed (3 tests, including a request assertion for the config endpoint); `git diff --check` passed.

## 2026-11-05 13:59 — Claim type chooser stuck loading

- The user reported the UI remained on “Loading available claim types…” despite an HTTP 200 response.
- Verified the live endpoint returns the expected option JSON. The app uses Angular's zoneless change detection, but the option request callbacks updated ordinary component properties and did not notify Angular to refresh the view.
- Converted claim option/loading/error state to Angular signals; also made claim submission receipt/loading/error state reactive.
- Added a component test verifying the loading message is replaced by Motor and Property choices after the options response.
- Validation: `npm.cmd run build` passed; `npm.cmd test -- --watch=false` passed (4 tests); `git diff --check` passed.
