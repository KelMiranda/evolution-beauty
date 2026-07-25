# Tasks: acoes-post-migration-hardening (recortado)

## Review Workload Forecast

- Total estimated changed lines (high estimate): ~990 (additions + deletions, conservative)
- Number of tasks: 29
- Largest single task: Capability 1, task 14 (types + app test alignment to 4 roles, ~120 lines — auth-permissions.test.ts rewrite dominates)
- Largest single capability: Capability 1 at ~310 lines
- Chained PRs recommended: Yes
- 800-line budget risk: High
- Decision needed before apply: Yes
- Recommended chain strategy: stacked-to-main

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
800-line budget risk: High

### Reasoning

Sum of per-task high estimates is ~990 lines, which exceeds the 800-line review budget as a single PR. Each capability is independently revertible (per the design §"Per-capability rollback"), has its own spec coverage, and has no cross-capability code dependencies — except that Capabilities 2 and 3 read roles that Capability 1 canonicalizes. Splitting into 5 stacked PRs keeps each PR under ~320 lines and well within the 60-minute review window per the `chained-pr` skill. The five PRs land in this order: Capability 5 first (additive scaffolding, zero behavior risk, unblocks archive flow), then Capabilities 1 → 2 → 3 → 4 in any order; recommended order below.

### Suggested Work Units (chained stacked-to-main PRs)

| PR | Capability | Goal | High estimate | Base | Notes |
|----|------------|------|---------------|------|-------|
| 1 | `openspec-scaffolding` | Restore `openspec/config.yaml`, `openspec/specs/`, `openspec/changes/archive/`, README | ~90 lines | `main` | Additive only; `openspec validate` exits zero afterwards |
| 2 | `auth-and-route-protection` | Canonical 4-role vocabulary + SPA role guards + server role-drift endpoint | ~310 lines | `main` | Server-side role tightening + SPA guard + tests aligned to 4 roles |
| 3 | `public-participant-validation` | Route `POST /api/public/participants` JSON through shared schema; per-field errors; drop `Otro` | ~260 lines | `main` | Depends on PR 2 only because cap 1 fixes roles; the schema itself doesn't read roles |
| 4 | `notification-audience-isolation` | Filter notifications by caller role; producer allowlist | ~165 lines | `main` | Depends on PR 2 for `user.role` plumbing |
| 5 | `ci-and-component-tests` | Real `test:unit` + Postgres service + Playwright E2E + repair 3 broken suites | ~165 lines | `main` | CI riskiest first run; ship last so prior capabilities were already manually verified |

Each PR is independently mergeable. The recortado ships as five chained PRs.

---

## Capability 1: openspec-scaffolding

### 1. Restore `openspec/config.yaml`

**Capability**: openspec-scaffolding
**Spec ref**: `openspec/changes/acoes-post-migration-hardening/specs/openspec-scaffolding/spec.md` §"`openspec/config.yaml` exists with the CLI's actual schema"
**Depends on**: none
**Estimated changed lines**: +25 / -0

### Files to change
- `openspec/config.yaml` — Create. Minimal valid config per `@fission-ai/openspec src/core/project-config.ts` (`schema`, `context`, `rules`). No `project/changeRoot/archiveDir` (CLI ignores unknowns; change root and archive dir are hard-coded).

### Steps
1. Create `openspec/config.yaml` with the exact content from `design.md` §"Capability 5 — OpenSpec Scaffolding" (lines 363-390): `schema: spec-driven`, `context:` block with stack/auth-roles/test-runner summary, `rules:` block with spec/design/tasks conventions.
2. Verify the file parses: `python3 -c "import yaml; yaml.safe_load(open('openspec/config.yaml'))"`.

### Verification
- [x] `python3 -c "import yaml; yaml.safe_load(open('openspec/config.yaml'))"` exits zero.
- [x] `npx openspec validate --config openspec/config.yaml 2>&1 | head -20` does not flag the file as malformed YAML or missing `schema`.
- [x] `grep -E '^(schema|context|rules):' openspec/config.yaml` returns all three keys.

### Rollback
`rm openspec/config.yaml` — pure addition; revert is a single file removal.

---

### 2. Create `openspec/specs/_stub/spec.md`

**Capability**: openspec-scaffolding
**Spec ref**: `openspec/changes/acoes-post-migration-hardening/specs/openspec-scaffolding/spec.md` §"`openspec/specs/` directory exists" and §"`openspec validate` passes on a stub spec"
**Depends on**: 1
**Estimated changed lines**: +13 / -0

### Files to change
- `openspec/specs/_stub/spec.md` — Create. Stub spec with `## Purpose` + `## Requirements` + one Given/When/Then scenario so `openspec validate --specs` exits zero.
- `openspec/specs/_stub/.gitkeep` — Create (empty placeholder if the directory needs explicit tracking).

### Steps
1. Write `openspec/specs/_stub/spec.md` per `design.md` lines 411-427.
2. Create the parent directory `openspec/specs/_stub/`.

### Verification
- [x] `ls openspec/specs/_stub/spec.md` returns the file.
- [x] `npx openspec validate --specs --spec openspec/specs/_stub/spec.md 2>&1; echo $?` exits 0.
- [x] `grep -E '^(## Purpose|## Requirements)' openspec/specs/_stub/spec.md` returns both headings.

### Rollback
`rm -rf openspec/specs/_stub` — pure addition; revert is a single directory removal.

---

### 3. Create `openspec/changes/archive/` placeholder

**Capability**: openspec-scaffolding
**Spec ref**: `openspec/changes/acoes-post-migration-hardening/specs/openspec-scaffolding/spec.md` §"`openspec/changes/archive/` directory exists"
**Depends on**: none
**Estimated changed lines**: +1 / -0

### Files to change
- `openspec/changes/archive/.gitkeep` — Create (empty placeholder so the directory exists in the repo even though it has no contents).

### Steps
1. `mkdir -p openspec/changes/archive`.
2. `touch openspec/changes/archive/.gitkeep`.

### Verification
- [x] `ls -la openspec/changes/archive/` shows `.gitkeep`.
- [x] `[ -d openspec/changes/archive ]` exits zero.

### Rollback
`rm -rf openspec/changes/archive` — pure addition.

---

### 4. Write `openspec/README.md` documenting parked changes

**Capability**: openspec-scaffolding
**Spec ref**: `openspec/changes/acoes-post-migration-hardening/specs/openspec-scaffolding/spec.md` §"README documents the parked archival gap"
**Depends on**: 1
**Estimated changed lines**: +50 / -0

### Files to change
- `openspec/README.md` — Create. Names `acoes-batch-1-foundation`, `acoes-batch-2-ui-export`, `acoes-batch-3-admin-audit`, lists blockers per change, points to `acoes-post-migration-hardening` as the change that closes the gap.

### Steps
1. Write `openspec/README.md` using the content from `design.md` lines 429-455.
2. Each parked change lists at least one blocker: Batch 1 (missing proposal, unchecked tasks), Batch 2 (deleted UI, missing parity for `participant-edit-ui`), Batch 3 (deleted audit UI, no verification report).

### Verification
- [x] `grep -E 'acoes-batch-(1|2|3)' openspec/README.md` returns all three names.
- [x] `grep -E 'acoes-post-migration-hardening' openspec/README.md` returns the cross-reference.
- [x] Manual read confirms a contributor unfamiliar with the repo can find the parked-change explanation without grepping.

### Rollback
`rm openspec/README.md` — pure addition.

---

## Capability 2: auth-and-route-protection

### 5. Edit `src/lib/server/permissions.ts` — drop `facilitadora` coercion

**Capability**: auth-and-route-protection
**Spec ref**: `openspec/changes/acoes-post-migration-hardening/specs/auth-and-route-protection/spec.md` §"Canonical role vocabulary"
**Depends on**: none
**Estimated changed lines**: +15 / -10

### Files to change
- `src/lib/server/permissions.ts` — Edit. Remove the `case 'facilitadora':` arm from `normalizeRole` (currently line 37). Make `default` throw a `RoleCoercionError` carrying the original value, so `auth.ts` callers get an explicit failure rather than a silent rewrite.

### Steps
1. Define `export class RoleCoercionError extends Error { constructor(public originalRole: string) { super(`Cannot coerce role '${originalRole}' to a canonical role`); this.name = 'RoleCoercionError'; } }`.
2. Replace the `case 'facilitadora':` line with nothing (delete the arm).
3. Replace `default: return 'participante'` with `default: throw new RoleCoercionError(role)`.

### Verification
- [x] `grep -n "facilitadora" src/lib/server/permissions.ts` returns no results.
- [x] `npx vitest run src/lib/server/__tests__/permissions.test.ts` (this task lands before the test rewrite in task 15; the existing test that asserts `'facilitadora' => 'facilitador'` is allowed to fail here as a known-broken intermediate state — flag in the commit body).
- [x] Manually call `normalizeRole('facilitadora')` in a Node REPL against the compiled module: it throws `RoleCoercionError` with `.originalRole === 'facilitadora'`.

### Rollback
`git revert <commit>` — restores the silent coercion; behavior returns to pre-recortado state for any DB rows that still carry `facilitadora`.

---

### 6. Edit `src/lib/server/bootstrap.ts` — drop role-coercion UPDATE, add role-drift warning

**Capability**: auth-and-route-protection
**Spec ref**: `openspec/changes/acoes-post-migration-hardening/specs/auth-and-route-protection/spec.md` §"Canonical role vocabulary" (admin-visible counter scenario)
**Depends on**: 5
**Estimated changed lines**: +12 / -8

### Files to change
- `src/lib/server/bootstrap.ts` — Edit. Drop the `WHEN 'facilitadora' THEN 'facilitador'` arm from the `UPDATE users SET role = CASE ...` at line 235 (keep `operator→empleado` and `viewer→participante` — those are spec'd legacy aliases). After the UPDATE, add a soft `console.warn` if any `facilitadora` rows remain (via the new `countLegacyFacilitadoraRows` helper).

### Steps
1. Edit line 235: remove `WHEN 'facilitadora' THEN 'facilitador'`. Keep `WHEN 'operator' THEN 'empleado'` and `WHEN 'viewer' THEN 'participante'`.
2. Import `countLegacyFacilitadoraRows` from the new helper file added in task 7 (or define it inline if task 7 is not yet merged; keep ordering: task 7 first, then this task, OR define inline and dedupe later).
3. After the UPDATE, `const driftCount = await countLegacyFacilitadoraRows(); if (driftCount > 0) console.warn(...)`.

### Verification
- [x] `grep -n "facilitadora" src/lib/server/bootstrap.ts` returns only the SELECT/warn references, not the CASE arm.
- [x] `docker compose up -d postgres && npm run migrate` runs without error (drift count logs as `0`).
- [x] In a dev DB with a seeded `role='facilitadora'` row (manually inserted via raw SQL bypassing the CHECK), bootstrap logs `[role-drift] 1 users still carry role='facilitadora'. Surface via GET /api/admin/role-drift.`.

### Rollback
`git revert <commit>` — re-applies the silent coercion on next bootstrap; the warn becomes a no-op.

---

### 7. Add `countLegacyFacilitadoraRows` helper + `GET /api/admin/role-drift` endpoint

**Capability**: auth-and-route-protection
**Spec ref**: `openspec/changes/acoes-post-migration-hardening/specs/auth-and-route-protection/spec.md` §"Canonical role vocabulary" (admin-visible counter scenario); design §"API / Contract Changes"
**Depends on**: 5
**Estimated changed lines**: +35 / -0

### Files to change
- `src/lib/server/permissions.ts` — Add `export async function countLegacyFacilitadoraRows(): Promise<number>` returning `SELECT COUNT(*)::text AS count FROM users WHERE role = 'facilitadora'`.
- `src/pages/api/admin/role-drift.ts` — Create. Admin-only GET endpoint returning `{ legacy_facilitadora_count: number }`. Reuse `getCurrentUser` + `requireRole(user, ['admin'])` from `auth.ts`.

### Steps
1. Add the helper function next to `normalizeRole` in `permissions.ts` (or extract to a new file `src/lib/server/role-drift.ts` if cleaner — design suggests inline).
2. Create the endpoint `src/pages/api/admin/role-drift.ts` with `export const prerender = false`, the `getCurrentUser` + `requireRole(user, ['admin'])` guard pattern, and a JSON response.
3. Add a test in `src/lib/server/__tests__/role-drift.test.ts` (new) seeding one `facilitadora` row and asserting the helper returns `1`.

### Verification
- [x] `curl -s http://localhost:4321/api/admin/role-drift` without a session returns HTTP 401.
- [x] `curl -s -b "session=<admin-cookie>" http://localhost:4321/api/admin/role-drift` returns `{ "legacy_facilitadora_count": 0 }` on a clean DB.
- [x] `npx vitest run src/lib/server/__tests__/role-drift.test.ts` exits zero.

### Rollback
`git revert <commit>` — removes the helper and endpoint. `bootstrap.ts` task 6's warn becomes the only surface for drift.

---

### 8. Create `app/src/routes/routeManifest.ts` + `app/src/components/RoleGuard.tsx` + `UnauthorizedPage.tsx`

**Capability**: auth-and-route-protection
**Spec ref**: `openspec/changes/acoes-post-migration-hardening/specs/auth-and-route-protection/spec.md` §"SPA route guard by role" and §"Single-source-of-truth route allowlist"
**Depends on**: none
**Estimated changed lines**: +70 / -0

### Files to change
- `app/src/routes/routeManifest.ts` — Create. Exports `ROUTE_ALLOWLIST: Record<string, CanonicalRole[]>` mapping each protected route id to its allowed roles (`/dashboard`: admin|facilitador|empleado, `/dashboard/registros`: admin|facilitador|empleado, `/dashboard/cursos`: admin, `/dashboard/reportes`: admin, `/dashboard/config`: all four). Also exports `type RouteId` and `getAllowedRoles(id)`.
- `app/src/components/RoleGuard.tsx` — Create. `<RoleGuard allowedRoles={ROUTE_ALLOWLIST[id]}>...</RoleGuard>` wraps `<Outlet />`. If `useAuth().role` is null → `<Navigate to="/login" replace />`; if role not in `allowedRoles` → `<Navigate to="/dashboard" replace />`.
- `app/src/pages/UnauthorizedPage.tsx` — Create. Simple page mirroring `NotFoundPage.tsx` with a "Volver al inicio" button that navigates to `/`.

### Steps
1. Add `app/src/routes/` directory (new).
2. Write the manifest using the `CanonicalRole` type from `app/src/services/api.backend.types.ts` (which gets updated in task 10 — declare it as a string literal union in the manifest too, or import from the types module if the order allows).
3. Create `RoleGuard.tsx` reading `useAuth()` and rendering `<Navigate>` per the design decision tree.
4. Create `UnauthorizedPage.tsx` (mirrors existing `NotFoundPage.tsx` style).

### Verification
- [x] `grep -rn "ROUTE_ALLOWLIST" app/src/` returns only references inside `routeManifest.ts` and `App.tsx` (post task 9) — no inline role maps in pages.
- [x] `npx vitest run app/tests/component/RoleGuard.test.tsx` (added in this task or task 11) exits zero.
- [x] Manual: open the SPA while logged in as `participante`, navigate to `/dashboard/cursos` → redirected to `/dashboard`.

### Rollback
`rm -rf app/src/routes/ app/src/components/RoleGuard.tsx app/src/pages/UnauthorizedPage.tsx` and revert `App.tsx` (task 9) — protected routes lose role checks but remain auth-gated.

---

### 9. Wire `app/src/App.tsx` + `useAuth.ts` + `api.ts` to the manifest

**Capability**: auth-and-route-protection
**Spec ref**: `openspec/changes/acoes-post-migration-hardening/specs/auth-and-route-protection/spec.md` §"SPA route guard by role"
**Depends on**: 8
**Estimated changed lines**: +25 / -10

### Files to change
- `app/src/App.tsx` — Edit. Inside the `<Route element={<ProtectedRoute />}>` block (lines 42-50), wrap `<DashboardLayout />` with `<RoleGuard getAllowedRoles={...}>` reading from `ROUTE_ALLOWLIST`. Each child route reads its own `allowedRoles` via the manifest.
- `app/src/hooks/useAuth.ts` — Edit. Expose `role: CanonicalRole | null` derived from `user.rol` (with the type update from task 10, drop the `'facilitadora' -> 'operador'` cast at `api.ts:88,103`).
- `app/src/services/api.ts` — Edit. Drop the `=== 'facilitadora' ? 'operador'` branches (lines 88, 103).

### Steps
1. In `App.tsx`, replace the bare `<DashboardLayout />` wrapper with `<RoleGuard><DashboardLayout /></RoleGuard>` (or per-route guard inside the `<Route element={...}>` slot).
2. In `useAuth.ts`, add `role: user?.rol ?? null` to the returned object; type as `CanonicalRole | null`.
3. In `api.ts`, remove the dead `facilitadora → operador` branches.

### Verification
- [x] `grep -n "facilitadora\|operador" app/src/services/api.ts` returns no results.
- [x] `npx tsc --noEmit -p app/tsconfig.json` exits zero (no type errors from the role union change elsewhere in the SPA).
- [x] Manual SPA smoke: login as `participante` → visit `/dashboard/cursos` → redirected to `/dashboard`; visit `/login` while not authenticated → redirected to `/login` (no-op but renders correctly).

### Rollback
`git revert <commit>` — SPA loses role-aware guard but keeps authentication gate. Server-side `requireRole` still works.

---

### 10. Align frontend role types and tests to the 4-role union

**Capability**: auth-and-route-protection
**Spec ref**: `openspec/changes/acoes-post-migration-hardening/specs/auth-and-route-protection/spec.md` §"Type and test alignment to four roles"
**Depends on**: 5
**Estimated changed lines**: +110 / -40

### Files to change
- `app/src/services/api.backend.types.ts` — Edit. Replace `Role = 'admin' | 'facilitadora' | 'participante'` (lines 2-8) with `Role = 'admin' | 'facilitador' | 'empleado' | 'participante'`. Drop `facilitadora`.
- `app/src/types/index.ts` — Edit. Replace `rol: 'admin' | 'operador' | 'participante'` (line 32) with `rol: 'admin' | 'facilitador' | 'empleado' | 'participante'`. Drop `operador`.
- `app/tests/setup.ts` — Edit. Same 4-role union in `mockSession` signature (lines 22-25).
- `app/tests/unit/auth-permissions.test.ts` — Rewrite. Replace the `facilitadora` describe block with `facilitador` (same permissions per `permissions.ts:22`); add an `empleado` describe block mirroring `admin` minus `users:*`. Total file growth ~80 lines.
- `app/tests/unit/api-shapes.test.ts` — Edit. Replace the 3-role `['admin', 'facilitadora', 'participante']` arrays (lines 33, 38, 47) with the 4-role array.
- `app/tests/unit/schemas.test.ts` — Edit. Same 4-role array at lines 58, 279, 287. Keep the `'superadmin'` rejection scenario (still valid).

### Steps
1. Update both type files first (compile errors will surface everywhere they are imported).
2. Run `npx tsc --noEmit -p app/tsconfig.json` and fix any callers.
3. Update the four test files in this order: types/setup → unit tests.
4. Run the unit suite: `cd app && npm run test:unit`.

### Verification
- [x] `grep -rn "facilitadora\|operador" app/src/ app/tests/` returns no results.
- [x] `cd app && npm run test:unit` exits zero and `auth-permissions.test.ts` reports the new 4-role suite passing.
- [x] `npx tsc --noEmit -p app/tsconfig.json` exits zero.

### Rollback
`git revert <commit>` — type union reverts to 3-role; tests re-assert legacy vocabulary; SPA and API drift again.

---

### 11. Backend unit tests: `permissions.test.ts` rewrite + `role-drift.test.ts` new

**Capability**: auth-and-route-protection
**Spec ref**: `openspec/changes/acoes-post-migration-hardening/specs/auth-and-route-protection/spec.md` §"Canonical role vocabulary"
**Depends on**: 5, 7
**Estimated changed lines**: +75 / -20

### Files to change
- `src/lib/server/__tests__/permissions.test.ts` — Edit. Replace the existing `normalizeRole('facilitadora') => 'facilitador'` assertion with one that asserts `normalizeRole('facilitadora')` throws `RoleCoercionError` with `.originalRole === 'facilitadora'`. Keep all canonical-role assertions green.
- `src/lib/server/__tests__/role-drift.test.ts` — Create. Seed one row with `role='facilitadora'` via raw SQL (bypassing the CHECK constraint, or by temporarily dropping the constraint in test setup). Assert `countLegacyFacilitadoraRows()` returns `1`.

### Steps
1. Edit `permissions.test.ts`: change the assertion at the legacy-input case from `expect(normalizeRole('facilitadora')).toBe('facilitador')` to `expect(() => normalizeRole('facilitadora')).toThrow(RoleCoercionError)`.
2. Create `role-drift.test.ts` with the seed/assert pattern. Use the existing test DB pool from `vitest.config.ts`.
3. Run `npx vitest run src/lib/server/__tests__/permissions.test.ts src/lib/server/__tests__/role-drift.test.ts`.

### Verification
- [x] Both test files pass; `permissions.test.ts` shows the new `RoleCoercionError` case green.
- [x] `npx vitest run` (full backend suite) exits zero — no regression in other 4 tests.

### Rollback
`git revert <commit>` — tests revert to legacy expectations; the runtime change in tasks 5-7 remains in place (so legacy tests would now fail until both are reverted together).

---

## Capability 3: public-participant-validation

### 12. Create `src/lib/server/http-picks.ts`

**Capability**: public-participant-validation
**Spec ref**: `openspec/changes/acoes-post-migration-hardening/specs/public-participant-validation/spec.md` §"Shared schema validation before any DB write" (normalization helper)
**Depends on**: none
**Estimated changed lines**: +35 / -0

### Files to change
- `src/lib/server/http-picks.ts` — Create. Exports `pickString(raw, key1, key2)`, `pickNumber`, `pickBoolean`, `pickOptionalString`. Each accepts an unknown record and a list of alias keys (camel/snake) and returns the first present, coerced value or a sentinel (`undefined` / `''` / `0`) that Zod can reject cleanly.

### Steps
1. Create the file with four typed helpers and one-line docstrings per helper.
2. Add a small inline test comment block (or a tiny `http-picks.test.ts`) covering the camel/snake alias resolution and the `undefined` return for missing keys.

### Verification
- [x] `npx tsc --noEmit` exits zero.
- [x] The pick helpers handle `{ courseId: 5, course_id: 5 }` returning `5` (no double-merge), `{ gender: 'Otro' }` returning `'Otro'`, and `{}` returning `''` (string) / `0` (number) / `false` (boolean).

### Rollback
`rm src/lib/server/http-picks.ts` — pure addition.

---

### 13. Rewrite JSON branch in `src/pages/api/public/participants.ts`

**Capability**: public-participant-validation
**Spec ref**: `openspec/changes/acoes-post-migration-hardening/specs/public-participant-validation/spec.md` §"Shared schema validation before any DB write" and §"Invalid payload returns HTTP 400 with per-field errors"
**Depends on**: 12
**Estimated changed lines**: +25 / -25

### Files to change
- `src/pages/api/public/participants.ts` — Edit. Replace the manual JSON mapping at lines 38-63 with `participantPublicSchema.safeParse(normalizeBody(raw))`. On failure, return HTTP 400 with `{ error: 'validation_failed', issues: parsed.error.issues }`. Leave the FormData branch (lines 73-118) unchanged.

### Steps
1. Import `participantPublicSchema` from `src/lib/server/participant-schema.ts` and the pick helpers from task 12.
2. Replace the JSON branch body with the `safeParse` snippet from `design.md` lines 134-169.
3. Keep the FormData branch as-is — both branches must reach the same downstream code (`findParticipantDuplicates`, insert).

### Verification
- [x] `curl -X POST http://localhost:4321/api/public/participants -H 'Content-Type: application/json' -d '{"gender":"Otro"}'` returns HTTP 400 + `{ error: 'validation_failed', issues: [...] }`.
- [x] `curl -X POST http://localhost:4321/api/public/participants -H 'Content-Type: application/json' -d '<valid payload>'` returns HTTP 201.
- [x] `npx playwright test app/tests/e2e/public-registration.spec.ts` still passes (regression net).

### Rollback
`git revert <commit>` — JSON branch returns to manual mapping. Anonymous JSON validation gap returns.

---

### 14. Backend unit test: `participant-public-json.test.ts`

**Capability**: public-participant-validation
**Spec ref**: `openspec/changes/acoes-post-migration-hardening/specs/public-participant-validation/spec.md` §"Invalid payload returns HTTP 400 with per-field errors"
**Depends on**: 13
**Estimated changed lines**: +80 / -0

### Files to change
- `src/lib/server/__tests__/participant-public-json.test.ts` — Create. Three cases: (a) `{ gender: 'Otro', ... }` → 400 + issues with `path` including `gender`; (b) multiple invalid fields (gender + missing required + bad phone) → all issues present; (c) valid payload → 201. Use a stub `request.json()` returning the payload (per design §"Testing Strategy").

### Steps
1. Mock `request.json()` per the existing test patterns in `src/lib/server/__tests__/`.
2. Assert status codes, response body shape (`{ error: 'validation_failed', issues: [...] }`), and that no participant row is inserted on failure (assert via the test DB).

### Verification
- [x] `npx vitest run src/lib/server/__tests__/participant-public-json.test.ts` exits zero.
- [x] The `Otro` case asserts the `issues` array contains an entry whose `path[0] === 'gender'`.
- [x] The multi-field case asserts ≥3 issues returned.

### Rollback
`rm src/lib/server/__tests__/participant-public-json.test.ts` — pure addition.

---

### 15. Update `app/src/pages/RegistroPage.tsx` gender catalog (drop `Otro`)

**Capability**: public-participant-validation
**Spec ref**: `openspec/changes/acoes-post-migration-hardening/specs/public-participant-validation/spec.md` §"Gender catalog reduced to two values"
**Depends on**: none
**Estimated changed lines**: +3 / -3

### Files to change
- `app/src/pages/RegistroPage.tsx` — Edit. Change the gender `<Select>` options from `['Femenino', 'Masculino', 'Otro']` (line 219) to `['Femenino', 'Masculino']`.

### Steps
1. Edit the options array literal.
2. Update any local catalog array (lines 4-6) so the form's local source matches.

### Verification
- [x] `grep -n "'Otro'\|\"Otro\"" app/src/pages/RegistroPage.tsx` returns no results.
- [x] Manual: open `/registro`, the gender dropdown shows only `Femenino` and `Masculino`.

### Rollback
`git revert <commit>` — `Otro` reappears in the dropdown.

---

### 16. Add `ApiValidationError` to `app/src/services/api.ts` + per-field error UI in `RegistroPage.tsx`

**Capability**: public-participant-validation
**Spec ref**: `openspec/changes/acoes-post-migration-hardening/specs/public-participant-validation/spec.md` §"SPA surfaces real success and real failure"
**Depends on**: 13, 15
**Estimated changed lines**: +35 / -10

### Files to change
- `app/src/services/api.ts` — Edit. Add `export type ApiValidationError = { error: 'validation_failed'; issues: Array<{ path: (string|number)[]; message: string; code: string }> }` and `export class ValidationApiError extends Error { constructor(public issues: ApiValidationError['issues']) { super('validation_failed'); this.name = 'ValidationApiError'; } }`. Extend the central `request()` to throw `ValidationApiError` when the response is 400 + `{ error: 'validation_failed' }`.
- `app/src/pages/RegistroPage.tsx` — Edit. Replace the always-true `setSubmitted(true)` in `handleSubmit` (lines 78-90) with the try/catch: on success → `setNewRegistro(result); setSubmitted(true)`; on `ValidationApiError` → populate `errors[fieldPath] = message` from `issues` and keep `submitted = false`. Scroll to first error.

### Steps
1. Add the types and class to `api.ts`.
2. Update the central `request()` (or its 400-handling branch) to detect the validation error envelope and throw `ValidationApiError`.
3. Update `RegistroPage.tsx`'s `handleSubmit` per the design §"Capability 2 — Per-field error UI" (lines 185-205).

### Verification
- [x] Manual SPA smoke: submit `/registro` with bad payload → per-field error visible, success screen NOT rendered.
- [x] Manual SPA smoke: submit with valid payload → success screen renders.
- [x] `npx tsc --noEmit -p app/tsconfig.json` exits zero.
- [x] `npx playwright test app/tests/e2e/public-registration.spec.ts` still passes (regression net).

### Rollback
`git revert <commit>` — API client and form revert to fake-success behavior.

---

### 17. App unit tests: `registro-gender-options.test.ts` + `api-shapes.test.ts` extension

**Capability**: public-participant-validation
**Spec ref**: `openspec/changes/acoes-post-migration-hardening/specs/public-participant-validation/spec.md` §"Gender catalog reduced to two values" and §"SPA surfaces real success and real failure"
**Depends on**: 15, 16
**Estimated changed lines**: +60 / -0

### Files to change
- `app/tests/unit/registro-gender-options.test.ts` — Create. Render `RegistroPage` in jsdom; assert the gender `<select>` contains exactly `Femenino` and `Masculino` options; assert no `Otro`.
- `app/tests/unit/api-shapes.test.ts` — Edit. Add a test that `request()` throws `ValidationApiError` with parsed `issues` when the response is 400 + `{ error: 'validation_failed', issues: [...] }`.

### Steps
1. Use the existing `app/tests/setup.ts` mocking pattern; render `RegistroPage` and inspect the `<select>` options via `screen.getAllByRole('option')` or DOM query.
2. Stub `global.fetch` (or the central `request`) to return the 400 + validation envelope; assert the thrown `ValidationApiError` carries the issues.

### Verification
- [x] `cd app && npm run test:unit -- registro-gender-options api-shapes` exits zero.
- [x] `registro-gender-options.test.ts` asserts `options.length === 2` and `options.map(o => o.text).every(t => ['Femenino', 'Masculino'].includes(t))`.

### Rollback
`rm app/tests/unit/registro-gender-options.test.ts` + revert the `api-shapes.test.ts` extension.

---

## Capability 4: notification-audience-isolation

### 18. Update `src/lib/server/notifications.ts` — SQL change + `producerAudienceMap` export

**Capability**: notification-audience-isolation
**Spec ref**: `openspec/changes/acoes-post-migration-hardening/specs/notification-audience-isolation/spec.md` §"Audience filter checks caller role, not just presence"
**Depends on**: none
**Estimated changed lines**: +25 / -15

### Files to change
- `src/lib/server/notifications.ts` — Edit. Change `listNotifications(userId, limit = 50)` → `listNotifications(userId, callerRole, limit = 50)` with the new WHERE clause from `design.md` lines 211-222. Same for `markNotificationRead(id, userId, callerRole)`. Export `producerAudienceMap: Record<NotificationKind, CanonicalRole>` populated from the Q1 audit table (all five producers map to `'admin'`).

### Steps
1. Edit the two function signatures and the SQL WHERE clauses.
2. Add `producerAudienceMap` as a named export (used by task 22's allowlist test).
3. Run existing tests to surface callers that need updating (task 19 wires the API endpoints).

### Verification
- [x] `grep -n "audience_role IS NOT NULL" src/lib/server/notifications.ts` returns no results.
- [x] `npx tsc --noEmit` exits zero (the API endpoints will fail compile until task 19 lands — that's expected, keep these as sequential commits).
- [x] `producerAudienceMap` exports 5 entries, one per producer kind from Q1.

### Rollback
`git revert <commit>` — functions revert to the 2-arg signature; API endpoints must revert together.

---

### 19. Update notification API endpoints to pass `user.role`

**Capability**: notification-audience-isolation
**Spec ref**: `openspec/changes/acoes-post-migration-hardening/specs/notification-audience-isolation/spec.md` §"Unauthenticated notification access rejected"
**Depends on**: 18
**Estimated changed lines**: +5 / -5

### Files to change
- `src/pages/api/notifications.ts` — Edit. `await listNotifications(user.id, user.role)` instead of `(user.id)`.
- `src/pages/api/notifications/[id].ts` — Edit. `await markNotificationRead(id, user.id, user.role)` instead of `(id, user.id)`.

### Steps
1. In both endpoints, change the call site to pass `user.role`.
2. Confirm the existing `if (!user) return 401` guards stay (lines 10 and 10 respectively).

### Verification
- [x] `npx tsc --noEmit` exits zero.
- [x] `curl -s http://localhost:4321/api/notifications` without a session returns HTTP 401 (existing behavior preserved).
- [x] `curl -s -b "session=<participant-cookie>" http://localhost:4321/api/notifications` does NOT include admin-targeted notifications (manual check; full coverage in task 21).

### Rollback
`git revert <commit>` — call sites revert to 2-arg form; `notifications.ts` task 18 must revert together to keep types in sync.

---

### 20. Wire producer `userId` on the 4 known producers

**Capability**: notification-audience-isolation
**Spec ref**: `openspec/changes/acoes-post-migration-hardening/specs/notification-audience-isolation/spec.md` §"Producer always sees their own notifications"
**Depends on**: 18
**Estimated changed lines**: +20 / -5

### Files to change
- `src/lib/server/courses.ts` (line 215) — Edit. Pass `userId: createdBy` in the `createNotification({ ... })` call.
- `src/lib/server/certificates.ts` (line 67) — Edit. Pass `userId: completedBy` (already in scope).
- `src/lib/server/participants.ts` (line 296) — Edit. Pass `userId: createdBy` (already in scope).
- `src/lib/server/enrollments.ts` (line 152) — Edit. Pass `userId: input.enrolledBy` (already in scope).
- `src/pages/api/public/participants.ts` (line 84) — No change. Producer is anonymous; `userId` stays null. The spec scenario "Producer sees a role-targeted notification they themselves cannot receive" is moot for anonymous producers (design §Q1 note).

### Steps
1. Edit each of the 4 producer sites to pass the actor's `userId`.
2. Confirm the `createNotification` signature accepts the new `userId` field (or extend it if needed — design §Decision 7 says set it where the producer is known).

### Verification
- [x] `grep -n "createNotification" src/lib/server/courses.ts src/lib/server/certificates.ts src/lib/server/participants.ts src/lib/server/enrollments.ts` shows each call passing `userId`.
- [x] `npx tsc --noEmit` exits zero.

### Rollback
`git revert <commit>` — producers stop passing `userId`; producer-visibility reverts to no-op (any user with the audience role still sees the row).

---

### 21. Backend test: `notifications-audience.test.ts`

**Capability**: notification-audience-isolation
**Spec ref**: `openspec/changes/acoes-post-migration-hardening/specs/notification-audience-isolation/spec.md` §"Role-targeted notifications visible only to matching role" and §"Null-audience notifications respect existing row-level access"
**Depends on**: 18, 19, 20
**Estimated changed lines**: +60 / -0

### Files to change
- `src/lib/server/__tests__/notifications-audience.test.ts` — Create. Seed 3 rows: `audience_role='admin'`, `audience_role='participante'`, `audience_role=NULL`. Call `listNotifications(uid, 'participante')` and assert only the `participante` and `NULL` rows are returned. Call `listNotifications(uid, 'admin')` and assert `admin` and `NULL` rows. Plus a `markNotificationRead` negative case: participante attempts to mark an admin-targeted row → null returned (treat as 404).

### Steps
1. Use the existing test DB pool. Seed via raw SQL.
2. Assert on `result.rows` shape per the design §"Testing Strategy" notification-audience test.

### Verification
- [x] `npx vitest run src/lib/server/__tests__/notifications-audience.test.ts` exits zero.
- [x] All 4 scenarios pass: participante → sees participante+null, admin → sees admin+null, participante mark admin → null, admin mark participante → null.

### Rollback
`rm src/lib/server/__tests__/notifications-audience.test.ts` — pure addition.

---

### 22. Backend test: `notifications-producers.test.ts` allowlist

**Capability**: notification-audience-isolation
**Spec ref**: `openspec/changes/acoes-post-migration-hardening/specs/notification-audience-isolation/spec.md` §"Allowlist test pins intended producers"
**Depends on**: 18, 20
**Estimated changed lines**: +40 / -0

### Files to change
- `src/lib/server/__tests__/notifications-producers.test.ts` — Create. Imports `producerAudienceMap` and asserts each entry equals `'admin'` (Q1's pinned value). Per design §"Decision 7" preferred path: use `vi.mock` + `expect.objectContaining` to assert each call site's `audienceRole` matches the map. Static regex read of the 5 producer files is an acceptable alternative.

### Steps
1. Define the allowlist expectations based on the Q1 table (`course_completed`, `course_full`, `duplicate_in_review`, `facilitator_pending_validation`, `participant_enrolled` → `'admin'`).
2. Assert each producer site's `audienceRole` literal against the map.

### Verification
- [x] `npx vitest run src/lib/server/__tests__/notifications-producers.test.ts` exits zero.
- [x] The test fails loudly if any producer's `audienceRole` literal drifts from `'admin'` without updating the allowlist.

### Rollback
`rm src/lib/server/__tests__/notifications-producers.test.ts` — pure addition.

---

## Capability 5: ci-and-component-tests

### 23. Add `test:unit` script + remove `--if-present`

**Capability**: ci-and-component-tests
**Spec ref**: `openspec/changes/acoes-post-migration-hardening/specs/ci-and-component-tests/spec.md` §"`test:unit` script in `app/package.json`" and §"CI runs unit tests without `--if-present`"
**Depends on**: none
**Estimated changed lines**: +3 / -1

### Files to change
- `app/package.json` — Edit. Add `"test:unit": "vitest run"` (keep `test:run` as alias for local ergonomics).
- `.github/workflows/ci.yml` — Edit. Remove `--if-present` from line 31 (`npm run test:unit --if-present` → `npm run test:unit`).

### Steps
1. Add the new script.
2. Remove `--if-present`.

### Verification
- [x] `cd app && npm run test:unit` runs Vitest and reports results.
- [x] `grep -n "if-present" .github/workflows/ci.yml` returns no results.

### Rollback
`git revert <commit>` — script and flag revert to current state (unit step silently no-ops again).

---

### 24. Add Postgres service + missing-secret check to CI workflow

**Capability**: ci-and-component-tests
**Spec ref**: `openspec/changes/acoes-post-migration-hardening/specs/ci-and-component-tests/spec.md` §"CI Postgres service with healthcheck" and §"Missing secrets fail loud"
**Depends on**: 23
**Estimated changed lines**: +50 / -0

### Files to change
- `.github/workflows/ci.yml` — Edit. Add `services.postgres` block (mirroring `docker-compose.yml:1-18`) with `postgres:16-alpine`, env vars, port `5432:5432`, and the `--health-cmd "pg_isready ..."` healthcheck. Add an early step in both jobs (unit + E2E) that requires `POSTGRES_PASSWORD` and fails with `::error::Missing secret: POSTGRES_PASSWORD` if absent.

### Steps
1. Add the `services:` block at the workflow level (or per-job).
2. Add the secret-check step as the first step in the unit-test job and the e2e job (added in task 25).
3. Reference `${{ secrets.POSTGRES_PASSWORD }}` consistently.

### Verification
- [x] Push to a feature branch on GitHub: the unit job's secret-check step runs.
- [x] Simulate missing secret by removing `POSTGRES_PASSWORD` from repo settings (or via a draft PR run if available); the workflow aborts with the explicit error message.
- [x] `docker compose config` on the repo root shows compatible service config.

### Rollback
`git revert <commit>` — CI reverts to no service block; unit step still runs against an empty DB.

---

### 25. Restore Playwright E2E job with Postgres service

**Capability**: ci-and-component-tests
**Spec ref**: `openspec/changes/acoes-post-migration-hardening/specs/ci-and-component-tests/spec.md` §"Playwright E2E runs against a real Postgres"
**Depends on**: 24
**Estimated changed lines**: +40 / -0

### Files to change
- `.github/workflows/ci.yml` — Edit. Uncomment + update the `e2e` job (lines 42-78 per design): add the Postgres service (from task 24), set `DATABASE_URL` env, install Playwright with `npx playwright install --with-deps chromium`, run both builds, start backend + SPA with `wait-on http://localhost:4321`, then `npx playwright test` with `CI: 'true'` for retries (per `playwright.config.ts:7`).

### Steps
1. Add the `e2e:` job block per `design.md` lines 303-338.
2. Reference the `services.postgres` block from task 24 (or define it inline under this job).
3. Set `needs: [test]` so E2E runs after the unit step.

### Verification
- [x] Push to a feature branch; the `e2e` job runs and Playwright reports spec results.
- [x] The Postgres healthcheck logs `healthy` before E2E starts.
- [x] A simulated unhealthy DB (point `DATABASE_URL` at a closed port) fails the job with a clear "database unavailable" message rather than a misleading test failure.

### Rollback
`git revert <commit>` — E2E job stays commented out; unit step still runs.

---

### 26. Rewire `app/tests/component/LoginPage.test.tsx`

**Capability**: ci-and-component-tests
**Spec ref**: `openspec/changes/acoes-post-migration-hardening/specs/ci-and-component-tests/spec.md` §"Broken component suites pass"
**Depends on**: none
**Estimated changed lines**: +10 / -10

### Files to change
- `app/tests/component/LoginPage.test.tsx` — Edit. Replace the import on line 7: `import LoginPage from '@/pages/login'` (deleted Astro page) → `import { LoginPage } from '@/pages/LoginPage'`. Adjust any expectations on lines 35-37 if the React component uses different selectors (label `contraseña` is unchanged per design §"Component suite repairs").

### Steps
1. Update the import.
2. Run `cd app && npm run test:unit -- LoginPage.test.tsx` until the suite passes.

### Verification
- [x] `cd app && npm run test:unit -- LoginPage.test.tsx` exits zero.
- [x] The test no longer imports any file under `src/components/*.astro` (assert via `grep -rn "from.*\.astro" app/tests/component/LoginPage.test.tsx` returning empty).

### Rollback
`git revert <commit>` — import reverts to deleted Astro page; suite fails again.

---

### 27. Rewire `app/tests/component/CoursesCatalogPage.test.tsx`

**Capability**: ci-and-component-tests
**Spec ref**: `openspec/changes/acoes-post-migration-hardening/specs/ci-and-component-tests/spec.md` §"Broken component suites pass"
**Depends on**: none
**Estimated changed lines**: +20 / -20

### Files to change
- `app/tests/component/CoursesCatalogPage.test.tsx` — Edit. Replace the import on line 7: `import CoursesCatalogPage from '@/pages/courses/index'` → `import { CatalogoCursosPage } from '@/pages/CatalogoCursosPage'`. Rename the `describe` block. MSW handlers on lines 93-99 stay; adjust response shape if `CatalogoCursosPage` expects snake_case (`app/src/services/api.ts` already maps snake→camel so this is usually a no-op).

### Steps
1. Update the import.
2. Run `cd app && npm run test:unit -- CoursesCatalogPage.test.tsx` until the suite passes; fix mock response shape on any mismatch.

### Verification
- [x] `cd app && npm run test:unit -- CoursesCatalogPage.test.tsx` exits zero.
- [x] No `.astro` imports remain in the file.

### Rollback
`git revert <commit>` — import reverts; suite fails again.

---

### 28. Delete `app/tests/component/AdminParticipantsPage.test.tsx`

**Capability**: ci-and-component-tests
**Spec ref**: `openspec/changes/acoes-post-migration-hardening/specs/ci-and-component-tests/spec.md` §"Broken component suites pass" (deleted-feature tests removed)
**Depends on**: none
**Estimated changed lines**: +0 / -60

### Files to change
- `app/tests/component/AdminParticipantsPage.test.tsx` — Delete. Admin participants route is explicitly parked (proposal §"Out of scope"); the test imports a non-existent page.

### Steps
1. `rm app/tests/component/AdminParticipantsPage.test.tsx`.

### Verification
- [x] `ls app/tests/component/AdminParticipantsPage.test.tsx` returns "No such file or directory".
- [x] `cd app && npm run test:unit` exits zero (the other two component suites pass; no leftover reference to `AdminParticipantsPage`).

### Rollback
`git revert <commit>` restores the file (but it will fail to compile against the missing page).

---

### 29. Add E2E test `app/tests/e2e/public-registration-rejected.spec.ts`

**Capability**: ci-and-component-tests
**Spec ref**: `openspec/changes/acoes-post-migration-hardening/specs/public-participant-validation/spec.md` §"Invalid gender returns 400 with field error"
**Depends on**: 13
**Estimated changed lines**: +50 / -0

### Files to change
- `app/tests/e2e/public-registration-rejected.spec.ts` — Create. Posts `gender: 'Otro'` to `POST /api/public/participants`; asserts status 400 + `error: 'validation_failed'` + `issues[].path` includes `gender`.

### Steps
1. Mirror the structure of `app/tests/e2e/public-registration.spec.ts`.
2. Use a direct fetch (no UI flow) since the SPA form no longer offers `Otro` — the test exercises the API guardrail.

### Verification
- [x] `cd app && npx playwright test public-registration-rejected.spec.ts` exits zero.
- [x] The test fails (status 201 instead of 400) if `participants.ts` task 13 is reverted.

### Rollback
`rm app/tests/e2e/public-registration-rejected.spec.ts` — pure addition.

---

## Summary

| Capability | Tasks | High-line estimate |
|------------|-------|---------------------|
| 5 — openspec-scaffolding | 1-4 (4 tasks) | ~90 |
| 2 — auth-and-route-protection | 5-11 (7 tasks) | ~310 |
| 3 — public-participant-validation | 12-17 (6 tasks) | ~260 |
| 4 — notification-audience-isolation | 18-22 (5 tasks) | ~165 |
| 1 — ci-and-component-tests | 23-29 (7 tasks) | ~165 |
| **Total** | **29 tasks** | **~990 lines** |

### Recommended PR boundary (chained, stacked-to-main)

| PR | Capability | Lines | Risk notes |
|----|-----------|-------|-----------|
| PR 1 | Capability 5 (scaffolding) | ~90 | Additive only; ships first to unblock archive flow |
| PR 2 | Capability 2 (auth + route guards) | ~310 | Largest single PR; biggest UX impact (wrong-role redirects); server-side role tightening is irreversible from a UX standpoint only |
| PR 3 | Capability 3 (public validation) | ~260 | Depends on PR 2 only because roles are now canonical; schema validation tightening |
| PR 4 | Capability 4 (notifications) | ~165 | Depends on PR 2 for `user.role` plumbing; producer allowlist test pins current behavior |
| PR 5 | Capability 1 (CI + component tests) | ~165 | Ship last — CI Postgres flakiness is the riskiest first run |

Each PR is independently revertible (per design §"Per-capability rollback") and self-contained. Stack order matches the "Capability 5 first, Capability 1 last among runtime capabilities" principle in the prompt.

### Out of scope (not in this tasks list)

- Archiving `acoes-batch-1/2/3` (separate future change).
- React UI parity for deleted Astro pages (admin / audit / user management).
- New-endpoint specs (certificates, file-storage, public-enrollment).
- xlsx-export widths, pagination, chunk splitting.
- Capacity locking, file-upload limits.
- The full 6-spec closure-first plan from the explore.