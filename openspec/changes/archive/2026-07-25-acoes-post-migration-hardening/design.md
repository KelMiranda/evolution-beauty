# Design: acoes-post-migration-hardening (recortado)

## Context

The React SPA migration (`5f3fc1a`) left five security/integrity defects in production and broke CI. The recortado proposal (`openspec/changes/acoes-post-migration-hardening/proposal.md`) commits to fixing only these five items and deferring everything else (admin/audit React parity, new-endpoint specs, export widths, chunk splitting, capacity locking, archival of `acoes-batch-1/2/3`). This design resolves the technical HOW for each capability and is concrete enough that `sdd-tasks` can be derived mechanically.

References: `proposal.md`, `explore.md`, and the five specs at `openspec/changes/acoes-post-migration-hardening/specs/<capability>/spec.md`.

## Goals / Non-Goals

**Goals** (verbatim from proposal §"Success Criteria"):

- SPA redirects unauthenticated AND wrong-role users from protected routes.
- `POST /api/public/participants` rejects invalid payloads with per-field Zod errors and never inserts bad rows.
- `RegistroPage` submits only `Femenino | Masculino` and surfaces field-level errors.
- Role-targeted notifications are only visible/markable to the targeted role.
- `npm run test:unit` exists and runs in CI; Playwright E2E runs against a real Postgres.
- The 3 broken React component suites pass.
- `openspec/config.yaml`, `openspec/specs/`, `openspec/changes/archive/` exist and `openspec validate` is green on a stub spec.

**Non-goals** (parked):

- React UI parity for old admin / audit / user-management UIs.
- New-endpoint specs (certificates, file-storage, public-enrollment).
- Pagination/offset fixes, XLSX widths, CSV/XLSX parity, 916KB chunk splitting.
- Course completion / enrollment capacity locking / file-upload limits.
- Archiving `acoes-batch-1/2/3` (no proposal archive sync this change).

## Resolved Open Questions

### Q1 — Real notification producers (spec 3 says "e.g., the course-completion producer")

Code search (`grep -rn 'createNotification' src/`) found exactly five producers. The proposal must replace the `course-completion` placeholder with these:

| # | Producer site | `audienceRole` | `kind` |
|---|---|---|---|
| 1 | `src/pages/api/public/participants.ts:84-90` | `admin` | `duplicate_in_review` |
| 2 | `src/lib/server/courses.ts:215-221` | `admin` | `course_full` |
| 3 | `src/lib/server/certificates.ts:67-73` | `admin` | `course_completed` |
| 4 | `src/lib/server/participants.ts:296-302` | `admin` | `facilitator_pending_validation` |
| 5 | `src/lib/server/enrollments.ts:152-158` | `admin` | `participant_enrolled` |

`course_completed` is the closest match to the spec's `course-completion` example and is the canonical reference. The allowlist test (see Capability 3) asserts `audience_role = 'admin'` for all five.

### Q2 — OpenSpec CLI config schema (spec 5 wants `project`, `changeRoot`, `archiveDir`)

The installed CLI is `@fission-ai/openspec` (Fission-AI/OpenSpec). Its Zod schema (`src/core/project-config.ts`, `ProjectConfigSchema`) accepts only:

- `schema` (required non-empty string; defaults to `spec-driven`)
- `context` (optional string, ≤50KB)
- `rules` (optional, `Record<artifactId, string[]>`)
- `references` (optional, parsed separately)
- `store` (optional, declared default store id)

The CLI hard-codes `openspec/changes/` as the change root and `openspec/changes/archive/` as the archive directory (`src/core/init.ts:createDirectoryStructure`). There is **no** `project`, `changeRoot`, or `archiveDir` key. The CLI ignores unknown keys silently rather than rejecting them.

**Resolution**: The design uses the real schema. Capability 5 documents the spec target's mismatch and writes a minimal valid config that the CLI actually parses. The spec scenario "Missing required key is rejected by the tool" is unsatisfiable as written — see the open-question carry-over in §"Open Questions" below.

## Key Decisions

| # | Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|---|
| 1 | Canonical role source | Extend `src/lib/server/permissions.ts` (already the runtime source) — do NOT create a new `roles.ts`. | New `src/lib/server/roles.ts` (rejected: split brain between runtime and matrix). | `permissions.ts` is imported by `auth.ts:6`, `bootstrap.ts:4`, and the API endpoints. A new file would require updating every import. |
| 2 | Legacy `facilitadora` coercion | **STOP** coercing. Remove the `'facilitadora' => 'facilitador'` arm from `permissions.ts:normalizeRole` and the `UPDATE users ... CASE role WHEN 'facilitadora' THEN 'facilitador'` arm from `bootstrap.ts:235`. Expose count via `GET /api/admin/role-drift` (admin-only). | Keep coercion + log (rejected: spec explicitly forbids silent rewrite). One-shot backfill script + keep coercion (rejected: still silent). | Spec is clear. Stop the coercion, surface the count, leave the row as `facilitadora` so an admin can decide. |
| 3 | SPA route allowlist location | Single new module `app/src/routes/routeManifest.ts` exporting `Record<string, CanonicalRole[]>` and `<RoleGuard allowedRoles>` component. | Inline checks in each page (rejected by spec: single-source-of-truth requirement). | Manifest makes the role map testable and grep-able. |
| 4 | Server-side role check | Per-endpoint `requireRole(user, allowed)` call reusing `auth.ts:requireRole`. No middleware (Astro route handlers are explicit). | Global middleware (rejected: too coarse; some endpoints are public). | Existing pattern in `audit.ts`, `users.ts` already uses `getCurrentUser` + `canX` helpers — extend, don't replace. |
| 5 | Public JSON validation | Replace the manual mapping at `src/pages/api/public/participants.ts:38-63` with `participantPublicSchema.safeParse(normalizeBody(raw))`. Keep the FormData branch as-is (already validates). | Add a second schema just for JSON (rejected: schema drift). | The shared schema already covers both branches when its input is normalized to the schema's field names. |
| 6 | Notification audience filter | Change `WHERE` clauses in `notifications.ts:45-67` from `(user_id = $1 OR audience_role IS NOT NULL)` to `(user_id = $1 OR audience_role IS NULL OR audience_role = $2::text)` and pass `$2` = caller's role. Producer visibility preserved via the always-true `user_id = $1` clause when the producer is the caller (notifications don't currently set `user_id`, see below). | Use a join on `users.role` (rejected: extra round-trip; role is already known from session). | Caller role is the cheapest correct filter. Producer visibility is preserved by storing the producer's `user_id` on every `createNotification` call (see Capability 3). |
| 7 | Producer visibility | Set `user_id` on every `createNotification` call where a producer exists (4 of 5 sites — see Q1). The orphan `notifyRoles` (currently used nowhere, see search above) stays as-is. | Disable producer visibility (rejected: spec scenario "Producer sees a role-targeted notification they themselves cannot receive" requires it). | Producer-visibility is a no-op when `user_id` is null; setting it where the producer is known keeps the spec scenario green. |
| 8 | `test:unit` script | Add `"test:unit": "vitest run"` to `app/package.json`. Existing `test:run` is identical and stays as an alias. | Rename `test:run` to `test:unit` (rejected: any CI hook using `test:run` would break). | The CI command `npm run test:unit --if-present` in `.github/workflows/ci.yml:31` resolves to the new script. |
| 9 | Broken component suites | Rewire `LoginPage.test.tsx` and `CoursesCatalogPage.test.tsx` to import the existing React equivalents (`@/pages/LoginPage`, `@/pages/CatalogoCursosPage`). **Delete** `AdminParticipantsPage.test.tsx` (the admin participants page does not exist in the SPA — parked). | Delete all 3 (rejected: 2 have React equivalents and are easily fixed). Delete 0 (rejected: `admin/participants` doesn't exist and is parked). | Minimum churn to make the suites pass while respecting the parked scope. |
| 10 | OpenSpec config | Write a minimal valid `openspec/config.yaml` using `schema: spec-driven` plus a `context:` block capturing the stack. Add `openspec/specs/_stub/spec.md` so `openspec validate --specs` passes; add `openspec/README.md` naming the 3 parked changes and their blockers. | Use spec's `project/changeRoot/archiveDir` keys (rejected: CLI ignores them; spec scenario unsatisfiable). | See Q2 resolution. |

## Architecture / Component Changes

### Capability 1 — Auth and Route Protection

**Canonical role vocabulary (`src/lib/server/permissions.ts`)**

- Keep `canonicalRoles` and `CanonicalRole` (line 1-3) unchanged.
- **Edit** `normalizeRole` (lines 26-47): remove the `'facilitadora' => 'facilitador'` arm so an unknown input falls through to `default`. Change the `default` case to **throw** a `RoleCoercionError` carrying the original value (caller catches in `auth.ts`). Alternative: return `null` and have callers treat null as "unmappable role" — chosen path because throwing keeps the call site explicit without sprinkling null checks.
- `requireRole` (line 126) stays as-is.

**Boot-time drift surface (`src/lib/server/bootstrap.ts:235`)**

- **Edit** line 235: drop the `WHEN 'facilitadora' THEN 'facilitador'` arm. Keep `WHEN 'operator'` and `WHEN 'viewer'` (those are spec'd legacy aliases that predate this recortado and are not in scope).
- Add a read-only helper in the same file:

```ts
export async function countLegacyFacilitadoraRows(): Promise<number> {
  const r = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM users WHERE role = 'facilitadora'`
  );
  return Number(r.rows[0]?.count ?? '0');
}
```

- New admin-only endpoint `src/pages/api/admin/role-drift.ts` returning `{ legacy_facilitadora_count: number }` after `getCurrentUser` + `requireRole(user, ['admin'])`. The endpoint is intentionally minimal; no `UPDATE` happens server-side.

**SPA route manifest (new module + guard)**

| File | Action | Why |
|---|---|---|
| `app/src/routes/routeManifest.ts` | Create | Exports `ROUTE_ALLOWLIST: Record<string, CanonicalRole[]>` and `type RouteId`. Single source of truth. |
| `app/src/components/RoleGuard.tsx` | Create | `<RoleGuard allowedRoles={ROUTE_ALLOWLIST[id]}>` wrapping `<Outlet />`. Returns `<Navigate to="/unauthorized" replace />` if role is missing; returns `<Navigate to="/dashboard" replace />` if a wrong role is present. |
| `app/src/pages/UnauthorizedPage.tsx` | Create | Simple page with a "Volver" button. Mirrors `NotFoundPage.tsx`. |
| `app/src/App.tsx` | Modify | Lines 42-50: replace bare `<ProtectedRoute>` with `<ProtectedRoute><RoleGuard><DashboardLayout/></RoleGuard></ProtectedRoute>` reading `allowedRoles` from `ROUTE_ALLOWLIST`. |
| `app/src/hooks/useAuth.ts` | Modify | Expose `role: CanonicalRole \| null` derived from `user.rol`. The map `app/src/services/api.ts:88,103` already replaces `facilitadora → operador`; replace that branch to drop the cast and pass through canonical names (the `User` type in `app/src/types/index.ts:32` changes from `admin|operador|participante` to `admin|facilitador|empleado|participante`). |

**Type and test alignment**

| File | Action | Why |
|---|---|---|
| `app/src/services/api.backend.types.ts:2-8` | Modify | `role: 'admin' \| 'facilitador' \| 'empleado' \| 'participante'`. Drop `facilitadora`. |
| `app/src/types/index.ts:32` | Modify | `rol: 'admin' \| 'facilitador' \| 'empleado' \| 'participante'`. Drop `operador`. |
| `app/src/services/api.ts:88,103` | Modify | Drop the `=== 'facilitadora' ? 'operador'` branch (becomes unreachable). |
| `app/tests/setup.ts:22-25` | Modify | Same 4-role union in the mockSession signature. |
| `app/tests/unit/auth-permissions.test.ts` | Rewrite | Use the 4-role union; add an `empleado` describe block (mirror `admin` minus `users:*`). The legacy `facilitadora` describe block is replaced by `facilitador` (same permissions per `permissions.ts:22`). |
| `app/tests/unit/api-shapes.test.ts:33,38,47` | Modify | Replace `['admin', 'facilitadora', 'participante']` with the 4-role array. |
| `app/tests/unit/schemas.test.ts:58,279,287` | Modify | Same 4-role array; the `'superadmin'` rejection scenario stays valid. |

**Server-side role check pattern**

No new middleware. Existing `auth.ts:requireRole(user, allowed)` is the helper. Apply it explicitly in every role-aware endpoint (the spec scenario "Server rejects a wrong-role API call" is satisfied by the existing `getCurrentUser` + manual role gate pattern already in `users.ts`, `audit.ts`). For the recortado, the explicit re-application points are:

- `src/pages/api/admin/role-drift.ts` (new) — `requireRole(user, ['admin'])`.
- (Other endpoints already gate correctly per `explore.md` notes; out-of-scope to add new gates here.)

### Capability 2 — Public Participant Validation

**Shared schema invocation (rewrite the JSON branch)**

`src/pages/api/public/participants.ts:38-63` currently bypasses Zod. Replace the JSON branch with:

```ts
if (contentType.includes('application/json')) {
  const raw = (await request.json()) as Record<string, unknown>;
  const normalized = {
    courseId: pickNumber(raw, 'courseId', 'course_id'),
    fullName: pickString(raw, 'fullName', 'full_name'),
    documentNumber: pickString(raw, 'documentNumber', 'document_number'),
    birthDate: pickString(raw, 'birthDate', 'birth_date'),
    gender: pickString(raw, 'gender', 'gender'),
    phoneCountry: pickString(raw, 'phoneCountry', 'phone_country'),
    phoneDialCode: pickString(raw, 'phoneDialCode', 'phone_dial_code'),
    phoneNumber: pickString(raw, 'phoneNumber', 'phone_number'),
    phone: pickString(raw, 'phone', 'phone'),
    email: pickOptionalString(raw, 'email', 'email'),
    address: pickOptionalString(raw, 'address', 'address'),
    municipality: pickString(raw, 'municipality', 'municipality'),
    department: pickString(raw, 'department', 'department'),
    district: pickOptionalString(raw, 'district', 'district'),
    organization: pickOptionalString(raw, 'organization', 'organization'),
    roleFunction: pickString(raw, 'roleFunction', 'role_function'),
    educationLevel: pickOptionalString(raw, 'educationLevel', 'education_level'),
    program: pickOptionalString(raw, 'program', 'program'),
    status: pickString(raw, 'status', 'status') || 'Pendiente',
    notes: pickOptionalString(raw, 'notes', 'notes'),
    consent: pickBoolean(raw, 'consent', 'consent'),
  };
  const parsed = participantPublicSchema.safeParse(normalized);
  if (!parsed.success) {
    return Response.json(
      { error: 'validation_failed', issues: parsed.error.issues },
      { status: 400 }
    );
  }
  parsedParticipant = parsed.data;
}
```

The pickers live in a new helper `src/lib/server/http-picks.ts` (testable in isolation).

**Error response shape**

- HTTP 400.
- Body: `{ error: 'validation_failed', issues: ZodIssue[] }` (each issue carries `path: (string|number)[]`, `message`, `code`).
- No 500 on validation failure. The shared schema's `superRefine` (`participant-schema.ts:59-75`) already produces per-field issues for `phoneCountry`, `phoneDialCode`, `department`, `municipality`.

**Form-side gender catalog (`app/src/pages/RegistroPage.tsx:219`)**

- Change `<Select ... options={['Femenino', 'Masculino', 'Otro']} />` → `options={['Femenino', 'Masculino']}`.
- Add a unit test in `app/tests/unit/registro-gender-options.test.ts` (new) asserting the rendered option list contains exactly those two values.

**Per-field error UI**

The existing `app/src/services/api.ts:9-15` `getErrorMessage` discards the Zod `issues` array (`response.json() as { error: string }`). Extend the API surface:

```ts
export type ApiValidationError = {
  error: 'validation_failed';
  issues: Array<{ path: (string|number)[]; message: string; code: string }>;
};
export class ValidationApiError extends Error {
  constructor(public issues: ApiValidationError['issues']) { super('validation_failed'); }
}
```

`RegistroPage.tsx:78-90` (the `handleSubmit` that always sets `submitted: true`) splits:

- On success → `setNewRegistro(result); setSubmitted(true)`.
- On `ValidationApiError` → keep `submitted = false`, populate `errors[fieldPath] = message` from `issues`, scroll to first error.

`app/src/pages/RegistroPage.tsx:119-143` (the success screen) stays as-is; success only renders when `submitted && !validationFailed`.

### Capability 3 — Notification Audience Isolation

**SQL change (`src/lib/server/notifications.ts:45-67`)**

```ts
export async function listNotifications(userId: number, callerRole: CanonicalRole, limit = 50) {
  const result = await query<NotificationRow>(
    `SELECT * FROM notifications
     WHERE (user_id = $1
            OR audience_role IS NULL
            OR audience_role = $2)
     ORDER BY read_at IS NULL DESC, created_at DESC, id DESC
     LIMIT $3`,
    [userId, callerRole, limit],
  );
  return result.rows;
}

export async function markNotificationRead(id: number, userId: number, callerRole: CanonicalRole) {
  const result = await query<NotificationRow>(
    `UPDATE notifications
     SET read_at = NOW()
     WHERE id = $1
       AND (user_id = $2
            OR audience_role IS NULL
            OR audience_role = $3)
     RETURNING *`,
    [id, userId, callerRole],
  );
  return result.rows[0] ?? null;
}
```

Caller sites update:

- `src/pages/api/notifications.ts:7-13` → `await listNotifications(user.id, user.role)`.
- `src/pages/api/notifications/[id].ts:7-19` → `await markNotificationRead(id, user.id, user.role)`.

Both endpoints already do `if (!user) return 401` (lines 10 and 10 respectively), satisfying the spec's "Unauthenticated notification access rejected".

**Producer `user_id` wiring** (4 sites — see Q1)

Each producer site gets the `userId` of the actor passed through:

| Site | Actor to pass | How |
|---|---|---|
| `src/pages/api/public/participants.ts:84` | `null` (anonymous) | Leave `userId` unset; the producer is anonymous, so no self-visibility needed. |
| `src/lib/server/courses.ts:215` | `createdBy` | The `createCourse` function already receives `createdBy`; pass `userId: createdBy`. |
| `src/lib/server/certificates.ts:67` | `completedBy` | Already in scope; pass `userId: completedBy`. |
| `src/lib/server/participants.ts:296` | `createdBy` | Already in scope; pass `userId: createdBy`. |
| `src/lib/server/enrollments.ts:152` | `input.enrolledBy` | Already in scope; pass `userId: input.enrolledBy`. |

Site #1 (public/participants) intentionally leaves `userId` null because the producer is the anonymous HTTP caller; the spec scenario "Producer sees a role-targeted notification they themselves cannot receive" is moot for anonymous producers.

**Allowlist test (new)**

`src/lib/server/__tests__/notifications-producers.test.ts`:

- For each of the 5 producer sites, parse the source with a regex (or call into a tiny `extractAudienceRole(src, kind)` helper that reads the file) and assert the `audienceRole` literal in the call site equals `'admin'`. This is brittle but the spec asks for "pin the current producers ... to their intended audience roles before the behavior flip is enabled in production".
- Alternatively (preferred, less brittle): expose `producerAudienceMap: Record<NotificationKind, CanonicalRole>` from `src/lib/server/notifications.ts` and assert each `createNotification({ kind, audienceRole })` call site's `audienceRole` matches the map (via a vitest `vi.mock` and `expect.objectContaining`).

### Capability 4 — CI and Component Tests

**`app/package.json` scripts**

```json
"scripts": {
  ...,
  "test:unit": "vitest run",
  "test:run": "vitest run",
  "test": "vitest"
}
```

(`test:run` kept for the local developer ergonomics; CI uses `test:unit`.)

**`.github/workflows/ci.yml` changes**

- Remove `--if-present` from line 31 (`npm run test:unit --if-present` → `npm run test:unit`). Missing script now fails with npm's standard "Missing script" error.
- Add `services.postgres` block (mirror `docker-compose.yml:1-18`):

```yaml
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_USER: acoes
      POSTGRES_PASSWORD: ${{ secrets.POSTGRES_PASSWORD }}
      POSTGRES_DB: acoes_test
    ports: ['5432:5432']
    options: >-
      --health-cmd "pg_isready -U acoes -d acoes_test"
      --health-interval 10s --health-timeout 5s --health-retries 5
```

- Restore the `e2e` job (currently commented at `.github/workflows/ci.yml:42-78`) with the live service:

```yaml
e2e:
  name: E2E Tests
  runs-on: ubuntu-latest
  needs: [test]
  services:
    postgres: { ... as above ... }
  env:
    DATABASE_URL: postgres://acoes:${{ secrets.POSTGRES_PASSWORD }}@localhost:5432/acoes_test
    INITIAL_ADMIN_EMAIL: admin@acoes.local
    INITIAL_ADMIN_PASSWORD: Admin1234!
    POSTGRES_PASSWORD: ${{ secrets.POSTGRES_PASSWORD }}
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: '20', cache: 'npm' }
    - run: npm ci
    - run: npm ci
      working-directory: app
    - run: npx playwright install --with-deps chromium
    - run: npm run build
    - run: npm run build
      working-directory: app
    - name: Start backend
      run: npm start &
    - name: Start SPA
      working-directory: app
      run: npm run dev &
    - name: Wait for backend
      run: npx wait-on http://localhost:4321 --timeout 60000
    - name: Run Playwright E2E
      working-directory: app
      run: npx playwright test
      env:
        CI: 'true'   # playwright.config.ts:7 reads CI for retries
```

- **Missing secrets**: add an early step in both jobs:

```yaml
- name: Require Postgres password secret
  run: |
    if [ -z "${{ secrets.POSTGRES_PASSWORD }}" ]; then
      echo "::error::Missing secret: POSTGRES_PASSWORD"
      exit 1
    fi
```

This satisfies the spec scenarios "Missing DB credentials abort the workflow" and "Missing push secrets abort only the push-related step" — only the relevant job's check fails; the other job keeps running.

**Component suite repairs**

| File | Action | Notes |
|---|---|---|
| `app/tests/component/LoginPage.test.tsx:7` | Modify | `import LoginPage from '@/pages/login'` → `import { LoginPage } from '@/pages/LoginPage'`. Adjust expectations on lines 35-37 (label `contraseña` becomes `contraseña` — same string, no change). |
| `app/tests/component/CoursesCatalogPage.test.tsx:7` | Modify | `import CoursesCatalogPage from '@/pages/courses/index'` → `import { CatalogoCursosPage } from '@/pages/CatalogoCursosPage'` and rename the `describe` block. MSW handlers on lines 93-99 stay; adjust response shape if `CatalogoCursosPage` expects snake_case (`app/src/services/api.ts` already maps to camelCase). |
| `app/tests/component/AdminParticipantsPage.test.tsx` | Delete | Admin participants route is explicitly parked (proposal §"Out of scope"). Test imports a non-existent page; removing the test honors the recortado scope. |

### Capability 5 — OpenSpec Scaffolding

**`openspec/config.yaml` (corrected content)**

```yaml
# openspec/config.yaml
# Real schema per @fission-ai/openspec src/core/project-config.ts.
# Unknown keys (project, changeRoot, archiveDir) are silently ignored by the CLI;
# change root and archive dir are hard-coded to openspec/changes/ and
# openspec/changes/archive/ respectively (src/core/init.ts:createDirectoryStructure).
schema: spec-driven

context: |
  Tech stack: Astro 4 backend (Node 20, port 4321) + React 19 SPA (Vite 7, port 3000)
  + PostgreSQL 16. Auth via cookie session (bcrypt + sha256 token hash).
  Auth roles (canonical): admin, facilitador, empleado, participante.
  Backend tests: Vitest (root vitest.config.ts). App tests: Vitest (app/vitest.config.ts).
  E2E: Playwright. CI: GitHub Actions. Docker compose with postgres + backend + frontend.
  No DB migrations in the recortado scope; corrections are read-side.

rules:
  specs:
    - Use Given/When/Then for scenarios
    - Use RFC 2119 keywords (MUST, SHALL, SHOULD, MAY)
  design:
    - Cite file:line evidence for every claim
    - Resolve open questions in the design, do not defer to tasks
  tasks:
    - Group by capability; each task completable in one session
```

**Directory structure**

```
openspec/
├── README.md                  (new — documents the 3 parked changes)
├── config.yaml                (new — content above)
├── specs/
│   └── _stub/
│       └── spec.md            (new — minimal stub for `openspec validate --specs`)
└── changes/
    ├── archive/               (new — empty directory, .gitkeep)
    ├── acoes-batch-1-foundation/  (parked — see README)
    ├── acoes-batch-2-ui-export/   (parked — see README)
    ├── acoes-batch-3-admin-audit/ (parked — see README)
    └── acoes-post-migration-hardening/  (this change)
```

**Stub spec (`openspec/specs/_stub/spec.md`)**

```markdown
# Stub Specification

## Purpose

Stub spec used to verify `openspec validate --specs` parses a minimal but well-formed spec.

## Requirements

### Requirement: Stub validates

The stub SHALL be present so `openspec validate --specs` exits zero.

#### Scenario: Stub parses
- **WHEN** `openspec validate --specs` runs
- **THEN** the command exits zero and reports this stub as valid
```

**`openspec/README.md` content**

```markdown
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
```

## Data Model

**No DB migrations.** The recortado is read-side and additive.

- `users.role` CHECK constraint (`bootstrap.ts:194`) already enforces `('admin','empleado','facilitador','participante')`. Removing the `'facilitadora' => 'facilitador'` coercion means historical rows whose `role = 'facilitadora'` already violate this constraint — **BUT** the existing `bootstrap.ts:235` UPDATE happens before the CHECK is re-applied, so DBs that ever had `facilitadora` have already been migrated. For belt-and-suspenders, add to `bootstrap.ts:createTables` after line 235:

```ts
const drift = await query<{ count: string }>(
  `SELECT COUNT(*)::text AS count FROM users WHERE role = 'facilitadora'`
);
const driftCount = Number(drift.rows[0]?.count ?? '0');
if (driftCount > 0) {
  console.warn(`[role-drift] ${driftCount} users still carry role='facilitadora'. Surface via GET /api/admin/role-drift.`);
}
```

This is a soft warning, not an UPDATE. The `users_role_check` constraint will reject `facilitadora` on insert but tolerate existing rows (Postgres CHECK constraints validate writes, not reads).

- No new tables, no new columns.

## API / Contract Changes

| Endpoint | Change | Request | Response |
|---|---|---|---|
| `POST /api/public/participants` (JSON) | Schema-validated; invalid → 400 | `application/json` with camel/snake mix (existing) | 201 on success; **400** with `{error:'validation_failed', issues:[...]}` on schema failure; 500 only on infra failure |
| `POST /api/public/participants` (FormData) | No change | unchanged | unchanged |
| `GET /api/notifications` | Caller role passed to filter | — | List omits role-mismatched rows. 401 if unauthenticated (existing). |
| `PATCH /api/notifications/:id` | Caller role passed to filter | — | Returns 404 when role-mismatched. 401 if unauthenticated (existing). |
| `GET /api/admin/role-drift` (NEW) | Admin-only | — | `{ legacy_facilitadora_count: number }` |

No new headers or query params.

## Testing Strategy

| Layer | Target | File | Approach |
|---|---|---|---|
| Backend unit | Canonical roles & `normalizeRole` | `src/lib/server/__tests__/permissions.test.ts` | Replace the `normalizeRole('facilitadora') => 'facilitador'` assertion with one that asserts the function throws `RoleCoercionError` for legacy values. |
| Backend unit | Public JSON validation | `src/lib/server/__tests__/participant-public-json.test.ts` (new) | Mock `request.json()` returning `{ gender: 'Otro', ... }`; assert 400 + per-field issues; mock valid payload; assert 201. |
| Backend unit | Notification audience filter | `src/lib/server/__tests__/notifications-audience.test.ts` (new) | Insert 3 rows: `audience_role=admin`, `audience_role=participante`, `audience_role=NULL`. Call `listNotifications(uid, 'participante')`; assert only the participante/null rows come back. |
| Backend unit | Producer allowlist | `src/lib/server/__tests__/notifications-producers.test.ts` (new) | Static read of the 5 producer sites via `producerAudienceMap`; assert `audienceRole === 'admin'` for each. |
| Backend unit | Role-drift counter | `src/lib/server/__tests__/role-drift.test.ts` (new) | Seed one `facilitadora` row (via raw SQL bypassing the CHECK, or by temporarily dropping the constraint in test setup). Call `countLegacyFacilitadoraRows()`; assert 1. |
| App unit | 4-role types | `app/tests/unit/auth-permissions.test.ts` | Rewrite per Decision 1. Add `empleado` describe. |
| App unit | `RegistroPage` gender catalog | `app/tests/unit/registro-gender-options.test.ts` (new) | Render the page in jsdom; assert exactly `Femenino` and `Masculino` options for the gender `<select>`; assert no `Otro`. |
| App unit | API error shape | `app/tests/unit/api-shapes.test.ts` | Add a test that `request()` throws `ValidationApiError` with parsed `issues` when response is 400 + `validation_failed`. |
| App component | LoginPage | `app/tests/component/LoginPage.test.tsx` | Rewire import path per Decision 9. |
| App component | CatalogoCursosPage | `app/tests/component/CoursesCatalogPage.test.tsx` | Rewire import path. Adjust mock response shape to match what `CatalogoCursosPage` actually consumes (`app/src/services/api.ts:127-154` mapping is snake→camel). |
| E2E | Public registration happy path | `app/tests/e2e/public-registration.spec.ts` | Already passes against `localhost:4321/api/public/participants` (line 45). No change. |
| E2E | Public registration rejection (new) | `app/tests/e2e/public-registration-rejected.spec.ts` (new) | POST with `gender: 'Otro'`; assert status 400 + `error: 'validation_failed'`. |
| OpenSpec | `openspec validate` exit code | manual / shell test | After scaffolding, `openspec validate --specs` exits zero (covered by stub). |

## Rollout and Rollback

**Order** (independent — all 5 capabilities land in their own commits; the recortado change ships as a chained PR slice if budget requires it):

1. **Capability 5** (`openspec-scaffolding`) — additive, no behavior risk; ships first so subsequent archive work has somewhere to land.
2. **Capability 1** (`auth-and-route-protection`) — biggest UX impact (SPA redirects wrong-role users). Feature-flagged via `localStorage` opt-in on the SPA, server-side uncoditional.
3. **Capability 3** (`notification-audience-isolation`) — security tightening; producer allowlist test must be green before flipping the WHERE clause in `notifications.ts`.
4. **Capability 2** (`public-participant-validation`) — schema validation tightening; risk is over-rejecting valid submissions, mitigated by the existing E2E happy-path test.
5. **Capability 4** (`ci-and-component-tests`) — CI gating; the broken component suites are deleted/rewired as part of this slice, so the unit-test step goes green before the Postgres service step lands.

**Feature flags**

- **No feature flag** for role-vocabulary change. `facilitadora` was already silently coerced in `bootstrap.ts:235` and `permissions.ts:normalizeRole`. Removing the coercion and surfacing the count via `GET /api/admin/role-drift` is safe — admins can manually backfill if drift is detected. The risk table in the proposal flags "Role-vocabulary change breaks live sessions" as Medium; read-side only backfill avoids that.
- **No feature flag** for the notification WHERE change. The producer allowlist test pins every existing producer to `audience_role = 'admin'`, and the only producers are admin-targeted (Q1). After the change, an `admin` still sees what they saw; a `participante` stops seeing admin-targeted rows (which they were never intended to see).
- **No feature flag** for the public JSON validation. The existing E2E happy-path test is the regression net; any previously-accepted payload continues to be accepted because the shared schema is a superset of what the manual mapping already validated.

**Per-capability rollback**

| Capability | Revert action | Revert risk |
|---|---|---|
| 1 | `git revert <commit>`; `bootstrap.ts:235` re-applies the coercion; SPA guards removed. | Low — no DB schema change. |
| 2 | `git revert <commit>`; public endpoint reverts to manual mapping. | Low — anonymous JSON risk returns but is bounded by the duplicate-detector `findParticipantDuplicates` call (`src/pages/api/public/participants.ts:77`). |
| 3 | `git revert <commit>`; `listNotifications` and `markNotificationRead` revert to the `audience_role IS NOT NULL` clause. | Medium — role leak returns. Mitigated by allowlist test now in tree. |
| 4 | `git revert <commit>`; CI reverts to `--if-present` and the E2E job stays commented out. | Low — purely additive infrastructure. |
| 5 | `rm -rf openspec/` (preserves the `changes/` subdir). | None — pure file addition. |

**Chained PR budget**

Approximate diff sizes (additions + deletions):

- Capability 1: ~120 lines (manifest + guard + tests).
- Capability 2: ~80 lines (schema invocation + error mapping + tests).
- Capability 3: ~70 lines (WHERE change + 4 producer sites + allowlist test).
- Capability 4: ~150 lines (CI yml + component repairs + missing-secrets step).
- Capability 5: ~120 lines (config + README + stub + `.gitkeep`).

Total ~540 lines — comfortably under the 800-line review budget as a single PR. If the user prefers, ship Capabilities 1+2+3+4 as PR #1 (security + CI) and Capability 5 as PR #2 (scaffolding). PR #2 has no code dependencies on PR #1 because the config does not reference any of the changed files.

## Open Questions

**None blocking.** Two carry-overs to surface in the next SDD cycle:

1. **Spec 5 scenario "Missing required key is rejected by the tool"** is unsatisfiable as written. The OpenSpec CLI accepts any key and ignores unknowns; `changeRoot`/`archiveDir`/`project` are not part of its schema. The spec must be revised to assert against the real `schema` field, or the scenario must be reframed as "validation exits non-zero when `schema` is missing or empty". Out of scope for this design to fix the spec.
2. **`notifyRoles` helper** (`src/lib/server/notifications.ts:69-82`) is exported but has no callers (grep confirms). Not in scope to delete here; if a future change wants to use it, the producer-visibility wiring (Decision 7) applies — pass `userId` per role-targeted notification when an actor exists.

## References

- `openspec/changes/acoes-post-migration-hardening/proposal.md`
- `openspec/changes/acoes-post-migration-hardening/explore.md`
- `openspec/changes/acoes-post-migration-hardening/specs/auth-and-route-protection/spec.md`
- `openspec/changes/acoes-post-migration-hardening/specs/public-participant-validation/spec.md`
- `openspec/changes/acoes-post-migration-hardening/specs/notification-audience-isolation/spec.md`
- `openspec/changes/acoes-post-migration-hardening/specs/ci-and-component-tests/spec.md`
- `openspec/changes/acoes-post-migration-hardening/specs/openspec-scaffolding/spec.md`
- Engram topic `sdd/acoes-post-migration-hardening/design` (this artifact)
- Upstream schema evidence: https://github.com/Fission-AI/OpenSpec/blob/main/src/core/project-config.ts (`ProjectConfigSchema`) and `src/core/init.ts:createDirectoryStructure`.