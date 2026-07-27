# Enrollments Participant FK — Spec

## Purpose

Add a real `participant_id` foreign key on `enrollments` that is `NOT NULL` and cascades on participant delete, so the enrollment row is the durable record of "this participant is enrolled in this course" without relying on denormalized identity columns. Legacy columns (`full_name`, `email`, `phone`, `dui`, `notas`) are kept for admin compatibility during the transition. Success means the FK is enforced at the DB level, the migration is idempotent, and the public path always derives identity from the participant.

## Requirements

### Requirement: `enrollments.participant_id` is `NOT NULL` and references `participants(id)`

The `enrollments` table SHALL have a `participant_id` column that:
- Matches the type of `participants.id` (INT or BIGINT)
- Is `NOT NULL`
- Has a foreign key constraint to `participants(id)` with `ON DELETE CASCADE`

The column SHALL be indexed for join performance. The index SHALL be created on `participant_id`.

#### Scenario: Fresh DB creates the table with the FK from the start

- **WHEN** bootstrap runs on a fresh (empty) database
- **THEN** the `enrollments` table is created with `participant_id` defined as `NOT NULL`
- **AND** the FK constraint `enrollments_participant_id_fkey` (or equivalent named FK) references `participants(id) ON DELETE CASCADE`

#### Scenario: Existing DB migration adds the column, FK, and index

- **WHEN** bootstrap runs on a database that already has the legacy `enrollments` table without the FK
- **THEN** `ALTER TABLE enrollments ADD COLUMN participant_id INT NOT NULL REFERENCES participants(id) ON DELETE CASCADE` succeeds
- **AND** a corresponding index on `participant_id` is created

#### Scenario: Migration is idempotent (running twice does not fail)

- **WHEN** bootstrap is executed twice in succession
- **THEN** the second execution does not raise a "column already exists" or "constraint already exists" error
- **AND** the final schema is identical to running it once

#### Scenario: Inserting an enrollment without `participant_id` fails

- **WHEN** a row is inserted into `enrollments` without providing `participant_id` (or with `NULL`)
- **THEN** the DB rejects the insert with a NOT NULL violation
- **AND** no enrollment row is created

#### Scenario: Deleting a participant cascades to their enrollments

- **GIVEN** a participant has at least one enrollment row linked by `participant_id`
- **WHEN** that participant row is deleted from `participants`
- **THEN** all linked enrollment rows are deleted automatically by the CASCADE
- **AND** no orphan enrollment rows remain in `enrollments`

### Requirement: Legacy enrollment columns are preserved

The legacy columns `full_name`, `email`, `phone`, `dui`, and `notas` SHALL NOT be dropped from `enrollments`. Admin endpoints that read from these columns SHALL continue to work. The public path SHALL populate these columns from the participant in the same transaction so admin views remain accurate.

#### Scenario: Legacy columns remain queryable for admin endpoints

- **WHEN** an admin lists enrollments via the admin API
- **THEN** the response still includes `full_name`, `email`, `phone`, `dui`, and `notas` for each row

#### Scenario: Public-path enrollment populates legacy columns from the participant

- **GIVEN** a participant is resolved by DUI with `fullName = 'A'`, `email = 'a@x'`, `phone = '+503...'` 
- **WHEN** the public path creates the linked enrollment
- **THEN** the new enrollment's `full_name` is `'A'`, `email` is `'a@x'`, `phone` is `'+503...'`, and `dui` is the normalized DUI

### Requirement: `createEnrollment` accepts a `participantId`

The `createEnrollment` function SHALL accept `participantId` for the public path and SHALL require it (it SHALL NOT be optional for the public path). The function MAY continue to accept legacy identity fields for the admin path, but the public path SHALL derive them from the participant rather than from the caller's input.

#### Scenario: Public-path call provides `participantId`

- **WHEN** the public enrollment endpoint calls `createEnrollment({ participantId, courseId, publicToken, ... })`
- **THEN** the function persists the enrollment with `participant_id = participantId`
- **AND** the function's denormalization step reads the participant's current identity and populates the legacy columns from that source

#### Scenario: Missing `participantId` on the public path fails fast

- **WHEN** the public enrollment endpoint calls `createEnrollment` without a `participantId`
- **THEN** the function (or the caller) throws/rejects before any DB write
- **AND** no enrollment row with NULL `participant_id` can be created via the public path
