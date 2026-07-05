# ACOES Batch 1 Foundation — Technical Design

## Current implementation pattern
- Astro pages gate access in frontmatter with `getCurrentUser()` + redirect.
- API routes in `src/pages/api/**/*.ts` use `APIRoute` + `zod`.
- SQL lives in `src/lib/server/*.ts` and uses `query()` directly.
- `ensureDatabase()` bootstraps schema imperatively.
- UI components are Astro components with inline scripts.

## Key decisions
1. Roles become canonical: `admin`, `facilitadora`, `participante`.
   - Normalize legacy `operator` -> `facilitadora`, `viewer` -> `participante`.
   - Add permission helpers instead of scattered role checks.
2. Lifecycle is separate from workflow state.
   - Add `lifecycle_state` plus `deleted_at` / `deleted_by` for soft-delete.
   - Default lists hide soft-deleted rows.
3. Correlativo uses the existing sequence.
   - Expose `participants.id` as the canonical correlativo.
   - Generate `participant_code` deterministically from the inserted id + date prefix.
4. Catalogs stay code-backed in batch 1.
   - Centralize allowed values for role/function, gender, education level, lifecycle, and geo.
5. Audit is append-only and transactional.
   - Record create/state-change/soft-delete events in the same DB transaction.
6. CSV and XLSX exports share the same filtered query.
   - Dashboard metrics come from SQL aggregates, not UI math.

## Data model changes
### `users`
- Update role constraint to canonical roles.
- Keep `active`, `created_at`, `updated_at`.

### `participants`
- Keep current identity/contact columns.
- Add: `lifecycle_state`, `deleted_at`, `deleted_by`, `district`, `education_level`, `role_function`.
- Preserve `created_by`, `updated_by`.
- Treat existing `status` as legacy only if needed.

### `audit_events` (new)
- `id`, `entity_type`, `entity_id`, `action`, `actor_user_id`, `before_data`, `after_data`, `metadata`, `created_at`.

## Data flow
### Login/session
1. Login route calls `loginUser()`.
2. Auth normalizes role and creates session.
3. Protected pages continue using server redirects.

### Participant create
1. Form renders from shared catalogs.
2. Review page posts to internal/public API.
3. API validates with shared schema.
4. Service inserts participant, derives `participant_code`, writes audit, returns row.

### Lifecycle change
1. Admin hits dedicated mutation route.
2. Service updates lifecycle fields.
3. Audit row is written in the same transaction.
4. Normal lists exclude soft-deleted rows.

### Dashboard/export
1. Dashboard requests aggregates and filtered lists.
2. SQL returns counts/groupings.
3. CSV/XLSX use the same filter builder and row mapper.

## File impact
### Update
- `src/lib/server/auth.ts`
- `src/lib/server/bootstrap.ts`
- `src/lib/server/participants.ts`
- `src/pages/api/login.ts`
- `src/pages/api/participants.ts`
- `src/pages/api/public/participants.ts`
- `src/pages/registro/revisar.astro`
- `src/components/Contact.astro`
- `src/components/ParticipantReview.astro`
- `src/components/Programs.astro`
- `src/components/Stats.astro`
- `src/pages/dashboard/index.astro`
- `src/pages/dashboard/exportaciones.astro`
- `src/pages/dashboard/participantes/index.astro`

### Add
- `src/lib/server/permissions.ts`
- `src/lib/server/catalogs.ts`
- `src/lib/server/participant-schema.ts`
- `src/lib/server/audit.ts`
- `src/pages/api/participants/[id].ts`
- `src/pages/api/participants/[id]/audit.ts`
- `src/pages/api/dashboard/metrics.ts` (optional)
- `src/pages/api/export/participants.ts` or extend current route with `format=xlsx`

## Interfaces / contracts
- `normalizeRole(dbRole)`
- `hasPermission(user, permissionKey)`
- `requirePermission(user, permissionKey)`
- `listParticipants(filters)`
- `getParticipantMetrics(filters)`
- `createParticipant(input, actorUserId, source)`
- `updateParticipant(id, patch, actorUserId)`
- `softDeleteParticipant(id, actorUserId)`
- `restoreParticipant(id, actorUserId)`
- `exportParticipantsCsv(participants)`
- `exportParticipantsXlsx(participants)`
- `recordAuditEvent(txn, payload)`

## Testing strategy
- `astro check` / `npm run build` for types and route correctness.
- Unit tests for permission normalization, catalog schemas, correlativo generation, export mapping, and audit payloads.
- Integration or SQL smoke tests for create + audit, soft-delete hiding, dashboard aggregates, and CSV/XLSX parity.
- Manual browser smoke tests for auth gating, registration, dashboard, and export downloads.

## Migration / rollback
### Migration
- Normalize user roles: `operator` -> `facilitadora`, `viewer` -> `participante`.
- Add participant lifecycle and missing PRD columns.
- Create `audit_events`.
- Keep historical rows readable; avoid rewriting old participant codes unless required.

### Rollback
- Prefer additive schema changes.
- Keep CSV as fallback if XLSX fails.
- Accept legacy payloads during transition.

## Open questions
1. Should `status` be retired or kept as a separate workflow field?
2. What exact catalog values are approved for `education_level`?
3. Is facilitadora invitation expiry (72h) in batch 1 or next batch?
4. Do we need DB-backed catalogs now, or is code-backed cataloging enough?
5. Should dashboard date filters use `created_at` only?
6. Is `id` enough as the visible correlativo, or do we still want a separate public code?

## Readiness
This design is ready for task breakdown. Remaining ambiguity is product-level, not architectural.
