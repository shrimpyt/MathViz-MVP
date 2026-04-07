# STRUCTURE.md — Directory Layout & Organization

## Root Directory

```
/MathViz
├── src/                    ← All application source code
├── public/                 ← Static assets (favicon, etc.)
├── .planning/              ← GSD planning docs (this repo)
├── .git/                   ← Git history
├── .next/                  ← Next.js build output (gitignored)
├── node_modules/           ← Dependencies (gitignored)
├── package.json
├── tsconfig.json
├── next.config.ts
├── eslint.config.mjs
├── postcss.config.mjs
├── AGENTS.md               ← AI agent instructions for this project
├── CLAUDE.md               ← Claude-specific project notes
├── README.md
├── patch_renderer.js       ← One-off dev utility (legacy)
└── dev_output.log          ← Dev server log artifact (should be gitignored)
```

## Source Tree (`src/`)

```
src/
├── app/                    ← Next.js App Router
│   ├── layout.tsx          ← Root layout: fonts, html/body, Tailwind class setup
│   ├── page.tsx            ← Home page "/" — MUI ThemeProvider + WorksheetGenerator
│   ├── globals.css         ← Global CSS (Tailwind directives, base styles)
│   └── fonts/              ← Local font files
│       ├── geist-sans.woff2
│       └── geist-mono.woff2
│
├── core/
│   └── types.ts            ← Shared TypeScript interfaces
│                             (DocumentType, Question, Lesson, StoryModule, Curriculum, etc.)
│
├── lib/
│   └── ProblemFactory.ts   ← Core math engine
│                             Types: MathProblem, CircleProblem, ProbabilityProblem, CongruenceProblem
│                             SVG param interfaces
│                             Mulberry32 PRNG
│                             ProblemFactory class (generateCircle, generateProbability, generateForMode)
│
├── modules/                ← Domain-specific problem generators (one per TEKS standard)
│   ├── BaseGeometryModule.ts    ← Shared base class or utilities for modules
│   ├── CurriculumRegistry.ts   ← Registry: maps module IDs → generators + metadata
│   ├── anatomy-of-a-circle.ts  ← G.12(A): InscribedAngle, CentralAngle, Tangent, TwoChords, TwoSecants
│   ├── target-zone.ts          ← G.13(B): ConcentricCircles, ShadedSector
│   └── logic-of-congruence.ts  ← G.6(B): SSS, SAS, ASA, AAS, HL
│
├── data/
│   └── geometryCurriculum.ts   ← Static curriculum config: StoryModule[] with Lesson[]
│                                  Wraps CurriculumRegistry.ts into the legacy Question API
│
├── components/
│   ├── WorksheetGenerator.tsx  ← Main stateful orchestrator (698 lines)
│   │                             UI: MUI AppBar + Drawer (control panel) + main preview area
│   │                             State: docType, selectedModule, selectedLesson, title, seed, etc.
│   │                             Decides advanced (MathVizEngine) vs basic (Paper) preview
│   ├── MathVizEngine.tsx       ← Print document renderer (554 lines)
│   │                             Components: Blank, StepBlock, TEKSBadge, DiagramBox,
│   │                             CircleProblemCard, ProbabilityProblemCard, CongruenceProblemCard,
│   │                             DocumentHeader, SectionDivider, MathVizEngine (main)
│   ├── GeometrySVG.tsx         ← SVG geometry renderer (673 lines)
│   │                             8 specialist SVG components + GeometrySVG dispatch switch
│   ├── PdfDocument.tsx         ← @react-pdf/renderer PDF document template
│   └── KaTeX.tsx               ← KaTeX math rendering component wrapper
│
└── renderer.ts                 ← Legacy dev utility (not used in App Router flow)
```

## Key File Locations

| What | Where |
|---|---|
| Entry page | `src/app/page.tsx` |
| Root layout | `src/app/layout.tsx` |
| Global styles | `src/app/globals.css` |
| Core types | `src/core/types.ts` |
| Problem types + PRNG | `src/lib/ProblemFactory.ts` |
| Curriculum config | `src/data/geometryCurriculum.ts` |
| Module registry | `src/modules/CurriculumRegistry.ts` |
| UI controller | `src/components/WorksheetGenerator.tsx` |
| Print engine | `src/components/MathVizEngine.tsx` |
| SVG renderer | `src/components/GeometrySVG.tsx` |
| PDF template | `src/components/PdfDocument.tsx` |

## Naming Conventions

- **Files**: PascalCase for components (`MathVizEngine.tsx`), camelCase for utilities (`ProblemFactory.ts`), kebab-case for modules (`anatomy-of-a-circle.ts`)
- **Exports**: Named exports for components used outside the file (except default export for Next.js pages and `WorksheetGenerator.tsx`)
- **Types**: Interfaces for object shapes (`BlankField`, `ProblemStep`), type aliases for unions (`MathProblem`, `OutputMode`, `DocumentType`)
