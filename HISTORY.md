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

## 2026-11-05 14:07 — Claim form validation and combined amount/currency

- The user requested visible required-field indicators and specific validation feedback, replacing the generic all-fields message; also requested estimated loss and currency as one field.
- Added required markers and field-specific messages/highlighting for required Motor and Property fields, with valid-email and nonnegative amount feedback. Submit now points to highlighted fields and identifies a missing declaration separately.
- Combined amount and currency into a single grouped form control while preserving separate API DTO values.
- Ensured dynamically-added Motor/Property validators are recalculated before submit.
- Validation: `npm.cmd run build` passed; `npm.cmd test -- --watch=false` passed (4 tests); `git diff --check` passed.

## 2026-11-05T14:12:41.757+08:00 — Separate claim form options APIs

> could you then expose them as 2 separate APIs? then help me adjust in my claims-frontend repo as well to cater these new changes

## 2026-11-05T14:38:20.615+08:00 — My Policies and claim form autofill

> i plan to create a concept of "My Policies", display it on the home screen, add the "Active" button. these info should also be pulled from database. do ensure the details are passed dynamically to frontend. also under the Submit Claims screen, allow users to select their policy which should autopopulate the fields under Policy and contact details. ensure the name and email address is also dynamically pulled from backend DB, reduce unecessary filling up of information

## 2026-11-05T14:43:31.653+08:00 — Move form-options cache to API startup

> can u make the on application startup loading of json into cache to be done by ClaimsApiApplication instead.

## 2026-11-05 — Account login and registration placeholder

- The user requested role selection as one-click tabs, username/password sign-in backed by the existing claimant/staff account tables, demo accounts seeded through Flyway, and a dummy registration screen.
- Added `POST /api/auth/login` through the existing API proxy, backed by an orchestration login endpoint that checks active claimant/staff accounts and verifies PBKDF2-SHA256 salted hashes. Invalid credentials receive a generic 401 response. Successful login updates the account's last-login timestamp and returns only name, email and role.
- Added Flyway migration `V4__seed_demo_accounts.sql` with one claimant, officer and manager account. Password hashes are seeded, not plaintext. Local demo credentials are listed in the README and login UI.
- Replaced the role dropdown with role tabs and username/email/password fields, explicit loading/error states, and a link to `/register`. The registration route is clearly marked unavailable and does not submit or create an account.
- The frontend stores the returned identity in local storage for role-specific UI routing. This remains a localhost demonstration login, not production authentication: no token/session is issued and other backend endpoints are not protected by this login.

## 2026-11-05 — Refresh UI after API responses across the application

- The user reported the same stale view issue in claim details and asked for API-driven refresh behavior across the system.
- Audited the frontend's HTTP subscriptions. Claim list state already uses Angular signals; claim details, dashboards and workload views updated plain fields inside asynchronous callbacks under zoneless change detection.
- Added `ChangeDetectorRef.markForCheck()` to all relevant claim-details action/load responses, dashboard claim/summary responses and workload responses, so loaded records and refreshed post-action details are rendered.
- Added a claim-details test that flushes the claim and history endpoints and verifies the returned claim appears. The Angular build passed and all 8 tests passed.

## 2026-11-05 — Property affected areas checkbox list

- The user requested checkbox selection for the multi-select “Areas affected” property claim field.
- Replaced the native multi-select dropdown with an accessible, styled checkbox list populated from the existing dynamic backend options. Selection remains an array in the form and is serialized into the existing backend `affectedAreas` string on submission; required-field validation remains intact.
- Added a test verifying multiple configured areas can be selected. Angular build passed and all 9 tests passed.

## 2026-11-05 — Manager decision numeric amount

- The user reported `value.decisionAmount.trim is not a function` when submitting a manager decision.
- Removed the string-only trim assumption for the number input and normalize the value with `Number`, omitting only an empty amount and rejecting non-finite or negative values.
- Added a regression test that enters a numeric amount through the HTML number control and verifies the decision request submits it as a number and refreshes the claim/history afterward.
- Angular build passed and all 12 tests passed.

## 2026-11-05 — Reassign claims through an officer picker

- The user requested removing the inline assignment field/button and providing a reassignment popup with active officers loaded from the backend.
- Added `GET /api/staff/officers` via the existing API proxy, backed by active OFFICER accounts in `claims_staff_accounts`; the response includes username, full name and email, and does not expose credentials.
- Replaced the inline assignment form with an Assign/Reassign button and modal picker. The dialog loads officers on open, shows loading/error/empty states, submits the selected officer email via the existing assignment endpoint, then refreshes the claim details.
- Added frontend tests for officer lookup and end-to-end dialog assignment. The Angular build and all 14 tests passed.
- Backend test compilation exposed a missing `ClaimDocument` import in the already-modified `ClaimService`; added the import to unblock compilation and verified the orchestration module build/tests.

## 2026-11-05 — Display officer full names in assignment UI

- The user requested showing an officer's first and last name instead of their username.
- Updated the reassignment dropdown to display only the full name. The current assignee label now resolves the stored email/username against the active officer directory and displays the full name; it avoids displaying an identifier if no matching directory record exists.
- Added assertions for full-name display. All 16 frontend tests passed.

## 2026-11-05 — Hide reassignment after a claim decision

- The user requested hiding claim reassignment once a claim is approved, partially approved or rejected.
- Hid the assignment panel and any open reassignment dialog after a decision is recorded, including subsequent settlement statuses. Reassignment action is guarded against opening after the claim reaches those stages.
- Added a test verifying the panel is absent for approved, partially approved, rejected, settlement-pending and settled claims.

## 2026-11-05T15:18:45.568+08:00 — Manager approval and payment workflow

> during the "In review" stage, if no additional documents required, the claims staff should be able to submit the claims to a manager for approval (to ensure a maker and checker) flow. the claims will then transition into a Pending Decision stage, for "Approved", "Rejected" or ""Partially Approved". upon approval for example, do ensure that you write into a kafka topic for the payment team to process. the status should then transition into "SETTLEMENT_PENDING", i am not gonna implement the payment processing portion(that should be another microservice team). but simulate a short delay (mock) for the response to come back to us via another kafka topic. this should be event driven, upon the status update from payment team, we should transition the status to SETTLED. tehnically i dont need a CLOSED status, the final status should always be SETTLED or REJECTED. so remove the CLOSED status for me.

- Added the officer-to-manager handoff and a separate manager-only decision form; approval outcomes require a decision amount and the assigned officer cannot decide their own claim.
- Approved and partially approved claims enter `SETTLEMENT_PENDING`, publish a payment request to Kafka, and move to `SETTLED` after the mock processor emits a delayed completion event.
- Removed `CLOSED` from frontend/backend status models and added Flyway V7 to normalize any existing closed claims and status history to final `SETTLED` or `REJECTED` states.

## 2026-11-05T15:36:18.232+08:00 — Add Officer B demo login credentials

> help include the credentials in the login for officer b as well

- Added Officer B's username and password to the officer login's local demo credentials panel and the README credentials table.

## 2026-11-05T15:59:23.914+08:00 — Supporting document uploads and officer workflow lock

> by the way i noticed there is no upload supporting document function in the claims submission screen, as well as when the officer is requesting additional information back from the claimant. during this transition change, by right the officer shouldnt be able to transition the status or do anything anymore (on angular frontend). do help me implement this. as for the attachment upload could u use a blob storage in db(create a new table for attachments linked to the claims table because can attach multiple attachments.). implement both backend and frontend for this

- Added supporting document selection to claim submission, officer information requests, and claimant responses; claim attachments can be downloaded from the claim view.
- The officer view is read-only while a claim awaits claimant information; controls return after all open requests are answered and the claim returns to `IN_REVIEW`.

## 2026-11-05 — Officer recommendation and claimant information responses

- The user requested that officers choose the approve/partial-approve/reject recommendation on claim details, with managers reviewing and confirming or overriding it, and that claimants be able to respond to open information requests with text and attachments.
- Added officer recommendation outcome, amount and rationale to the officer claim workflow. Submitting it moves the claim to manager review; the manager can approve the recommendation as the claim decision or reject it with a required note to return it to the officer for reassessment.
- Persisted the officer recommendation in the backend using Flyway V9. Added the manager recommendation-return endpoint and included recommendation data only in the staff claim-detail response; claimant claim-list/detail responses do not expose this internal recommendation.
- Added a text and multi-file response form directly to the claimant Information Requests page, with existing attachment size/count limits, API error display and automatic listing refresh after submit. The claim details page keeps its response form as well.
- Validation: Angular production build passed; all 21 frontend tests passed; the backend orchestration module clean compile and tests passed (2 tests).
