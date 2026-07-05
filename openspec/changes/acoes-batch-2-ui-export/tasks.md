# Tasks: ACOES Batch 2 — UI Export + Indicators Dashboard

## Phase 1: XLSX Export Foundation

- [x] 1.1 Add `xlsx` dependency (`"xlsx": "^0.18.5"`) to `package.json` and run `npm install`.

- [x] 1.2 Create `src/lib/server/export.ts` with `exportParticipantsXlsx(participants: Participant[]): Buffer` function that mirrors the CSV column mapping from `exportParticipantsCsv` in `src/lib/server/participants.ts:405-439`, using `xlsx.utils.aoa_to_sheet` and `xlsx.writeFile` with type `xlsxbook`.

- [x] 1.3 Add `format=xlsx` case in `src/pages/api/participants.ts` GET handler (line 26), following the same CSV response pattern but returning binary with `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` and `Content-Disposition: attachment; filename="acoes-participantes-{date}.xlsx"`. Use `canExportParticipants` permission.

- [x] 1.4 Add XLSX export button to `src/pages/dashboard/exportaciones.astro` alongside existing CSV button, linked to `/api/participants?format=xlsx`.

- [x] 1.5 Add XLSX export button to `src/components/Programs.astro` filter sidebar, following the same pattern as the existing CSV export link (line 82-84). Update `setExportHref` function in inline script to support `format=xlsx` alongside `format=csv`.

## Phase 2: Participant Edit Page

- [x] 2.1 Create `src/pages/dashboard/participantes/editar/[id].astro` with frontmatter: `ensureDatabase()`, `getCurrentUser()`, `canManageParticipants()` gate, `getParticipantById(id)`. Render `Contact.astro` in edit mode with `participant` prop pre-filled. Form action points to `/api/participants/[id]` with `method="post"`.

- [x] 2.2 Extend `src/components/Contact.astro` Props interface to accept optional `participant?: Participant | null`. When `participant` is provided, pre-fill all form fields with participant data and set form `action` to `/api/participants/[id]`.

- [x] 2.3 Add PUT handler to `src/pages/api/participants/[id].ts` using existing `updateParticipant()` from `src/lib/server/participants.ts:211-304`. Validate via `validateParticipantSubmission()`, write audit event, redirect to `/dashboard/participantes?updated=1`.

- [x] 2.4 Add "Editar" link per row in `src/components/Programs.astro` table body (line 113-124), visible only when `canEdit=true`. Link points to `/dashboard/participantes/editar/{id}`. Follow existing `status-pill` styling pattern.

- [x] 2.5 Add lifecycle state toggle to `src/components/Programs.astro` inline script: add restore/deactivate button per row using existing `PATCH /api/participants/[id]` endpoint (src/pages/api/participants/[id].ts:13-40). Toggle button visible only when `canEdit=true`.

## Phase 3: Dashboard Indicators

- [x] 3.1 Add `getParticipantIndicators(dateFrom?: string, dateTo?: string)` function to `src/lib/server/participants.ts` returning `{ byDepartment, byProgram, byEducationLevel, byRoleFunction, byGender }` using SQL `GROUP BY` aggregates with `WHERE deleted_at IS NULL` and optional `created_at` date range filter. Follow pattern from `getParticipantMetrics()` (lines 131-153).

- [x] 3.2 Create `src/components/IndicatorsPanel.astro` component with Props: `indicators: ReturnType<typeof getParticipantIndicators>`, `dateFrom?: string`, `dateTo?: string`. Render 5 breakdown sections (dept, program, education, role, gender) using existing dashboard styling (`rounded-[24px] border border-ink/10 bg-cream/80 p-6`). Each section shows label and sorted counts.

- [x] 3.3 Update `src/pages/dashboard/index.astro` frontmatter to call `getParticipantIndicators()` alongside `getParticipantMetrics()`. Pass both to `Stats.astro` and new `IndicatorsPanel.astro`.

- [x] 3.4 Extend `src/components/Stats.astro` Props to include `active` and `inactive` counts from `getParticipantMetrics()`. Update template to display 6 metrics instead of 4 (add "Activos" and "Inactivos" chips). Follow existing grid layout pattern.

- [x] 3.5 Add `GET /api/dashboard/indicators` endpoint in `src/pages/api/dashboard/indicators.ts` (new file) returning JSON with all breakdowns, using same `getParticipantIndicators()` function. Require `canViewDashboard` permission.

## Phase 4: Testing

- [x] 4.1 Create `src/lib/server/__tests__/export.test.ts` testing `exportParticipantsXlsx()`: verify Buffer output, sheet name, header row bold, date columns formatted. Test CSV parity (same row count as `exportParticipantsCsv`).

- [x] 4.2 Create `src/lib/server/__tests__/participants.test.ts` testing `getParticipantIndicators()`: mock `query()`, assert correct `GROUP BY` SQL generated for each breakdown.

- [x] 4.3 Create `src/pages/api/__tests__/participants-id.test.ts` testing PUT flow: validate audit event written with `beforeData` and `afterData`.

- [x] 4.4 Run `astro check` to confirm route and type correctness after all changes.

- [x] 4.5 Run `npm run build` to validate end-to-end compilation.

## Phase 5: Manual Smoke Tests (deferred - requires running server)

- [ ] 5.1 Login as admin, navigate to `/dashboard/participantes`, click editar on a row, modify a field, save, verify redirect and updated value.

- [ ] 5.2 Login as admin, deactivate a participant via toggle, verify list row shows "Inactiva", click restore, verify row reverts.

- [ ] 5.3 Login as admin, download XLSX from exportaciones page, verify file opens in Excel with correct columns.

- [ ] 5.4 Login as facilitadora, verify no editar button visible on participant rows.

- [ ] 5.5 Dashboard loads with Stats showing 6 metrics and IndicatorsPanel showing all 5 breakdowns.

---

## Implementation Order

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
   ↓          ↓         ↓          ↓          ↓
 1.1-1.5   2.1-2.5   3.1-3.5    4.1-4.5    5.1-5.5
```

Phase 1 (xlsx + export) is independent and should complete first.
Phase 2 (edit page) depends on Phase 1 for the API PUT handler.
Phase 3 (indicators) is independent of Phases 1-2 but can run in parallel.
Phase 4 (tests) depends on Phases 1-3 completing.
Phase 5 (manual) depends on all code being in place.

## File Manifest

| File | Action |
|------|--------|
| `package.json` | Modify |
| `src/lib/server/export.ts` | Add |
| `src/lib/server/participants.ts` | Modify |
| `src/pages/api/participants.ts` | Modify |
| `src/pages/api/participants/[id].ts` | Modify |
| `src/pages/api/dashboard/indicators.ts` | Add |
| `src/pages/dashboard/participantes/editar/[id].astro` | Add |
| `src/components/Contact.astro` | Modify |
| `src/components/Programs.astro` | Modify |
| `src/components/Stats.astro` | Modify |
| `src/components/IndicatorsPanel.astro` | Add |
| `src/pages/dashboard/index.astro` | Modify |
| `src/pages/dashboard/exportaciones.astro` | Modify |
| `src/lib/server/__tests__/export.test.ts` | Add |
| `src/lib/server/__tests__/participants.test.ts` | Add |
| `src/pages/api/__tests__/participants-id.test.ts` | Add |

## Open Questions Status

- Q1 (xlsx library): **Confirmed** — use `xlsx` as specified in design.
- Q2 (edit URL): **Pending** — `/dashboard/participantes/editar/[id]` convention used in tasks.
- Q3 (PUT vs PATCH): **Confirmed** — PUT for full update, PATCH for lifecycle only.
- Q4 (date range picker): **Deferred** — all-time default, date range optional for future.
- Q5 (facilitadora indicators): **Pending** — spec says MAY see basic metrics only.
- Q6 (large export pagination): **Deferred** — current `LIMIT 100` applies; exports fetch all.
- Q7 (metadata sheet): **Deferred** — not included in batch 2.
- Q8 (restore location): **Confirmed** — both edit form and list toggle per spec.

## Readiness for sdd-apply

**Ready.** Architecture aligns with existing Astro + raw SQL + Zod patterns. Key patterns to follow:
- Permission gating: `canManageParticipants`, `canExportParticipants`, `canViewDashboard`
- SQL aggregates: follow `getParticipantMetrics()` GROUP BY pattern
- Audit events: use `withTransaction` + `recordAuditEvent`
- Form validation: reuse `validateParticipantSubmission` schema
- Inline scripts: follow `Programs.astro` fetch pattern for live updates
