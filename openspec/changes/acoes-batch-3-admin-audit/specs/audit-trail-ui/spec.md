# Audit Trail UI Specification

## Purpose

Define the behavior of the admin audit trail viewer: filtering, pagination, and display of all system audit events.

## Requirements

### Requirement: Audit trail listing

The system SHALL display a paginated list of all audit events ordered by `created_at` descending.

#### Scenario: Admin loads the audit trail page

- GIVEN the authenticated user has the `admin` role
- WHEN the admin navigates to `/dashboard/auditoria`
- THEN the system SHALL display audit events ordered by `created_at` DESC with 50 rows per page

#### Scenario: Pagination navigation

- GIVEN the audit trail page is displayed with more than 50 events
- WHEN the admin clicks a page navigation control
- THEN the system SHALL display the next or previous 50 rows

### Requirement: Filter by entity_type

The system SHALL allow filtering audit events by `entity_type`.

#### Scenario: Filter by entity_type

- GIVEN the authenticated user has the `admin` role
- WHEN the admin selects an entity_type filter and submits
- THEN the system SHALL display only audit events matching the selected entity_type

### Requirement: Filter by entity_id

The system SHALL allow filtering audit events by `entity_id`.

#### Scenario: Filter by entity_id

- GIVEN the authenticated user has the `admin` role
- WHEN the admin enters an entity_id and submits
- THEN the system SHALL display only audit events where `entity_id` matches the entered value

### Requirement: Filter by actor_user_id

The system SHALL allow filtering audit events by the user who performed the action (`actor_user_id`).

#### Scenario: Filter by actor_user_id

- GIVEN the authenticated user has the `admin` role
- WHEN the admin enters an actor_user_id and submits
- THEN the system SHALL display only audit events where `actor_user_id` matches the entered value

### Requirement: Filter by action

The system SHALL allow filtering audit events by action type.

#### Scenario: Filter by action

- GIVEN the authenticated user has the `admin` role
- WHEN the admin selects an action filter and submits
- THEN the system SHALL display only audit events matching the selected action

### Requirement: Filter by date range

The system SHALL allow filtering audit events by a date range using `dateFrom` and `dateTo` parameters.

#### Scenario: Filter by date range

- GIVEN the authenticated user has the `admin` role
- WHEN the admin enters a dateFrom and/or dateTo value and submits
- THEN the system SHALL display only audit events where `created_at` falls within the specified range

#### Scenario: Filter with all parameters combined

- GIVEN the authenticated user has the `admin` role
- WHEN the admin applies multiple filters simultaneously
- THEN the system SHALL apply all filters as AND conditions and SHALL return only matching audit events

### Requirement: Audit trail permission gate

Only users with the `admin` role SHALL access the audit trail page and its API.

#### Scenario: Non-admin user attempts to access audit trail

- GIVEN the authenticated user does NOT have the `admin` role
- WHEN the user navigates to `/dashboard/auditoria`
- THEN the system SHALL return a 302 redirect to an unauthorized page

### Requirement: Audit event display columns

The audit trail list SHALL display the `created_at`, `actor_user_id`, `action`, `entity_type`, and `entity_id` for each event.

#### Scenario: Audit events display correctly

- GIVEN the audit trail page is displayed
- WHEN events are present
- THEN each row SHALL show the `created_at`, `actor_user_id`, `action`, `entity_type`, and `entity_id` values

### Requirement: Combined filter reduces results

The system SHALL return accurate filtered counts when filters are applied.

#### Scenario: Combined filters narrow results

- GIVEN the authenticated user has the `admin` role
- WHEN the admin applies filters for entity_type, actor_user_id, and a date range
- THEN the system SHALL return only audit events satisfying all three conditions

## Server Functions

### listAuditEvents(filters: AuditEventFilters): Promise<AuditEventRow[]>

Returns audit events matching the given filters, ordered by `created_at` DESC, limited by `limit` (default 50) and offset for pagination.

### countAuditEvents(filters: AuditEventFilters): Promise<number>

Returns the total count of audit events matching the given filters for pagination calculation.