# Tasks: ACOES Batch 3 — Admin User Management + Auditoria UI

## Phase 1: Server Functions and Schema

- [x] 1.1 Add `users:manage` and `users:audit` to `PermissionKey` type in `src/lib/server/permissions.ts`. Add both keys to the `admin` entry in `permissionMatrix`. Add `canManageUsers(user)` helper that calls `hasPermission(user, 'users:manage')`.

- [x] 1.2 Add `AuditEventFilters` type and `listAuditEvents(filters: AuditEventFilters)` overload to `src/lib/server/audit.ts`. Add `countAuditEvents(filters: AuditEventFilters)` function returning total count for pagination. Both use same filter WHERE logic, ordered by `created_at DESC, id DESC` with `limit`/`offset`.

- [x] 1.3 Create `src/lib/server/user-schema.ts` with `userSubmissionSchema` Zod object: `email` (string.email), `password` (string.min(8)), `fullName` (string.trim.min(2)), `role` (z.enum of CanonicalRole), `active` (boolean). Export `extractUserSubmission(formData: FormData): UserInput` and `validateUserSubmission(formData: FormData): ZodSafeParseResult`.

- [x] 1.4 Create `src/lib/server/users.ts` with: `listUsers(): Promise<UserRow[]>` (SELECT id, email, full_name, role, active, created_at FROM users ORDER BY created_at DESC), `getUserById(id: number): Promise<UserRow | null>`, `createUser(input: UserInput, actorUserId: number): Promise<UserRow>` (withTransaction, bcrypt.hash password, recordAuditEvent action=create), `updateUser(id: number, patch: UserPatch, actorUserId: number): Promise<UserRow>` (withTransaction, recordAuditEvent action=update with beforeData/afterData), `deactivateUser(id: number, actorUserId: number): Promise<void>` (withTransaction, UPDATE SET active=FALSE, recordAuditEvent action=deactivate, THROWS if id === actorUserId).

## Phase 2: API Routes

- [x] 2.1 Create `src/pages/api/users.ts` with POST handler: validate via `validateUserSubmission()`, call `createUser()`, redirect `/dashboard/usuarios?created=1`. Gate with `canManageUsers()`; return 401/403/400.

- [x] 2.2 Create `src/pages/api/users/[id].ts` with PUT handler: validate via `validateUserSubmission()`, call `updateUser(id, patch, actorUserId)`, redirect `/dashboard/usuarios?updated=1`. Return 404 if user not found, 400 on self-deactivation attempt.

- [x] 2.3 Add PATCH handler to `src/pages/api/users/[id].ts` at `/deactivate` sub-path: call `deactivateUser(id, actorUserId)`, redirect `/dashboard/usuarios?deactivated=1`. Return 400 on self-deactivation, 404 if not found.

## Phase 3: UI Pages and Components

- [x] 3.1 Create `src/components/Users.astro`: table with columns Email, Nombre, Rol (badge: admin=blue, facilitadora=gold, participante=slate), Estado, Fecha, Acciones. Inline script handles deactivate button fetch to `/api/users/[id]/deactivate`. Accept `users: UserRow[]`, `canManage: boolean` props.

- [x] 3.2 Create `src/pages/dashboard/usuarios/index.astro`: frontmatter calls `getCurrentUser()` + `canManageUsers()` gate, `listUsers()`. Render `Users.astro` component with table. Support `?created`, `?updated`, `?deactivated` query params for success toast.

- [x] 3.3 Create `src/components/UserForm.astro`: shared create/edit form. Props: `mode: 'create' | 'edit'`, optional `user?: UserRow`. Password field shown only in create mode. Submit via fetch POST (create) or PUT (edit), success redirects, error shows inline. Use Zod validation error display.

- [x] 3.4 Create `src/pages/dashboard/usuarios/nuevo.astro`: frontmatter with `getCurrentUser()` + `canManageUsers()` gate. Render `UserForm.astro` in create mode. Form action points to `/api/users`.

- [x] 3.5 Create `src/pages/dashboard/usuarios/editar/[id].astro`: frontmatter with `getCurrentUser()` + `canManageUsers()` gate + `getUserById(id)`. Render `UserForm.astro` in edit mode pre-filled with user data. Return 404 if user not found.

- [x] 3.6 Create `src/components/AuditTrail.astro`: filter sidebar + table + pagination (50 rows/page). Props: `events: AuditEventRow[]`, `total: number`, `filters: AuditEventFilters`, `page: number`. Inline script builds URL query params for filters and pagination. Filter inputs: entityType dropdown, entityId, actorUserId, action, dateFrom, dateTo.

- [x] 3.7 Create `src/pages/dashboard/auditoria.astro`: frontmatter with `getCurrentUser()` + `canViewAuditTrail()` gate. Read query params, call `listAuditEvents(filters)` + `countAuditEvents(filters)`. Render `AuditTrail.astro`. Pagination at 50 rows/page. URL format: `/dashboard/auditoria?entityType=user&page=2`.

## Phase 4: Testing

- [x] 4.1 Create `src/lib/server/__tests__/users.test.ts` testing: `listUsers()` SQL, `getUserById()` null case, `createUser()` transaction + audit event, `updateUser()` beforeData/afterData, `deactivateUser()` self-deactivation throws.

- [x] 4.2 Create `src/lib/server/__tests__/user-schema.test.ts` testing: valid submission parses, email validation errors, password min length, required fields, `extractUserSubmission` FormData mapping.

- [x] 4.3 Create `src/lib/server/__tests__/audit.test.ts` testing: `listAuditEvents` filter WHERE clause (entityType, entityId, actorUserId, action, dateFrom, dateTo), `countAuditEvents` returns correct total, limit/offset pagination.

- [x] 4.4 Run `astro check` to confirm route and type correctness after all changes.

- [x] 4.5 Run `npm run build` to validate end-to-end compilation.

---

## Implementation Order

```
Phase 1 → Phase 2 → Phase 3 → Phase 4
   ↓          ↓         ↓          ↓
 1.1-1.4   2.1-2.3   3.1-3.7   4.1-4.5
```

Phase 1 (server functions + schema) is independent and completes first.
Phase 2 (API routes) depends on Phase 1 types and functions.
Phase 3 (UI pages + components) depends on Phase 1 (server functions) and Phase 2 (API routes).
Phase 4 (tests + build) depends on all code being in place.

## File Manifest

| File | Action |
|------|--------|
| `src/lib/server/permissions.ts` | Modify |
| `src/lib/server/audit.ts` | Modify |
| `src/lib/server/user-schema.ts` | Add |
| `src/lib/server/users.ts` | Add |
| `src/pages/api/users.ts` | Add |
| `src/pages/api/users/[id].ts` | Add |
| `src/components/Users.astro` | Add |
| `src/pages/dashboard/usuarios/index.astro` | Add |
| `src/components/UserForm.astro` | Add |
| `src/pages/dashboard/usuarios/nuevo.astro` | Add |
| `src/pages/dashboard/usuarios/editar/[id].astro` | Add |
| `src/components/AuditTrail.astro` | Add |
| `src/pages/dashboard/auditoria.astro` | Add |
| `src/lib/server/__tests__/users.test.ts` | Add |
| `src/lib/server/__tests__/user-schema.test.ts` | Add |
| `src/lib/server/__tests__/audit.test.ts` | Add |

## Open Questions Status

- Q1 (password reset): **Confirmed** — no admin password-reset in Batch 3. Password hidden on edit.
- Q2 (email uniqueness): **Pending** — catch PG duplicate email error, surface as friendly "Este correo ya esta registrado".
- Q3 (self role change): **Pending** — allow but warn; not blocked in Batch 3.
- Q4 (audit date filter scope): **Confirmed** — filters on `created_at` (audit event timestamp), not user row `updated_at`.
- Q5 (pagination URL format): **Confirmed** — `/dashboard/auditoria?entityType=user&page=2`, page defaults to 1.
- Q6 (bcrypt salt rounds): **Confirmed** — keep hardcoded 10.
- Q7 (audit action vocabulary): **Confirmed** — use `deactivate` for user soft-deactivation.

## Readiness for sdd-apply

**Ready.** Architecture aligns with existing Astro + raw SQL + Zod + bcryptjs patterns. Key patterns to follow:
- Permission gating: `canManageUsers()`, `canViewAuditTrail()`
- SQL: follow existing `query()` and `withTransaction()` pattern from `participants.ts`
- Audit events: use `withTransaction` + `recordAuditEvent` with beforeData/afterData
- Form validation: reuse `extractUserSubmission` / `validateUserSubmission` pattern
- Inline scripts: follow `Programs.astro` fetch pattern for deactivate and form submit