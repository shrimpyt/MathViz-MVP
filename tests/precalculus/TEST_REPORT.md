# Precalculus — Test Report

Run: `npx tsx tests/precalculus/run-all.ts` (or each suite file directly).
Suites: `test-matrix.ts`, `test-answers.ts`, `test-frq-consistency.ts`,
`test-fuzz.ts`, `test-pdf-bytes.tsx`. Shared harness: `helpers.ts`
(every `check()` = one headless check).

## Results

| Suite | Checks | Failures |
|---|---|---|
| matrix (7 topics × 3 modes × 3 difficulties × counts {1,3,12,25}) | 39,809 | 0 |
| answers (independent recomputation, 56 MCQ subtypes) | 1,351 | 0 |
| frq-consistency (stimulus consistency, 7 FRQ kinds) | 15,217 | 0 |
| fuzz (2,500 seeds × 7 topics + targeted maker hunts) | 324,017 | 0 |
| pdf-bytes (9 diagram samples + table, %PDF verification) | 4 | 0 |
| **TOTAL** | **380,398** | **0** |

Bar was 14,738 headless checks — exceeded by ~25×. All suites re-run to
zero failures after fixes.

## What each suite covers

- **matrix**: every topic × mode × difficulty × count. Per problem: shape
  invariants, 4 distinct PDF-safe choices with `choices[correctIndex] ===
  expected`, difficulty-tier filtering, `validateFRQ` on every FRQ (2/3/4
  subparts by difficulty, justifications present), seed reproducibility
  (byte-identical regeneration), and mode-invariance of generation.
- **answers**: each of the 56 MCQ subtypes recomputed from `givens` by a
  separate code path (own trig tables, own formatters, stem parsing for
  De Moivre/rose petals), plus answer-key exactness (`formatPrecalcAnswer`)
  and key stability across seeds/difficulties/topics.
- **frq-consistency**: table cells recomputed from the underlying function;
  graph params (amplitude, period, midline, phase, max/min, y-intercept, max r,
  curve coefficients) recomputed from inputs; every subpart answer
  independently re-derived (including a from-scratch numeric solver for the
  calculator-active trig part (d)); contradiction hunts (one-sided table
  agreement, equation attains graph max, parametric (b) reproduces (a),
  resultant consistent with wind vector); "answerable from the stimulus
  alone" (limit bracketed by table values, (c) coefficients in prompt,
  scenario numbers parsed from text, subpart numbers covered by stimulus).
- **fuzz**: 2,500 seeds × 7 topics × difficulties 1–3 (no-throw + invariant
  checks), plus 300 seeds per individual maker hunting degenerate cases
  (zero vectors/arrows, zero divisors, undefined trig, NaN/undefined in
  strings, invalid diagram params) and 300 seeds × 3 difficulties per FRQ
  maker.
- **pdf-bytes**: all 7 diagram kinds + hyperbola/parabola variants + an FRQ
  table + unicode math text rendered via `@react-pdf/renderer`; output is a
  Buffer starting with `%PDF-` and > 5,000 bytes.

## Bugs found and fixed during testing

1. **Distractor-pool collisions (9 makers).** `assembleMCQ` throws loudly
   when a pool can't supply 3 distinct distractors; the matrix/fuzz runs
   surfaced collisions in `LinearCombination`, `AddSub`, `ParabolaVertex`,
   `AmplitudePeriod`, `PythagoreanIdentity`, `ParametricEvaluate`,
   `SubtractComponents`, `VectorFromPoints`, `ScalarMultiple` (negation/swap
   distractors collapse when components are 0 or equal). Fixed with
   provably-distinct offset distractors and zero-vector guards in diagrammed
   makers.
2. **Real math bug: `PythagoreanIdentity`.** The "triples" were
   (opposite, adjacent) instead of (opposite, hypotenuse), so the emitted
   sin/cos pair violated sin²+cos²=1. Caught by the independent verifier's
   identity check; fixed to (3,5), (5,13), (8,17), (6,10).
3. **Unicode consistency.** Hyperbola feature/equation strings standardized
   to U+2212 minus (matching the rest of the codebase); `±` in "from
   features" stems.
4. **Test-harness issues (not factory bugs).** ASCII-vs-unicode in test
   formatters, lexicographic vs numeric sort of trig solutions, tolerance
   for 3-decimal rounded solutions (|f′|≤12 ⇒ 0.01), and the
   "answerable from stimulus" formalization for computed FRQ answers
   (coefficients from prompt + limit bracketed by table, rather than naive
   number coverage).

## Static checks

- `npx tsc --noEmit -p tsconfig.json`: **zero errors** in all new source
  files and all `tests/precalculus/*` files. (The single remaining repo
  error is in `tests/middle-school/recompute.ts`, another worker's file.)
- `npm run build` was **not** run (per task instructions).
- `npm install` was **not** run (node_modules pre-installed).

## Notes / known limits

- `Classical` mode was deliberately excluded from the test matrix per the
  contract update (coordinator verifies cross-mode at integration); the new
  cards already treat `Classical` like `Review`.
- `ProblemStep.reason` was skipped (sanctioned as optional); FRQ
  justifications cover AP justification requirements.
- Integration of the new types/cards/diagrams into `MathProblem`,
  `EuclidEngine`, `PdfDocument`, and `CurriculumRegistry` is documented in
  `WIRING.md` for the coordinator (this worker edited no existing files).
