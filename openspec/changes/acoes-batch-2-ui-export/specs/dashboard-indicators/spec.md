# Delta for dashboard-indicators

## ADDED Requirements

### Requirement: Enhanced dashboard metrics display

The system MUST display enhanced participant metrics on the dashboard page beyond the basic counts provided in Batch 1.

#### Scenario: Dashboard shows aggregate counts

- GIVEN an authenticated user with dashboard access views the dashboard
- WHEN the dashboard loads
- THEN the system MUST display the existing metrics: total participants, registrations today, participants with consent, participants with email
- AND the system SHOULD display additional metrics for: active participants, inactive participants

#### Scenario: Metrics refresh without page reload

- GIVEN an authenticated user with dashboard access is viewing the dashboard
- WHEN the user performs an action that changes participant data
- THEN the metrics SHOULD update without requiring a full page reload
- AND the displayed values MUST reflect the current state of the data

### Requirement: Department-based distribution indicators

The system SHOULD display participant distribution by department as indicators on the dashboard.

#### Scenario: Department breakdown displayed

- GIVEN an authenticated admin user views the dashboard
- WHEN the dashboard renders
- THEN the system SHOULD display a breakdown of participant counts grouped by department
- AND the breakdown SHOULD be sortable by count descending

#### Scenario: Department with highest count highlighted

- GIVEN an authenticated admin user views the dashboard
- WHEN the department distribution is displayed
- THEN the department with the highest participant count SHOULD be visually distinguished

### Requirement: Program participation indicators

The system SHOULD display indicators showing participant distribution across programs.

#### Scenario: Program distribution displayed

- GIVEN an authenticated admin user views the dashboard
- WHEN the dashboard renders
- THEN the system SHOULD display participant counts grouped by program
- AND programs with no assigned participants SHOULD be shown with a count of zero or omitted

### Requirement: Education level distribution indicators

The system SHOULD display participant distribution by education level.

#### Scenario: Education level breakdown shown

- GIVEN an authenticated admin user views the dashboard
- WHEN the dashboard renders
- THEN the system SHOULD display participant counts grouped by education_level
- AND the breakdown SHOULD include participants with no education level specified

### Requirement: Role function distribution indicators

The system SHOULD display participant distribution by role function.

#### Scenario: Role function breakdown shown

- GIVEN an authenticated admin user views the dashboard
- WHEN the dashboard renders
- THEN the system SHOULD display participant counts grouped by role_function
- AND each role function MUST match the approved catalog values

### Requirement: Dashboard indicators access control

The system MUST restrict enhanced dashboard indicators to users with appropriate permissions.

#### Scenario: Facilitadora sees limited dashboard

- GIVEN a user authenticated as facilitadora views the dashboard
- WHEN the dashboard renders
- THEN the system MAY show basic metrics only
- AND MUST NOT expose administrative indicators that reveal organizational-wide statistics

#### Scenario: Participant role redirected

- GIVEN a user authenticated as participante attempts to access the full dashboard
- WHEN the system evaluates the user's permissions
- THEN the system MUST redirect the user to the appropriate participant-facing page

### Requirement: Dashboard metrics data source

The system MUST derive dashboard indicators from SQL aggregates rather than computing them in the UI layer.

#### Scenario: Metrics come from database aggregates

- GIVEN an authenticated admin user views the dashboard
- WHEN the system retrieves metrics for display
- THEN the metrics MUST be computed via SQL aggregation queries
- AND the queries MUST exclude soft-deleted participant records from active counts

### Requirement: Dashboard date range filtering

The system SHOULD support filtering dashboard indicators by date range.

#### Scenario: Metrics filtered by date range

- GIVEN an authenticated admin user views the dashboard with a date range filter active
- WHEN the system renders the indicators
- THEN all displayed counts MUST reflect only participants created within the selected date range

#### Scenario: Default date range is all-time

- GIVEN an authenticated admin user views the dashboard without specifying a date range
- WHEN the dashboard renders
- THEN the system SHOULD default to displaying all-time metrics
- AND the date range selector SHOULD indicate "Todos" or similar

### Requirement: Gender distribution indicators

The system SHOULD display participant distribution by gender.

#### Scenario: Gender breakdown shown

- GIVEN an authenticated admin user views the dashboard
- WHEN the dashboard renders
- THEN the system SHOULD display participant counts grouped by gender
- AND the breakdown MUST use the approved catalog values for gender
