# Public Enrollment By DUI — Spec

## Purpose

Replace the five-field public enrollment modal (fullName, email, phone, optional DUI, notes) with a DUI-only lookup that resolves to an existing participant and creates a linked enrollment in one round-trip. When the participant is unknown, the SPA navigates to the registration page with a `?redirect=` that resumes the enrollment. Success means a returning user re-enters their DUI once, and a new user is guided to register without losing context.

## Requirements

### Requirement: Modal collects DUI only

The enrollment modal in `CursoDetallePage` SHALL collect exactly two fields: the course's `token` (already resolved from the route) and the `dui` (DUI) string. The modal SHALL NOT collect fullName, email, phone, or notes from the public surface.

#### Scenario: Modal renders only the DUI field

- **WHEN** the user opens the enrollment modal on a course detail page
- **THEN** the modal renders exactly one user-input field for DUI
- **AND** no fullName, email, phone, or notes input is visible

#### Scenario: Modal shows the course context to the user

- **WHEN** the modal is open
- **THEN** the modal displays the course title (or a clear course identifier) so the user knows which course they are enrolling in

### Requirement: Backend accepts `{ token, dui }` and creates a linked enrollment

The backend `POST /api/public/enrollments` SHALL accept a JSON body containing `token` and `dui`. When the participant is found by DUI, the endpoint SHALL create an `enrollments` row whose `participant_id` references `participants.id`. Legacy identity columns (`full_name`, `email`, `phone`, `dui`) SHALL be derived server-side from the participant in the same transaction to preserve backward compatibility with admin views.

#### Scenario: Submit with valid token and existing DUI returns 201 with the enrollment

- **GIVEN** a participant with `dui = '00000000-0'` exists in `participants`
- **WHEN** the user submits `{ token: '<valid public token>', dui: '00000000-0' }` to `POST /api/public/enrollments`
- **THEN** the endpoint returns HTTP 201 with the created enrollment in the response body
- **AND** the enrollment row's `participant_id` equals the existing participant's `id`
- **AND** the legacy columns match the participant's current fullName, email, phone, and dui

#### Scenario: Submit with valid token and non-existing DUI returns 200 with redirect

- **GIVEN** no participant exists with `dui = '00000000-0'`
- **WHEN** the user submits `{ token: '<valid public token>', dui: '00000000-0' }`
- **THEN** the endpoint returns HTTP 200 with `{ redirect: '/registro?redirect=/cursos/<id>?token=<token>' }` in the response body
- **AND** no enrollment row is created

#### Scenario: Submit with invalid or mismatched token returns 404

- **WHEN** the user submits `{ token: '<invalid token>', dui: '00000000-0' }`
- **THEN** the endpoint returns HTTP 404 with an error payload
- **AND** no enrollment row is created and no participant lookup is performed (or its result is irrelevant)

#### Scenario: Submit with malformed DUI returns 400

- **WHEN** the user submits `{ token: '<valid token>', dui: 'not-a-dui' }`
- **THEN** the endpoint returns HTTP 400 with a per-field error referencing `dui`
- **AND** no enrollment row is created

### Requirement: SPA resumes enrollment after registration round-trip

The SPA SHALL navigate to the URL returned in the `redirect` field of a not-found response. After the user registers at `/registro?redirect=...`, the SPA SHALL detect the resumed enrollment flow and re-issue the enrollment automatically (or reopen the modal with the DUI pre-filled and the new participant ready).

#### Scenario: Not-found DUI navigates to registration with redirect

- **GIVEN** the user submits `{ token, dui: '00000000-0' }` and no participant exists
- **AND** the API returns `{ redirect: '/registro?redirect=/cursos/9?token=XYZ' }`
- **WHEN** the SPA receives this response
- **THEN** the SPA navigates to `/#/registro?redirect=%2Fcursos%2F9%3Ftoken%3DXYZ` (or the equivalent encoded path)
- **AND** the registration page reads the inner `?redirect=` and holds it for post-registration navigation

#### Scenario: After registration, the user is enrolled automatically when they return

- **GIVEN** the user just completed registration after being redirected from the enrollment modal
- **WHEN** the SPA navigates back to `/cursos/<id>?token=<token>`
- **THEN** the enrollment is created (either by an automatic retry with the new DUI, or by reopening the modal and re-submitting)
- **AND** the user lands back on the course detail with the enrollment visible in the participant list (or a confirmation of their enrollment)

### Requirement: Lookup uses the normalized DUI

The participant lookup SHALL use the normalized DUI format (`00000000-0`) as the canonical match key, regardless of whether the input was submitted with or without the dash.

#### Scenario: DUI without the dash still matches the participant

- **GIVEN** a participant with normalized DUI `00000000-0` exists
- **WHEN** the user submits `{ token, dui: '000000000' }`
- **THEN** the normalizer produces `00000000-0`
- **AND** the lookup finds the participant and creates the enrollment
