# TESTING.md — Test Structure & Practices

## Current State

**No automated tests exist.** There are no test files, no test runner configured (`jest`, `vitest`, `playwright`, etc.), and no test scripts in `package.json`.

```json
"scripts": {
  "dev":   "next dev",
  "build": "next build",
  "start": "next start",
  "lint":  "eslint"
}
```

Manual testing is the only current verification method — running `npm run dev` and visually inspecting the UI.

## What Can Be Tested (Recommended Surface)

### 1. Unit Tests — `src/lib/ProblemFactory.ts`

The `ProblemFactory` class is a **pure function** with deterministic seeded output — ideal for unit testing.

**Test candidates:**
- `generateCircle(n)` — returns exactly `n` problems of type `G.12A`
- `generateProbability(n)` — returns exactly `n` problems of type `G.13B`
- `generateForMode("GuidedNote")` — returns 3 circle + 2 probability = 5 problems
- `generateForMode("Review")` — returns 9 circle + 6 probability = 15 problems
- Math correctness: `inscribedAngle === interceptedArc / 2`
- Math correctness: probability `answer === innerR² / outerR²`
- Seed reproducibility: same seed → same problem sequence

**Recommended tool:** **Vitest** (works natively with Next.js/Vite ecosystem, no config overhead).

```bash
npm install -D vitest @vitest/coverage-v8
```

Example test shape:
```typescript
import { ProblemFactory } from '@/lib/ProblemFactory';

test('generateCircle returns correct count', () => {
  const factory = new ProblemFactory(42);
  const problems = factory.generateCircle(5);
  expect(problems).toHaveLength(5);
  expect(problems.every(p => p.type === 'G.12A')).toBe(true);
});

test('inscribed angle = half intercepted arc', () => {
  const factory = new ProblemFactory(42);
  const [p] = factory.generateCircle(1).filter(p => p.subtype === 'InscribedAngle');
  if (p) expect(p.answer).toBe(p.given.interceptedArc / 2);
});
```

### 2. Unit Tests — `src/modules/`

Each module (`anatomy-of-a-circle.ts`, `target-zone.ts`, `logic-of-congruence.ts`) should be testable in isolation:
- `AnatomyOfACircle.generateMany(count, rng)` → returns `count` problems
- `TargetZone.generateMany(count, rng)` → correct probability calculations
- `LogicOfCongruence.generateMany(count, rng)` → valid congruence subtypes

### 3. Component Tests — `MathVizEngine`

Testing rendering behavior using **React Testing Library**:
- Renders the correct number of problem cards
- Shows "Reveal Answers" button only in `GuidedNote` mode
- Blanks are visible in `GuidedNote` and `Test` mode; answers visible in `Review` mode

**Recommended tool:** `@testing-library/react` + `jsdom`.

### 4. E2E Tests — Full Worksheet Flow

**Recommended tool:** **Playwright**

Key flows to cover:
- Select a module → mode → observe preview updates
- Change seed → observe different problems generated
- Click "Export to PDF" → file download initiates
- Toggle "Reveal Answers" in GuidedNote mode

## Why Tests Matter Here

The math domain (circle theorems, probability, congruence) has precise correct answers. A regression in `ProblemFactory` or a module could silently generate mathematically incorrect problems — which is a serious correctness risk for an educational tool.

**Priority**: Unit test `ProblemFactory` first. It is the highest-leverage, lowest-effort test target.

## CI Recommendation

When tests are added, a basic GitHub Actions workflow should run:
```yaml
- run: npm run lint
- run: npx vitest run
- run: npx playwright test  # once E2E tests exist
```
