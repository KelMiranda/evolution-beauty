# ACOES Batch 2 — Participant Lifecycle UI + XLSX Export + Indicators Dashboard
## Technical Design

---

## 1. Architecture Decisions

### 1.1 Guiding principles
- Follow existing **Astro + raw SQL + Zod** patterns precisely.
- No new runtime frameworks; reuse inline `<script>` blocks in Astro components.
- Export logic lives in `src/lib/server/export.ts`; no browser-side export.
- Indicators derive from SQL aggregates only (no client-side math).
- Permission gating uses existing `canManageParticipants`, `canExportParticipants` helpers.

### 1.2 XLSX library choice
**Decision:** Add `xlsx` (SheetJS) as a server-side dependency.
- Already used widely with Node.js, compatible with Astro's SSR.
- Produces `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` response.
- Client receives a binary download; no browser dependency.
- Alternative `exceljs` equally valid, but `xlsx` has smaller footprint.

### 1.3 Indicator aggregation strategy
- Add a new SQL view `v_participant_indicators` for department/education/role breakdowns.
- Alternatively, add a dedicated function `getParticipantIndicators(filters)` that returns all breakdowns in one query using `GROUP BY`.
- Reuse existing `getParticipantMetrics()` for core counts; extend it to accept optional `dateFrom`/`dateTo`.
- No new tables; all aggregates derived from `participants` with appropriate `WHERE deleted_at IS NULL`.

### 1.4 Edit form reuse strategy
- Reuse `Contact.astro` component for the edit form by adding a `participant` prop.
- When `participant` is provided, pre-fill and change form `action` to `/api/participants/{id}`.
- No separate edit component; keep a single `Contact.astro` used in both `nuevo` and `editar` modes.

---

## 2. Data Flow

### 2.1 Participant lifecycle UI (edit + restore/deactivate)

```
GET /dashboard/participantes/editar/[id]
  -> frontmatter: getCurrentUser() + canManageParticipants() gate
  -> fetch participant via getParticipantById(id)
  -> render Contact.astro in edit mode with participant data
  -> form POSTs to /api/participants/[id] (PUT for full update, PATCH for lifecycle)

PUT /api/participants/[id]
  -> validate via validateParticipantSubmission() (reuse existing schema)
  -> updateParticipant(id, patch, user.id)
  -> record audit event (update action)
  -> redirect to /dashboard/participantes?updated=1

PATCH /api/participants/[id] (lifecycle only)
  -> existing PATCH handler already routes to setParticipantLifecycle()
  -> returns JSON { participant }
```

### 2.2 XLSX export flow

```
GET /api/participants?format=xlsx&q=...&department=...&status=...
  -> listParticipants({ search, department, status, lifecycleState })
  -> exportParticipantsXlsx(participants)  // new function
  -> stream binary response with:
       Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
       Content-Disposition: attachment; filename="acoes-participantes-{date}.xlsx"
```

### 2.3 Indicators dashboard flow

```
GET /dashboard
  -> frontmatter: getParticipantMetrics() + getParticipantIndicators()
  -> Stats.astro (existing) shows core 4 metrics
  -> new IndicatorsPanel.astro component shows breakdowns (dept, program, education, role, gender)
  -> client-side polling or manual refresh for live updates (optional enhancement)

GET /api/dashboard/indicators (optional AJAX refresh)
  -> returns JSON with all breakdowns
  -> same SQL aggregates, reused
```

---

## 3. File Changes

### 3.1 Modify

| File | Change |
|------|--------|
| `src/pages/api/participants.ts` | Add `format=xlsx` case in GET; add PUT handler; add `format=xlsx` link to export page |
| `src/pages/api/participants/[id].ts` | Add PUT handler for full participant update |
| `src/pages/dashboard/participantes/index.astro` | Pass `canEdit=true`; add editar link per row; add XLSX export button alongside CSV |
| `src/pages/dashboard/exportaciones.astro` | Add XLSX download button linked to `/api/participants?format=xlsx` |
| `src/components/Stats.astro` | Extend Props to include new breakdown metrics; add department/education/role/gender chips |
| `src/components/Programs.astro` | Add row-level "Editar" link; wire lifecycle state toggle |

### 3.2 Add

| File | Purpose |
|------|---------|
| `src/lib/server/export.ts` | `exportParticipantsXlsx(participants)` function; shares row mapping with CSV |
| `src/pages/dashboard/participantes/editar/[id].astro` | Edit page, loads participant and renders Contact.astro in edit mode |
| `src/pages/api/participants/[id].ts` | Extend with PUT handler (updateParticipant) |
| `src/components/IndicatorsPanel.astro` | Dashboard breakdown cards (dept, program, education, role, gender) |
| `src/lib/server/participants.ts` | Add `getParticipantIndicators(dateFrom?, dateTo?)` function returning breakdowns |
| `openspec/changes/acoes-batch-2-ui-export/specs/participant-edit-ui/spec.md` | Already exists (reviewed above) |
| `openspec/changes/acoes-batch-2-ui-export/specs/xlsx-export/spec.md` | Already exists (reviewed above) |
| `openspec/changes/acoes-batch-2-ui-export/specs/dashboard-indicators/spec.md` | Already exists (reviewed above) |

### 3.3 Dependencies

```diff
+  "xlsx": "^0.18.5"
```

---

## 4. Interfaces / Contracts

### 4.1 New/extended server functions

```typescript
// src/lib/server/export.ts
export function exportParticipantsXlsx(participants: Participant[]): Buffer
// Returns a Buffer containing the XLSX binary; uses same row mapping as CSV.

export function exportParticipantsCsv(participants: Participant[]): string
// Existing; move to export.ts alongside XLSX for colocation.
```

```typescript
// src/lib/server/participants.ts
export async function getParticipantIndicators(dateFrom?: string, dateTo?: string): Promise<{
  byDepartment: Record<string, number>;
  byProgram: Record<string, number>;
  byEducationLevel: Record<string, number>;
  byRoleFunction: Record<string, number>;
  byGender: Record<string, number>;
}>
// SQL: SELECT department, COUNT(*) FROM participants WHERE deleted_at IS NULL GROUP BY department
// Same pattern for each breakdown. Accepts optional date range on created_at.
```

### 4.2 API route contracts

```typescript
// GET /api/participants?format=xlsx&q=&department=&status=&lifecycleState=
// Response: binary XLSX file
// Auth: requires canExportParticipants (admin only)

// PUT /api/participants/[id]
// Body: FormData (same shape as POST)
// Response: 302 redirect to /dashboard/participantes?updated=1
// Auth: requires canManageParticipants (admin only)
```

### 4.3 Component Props

```typescript
// Contact.astro extended
interface Props {
  canEdit: boolean;
  mode: 'public' | 'internal';
  reviewPath: string;
  defaultStatus: ParticipantStatus;
  participant?: Participant | null;  // NEW: pre-fill for edit mode
}

// IndicatorsPanel.astro
interface Props {
  indicators: Awaited<ReturnType<typeof getParticipantIndicators>>;
  dateFrom?: string;
  dateTo?: string;
}
```

---

## 5. Testing Strategy

### 5.1 Unit tests
- `exportParticipantsXlsx()`: verify Buffer output, sheet name, header row bold, date columns formatted.
- `exportParticipantsCsv()` parity: given same input, CSV row count must match XLSX row count.
- `getParticipantIndicators()`: mock `query()` and assert correct `GROUP BY` SQL generated.
- `updateParticipant()` via PUT: validate audit event written with `beforeData` and `afterData`.

### 5.2 Integration / smoke tests
- Full roundtrip: `Contact.astro` (edit mode) -> `PUT /api/participants/[id]` -> redirect -> list shows updated data.
- Lifecycle toggle: click deactivate -> participant row shows "Inactiva" -> PATCH restore -> row reverts.
- XLSX download: apply filters -> download XLSX -> open in Excel -> row count matches filtered list.
- CSV + XLSX parity: same filters -> download both -> open -> same participant IDs in same order.

### 5.3 Manual browser smoke tests
- [ ] Login as admin, navigate to `/dashboard/participantes`, click editar on a row, modify a field, save, verify redirect and updated value.
- [ ] Login as 
admin, deactivate a participant, verify list updates without reload.
- [ ] Login as admin, download XLSX from exportaciones page, verify file opens in Excel.
- [ ] Login as facilitadora, verify no editar button visible.
- [ ] Dashboard loads with Stats.astro and IndicatorsPanel.astro showing all 5 breakdowns.

---

## 6. Migration / Rollback Notes

### 6.1 Migration
- Add `xlsx` package to `package.json`.
- No DB schema changes; all features use existing `participants` table.
- New files are additive; no existing files deleted.
- Export endpoints (CSV) remain functional as fallback.

### 6.2 Rollback
- Remove `xlsx` from `package.json` and `npm uninstall xlsx`.
- Revert API route to CSV-only on GET handler.
- Remove `IndicatorsPanel.astro` from dashboard page.
- Restore original `Contact.astro` (remove `participant` prop branch).
- No data migration needed since no new columns were added.

---

## 7. Open Questions

1. **XLSX library preference**: Confirm `xlsx` (SheetJS) is acceptable, or should we use `exceljs` for better streaming support?
2. **Edit mode URL**: Use `/dashboard/participantes/editar/[id]` or `/dashboard/participantes/[id]/editar`? Current routing convention uses `/[id]/audit.ts` pattern.
3. **PUT vs PATCH for edit**: Should the edit form use PUT (full replacement) or PATCH (partial update)? Currently `updateParticipant()` does full replacement; consider extending to support partial.
4. **Date range picker for indicators**: Should the dashboard include a date range selector, or is all-time sufficient for batch 2?
5. **Indicators access for facilitadora**: Spec says facilitadora MAY see basic metrics only. Should a separate `canViewIndicators` permission be added, or is it implicitly covered by `canViewDashboard`?
6. **Large export pagination**: If a filtered export exceeds 10,000 rows, should XLSX generation be paginated/streamed? Current `listParticipants()` has a `LIMIT 100` default; exports use `limit=100` or all?
7. **XLSX metadata sheet**: Per spec, MAY include a metadata sheet. Confirm if required or defer to future batch.
8. **Restore action location**: Spec covers restore via edit form. Should restore also be available as a list-level action (e.g., toggle button per row)?

---

## 8. Readiness

**Ready for task breakdown.** Architecture aligned with existing patterns:
- Same Zod validation reuse (`validateParticipantSubmission`)
- Same permission gating (`canManageParticipants`, `canExportParticipants`)
- Same SQL aggregate patterns from `getParticipantMetrics()`
- Same inline script pattern in Astro components
- Same `withTransaction` audit pattern

Key risks to resolve before implementation:
- XLSX library final confirmation (Q1)
- URL convention for edit page (Q2)
- Indicating whether facilitadora sees indicators (Q5)
