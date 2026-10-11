# Geometry Proofs — Coordinator Wiring Guide

Every change below is to an **existing shared file** (the proofs worker was
forbidden from editing them). Each step is independent unless noted. After all
steps, `npx tsc --noEmit -p tsconfig.json` and `npm run build` must pass.

New files this work adds (for reference — no action needed):
- `src/lib/proofDiagrams.ts` — `ProofProblem`, `ProofStudentMode`, `ProofSVGParams` (+ per-kind params), `ElementsProposition`
- `src/lib/proofTypes.ts` — already existed (shared proof shapes; untouched)
- `src/lib/factories/ProofFactoryShared.ts` — reason vocabulary, seeded triangle geometry, student-mode blanking
- `src/lib/factories/ProofTriangleCongruenceFactory.ts` — SSS/SAS/ASA/AAS/HL + CPCTC + isosceles
- `src/lib/factories/ProofParallelLinesFactory.ts` — transversal proofs
- `src/lib/factories/ProofCircleTheoremsFactory.ts` — inscribed/tangent-chord proofs
- `src/lib/factories/ProofSimilarityFactory.ts` — AA proofs
- `src/lib/factories/ProofElementsFactory.ts` — Elements I.1/I.4/I.5/I.8/I.29/I.32/I.47/I.48
- `src/modules/geometry-proofs.ts` — registry adapters (OutputMode → student mode)
- `src/components/diagrams/ProofDiagrams.tsx` — web SVG (`ProofGeometrySVG` dispatcher)
- `src/components/diagrams/PdfProofSVG.tsx` — PDF SVG (`PdfProofSVG` dispatcher)
- `src/components/problem-cards/ProofProblemCard.tsx` — card (`ProofProblemCard`)

## Step 1 — `src/lib/types.ts`: add ProofProblem to the union

```ts
import type { ProofProblem } from "./proofDiagrams";
// … in the union:
export type MathProblem =
  | CircleProblem
  | ProbabilityProblem
  | CongruenceProblem
  | TrigProblem
  | SpecialTriangleProblem
  | CoordinateProblem
  | MeasurementProblem
  | ProofProblem;
```

(No import cycle: `proofDiagrams.ts` imports only from `./proofTypes`.)

## Step 2 — `src/lib/ProblemFactory.ts`: re-export the new types

Add to the `export type { … } from "./types"` block (or a new block):

```ts
export type { ProofProblem, ProofStudentMode, ProofSVGParams } from "./proofDiagrams";
export type { BaseProofProblem, ProofStep } from "./proofTypes";
```

## Step 3 — `src/core/types.ts`: `problemToQuestion` Proof case

Add before the final fallback return:

```ts
if (p.type === "Proof") {
  return {
    id: idx + 1,
    text: p.elementsProposition
      ? `Euclid's Elements, Proposition ${p.elementsProposition}.`
      : `Given: ${p.given.join("; ")}. Prove: ${p.prove}.`,
    points: 10,
    diagramType: "proof",
    scaffolding: p.steps.map((s) => ({ text: latexToText(s.statement) })),
  };
}
```

(`p` narrows to `ProofProblem` once Step 1 is done. The classical-notes
renderer worker owns `classical-notes` handling; this case is only for the
legacy Question path.)

## Step 4 — `src/components/EuclidEngine.tsx`: card routing

```tsx
import type { ProofProblem } from "@/lib/proofDiagrams";
import { ProofProblemCard } from "./problem-cards/ProofProblemCard";

// alongside the other filters:
const proofProblems = problems.filter(
  (p): p is ProofProblem => (p as { type?: string }).type === "Proof"
);
const proofOffset = specialOffset + specialProblems.length; // after last existing section
```

Render after the last existing section (Special Triangles), following the
established pattern:

```tsx
{/* Geometry Proofs */}
{proofProblems.length > 0 && (
  <>
    <SectionDivider label="Geometry Proofs" />
    {proofProblems.map((p, i) => (
      <ProofProblemCard
        key={i}
        problem={p}
        index={proofOffset + i}
        mode={mode}
        revealed={revealed}
      />
    ))}
  </>
)}
```

## Step 5 — `src/components/PdfDocument.tsx`: proof diagrams + answer key

(a) Diagram branch — the existing code does
`<PdfGeometrySVG params={item.problem.svgParams} />`. Proof params have their
own dispatcher; branch on the kind prefix:

```tsx
import { PdfProofSVG } from "./diagrams/PdfProofSVG";
import type { ProofSVGParams } from "@/lib/proofDiagrams";
…
{item.problem?.svgParams ? (
  String(item.problem.svgParams.kind).startsWith("Proof") ? (
    <PdfProofSVG params={item.problem.svgParams as ProofSVGParams} />
  ) : (
    <PdfGeometrySVG params={item.problem.svgParams} />
  )
) : (
  <PdfDiagram type={item.question.diagramType || ""} data={item.question.diagramData} />
)}
```

(b) Answer key — in `src/lib/answerKey.ts`, `formatAnswer`, add:

```ts
case "Proof":
  return p.elementsProposition ? `${p.elementsProposition} — Q.E.D.` : p.prove;
```

(This exact logic is what `tests/proofs/run-all.ts` verifies against 378
generated problems across difficulties and seeds.)

## Step 6 — `src/components/problem-cards/index.ts`: barrel export

```ts
export { ProofProblemCard } from "./ProofProblemCard";
```

## Step 7 — Registry entries

Insert the 11 entries from `tests/proofs/REGISTRY_SNIPPET.md` and delete the
two replaced placeholders (`ch3-1-lines-angles`, `ch9-2-similar-polygons`).

## Step 8 — Proposed new generator modes (DocumentType)

Add alongside `worksheet | guided-notes | review | test | classical-notes` in
`src/core/types.ts`:

```ts
export type DocumentType =
  | 'worksheet' | 'guided-notes' | 'review' | 'test' | 'classical-notes'
  | 'proof-two-column'   // full two-column proofs (answers per answer-key toggle)
  | 'proof-fill-reasons' // statements given, reasons blanked for the student
  | 'proof-elements';    // classical Elements exposition (enunciation → Q.E.D.)
```

Semantics and plumbing (proposal — coordinator decides final shape):
- `proof-two-column` → generate with OutputMode `"Review"` (studentMode
  `"complete"`); render `ProofProblemCard` with `presentation="two-column"`.
- `proof-fill-reasons` → generate with OutputMode `"Test"` (studentMode
  `"supply-reasons"`); render `presentation="two-column"` — the blanked
  reason column is the exercise.
- `proof-elements` → generate with OutputMode `"Review"`; render
  `presentation="elements"`. Only meaningful for `proofs-2-4-elements`;
  other proof entries fall back to `proof-two-column`.
- `WorksheetGenerator.tsx`: when every selected entry id starts with
  `"proofs-"`, show a "Proof mode" segmented control with these three
  options (disable `proof-elements` unless `proofs-2-4-elements` is among
  the selected). Thread the choice as an optional prop, e.g.
  `proofDocMode`, through `EuclidEngine` → `ProofProblemCard`
  (`presentation` prop already exists) and into `PdfDocument` for print.
- The factories already support all three via `studentMode` + the card's
  `presentation` prop — no factory changes needed.

Note: the separate classical-notes worker owns the `'classical-notes'`
DocumentType and the `"Classical"` OutputMode renderer. Proof factories
treat `"Classical"` exactly like `"Review"` (full steps, verified in
`tests/proofs/run-all.ts`); do not add classical-notes to the proof test
matrix — cross-mode verification is the coordinator's integration step.

## Pre-existing breakages observed (NOT from this work — flagging only)

Another worker's contract update widened `OutputMode` with `"Classical"`,
which currently breaks typecheck in existing files:
- `src/components/EuclidEngine.tsx:205,221` — `OutputMode` not assignable to `"GuidedNote" | "Review" | "Test"`
- `src/components/problem-cards/DocumentHeader.tsx:11` — `Record<OutputMode,string>` missing `Classical`
- `src/components/ClassicalNotesPdf.tsx:544` — JSX closing-tag error (`Expected corresponding JSX closing tag for 'Page'`)

These need fixing (by the owning worker / coordinator) before `npm run build`
can pass. This proofs work introduces zero type errors of its own.
