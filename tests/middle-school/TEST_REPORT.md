# Middle School — Test Report

**Date:** 2026-10-10 · **Runner:** `npx tsx tests/middle-school/run-all.ts`
**Result: 1,217,356 checks, 0 failures.**

Each `check()` call counts as one headless check. All suites are runnable
individually (`npx tsx tests/middle-school/<suite>`).

## Suite totals (final run)

| Suite | Checks | Failures | What it does |
|-------|--------|----------|--------------|
| `01-matrix.ts` | 461,360 | 0 | Every entry (56) × mode (`GuidedNote`, `Review`, `Test`, `Classical`) × difficulty 1–3 × counts {1,3,12,25}: problem counts, shape invariants, subtype filtering, tier compliance (`tier ≤ difficulty`), `pdfSafeText` cleanliness, Classical ≡ Review count check |
| `02-recompute.ts` | 10,080 | 0 | Independent answer recomputation (`recompute.ts`, a separate code path with its own gcd/fraction/rounding) for every entry × difficulty × mode × seed; asserts equality with the generated answer |
| `03-fuzz.ts` | 735,682 | 0 | Validity hunting over thousands of seeds: NaN/undefined answers, degenerate diagrams (number-line range, grid bounds, spinner sectors, positive geometry dims, scatter-plot bounds), dirty text (`undefined`/`NaN` leaks), JSON-serializability, division-by-zero phrasing, tier compliance — both the lesson-filtered registry path and the unfiltered whole-grade factory path |
| `04-repro.ts` | 2,016 | 0 | Seed reproducibility: same seed → byte-identical JSON output across every entry × mode × difficulty × count; different seeds → different output |
| `05-pdf.tsx` | 29 | 0 | Renders real problems (prompts, steps, answers, every diagram kind) through `@react-pdf/renderer` + `PdfMiddleSchoolDiagram`: valid `%PDF` header, `%%EOF` trailer, non-trivial size, render stability (timestamp/doc-ID normalized, best-of-3) |
| `06-answerkey.ts` | 8,189 | 0 | Answer-key behavior: `formatAnswer` never throws; `pdfSafeText(answer)` non-empty and value-preserving (modulo documented `$`-stripping and `^n`→superscript upgrades); difficulty filtering keeps `tier ≤ difficulty`; multi-topic mixing (3 entries, 3 grades, 5 seeds) keeps answers aligned with problems |
| **TOTAL** | **1,217,356** | **0** | |

## Bugs found and fixed during testing

1. **Ratio simplifier emitted non-simplest form** (`MiddleSchoolGrade6.ts`): `makeSimplifyRatio` assumed its base pair `a:b` was coprime — e.g. 18:12 → "9:6" instead of "3:2". Fixed by re-rolling until `gcd(a,b) === 1`. (Caught by 02-recompute.)
2. **Distributive both-sides could emit an identity** (`MiddleSchoolGrade8.ts`): when the random coefficient equaled `a`, the equation reduced to `0 = 0` while claiming a unique solution. Fixed by constraining the coefficient to `< a`. (Caught by 02-recompute.)
3. **Unit string passed in the diagram slot** (4 new tier-1 makers): `"cm²"`/`"m²"`/`"cm³"`/`"m³"` were passed as the 7th `build()` arg (`svgParams`) instead of the 8th (`unit`), producing diagrams with `kind: undefined`. Fixed in `makeSemicircleHalf`, `makeCompositeSimple`, `makeNetCount`, `makePrismVolumeBH`, `makePyramidVolumeBH`. (Caught by 03-fuzz.)
4. **Lesson-first fallback** (all three factories): the difficulty filter fell back to the whole grade's pool instead of the lesson's own makers. Changed to lesson-first (matching the registry's `filterAllowed` semantics), and added tier-1 makers to every lesson so difficulty 1 always has direct single-step problems.
5. **Recompute dispatch gaps** (`tests/middle-school/recompute.ts`): word-problem `given` bundles lacking `op`/`a`/`b` keys threw on eager key reads; fixed by checking `wordKind`/`kind` first and reading keys lazily. (Test-harness fixes, not generator bugs.)

## Known/documented behaviors (not failures)

- `pdfSafeText` strips `$` (shared `latexToText` treats it as a math delimiter):
  money answers like `"$21.60"` render as `"21.60"` in PDF. Value preserved.
- `pdfSafeText` upgrades `"10^2"` → `"10²"`: intended prettier PDF output. Value preserved.
- `formatAnswer()` returns `""` for `MS.6`/`MS.7`/`MS.8` — no case exists yet;
  coordinator wiring item (see WIRING.md §6). Asserted non-throwing only.
- One rare `@react-pdf` render-instability flake observed (1 in ~17 runs);
  no nondeterminism in middle-school code (verified `Math.random`/`Date`-free);
  the stability check is best-of-3 after timestamp/doc-ID normalization.
- `npx tsc --noEmit -p tsconfig.json`: zero errors in middle-school files.
  (Pre-existing errors in other workers' files — `EuclidEngine.tsx`,
  `DocumentHeader.tsx`, `tests/precalculus`, `tests/proofs` — untouched.)

## Reproducibility

```
cd ~/workspace/euclid-worksheet
npx tsx tests/middle-school/run-all.ts
```

No `npm install`, no `npm run build` needed. Suites use the `@/` tsconfig path
alias (resolved by `tsx`).
