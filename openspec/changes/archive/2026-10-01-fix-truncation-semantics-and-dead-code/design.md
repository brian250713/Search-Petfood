# Design

## Context

See proposal.md - Why for motivation.

Current behavior in `validateSource`, in evaluation order:

```
  records.length === 0        -> throw "No records fetched"
  food && length === 9999     -> console.warn(...)          <- spec calls this "still succeeds"
  baseline defined and > 0    -> minAllowed = baseline*0.9
                                 length < minAllowed -> throw
```

With the real baseline of 102278 the threshold is 92050, so a 9999-record response always throws at the third check. The warn message text says the count was recorded and processing continues, which is false in every real configuration where a baseline exists.

Note the ordering consequence: the ceiling check must run *before* the baseline check and must fail on its own, otherwise on a first run with no `baseline.json` a truncated 9999 response would sail through (nothing to compare against) and get written as a complete raw file.

Existing test coverage is `tests/fetch.test.ts`, "warns but passes on exactly 9999 food records", which calls `validateSource(new Array(9999), 9999, ...)`. Passing `9999` as the baseline puts `records.length` exactly at `minAllowed`, so the baseline check passes by equality and the test asserts a warning without the throw. The test is green only because of that coincidence, and it encodes the false claim as intended behavior.

Dead code context: `minisearch` remains in `dependencies` with no import anywhere in the repo (searched `src/` and `scripts/`); the search is plain `String.includes` over a composed field string in `index.astro`. `src/lib/search-tokenizer.ts` exports `cjkBigramTokenizer` with no importer, while `index.astro` carries an inline `cjkTokenizer` implementing the same unigram + bigram scheme.

## Goals / Non-Goals

**Goals:**

- Make the ceiling rule fail honestly, and make it fail even with no baseline to compare against.
- Remove documentation and dependency claims that describe an architecture no longer in the codebase.

**Non-Goals:**

- Detecting mid-pagination truncation (e.g. logging per-page counts, or warning when several consecutive pages come back full). Explicitly deferred; see Risks.
- Consolidating the duplicated tokenizer into one shared module. Deleting the unreferenced file is in scope; merging it into the inline implementation is not.
- Any change to the 10% drop threshold.

## Decisions

**Decision 1: Turn the 9999 warn into a hard failure, rather than deleting the rule.**

- Alternative A: delete the 9999 branch entirely and rely on the 10% baseline drop. Rejected — it leaves the first-run case (no `baseline.json`) with no protection at all, and loses the diagnostic that names the likely cause. A maintainer seeing a 10% drop failure should be told "you hit the platform ceiling", not just "count dropped".
- Alternative B: keep warn-and-continue. Rejected — this is the current behavior and it is what the issue is about.
- Chosen: throw. The message states the 9999 ceiling was reached and that no raw file was written.

**Decision 2: Evaluate the ceiling before the baseline check, and evaluate it even when no baseline exists.**

This is the substantive part of the change. The current code reaches the baseline check only if a baseline is present, so a truncated first run is accepted today. Moving the ceiling test ahead of the baseline block and making it independent of `baselineCount` closes that hole. The spec scenario "Ceiling reached without a baseline" exists specifically to pin this down, because it is easy to re-introduce by accident when refactoring the guard order.

**Decision 3: Keep 9999 as a literal, do not make it configurable.**

The value is the documented MOA TransService ceiling, discovered empirically (visible in the archived design.md, which recorded a 9999-record response when the endpoint was first ported). Making it a config option would imply it is tunable, which it is not. A named constant with a comment pointing at the ceiling is enough.

**Decision 4: Delete `search-tokenizer.ts` rather than wire it up.**

- Alternative A: delete `minisearch` only, leave the file. Rejected — leaves a zero-import, zero-test file whose doc comment still claims it is "for MiniSearch", which is the exact documentation rot this change exists to remove.
- Alternative B: make `index.astro` import `cjkBigramTokenizer` and delete the inline copy. This is arguably the better end state, but it changes live search behavior in a change whose stated purpose is truncation semantics and dead-code removal — a bad place to touch the query path. Deferred.
- Chosen: delete the file. The inline `cjkTokenizer` in `index.astro` remains the single implementation, and is verified unchanged by the search tests.

**Decision 5: Flip the test to assert failure, using a realistic baseline.**

The 9999 test should call `validateSource` with the real production baseline (102278) rather than 9999, so the test exercises the ordering that actually runs in CI and would catch a regression that reintroduced baseline-dependence. Add the no-baseline case as a separate assertion.

## Risks / Trade-offs

- **[Mid-pagination truncation remains undetectable] →** Accepted and documented, not papered over. A ceiling response arriving at, say, page 3 would be a short page and would end paging as a "successful" fetch of ~30k records — caught only by the 10% baseline rule, and only because 30k is far below 92050. If MOA ever truncates at a value other than 9999 the ceiling check misses it entirely. Mitigation: none in this change; this is the reason the 10% drop rule stays in place rather than being removed as redundant.
- **[A legitimate dataset of exactly 9999 records would be permanently un-fetchable] →** Accepted. At the current 102278-record scale this is hypothetical; the cost of a false positive (a failed fetch someone investigates) is much lower than the cost of a false negative (a truncated snapshot deployed silently).
- **[Removing a dependency could break something outside the repo] →** Verified by searching `src/` and `scripts/` for imports; `minisearch` appears only in `package.json` and in documentation prose. Mitigation: run `pnpm lint` and `pnpm test` after removal.
- **[Behavior change in CI is nominally "no change"] →** Under a real baseline, 9999 already failed. The only newly-failing configuration is first-run-without-baseline, which is the intended fix. Worth stating plainly in the merge notes so nobody reads this as a regression.