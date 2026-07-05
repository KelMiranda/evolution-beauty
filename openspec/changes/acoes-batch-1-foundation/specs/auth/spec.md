# Auth / Authorization Specification

## Purpose

Define role-based access for the ACOES foundation batch so the system can separate administration, facilitation, and participant access.

## Requirements

### Requirement: Role-based access control

The system MUST authorize access based on the authenticated user's role. Supported roles MUST be `admin`, `facilitadora`, and `participante`.

#### Scenario: Admin access to management actions

- GIVEN a user is authenticated as `admin`
- WHEN the user opens management areas or performs privileged actions
- THEN the system MUST allow access

#### Scenario: Unauthorized role for privileged action

- GIVEN a user is authenticated as `participante`
- WHEN the user attempts an admin-only action
- THEN the system MUST deny access

### Requirement: Role-specific visibility

The system MUST show only the data and actions allowed for the user's role.

#### Scenario: Facilitadora sees operational scope

- GIVEN a user is authenticated as `facilitadora`
- WHEN the user opens participant-related screens
- THEN the system MUST show only the permitted operational actions

#### Scenario: Participant cannot see administrative controls

- GIVEN a user is authenticated as `participante`
- WHEN the user opens the application
- THEN the system MUST NOT show administrative controls

### Requirement: Access denial behavior

The system MUST block unauthorized requests even if a user reaches a protected route directly.

#### Scenario: Direct access to protected area

- GIVEN a user is not authorized for a protected area
- WHEN the user requests that area directly
- THEN the system MUST deny the request

#### Scenario: Missing or invalid session

- GIVEN a request has no valid authenticated session
- WHEN the request targets a protected action
- THEN the system MUST deny access
