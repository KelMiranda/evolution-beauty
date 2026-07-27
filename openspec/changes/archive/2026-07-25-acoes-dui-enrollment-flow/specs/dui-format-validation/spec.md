# DUI Format Validation — Spec

## Purpose

Validate and normalize DUI inputs to the canonical Salvadoran format `00000000-0` (eight digits, dash, one digit). The registration schema and the enrollment-by-DUI lookup both depend on the same canonical representation, so a duplicate DUI is matched regardless of how the user types it. Success means a user typing `00000000 0`, `000000000`, or `00000000-0` is treated as the same person, and malformed input is rejected at the validation boundary.

## Requirements

### Requirement: Canonical DUI format is `00000000-0`

The system SHALL define the canonical DUI format as `^\d{8}-\d$` (exactly eight digits, a single dash, exactly one trailing digit). Any input that does not match this canonical form, after normalization, SHALL be rejected.

#### Scenario: Schema accepts `00000000-0` and normalizes to itself

- **WHEN** the schema receives the value `00000000-0`
- **THEN** it is accepted as valid
- **AND** the stored / looked-up value is `00000000-0`

#### Scenario: Schema accepts `000000000` (no dash) and normalizes to `00000000-0`

- **WHEN** the schema receives the value `000000000` (nine contiguous digits)
- **THEN** the normalizer inserts the dash to produce `00000000-0`
- **AND** the value is accepted as valid
- **AND** the stored / looked-up value is `00000000-0`

#### Scenario: Schema rejects input that is too short

- **WHEN** the schema receives `1234567` (seven characters)
- **THEN** the value is rejected with a per-field validation error
- **AND** no participant lookup or persistence uses this value

#### Scenario: Schema rejects input that is too long

- **WHEN** the schema receives `12345678901234` (fourteen characters)
- **THEN** the value is rejected with a per-field validation error
- **AND** no participant lookup or persistence uses this value

#### Scenario: Schema rejects input with letters or symbols

- **WHEN** the schema receives `abcdefgh-i`, `12345-67-8`, or any non-digit content
- **THEN** the value is rejected with a per-field validation error

### Requirement: Normalizer is applied before validation and lookup

The normalizer SHALL run BEFORE the format validator and BEFORE any participant lookup. The participant lookup SHALL use the normalized value as the canonical match key, never the raw input.

#### Scenario: Whitespace and case are stripped before format check

- **WHEN** the schema receives `  00000000-0  ` (with surrounding whitespace) or `00000000-0\n` (with a newline)
- **THEN** the normalizer trims whitespace and control characters
- **AND** the format check passes against the trimmed value

#### Scenario: Lookup uses the normalized DUI

- **GIVEN** a participant exists with stored DUI `00000000-0`
- **WHEN** an enrollment lookup is performed with input `000000000` (no dash)
- **THEN** the lookup normalizes the input to `00000000-0`
- **AND** finds the participant (not a miss)

### Requirement: Form's DUI field guides user input and validates client-side

The public registration form's DUI input SHALL have an HTML5 `pattern` attribute matching the canonical form (`\d{8}-\d`) for instant client-side feedback. The input SHALL also have a `placeholder` showing the canonical format (`00000000-0`).

#### Scenario: DUI input has pattern attribute `\d{8}-\d`

- **WHEN** the registration form's DUI input is inspected in the DOM
- **THEN** the input element has `pattern="\d{8}-\d"`

#### Scenario: DUI input shows canonical placeholder

- **WHEN** the registration form's DUI input is inspected in the DOM
- **THEN** the input element has `placeholder="00000000-0"` (or an equivalent canonical string)

#### Scenario: Client-side validation blocks malformed submission

- **WHEN** the user types `1234` into the DUI input
- **AND** attempts to advance to the next step or submit
- **THEN** the browser's native HTML5 validation shows a format mismatch message
- **AND** the form does not submit until the input matches the pattern
