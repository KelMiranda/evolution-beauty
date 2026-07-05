# Catalogs / Validation Specification

## Purpose

Define the catalog-backed values and validation rules needed to keep participant data consistent.

## Requirements

### Requirement: Catalog-backed classification values

The system MUST validate catalog-based participant attributes against approved catalog values.

#### Scenario: Valid catalog selection

- GIVEN a user selects a value that exists in the approved catalog
- WHEN the user saves the participant
- THEN the system MUST accept the selection

#### Scenario: Invalid catalog value

- GIVEN a user enters or submits a value not present in the approved catalog
- WHEN the user saves the participant
- THEN the system MUST reject the value

### Requirement: Required catalog completeness

The system MUST provide the catalogs required to support participant registration and operational filtering.

#### Scenario: Available catalog choices

- GIVEN the user opens a participant form
- WHEN the form loads
- THEN the system MUST expose the required catalog options

#### Scenario: Missing catalog option

- GIVEN a required catalog option is not available
- WHEN a user attempts to complete the form
- THEN the system MUST prevent submission until the option is available or the field is resolved

### Requirement: Validation feedback

The system MUST clearly report validation errors for missing or inconsistent participant data.

#### Scenario: Multiple invalid fields

- GIVEN a participant record has more than one invalid field
- WHEN the user submits the form
- THEN the system MUST report each invalid field

#### Scenario: Boundary or malformed input

- GIVEN a field contains malformed or out-of-range input
- WHEN the user submits the form
- THEN the system MUST reject the input
