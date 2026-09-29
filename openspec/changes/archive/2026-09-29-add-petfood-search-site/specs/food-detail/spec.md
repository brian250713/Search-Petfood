# Spec Delta

## Purpose

Define the food detail page that shows everything the open dataset records about one product and links both ways to its vendor.

## ADDED Requirements

### Requirement: Food detail page

The system SHALL serve a single shell page at `/food/` that renders client-side from `?id=<ID>` by loading the one needed `data/food/NNN.json` shard (FNV-1a of the ID, 128 shards). The page MUST display品名、食品種類、產品來源、包裝規格、主要原料及添加物、營養成分、適用寵物、原產地、使用方法、保存方法、廠商名稱， and set the browser title to `<品名> - 寵物食品資訊`. Directly opening the URL MUST return HTTP 200.

#### Scenario: Open detail

- **WHEN** the user opens `/food/?id=F202605220056`
- **THEN** the page shows `VE凍乾犬貓零食-雞心肝` with its種類 `零食`, 原產地 `美國`, and full nutrient text

#### Scenario: Unknown ID

- **WHEN** the user opens `/food/?id=NOT-EXIST` or omits `id`
- **THEN** the page shows a not-found message with a link back to search

#### Scenario: Load failure

- **WHEN** the shard fetch fails
- **THEN** the page shows a load-error message with a retry button

### Requirement: Vendor bidirectional link

The food detail page SHALL link a matched `flegalname` to `/vendor/?name=<業者名稱>`; an unmatched name MUST render as plain text. Every search result, vendor-page item, and compare cell showing a vendor name MUST follow the same link-or-plain-text rule.

#### Scenario: Linked vendor

- **WHEN** food `F202605220056` names `【公司】極寵有限公司` and that vendor exists
- **THEN** the detail page links the vendor name to that vendor's page

#### Scenario: Unmatched vendor

- **WHEN** a food's vendor name matches no vendor record
- **THEN** the name renders as plain text with no link
