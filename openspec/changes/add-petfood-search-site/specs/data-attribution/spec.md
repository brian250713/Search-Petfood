# Spec Delta

## Purpose

State how the site credits the MOA open datasets, their license, and the limits of machine-normalized content, so users can verify and use the data correctly.

## ADDED Requirements

### Requirement: Attribution page

The system SHALL provide an about-data page stating both sources（農業部「寵物食品資料」與「寵物食品業者資料」), the government open license (https://data.gov.tw/license), the data fetch timestamp, and record counts.

#### Scenario: View attribution

- **WHEN** the user opens the about-data page
- **THEN** both dataset names, the license link, and the fetch time with counts are visible

### Requirement: Disclaimer

Every data page footer (or the about-data page linked from the footer) MUST state that content is整理自政府開放資料，適用寵物歸類為程式自動推斷可能有誤，僅供查詢參考， and that the competent authority's announcements prevail.

#### Scenario: Read disclaimer

- **WHEN** the user reads the footer of a food detail page
- **THEN** the disclaimer text or a link to it is present
