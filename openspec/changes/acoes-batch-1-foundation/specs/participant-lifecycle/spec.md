# Participant Lifecycle / Data Model Specification

## Purpose

Define the participant record lifecycle and the minimum data shape needed for ACOES foundation operations.

## Requirements

### Requirement: Active and inactive states

The system MUST support participant records in active and inactive states.

#### Scenario: Deactivate an active participant

- GIVEN a participant is active
- WHEN an authorized user marks the participant inactive
- THEN the participant MUST remain stored and MUST be treated as inactive

#### Scenario: Prevent operations on inactive participant

- GIVEN a participant is inactive
- WHEN a user attempts an action restricted to active participants
- THEN the system MUST reject the action

### Requirement: Soft-delete preservation

The system MUST preserve participant records through soft-delete instead of removing them permanently.

#### Scenario: Soft-delete a participant

- GIVEN a participant exists
- WHEN an authorized user deletes the participant
- THEN the system MUST hide the participant from normal active lists and MUST preserve the record

#### Scenario: Recoverable historical presence

- GIVEN a participant was soft-deleted
- WHEN the system needs to show historical or audit-relevant data
- THEN the participant MUST still be identifiable as an existing record

### Requirement: Required participant data

The system MUST require the minimum participant fields needed to identify and classify a participant consistently.

#### Scenario: Valid participant creation

- GIVEN all required participant fields are present and valid
- WHEN a user saves the participant
- THEN the system MUST accept the record

#### Scenario: Missing required field

- GIVEN at least one required participant field is missing
- WHEN a user saves the participant
- THEN the system MUST reject the record and MUST identify the missing data
