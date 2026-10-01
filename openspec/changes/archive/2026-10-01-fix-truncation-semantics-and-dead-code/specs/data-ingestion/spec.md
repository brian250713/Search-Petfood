# Spec Delta

## MODIFIED Requirements

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