# Calculus — CurriculumRegistry snippet

Canonical source: `src/modules/calculus.ts` (`CALCULUS_ENTRIES`). The entries
below are exact copies for paste-in review. Recommended integration: import
and spread (one line); the explicit blocks follow for reference.

## Recommended splice (in `src/modules/CurriculumRegistry.ts`)

```ts
import { CALCULUS_ENTRIES } from "./calculus";
```

Append to `CURRICULUM_REGISTRY`, after the Topic 15 entries:

```ts
  // ── Topic 21: AP Calculus ────────────────────────────────────────────────
  ...CALCULUS_ENTRIES,
```

## Replaced placeholder ids

None. All six entries are new (topic 21, ids `calc-*`). No existing
placeholder entry is replaced or removed.

## Exact entry blocks

```ts
// ── Topic 21: AP Calculus ────────────────────────────────────────────────
{
  id: "calc-limits",
  topic: 21,
  topicTitle: "Topic 21: AP Calculus AB",
  title: "Limits & Continuity",
  story: "Read limits from graphs, tables, and algebra — including one-sided and infinite limits.",
  teks: "AP Calculus AB",
  description: "Graphical, numerical, and algebraic limits: removable and jump discontinuities, one-sided limits, infinite limits, end behavior, and difference quotients.",
  generate: drillEntry(generateLimitProblems),
},
{
  id: "calc-derivative-rules",
  topic: 21,
  topicTitle: "Topic 21: AP Calculus AB",
  title: "Derivative Rules",
  story: "Differentiate anything the AP exam throws at you: power, product, quotient, chain, and trig.",
  teks: "AP Calculus AB",
  description: "Power rule, product and quotient rules, chain rule (polynomial, trig, exponential), and trig derivatives at special angles. Calculator-active and no-calculator flavors.",
  generate: drillEntry(generateDerivativeProblems),
},
{
  id: "calc-derivative-apps",
  topic: 21,
  topicTitle: "Topic 21: AP Calculus AB",
  title: "Applications of Derivatives",
  story: "Tangent lines, curve analysis, optimization, and related rates.",
  teks: "AP Calculus AB",
  description: "Tangent and normal lines, increasing/decreasing intervals, extrema, curve sketching, optimization, and related rates with AP justification language.",
  generate: drillEntry(generateDerivAppsProblems),
},
{
  id: "calc-integrals",
  topic: 21,
  topicTitle: "Topic 21: AP Calculus AB · BC",
  title: "Integrals & the Fundamental Theorem",
  story: "Accumulate: antiderivatives, definite integrals, area, FTC, u-substitution.",
  teks: "AP Calculus AB · BC",   // ← BC topics live here (improper integrals, bcOnly flag)
  description: "Indefinite and definite integrals, area between curves, the Fundamental Theorem of Calculus, u-substitution, and BC-only improper integrals.",
  generate: drillEntry(generateIntegralProblems),
},
{
  id: "calc-frq",
  topic: 21,
  topicTitle: "Topic 21: AP Calculus AB · BC",
  title: "AP-Style Free Response",
  story: "Full AP-style FRQs built around one stimulus: a graph, a table, or a scenario.",
  teks: "AP Calculus AB · BC",
  description: "Stimulus-based multi-part FRQs with AP justification language: f′ graphs (no calculator), rate tables (calculator active), and particle-motion scenarios.",
  generate: frqProblems,
},
{
  id: "calc-mcq-mixed",
  topic: 21,
  topicTitle: "Topic 21: AP Calculus AB · BC",
  title: "AP-Style Multiple Choice: Mixed Review",
  story: "Mixed AP-style multiple choice across every calculus topic.",
  teks: "AP Calculus AB · BC",
  description: "Five-choice AP-style questions cycling through limits, derivative rules, applications, and integrals, with calculator-active and no-calculator flavors flagged per question.",
  generate: mixedProblems,
},
```

## Mode / difficulty notes

- `generate(mode, seed, options)` — pure + seeded (`mulberry32(seed)`).
- `options.count` overrides; defaults: drills 9 (Review/Classical) or 3;
  FRQ 3 (Review/Classical) or 2; mixed follows drills.
- `options.difficulty` (1|2|3, default 2) filters makers cumulatively.
- **Classical** mode is treated exactly like **Review** (full worked steps;
  factories always emit full steps; cards map Classical → Review rendering).
- BC-only content: `ImproperIntegral` subtype at difficulty 3 of
  `calc-integrals`, flagged `bcOnly: true` on the problem and badged in cards.
