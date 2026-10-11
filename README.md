# Euclid Engine — Math Worksheet Generator

A web app for teachers to generate printable geometry worksheets, guided notes,
reviews, and tests — with clean diagrams and an answer key. Built for
[euclidengine.tech](https://euclidengine.tech).

**No AI, no API keys, no backend.** Every problem is generated locally by
seeded math factories, so the same seed always reproduces the same worksheet.

## What it does

- **Pick topic(s)** from the Texas TEKS geometry curriculum (right-triangle
  trigonometry, special right triangles, circle theorems, circle measurement,
  coordinate geometry, triangle congruence, geometric probability). Lessons
  without a generator yet are marked "Coming soon".
- **Choose a document mode**: Guided Notes (fill-in-the-blank scaffolding),
  Review (answers shown), Test (clean blanks), or Worksheet.
- **Set problems per topic** (1–25), **difficulty** (Easy / Medium / Hard), and
  a **seed** for reproducibility — or hit the dice button for a fresh set.
- **Live preview** of the printable page with SVG diagrams.
- **Export to PDF** (US Letter): title block, Name/Date/Period line, diagrams,
  and — optionally — a final **"ANSWER KEY — DO NOT DISTRIBUTE"** page.
- **Save / Load Draft**: download the current configuration as JSON and
  restore it later.

## Run it locally

Requires Node.js 18+.

```bash
cd euclid-worksheet
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other commands:

| Command          | What it does                              |
| ---------------- | ----------------------------------------- |
| `npm run dev`    | Start the dev server (hot reload)         |
| `npm run build`  | Production build (must pass before deploy)|
| `npm start`      | Serve the production build locally        |
| `npm run lint`   | Run ESLint                                |

## How it works

```
src/
  components/
    WorksheetGenerator.tsx   Control panel + preview page (main UI)
    EuclidEngine.tsx         Renders the worksheet preview (problem cards)
    PdfDocument.tsx          PDF export: problems, diagrams, answer key
    PdfGeometrySVG.tsx       SVG diagrams for the PDF renderer
    problem-cards/           Per-topic renderers (trig, circle, coordinate…)
  modules/
    CurriculumRegistry.ts    Topic catalogue → generator wiring
    anatomy-of-a-circle.ts   G.12(A) circle-theorem problems
    target-zone.ts           G.13(B) probability problems
    logic-of-congruence.ts   G.6(B) congruence problems
  lib/
    factories/               Trig, special triangles, coordinate, measurement
    answerKey.ts             LaTeX→unicode + per-problem answer formatting
    math-utils.ts            Seeded PRNG (mulberry32) — single source of truth
    types.ts                 Problem type definitions
  core/types.ts              DocumentType, problem→question text for the PDF
```

Problem generation is deterministic: `mulberry32(seed)` drives every factory,
so sharing a seed reproduces the exact worksheet. Each topic gets a seed
offset, so multi-topic sets don't repeat sequences.

The PDF embeds **DejaVu Serif** (`public/fonts/`) because the PDF standard
14 fonts only cover WinAnsi and would render math glyphs (√ θ π ∠) as wrong
characters.

## Deploy

The app is a standard Next.js app with no server-side dependencies at runtime
(the page prerenders to static content; PDFs are generated in the browser).
Deploy-ready: `npm run build` passes.

**Vercel** (recommended):

1. Push this folder to a GitHub repo.
2. Import it in Vercel — the defaults work (`npm run build`, `npm start`).
3. Done. No environment variables needed.

**Any Node host**: `npm run build && npm start` (serves on port 3000).

**Static export**: the app has no API routes, so `output: 'export'` in
`next.config.ts` also works if you prefer plain static hosting.

## Notes / known limits

- Some curriculum lessons are placeholders ("Coming soon") — only topics with
  real generators are selectable.
- `src/lib/AIService.ts` is unused; the core generator needs no AI.
- The congruence symbol ≅ prints as ≃ in PDFs (the embedded font lacks U+2245);
  the on-screen preview shows ≅ correctly.
