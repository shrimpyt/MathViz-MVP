# Precalculus — Wiring Guide

Shared-file changes the integrator needs to make. This worker created **only**
new files and edited **no** existing files; everything below is for the
coordinator/integrator to apply.

## New files created (do not edit — already complete)

| File | What it is |
|---|---|
| `src/lib/factories/PrecalcTypes.ts` | Shared types (`PrecalcMCQ`, `PrecalcFRQ`, `PrecalcDiagramParams`, topic tags), seeded helpers, exact-trig table, `assembleMCQ`, `formatPrecalcAnswer` |
| `src/lib/factories/PrecalcVectorsFactory.ts` | 12 vector MCQ makers, `VECTOR_MAKERS`, `VECTOR_DIFFICULTY_TIERS`, `generateVectorProblems` |
| `src/lib/factories/PrecalcComplexFactory.ts` | 11 complex MCQ makers, `COMPLEX_MAKERS`, `COMPLEX_DIFFICULTY_TIERS`, `generateComplexProblems` |
| `src/lib/factories/PrecalcConicsFactory.ts` | 10 conic MCQ makers, `CONIC_MAKERS`, `CONIC_DIFFICULTY_TIERS`, `generateConicProblems` |
| `src/lib/factories/PrecalcTrigFactory.ts` | 9 trig MCQ makers, `TRIG_MAKERS`, `TRIG_DIFFICULTY_TIERS`, `generateTrigProblems` |
| `src/lib/factories/PrecalcLimitsFactory.ts` | 6 limit MCQ makers, `LIMIT_MAKERS`, `LIMIT_DIFFICULTY_TIERS`, `generateLimitProblems` |
| `src/lib/factories/PrecalcParamPolarFactory.ts` | 8 parametric/polar MCQ makers, `PARAMPOLAR_MAKERS`, `PARAMPOLAR_DIFFICULTY_TIERS`, `generateParamPolarProblems` |
| `src/lib/factories/PrecalcFRQFactory.ts` | 7 stimulus-based FRQ makers, `FRQ_MAKERS`, `FRQ_MAKER_KEYS`, `generatePrecalcFRQs` |
| `src/lib/factories/PrecalcFactory.ts` | Unified router `generatePrecalcProblems(rng, topic, n, difficulty)` |
| `src/components/diagrams/PrecalcDiagrams.tsx` | `PrecalcWebSVG` (plain SVG) + `PrecalcPdfSVG` (@react-pdf/renderer); kinds: `unit-circle`, `vectors`, `trig-graph`, `conic`, `polar-grid`, `limit-graph`, `complex-plane` |
| `src/components/problem-cards/PrecalcMCQCard.tsx` | MCQ card: AP badge, calculator badge, A–D choices, diagram, steps |
| `src/components/problem-cards/PrecalcFRQCard.tsx` | FRQ card: stimulus (table/graph/scenario) + subparts (a)–(d) with workspace, answers, justifications |
| `src/modules/precalculus.ts` | `PRECALCULUS_ENTRIES` (7 entries) — see REGISTRY_SNIPPET.md |

## 1. `src/lib/types.ts` — extend the `MathProblem` union

```ts
import type { PrecalcMCQ, PrecalcFRQ } from "@/lib/factories/PrecalcTypes";

export type MathProblem =
  | CircleProblem
  | ProbabilityProblem
  | CongruenceProblem
  | TrigProblem
  | SpecialTriangleProblem
  | CoordinateProblem
  | MeasurementProblem
  | PrecalcMCQ
  | PrecalcFRQ;
```

Note: `PrecalcFRQ extends BaseFRQProblem` (with `subject: "precalc"`). If the
calculus worker already added `BaseFRQProblem` to the union, `PrecalcFRQ` is
still worth adding so the precalc FRQ card can narrow on the concrete type.
After this lands, the `as unknown as MathProblem[]` cast in
`src/modules/precalculus.ts` can be removed.

## 2. `src/lib/ProblemFactory.ts` — re-export the new types

```ts
export type { PrecalcMCQ, PrecalcFRQ, PrecalcProblem } from "./factories/PrecalcTypes";
```

## 3. `src/lib/answerKey.ts` — `formatAnswer()` cases

```ts
import { formatPrecalcAnswer } from "@/lib/factories/PrecalcTypes";

// inside formatAnswer(p):
case "PRECALC_MCQ":
  return formatPrecalcAnswer(p); // "B. (3, 5)"
case "AP_FRQ":
  // p.subject === "precalc" -> formatPrecalcAnswer(p)  ("(a) ...  (b) ...")
  // p.subject === "calc"    -> the calculus worker's formatter
  return p.subject === "precalc" ? formatPrecalcAnswer(p) : /* calc */;
```

## 4. `src/modules/CurriculumRegistry.ts` — register the entries

```ts
import { PRECALCULUS_ENTRIES } from "./precalculus";
// in CURRICULUM_REGISTRY:
...PRECALCULUS_ENTRIES,
```

## 5. `src/components/problem-cards/index.ts` — export the cards

```ts
export { PrecalcMCQCard } from "./PrecalcMCQCard";
export { PrecalcFRQCard } from "./PrecalcFRQCard";
```

## 6. `src/components/EuclidEngine.tsx` — card routing

```tsx
const precalcMCQs = problems.filter((p): p is PrecalcMCQ => p.type === "PRECALC_MCQ");
const precalcFRQs = problems.filter(
  (p): p is PrecalcFRQ => p.type === "AP_FRQ" && (p as BaseFRQProblem).subject === "precalc"
);
```

Render a section per topic label (or one "AP Precalculus" section) with
`<PrecalcMCQCard problem index mode revealed />` and `<PrecalcFRQCard … />`,
following the existing section/offset pattern. **Coordinate with the calculus
worker:** they also use `type: "AP_FRQ"` (subject `"calc"`); routing must
check `subject`, not just `type`. My FRQ card only handles precalc stimuli
(graphKinds `precalc-*`); calc FRQs need their own card.

## 7. `src/core/types.ts` — `problemToQuestion()` cases

```ts
if (p.type === "PRECALC_MCQ") {
  return {
    id: idx + 1,
    text: p.stem,
    points: 10,
    diagramType: p.svgParams?.kind ?? "",
    diagramData: p.svgParams as unknown as Record<string, unknown>,
    scaffolding: p.steps.map((s) => ({ text: latexToText(s.instruction) })),
  };
}
if (p.type === "AP_FRQ" && p.subject === "precalc") {
  return {
    id: idx + 1,
    text: p.subparts.map((s) => `(${s.label}) ${s.prompt}`).join(" "),
    points: p.subparts.reduce((t, s) => t + (s.points ?? 0), 0),
    diagramType: p.stimulus.kind === "graph" ? p.stimulus.graphKind : p.stimulus.kind,
    diagramData: { stimulus: p.stimulus, subparts: p.subparts },
    scaffolding: p.subparts.map((s) => ({ text: latexToText(s.prompt) })),
  };
}
```

## 8. `src/components/PdfDocument.tsx` + `PdfGeometrySVG.tsx` — PDF diagram cases

In the PDF diagram switch, route the new `svgParams` kinds to
`PrecalcPdfSVG`:

```tsx
import { PrecalcPdfSVG } from "./diagrams/PrecalcDiagrams";
// when params?.kind is one of:
"unit-circle" | "vectors" | "trig-graph" | "conic" | "polar-grid" | "limit-graph" | "complex-plane"
return <PrecalcPdfSVG params={params} />;
```

FRQ stimulus PDF rendering (new — no existing pattern):
- **table**: render `headers`/`rows` as a bordered row/column layout with
  `@react-pdf/renderer` `<View style={{flexDirection:"row"}}>` + `<Text>`
  cells (see `tests/precalculus/test-pdf-bytes.tsx` for a working example).
- **graph**: `graphKind` values are `precalc-trig-graph`, `precalc-polar`,
  `precalc-complex-plane`; each `params` object already carries the matching
  `PrecalcDiagramParams` `kind` discriminator (`trig-graph`, `polar-grid`,
  `complex-plane` — extra verification fields are ignored by the renderer),
  so cast `stimulus.params as unknown as PrecalcDiagramParams` and render
  `<PrecalcPdfSVG params={…} />`.
- **scenario**: plain `<Text>`.
- Subparts: prompt + ruled answer lines on the student page; answer +
  justification in the answer key via `formatPrecalcAnswer`.

## AP-specific presentation proposal

- **Calculator badges** (both cards, both renderers): `CALCULATOR ACTIVE`
  (amber) vs `NO CALCULATOR` (slate), next to the `AP PRECALCULUS` badge.
  The flag lives on the problem (`calculator: boolean`) so section headers
  can also group "No-calculator" vs "Calculator-active" if desired.
- **FRQ layout**: stimulus block first (shaded scenario callout, bordered
  table, or diagram + caption), then lettered subparts each with point value,
  2–3 ruled workspace lines in Test mode, and — in Review/Classical/answer
  key — the exact answer plus the AP-style **Justification** paragraph.
- **MCQ layout**: A–D lettered choices; Review/Classical highlight the
  correct choice in green; Test shows empty letter badges with an answer
  blank; GuidedNote shows the step scaffolding with blanks.
- **Classical mode**: both new cards already treat `"Classical"` like
  `"Review"` (answers/steps shown), per the Classical contract update.

## Deliberately not implemented (optional follow-ups)

- `ProblemStep.reason`: the type is widened and safe to use, but this worker
  skipped it (sanctioned as optional). FRQ justifications already cover the
  AP justification requirement via `apTypes.FRQSubpart.justification`.
- `Classical` was **not** added to this worker's test matrix per the contract
  update (the coordinator verifies cross-mode at integration); the cards
  handle it.
