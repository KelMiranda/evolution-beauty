# Delta for participant-edit-ui

## ADDED Requirements

### Requirement: Participant edit form rendering

The system MUST render a participant edit form pre-populated with the current participant data for any existing participant record.

#### Scenario: Edit form populated with participant data

- GIVEN an authenticated admin user navigates to the edit view for an existing participant
- WHEN the edit page loads
- THEN the system MUST display all participant fields pre-populated with the stored values
- AND the form action MUST point to the update endpoint

#### Scenario: Edit form inaccessible for invalid participant

- GIVEN a user navigates to the edit view with a non-existent participant ID
- WHEN the page loads
- THEN the system MUST return a 404 response or show an appropriate error message

### Requirement: Participant field update via form submission

The system MUST validate and persist participant field updates submitted through the edit form.

#### Scenario: Successful field update

- GIVEN an authenticated admin user has loaded the edit form for a valid participant
- WHEN the user modifies one or more fields and submits the form
- THEN the system MUST validate the submitted data against the participant schema
- AND MUST persist the changes to the database
- AND MUST record an audit event for the update action

#### Scenario: Update with validation errors

- GIVEN an authenticated admin user submits an edit form with invalid data
- WHEN the system validates the submitted data
- THEN the system MUST reject the update
- AND MUST return validation errors without modifying the stored record

### Requirement: Lifecycle state change via edit UI

The system MUST allow authorized users to change a participant's lifecycle state (active/inactive) through the edit interface.

#### Scenario: Deactivate participant via edit UI

- GIVEN an authenticated admin user is viewing the edit form for an active participant
- WHEN the user changes the lifecycle state to inactive and saves
- THEN the system MUST update the participant's lifecycle_state to inactive
- AND MUST set deleted_at to the current timestamp
- AND MUST record the state change in the audit trail

#### Scenario: Restore inactive participant via edit UI

- GIVEN an authenticated admin user is viewing the edit form for an inactive participant
- WHEN the user changes the lifecycle state to active and saves
- THEN the system MUST update the participant's lifecycle_state to active
- AND MUST clear the deleted_at and deleted_by fields
- AND MUST record the restore action in the audit trail

### Requirement: Edit form access control

The system MUST restrict participant edit access to users with administrative permissions.

#### Scenario: Facilitadora denied access to edit UI

- GIVEN a user authenticated as facilitadora attempts to access the participant edit page
- WHEN the system evaluates the user's permissions
- THEN the system MUST deny access with a 403 Forbidden response

#### Scenario: Unauthenticated access denied

- GIVEN a request to the participant edit endpoint without a valid authenticated session
- WHEN the system evaluates the request
- THEN the system MUST deny access with a 401 Unauthorized response

### Requirement: Edit form field parity with creation form

The system MUST support editing all fields that are editable during participant creation.

#### Scenario: All editable fields present in edit form

- GIVEN an authenticated admin user opens the participant edit form
- WHEN the form renders
- THEN the system MUST display all fields that are available during participant creation
- EXCEPT fields that are system-generated (id, participant_code, created_at, updated_at)

### Requirement: Cancel action redirects to participant list

The system MUST provide a cancel action that returns the user to the participant list without making changes.

#### Scenario: Cancel discards changes

- GIVEN an authenticated admin user has modified fields in the edit form without saving
- WHEN the user clicks the cancel button
- THEN the system MUST NOT persist any changes
- AND MUST redirect the user to the participant list page
