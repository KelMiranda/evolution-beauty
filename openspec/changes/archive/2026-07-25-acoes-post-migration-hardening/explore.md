## Exploration: audit of acoes-batch-1/2/3 + scope for acoes-post-migration-hardening

### Old changes audit (per spec, per change)

#### acoes-batch-1-foundation
- spec: audit-trail
  - status: implemented
  - evidence: Participant creation, updates, soft-delete, and restore run through transactions and write actor/before/after audit events (`src/lib/server/participants.ts:235-306`, `src/lib/server/participants.ts:309-466`); authorized history remains queryable after soft-delete (`src/pages/api/participants/[id]/audit.ts:8-30`, `src/lib/server/participants.ts:481-500`).
  - notes: Runtime behavior matches the participant scenarios, but verification is weak: the only current audit test checks that two calls return promises and does not assert SQL, atomicity, or failure rollback (`src/lib/server/__tests__/audit-hardening.test.ts:4-8`).
- spec: auth
  - status: drifted
  - evidence: The spec defines three canonical roles (`admin`, `facilitadora`, `participante`), while production now defines four (`admin`, `empleado`, `facilitador`, `participante`) and normalizes `facilitadora` to `facilitador` (`src/lib/server/permissions.ts:1-46`, `src/lib/server/bootstrap.ts:193-236`). The SPA protects dashboard routes by authentication only and renders one shared navigation for every authenticated role (`app/src/App.tsx:17-49`, `app/src/layouts/DashboardLayout.tsx:10-16`, `app/src/layouts/DashboardLayout.tsx:50-67`).
  - notes: Backend API permission checks exist, but frontend role types/tests still model the obsolete three-role contract (`app/src/services/api.backend.types.ts:2-8`, `app/tests/unit/auth-permissions.test.ts:16-33`), so role-specific visibility and direct-route behavior are not consistently enforced.
- spec: catalogs-validation
  - status: drifted
  - evidence: Shared server catalogs and Zod validation exist (`src/lib/server/catalogs.ts:3-29`, `src/lib/server/participant-schema.ts:24-81`), but the active React form reads separate mock catalogs and offers `Otro` for gender while the backend permits only `Femenino|Masculino` (`app/src/pages/RegistroPage.tsx:4-6`, `app/src/pages/RegistroPage.tsx:219-220`). More seriously, JSON public registrations are manually mapped and never passed through the shared schema (`src/pages/api/public/participants.ts:38-63`, `src/pages/api/public/participants.ts:73-118`).
  - notes: The SPA marks the flow submitted even after API failure (`app/src/pages/RegistroPage.tsx:78-89`) and then renders the success screen (`app/src/pages/RegistroPage.tsx:119-132`), hiding validation failures instead of reporting each invalid field.
- spec: participant-lifecycle
  - status: partial
  - evidence: Lifecycle columns, deterministic correlativo generation, transactional deactivate/restore, and default soft-delete hiding exist (`src/lib/server/bootstrap.ts:51-83`, `src/lib/server/participants.ts:91-149`, `src/lib/server/participants.ts:404-474`). However, inactive participants are implemented as soft-deleted rows, normal lists always exclude them, and no active React route/action can edit, deactivate, or restore a participant (`app/src/App.tsx:41-49`, `app/src/pages/DashboardPage.tsx:257-276`).
  - notes: The requirement to reject operations restricted to active participants has no general guard in participant/enrollment services; old lifecycle, schema, browser, and integration tasks also remain unchecked (`openspec/changes/acoes-batch-1-foundation/tasks.md:8-15`, `openspec/changes/acoes-batch-1-foundation/tasks.md:23-44`).

#### acoes-batch-2-ui-export
- spec: dashboard-indicators
  - status: drifted
  - evidence: SQL aggregation and an authenticated indicators endpoint exist (`src/lib/server/participants.ts:175-233`, `src/pages/api/dashboard/indicators.ts:8-23`), but the React dashboard does not consume them; it fetches participant/course/enrollment lists and computes metrics in the browser (`app/src/services/api.ts:501-567`). The current UI shows only a subset of the specified breakdowns and has no date-range control (`app/src/pages/DashboardPage.tsx:68-90`, `app/src/pages/ReportesPage.tsx:29-80`).
  - notes: This violates the MUST-use-SQL source requirement, and `ProtectedRoute` allows every authenticated role into the same dashboard UI (`app/src/App.tsx:17-49`) despite the spec's admin-wide-statistics restriction.
- spec: participant-edit-ui
  - status: missing
  - evidence: A validated update API still exists (`src/pages/api/participants/[id].ts:67-123`), but the WIP migration deleted the Astro edit UI and the React router has no participant edit route (`app/src/App.tsx:41-49`). The participant table exposes only a details button (`app/src/pages/DashboardPage.tsx:257-276`) and the details modal has no save, cancel, lifecycle, or restore action (`app/src/pages/DashboardPage.tsx:301-327`).
  - notes: Therefore form prefill/parity, validation feedback, cancel, lifecycle editing, and UI-level authorization are absent from the shipped SPA.
- spec: xlsx-export
  - status: partial
  - evidence: The backend emits XLSX with the correct MIME/filename and shared row mapping (`src/pages/api/participants.ts:54-84`, `src/lib/server/export.ts:1-8`, `src/lib/server/participants.ts:564-597`), and the SPA provides a download action (`app/src/pages/DashboardPage.tsx:46-48`, `app/src/pages/DashboardPage.tsx:217-219`).
  - notes: Export is page-limited (the UI sends `page` and `limit: 10`) and backend computes but never applies offset (`app/src/pages/DashboardPage.tsx:46-48`, `src/pages/api/participants.ts:59-64`), so it does not export all eligible/visible filtered records. XLSX dates, widths, bold headers, and CSV/XLSX parity are not implemented by the one-line writer (`src/lib/server/export.ts:4-7`).

#### acoes-batch-3-admin-audit
- spec: audit-trail-ui
  - status: partial
  - evidence: The backend supports combined filters, counts, stable ordering, and limit/offset pagination (`src/lib/server/audit.ts:59-155`, `src/pages/api/audit.ts:8-47`). The React router and navigation expose no audit page (`app/src/App.tsx:41-49`, `app/src/layouts/DashboardLayout.tsx:10-16`).
  - notes: Filtering/pagination foundations shipped, but the defining UI—table columns, filter controls, and page navigation—is missing after `src/components/AuditTrail.astro` was deleted in commit `5f3fc1a`.
- spec: user-management
  - status: partial
  - evidence: Transactional create/update/deactivate services with audit events and self-deactivation protection exist (`src/lib/server/users.ts:35-128`); login rejects inactive users (`src/lib/server/auth.ts:41-65`) and APIs are admin-gated (`src/pages/api/users.ts:19-59`, `src/pages/api/users.ts:97-214`). The SPA has no user-management route/page; configuration only displays the current profile (`app/src/App.tsx:41-49`, `app/src/pages/ConfigPage.tsx:19-38`).
  - notes: User listing is not paginated (`src/lib/server/users.ts:15-22`), the FormData edit endpoint validates with the create schema that requires a password (`src/pages/api/users/[id].ts:28-40`, `src/lib/server/user-schema.ts:11-21`, `src/lib/server/user-schema.ts:37-38`), and the shipped role vocabulary no longer matches the spec.

No old change is archive-ready as a whole. Batch 1 has unchecked implementation/verification tasks and no proposal; Batch 2 has unchecked smoke tests and claims test files that are no longer present; Batch 3 has checked tasks but its UI was deleted and it has no verification report. Additionally, the repository currently has only `openspec/changes/`; `openspec/config.yaml`, `openspec/specs/`, and the archive directory are absent, so normal delta-spec synchronization cannot run safely yet.

### New surface from WIP commit (not in old changes)
- Course completion and certificates: `src/pages/api/courses/[id]/complete.ts:8-22`, `src/pages/api/courses/[id]/certificate.ts:9-36`, and `src/lib/server/certificates.ts:26-85` complete courses, generate/store PDFs, and download certificates. Add a `course-completion-certificates` spec covering authorization, idempotency, participant eligibility, audit, filesystem/DB consistency, and download ownership.
- Public course links and enrollment: `src/pages/api/courses/[id]/public-link.ts:9-44`, `src/pages/api/public/courses/enrollment.ts:6-34`, `src/pages/api/public/enrollments.ts:8-70`, and `src/lib/server/enrollments.ts:81-162` create tokens, resolve public links, enforce course state/capacity, create enrollment/audit rows, and increment counts. Add a `public-course-enrollment` spec covering token lifecycle, permissions, capacity concurrency, duplicate identity rules, and facilitator linkage.
- File upload/storage: `src/pages/api/files.ts:10-35` and `src/lib/server/file-storage.ts:21-59` add authenticated local uploads and file metadata. Add a `managed-file-storage` spec for per-kind permissions, MIME/size limits, quotas, retention/deletion, path safety, backup, and rollback cleanup.
- Notifications and browser push: `src/pages/api/notifications.ts:7-13`, `src/pages/api/notifications/[id].ts:7-19`, `src/pages/api/push-subscriptions.ts:7-29`, `src/lib/server/notifications.ts:34-83`, `app/src/components/NotificationSubscriptionCard.tsx:18-51`, and `app/public/sw.js:1-32` add notification persistence/read state and push subscription UI. Add a `notifications-and-push` spec covering audience isolation, delivery, unsubscribe/rotation, VAPID configuration, and read authorization. Current role-targeted rows are returned/markable by any authenticated user because queries only test `audience_role IS NOT NULL` (`src/lib/server/notifications.ts:45-67`).
- Participant duplicate/history APIs: `src/pages/api/participants/[id]/duplicates.ts:8-36`, `src/pages/api/participants/[id]/history.ts:8-30`, and `src/lib/server/participants.ts:503-562` expose duplicate review and history. Add these to `participant-integrity`; define OR/AND matching semantics, lifecycle visibility, permissions, and admin UI. The current duplicate SQL combines document/email/phone predicates with `AND` (`src/lib/server/participants.ts:515-550`), which misses partial matches.
- React SPA replacement: `app/src/main.tsx:1-13` and `app/src/App.tsx:28-54` establish a HashRouter SPA for public catalog/registration/login and protected dashboard/course/report/config pages; `src/middleware.ts:7-10` redirects all non-API backend traffic to it. Formalize route, authz, API error, loading/error-state, locale, accessibility, and deployment contracts. The migration removed old participant edit, user-management, audit, and indicators Astro UIs without React parity.
- SPA API contract layer: `app/src/services/api.ts:18-71` centralizes credentialed JSON calls and domain mappings, but error parsing calls `response.json()` without awaiting it (`app/src/services/api.ts:9-15`), pagination total is fabricated (`app/src/services/api.ts:156-180`), and frontend auth types are stale (`app/src/services/api.backend.types.ts:2-8`). Add contract tests against real backend schemas rather than mirrored test-only types.
- New E2E coverage: `app/tests/e2e/public-registration.spec.ts:3-73` and `app/tests/e2e/course-detail.spec.ts:3-13` add public flow checks, but registration fills the UI and then bypasses its submit path with a direct hard-coded API POST (`app/tests/e2e/public-registration.spec.ts:31-72`), while course detail depends on seeded ID 8. Specify deterministic fixtures and observable DB/API assertions.
- Root Vitest runner: `vitest.config.ts:3-8` now runs server tests. Contrary to the initial “no tests yet” assumption, three files/six tests currently pass, but none exercises the new endpoints and the audit test is non-assertive about behavior. The React run has 62 passing unit tests but three component suites fail because they import deleted pages (for example `app/tests/component/AdminParticipantsPage.test.tsx:7-8`).
- CI/deployment: E2E is fully commented out and the app unit step calls a non-existent `test:unit` script with `--if-present`, silently skipping tests (`.github/workflows/ci.yml:23-39`, `.github/workflows/ci.yml:42-78`, `app/package.json:6-15`). Docker now includes backend, React, and PostgreSQL (`docker-compose.yml:1-54`), which should become the CI integration fixture.

### Affected areas for new change
- `src/lib/server/permissions.ts`, `src/lib/server/auth.ts`, `src/lib/server/bootstrap.ts` — decide and enforce one canonical role model and schema migration.
- `src/pages/api/**/*.ts` — establish consistent authentication, authorization, validation, error, pagination, and response contracts for old and new endpoints.
- `src/lib/server/participants.ts`, `participant-schema.ts`, `catalogs.ts` — repair public JSON validation, lifecycle semantics, duplicate matching, pagination, and catalog parity.
- `src/lib/server/users.ts`, `user-schema.ts`, `audit.ts`, `export.ts` — finish old admin/audit/edit/export behavior and meaningful tests.
- `src/lib/server/courses.ts`, `enrollments.ts`, `certificates.ts`, `file-storage.ts`, `notifications.ts` — formalize WIP domain invariants, side effects, ownership, and transaction boundaries.
- `app/src/App.tsx`, `layouts/DashboardLayout.tsx`, `pages/DashboardPage.tsx`, `pages/ReportesPage.tsx`, `pages/ConfigPage.tsx`, `pages/RegistroPage.tsx`, `services/api.ts` — restore role-aware React parity and correct client/backend contracts.
- `app/tests/`, `src/lib/server/__tests__/`, `vitest.config.ts`, `.github/workflows/ci.yml`, `docker-compose.yml` — replace stale/mirrored tests with real unit/integration/E2E gates and a CI database.
- `openspec/` — restore config/main-spec/archive scaffolding before attempting old-change archive synchronization.

### Approaches for the new change
1. **Closure-first staged hardening** — one named change with capability specs and chained delivery slices: contracts/security first, old UI parity second, new WIP domains third, CI verification last.
   - Pros: closes the most dangerous drift first; preserves one traceable migration-hardening narrative; supports review slices under the 800-line budget.
   - Cons: requires explicit role/lifecycle decisions and disciplined dependency ordering; overall scope remains large.
   - Effort: High
2. **Separate old-change remediation from WIP formalization** — finish/verify/archive batches 1–3 first, then open independent changes for courses/enrollment, files/certificates, and notifications.
   - Pros: clean archive boundaries and smaller specifications; easier rollback by domain.
   - Cons: delays security fixes in new endpoints and duplicates cross-cutting auth/test work; more SDD overhead.
   - Effort: High
3. **Archive old changes with warnings and harden only WIP surface** — treat deleted UI as intentional migration drift and rewrite source specs later.
   - Pros: fastest administrative cleanup.
   - Cons: loses traceability, leaves explicit MUST requirements unmet, and conflicts with the archive completion gate because tasks/verification and OpenSpec source-of-truth scaffolding are missing.
   - Effort: Low initially, High deferred

### Recommendation
Use **closure-first staged hardening** and structure `acoes-post-migration-hardening` around six specs:

1. `auth-and-api-contracts` — canonical role decision, route/action permission matrix, frontend role visibility, API errors, pagination, and schema compatibility.
2. `participant-integrity-and-admin-workflows` — public JSON validation, shared catalogs, lifecycle semantics, participant edit/restore React UI, duplicate/history review, and inactive-operation rules.
3. `reporting-export-and-admin-observability` — server-sourced dashboard indicators, complete XLSX/CSV parity, React user management, and React audit viewer.
4. `public-course-enrollment` — public-link authorization/token lifecycle, course visibility/state, capacity concurrency, duplicates, participant/facilitator linkage, and audit.
5. `files-certificates-notifications` — upload policy, certificate completion/download/idempotency, transaction-safe file cleanup, notification audience isolation, push subscription lifecycle, and backup requirements.
6. `verification-and-delivery` — real backend unit/integration tests, repaired React component tests, deterministic Playwright fixtures, PostgreSQL service in CI, both builds, and E2E re-enabled.

Implement as chained work units because this is well over the 800-line review budget: (1) contract/security defects, (2) participant/admin React parity, (3) reporting/export, (4) enrollment/public links, (5) files/certificates/notifications, (6) CI and regression verification. The proposal should make role vocabulary and inactive-vs-soft-delete semantics explicit decisions before implementation.

Archive handling:
- Accept `acoes-batch-1-foundation/audit-trail` as implemented, but do not archive Batch 1 until its unchecked tests/manual tasks are completed or explicitly reconciled with a verification report; missing proposal also requires intentional-partial-archive approval.
- Carry Batch 1 `auth`, `catalogs-validation`, and `participant-lifecycle` into completion/rewrite work in the new change.
- Carry all Batch 2 specs forward: rewrite `dashboard-indicators` for React, rebuild `participant-edit-ui`, and complete XLSX parity; then update stale task evidence before archive.
- Carry both Batch 3 specs forward to React parity and verification; checked task boxes are not reliable evidence after the WIP commit deleted the UI.
- Restore `openspec/config.yaml`, `openspec/specs/`, and `openspec/changes/archive/`; after hardening verification, archive old changes in dependency order (Batch 1, then 2, then 3), syncing only requirements proven by current code/tests.

### Risks
- Authorization leakage: the SPA is authentication-only, public-link generation uses `courses:view`, certificate download is any-authenticated-user, and role-targeted notifications are visible/readable across roles.
- Data integrity: public participant JSON bypasses Zod, duplicate matching requires every populated identifier to match, participant pagination ignores offset, and enrollment capacity checks are not row-locked against concurrent requests.
- Transactional side effects: certificate files and notifications are written outside the surrounding database transaction, so rollback can leave orphaned files/events (`src/lib/server/certificates.ts:26-76`, `src/lib/server/enrollments.ts:81-162`).
- UI false success and stale contracts: registration reports success after failure, API errors are parsed incorrectly, and frontend types/tests encode obsolete roles and schemas.
- Verification gap: React component tests fail, CI silently skips app tests, backend tests are not run in CI, E2E is disabled, and the new endpoints have no behavior tests.
- Archive integrity: old task checkboxes disagree with current code, no old change has a verify report, Batch 1/2 lack proposals, and OpenSpec main-spec/config/archive scaffolding is absent.
- Operational exposure: local file storage has no documented backup/retention policy, uploads lack size/MIME authorization rules, default Docker credentials are present, and push configuration is placeholder-only.

### Ready for Proposal
Yes. The orchestrator should tell the user that no whole old change is currently safe to archive: one Batch 1 spec is implemented, but the migration regressed or removed the remaining old UI/contracts, and the WIP introduced several security/data-integrity surfaces without specs. Propose the six-spec closure-first scope above, explicitly request decisions on canonical roles and lifecycle semantics, and use chained delivery because the review budget will be exceeded.
