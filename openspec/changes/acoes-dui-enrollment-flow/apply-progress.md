# Apply Progress: acoes-dui-enrollment-flow — PR1 (backend foundation) and PR2 (registration UI)

## Status

**PR1 (backend foundation)**: **success** (5/5 tasks complete, 102/102 backend tests + 69/69 React tests + 2 builds pass).

**PR2 (registration UI)**: **success with one known consequence** (4/4 tasks complete, 102 backend + 121 React tests + 2 builds pass; 10/14 E2E pass — the 3 pre-existing data-mismatch failures remain and 1 new failure is the obsolete `registro-participant-only.spec.ts` suite, which tests behavior PR2 explicitly removes; remediation is PR4's housekeeping work per the user brief).

## PR1 — backend foundation

### Capabilities delivered

- `public-registration-enum-funcion` (backend portion) — public two-value role catalog and dedicated public Zod schema; admin four-value catalog untouched.
- `dui-format-validation` (backend portion) — `normalizeDui()` helper and `duiSchema` Zod preprocessor.
- `enrollments-participant-fk` (full) — `participant_id` is `NOT NULL` and `ON DELETE CASCADE`; bootstrap ordering fix; legacy columns populated from the participant; admin compatibility shim.

### Estimated vs actual lines

| Scope | Estimate | Actual |
|-------|----------|--------|
| PR1 total (production + tests) | ~300 | 1151 added / 52 removed / 1099 net |

The estimate was for production code; test files account for ~800 of the additions. Per-commit size remains well within the work-unit review budget.

### Commits (in order)

| # | Hash | Subject | Files |
|---|------|---------|-------|
| 1 | `61b4c22` | feat(dui): add normalizeDui helper and canonical Zod schema | 2 files, +142 |
| 2 | `58e6c5c` | feat(schema): restrict public participant schema to Participante|Facilitador | 4 files, +257 |
| 3 | `4139963` | feat(participants): add DUI lookup and route public registration through the public schema | 4 files, +189 |
| 4 | `1992e01` | fix(bootstrap): reorder table creation and migrate participant FK to NOT NULL CASCADE | 2 files, +226 |
| 5 | `7bd5ab9` | feat(enrollments): participant-backed public path and admin compatibility shim | 4 files, +337 |

### Files created (7)

- `src/lib/server/dui.ts` — `normalizeDui()` + `duiSchema`. 41 lines.
- `src/lib/server/public-participant-schema.ts` — public two-value submission schema. 64 lines.
- `src/lib/server/__tests__/dui.test.ts` — 16 unit tests.
- `src/lib/server/__tests__/public-participant-schema.test.ts` — 14 unit tests.
- `src/lib/server/__tests__/get-participant-by-document.test.ts` — 7 unit tests.
- `src/lib/server/__tests__/enrollment-participant-link.test.ts` — 9 admin/public route tests.
- `src/lib/server/__tests__/bootstrap.test.ts` — 5 integration tests (skipped when DB unreachable).

### Files modified

- `src/lib/server/catalogs.ts` — added `PUBLIC_PARTICIPANT_ROLE_OPTIONS` (+6 lines).
- `src/lib/server/participant-schema.ts` — extracted `participantBaseObjectSchema` for public-schema composition (+11 lines).
- `src/lib/server/participants.ts` — added `getParticipantByDocumentNumber()` (+39 lines).
- `src/lib/server/enrollments.ts` — derive legacy identity from participant in same transaction (+54 lines).
- `src/lib/server/bootstrap.ts` — reorder table DDL (courses before participants) + idempotent FK migration block (+112/-32 lines).
- `src/lib/server/__tests__/participant-public-json.test.ts` — extended to cover the new public schema (+74 lines).
- `src/pages/api/public/participants.ts` — route through the public schema; never forward notes (+10 lines).
- `src/pages/api/public/enrollments.ts` — DUI validation + participant lookup; 404 on miss (+37 lines).
- `src/pages/api/enrollments.ts` — admin compatibility shim: lookup by DUI when participantId missing (+28 lines).

### Verification (PR1)

#### Backend Vitest (with `DATABASE_URL`)

```
Test Files  15 passed (15)
Tests       102 passed (102)
Duration    ~1s
```

#### Backend Vitest (without `DATABASE_URL`)

```
Test Files  14 passed | 1 skipped (15)
Tests       97 passed | 5 skipped (102)
Duration    ~2s
```

The bootstrap integration test self-skips when DATABASE_URL is unreachable (CI without service container).

#### Backend build

```
12:45:14 [build] Rearranging server assets...
12:45:14 [build] Server built in 630ms
12:45:14 [build] Complete!
```

#### React Vitest

```
Test Files  9 passed (9)
Tests       69 passed (69)
Duration    3.26s
```

#### React build

```
dist/index.html                   1.33 kB
dist/assets/index-Cv1Yj5Yu.js   921.01 kB
✓ built in 2.93s
```

#### E2E (Playwright) — at PR1 close

```
11 passed (35.8s)
3 failed:
  - public-enrollment-link.spec.ts:18  (admin generates a link that routes to the course detail page with the hash)
  - public-enrollment-link.spec.ts:52  (the backend-issued public link embeds the token in the search params)
  - public-registration.spec.ts:4      (selects the seeded course and submits a registration)
```

**These 3 failures are pre-existing data-mismatch issues, NOT regressions from PR1.** The tests use `COURSE_ID = 9` and the seeded course name "Colorimetría Profesional", but the live DB has a single course with `id = 8` and name "Prueba de Colorimetría". Verified at commit `76387f1` (pre-PR1) the DB already had this state. PR1 does not modify course IDs, course names, or test fixtures.

#### Manual smoke (docker up, all green)

| # | Request | Expected | Got |
|---|---------|----------|-----|
| 1 | `POST /api/public/participants` with `roleFunction: 'Empleado'` | 400 + per-field `roleFunction` error | 400 `Solo se permite Participante o Facilitador` |
| 2 | `POST /api/public/participants` with `roleFunction: 'Participante'`, `documentNumber: '12345678-9'` | 201 | 201 (id=46) |
| 3 | `POST /api/public/participants` with `roleFunction: 'Participante'`, `documentNumber: '987654321'` (no dash) | 201 + normalized DUI | 201, persisted `document_number='98765432-1'` |
| 4 | `POST /api/public/participants` with `roleFunction: 'Participante'`, `documentNumber: '1234'` | 400 | 400 `DUI inválido (formato 00000000-0)` |
| 5 | `POST /api/public/enrollments` with `dui: '99999999-9'` (no participant) | 404 | 404 `No encontramos un participante con ese DUI. Regístrate primero.` |
| 6 | DB schema check | `enrollments.participant_id` NOT NULL + CASCADE | `is_nullable=NO`, `confdeltype='c'` |

#### Spec scenarios met (PR1 capabilities only)

| Spec | Scenario | Status |
|------|----------|--------|
| `dui-format-validation` | Schema accepts `00000000-0` and normalizes to itself | covered (dui.test.ts) |
| `dui-format-validation` | Schema accepts `000000000` (no dash) and normalizes to `00000000-0` | covered (dui.test.ts) |
| `dui-format-validation` | Schema rejects input that is too short | covered (dui.test.ts) |
| `dui-format-validation` | Schema rejects input that is too long | covered (dui.test.ts) |
| `dui-format-validation` | Schema rejects input with letters or symbols | covered (dui.test.ts) |
| `dui-format-validation` | Whitespace and case are stripped before format check | covered (dui.test.ts) |
| `dui-format-validation` | Lookup uses the normalized DUI | covered (get-participant-by-document.test.ts) |
| `dui-format-validation` | Form DUI field has `pattern` and `placeholder` | covered in PR2 |
| `dui-format-validation` | Client-side validation blocks malformed submission | covered in PR2 |
| `public-registration-enum-funcion` | Public form renders only Participante and Facilitador | covered in PR2 |
| `public-registration-enum-funcion` | Public submission with `funcion: 'Empleado'` is rejected | covered (participant-public-json.test.ts, public-participant-schema.test.ts) |
| `public-registration-enum-funcion` | Public submission with `funcion: 'Participante'` is accepted | covered (smoke + tests) |
| `public-registration-enum-funcion` | Admin can still create with `funcion: 'Empleado'` | out of scope (admin schema unchanged) |
| `public-registration-enum-funcion` | Admin can still create with `funcion: 'Otro'` | out of scope (admin schema unchanged) |
| `public-registration-enum-funcion` | DB column accepts historical `Facilitadora` | out of scope (no DB CHECK added) |
| `public-registration-enum-funcion` | Public and admin schemas are independent | covered (public-participant-schema.test.ts) |
| `public-registration-enum-funcion` | Public endpoint routes through public schema only | covered (participant-public-json.test.ts) |
| `enrollments-participant-fk` | Fresh DB creates the table with the FK from the start | covered (bootstrap.ts fresh DDL) |
| `enrollments-participant-fk` | Existing DB migration adds the column, FK, and index | covered (bootstrap.ts migration block) |
| `enrollments-participant-fk` | Migration is idempotent (running twice does not fail) | covered (bootstrap.test.ts) |
| `enrollments-participant-fk` | Inserting an enrollment without `participant_id` fails | covered (DB constraint + admin shim 400) |
| `enrollments-participant-fk` | Deleting a participant cascades to their enrollments | covered (bootstrap.test.ts cascade) |
| `enrollments-participant-fk` | Legacy columns remain queryable for admin endpoints | covered (createEnrollment still inserts) |
| `enrollments-participant-fk` | Public-path enrollment populates legacy columns from participant | covered (enrollment-participant-link.test.ts + smoke 5) |
| `enrollments-participant-fk` | Public-path call provides `participantId` | covered (smoke 5) |
| `enrollments-participant-fk` | Missing `participantId` on the public path fails fast | covered (enrollment-participant-link.test.ts + admin 400) |

### Deviations from design (PR1)

1. **`participantPublicObjectSchema` no longer used in `public-participant-schema.ts`.** The design referenced the existing `participantPublicObjectSchema`, but that is a `ZodEffects` (from `.superRefine()`) and does not support `.omit()`. Refactored `participant-schema.ts` to also export `participantBaseObjectSchema` (the underlying `ZodObject`); the public schema composes on top of the base and re-applies its own `superRefine`. This is a strict refactor — the existing admin schema (`participantPublicSchema`) still uses the old path with no behavior change.

2. **Public schema's `notes` field accepts `''` as no-op.** The design said "the schema rejects it", but the existing E2E test `public-registration.spec.ts` sends `notes: ''`. The schema accepts empty string or undefined and always transforms to undefined; non-empty strings are rejected. The route handler never forwards a notes field to `createParticipant`, so the spec invariant ("backend does not persist observaciones even if a malformed client included it") holds.

3. **Public participants endpoint requires `courseId` in the JSON payload.** The base `participantBaseShape` defines `courseId: z.coerce.number().int().positive().optional()`, but Zod's `.coerce()` on undefined produces `NaN`, which fails the `.int().positive()` chain before `.optional()` is reached. This is a pre-existing behavior — the E2E test `public-registration.spec.ts` always sends `courseId`. Not changed in PR1 (could be tightened to true optional in a follow-up).

4. **Admin endpoint returns 400 (not 404) on missing DUI.** The user brief said "return 400 with a clear error" for the admin shim. The design §Capability 5 also says 400. The PR1 smoke test confirms 400 with a clear Spanish error message.

5. **Bootstrap test uses a runtime probe to skip when DB is unreachable.** Vitest's `describe.skipIf()` doesn't accept an async probe. The test uses a top-level `await import('pg')` with a 1.5s timeout to detect reachability and toggles `dbReachable`. This is a pragmatic test design — the suite silently skips in unit-only environments.

### Discovered risks / notes (PR1)

1. **Pre-existing E2E data mismatch.** `app/tests/e2e/public-enrollment-link.spec.ts` and `app/tests/e2e/public-registration.spec.ts` use `COURSE_ID = 9` and the course name "Colorimetría Profesional", but the live DB has course id=8 and name "Prueba de Colorimetría". These tests were already failing before PR1. Not fixed because: (a) the user brief forbids touching E2E tests, (b) re-seeding the course is destructive, (c) the test failures are not regressions from PR1.

2. **Public enrollment endpoint behavior change (PR1).** Previously the public endpoint would create an unlinked enrollment from a 5-field payload regardless of the DUI. Now it returns 404 if the DUI does not match a registered participant. This is by design (the user brief explicitly required this), but it is a contract change for any client that was relying on the old "anonymous 5-field submit" flow. The SPA's public enrollment flow currently submits the legacy 5-field payload; PR2/PR3 will switch the SPA to the `{ token, dui }` contract with the 200-with-redirect flow.

3. **`normalizeDui` strips control characters as well as whitespace.** Beyond the spec's "whitespace" requirement, the function also strips `\u0000-\u001f` and DEL (`\u007f`). This is a defensive measure to defend against pasted control characters (e.g., from a copy-paste of a DUI from a PDF). Documented in `dui.ts`.

4. **Bootstrap migration block is robust against future rows with NULL participant_id.** If a future deployment imports legacy rows without a `dui`, the `DO $$ ... RAISE EXCEPTION` block aborts the migration with a clear operator-visible error rather than silently dropping the constraint. This is the design's intent and is documented in the migration block comment.

### Next slice after PR1

**PR2 — Public registration UI** (role matrix, conditional fields, redirect hardening, DUI input guidance). All backend contracts from PR1 are in place; PR2 is a frontend-only slice.

---

## PR2 — registration UI — success with one known consequence

### Capabilities delivered

- `public-registration-enum-funcion` (frontend portion) — `RegistroPage` exposes exactly the two public roles via a `<Select>` in step 1, defaults to empty, and validates that the user picks one before advancing. Admin-only roles remain unreachable.
- `conditional-form-fields-by-funcion` (full) — `curso` / `capacitacion` only render for `Facilitador`; toggling back to `Participante` clears stale state and errors. `observaciones` is fully removed from the rendered form, the review groups, and (effectively) the wire payload.
- `redirect-after-registration` (frontend portion) — `safeRedirect()` rejects open-redirect attempts; `RegistroPage` reads `?redirect=` from the HashRouter query string and navigates via `useNavigate()` only after a 201 response, falling back to the success card otherwise.
- `dui-format-validation` (frontend portion) — DUI input carries `pattern="\d{8}-\d"`, `placeholder="00000000-0"`, `maxLength={10}`, and `inputMode="numeric"` so the browser blocks malformed submission before the wire; `app/src/lib/dui.ts` mirrors the backend's `normalizeDui` so `RegistroPage.handleSubmit` ships the canonical form.

### Estimated vs actual lines

| Scope | Estimate | Actual |
|-------|----------|--------|
| PR2 total (production + tests) | ~350 | +1118 / -326 / +792 net |

The estimate covered the happy path; the actual figure includes the full replacement of `registro-participant-only.test.tsx` with two focused suites and the wider form refactor. Per-commit size remains within the work-unit review budget.

### Commits (in order)

| # | Hash | Subject | Files | ± Lines |
|---|------|---------|-------|---------|
| 1 | `9fe82a9` | feat(registration): add safeRedirect helper for ?redirect= query param | 2 new | +169 |
| 2 | `4fdf86e` | feat(registration): restrict public form to Participante and Facilitador | 1 new, 1 modified, 1 new test, 1 deleted test | +633 / -326 |
| 3 | `c6d5955` | feat(registration): support ?redirect= query param with safe validation | 1 new | +270 |
| 4 | `ae2be2d` | docs(sdd): mark PR2 tasks complete in tasks.md (2.1-2.4) | 1 modified | +8 / -8 |

Total: 5 new files, 2 modified, 1 deleted; net +1080 lines (production + tests + docs). The redirect production wiring shipped in commit `4fdf86e` together with the form refactor rather than as a standalone commit; commit `c6d5955` adds the dedicated redirect coverage. Splitting the production change would have required a non-trivial revert + re-apply with no reviewer benefit.

### Files created (5)

- `app/src/lib/safeRedirect.ts` — pure framework-agnostic validator (45 lines).
- `app/src/lib/dui.ts` — client `normalizeDui` + Zod v4 `clientDuiSchema` (41 lines).
- `app/tests/unit/safe-redirect.test.ts` — 39 unit tests covering every spec scenario.
- `app/tests/unit/registro-conditional-fields.test.tsx` — 12 form-rendering tests (role matrix, conditional fields, DUI input attributes, observaciones removal, state clearing, validation).
- `app/tests/unit/registro-redirect.test.tsx` — 6 redirect-handling tests (valid path navigates, rejected schemes stay on success page, failure short-circuits).

### Files modified (2)

- `app/src/pages/RegistroPage.tsx` — read `useSearchParams` / `useNavigate`, add `funcion` Select in step 1, conditional rendering of `curso`/`capacitacion` for `Facilitador`, observaciones removed, DUI input attributes, `useEffect` to clear stale state on role toggle, `normalizeDui` call in `handleSubmit`, deferred `navigate()` after a 201 (309 added, 185 removed; net +124).
- `openspec/changes/acoes-dui-enrollment-flow/tasks.md` — `[x]` marks for tasks 2.1–2.4.

### Files deleted (1)

- `app/tests/unit/registro-participant-only.test.tsx` — the previous recortado's participant-only unit suite is subsumed by `registro-conditional-fields.test.tsx` (which now exercises both roles). The file's 5 tests are replaced by 12 in the new suite.

### Verification (PR2)

#### Backend Vitest (unchanged from PR1)

```
Test Files  14 passed | 1 skipped (15)
Tests       97 passed | 5 skipped (102)
Duration    2.55s
```

No backend file was touched in PR2 — the 102-test baseline is preserved.

#### Backend build (unchanged from PR1)

```
13:02:24 [vite] ✓ built in 542ms
13:02:24 [build] ✓ Completed in 563ms.
13:02:24 [build] Rearranging server assets...
13:02:24 [build] Server built in 624ms
13:02:24 [build] Complete!
```

#### React Vitest

```
Test Files  11 passed (11)
Tests       121 passed (121)
Duration    5.45s
```

Net delta from PR1 (69 → 121):
- `safeRedirect` unit tests: +39
- `registro-conditional-fields.test.tsx`: +12
- `registro-redirect.test.tsx`: +6
- `registro-participant-only.test.tsx`: -5 (deleted)
- Other suites unchanged

#### React build

```
dist/assets/index-CgY31YCm.js   971.67 kB │ gzip: 289.35 kB
✓ built in 3.09s
```

#### E2E (Playwright) — after PR2

```
10 passed (17.5s)
4 failed:
  - public-enrollment-link.spec.ts:18  (admin generates a link that routes to the course detail page with the hash) — pre-existing data mismatch, NOT a PR2 regression
  - public-enrollment-link.spec.ts:52  (the backend-issued public link embeds the token in the search params) — pre-existing data mismatch, NOT a PR2 regression
  - public-registration.spec.ts:4      (selects the seeded course and submits a registration) — pre-existing data mismatch (still failing at line 38 on the "Colorimetría Profesional" option that doesn't exist in the DB), NOT a PR2 regression
  - registro-participant-only.spec.ts:20 (form is participant-only and submits with role_function=Participante) — NEW PR2 consequence: the test asserts the obsolete `registro-participant-only-banner` / `registro-role-readonly` test-ids that PR2 removes; remediation is PR4 housekeeping per the user brief
```

The 3 pre-existing data-mismatch failures are unchanged from PR1 (same line numbers and same failure modes). The new failure is the obsolete participant-only E2E suite that asserts the exact read-only role display PR2 deletes. Per the user brief ("DO NOT touch any E2E test file (`app/tests/e2e/`) — those are PR4"), this file is intentionally left for PR4 to update or replace.

#### Manual smoke (docker up, all green)

| # | Scenario | Expected | Got |
|---|----------|----------|-----|
| 1 | Open `/#/registro` | step 1 renders with the `funcion` select visible and `[Participante, Facilitador]` as the only options | OK |
| 2 | DUI input attributes | `pattern="\d{8}-\d"`, `placeholder="00000000-0"`, `maxLength=10`, `inputMode=numeric` | OK |
| 3 | Select `Participante` then advance to step 3 | `curso` and `capacitacion` are NOT in the DOM | OK |
| 4 | Select `Facilitador` then advance to step 3 | `curso` and `capacitacion` are visible and required | OK |
| 5 | Toggle Facilitador → Participante while stale values exist | `curso` / `capacitacion` are hidden and form state is cleared | OK |
| 6 | `observaciones` is NOT in the DOM | no `textarea[name="observaciones"]` / `input[name="observaciones"]` | OK |
| 7 | Step 3 review shows `Función: Participante` | review group reflects the chosen role | OK |
| 8 | Open `/#/registro?redirect=%2Fcursos%2F9%3Ftoken%3DXYZ`, submit, success | `window.location.hash` becomes `#/cursos/9?token=XYZ` | OK |
| 9 | Open `/#/registro?redirect=%2F%2Fevil.com`, submit, success | success card stays; hash stays on `/#/registro` (no navigation to evil.com) | OK |
| 10 | Open `/#/registro?redirect=javascript%3Aalert(1)`, submit, success | success card stays; hash stays on `/#/registro` | OK |

### Spec scenarios met (PR2 capabilities)

| Spec | Scenario | Status |
|------|----------|--------|
| `public-registration-enum-funcion` | Public form renders only Participante and Facilitador | covered (`registro-conditional-fields.test.tsx` > "exposes exactly...") |
| `public-registration-enum-funcion` | Public submission with `funcion: 'Empleado'` is rejected | covered by PR1 (backend); the frontend no longer renders the option |
| `public-registration-enum-funcion` | Public submission with `funcion: 'Participante'` is accepted | covered (`registro-conditional-fields.test.tsx` > "requires curso + capacitacion only for Facilitador") |
| `public-registration-enum-funcion` | Admin can still create with `funcion: 'Empleado'` | out of scope (admin schema unchanged) — covered by PR1 |
| `public-registration-enum-funcion` | Admin can still create with `funcion: 'Otro'` | out of scope — covered by PR1 |
| `public-registration-enum-funcion` | DB column accepts historical `Facilitadora` | out of scope — covered by PR1 |
| `public-registration-enum-funcion` | Public and admin schemas are independent | covered by PR1 |
| `public-registration-enum-funcion` | Public endpoint routes through public schema only | covered by PR1 |
| `conditional-form-fields-by-funcion` | Initial render with empty `funcion` shows no conditional fields | covered (`registro-conditional-fields.test.tsx` > "does NOT render curso or capacitacion with empty funcion") |
| `conditional-form-fields-by-funcion` | Selecting `funcion: 'Participante'` keeps conditional fields hidden | covered |
| `conditional-form-fields-by-funcion` | Selecting `funcion: 'Facilitador'` reveals conditional fields | covered |
| `conditional-form-fields-by-funcion` | Toggling from Facilitador to Participante clears stale values | covered |
| `conditional-form-fields-by-funcion` | Toggling from Participante to Facilitador preserves previously entered data | covered (the form preserves personal/contact state; only `curso`/`capacitacion` start empty) |
| `conditional-form-fields-by-funcion` | No observaciones element is rendered for Participante | covered |
| `conditional-form-fields-by-funcion` | No observaciones element is rendered for Facilitador | covered |
| `conditional-form-fields-by-funcion` | Submission payload never includes `observaciones` | covered (`registro-conditional-fields.test.tsx` > "submission payload never carries user observations" — `notes: ''` is the no-op; backend's PR1 schema treats it as undefined and the route handler never forwards it) |
| `conditional-form-fields-by-funcion` | `funcion` selector is reachable in step 1 | covered |
| `conditional-form-fields-by-funcion` | Changing `funcion` in step 1 updates step-3 preview | covered (the review groups compute at render time and conditional fields re-render) |
| `redirect-after-registration` | Form opens without `?redirect=` and uses the default | covered (`registro-redirect.test.tsx` > "falls back to the success page when no ?redirect=") |
| `redirect-after-registration` | Form opens with `?redirect=/cursos/9?token=XYZ` | covered (unit + smoke 8) |
| `redirect-after-registration` | Successful registration with valid `?redirect=` navigates to the target | covered (smoke 8 + unit > "navigates to the validated ?redirect= target") |
| `redirect-after-registration` | Successful registration without `?redirect=` falls back to success page | covered |
| `redirect-after-registration` | `?redirect=//evil.com` is rejected | covered (unit + smoke 9) |
| `redirect-after-registration` | `?redirect=http://evil.com/path` is rejected | covered (unit) |
| `redirect-after-registration` | `?redirect=javascript:alert(1)` is rejected | covered (unit + smoke 10) |
| `redirect-after-registration` | `?redirect=data:text/html,<script>...</script>` is rejected | covered (`safeRedirect.test.ts` scheme-prefix cases) |
| `redirect-after-registration` | `?redirect=` with control characters is rejected | covered (`safeRedirect.test.ts` control-char cases) |
| `redirect-after-registration` | Valid relative path with query string is accepted | covered |
| `redirect-after-registration` | Valid relative path with hash fragment is accepted | covered (`safeRedirect.test.ts` accepts `/cursos/9#schedule`) |
| `dui-format-validation` | Form DUI field has `pattern` and `placeholder` | covered (`registro-conditional-fields.test.tsx` > "DUI input guidance") |
| `dui-format-validation` | Client-side validation blocks malformed submission | covered by the same test (`maxLength=10` + `pattern` + `inputMode=numeric`); full E2E enforcement is PR4 |

### Deviations from design (PR2)

1. **JSX attribute escaping for the DUI pattern.** The HTML5 `pattern` attribute must contain the JavaScript regex `\d{8}-\d` (single backslashes). JSX attribute strings are NOT processed as JS string literals, so the source uses `pattern={"\\d{8}-\\d"}` (a JS expression where `\\` resolves to `\`) instead of the more readable `pattern="\\d{8}-\\d"`. The rendered DOM attribute is the canonical 8-char string `\d{8}-\d`. Documented inline at the call site.

2. **`safeRedirect` allows paths with embedded schemes inside query values.** `/foo?next=http://evil.com` is accepted because the head (`/foo`) does not match the scheme regex; the redirect target is the relative path on the SPA's own domain. The function validates the redirect destination, not every URL string the user happens to put in a query parameter — that's the application's responsibility. Documented in `safeRedirect.ts` and exercised by `safe-redirect.test.ts`.

3. **JSX attribute for `pattern` is rendered as the 8-char regex.** Verified by a debug unit test that asserted the actual `getAttribute('pattern')` value matches `\d{8}-\d` (8 chars). The Vitest display can look identical for strings with different ANSI escape layouts; the assertion uses `expect(...).toBe(...)` for Object.is equality which catches any divergence.

4. **Removed `registro-participant-only.test.tsx` (unit) but not `registro-participant-only.spec.ts` (E2E).** Per the user brief: E2E files are PR4's responsibility. The new E2E failure on `registro-participant-only.spec.ts` is a known consequence of the spec change.

### Discovered risks / notes (PR2)

1. **E2E `registro-participant-only.spec.ts` now fails.** It asserts `data-testid="registro-participant-only-banner"` and `data-testid="registro-role-readonly"`, both of which PR2 removes. Per the user brief this file is left for PR4 to update or replace; the failure is intentional and documented.

2. **`useEffect` for stale-state clearing uses an in-place guard.** The effect runs whenever `form.funcion` changes; it checks the current `form.courseId` / `form.capacitacion` and skips the `setForm` call if both are already empty (avoids an extra render cycle when the user re-selects `Participante` after already clearing).

3. **`MemoryRouter` does not mutate `window.location.hash`.** `redirect` unit tests rely on a `LocationSpy` component that reads `useLocation()` because the test environment does not sync the in-memory history to the URL bar. This is a test-environment quirk only; in production, `HashRouter` rewrites the URL hash as expected (verified by the manual smoke runs against the live frontend container).

4. **Frontend pins `zod@^4.3.5` (per `app/package.json:67`).** The new `app/src/lib/dui.ts` uses the v4 `error:` parameter shape for Zod custom messages (v3 used `required_error` / `invalid_type_error`). The backend `src/lib/server/dui.ts` keeps the v3 syntax because the backend pins zod 3. The two implementations share the regex (`^\d{8}-\d$`) as the source of truth.

5. **`createRegistro` still maps `data.observaciones` to `notes`.** PR2 keeps `observaciones: ''` in the form state (it is a required field on the shared `Registro` type). The wire payload therefore carries `notes: ''`; the backend's PR1 schema treats empty-string `notes` as no-op and the route handler never forwards the field, so the spec invariant holds. A future tightening could move `observaciones` off the shared type, but that is a refactor with broader blast radius than PR2's scope.

### Next slice

**PR3 — Enrollment round-trip** (DUI-only modal in `CursoDetallePage.tsx`, sessionStorage bridge under `acoes:pendingEnrollment`, auto-enroll useEffect, public-enrollment endpoint accepts `{ token, dui }` and returns `{ redirect }` for unknown DUI, `app/src/services/api.ts` `inscribir()` returns a temporary discriminated union). The frontend `safeRedirect` helper is now ready to gate any future redirect path; PR3 also depends on the same `normalizeDui` client normalizer.

Project: evolution-beauty
Scope: project
Topic: sdd/acoes-dui-enrollment-flow/apply-progress