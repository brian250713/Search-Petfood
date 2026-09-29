# Spec Delta

## Purpose

Define side-by-side comparison of up to three foods with a shareable URL, so owners can contrast ingredients, nutrients, and origins.

## ADDED Requirements

### Requirement: Compare selection

The system SHALL let users tick up to 3 foods from search results, vendor pages, or detail pages into a compare tray; the tray MUST show the selected count and link to `/compare?ids=<id1>,<id2>,<id3>`.

#### Scenario: Add to compare

- **WHEN** the user ticks two foods in search results
- **THEN** the floating tray shows `比較已選 (2)` with a link to the compare page

#### Scenario: Over the limit

- **WHEN** 3 foods are already selected and the user ticks a fourth
- **THEN** the fourth is refused with a message that at most 3 can be compared

### Requirement: Compare page

The system SHALL render `/compare` client-side from `?ids=`, loading only the needed food shards, with rows for品名、種類、產品來源、包裝、原料、營養成分、適用寵物、原產地、廠商（linked when matched). Unknown IDs MUST be reported inline without breaking the other columns; the URL MUST reproduce the same table when reopened.

#### Scenario: Share compare URL

- **WHEN** the user opens a copied `/compare?ids=` URL
- **THEN** the same foods render in the same order
