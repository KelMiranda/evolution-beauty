# Design: acoes-dui-enrollment-flow

## Context

`acoes-dui-enrollment-flow` replaces the participant-only, five-field enrollment flow with a role-aware public registration (`Participante` / `Facilitador`) and a DUI-lookup public enrollment backed by a real `enrollments.participant_id` FK. The change spans six capabilities (`openspec/changes/acoes-dui-enrollment-flow/specs/{public-registration-enum-funcion,conditional-form-fields-by-funcion,redirect-after-registration,public-enrollment-by-dui,enrollments-participant-fk,dui-format-validation}/spec.md`) and resolves four open questions explicitly named in the orchestrator brief:

1. **PR partitioning** — Spec 3 (`redirect-after-registration`) and Spec 4 (`public-enrollment-by-dui`) co-govern the round-trip. They MUST land in the same PR.
2. **Auto-enroll UX** — pick one of `auto-retry` / `modal re-open` / `state-driven`.
3. **DUI regex exact** — specify the canonical regex and normalizer transform.
4. **DB CHECK for admin `Empleado` / `Otro`** — choose global CHECK vs. no CHECK.

Proposal: `openspec/changes/acoes-dui-enrollment-flow/proposal.md`. Audit: `explore.md`. Code baseline: this document cites `src/lib/server/participant-schema.ts`, `src/lib/server/enrollments.ts`, `src/lib/server/participants.ts`, `src/lib/server/catalogs.ts`, `src/lib/server/bootstrap.ts`, `src/lib/server/course-schema.ts`, `src/pages/api/public/participants.ts`, `src/pages/api/public/enrollments.ts`, `src/pages/api/enrollments.ts`, `app/src/pages/RegistroPage.tsx`, `app/src/pages/CursoDetallePage.tsx`, `app/src/services/api.ts`, `app/src/main.tsx`. DB state: 0 participants, 0 enrollments (cleaned per prior session).

## Decisions Made in This Design

### Decision 1 — PR partitioning: Spec 3 and Spec 4 land together

**Choice**: One PR (`PR3 — enrollment round-trip`) ships Specs 3 and 4 together.

**Rationale**: The round-trip requires (a) `safeRedirect()` in `app/src/lib/safeRedirect.ts`, (b) the new `redirect` field in the public enrollment response (`src/pages/api/public/enrollments.ts`), (c) sessionStorage state for the post-registration auto-enroll, (d) `RegistroPage` reading `?redirect=` from HashRouter, and (e) `CursoDetallePage` reading that state and re-firing. Splitting into two PRs leaves a window where the registration page navigates after success but no enrollment happens on the return — broken round-trip, untestable in isolation.

**Consequence**: `PR3` is the largest PR in the chain (~600-700 LOC). The work-unit-commits skill demands we keep tests with the change: Spec 3 unit tests + Spec 4 E2E round-trip land in the same commit. Per `sdd-phase-common.md` §E, 400-line budget is at risk; we mitigate by ensuring prior PRs are tight and PR3 has a single reviewable diff.

### Decision 2 — Auto-enroll UX: state-driven sessionStorage with brief modal

**Choice**: When the public enrollment endpoint returns `{ redirect }`, the SPA stores `{ dui, courseId, token, ts }` in `sessionStorage` under `acoes:pendingEnrollment`, navigates to `/registro`, and after the user completes registration and the SPA lands back on `/cursos/<id>?token=<token>`, the modal opens with the DUI pre-filled and the enrollment auto-submits in a 0-tick `setTimeout` so React renders the open state first.

**Rationale**: 
- *Auto-retry* alone (no modal) hides the side-effect from the user — surprising and un-testable from the UI.
- *Modal re-open* alone loses the DUI across the navigation (we'd have to leak it via the URL, which is a privacy regression).
- *State-driven* keeps the DUI in tab-bound memory, the modal opens so the user sees what happened, and the auto-submit makes the round-trip zero-friction. Tests: a Vitest unit can read the sessionStorage value and assert the modal auto-submit fires; a Playwright E2E can drive `goto(/#/cursos/9?token=X)` with the key pre-seeded and assert `success=true` without any click.
- The spec scenario "After registration, the user is enrolled automatically when they return" allows "automatic retry OR reopening the modal and re-submitting"; we do both.

**Failure modes**: (a) sessionStorage missing/expired → user lands on course detail normally and can re-enroll manually. (b) Auto-submit fails (course full, etc.) → modal stays open with the error, user can dismiss. (c) User navigates away before auto-submit → sessionStorage key is still there; on next visit to that course with the same token the auto-retry fires again (we mitigate with a `ts` TTL check — 10 minutes).

### Decision 3 — DUI regex: `^\d{8}-\d$` with whitespace stripping and 9-digit dash insertion

**Choice**: One normalizer function used by both the backend public schema and the SPA input handling:

```ts
// src/lib/server/dui.ts
const DUI_CANONICAL = /^\d{8}-\d$/;
const DUI_NINE_DIGITS = /^\d{9}$/;

export function normalizeDui(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.replace(/\s+/g, '');
  if (DUI_CANONICAL.test(trimmed)) return trimmed;
  if (DUI_NINE_DIGITS.test(trimmed)) return `${trimmed.slice(0, 8)}-${trimmed.slice(8)}`;
  return null;
}
```

Coverage of the spec scenarios:
- `00000000-0` → canonical regex match → returned as-is. ✓
- `000000000` → 9-digit regex match → `00000000-0`. ✓
- `00000 000-0` → whitespace stripped → `00000000-0`. ✓
- `00000000-0a` → trim then `^\d{8}-\d$` fails (`a` is not `\d`), `^\d{9}$` fails (10 chars) → `null` → Zod rejects. ✓
- `1234567` (7 chars) → neither regex matches → `null`. ✓
- `12345678901234` (14 chars) → neither matches → `null`. ✓

The backend schema is a Zod v3 `z.preprocess` (backend pins `zod@^3.25.76`, `package.json:26`):

```ts
// src/lib/server/dui.ts
import { z } from 'zod';
export const duiSchema = z.preprocess(
  (raw) => normalizeDui(raw),
  z.string().regex(/^\d{8}-\d$/, { message: 'DUI inválido (formato 00000000-0)' }),
);
```

The frontend (Zod v4, `app/package.json:67`) imports the same `normalizeDui` and wraps it in an equivalent `z.string().transform((v, ctx) => { const n = normalizeDui(v); if (!n) { ctx.addIssue(...); return z.NEVER; } return n; })` block. Both routes converge on the same canonical value before validation and lookup.

The HTML5 `pattern="\d{8}-\d"` attribute and `placeholder="00000000-0"` on the inputs are unchanged from the spec; they only need an `inputMode="numeric"` and `maxLength={10}` for hinting.

### Decision 4 — DB CHECK: no global CHECK; public Zod is the only invariant

**Choice**: **No DB CHECK** added to `participants.role_function`. The column stays `TEXT NOT NULL DEFAULT 'Participante'`, identical to its current shape (`src/lib/server/bootstrap.ts:70`). The two-value restriction is enforced exclusively by the new public Zod schema.

**Rationale**:
- The user's explicit compatibility-first directive keeps admin `Empleado` / `Otro` and historical `Facilitadora` working. Admin `PATCH /api/participants/[id]` already accepts `roleFunction: z.string().optional()` (i.e., arbitrary strings) for non-schema-restricted upserts (`src/pages/api/participants.ts:11-34, 229-259`).
- The proposal's primary risk table already names this trade-off: "Admin `Empleado` / `Otro` participants break under a global two-value DB CHECK" — likelihood High if naive.
- The current schema has no role-function CHECK at all (`bootstrap.ts:70`, no `CHECK` clause). Adding any DB-level constraint now would be a behavior change for admin paths, not a "compatibility-first" one.
- A four-value DB CHECK is a non-binding duplication of what the Zod catalog already enforces. It would still need to be widened to `Facilitadora` for admin flexibility, which is the same shape as no CHECK.
- The public Zod `publicParticipantSchema` is the only surface that needs the two-value invariant. `public/participants.ts` is the only route that uses it.

**Trade-off accepted**: a malformed admin or direct-SQL insert could persist `Chef` as a `funcion`. This is the current state, and fixing it is explicitly out of scope per proposal §Out-of-scope: "Admin-managed participants with `Empleado` / `Otro` `funcion` (DB column still accepts; public schema restricts)."

## Goals / Non-Goals

**Goals** (from proposal §Scope, condensed):
- Public `funcion` restricted to `['Participante', 'Facilitador']` via schema only; admin four-value preserved.
- `curso` and `capacitacion` render/validate only for `Facilitador`; `observaciones` removed from the public surface.
- `?redirect=` accepted only as same-origin relative path; enrollment round-trip navigates back to the course and re-enrolls.
- Public enrollment modal asks DUI only; backend resolves participant by normalized DUI and creates a linked enrollment, or returns a redirect to registration.
- `enrollments.participant_id` is `NOT NULL REFERENCES participants(id) ON DELETE CASCADE`; legacy identity columns derived from the participant.
- DUI canonical format `00000000-0` enforced before validation and lookup.
- Fresh-DB bootstrap completes without ordering errors.

**Non-Goals** (out of scope, parked):
- Destructive normalization (drop `enrollments.full_name/email/phone/dui/notas`).
- Soft-deleted participant enrollment-lookup policy.
- Concurrent enrollment capacity race.
- `funcionesACOES` historical `Facilitadora` string cleanup (`app/src/data/mockData.ts:221`).
- `BrowserRouter` migration; HashRouter stays.
- Archive of parked `acoes-batch-1/2/3`.

## Architecture / Component Changes

### Capability 1 — `public-registration-enum-funcion`

**Files**:
- **New**: `src/lib/server/public-participant-schema.ts` — dedicated two-value public Zod schema (kept out of `participant-schema.ts` to keep the admin path's import surface unchanged).
- **Modify**: `src/lib/server/catalogs.ts:5` — add `export const PUBLIC_PARTICIPANT_ROLE_OPTIONS = ['Participante', 'Facilitador'] as const;`. Keep `participantRoleFunctionOptions` (`Empleado`, `Facilitador`, `Participante`, `Otro`) untouched.
- **Modify**: `src/pages/api/public/participants.ts:6, 64` — import `publicParticipantSubmissionSchema` from the new module and route the JSON branch through it instead of `participantPublicSchema`. Drop the `notes` field from the public path's pick list (it never reaches the participant — the schema rejects it).
- **No change**: `src/pages/api/participants.ts` (admin), `src/pages/api/participants/[id].ts` (admin).

**Schema shape** (new `public-participant-schema.ts`):

```ts
import { z } from 'zod';
import { PUBLIC_PARTICIPANT_ROLE_OPTIONS } from './catalogs';
import { duiSchema } from './dui';
// Reuses the geographic / phone / superRefine checks from participant-schema.ts.
import { participantPublicObjectSchema } from './participant-schema';

export const publicParticipantSubmissionSchema = participantPublicObjectSchema
  .omit({ roleFunction: true, notes: true, program: true, courseId: true })
  .extend({
    roleFunction: z.enum(PUBLIC_PARTICIPANT_ROLE_OPTIONS, { errorMap: () => ({ message: 'Solo se permite Participante o Facilitador' }) }),
    notes: z.undefined().optional(),  // explicit reject
    courseId: z.coerce.number().int().positive().optional(),
    program: z.string().trim().min(1).optional(),
    documentNumber: duiSchema,  // Capability 6 — see below
  })
  .superRefine((data, ctx) => {
    if (data.roleFunction === 'Facilitador') {
      if (data.courseId === undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['courseId'], message: 'Selecciona el curso que impartirás' });
      }
      if (!data.program || !data.program.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['program'], message: 'Describe la capacitación' });
      }
    }
  });
```

`participantPublicObjectSchema` is the existing schema object at `participant-schema.ts:59-75`. The `.omit({ notes: true })` + `notes: z.undefined().optional()` double-belt prevents any leak from a malformed client. `.omit({ courseId: true, program: true })` is a structural hint to make the conditional `superRefine` authoritative.

### Capability 2 — `conditional-form-fields-by-funcion`

**Files**:
- **Modify**: `app/src/pages/RegistroPage.tsx:8-14, 51-57, 80-101, 285-365`. The hardcoded `PUBLIC_FORM_ROLE = 'Participante' as const` (line 14) is removed; the form state gains a `funcion: 'Participante' | 'Facilitador'` field defaulting to `''` (empty until the user picks), and step 1 gets a `<Select>` for it.

**UX behavior** (driven by capability 1's schema, not by new state):
- Step 1 renders a `Select` with `['Participante', 'Facilitador']` (the imported `PUBLIC_PARTICIPANT_ROLE_OPTIONS`).
- The step-3 "Información adicional" block (`RegistroPage.tsx:339-363`) becomes a render-time conditional: `curso` and `capacitacion` are mounted only when `form.funcion === 'Facilitador'`.
- The `observaciones` `<textarea>` (`RegistroPage.tsx:354-357`) is removed.
- The `ReadOnlyField` for `funcion` (`RegistroPage.tsx:350`) is removed in favor of the user-controlled `<Select>`.

**State-clearing on role toggle**: A `useEffect` watching `form.funcion` runs:
```ts
useEffect(() => {
  if (form.funcion === 'Participante') {
    setForm(prev => ({ ...prev, courseId: '', capacitacion: '' }));
    setErrors(prev => { const n = { ...prev }; delete n.courseId; delete n.capacitacion; return n; });
  }
}, [form.funcion]);
```
This satisfies the spec scenario "Toggling from Facilitador to Participante clears stale values" without forcing a re-render of the field tree.

**Step-3 validation** (`RegistroPage.tsx:96-101`): branches on `form.funcion`:
- `'Facilitador'` requires `courseId` (non-empty), `capacitacion` (non-empty), `entidad` (non-empty), `autorizaDatos` (true).
- `'Participante'` requires `entidad` (non-empty) and `autorizaDatos` (true); `curso` / `capacitacion` are not validated.

The banner at `RegistroPage.tsx:258-275` is rewritten: instead of "this form is for participants only", it reads "Elige Participante o Facilitador. Empleados y otros roles los gestiona el administrador."

### Capability 3 — `redirect-after-registration`

**Files**:
- **New**: `app/src/lib/safeRedirect.ts` — pure function, no React.
- **Modify**: `app/src/pages/RegistroPage.tsx` — reads `?redirect=` from HashRouter, calls `safeRedirect()`, navigates via `useNavigate()` after success.

**`safeRedirect.ts`**:

```ts
export function safeRedirect(target: string | null | undefined): string | null {
  if (typeof target !== 'string') return null;
  const trimmed = target.trim();
  if (trimmed.length < 2) return null;
  if (!trimmed.startsWith('/')) return null;          // not a relative path
  if (trimmed.startsWith('//')) return null;          // protocol-relative
  if (/[\u0000-\u001f\s]/.test(trimmed)) return null; // control chars / whitespace
  // Defensive: any [scheme]: before the first ? or # is rejected
  const head = trimmed.split(/[?#]/)[0];
  if (/^[a-z][a-z0-9+.-]*:/i.test(head)) return null;
  // Reject self-loop to /registro
  if (trimmed === '/registro' || trimmed.startsWith('/registro?') || trimmed.startsWith('/registro#')) {
    return null;
  }
  return trimmed;
}
```

This handles every rejection in the spec: `//evil.com` → `startsWith('//')` ✓; `http://evil.com` → head is `http:` and matches the scheme regex ✓; `javascript:alert(1)` → head `javascript:` matches ✓; `data:text/html,...` → `data:` matches ✓; whitespace / control chars → control-char regex ✓; no leading `/` → `!startsWith('/')` ✓; self-loop to `/registro` → explicit block.

**HashRouter param read** (the SPA uses `HashRouter`, `app/src/main.tsx:9`):

```ts
// RegistroPage
import { useSearchParams, useNavigate } from 'react-router-dom';
const [searchParams] = useSearchParams();
const navigate = useNavigate();
const redirectTarget = useMemo(() => {
  const raw = searchParams.get('redirect') ?? '';
  return raw ? decodeURIComponent(raw) : '';
}, [searchParams]);

// Inside handleSubmit after 201:
const safe = safeRedirect(redirectTarget);
if (safe) {
  navigate(safe);  // HashRouter interprets the path as a hash route
} else {
  setSubmitted(true);  // existing fallback — show success page
}
```

`navigate('/cursos/9?token=XYZ')` with HashRouter navigates to `/#/cursos/9?token=XYZ` because the basename is `#`. The query string is preserved on the URL bar.

### Capability 4 — `public-enrollment-by-dui`

**Files**:
- **New**: `src/lib/server/participants.ts:516` region — add `getParticipantByDocumentNumber(documentNumber, options)`.
- **New**: `src/lib/server/dui.ts` — `normalizeDui` + `duiSchema` (shared with capability 6).
- **Modify**: `src/pages/api/public/enrollments.ts:21-69` — full rewrite to accept `{ token, dui }` only and return either `{ data: enrollment }` (201) or `{ redirect: '/registro?redirect=...' }` (200).
- **Modify**: `src/lib/server/enrollments.ts:81-163` — `createEnrollment` requires `participantId` for the public path; if present, derive legacy identity from the participant in the same transaction.
- **Modify**: `app/src/pages/CursoDetallePage.tsx:18-85, 310-353` — modal collects DUI only; handle the `{ redirect }` response with sessionStorage + auto-enroll.
- **Modify**: `app/src/services/api.ts:504-527` — `inscribir` returns a discriminated union.
- **Modify**: `app/src/types/index.ts` or `app/src/services/api.backend.types.ts` — add `PublicEnrollmentResult`.

**`getParticipantByDocumentNumber`**:

```ts
// src/lib/server/participants.ts
export async function getParticipantByDocumentNumber(
  documentNumber: string,
  options: { tx?: TransactionClient; includeDeleted?: boolean } = {},
) {
  const canonical = normalizeDui(documentNumber);
  if (!canonical) return null;
  const executor = options.tx ?? { query: query as TransactionClient['query'] };
  const result = await executor.query<Participant>(
    `SELECT * FROM participants
     WHERE document_number = $1
       ${options.includeDeleted ? '' : 'AND deleted_at IS NULL'}
     LIMIT 1`,
    [canonical],
  );
  return result.rows[0] ?? null;
}
```

Soft-delete policy (per explore.md's open question): **exclude `deleted_at IS NOT NULL`** by default. A user that was soft-deleted must be re-registered through the public flow, which will surface as a duplicate-document-number conflict and trigger the existing `findParticipantDuplicates` admin notification. This is the lowest-friction rule and matches `listParticipants` at `participants.ts:106`. A future change can revisit with a "reactivate on register" policy.

**Public enrollment endpoint contract**:

```ts
// src/pages/api/public/enrollments.ts
const PUBLIC_DUI_SCHEMA = z.preprocess((v) => normalizeDui(v), z.string().regex(/^\d{8}-\d$/));
const REQUEST_SCHEMA = z.object({ token: z.string().min(1), dui: PUBLIC_DUI_SCHEMA });

// Lookup: token first (404 if missing/mismatched), then DUI, then either insert or 200 redirect.
```

Status codes (per spec 4):
- 404 — token missing / mismatched (`getCourseByPublicEnrollmentToken` returns null).
- 400 — malformed DUI (Zod path `dui`).
- 409 — duplicate active enrollment (`Ya estás inscrito en este curso`) or course full (`El curso ha alcanzado su cupo máximo`).
- 201 — `{ data: <Enrollment> }` on success.
- 200 — `{ redirect: '/registro?redirect=%2Fcursos%2F9%3Ftoken%3DXYZ' }` when the participant is not found.

The redirect value uses a single `encodeURIComponent` over the inner `/cursos/<id>?token=<token>` string. With HashRouter, the SPA URL becomes `/#/registro?redirect=%2Fcursos%2F9%3Ftoken%3DXYZ`. `RegistroPage` decodes once with `decodeURIComponent` and gets the inner string back.

**Discriminated union in `app/src/services/api.ts`**:

```ts
// app/src/services/api.backend.types.ts
export type PublicEnrollmentResult =
  | { kind: 'enrollment'; data: { id: number; course_id: number; participant_id: number; /* … */ } }
  | { kind: 'redirect'; redirect: string };
```

```ts
// app/src/services/api.ts
export async function inscribir(
  data: { dui: string },
  token?: string,
): Promise<PublicEnrollmentResult> {
  if (!token) throw new Error('La inscripción pública requiere un token');
  const raw = await api.post<{ data?: unknown; redirect?: string }>('/api/public/enrollments', {
    token,
    dui: data.dui,
  });
  if ('redirect' in raw && raw.redirect) return { kind: 'redirect', redirect: raw.redirect };
  return { kind: 'enrollment', data: raw.data as PublicEnrollmentResult extends { kind: 'enrollment'; data: infer D } ? D : never };
}
```

`CursoDetallePage.handleInscribir` switches on the union:
- `kind: 'enrollment'` → existing `setSuccess(true)`, increment `curso.inscritos`.
- `kind: 'redirect'` → `sessionStorage.setItem('acoes:pendingEnrollment', JSON.stringify({ dui, courseId, token, ts: Date.now() }))` then `window.location.hash = '#' + redirect` (HashRouter navigation).

A new `useEffect` in `CursoDetallePage` runs on mount:
- If `?token=` is present AND `sessionStorage.acoes:pendingEnrollment` is present AND the entry's `courseId === Number(id)` AND `Date.now() - ts < 10 * 60_000`:
  - Set `formData.dui` from the stored value, `setShowForm(true)`.
  - `setTimeout(() => handleInscribir({ preventDefault: () => {} } as React.FormEvent), 0)` to auto-fire. (Or expose a separate `runEnrollment(dui)` function and call it directly — cleaner than synthesizing an event.)

### Capability 5 — `enrollments-participant-fk`

**Files**:
- **Modify**: `src/lib/server/bootstrap.ts:128-143, 193-234` — fresh-DB `enrollments` table needs `ON DELETE CASCADE` for `participant_id` and a NOT NULL inline; the migration block becomes idempotent for both fresh and existing DBs.
- **Modify**: `src/lib/server/enrollments.ts:81-163` — `createEnrollment` requires `participantId` for the public path; derive identity in the same transaction.
- **Modify**: `src/pages/api/enrollments.ts:88-97` (admin) — if no `participantId` is provided, look up by `dui` first; if not found, return 400 with a clear error. This is the minimum behavior change to keep the admin path working under a NOT NULL FK.

**`createEnrollment` public-path derivation** (the relevant change inside `enrollments.ts:81-163`):

```ts
// At the start of the existing withTransaction:
if (input.participantId === undefined) {
  throw new Error('La inscripción pública requiere un participantId');
}
const participantResult = await tx.query<Participant>(
  'SELECT id, full_name, email, phone, document_number FROM participants WHERE id = $1 AND deleted_at IS NULL LIMIT 1',
  [input.participantId],
);
const participant = participantResult.rows[0];
if (!participant) {
  throw new Error('Participante no encontrado');
}
// Use the participant's CURRENT identity for the legacy columns.
// Caller's fullName/email/phone/dui are ignored in this path.
const legacyFullName = participant.full_name;
const legacyEmail = participant.email ?? '';
const legacyPhone = participant.phone;
const legacyDui = participant.document_number;

// Then proceed with the existing INSERT, using the derived values.
```

The `Enrollment` row's legacy identity columns always match the participant. Even if a user later changes their email via admin, the existing enrollment row keeps the email-at-enrollment-time, which is the existing admin UX. (A future migration can backfill from the participant if needed.)

**Admin path** (`src/pages/api/enrollments.ts:88-97`): we look up the participant by `dui` if `participantId` is absent:

```ts
let participantId = parsed.data.participantId;
if (participantId === undefined) {
  if (!parsed.data.dui) {
    return new Response(JSON.stringify({ error: 'La inscripción administrativa requiere participantId o un DUI que corresponda a un participante existente' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const participant = await getParticipantByDocumentNumber(parsed.data.dui);
  if (!participant) {
    return new Response(JSON.stringify({ error: 'No existe un participante con ese DUI. Crealo primero desde el panel administrativo.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  participantId = participant.id;
}
```

This is a behavior change: the admin's legacy "create enrollment with arbitrary fullName" flow will now error with a clear message unless the DUI matches an existing participant. The proposal's rollback plan already accepts admin "compatibility" as the path-of-least-resistance. Documented in the rollout.

**Enrollment API response shape** (preserved for admin path): `{ data: <Enrollment> }` for create; no `redirect` is ever returned by the admin route.

### Capability 6 — `dui-format-validation`

**Files**:
- **New**: `src/lib/server/dui.ts` — `normalizeDui` + `duiSchema` (canonical).
- **New**: `app/src/lib/dui.ts` — re-export `normalizeDui` (calls the same logic) for client-side use; the frontend pins `zod@^4.3.5` (`app/package.json:67`) and we expose a parallel `clientDuiSchema` that uses the v4 `transform/addIssue/NEVER` pattern. The two implementations share a `__test_only` character-set check: the canonical regex is the source of truth in both.
- **Modify**: `app/src/pages/RegistroPage.tsx:291` — `placeholder="00000000-0"` is already correct; we add `pattern="\d{8}-\d"`, `inputMode="numeric"`, `maxLength={10}`.
- **Modify**: `app/src/pages/CursoDetallePage.tsx:332` — same input attributes on the modal DUI field.

The frontend input mask is permissive: the user can type `123456789`, `12-34-56-78-9`, or `123456789`; the on-submit call to `normalizeDui()` (in the form's `handleSubmit` and in `handleInscribir`) produces the canonical form before the request goes out. We do NOT mask the input as the user types — masking `12-345-678-9` to `12345678-9` mid-keystroke is hostile UX and conflicts with the `00000 000-0` case where the user might paste with spaces.

## Data Model

### DDL for fresh-DB `enrollments` table

Replace lines 128-143 of `src/lib/server/bootstrap.ts`:

```sql
CREATE TABLE IF NOT EXISTS enrollments (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  facilitator_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  participant_id BIGINT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  enrolled_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  dui TEXT,
  fecha_inscripcion DATE NOT NULL DEFAULT CURRENT_DATE,
  estado TEXT NOT NULL DEFAULT 'confirmed',
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

The two differences from the current schema (lines 128-143): `participant_id` is `NOT NULL` and `ON DELETE CASCADE` (was nullable, `ON DELETE SET NULL`).

### Idempotent migration block for existing DBs

Append to the migration block at `src/lib/server/bootstrap.ts:222-229` (after the existing `enrollments_estado_check`):

```sql
-- Migrate enrollments.participant_id to NOT NULL ON DELETE CASCADE.
-- Safe on empty DB; the CASCADE is required by spec 5.
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS participant_id BIGINT;

-- Backfill any rows with NULL participant_id by resolving a participant from the legacy dui.
-- The current production DB has 0 enrollments (verified preflight) so this is a no-op;
-- the SQL is here for re-runs on a populated future DB.
UPDATE enrollments e
   SET participant_id = p.id
  FROM participants p
 WHERE e.participant_id IS NULL
   AND e.dui IS NOT NULL
   AND p.document_number = e.dui
   AND p.deleted_at IS NULL;

-- Any remaining NULLs cannot be auto-resolved (no matching participant).
-- Throw so the operator notices rather than silently dropping the constraint.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM enrollments WHERE participant_id IS NULL) THEN
    RAISE EXCEPTION 'Cannot enforce enrollments.participant_id NOT NULL: % orphan rows; resolve them manually first',
      (SELECT COUNT(*) FROM enrollments WHERE participant_id IS NULL);
  END IF;
END $$;

ALTER TABLE enrollments ALTER COLUMN participant_id SET NOT NULL;

-- Drop and re-add the FK so the ON DELETE CASCADE is guaranteed even on a
-- previously-evolved DB that created the FK with SET NULL.
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_participant_id_fkey;
ALTER TABLE enrollments ADD CONSTRAINT enrollments_participant_id_fkey
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_enrollments_participant_id ON enrollments(participant_id);
```

The FK name `enrollments_participant_id_fkey` is PostgreSQL's auto-generated default (verified by the explore at `src/lib/server/bootstrap.ts:51-83`); the migration uses it directly. The `DO $$ ... $$` block guarantees we never silently lose data.

### Bootstrap ordering fix for fresh DBs

The current `bootstrap.ts:51-83` defines `participants` (with `course_id BIGINT REFERENCES courses(id)`) BEFORE `courses` is created at line 97-126. PostgreSQL validates inline `REFERENCES` at `CREATE TABLE` time, so on a TRULY fresh DB this would fail. The DB has been evolved enough that it works in practice (the FK is added to a pre-existing `courses` table on subsequent runs), but the explore flagged this as a latent bug.

The fix is to reorder the `CREATE TABLE IF NOT EXISTS` block so `courses` is created first. Specifically, move the `courses` block (currently `bootstrap.ts:97-126`) BEFORE the `participants` block (`bootstrap.ts:51-83`). The `participant_id` FK in the new `enrollments` table then resolves because both referenced tables exist. This reordering is part of PR1 (alongside the FK migration) and is verified by a fresh-DB unit test.

## API / Contract Changes

### `POST /api/public/participants` (Spec 1, 2)

- Body: same keys as today, but `roleFunction` MUST be `Participante` or `Facilitador`. The new `publicParticipantSubmissionSchema` enforces this; the endpoint returns `400` with `error: 'validation_failed'` and a per-field Zod issue on `roleFunction` for any other value.
- Conditional `curso` and `capacitacion` for `Facilitador` (Spec 2). For `Participante`, these are not in the schema's `superRefine` requirement and may be omitted or `undefined` in the payload.
- `notes` is rejected. A payload with `notes: 'whatever'` returns `400` with `error: 'validation_failed'` and a path of `['notes']` (explicitly via `z.undefined().optional()` plus `.omit({ notes: true })`).
- Response on success: unchanged (`201` with `{ data: <Participant> }`).
- Backwards compat: admin endpoint `POST /api/participants` is unchanged.

### `POST /api/public/enrollments` (Spec 4)

- Body: `{ token: string, dui: string }` only. The current five-field body is rejected by Zod (the schema has no other keys).
- `dui` is normalized via `normalizeDui` and validated against `^\d{8}-\d$`. Malformed → `400` with a per-field Zod issue on `dui`.
- `token` is resolved via `getCourseByPublicEnrollmentToken` (`src/lib/server/courses.ts:152-164`). Missing/mismatched → `404` with `{ error: 'El enlace público no es válido' }`.
- Participant lookup via `getParticipantByDocumentNumber(normalized)`. Soft-deleted participants are excluded.
- Hit: `createEnrollment({ participantId, courseId, publicToken })` (the function derives the legacy identity columns from the participant in the same transaction). Returns `201` with `{ data: <Enrollment> }`.
- Miss: returns `200` with `{ redirect: '/registro?redirect=' + encodeURIComponent(`/cursos/${course.id}?token=${token}`) }`. The SPA navigates to the encoded path.
- Conflict: `409` for duplicate active enrollment or course full. Error message text unchanged.
- Internal server error: `500` with `{ error: 'Error creating enrollment' }` (unchanged).

### `POST /api/enrollments` (admin, capability 5)

- Body: unchanged shape (`enrollmentSubmissionSchema` still accepts `participantId`, `fullName`, `email`, `phone`, `dui`, `notas`).
- New pre-check: if `participantId` is missing, the endpoint looks up the participant by `dui`; if not found, returns `400` with `{ error: 'No existe un participante con ese DUI. Crealo primero desde el panel administrativo.' }`. This is the minimum behavior change to enforce the new `NOT NULL` FK.
- Response: `201` with `{ data: <Enrollment> }`. The legacy identity columns in the row match the participant's CURRENT identity (because `createEnrollment` derives them server-side from the participant when `participantId` is present).

## Testing Strategy

| Layer | Capability | Test file |
|---|---|---|
| Backend unit (Vitest) | 6 (DUI normalizer) | `src/lib/server/__tests__/dui.test.ts` (new): covers all spec 6 scenarios — `00000000-0` no-op, `000000000` → canonical, `00000 000-0` → canonical, `00000000-0a` rejected, too-short rejected, too-long rejected. |
| Backend unit (Vitest) | 1 (public schema) | `src/lib/server/__tests__/public-participant-schema.test.ts` (new): asserts `roleFunction` only accepts the two values, `notes` is rejected, conditional `curso`/`capacitacion` requirements for Facilitador. |
| Backend unit (Vitest) | 4 (enrollment by DUI) | `src/lib/server/__tests__/public-enrollment.test.ts` (new): mocks `getParticipantByDocumentNumber` to return null and asserts `{ redirect }`; mocks it to return a row and asserts `createEnrollment` is called with that participantId. |
| Backend unit (Vitest) | 5 (FK migration) | `src/lib/server/__tests__/bootstrap.test.ts` (new): against a real Postgres test container, runs the migration block twice, asserts idempotency, asserts `participant_id` is NOT NULL and CASCADE, asserts the ordering fix produces a clean fresh DB. |
| Backend unit (Vitest) | 1 (admin preserves Empleado/Otro) | `src/lib/server/__tests__/public-participant-schema.test.ts`: confirms the public schema does NOT accept `Empleado` / `Otro`, and a separate test confirms the admin schema still does. |
| App unit (Vitest + Testing Library + MSW) | 2, 3 (form behavior) | `app/tests/unit/registro-form.test.tsx` (replace existing `registro-participant-only.test.tsx`): covers the role matrix (Participante hidden fields, Facilitador required fields, toggle clears stale values, `?redirect=` read + safe navigate), `safeRedirect` rejection cases, observations removed from payload, success-state fallback when `?redirect=` is invalid. |
| App unit (Vitest) | 3 (`safeRedirect` helper) | `app/tests/unit/safeRedirect.test.ts` (new): every spec 3 scenario as a `safeRedirect` direct call. |
| App unit (Vitest) | 4 (round-trip + sessionStorage) | `app/tests/unit/curso-detalle-enrollment.test.tsx` (new): renders `CursoDetallePage` with `?token=X`, seeds `sessionStorage.acoes:pendingEnrollment`, asserts modal opens, asserts `inscribir` was called with the stored DUI, asserts the auto-success state. |
| E2E (Playwright + PostgreSQL) | 1, 2, 6 (full registration) | `app/tests/e2e/public-registration-funcion.spec.ts` (new): Participante happy path, Facilitador requires curso/capacitacion, Empleado rejected with 400, `00000000-0a` rejected with 400, `000000000` accepted. |
| E2E (Playwright) | 3, 4 (round-trip) | `app/tests/e2e/public-enrollment-roundtrip.spec.ts` (new): generate public link as admin, navigate anonymously to course, open modal, type malformed DUI → 400; type no-match DUI → redirect to `/registro?redirect=...`; complete registration as Participante; assert the SPA lands back on the course with the auto-enrollment success state and the participant count incremented. |
| E2E (Playwright) | 5 (FK migration) | `app/tests/e2e/admin-enrollment-fk.spec.ts` (new): admin creates a participant via the dashboard, then admin tries to create an enrollment without participantId for a non-existent DUI → 400; with the existing DUI → 201; the new row has `participant_id` matching the participant. |
| E2E (Playwright) | 5 (cascade) | Existing `app/tests/e2e/admin-enrollment-link.spec.ts` extended: delete the participant via admin, assert the linked enrollment rows are gone. |

Total: 5 new backend unit files, 3 new app unit files, 4 new E2E files (some replace the existing `registro-participant-only.spec.ts` / `registro-participant-only.test.tsx`).

## PR Partitioning (chained)

The proposal estimated 900-1,300 LOC and explicitly recommended chained delivery. The 800-line review budget (`sdd-phase-common.md` §E) is at risk on PR3; the other three PRs are tight. Order is `PR1 → PR2 → PR3 → PR4`, stacked to main.

### PR1 — Backend schemas, FK, DUI, bootstrap ordering (Specs 5, 6 + bootstrap fix)

- `src/lib/server/dui.ts` (new)
- `src/lib/server/public-participant-schema.ts` (new)
- `src/lib/server/participant-schema.ts` (re-export of `publicParticipantObjectSchema` already there; no changes)
- `src/lib/server/catalogs.ts` (add `PUBLIC_PARTICIPANT_ROLE_OPTIONS`)
- `src/lib/server/enrollments.ts` (public-path derivation)
- `src/lib/server/participants.ts` (`getParticipantByDocumentNumber`)
- `src/lib/server/bootstrap.ts` (FK migration + ordering fix)
- `src/pages/api/public/participants.ts` (route through public schema, drop notes)
- `src/pages/api/enrollments.ts` (admin: look up by DUI when participantId absent)
- `src/lib/server/__tests__/{dui,public-participant-schema,bootstrap,public-enrollment,role-drift}.test.ts` (new + extended)
- Forecast: ~450-550 LOC including tests. Within budget.

Verify standalone: `npm run test` (backend Vitest) + `npm run build` (backend) + manual smoke (`POST /api/public/participants` with `funcion: 'Empleado'` → 400, with `funcion: 'Participante'` → 201; `POST /api/enrollments` admin without participantId with no matching DUI → 400).

### PR2 — Registration UI, conditional fields, redirect hardening (Specs 1, 2, 3 — UI-only slice)

- `app/src/pages/RegistroPage.tsx` (role select in step 1, conditional fields, observations removed, `?redirect=` read, `safeRedirect()` integration, post-201 navigation)
- `app/src/lib/safeRedirect.ts` (new)
- `app/tests/unit/registro-form.test.tsx` (replace `registro-participant-only.test.tsx`)
- `app/tests/unit/safeRedirect.test.ts` (new)
- `app/tests/e2e/public-registration-funcion.spec.ts` (new — replaces the role-matrix coverage in the deleted `registro-participant-only.spec.ts`)
- Forecast: ~350-450 LOC. Within budget.

Verify standalone: `npm run test:unit` (app) + `npm run build` (app) + manual smoke (`/#/registro?redirect=//evil.com` does NOT navigate after success; `/#/registro?redirect=%2Fcursos%2F9%3Ftoken%3DXYZ` navigates after success).

### PR3 — Enrollment round-trip (Spec 4 + completion of Spec 3 SPA side)

- `app/src/pages/CursoDetallePage.tsx` (DUI-only modal, sessionStorage bridge, auto-enroll useEffect)
- `app/src/services/api.ts` (`inscribir` returns discriminated union; remove the five-field body shape)
- `app/src/services/api.backend.types.ts` (`PublicEnrollmentResult` type)
- `app/src/types/index.ts` (any UI shape changes — e.g., drop `telefono` from `InscripcionCurso` if not used)
- `app/tests/unit/curso-detalle-enrollment.test.tsx` (new)
- `app/tests/e2e/public-enrollment-roundtrip.spec.ts` (new)
- Modify existing `app/tests/e2e/public-enrollment-link.spec.ts` to remove five-field assertions (or add a separate "found" path test)
- Forecast: ~600-700 LOC. **At risk of 400-line budget.** Mitigations: keep the discriminated-union type in `api.backend.types.ts` (a single new file), keep `CursoDetallePage` changes surgical (the modal state already exists), put the sessionStorage helper in a new `app/src/lib/pendingEnrollment.ts` (single file, easy to review), and avoid touching the admin `getInscripciones` path in this PR.

Verify standalone: `npm run test:unit` (app) + `npm run build` (app) + `npm run test:e2e` against PostgreSQL. The round-trip E2E is the new gate.

### PR4 — Cleanup and migration tests

- Drop the obsolete `app/tests/e2e/registro-participant-only.spec.ts` and `app/tests/unit/registro-participant-only.test.tsx` (already replaced in PR2 / PR3).
- Add a fresh-DB unit test that runs `ensureDatabase()` against an empty Postgres and asserts the full schema is valid.
- Update `openspec/changes/acoes-dui-enrollment-flow/tasks.md` to reflect what actually shipped.
- Forecast: ~100-200 LOC. Easy.

### Stacking model

`stacked-to-main` per preflight cache. Each PR merges to `main` in sequence; the next PR is rebased on the previous one. Per `sdd-phase-common.md` §E feature-branch chain caveat: each PR is also a candidate for a separate feature branch (e.g., `feat/pr1-schemas-fk`), but the orchestrator's preflight says `stacked-to-main`, so we use `main` as the integration branch and rebase as we go. The verify gate runs at the end of each PR, not at the end of the chain.

## Rollout and Rollback

**Per-PR revert**:
- `PR1` (DB migration + backend schemas): reverting the commit reverts the FK `ON DELETE CASCADE` to `SET NULL` (because the migration block is in bootstrap, reverting it removes the ALTER, but the inline `CREATE TABLE IF NOT EXISTS` for fresh DBs still applies the new constraint). For a clean revert, we need a forward-only migration: the inline `CREATE TABLE` keeps the new shape; only the migration block can be reverted. The risk is that a future fresh DB would still get the NOT NULL constraint. **Mitigation**: PR1's commit message documents this; a follow-up `acoes-fk-revert` change can flip the inline constraint back if needed.
- `PR2` (registration UI + `safeRedirect`): clean revert — `git revert` removes the role select, the conditional rendering, and the redirect handling. Form returns to its current state.
- `PR3` (enrollment modal + discriminated union): clean revert — modal returns to five-field input, `inscribir` returns the old shape.
- `PR4` (test cleanup): no behavior change; safe to revert at any time.

**Feature flags**: none. The public enrollment endpoint changes its contract; if we need a feature flag, we'd version the endpoint (`/api/public/enrollments/v2`) which is out of scope. The risk is acceptable because the SPA and backend ship together.

**DB rollback**: the migration block is the only DDL. The `ALTER TABLE … DROP CONSTRAINT … ADD CONSTRAINT … SET NULL` is not in the migration block (the migration only adds CASCADE). To roll back the FK semantics, run a manual `ALTER TABLE enrollments DROP CONSTRAINT enrollments_participant_id_fkey; ALTER TABLE enrollments ADD CONSTRAINT enrollments_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE SET NULL; ALTER TABLE enrollments ALTER COLUMN participant_id DROP NOT NULL;`. This is documented in the PR1 commit message.

**Sequencing rationale**: PR1 first because every later PR depends on the FK and DUI normalizer. PR2 second because it's UI-only and a green build on its own. PR3 last because it depends on the SPA-side `safeRedirect` (PR2) AND the backend public enrollment endpoint (PR1). PR4 is housekeeping.

## Open Questions

**None.** All four open questions are resolved above (PR partitioning, auto-enroll UX, DUI regex, DB CHECK).

## References

- `openspec/changes/acoes-dui-enrollment-flow/proposal.md`
- `openspec/changes/acoes-dui-enrollment-flow/explore.md`
- `openspec/changes/acoes-dui-enrollment-flow/specs/{public-registration-enum-funcion,conditional-form-fields-by-funcion,redirect-after-registration,public-enrollment-by-dui,enrollments-participant-fk,dui-format-validation}/spec.md`
- Engram `sdd/acoes-dui-enrollment-flow/proposal` (proposal observation)
- Engram `sdd/acoes-dui-enrollment-flow/spec` (concatenated spec observations)
- Engram `sdd/acoes-dui-enrollment-flow/explore` (exploration)
- `openspec/changes/archive/2026-07-25-acoes-post-migration-hardening/proposal.md` (HashRouter baseline)
- `openspec/specs/public-participant-validation/spec.md` (admin-side validation baseline; unchanged)
- `openspec/specs/auth-and-route-protection/spec.md` (canonical 4-role baseline; unchanged)
- Code citations: `src/lib/server/participant-schema.ts:24-83`, `src/lib/server/catalogs.ts:5`, `src/lib/server/enrollments.ts:81-163`, `src/lib/server/participants.ts:516-562`, `src/lib/server/bootstrap.ts:51-83, 97-143, 193-234`, `src/pages/api/public/participants.ts:39-79`, `src/pages/api/public/enrollments.ts:21-69`, `src/lib/server/course-schema.ts:108-116`, `app/src/pages/RegistroPage.tsx:8-14, 51-57, 80-101, 285-365`, `app/src/pages/CursoDetallePage.tsx:18-85, 310-353`, `app/src/services/api.ts:504-527`, `app/src/main.tsx:9`.
