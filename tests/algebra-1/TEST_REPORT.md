# TEST_REPORT.md — Algebra 1 test results

Date: 2026-10-10. All scripts run with `npx tsx` from `~/workspace/euclid-worksheet`.
Target bar: match/exceed 14,738 headless checks.

## Totals

| Suite | Checks | Problems | Failures |
|---|---|---|---|
| `run-matrix.ts` (full matrix) | 265,275 | 20,295 | 0 |
| `fuzz.ts` (4,000 seeds) | 157,419 | 13,200 | 0 |
| `pdf-check.ts` (PDF bytes) | 26 | — | 0 |
| `answerkey-check.ts` (key exactness) | 16,920 | — | 0 |
| **Total** | **439,640** | **33,495** | **0** |

439,640 checks ≈ **29.8× the 14,738 bar**, zero failures.

## What each suite does

**run-matrix.ts** — full matrix: 55 lessons × 3 doc modes
(GuidedNote, Review, Test — Classical excluded per contract; the coordinator
verifies it at integration) × difficulties 1–3 × counts {1,3,12,25}.
Every problem is verified by `verify.ts` (independent recomputation — see
below), checked for seed reproducibility (regenerate → byte-identical JSON),
and checked for answer-key exactness
(`formatAlgebra1Answer(p) === latexToText(p.answer)`).
All 63 subtypes and all 37 TEKS types were exercised.

**verify.ts** — the independent verification engine (separate code path from
the generators). Per problem it checks: structural validity (type/subtype,
non-empty prompt/answer/steps, subtype→meta-kind contract), then re-derives
the answer from `meta` with fresh math:
- equations/inequalities: solve from coefficients, substitute back into the
  original equation, verify sign-flip logic with a test point;
- systems: Cramer's rule, substitution of the solution into both equations,
  determinant ≠ 0 unless the subtype is the intentional `SystemSpecialCase`;
- polynomials: independent convolution — factored forms must multiply out to
  the exact coefficient array;
- quadratics: discriminant recomputed, roots via the quadratic formula,
  substitution check, perfect-square vs. radical answer forms;
- exponentials/sequences/statistics: closed-form recomputation (least squares
  re-implemented independently for lines of best fit; two-way table totals
  re-summed);
- diagrams: coefficient finiteness, plot-accuracy spot checks (graph line
  passes through its defining points; solution marker matches the system
  solution; inequality dash/shade matches the relation).

**fuzz.ts** — 4,000 seeds × 9 factories (+ mixed review every 10th seed),
hunting invalid problems: 192 intentional degenerate systems (all from
`SystemSpecialCase`, all keyed correctly), **0 accidental degenerate
systems**, **0 negative discriminants** in factoring/formula problems,
**0 zero leading coefficients**.

**pdf-check.ts** — renders 8 sample PDFs (one per diagram kind: line,
parabola, exponential, system solution, shaded inequality, scatter plot,
number line, two-way table) plus a 10-diagram doc built from live factory
output; asserts `%PDF` header, `%%EOF` marker, and sane byte sizes.

**answerkey-check.ts** — answer-key exactness across 55 lessons × 3
difficulties × 12 seeds, plus 40 multi-topic mixed documents (key stability
across identical seeds, exactness per problem, subtype diversity).

## Bugs found and fixed during testing

1. Sequence verifier didn't account for `latexToText` subscript rendering
   (`a_{10}` → `a₁₀`).
2. Sequence word-problem answers carry units ("64 seats") — verifier now
   checks the numeric prefix.
3. GCF factored answers print the monomial without parentheses (`5x(4x−5)`)
   — verifier aligned.
4. `VertexForm` completing-the-square branch emitted `quadratic` meta;
   switched to `vertex` meta (a=1, known h/k).
5. Exponential word-problem answer had malformed LaTeX (`(1.05)}^{t}`);
   fixed to `(1.05)^{t}`.

## Not covered here (by design)

- `Classical` output mode: excluded from the matrix per the contract update;
  factories are mode-independent and `generateAlgebra1Lesson` maps Classical
  to Review counts. Coordinator verifies at integration.
- Web-card rendering (`Algebra1ProblemCard`) and full-app PDF export: require
  the wiring in `WIRING.md` (shared files this worker may not edit).
- `npx tsc --noEmit` reports errors only in other workers' in-progress files;
  this worker's files are clean (verified via grep on the tsc output).
