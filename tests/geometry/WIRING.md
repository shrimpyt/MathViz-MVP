# WIRING.md — shared-file changes needed to mount the Geometry generators

This worker was fenced out of `CurriculumRegistry.ts`,
`classicalDefinitions.ts`, and shared checker files. Everything below is a
precise, paste-ready change for the integrator. New files delivered:

- `src/lib/factories/GeometryTypes.ts` — `GeometryProblem`, `GeometryType`
  (`"GEO.1"` … `"GEO.15"`), diagram param types, `formatGeometryAnswer`
- `src/lib/factories/GeometryHelpers.ts` — formatting, step builder,
  shuffle-bag samplers (pure, seeded)
- `src/lib/factories/GeometryFoundationsFactory.ts` (T1),
  `GeometryReasoningFactory.ts` (T2), `ParallelLinesFactory.ts` (T3),
  `TriangleRelationsFactory.ts` (T5), `PolygonsQuadrilateralsFactory.ts` (T6),
  `TransformationsFactory.ts` (T8), `SimilarityFactory.ts` (T9),
  `TangentLinesFactory.ts` (T12), `AreaFactory.ts` (T13),
  `SurfaceAreaVolumeFactory.ts` (T14), `ProbabilityConceptsFactory.ts` (T15)
- `src/modules/geometry-lessons.ts` — registry-style lesson generators +
  `geoTopicTest(topic, …)` + `WIRED_GEOMETRY` table
- `src/components/diagrams/GeometryDiagrams.tsx` — web SVG renderers
  (`GeometryFigureSVG` dispatcher + one component per kind)
- `src/components/diagrams/GeometryPdfDiagrams.tsx` — PDF twins
  (`PdfGeometryFigureSVG`)
- `tests/geometry/` — `verify.ts`, `fuzz.ts`, `pdf-check.tsx`,
  `REGISTRY_SNIPPET.md`, `WIRING.md` (this file), `TEST_REPORT.md`

## 1. `src/lib/types.ts`

```ts
import type { GeometryProblem } from "./factories/GeometryTypes";
// add to the MathProblem union:
export type MathProblem =
  | /* …existing… */
  | GeometryProblem;
```

(`GeometryProblem.type` is a `"GEO.*"` topic code, following the Algebra 2
`"A2.*"` precedent — it is not a TEKSStandard and needs no TEKS union change.)

## 2. `src/lib/ProblemFactory.ts`

Re-export for `@/lib/ProblemFactory` consumers:

```ts
export type {
  GeometryProblem,
  GeometryType,
  GeometryDiagramParams,
} from "./factories/GeometryTypes";
```

## 3. `src/lib/answerKey.ts` — `formatAnswer()`

Add a branch before the `default`:

```ts
import { formatGeometryAnswer } from "@/lib/factories/GeometryTypes";
// inside formatAnswer(p):
if ((p as { type: string }).type.startsWith("GEO.")) {
  return formatGeometryAnswer(p as GeometryProblem);
}
```

## 4. `src/core/types.ts` — `problemToQuestion()`

Add before the final fallback (mirrors the Algebra 1 branch):

```ts
if ((p as { type: string }).type.startsWith('GEO.')) {
  const gp = p as unknown as import('@/lib/factories/GeometryTypes').GeometryProblem;
  return {
    id: idx + 1,
    text: gp.prompt,
    points: 10,
    diagramType: gp.svgParams ? `geometry-${gp.svgParams.kind}` : undefined,
    diagramData: gp.svgParams as unknown as Record<string, unknown>,
    scaffolding: gp.steps.map((s) => ({ text: latexToText(s.instruction) })),
  };
}
```

## 5. Web preview — problem card routing (`EuclidEngine.tsx`)

No geometry card exists yet. Add a section following the Algebra 1 pattern:
filter `problems` to `(p as {type:string}).type.startsWith('GEO.')` and render
a simple card: `prompt` as the question text, shared `StepBlock`/`Blank` atoms
for `steps` (they carry `reason`, so Guided/Classical modes work unchanged),
and the diagram via the new dispatcher:

```tsx
import { GeometryFigureSVG } from "./diagrams/GeometryDiagrams";
// for kind === "ShadedSector", render the existing sector component instead
// (GeometryFigureSVG returns null for that kind by design).
```

## 6. PDF diagrams (`PdfGeometrySVG.tsx`)

Route the new kinds to the delivered PDF dispatcher — either extend the
`SVGParams` union with `GeometryDiagramParams`, or short-circuit before the
switch:

```tsx
import { PdfGeometryFigureSVG } from "./diagrams/GeometryPdfDiagrams";
const kind = (params as { kind?: string }).kind;
if (
  kind === "TriangleFigure" || kind === "PolygonFigure" || kind === "GridFigure" ||
  kind === "TransversalFigure" || kind === "TangentFigure" || kind === "SolidFigure" ||
  kind === "NetFigure" || kind === "SketchFigure" || kind === "AngleFigure" ||
  kind === "PatternFigure"
) {
  return <PdfGeometryFigureSVG params={params as GeometryDiagramParams} />;
}
```

`"ShadedSector"` (used by ch15-1 spinner problems) already has
`PdfShadedSectorSVG` / the web sector renderer — no change needed.
`PdfGeometryFigureSVG` returns `null` for it deliberately.

The PDF diagram text uses font family `"WorksheetSerif"` (already registered
by `PdfDocument.tsx` with italic/bold variants — required, since step/diagram
text contains ∠, △, √, π, superscripts; the built-in Times fonts can't).

## 7. `CurriculumRegistry.ts`

Apply `tests/geometry/REGISTRY_SNIPPET.md` (import + 18 `generate` swaps +
remove the 18 `underConstruction: true` flags).

## 8. Diagram variants

`assignDiagramVariants` passes unknown `kind`s through untouched
(verified in `src/lib/diagramVariants.ts`), and the geometry module wrappers
do **not** call it — presentation variety is baked into the factories via the
seeded RNG (mirrored figures, label placement). Safe either way.

## 9. Classical Notes definitions (separate content task)

`src/lib/classicalDefinitions.ts` is fenced for this worker. Generation-side,
Classical mode is fully supported (every step carries a `reason`; counts treat
Classical like Review). If the coordinator wants definition sets for these 18
entries, that's a definitions-only addition keyed by entry id — no generator
changes needed.

## Notes / caveats

- `OutputMode` includes `"Classical"`; the geometry factories are
  mode-independent at generation time (full steps always emitted), matching the
  Algebra 1/2 worker pattern.
- The registry's stock classical suite iterates registry entries; until the
  snippet in §7 is applied it still sees placeholders for these 18 entries.
  After wiring, `GeometryProblem` satisfies the classical contract
  (`steps[].reason` non-empty on every step — asserted by
  `tests/geometry/verify.ts`).
- No existing file was modified by this worker. `npx tsc --noEmit` is clean
  repo-wide as of delivery (including these files).
