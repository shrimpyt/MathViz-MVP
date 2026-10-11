# Middle School — Wiring Guide

Everything the coordinator needs to connect the middle-school area to the app.
All middle-school source files are new (no existing file was edited); the
changes below are all in shared files.

## New files (for reference)

- `src/lib/factories/MiddleSchoolTypes.ts` — `Grade6Problem` (`type: "MS.6"`),
  `Grade7Problem` (`"MS.7"`), `Grade8Problem` (`"MS.8"`), lesson subtype unions,
  `MiddleSchoolSVGParams` (5 diagram kinds)
- `src/lib/factories/MiddleSchoolUtils.ts` — seeded helpers (no React)
- `src/lib/factories/MiddleSchoolGrade6.ts` — `generateGrade6Problems(rng, n, difficulty, subtypes?)`
- `src/lib/factories/MiddleSchoolGrade7.ts` — `generateGrade7Problems(...)`
- `src/lib/factories/MiddleSchoolGrade8.ts` — `generateGrade8Problems(...)`
- `src/modules/middle-school.ts` — `MIDDLE_SCHOOL_ENTRIES: CurriculumEntry[]` (56 entries)
- `src/components/problem-cards/MiddleSchoolGrade6Card.tsx` — props `{ problem: Grade6Problem; index: number; mode: OutputMode; revealed: boolean }`
- `src/components/problem-cards/MiddleSchoolGrade7Card.tsx` — same props with `Grade7Problem`
- `src/components/problem-cards/MiddleSchoolGrade8Card.tsx` — same props with `Grade8Problem`
- `src/components/diagrams/MiddleSchoolDiagrams.tsx` — `MiddleSchoolDiagram({ params })` (web SVG)
- `src/components/diagrams/PdfMiddleSchoolDiagrams.tsx` — `PdfMiddleSchoolDiagram({ params })` (@react-pdf SVG)

Problem shape notes:

- `answer: number | string`; `unit?: string` (e.g. `"cm²"`, `"dollars"`).
  Convention: the answer string usually already contains the unit
  (`"22 m²"`, `"$21.60"`); `unit` is metadata.
- `tier: 1|2|3` is stamped by every maker — use it for difficulty display/filtering.
- `svgParams: MiddleSchoolSVGParams | null` — the cards render it themselves
  via `MiddleSchoolDiagram`; the coordinator does NOT need per-diagram web wiring.
- `ProblemStep` may carry an optional `reason` (unused by these factories —
  deliberately skipped to protect the testing bar; safe to ignore).

---

## 1. `src/lib/types.ts` — add MS problems to the union

```ts
import type {
  Grade6Problem,
  Grade7Problem,
  Grade8Problem,
} from "./factories/MiddleSchoolTypes";

export type MathProblem =
  | CircleProblem
  | ProbabilityProblem
  | CongruenceProblem
  | TrigProblem
  | SpecialTriangleProblem
  | CoordinateProblem
  | MeasurementProblem
  | Grade6Problem   // NEW — type: "MS.6"
  | Grade7Problem   // NEW — type: "MS.7"
  | Grade8Problem;  // NEW — type: "MS.8"
```

Then remove the `as unknown as MathProblem[]` casts in
`src/modules/middle-school.ts` (`generateFor`).

## 2. `src/modules/CurriculumRegistry.ts` — register the entries

```ts
import { MIDDLE_SCHOOL_ENTRIES } from "./middle-school";
// in CURRICULUM_REGISTRY:
...MIDDLE_SCHOOL_ENTRIES,
```

No placeholders are replaced (there were none for middle school).

## 3. `src/components/EuclidEngine.tsx` — card routing

Follow the existing filter + section pattern:

```tsx
import { MiddleSchoolGrade6Card } from "./problem-cards/MiddleSchoolGrade6Card";
import { MiddleSchoolGrade7Card } from "./problem-cards/MiddleSchoolGrade7Card";
import { MiddleSchoolGrade8Card } from "./problem-cards/MiddleSchoolGrade8Card";

const ms6Problems = problems.filter(
  (p): p is Grade6Problem => p.type === "MS.6"
);
const ms7Problems = problems.filter(
  (p): p is Grade7Problem => p.type === "MS.7"
);
const ms8Problems = problems.filter(
  (p): p is Grade8Problem => p.type === "MS.8"
);

// in the render, after existing sections:
{ms6Problems.length > 0 && (
  <>
    <SectionDivider label="Grade 6 Math" />
    {ms6Problems.map((p, i) => (
      <MiddleSchoolGrade6Card key={i} problem={p} index={ms6Offset + i} mode={mode} revealed={revealed} />
    ))}
  </>
)}
// … same for MS.7 → MiddleSchoolGrade7Card ("Grade 7 Math"), MS.8 → MiddleSchoolGrade8Card ("Grade 8 Math")
```

Cards handle their own diagrams (`MiddleSchoolDiagram`), TEKS badges,
step blocks, and Test-mode answer blanks — no extra wiring.

## 4. `src/core/types.ts` — `problemToQuestion` cases

Add cases for `"MS.6"`, `"MS.7"`, `"MS.8"` (can share one branch). Suggested:

```ts
if (p.type === "MS.6" || p.type === "MS.7" || p.type === "MS.8") {
  return {
    id: idx + 1,
    text: p.prompt,
    points: 10,
    scaffolding: p.steps.map((s) => ({ text: latexToText(s.instruction) })),
  };
}
```

Do NOT set `diagramType` for MS problems — their diagrams travel on
`problem.svgParams` (see §5).

## 5. `src/components/PdfDocument.tsx` — PDF diagram routing

`item.problem.svgParams` for MS problems is a `MiddleSchoolSVGParams`
(`kind: "MSNumberLine" | "MSCoordinateGrid" | "MSSpinner" |
"MSGeometryFigure" | "MSScatterPlot"`), which `PdfGeometrySVG` does not
understand. Route MS kinds to the dedicated renderer:

```tsx
import { PdfMiddleSchoolDiagram } from "./diagrams/PdfMiddleSchoolDiagrams";

// replace:
{item.problem?.svgParams ? (
  <PdfGeometrySVG params={item.problem.svgParams} />
) : ( ... )}
// with:
{item.problem?.svgParams ? (
  item.problem.type === "MS.6" || item.problem.type === "MS.7" || item.problem.type === "MS.8" ? (
    <PdfMiddleSchoolDiagram params={item.problem.svgParams} />
  ) : (
    <PdfGeometrySVG params={item.problem.svgParams} />
  )
) : ( ... )}
```

(Verified: every diagram kind renders to a valid `%PDF` — see TEST_REPORT.md.)

## 6. `src/lib/answerKey.ts` — `formatAnswer` cases

`formatAnswer` currently returns `""` for MS types (default branch). Add:

```ts
case "MS.6":
case "MS.7":
case "MS.8":
  return latexToText(p.answer);
```

Known cosmetic behaviors (documented, not defects — verified in tests):

- Money answers (`"$21.60"`) render as `"21.60"` in PDF: shared `latexToText`
  strips `$` as a math delimiter. The numeric value is preserved.
- `"9.6 × 10^2"` renders as `"9.6 × 10²"`: shared `latexToText` upgrades
  `^n` to superscript — the intended prettier PDF output.
- `"≅"` → `"≃"` substitution does not affect MS content (no MS maker emits it).

## Classical Notes

`OutputMode` includes `"Classical"`; the middle-school `generate` treats it
exactly like `"Review"` (full steps, 3× count). No classical-notes renderer
work was done here (separate worker); the cross-mode check is the
coordinator's.

## TEKS codes — open question

Grades 6/7 entries use Common Core codes (`6.NS.A.1`, `7.RP.A.2`, …) plus
TEKS `6.14`/`7.13` for the financial-literacy units, because
`CURRICULUM_SCOPE.md` provides no TEKS codes for 6/7. Confirm whether to keep
these or remap to TEKS `6.x`/`7.x`.
