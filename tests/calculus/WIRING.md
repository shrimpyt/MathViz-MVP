# Calculus — integration wiring

The calculus area is complete and self-contained in new files. The steps below
are the shared-file changes an integrator applies to wire it into the app.
**None of these edits were made by the calculus worker** (per the no-shared-
file-edits rule); `src/modules/calculus.ts` casts through `asMathProblems`
until step 1 lands, then the cast can be dropped.

New files (all wiring targets reference these):

- `src/lib/factories/CalculusUtils.ts` — `CalcFunction` ADT, eval/deriv,
  formatting, `CalcGraphParams`, `CalcMCQProblem`, `formatCalculusAnswer`
- `src/lib/factories/CalculusLimits.ts` — `generateLimitProblems`, `LIMIT_MAKERS`
- `src/lib/factories/CalculusDerivatives.ts` — `generateDerivativeProblems`, `DERIVATIVE_MAKERS`
- `src/lib/factories/CalculusDerivApps.ts` — `generateDerivAppsProblems`, `DERIV_APPS_MAKERS`, `lineText`
- `src/lib/factories/CalculusIntegrals.ts` — `generateIntegralProblems`, `INTEGRAL_MAKERS`
- `src/lib/factories/CalculusFRQ.ts` — `generateCalculusFRQs`, `buildCalculusFRQ`
- `src/modules/calculus.ts` — `CALCULUS_ENTRIES`
- `src/components/diagrams/CalculusGraphs.tsx` — `CalcGraphWeb`, `CalcGraphPdf`, `CalcTablePdf`
- `src/components/problem-cards/CalculusMCQCard.tsx` — `CalculusMCQCard`
- `src/components/problem-cards/CalculusFRQCard.tsx` — `CalculusFRQCard`

## 1. `src/lib/types.ts` — extend the `MathProblem` union

```ts
import type { CalcMCQProblem } from "./factories/CalculusUtils";
import type { BaseFRQProblem } from "./apTypes";

export type MathProblem =
  | CircleProblem
  | ProbabilityProblem
  | CongruenceProblem
  | TrigProblem
  | SpecialTriangleProblem
  | CoordinateProblem
  | MeasurementProblem
  | CalcMCQProblem      // type: "CALC_MCQ"
  | BaseFRQProblem;     // type: "AP_FRQ" (subject "calc" | "precalc")
```

Note: the precalculus worker also produces `AP_FRQ` (subject `"precalc"`);
one union member covers both. Coordinate with that worker on the import.

## 2. `src/lib/ProblemFactory.ts` — re-export calculus types

Add to the existing `export type { ... } from "./types"` block (same pattern
as the other problem types):

```ts
export type { CalcMCQProblem, CalcFunction, CalcGraphParams, CalcTopicTag } from "./factories/CalculusUtils";
export type { BaseFRQProblem, APStimulus, FRQSubpart } from "./apTypes";
```

## 3. `src/lib/answerKey.ts` — `formatAnswer` cases

```ts
case "CALC_MCQ":
  return latexToText(p.answer);
case "AP_FRQ":
  return p.subparts.map((s) => `(${s.label}) ${latexToText(s.answer)}`).join("  ");
```

(`formatCalculusAnswer` in CalculusUtils.ts already implements this exact
behavior and is what the calculus tests assert; keep both in sync.)

## 4. `src/core/types.ts` — `problemToQuestion` branches

```ts
if (p.type === "CALC_MCQ") {
  return {
    id: idx + 1,
    text: p.prompt,
    points: 10,
    diagramType: "calc-graph",
    diagramData: p.graph as unknown as Record<string, unknown>,
    scaffolding: (p.steps ?? []).map((s) => ({ text: latexToText(s.instruction) })),
  };
}
if (p.type === "AP_FRQ") {
  const stim = p.stimulus;
  const stimText =
    stim.kind === "scenario" ? stim.text :
    stim.kind === "table" ? `${stim.caption ?? "Use the table."}` :
    `${stim.caption ?? "Use the graph."}`;
  return {
    id: idx + 1,
    text: `${stimText} ${p.subparts.map((s) => `(${s.label}) ${s.prompt}`).join(" ")}`,
    points: 10,
    diagramType: stim.kind === "graph" ? "calc-graph" : stim.kind === "table" ? "calc-table" : undefined,
    diagramData: stim.kind === "graph" ? (stim.params as unknown as Record<string, unknown>) : undefined,
    scaffolding: p.subparts.map((s) => ({ text: latexToText(s.prompt) })),
  };
}
```

## 5. `src/components/EuclidEngine.tsx` — card routing

```tsx
import { CalculusMCQCard } from "./problem-cards/CalculusMCQCard";
import { CalculusFRQCard } from "./problem-cards/CalculusFRQCard";

const calcMCQs = problems.filter((p): p is CalcMCQProblem => p.type === "CALC_MCQ");
const calcFRQs = problems.filter(
  (p): p is BaseFRQProblem => p.type === "AP_FRQ" && (p as BaseFRQProblem).subject === "calc"
);
```

Render each group under its own `SectionDivider` ("AP Calculus — Multiple
Choice" / "AP Calculus — Free Response") with the global index offset pattern
already used by the other sections. (The precalculus worker owns `AP_FRQ`
with subject `"precalc"` — filter on `subject` to avoid double-rendering.)

## 6. `src/components/problem-cards/index.ts` — barrel exports

```ts
export { CalculusMCQCard } from "./CalculusMCQCard";
export { CalculusFRQCard } from "./CalculusFRQCard";
```

## 7. `src/components/PdfDocument.tsx` — PDF diagram + FRQ cases

- For `diagramType === "calc-graph"`, render
  `<CalcGraphPdf params={diagramData as CalcGraphParams} />`
  (import from `@/components/diagrams/CalculusGraphs`).
- For `diagramType === "calc-table"`, render
  `<CalcTablePdf headers rows caption />` from the same module.
- For `AP_FRQ` problems, render the stimulus (graph/table/scenario text via
  the two components above or a paragraph) followed by subparts (a)–(d);
  the answer-key page uses each subpart's `answer` + `justification`.

## 8. `src/modules/CurriculumRegistry.ts` — register entries

See `tests/calculus/REGISTRY_SNIPPET.md` (import + spread `CALCULUS_ENTRIES`).

## 9. `src/modules/calculus.ts` — drop the cast (cleanup)

After step 1, replace `asMathProblems(...)` with the direct arrays
(the helper can be deleted).

## Classical mode

Already handled inside the new files: `drillCount`/`frqProblems` treat
`"Classical"` like `"Review"`, and both cards map `mode === "Classical"` to
Review-style step rendering. The classical-notes renderer (separate worker)
reads `ProblemStep.reason`, which the calculus factories populate.
