# Spec Delta

## ADDED Requirements

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