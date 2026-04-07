# INTEGRATIONS.md — External Services & APIs

## Summary

MathViz-MVP is a **local-first, self-contained application**. It has no external API dependencies at runtime — all problem generation, SVG rendering, and PDF export happen in-browser.

## External Services

| Service | Status | Purpose |
|---|---|---|
| External APIs | ❌ None | No backend API calls |
| Database | ❌ None | No persistence layer |
| Auth providers | ❌ None | No authentication |
| CDN / external assets | ❌ None | Fonts are local |

## Browser APIs Used (Client-Side)

| API | Where Used | Purpose |
|---|---|---|
| `Date.now()` | `src/lib/ProblemFactory.ts` | Default seed for PRNG when no explicit seed is given |
| `Math.imul` | `src/lib/ProblemFactory.ts`, `src/modules/CurriculumRegistry.ts` | Mulberry32 PRNG bit manipulation |
| SVG rendering | `src/components/GeometrySVG.tsx` | All geometry diagrams are rendered as inline SVG elements |
| PDF generation | `src/components/WorksheetGenerator.tsx` | `@react-pdf/renderer`'s `PDFDownloadLink` triggers a client-side blob download |

## Local Fonts

Fonts are bundled locally (no Google Fonts CDN call):

```
src/app/fonts/geist-sans.woff2
src/app/fonts/geist-mono.woff2
```

Loaded via `next/font/local` in `src/app/layout.tsx`.

## Curriculum / Standards

The app targets **Texas TEKS (Texas Essential Knowledge and Skills)** geometry standards, hardcoded in the domain modules:

| Standard | Topic | Module |
|---|---|---|
| G.12(A) | Circle Theorems | `src/modules/anatomy-of-a-circle.ts` |
| G.13(B) | Area-Based Probability | `src/modules/target-zone.ts` |
| G.6(B) | Triangle Congruence | `src/modules/logic-of-congruence.ts` |

These are not dynamic — adding a new standard requires adding a module file and registering it in `src/modules/CurriculumRegistry.ts`.

## Future Integration Surface

When extending the app, natural integration points include:

- **LLM API** — For AI-generated problem text or adaptive difficulty
- **Supabase / Firebase** — For user accounts, saved worksheets, and usage analytics
- **Vercel / Netlify** — Static deployment (current codebase is fully exportable)
