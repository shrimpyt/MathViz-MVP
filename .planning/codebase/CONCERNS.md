# CONCERNS.md — Technical Debt, Issues & Fragile Areas

## 🔴 High Priority

### 1. No Automated Tests — Silent Math Regressions Possible

**Location:** Entire `src/lib/` and `src/modules/`
**Risk:** HIGH — This is an educational math tool. If problem generation logic is broken, it produces silently wrong answers on real student worksheets.

`ProblemFactory.ts` and all module generators have zero test coverage. A single arithmetic mistake in `makeInscribedAngleProblem` or `makeConcentricProblem` would go undetected.

**Action:** Add Vitest unit tests for `ProblemFactory` before any new math logic is added. See TESTING.md.

---

### 2. `EuclidEngine.tsx` God Component (554 lines)

**Location:** `src/components/EuclidEngine.tsx`
**Risk:** MEDIUM — Difficult to maintain and test as complexity grows.

The file contains 8+ internal React components, all in one file. Adding a new TEKS standard (e.g., volume, similar figures) requires modifying this already-large file.

**Action:** Extract each problem card type into its own file:
- `src/components/problems/CircleProblemCard.tsx`
- `src/components/problems/ProbabilityProblemCard.tsx`
- `src/components/problems/CongruenceProblemCard.tsx`

---

### 3. `WorksheetGenerator.tsx` Mega-Component (698 lines)

**Location:** `src/components/WorksheetGenerator.tsx`
**Risk:** MEDIUM — The control panel sidebar, header, advanced preview, and basic preview are all in one component. Onboarding friction for any future contributor.

**Action:** Extract:
- `ControlPanel.tsx` — the Drawer sidebar
- `PreviewArea.tsx` — the main content area
- Keep `WorksheetGenerator.tsx` as a thin orchestrator only.

---

## 🟡 Medium Priority

### 4. PRNG (`mulberry32`) Is Duplicated

**Location:** `src/lib/ProblemFactory.ts` (lines 111–119) AND `src/modules/CurriculumRegistry.ts` (lines 15–23)

Identical code copy. A bug fix in one place would need to be applied to both.

**Action:** Extract to `src/lib/prng.ts` and import from both files.

---

### 5. `GeometrySVG.tsx` Uses Unsafe Type Casts

**Location:** `src/components/GeometrySVG.tsx` — many lines like:
```typescript
case "CentralAngle":
  return <CentralAngleSVG interceptedArc={(params as InscribedAngleSVGParams).interceptedArc} />;
```

The `TwoSecants` case in `ProblemFactory.ts` (line 282) explicitly casts to `InscribedAngleSVGParams`, even though it isn't one:
```typescript
svgParams: {
  kind: "TwoSecants",
  interceptedArc: farArc,
} as InscribedAngleSVGParams,  // ← unsafe cast
```

**Risk:** If a new SVG param shape is added without updating the discriminated union, `as` casts will silently pass incorrect data.

**Action:** Fix `TwoSecantsSVGParams` to be its own proper interface; remove the `as` cast.

---

### 6. Hardcoded Colors in MUI `sx` Props

**Location:** Throughout `WorksheetGenerator.tsx` (lines 170–700+)

Colors like `'#121416'`, `'#66d9cc'`, `'rgba(40, 42, 44, 0.6)'` are hardcoded in `sx` props rather than consumed from the MUI theme defined in `page.tsx`.

**Risk:** A design change requires find-and-replace across the entire file.

**Action:** Move all dark theme colors into the `createTheme` call in `page.tsx` and reference via `theme.palette.*` in `sx`.

---

### 7. `dev_output.log` Committed to Repo

**Location:** `/dev_output.log` (16KB)

A development server output log file is present at the root. This is likely not intentional.

**Action:** Add `dev_output.log` to `.gitignore` and remove from git tracking:
```bash
echo "dev_output.log" >> .gitignore
git rm --cached dev_output.log
```

---

### 8. `patch_renderer.js` — Purpose Unclear

**Location:** `/patch_renderer.js` (300 bytes)

A small root-level JS file with no clear relationship to the Next.js build. Likely a one-off development tool.

**Action:** Evaluate and either document its purpose or delete it.

---

### 9. `src/renderer.ts` — Orphaned File

**Location:** `src/renderer.ts`

Not imported by any App Router page or component in the current code path. May be a leftover from an earlier architecture.

**Action:** Verify if this file is still needed. If not, delete it.

---

## 🟢 Low Priority / Future Considerations

### 10. Basic Preview Fallback Has Duplicated Document Header HTML

**Location:** `WorksheetGenerator.tsx` (lines 529–611)

The basic Paper preview duplicates the "Classical Academy" document header markup that is also in `EuclidEngine.tsx`'s `DocumentHeader` component. If the header design changes, it must be updated in two places.

**Action:** Extract a shared `WorksheetHeader` component.

---

### 11. PDF Export Uses Basic `questions[]`, Not `MathProblem[]`

**Location:** `WorksheetGenerator.tsx` line 487–505

The `PdfDocument` receives the `questions: Question[]` from the basic generator, not the advanced `MathProblem[]` used by `EuclidEngine`. This means PDF exports lack the SVG diagrams and step-by-step scaffolding that the interactive preview shows.

**Risk:** User confusion — the screen preview looks different from the downloaded PDF.

**Action:** Build a `@react-pdf/renderer`-compatible version of `EuclidEngine` to make PDF output match the screen preview.

---

### 12. No Error Boundary

**Location:** `src/app/page.tsx` or `src/app/layout.tsx`

If `EuclidEngine` or `GeometrySVG` throws a runtime error (e.g., from an unexpected SVG param combination), the entire page crashes with no user-facing recovery.

**Action:** Wrap the preview area in a React `ErrorBoundary` component.
