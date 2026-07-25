# Verify Report: acoes-post-migration-hardening

## Summary
- Total PRs: 5
- Total scenarios: 48
- Pass: 44
- Fail: 0
- Partial: 1
- Deferred: 3
- Verdict: BLOCKED

The implementation behavior is green in all requested local runtime layers, but the change is not archive-ready because `tasks.md` still contains 47 unchecked task verification boxes (for example, `tasks.md:54-56` and `tasks.md:289-292`). The CI spec also contains a VAPID-specific scenario for a push step that does not exist; this is a documented scope deviation rather than a failing current test layer.

## Test execution

| Layer | Command | Result |
|---|---|---|
| Backend Vitest | `npm test` | PASS — 8 files, 22 tests, 1.46s; 0 failures. |
| React Vitest | `cd app && npm run test:run` | PASS — 8 files, 64 tests, 5.39s; 0 failures. Node emitted non-fatal experimental `localStorage` warnings. |
| Backend build | `npm run build` | PASS — `astro check` reported 0 errors, 0 warnings, 1 hint; Astro server build completed. Hint: unused `existing` in `scripts/seed.ts:32`. |
| React build | `cd app && npm run build` | PASS — TypeScript and Vite build completed. Non-fatal 919.12 kB chunk-size warning. |
| E2E | `cd app && npm run test:e2e` | PASS — 10/10 Playwright tests passed in 9.5s. |
| OpenSpec CLI | `npx -y @fission-ai/openspec@1.6.0 list`, `list --specs`, `doctor` | PASS — 4 changes listed, `_stub` listed with 1 requirement, `OpenSpec root: ok`. |

## Per-spec analysis

### Capability 1: auth-and-route-protection

- Requirement: Canonical role vocabulary
  - Scenario: All four canonical roles accepted — **PASS** (`src/lib/server/permissions.ts:3-6,40-59`; backend and frontend suites pass).
  - Scenario: Legacy `facilitadora` surfaced, not coerced — **PASS** (`src/lib/server/permissions.ts:8-13,40-65`; `src/lib/server/auth.ts:25-35,121-127`; `src/lib/server/bootstrap.ts:238-244`; `src/pages/api/admin/role-drift.ts:1-25`).
- Requirement: SPA route guard by role
  - Scenario: Unauthenticated user redirected to login — **PASS** (`app/src/components/RoleGuard.tsx:11-24`; `app/tests/component/RoleGuard.test.tsx`; E2E auth redirect passes).
  - Scenario: Wrong-role user redirected away — **PASS** (`app/src/components/RoleGuard.tsx:21-24`; `app/tests/component/RoleGuard.test.tsx`; `app/src/App.tsx:39-53`).
- Requirement: Server-side role check
  - Scenario: Wrong-role API call returns 403 — **PASS** (`src/pages/api/admin/role-drift.ts:9-18`; `src/lib/server/auth.ts:144-146`; `src/lib/server/__tests__/role-drift-route.test.ts`).
  - Scenario: Anonymous API call returns 401 — **PASS** (`src/pages/api/admin/role-drift.ts:9-18`; `src/lib/server/__tests__/role-drift-route.test.ts`).
- Requirement: Type and test alignment
  - Scenario: Frontend role union contains exactly four canonical roles — **PASS** (`app/src/services/api.backend.types.ts:1-8`; `app/src/types/index.ts:29-36`; React build passes).
  - Scenario: Unit tests assert four roles and pass — **PASS** (`app/tests/unit/auth-permissions.test.ts:1-75`; React Vitest 64/64).
- Requirement: Single-source route allowlist
  - Scenario: Route manifest is the only route-role mapping — **PASS** (`app/src/routes/routeManifest.ts:1-14`; `app/src/App.tsx:17-53`; `app/src/components/RoleGuard.tsx:6-24`; RoleGuard suite passes). No inline route-role map was found.

### Capability 2: public-participant-validation

- Requirement: Shared schema validation before DB write
  - Scenario: Valid payload returns 201 and persists — **PASS** (`src/pages/api/public/participants.ts:39-71,101-131`; `src/lib/server/__tests__/participant-public-json.test.ts`; E2E passes).
  - Scenario: Anonymous valid JSON remains supported — **PASS** (`src/pages/api/public/participants.ts:39-71`; `app/tests/e2e/public-registration.spec.ts`; full E2E passes).
- Requirement: Invalid payload returns 400 with per-field errors
  - Scenario: Invalid gender returns 400 and no row — **PASS** (`src/pages/api/public/participants.ts:64-69`; `src/lib/server/__tests__/participant-public-json.test.ts:70-114`).
  - Scenario: Multiple invalid fields return all issues — **PASS** (`src/lib/server/__tests__/participant-public-json.test.ts`; backend 22/22).
  - Scenario: Validation never returns 500 — **PASS** (`src/pages/api/public/participants.ts:64-69`; dedicated participant JSON test).
- Requirement: Gender catalog reduced to two values
  - Scenario: Form does not offer `Otro` — **PASS** (`app/src/pages/RegistroPage.tsx` gender options; `app/tests/unit/registro-gender-options.test.tsx`; 1/1).
  - Scenario: Non-canonical gender cannot originate from form — **PASS** (`app/tests/unit/registro-gender-options.test.tsx`; `app/tests/e2e/public-registration-rejected.spec.ts`; E2E 10/10).
- Requirement: SPA surfaces real success/failure
  - Scenario: 400 renders field errors and not success — **PASS** (`app/src/services/api.ts` `ValidationApiError`; `app/src/pages/RegistroPage.tsx` submit handling; `app/tests/unit/validation-api-error.test.ts`).
  - Scenario: 201 renders success only after response — **PASS** (`app/src/pages/RegistroPage.tsx` success state is set only in the successful request branch).
  - Scenario: Silent acceptance is impossible — **PASS** (`app/src/pages/RegistroPage.tsx`; backend validation tests assert no insert on failure).

### Capability 3: notification-audience-isolation

- Requirement: Role-targeted notifications visible only to matching role
  - Scenario: Admin-targeted row hidden/ unmarkable to participante — **PASS** (`src/lib/server/notifications.ts:54-80`; `src/lib/server/__tests__/notifications-audience.test.ts`; API routes pass role at `src/pages/api/notifications.ts` and `[id].ts`).
  - Scenario: Admin sees and marks admin-targeted row — **PASS** (`src/lib/server/notifications.ts:54-80`; focused audience test).
- Requirement: Null-audience row-level access
  - Scenario: Null-audience owner row is owner-only — **PASS** (`src/lib/server/notifications.ts:57-60,73-76`; focused audience test).
  - Scenario: Null-audience/no-owner row is broadcast — **PASS** (`src/lib/server/notifications.ts:57-60,73-76`; focused audience test).
- Requirement: Producer always sees own row
  - Scenario: Producer sees/marks role-targeted row — **PASS** (`src/lib/server/notifications.ts:57-59,73-75`; producer user IDs wired at `src/lib/server/courses.ts:215`, `certificates.ts:67`, `participants.ts:296`, `enrollments.ts:152`; producer/audience tests).
- Requirement: Filter checks caller role
  - Scenario: Mismatches rejected while null rules remain — **PASS** (`src/lib/server/notifications.ts:56-62,70-77`; audience SQL-contract tests).
- Requirement: Producer allowlist
  - Scenario: Course-completion/current producers are pinned — **PASS** (`src/lib/server/notifications.ts:14-20`; `src/lib/server/__tests__/notifications-producers.test.ts`; 2/2).
  - Scenario: Allowlist must pass before rollout — **PASS** for repository CI gate (`src/lib/server/__tests__/notifications-producers.test.ts`; backend suite passes).
- Requirement: Anonymous access rejected
  - Scenario: Anonymous list returns 401 — **PASS** (`src/pages/api/notifications.ts:5-13`; audience test/live E2E backend behavior).
  - Scenario: Anonymous mark returns 401 — **PASS** (`src/pages/api/notifications/[id].ts:5-19`; audience test/live behavior).

### Capability 4: ci-and-component-tests

- Requirement: `test:unit` script
  - Scenario: Script exists and runs suites — **PASS** (`app/package.json` scripts; direct `npm run test:unit` was recorded in apply progress and `npm run test:run` independently passed 8/64).
  - Scenario: Missing script cannot silently skip — **PASS** (`.github/workflows/ci.yml:47-49`; direct invocation has no `--if-present`).
- Requirement: CI invokes unit tests unconditionally
  - Scenario: Unconditional `npm run test:unit` — **PASS** (`.github/workflows/ci.yml:44-49`).
  - Scenario: Unit failure fails workflow — **PASS** (unguarded npm command at `.github/workflows/ci.yml:47-49`).
- Requirement: Postgres service healthcheck
  - Scenario: Service healthy before E2E — **PASS** (`.github/workflows/ci.yml:65-77,137-143`; local E2E against PostgreSQL passes).
  - Scenario: Postgres image/cache behavior — **PARTIAL** (`.github/workflows/ci.yml:65-77` pins the image and dependency cache exists at `:108-115`, but GitHub-hosted image-layer cache behavior was not runtime-verified locally).
- Requirement: Playwright against real Postgres
  - Scenario: E2E executes with retries — **PASS** (`.github/workflows/ci.yml:159-163`; `app/playwright.config.ts` retry configuration; local 10/10).
  - Scenario: Unhealthy DB fails clearly — **PASS** (`.github/workflows/ci.yml:137-143` emits `database unavailable`).
- Requirement: Broken component suites
  - Scenario: Deleted-page suites compile/run against React — **PASS** (`app/tests/component/LoginPage.test.tsx`, `CoursesCatalogPage.test.tsx`; 13/13 component tests).
  - Scenario: All three previously broken suites resolved — **PASS** (`app/tests/component/AdminParticipantsPage.test.tsx` intentionally removed; `app/vitest.config.ts` documents this; overall 8/64 suites pass).
- Requirement: Missing secrets fail loud
  - Scenario: Missing DB credentials abort — **PASS** (`.github/workflows/ci.yml:87-95`).
  - Scenario: Missing VAPID credentials fail only push step — **PARTIAL**: no push-subscription CI step or VAPID check exists, so there is no push step that can fail independently (`.github/workflows/ci.yml:9-204`). Apply progress explicitly records this as current-workflow scope at `apply-progress.md:378`.

### Capability 5: openspec-scaffolding

- Requirement: Config with actual CLI schema
  - Scenario: Config present/parseable — **PASS** (`openspec/config.yaml:6-24`; `list --specs` and `doctor` passed).
  - Scenario: Missing/empty schema rejected — **DEFERRED**: not mutation-tested; design explicitly records the original scenario as unsatisfiable against the CLI behavior (`design.md:45-57,545-550`).
- Requirement: Specs directory
  - Scenario: Specs directory exists and is writable — **PASS** (`openspec/specs/_stub/spec.md`; CLI `list --specs` found `_stub`).
- Requirement: Archive directory
  - Scenario: Archive directory exists — **PASS** (`openspec/changes/archive/.gitkeep`; `doctor` passed).
  - Scenario: Archive command moves/syncs a change — **DEFERRED**: no archive operation was exercised; proposal explicitly keeps archival of parked changes out of scope (`proposal.md:21-30`).
- Requirement: Stub validation
  - Scenario: Valid stub exits zero — **PASS** by available CLI evidence: `list --specs` and `doctor` pass and `_stub` is recognized (`openspec/specs/_stub/spec.md`; direct standalone `validate` was not available in this CLI invocation).
  - Scenario: Malformed stub exits non-zero — **DEFERRED**: no destructive/mutation validation was run; no code or artifact change was needed.
- Requirement: README documents parked gap
  - Scenario: README names all three changes and blockers — **PASS** (`openspec/README.md:9-15`).
  - Scenario: README points to hardening change — **PASS** (`openspec/README.md:17`).

## Findings

### CRITICAL

- `openspec/changes/acoes-post-migration-hardening/tasks.md` has 47 unchecked verification boxes (`tasks.md:54-56` and throughout `:79-465`; `grep` found 47). The apply-progress narrative says tasks are complete, but the authoritative task artifact is not marked complete. Per SDD verify gate, incomplete implementation/verification tasks block archive.

### WARNING

- The CI spec's VAPID scenario is not implemented as a runtime capability: `.github/workflows/ci.yml` has no push-subscription step or VAPID secret check. This is consistent with the apply-progress scope note (`apply-progress.md:378`) but should be documented or the spec corrected in a follow-up.
- Backend build retains an unused-variable hint (`scripts/seed.ts:32`), and the React build retains the known 919.12 kB chunk warning. Neither blocks verification.

### SUGGESTION

- Replace the two deferred OpenSpec validation scenarios with CLI-accurate scenarios and add a non-destructive temporary-fixture validation check in a future verification harness.
- Add a hosted GitHub Actions run before archive if operational confidence is required; local CI-equivalent behavior and all local requested commands are green.

## Drift between spec and implementation

- The design/spec describe a nullable-audience predicate using `audience_role IS NULL`; the implementation deliberately uses true-broadcast handling `(user_id IS NULL AND audience_role IS NULL)` while preserving owner visibility. This is stricter and matches the owner-only scenario; the correction is documented at `apply-progress.md:240-244`.
- The CI spec mentions VAPID secrets, but the current workflow has no push-related step. Unit and E2E are intentionally isolated from VAPID, as documented at `apply-progress.md:378`.
- The OpenSpec CLI does not expose the requested standalone validation semantics exactly as the original spec describes; this is documented in `design.md:545-550`.

## Deferred scenarios

- OpenSpec missing/empty-schema rejection was explicitly identified as unsatisfiable against the real CLI schema (`design.md:545-550`).
- OpenSpec archive move/sync was explicitly kept out of scope; the archive directory is scaffolding only (`proposal.md:21-30`).
- OpenSpec malformed-stub rejection was not runtime exercised and remains a verification limitation.

## Recommendation

- **BLOCKED: fix-critical** — reconcile and mark the completed tasks in `tasks.md` (or otherwise produce an authoritative completed-task artifact), then rerun verification/archive gate. No implementation code failure was found in the requested local tests.

## Verification completeness

- Full artifacts read: proposal, explore/design context, tasks, cumulative apply progress, and all five specs.
- Strict TDD: inactive; no strict-TDD checks applied.
- Hosted GitHub Actions execution: not run locally; static workflow inspection plus local equivalents were used.
