# ARCHITECTURE.md — System Design & Patterns

## Pattern: Domain-Driven Factory + Component Rendering Pipeline

Euclid is structured as a **pure transformation pipeline**: curriculum data → problem generation → rendering → output (screen or PDF). There is no global state manager, no API layer, and no database.

```
[Curriculum Registry]
        ↓
  [Problem Factory]         ← seeded PRNG, generates MathProblem[]
        ↓
[WorksheetGenerator UI]     ← state orchestrator (useState, useMemo)
        ↓                                ↓
[EuclidEngine (Web)]          [PdfDocument (PDF)]
        ↓                                ↓
[GeometrySVG (SVG)]         [@react-pdf/renderer]
```

## Layers

### 1. Data / Domain Layer (`src/data/`, `src/modules/`, `src/lib/`)

- **`src/data/geometryCurriculum.ts`** — Static curriculum config. Defines `StoryModule[]` with `Lesson[]`. Each lesson has `generateQuestions()` (basic) and optionally `generateProblems()` (advanced, used by EuclidEngine).
- **`src/lib/ProblemFactory.ts`** — Core math logic. Contains:
  - All TypeScript interfaces for problem types: `CircleProblem`, `ProbabilityProblem`, `CongruenceProblem`, `MathProblem`.
  - All SVG parameter interfaces.
  - Mulberry32 PRNG (`mulberry32`, `randInt`, `pick`).
  - `ProblemFactory` class with `generateCircle(n)`, `generateProbability(n)`, `generateForMode(mode)`.
- **`src/modules/`** — Domain modules, one per TEKS standard:
  - `anatomy-of-a-circle.ts` → G.12(A) circle theorem problems
  - `target-zone.ts` → G.13(B) area-based probability problems
  - `logic-of-congruence.ts` → G.6(B) triangle congruence problems
  - `BaseGeometryModule.ts` → Shared base class / utilities
  - `CurriculumRegistry.ts` → Registry mapping module IDs to generators and metadata

### 2. UI / Orchestration Layer (`src/app/`, `src/components/WorksheetGenerator.tsx`)

- **`src/app/page.tsx`** — Entry point. Wraps `WorksheetGenerator` in an MUI `ThemeProvider` with a dark theme.
- **`src/components/WorksheetGenerator.tsx`** — The single stateful orchestrator component. Holds all UI state: `docType`, `selectedStoryModuleId`, `selectedLessonId`, `title`, `numQuestions`, `difficulty`, `seed`, `mounted`.
  - Uses `useMemo` to compute `advancedProblems` and `questions` reactively.
  - Decides whether to use `EuclidEngine` (for TEKS modules with `generateProblems`) or a basic `Paper` preview fallback.

### 3. Rendering Layer (`src/components/EuclidEngine.tsx`, `src/components/GeometrySVG.tsx`)

- **`src/components/EuclidEngine.tsx`** — Takes `problems: MathProblem[]`, `mode: OutputMode`, `title: string`. Renders a simulated US Letter (8.5" × 11") print document to the screen. Contains sub-components: `Blank`, `StepBlock`, `TEKSBadge`, `DiagramBox`, `CircleProblemCard`, `ProbabilityProblemCard`, `CongruenceProblemCard`, `DocumentHeader`, `SectionDivider`.
- **`src/components/GeometrySVG.tsx`** — Pure SVG renderer. Exports `GeometrySVG` as a dispatch switch component routing to specialist SVGs: `InscribedAngleSVG`, `CentralAngleSVG`, `TangentSVG`, `TwoChordsSVG`, `TwoSecantsSVG`, `ConcentricCirclesSVG`, `ShadedSectorSVG`, `CongruenceSVG`. All use a `200×200` SVG viewBox.

### 4. Export Layer (`src/components/PdfDocument.tsx`)

- **`src/components/PdfDocument.tsx`** — React-PDF document. Receives `title`, `questions`, `docType`, `standard`. Renders a printable PDF using `@react-pdf/renderer` primitives. Initiated via `PDFDownloadLink` in `WorksheetGenerator`.

## Key Data Flows

### Screen Preview Flow (Advanced)
```
geometryCurriculum (data) 
  → lesson.generateProblems(mode, seed) 
  → MathProblem[] 
  → EuclidEngine props
  → renders CircleProblemCard | ProbabilityProblemCard | CongruenceProblemCard 
  → GeometrySVG (SVG diagrams)
```

### Screen Preview Flow (Basic Fallback)
```
geometryCurriculum (data) 
  → lesson.generateQuestions(n, docType) 
  → Question[] 
  → Basic Paper component renders text + WebDiagram SVG
```

### PDF Export Flow
```
Question[] → PdfDocument (@react-pdf) → PDFDownloadLink → File download
```

## State Management

Pure React local state in `WorksheetGenerator.tsx`. No Context, no Redux, no Zustand. All derived values computed with `useMemo`.

## Output Modes

`OutputMode` (from `ProblemFactory`) maps to document styles:

| OutputMode | Blanks | Steps | Answer Key |
|---|---|---|---|
| `GuidedNote` | Labeled hints, reveal button | All steps | Toggle reveal |
| `Review` | Answers shown inline | All steps | Always visible |
| `Test` | Blank rules only | No step hints | Hidden |

## Entry Points

- **Web App**: `src/app/page.tsx` → `WorksheetGenerator` → `EuclidEngine`
- **PDF**: `src/components/PdfDocument.tsx` (consumed by `PDFDownloadLink` in `WorksheetGenerator`)
- **Renderer (legacy)**: `src/renderer.ts` — appears to be a development utility, unused in the App Router flow.
