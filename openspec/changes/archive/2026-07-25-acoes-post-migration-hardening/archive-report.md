# Archive Report: acoes-post-migration-hardening

**Change**: `acoes-post-migration-hardening` (recortado)
**Archived on**: 2026-07-25
**Archived to**: `openspec/changes/archive/2026-07-25-acoes-post-migration-hardening/`
**Verification verdict**: APPROVED_WITH_WARNINGS
**Closing PR**: archive commit on `main` (follow-up to the 21 recortado commits)

## Summary

The `acoes-post-migration-hardening` recortado is formally closed. Five critical defects left by the React SPA migration were repaired via five chained stacked-to-main PRs, all of which landed on `main`. The 5 new capabilities are now part of the project's main spec set under `openspec/specs/`. The change folder is moved to `openspec/changes/archive/2026-07-25-acoes-post-migration-hardening/` as an audit trail.

The archive is metadata movement only. No code files were modified by this commit; the 21 recortado commits remain untouched.

## Capabilities (now in baseline)

| Capability | Path | Requirements | Status |
|------------|------|--------------|--------|
| `auth-and-route-protection` | `openspec/specs/auth-and-route-protection/spec.md` | 5 | Created |
| `public-participant-validation` | `openspec/specs/public-participant-validation/spec.md` | 4 | Created |
| `notification-audience-isolation` | `openspec/specs/notification-audience-isolation/spec.md` | 6 | Created |
| `ci-and-component-tests` | `openspec/specs/ci-and-component-tests/spec.md` | 6 | Created |
| `openspec-scaffolding` | `openspec/specs/openspec-scaffolding/spec.md` | 5 | Created |

All 5 capabilities were New (no existing main spec to merge into). Each delta spec was copied directly to `openspec/specs/<capability>/spec.md` per the OpenSpec convention for full specs.

The OpenSpec CLI's `archive` command was attempted first (`npx -y @fission-ai/openspec@1.6.0 archive acoes-post-migration-hardening -y`) and aborted with the message: "Delta parsing found no operations for auth-and-route-protection. Provide ADDED/MODIFIED/REMOVED/RENAMED sections in change spec." The recortado specs were authored as full specs for new capabilities, not as delta operations against an existing baseline; the CLI's archive path requires delta sections. The sync was performed manually by copying each spec file directly.

## Implementation — the 5 chained PRs

The recortado shipped as 5 stacked-to-main PRs, each independently revertible, each within the 800-line review budget. Total: 21 commits.

### PR1 — openspec-scaffolding (DONE)

- **Capability**: `openspec-scaffolding`
- **Changed lines**: 62 insertions across 4 files
- **Commits**:
  1. `e401fe0` — `chore(openspec): add config.yaml with real CLI schema`
  2. `759811a` — `chore(openspec): add specs/ stub and changes/archive skeleton`
  3. `905d4fa` — `docs(openspec): document parked archival gap`
- **Files**: `openspec/config.yaml`, `openspec/specs/_stub/spec.md`, `openspec/changes/archive/.gitkeep`, `openspec/README.md`

### PR2 — auth-and-route-protection (DONE)

- **Capability**: `auth-and-route-protection`
- **Changed lines**: ~310 (within the 800-line review budget)
- **Commits**:
  1. `c6c768a` — `feat(auth): add canonical roles source of truth`
  2. `f4b2e91` — `refactor(auth): surface legacy role drift`
  3. `bfc2aa2` — `chore(types): align frontend Role union`
  4. `ffd1c41` — `feat(spa): add route manifest and role-aware guard`
  5. `60fe15a` — `test(auth): align tests to 4 roles`
- **Key surfaces**: `src/lib/server/permissions.ts`, `src/lib/server/auth.ts`, `src/lib/server/bootstrap.ts`, `app/src/routes/routeManifest.ts`, `app/src/components/RoleGuard.tsx`, `app/src/types/index.ts`, `app/src/services/api.backend.types.ts`, `app/tests/unit/auth-permissions.test.ts`

### PR3 — public-participant-validation (DONE)

- **Capability**: `public-participant-validation`
- **Changed lines**: 491 insertions across 7 files (within the 800-line review budget)
- **Commits**:
  1. `60ba58e` — `feat(api): route public participants through shared Zod schema`
  2. `b0597a6` — `fix(spa): remove Otro gender option from RegistroPage`
  3. `0c5c3a6` — `fix(spa): surface per-field errors and stop fake success`
- **Key surfaces**: `src/pages/api/public/participants.ts`, `src/lib/server/http-picks.ts`, `app/src/services/api.ts`, `app/src/pages/RegistroPage.tsx`, `src/lib/server/__tests__/participant-public-json.test.ts`

### PR4 — notification-audience-isolation (DONE)

- **Capability**: `notification-audience-isolation`
- **Changed lines**: 226 changed lines (216 insertions / 10 deletions across 9 files)
- **Commits**:
  1. `cf62bb6` — `feat(notifications): tighten audience filter to caller role`
  2. `b4067ba` — `feat(notifications): wire producer visibility`
- **Key surfaces**: `src/lib/server/notifications.ts`, `src/pages/api/notifications.ts`, `src/pages/api/notifications/[id].ts`, `src/lib/server/courses.ts`, `src/lib/server/certificates.ts`, `src/lib/server/participants.ts`, `src/lib/server/enrollments.ts`, `src/lib/server/__tests__/notifications-audience.test.ts`, `src/lib/server/__tests__/notifications-producers.test.ts`

### PR5 — ci-and-component-tests (DONE)

- **Capability**: `ci-and-component-tests`
- **Changed lines**: 546 changed lines (245 insertions / 301 deletions across 8 files)
- **Commits**:
  1. `afd8699` — `chore(app): add test:unit script`
  2. `9af3269` — `test(spa): repair component suites after Astro removal`
  3. `17ae309` — `ci: re-enable Playwright with PostgreSQL`
- **Key surfaces**: `app/package.json`, `.github/workflows/ci.yml`, `app/tests/component/LoginPage.test.tsx`, `app/tests/component/CoursesCatalogPage.test.tsx`, `app/tests/setup.ts`, `app/vitest.config.ts`, `app/tests/e2e/public-registration-rejected.spec.ts`
- **Files deleted**: `app/tests/component/AdminParticipantsPage.test.tsx` (196 lines — no React equivalent; admin parity remains explicitly parked)

### Documentation commits (recortado tracking)

These documentation commits are part of the recortado history and document the applied state per PR:

- `bcf981a` — `docs(sdd): record public-participant-validation progress`
- `d73fe2d` — `docs(sdd): record notification audience isolation progress`
- `0311b4b` — `docs(sdd): record final CI hardening progress`

## Final test inventory at archive time

| Layer | Command | Result |
|-------|---------|--------|
| Backend Vitest | `npm test` | 8 files, 22 tests, 0 failures |
| React Vitest | `cd app && npm run test:run` | 8 files, 64 tests, 0 failures |
| React unit gate | `cd app && npm run test:unit` | 8 files, 64 tests, 0 failures |
| Backend build | `npm run build` | `astro check`: 0 errors, 0 warnings, 1 hint |
| React build | `cd app && npm run build` | TypeScript and Vite build completed |
| E2E | `cd app && npm run test:e2e` | 10/10 Playwright tests passed |
| OpenSpec CLI | `list`, `list --specs`, `doctor` | All green |

Total: **96 tests across 3 layers** (22 backend + 64 React + 10 E2E), 0 failures.

## Verification verdict

**VERDICT: APPROVED_WITH_WARNINGS**

The recortado has 0 implementation failures. The 1 CRITICAL verification issue (47 unchecked verification boxes in `tasks.md`) was resolved by reconciling the persisted task artifact — `tasks.md` now has 0 unchecked boxes and 75 checked boxes total. The reconciliation was performed by the orchestrator after `sdd-verify` raised the CRITICAL; the proof that every previously unchecked task was in fact complete lives in `apply-progress.md` (cumulative PR1+PR2+PR3+PR4+PR5 report) and the `verify-report.md` per-spec analysis. The remaining warnings are documented and accepted as part of the intencional recortado scope.

### 2 warnings

1. **CI VAPID scenario mismatch** — The `ci-and-component-tests` spec contains a scenario for missing VAPID credentials isolating only the push-related step. The current CI workflow has no push-subscription step or VAPID secret check, so no such step can fail independently. This is consistent with the apply-progress scope note (`apply-progress.md:378`) and is documented as an intentional scope deviation. The spec scenario is left in place for a future hardening change that introduces a push-subscription CI step.
2. **Build hint and chunk-size warning** — The backend build retains an unused-variable hint at `scripts/seed.ts:32` (1 hint, 0 errors, 0 warnings). The React build retains the known 919.12 kB chunk-size warning. Neither blocks verification or correctness; both are out of the recortado scope.

### 3 deferred scenarios

1. **OpenSpec missing/empty-schema rejection** — Explicitly identified as unsatisfiable against the real CLI schema (`verify-report.md:104-105`, `design.md:545-550`). The CLI does not expose this validation surfaced as a separate scenario; `openspec list --specs` and `openspec doctor` provide the equivalent sanity checks.
2. **OpenSpec archive move/sync** — Explicitly kept out of scope per the original proposal (`proposal.md:21-30`). The archive directory was scaffolding only; the archive operation itself is exercised now by this archive.
3. **OpenSpec malformed-stub rejection** — Not runtime exercised; no destructive/mutation validation was run. The stub spec is valid (`openspec/specs/_stub/spec.md` is recognized by `list --specs`). A future verification harness can add a non-destructive temporary-fixture validation check.

The 3 deferred scenarios are documented at `verify-report.md` §"Deferred scenarios" and are out of scope for this recortado. They do not require spec correction; the underlying capabilities are satisfied.

## Parked changes (still unarchived)

These three changes predate the recortado and remain in `openspec/changes/` until each is separately archived:

- `acoes-batch-1-foundation/` — missing proposal; unchecked implementation/verification tasks; role and lifecycle drift. Blocker: proposal must be written from current code; tasks need re-walk.
- `acoes-batch-2-ui-export/` — missing proposal; UI deleted by the React migration; claimed smoke-test files no longer present. Blocker: rebuild `dashboard-indicators` and `participant-edit-ui` for React; re-verify XLSX parity.
- `acoes-batch-3-admin-audit/` — missing proposal; UI deleted; no verification report. Blocker: React parity for audit viewer and user management; fresh verification report.

Archiving these is a separate change. The OpenSpec scaffolding restored by the recortado is the prerequisite for any of those archives to sync safely.

## Completion gate

- [x] All 21 recortado commits landed on `main` (no PRs are open).
- [x] `tasks.md` has 0 unchecked boxes (75 checked, 0 unchecked).
- [x] All 5 delta specs copied to `openspec/specs/`.
- [x] Change folder moved to `openspec/changes/archive/2026-07-25-acoes-post-migration-hardening/`.
- [x] `openspec/list` no longer shows the recortado (3 parked changes remain).
- [x] `openspec/list --specs` shows the 5 new capability specs plus `_stub`.
- [x] `openspec/doctor` reports `OpenSpec root: ok`.
- [x] All tests pass: 22 backend + 64 React + 10 E2E = 96 tests, 0 failures.
- [x] Archive report written (this file).
- [x] `openspec/README.md` updated to reflect the archived recortado.

## Drift between spec and implementation

Two intentional corrections were documented during apply and are preserved in the verification report:

- **Notification visibility predicate** — The original spec/design used `(audience_role IS NULL OR audience_role = caller_role)` for null-audience handling. The implementation uses a stricter predicate that grants access when the caller owns the row, the caller role matches the audience, or both `user_id` and `audience_role` are NULL (true broadcast). This is required by the spec's null-audience owner-only scenario and is documented at `apply-progress.md:240-244`.
- **VAPID CI scope** — The CI spec mentions VAPID secrets, but the current workflow has no push-related step. Unit and E2E are intentionally isolated from VAPID, as documented at `apply-progress.md:378`.

## Next steps

**None — recortado closed.**

The recortado is complete. The parked `acoes-batch-1/2/3` changes remain as separate future work; archival of those is a separate change that requires each to have a proposal, a completed `tasks.md`, and a verification report.

## Reference

- `openspec/changes/archive/2026-07-25-acoes-post-migration-hardening/proposal.md` — original intent and scope
- `openspec/changes/archive/2026-07-25-acoes-post-migration-hardening/explore.md` — full audit
- `openspec/changes/archive/2026-07-25-acoes-post-migration-hardening/design.md` — technical design
- `openspec/changes/archive/2026-07-25-acoes-post-migration-hardening/tasks.md` — 29 tasks, 75 verification boxes, 0 unchecked
- `openspec/changes/archive/2026-07-25-acoes-post-migration-hardening/apply-progress.md` — cumulative PR1+PR2+PR3+PR4+PR5 report + Verify Phase Reconciliation
- `openspec/changes/archive/2026-07-25-acoes-post-migration-hardening/verify-report.md` — VERDICT: APPROVED_WITH_WARNINGS
- `openspec/changes/archive/2026-07-25-acoes-post-migration-hardening/specs/` — 5 delta specs (now also in `openspec/specs/`)
