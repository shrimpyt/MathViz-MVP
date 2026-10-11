# IEP Accommodation Generator — Build Spec

**Status:** spec only (no code). Approved concept (Oct 10, 2026); Trystan's framing:
"They can create a presaved list of class accommodations, no names just number of
students with x accommodations and then it's an easy thing."

**Authoritative constraints (from the Oct 10 design agreement):**
- Teacher saves a **presaved, per-class accommodation list**: ANONYMOUS groups only —
  number of students per accommodation set (e.g. "3 students: large print + reduced
  choices"). No student names, ever. This sidesteps FERPA.
- Each worksheet generation outputs the **base version PLUS one version per
  accommodation group**, each with its own matching answer key.
- Accommodations change **PRESENTATION only, never the math content**. The
  deterministic algorithmic generator stays the source of truth for all math. AI may
  be used only as a **pre-computation / cache layer** for accommodation variants
  (e.g. simplified-language directions), never to originate questions.
- Codebase rule (`AGENTS.md`): the pipeline is strictly
  **generate → `MathProblem[]` → render**. An IEP-accommodation system "must be
  implemented as transforms on `MathProblem[]` or in the renderers — never by
  reaching into the factories."

---

## 1. Feature overview and user flow

**What it is:** a teacher creates a reusable, anonymous accommodation profile for a
class once. Every time they generate a worksheet, Euclid Engine produces the normal
(base) version **plus one adapted version per accommodation group**, each with its
own answer key, in a single export flow. Printing N copies per group (using the
stored student counts) covers the whole class.

**User flow:**

1. **Create class list (one time per class, editable anytime).** Teacher opens the
   Accommodations panel, names a class (e.g. "Algebra 2 — Period 3"; no student
   info), and adds groups: a label ("Group A"), a student count, and a set of
   accommodation flags from the catalog (§3). Example: Group A — 3 students —
   large print + reduced answer choices.
2. **Generate worksheet (as today).** Teacher picks topics, doc type, count,
   difficulty, seed exactly as now. The base problem set is generated once from the
   seed — this is the single source of truth for all versions.
3. **Versions appear.** A version selector (tabs: Base | Group A | Group B …)
   appears above the preview. Selecting a version re-renders the preview with that
   group's presentation transforms applied. Same math everywhere.
4. **Export.** One click produces a combined PDF: Base version + its answer key,
   then Group A version + its answer key, and so on, each section clearly labeled.
   (Alternative: separate per-version downloads — see §5.) Teacher prints copies per
   the stored student counts and hands them out offline.

**Non-goals:** no student data of any kind; no backend; no changes to math content,
difficulty, or problem selection; no AI-generated questions.

---

## 2. Data model — the anonymous class accommodation list

```ts
// New module: src/lib/accommodations/types.ts (pure types, no JSX)

type AccommodationId =
  | 'large-print' | 'sans-serif-font' | 'increased-spacing'
  | 'fewer-per-page' | 'reduced-choices' | 'simplified-directions'
  | 'read-aloud-script' | 'word-bank' | 'graphic-organizer';

interface AccommodationGroup {
  id: string;            // uuid, generated client-side
  label: string;         // teacher-facing, e.g. "Group A" — never a student name
  studentCount: number;  // e.g. 3 — the ONLY student data stored
  accommodations: AccommodationId[];
}

interface ClassAccommodationList {
  id: string;            // uuid
  classLabel: string;    // e.g. "Algebra 2 — Period 3". Free text; UI warns
                         // against entering anything student-identifying.
  groups: AccommodationGroup[];
  updatedAt: string;     // ISO timestamp
}
```

**Storage — localStorage (Phase 1).** Rationale, grounded in the codebase:

- The app is a **fully static export** (`next.config.ts` → `out/`); there is no
  backend, no auth, no database. Anything server-side is out of scope.
- The existing persistence pattern is client-side: drafts are JSON files the
  teacher downloads/loads (`DraftFile` in `WorksheetGenerator.tsx`). A class list
  needs to survive across sessions *without* a file round-trip, so `localStorage`
  under a namespaced key (e.g. `euclid.accommodationLists.v1`) is the right Phase 1
  home: zero new infrastructure, works offline, per-teacher-per-browser.
- **Phase 2** may add JSON export/import of class lists (same blob-download pattern
  as drafts) so a teacher can move a list between devices. Still no server.

**What is never stored:** student names, IDs, birthdates, IEP documents, or any
free-text field intended for a name. The group `label` is constrained in the UI to
short generic labels (placeholder "Group A"); the spec recommends a 24-character
limit and helper text: "Use anonymous labels only — never student names."

---

## 3. Catalog of presentation transforms

Every transform is one of two kinds:

- **Renderer-level (trivial):** pure style/layout change. No new problem data.
- **Transform-level (per-version regeneration):** needs a pass over `MathProblem[]`
  (or derived text) to produce version-specific content. Still never touches the
  factories and never changes the math.

Transforms compose **deterministically** in a fixed order: content transforms
first (`reduced-choices` → `simplified-directions` → `word-bank` collection),
then presentation (`sans-serif-font`, `large-print`, `increased-spacing`,
`fewer-per-page`, `graphic-organizer`, `read-aloud-script`).

| # | Accommodation (real sped mapping) | Kind | How it hooks in (grounded) |
|---|-----------------------------------|------|----------------------------|
| 1 | **Large print** (visual impairment / low vision) | Renderer | `PdfDocument` accepts an optional `presentation` prop with `fontScale` (e.g. 1.25). All text styles in the `StyleSheet.create` block (currently `WorksheetSerif`, sizes 9–20) are multiplied. Web preview: same factor via a wrapping `fontSize` multiplier on `EuclidEngine`. |
| 2 | **Sans-serif font option** (dyslexia-friendly formatting) | Renderer | PDF currently registers only `WorksheetSerif`/`WorksheetSerifBold` (`Font.register`, `PdfDocument.tsx:63`). Register a `WorksheetSans` family (web already bundles `geist-sans.woff2` in `src/app/fonts/` — reuse the file). `presentation.fontFamily: 'serif' \| 'sans'` swaps the family in styles. Trivial once registered. |
| 3 | **Increased spacing / white space** (visual tracking, ADHD, dysgraphia) | Renderer | `presentation.spacingScale` multiplies margins/padding/line-height in PDF styles and problem-card gaps in the web preview. No content change. |
| 4 | **Fewer problems per page** (chunking, anxiety, attention) | Renderer | `presentation.maxProblemsPerPage` (default e.g. 4). In `PdfDocument`, force a page break after every K rendered problems for that version. Deterministic pagination; content identical. |
| 5 | **Reduced answer choices on multiple choice** (reduced cognitive load) | Transform | Operates on `MathProblem[]` **before** `problemToQuestion()`. Applies only to problems carrying `options` (SAT 4-tuples in `src/lib/satTypes.ts`, `PRECALC_MCQ`, `CALC_MCQ`). Rule (deterministic, never drops the key): keep the keyed option + the first N distractors in original display order, re-letter sequentially (A–C for 3-choice). Non-MCQ problems are untouched. Because the answer key derives from the *transformed* problems (§4), the key automatically shows the correct re-lettered choice. |
| 6 | **Simplified direction language** (ELL, reading disability) | Transform | Rewrites **direction/presentation strings only** — never numbers, never the math. AI is permitted here strictly as a pre-computation/cache layer: `AIService.simplifyDirections(text)` (new method; the existing `AIService` stub in `src/lib/AIService.ts` is the hook point, currently backed by `NEXT_PUBLIC_OPENAI_API_KEY`), cached in a `Map` keyed by a hash of the source string so repeated generations are free and stable. Fallback when no API key: the transform is offered disabled with an explanatory notice — never a hand-rolled regex simplifier that could garble meaning. Applies to `Question.text` direction lines and the directions box; proof *statements* are out of scope in Phase 2 (risk of changing mathematical meaning). |
| 7 | **Read-aloud script inclusion** (read-aloud accommodation) | Renderer | Adds a **teacher-facing** page to the version: a verbatim script ("Read problem N aloud: …") built deterministically from the version's final problem texts via existing `latexToText`/`pdfSafeText` helpers (`src/lib/answerKey.ts`). Placement: first page of the version, watermarked/labeled "TEACHER COPY — do not distribute to students," or appended after that version's answer key (decide in design; spec recommends after the answer key so student pages stay contiguous). Template-based in Phase 1; AI-polished phrasing optional in Phase 2. |
| 8 | **Word bank / answer bank** (memory, processing) | Transform + renderer | Transform collects a deterministic term list from the version's `MathProblem[]` (from `find`/`given` fields via the existing `givenKeyName()` helper — e.g. "hypotenuse," "coefficient"). Renderer prints it as a boxed "Word Bank" at the top of the version. No AI in Phase 1 (pure extraction); Phase 2 may add AI-curated definitions behind the same cache layer. |
| 9 | **Graphic organizer overlays** (executive function) | Renderer | Appends or interleaves organizer pages/boxes for the version (e.g. blank 4-quadrant boxes, step ladders for multi-step problems). Pure layout; content-independent. Phase 2 (needs design assets). |

**What "presentation only" means, enforced:** no transform may alter numbers,
answer values, difficulty, problem count, or problem selection. The transform
module (`src/lib/accommodations/`) is pure functions on `MathProblem[]`, per
`AGENTS.md`. A test in `tests/` should assert: for every transform, the set of
correct answers before/after is identical (compare `formatAnswer` outputs).

---

## 4. Per-version answer key generation — how keys stay matched

**The invariant: an answer key is always derived from its version's final,
transformed problem list — never from the base version.**

This falls out of the existing architecture with no new key machinery:

- Today, `PdfDocument` builds `keyedItems` (numbered, in worksheet order) from the
  problems it actually renders, and formats each via `formatAnswer(p)`
  (`src/lib/answerKey.ts`). `showKey = includeAnswerKey && keyedItems.length > 0`.
- Each accommodated version is rendered as an **independent `<PdfDocument>`**
  instance receiving its own transformed `advancedProblems`. Its key therefore
  automatically reflects its own content: re-lettered choices (§3.5) show the
  correct letter among the reduced set; numbering restarts at 1 per version;
  simplified directions don't touch answers; spacing/pagination don't touch answers.
- Each version's key section gets a labeled header: "Answer Key — Group A
  (Large print, Reduced choices)". The base version's key is unchanged.

**No shared-key shortcut.** Even when a transform provably doesn't change answers
(e.g. large print), the key is still regenerated from the transformed list. This
removes an entire class of mismatch bugs by construction.

---

## 5. UI

### 5a. Class list manager — where it lives

New **"Accommodations" `PanelSection`** in the Control Panel drawer
(`WorksheetGenerator.tsx`), below Parameters. Contents:

- Class picker (Phase 1: single active class; Phase 2: multiple).
- Class label text field with helper text: "Anonymous groups only — never enter
  student names."
- Group rows: label field, student-count number input, accommodation checkboxes
  (from the §3 catalog, with plain-language descriptions, e.g. "Large print —
  bigger text for low vision").
- Add/remove group buttons. Everything persists to localStorage on change.

Follows existing drawer conventions (`PanelSection`, `paramFieldSx` dark inputs,
gold accents).

### 5b. Version preview / selection

- After generation, a **version tab strip** appears above the preview:
  `Base | Group A (3) | Group B (1)` — the parenthetical is the student count, a
  print-quantity hint.
- Selecting a tab re-renders the preview: `EuclidEngine` receives the transformed
  `MathProblem[]` plus presentation overrides (font scale/family/spacing) for
  approximate print parity. No new preview component — reuse `EuclidEngine`.
- The tab strip is hidden when the class list has no groups (zero-config default).

### 5c. Export — multiple versions

**Recommended: one combined PDF (default).**
`PDFDownloadLink` (`@react-pdf/renderer`, already used in `WorksheetGenerator.tsx`)
accepts a single `<Document>`. Build a wrapper document that renders, in order:
Base version `<PdfDocument>` + its key, then for each group its `<PdfDocument>`
(with `presentation` prop + transformed problems) + its key. Insert labeled
divider pages ("Group A — Large print · 3 students · print 3 copies") between
versions. One file, one download, teacher prints N copies per section using the
stored counts. File name: `{title}-accommodated.pdf`.

**Secondary: separate per-version downloads.** Render one `PDFDownloadLink` per
version (Base + each group) in the action bar. No zip library is currently
installed; separate buttons avoid adding one.

Each version's answer key **immediately follows its version** (never all keys at
the end) so a teacher handing out "Group A" can keep its key with it.

---

## 6. Edge cases

- **Overlapping accommodations in one group:** supported by design — groups hold a
  *set* of flags. Composition order is fixed (§3): content transforms first, then
  presentation. Example: `reduced-choices` + `large-print` + `increased-spacing`
  yields fewer, bigger, airier choices. Deterministic: same group + same seed =
  byte-identical output.
- **Group with zero students:** allowed (useful as a template). The version still
  generates; its divider page is marked "0 students — no copies needed." Teacher
  can delete the group. (Alternative considered: skip generation — rejected, because
  a zero today may be nonzero after the next IEP meeting; keeping the version costs
  nothing.)
- **Mid-year list changes:** the class list is independent of generated artifacts.
  Exported PDFs are **snapshots** — editing the list never retroactively changes a
  PDF. UI copy states: "Versions reflect your list at the time of generation."
  Changing a group and re-exporting produces a fresh, consistent set.
- **Reduced choices on non-MCQ content:** the transform is a no-op for problems
  without `options` (guided notes, proofs, free-response). The version still
  generates; other accommodations in the group still apply.
- **Proof/classical docTypes:** transforms apply uniformly (they sit above the
  docType layer). Restriction: `simplified-directions` does not rewrite proof
  statements or Elements enunciations in Phase 2 — directions boxes only — to
  avoid altering mathematical meaning.
- **Print vs. digital:** transforms are print-first (the PDF is the artifact of
  record). The web preview mirrors them approximately (font scale, spacing, choice
  counts) but pixel-parity is not guaranteed — document this in the UI.
- **Same seed, different lists:** two teachers (or two semesters) with the same
  seed but different accommodation groups get the same base math with different
  presentations — intended and correct.
- **Empty class list:** feature is invisible (no tabs, single-version export as
  today). Zero migration needed for existing users.

---

## 7. FERPA / privacy notes (why anonymous groups)

- **No student names, IDs, photos, birthdates, IEP documents, or disability
  labels are stored, displayed, or transmitted — by design, not just by policy.**
  The only per-group datum is an integer student count.
- **No backend exists** (static export). Data lives in the teacher's own browser
  (`localStorage`); nothing leaves the device. There is nothing to breach.
- **Physical handoff is offline:** the teacher prints N copies per group and
  distributes them; the mapping of copies to children happens entirely outside
  the app.
- **UI guardrails:** group labels are short generic placeholders ("Group A");
  helper text explicitly forbids names; no free-text field is labeled or
  positioned where a name would naturally go.
- **AI boundary reinforces privacy:** the AI cache layer (§3.6) processes only
  generic direction strings (e.g. "Solve for the missing side"), never student
  data — because no student data exists in the system to send.
- This design is what makes the feature shippable without a BAA, consent flow,
  or data-retention policy: there is no personal data to protect.

---

## 8. Phased build plan

### Phase 1 — minimal viable (class list + simplest transforms + multi-version export)

1. `src/lib/accommodations/` — types (`AccommodationId`, `AccommodationGroup`,
   `ClassAccommodationList`), `applyAccommodations(problems, profile)` with the
   fixed composition order, localStorage persistence helpers. Pure functions, no
   JSX (per `AGENTS.md`).
2. The four trivial renderer-level transforms: `large-print`, `sans-serif-font`
   (register `WorksheetSans` from the already-bundled `geist-sans.woff2`),
   `increased-spacing`, `fewer-per-page` — via a new optional `presentation` prop
   on `PdfDocument` and matching preview overrides on `EuclidEngine`.
3. Accommodations `PanelSection` in the drawer: class label + group CRUD
   (label, count, checkboxes), localStorage-backed.
4. Version tab strip over the preview (Base + one tab per group).
5. Combined multi-version PDF export: ordered `<PdfDocument>` instances, each with
   its own derived answer key, labeled divider pages. Keep single-version export
   behavior identical when no groups exist.
6. Invariant test in `tests/`: transformed versions produce identical
   `formatAnswer` sets to base (answers never change).

**Phase 1 deliberately excludes:** reduced choices, simplified directions,
read-aloud, word bank, graphic organizers, multiple classes, list import/export.

### Phase 2 — the rest of the catalog

7. `reduced-choices` transform (deterministic distractor dropping, re-lettering;
   key auto-matches via §4).
8. `simplified-directions` behind the `AIService` cache layer (hash-keyed `Map`;
   disabled-with-notice when no API key); proof statements excluded.
9. `read-aloud-script` teacher page per version (template-based).
10. `word-bank` collection from `MathProblem` fields + renderer box.
11. `graphic-organizer` overlays (needs design assets).
12. Multiple saved classes, JSON export/import of class lists (draft-style blob
    download), optional `accommodationListId` on `DraftFile`.

**Out of scope (both phases):** any change to math content/difficulty/selection;
AI-originated questions; student-identifying data; server components.

---

## Appendix — code touchpoints (grounded in current `src/`)

| Area | File | Change |
|------|------|--------|
| Transform engine | `src/lib/accommodations/*` (new) | Types, `applyAccommodations`, persistence helpers. Pure TS. |
| Sidebar UI | `src/components/WorksheetGenerator.tsx` | New "Accommodations" `PanelSection`; `activeVersionId` state; `versionedProblemSets` memo; version tabs; export assembles per-version docs. |
| PDF renderer | `src/components/PdfDocument.tsx` | Optional `presentation` prop (fontScale, fontFamily, spacingScale, maxProblemsPerPage); register `WorksheetSans`; per-version instance = per-version key. |
| Web preview | `src/components/EuclidEngine.tsx` | Optional presentation overrides for preview parity (or a thin wrapper). |
| AI cache layer | `src/lib/AIService.ts` | New `simplifyDirections(text)` + hash-keyed cache; directions only. |
| Answer keys | `src/lib/answerKey.ts` | Unchanged — `formatAnswer` stays the source; keys derive from transformed lists. |
| MCQ option shape | `src/lib/satTypes.ts` (+ precalc/calc MCQ types) | Read-only reference for the reduced-choices transform (`options`, `isKey`). |
| Tests | `tests/` | Answer-invariance test across all transforms. |
