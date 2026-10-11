# Precalculus — Registry Snippet

Exact `CurriculumEntry` blocks for the new **Precalculus (AP Style)** group.
Paste-ready for `src/modules/CurriculumRegistry.ts`. The entries live in
`src/modules/precalculus.ts` (new file); the registry only needs the import
and the spread below.

## Replaced placeholder ids

**None.** The Precalculus group is appended as a new group (Topic 16). No
existing registry entries were replaced, removed, or renumbered.

## Import (top of `CurriculumRegistry.ts`)

```ts
import { PRECALCULUS_ENTRIES } from "./precalculus";
```

## Append to `CURRICULUM_REGISTRY`

```ts
export const CURRICULUM_REGISTRY: CurriculumEntry[] = [
  // ... existing geometry entries ...
  // ── Topic 16: Precalculus (AP Style) ──────────────────────────────────────
  ...PRECALCULUS_ENTRIES,
];
```

## The entries (`src/modules/precalculus.ts`, verbatim)

```ts
export const PRECALCULUS_ENTRIES: CurriculumEntry[] = [
  precalcEntry(
    "precalc-vectors",
    "Vectors",
    "Add, scale, and dot vectors — magnitude, direction, and orthogonality.",
    "vectors",
    "AP-style multiple choice on vector operations, magnitude, dot product, unit vectors, and the angle between vectors. Calculator-active items are flagged."
  ),
  precalcEntry(
    "precalc-complex",
    "Complex Numbers",
    "Operate in a+bi and convert to polar form with De Moivre.",
    "complex",
    "AP-style multiple choice on complex arithmetic, modulus, conjugates, powers of i, rectangular-polar conversion, and De Moivre's theorem."
  ),
  precalcEntry(
    "precalc-conics",
    "Conic Sections",
    "Read centers, foci, and vertices straight from standard form.",
    "conics",
    "AP-style multiple choice identifying conics and finding centers, radii, vertices, foci, and directrices — including completing the square."
  ),
  precalcEntry(
    "precalc-trig",
    "Trigonometry & Trig Functions",
    "Unit circle exact values, trig graphs, inverses, and equations.",
    "trig",
    "AP-style multiple choice on unit-circle values, amplitude/period/phase shift, inverse trig, trig equations, and calculator-active evaluation."
  ),
  precalcEntry(
    "precalc-limits",
    "Introduction to Limits",
    "Estimate from tables and graphs; evaluate with limit laws.",
    "limits",
    "AP-style multiple choice on numerical and graphical limits, one-sided limits, removable discontinuities, and limit laws."
  ),
  precalcEntry(
    "precalc-param-polar",
    "Parametric & Polar",
    "Plot polar points, convert coordinates, eliminate parameters.",
    "parametric-polar",
    "AP-style multiple choice on parametric evaluation, eliminating the parameter, polar-rectangular conversion, and polar curves/symmetry."
  ),
  precalcEntry(
    "precalc-frq",
    "AP FRQ Practice",
    "Stimulus-based free response: one graph, table, or scenario per question.",
    "frq",
    "Multi-part free-response questions (a)-(d) built around a single stimulus — graph, table, or verbal scenario — with AP-style justifications in the key."
  ),
];
```

Entry ids: `precalc-vectors`, `precalc-complex`, `precalc-conics`,
`precalc-trig`, `precalc-limits`, `precalc-param-polar`, `precalc-frq`.
All use `topic: 16`, `topicTitle: "Topic 16: Precalculus (AP Style)"`,
`teks: "AP Precalculus"`.

Each entry's `generate(mode, seed, options)` is
`(mode, seed, options) => generatePrecalcProblems(mulberry32(seed), topicTag, count, difficulty)`,
with `count = options?.count ?? (mode === "Review" ? 9 : 3)` and
`difficulty = options?.difficulty ?? 2`. Generation is mode-invariant
(verified by test-matrix); until the `MathProblem` union is extended the
result is cast `as unknown as MathProblem[]` — the cast can be dropped after
wiring (see WIRING.md).
