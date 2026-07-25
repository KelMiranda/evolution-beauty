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

