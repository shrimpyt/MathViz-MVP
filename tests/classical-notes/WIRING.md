# Classical Notes — Wiring Instructions for the Coordinator

All classical-notes source files are complete and tested (1800/1800 checks,
`tests/classical-notes/TEST_REPORT.md`). The following shared-file changes are
still needed to wire the mode into the app. **No classical worker file needs
editing** — these are all in existing files owned by other workers.

New files delivered (do not move them; tests import from these paths):

- `src/lib/classicalDefinitions.ts` — `CLASSICAL_DEFINITIONS` /
  `getClassicalDefinitions(entryId)`, keyed by registry entry id.
- `src/lib/classicalPrompts.ts` — `CLASSICAL_MARGIN_PROMPTS`,
  `assignMarginPrompts(seed, count)`, `GENERIC_MARGIN_PROMPT`.
- `src/components/problem-cards/ClassicalNotesCard.tsx` — web renderer.
  **Import it directly** (`./problem-cards/ClassicalNotesCard`); it was
  deliberately NOT added to the `problem-cards/index.ts` barrel.
- `src/components/ClassicalNotesPdf.tsx` — PDF renderer. Exports
  `ClassicalNotesPdfSection` (embeddable), `ClassicalNotesPdfDocument`
  (standalone), and `formatClassicalKeyLine` (answer key reveals reasons).

## 1. `toOutputMode` mapping — `src/components/WorksheetGenerator.tsx`

In `toOutputMode` (currently ~line 44), add:

```ts
if (docType === 'classical-notes') return 'Classical';
```

In `modeWord` (~line 51), add:

```ts
if (docType === 'classical-notes') return 'Classical Notes';
```

Generation then flows automatically: `mod.generate(toOutputMode(docType), seed +
i * 7919, { count, difficulty })` already passes the mode through, and
factories treat `"Classical"` like `"Review"` (verified: Classical and Review
output are byte-identical for the same seed — see test group B).

## 2. UI toggle — `src/components/WorksheetGenerator.tsx`

- Add a `ToggleButton` with `value="classical-notes"` to the Document Mode
  `ToggleButtonGroup` (~line 348). Suggested tooltip: "Structure given,
  reasoning yours — definitions printed in full, reasons blanked".
- Draft-load validation (~line 231): add `'classical-notes'` to the allowed
  `d.docType` list so saved classical drafts restore.

## 3. Card routing — `src/components/EuclidEngine.tsx`

Classical rendering is **per registry entry** (one definitions block + one
narration box per topic), but `EuclidEngine` currently receives a flat
`problems: MathProblem[]` with no entry ids. Recommended approach:

- In `WorksheetGenerator`, when `docType === 'classical-notes'`, build
  per-entry groups alongside `advancedProblems` (it already has
  `selectedModules` with `id`, `title`, `teks` — no new data plumbing needed):

  ```ts
  const classicalGroups = selectedModules.map((mod, i) => ({
    entryId: mod.id,
    title: mod.title,
    teks: mod.teks.split(' · ')[0],
    problems: /* the slice of advancedProblems generated for mod i */,
  }));
  ```

  The cleanest slice: generate per-module arrays first (as today via
  `flatMap`), then chunk them back per module in order.
- Pass `classicalGroups` to `EuclidEngine` as a new optional prop. When
  `mode === 'Classical'` and groups are present, EuclidEngine renders one
  `<ClassicalNotesCard>` per group instead of the per-type card sections:

  ```tsx
  import { ClassicalNotesCard } from "./problem-cards/ClassicalNotesCard";
  // ...
  {mode === "Classical" && classicalGroups?.map((g, gi) => (
    <ClassicalNotesCard
      key={g.entryId}
      entryId={g.entryId}
      problems={g.problems}
      mode={mode}
      seed={seed /* the worksheet seed, so prompts match the PDF */}
      startIndex={/* running total of previous groups' problem counts */}
      sectionLabel={g.title}
      teksBadge={g.teks}
    />
  ))}
  ```

  `EuclidEngine` will need the worksheet `seed` as a new optional prop for
  this (margin-prompt rotation must match the PDF export for the same seed).
- Keep the existing `DocumentHeader` and footer; the card renders its own
  section header, definitions, problems, narration, and error log.

## 4. PDF section routing — `src/components/PdfDocument.tsx`

- When `docType === 'classical-notes'`, bypass the standard
  `renderProblem`/scaffold/answer-line path and render one
  `<ClassicalNotesPdfSection>` per entry group (same grouping as the web
  preview — pass the groups via a new optional prop, e.g.
  `classicalGroups`):

  ```tsx
  import { ClassicalNotesPdfSection, formatClassicalKeyLine } from "./ClassicalNotesPdf";
  // ...
  {docType === 'classical-notes'
    ? classicalGroups?.map((g) => (
        <ClassicalNotesPdfSection
          key={g.entryId}
          entryId={g.entryId}
          problems={g.problems}
          seed={seed /* worksheet seed */}
          startIndex={/* running total */}
          sectionLabel={g.title}
          teksBadge={g.teks}
        />
      ))
    : /* existing numberedSections rendering */}
  ```

- Mode label: extend the `modeLabel` mapping with
  `docType === 'classical-notes' ? 'Classical Notes'`.
- Directions box: add a classical-notes directions block (suggested text:
  "Study each demonstration step. Write the missing reason on each ruled
  line, answer the margin questions, then narrate the idea in your own
  words.").
- Answer key: for classical mode the key must reveal the reasons — use
  `formatClassicalKeyLine(problem)` (exported from `ClassicalNotesPdf.tsx`)
  instead of `formatAnswer(problem)` in the key rows.
- `PdfDocument` needs the worksheet seed for prompt rotation; add an
  optional `seed` prop (default 1) and thread it from `WorksheetGenerator`'s
  `PDFDownloadLink`.

## 5. Registry change (`definitions?: string[]` on `CurriculumEntry`)

**Not needed.** Definitions live in the keyed data file
`src/lib/classicalDefinitions.ts` (`Record<entryId, string[]>`), looked up at
render time. `CurriculumRegistry.ts` is untouched. See
`tests/classical-notes/REGISTRY_SNIPPET.md`.

## Design decisions the coordinator should preserve

- **Blanks render Review-style** (answers visible as chips); only the
  *reason* is blanked. Generation treats Classical like Review, and the
  mode's pedagogy is "reasoning is the student's work, computation is shown".
- **Final answer shown** per problem (Review-like), via `formatAnswer`.
- **Margin prompts are seeded** (`assignMarginPrompts(seed, totalSteps)`) —
  web preview and PDF assign *identical* prompts for the same worksheet seed
  (test group H asserts this). Don't re-seed per problem or the two outputs
  diverge.
- **Steps without `reason`** render normally; the reason slot shows the
  generic prompt ("What is this step doing — and what justifies it?") instead
  of a blank line. Every step still gets a rotated bank prompt alongside.
- No `reason` text ever reaches the student worksheet (asserted in test
  groups E and H); reasons are only revealed via `formatClassicalKeyLine`
  in the teacher answer key.
