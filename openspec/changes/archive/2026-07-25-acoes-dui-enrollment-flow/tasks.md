## Review Workload Forecast

- Total estimated changed lines (high estimate): 1560
- Number of tasks: 19
- Largest single task: 120 lines
- Chained PRs recommended: Yes (already approved)
- 800-line budget risk per PR:
  - PR1: Low (~300)
  - PR2: Low (~350)
  - PR3: Medium (~600-700, near 400-line soft target)
  - PR4: Low (~250)
- Total of all PRs: ~1500-1600 (well over 800, but per-PR budget respected)
- Decision needed before apply: No (chained already approved)
- Recommended chain strategy: stacked-to-main (locked)

### Suggested Work Units (chained stacked-to-main PRs)

| PR | Capability | Goal | High estimate | Base | Notes |
|----|------------|------|---------------|------|-------|
| 1 | FK + DUI + bootstrap | Backend foundation | ~300 | main | Additive backend contracts, FK migration, and admin compatibility shim |
| 2 | Registration UI + safeRedirect | Frontend registration form | ~350 | PR1 | Role matrix, conditional fields, redirect hardening, and DUI input guidance |
| 3 | Enrollment round-trip | DUI-only modal, lookup, redirect, and automatic retry | ~660 | PR2 | Largest slice; Specs 3 and 4 remain together as designed |
| 4 | Housekeeping | Tests, mock data, typed API contract, admin coverage, and docs | ~250 | PR3 | Final regression and compatibility cleanup |

## PR1: Backend foundation — schemas, DUI, FK, bootstrap, and admin shim

## 1.1 Add the canonical DUI normalizer and backend schema

**Capability**: dui-format-validation  
**PR**: PR1  
**Spec ref**: `openspec/changes/acoes-dui-enrollment-flow/specs/dui-format-validation/spec.md` — Requirements: Canonical DUI format; Normalizer is applied before validation and lookup  
**Depends on**: none  
**Estimated changed lines**: 45-65

### Files to change
- `src/lib/server/dui.ts` — add `normalizeDui()` and the reusable Zod DUI schema.
- `src/lib/server/__tests__/dui.test.ts` — cover canonical, nine-digit, whitespace, short, long, and non-digit inputs.

### Steps
1. Implement canonical `^\d{8}-\d$` validation, whitespace removal, and nine-digit dash insertion; return `null` for invalid values.
2. Export a Zod preprocessor that normalizes before regex validation, without changing the admin participant schema’s existing role catalog.
3. Add unit cases for every normalization and rejection scenario from the spec.

### Verification
- [x] Run `npm test -- --run src/lib/server/__tests__/dui.test.ts` from the repository root.
- [x] Confirm the parsed value for `000000000` and `00000 000-0` is exactly `00000000-0`.

## 1.2 Create the restricted public participant schema and catalog

**Capability**: public-registration-enum-funcion  
**PR**: PR1  
**Spec ref**: `openspec/changes/acoes-dui-enrollment-flow/specs/public-registration-enum-funcion/spec.md` — Requirements: Public form restricts `funcion`; Public and admin schemas are separate  
**Depends on**: 1.1  
**Estimated changed lines**: 55-75

### Files to change
- `src/lib/server/catalogs.ts` — export the public two-value role tuple while preserving the admin four-value catalog.
- `src/lib/server/public-participant-schema.ts` — add the public schema with `Participante`/`Facilitador`, no public notes, and facilitator conditional fields.
- `src/lib/server/__tests__/public-participant-schema.test.ts` — test public rejection/acceptance and admin catalog independence.

### Steps
1. Compose the public schema from the existing participant field validations, replacing the role field with the public enum and the DUI field with the canonical schema.
2. Require `courseId` and `program` only for `Facilitador`; reject `Empleado`, `Otro`, historical `Facilitadora`, and public `notes`.
3. Test that the existing admin schema/catalog still accepts `Empleado` and `Otro` and that changing one catalog cannot widen the other.

### Verification
- [x] Run `npm test -- --run src/lib/server/__tests__/public-participant-schema.test.ts`.
- [x] Assert invalid public roles produce a field issue on `roleFunction` and valid participant input parses successfully.

### Rollback
Revert the new public schema/catalog export and its tests; the existing admin schema remains untouched.

## 1.3 Add exact DUI participant lookup and route public registration through the public schema

**Capability**: public-registration-enum-funcion  
**PR**: PR1  
**Spec ref**: `openspec/changes/acoes-dui-enrollment-flow/specs/public-registration-enum-funcion/spec.md` — Requirements: Public endpoint routes through the public schema; Public submission with `Empleado` is rejected  
**Depends on**: 1.1, 1.2  
**Estimated changed lines**: 40-55

### Files to change
- `src/lib/server/participants.ts` — add `getParticipantByDocumentNumber()` with normalized exact matching and soft-delete exclusion by default.
- `src/pages/api/public/participants.ts` — validate anonymous payloads with the dedicated public schema and omit notes from the create input.
- `src/lib/server/__tests__/participant-public-json.test.ts` — extend route coverage for public role and DUI rejection.

### Steps
1. Normalize the lookup key before querying `document_number`, accept an optional transaction client, and preserve the existing default soft-delete policy.
2. Replace the public route’s shared permissive validator with the public schema; keep admin participant routes unchanged.
3. Assert rejected roles create no row and accepted participant payloads return 201 with canonical DUI.

### Verification
- [x] Run `npm test -- --run src/lib/server/__tests__/participant-public-json.test.ts`.
- [x] Send a public `Empleado` payload and verify HTTP 400 plus no inserted participant; send a valid participant payload and verify HTTP 201.

### Rollback
Revert only the lookup and public-route wiring commit; the public schema remains available for a later retry.

## 1.4 Fix bootstrap ordering and migrate the participant foreign key idempotently

**Capability**: enrollments-participant-fk  
**PR**: PR1  
**Spec ref**: `openspec/changes/acoes-dui-enrollment-flow/specs/enrollments-participant-fk/spec.md` — Requirements: participant FK is NOT NULL/CASCADE and indexed  
**Depends on**: 1.1  
**Estimated changed lines**: 50-65

### Files to change
- `src/lib/server/bootstrap.ts` — create `courses` before `participants`; define `participant_id NOT NULL ... ON DELETE CASCADE`; add the idempotent migration block.
- `src/lib/server/__tests__/bootstrap.test.ts` — verify fresh bootstrap, repeat bootstrap, FK metadata, NOT NULL, index, and cascade behavior.

### Steps
1. Reorder fresh-database DDL so referenced `courses` and `participants` tables exist before `enrollments` is created.
2. Backfill resolvable legacy rows, fail explicitly on remaining null participant IDs, set NOT NULL, drop/re-add the FK as CASCADE, and create the participant index.
3. Run the migration twice and assert the final schema plus participant-delete cascade against PostgreSQL.

### Verification
- [x] Run `npm test -- --run src/lib/server/__tests__/bootstrap.test.ts` with the PostgreSQL test database available.
- [x] Run `npm run build` and verify a fresh database completes bootstrap without a table-order error.

### Rollback
Revert the bootstrap commit only; if the migration has already run on a database, use the documented forward SQL rollback to restore SET NULL/nullability before reverting application code.

## 1.5 Make public enrollment creation participant-backed and keep the admin enrollment shim working

**Capability**: enrollments-participant-fk  
**PR**: PR1  
**Spec ref**: `openspec/changes/acoes-dui-enrollment-flow/specs/enrollments-participant-fk/spec.md` — Requirements: Legacy columns are preserved; `createEnrollment` accepts a required public `participantId`  
**Depends on**: 1.3, 1.4  
**Estimated changed lines**: 30-40

### Files to change
- `src/lib/server/enrollments.ts` — require participant linkage on the public path and derive legacy identity columns inside the transaction.
- `src/pages/api/enrollments.ts` — resolve a missing admin `participantId` from DUI or return a clear 400 error.
- `src/lib/server/__tests__/enrollment-participant-link.test.ts` — test identity derivation and fail-fast missing participant behavior.

### Steps
1. Load the participant inside the existing transaction and use its current name, email, phone, and normalized DUI for the legacy enrollment columns.
2. Reject public calls without `participantId` before any insert; preserve admin response shape and legacy columns.
3. Add focused service/route tests for existing and missing admin DUI inputs.

### Verification
- [x] Run `npm test -- --run src/lib/server/__tests__/enrollment-participant-link.test.ts`.
- [x] Verify an admin request without `participantId` returns 400 for an unknown DUI and succeeds only for a matching participant.

### Rollback
Revert the service and admin shim commit; leave the FK migration in place and block public enrollment until the compatible service path is reapplied.

## PR2: Public registration UI — role matrix, conditional fields, redirect safety, and DUI guidance

## 2.1 Replace the participant-only registration state with the public role matrix

**Capability**: conditional-form-fields-by-funcion  
**PR**: PR2  
**Spec ref**: `openspec/changes/acoes-dui-enrollment-flow/specs/conditional-form-fields-by-funcion/spec.md` — Requirements: `curso`/`capacitacion` conditional; `observaciones` removed; `funcion` in step 1  
**Depends on**: 1.2  
**Estimated changed lines**: 90-120

### Files to change
- `app/src/pages/RegistroPage.tsx` — add the two-option role select, conditional facilitator fields, stale-value clearing, and role-aware step validation.

### Steps
1. Replace the hardcoded role/read-only field with a step-1 selector sourced from the public two-value list; default to no selected role.
2. Render and validate course/training only for `Facilitador`, remove every observations state/input/payload key, and clear conditional values/errors when switching to `Participante`.
3. Preserve personal/contact fields across role changes and update the review/banner copy without exposing admin-only roles.

### Verification
- [x] Run `npm run build` from `app/`.
- [x] Manually or via the unit suite verify empty role hides both fields, facilitator requires both, participant does not, and toggling clears stale values.

### Rollback
Revert the `RegistroPage.tsx` commit; no backend or redirect helper changes are required to restore the prior UI.

## 2.2 Add the pure safe redirect validator

**Capability**: redirect-after-registration  
**PR**: PR2  
**Spec ref**: `openspec/changes/acoes-dui-enrollment-flow/specs/redirect-after-registration/spec.md` — Requirement: Redirect target validation rejects open redirects  
**Depends on**: none  
**Estimated changed lines**: 55-80

### Files to change
- `app/src/lib/safeRedirect.ts` — add a pure same-origin relative-path validator, including the `/registro` self-loop guard.
- `app/tests/unit/safeRedirect.test.ts` — cover accepted query/hash paths and every rejected scheme, protocol-relative, whitespace/control, and non-root input.

### Steps
1. Implement validation for a single-leading-slash path, no control/whitespace characters, no scheme prefix, and no registration self-loop.
2. Keep the function independent of React and browser globals so it can be tested directly.
3. Add table-driven unit cases matching the redirect spec scenarios.

### Verification
- [x] Run `(cd app && npm run test:unit -- tests/unit/safeRedirect.test.ts)`.
- [x] Confirm `/cursos/9?token=XYZ` and `/cursos/9#schedule` are returned unchanged while `//evil.com` and `javascript:...` return `null`.

### Rollback
Revert the helper and its unit test; registration falls back to its success page until redirect handling is reapplied.

## 2.3 Wire redirect continuation and canonical DUI input guidance into registration

**Capability**: redirect-after-registration  
**PR**: PR2  
**Spec ref**: `openspec/changes/acoes-dui-enrollment-flow/specs/redirect-after-registration/spec.md` — Requirements: `RegistroPage` reads `?redirect=`; successful registration navigates to validated target; `dui-format-validation` — Form DUI field guides input  
**Depends on**: 2.1, 2.2  
**Estimated changed lines**: 65-80

### Files to change
- `app/src/pages/RegistroPage.tsx` — read/decode the HashRouter query, navigate only after HTTP 201, and retain the default success fallback.
- `app/src/lib/dui.ts` — expose the client normalizer/schema or shared client validation adapter.

### Steps
1. Read the inner `redirect` query value with `useSearchParams`, decode it once, validate it with `safeRedirect()`, and navigate through `useNavigate()` after successful registration.
2. Normalize the registration DUI before submission and add `pattern="\d{8}-\d"`, canonical placeholder, `inputMode="numeric"`, and `maxLength={10}`; keep masking permissive rather than mutating pasted input mid-keystroke.
3. Preserve the registration-code success page when the parameter is missing or invalid.

### Verification
- [x] Run `(cd app && npm run test:unit -- tests/unit/registro-redirect.test.tsx)` after the form suite exists.
- [x] Run `npm run build` from `app/` and verify valid encoded course redirects and malicious redirects remain on the success page.

### Rollback
Revert the redirect/client-DUI wiring while retaining the role form; the form returns to its terminal success behavior.

## 2.4 Add registration role-matrix and redirect component coverage

**Capability**: public-registration-enum-funcion  
**PR**: PR2  
**Spec ref**: `openspec/changes/acoes-dui-enrollment-flow/specs/public-registration-enum-funcion/spec.md` — all Requirements; `openspec/changes/acoes-dui-enrollment-flow/specs/conditional-form-fields-by-funcion/spec.md` — all Requirements  
**Depends on**: 2.3  
**Estimated changed lines**: 55-70

### Files to change
- `app/tests/unit/registro-form.test.tsx` — replace the participant-only unit suite with role, conditional-field, payload, and redirect cases.
- `app/tests/e2e/public-registration-funcion.spec.ts` — add participant/facilitator role-matrix and malformed DUI browser coverage.
- `app/tests/e2e/registro-participant-only.spec.ts` — remove obsolete participant-only assertions once replacement coverage passes.

### Steps
1. Assert exactly two role options, participant hidden fields, facilitator requirements, stale-value clearing, and no observations in the request body.
2. Exercise valid participant and facilitator registration plus invalid role/DUI API responses using deterministic unique DUIs.
3. Keep admin role behavior out of the public UI suite; it is covered by backend and PR4 compatibility tests.

### Verification
- [x] Run `(cd app && npm run test:unit -- tests/unit/registro-conditional-fields.test.tsx tests/unit/registro-redirect.test.tsx)`.
- [x] Run `(cd app && npm run test:e2e -- tests/e2e/public-registration-funcion.spec.ts)` against the seeded PostgreSQL stack. (PR4)

### Rollback
Revert the replacement tests and deletion; production behavior from tasks 2.1–2.3 remains independently reversible.

## PR3: Enrollment round-trip — DUI-only modal, lookup response, session bridge, and retry

## 3.1 Replace the public enrollment endpoint with token-bound DUI lookup

**Capability**: public-enrollment-by-dui  
**PR**: PR3  
**Spec ref**: `openspec/changes/acoes-dui-enrollment-flow/specs/public-enrollment-by-dui/spec.md` — Requirements: Backend accepts `{ token, dui }`; Lookup uses normalized DUI; `redirect-after-registration` — valid course redirect shape  
**Depends on**: 1.3, 1.5  
**Estimated changed lines**: 95-120

### Files to change
- `src/pages/api/public/enrollments.ts` — accept only token plus DUI, resolve course before participant lookup, and return enrollment or encoded registration redirect.
- `src/lib/server/course-schema.ts` — define the public DUI request shape without weakening admin enrollment validation.
- `src/lib/server/__tests__/public-enrollment.test.ts` — cover found, not-found, invalid token, malformed DUI, duplicate, and full-course outcomes.

### Steps
1. Validate the public token first, normalize/validate DUI second, and call `getParticipantByDocumentNumber()` only for a valid token and canonical DUI.
2. On a hit call the participant-backed `createEnrollment`; on a miss return HTTP 200 with `redirect=/registro?redirect=${encodeURIComponent(coursePath)}` and never create a row.
3. Preserve existing 404/400/409/500 response semantics and reject the superseded five-field public payload.

### Verification
- [x] Run `npm test -- --run src/lib/server/__tests__/public-enrollment.test.ts`.
- [x] Exercise the endpoint with valid, missing, malformed, and mismatched inputs and inspect status/body plus database row count.

### Rollback
Revert the public endpoint/schema commit; PR1’s participant FK and service remain available for a later compatible endpoint implementation.

## 3.2 Convert the course enrollment modal to DUI-only input

**Capability**: public-enrollment-by-dui  
**PR**: PR3  
**Spec ref**: `openspec/changes/acoes-dui-enrollment-flow/specs/public-enrollment-by-dui/spec.md` — Requirement: Modal collects DUI only  
**Depends on**: 3.1  
**Estimated changed lines**: 85-110

### Files to change
- `app/src/pages/CursoDetallePage.tsx` — remove public name/email/phone/notes state and render only the DUI field plus course context.

### Steps
1. Reduce modal state and submit payload to the resolved public token plus canonical DUI; retain course title/context and existing loading/error/success states.
2. Add the same permissive normalization and HTML guidance attributes used by registration.
3. Handle endpoint errors without treating a redirect response as a successful enrollment.

### Verification
- [x] Run `(cd app && npm run test:unit -- tests/unit/curso-detalle-enrollment.test.tsx)` after the focused suite exists.
- [x] Inspect the rendered modal and assert exactly one user-editable field, no legacy identity fields, and the course title.

### Rollback
Revert the modal-only commit to restore the old five-field UI without changing the backend endpoint contract.

## 3.3 Add the tab-bound pending enrollment session bridge

**Capability**: redirect-after-registration  
**PR**: PR3  
**Spec ref**: `openspec/changes/acoes-dui-enrollment-flow/specs/redirect-after-registration/spec.md` — successful continuation; `openspec/changes/acoes-dui-enrollment-flow/specs/public-enrollment-by-dui/spec.md` — Requirement: SPA resumes enrollment after registration  
**Depends on**: 2.2, 3.2  
**Estimated changed lines**: 95-120

### Files to change
- `app/src/lib/pendingEnrollment.ts` — add typed sessionStorage read/write/clear helpers with a ten-minute TTL.
- `app/src/pages/CursoDetallePage.tsx` — persist `{ dui, courseId, token, ts }` when the API returns a redirect and navigate to the encoded path.
- `app/tests/unit/pending-enrollment.test.ts` — cover serialization, course/token matching, expiry, and malformed storage.

### Steps
1. Store only the normalized DUI and token-bound course context in `sessionStorage` under `acoes:pendingEnrollment`; do not place the DUI in the URL.
2. Navigate to the backend redirect using the SPA hash route and keep the entry until the matching course page can consume it.
3. Treat missing, malformed, expired, or mismatched entries as no pending flow and clear consumed state.

### Verification
- [x] Run `(cd app && npm run test:unit -- tests/unit/pending-enrollment.test.ts)`.
- [x] Manually submit an unknown DUI and verify the encoded registration URL plus the exact sessionStorage key/value shape.

### Rollback
Revert the storage helper and bridge wiring; unknown DUI responses still display an error until the prior registration flow is restored.

## 3.4 Auto-retry the pending enrollment on the resumed course page

**Capability**: public-enrollment-by-dui  
**PR**: PR3  
**Spec ref**: `openspec/changes/acoes-dui-enrollment-flow/specs/public-enrollment-by-dui/spec.md` — Requirement: SPA resumes enrollment after registration, especially the automatic enrollment scenario  
**Depends on**: 3.3  
**Estimated changed lines**: 95-120

### Files to change
- `app/src/pages/CursoDetallePage.tsx` — detect matching pending state, prefill/open the modal, and auto-submit after render.
- `app/tests/unit/curso-detalle-enrollment.test.tsx` — verify modal prefill, automatic request, success, and retained error state.

### Steps
1. On a course route with a token, read a fresh matching pending entry, prefill the DUI, open the modal, then trigger the enrollment request after the modal renders.
2. On success clear sessionStorage and expose the existing enrollment confirmation/count update; on failure leave the modal open with the API error for manual retry.
3. Avoid a synthesized submit event where a direct enrollment function can share validation and loading state.

### Verification
- [x] Run `(cd app && npm run test:unit -- tests/unit/curso-detalle-enrollment.test.tsx)`.
- [x] Assert a seeded pending entry causes one request with the stored DUI and a successful enrollment state without a second click.

### Rollback
Revert only the auto-retry effect; the modal remains available for manual DUI submission and redirect storage remains independently revertible.

## 3.5 Add the found, malformed, and invalid-token round-trip integration coverage

**Capability**: public-enrollment-by-dui  
**PR**: PR3  
**Spec ref**: `openspec/changes/acoes-dui-enrollment-flow/specs/public-enrollment-by-dui/spec.md` — Backend and resume requirements; `openspec/changes/acoes-dui-enrollment-flow/specs/dui-format-validation/spec.md` — normalized lookup scenario  
**Depends on**: 3.4  
**Estimated changed lines**: 90-100

### Files to change
- `app/tests/e2e/public-enrollment-roundtrip.spec.ts` — add full anonymous not-found → registration → return → auto-enrollment coverage and found-DUI coverage.
- `app/tests/e2e/public-enrollment-link.spec.ts` — preserve link/hash checks and add the modal entry point where appropriate.

### Steps
1. Generate a valid admin public link, submit malformed DUI and assert 400, then submit an unknown DUI and assert encoded registration redirect.
2. Complete participant registration with the pending DUI and assert return to the course, automatic enrollment, and participant count/confirmation.
3. Seed a participant and assert dashless nine-digit DUI matches; assert invalid/mismatched token performs no lookup or insert.

### Verification
- [x] Run `(cd app && npm run test:e2e -- tests/e2e/public-enrollment-roundtrip.spec.ts tests/e2e/public-enrollment-link.spec.ts)` against PostgreSQL.
- [x] Confirm tests use deterministic unique DUIs and clean their participant/enrollment rows.

### Rollback
Revert only the new/extended E2E files; production round-trip behavior remains controlled by tasks 3.1–3.4.

## 3.6 Prove the PR3 boundary with frontend and backend builds

**Capability**: public-enrollment-by-dui  
**PR**: PR3  
**Spec ref**: `openspec/changes/acoes-dui-enrollment-flow/specs/public-enrollment-by-dui/spec.md` — all Requirements; `openspec/changes/acoes-dui-enrollment-flow/specs/enrollments-participant-fk/spec.md` — public linked enrollment requirement  
**Depends on**: 3.5  
**Estimated changed lines**: 80-90

### Files to change
- `app/src/services/api.ts` — accept the temporary public DUI request and preserve a distinguishable enrollment-versus-redirect response for the component.
- `app/src/types/index.ts` — keep existing admin enrollment/list shapes compatible with the new public result handling.

### Steps
1. Make the client call send only `{ token, dui }` and branch explicitly on `redirect` versus `data` before updating success state.
2. Run the complete PR3 focused suites and both application/backend builds without changing admin list/detail models.
3. Record the response-contract boundary so PR4 can promote it to the final exported discriminated union without behavior changes.

### Verification
- [x] Run `npm test` and `npm run build` at the repository root.
- [x] Run `(cd app && npm run test:unit && npm run build)` and the PR3 Playwright suite.

### Rollback
Revert the client contract adaptation with the PR3 slice; server rollback is task 3.1 and modal rollback is task 3.2.

## PR4: Housekeeping — typed contracts, mocks, admin coverage, E2E cleanup, and docs

## 4.1 Finalize the public enrollment discriminated union without breaking admin types

**Capability**: public-enrollment-by-dui  
**PR**: PR4  
**Spec ref**: `openspec/changes/acoes-dui-enrollment-flow/specs/public-enrollment-by-dui/spec.md` — Backend accepts `{ token, dui }` and creates a linked enrollment; SPA resume contract  
**Depends on**: 3.6  
**Estimated changed lines**: 45-55

### Files to change
- `app/src/services/api.backend.types.ts` — define `PublicEnrollmentResult` as `{ kind: 'enrollment'; data } | { kind: 'redirect'; redirect }`.
- `app/src/services/api.ts` — return the discriminated union from `inscribir()` and remove casts/legacy five-field request assumptions.
- `app/src/types/index.ts` — preserve admin enrollment identity fields while exposing the public result type where needed.

### Steps
1. Convert raw endpoint shapes at the service boundary and make `CursoDetallePage` exhaustive over both union variants.
2. Keep admin list/detail and legacy denormalized fields intact; do not remove compatibility columns or admin payloads.

### Verification
- [x] Run `(cd app && npm run test:unit && npm run build)`.
- [x] Add a compile-time/unit assertion that redirect responses cannot reach enrollment-success rendering.

### Rollback
Revert the type-only/service-boundary commit; retain the runtime branch introduced in PR3.

## 4.2 Update E2E fixtures and mock data to canonical public roles

**Capability**: public-registration-enum-funcion  
**PR**: PR4  
**Spec ref**: `openspec/changes/acoes-dui-enrollment-flow/specs/public-registration-enum-funcion/spec.md` — Admin four-value compatibility; `openspec/changes/acoes-dui-enrollment-flow/specs/dui-format-validation/spec.md` — client canonical input guidance  
**Depends on**: 4.1  
**Estimated changed lines**: 70-85

### Files to change
- `app/src/data/mockData.ts` — add/use the canonical public `Facilitador` option without changing the historical admin-only `Facilitadora` fixture unless a test requires an explicit compatibility case.
- `app/tests/e2e/public-registration.spec.ts` — remove mandatory participant course/notes assumptions and use the new form contract.

### Steps
1. Make fixtures distinguish public `Facilitador` from preserved admin historical values and avoid fixed/parallel-flaky DUI generation.
2. Update remaining registration tests to submit only fields visible for the selected role and assert no observations payload.
3. Run all registration E2E suites together against clean test data.

### Verification
- [x] Run `(cd app && npm run test:e2e -- tests/e2e/public-registration.spec.ts tests/e2e/public-registration-funcion.spec.ts)`.
- [x] Confirm no public test selects `Empleado`, `Otro`, or historical `Facilitadora`.

### Rollback
Revert fixture and test cleanup only; it changes no runtime behavior.

## 4.3 Add admin shim, FK cascade, and fresh-schema regression coverage

**Capability**: enrollments-participant-fk  
**PR**: PR4  
**Spec ref**: `openspec/changes/acoes-dui-enrollment-flow/specs/enrollments-participant-fk/spec.md` — all Requirements and scenarios  
**Depends on**: 4.2  
**Estimated changed lines**: 60-70

### Files to change
- `app/tests/e2e/admin-enrollment-fk.spec.ts` — cover admin creation by participant ID/DUI and clear 400 for unknown DUI.
- `app/tests/e2e/admin-enrollment-link.spec.ts` — assert deleting a participant cascades linked enrollments.
- `src/lib/server/__tests__/bootstrap.test.ts` — retain/extend fresh empty-database and repeated-bootstrap assertions if PR1 coverage needs integration hardening.

### Steps
1. Create an admin participant and exercise both the participantId and DUI fallback enrollment paths while checking `participant_id` and legacy columns.
2. Delete the participant and assert no orphan enrollment remains; repeat bootstrap to prove idempotency in the same test setup.
3. Keep admin `Empleado`, `Otro`, and historical `Facilitadora` role creation covered separately from public role rejection, and assert the database accepts those values.

### Verification
- [x] Run the focused backend bootstrap tests and both admin Playwright specs.
- [x] Inspect the database after cascade and assert zero linked rows and no NOT NULL/FK violations.

### Rollback
Revert the regression-test commit; no production schema or API behavior changes are included in this task.

## 4.4 Document the final public enrollment flow and operational boundaries

**Capability**: redirect-after-registration  
**PR**: PR4  
**Spec ref**: `openspec/changes/acoes-dui-enrollment-flow/specs/redirect-after-registration/spec.md` — redirect safety and HashRouter scenarios; `enrollments-participant-fk` — legacy compatibility  
**Depends on**: 4.3  
**Estimated changed lines**: 30-40

### Files to change
- `docs/architecture.md` — update the public registration/enrollment diagram, role matrix, DUI-only round-trip, sessionStorage bridge, and HashRouter redirect encoding.

### Steps
1. Replace the participant-only flow description with the Participante/Facilitador conditional registration flow.
2. Document token-first lookup, unknown-DUI registration redirect, ten-minute pending state, linked enrollment, preserved legacy columns, and parked risks.

### Verification
- [x] Review the documented URLs against `/#/registro?redirect=...` and `/#/cursos/<id>?token=...` behavior.
- [x] Run the final root/app builds and all unit tests after documentation changes.

### Rollback
Revert the documentation commit; implementation and test behavior are unaffected.

## Summary

- **Total tasks**: 19, ordered across four stacked-to-main PRs.
- **High estimate**: 1560 changed lines: PR1 300, PR2 350, PR3 660, PR4 250.
- **Boundary**: PR1 establishes backend contracts and database integrity; PR2 changes registration UX; PR3 keeps the redirect/enrollment round-trip together; PR4 finalizes types, regression coverage, fixtures, and documentation.
- **Next apply order**: 1.1 → 1.5, then 2.1 → 2.4, then 3.1 → 3.6, then 4.1 → 4.4. Each PR should be verified and merged to `main` before its child is applied.
- **Out of scope**: admin role removal, soft-delete policy changes, capacity race fixes, HashRouter migration, destructive legacy-column removal, historical `Facilitadora` cleanup, and archiving `acoes-batch-1/2/3`.
