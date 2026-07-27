# Proposal: acoes-dui-enrollment-flow

## Intent

Replace the participant-only, five-field enrollment flow with a role-aware public registration and a DUI-lookup public enrollment backed by a real participant FK. The new flow restricts public `funcion` to `Participante` / `Facilitador`, removes `observaciones` from the public form, normalizes DUI to `00000000-0`, and links enrollments to participants so the same identity never gets retyped at enrollment time.

## Motivation

The current public flow has two related defects. First, `RegistroPage.tsx` is hardcoded to `Participante`, shows `curso`, `capacitacion`, and `observaciones` unconditionally, and ignores the redirect context that should resume a course enrollment (`app/src/pages/RegistroPage.tsx:8-14, 51-57, 80-101, 285-365`). Second, the enrollment modal collects `fullName`, `email`, `phone`, optional DUI, and notes in a single payload (`app/src/pages/CursoDetallePage.tsx:21-24, 59-85, 310-350`); the backend creates the row without `participant_id`, so duplicate identity, capacity race, and audit trail all operate on denormalized fields (`src/pages/api/public/enrollments.ts:21-38, 47-56`; `src/lib/server/enrollments.ts:81-159`).

The user explicitly asked for:
- Public registration restricted to `Participante` / `Facilitador`; `Empleado` / `Otro` only via admin.
- `curso` only when `funcion` is `Facilitador`; participant goes straight to the course.
- Enrollment asks for DUI only; if not found, send to `/registro?redirect=/cursos/{id}?token={token}`.
- Remove `observaciones` from the public form.

The full audit is in `openspec/changes/acoes-dui-enrollment-flow/explore.md` (Engram `sdd/acoes-dui-enrollment-flow/explore`).

## Scope

### In scope (5 items)

1. **Public registration restricted to `Participante` / `Facilitador` with conditional fields**
   - Dedicated public Zod schema (`publicParticipantSchema`) restricts `funcion` to `['Participante', 'Facilitador']`.
   - `RegistroPage.tsx` step 1 includes a role select with those two values; `funcion` drives whether `curso` and `capacitacion` render and validate.
   - `observaciones` removed from the public form and from the public schema.
   - Form supports `?redirect=` for post-registration continuation.
   - `participants.role_function` keeps the four-value DB CHECK so admin can still persist `Empleado` / `Otro`.

2. **Public enrollment by DUI lookup with FK to participant**
   - `enrollments.participant_id` migrated to `NOT NULL REFERENCES participants(id) ON DELETE CASCADE`.
   - Modal asks DUI only; backend resolves the participant with an exact-match `getParticipantByDocumentNumber` helper.
   - When found: create enrollment with `participant_id` FK; legacy `full_name`, `email`, `phone`, `dui` derived server-side from the participant in the same transaction.
   - When not found: respond with `{ redirect: '/registro?redirect=...' }`; the SPA navigates there.
   - Admin endpoints that create enrollments with the legacy columns remain unchanged.

3. **DUI format validation and normalization**
   - Canonical format `00000000-0` (8 digits + dash + 1 digit).
   - Normalizer strips whitespace/case; rejects anything that does not match.
   - Schema validates the canonical form; lookup uses the normalized value.
   - Existing minimal-length validator (`src/lib/server/participant-schema.ts:27`) tightened.

4. **Redirect query param hardening**
   - `?redirect=` must be a relative SPA path starting with `/` and not starting with `//`.
   - Reject schemes (`http:`, `javascript:`, `data:`), control characters, and registration self-loops.
   - HashRouter path: `/registro?redirect=${encodeURIComponent(`/cursos/${id}?token=${token}`)}`.

5. **Bootstrap table-ordering fix**
   - Side fix in `src/lib/server/bootstrap.ts` so a fresh DB does not fail the `participants` / `courses` ordering when the new FK lands.
   - Explicit `DROP CONSTRAINT` / `ADD CONSTRAINT` block for the new `enrollments.participant_id` FK.

### Out of scope (parked)

- Admin enrollment flows that use legacy columns (admin keeps using the legacy fields).
- Admin-managed participants with `Empleado` / `Otro` `funcion` (DB column still accepts; public schema restricts).
- Soft-deleted participant policy at enrollment lookup (current behavior preserved; documented follow-up).
- Concurrent enrollment capacity race (read-then-increment remains; documented known risk).
- BrowserRouter migration (HashRouter is the architectural choice from `acoes-post-migration-hardening`).
- `funcionesACOES` historical `Facilitadora` cleanup (`app/src/data/mockData.ts:221`).
- Archiving the parked `acoes-batch-1/2/3` (separate future change).
- Removing the legacy `enrollments` columns (deferred to a destructive normalization step after this lands).

## Approach

| # | Capability | What implementation will do |
|---|---|---|
| 1 | `public-registration-enum-funcion` | Add a dedicated two-value public Zod schema in `participant-schema.ts`; add a public two-value catalog in `catalogs.ts`; route `src/pages/api/public/participants.ts` through it. Keep the four-value admin schema/catalog unchanged. |
| 2 | `conditional-form-fields-by-funcion` | `RegistroPage.tsx` exposes a role select in step 1; `curso` / `capacitacion` render only when `funcion === 'Facilitador'`; form state and step-3 review re-render reactively; `observaciones` field removed. Stale values are cleared on role change. |
| 3 | `redirect-after-registration` | New `safeRedirect()` helper accepts only relative paths starting with `/`, no `//`, no scheme, no self-loop. `RegistroPage.tsx` reads `?redirect=` after successful submission and SPA-navigates to it. |
| 4 | `public-enrollment-by-dui` | `CursoDetallePage.tsx` modal asks DUI only; new `POST /api/public/enrollments` validates token + DUI, runs `getParticipantByDocumentNumber`; on hit, calls `createEnrollment({ participantId, ... })`; on miss, returns `{ redirect }`. `api.ts` and `types/index.ts` gain a discriminated union for the response. |
| 5 | `enrollments-participant-fk` | `bootstrap.ts` adds idempotent `DROP/ADD CONSTRAINT` for the FK and sets `participant_id NOT NULL`. `createEnrollment` for the public path derives legacy identity columns from the participant in the same transaction. Admin path unchanged. |
| 6 | `dui-format-validation` | New `normalizeDui()` in `participant-schema.ts` enforces `^\d{8}-\d$`; used by both the registration schema and the enrollment lookup helper. |

## Capabilities

### New Capabilities

- `public-registration-enum-funcion` — public schema restricts `funcion` to `['Participante', 'Facilitador']`
- `conditional-form-fields-by-funcion` — `curso` / `capacitacion` show/hide by `funcion`; `observaciones` removed
- `redirect-after-registration` — `?redirect=` query param with strict relative-path validation
- `public-enrollment-by-dui` — modal asks DUI only; backend returns `enrollment | redirect`
- `enrollments-participant-fk` — `enrollments.participant_id NOT NULL ... ON DELETE CASCADE`
- `dui-format-validation` — canonical `00000000-0` format + normalizer

### Modified Capabilities

- None at the spec level. The existing `public-participant-validation` spec body covers admin-side validation; the public surface here is a new spec because it changes the public interface invariants.

## Affected artifacts

| Path | Change |
|---|---|
| `app/src/pages/RegistroPage.tsx` | Role select, conditional fields, `observaciones` removal, redirect continuation |
| `app/src/pages/CursoDetallePage.tsx` | DUI-only modal, redirect-result handling |
| `app/src/services/api.ts`, `app/src/types/index.ts` | Public registration payload without observations; enrollment response union |
| `src/lib/server/participant-schema.ts` | New `publicParticipantSchema` (two-value + DUI format) and `normalizeDui()` |
| `src/lib/server/course-schema.ts` | Public enrollment schema reduced to DUI lookup shape |
| `src/pages/api/public/participants.ts` | Route through public schema; reject `Empleado` / `Otro` |
| `src/pages/api/public/enrollments.ts` | DUI-only input; return `{ redirect }` or create linked enrollment |
| `src/lib/server/participants.ts` | New `getParticipantByDocumentNumber()` helper |
| `src/lib/server/enrollments.ts` | Public path derives identity columns from participant; FK required |
| `src/lib/server/bootstrap.ts` | FK NOT NULL + CASCADE; ordering fix |
| `src/lib/server/catalogs.ts` | Add `PUBLIC_FUNCTIONS` = `['Participante', 'Facilitador']`; keep admin four-value |
| `app/tests/e2e/registro-participant-only.spec.ts` | Replace with role-matrix coverage |
| `app/tests/e2e/public-registration.spec.ts` | Drop notes/program; add facilitator-only field coverage |
| `app/tests/e2e/public-enrollment-link.spec.ts` | Cover found / not-found / resume |
| `app/tests/unit/registro-participant-only.test.tsx` | Replace with role-matrix unit |
| `src/lib/server/__tests__/participant-public-json.test.ts` | Cover two-value restriction + DUI format |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Admin `Empleado` / `Otro` participants break under a global two-value DB CHECK | High (if naive) | Use a four-value DB CHECK + strict public Zod; the public restriction is a schema invariant, not a DB invariant |
| Open redirect via crafted `?redirect=` | Med | `safeRedirect()` rejects schemes, `//`, control chars, and registration self-loops; unit test covers malicious inputs |
| HashRouter drops the second query segment on `/#/registro?redirect=/cursos/9?token=abc` | Med | Single-encode via `encodeURIComponent` on the inner `/cursos/{id}?token={token}`; unit test on `URL` parser |
| FK NOT NULL migration breaks existing rows | None — DB is empty | Bootstrap is idempotent; FK constraint explicit `DROP/ADD` |
| `observaciones` removal breaks admin audit exports that read it | Low | Admin endpoints still write/read observations on their own paths; only the public schema drops it |
| Facilitator-only fields skipped by client | Low-Med | Zod `.superRefine` rejects facilitator payloads missing `curso` / `capacitacion`; step-3 review re-renders |
| `bootstrap.ts` ordering regression on fresh DB | Med | Explicit `DROP/ADD CONSTRAINT` block plus ordering fix; verified by a fresh-DB test |

### Parked risks (NOT fixed here)

| Risk | Why parked |
|---|---|
| Concurrent enrollment can oversubscribe capacity | Read-then-increment is adjacent but out of scope; document in known limitations |
| Soft-deleted participant lookup ambiguity | Deferred to a follow-up change with explicit policy |
| `funcionesACOES` still uses `Facilitadora` historical form | UI cleanup is separate from flow logic |

## Rollback Plan

Each capability is independently revertible in its chained PR:

- PR1 (backend schemas + FK + DUI + bootstrap ordering): revert the commit; legacy `participant_id` becomes nullable again, public schema reverts to four-value. No data loss because the DB is empty.
- PR2 (registration UI + redirect hardening): revert the commit; `RegistroPage.tsx` returns to its current state.
- PR3 (enrollment modal + redirect response): revert the commit; modal returns to five-field input.
- PR4 (tests + E2E coverage): revert the commit; old `registro-participant-only` specs return.

No destructive DDL in any PR. Legacy `enrollments` columns are kept populated by the public path during the transition, so a partial rollback leaves admin reports intact.

## Success Criteria

- [ ] Public `POST /api/public/participants` rejects `funcion` outside `['Participante', 'Facilitador']` with a per-field error
- [ ] `RegistroPage.tsx` shows `curso` / `capacitacion` only when `funcion === 'Facilitador'` and re-renders on role change
- [ ] `observaciones` is not collected, sent, or persisted by any public endpoint
- [ ] `?redirect=` accepts only relative paths starting with `/`, no `//`, no schemes
- [ ] Public enrollment modal asks DUI only; backend returns `{ redirect }` when not found, otherwise creates the enrollment with `participant_id` FK
- [ ] `enrollments.participant_id` is `NOT NULL REFERENCES participants(id) ON DELETE CASCADE`
- [ ] DUI is normalized to `00000000-0` before validation and lookup
- [ ] Fresh-DB bootstrap completes without ordering errors
- [ ] New unit + backend + E2E coverage passes locally and in CI
- [ ] `npm run test:unit`, `npm run build` (backend), `npm run build` (app), and Playwright E2E against PostgreSQL all green

## Known limitations

- The four-value DB CHECK on `participants.role_function` stays in place. The two-value restriction is enforced by the public Zod schema only.
- `enrollments.full_name`, `email`, `phone`, `dui`, `notas` are kept and populated from the participant. Removing them is a separate destructive change.
- Concurrent enrollment capacity race is not addressed; the read-then-increment path remains.
- Soft-deleted participant lookup behavior is preserved as-is (lookup excludes `deleted_at IS NOT NULL` if the existing helper does, otherwise includes).
- HashRouter remains the SPA router; the redirect path uses single-encoded inner URLs.
- The `funcionesACOES` historical `Facilitadora` string in `app/src/data/mockData.ts` is not changed.

## References

- `openspec/changes/acoes-dui-enrollment-flow/explore.md` — full audit, affected areas, and 7 risks
- Engram topic `sdd/acoes-dui-enrollment-flow/explore` — explore observations
- `openspec/changes/archive/2026-07-25-acoes-post-migration-hardening/proposal.md` — prior change for HashRouter / canonical-role baseline
- `openspec/specs/public-participant-validation/spec.md` — existing admin-side public validation (unchanged)
- `openspec/specs/auth-and-route-protection/spec.md` — canonical 4-role baseline (unchanged)