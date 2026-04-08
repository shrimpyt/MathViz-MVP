# STACK.md — Technology Stack

## Language

- **TypeScript 5** — Strict mode. All source files in `src/` are `.ts` or `.tsx`.

## Runtime & Framework

| Layer | Technology | Version | Role |
|---|---|---|---|
| Framework | Next.js (App Router) | 16.2.2 | Full-stack React framework, SSR/CSR routing |
| React | React + React-DOM | 19.2.4 | UI rendering |
| Node.js | Node.js | LTS (inferred) | Build & server runtime |

All pages under `src/app/` use the App Router convention. The root layout is `src/app/layout.tsx`. Currently only one route exists: `/` (the worksheet generator).

## UI & Styling

| Library | Version | Usage |
|---|---|---|
| MUI (Material UI) | ^7.3.9 | Primary component library — AppBar, Drawer, ToggleButtonGroup, Select, Slider, TextField, Typography, Box |
| Emotion (React + Styled) | ^11.14 | CSS-in-JS engine under MUI; used via `sx` prop |
| Tailwind CSS | ^4 | Utility classes for layout and spacing in domain components (`EuclidEngine.tsx`, `GeometrySVG.tsx`) |
| @tailwindcss/postcss | ^4 | PostCSS plugin; Tailwind v4 integration |
| Lucide React | ^1.7.0 | Icon set (currently imported but not visually used in reviewed components) |

> **Note:** There is a styling split — MUI's `sx` prop for the control shell (`WorksheetGenerator.tsx`), and Tailwind utility classes for the document rendering engine (`EuclidEngine.tsx`). These two systems coexist without conflict but should be noted for contributors.

## Math & Document Rendering

| Library | Version | Usage |
|---|---|---|
| KaTeX | ^0.16.45 | LaTeX math equation rendering |
| @types/katex | ^0.16.8 | Type definitions for KaTeX |
| @react-pdf/renderer | ^4.3.3 | Client-side PDF generation and download via `PDFDownloadLink` |

## Fonts

- **Geist Sans** — Local font loaded via `next/font/local` in `src/app/layout.tsx`
- **Geist Mono** — Local font loaded via `next/font/local` in `src/app/layout.tsx`
- **Times New Roman / Georgia** (serif) — Hardcoded via inline `style` / Tailwind `font-serif` for the print-style document output

## Build Tooling

| Tool | Version | Role |
|---|---|---|
| ESLint | ^9.39.4 | Linting (config in `eslint.config.mjs`) |
| eslint-config-next | ^16.2.2 | Next.js ESLint rule set |
| tsconfig.json | — | Strict TS config with `@/` path alias → `src/` |
| PostCSS | — | Tailwind processing (`postcss.config.mjs`) |

## Path Aliases

Defined in `tsconfig.json`:
```json
"paths": {
  "@/*": ["./src/*"]
}
```
Use `@/lib/ProblemFactory`, `@/components/GeometrySVG`, etc.

## Key `package.json` Scripts

```json
"dev":   "next dev"
"build": "next build"
"start": "next start"
"lint":  "eslint"
```
