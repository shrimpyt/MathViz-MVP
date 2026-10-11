# SAT Registry Snippet

Exact `CurriculumEntry` blocks for the SAT Math Practice Generator, grouped by
College Board domain. These live in `src/modules/sat-math.ts` as
`SAT_MATH_REGISTRY` (built data-driven from `SAT_CATALOG` + one full-module
entry). No placeholder ids were replaced — all 17 ids are new.

## Merge

```ts
// src/modules/CurriculumRegistry.ts (shared-file change — see WIRING.md)
import { SAT_MATH_REGISTRY } from "./sat-math";

export const CURRICULUM_REGISTRY: CurriculumEntry[] = [
  ...CURRICULUM_REGISTRY_BASE, // existing entries
  ...SAT_MATH_REGISTRY,        // SAT entries below
];
```

Topic numbers 20–24 are new (existing curriculum uses 1–15).

## Imports used by `src/modules/sat-math.ts`

```ts
import type { CurriculumEntry } from "./CurriculumRegistry";
import { mulberry32 } from "@/lib/math-utils";
import type { MathProblem, OutputMode } from "@/lib/ProblemFactory";
import type { RNG } from "@/lib/math-utils";
import type { SATDifficulty, SATDomain, SATProblem } from "@/lib/satTypes";
import {
  SAT_TIMING_PRESETS,
  satCustomPreset,
  buildSATModule,
  SAT_DOMAIN_META,
} from "@/lib/satTypes";
import { SAT_HOA_MAKERS } from "@/lib/factories/SATHeartOfAlgebra";
import { SAT_PSDA_MAKERS } from "@/lib/factories/SATProblemSolvingData";
import { SAT_PAM_MAKERS } from "@/lib/factories/SATPassportAdvancedMath";
import { SAT_ATM_MAKERS } from "@/lib/factories/SATAdditionalTopics";
import type { SATMaker } from "@/lib/factories/SATShared";
```

## Entry shape (identical for all 16 skill entries)

Each skill entry below expands to exactly this (shown for `sat-hoa-linear-equations`):

```ts
{
  id: "sat-hoa-linear-equations",
  topic: 21,
  topicTitle: "SAT Math: Heart of Algebra",
  title: "SAT: Linear Equations in One Variable",
  story: "Solve ax + b = c — the most-tested SAT algebra skill.",
  teks: "H.A.1",
  description: "One- and two-step linear equations, including a(x + b) = c forms.",
  generate: (mode: OutputMode, seed: number, options?: GenerateOptions): MathProblem[] => {
    const rng: RNG = mulberry32(seed);
    const count = options?.count ?? 5;
    const difficulty = options?.difficulty ?? 2;
    return Array.from({ length: count }, () =>
      SAT_HOA_MAKERS[0](rng, difficulty)
    ) as unknown as MathProblem[];
  },
}
```

The `as unknown as MathProblem[]` cast is temporary — it disappears once
`SATProblem` is added to the `MathProblem` union (see WIRING.md). The `mode`
parameter is intentionally ignored: SAT problems carry their own MCQ/grid-in
format per problem (~3:1 mix, like the digital SAT), so `GuidedNote`,
`Review`, `Test`, and `Classical` all produce identical output.

## Domain 1 — Heart of Algebra (topic 21, `topicTitle: "SAT Math: Heart of Algebra"`)

| id | title | teks | maker |
| -- | ----- | ---- | ----- |
| `sat-hoa-linear-equations` | SAT: Linear Equations in One Variable | H.A.1 | `SAT_HOA_MAKERS[0]` |
| `sat-hoa-systems` | SAT: Systems of Two Linear Equations | H.A.3 | `SAT_HOA_MAKERS[1]` |
| `sat-hoa-inequalities` | SAT: Linear Inequalities | H.A.2 | `SAT_HOA_MAKERS[2]` |
| `sat-hoa-functions` | SAT: Linear Functions | H.A.4 | `SAT_HOA_MAKERS[3]` |

Stories / descriptions:

- `sat-hoa-linear-equations` — story: "Solve ax + b = c — the most-tested SAT algebra skill." / description: "One- and two-step linear equations, including a(x + b) = c forms."
- `sat-hoa-systems` — story: "Elimination and substitution under timed conditions." / description: "Solve 2×2 systems; answer for x, y, or x + y."
- `sat-hoa-inequalities` — story: "Remember to flip the sign — the classic trap." / description: "One-variable inequalities, including negative leading coefficients."
- `sat-hoa-functions` — story: "Evaluate f(x) = mx + b and invert it." / description: "Function evaluation, solving f(x) = v, and rate word problems."

## Domain 2 — Problem Solving & Data Analysis (topic 22, `topicTitle: "SAT Math: Problem Solving & Data Analysis"`)

| id | title | teks | maker |
| -- | ----- | ---- | ----- |
| `sat-psda-percent` | SAT: Percent Increase & Decrease | P.D.1 | `SAT_PSDA_MAKERS[0]` |
| `sat-psda-ratios` | SAT: Ratios & Proportions | P.D.2 | `SAT_PSDA_MAKERS[1]` |
| `sat-psda-stats` | SAT: Mean, Median & Range | P.D.5 | `SAT_PSDA_MAKERS[2]` |
| `sat-psda-probability` | SAT: Probability | P.D.4 | `SAT_PSDA_MAKERS[3]` |

Stories / descriptions:

- `sat-psda-percent` — story: "Percent change with the right base — every time." / description: "Percent increase and decrease from real-world contexts."
- `sat-psda-ratios` — story: "Set it up, cross-multiply, solve." / description: "Proportions, unit rates, and map-scale problems."
- `sat-psda-stats` — story: "Sort first, then find the middle." / description: "One-variable statistics from small data sets."
- `sat-psda-probability` — story: "Favorable over total — read the table carefully." / description: "Simple and two-way-table probability, including complements."

## Domain 3 — Passport to Advanced Math (topic 23, `topicTitle: "SAT Math: Passport to Advanced Math"`)

| id | title | teks | maker |
| -- | ----- | ---- | ----- |
| `sat-pam-quadratics` | SAT: Quadratic Equations | P.A.2 | `SAT_PAM_MAKERS[0]` |
| `sat-pam-expressions` | SAT: Equivalent Expressions | P.A.1 | `SAT_PAM_MAKERS[1]` |
| `sat-pam-functions` | SAT: Nonlinear Functions | P.A.4 | `SAT_PAM_MAKERS[2]` |
| `sat-pam-nonlinear-equations` | SAT: Nonlinear Equations | P.A.3 | `SAT_PAM_MAKERS[3]` |

Stories / descriptions:

- `sat-pam-quadratics` — story: "Factor it, then read what they actually asked for." / description: "Integer-root quadratics: greater solution, sum, or product of solutions."
- `sat-pam-expressions` — story: "FOIL without the sign errors." / description: "Expand binomial products; identify coefficients and constants."
- `sat-pam-functions` — story: "x² means x times x — not 2x." / description: "Evaluate quadratic functions, including negative inputs."
- `sat-pam-nonlinear-equations` — story: "Square roots come in pairs — pick the right one." / description: "Equations of the form x² = k and (x − h)² + c = k + c."

## Domain 4 — Additional Topics in Math (topic 24, `topicTitle: "SAT Math: Additional Topics in Math"`)

| id | title | teks | maker |
| -- | ----- | ---- | ----- |
| `sat-atm-triangles` | SAT: Triangle Angles | A.T.1 | `SAT_ATM_MAKERS[0]` |
| `sat-atm-circles` | SAT: Circle Measurement | A.T.2 | `SAT_ATM_MAKERS[1]` |
| `sat-atm-trig` | SAT: Right-Triangle Trigonometry | A.T.3 | `SAT_ATM_MAKERS[2]` |
| `sat-atm-volume` | SAT: Volume | A.T.2 | `SAT_ATM_MAKERS[3]` |

Stories / descriptions:

- `sat-atm-triangles` — story: "180° to split three ways." / description: "Angle sums and isosceles triangle angles."
- `sat-atm-circles` — story: "2πr around, πr² inside — don't mix them up." / description: "Circumference, area, and working backwards from each."
- `sat-atm-trig` — story: "SOH CAH TOA with the sides labeled." / description: "Sine, cosine, and tangent from side lengths."
- `sat-atm-volume` — story: "Multiply — don't add — the dimensions." / description: "Rectangular prisms (forwards and backwards) and cylinders."

## Full timed module (topic 20, `topicTitle: "SAT Math: Full Practice Module"`)

```ts
{
  id: "sat-full-module",
  topic: 20,
  topicTitle: "SAT Math: Full Practice Module",
  title: "SAT: Full Timed Module",
  story: "One complete digital-SAT math module — 22 questions, 35 minutes.",
  teks: "SAT Math",
  description:
    "Mixed-domain timed module (Heart of Algebra, Problem Solving & Data Analysis, " +
    "Passport to Advanced Math, Additional Topics), ordered easy to hard like the real test.",
  generate: (mode: OutputMode, seed: number, options?: GenerateOptions): MathProblem[] => {
    const count = options?.count ?? SAT_TIMING_PRESETS["full-module"].questions; // 22
    const preset =
      count === SAT_TIMING_PRESETS["full-module"].questions
        ? SAT_TIMING_PRESETS["full-module"]
        : satCustomPreset(count); // minutes scale at 35/22 pacing
    const { problems } = buildSATModule({ preset, seed });
    return problems as unknown as MathProblem[];
  },
}
```

Timing presets (in `src/lib/satTypes.ts`):

| Preset id | Questions | Minutes |
| --------- | --------- | ------- |
| `full-module` | 22 | 35 |
| `half-module` | 11 | 18 |
| `quick-drill` | 6 | 10 |
| `custom` | n (via `satCustomPreset(n)`) | `ceil(n × 35/22)` |

## Replaced placeholder ids

None. All 17 ids are new; no existing registry entries were touched.
