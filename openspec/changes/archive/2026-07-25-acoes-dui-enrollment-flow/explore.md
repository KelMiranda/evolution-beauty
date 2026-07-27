## Exploration: acoes-dui-enrollment-flow

### Current state
- Public registration is a three-step React form. It is currently participant-only: `PUBLIC_FORM_ROLE` is hardcoded to `Participante`, the form state always includes a course, training program, and observations, and step 3 requires a course regardless of role (`app/src/pages/RegistroPage.tsx:8-14`, `app/src/pages/RegistroPage.tsx:51-57`, `app/src/pages/RegistroPage.tsx:80-101`). Step 1 collects personal data, step 2 contact/location, and step 3 reviews all data before showing course, organization, a read-only role, education, training, observations, and consent (`app/src/pages/RegistroPage.tsx:285-365`). A successful submission renders an inline success view; no redirect query parameter is read (`app/src/pages/RegistroPage.tsx:115-145`, `app/src/pages/RegistroPage.tsx:174-199`).
- The course detail page resolves a public token and checks that it belongs to the route course (`app/src/pages/CursoDetallePage.tsx:27-43`). Its enrollment modal collects name, email, phone, optional DUI, and (in state/payload) notes; client validation requires the first three fields (`app/src/pages/CursoDetallePage.tsx:21-24`, `app/src/pages/CursoDetallePage.tsx:59-85`, `app/src/pages/CursoDetallePage.tsx:310-350`).
- Public participant validation uses the shared four-value catalog (`Empleado`, `Facilitador`, `Participante`, `Otro`) and accepts optional course/program/notes (`src/lib/server/catalogs.ts:3-18`, `src/lib/server/participant-schema.ts:24-51`). The public endpoint normalizes JSON, validates it with that shared schema, checks duplicates, and creates a participant with status forced to `Pendiente` (`src/pages/api/public/participants.ts:39-79`, `src/pages/api/public/participants.ts:85-126`). Admin create still uses the shared schema, while admin PATCH deliberately accepts arbitrary strings for `roleFunction` (`src/pages/api/participants.ts:11-34`, `src/pages/api/participants.ts:94-169`, `src/pages/api/participants.ts:229-259`).
- Public enrollment validates the token first, then requires full name, email, and phone; DUI and notes are optional. It creates an enrollment without a participant lookup or `participantId` (`src/pages/api/public/enrollments.ts:21-38`, `src/pages/api/public/enrollments.ts:47-56`; `src/lib/server/course-schema.ts:108-116`). `createEnrollment` supports an optional participant ID, rejects active duplicates only when that ID is present, copies denormalized identity fields into the row, increments course capacity, audits, and notifies (`src/lib/server/enrollments.ts:81-109`, `src/lib/server/enrollments.ts:118-159`).
- Public links already have the required hash route and encoded token (`src/pages/api/courses/[id]/public-link.ts:61-70`); token resolution returns course identity/capacity (`src/pages/api/public/courses/enrollment.ts:6-34`).
- Schema evolution lives in idempotent `bootstrap.ts`; there is no migrations directory. `participants.role_function` is `TEXT NOT NULL DEFAULT 'Participante'` with no role-function CHECK. `enrollments.participant_id` exists but is nullable and references participants with `ON DELETE SET NULL`; legacy `full_name`, `email`, and `phone` are NOT NULL (`src/lib/server/bootstrap.ts:51-83`, `src/lib/server/bootstrap.ts:128-143`). The running PostgreSQL schema confirms these constraints, the active-course/participant unique partial index, and 0 participants / 0 enrollments.
- Existing E2E coverage encodes the superseded participant-only behavior and five-field enrollment-era assumptions. `registro-participant-only.spec.ts` asserts no role select and a hardcoded participant payload (`app/tests/e2e/registro-participant-only.spec.ts:3-17`, `app/tests/e2e/registro-participant-only.spec.ts:70-125`). `public-registration.spec.ts` selects a mandatory course and submits notes/program (`app/tests/e2e/public-registration.spec.ts:33-76`). `public-enrollment-link.spec.ts` verifies link generation/navigation but does not exercise modal enrollment or registration resumption (`app/tests/e2e/public-enrollment-link.spec.ts:17-78`). Unit coverage under `app/tests/unit/registro-participant-only.test.tsx` and backend tests such as `src/lib/server/__tests__/participant-public-json.test.ts` also encode the old role policy.

### Affected areas
- `app/src/pages/RegistroPage.tsx` — role selection, conditional fields/validation, removal of observations, and post-registration redirect.
- `app/src/pages/CursoDetallePage.tsx` — DUI-only modal and redirect response handling.
- `app/src/services/api.ts` — new public registration/enrollment payload and redirect-result contracts.
- `app/src/types/index.ts` — remove public observations assumptions and introduce a DUI enrollment result shape without breaking admin enrollment views.
- `src/lib/server/participant-schema.ts` — separate restrictive public role/conditional schema from permissive admin behavior.
- `src/lib/server/course-schema.ts` — replace the public five-field enrollment schema with a DUI lookup schema; retain admin enrollment validation separately if needed.
- `src/pages/api/public/participants.ts` — reject non-public roles and ignore/remove public notes; support conditional facilitator fields.
- `src/pages/api/public/enrollments.ts` — lookup by DUI, return redirect when absent, and enroll by participant ID when found.
- `src/lib/server/participants.ts` — add/reuse an exact DUI lookup helper; preserve admin creation/edit paths.
- `src/lib/server/enrollments.ts` — require participant linkage for the public path and populate legacy identity columns from the participant during transition.
- `src/lib/server/bootstrap.ts` — migrate FK nullability/delete behavior and add the appropriate role constraint strategy.
- `src/lib/server/catalogs.ts` — add a dedicated public function catalog while preserving the four-value admin catalog.
- `app/src/data/mockData.ts` — canonicalize `Facilitador` and/or expose a separate public two-value list; existing dashboard usage must remain compatible.
- Registration/enrollment unit, backend, and E2E tests — replace participant-only assertions and cover found/not-found/resume paths.

### Touch points (per file)
- `app/src/pages/RegistroPage.tsx`:
  - current: participant-only three-step form; course is always required; training and observations always render; success is terminal.
  - target: role select in step 1 with only `Participante`/`Facilitador`; course and training render/validate only for facilitator; observations removed; successful registration safely resumes `redirect`.
  - edge cases: changing Facilitador to Participante must clear stale course/training values and errors; malformed/absolute redirect targets must not permit open redirects; HashRouter query handling must preserve encoded token.
- `app/src/pages/CursoDetallePage.tsx`:
  - current: five-field modal and direct create.
  - target: required DUI only; navigate to backend-provided registration redirect when participant is absent; retain token and course context.
  - edge cases: malformed DUI, missing/invalid token, token-course mismatch, duplicate enrollment, full/unavailable course, repeated submit.
- `app/src/services/api.ts` and `app/src/types/index.ts`:
  - current: `inscribir` maps a full `InscripcionCurso`; registration always sends observations.
  - target: explicit public DUI request/result union (`enrollment` or `redirect`) and registration payload without observations.
  - edge cases: avoid treating redirect responses as enrollments; preserve admin list/detail types that still expose denormalized legacy columns.
- `src/lib/server/participant-schema.ts` / `src/lib/server/catalogs.ts`:
  - current: one four-role schema is shared by public and authenticated create.
  - target: dedicated public schema with a two-role enum and conditional facilitator requirements; admin catalog/schema remains four-role.
  - edge cases: reject `Empleado`, `Otro`, historical `Facilitadora`, omitted role, and facilitator without course/training; participant payloads should normalize omitted conditional fields.
- `src/pages/api/public/participants.ts`:
  - current: accepts notes/course/program through shared schema.
  - target: enforce public schema and field matrix; never persist public observations.
  - edge cases: duplicate DUI currently reaches a DB unique violation after duplicate detection; define a stable conflict response instead of 500.
- `src/pages/api/public/enrollments.ts`:
  - current: requires name/email/phone, optional DUI, and creates an unlinked enrollment.
  - target: require valid DUI and token, exact-match participant lookup, return `{ redirect }` when absent, otherwise create linked enrollment.
  - edge cases: normalize DUI consistently for lookup without creating ambiguous matches; URL-encode token and constrain redirect to the SPA route; return 409 for duplicate/full states.
- `src/lib/server/participants.ts`:
  - current: duplicate search exists but combines supplied match predicates with `AND` and is not a simple identifier lookup (`src/lib/server/participants.ts:516-562`).
  - target: exact, reusable `getParticipantByDocumentNumber` helper, preferably excluding soft-deleted participants unless policy says otherwise.
  - edge cases: whitespace/case/punctuation normalization and inactive participants require explicit policy.
- `src/lib/server/enrollments.ts`:
  - current: optional `participantId`; identity fields required independently; participant FK can be null.
  - target: public creation is participant-backed and derives identity from the participant in the same transaction; admin compatibility may use a separate input/path.
  - edge cases: lock/capacity race is not fully prevented by the current read-then-update transaction; concurrent duplicate inserts rely on the unique index and need mapped errors.
- `src/lib/server/bootstrap.ts`:
  - current: bootstrap DDL is the migration mechanism; participant FK is nullable/SET NULL; legacy identity fields are NOT NULL; no role-function CHECK.
  - target: safely alter existing schema to `participant_id NOT NULL REFERENCES participants(id) ON DELETE CASCADE`; decide whether legacy identity columns remain populated during compatibility; add a constraint that does not block admin-only Empleado/Otro.
  - edge cases: `CREATE TABLE IF NOT EXISTS` does not alter existing FK definitions; the constraint must be explicitly dropped/recreated. A global two-role DB CHECK conflicts with the stated admin permissiveness.
- Tests:
  - current: participant-only role policy and mandatory-course behavior are asserted; public-link tests stop before enrollment.
  - target: unit/backend/E2E coverage for role matrix, DUI found/not-found, safe redirect/resume, duplicate enrollment, and token preservation.
  - edge cases: avoid fixed course IDs and flaky DUI generators where possible; isolate DB state or generate deterministic unique identifiers.

### Data model changes
- `participants.funcion` (database column `role_function`): currently no DB CHECK; Zod uses the four-value admin catalog. Target public enforcement should use a dedicated Zod enum `['Participante', 'Facilitador']`. A global two-value DB CHECK is NOT compatible with the explicit requirement that admin may retain `Empleado`/`Otro`. Recommended DB enforcement is either keep a four-value canonical CHECK for all rows plus strict public Zod, or introduce provenance/type data before attempting a public-only DB constraint. Both API-level and global four-value DB validation are safe now.
- `enrollments.participant_id`: currently nullable, FK `ON DELETE SET NULL`; target is NOT NULL with `ON DELETE CASCADE`. Because the DB is empty, bootstrap can explicitly drop/recreate the FK and set NOT NULL without backfill. Keep legacy identity columns temporarily and derive them server-side from the participant to minimize admin/report breakage; removing them is a separate destructive normalization step.

### Risks and unknowns
- Requirement conflict: “participants.funcion restricted to two values ideally by DB CHECK” conflicts with “admin can still create/edit Empleado/Otro.” A global two-value CHECK would break admin behavior. Proposal should state strict public Zod + four-value global CHECK unless admin scope changes.
- Redirect safety is unspecified. Accepting arbitrary `?redirect=` values creates an open-redirect risk. Restrict to relative SPA paths beginning with `/`, reject `//`, schemes, control characters, and registration self-loops.
- HashRouter semantics matter: the browser-visible source is `/#/registro?redirect=...`; React Router reads the query inside the hash. The return target should be encoded once, e.g. `/registro?redirect=${encodeURIComponent(`/cursos/${id}?token=${token}`)}`.
- DUI validation is currently only minimum length 3 (`src/lib/server/participant-schema.ts:27`), so “malformed DUI” behavior is undefined. A canonical Salvadoran format/normalizer must be specified before implementation.
- Inactive/soft-deleted participants are not covered by the requested flow. Enrollment lookup should probably exclude `deleted_at IS NOT NULL` and return the registration/assistance path, but duplicate document uniqueness then prevents re-registration.
- Facilitator registration currently triggers a pending notification, but the condition also notifies every public `Pendiente` participant with facilitator wording (`src/lib/server/participants.ts:295-303`). The new public role choice exposes this existing semantic bug.
- `bootstrap.ts` creates `participants` before `courses` in the same SQL batch while referencing `courses` (`src/lib/server/bootstrap.ts:51-55`, `src/lib/server/bootstrap.ts:97-126`). It works only on already-evolved databases; a fresh bootstrap may fail. The enrollment migration should not worsen this latent ordering issue.
- Current capacity logic performs a non-locking read followed by increment, so concurrent enrollment can oversubscribe. This is adjacent to, but not necessarily required by, the change.
- `funcionesACOES` still uses historical `Facilitadora` (`app/src/data/mockData.ts:221`) while the server catalog uses canonical `Facilitador` (`src/lib/server/catalogs.ts:5`). Public UI must use the canonical singular form; admin catalog compatibility should be updated deliberately.

### Approach options for the new change

1. **Compatibility-first participant-backed enrollment** — add dedicated public schemas and DUI lookup, require `participant_id`, but keep legacy enrollment identity columns populated from the participant.
   - Pros: satisfies the flow; preserves admin lists, exports, notifications, and existing `Enrollment` shape; smaller rollback surface; allows incremental normalization later.
   - Cons: temporary data duplication remains; bootstrap must alter FK/nullability explicitly; public/admin schema boundaries need care.
   - Effort: Medium

2. **Immediate normalized enrollment model** — remove `full_name`, `email`, `phone`, `dui`, and `notas` from enrollments and join participants everywhere.
   - Pros: clean normalized source of truth; eliminates identity drift.
   - Cons: broad destructive change across admin APIs/UI, exports, notifications, tests, and certificates; substantially exceeds this flow’s scope and review budget.
   - Effort: High

### Recommendation
Use the compatibility-first approach. Define proposal/spec capabilities in this order: (1) public registration role matrix and no-observations contract, (2) safe registration continuation redirect, (3) token-bound DUI enrollment with found/not-found outcomes, (4) participant-backed enrollment integrity, and (5) regression coverage. Implement dedicated public Zod schemas rather than narrowing shared admin catalogs. Alter `enrollments.participant_id` to NOT NULL/CASCADE while deriving legacy identity fields from the participant in one transaction. Add a four-value DB CHECK for `role_function` (not a two-value global CHECK) and document that the two-value restriction is a public-interface invariant.

### Estimated scope
- Files: approximately 16-20 (6-8 production frontend/backend files, bootstrap/catalog/type updates, and 6-8 unit/integration/E2E tests).
- Lines: approximately 900-1,300 changed lines including tests.
- Single PR or chained: chained/stacked delivery recommended because the 800-line review budget is likely exceeded. Suggested slices: PR1 backend schemas/data integrity + API tests; PR2 registration UI/redirect + tests; PR3 DUI modal/resume E2E and cleanup. Per preflight `ask-always`, the orchestrator must ask the user before applying this delivery strategy.

### Ready for Proposal
Yes. The orchestrator should tell the user the flow is implementable and the DB is empty, but proposal must explicitly resolve three policies: strict public-only role enforcement versus global DB constraints, safe relative redirect validation, and DUI normalization/inactive-participant behavior. Recommend the compatibility-first model and request approval for chained delivery before apply.
