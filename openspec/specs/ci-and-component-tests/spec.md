# CI and Component Tests — Spec

## Purpose

Restore a real CI gate that runs the React unit suite and the Playwright end-to-end suite against an actual PostgreSQL instance, and repair the three React component suites that broke when the Astro migration deleted their pages. Owned by the platform team; success means CI fails loud on real defects, never silently skips a test layer, and the three previously broken suites pass.

## Requirements

### Requirement: `test:unit` script in `app/package.json`

`app/package.json` SHALL expose a `test:unit` script that runs the React Vitest suites. The script SHALL be runnable from CI and SHALL exit non-zero on any test failure.

#### Scenario: `test:unit` exists and runs the React suites

- **WHEN** a developer or CI executes `npm run test:unit` inside `app/`
- **THEN** Vitest runs the React component and unit suites and the exit code reflects the result

#### Scenario: Missing script causes CI to fail

- **WHEN** `app/package.json` lacks the `test:unit` script
- **THEN** the CI step that invokes it fails with a clear `Missing script` error, not a silent skip

### Requirement: CI runs unit tests without `--if-present`

`.github/workflows/ci.yml` SHALL run `test:unit` directly, without `--if-present`, and SHALL fail the workflow when the script or its dependencies are missing.

#### Scenario: CI step invokes `test:unit` unconditionally

- **WHEN** the CI workflow reaches the React unit-test step
- **THEN** the step runs `npm run test:unit` and reports pass or fail
- **AND** does not silently skip when the script is absent

#### Scenario: A failing unit test fails the workflow

- **WHEN** any React unit test fails in CI
- **THEN** the workflow exits non-zero and the PR is blocked from merging

### Requirement: CI Postgres service with healthcheck

The CI workflow SHALL start a PostgreSQL service using a cached image, with an explicit healthcheck, so E2E tests connect to a ready database rather than racing container startup.

#### Scenario: Postgres service reports healthy before E2E starts

- **WHEN** the workflow reaches the E2E step
- **THEN** the Postgres service has passed its healthcheck
- **AND** the E2E step connects successfully without manual retry

#### Scenario: Postgres image is cached across runs

- **WHEN** the CI job starts
- **THEN** the PostgreSQL image is pulled from cache whenever available
- **AND** cold pulls only occur when the cache is invalidated

### Requirement: Playwright E2E runs against a real Postgres

The workflow SHALL run the Playwright E2E suite against the live Postgres service and SHALL configure flake retries for the E2E step so transient startup races do not produce false negatives.

#### Scenario: E2E suite executes and reports results

- **WHEN** the CI workflow reaches the E2E step
- **THEN** Playwright runs the existing E2E specs against the running Postgres service
- **AND** the step retries on transient failures up to a documented limit before declaring a failure

#### Scenario: Unhealthy database fails the E2E step clearly

- **WHEN** the Postgres service fails its healthcheck
- **THEN** the E2E step fails with a clear "database unavailable" message, not a misleading test failure

### Requirement: Broken component suites pass

The three React component suites that currently fail because they import pages deleted by the React migration SHALL be repaired by dropping the deleted-page imports and rewiring to test the React equivalents, or by removing the deleted-feature tests.

#### Scenario: Suite referencing deleted Astro pages compiles

- **WHEN** the affected component suite runs
- **THEN** it no longer imports any file under `src/components/*.astro`
- **AND** it compiles and runs against the React equivalents

#### Scenario: All three previously broken suites pass in CI

- **WHEN** the CI workflow completes the unit-test step
- **THEN** the three previously broken suites are green
- **AND** the overall unit-test step exits zero

### Requirement: Missing secrets fail loud

The CI workflow SHALL fail clearly when required secrets (e.g., `DATABASE_URL`, `POSTGRES_PASSWORD`, `VAPID_*`) are missing, rather than silently skipping the dependent step.

#### Scenario: Missing DB credentials abort the workflow

- **WHEN** the workflow is missing the required database credentials
- **THEN** the affected step fails with an explicit "missing secret" error
- **AND** the workflow does not silently fall back to a skipped state

#### Scenario: Missing push secrets abort only the push-related step

- **WHEN** the workflow is missing VAPID credentials but DB credentials are present
- **THEN** the unit and E2E steps still run
- **AND** only the push-subscription step fails with an explicit "missing secret" error