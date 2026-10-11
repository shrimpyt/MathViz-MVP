# Algebra 2 — TEST REPORT

Date: 2026-10-10. All suites run with `npx tsx tests/algebra-2/run-*.ts`
(setup: Node 18+, repo `node_modules` already installed; no `npm install`
was run). **Final state: 0 failures everywhere.**

## Headline counts

| Suite | Checks | Failures |
|---|---|---|
| `run-matrix.ts` — every wired lesson × {GuidedNote, Review, Test} × difficulties 1–3 × counts {1,3,12,25} | 55,554 | 0 |
| `run-proofs.ts` — 18 proof templates: `validateProofShape`, statement grammar, LHS/RHS identity verification by numeric sampling, per-kind sampling, seed reproducibility | 2,172 | 0 |
| `run-fuzz.ts` — 37,440 problems over 120 seeds/lesson: domain invariants (division by zero, log of non-positive, singular matrices, degenerate conics, extraneous roots) | 37,778 | 0 |
| `run-pdf.ts` — web-SVG + @react-pdf diagram components, `formatAlgebra2Answer` vs `latexToText`, PDF byte determinism | 317 | 0 |
| `run-answerkey.ts` — 780 answer keys: answer-key exactness across difficulty/multi-topic/seeds | 3,132 | 0 |
| **Total** | **98,953** | **0** |

Bar was 14,738 checks — exceeded ~6.7×.

## What each suite verifies independently

- **run-matrix**: per-problem math recomputed with *separate* code from the
  factory (expression parser/evaluator + polynomial expander in
  `verify.ts`); solutions substituted back into the original equations;
  asymptote/hole coordinates recomputed from scratch; answer strings
  compared exactly; card/diagram renderers exercised for every subtype;
  seed reproducibility (same seed → identical output) asserted per lesson.
- **run-proofs**: every proof passes `validateProofShape`; each reason is
  checked against a vocabulary of justified reason patterns; each step's
  statement is verified as a *logically valid* algebraic consequence by
  independent numeric sampling on both sides; the final step must equal
  the `prove` statement and is never blanked; LHS is restated every step
  (canonical verification-grammar, documented in `verify.ts`).
- **run-fuzz**: hunts invalid problems — rational functions with
  zero-denominators leaking into solutions, log of non-positive arguments,
  singular matrices where an inverse is required, degenerate conics,
  unrejected extraneous roots. 120 seeds × all 26 wired lessons.
- **run-pdf**: diagrams render identically on web SVG and @react-pdf SVG;
  PDF bytes are deterministic modulo the embedded CreationDate timestamp
  and the random trailer `/ID` (both normalized before comparison).
  (@react-pdf v4's `toBuffer()` returns a readable stream — consumed via
  async iteration, not `Buffer.from`.)
- **run-answerkey**: `formatAlgebra2Answer` output matches
  `latexToText()`/`pdfSafeText()` rules exactly; multi-topic worksheets
  and re-seeded runs produce identical keys.

## Bugs found and fixed during testing

1. **LaTeX leak**: completing-square D3 emitted `\text{ or}`, which
   `latexToText` rendered as literal "text{ or}" — fixed by using plain
   ` or ` in the answer.
2. **Float artifacts**: completing-square D3 displayed decimals like
   `0.3333333333333333` — rewritten with exact-fraction arithmetic
   (`reduceFrac`).
3. **Proof parser**: `sin^2(θ)` form not recognized by the independent
   verifier — added a parser branch.
4. **Proof env bug**: a misbound environment variable `b` in proof
   templates — fixed.
5. **Rational-graph sampling**: verifier sampled too close to poles —
   pole-resistant sampling added.
6. **Constant-identity threshold**: exp-kind identities needed
   `minValid=1` sampling threshold — fixed.
7. **Reason vocabulary**: "Distributive property" missing from the test's
   justified-reason patterns — added.
8. **Flaky rarity check**: a difficulty-3 appearance check failed on seed
   luck (~3.4% miss chance with 60 draws) — raised to 200 draws; not a
   product bug.
9. **Fuzz invariant bug (not a factory bug)**: determinant-only matrix
   problems may legitimately have det=0 — the invariant now only flags
   singular matrices when an inverse is actually computed.
10. **PDF determinism**: bytes differ only in CreationDate and trailer ID
    — normalized before comparison.

## Notes / caveats

- `npx tsc --noEmit -p tsconfig.json` reports **zero** errors in this
  worker's files; pre-existing errors in other workers' in-flight files
  were left untouched (see `WIRING.md` §6).
- `"Classical"` mode is treated exactly like `"Review"` in all factories
  (full steps, 9 problems); it was deliberately excluded from the test
  matrix per the contract update (coordinator verifies cross-mode at
  integration).
- The registry's geometry topic numbers (1–15) overlap the Algebra 2
  topic numbers (2–12) required by the scope doc — flagged in
  `WIRING.md` §2 for the coordinator to namespace.
