<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Architecture: generation and rendering are separate

The pipeline is strictly **generate → `MathProblem[]` → render**. Keep it that way:

- **Generation** (`src/lib/factories/*`, `src/modules/CurriculumRegistry.ts`):
  pure data in, pure data out. Seeded (`mulberry32`), deterministic, no JSX,
  no styling, no text-formatting decisions. Difficulty tiers live here because
  they change *which* problems exist.
- **Rendering** (`src/components/EuclidEngine.tsx` + `problem-cards/` for the
  web preview, `src/components/PdfDocument.tsx` + `problemToQuestion()` for
  print): takes a `MathProblem[]` and presents it. All text cleanup
  (`latexToText`, `pdfSafeText` in `src/lib/answerKey.ts`) lives on this side.
- The seam is the problem list. A future IEP-accommodation system (filtering
  to a subset, large print, extra whitespace, simplified directions) must be
  implemented as transforms on `MathProblem[]` or in the renderers — never by
  reaching into the factories.

## PDF text-extraction gotcha (learned Oct 2026)
When verifying PDF bytes, never merge ToUnicode CMaps across subset fonts —
different subsets reuse the same small glyph codes, so a merged map silently
clobbers entries (e.g. bold "Y" overwriting regular codes). Decode per-font:
track /F<n> Tf operators per page, keep one ToUnicode map per font, and handle
WinAnsi single-byte vs Identity-H two-byte encodings separately. A "missing"
string in naive extraction does not mean the content is missing — check with a
reference extractor (pdftotext) before calling it a product bug.
