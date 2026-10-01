# release-pipeline Specification

## Purpose

Define how the static pet-food site is built, verified, and deployed by the scheduled or push-triggered workflow, and how the record-count baseline that the ingestion drop guard compares against is refreshed, so that one run contacts MOA once and the recorded baseline always describes the data actually deployed.

## Requirements
### Requirement: Single upstream fetch per workflow run

A workflow run SHALL contact the MOA open-data endpoints exactly once for a full dataset retrieval. The build phase that produces the deployed site MUST NOT be duplicated by a later phase in the same run; any later phase that needs the fetched raw snapshots MUST obtain those exact files from the build phase rather than re-retrieving them.

#### Scenario: Scheduled run fetches once

- **WHEN** a scheduled workflow run completes successfully
- **THEN** the MOA food and vendor datasets have been retrieved from the upstream API exactly once for that run

#### Scenario: Baseline phase reuses the deployed snapshots

- **WHEN** the phase that refreshes the record-count baseline runs
- **THEN** it derives the counts from the same raw snapshots the deployed site was built from, and does not issue a second full retrieval

#### Scenario: Upstream data changes between phases

- **WHEN** records are added to the MOA dataset after the build phase has retrieved it
- **THEN** the deployed site and the recorded baseline describe the same record counts, because both derive from one retrieval

### Requirement: Baseline refresh follows a successful deployment

The record-count baseline used by the ingestion drop guard SHALL be refreshed only after the deployment has succeeded, and the refreshed counts MUST be derived from the raw snapshots that produced the deployed site. If the build or deployment fails, the baseline MUST be left unchanged so that the next run still compares against the last known-good deployment.

#### Scenario: Successful deployment updates the baseline

- **WHEN** the build and deployment both succeed
- **THEN** the baseline record counts equal the food and vendor record counts of the raw snapshots that produced the deployed site

#### Scenario: Failed deployment leaves the baseline alone

- **WHEN** the build fails verification or the deployment fails
- **THEN** no baseline update is written and the existing baseline file is unchanged

#### Scenario: Baseline commit is content-gated

- **WHEN** a deployment succeeds but the refreshed baseline is byte-identical to the committed baseline
- **THEN** no empty baseline commit is created

### Requirement: Pipeline stages run in order and gate deployment

The workflow SHALL retrieve data, normalize it, run the unit tests, build the static site, and verify the release artifact in that order, and the deployment MUST NOT proceed unless every preceding stage succeeded. The static artifact upload MUST contain the built site only, and the raw data snapshots MUST remain untracked in version control so that they are never served as part of the site.

#### Scenario: A failing stage blocks deployment

- **WHEN** the unit tests or the release verification fail
- **THEN** the deployment step does not run and the previously deployed site remains live

#### Scenario: Raw snapshots stay out of the published site

- **WHEN** the static site is deployed
- **THEN** the published output contains the built pages and normalized data files, and the raw MOA snapshots are neither committed to the repository nor included in the published artifact
