# data-ingestion Specification

## Purpose

Define how the site fetches the two MOA open datasets (pet food and pet food vendors) into local raw snapshots with retry and count guardrails, so downstream normalization always runs on complete, traceable input.

## Requirements
### Requirement: Dual-source fetch

The system SHALL fetch both datasets from MOA TransService (`UnitId=wxV177kLhEE3` for food, `UnitId=6GNl6qsdx4nx` for vendors) and write them to `data/raw-food.json` and `data/raw-vendors.json`. Food fetch MUST page with `$top=10000&$skip=N`, looping until a returned page is shorter than the page size. Each fetch MUST retry failed HTTP requests up to 3 times with backoff before failing.

#### Scenario: Successful fetch

- **WHEN** `pnpm run fetch` runs with both MOA endpoints reachable
- **THEN** `data/raw-food.json` contains the full food array (all pages concatenated, ~102000 records) and `data/raw-vendors.json` contains the full vendor array, and the command exits 0

#### Scenario: Segmented stop

- **WHEN** a food page returns fewer than 10000 records
- **THEN** pagination stops and no further `$skip` request is made

#### Scenario: Retry then fail

- **WHEN** an endpoint fails transiently twice then succeeds
- **THEN** the fetch still completes and logs the retries

#### Scenario: Persistent failure

- **WHEN** an endpoint fails after all retries
- **THEN** the command exits non-zero, writes no partial raw file, and prints which source failed

### Requirement: Per-page field validation

The system MUST validate every page of food records against the expected MOA field set before appending it to the accumulated result, not only the first page. Each returned page's records MUST be checked for the presence of all expected fields (`ID`, `fname`, `fitem`, `fsource`, `fwcn`, `fmat`, `fnut`, `fusage1`, `fusage2`, `fusage3`, `forigin`, `flegalname`); a page containing any record missing one or more expected fields MUST fail the fetch with a validation error naming the offending record. No partially validated page MUST be written to the raw snapshot.

#### Scenario: Later page has a missing field

- **WHEN** the first food page returns records with all expected fields and a subsequent page returns a record missing `flegalname`
- **THEN** the fetch fails with a validation error identifying that record as missing `flegalname`, and `data/raw-food.json` is not overwritten

#### Scenario: All pages valid

- **WHEN** every food page returns records containing all expected fields
- **THEN** all pages are concatenated and the fetch completes normally

#### Scenario: Upstream schema change mid-pagination

- **WHEN** the MOA endpoint changes its response schema after the first page has been fetched
- **THEN** the affected page fails validation instead of contributing malformed records to the raw snapshot

### Requirement: Baseline count guard

The system SHALL compare fetched counts against `data/baseline.json` (`foodRecords`, `vendorRecords`). A drop of more than 10% versus baseline MUST fail the fetch. Because food records are now retrieved through paging, a returned food count that exactly matches the MOA TransService known response ceiling of 9999 MUST be treated as a platform truncation rather than a legitimately small dataset: the fetch MUST fail, MUST NOT write the raw snapshot files, and the message MUST state that the ceiling was reached rather than implying the data was recorded and processing continued.

#### Scenario: Count drop fails

- **WHEN** baseline foodRecords is 9999 and the fetch returns fewer than 9000 food records
- **THEN** the command exits non-zero without overwriting the raw files

#### Scenario: Normal update passes

- **WHEN** fetched counts are within 10% of baseline (or baseline is absent on first run)
- **THEN** raw files are written and the command exits 0

#### Scenario: Platform ceiling reached

- **WHEN** the food endpoint returns exactly 9999 records and the baseline is far above that ceiling
- **THEN** the fetch fails, no raw file is written, and the message reports that the 9999 response ceiling was reached

#### Scenario: Ceiling reached without a baseline

- **WHEN** `data/baseline.json` is absent and the food endpoint returns exactly 9999 records
- **THEN** the fetch still fails on the ceiling check rather than accepting a truncated first run as complete
