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

