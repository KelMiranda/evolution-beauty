# Stub Specification

## Purpose

Stub spec used to verify `openspec validate --specs` parses a minimal but well-formed spec.

## Requirements

### Requirement: Stub validates

The stub SHALL be present so `openspec validate --specs` exits zero.

#### Scenario: Stub parses
- **WHEN** `openspec validate --specs` runs
- **THEN** the command exits zero and reports this stub as valid
