# Design

## Context

Greenfield port of `brian250713/Search-VeterinaryDrug` (Astro static + browser MiniSearch + FNV-1a JSON shards + GitHub Pages) to MOA pet-food data. Real field values verified 2026-09-29: food 9999筆 (`ID,fname,fitem,fsource,fwcn,fmat,fnut,fusage1,fusage2,fusage3,forigin,flegalname`), vendors 4044筆 (`ID,legaltype,legalname,ownname,legaltel,legaladdress,contactname,legalcountry,legalgzone`). Pet food has no license-expiry concept, so no expired/biologic filtering. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:** byte-level reuse of the reference data pipeline shape (fetch → normalize → search-index → shards → verify) and shell-page pattern; bidirectional food↔vendor links via normalized names.

**Non-Goals:** no ingredient pages (raw-material text stays a search/display field); no user accounts; no server-side rendering of detail content.

## Decisions

- **Vendor identity = normalized `legalname`** (trim + collapse whitespace; strip `【...】` prefix on the food side, e.g. `【公司】極寵有限公司` → `極寵有限公司`). Alternative (exact match) rejected: real data shows prefixed food-side names.
- **`fusage1` → `{犬,貓,其他}` subset** via keyword scan (`犬|狗` → 犬， `貓|猫` → 貓， neither → 其他， original text always kept). Alternative (fixed enum list) rejected: dozens of free-text variants observed.
- **Shards: food 128 / vendor 64**, same FNV-1a `shard.ts`; `url.ts` base becomes `/Search-Petfood`. Vendor detail keyed by normalized name (URL-encoded).
- **legaltype display**: `1` → 公司， `3` → 個人/其他 with raw-code fallback. Verified by samples (company names vs personal names) but not by official codelist.
- **Design language** via `ui-ux-pro-max --design-system "pet food search tool trustworthy friendly"` + `--stack astro`; warm trustworthy palette, card list + definition-list detail, no emoji icons.
- **Deploy**: same `deploy.yml` shape (fetch → normalize → test → build → verify → pages; weekly cron + baseline update job).

## Risks / Trade-offs

- [Risk] Food count exactly 9999 suggests possible API cap/truncation → Mitigation: fetch logs warning at ==9999; verify asserts >0 and shard coverage; record count in baseline for drift detection.
- [Risk] Food↔vendor name mismatch (different spellings) leaves plain-text names → Mitigation: build log reports match rate + top unmatched names for manual alias review.
- [Risk] `fusage1` free text misclassified → Mitigation: keep original text visible/searchable; disclaimer covers auto-inference.
- [Risk] `legaltype` mapping (1/3) unverified against official codelist → Mitigation: show mapped label with code fallback; correct when EIR633 confirmed.
- [Risk] 10MB raw food JSON in CI weekly → Mitigation: stream-parse not required (Node handles it), but normalize writes minified JSON to keep shards small.

## Migration Plan

Fresh repo: scaffold → first green build with real data → push `main` → enable Pages (GitHub Actions source) → verify public URL. Rollback = redeploy previous artifact; data failures block deploy via pipeline order.

## Open Questions

- None blocking: 9999-cap and legaltype mapping are handled with warnings/fallbacks above and do not change specs or task breakdown.
