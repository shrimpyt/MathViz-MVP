# REQUIREMENTS: Milestone v1.0 (Chapter 10)

## Overview
Implement the "Right Triangles & Trigonometry" module (Chapter 10) using the LLM-wrapper architecture. This milestone also includes necessary architectural refactoring to remove technical debt.

## [REQ-ARCH] Architecture & Refactoring
- **ARCH-01**: Decompose `MathVizEngine` into domain-specific rendering components.
- **ARCH-02**: Decompose `WorksheetGenerator` to separate UI state from document generation logic.
- **ARCH-03**: Centralize PRNG logic to prevent duplication across the codebase.
- **ARCH-04**: Implement `AIProblemWrapper` service to interface with OpenAI (GPT-4o) for scenario generation.

## [REQ-CH10] Chapter 10 Generators
- **CH10-01**: **Pythagorean Theorem**: Generate problems involving $a^2 + b^2 = c^2$, including triples and irrational roots.
- **CH10-02**: **Special Right Triangles**: $45-45-90$ and $30-60-90$ relationships with exact radical answers.
- **CH10-03**: **Trig Ratios**: Sine, Cosine, and Tangent identification and calculation for missing sides.
- **CH10-04**: **Inverses & Angles**: Using inverse trig functions to find missing angle measures.
- **CH10-05**: **Real-World Applications**: Angles of Elevation and Depression word problems.
- **CH10-06**: **Advanced Trig**: Law of Sines and Law of Cosines for non-right triangles.

## [REQ-UI] UI & UX Enhancements
- **UI-01**: Add "Difficulty Level" toggle that increases cognitive steps (e.g., Level 1 = Direct calculation, Level 3 = Solve for $x$ then use $x$ to find a trig ratio).
- **UI-02**: Implement "AI Rewrite" button for teachers to instantly generate a new real-world story for any math problem.

## Out of Scope for v1.0
- Student login/portals.
- Saving worksheets to a database (local export only).
- Other chapters (Chapters 1-9, 11).
