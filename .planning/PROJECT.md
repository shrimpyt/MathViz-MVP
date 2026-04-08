# MathViz-MVP

## What This Is

MathViz is a production-ready tool for teachers to generate unique, multi-step geometry worksheets. It uses an LLM-assisted generation strategy (GPT-4o) combined with a deterministic math engine to wrap structured math problems in creative, real-world scenarios.

## Core Value

Usability and minimum viability for teachers to effortlessly create unique, difficulty-scalable math worksheets.

## Requirements

### Validated

- [x] Basic math problem rendering using KaTeX and React-PDF.
- [x] Extensible CurriculumRegistry for different skills.

### Active

- [ ] Implement AI-driven question generation (Option C: LLM real-world wrappers around structured math engine).
- [ ] Add support for "Right Triangles & Trigonometry" (Chapter 10: Pythagorean Theorem, Special Right Triangles, Trig Ratios, Angles of Elevation/Depression, Law of Sines/Cosines).
- [ ] Decompose "God Components" (MathVizEngine, WorksheetGenerator) for better testability and maintenance.
- [ ] Implement robust testing, starting with `ProblemFactory`.

### Out of Scope

- [ ] Complex multi-user collaborative editing (focus is on a single-teacher generation flow for now).
- [ ] Full LMS integrations (Google Classroom, Canvas) — Deferred until core generation MVP is validated.
- [ ] Non-geometry math topics — Focus strictly on Geometry to maintain narrow MVP scope.

## Context

- **Stack**: Next.js 16.2.2 (App Router), TypeScript, MUI 7, Tailwind 4.
- **Current State**: Deployed on Vercel, single GitHub repo. High technical debt in MathVizEngine/WorksheetGenerator.
- **Curriculum**: Texas Geometry by Pearson (2016).
- **Security**: The user previously provided an OpenAI key in chat. An action item was created to rotate it and store it in Vercel.

## Constraints

- **Type: Usage**: The UI must be simple enough for teachers to use without complex configuration.
- **Type: AI Budget**: Must implement token/generation limits since AI usage directly translates to API costs.
- **Type: Output Validation**: Math outputs *must* be mathematically accurate. LLMs cannot be trusted with raw math parsing, necessitating the "Option C" wrapper approach.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Option C AI Integration | LLMs are bad at math but great at words. A deterministic engine with an LLM wrapper is safer. | — Pending |
| Focus on Chapter 10 | Allows us to test multi-step problem generation (e.g. SOH CAH TOA) dynamically. | — Pending |

---
*Last updated: 2026-04-08 after Initial Project Definition*
