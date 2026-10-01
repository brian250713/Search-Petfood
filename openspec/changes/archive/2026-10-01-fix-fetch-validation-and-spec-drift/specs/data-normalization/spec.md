# Spec Delta

## MODIFIED Requirements

### Requirement: Index and shard output

The system SHALL emit `public/data/search-index.json` as a compact document index containing a version stamp, a document count, and a documents array, where each document carries only the fields needed to render a result card and to match a query (product ID, name, food category, product source, origin, normalized pet types, usage-pet text, vendor name, vendor-registered flag). The index MUST NOT include raw-material (`fmat`) or nutrient (`fnut`) long text, so that the index stays loadable at approximately 100k records; that full text remains available through the food shards. The system SHALL also emit FNV-1a sharded `public/data/food/NNN.json` (128 shards) plus `public/data/vendor/NNN.json` (64 shards), plus `data/vendors.json` summary list. Shard counts and byte sizes MUST be recorded in `build-log.json`.

#### Scenario: Shard lookup

- **WHEN** normalization finishes
- **THEN** every product ID resolves to exactly one food shard and every vendor name to exactly one vendor shard containing its entry

#### Scenario: Index shape

- **WHEN** the search index is built
- **THEN** the file contains a version stamp, the document count matching the number of emitted documents, and a documents array in which no entry contains raw-material or nutrient text

#### Scenario: Index size stays loadable

- **WHEN** the search index is built for the full dataset of approximately 100k products
- **THEN** the emitted index omits long free-text fields and remains small enough for the homepage to fetch lazily without blocking first render