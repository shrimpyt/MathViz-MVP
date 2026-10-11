# Middle School — Registry Snippet

Exact integration code for the coordinator. All middle-school source files are
new (no existing file was edited). The 56 entries below are exported as
`MIDDLE_SCHOOL_ENTRIES` from `src/modules/middle-school.ts`.

## "Coming soon" placeholders replaced

**None.** The registry contained no middle-school placeholders — every entry
below is new. (The existing `placeholderGenerator` entries are geometry
chapters `ch1-*`, `ch2-*`, etc., untouched.)

## Integration

In `src/modules/CurriculumRegistry.ts` (or wherever `CURRICULUM_REGISTRY` is
assembled):

```ts
import { MIDDLE_SCHOOL_ENTRIES } from "./middle-school";

export const CURRICULUM_REGISTRY: CurriculumEntry[] = [
  // ... existing entries ...
  ...MIDDLE_SCHOOL_ENTRIES,
];
```

Each element of `MIDDLE_SCHOOL_ENTRIES` is already a complete `CurriculumEntry`:

```ts
{
  id: "ms6-1-1-multiplying-dividing-fractions", // unique
  topic: 30,                                    // 30 = Grade 6, 31 = Grade 7, 32 = Grade 8
  topicTitle: "Grade 6 Math · T1 Numbers & Operations",
  title: "1-1: Multiplying & Dividing Fractions",
  story: "Multiply and divide fractions and mixed numbers with confidence.",
  teks: "6.NS.A.1",
  description: "Fraction × whole, +/− with common denominators, ×/÷ in simplest form.",
  generate: (mode: OutputMode, seed: number, options?: GenerateOptions) => /* MathProblem[] */,
}
```

`generate` semantics (handled inside `src/modules/middle-school.ts`, no
coordinator work needed):

- `mode: "GuidedNote" | "Test"` → 1× count (default 3 problems); `"Review" |
  "Classical"` → 3× count (default 9). **Classical is treated exactly like
  Review** (full steps emitted).
- `options.count` overrides the count; `options.difficulty` (1|2|3, default 2)
  filters to makers with `tier <= difficulty`, falling back to the lesson's
  full maker list when the intersection is empty (so a lesson never yields
  zero problems).
- Every problem carries `tier: 1|2|3` (stamped by the factory), `type:
  "MS.6"|"MS.7"|"MS.8"`, `subtype` (lesson key), `prompt`, `find`, `answer`
  (number|string), `steps`, `given`, optional `svgParams`, optional `unit`.

## Grade 6 Math — 17 entries (topic 30)

Sequencing and lesson names follow `CURRICULUM_SCOPE.md` ("6th Grade Math (SAVVAS)").

| id | title | teks |
|----|-------|------|
| `ms6-1-1-multiplying-dividing-fractions` | 1-1: Multiplying & Dividing Fractions | 6.NS.A.1 |
| `ms6-1-2-decimal-fluency` | 1-2: Fluency with Decimals | 6.NS.B.2 · 6.NS.B.3 |
| `ms6-1-3-fdp-conversions` | 1-3: Fraction, Decimal & Percent Conversions | 6.RP.A.3c |
| `ms6-2-1-integer-operations` | 2-1: Integer Operations | 6.NS.C |
| `ms6-3-1-variables-expressions` | 3-1: Variables & Expressions | 6.EE.A |
| `ms6-3-2-equivalent-expressions` | 3-2: Equivalent Expressions | 6.EE.A.3 · 6.EE.A.4 |
| `ms6-3-3-equations-inequalities` | 3-3: Equations & Inequalities | 6.EE.B |
| `ms6-3-4-two-variable-relationships` | 3-4: Two-Variable Relationships | 6.EE.C.9 |
| `ms6-4-1-ratios-rates` | 4-1: Ratios & Rates | 6.RP.A.1 · 6.RP.A.2 |
| `ms6-4-2-ratio-reasoning` | 4-2: Ratio Reasoning | 6.RP.A.3 |
| `ms6-5-1-area-polygons` | 5-1: Area of Polygons | 6.G.A.1 |
| `ms6-5-2-volume-surface-area` | 5-2: Volume & Surface Area | 6.G.A.2 · 6.G.A.4 |
| `ms6-5-3-triangle-properties` | 5-3: Triangle Properties | 6.G.A |
| `ms6-6-1-data-displays` | 6-1: Data Displays | 6.SP.B |
| `ms6-6-2-measures-center-variation` | 6-2: Measures of Center & Variation | 6.SP.A · 6.SP.B.5 |
| `ms6-7-1-banking-credit` | 7-1: Banking & Credit (Financial Literacy) | 6.14 |
| `ms6-7-2-college-salaries` | 7-2: College & Salaries (Financial Literacy) | 6.14 |

## Grade 7 Math — 31 entries (topic 31)

Sequencing and lesson names follow `CURRICULUM_SCOPE.md` ("7th Grade Math (Pearson)").
Note: "Scale drawings" from the original brief was deliberately dropped — it
does not appear in the scope doc.

| id | title | teks |
|----|-------|------|
| `ms7-1-1-rational-absolute-value` | 1-1: Rational Numbers & Absolute Value | 7.NS.A.1 |
| `ms7-1-2-add-subtract-rational` | 1-2: Adding & Subtracting Rational Numbers | 7.NS.A.1 |
| `ms7-1-3-multiply-divide-rational` | 1-3: Multiplying & Dividing Rational Numbers | 7.NS.A.2 |
| `ms7-2-1-solving-simple-equations` | 2-1: Solving Simple Equations | 7.EE.B.4a |
| `ms7-2-2-two-step-equations` | 2-2: Two-Step Equations | 7.EE.B.4a |
| `ms7-2-3-solving-inequalities` | 2-3: Solving Inequalities | 7.EE.B.4b |
| `ms7-2-4-writing-problem-situations` | 2-4: Writing Problem Situations | 7.EE.B.4a |
| `ms7-3-1-measuring-angles` | 3-1: Measuring Angles | 7.G.B.5 |
| `ms7-3-2-angle-pairs` | 3-2: Angle Pairs | 7.G.B.5 |
| `ms7-3-3-triangle-angle-sum` | 3-3: Triangle Angle Sum | 7.G.A.2 |
| `ms7-3-4-circle-parts` | 3-4: Parts of Circles | 7.G.B.4 |
| `ms7-3-5-circumference-area-circles` | 3-5: Circumference & Area of Circles | 7.G.B.4 |
| `ms7-3-6-semicircles-quarter-circles` | 3-6: Semicircles & Quarter Circles | 7.G.B.4 |
| `ms7-3-7-composite-figures` | 3-7: Composite Figures | 7.G.B.6 |
| `ms7-3-8-nets` | 3-8: Nets | 7.G.B.6 |
| `ms7-3-9-prisms-sa-volume` | 3-9: Prisms — Surface Area & Volume | 7.G.B.6 |
| `ms7-3-10-pyramids-sa-volume` | 3-10: Pyramids — Surface Area & Volume | 7.G.B.6 |
| `ms7-4-1-ratios-rates` | 4-1: Ratios & Rates | 7.RP.A.1 |
| `ms7-4-2-proportional-relationships` | 4-2: Proportional Relationships | 7.RP.A.2 |
| `ms7-4-3-representing-linear-relationships` | 4-3: Representing Linear Relationships | 7.RP.A.2 |
| `ms7-4-4-percents` | 4-4: Percents | 7.RP.A.3 |
| `ms7-5-1-sampling` | 5-1: Sampling | 7.SP.A |
| `ms7-5-2-comparing-populations` | 5-2: Comparing Populations | 7.SP.B.3 · 7.SP.B.4 |
| `ms7-5-3-probability-concepts` | 5-3: Probability Concepts | 7.SP.C.5 · 7.SP.C.6 |
| `ms7-5-4-compound-events` | 5-4: Compound Events | 7.SP.C.7 · 7.SP.C.8 |
| `ms7-6-1-economic-thinking` | 6-1: Economic Thinking (Financial Literacy) | 7.13 |
| `ms7-7-1-percents-beyond-100` | 7-1: Percents Beyond 100 (Step-up) | 7.RP.A.3 |
| `ms7-7-2-percent-error` | 7-2: Percent Error (Step-up) | 7.RP.A.3 |
| `ms7-7-3-expanding-factoring` | 7-3: Expanding & Factoring (Step-up) | 7.EE.A.1 |
| `ms7-7-4-distributive-equations` | 7-4: Distributive Equations (Step-up) | 7.EE.B.4a |
| `ms7-7-5-multi-step-inequalities` | 7-5: Multi-Step Inequalities (Step-up) | 7.EE.B.4b |

## Grade 8 Math — 8 entries (topic 32)

8th grade is not in the scope doc; TEKS/Common Core per the original brief.

| id | title | teks |
|----|-------|------|
| `ms8-1-linear-equations` | Linear Equations | 8.EE.C.7 |
| `ms8-2-functions` | Functions | 8.F.A |
| `ms8-3-systems` | Systems of Equations | 8.EE.C.8 |
| `ms8-4-pythagorean` | Pythagorean Theorem | 8.G.B |
| `ms8-5-transformations` | Transformations | 8.G.A |
| `ms8-6-scientific-notation` | Scientific Notation | 8.EE.A.3 · 8.EE.A.4 |
| `ms8-7-volume` | Volume of Cylinders, Cones & Spheres | 8.G.C.9 |
| `ms8-8-scatter-plots` | Scatter Plots | 8.SP.A |

## New files (for reference)

- `src/lib/factories/MiddleSchoolTypes.ts` — `Grade6Problem`/`Grade7Problem`/`Grade8Problem`
  (`type: "MS.6"/"MS.7"/"MS.8"`), lesson subtype unions, `MiddleSchoolSVGParams`
  (number line, coordinate grid, spinner, geometry figure, scatter plot)
- `src/lib/factories/MiddleSchoolUtils.ts` — gcd/lcm, fraction helpers, rounding/formatting, seeded picks
- `src/lib/factories/MiddleSchoolGrade6.ts` — 58 makers, 17 lessons (SAVVAS T1–T7)
- `src/lib/factories/MiddleSchoolGrade7.ts` — 75 makers, 31 lessons (Pearson T1–T7 + Step-up)
- `src/lib/factories/MiddleSchoolGrade8.ts` — 31 makers, 8 lessons (TEKS/Common Core)
- `src/modules/middle-school.ts` — the 56 `CurriculumEntry` blocks + `MIDDLE_SCHOOL_ENTRIES`
- `src/components/problem-cards/MiddleSchoolGrade6Card.tsx`, `MiddleSchoolGrade7Card.tsx`, `MiddleSchoolGrade8Card.tsx`
- `src/components/diagrams/MiddleSchoolDiagrams.tsx` — web SVG renderers
- `src/components/diagrams/PdfMiddleSchoolDiagrams.tsx` — @react-pdf SVG renderers (`PdfMiddleSchoolDiagram`)

Open question for the coordinator: TEKS codes for grades 6/7 use Common Core
codes (6.NS, 7.RP, …) plus TEKS 6.14/7.13 for the financial-literacy units —
the scope doc provides no TEKS codes for 6/7. Confirm whether to keep these or
map to TEKS 6.x/7.x.
