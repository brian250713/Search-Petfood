# Spec Delta

## Purpose

Define how the site fetches the two MOA open datasets (pet food and pet food vendors) into local raw snapshots with retry and count guardrails, so downstream normalization always runs on complete, traceable input.

## ADDED Requirements

### Requirement: Dual-source fetch

The system SHALL fetch both datasets from MOA TransService (`UnitId=wxV177kLhEE3` for food, `UnitId=6GNl6qsdx4nx` for vendors) and write them to `data/raw-food.json` and `data/raw-vendors.json`. Each fetch MUST retry failed HTTP requests up to 3 times with backoff before failing.

#### Scenario: Successful fetch

- **WHEN** `pnpm run fetch` runs with both MOA endpoints reachable
- **THEN** `data/raw-food.json` contains the full food array and `data/raw-vendors.json` contains the full vendor array, and the command exits 0

#### Scenario: Retry then fail

- **WHEN** an endpoint fails transiently twice then succeeds
- **THEN** the fetch still completes and logs the retries

#### Scenario: Persistent failure

- **WHEN** an endpoint fails after all retries
- **THEN** the command exits non-zero, writes no partial raw file, and prints which source failed

### Requirement: Baseline count guard

The system SHALL compare fetched counts against `data/baseline.json` (`foodRecords`, `vendorRecords`). A drop of more than 10% versus baseline MUST fail the fetch; a suspicious exact count of 9999 food records MUST print a truncation warning but still succeed.

#### Scenario: Count drop fails

- **WHEN** baseline foodRecords is 9999 and the fetch returns fewer than 9000 food records
- **THEN** the command exits non-zero without overwriting the raw files

#### Scenario: Normal update passes

- **WHEN** fetched counts are within 10% of baseline (or baseline is absent on first run)
- **THEN** raw files are written and the command exits 0
