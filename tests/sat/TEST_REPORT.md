# SAT Math Practice Generator — Test Report

Generated: 2026-10-11T00:34:11.144Z
Suites: matrix, verify, fuzz, repro, pdfcheck

## Totals

- Problems generated: 22,016
- Headless checks: 497,422
- Failures: 0
- Verdict: PASS — zero failures

## Suites

| Suite | Problems | Checks | Failures | Time |
| ----- | -------- | ------ | -------- | ---- |
| matrix | 696 | 19,896 | 0 | 0.0s |
| verify | 10,920 | 184,730 | 0 | 0.3s |
| fuzz | 10,400 | 291,965 | 0 | 0.1s |
| repro | 0 | 824 | 0 | 0.0s |
| pdfcheck | 0 | 7 | 0 | 1.3s |

## What each suite proves

- **matrix**: full domain × mode × difficulty(1–3) × count{1,3,12,25} generation; schema invariants per problem (4 options A–D, exactly one key, documented misconception + teacher note per distractor, grid-in accepted forms, diagram validity); registry entries mode-independent.
- **verify**: INDEPENDENT answer recomputation via tests/sat/solvers.ts (separate code path, never imports factories) including substitution/property checks; hunts accidentally-correct distractors (any hit = bug); grid-in forms must all parse exactly to the key value; ambiguous forms rejected.
- **fuzz**: 3,000 seeded generations + 200 full timed modules; no throws; all invariants hold; all 16 subdomains and both formats observed; MCQ:grid-in ratio ≈ 3:1; module difficulty ordering easy→hard.
- **repro**: same seed → byte-identical JSON; different seeds → different output; answer-key text pipeline (latexToText/pdfSafeText) deterministic and non-empty; keyed MCQ option spread across A–D.
- **pdfcheck**: real @react-pdf render of stems, options, grid-in keys, and all three SAT diagram kinds (SatTable, SatRightTriangle, SatTriangle); non-trivial %PDF- output; stable byte length across renders; full 22-question module renders.

## Notes

- Distractor pools use graceful filtering (pickDistractors): candidates colliding with the key or each other are dropped; generation throws only if fewer than 3 documented-error distractors survive — the fuzz run proves this never happens across 3,000 seeds.
- Inequality correctness is decided by the full (boundary, direction) string, not the numeric boundary alone; the flipped-direction distractor is intentionally boundary-equal.
- Classical-notes contract: SAT generators are mode-agnostic (no steps emitted), so 'Classical' is handled exactly like 'Review'; not in the matrix per coordinator instruction.
