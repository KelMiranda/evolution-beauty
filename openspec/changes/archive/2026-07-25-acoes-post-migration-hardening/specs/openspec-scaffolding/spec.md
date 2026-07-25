# OpenSpec Scaffolding — Spec

## Purpose

Restore the OpenSpec project structure (`config.yaml`, `specs/`, `changes/archive/`) so future archive synchronization for the parked `acoes-batch-1/2/3` changes can run safely, and document why those changes are still unarchived. Owned by the platform team; success means `openspec validate` is green on a stub spec and a new contributor can find the gap explanation in one read.

## Requirements

### Requirement: `openspec/config.yaml` exists with the CLI's actual schema

The file `openspec/config.yaml` SHALL exist at the repo root and SHALL use the schema that the installed OpenSpec CLI actually parses: a `schema` field (e.g., `spec-driven`), a `context` block describing the stack, and an optional `rules` block. Per the CLI source (`@fission-ai/openspec src/core/project-config.ts`), unknown keys such as `project`, `changeRoot`, or `archiveDir` are silently ignored; the change root and archive directory are hard-coded to `openspec/changes/` and `openspec/changes/archive/` respectively, so they are NOT declared in `config.yaml` — they exist as directories on disk.

#### Scenario: Config file is present and parseable

- **WHEN** a contributor opens `openspec/config.yaml`
- **THEN** the file contains a `schema` field with a valid value (e.g., `spec-driven`) and a `context` block summarizing the stack
- **AND** the YAML parses without error

#### Scenario: Missing or empty `schema` is rejected by the tool

- **WHEN** `openspec/config.yaml` has no `schema` field, or `schema` is empty
- **THEN** `openspec validate` reports a configuration error pointing to the missing/empty `schema`

### Requirement: `openspec/specs/` directory exists

The directory `openspec/specs/` SHALL exist and SHALL be empty or contain only valid spec files written under per-capability subdirectories.

#### Scenario: Specs directory is present and writable

- **WHEN** a contributor inspects the repo
- **THEN** `openspec/specs/` exists as a directory
- **AND** new capability spec files can be added under it without further setup

### Requirement: `openspec/changes/archive/` directory exists

The directory `openspec/changes/archive/` SHALL exist so that completed changes can be archived there without first creating the directory at archive time.

#### Scenario: Archive directory is present

- **WHEN** a contributor inspects the repo
- **THEN** `openspec/changes/archive/` exists as a directory, possibly empty

#### Scenario: Archiving a change moves it under `archive/`

- **WHEN** an archivist runs the OpenSpec archive command against a completed change
- **THEN** the change folder is moved under `openspec/changes/archive/` and the specs are synced to `openspec/specs/`

### Requirement: `openspec validate` passes on a stub spec

Running `openspec validate` against a stub spec written under `openspec/specs/` SHALL exit zero, confirming that the restored scaffolding is valid end to end.

#### Scenario: Validate exits zero on the stub

- **WHEN** a contributor writes `openspec/specs/_stub/spec.md` with valid Purpose and Requirements sections
- **THEN** `openspec validate` exits zero
- **AND** no schema errors are reported

#### Scenario: Validate exits non-zero on a malformed stub

- **WHEN** a contributor writes a stub missing the `## Purpose` heading
- **THEN** `openspec validate` exits non-zero and reports the missing heading by file path

### Requirement: README documents the parked archival gap

`openspec/README.md` SHALL exist and SHALL document that `acoes-batch-1-foundation`, `acoes-batch-2-ui-export`, and `acoes-batch-3-admin-audit` are intentionally unarchived, and SHALL list the missing items that block each (missing proposal, unchecked tasks, deleted UI, no verification report).

#### Scenario: README names the three parked changes

- **WHEN** a contributor opens `openspec/README.md`
- **THEN** the document explicitly names `acoes-batch-1-foundation`, `acoes-batch-2-ui-export`, and `acoes-batch-3-admin-audit`
- **AND** for each one, lists at least one blocker (proposal missing, tasks unchecked, UI deleted, no verify report)

#### Scenario: README points to the change that will close the gap

- **WHEN** a contributor reads the README
- **THEN** the document points to the `acoes-post-migration-hardening` change as the work that will make those archives safe to sync