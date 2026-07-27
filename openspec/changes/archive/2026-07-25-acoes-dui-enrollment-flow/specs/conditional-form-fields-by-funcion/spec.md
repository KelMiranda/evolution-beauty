# Conditional Form Fields By Funcion — Spec

## Purpose

Show or hide `curso`, `capacitacion`, and `observaciones` in the public registration form based on the selected `funcion`. `Participante` flows through a minimal form; `Facilitador` reveals the course/training fields. `observaciones` is removed entirely from the public surface. Success means the form re-renders reactively when the role changes, stale values are cleared, and step validation matches what the user can see.

## Requirements

### Requirement: `curso` and `capacitacion` render only for `Facilitador`

The `curso` field (course dropdown) and the `capacitacion` field (free-text training description) SHALL render in step 3 of the public registration form ONLY when `funcion === 'Facilitador'`. For `funcion === 'Participante'`, neither field SHALL appear in any step.

#### Scenario: Initial render with empty `funcion` shows no conditional fields

- **WHEN** the public registration form first renders (before the user selects a role)
- **THEN** the `curso` dropdown is not visible
- **AND** the `capacitacion` input is not visible

#### Scenario: Selecting `funcion: 'Participante'` keeps conditional fields hidden

- **WHEN** the user selects `funcion: 'Participante'` in step 1
- **THEN** `curso` is not rendered in step 3
- **AND** `capacitacion` is not rendered in step 3
- **AND** neither field is required by step-3 validation

#### Scenario: Selecting `funcion: 'Facilitador'` reveals conditional fields

- **WHEN** the user selects `funcion: 'Facilitador'` in step 1
- **THEN** `curso` is rendered in step 3
- **AND** `capacitacion` is rendered in step 3
- **AND** both fields are required by step-3 validation before submission

#### Scenario: Toggling from Facilitador to Participante clears stale values

- **WHEN** the user has entered values for `curso` and `capacitacion` while `funcion === 'Facilitador'`
- **AND** the user then changes `funcion` to `'Participante'`
- **THEN** the conditional fields are hidden
- **AND** the form state for `curso` and `capacitacion` is cleared
- **AND** no value for `curso` or `capacitacion` is sent in the submit payload

#### Scenario: Toggling from Participante to Facilitador preserves previously entered data

- **WHEN** the user enters other form fields (name, DUI, email, etc.) while `funcion === 'Participante'`
- **AND** the user then changes `funcion` to `'Facilitador'`
- **THEN** the previously entered values remain in the form state
- **AND** `curso` and `capacitacion` appear empty and ready to be filled in

### Requirement: `observaciones` is removed from the public form

The `observaciones` field SHALL NOT exist in the public registration form for any `funcion` value. No UI element, label, or input matching `observaciones` SHALL appear, and no value for it SHALL be sent in the submit payload.

#### Scenario: No observaciones element is rendered for Participante

- **WHEN** the user selects `funcion: 'Participante'` and views step 3
- **THEN** no element labelled or named `observaciones` is rendered

#### Scenario: No observaciones element is rendered for Facilitador

- **WHEN** the user selects `funcion: 'Facilitador'` and views step 3
- **THEN** no element labelled or named `observaciones` is rendered

#### Scenario: Submission payload never includes `observaciones`

- **WHEN** the user submits the public registration form with any `funcion` value
- **THEN** the JSON body sent to `POST /api/public/participants` does not include an `observaciones` (or `notes`) key
- **AND** the backend does not persist `observaciones` even if a malformed client included it

### Requirement: `funcion` lives in step 1 so conditional rendering applies early

The `funcion` selector SHALL be rendered in step 1 of the registration form, not step 3. This ensures the conditional visibility of `curso` and `capacitacion` can be computed and re-rendered from step 1 onward as the user moves between steps.

#### Scenario: `funcion` selector is reachable in step 1

- **WHEN** the user is on step 1 of the registration form
- **THEN** the `funcion` selector is rendered and available for input

#### Scenario: Changing `funcion` in step 1 updates step-3 preview

- **WHEN** the user changes `funcion` while on step 1
- **AND** the user advances to step 3
- **THEN** step 3 renders (or hides) `curso` and `capacitacion` consistent with the new `funcion` selection
