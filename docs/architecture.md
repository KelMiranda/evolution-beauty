# Architecture

## Service topology

| Service | Port | URL | Role |
|---|---|---|---|
| Astro backend | 4321 | http://localhost:4321 | REST API under `/api/*`; redirects non-API paths to the SPA |
| React SPA | 3000 | http://localhost:3000 | React Router 7 SPA with `HashRouter`; hits the backend via Vite proxy |
| PostgreSQL | 5437 | (docker-internal) | Database |

The Astro backend serves both the JSON API and a thin redirect shim. The
React SPA is the user-facing surface: every page in the app — landing,
catalog, course detail, registration, login, dashboard — is rendered by
the SPA. The Vite dev server (port 3000) proxies `/api/*` to the backend
on 4321, so the SPA code can call `fetch('/api/...')` without CORS
configuration in development.

## Why HashRouter?

The SPA uses `react-router-dom`'s `HashRouter` (`app/src/main.tsx`),
not `BrowserRouter`. This means SPA URLs include a `#` segment
(`http://localhost:3000/#/cursos/9`); the path before the `#` is always
`/`, and the SPA state lives in the hash.

The tradeoff:

- **Pro**: Public links work without server-side fallback. A URL like
  `http://localhost:3000/#/cursos/9` is served by the SPA shell
  regardless of whether the dev/prod server has a route for `/cursos/9`
  — the browser asks for `/`, gets the SPA HTML, and the SPA reads the
  hash to figure out the route.
- **Con**: URLs are uglier (`#` in the middle). Server logs lose the
  intent (everything shows up as `GET /`).

If we switched to `BrowserRouter`, the Astro backend would need a
catch-all route that serves the SPA HTML for every non-`/api/*` path.
That is a bigger architectural change tracked outside this scope (see
"Changes tracked outside this scope" below).

## Routing rules

Given `HashRouter`:

- A valid SPA URL is `http://<spa-host>/#/cursos/<id>?token=<token>`.
- Entering `http://<spa-host>/cursos/<id>` (no `#`) would cause the
  SPA to fail to match the route and fall back to `NotFoundPage`
  (`app/src/pages/NotFoundPage.tsx`).
- Entering `http://<backend-host>/cursos/<id>?token=<token>` triggers
  the Astro middleware's redirect to the SPA, but the redirect must
  include the `#` for the SPA to handle the URL correctly. The
  middleware is the source of truth for that mapping (see
  `src/middleware.ts`).

## Environment variables

| Variable | Default | Where | Purpose |
|---|---|---|---|
| `PUBLIC_SITE_URL` | `http://localhost:3000` | `src/pages/api/courses/[id]/public-link.ts` | Used by the public-link endpoint to build the public enrollment URL. **Must point to the SPA**, not the backend — otherwise the link is sent to a non-routable address. |
| `REACT_APP_URL` | `http://localhost:3000` | `src/middleware.ts` | Used by the Astro middleware to redirect non-API paths to the SPA. |
| `VITE_API_URL` | `http://localhost:4321` | `app/src/services/api.ts` | Used by the SPA at build time to know where the backend API lives (Vite proxy in dev). |
| `VITE_VAPID_PUBLIC_KEY` | `YOUR_VAPID_PUBLIC_KEY` | `app/src/components/NotificationSubscriptionCard.tsx` | Used by the SPA for web-push subscription. |

The local `.env` file is gitignored (`/.gitignore` line 4). A fresh
clone only needs to copy `.env.example` to `.env` and adjust the
`DATABASE_URL` to point at the local Postgres container.

## Public enrollment flow

```
admin (in SPA)
  │
  │ POST /api/courses/<id>/public-link       (admin session cookie)
  │  → public-link endpoint
  │    → getCourseById, generateCourseEnrollmentToken
  │    → UPDATE courses SET public_enrollment_token = ...
  │    → build publicUrl = ${PUBLIC_SITE_URL}/#/cursos/<id>?token=<token>
  │
  │<─ { data: { token, publicUrl } }
  │
  │ admin copies publicUrl, sends to person
  ▼
person (any browser, no auth)
  │
  │ GET http://<spa-host>/#/cursos/<id>?token=<token>
  │  → SPA loads, HashRouter matches /cursos/:id
  │  → CursoDetallePage reads ?token= from useSearchParams
  │  → resolvePublicEnrollmentLink(token) validates it
  │  → course loads, "Inscribirme ahora" CTA is shown
  │
  │ person clicks CTA → modal asks for DUI only
  │ POST /api/public/enrollments              (no auth)
  │   body: { token, dui }
  │  → public-enrollments endpoint
  │    → getCourseByPublicEnrollmentToken(token) → 404 if invalid
  │    → normalizeDui(dui) → 400 if malformed
  │    → getParticipantByDocumentNumber(normDui)
  │       ├─ hit  → createEnrollment(participantId, courseId, token)
  │       │         → returns 201 { data: <Enrollment> }
  │       │         → SPA renders the success card
  │       └─ miss → returns 200 { redirect: '/registro?redirect=%2Fcursos%2F<id>%3Ftoken%3D<token>' }
  │                  (see "Round-trip semantics" below)
  │
  │<─ 200 / 201 / 400 / 404 / 409
  ▼
```

If the URL the admin receives is followed verbatim (no copy-paste
mutation), the HashRouter route is preserved and the person lands
directly on the course detail page. If somebody pastes a malformed
link — e.g. `http://localhost:4321/cursos/9?token=...` (backend
origin, no `#`) — the Astro middleware catches it and redirects to
`http://localhost:3000/#/cursos/9?token=...` (SPA origin with `#`).

### Round-trip semantics (sessionStorage bridge)

When the public enrollments endpoint returns `200 { redirect }` (the
person's DUI is not yet linked to a participant), the SPA persists the
round-trip intent under `sessionStorage.acoes:pendingEnrollment` as
`{ dui, courseId, token, ts }` (10-minute TTL), then navigates to the
encoded `/registro?redirect=%2Fcursos%2F<id>%3Ftoken%3D<token>`
hash route. The user completes the registration form on
`RegistroPage`; on success the SPA navigates back to the course
detail (`navigate(safeRedirect(redirectTarget))`). The auto-enroll
effect on `CursoDetallePage` reads the matching session entry,
pre-fills the DUI input, opens the modal, and auto-submits via a
`setTimeout(0)` so React commits the open modal first. On success
`sessionStorage.acoes:pendingEnrollment` is cleared.

Failure modes:
- sessionStorage missing/expired → user lands on the course page and
  can re-enroll manually.
- Auto-submit fails (course full, etc.) → modal stays open with the
  API error for manual retry.
- User navigates away before the auto-submit fires → the entry
  remains valid until its 10-minute TTL expires; on the next visit to
  the same course + token the effect retries.

The `acoes:pendingEnrollment` key is tab-bound (per `sessionStorage`
spec) and same-origin; the Docker setup serves the SPA on
`http://localhost:3000` and the API on `http://localhost:4321` so the
round-trip works because both share the `localhost` origin.

### Public form role matrix

The SPA exposes two distinct public-facing surfaces that both end up
creating a participant record via `POST /api/public/participants`:

- `app/src/pages/RegistroPage.tsx` — the standalone directory
  registration form, reachable at `/#/registro`.
- `app/src/pages/CursoDetallePage.tsx` — the "Inscribirme" modal on
  a course detail page, reached either directly or via the public
  enrollment link above.

Both flows are restricted to the public two-value role catalog
(`Participante` and `Facilitador`). In particular:

- `RegistroPage` exposes a `<select>` for `funcion` in step 1 sourced
  from the public two-value list. The default is empty; the user must
  pick one before advancing.
- For `Participante`, the `curso` and `capacitacion` fields are
  hidden. For `Facilitador`, both fields are required. Toggling back
  to `Participante` clears any stale facilitator values.
- `observaciones` is fully removed from the public surface; the wire
  payload never carries `notes`.
- `CursoDetallePage` collects only the DUI in the modal; the public
  enrollments endpoint resolves the participant server-side and
  rejects payloads that include the legacy five-field shape.
- The admin four-value catalog (`Empleado`, `Facilitador`,
  `Participante`, `Otro`) and the historical `Facilitadora` string
  remain valid on the admin path; the public schema is the only
  enforcement point for the two-value restriction. See
  `src/lib/server/public-participant-schema.ts` and
  `src/lib/server/catalogs.ts` (`PUBLIC_PARTICIPANT_ROLE_OPTIONS`).

### Public schema wire contract

`POST /api/public/participants` accepts a JSON payload validated by
`publicParticipantSubmissionSchema` (`src/lib/server/public-participant-schema.ts`).
The schema applies two preprocesses before its field validators run:

1. `phone` synthesis — when the wire payload omits `phone` (or sends
   `''`), the schema combines `phone_dial_code` + `phone_number` into
   a single `phone` string. The SPA collects `prefijo` and `celular`
   as separate fields and never has to build the combined value
   client-side.
2. `courseId` tightening — `undefined`, `null`, and `''` short-circuit
   to `undefined` BEFORE Zod's `.coerce.number()` is evaluated, so
   Participante payloads no longer surface a misleading
   `Expected number, received nan` error on `courseId`.

`documentNumber` is normalized through `duiSchema` (canonical
`00000000-0`, nine-digit dash insertion, whitespace stripping). Any
non-empty `notes` value is rejected; `notes: ''` is accepted and
transformed to `undefined` so the route handler never forwards the
field to the participant.

## Roles and audiences

| Role          | How they enter the system                                          |
|---------------|--------------------------------------------------------------------|
| Participante  | Via the public registration form (`/#/registro`) or the public enrollment link on a course detail page. The public schema restricts `role_function` to this value plus `Facilitador`. |
| Facilitador   | Via the public registration form (`/#/registro`) by selecting it in step 1's `funcion` select. The form requires `curso` and `capacitacion` for this audience. |
| Empleado      | Created and managed by the admin via `/dashboard/registros`. The public schema rejects this value; the admin schema keeps it. |
| Otro          | Created and managed by the admin via `/dashboard/registros`. The public schema rejects this value; the admin schema keeps it. |
| Admin         | Has full read/write access to all records and dashboards. |

The `Role` type (`app/src/types/index.ts`) and the auth layer treat
the first four as distinct values; the data model (`funcion` column
on the participant record) is intentionally flexible so that the
admin can reassign a participant's role later. Historical
`Facilitadora` strings stored by the admin path continue to load
because the column has no DB-level CHECK; the public two-value
restriction is enforced exclusively by the public Zod schema.

## Dashboard panels (admin-only)

`app/src/pages/DashboardPage.tsx` renders, top to bottom:

1. **Stats row** — four cards. `Registrados`, `Esta semana`,
   `Facilitadores`, `Cursos activos`. Counts come from
   `useDashboard()` → `getDashboardStats()` (in `app/src/services/api.ts`).
2. **Course-links panel** — `getCourseRecords()` + per-row public-link
   generation. Admin-only.
3. **Charts row** — `Registros por mes` (bar) and `Por género` (pie).
   Buckets are computed client-side from the participant payload; no
   extra endpoint required.
4. **Facilitadores** — two sub-tables split via `splitFacilitadores()`
   in `app/src/utils/facilitadores.ts`:
   - **Vinculados a un curso**: `funcion === 'Facilitador' && course_id IS NOT NULL`.
     Renders the joined course name from a `Map<courseId, name>` built
     from the same `courses` array used by the course-links panel.
   - **Sin curso**: `funcion === 'Facilitador' && course_id IS NULL`.
     Includes an "Asignar curso" button (intentionally `disabled`,
     pending a later assignment UX).
   Both buckets derive from the `registros` array already loaded by
   `useRegistros`, so the panel cost is zero extra round-trips.
5. **Equipo** — admin + empleado users loaded via `useUsers()` →
   `getEquipoUsers()` (which filters `/api/users` client-side).
   Columns: Correo, Nombre, Rol (pill), Estado (pill), Permisos.
   Policy copy per role is hardcoded in `app/src/utils/equipo.ts`
   (`EQUIPO_POLICIES`) rather than fetched from the backend — the
   taxonomy is two roles and policy copy is reviewed manually, so a
   copy change does not require a coordinated SPA + backend deploy.
6. **Registros table** — paginated list with search + filters. The
   pagination footer relies on `meta.total` returned by
   `GET /api/participants` (see `countParticipants()` in
   `src/lib/server/participants.ts` and the `Promise.all([list, count])`
   call in `src/pages/api/participants.ts`).
7. **Detail modal** — opens when a Registros row's eye icon is
   clicked.

The Facilitadores and Equipo panels are intentionally admin-internal
and not covered by the public-facing OpenSpec specs — they don't shape
the public enrollment / registration contracts.

## Token handling

`generateCourseEnrollmentToken(courseId, instructor)` returns a
deterministic but randomized string of the form
`<courseId>-<slugified-instructor>-<8 random base36 chars>`. The token
is stored in `courses.public_enrollment_token` and reused on
subsequent link generations (the endpoint UPDATEs the column with the
existing token if present, otherwise generates a new one).

The token must never be:

- Logged in plain text (`console.log` of the token, the URL, or any
  error message that includes the token).
- Returned in any non-200 response (401, 403, 404, 500).
- Included in any stack trace or audit log that ships to a third party.

The `public-link` endpoint wraps the DB persistence in try/catch and
emits a 500 with a generic error message; the token is passed to the
logger as `courseId` only.

## Changes tracked outside this scope

- **Switching to `BrowserRouter`** would require a server-side
  catch-all in the Astro backend. Out of scope for this fix; tracked
  as a future architectural change.
- **The Astro catch-all page removal** was completed in the React SPA
  migration. The legacy `src/pages/index.astro` no longer exists, so
  any unmatched path that reaches the backend falls into the
  middleware redirect and lands on the SPA's `NotFoundPage`.
- **Production deployment** uses a reverse proxy in front of the
  Astro backend (see `docs/hardening.md`). The proxy must preserve
  the `Location` header on 302 responses, otherwise the SPA
  redirect will not work in production.
