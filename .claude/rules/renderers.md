---
paths:
  - "src/components/**/*.tsx"
  - "src/lib/answerKey.ts"
  - "src/core/types.ts"
---
# Renderer rules
- There are two renderers for every problem type: the web card in
  `src/components/problem-cards/` (plus a web diagram in
  `src/components/diagrams/`), and the print path in
  `src/components/PdfDocument.tsx` (with its `Pdf*` diagram). A visible
  change usually needs both.
- Text for print goes through `latexToText` / `pdfSafeText` in
  `src/lib/answerKey.ts`. Don't clean text up inside the factories.
- After a PDF change, run that area's PDF check (for example
  `tests/geometry/pdf-check.tsx`) and `npx tsx tests/printed-keys.ts`.
