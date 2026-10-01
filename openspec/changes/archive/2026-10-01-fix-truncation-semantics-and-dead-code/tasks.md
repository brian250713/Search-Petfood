# Tasks

## 1. Truncation ceiling becomes a failure

- [x] 1.1 In `src/lib/fetcher.ts`, replace the `console.warn` 9999 branch in `validateSource` with a thrown `FetchError` whose message states the 9999 MOA TransService response ceiling was reached and that no raw file was written; verify the message no longer claims the data was recorded and processing continues
- [x] 1.2 Move the ceiling check above the baseline comparison and make it independent of `baselineCount`, so a 9999 response fails even when `data/baseline.json` is absent; verify `validateSource(new Array(9999), undefined, { label: 'food', minAllowedDrop: 0.1 })` throws
- [x] 1.3 Extract 9999 into a named constant with a comment recording that it is the MOA TransService known response ceiling (not a configurable value); verify the constant is referenced by the check and `pnpm lint` passes

## 2. Test coverage for the new semantics

- [x] 2.1 Rewrite the "warns but passes on exactly 9999 food records" test in `tests/fetch.test.ts` to assert a throw, and pass the realistic production baseline (102278) instead of 9999 so the test exercises the real evaluation order; verify it fails before the guard reorder and passes after
- [x] 2.2 Add a test asserting a legitimate count just above the ceiling (10000) with a matching baseline does not throw, confirming the rule targets the ceiling value rather than small counts generally; verify `pnpm test` passes
- [x] 2.3 Confirm the existing "fails on empty and on >10% drop" and "Count drop fails" cases still pass unchanged, proving the reorder did not disturb the 10% rule

## 3. Spec sync

- [x] 3.1 Apply the `data-ingestion` delta from `specs/data-ingestion/spec.md` to `openspec/specs/data-ingestion/spec.md`, rewriting the baseline count guard requirement so 9999 is a truncation failure rather than a warn-and-continue; verify the pre-existing scenarios (count drop fails, normal update passes) are carried over intact
- [x] 3.2 Run `openspec validate --strict` (or the closest validate invocation available) and verify both changes report no errors

## 4. Remove dead search dependencies

- [x] 4.1 Remove `minisearch` from `dependencies` in `package.json`; verify `pnpm lint` and `pnpm test` both pass with the dependency gone
- [x] 4.2 Delete `src/lib/search-tokenizer.ts` and confirm no file imports `cjkBigramTokenizer`; verify search behavior is unchanged by running the test suite and re-reading the inline `cjkTokenizer` in `src/pages/index.astro` to confirm it remains the only implementation