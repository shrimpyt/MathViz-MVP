# Calculus — test report

Run: `npx tsx tests/calculus/run-all.ts` (suites also run standalone).
Final full run: **440,072 checks, 0 failures** (bar: 14,738).

| Suite | File | Checks | Failures | What it proves |
|---|---|---|---|---|
| matrix | `test-matrix.ts` | 87,813 | 0 | 6 entries × 3 modes × difficulties 1–3 × counts {1,3,12,25}: structural validity, PDF-safe strings, 5 distinct choices, `answer === choices[correctIndex]`, seed reproducibility (generate-twice JSON equality) |
| verify | `test-verify.ts` | 8,788 | 0 | Independent recomputation per maker (separate code path: central differences, numeric limits, composite Simpson reimplemented in `harness.ts`); graph features vs computed values (hole = limit, asymptote at pole, tangent slope, shade bounds); table cells re-evaluated |
| frq | `test-frq.ts` | 10,388 | 0 | `validateFRQ` on 450 FRQs; table cells match fn via independent eval; graph areas/sign-changes/concavity recomputed from stimulus points alone; every subpart recomputed from stimulus alone; justifications present |
| fuzz | `test-fuzz.ts` | 331,531 | 0 | 700 seeds × 6 entries × 3 difficulties: no throws, no NaN answers, no duplicate choices, pole-free sources outside intentional limit/quotient subtypes, sane graph/table structures |
| pdf | `test-pdf.ts` | 763 | 0 | Real PDF bytes via `@react-pdf/renderer` (`CalcGraphPdf` on 24 sampled graph params + `CalcTablePdf`): `%PDF` header, non-trivial size; `pdfSafeText` output never contains ≅ |
| answers | `test-answers.ts` | 789 | 0 | `formatCalculusAnswer` deterministic across seeds/difficulties/multi-topic mixes; difficulty tiers cumulative and exact; BC-only problems only at difficulty 3 with `bcOnly` flag |
| **Total** | | **440,072** | **0** | |

## Bugs found and fixed by the suites

1. `graphicalRemovable` used the wrong limit point for the flipped form
   (pole at x = −c, prompt asked x = c) — caught by numeric-limit probe.
   Fixed to a single correct form.
2. Distractor pool collapses (`makeChoices` threw): chainExp `e^(x)`,
   tangent/normal degenerate lines, three integral makers with only 3
   distractors, doubled-coefficient collision. Fixed with richer pools.
3. `polyToText` hardcoded variable `x` — particle-motion FRQ printed
   `v(t) = −x² + …`. Added `variable` parameter; FRQ uses `"t"`.
4. Test-side issues fixed: display-rounding tolerance (4-decimal `fmtNum`),
   `parseFloat` on unicode-minus strings, inverted inc/dec test logic,
   `indepLineText` spec alignment, O(h) probe tolerance.

## Notes

- `npx tsc --noEmit -p tsconfig.json`: no errors in any calculus file.
  (Repo-wide errors exist in other workers' in-flight files — untouched.)
- Classical mode is intentionally absent from the matrix (coordinator
  verifies cross-mode at integration); factories always emit full steps and
  the module/cards treat Classical like Review.
- During this work `AGENTS.md` was observed briefly truncated (another
  worker mid-edit) then restored; the restored content matches the
  architecture this work follows.
