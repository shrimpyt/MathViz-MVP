# ROADMAP: Milestone v1.0 (Chapter 10)

## Overview
This roadmap covers the implementation of Chapter 10 (Right Triangles & Trig) and the critical architectural refactoring needed to support it.

## Phase 1: Foundation & De-Godding (Architectural Cleanup)
**Goal**: Break down the "God Components" to make the codebase maintainable and testable.
- [ ] **CH-01**: Extract `ProblemFactory` logic into domain-specific sub-factories.
- [ ] **CH-02**: Decompose `EuclidEngine` into `SurfaceRenderer`, `SVGCanvas`, and `KaTeXOverlay`.
- [ ] **CH-03**: Centralize PRNG logic into a shared `math-utils` module.
- **Success Criteria**:
  - `EuclidEngine.tsx` is reduced by >40% in line count.
  - No duplicated `mulberry32` code remains.
  - Automated unit tests pass for the new sub-factories.

## Phase 2: AI Wrapper Service (Option C Implementation)
**Goal**: Set up the OpenAI service to "wrap" math problems in stories.
- [ ] **AI-01**: Implement `AIService` using the provided GPT-4o key (as an environment variable).
- [ ] **AI-02**: Create `ScenarioTemplate` logic (e.g., "A ladder leaning against a wall" for Pythagorean problems).
- [ ] **AI-03**: Implement "AI Rewrite" UI button for teachers.
- **Success Criteria**:
  - A math problem (e.g., $3, 4, c$) can be successfully "wrapped" in a real-world scenario by the LLM.
  - Scenarios are validated to never alter the underlying numeric variables.

## Phase 3: Geometry & Pythagoras (Core Generators)
**Goal**: Build the first set of Chapter 10 problem types.
- [ ] **GEN-01**: Implement **Pythagorean Theorem** generator (CH10-01).
- [ ] **GEN-02**: Implement **Special Right Triangles** (45-45-90 and 30-60-90) (CH10-02).
- **Success Criteria**:
  - Accurate SVG diagrams rendered for both problem types.
  - Correct multi-step answers generated (including simplified radicals).

## Phase 4: Right Triangle Trigonometry (SOH CAH TOA)
**Goal**: Implement the core trig ratios.
- [ ] **GEN-03**: Implement **Trig Ratios** side-length calculator (CH10-03).
- [ ] **GEN-04**: Implement **Inverse Trig** for angle measures (CH10-04).
- **Success Criteria**:
  - Teachers can generate worksheets with mixed trig/Pythagorean problems.
  - All KaTeX notation for $\sin$, $\cos$, $\tan$ renders perfectly.

## Phase 5: Advanced Trig & Real-World Apps
**Goal**: Complete the Chapter 10 curriculum.
- [ ] **GEN-05**: Implement **Angles of Elevation & Depression** (CH10-05).
- [ ] **GEN-06**: Implement **Law of Sines & Law of Cosines** (CH10-06).
- **Success Criteria**:
  - Non-right triangles are successfully rendered in SVG.
  - Multi-step logic correctly solves for multiple sides/angles in sequence.

## Phase 6: Cognitive Difficulty Scaling
**Goal**: Implement the multi-step difficulty logic (UI-01).
- [ ] **DIF-01**: Define logic levels (L1: Direct, L2: Indirect, L3: Synthesis).
- [ ] **DIF-02**: Update all generators to respect the Difficulty level.
- **Success Criteria**:
  - Selecting "Hard" difficulty generates problems that require finding an intermediate value before solving the final question.

---
*Next milestone: Milestone v1.1 (Chapter 1 - Tools of Geometry)*
