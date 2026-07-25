# Proposal: acoes-post-migration-hardening (recortado)

## Intent

Repair the five critical defects left behind by the React SPA migration (`5f3fc1a`): canonical role enforcement, public participant validation, notification audience isolation, broken CI, and missing OpenSpec scaffolding. Defer everything else.

## Motivation

The full audit (`openspec/changes/acoes-post-migration-hardening/explore.md`) flagged auth/validation leaks and CI rotura as the highest-risk drift. The React migration removed role-aware route protection (`app/src/App.tsx:17-49`), bypassed the shared Zod schema in the public JSON endpoint (`src/pages/api/public/participants.ts:38-63, 73-118`), exposed role-targeted notifications to any authenticated user (`src/lib/server/notifications.ts:45-67`), broke three React component suites by importing deleted pages, and disabled E2E while the app unit step silently no-ops (`--if-present` with no `test:unit` script). The OpenSpec scaffolding needed to archive old changes is also missing. Each item is small, isolated, and reviewable on its own; doing them as one recortado change keeps the security boundary intact.

## Scope

### In scope (5 items)

1. **Auth drift** — Adopt the 4-role runtime model (`admin`, `facilitador`, `empleado`, `participante`). Stop normalizing `facilitadora → facilitador` silently. Add `allowedRoles` to SPA route guards. Reconcile `app/src/services/api.backend.types.ts:2-8` and `app/tests/unit/auth-permissions.test.ts:16-33`.
2. **Public participant validation + gender catalog parity** — Route `POST /api/public/participants` through the shared schema. Remove the `Otro` option from `RegistroPage.tsx:219-220`. Surface per-field errors instead of fake-success.
3. **Notification audience isolation** — Filter by caller role when `audience_role` is set; keep row-level access otherwise.
4. **CI rotura** — Add `test:unit` to `app/package.json` (or drop `--if-present`); re-enable Playwright with a Postgres service in `.github/workflows/ci.yml`; fix the 3 React component suites that import deleted Astro pages.
5. **OpenSpec scaffolding** — Restore `openspec/config.yaml`, `openspec/specs/`, and `openspec/changes/archive/` so future archive synchronization can run.

### Out of scope (parked work, NOT solved here)

- React UI parity for old admin / audit / user-management UIs
- New-endpoint specs (certificates, file-storage, public-enrollment) — currently working but undocumented
- Pagination / offset fixes in export and dashboard
- xlsx-export widths and CSV/XLSX parity
- React 916 KB chunk splitting
- Course completion / enrollment capacity locking / file-upload limits
- Archiving `acoes-batch-1/2/3` (no proposal archive sync this change)
- The full 6-spec closure-first plan from the explore

## Approach

| # | Spec capability | Spec/desired behavior shape (no scenarios yet) |
|---|---|---|
| 1 | `auth-and-route-protection` | One canonical role vocabulary; route-level guard API in SPA; type/test alignment |
| 2 | `public-participant-validation` | Shared Zod schema for JSON path; gender catalog reduced to `Femenino\|Masculino`; per-field errors |
| 3 | `notification-audience-isolation` | Caller-role filter when `audience_role` set; allowlist test |
| 4 | `ci-and-component-tests` | Real unit/E2E gates with Postgres service; repaired component suites |
| 5 | `openspec-scaffolding` | `config.yaml`, `specs/` skeleton, empty `archive/` dir |

Each capability becomes a new spec under `openspec/specs/<capability>/spec.md` since `openspec/specs/` is currently absent. Tasks/design phases will decide delivery shape; no chained-PR proposal yet.

## Capabilities

### New Capabilities
- `auth-and-route-protection`
- `public-participant-validation`
- `notification-audience-isolation`
- `ci-and-component-tests`
- `openspec-scaffolding`

### Modified Capabilities
- None. No existing spec bodies to delta against (scaffolding is absent).

## Affected artifacts

| Path | Change |
|---|---|
| `src/lib/server/permissions.ts`, `src/lib/server/bootstrap.ts` | Role canonicalization, schema comment |
| `app/src/App.tsx`, `app/src/layouts/DashboardLayout.tsx` | Role-aware guards |
| `app/src/services/api.backend.types.ts` | Role union update |
| `app/tests/unit/auth-permissions.test.ts` | Tests align to 4 roles |
| `src/pages/api/public/participants.ts` | Shared Zod schema |
| `app/src/pages/RegistroPage.tsx` | Gender catalog; per-field error UI |
| `src/lib/server/notifications.ts` | Audience filter |
| `app/package.json`, `.github/workflows/ci.yml` | `test:unit`, Postgres service, E2E on |
| `app/tests/component/*.test.tsx` (3 suites) | Drop deleted-page imports |
| `openspec/config.yaml`, `openspec/specs/`, `openspec/changes/archive/` | Restore |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Role-vocabulary change breaks live sessions / DB rows | Med | Backfill on read; log count; gate migration behind feature flag |
| Postgres service in CI adds run-time + flakiness | Med | Use `services:` with healthcheck; cache `node_modules`; retry-on-flake |
| More deleted-page imports surface while repairing the 3 known suites | Low-Med | Limit scope to the 3 known; defer the rest |
| OpenSpec scaffolding restored but archive sync still blocks on missing proposals for batch 1/2/3 | Low | Document gap in `openspec/README.md`; archive remains a separate future change |
| Notification tightening breaks a feature that intentionally targeted a broader audience | Low | Allowlist test + read of current producers before flipping |

## Rollback Plan

Each capability is independently revertible: revert the commit for that scope. No DB migrations in this change beyond the read-side role backfill (reversible by code revert). CI changes revert by re-disabling E2E and removing the `test:unit` script. OpenSpec scaffolding is additive — `rm -rf` reverts.

## Success Criteria

- [ ] SPA redirects unauthenticated AND wrong-role users away from protected routes
- [ ] `POST /api/public/participants` rejects invalid payloads with per-field Zod errors and never inserts bad rows
- [ ] `RegistroPage` submits only `Femenino|Masculino` and surfaces field-level errors
- [ ] Role-targeted notifications are only visible/markable to the targeted role
- [ ] `npm run test:unit` exists and runs in CI; Playwright E2E runs against a real Postgres
- [ ] The 3 broken React component suites pass
- [ ] `openspec/config.yaml`, `openspec/specs/`, `openspec/changes/archive/` exist and `openspec validate` is green on a stub spec

## Known limitations

This recortado does NOT close the full audit. It fixes the 5 highest-risk items only. The full 6-spec closure-first plan (auth+contracts, participant-integrity, reporting/export, public-enrollment, files/certificates/notifications, verification) remains available as a follow-on change once this lands.

## References

- `openspec/changes/acoes-post-migration-hardening/explore.md` — full audit and drift evidence
- `openspec/changes/acoes-batch-1-foundation/` — drifted auth, catalogs-validation, participant-lifecycle
- `openspec/changes/acoes-batch-2-ui-export/` — partial dashboard, participant-edit-ui, xlsx-export
- `openspec/changes/acoes-batch-3-admin-audit/` — partial audit-trail-ui, user-management
- Engram topic: `sdd/acoes-post-migration-hardening/explore` (#150)
