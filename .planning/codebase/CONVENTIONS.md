# CONVENTIONS.md — Code Style & Patterns

## Language & Type Strictness

- **TypeScript strict mode** — `strict: true` in `tsconfig.json`.
- All function parameters and return types are explicitly typed.
- Union types (`MathProblem = CircleProblem | ProbabilityProblem | CongruenceProblem`) are narrowed with discriminant fields (`type: "G.12A"`, `type: "G.13B"`, `type: "G.6B"`, `kind: "InscribedAngle"`, etc.).
- Interfaces for object shapes; type aliases for unions and primitives.

```typescript
// Discriminated union pattern — used throughout
export type MathProblem = CircleProblem | ProbabilityProblem | CongruenceProblem;

// Narrowing at usage site
const circleProblems = problems.filter(
  (p): p is CircleProblem => p.type === "G.12A"
);
```

## Component Style

- **Functional components only** — No class components.
- `"use client"` directive at the top of all components that use hooks or browser APIs (`MathVizEngine.tsx`, `WorksheetGenerator.tsx`, `GeometrySVG.tsx`, `src/app/page.tsx`).
- Props are typed with inline interfaces:

```typescript
interface MathVizEngineProps {
  problems: MathProblem[];
  mode: OutputMode;
  title?: string;
}

export function MathVizEngine({ problems, mode, title = "Geometry" }: MathVizEngineProps) { ... }
```

- Default export for page-level components and `WorksheetGenerator`; **named exports** for all other components.

## File & Section Organization

Files are organized with comment banners (`// ── Section Name ───`), providing visual separation in large files. Example from `MathVizEngine.tsx`:

```typescript
// ── Constants ─────────────────────────────────────────────────────────────────
// ── Blank rendering ───────────────────────────────────────────────────────────
// ── Circle Problem Card ───────────────────────────────────────────────────────
// ── Main MathVizEngine component ──────────────────────────────────────────────
```

This convention should be maintained when adding new sections.

## Styling Approach — Two Co-existing Systems

### System 1: MUI `sx` prop (Shell/Chrome)
Used in `WorksheetGenerator.tsx` and `page.tsx` for application chrome.

```typescript
<Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#121416' }}>
```

- MUI `sx` accepts theme tokens or raw CSS values.
- Colors are hardcoded hex (`#121416`, `#66d9cc`) rather than MUI theme tokens in most places — this is inconsistent and could be improved.

### System 2: Tailwind CSS utility classes (Document Engine)
Used in `MathVizEngine.tsx` and `GeometrySVG.tsx` for the printable document.

```tsx
<div className="break-inside-avoid mb-5">
  <span className="font-serif font-bold text-base text-slate-800 mr-2">
```

- Tailwind v4 (CSS-first config).
- Some inline `style` props are used alongside Tailwind for values not expressible as utilities (e.g., `fontFamily`, `borderTop` multi-value).

### Why two systems?
The shell (MUI) and the document (Tailwind) have different design targets — dark-mode interactive UI vs. a print-accurate white document. This is intentional but must be kept cleanly separated.

## State Management Patterns

- **All state is local to `WorksheetGenerator.tsx`** — no global state.
- `useState` for mutable user-controlled values.
- `useMemo` for all derived computations (prevents recalculation on unrelated renders):

```typescript
const advancedProblems = useMemo<MathProblem[] | null>(() => {
  if (!activeLesson?.generateProblems) return null;
  return activeLesson.generateProblems(toOutputMode(docType), seed);
}, [activeLesson, docType, seed]);
```

- `useEffect` is used sparingly — only for `setMounted(true)` (to avoid SSR/hydration mismatch with PDF link) and auto-updating the document title.

## Randomness / Reproducibility

The app uses a **custom seeded PRNG (Mulberry32)** for deterministic problem generation.

```typescript
function mulberry32(seed: number) {
  return function () { /* ... */ };
}
```

Defined in both `src/lib/ProblemFactory.ts` and `src/modules/CurriculumRegistry.ts` (duplication — see CONCERNS.md). The seed is user-controlled via the "Problem Set Seed" input, enabling reproducible worksheets.

## SVG Conventions

- All SVG diagrams use a `200×200` viewBox with center at `(100, 100)` and main circle radius `R = 70`.
- Polar-to-Cartesian conversion via `polarToCart(cx, cy, r, angleDeg)` where 0° = top of circle.
- Accessibility: all SVG elements have `aria-label` attributes.

## Error Handling

- No explicit error boundaries or try/catch in UI code.
- TypeScript's type narrowing is the primary mechanism for preventing invalid states.
- If `getModule(id)` returns `undefined`, it is handled with optional chaining at call sites.
