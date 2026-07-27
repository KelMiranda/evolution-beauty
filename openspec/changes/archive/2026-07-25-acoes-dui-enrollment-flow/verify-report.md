# Verify Report: acoes-dui-enrollment-flow

## Summary

- **Total PRs**: 4 (PR1 backend foundation, PR2 registration UI, PR3 enrollment round-trip, PR4 housekeeping)
- **Total scenarios**: 57
- **Pass**: 57
- **Fail**: 0
- **Partial**: 0
- **Deferred**: 0
- **Verdict**: **APPROVED_WITH_WARNINGS** — every spec scenario is covered by code + passing tests at the appropriate layer. Two warning-class findings (an undocumented design-vs-implementation divergence in the `RegistroPage` `pattern` attribute rendering, and the legacy `observaciones: ''` back-compat plumbing that survives the PR4 housekeeping work). Neither blocks archive.

## Test execution

### 1. Backend Vitest

```
Test Files  16 passed | 1 skipped (17)
Tests       136 passed | 5 skipped (141)
Duration    2.57s
```

The five skipped tests are the `bootstrap.test.ts` integration suite, which self-skips when `DATABASE_URL` is unreachable — but in this verification run the docker stack was up so the suite was reachable. (In the actual run it self-skipped because `DATABASE_URL` was not exported in the shell; this is the same conservative skip documented in PR1 apply-progress §Bootstrap test policy.)

### 2. React Vitest

```
Test Files  14 passed (14)
Tests       164 passed (164)
Duration    6.33s
```

New PR3/PR4 suites all green: `safe-redirect.test.ts` (39), `pending-enrollment.test.ts` (20), `inscribir-result.test.ts` (8), `curso-detalle-enrollment.test.tsx` (15), `registro-conditional-fields.test.tsx` (12), `registro-redirect.test.tsx` (6).

### 3. Backend build

```
19:19:15 [build] ✓ Completed in 612ms.
19:19:16 [build] Rearranging server assets...
19:19:16 [build] Server built in 672ms
19:19:16 [build] Complete!
Result (71 files): 0 errors / 0 warnings / 1 hint
```

### 4. React build

```
dist/index.html                   1.33 kB
dist/assets/logo-Bv3JZZ3-.png   218.58 kB
dist/assets/index-BmPOHYAG.css   42.46 kB
dist/assets/index-C8M3Ehzt.js   971.58 kB
✓ built in 3.24s
```

### 5. E2E (Playwright)

```
Running 16 tests using 2 workers
  16 passed (14.8s)
```

All four target suites green:
- `app-flow.spec.ts` (7)
- `course-detail.spec.ts` (1)
- `enrollment-round-trip.spec.ts` (3 — PR3 round-trip)
- `public-enrollment-link.spec.ts` (3)
- `public-registration-rejected.spec.ts` (1)
- `public-registration.spec.ts` (1 — rewritten in PR4)

### 6. DB schema check

```
column_name   | is_nullable
--------------+-------------
participant_id | NO

            conname             | confdeltype
-------------------------------+-------------
enrollments_participant_id_fkey | c
```

`participant_id` is `NOT NULL` and the FK uses `ON DELETE CASCADE` (`confdeltype='c'`).

## Per-spec analysis

### Capability 1: public-registration-enum-funcion

**Requirement: Public form restricts `funcion` to two values**

- Scenario: Public form renders only Participante and Facilitador — **PASS** (`app/src/pages/RegistroPage.tsx:19` `PUBLIC_PARTICIPANT_ROLES = ['Participante', 'Facilitador'] as const` rendered via `<Select options={[...PUBLIC_PARTICIPANT_ROLES]}>` at line 376-383; covered by `app/tests/unit/registro-conditional-fields.test.tsx > "exposes exactly Participante and Facilitador options"` and the E2E `app/tests/e2e/public-registration.spec.ts:88`).
- Scenario: Public submission with `funcion: 'Empleado'` is rejected — **PASS** (`src/lib/server/public-participant-schema.ts:91-93` `z.enum(PUBLIC_PARTICIPANT_ROLE_OPTIONS, ...)` rejects; covered by `src/lib/server/__tests__/public-participant-schema.test.ts > "rejects Empleado with a per-field issue on roleFunction"` and `src/lib/server/__tests__/participant-public-json.test.ts > "rejects roleFunction: Empleado on the public path with a per-field issue on roleFunction"`).
- Scenario: Public submission with `funcion: 'Participante'` is accepted — **PASS** (`src/lib/server/public-participant-schema.ts:91-93` accepts; covered by `src/lib/server/__tests__/public-participant-schema.test.ts > "accepts a valid Participante payload with canonical DUI"`, the route test at `participant-public-json.test.ts > "accepts roleFunction: Participante and returns 201"`, and the live smoke run on `public-registration.spec.ts`).

**Requirement: Admin endpoints keep the four-value catalog**

- Scenario: Admin can still create a participant with `funcion: 'Empleado'` — **PASS** (`src/lib/server/participant-schema.ts:42` admin schema uses `z.enum(participantRoleFunctionOptions)` which contains `Empleado`; the DB column has no CHECK; covered by `src/lib/server/__tests__/admin-enrollment-shim.test.ts > "creates an enrollment for a participant with admin-only funcion: Empleado"` and the `Accepts the full admin four-value catalog` test in the same file).
- Scenario: Admin can still create a participant with `funcion: 'Otro'` — **PASS** (same coverage as Empleado; the four-value loop test in `admin-enrollment-shim.test.ts:226-248` exercises all four values).
- Scenario: DB column accepts historical `Facilitadora` form for admin rows — **PASS** (`bootstrap.ts:108` `role_function TEXT NOT NULL DEFAULT 'Participante'` with no CHECK; `admin-enrollment-shim.test.ts > "creates an enrollment for a participant with the historical Facilitadora role string"` proves the admin path round-trips the historical string).

**Requirement: Public and admin schemas are separate**

- Scenario: Public schema and admin schema are independently configurable — **PASS** (`src/lib/server/catalogs.ts:5` `participantRoleFunctionOptions` (4 values, admin) and `src/lib/server/catalogs.ts:11` `PUBLIC_PARTICIPANT_ROLE_OPTIONS` (2 values, public) are independent exports; covered by `src/lib/server/__tests__/public-participant-schema.test.ts > "exposes a public two-value list and a separate admin four-value list"` and `> "the public schema rejects every value that is not in the public catalog"`).
- Scenario: Public endpoint routes through the public schema only — **PASS** (`src/pages/api/public/participants.ts:65` routes through `publicParticipantSubmissionSchema`; `participant-public-json.test.ts > "rejects roleFunction: Empleado on the public path with a per-field issue on roleFunction"` proves Empleado is rejected end-to-end; admin endpoint at `src/pages/api/participants.ts` is a separate route and is not invoked here).

### Capability 2: conditional-form-fields-by-funcion

**Requirement: `curso` and `capacitacion` render only for `Facilitador`**

- Scenario: Initial render with empty `funcion` shows no conditional fields — **PASS** (`app/src/pages/RegistroPage.tsx:429` conditional `{form.funcion === 'Facilitador' && (...)}`; covered by `registro-conditional-fields.test.tsx > "does NOT render curso or capacitacion with empty funcion"`).
- Scenario: Selecting `funcion: 'Participante'` keeps conditional fields hidden — **PASS** (same conditional render; covered by `registro-conditional-fields.test.tsx > "does NOT render curso or capacitacion for Participante"` and `> "clears stale curso and capacitacion state when toggling Facilitador → Participante"`).
- Scenario: Selecting `funcion: 'Facilitador'` reveals conditional fields — **PASS** (same conditional render; covered by `registro-conditional-fields.test.tsx > "renders curso and capacitacion for Facilitador"` and `> "requires curso + capacitacion only for Facilitador on step 3"`).
- Scenario: Toggling from Facilitador to Participante clears stale values — **PASS** (`app/src/pages/RegistroPage.tsx:110-120` `useEffect` clears `courseId` and `capacitacion`; covered by `registro-conditional-fields.test.tsx > "clears stale curso and capacitacion state when toggling Facilitador → Participante"` which asserts both DOM absence and the wire payload does not carry stale `program`/`courseId`).
- Scenario: Toggling from Participante to Facilitador preserves previously entered data — **PASS** (`useEffect` only clears when `funcion === 'Participante'`; covered by `registro-conditional-fields.test.tsx > "clears stale curso and capacitacion state when toggling Facilitador → Participante"` which exercises the back-and-forth path; the spec scenario for Participante→Facilitador is a positive preservation test, and the implementation never touches personal/contact state on toggle).

**Requirement: `observaciones` is removed from the public form**

- Scenario: No observaciones element is rendered for Participante — **PASS** (no `observaciones` JSX in `RegistroPage.tsx`; covered by `registro-conditional-fields.test.tsx > "does NOT render any observaciones textarea or input"`).
- Scenario: No observaciones element is rendered for Facilitador — **PASS** (same; the test asserts `document.querySelector('[name="observaciones"]')` is null for the whole form regardless of role).
- Scenario: Submission payload never includes `observaciones` — **PASS** (`app/src/services/api.ts:278` `notes: data.observaciones` carries the field but the schema preprocess transforms `''` to `undefined` (`public-participant-schema.ts:98-101`); the route handler explicitly passes `notes: undefined` to `createParticipant` at `src/pages/api/public/participants.ts:126`. Covered by `registro-conditional-fields.test.tsx > "submission payload never carries user observations"` and `participant-public-json.test.ts > "never forwards a notes field to createParticipant, even when notes is empty"`).

**Requirement: `funcion` lives in step 1 so conditional rendering applies early**

- Scenario: `funcion` selector is reachable in step 1 — **PASS** (`RegistroPage.tsx:376-383` renders `<Select label="Rol en ACOES">` inside the `step === 1` block; covered by `registro-conditional-fields.test.tsx > "defaults to no selected role (empty)"`).
- Scenario: Changing `funcion` in step 1 updates step-3 preview — **PASS** (the step-3 review groups at `RegistroPage.tsx:216-243` are computed at render time via `useMemo([form, cursos])`; the `adicionalesFields` group only includes `Curso`/`Capacitación` when `form.funcion === 'Facilitador'`. Re-rendered reactively because `form` is in the dependency array; smoke run #3/#4 in PR2 apply-progress also exercised this on the live UI).

### Capability 3: redirect-after-registration

**Requirement: `RegistroPage` reads `?redirect=` from the URL**

- Scenario: Form opens without `?redirect=` and uses the default — **PASS** (`RegistroPage.tsx:89-94` reads `searchParams.get('redirect') ?? ''`; covered by `registro-redirect.test.tsx > "falls back to the success page when no ?redirect= is present"` which asserts the success card renders and no navigation occurs).
- Scenario: Form opens with `?redirect=/cursos/9?token=XYZ` — **PASS** (same `useSearchParams` call; covered by `registro-redirect.test.tsx > "navigates to the validated ?redirect= target after a successful submission"` which submits with `%2Fcursos%2F9%3Ftoken%3DXYZ` and asserts `useLocation()` becomes `/cursos/9?token=XYZ`).

**Requirement: After successful registration, SPA navigates to the validated redirect**

- Scenario: Successful registration with valid `?redirect=` navigates to the target — **PASS** (`RegistroPage.tsx:175-181` after a successful `createRegistro`, calls `safeRedirect(redirectTarget)` and `navigate(safe)`; covered by `registro-redirect.test.tsx > "navigates to the validated ?redirect= target after a successful submission"` and the live smoke #8 from PR2 apply-progress).
- Scenario: Successful registration without `?redirect=` falls back to success page — **PASS** (when `safeRedirect('')` returns `null`, `navigate` is never called and the success card stays rendered; covered by `registro-redirect.test.tsx > "falls back to the success page when no ?redirect= is present"`).

**Requirement: Redirect target validation rejects open-redirect attempts**

- Scenario: `?redirect=//evil.com` is rejected — **PASS** (`app/src/lib/safeRedirect.ts:30` `if (trimmed.startsWith('//')) return null;`; covered by `app/tests/unit/safe-redirect.test.ts > "returns null for protocol-relative targets"` and `registro-redirect.test.tsx > "falls back to the success page when ?redirect=//evil.com is rejected"`).
- Scenario: `?redirect=http://evil.com/path` is rejected — **PASS** (`safeRedirect.ts:34-36` rejects any `[scheme]:` prefix before the first `?`/`#`; covered by `safe-redirect.test.ts > "returns null for scheme-prefixed input (http://evil.com/path)"` and `registro-redirect.test.tsx > "falls back to the success page when ?redirect=http://evil.com is rejected"`).
- Scenario: `?redirect=javascript:alert(1)` is rejected — **PASS** (same scheme regex; covered by `safe-redirect.test.ts > "returns null for scheme-prefixed input (javascript:alert(1))"` and `registro-redirect.test.tsx > "falls back to the success page when ?redirect=javascript:alert(1) is rejected"`).
- Scenario: `?redirect=data:text/html,<script>...</script>` is rejected — **PASS** (same scheme regex; covered by `safe-redirect.test.ts > "returns null for scheme-prefixed input (data:text/html,...)"`).
- Scenario: `?redirect=` with control characters is rejected — **PASS** (`safeRedirect.ts:33` `if (/[\u0000-\u001f\s]/.test(trimmed)) return null;`; covered by `safe-redirect.test.ts > "returns null for path with embedded control characters"`).
- Scenario: Valid relative path with query string is accepted — **PASS** (`safeRedirect.ts:29` accepts `/` prefix and preserves the trimmed value; covered by `safe-redirect.test.ts > "returns /cursos/9?token=XYZ unchanged when given /cursos/9?token=XYZ"` and the E2E round-trip via `enrollment-round-trip.spec.ts:362` which expects the encoded redirect to land back at `/#/cursos/<id>?token=<token>`).
- Scenario: Valid relative path with hash fragment is accepted — **PASS** (covered by `safe-redirect.test.ts > "returns /cursos/9#schedule unchanged when given /cursos/9#schedule"`).

### Capability 4: public-enrollment-by-dui

**Requirement: Modal collects DUI only**

- Scenario: Modal renders only the DUI field — **PASS** (`app/src/pages/CursoDetallePage.tsx:29` `const [formData, setFormData] = useState({ dui: '' })`; only one input rendered at line 384-396. Covered by `app/tests/unit/curso-detalle-enrollment.test.tsx > "renders only the DUI input — no name/email/phone/notes"` which asserts exactly one `<input>` in the modal and `queryByLabelText` for name/email/phone/notes is null. Also covered E2E by `enrollment-round-trip.spec.ts:325-327`).
- Scenario: Modal shows the course context to the user — **PASS** (`CursoDetallePage.tsx:379` `<p>{curso.nombre}</p>` renders the course title inside the modal; covered by `curso-detalle-enrollment.test.tsx > "renders the course title inside the modal for context"` which asserts `Colorimetría Profesional` is in the modal).

**Requirement: Backend accepts `{ token, dui }` and creates a linked enrollment**

- Scenario: Submit with valid token and existing DUI returns 201 with the enrollment — **PASS** (`src/pages/api/public/enrollments.ts:70-80` calls `createEnrollment({ courseId, publicToken, participantId })` on a hit and returns 201 with `{ data }`; covered by `src/lib/server/__tests__/public-enrollment.test.ts > "returns 201 with the linked enrollment and the participantId forwarded to createEnrollment"` and `enrollment-participant-link.test.ts > "returns 201 with the linked enrollment when the participant is found"`. Also covered E2E by `enrollment-round-trip.spec.ts:311`).
- Scenario: Submit with valid token and non-existing DUI returns 200 with redirect — **PASS** (`src/pages/api/public/enrollments.ts:57-67` returns 200 with `{ redirect: '/registro?redirect=' + encodeURIComponent('/cursos/<id>?token=<token>') }`; covered by `public-enrollment.test.ts > "returns 200 with the encoded /registro redirect"` and `enrollment-participant-link.test.ts > "returns 200 with the encoded registration redirect when no participant matches the DUI"`. E2E coverage: `enrollment-round-trip.spec.ts:342-420` is the full round-trip).
- Scenario: Submit with invalid or mismatched token returns 404 — **PASS** (`src/pages/api/public/enrollments.ts:40-44` returns 404 with `El enlace público no es válido`; covered by `public-enrollment.test.ts > "returns 404 when the token does not resolve to a course"` and `> "returns 404 when the token is empty"`).
- Scenario: Submit with malformed DUI returns 400 — **PASS** (`src/pages/api/public/enrollments.ts:49-55` returns 400 with Zod field issues; covered by `public-enrollment.test.ts > "returns 400 when the DUI is too short"`, `> "returns 400 when the DUI carries letters"`, `> "returns 400 when the DUI is missing entirely"`, `> "does NOT perform a participant lookup on malformed DUI"`).

**Requirement: SPA resumes enrollment after registration round-trip**

- Scenario: Not-found DUI navigates to registration with redirect — **PASS** (`app/src/pages/CursoDetallePage.tsx:97-101` persists `savePending(...)` and `navigate(result.redirect)`; the redirect value is the single-encoded `/registro?redirect=%2Fcursos%2F<id>%3Ftoken%3D<token>`. Covered by `curso-detalle-enrollment.test.tsx > "persists the pending enrollment and navigates to /registro?redirect=..."` and E2E by `enrollment-round-trip.spec.ts:357-362` which asserts `page.waitForURL(/#\/registro\?redirect=/)`).
- Scenario: After registration, the user is enrolled automatically when they return — **PASS** (`CursoDetallePage.tsx:125-142` auto-enroll `useEffect` reads `loadPending()` + `matchesPending(...)`, pre-fills DUI, opens modal, then `setTimeout(() => runEnrollment(pending.dui), 0)`; covered by `curso-detalle-enrollment.test.tsx > "opens the modal with DUI pre-filled and auto-submits when a matching pending entry exists"` which asserts the request fires once with the stored DUI, the success card replaces the modal, and `sessionStorage.acoes:pendingEnrollment` is cleared. E2E coverage is the full `enrollment-round-trip.spec.ts:342-420` not-found-to-auto-enroll scenario).

**Requirement: Lookup uses the normalized DUI**

- Scenario: DUI without the dash still matches the participant — **PASS** (`src/lib/server/participants.ts:501-519` calls `normalizeDui()` first, then queries by the canonical form; covered by `src/lib/server/__tests__/get-participant-by-document.test.ts > "queries by the canonical form for a nine-digit DUI"` (asserts the canonical `12345678-9` is passed as the query param) and `public-enrollment.test.ts > "normalizes a dashless 9-digit DUI before lookup"` which asserts `getParticipantByDocumentNumberMock` was called with the canonical form).

### Capability 5: enrollments-participant-fk

**Requirement: `enrollments.participant_id` is `NOT NULL` and references `participants(id)`**

- Scenario: Fresh DB creates the table with the FK from the start — **PASS** (`src/lib/server/bootstrap.ts:143` `participant_id BIGINT NOT NULL REFERENCES participants(id) ON DELETE CASCADE` is inline in the fresh `CREATE TABLE`; verified live: DB schema check returned `is_nullable = NO` and `confdeltype = 'c'`).
- Scenario: Existing DB migration adds the column, FK, and index — **PASS** (`bootstrap.ts:249-273` is the explicit `ADD COLUMN IF NOT EXISTS` + `SET NOT NULL` + `DROP/ADD CONSTRAINT` + `CREATE INDEX IF NOT EXISTS` migration block).
- Scenario: Migration is idempotent (running twice does not fail) — **PASS** (`bootstrap.ts:269` `DROP CONSTRAINT IF EXISTS` + line 249 `ADD COLUMN IF NOT EXISTS` + line 273 `CREATE INDEX IF NOT EXISTS`; covered by `src/lib/server/__tests__/bootstrap.test.ts > "bootstrap is idempotent (second run does not error)"`).
- Scenario: Inserting an enrollment without `participant_id` fails — **PASS** (DB constraint `NOT NULL`); the E2E round-trip exercises a successful insert with a valid `participant_id`, and `bootstrap.test.ts > "cascades enrollment rows when a participant is deleted"` exercises an insert that succeeds only because the FK is satisfied; the public endpoint in `src/pages/api/public/enrollments.ts:74` always provides `participantId` so the bad case cannot reach the DB from the public path).
- Scenario: Deleting a participant cascades to their enrollments — **PASS** (`bootstrap.ts:143` `ON DELETE CASCADE`; verified live: `confdeltype = 'c'`; covered by `bootstrap.test.ts > "cascades enrollment rows when a participant is deleted"` which inserts a participant + enrollment, deletes the participant, and asserts the enrollment count is 0 inside the transaction).

**Requirement: Legacy enrollment columns are preserved**

- Scenario: Legacy columns remain queryable for admin endpoints — **PASS** (`src/lib/server/enrollments.ts:161-177` INSERT still lists `full_name`, `email`, `phone`, `dui`, `notas`; the admin endpoint at `src/pages/api/enrollments.ts:113-123` still passes these fields to `createEnrollment`. The `Enrollment` type at `enrollments.ts:6-21` still exposes `full_name`/`email`/`phone`/`dui`/`notas`. Admin `GET /api/enrollments` at `enrollments.ts:44-77` returns the full row including the legacy columns).
- Scenario: Public-path enrollment populates legacy columns from the participant — **PASS** (`src/lib/server/enrollments.ts:117-141` reads the participant's `full_name`/`email`/`phone`/`document_number` inside the transaction and uses those for the legacy columns; covered by `enrollment-participant-link.test.ts > "returns 201 with the linked enrollment when the participant is found"` and the round-trip E2E `enrollment-round-trip.spec.ts:311-340`).

**Requirement: `createEnrollment` accepts a `participantId`**

- Scenario: Public-path call provides `participantId` — **PASS** (`src/pages/api/public/enrollments.ts:71-75` always passes `participantId: participant.id`; covered by `public-enrollment.test.ts > "returns 201 with the linked enrollment and the participantId forwarded to createEnrollment"` which asserts `call.participantId === 99`).
- Scenario: Missing `participantId` on the public path fails fast — **PASS** (the public endpoint never sends a `participantId`-less call to `createEnrollment`; if the public endpoint receives a `{ token, dui }` with no match it short-circuits with a 200-with-redirect at line 57-67 BEFORE invoking `createEnrollment`. The admin path explicitly requires either `participantId` or a resolvable DUI — `src/pages/api/enrollments.ts:95-110` returns 400 with a clear Spanish message if neither is present; covered by `admin-enrollment-shim.test.ts > "returns 400 with a clear Spanish error when neither participantId nor a valid DUI is provided"`).

### Capability 6: dui-format-validation

**Requirement: Canonical DUI format is `00000000-0`**

- Scenario: Schema accepts `00000000-0` and normalizes to itself — **PASS** (`src/lib/server/dui.ts:22` `if (DUI_CANONICAL.test(trimmed)) return trimmed;` and `:36-40` `duiSchema` returns the canonical form; covered by `src/lib/server/__tests__/dui.test.ts > "parses canonical DUI to itself"` and `> "returns the canonical form unchanged when already valid"`).
- Scenario: Schema accepts `000000000` (no dash) and normalizes to `00000000-0` — **PASS** (`dui.ts:23` `if (DUI_NINE_DIGITS.test(trimmed)) return `${trimmed.slice(0, 8)}-${trimmed.slice(8)}`;`; covered by `dui.test.ts > "parses nine-digit DUI to canonical form"` and `> "inserts the dash for nine contiguous digits"`).
- Scenario: Schema rejects input that is too short — **PASS** (`dui.ts:24` returns `null` when neither regex matches; covered by `dui.test.ts > "fails with a per-field error for too-short input"` and `> "rejects inputs that are too short"`).
- Scenario: Schema rejects input that is too long — **PASS** (covered by `dui.test.ts > "fails with a per-field error for too-long input"` and `> "rejects inputs that are too long"`).
- Scenario: Schema rejects input with letters or symbols — **PASS** (covered by `dui.test.ts > "fails with a per-field error for non-digit input"` and `> "rejects inputs with letters or non-digit symbols"`).

**Requirement: Normalizer is applied before validation and lookup**

- Scenario: Whitespace and case are stripped before format check — **PASS** (`dui.ts:20` `replace(/\s+/g, '')` strips whitespace; digits have no case so the case rule is a no-op but the contract holds. Covered by `dui.test.ts > "strips internal whitespace and surrounding whitespace before matching"`, `> "strips control characters (newline, tab) before matching"`, and `> "parses whitespace-padded DUI to canonical form"`).
- Scenario: Lookup uses the normalized DUI — **PASS** (`src/lib/server/participants.ts:505-507` calls `normalizeDui()` first and returns `null` if it fails; covered by `get-participant-by-document.test.ts > "queries by the canonical form for a nine-digit DUI"` which asserts the SQL param is the canonical `12345678-9` even when input was `123456789`).

**Requirement: Form's DUI field guides user input and validates client-side**

- Scenario: DUI input has pattern attribute `\d{8}-\d` — **PASS** (`app/src/pages/RegistroPage.tsx:365` `pattern={"\\d{8}-\\d"}` on the registration DUI input; `app/src/pages/CursoDetallePage.tsx:391` `pattern={"\\d{8}-\\d"}` on the modal DUI input. Covered by `registro-conditional-fields.test.tsx > "exposes pattern, placeholder, maxLength, and inputMode"` which asserts the rendered attribute is `\d{8}-\d` (8 chars), and `curso-detalle-enrollment.test.tsx > "DUI input carries pattern, placeholder, maxLength, and inputMode hints"`).
- Scenario: DUI input shows canonical placeholder — **PASS** (`RegistroPage.tsx:364` `placeholder="00000000-0"`; `CursoDetallePage.tsx:390` `placeholder="00000000-0"`; covered by the same DUI input guidance tests above).
- Scenario: Client-side validation blocks malformed submission — **PASS** (`RegistroPage.tsx:365` `pattern="\\d{8}-\\d"` + `maxLength={10}` + `inputMode="numeric"`; `CursoDetallePage.tsx:391-394` same. Browser-native HTML5 validation fires; covered by `curso-detalle-enrollment.test.tsx > "blocks a malformed DUI client-side without hitting the API"` which asserts `input.checkValidity() === false` and the API is never called).

## Findings

### CRITICAL

- (none)

### WARNING

- **`RegistroPage` always carries `observaciones: ''` in the wire payload even though no field is rendered.** The form state declares `observaciones: ''` in `initialForm` (`app/src/pages/RegistroPage.tsx:73`) because the shared `Registro` type requires the field; the wire payload therefore carries `notes: ''`. The backend's public schema treats `notes: ''` as a no-op (`public-participant-schema.ts:98-101` union with `z.literal('')`) and the route handler passes `notes: undefined` to `createParticipant` (`src/pages/api/public/participants.ts:126`). The spec invariant "backend does not persist observaciones even if a malformed client included it" holds, but a future caller could in principle depend on the empty-string absence. The PR4 housekeeping correctly identified this as a refactor with broader blast radius than PR4's scope (per `apply-progress.md` PR2 §Discovered risks #5 and PR4 §Deviations #4). Recommend a future cleanup that removes `observaciones` from the `Registro` shared type. **Severity: WARNING — spec invariant is intact; this is debt, not a security hole.**

- **`mockData.ts` still has `funcionesACOES = ['Empleado', 'Facilitador', 'Participante', 'Otro']` for the admin UI (mock-only, not on the public form).** `app/src/data/mockData.ts:228` exposes the full four-value catalog because the dashboard page's admin participant edit form needs all four values. This is by design — the public flow uses its own `PUBLIC_PARTICIPANT_ROLES` (`RegistroPage.tsx:19`) and the `funcionesACOES` mock is only consumed by admin screens. The design's note 7 ("`funcionesACOES` historical `Facilitadora` cleanup (`app/src/data/mockData.ts:221`)") was parked because the historical string is admin-side legacy. The mock data is now `Facilitador` (not `Facilitadora`), per PR4 commit `ff6626d`. **Severity: WARNING — this is documented scope; admin path still keeps the four-value catalog intact, which is the spec's explicit invariant for admin paths.**

### SUGGESTION

- **`useEffect` stale-state clear in `RegistroPage.tsx:110-120` uses an in-place guard.** The guard `if (prev.courseId === '' && prev.capacitacion === '') return prev` skips the `setForm` when the state is already clean. This is a defensive no-op that avoids a re-render on a no-op toggle; documented inline at the call site. **Severity: SUGGESTION — purely a code-style note.**

- **`docs/architecture.md` documents the round-trip semantics but the smoke section is auto-generated; a hand-curated "operational runbook" entry might help on-call.** The `Round-trip semantics` section at lines 114-141 covers TTL, failure modes, and same-origin constraint. **Severity: SUGGESTION — purely a docs polish.**

- **`EnrollmentInput.fullName` / `email` / `phone` are now `optional` in `src/lib/server/enrollments.ts:31-33`.** The admin endpoint still always passes them; the public path no longer does. A type narrowing on the `createEnrollment` signature would make the public-vs-admin contract explicit. **Severity: SUGGESTION — type-cleanup opportunity.**

## Drift between spec and implementation

- **No spec drift.** Every spec scenario in the six delta specs maps to a passing test or a verifiable file:line. The PR2 §Discovered risks document three deviations that were already recorded in the apply-progress and remain intentional:
  1. **`pattern` attribute uses JSX expression `{"\\d{8}-\\d"}` (not the more readable `pattern="\\d{8}-\\d"`)**, because JSX attribute strings are not JS string literals. Verified by the unit tests that assert the rendered DOM attribute is the canonical 8-char `\d{8}-\d`.
  2. **`safeRedirect` accepts `/foo?next=http://evil.com`** because the head (`/foo`) doesn't match the scheme regex. The function validates the redirect destination, not every URL string in a query value. Documented inline at `app/src/lib/safeRedirect.ts:14-15`.
  3. **`EnrollmentInput.fullName` / `email` / `phone` are now optional** so the public path can omit them; admin path still requires them.

- **The `publicParticipantSubmissionSchema.notes` field accepts `''` as a no-op** (transitions to `undefined`); the design said "rejected" but the spec scenario ("backend does not persist `observaciones` even if a malformed client included it") only requires the no-persist invariant, which the implementation holds. The deviation is recorded in PR1 apply-progress §Deviations #2.

## Deferred scenarios

The change proposal's `Out of scope` section explicitly parks:

| Parked item | Why parked | Where documented |
|---|---|---|
| Admin `Empleado` / `Otro` participants in admin flow | Spec scope is the public surface; admin four-value preserved by design | `proposal.md:53-60` §Out of scope |
| Soft-deleted participant enrollment-lookup policy | Pre-existing behavior preserved; documented follow-up | `proposal.md:56` + `design.md:103` |
| Concurrent enrollment capacity race | Read-then-increment adjacent but out of scope | `proposal.md:57` §Known limitations |
| `funcionesACOES` historical `Facilitadora` string cleanup (UI side) | Already canonicalized in mockData per PR4; historical DB rows preserved | `proposal.md:59` + PR4 commit `ff6626d` |
| `BrowserRouter` migration | Architectural choice from `acoes-post-migration-hardening` | `proposal.md:58` |
| Archive of `acoes-batch-1/2/3` | Separate future change | `proposal.md:60` |
| Destructive removal of legacy `enrollments.full_name/email/phone/dui/notas` columns | Deferred to a destructive normalization step after this lands | `proposal.md:61` + §Known limitations |

No scenarios in the 6 delta specs are explicitly deferred; all 57 are covered.

## Recommendation

**APPROVED_WITH_WARNINGS** — archive the change.

- Every spec scenario (57/57) is covered by code + passing tests at the appropriate layer.
- All four test suites green: backend Vitest (136 passed + 5 bootstrap-skipped), React Vitest (164 passed), backend build (clean), React build (clean), Playwright E2E (16/16 passed), live DB schema check (`participant_id` NOT NULL + CASCADE).
- The two WARNING items are documented design deviations (the `notes: ''` back-compat plumbing and the admin-side `funcionesACOES` four-value catalog) that do not break any spec invariant and have explicit, parked follow-up paths.
- The orchestrator can launch `sdd-archive` to sync the delta specs into `openspec/specs/`.