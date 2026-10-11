# SAT Wiring Guide

Everything the coordinator needs to connect the SAT Math Practice Generator
to the existing app. All SAT source files are new (nothing existing was
edited); the changes below are all in shared files.

New files (for reference):

- `src/lib/satTypes.ts` — `SATProblem`, `SATDistractor`, `SATMisconception`,
  `SATDiagramParams`, timing presets, `buildSATModule`, `generateSATProblems`
- `src/lib/factories/SATShared.ts` — exact rational helpers, `buildMCQ`,
  `pickDistractors`, `assembleProblem`, `SATMaker`
- `src/lib/factories/SATHeartOfAlgebra.ts` — 4 makers (H.A.1–H.A.4)
- `src/lib/factories/SATProblemSolvingData.ts` — 4 makers (P.D.1/2/4/5)
- `src/lib/factories/SATPassportAdvancedMath.ts` — 4 makers (P.A.1–P.A.4)
- `src/lib/factories/SATAdditionalTopics.ts` — 4 makers (A.T.1–A.T.3)
- `src/modules/sat-math.ts` — `SAT_MATH_REGISTRY` (17 entries)
- `src/components/problem-cards/SATProblemCard.tsx`
- `src/components/diagrams/SatWebDiagrams.tsx` — web SVG/HTML diagrams
- `src/components/diagrams/SatPdfDiagrams.tsx` — `SatPdfDiagram` for @react-pdf

---

## 1. `src/lib/types.ts` — add `SATProblem` to the union

```ts
import type { SATProblem } from "./satTypes"; // safe: satTypes has no runtime imports from types

export type MathProblem =
  | CircleProblem
  | ProbabilityProblem
  | CongruenceProblem
  | TrigProblem
  | SpecialTriangleProblem
  | CoordinateProblem
  | MeasurementProblem
  | SATProblem; // NEW
```

Then remove the `as unknown as MathProblem[]` casts in `src/modules/sat-math.ts`
(they become plain `MathProblem[]` returns). `SATProblem` uses `type: "SAT"`,
so it cannot collide with existing discriminators.

## 2. `src/lib/ProblemFactory.ts` — re-export the type

Add `SATProblem` (and optionally `SATDomain`, `SATFormat`) to the existing
`export type { … } from "./types"` block so consumers keep importing from
`@/lib/ProblemFactory`.

## 3. `src/core/types.ts` — `problemToQuestion` + new document mode

### New generator mode: `'sat-practice'`

```ts
export type DocumentType =
  | 'worksheet' | 'guided-notes' | 'review' | 'test' | 'classical-notes'
  | 'sat-practice'; // NEW — distinct SAT practice mode
```

`toOutputMode` in `WorksheetGenerator.tsx` maps `'sat-practice'` → `'Review'`
style rendering for the card (answers shown only in the answer-key page / Review);
the SAT card itself keys off `mode === "Review"` to reveal answers,
misconception notes, and solutions. `GuidedNote`/`Test`/`Classical` render the
clean student version (SAT problems are mode-agnostic — they carry no steps,
so Classical behaves exactly like Review/Test here).

### `problemToQuestion` — add the SAT case

```ts
if (p.type === 'SAT') {
  return {
    id: idx + 1,
    text: p.stem, // run through latexToText at the call site as usual
    points: 10,
    diagramType: p.diagram ? 'sat-diagram' : undefined,
    diagramData: p.diagram as unknown as Record<string, unknown>,
    scaffolding:
      p.format === 'MCQ'
        ? p.options!.map((o) => ({ text: `(${o.option}) ${latexToText(o.label)}` }))
        : [{ text: '[Student-produced response — grid-in]' }],
  };
}
```

Note: `p.options` / `p.keyIndex` are only present when `format === "MCQ"`;
`p.acceptedForms` only when `format === "GridIn"`.

## 4. `src/lib/answerKey.ts` — `formatAnswer` SAT case

```ts
case "SAT":
  return p.format === "GridIn" && p.acceptedForms && p.acceptedForms.length > 1
    ? `${latexToText(p.key)} (also: ${p.acceptedForms.filter((f) => f !== p.key).map(latexToText).join(", ")})`
    : latexToText(p.key);
```

`pdfSafeText` already handles every glyph SAT labels emit (`π`, `°`, `−`, `≤`, `≥`).

## 5. `src/components/problem-cards/index.ts` — export the card

```ts
export { SATProblemCard } from "./SATProblemCard";
```

## 6. `src/components/EuclidEngine.tsx` — card routing

```ts
import type { SATProblem } from "@/lib/types"; // after union addition
import { SATProblemCard } from "./problem-cards";

const satProblems = problems.filter((p): p is SATProblem => p.type === "SAT");
// … include in the offset chain, then:
{satProblems.length > 0 && (
  <>
    <SectionDivider label="SAT Math Practice" />
    {satProblems.map((p, i) => (
      <SATProblemCard key={i} problem={p} index={satOffset + i} mode={mode} revealed={revealed} />
    ))}
  </>
)}
```

Card behavior by mode (already implemented in `SATProblemCard`):

- **MCQ rendering**: options as lettered rows (A–D circles, digital-SAT style).
  In `Review` mode the keyed option is highlighted and each distractor shows its
  teacher-facing misconception note (`Misconception (sign-flip): …`).
- **Grid-in rendering**: a row of 7 answer boxes (digital-SAT style); in
  `Review` mode the boxes are filled with the key and all accepted equivalent
  forms are listed.
- **Diagrams**: `SatTable` renders full-width under the stem; triangle diagrams
  render in the standard `DiagramBox`.

## 7. `src/components/PdfDocument.tsx` — PDF cases

For each SAT problem:

- Stem: `pdfSafeText(p.stem)` as a `Text` element.
- MCQ options: `(A) …` lines via `pdfSafeText(o.label)`.
- Grid-in: 7 bordered boxes (`View` row); answer key fills them.
- Diagram: `<SatPdfDiagram params={p.diagram} />` from
  `@/components/diagrams/SatPdfDiagrams` (covers `SatTable`, `SatRightTriangle`,
  `SatTriangle`).
- Answer key page: use the `formatAnswer` SAT case above; optionally include
  `pdfSafeText(p.explanation)`.

Alternatively, add SAT diagram kinds to the `SVGParams` union in
`src/components/PdfGeometrySVG.tsx` and route through the existing
`PdfGeometrySVG` dispatcher.

## 8. `src/components/WorksheetGenerator.tsx` — UI wiring + timing presets

### Document mode

Add `'sat-practice'` to the mode toggle (next to worksheet/guided-notes/review/
test/classical-notes). When active:

- Topic picker shows `SAT_MATH_REGISTRY` entries grouped by domain
  (`topicTitle`: "SAT Math: Heart of Algebra", etc., plus "SAT Math: Full
  Practice Module").
- `toOutputMode('sat-practice')` → `'Review'` (card reveals answers only in
  Review/answer-key contexts; student print uses Test/Classical → clean).

### Timing presets

`SAT_TIMING_PRESETS` in `src/lib/satTypes.ts`:

| id | label | questions | minutes |
| -- | ----- | --------- | ------- |
| `full-module` | Full Module | 22 | 35 |
| `half-module` | Half Module | 11 | 18 |
| `quick-drill` | Quick Drill | 6 | 10 |

Plus `satCustomPreset(n)` for custom counts (minutes = `ceil(n × 35/22)`).

Suggested UI: when the `sat-full-module` entry is selected, show a preset
segmented control (Full Module / Half Module / Quick Drill / Custom count
input). On generate:

```ts
import { buildSATModule, SAT_TIMING_PRESETS, satCustomPreset } from "@/lib/satTypes";

const preset = presetId === "custom"
  ? satCustomPreset(customCount)
  : SAT_TIMING_PRESETS[presetId];
const { problems, minutes } = buildSATModule({ preset, seed });
// Display "35:00" countdown chip; problems arrive easy→hard like the real SAT.
```

For per-skill SAT entries (`sat-hoa-*`, …), the existing count/difficulty/seed
controls apply unchanged (`generateSATEntry(id, seed, count, difficulty)` in
`src/modules/sat-math.ts` is the typed helper).

### Draft save/load

SAT config to persist: `{ mode: 'sat-practice', entryIds, presetId, customCount,
difficulty, seed }`. `buildSATModule({ preset, seed })` reproduces the module
exactly.

## 9. Classical-notes contract (already satisfied)

SAT generators are mode-agnostic: they emit no `ProblemStep`s, so there are no
`reason` fields to blank. `OutputMode` `"Classical"` flows through the registry
`generate(mode, …)` signature and produces output identical to `Review` (proven
by the matrix suite's mode-independence checks). No renderer work needed from
the SAT side.

## 10. What NOT to change

- `src/lib/ProblemFactory.ts` — only additive re-exports (section 2).
- `src/modules/CurriculumRegistry.ts` — do not edit; merge via
  `[...CURRICULUM_REGISTRY, ...SAT_MATH_REGISTRY]` as shown in
  `tests/sat/REGISTRY_SNIPPET.md`.
- The `as unknown as MathProblem[]` casts in `src/modules/sat-math.ts` are
  temporary scaffolding for the pre-union state; remove them when section 1
  lands.
