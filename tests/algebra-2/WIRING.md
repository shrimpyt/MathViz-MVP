# Algebra 2 — WIRING

Shared-file changes needed in the Euclid Engine repo to activate the
Algebra 2 area. **No existing files were edited by this worker** — every item
below is a precise edit for the coordinator/parent to apply.

## New files created (this worker)

| File | Purpose |
|---|---|
| `src/lib/factories/Algebra2Helpers.ts` | Shared seeded-RNG helpers, polynomial math, LaTeX formatting, `selectMakers()` (cumulative-difficulty + `only` filter helper) |
| `src/lib/factories/Algebra2Types.ts` | `Algebra2Problem` / `Algebra2ProofProblem` types, `formatAlgebra2Answer` |
| `src/lib/factories/Algebra2Quadratics.ts` | 5-4 focus/directrix, 5-6 quadratic equations, 5-7 completing the square, 5-8 quadratic formula/discriminant, 5-9 complex numbers |
| `src/lib/factories/Algebra2PolynomialDivision.ts` | 8-5 long & synthetic division |
| `src/lib/factories/Algebra2Factoring.ts` | 8-2 linear factors/zeros, 8-4 solving by rational zeros, 8-6 root theorems |
| `src/lib/factories/Algebra2Rational.ts` | 11-1 simplify, 11-2 multiply/divide, 11-3 asymptotes & holes, 11-4 solving |
| `src/lib/factories/Algebra2ExpLog.ts` | 7-6 log properties, 7-7 exponential/logarithmic equations |
| `src/lib/factories/Algebra2Sequences.ts` | supplementary: sequences & series |
| `src/lib/factories/Algebra2Conics.ts` | supplementary: circle equations (completing the square), circle-line systems |
| `src/lib/factories/Algebra2Systems.ts` | 5-11 linear-quadratic systems |
| `src/lib/factories/Algebra2Matrices.ts` | 4-1/4-2/4-3/4-4 matrix operations, determinants, inverses, systems |
| `src/lib/factories/Algebra2Data.ts` | 12-1 data classification, 12-2 regression, 12-3 model predictions |
| `src/lib/factories/Algebra2Proofs.ts` | 18 parameterized proof templates (trig, log/exp, polynomial) |
| `src/modules/algebra-2.ts` | Per-lesson `generate*Problems(mode, seed, count)` functions + `WIRED_LESSONS` table |
| `src/components/diagrams/plotMath.ts` | Pure (framework-free) math for SVG plots: rational-function branches, parabola arcs, circle point lists |
| `src/components/diagrams/Algebra2Diagrams.tsx` | Web SVG diagram components (axis scaffolding, rational/quad/circle plots) |
| `src/components/diagrams/Algebra2PdfDiagrams.tsx` | @react-pdf SVG diagram components (1:1 mirror of the web set) |
| `src/components/problem-cards/Algebra2ProblemCard.tsx` | Web card for `Algebra2Problem` (selects diagram by `subtype`) |
| `src/components/problem-cards/Algebra2ProofCard.tsx` | Web card for two-column `ProofStep` tables |
| `tests/algebra-2/` | `harness.ts`, `verify.ts`, `checkers.ts`, `run-matrix.ts`, `run-proofs.ts`, `run-fuzz.ts`, `run-pdf.ts`, `run-answerkey.ts` + these docs |

## 1. `src/lib/ProblemFactory.ts` — union additions

Add to the `MathProblem` union:

```ts
| import("./factories/Algebra2Types").Algebra2Problem
| import("./factories/Algebra2Types").Algebra2ProofProblem
```

`Algebra2Problem` shape (all fields required):

```ts
interface Algebra2Problem {
  kind: string;            // lesson-scoped subtype, e.g. "CompleteSquare"
  subtype: string;         // same as kind (registry/card routing)
  topic: string;           // "A2.4" | "A2.5" | "A2.7" | "A2.8" | "A2.11" | "A2.12" | "A2.S" | "A2.C"
  difficulty: 1 | 2 | 3;
  seed: number;
  instruction: string;
  diagram: Algebra2DiagramKind;  // "none" | "rational-graph" | "parabola" | "circle"
  problem: string;         // LaTeX
  steps: ProblemStep[];    // each step has statement, optional reason, optional blankStatement/blankReason
  answer: string;          // LaTeX
  verify: Record<string, unknown>; // independent-checker data (numbers/arrays only)
  diagramData?: { fn?: ...; center?: [number,number]; radius?: number; holes?: ...; asym?: ... };
}
```

`Algebra2ProofProblem` wraps the shared `BaseProofProblem` from
`src/lib/proofTypes.ts` with `domain: "algebra2"`, plus
`family`, `difficulty`, `seed`, `mode`, `steps: ProofStep[]`,
`given`/`prove` strings. If the coordinator prefers a single
`ProofProblem` union member shared with geometry-proofs, this type is
compatible: it uses the same `BaseProofProblem` / `ProofStep` /
`validateProofShape` primitives.

**Mode handling:** every Algebra 2 factory treats `"Classical"` exactly
like `"Review"` (always emits full steps). Step counts follow the
`9/3` convention: Review/Classical → 9 problems, Test → 3,
GuidedNote → 3 (proofs: 1 per generation in GuidedNote/Test).

## 2. `src/modules/CurriculumRegistry.ts` — entries

Paste the blocks from `tests/algebra-2/REGISTRY_SNIPPET.md` (additive;
no existing ids replaced). Adds 66 entries: 60 lesson rows
(Topics 2–12, one per lesson row; 26 wired + 34 underConstruction),
3 proof entries, 3 supplementary entries.

**Topic-number collision:** entries use the doc's exact numbering
(Topics 2–12), overlapping the geometry topic numbers already in the
registry. Recommend the coordinator add a `subject: "algebra2"` field
or a separate registry array before merging.

## 3. Card routing

In the web problem renderer (the component that switches on problem
kind/card): route `Algebra2Problem` → `Algebra2ProblemCard`
(which internally selects `rational-graph` / `parabola` / `circle`
diagrams from `Algebra2Diagrams.tsx` by `subtype`), and
`Algebra2ProofProblem` → `Algebra2ProofCard` (two-column table:
Statement | Reason, honoring `blankStatement`/`blankReason`).

## 4. PDF rendering

- `problemToQuestion` (or its equivalent): add cases that render
  `problem` LaTeX and the step list for Algebra 2 problems; for proofs,
  render the given/prove lines plus the numbered step table.
- PDF diagram cases: map `diagramData` to the matching component in
  `Algebra2PdfDiagrams.tsx` (`RationalGraphPdf`, `ParabolaPdf`,
  `CirclePdf`) — the same props as the web components.
- Answer-key formatting: `formatAlgebra2Answer` in
  `src/lib/factories/Algebra2Types.ts` converts the LaTeX answer to
  PDF-safe text; wire it into the answer-key `formatAnswer` switch
  alongside the existing subject formatters. It delegates to
  `latexToText()`/`pdfSafeText()` from `src/lib/answerKey.ts`.

## 5. Proof mode wiring (Algebra 2 proofs)

- Proofs are generated by `generateProofProblems(mode, seed, count,
  difficulty?)` in `src/lib/factories/Algebra2Proofs.ts`; lesson-level
  wrappers `a2_p_trigIdentities`, `a2_p_logExpProofs`,
  `a2_p_polyIdentities` live in `src/modules/algebra-2.ts` and use
  `selectMakers`-style kind filtering over the 18 templates.
- Every generated proof passes `validateProofShape` from
  `src/lib/proofTypes.ts`; canonical statement grammar (every step
  restates LHS, final step equals `prove`, final step never blanked)
  is documented in `tests/algebra-2/verify.ts`.
- In worksheet modes: GuidedNote blanks `blankReason` steps (students
  supply reasons); Test blanks both statements and reasons where
  flagged; Review/Classical emit all steps with reasons shown.
  (Documented independently of the geometry-proofs worker's mode
  proposal; both use the same `BaseProofProblem` primitives, so a
  shared proof-mode renderer should accept either domain.)

## 6. Pre-existing type errors (do NOT touch)

`npx tsc --noEmit -p tsconfig.json` reports errors in other workers'
in-flight files (e.g. geometry/statistics factories referencing types
not yet in the union). My files type-check cleanly in isolation.
The union additions in §1 will resolve the Algebra 2-related errors;
remaining errors belong to other workers.
