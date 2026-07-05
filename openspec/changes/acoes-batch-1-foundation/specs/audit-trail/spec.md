# Audit Trail Specification

## Purpose

Define the minimum audit trail needed to trace important ACOES data changes.

## Requirements

### Requirement: Audit critical changes

The system MUST record audit events for critical participant and access-related changes.

#### Scenario: Create participant audit entry

- GIVEN a participant is created successfully
- WHEN the record is saved
- THEN the system MUST record an audit event for the creation

#### Scenario: Status change audit entry

- GIVEN a participant changes state from active to inactive or deleted-by-soft-delete
- WHEN the state change is saved
- THEN the system MUST record an audit event for the change

### Requirement: Audit event traceability

The system MUST make each audit event attributable to the user action that produced it.

#### Scenario: Authorized user performs change

- GIVEN an authenticated user performs a tracked action
- WHEN the action succeeds
- THEN the audit event MUST identify the actor and the affected record

#### Scenario: Failed change is not treated as success

- GIVEN a user submits an invalid change
- WHEN the system rejects the change
- THEN the system MUST NOT record the rejected change as a successful mutation

### Requirement: Historical reviewability

The system SHOULD preserve audit information for later review of operational history.

#### Scenario: Review previous change

- GIVEN a participant has prior tracked changes
- WHEN an authorized user reviews the history
- THEN the system SHOULD expose the sequence of recorded events

#### Scenario: Audit remains after soft-delete

- GIVEN a participant is soft-deleted
- WHEN historical information is reviewed
- THEN the system MUST still retain the related audit events
