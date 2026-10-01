# Tasks

## 1. Per-page field validation

- [x] 1.1 In `src/lib/fetcher.ts`, remove the `skip === 0 && chunk.length > 0` guard in `fetchAllFood` so `checkFields` runs for every page; verify the existing happy-path test in `tests/fetch.test.ts` ("loops segments until a short page") still passes
- [x] 1.2 Add a test in `tests/fetch.test.ts` where a `foodPageSize`-length first page is valid and the second page omits `flegalname`; verify `fetchAllFood` rejects with a `FetchError` whose message names `flegalname`
- [x] 1.3 Verify no partial write occurs on validation failure: with a temporary output path, confirm the failing fetch leaves `data/raw-food.json` untouched (check file mtime and byte size before/after)

## 2. Search UI and documentation truth

- [x] 2.1 In `src/pages/index.astro`, rewrite the search input `placeholder` to list only queryable fields (product name, vendor, ID, usage-pet text, food category) and drop the `原料（如雞胸肉）` example; verify the rendered page shows the new text
- [x] 2.2 In `README.md`, remove `原料` and `營養成分` from the search feature bullet, keeping the pointer that full ingredient and nutrient text is available on the food detail page; verify the bullet matches the behavior in `index.astro` (detail page still renders `fmat`/`fnut`)
- [x] 2.3 In `README.md`, remove the MiniSearch index-format claim from the architecture section and replace it with a description of the lazy-loaded compact JSON document index and in-browser token filtering; verify `pnpm grep` finds no remaining claim that MiniSearch is used

## 3. Spec sync

- [x] 3.1 Apply the `data-normalization` delta from `specs/data-normalization/spec.md` to `openspec/specs/data-normalization/spec.md`, replacing the MiniSearch-serializable output description with the compact document index description; verify the requirement name and the shard-lookup scenario are preserved verbatim
- [x] 3.2 Run `openspec validate --strict` (or the closest validate invocation available) and verify both changes report no errors