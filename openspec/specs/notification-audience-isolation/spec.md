# Notification Audience Isolation — Spec

## Purpose

Tighten notification visibility so a notification with an `audience_role` is only visible and markable to users whose role matches, while preserving the producer's view of their own notifications and the existing row-level access for null-audience rows. Owned by the notifications team; success means a `participante` cannot read or mark as read a notification targeted at `admin` even if they have a valid session.

## Requirements

### Requirement: Role-targeted notifications visible only to matching role

When a notification row has a non-null `audience_role`, only authenticated users whose role equals that value SHALL see the notification in their list and SHALL be able to mark it as read.

#### Scenario: Notification targeted at `admin` is hidden from `participante`

- **WHEN** a notification has `audience_role = "admin"` and a `participante` requests the notification list
- **THEN** the response omits that notification
- **AND** a follow-up mark-as-read call for that notification ID returns HTTP 404 or 403

#### Scenario: Notification targeted at `admin` is visible to `admin`

- **WHEN** a notification has `audience_role = "admin"` and an `admin` requests the notification list
- **THEN** the response includes the notification
- **AND** the `admin` can mark it as read successfully

### Requirement: Null-audience notifications respect existing row-level access

When `audience_role` is NULL, the previous row-level access rules (e.g., owner-targeted notifications) SHALL apply unchanged.

#### Scenario: Null-audience owner-targeted notification visible only to the owner

- **WHEN** a notification has `audience_role IS NULL` and an owner_id pointing at user X
- **THEN** user X sees the notification in their list
- **AND** any other user does not see it

#### Scenario: Null-audience broadcast notification visible to all authenticated users

- **WHEN** a notification has `audience_role IS NULL` and no owner restriction
- **THEN** every authenticated user can see it in their list

### Requirement: Producer always sees their own notifications

The user who created a notification SHALL always see that notification in their list and SHALL be able to mark it as read, regardless of `audience_role`.

#### Scenario: Producer sees a role-targeted notification they themselves cannot receive

- **WHEN** an `admin` creates a notification with `audience_role = "participante"`
- **THEN** the producer `admin` still sees the notification in their list
- **AND** the producer `admin` can mark it as read

### Requirement: Audience filter checks caller role, not just presence

The notification query SHALL require both `audience_role IS NULL OR audience_role = caller_role` (rather than the current `audience_role IS NOT NULL` only check). The producer's visibility is preserved independently of this filter.

#### Scenario: Filter rejects role mismatches even when audience is set

- **WHEN** a `participante` queries the notification list
- **THEN** the SQL filter excludes rows where `audience_role` is set to a non-`participante` value
- **AND** still includes rows where `audience_role IS NULL` and the caller is the owner or the row has no owner restriction

### Requirement: Allowlist test pins intended producers

An automated allowlist test SHALL pin the current notification producers (e.g., the course-completion producer in `src/lib/server/notifications.ts`) to their intended audience roles before the behavior flip is enabled in production.

#### Scenario: Allowlist test asserts course-completion targets `participante`

- **WHEN** the allowlist test runs against the current code
- **THEN** it asserts that notifications produced by the course-completion flow carry `audience_role = "participante"` (or the documented target role)
- **AND** the assertion fails loudly if the producer changes the audience without updating the allowlist

#### Scenario: Allowlist test must pass before flipping production behavior

- **WHEN** the behavior flip is enabled
- **THEN** the deployment SHALL require the allowlist test to be green
- **AND** a failure SHALL block the rollout

### Requirement: Unauthenticated notification access rejected

Notification list and mark-as-read endpoints SHALL reject anonymous requests.

#### Scenario: Anonymous list request is rejected

- **WHEN** an unauthenticated client calls the notification list endpoint
- **THEN** the endpoint returns HTTP 401

#### Scenario: Anonymous mark-as-read request is rejected

- **WHEN** an unauthenticated client calls the mark-as-read endpoint for any notification ID
- **THEN** the endpoint returns HTTP 401