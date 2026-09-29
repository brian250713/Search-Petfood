# Spec Delta

## Purpose

Define the homepage search experience that lets pet owners quickly find foods by name, ingredient, nutrient, or vendor, filter by category, and share filtered results via URL.

## ADDED Requirements

### Requirement: Full-text search

The system SHALL provide homepage full-text search over product name, ingredients/materials (`fmat`), nutrients (`fnut`), vendor name, and product ID, executed in the browser with a lazily loaded MiniSearch index. Typing a query MUST update results without a page reload, and an empty query MUST show the full browsable list.

#### Scenario: Name search

- **WHEN** the user types `雞胸肉`
- **THEN** `VE凍乾鮮肉零食-低脂雞胸肉` appears in results

#### Scenario: Ingredient search

- **WHEN** the user types `雞肝`
- **THEN** foods whose `fmat` contains `雞肝` appear in results

#### Scenario: Empty query

- **WHEN** the query box is cleared
- **THEN** all products are listed (subject to active filters)

### Requirement: Filters and shareable URL

The system SHALL offer filters for 食品種類 (`零食`, `乾飼糧`, `罐頭`, `補助食品`, `生鮮、冷凍`, `潔牙骨`, `半溼性飼糧`), 適用寵物 (`犬`, `貓`), 產品來源 (`輸入`, `製造、加工`, `委託代工廠製造`, `分裝`), and 原產地. Active query plus filters MUST be reflected in the URL so the exact result view can be shared and restored on load.

#### Scenario: Filter by category and pet

- **WHEN** the user selects種類 `乾飼糧` and寵物 `貓`
- **THEN** only dry foods for cats are listed and the URL contains those filter values

#### Scenario: Share URL

- **WHEN** the user opens a copied search URL with query and filters
- **THEN** the page restores the same query, filters, and result list

### Requirement: Search result items

Each result item MUST show product name,種類,適用寵物,原產地,廠商名（linked to the vendor page when matched, else plain text), and offer add-to-compare. Clicking the product name MUST open `/food/?id=<ID>`.

#### Scenario: Open detail

- **WHEN** the user clicks a result's product name
- **THEN** the browser navigates to that food's detail page
