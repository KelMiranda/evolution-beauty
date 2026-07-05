# ACOES Batch 3 - Admin User Management + Auditoria UI
# Technical Design

## 1. Architecture Decisions

### 1.1 Stack Adherence
- Astro pages for all UI (server-rendered, no new framework)
- Inline script tags in Astro components for progressive enhancement
- Raw SQL via existing query() and withTransaction() helpers in db.ts
- Zod for all input validation (form submissions and API payloads)
- bcryptjs for password hashing (already in use)

### 1.2 Permission Model
Extend PermissionKey in permissions.ts with two new keys:
- users:manage -- gates user CRUD pages and API routes
- users:audit -- gates audit trail viewer

admin role gets both. No other roles change. New helper:
  export function canManageUsers(user: { role: CanonicalRole } | null)

canViewAuditTrail already exists via participants:audit; add users:audit to admin
so it gates the global audit trail independently.

### 1.3 Audit Entity Type
AuditEntityType in audit.ts already includes user. User mutations emit entity_type = user.

### 1.4 No New npm Packages
All required utilities (bcryptjs, zod, pg) are already present.

---

## 2. Data Flow

### 2.1 User CRUD

GET /dashboard/usuarios
  frontmatter: getCurrentUser() + canManageUsers() gate
  listUsers() returns UserRow[] -> Users.astro renders table

GET /dashboard/usuarios/nuevo -> UserForm.astro (create mode)

POST /api/users
  validateUserSubmission(formData)
  createUser(input, actorUserId) [withTransaction]
  recordAuditEvent(tx, entityType=user, action=create)
  redirect /dashboard/usuarios?created=1

GET /dashboard/usuarios/editar/[id]
  getUserById(id) -> UserForm.astro (edit mode)

PUT /api/users/[id]
  validateUserSubmission(formData)
  updateUser(id, patch, actorUserId) [withTransaction]
  recordAuditEvent(tx, entityType=user, action=update)
  redirect /dashboard/usuarios?updated=1

PATCH /api/users/[id]/deactivate
  deactivateUser(id, actorUserId) [withTransaction, self-deactivation blocked]
  recordAuditEvent(tx, entityType=user, action=deactivate)
  redirect /dashboard/usuarios?deactivated=1

### 2.2 Audit Trail Viewer

GET /dashboard/auditoria
  frontmatter: getCurrentUser() + canViewAuditTrail() gate
  reads query params: entityType, entityId, actorUserId, action, dateFrom, dateTo, page
  listAuditEvents(filters) + countAuditEvents(filters)
  AuditTrail.astro renders filter sidebar + table + pagination (50 rows/page)

### 2.3 Transaction Pattern
withTransaction(async (tx) => {
  const result = await tx.query(INSERT INTO users ... RETURNING *, [...]);
  const user = result.rows[0];
  await recordAuditEvent(tx, { entityType: user, entityId: user.id, action: create, actorUserId, afterData: user });
  return user;
});

---

## 3. File Changes

### Modify (4 files)

src/lib/server/permissions.ts
  + Add users:manage, users:audit to PermissionKey type
  + Add both to admin entry in permissionMatrix
  + Add canManageUsers() helper

src/lib/server/audit.ts
  + Add AuditEventFilters type
  + Add listAuditEvents(filters) overload with filter params
  + Add countAuditEvents(filters)

src/lib/server/users.ts (NEW)
  User CRUD server functions

src/lib/server/user-schema.ts (NEW)
  Zod validation schema for user form

### Add (9 files)

src/lib/server/users.ts: User CRUD server functions
src/lib/server/user-schema.ts: Zod validation schema
src/pages/api/users.ts: POST create user
src/pages/api/users/[id].ts: PUT update, PATCH deactivate
src/pages/dashboard/usuarios/index.astro: User listing page
src/pages/dashboard/usuarios/nuevo.astro: Create user page
src/pages/dashboard/usuarios/editar/[id].astro: Edit user page
src/pages/dashboard/auditoria.astro: Audit trail viewer
src/components/Users.astro: User table with role badges
src/components/UserForm.astro: Shared create/edit form
src/components/AuditTrail.astro: Audit events table + filter sidebar

---

## 4. Interfaces / Contracts

### 4.1 UserRow
type UserRow = {
  id: number;
  email: string;
  full_name: string;
  role: CanonicalRole;
  active: boolean;
  created_at: string;
  updated_at: string;
};

### 4.2 UserInput (create)
type UserInput = {
  email: string;
  password: string;
  fullName: string;
  role: CanonicalRole;
  active: boolean;
};

### 4.3 UserPatch (update)
type UserPatch = Partial<Omit<UserInput, password>> & { password?: string };

### 4.4 AuditEventFilters
type AuditEventFilters = {
  entityType?: AuditEntityType;
  entityId?: number;
  actorUserId?: number;
  action?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
};

### 4.5 listAuditEvents(filters) -- new overload
Returns AuditEventRow[] ordered by created_at DESC, id DESC with limit/offset applied.

### 4.6 countAuditEvents(filters)
Returns total count for pagination; same filter logic as listAuditEvents.

---

## 5. Server Functions (src/lib/server/users.ts)

export async function listUsers(): Promise<UserRow[]>
  SELECT id, email, full_name, role, active, created_at FROM users ORDER BY created_at DESC

export async function getUserById(id: number): Promise<UserRow | null>

export async function createUser(input: UserInput, actorUserId: number): Promise<UserRow>
  withTransaction: INSERT + recordAuditEvent(action=create)
  Hash password: bcrypt.hash(input.password, 10)

export async function updateUser(id: number, patch: UserPatch, actorUserId: number): Promise<UserRow>
  withTransaction: UPDATE + recordAuditEvent(action=update, beforeData, afterData)

export async function deactivateUser(id: number, actorUserId: number): Promise<void>
  withTransaction: UPDATE users SET active = FALSE + recordAuditEvent(action=deactivate)
  THROWS if id === actorUserId (self-deactivation blocked)

---

## 6. Zod Schema (src/lib/server/user-schema.ts)

const userSubmissionSchema = z.object({
  email: z.string().email(Correo invalido),
  password: z.string().min(8, La contrasena debe tener al menos 8 caracteres),
  fullName: z.string().trim().min(2, El nombre es obligatorio),
  role: z.enum([admin, facilitadora, participante]),
  active: z.boolean(),
});

export function extractUserSubmission(formData: FormData): UserSubmission
export function validateUserSubmission(formData: FormData): ZodSafeParseResult

---

## 7. Permission Helpers

PermissionKey additions:
  | users:manage
  | users:audit

permissionMatrix admin entry gets both new permissions.

export function canManageUsers(user) {
  return hasPermission(user, users:manage);
}

canViewAuditTrail maps to participants:audit for backward compat;
admin also gets users:audit independently.

---

## 8. API Route Signatures

POST /api/users
  Request: FormData { email, password, fullName, role, active }
  Response: 302 redirect /dashboard/usuarios?created=1
  Errors: 401, 403, 400

PUT /api/users/[id]
  Request: FormData { email, fullName, role, active, password? }
  Response: 302 redirect /dashboard/usuarios?updated=1
  Errors: 401, 403, 400, 404

PATCH /api/users/[id]/deactivate
  Response: 302 redirect /dashboard/usuarios?deactivated=1
  Errors: 401, 403, 400 (self-deactivation), 404

---

## 9. UI Components

### Users.astro
Table with Email, Nombre, Rol (badge), Estado, Fecha, Acciones.
Role badges: admin (blue), facilitadora (gold), participante (slate).
Inline script handles deactivate button.

### UserForm.astro
Shared create/edit form. Password field only in create mode.
Submit via fetch POST/PUT, success redirects, error shows inline.

### AuditTrail.astro
Filter sidebar + table + pagination (50 rows/page).
Inline script builds URL query params for filters and pagination.

---

## 10. Testing Strategy

Unit: users.ts SQL/audit calls, user-schema validation, audit filter WHERE clause
Integration: CRUD + audit flow, permission gates, pagination
Build: astro check, npm run build

---

## 11. Migration / Rollback

Migration: additive, no DB changes needed (users and audit_events tables exist)
Rollback: delete files in reverse dependency order, revert permissions.ts and audit.ts
No data loss: all audit_events rows remain in DB.

---

## 12. Open Questions

1. Password reset: UserForm hides password on edit. Should there be a Reset password action that generates a temp password? Confirm no admin password-reset needed in Batch 3.

2. Email uniqueness: users.email has UNIQUE constraint. Create/edit hitting duplicate email throws PG error. Should this be caught and surfaced as friendly 'Este correo ya esta registrado' message?

3. Self role change: Admin changes own role to facilitadora -> loses admin dashboard access. Should role changes for own account be allowed/warned/blocked?

4. Audit date filter scope: dateFrom/dateTo filter on created_at (audit event timestamp). Confirm this is correct; updated_at of user row is NOT considered.

5. Pagination URL format: /dashboard/auditoria?entityType=user&page=2. Confirm all filters + page in query params, page defaults to 1.

6. bcrypt salt rounds: hardcoded to 10. Should be configurable via env var? Keep as 10 (existing pattern).

7. Audit action vocabulary: Use 'deactivate' for user soft-deactivation (distinct from participants 'soft_delete').
