# Tasks: ACOES Batch 1 Foundation

## Phase 1: Foundation and Permission Model

- [x] 1.1 Update `src/lib/server/auth.ts` to normalize legacy roles into `admin`, `facilitadora`, and `participante`, and verify protected-page access still uses the canonical role values.
- [x] 1.2 Add `src/lib/server/permissions.ts` with named permission checks for admin, facilitation, and participant-facing actions.
- [x] 1.3 Update `src/lib/server/bootstrap.ts` to align the `users` role constraint with the canonical roles and preserve existing active/user timestamps.
- [ ] 1.4 Add or update server-side tests for role normalization and permission checks, covering admin allow, participant deny, and invalid-session deny cases.

## Phase 2: Participant Lifecycle and Correlativo

- [x] 2.1 Update `src/lib/server/participants.ts` to add participant lifecycle fields (`lifecycle_state`, `deleted_at`, `deleted_by`) and align create/update/list behavior with active/inactive/soft-delete rules.
- [x] 2.2 Implement correlativo behavior in `src/lib/server/participants.ts` so `participants.id` remains the canonical correlativo and `participant_code` is derived consistently after insert.
- [x] 2.3 Update `src/lib/server/bootstrap.ts` schema changes for the participant lifecycle columns and any legacy `status` handling required by the design.
- [ ] 2.4 Add tests for participant lifecycle transitions, soft-delete hiding in default lists, and correlativo generation consistency.

## Phase 3: Catalog and Validation Wiring

- [x] 3.1 Add `src/lib/server/catalogs.ts` to centralize allowed catalog values for role/function, gender, education level, lifecycle, and geo fields.
- [x] 3.2 Add `src/lib/server/participant-schema.ts` to validate participant input against the shared catalogs and required field set.
- [x] 3.3 Update `src/pages/registro/revisar.astro` and `src/pages/api/public/participants.ts` to use the shared participant schema before write operations.
- [x] 3.4 Update `src/components/Contact.astro` and `src/components/ParticipantReview.astro` to surface catalog-backed fields and validation errors from the shared schema.
- [ ] 3.5 Add tests for valid catalog submission, missing catalog option rejection, and multiple-field validation failures.

## Phase 4: Audit Trail

- [x] 4.1 Add `src/lib/server/audit.ts` with an append-only audit event writer that records actor, entity, action, before/after data, and metadata.
- [x] 4.2 Update `src/lib/server/participants.ts` so create, state change, and soft-delete mutations write audit events in the same transaction.
- [x] 4.3 Add `src/pages/api/participants/[id]/audit.ts` to expose audit history for authorized users.
- [ ] 4.4 Add tests for audit creation on participant create and lifecycle changes, plus rejection of failed writes as successful audit events.

## Phase 5: UI and API Wiring

- [x] 5.1 Update `src/pages/api/participants.ts` to route participant creation through the shared service and permission layer.
- [x] 5.2 Add `src/pages/api/participants/[id].ts` for participant lifecycle mutations that enforce the new permission checks.
- [x] 5.3 Update `src/pages/dashboard/participantes/index.astro` to hide soft-deleted rows by default and respect role-based access.
- [x] 5.4 Update `src/pages/dashboard/index.astro` and `src/pages/dashboard/exportaciones.astro` only as needed to keep existing navigation consistent with the new permission model.
- [ ] 5.5 Verify the registration review flow, dashboard access, and participant mutation paths manually in the browser after API wiring.

## Phase 6: Testing and Cleanup

- [x] 6.1 Run `astro check` to confirm route and type correctness after the auth, participant, and audit changes.
- [x] 6.2 Run `npm run build` to validate the end-to-end foundation batch compiles cleanly.
- [ ] 6.3 Add or update integration smoke tests for participant creation, soft-delete hiding, and audit retrieval flows.
- [x] 6.4 Clean up any legacy role references (`operator`, `viewer`) and dead lifecycle assumptions left in the touched files.
