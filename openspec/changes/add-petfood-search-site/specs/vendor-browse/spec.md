# Spec Delta

## Purpose

Define vendor-side browsing: one vendor page listing all its foods, and an overview page listing all vendors, each linked back to food details.

## ADDED Requirements

### Requirement: Vendor page

The system SHALL serve a single shell page at `/vendor/` that renders client-side from `?name=<業者名稱>` by loading the one needed `data/vendor/NNN.json` shard (FNV-1a of the normalized name, 64 shards). The page MUST show業者名稱、廠商分類、負責人、電話、地址（縣市＋行政區＋地址）、聯絡人， plus its food list; unknown or missing `name` MUST show a not-found message with a link to `/vendors`; shard load failure MUST show an error with retry. Directly opening the URL MUST return HTTP 200.

#### Scenario: Open vendor

- **WHEN** the user opens the page for `統一企業股份有限公司`
- **THEN** the page shows its registration fields and every food whose vendor normalizes to that name

#### Scenario: Unknown vendor

- **WHEN** the user opens `/vendor/?name=不存在的業者`
- **THEN** the page shows a not-found message with a link to the vendor overview

### Requirement: Vendor food list

The vendor page SHALL list each food with品名（linked to `/food/?id=`),種類、適用寵物、原產地， and provide食品種類篩選 and add-to-compare per item.

#### Scenario: Vendor to food

- **WHEN** the user clicks a food name on a vendor page
- **THEN** the browser navigates to that food's detail page

### Requirement: Vendor overview page

The system SHALL provide `/vendors` listing all vendors with業者名稱、廠商分類、所在縣市、食品數； it MUST offer name quick-filter (substring, case-insensitive for latin text), county filter, and sorting (by food count descending by default, or by name). The page MUST show `顯示 N / M 家`.

#### Scenario: Overview filter

- **WHEN** the user types `統一` in the name filter
- **THEN** only matching vendors are listed with an updated count

#### Scenario: Empty result

- **WHEN** no vendor matches the filters
- **THEN** the list shows a no-result message with `顯示 0 / M 家`

### Requirement: Nav entry

The site nav SHALL link `業者總覽` to `/vendors` on every page, without causing horizontal scroll at 375px width.

#### Scenario: Navigate from nav

- **WHEN** the user clicks `業者總覽` in the nav
- **THEN** the browser navigates to `/vendors`
