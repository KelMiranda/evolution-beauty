# Apply Progress: acoes-post-migration-hardening

## PR1 — openspec-scaffolding — DONE

**Status**: success
**Capability**: openspec-scaffolding
**Estimated changed lines**: ~90 (actual: 62 insertions across 4 files)
**Date**: 2026-07-25

### Commits (work-unit, in order)

1. `e401fe0` — `chore(openspec): add config.yaml with real CLI schema` (1 file, 24 insertions)
2. `759811a` — `chore(openspec): add specs/ stub and changes/archive skeleton` (2 files, 15 insertions)
3. `905d4fa` — `docs(openspec): document parked archival gap` (1 file, 23 insertions)

### Files created

- `openspec/config.yaml` (24 lines) — real CLI schema (schema: spec-driven + context + rules)
- `openspec/specs/_stub/spec.md` (15 lines) — minimal valid stub for `openspec list --specs`
- `openspec/changes/archive/.gitkeep` (0 lines) — archive target directory
- `openspec/README.md` (23 lines) — documents 3 parked changes and their blockers

### Verification

| Check | Result | Evidence |
|-------|--------|----------|
| Files exist on disk | pass | `ls openspec/{config.yaml,specs/_stub/spec.md,changes/archive/.gitkeep,README.md}` |
| `openspec list` finds 4 changes | pass | lists acoes-post-migration-hardening + 3 parked old changes |
| `openspec list --specs` finds the stub | pass | shows `_stub` with 1 requirement |
| `openspec doctor` | pass | reports `OpenSpec root: ok` |
| `grep -E '^(schema\|context\|rules):' openspec/config.yaml` | pass | returns all three keys |

### Design-flaw finding (discovered during apply)

The design assumed the `@fission-ai/openspec` CLI was installed in `node_modules` for validation. **It was not installed in this project.** The apply sub-agent could not run `openspec validate` directly. Workaround: `npx -y @fission-ai/openspec@1.6.0` works (downloads + caches the package on first use). Future designs should not assume an installed CLI without checking; use `npx -p <pkg> <bin>` to invoke without installation.

The schema claims in the design (that real keys are `schema`, `context`, `rules`, and that unknown keys like `project/changeRoot/archiveDir` are silently ignored) were verified correct against the real CLI.

### Spec scenarios status (PR1 subset)

From `openspec/changes/acoes-post-migration-hardening/specs/openspec-scaffolding/spec.md`:

| Scenario | Status |
|----------|--------|
| Config file is present and parseable | pass (manual content review; `openspec list --specs` would not have found the stub if config were malformed) |
| Missing or empty `schema` is rejected by the tool | not runtime-verified (test would require removing `schema` and re-running CLI; deferred to verify phase) |
| Specs directory is present and writable | pass (`openspec/specs/_stub/` exists) |
| Archive directory is present | pass (`openspec/changes/archive/.gitkeep` exists) |
| Archiving a change moves it under `archive/` | not exercised in PR1 (no change to archive yet) |
| `openspec validate` exits zero on the stub | not runtime-verified (no standalone `validate` subcommand; `doctor` and `list --specs` are the equivalent sanity checks and they passed) |
| `openspec validate` exits non-zero on malformed stub | not exercised in PR1 |
| README names the three parked changes | pass |
| README points to the hardening change | pass |

Two scenarios deferred to verify phase. None failed.

### Next slice: PR2 — auth-and-route-protection (~310 lines)

Per the chain plan: PR2 (auth), PR3 (public validation), PR4 (notifications), PR5 (CI) remain.

The 3 parked old changes (acoes-batch-1/2/3) are NOT touched in this apply batch and remain unarchived.

## PR2 — auth-and-route-protection — DONE

**Status**: success
**Capability**: auth-and-route-protection
**Estimated changed lines**: ~310 (runtime, tests, and route guard; within the 800-line review budget)
**Date**: 2026-07-25

### Commits (work-unit, in order)

1. `c6c768a` — `feat(auth): add canonical roles source of truth`
2. `f4b2e91` — `refactor(auth): surface legacy role drift`
3. `bfc2aa2` — `chore(types): align frontend roles to canonical vocabulary`
4. `ffd1c41` — `feat(spa): enforce role-aware route manifest`

### Files created

- `src/pages/api/admin/role-drift.ts` (19 lines) — admin-only read-side drift counter.
- `src/lib/server/__tests__/role-drift.test.ts` (20 lines) — counter helper test.
- `src/lib/server/__tests__/role-drift-route.test.ts` (49 lines) — 401/403/admin endpoint tests.
- `app/src/routes/routeManifest.ts` (15 lines) — single route-to-role allowlist.
- `app/src/components/RoleGuard.tsx` (25 lines) — loading/auth/role guard.
- `app/src/pages/UnauthorizedPage.tsx` (23 lines) — wrong-role destination.
- `app/tests/component/RoleGuard.test.tsx` (54 lines) — guard coverage.

### Files modified

- `src/lib/server/permissions.ts` (120 lines) — canonical role source, explicit coercion error, and drift counter.
- `src/lib/server/auth.ts` (146 lines) — invalid roles are warned and treated as unauthenticated.
- `src/lib/server/bootstrap.ts` (276 lines) — no legacy rewrite; boot warning; read-side-compatible role check.
- `src/lib/server/__tests__/permissions.test.ts` (38 lines), `src/lib/server/__tests__/user-schema.test.ts` (31 lines) — backend role fixtures/assertions.
- `app/src/App.tsx` (60 lines) — manifest-backed protected routes.
- `app/src/hooks/useAuth.ts` (29 lines), `app/src/services/api.ts` (600 lines), `app/src/services/api.backend.types.ts` (111 lines), `app/src/types/index.ts` (95 lines) — four-role frontend contract.
- `app/tests/setup.ts` (168 lines), `app/tests/unit/api-shapes.test.ts` (274 lines), `app/tests/unit/auth-permissions.test.ts` (75 lines), `app/tests/unit/schemas.test.ts` (296 lines) — canonical test vocabulary.

### Verification

| Check | Result | Evidence |
|-------|--------|----------|
| Backend Vitest (`npm test`) | pass | 5 files, 11 tests passed. |
| React Vitest (`cd app && npm run test:run`) | degraded, pre-existing failures only | 4 relevant suites passed (47 tests); 3 parked component suites still fail on deleted-page imports, out of PR2 scope. |
| Backend build (`npm run build`) | pass | `astro check`: 0 errors; server build completed. |
| React build (`cd app && npm run build`) | pass | `tsc -b && vite build` completed; existing ~918KB chunk warning remains. |
| E2E (`cd app && npm run test:e2e`) | pass | 9 passed. |
| Manual role-drift smoke | pass | anonymous → 401; admin → 200 with `legacy_facilitadora_count: 0`; temporary empleado → 403; role restored. |

### Spec scenarios status

| Scenario | Status | Evidence |
|----------|--------|----------|
| All four canonical roles accepted | pass | permissions tests, frontend union, and builds. |
| Legacy `facilitadora` surfaced, not coerced | pass | `RoleCoercionError`, boot warning, read-only counter, no coercion. |
| Unauthenticated user redirected to login | pass | RoleGuard test and existing E2E redirect. |
| Wrong-role user redirected away | pass | RoleGuard test redirects to `/unauthorized`. |
| Server rejects wrong-role API call | pass | route test and live temporary empleado smoke returned 403. |
| Server rejects unauthenticated API call | pass | route test and live anonymous smoke returned 401. |
| Frontend role union contains only four canonical roles | pass | exact four-role union and React build. |
| Unit tests assert four roles | pass | auth-permissions and aligned API/schema tests passed. |
| Route manifest is the only route-role mapping | pass | `routeManifest.ts` is imported by `App.tsx`; guard tests passed. |

No PR2 requirements were deferred. Public validation, notifications, and CI remain deferred to PR3, PR4, and PR5.

### Risks

- `users_role_check` is deliberately `NOT VALID` so historical `facilitadora` rows can be read and reported without boot failure; new writes remain checked. Explicit backfill remains future operational work.
- Wrong-role users now go to `/unauthorized`; non-canonical existing sessions may need to log in again.
- Three pre-existing broken React component suites remain outside PR2 scope until PR5.

### Next slice: PR3 — public-participant-validation

PR3 owns shared JSON participant validation, per-field errors, and the gender catalog. PR2 does not modify those surfaces.

## PR3 — public-participant-validation — DONE

**Status**: success
**Capability**: public-participant-validation
**Estimated changed lines**: ~260 (actual: 491 insertions across 7 files; tests larger than the high estimate but well within the 800-line review budget)
**Date**: 2026-07-25

### Commits (work-unit, in order)

1. `60ba58e` — `feat(api): route public participants through shared Zod schema`
2. `b0597a6` — `fix(spa): remove Otro gender option from RegistroPage`
3. `0c5c3a6` — `fix(spa): surface per-field errors and stop fake success`

### Files created

- `src/lib/server/http-picks.ts` (47 lines) — `pickString / pickNumber / pickBoolean / pickOptionalString` alias-coercing helpers for the JSON normalization step.
- `src/lib/server/__tests__/participant-public-json.test.ts` (155 lines) — 5 cases (invalid gender → 400 + issues, multiple invalid fields → ≥3 issues, valid payload → 201, snake_case alias → 201, no validation failure ever returns 500).
- `app/tests/unit/registro-gender-options.test.tsx` (39 lines) — renders `RegistroPage` in jsdom and asserts the gender `<select>` exposes exactly `Femenino` and `Masculino`.
- `app/tests/unit/validation-api-error.test.ts` (86 lines) — stubs `global.fetch` and asserts `request()` throws `ValidationApiError` with parsed `issues` on a 400 + `validation_failed`, and still throws a plain `Error` on a 401 / non-JSON 502.

### Files modified

- `src/pages/api/public/participants.ts` (124 lines; +34/-26) — JSON branch now calls `participantPublicSchema.safeParse(normalized)` and returns `Response.json({ error: 'validation_failed', issues }, { status: 400 })` on failure. The FormData branch is unchanged.
- `app/src/services/api.ts` (+47/-10) — exports `ApiValidationError` type + `ValidationApiError` class; `request()` now detects the `validation_failed` envelope and throws `ValidationApiError` (regression net: non-validation 4xx/5xx still throws a plain `Error`).
- `app/src/pages/RegistroPage.tsx` (+54/-3) — gender dropdown options reduced to `['Femenino', 'Masculino']`; `handleSubmit` no longer renders the success screen on failure; `ValidationApiError` issues are translated from backend camelCase paths to the form's Spanish field names via a static `backendFieldToFormField` map and written into the `errors` state, with the first invalid field scrolled into view.

### Verification

| Check | Result | Evidence |
|-------|--------|----------|
| Backend Vitest (`npm test`) | pass | 6 files, 16 tests passed (11 prior + 5 new in `participant-public-json.test.ts`). |
| React Vitest (`cd app && npm run test:run`) | degraded, pre-existing failures only | 6 passing suites, 51 tests; 3 parked component suites still fail on deleted-page imports, out of PR3 scope (unchanged from PR2 baseline). |
| Backend build (`npm run build`) | pass | `astro check`: 0 errors; server build completed. |
| React build (`cd app && npm run build`) | pass | `tsc -b && vite build` completed; existing ~919KB chunk warning remains. |
| E2E (`cd app && npm run test:e2e`) | pass | 9 passed (including `public-registration.spec.ts`, whose direct-POST happy path still gets 201 from the validated endpoint). |
| Manual smoke (against rebuilt docker) | pass | invalid payload `{gender:"Otro"}` → HTTP 400 with `error: validation_failed` and 12 Zod issues whose `path[0]` includes `gender`; valid snake_case E2E-shape payload → HTTP 201 with `participant_code: ACOES-20260725-000028`. SPA source served from `http://localhost:3000/src/pages/RegistroPage.tsx` confirms `options: ["Femenino", "Masculino"]` (no Otro) and the `ValidationApiError` import + instanceof branch. |

### Spec scenarios status

From `openspec/changes/acoes-post-migration-hardening/specs/public-participant-validation/spec.md`:

| Scenario | Status | Evidence |
|----------|--------|----------|
| Valid payload is accepted and persisted | pass | `participant-public-json.test.ts` "returns HTTP 201 when the payload is valid" + E2E `public-registration.spec.ts` + manual curl. |
| Anonymous JSON request with a valid payload still succeeds | pass | same as above; the snake_case alias test confirms the existing E2E payload shape keeps working. |
| Invalid gender returns 400 with field error | pass | `participant-public-json.test.ts` "returns HTTP 400 with per-field Zod issues when gender is invalid" asserts `path[0] === 'gender'` and no participant insert; manual curl reproduced the same envelope. |
| Multiple invalid fields return all of them | pass | `participant-public-json.test.ts` "returns HTTP 400 with multiple issues when many fields are invalid" asserts `>=3` issues returned; manual curl showed 12 issues for `{gender:"Otro"}`. |
| Validation failure never causes HTTP 500 | pass | dedicated test `does not return HTTP 500 on any validation failure`; manual curl confirmed 400, not 500. |
| SPA form does not offer `Otro` | pass | `registro-gender-options.test.tsx` asserts the rendered options are exactly `['Femenino', 'Masculino']`; docker-served SPA source confirms `options: ["Femenino", "Masculino"]`. |
| Form submission with a non-canonical gender is impossible | pass | Same gender test; the dropdown's selectable values are the only path into `form.genero`, so a `Otro` payload cannot originate from the form. |
| API failure renders per-field errors, not the success state | pass | `handleSubmit` only calls `setSubmitted(true)` inside the success branch; `ValidationApiError` issues populate `errors` via the translation map; `validation-api-error.test.ts` asserts the central `request()` throws `ValidationApiError` with the parsed issues. |
| Successful API response renders the success screen | pass | `handleSubmit` now reaches `setSubmitted(true)` only after `await createRegistro(form)` resolves without throwing. |
| Silent acceptance is impossible | pass | The old `finally { setSubmitted(true) }` was removed; a non-201 response leaves the user on the registration view with the per-field errors visible. |

All 4 requirements and all 9 scenarios pass. No PR3 requirements deferred.

### Risks

- The frontend `<Select>` still uses `string` for `form.genero` rather than a narrowed `'Femenino' | 'Masculino'` union. The form's runtime value set is now constrained by the dropdown, but the `Registro` type contract stays broad; narrowing it would require touching the list/detail views and is parked.
- Removing `Otro` is a behavior change for any current user who selected it (none, since the backend never accepted it). Acceptable per the design.
- The docker compose `app` service compiles the source at image build time (no volume mount); `docker compose up -d --build app` is required after backend source changes to pick them up. The frontend container runs `npm run dev` so SPA changes are picked up by HMR automatically.
- `pickBoolean` silently coerces any non-true/non-false/non-`'true'`/`'false'` value to `false`, which passes Zod's `consent: z.boolean()` check. This is fine for the public registration flow (consent comes from a checkbox) but is a non-obvious behavior worth flagging — see Engram topic `acoes-post-migration-hardening/pr3-discoveries` for details.

### Next slice: PR4 — notification-audience-isolation

PR4 owns `src/lib/server/notifications.ts` (audience filter), the 4 producer call sites that need `userId`, and the producer allowlist test. PR3 did not touch any PR4 surface (only `notifications.ts` was referenced once, for the `duplicate_in_review` call which keeps its `userId: null` per design §"Decision 7").

## PR4 — notification-audience-isolation — DONE

**Status**: success
**Capability**: notification-audience-isolation
**Estimated changed lines**: ~165 (actual runtime + tests: 226 changed lines — 216 insertions / 10 deletions across 9 files; the two focused test files account for 188 insertions)
**Date**: 2026-07-24

### Commits (work-unit, in order)

1. `cf62bb6` — `feat(notifications): tighten audience filter to caller role`
2. `b4067ba` — `feat(notifications): wire producer visibility`

### Files created

- `src/lib/server/__tests__/notifications-audience.test.ts` (100 lines) — four audience/owner scenarios plus SQL-contract assertions for both list and mark-as-read.
- `src/lib/server/__tests__/notifications-producers.test.ts` (88 lines) — static five-producer allowlist and authenticated-actor ownership assertions.

### Files modified

- `src/lib/server/notifications.ts` (97 lines; +22/-8) — caller-role signatures, canonical audience input type, five-kind `producerAudienceMap`, and owner/matching-role/null-broadcast visibility grants.
- `src/pages/api/notifications.ts` (13 lines; +1/-1) — passes `user.role` to list filtering.
- `src/pages/api/notifications/[id].ts` (19 lines; +1/-1) — passes `user.role` to mark-as-read filtering.
- `src/lib/server/courses.ts` (364 lines; +1) — `course_full` stores `userId: createdBy`.
- `src/lib/server/certificates.ts` (86 lines; +1) — `course_completed` stores `userId: completedBy`.
- `src/lib/server/participants.ts` (635 lines; +1) — `facilitator_pending_validation` stores `userId: createdBy`.
- `src/lib/server/enrollments.ts` (224 lines; +1) — `participant_enrolled` stores `userId: input.enrolledBy`.
- `openspec/changes/acoes-post-migration-hardening/tasks.md` (793 lines) — PR4 task 18-22 verification boxes marked complete; prior and PR5 task state preserved.
- `openspec/changes/acoes-post-migration-hardening/apply-progress.md` (291 lines) — this cumulative PR1+PR2+PR3+PR4 report.

### Producer allowlist and ownership wiring

| Producer site | Kind | Intended audience | Stored producer `userId` |
|---------------|------|-------------------|--------------------------|
| `src/pages/api/public/participants.ts` | `duplicate_in_review` | `admin` | unset (`NULL`; anonymous producer, intentionally unchanged) |
| `src/lib/server/courses.ts` | `course_full` | `admin` | `createdBy` |
| `src/lib/server/certificates.ts` | `course_completed` | `admin` | `completedBy` |
| `src/lib/server/participants.ts` | `facilitator_pending_validation` | `admin` | `createdBy` |
| `src/lib/server/enrollments.ts` | `participant_enrolled` | `admin` | `input.enrolledBy` |

### Design correction applied

The design's literal predicate `(user_id = caller OR audience_role IS NULL OR audience_role = caller_role)` would make an owner-targeted row with `audience_role IS NULL` visible to every authenticated user. PR4 instead grants access when the caller owns the row, the caller role matches the audience, or both `user_id` and `audience_role` are NULL (a true broadcast). This is required by the spec's null-audience owner-only scenario and was confirmed against live PostgreSQL through the API smoke.

The prompt referenced `src/lib/server/roles.ts`, but that file does not exist. The landed PR2 canonical role source is `src/lib/server/permissions.ts`; PR4 imports `CanonicalRole` from there.

### Verification

| Check | Result | Evidence |
|-------|--------|----------|
| Backend Vitest (`npm test`) | pass | 8 files, 22 tests passed (16 prior + 6 PR4 tests). |
| Focused audience test | pass | `notifications-audience.test.ts`: 4/4 passed. |
| Focused producer allowlist test | pass | `notifications-producers.test.ts`: 2/2 passed. |
| React Vitest (`cd app && npm run test:run`) | degraded, pre-existing failures only | 6 suites / 51 tests passed; the same 3 parked component suites fail on deleted-page imports (`AdminParticipantsPage`, `CoursesCatalogPage`, `LoginPage`). No notification-related app test failed. |
| Backend build (`npm run build`) | pass | `astro check`: 0 errors; server build completed. Existing unused-variable hint in `scripts/seed.ts` remains. |
| React build (`cd app && npm run build`) | pass | `tsc -b && vite build` completed; existing 919.12 kB chunk warning remains. |
| Docker backend rebuild | pass | `docker compose up -d --build app`; image rebuilt and app container restarted healthy. |
| E2E (`cd app && npm run test:e2e`) | pass | 9 passed in 6.3s. |
| Manual notification API smoke | pass | Admin list included admin-target row and PATCH returned 200; non-owner `empleado` list omitted it and PATCH returned 404; producer `empleado` listed and PATCHed their own admin-target row (200); null-audience owner listed/PATCHed their row (200), while the other user omitted it/PATCH got 404; anonymous list and PATCH returned 401. Smoke users/rows were deleted afterward (0 remain). |

`GET /api/notifications/:id` is not implemented by the current route (the route exports PATCH only), so a live GET returned 404. PR4 did not add a new endpoint because neither the spec nor design defines one; list visibility and per-ID mark authorization were verified through the existing GET collection and PATCH item endpoints.

### Spec scenarios status

From `openspec/changes/acoes-post-migration-hardening/specs/notification-audience-isolation/spec.md`:

| Requirement / scenario | Status | Evidence |
|------------------------|--------|----------|
| Role-targeted: admin notification hidden from `participante` / mismatched role cannot mark | pass | Audience test + live `empleado` list omission and PATCH 404. |
| Role-targeted: admin notification visible and markable to `admin` | pass | Audience test + live admin GET/PATCH 200. |
| Null audience: owner-targeted row visible only to owner | pass | Audience test + live owner GET/PATCH 200 and non-owner omission/PATCH 404. |
| Null audience: row with no owner is a broadcast | pass | Audience fixture asserts the null-user/null-audience row is returned across roles. |
| Producer: role-mismatched producer sees and marks own row | pass | Audience test + live `empleado` producer GET/PATCH 200 for an admin-targeted row. |
| Caller-role filter rejects non-matching non-null audiences and preserves null row rules | pass | SQL-contract assertions reject the old `audience_role IS NOT NULL` predicate and pin role equality plus true-broadcast handling. |
| Allowlist: course-completion producer carries its documented `admin` target | pass | Five-producer source allowlist includes `course_completed -> admin`. |
| Allowlist blocks producer audience drift before rollout | pass | Source test reads every real producer call and fails if its literal audience differs from `producerAudienceMap`; 2/2 passed before the behavior flip was smoke-tested. |
| Anonymous list request rejected | pass | Live GET `/api/notifications` returned 401. |
| Anonymous mark-as-read request rejected | pass | Live PATCH `/api/notifications/28` returned 401 during smoke. |

All six requirement headings and all ten scenarios in the notification spec pass. No PR4 requirement is deferred.

### Risks

- The producer allowlist intentionally reads TypeScript source, so formatting or call-shape refactors require a deliberate test update; this brittleness is the requested drift alarm.
- `createNotification` still runs through the global pool even when invoked inside a surrounding service transaction. That pre-existing transaction-boundary concern is documented in the exploration and remains outside PR4.
- The item route has PATCH only; consumers expecting `GET /api/notifications/:id` receive 404. No current spec requires item GET.
- React's three parked component-suite failures remain unchanged and belong to PR5.

### Next slice: PR5 — ci-and-component-tests (final PR)

PR5 owns the real `test:unit` CI gate, PostgreSQL service, restored Playwright job, and repair/removal of the three parked component suites. PR4 does not modify CI or React test infrastructure.

## PR5 — ci-and-component-tests — DONE

**Status**: success
**Capability**: ci-and-component-tests
**Estimated changed lines**: ~165 (actual implementation/test/CI diff: 546 changed lines — 245 insertions / 301 deletions across 8 files; the removed 196-line parked suite and replacement of the 40-line commented E2E skeleton dominate the delta; still within the 800-line review budget)
**Date**: 2026-07-24

### Commits (work-unit, in order)

1. `afd8699` — `chore(app): add test:unit script`
2. `9af3269` — `test(spa): repair component suites after Astro removal`
3. `17ae309` — `ci: re-enable Playwright with PostgreSQL`

### Files created

- `app/tests/e2e/public-registration-rejected.spec.ts` (24 lines) — direct API regression test proving `gender: 'Otro'` returns 400 + a `gender` issue.

### Files modified

- `.github/workflows/ci.yml` (204 lines; +143/-40) — direct backend/React test gates, dependency caches, live PostgreSQL-backed E2E job, health/wait checks, both builds, Chromium install, and CI retries.
- `app/package.json` (96 lines; +1) — adds `test:unit` while preserving `test:run`.
- `app/tests/component/LoginPage.test.tsx` (113 lines; +31/-36) — React `LoginPage` rewire, current selectors/defaults, same-package router, shared MSW server, and real credential payload assertion.
- `app/tests/component/CoursesCatalogPage.test.tsx` (199 lines; +22/-28) — React `CatalogoCursosPage` rewire, same-package router, shared MSW handlers, and settled async assertions.
- `app/tests/setup.ts` (189 lines; +22/-1) — shared jsdom `matchMedia` and `scrollTo` browser-contract stubs required by GSAP-backed React pages.
- `app/vitest.config.ts` (37 lines; +2) — records why the Astro-only admin participants suite was intentionally removed.
- `openspec/changes/acoes-post-migration-hardening/tasks.md` (793 lines on disk, still part of the pre-existing untracked planning set) — PR5 tasks 23-29 marked complete; prior task state preserved.
- `openspec/changes/acoes-post-migration-hardening/apply-progress.md` (393 lines; FINAL cumulative PR1-PR5 report) — this merged section; prior PR1-PR4 evidence preserved.

### File deleted

- `app/tests/component/AdminParticipantsPage.test.tsx` (196 lines before deletion) — the imported admin participants page has no React equivalent and React admin parity remains explicitly parked.

### Component-suite repair decisions

| Suite | Before | Decision | After |
|-------|--------|----------|-------|
| `LoginPage` | Failed at import resolution for deleted `@/pages/login`; 5 tests never collected. | Rewired to named React export `@/pages/LoginPage`, moved to `react-router-dom`'s matching router context, reused shared MSW, and aligned assertions to the active form. A code comment records the Astro-to-React rewire. | 5/5 pass. |
| `CoursesCatalogPage` | Failed at import resolution for deleted `@/pages/courses/index`; 8 tests never collected. | Rewired to `CatalogoCursosPage`, used the matching router package and shared API handlers, and waited for async loading before assertions. A code comment records the rewire. | 8/8 pass. |
| `AdminParticipantsPage` | Failed at import resolution for deleted `@/pages/admin/participants`; 6 tests never collected. | Removed because no equivalent React route exists and that parity is out of scope. `app/vitest.config.ts` carries the future-reader comment and says when coverage should return. | Removed intentionally; no stale reference remains. |

The baseline had 51 passing React tests plus 3 import-failing suites. The repaired run has **64 passing tests** across 8 files and **0 broken suites**: +13 collected/passing component tests from Login and Catalog; the 6 deleted-feature tests were removed rather than misrepresenting nonexistent behavior.

### CI workflow changes

- `test` now runs backend `npm test` and React `npm run test:unit` directly; `--if-present` is gone, so a missing script or failing suite exits non-zero.
- `node_modules` and `app/node_modules` are cached from both lockfiles in test, E2E, and type-check jobs; cold misses run `npm ci` in both workspaces.
- `e2e` now depends on `test` and starts `postgres:16-alpine` with the docker-compose database/user/password, port 5432, and `pg_isready -U acoes -d acoes_local` healthcheck.
- The backend receives `DATABASE_URL=postgres://acoes:acoes@localhost:5432/acoes_local`; disposable CI credentials intentionally mirror docker-compose and are not production secrets.
- An early configuration guard emits `::error::Missing secret or CI variable: <name>` and exits 1 if `DATABASE_URL` or `POSTGRES_PASSWORD` is empty.
- `wait-on@8.0.3` checks PostgreSQL and the backend; failures emit an explicit `database unavailable` / backend-startup diagnostic before Playwright starts.
- Both backend and React builds run, Chromium installs with OS dependencies, and `CI: 'true'` activates the existing `retries: 2` plus `trace: 'on-first-retry'` in `app/playwright.config.ts`.
- Playwright owns SPA startup through its `webServer` config; the workflow does not launch a conflicting second Vite process when `reuseExistingServer` is false in CI.

### Verification

| Check | Result | Evidence |
|-------|--------|----------|
| Backend Vitest (`npm test`) | pass | 8 files, 22 tests passed. |
| React Vitest alias (`cd app && npm run test:run`) | pass | 8 files, 64 tests passed; broken suites remaining: 0. |
| New CI command (`cd app && npm run test:unit`) | pass | 8 files, 64 tests passed; command exists and exits zero. |
| Focused repaired suites | pass | `LoginPage` 5/5 + `CatalogoCursosPage` 8/8 = 13/13 passed. |
| Backend build (`npm run build`) | pass | `astro check`: 0 errors; server build complete. Existing unused-variable hint in `scripts/seed.ts` remains. |
| React build (`cd app && npm run build`) | pass | `tsc -b && vite build` complete; existing 919.12 kB chunk warning remains. |
| Focused rejection E2E | pass | 1/1 passed; invalid `Otro` payload returned 400 + `gender` issue. |
| Full E2E (`cd app && npm run test:e2e`) | pass | 10/10 passed in 7.0s (9 existing + 1 rejection regression). |
| CI YAML parse/structure | pass | `js-yaml` parsed `test`, `e2e`, and `lint`; programmatic assertions found Postgres image/healthcheck, exact localhost URL, direct unit command, and `CI: 'true'`. |
| Docker Compose compatibility | pass | `docker compose config` exited zero. |
| Deleted imports/files | pass | No deleted-page or `.astro` import remains in component tests; `AdminParticipantsPage.test.tsx` is absent. |
| Hosted GitHub Actions execution | not run by instruction | Static workflow validation passed. First hosted service/cache run remains the verify/first-push risk. |

### Spec scenarios status

From `openspec/changes/acoes-post-migration-hardening/specs/ci-and-component-tests/spec.md`:

| Requirement / scenario | Status | Evidence |
|------------------------|--------|----------|
| `test:unit` exists and runs the React suites | pass | Direct command ran 8 files / 64 tests and exited zero. |
| Missing `test:unit` cannot silently skip | pass | Workflow invokes `npm run test:unit` without `--if-present`. |
| A failing React unit test fails CI | pass | Direct unguarded npm command propagates Vitest's exit code. |
| PostgreSQL is healthy before E2E | pass (static CI + local runtime evidence) | Service has `pg_isready` healthcheck and explicit TCP wait; local full E2E passed against real docker PostgreSQL. Hosted run is intentionally deferred. |
| PostgreSQL image/cache behavior | pass with hosted-run risk | Pinned `postgres:16-alpine` service uses the runner's image layer when available; dependency caches are explicit. A fresh hosted runner may cold-pull. |
| Playwright E2E executes with documented retries | pass | Workflow runs `npx playwright test` with `CI: 'true'`; config sets 2 retries. Local suite passed 10/10. |
| Unhealthy database fails clearly | pass (static) | `wait-on` failure emits `::error::database unavailable after 60 seconds` and exits before tests. |
| Deleted-page suites compile/run against React equivalents | pass | Login and catalog collect and pass 13/13; no stale imports remain. |
| All three previously broken suites are resolved | pass | Two rewired green; one nonexistent-feature suite intentionally removed; overall React run is 64/64. |
| Missing database configuration fails loud | pass (static) | Early shell guard emits `Missing secret or CI variable` and exits 1 for either empty required value. |
| Missing VAPID configuration is isolated from unit/E2E | pass for current workflow scope | No push-subscription CI step exists, so VAPID is not a required input and cannot skip/block either test layer. |

All six requirement headings are implemented. The only non-runtime evidence is the hosted GitHub service lifecycle, which cannot be executed locally and is explicitly deferred to `sdd-verify` / the first GitHub run.

### Deviations and risks

- The design proposed `${{ secrets.POSTGRES_PASSWORD }}`. PR5 uses the exact disposable docker-compose credentials requested for the isolated CI service, so no repository DB secret is required; the fail-loud guard protects the required runtime variables instead.
- The design showed a separately started SPA, but `playwright.config.ts` already starts Vite and sets `reuseExistingServer: false` in CI. Starting another SPA would create a deterministic port collision, so the workflow lets Playwright own that process.
- GitHub Actions service containers start before job steps. The service healthcheck is therefore the primary gate; the explicit `wait-on` check provides the requested human-readable failure only when steps can begin.
- A first hosted run may cold-pull PostgreSQL/Chromium or expose runner-specific timing. Mitigations: service healthcheck, explicit database/backend waits, cached dependencies, two Playwright retries, and trace-on-first-retry.
- The React suite still prints Node's experimental localStorage warning. It is non-fatal and all 64 tests pass; changing the runtime invocation is outside this slice.

### Next step: sdd-verify

All five stacked-to-main apply slices are landed. Run `sdd-verify` against the cumulative recortado, then `sdd-archive` if verification passes. No further apply slice remains.

