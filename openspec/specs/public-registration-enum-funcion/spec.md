# Public Registration Enum Funcion — Spec

## Purpose

Restrict the `funcion` field exposed by the public registration surface to `Participante` and `Facilitador` only, while keeping the four-value admin catalog (`Empleado`, `Facilitador`, `Participante`, `Otro`) intact for admin-created participants. The restriction is a public-schema invariant, not a DB invariant; success means the public form and `POST /api/public/participants` cannot accept or persist `Empleado` / `Otro` from anonymous traffic, but admin paths continue to work.

## Requirements

### Requirement: Public form restricts `funcion` to two values

The public registration form SHALL offer ONLY `Participante` and `Facilitador` as options for the `funcion` field. The form SHALL NOT render `Empleado` or `Otro` as selectable options under any circumstance.

#### Scenario: Public form renders only Participante and Facilitador

- **WHEN** a user opens the public `RegistroPage`
- **THEN** the `funcion` selector lists exactly two options: `Participante` and `Facilitador`
- **AND** neither `Empleado` nor `Otro` is selectable in the UI

#### Scenario: Public submission with `funcion: 'Empleado'` is rejected

- **WHEN** the public form (or any anonymous client) submits `{ ..., funcion: 'Empleado' }` to `POST /api/public/participants`
- **THEN** the endpoint returns HTTP 400 with a per-field Zod error whose path includes `funcion`
- **AND** no participant row is inserted

#### Scenario: Public submission with `funcion: 'Participante'` is accepted

- **WHEN** the public form submits a valid payload with `funcion: 'Participante'`
- **THEN** the endpoint returns HTTP 201 and persists the participant with `funcion = 'Participante'`

### Requirement: Admin endpoints keep the four-value catalog

The authenticated admin endpoints (`POST /api/participants`, `PATCH /api/participants/:id`, and related admin paths) SHALL continue to accept `Empleado`, `Facilitador`, `Participante`, and `Otro` as valid `funcion` values. The DB column `participants.funcion` SHALL accept any string without a restrictive global CHECK that excludes `Empleado` or `Otro`.

#### Scenario: Admin can still create a participant with `funcion: 'Empleado'`

- **WHEN** an authenticated admin submits `{ ..., funcion: 'Empleado' }` to `POST /api/participants`
- **THEN** the endpoint accepts the payload and persists the participant with `funcion = 'Empleado'`

#### Scenario: Admin can still create a participant with `funcion: 'Otro'`

- **WHEN** an authenticated admin submits `{ ..., funcion: 'Otro' }` to `POST /api/participants`
- **THEN** the endpoint accepts the payload and persists the participant with `funcion = 'Otro'`

#### Scenario: DB column accepts historical `Facilitadora` form for admin rows

- **WHEN** an admin upserts a participant row with the historical `Facilitadora` string (or any non-canonical value)
- **THEN** the row is persisted without a DB CHECK violation

### Requirement: Public and admin schemas are separate

The system SHALL provide a dedicated public Zod schema (`publicParticipantSchema` or equivalent) that enforces the two-value restriction, kept distinct from the admin schema that enforces the four-value catalog. The public endpoint SHALL route payloads through the public schema; admin endpoints SHALL route through the admin schema.

#### Scenario: Public schema and admin schema are independently configurable

- **WHEN** the public or admin schemas are defined in their respective catalog files
- **THEN** updating the public two-value list does NOT affect the admin four-value list
- **AND** updating the admin four-value list does NOT widen the public restriction

#### Scenario: Public endpoint routes through the public schema only

- **WHEN** `POST /api/public/participants` receives a payload
- **THEN** the validator used is the public schema (two-value restriction)
- **AND** `Empleado` / `Otro` are rejected with HTTP 400 regardless of admin-schema state
