---
paths:
  - "src/lib/factories/**/*.ts"
  - "src/modules/**/*.ts"
  - "src/lib/ProblemFactory.ts"
  - "src/lib/math-utils.ts"
---
# Generator rules
- Generators take the seeded RNG (`mulberry32` from `src/lib/math-utils.ts`)
  and return `MathProblem[]`. Never call `Math.random`; the same seed must
  give the same worksheet.
- No JSX, styling or text cleanup here. Formatting belongs to the renderers.
- Difficulty tiers change which problems exist, so they live here.
- A new lesson is not live until it has an entry in
  `src/modules/CurriculumRegistry.ts`. Run `npx tsx tests/smoke.ts` after
  touching the registry.
- Then run that area's suite (see CLAUDE.md, "Which tests to run").
