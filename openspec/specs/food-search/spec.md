# food-search Specification

## Purpose

Define the homepage search experience that lets pet owners quickly find foods by name, ingredient, nutrient, or vendor, filter by category, and share filtered results via URL.

## Requirements
### Requirement: Full-text search

The system SHALL provide homepage full-text search over product name, vendor name, usage-pet text, food category, and product ID, executed in the browser with a lazily loaded compact JSON doc index. Typing a query MUST update results without a page reload, and an empty query MUST show the full browsable list. Raw-material (`fmat`) and nutrient (`fnut`) long text SHALL NOT be query-matched (index stays shippable at ~100k records); their full text remains visible on the food detail page.

#### Scenario: Name search

- **WHEN** the user types `雞胸肉`
- **THEN** `VE凍乾鮮肉零食-低脂雞胸肉` appears in results

#### Scenario: Vendor search

- **WHEN** the user types `極寵`
- **THEN** foods whose vendor is `極寵有限公司` appear in results

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

### Requirement: Query tokenization

The system SHALL tokenize homepage queries into alphanumeric tokens plus CJK bigrams: CJK segments of length 2 or more contribute only their bigrams, single-character segments contribute the character itself. Tokens MUST be deduplicated and evaluated longest-first so selective tokens short-circuit the match early. Because bigram matches imply unigram matches under AND semantics, result sets MUST be identical to unigram+bigram matching.

#### Scenario: Bigram-only matching

- **WHEN** the user types `雞肉`
- **THEN** results are the same as matching `雞`, `肉`, and `雞肉` combined

#### Scenario: Single-character query

- **WHEN** the user types `雞`
- **THEN** the single character is matched directly and results appear

### Requirement: Search execution order and caching

The system SHALL apply cheap structured filters (food category, pet, source, origin) before full-text matching, match full text against a precomputed lowercase search string per document (never rebuilding match strings per keystroke), and memoize result lists per query-plus-filter state (bounded cache) so repeated or restored states return without re-scanning. With no query and no filters the system MUST reuse the loaded document array instead of allocating a filtered copy.

#### Scenario: Filter-first narrowing

- **WHEN** 種類 `乾飼糧` is selected and the user types `雞肉`
- **THEN** full-text matching runs only over dry-food candidates

#### Scenario: Repeated state

- **WHEN** the user re-enters a previously searched query-plus-filter combination
- **THEN** the cached result list is reused without a full re-scan

### Requirement: Search result items

Each result item MUST show product name,種類,適用寵物,原產地,廠商名（linked to the vendor page when matched, else plain text), and offer add-to-compare. Clicking the product name MUST open `/food/?id=<ID>`.

#### Scenario: Open detail

- **WHEN** the user clicks a result's product name
- **THEN** the browser navigates to that food's detail page
