# Design

## Context

See proposal.md - Why for motivation.

The relevant current state: `fetchAllFood` pages through the food endpoint with `$top`/`$skip`, accumulating into a single array, and calls `checkFields` only when `skip === 0`. `checkFields` already loops over every record in the array it is given and throws a `FetchError` naming the record index and the missing fields, so the validation logic itself needs no change — only the call site.

Data volume context that shapes verification: the raw snapshot is ~82MB and the normalized products file ~90MB, so a real end-to-end `pnpm run fetch` is slow. Unit tests use a stubbed `fetchFn` returning small synthetic pages.

`build-search-index.ts` emits `{version, count, docs}` where each doc is a 9-field projection. `index.astro` reads `json.docs`. The search match string is composed at `index.astro:220` from name, vendorName, id, usagePets, and item — note it does **not** include `origin` or `source` even though those are separate filters, so "queryable" and "filterable" fields are not the same set.

## Goals / Non-Goals

**Goals:**

- Make the change reviewable as one atomic unit: a behavior fix (validation), a documentation truth fix (spec + README + placeholder), all describing the same system.
- Keep the spec deltas minimal and honest — only record behavior that actually changes or is currently unspecified.

**Non-Goals:**

- Refactoring the tokenizer duplication (inline `cjkTokenizer` in `index.astro` vs `src/lib/search-tokenizer.ts`). Both are correct-looking, but consolidating them is orthogonal to these issues.
- Changing the 9999 truncation semantics or removing dead dependencies — handled in the separate change `fix-truncation-semantics-and-dead-code`.
- Changing which fields are searchable. This change only makes the documentation and placeholder match the existing behavior.

## Decisions

**Decision 1: Validate every page, not every record individually in the loop body.**

The call site becomes an unconditional `checkFields(chunk, EXPECTED_FOOD_FIELDS, 'food')` per iteration.

- Alternative A: keep first-page validation and add a separate post-loop scan over `all`. Rejected — it validates the same records but delays failure until after the entire fetch completes, so a schema change on page 2 would be discovered only after downloading 80MB+.
- Alternative B: validate only the first record of each page as a schema canary. Rejected — MOA schema changes are per-response, so a per-page canary is nearly equivalent to full validation at a fraction of the benefit; `checkFields` is already O(records) with a cheap `in` check per field, and 102k records × 12 fields is negligible next to network cost.
- Chosen: full per-page validation. Failure is localized to the page that broke, and the error message already reports the record index within the page.

**Decision 2: The per-page check is a new ADDED requirement, not a MODIFIED one.**

`data-ingestion`'s existing "Dual-source fetch" requirement specifies paging and retries but says nothing about field validation. The current code does not violate it. Adding an unrelated-but-adjacent concern is what ADDED is for; using MODIFIED would have required rewriting a requirement whose behavior is not actually changing, which risks losing detail at archive time.

**Decision 3: `food-search` is not in the Capabilities list.**

The `food-search` spec already describes the compact index and correctly states that `fmat`/`fnut` are not query-matched. The placeholder and README are wrong, not the spec. Listing `food-search` as modified would have been inventing a requirement change that does not exist. The fix is to bring the UI text into line with the spec that is already right.

**Decision 4: `data-normalization`'s "Index and shard output" is MODIFIED, with the full block copied.**

The requirement's behavior does change (the output format description was factually wrong), and the shard-lookup scenario must be preserved verbatim. Added scenarios cover the index shape and the size constraint that motivates the compact format, since the current single scenario only exercises shards and says nothing about the index.

## Risks / Trade-offs

- **[Real data may legitimately contain records missing expected fields on later pages] →** The 82MB snapshot was fetched with first-page-only validation, so it is possible (though unverified) that existing raw data contains such records. If so, this change turns a silent pollution into a hard fetch failure. This is the intended trade — better to fail than to write a malformed snapshot — but it must be surfaced by actually running `pnpm run fetch` once against the live endpoint, not assumed. If it turns out many records are affected, the correct response is to decide whether those records should be skipped-and-counted (like `normalize` already does for blank `ID`) rather than to silently drop the validation, and that decision would need a new requirement.
- **[Reviewers may read the spec delta as scope creep] →** The delta is scoped to exactly the two capabilities the code actually touches, and each scenario maps to an observable outcome.
- **[README and placeholder edits are unverifiable by tests] →** These are user-facing text; verify by reading the built page, not by asserting on strings in unit tests.