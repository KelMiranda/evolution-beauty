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
  │  → course loads, "Inscribirme" form is shown
  │
  │ person fills form
  │ POST /api/public/participants            (no auth)
  │  → Zod-validated, createParticipant()
  │  → returns 201 with participant_code
  │
  │<─ 201 Created
  ▼
```

If the URL the admin receives is followed verbatim (no copy-paste
mutation), the HashRouter route is preserved and the person lands
directly on the course detail page. If somebody pastes a malformed
link — e.g. `http://localhost:4321/cursos/9?token=...` (backend
origin, no `#`) — the Astro middleware catches it and redirects to
`http://localhost:3000/#/cursos/9?token=...` (SPA origin with `#`).

### Public form is for participants only

The SPA exposes two distinct public-facing surfaces that both end up
creating a participant record via `POST /api/public/participants`:

- `app/src/pages/RegistroPage.tsx` — the standalone directory
  registration form, reachable at `/#/registro`.
- `app/src/pages/CursoDetallePage.tsx` — the "Inscribirme" modal on
  a course detail page, reached either directly or via the public
  enrollment link above.

Both flows are restricted to the `Participante` audience. In
particular:

- `RegistroPage` no longer exposes a `<select>` for `funcion`. The
  form hardcodes `funcion: 'Participante'` in its state and always
  submits that value, regardless of what the user does in the form.
  A visible banner on every step states that facilitators/facilitators
  and employees are managed by the admin via the dashboard.
- `CursoDetallePage` does not have a `funcion` field at all.
- The `participantPublicSchema` (`src/lib/server/participant-schema.ts`)
  remains permissive on `role_function` because the admin API can
  legitimately create records with any role. The frontend is the
  enforcement point: a public caller cannot pick a non-participant
  role through the UI.
- The admin can edit `funcion` on an existing record after the fact
  via `/dashboard/registros` if the user later becomes a facilitator
  or employee.

## Roles and audiences

| Role          | How they enter the system                                          |
|---------------|--------------------------------------------------------------------|
| Participant   | Via the public registration form (`/#/registro`) or the public enrollment link on a course detail page. |
| Facilitator / Facilitadora | Created and managed by the admin via `/dashboard/registros`. The public form does not offer this role. |
| Empleado      | Created and managed by the admin via `/dashboard/registros`. The public form does not offer this role. |
| Admin         | Has full read/write access to all records and dashboards. |

The `Role` type (`app/src/types/index.ts`) and the auth layer treat
these four as distinct values; the data model (`funcion` column on
the participant record) is intentionally flexible so that the admin
can reassign a participant's role later.

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
