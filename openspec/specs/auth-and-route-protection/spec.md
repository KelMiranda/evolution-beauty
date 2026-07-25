# Auth and Route Protection — Spec

## Purpose

Enforce a single canonical 4-role vocabulary (`admin`, `facilitador`, `empleado`, `participante`) across the backend, the SPA, and tests, with role-aware SPA route guards backed by server-side authorization. Owned by the platform team; success means no role drift between DB, API, SPA, and tests, and a wrong-role user is rejected at the route boundary rather than discovering the restriction after loading.

## Requirements

### Requirement: Canonical role vocabulary

The system SHALL recognize exactly four roles: `admin`, `facilitador`, `empleado`, `participante`. The system SHALL NOT silently normalize `facilitadora` to `facilitador`; legacy rows carrying `facilitadora` SHALL be surfaced (logged or surfaced in an admin report) for explicit backfill rather than coerced on read.

#### Scenario: All four canonical roles accepted

- **WHEN** a user record carries one of `admin`, `facilitador`, `empleado`, `participante`
- **THEN** the role is accepted verbatim by permissions, the SPA route guard, and API middleware

#### Scenario: Legacy `facilitadora` value is surfaced, not coerced

- **WHEN** a user record still carries the historical value `facilitadora`
- **THEN** the system logs the mismatch and treats it as a missing canonical role (no silent rewrite to `facilitador`)
- **AND** an admin-visible counter of affected rows is exposed for backfill

### Requirement: SPA route guard by role

SPA routes SHALL declare an `allowedRoles` list via a single route manifest. The router SHALL redirect an unauthenticated user to the login page, an authenticated user without the allowed role to a not-authorized page or their own dashboard home, and SHALL NOT render the protected component before the role check resolves.

#### Scenario: Unauthenticated user redirected to login

- **WHEN** an unauthenticated client requests a protected SPA route
- **THEN** the router redirects to `/login` without rendering the protected page

#### Scenario: Wrong-role user redirected away from protected route

- **WHEN** an authenticated user whose role is not in the route's `allowedRoles` requests a protected SPA route
- **THEN** the router redirects to a not-authorized page or the user's dashboard home

### Requirement: Server-side role check on role-aware endpoints

All API endpoints that return role-aware data SHALL verify the caller's role server-side. The SPA route guard is defense-in-depth and SHALL NOT be the sole authorization mechanism.

#### Scenario: Server rejects a wrong-role API call

- **WHEN** an authenticated user without the required role calls a role-aware API endpoint
- **THEN** the API returns HTTP 403 regardless of the SPA's pre-render guard

#### Scenario: Server rejects an unauthenticated API call

- **WHEN** an anonymous client calls a role-aware API endpoint
- **THEN** the API returns HTTP 401 regardless of any client-side state

### Requirement: Type and test alignment to four roles

Frontend role types in `app/src/services/api.backend.types.ts` and unit tests in `app/tests/unit/auth-permissions.test.ts` SHALL mirror the canonical 4-role union. Tests referencing the legacy 3-role vocabulary SHALL fail.

#### Scenario: Frontend role union contains only the four canonical roles

- **WHEN** a developer inspects the `Role` type in `app/src/services/api.backend.types.ts`
- **THEN** the union is exactly `"admin" | "facilitador" | "empleado" | "participante"` with no `facilitadora` member

#### Scenario: Unit tests assert against the four roles

- **WHEN** `app/tests/unit/auth-permissions.test.ts` runs
- **THEN** it asserts permissions only for `admin`, `facilitador`, `empleado`, `participante` and the suite passes

### Requirement: Single-source-of-truth route allowlist

The per-role route allowlist SHALL be declared in one route manifest module and imported by the SPA router. Components SHALL NOT embed role checks inline.

#### Scenario: Route manifest is the only place roles are mapped to routes

- **WHEN** the SPA routes are inspected
- **THEN** every protected route resolves its `allowedRoles` from the shared route manifest
- **AND** no `Role` check appears inside individual page or layout components