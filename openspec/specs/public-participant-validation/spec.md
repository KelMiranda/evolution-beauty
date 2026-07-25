# Public Participant Validation — Spec

## Purpose

Make `POST /api/public/participants` safe by routing every payload through the shared Zod schema already used by the authenticated participant flow, and bring the SPA registration form into catalog parity. Owned by the registration team; success means invalid payloads are rejected with per-field errors and never silently inserted.

## Requirements

### Requirement: Shared schema validation before any DB write

`POST /api/public/participants` SHALL parse the request body with the shared Zod schema (`src/lib/server/participant-schema.ts`) before any DB write. The endpoint SHALL accept anonymous JSON requests consistent with the existing E2E call shape.

#### Scenario: Valid payload is accepted and persisted

- **WHEN** the endpoint receives a JSON body that satisfies the shared schema
- **THEN** the row is persisted and the endpoint returns HTTP 201 with the created participant summary

#### Scenario: Anonymous JSON request with a valid payload still succeeds

- **WHEN** the no-auth E2E helper in `app/tests/e2e/public-registration.spec.ts` POSTs a valid payload directly
- **THEN** the endpoint returns HTTP 201 and persists the row

### Requirement: Invalid payload returns HTTP 400 with per-field errors

Invalid payloads SHALL return HTTP 400 with a per-field Zod error array. The endpoint SHALL NEVER return HTTP 500 for a validation failure and SHALL NEVER persist a row that fails schema validation.

#### Scenario: Invalid gender returns 400 with field error

- **WHEN** the request body contains `genero: "Otro"`
- **THEN** the endpoint returns HTTP 400 with a Zod error entry whose path includes `genero`
- **AND** no row is inserted in the participants table

#### Scenario: Multiple invalid fields return all of them

- **WHEN** the request body contains several schema violations
- **THEN** the response body is an array of Zod issues, one per invalid field, and the status is HTTP 400

#### Scenario: Validation failure never causes HTTP 500

- **WHEN** any payload fails schema validation
- **THEN** the endpoint returns HTTP 400, not HTTP 500, regardless of the field that failed

### Requirement: Gender catalog reduced to two values

The gender field SHALL accept only `Femenino` or `Masculino`, matching the backend catalog. The SPA registration form (`app/src/pages/RegistroPage.tsx`) SHALL offer exactly those two options and SHALL NOT offer `Otro`.

#### Scenario: SPA form does not offer `Otro`

- **WHEN** a user opens `RegistroPage`
- **THEN** the gender selector lists only `Femenino` and `Masculino`

#### Scenario: Form submission with a non-canonical gender is impossible

- **WHEN** the user submits the registration form
- **THEN** the gender value sent to the API is exactly `Femenino` or `Masculino`

### Requirement: SPA surfaces real success and real failure

The SPA SHALL display per-field errors returned by the API and SHALL NOT show the success screen when the API call fails.

#### Scenario: API failure renders per-field errors, not the success state

- **WHEN** the API responds with HTTP 400 and a Zod error array
- **THEN** the SPA renders one error message per invalid field
- **AND** the success screen is not rendered

#### Scenario: Successful API response renders the success screen

- **WHEN** the API responds with HTTP 201
- **THEN** the SPA renders the success screen only after the 201 is observed

#### Scenario: Silent acceptance is impossible

- **WHEN** the user submits the form with any invalid field
- **THEN** the form state remains on the registration view with the field errors visible
- **AND** no participant row is created