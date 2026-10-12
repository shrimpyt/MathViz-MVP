# TEST_REPORT.md — Geometry generators (18 placeholder entries)

## What was built

Real, seeded, deterministic generators for the 9 lessons and 9 chapter tests
that previously returned `placeholderGenerator` output. New problem type
`GeometryProblem` (mirrors the Algebra2Problem pattern): `prompt`, `given`,
`find`, `answer`, `steps` (every step has a `reason` + guided-notes blanks),
optional `svgParams`, and a `verify` bag of raw givens for independent
checking. Chapter tests are weighted shuffle-bags over the chapter's lesson
makers + test-only makers, weighted toward the chapter's core theorems.

Files: 11 factory files + `GeometryTypes.ts` + `GeometryHelpers.ts` in
`src/lib/factories/`; `src/modules/geometry-lessons.ts`; web + PDF diagram
renderers (10 new diagram kinds) in `src/components/diagrams/`. No existing
file was edited. Registry wiring is paste-ready in `REGISTRY_SNIPPET.md`;
shared-file changes in `WIRING.md`.

## Verification (all run 2026-10-12, this workspace)

- `npx tsx tests/geometry/verify.ts` — **23,383 assertions passed, 0 failed.**
  Matrix: 18 entries × difficulties 1–3 × 5 seeds × 12 problems = 3,240
  problems. Per problem: prompt/answer present, ≥2 steps, a reason on EVERY
  step, ≥1 blank, subtype declared for the entry, determinism (same inputs →
  byte-identical JSON), default counts by mode, and **independent answer
  verification** — checker code recomputes the expected answer from the raw
  `verify` givens with its own math for every numeric subtype, and
  re-evaluates conjectures at the witness for every counterexample subtype.
- `npx tsx tests/geometry/fuzz.ts` — **75,600 problems, 0 bad.** 300 seeds ×
  18 entries at difficulty 3: no throws, counts exact, no NaN/undefined
  leakage, all GridFigure coordinates inside the −8..8 grid. (The fuzz caught
  and we fixed: off-grid slope points, off-grid k=3 dilation images, and a
  potentially negative "missing interior angle" construction.)
- `npx tsx tests/geometry/pdf-check.tsx` — **5/5 sample PDFs OK**
  (3 lessons: ch5-1, ch8-1, ch12-1; 2 tests: ch3-test, ch14-test). Rendered
  through @react-pdf with DejaVu fonts; pdftotext extracts 6/6 prompts, the
  topic marker, and the answer key from every sample. PDFs in
  `/tmp/geometry-samples/`.
- `npx tsc --noEmit` — **clean repo-wide** at delivery (my files and
  concurrent agents' files). During the run, a transient error appeared in
  another agent's root-level `verify-classical-scoped.tsx` (SATProblem.steps);
  it is resolved in the current tree and was never in a file of mine.

## Checker gaps / notes for the integrator

- The stock classical-notes suite iterates the **registry**, which still
  points at placeholders until `REGISTRY_SNIPPET.md` is applied — so it cannot
  see these generators yet. The classical contract (steps with reasons) is
  asserted directly in `verify.ts` instead.
- No shared checker file needed changes: my checkers live in
  `tests/geometry/verify.ts` and validate every subtype these factories emit.
- Diagram fidelity notes: `SolidFigure` carries exact dims as edge labels +
  a caption; the `rectPrism` net is schematic (uniform panels, not to the
  specific prism's proportions). `AngleFigure`/`PatternFigure` are simple
  schematics by design.
