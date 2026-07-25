# OpenSpec — Evolution Beauty Academy

This repository tracks specs and proposed changes under `openspec/`.

## Active change

- `acoes-post-migration-hardening/` — recortado change fixing five defects left by the React SPA migration: canonical role enforcement, public participant validation, notification audience isolation, broken CI, and missing OpenSpec scaffolding. Closes the security/verification gap; does NOT close the full audit.

## Parked changes (unarchived — intentionally)

These three changes predate the recortado. They are NOT archive-ready and remain in `openspec/changes/` until the items below are resolved:

- `acoes-batch-1-foundation/` — missing proposal; unchecked implementation/verification tasks; role and lifecycle drift. Blocker: proposal must be written from current code; tasks need re-walk.
- `acoes-batch-2-ui-export/` — missing proposal; UI deleted by the WIP migration (`src/components/AuditTrail.astro` and friends); claimed smoke-test files no longer present. Blocker: rebuild `dashboard-indicators` and `participant-edit-ui` for React; re-verify XLSX parity.
- `acoes-batch-3-admin-audit/` — missing proposal; UI deleted; no verification report. Blocker: React parity for audit viewer and user management; fresh verification report.

The recortado change `acoes-post-migration-hardening/` removes the immediate blockers (auth drift, public validation, notification leak, CI rotura, missing scaffolding) so that future archive work has a valid config to sync into. Archival itself remains a separate change once each parked change's proposal and verification are in place.

## Layout

- `config.yaml` — OpenSpec project config (schema + context).
- `specs/` — source of truth. Currently contains only `_stub/` for `openspec validate` smoke-testing.
- `changes/` — proposed changes. Archive-ready changes are moved to `changes/archive/`.
