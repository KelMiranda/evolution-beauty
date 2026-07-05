# Admin User Management Specification

## Purpose

Define the behavior of admin user management capabilities: create, edit, deactivate, and list user accounts.

## Requirements

### Requirement: User creation

The system SHALL allow an admin to create a new user account with a name, email address, role, and active status.

#### Scenario: Admin creates a valid new user

- GIVEN the authenticated user has the `admin` role
- WHEN the admin submits a valid user creation request with name, email, role, and active status
- THEN the system SHALL create the user record and SHALL record an audit event with `entity_type='user'` and action `'create'` in the same transaction

#### Scenario: Admin submits invalid user data

- GIVEN the authenticated user has the `admin` role
- WHEN the admin submits a user creation request with a missing required field
- THEN the system SHALL return a 400 error and SHALL NOT create the user record

#### Scenario: Email uniqueness violation

- GIVEN the authenticated user has the `admin` role
- WHEN the admin submits a user creation request with an email address already in use
- THEN the system SHALL return a 400 error with a friendly message and SHALL NOT create the user record

### Requirement: User editing

The system SHALL allow an admin to edit an existing user's name, email, and role.

#### Scenario: Admin updates a user successfully

- GIVEN the authenticated user has the `admin` role
- WHEN the admin submits a valid update request for an existing user
- THEN the system SHALL update the user record and SHALL record an audit event with `entity_type='user'` and action `'update'` in the same transaction

#### Scenario: Admin updates a non-existent user

- GIVEN the authenticated user has the `admin` role
- WHEN the admin submits an update request for a user ID that does not exist
- THEN the system SHALL return a 404 error

### Requirement: User deactivation

The system SHALL allow an admin to soft-deactivate a user by setting their active status to false.

#### Scenario: Admin deactivates a user

- GIVEN the authenticated user has the `admin` role
- WHEN the admin submits a deactivation request for an active user
- THEN the system SHALL set the user's active status to false and SHALL record an audit event with `entity_type='user'` and action `'deactivate'` in the same transaction

#### Scenario: Admin attempts to deactivate their own account

- GIVEN the authenticated user has the `admin` role
- WHEN the admin submits a deactivation request for their own user account
- THEN the system SHALL return a 400 error and SHALL NOT deactivate the account

#### Scenario: Deactivated user cannot log in

- GIVEN a user account has active status set to false
- WHEN the user attempts to log in
- THEN the system SHALL deny authentication

### Requirement: User listing

The system SHALL present a paginated list of all users showing their name, email, role, and active status.

#### Scenario: Admin views the user list

- GIVEN the authenticated user has the `admin` role
- WHEN the admin navigates to the user list page
- THEN the system SHALL display all users with their name, email, role badge, and active/inactive indicator

#### Scenario: Role badge styling

- GIVEN the user list is displayed
- WHEN a user has role `admin`, `facilitadora`, or `participante`
- THEN each role SHALL be rendered with distinct visual styling

### Requirement: Permission gate

Only users with the `admin` role SHALL access user management pages and API routes.

#### Scenario: Non-admin user attempts to access user list

- GIVEN the authenticated user does NOT have the `admin` role
- WHEN the user navigates to `/dashboard/usuarios`
- THEN the system SHALL return a 302 redirect to an unauthorized page

#### Scenario: Non-admin user attempts to access user management API

- GIVEN the authenticated user does NOT have the `admin` role
- WHEN the user submits a POST, PUT, or PATCH request to user API routes
- THEN the system SHALL return a 403 error

### Requirement: Audit event recording

All user mutations SHALL record an audit event within the same transaction as the data change.

#### Scenario: Create user writes audit event

- GIVEN an admin creates a user
- WHEN the creation succeeds
- THEN the audit event with entity_type `'user'` and action `'create'` SHALL be committed in the same transaction as the user record

#### Scenario: Update user writes audit event

- GIVEN an admin updates a user
- WHEN the update succeeds
- THEN the audit event with entity_type `'user'` and action `'update'` SHALL be committed in the same transaction as the user record

#### Scenario: Deactivate user writes audit event

- GIVEN an admin deactivates a user
- WHEN the deactivation succeeds
- THEN the audit event with entity_type `'user'` and action `'deactivate'` SHALL be committed in the same transaction as the user record

## Server Functions

### listUsers

Returns all users as `{ id, email, full_name, role, active, created_at }[]`.

### getUserById(id: number)

Returns a single user or `null` if not found.

### createUser(input: UserInput, actorUserId: number)

Creates a user, records an audit event, and commits both in a single transaction. Throws on validation error or email uniqueness violation.

### updateUser(id: number, patch: UserPatch, actorUserId: number)

Updates a user, records an audit event, and commits both in a single transaction. Throws on validation error or not-found.

### deactivateUser(id: number, actorUserId: number)

Soft-deactivates a user by setting `active = false`, records an audit event, and commits both in a single transaction. Throws on self-deactivation attempt.