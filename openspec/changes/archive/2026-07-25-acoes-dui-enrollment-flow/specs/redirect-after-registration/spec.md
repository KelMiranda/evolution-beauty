# Redirect After Registration — Spec

## Purpose

Allow the public registration form to be entered with a `?redirect=` query parameter so that, after a successful registration, the SPA navigates the user back to the originating flow (typically a course enrollment). The redirect target MUST be hardened against open-redirect attacks by accepting only same-origin relative paths. Success means a participant can register and resume their enrollment in one round-trip without exposing the app to external redirect abuse.

## Requirements

### Requirement: `RegistroPage` reads `?redirect=` from the URL

The public registration page SHALL read a `redirect` query parameter from the URL at mount time. The value SHALL be parsed as a string and SHALL be available to the success-handling logic after submission.

#### Scenario: Form opens without `?redirect=` and uses the default

- **WHEN** the user opens `/registro` (no query parameter)
- **THEN** `redirect` is read as `undefined` (or empty)
- **AND** the default success behavior (show success page with the registration code) is the fallback

#### Scenario: Form opens with `?redirect=/cursos/9?token=XYZ`

- **WHEN** the user opens `/registro?redirect=%2Fcursos%2F9%3Ftoken%3DXYZ`
- **THEN** `RegistroPage` decodes the value to `/cursos/9?token=XYZ`
- **AND** the value is held in component state for the post-success flow

### Requirement: After successful registration, SPA navigates to the validated redirect

After a successful `201` response from `POST /api/public/participants`, the SPA SHALL navigate to the validated redirect target. If validation fails or the value is absent, the SPA SHALL fall back to the default success page (showing the registration code).

#### Scenario: Successful registration with valid `?redirect=` navigates to the target

- **GIVEN** the form was opened with `?redirect=/cursos/9?token=XYZ`
- **WHEN** the user submits a valid payload and the API returns HTTP 201
- **THEN** the SPA navigates to `/#/cursos/9?token=XYZ`
- **AND** the registration success code is shown to the user before navigation (or the navigation replaces the success screen on the same SPA route)

#### Scenario: Successful registration without `?redirect=` falls back to success page

- **WHEN** the user submits a valid payload and the API returns HTTP 201
- **AND** no `?redirect=` value (or an invalid one) is held in state
- **THEN** the SPA renders the success page with the registration code
- **AND** no navigation to an external or unexpected path occurs

### Requirement: Redirect target validation rejects open-redirect attempts

The redirect validation function SHALL reject any redirect target that is not a same-origin relative SPA path. The function SHALL reject:
- Targets starting with `//` (protocol-relative URLs)
- Targets containing a scheme prefix (`http://`, `https://`, `javascript:`, `data:`, `vbscript:`, etc.)
- Targets containing control characters or whitespace that could enable header injection
- Targets not starting with `/`

The function SHALL allow:
- Paths starting with `/` followed by a non-`/` character (e.g., `/cursos/9`)
- Paths containing query strings (`?key=value`)
- Paths containing hash fragments (`#section`)

#### Scenario: `?redirect=//evil.com` is rejected

- **WHEN** the form is opened with `?redirect=//evil.com`
- **THEN** the validation function returns `null` (or equivalent invalid marker)
- **AND** after successful registration, the success page is shown instead of navigating away

#### Scenario: `?redirect=http://evil.com/path` is rejected

- **WHEN** the form is opened with `?redirect=http://evil.com/path`
- **THEN** the validation function returns `null`
- **AND** after successful registration, the success page is shown

#### Scenario: `?redirect=javascript:alert(1)` is rejected

- **WHEN** the form is opened with `?redirect=javascript:alert(1)`
- **THEN** the validation function returns `null`
- **AND** after successful registration, the success page is shown (no script execution)

#### Scenario: `?redirect=data:text/html,<script>...</script>` is rejected

- **WHEN** the form is opened with a `data:`-scheme redirect value
- **THEN** the validation function returns `null`
- **AND** no navigation to the `data:` URL occurs after success

#### Scenario: `?redirect=` with control characters is rejected

- **WHEN** the form is opened with a redirect value containing `\n`, `\r`, `\t`, or other control characters
- **THEN** the validation function returns `null`
- **AND** the success page is shown after registration

#### Scenario: Valid relative path with query string is accepted

- **WHEN** the form is opened with `?redirect=/cursos/9?token=XYZ`
- **THEN** the validation function returns `/cursos/9?token=XYZ`
- **AND** after successful registration, the SPA navigates to `/#/cursos/9?token=XYZ`

#### Scenario: Valid relative path with hash fragment is accepted

- **WHEN** the form is opened with `?redirect=/cursos/9#schedule`
- **THEN** the validation function returns `/cursos/9#schedule`
- **AND** after successful registration, the SPA navigates to `/#/cursos/9#schedule`
