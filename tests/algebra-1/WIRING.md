# WIRING.md — shared-file changes needed to mount Algebra 1

This worker was forbidden from editing existing files. Everything below is a
precise, paste-ready change for the integrator (parent/coordinator). New files
delivered by this worker:

- `src/lib/factories/Algebra1Types.ts` — `Algebra1Problem`, `Algebra1Subtype`,
  `Algebra1TEKS`, `Algebra1Meta`, diagram param types
- `src/lib/factories/Algebra1Format.ts` — internal formatting helpers
- `src/lib/factories/Algebra1{Equations,Linear,Systems,Exponents,Polynomials,Quadratics,Exponential,Sequences,Statistics}.ts`
- `src/components/diagrams/AlgebraGraphs.tsx` — web (`AlgebraGraphSVG`) + PDF
  (`PdfAlgebraGraphSVG`) diagram renderers
- `src/components/problem-cards/Algebra1ProblemCard.tsx`
- `src/modules/algebra-1.ts` — lesson routes + `generateAlgebra1Lesson` +
  `formatAlgebra1Answer`
- `tests/algebra-1/` — `verify.ts`, `run-matrix.ts`, `fuzz.ts`, `pdf-check.ts`,
  `answerkey-check.ts`, `REGISTRY_SNIPPET.md`, `WIRING.md` (this file),
  `TEST_REPORT.md`

## 1. `src/lib/types.ts`

a) Extend the `TEKSStandard` union with the Algebra 1 codes:

```ts
export type TEKSStandard =
  | "G.12A" | "G.13B" | "G.9A" | "G.9B" | "G.2B" | "G.12B"
  | "A.5A" | "A.5B" | "A.12E" | "A.3B" | "A.2B" | "A.2D" | "A.3C"
  | "A.2C" | "A.12A" | "A.2A" | "A.2E" | "A.3E" | "A.4C" | "A.4B"
  | "A.3F" | "A.5C" | "A.2I" | "A.3D" | "A.3H" | "A.11B" | "A.11A"
  | "A.12D" | "A.12C" | "A.10A" | "A.10D" | "A.10B" | "A.10E" | "A.10F"
  | "A.6A" | "A.7A" | "A.7C" | "A.6B" | "A.8A" | "A.6C" | "A.9A"
  | "A.9B" | "A.9E";
```

(Or `import type { Algebra1TEKS } from "./factories/Algebra1Types"` and use
`TEKSStandard = <existing> | Algebra1TEKS`.)

b) Add `Algebra1Problem` to the `MathProblem` union:

```ts
import type { Algebra1Problem } from "./factories/Algebra1Types";
export type MathProblem =
  | CircleProblem
  | ProbabilityProblem
  | CongruenceProblem
  | TrigProblem
  | SpecialTriangleProblem
  | CoordinateProblem
  | MeasurementProblem
  | Algebra1Problem;
```

## 2. `src/lib/ProblemFactory.ts`

Re-export the new types so `@/lib/ProblemFactory` consumers keep working:

```ts
export type {
  Algebra1Problem,
  Algebra1Subtype,
  Algebra1TEKS,
  Algebra1Meta,
  Algebra1GraphParams,
  FunctionGraphSVGParams,
  ScatterPlotSVGParams,
  NumberLineSVGParams,
  TwoWayTableSVGParams,
} from "./factories/Algebra1Types";
```

Optionally add convenience methods mirroring the existing ones:

```ts
import { generateAlgebra1Mixed } from "@/modules/algebra-1";
/** Generate n mixed Algebra 1 problems */
generateAlgebra1(n: number, difficulty: 1 | 2 | 3 = 2) {
  return generateAlgebra1Mixed(this.rng, n, difficulty);
}
```

## 3. `src/lib/answerKey.ts` — `formatAnswer()`

Add a branch before the `default`:

```ts
import { formatAlgebra1Answer } from "@/modules/algebra-1";
// inside formatAnswer(p):
case "A.5A": case "A.5B": case "A.12E": case "A.3B": case "A.2B":
case "A.2D": case "A.3C": case "A.2C": case "A.12A": case "A.2A":
case "A.2E": case "A.3E": case "A.4C": case "A.4B": case "A.3F":
case "A.5C": case "A.2I": case "A.3D": case "A.3H": case "A.11B":
case "A.11A": case "A.12D": case "A.12C": case "A.10A": case "A.10D":
case "A.10B": case "A.10E": case "A.10F": case "A.6A": case "A.7A":
case "A.7C": case "A.6B": case "A.8A": case "A.6C": case "A.9A":
case "A.9B": case "A.9E":
  return formatAlgebra1Answer(p as Algebra1Problem);
```

(`formatAlgebra1Answer` returns `latexToText(p.answer)`; the answer key
exactness is covered by `tests/algebra-1/answerkey-check.ts`.)

## 4. `src/core/types.ts` — `problemToQuestion()`

Add before the final fallback:

```ts
if ((p as { type: string }).type.startsWith("A.")) {
  const ap = p as unknown as import("@/lib/factories/Algebra1Types").Algebra1Problem;
  return {
    id: idx + 1,
    text: ap.prompt,
    points: 10,
    diagramType: ap.graph ? `algebra-${ap.graph.kind}` : undefined,
    scaffolding: ap.steps.map((s) => ({ text: latexToText(s.instruction) })),
  };
}
```

## 5. `src/components/problem-cards/index.ts`

```ts
export { Algebra1ProblemCard } from "./Algebra1ProblemCard";
```

## 6. `src/components/EuclidEngine.tsx` — card routing

```tsx
import type { Algebra1Problem } from "@/lib/types";
import { Algebra1ProblemCard } from "./problem-cards";
// filter:
const algebraProblems = problems.filter(
  (p): p is Algebra1Problem => (p as { type: string }).type.startsWith("A.")
);
// render (after the G.9B section):
{algebraProblems.length > 0 && (
  <>
    <SectionDivider label="Algebra 1" />
    {algebraProblems.map((p, i) => (
      <Algebra1ProblemCard key={i} problem={p} index={algebraOffset + i} mode={mode} revealed={revealed} />
    ))}
  </>
)}
```

(`algebraOffset` = running total of the previous sections' lengths, following
the existing offset pattern.)

## 7. `src/components/PdfGeometrySVG.tsx` — PDF diagram cases

The PDF renderers live in `src/components/diagrams/AlgebraGraphs.tsx`
(`PdfAlgebraGraphSVG`). Add to the `PdfGeometrySVG` switch:

```tsx
import { PdfAlgebraGraphSVG } from "./diagrams/AlgebraGraphs";
// in PdfGeometrySVG:
const kind = (params as { kind?: string }).kind;
if (
  kind === "FunctionGraph" || kind === "ScatterPlot" ||
  kind === "NumberLine" || kind === "TwoWayTable"
) {
  return <PdfAlgebraGraphSVG params={params as Algebra1GraphParams} />;
}
```

(Or extend the `SVGParams` union with the four new kinds and add `case`s.)

## 8. `src/modules/CurriculumRegistry.ts`

Insert the 55 entries from `tests/algebra-1/REGISTRY_SNIPPET.md` (topics
101–109) plus the import block at the top of that file. No existing entry is
modified or removed; no "coming soon" placeholder is replaced.

## Notes / caveats for the integrator

- `OutputMode` now includes `"Classical"` (contract update). This worker's
  factories are mode-independent at generation time (steps always emitted in
  full); `generateAlgebra1Lesson` treats `Classical` like `Review` for default
  counts (9). The `Algebra1ProblemCard` passes `mode` straight through to the
  shared `StepBlock`/`Blank` atoms, so the classical-notes renderer built by the
  other worker controls presentation. Classical was deliberately excluded from
  this worker's test matrix.
- `ProblemStep.reason` (optional) is populated on most steps ("Subtraction
  Property of Equality", "Zero Product Property", …) for the classical-notes
  renderer; safe to ignore elsewhere.
- New files import `@/modules/CurriculumRegistry` only for the
  `DifficultyLevel`/`GenerateOptions` types — no runtime coupling to geometry
  modules beyond type imports.
- `npx tsc --noEmit` currently reports errors in OTHER workers' in-progress
  files (`EuclidEngine.tsx`, `DocumentHeader.tsx`, `apTypes.ts`,
  `ProofParallelLinesFactory.ts`, `satTypes.ts`); none are in this worker's
  files (verified: zero errors matching `Algebra1|algebra-1|diagrams/Algebra`).
