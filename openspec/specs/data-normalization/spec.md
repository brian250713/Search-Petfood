# data-normalization Specification

## Purpose

Define how raw MOA food and vendor records are normalized into stable products, vendors, a search index, and JSON shards, including pet-type unification and vendor-name matching between the two datasets.

## Requirements
### Requirement: Food normalization

The system SHALL normalize each raw food record into a product keyed by `ID` (e.g. `F202605220056`), keeping `fname`, `fitem`, `fsource`, `fwcn`, `fmat`, `fnut`, `fusage1/2/3`, `forigin`, `flegalname` with HTML cleaned and whitespace trimmed. Records with blank `ID` or blank `fname` MUST be skipped and counted in `build-log.json`; on duplicate `ID` the last record wins.

#### Scenario: Normal record

- **WHEN** raw record `F202605220056` has fname `VE凍乾犬貓零食-雞心肝 1oz(28g)`
- **THEN** the normalized product keeps that ID and name with all source fields intact

#### Scenario: Blank ID skipped

- **WHEN** a raw record has blank `ID`
- **THEN** it is skipped, counted in the build log, and does not appear in search or shards

### Requirement: Pet-type unification

The system SHALL map free-text `fusage1` to a normalized pet set drawn from `犬` and `貓` (e.g. `犬貓`, `狗`, `犬、貓`, `成貓`, `全齡犬` all map to the appropriate subset of `{犬, 貓}`); values matching neither MUST be kept as `其他` with the original text preserved.

#### Scenario: Variant mapping

- **WHEN** `fusage1` is `犬、貓` or `貓咪`
- **THEN** the product's normalized pets are `{犬, 貓}` and `{貓}` respectively

#### Scenario: Unmappable value

- **WHEN** `fusage1` names a non-dog/cat pet
- **THEN** pets is `其他` and the original text remains searchable and visible

### Requirement: Vendor normalization and food linkage

The system SHALL normalize vendor records keyed by normalized `legalname` (trimmed, collapsed whitespace), stripping `【...】`-style prefixes from food `flegalname` before matching (e.g. `【公司】極寵有限公司` matches vendor `極寵有限公司`). The build log MUST report how many distinct food vendor names matched a vendor record and list the top unmatched names.

#### Scenario: Prefix match

- **WHEN** a food record names `【公司】極寵有限公司` and a vendor record names `極寵有限公司`
- **THEN** the food links to that vendor page and the vendor page lists that food

#### Scenario: Unmatched vendor name

- **WHEN** a food vendor name matches no vendor record
- **THEN** the food detail still renders the name as plain text (no link) and the name appears in the unmatched list in the build log

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
