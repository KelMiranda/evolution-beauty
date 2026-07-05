# ACOES Batch 3 — Admin User Management + Auditoría UI

## 1. Intent

Enable admin users to manage system user accounts (create, edit, deactivate) and review a filtered audit trail of all system events. Extends the ACOES platform's admin capabilities using existing patterns (Astro + raw SQL + Zod, inline scripts, permission helpers, transactional audit).

## 2. Scope

### In scope

- **User CRUD**: Admin creates users, edits name/email/role/active status, and soft-deactivates users. Self-deactivation blocked.
- **User listing**: Dashboard page listing all users with role badges (admin / facilitadora / participante) and active/inactive indicator.
- **Audit trail viewer**: Dashboard page listing all `audit_events` with filters by entity_type, entity_id, actor_user_id, action, and date range (from/to). Paginated list (50 rows default).
- **Permission guard**: Only `admin` role can access user management and audit trail pages. Existing `canManageParticipants` permission reused for participants; new `canManageUsers` and `canViewAuditTrail` permissions gate these pages.

### Out of scope

- User password reset / change password (deferred to future batch).
- Bulk user import.
- Audit event detail expand/JSON view (list-only in this batch).
- Participant audit sub-page (already exists at `/api/participants/[id]/audit`); focus is on global audit trail.

## 3. Approach

### 3.1 Architecture

Follow existing patterns precisely:
- Astro pages gate access in frontmatter with `getCurrentUser()` + redirect.
- API routes in `src/pages/api/users/**/*.ts` use the same `APIRoute` + Zod pattern.
- SQL lives in `src/lib/server/users.ts` and `src/lib/server/audit.ts`.
- `withTransaction` for all writes (create/update/deactivate) with audit event in same txn.
- UI components are Astro components with inline scripts; no new runtime frameworks.

### 3.2 User CRUD flow

```
GET /dashboard/usuarios
  -> frontmatter: getCurrentUser() + admin role gate
  -> listUsers() returns { id, email, full_name, role, active, created_at }
  -> Users.astro renders table with role badges

GET /dashboard/usuarios/nuevo
  -> renders UserForm.astro in create mode

POST /api/users
  -> validate via validateUserSubmission() (Zod schema)
  -> createUser(input, actorUserId)
  -> record audit event (create action)
  -> redirect to /dashboard/usuarios?created=1

GET /dashboard/usuarios/editar/[id]
  -> fetch user via getUserById(id)
  -> render UserForm.astro in edit mode

PUT /api/users/[id]
  -> validate via validateUserSubmission()
  -> updateUser(id, patch, actorUserId)
  -> record audit event (update action)
  -> redirect to /dashboard/usuarios?updated=1

PATCH /api/users/[id]/deactivate
  -> set users.active = FALSE (soft-deactivate)
  -> record audit event (deactivate action)
  -> redirect to /dashboard/usuarios?deactivated=1
  -> block if id === currentUser.id
```

### 3.3 Audit trail viewer flow

```
GET /dashboard/auditoria
  -> frontmatter: getCurrentUser() + admin role gate
  -> read query params: entityType, entityId, actorUserId, action, dateFrom, dateTo, page
  -> listAuditEvents({ entityType, entityId, actorUserId, action, dateFrom, dateTo, limit: 50, offset })
  -> AuditTrail.astro renders table + filter form + pagination
```

### 3.4 Permission additions

```typescript
// src/lib/server/permissions.ts — add:
| 'users:manage'
| 'users:audit'

// permissionMatrix:
admin: [...existing..., 'users:manage', 'users:audit']
facilitadora: [...existing...]
participante: [...existing...]

// new helpers:
canManageUsers(user)
canViewAuditTrail(user)  // already exists as canViewAuditTrail
```

### 3.5 New server functions

```typescript
// src/lib/server/users.ts
export async function listUsers(): Promise<UserRow[]>
export async function getUserById(id: number): Promise<UserRow | null>
export async function createUser(input: UserInput, actorUserId: number): Promise<UserRow>
export async function updateUser(id: number, patch: UserPatch, actorUserId: number): Promise<UserRow>
export async function deactivateUser(id: number, actorUserId: number): Promise<void>

// src/lib/server/audit.ts — extend
export async function listAuditEvents(filters: AuditEventFilters): Promise<AuditEventRow[]>
export async function countAuditEvents(filters: AuditEventFilters): Promise<number>
```

### 3.6 Audit entity_type additions

`AuditEntityType` in `audit.ts` already covers `'participant' | 'session' | 'user'`. User mutations will use `entity_type = 'user'`.

## 4. Affected Areas

### Modify

| File | Change |
|------|--------|
| `src/lib/server/permissions.ts` | Add `users:manage` and `users:audit` permissions; add `canManageUsers()` helper |
| `src/lib/server/audit.ts` | Extend `AuditEntityType` (already has `'user'`); add `listAuditEvents(filters)` and `countAuditEvents(filters)` overloads with filter params |
| `src/pages/api/participants/[id].ts` | (no change — existing audit endpoints unchanged) |

### Add

| File | Purpose |
|------|---------|
| `src/lib/server/users.ts` | User CRUD server functions |
| `src/pages/api/users.ts` | POST (create user) |
| `src/pages/api/users/[id].ts` | PUT (update user), PATCH (deactivate) |
| `src/pages/dashboard/usuarios/index.astro` | User listing page |
| `src/pages/dashboard/usuarios/nuevo.astro` | Create user page |
| `src/pages/dashboard/usuarios/editar/[id].astro` | Edit user page |
| `src/pages/dashboard/auditoria.astro` | Audit trail viewer page |
| `src/components/Users.astro` | User listing table with role badges |
| `src/components/UserForm.astro` | Shared create/edit form |
| `src/components/AuditTrail.astro` | Audit events table with filter sidebar |
| `openspec/changes/acoes-batch-3-admin-audit/specs/user-management/spec.md` | User CRUD spec |
| `openspec/changes/acoes-batch-3-admin-audit/specs/audit-trail-ui/spec.md` | Audit trail viewer spec |

## 5. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Admin locks themselves out by deactivating own account | Low | High | Block self-deactivation at API layer; return 400 error |
| Audit trail query performance with large dataset | Medium | Medium | Add indexes on `audit_events(entity_type, entity_id)` and `audit_events(created_at)`; paginate at 50 rows |
| Role normalization breaks existing session on login | Low | Medium | `normalizeRole()` already handles legacy roles; verify in smoke test |
| New permission keys not recognized for existing admin sessions | Low | Low | Permissions checked at page load; no cached permission strings |
| User email uniqueness violation | Low | Low | Catch unique constraint error on INSERT and surface friendly message |

## 6. Rollback

- Remove `users:manage` and `users:audit` from `permissionMatrix` and `PermissionKey` type.
- Delete `src/lib/server/users.ts`.
- Delete API routes: `src/pages/api/users.ts`, `src/pages/api/users/[id].ts`.
- Delete pages: `src/pages/dashboard/usuarios/`, `src/pages/dashboard/auditoria.astro`.
- Delete components: `Users.astro`, `UserForm.astro`, `AuditTrail.astro`.
- Revert `permissions.ts` to prior state.
- No DB migration reversal needed (additive schema; users table already exists).
- No data loss: all audit_events rows remain readable via existing participant-level audit endpoints.

## 7. Dependencies

### Internal

- `src/lib/server/auth.ts` — `getCurrentUser()`, `AuthUser` type (unchanged)
- `src/lib/server/permissions.ts` — permission matrix and helpers
- `src/lib/server/audit.ts` — `recordAuditEvent()`, `AuditEntityType`
- `src/lib/server/bootstrap.ts` — users table already bootstrapped
- `src/lib/server/db.ts` — `query()`, `withTransaction`

### External

- `bcryptjs` — already in use for password hashing during user create/update
- No new npm packages required

## 8. Success Criteria

1. Admin can create a new user with name, email, role, and active status; sees redirect to user list with success message.
2. Admin can edit an existing user's name, email, and role; changes persist after redirect.
3. Admin can deactivate a user; deactivated users cannot log in; list shows inactive badge.
4. Admin cannot deactivate their own account (API returns 400; UI button disabled if editing self).
5. User list page shows role badges with distinct styling per role (admin/facilitadora/participante).
6. Audit trail page loads at `/dashboard/auditoria` and displays audit_events rows ordered by created_at DESC.
7. Applying all filters (entity_type, entity_id, actor_user_id, action, dateFrom, dateTo) narrows the list correctly.
8. Pagination advances through results 50 rows at a time.
9. Non-admin users receive 302 redirect away from `/dashboard/usuarios` and `/dashboard/auditoria`.
10. All new API routes return appropriate HTTP status codes (201 for create, 200 for update, 400 for validation error, 403 for permission denied).
11. Every create/update/deactivate user action writes an audit event with `entity_type='user'` in the same transaction.
12. `astro check` and `npm run build` pass with no new errors.