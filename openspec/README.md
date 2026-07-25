# OpenSpec — Evolution Beauty Academy

This repository tracks specs and proposed changes under `openspec/`.

## Archived changes

- `acoes-post-migration-hardening/` (archived 2026-07-25) — recortado that fixed five critical defects left by the React SPA migration: canonical role enforcement, public participant validation, notification audience isolation, broken CI, and missing OpenSpec scaffolding. Synced to `openspec/specs/{auth-and-route-protection,public-participant-validation,notification-audience-isolation,ci-and-component-tests,openspec-scaffolding}/spec.md`. Verdict: APPROVED_WITH_WARNINGS. Full audit trail in `openspec/changes/archive/2026-07-25-acoes-post-migration-hardening/`.

## Active changes

None. The recortado is the most recent change; the three changes below remain parked.

## Parked changes (unarchived — intentionally)

These three changes predate the recortado. They are NOT archive-ready and remain in `openspec/changes/` until the items below are resolved:

- `acoes-batch-1-foundation/` — missing proposal; unchecked implementation/verification tasks; role and lifecycle drift. Blocker: proposal must be written from current code; tasks need re-walk.
- `acoes-batch-2-ui-export/` — missing proposal; UI deleted by the WIP migration (`src/components/AuditTrail.astro` and friends); claimed smoke-test files no longer present. Blocker: rebuild `dashboard-indicators` and `participant-edit-ui` for React; re-verify XLSX parity.
- `acoes-batch-3-admin-audit/` — missing proposal; UI deleted; no verification report. Blocker: React parity for audit viewer and user management; fresh verification report.

The archived recortado change `acoes-post-migration-hardening/` removed the immediate blockers (auth drift, public validation, notification leak, CI rotura, missing scaffolding) so that future archive work has a valid config and main spec set to sync into. Archival of each parked change remains a separate change once that change's proposal and verification are in place.

## Layout

- `config.yaml` — OpenSpec project config (schema + context).
- `specs/` — source of truth. Contains `_stub/` plus the five new capabilities from the archived recortado: `auth-and-route-protection`, `public-participant-validation`, `notification-audience-isolation`, `ci-and-component-tests`, `openspec-scaffolding`.
- `changes/` — proposed changes. Archive-ready changes are moved to `changes/archive/YYYY-MM-DD-<change-name>/`. The archived `acoes-post-migration-hardening` recortado lives there.
