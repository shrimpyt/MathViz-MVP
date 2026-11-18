# Geometry Proofs, Test Report

Ran: 2026-11-18T15:09:26.940Z

- Matrix problems: 14760 (30 units × 4 modes × 3 difficulties × counts {1,3,12,25})
- Fuzz problems: 3000
- Reproducibility samples: 160
- PDF samples: 22
- Answer-key problems: 540
- Duration: 1.4s

## Totals

- **Total checks: 592585**
- **Failures: 0**

## What was checked

- `validateProofShape` on every generated problem (shape, non-empty steps/reasons, final step = prove).
- Per-family logical checkers walk each proof's steps tracking established facts: measurements, congruence pairs, right angles, midpoints, bisectors, perpendiculars. Every reason is verified to actually justify its statement (e.g. SSS's three cited pairs are exactly the established side pairs; the SAS angle is the included one; HL's hypotenuse is the longest side of a right triangle).
- Diagram params recomputed from the parsed givens/steps and asserted equal (tick marks, angle arcs, right-angle marks, marked angle pairs).
- Degeneracy fuzz: positive lengths, angles/arcs in range, triangle inequality, no NaN/undefined leaks.
- Student-mode blanking discipline (complete/fill-statements/supply-reasons/guided) and PDF-safe plain-text strings (no LaTeX; ≅ kept, the PDF fonts cover it).
- Seed reproducibility: identical seed → byte-identical problems.
- PDF: 16 representative diagrams rendered headless via @react-pdf/renderer; valid %PDF header, sane byte size, zero renderer warnings.
- Answer key: `formatAnswer` mirror (proposition + Q.E.D. for Elements, else the proved statement) exact across difficulties and seeds.
- Elements difficulty tiers: only unlocked propositions generated per tier.
- Module wiring (`src/modules/geometry-proofs.ts`): OutputMode → studentMode mapping incl. Classical→complete; family/tier filters.

## Per-unit matrix breakdown

| unit | problems | checks |
| --- | ---: | ---: |
| congruence-SSS | 492 | 19650 |
| congruence-SAS | 492 | 17452 |
| congruence-ASA | 492 | 21852 |
| congruence-AAS | 492 | 21474 |
| congruence-HL | 492 | 16483 |
| cpctc | 492 | 20196 |
| isosceles | 492 | 15051 |
| parallel-tier1 | 492 | 12650 |
| parallel-tier2 | 492 | 15593 |
| parallel-tier3 | 492 | 12464 |
| circle-InscribedAngle | 492 | 13260 |
| circle-TangentChord | 492 | 13359 |
| similarity-AA | 492 | 15190 |
| elements-I_1 | 492 | 13824 |
| elements-I_4 | 492 | 14808 |
| elements-I_5 | 492 | 15792 |
| elements-I_8 | 492 | 14808 |
| elements-I_29 | 492 | 14808 |
| elements-I_32 | 492 | 15300 |
| elements-I_47 | 492 | 16284 |
| elements-I_48 | 492 | 13824 |
| quadrilateral-OnePairBoth | 492 | 15300 |
| quadrilateral-OppositeSidesCongruent | 492 | 15792 |
| quadrilateral-DiagonalsBisect | 492 | 15792 |
| special-parallelogram-RhombusFromConsecutiveSides | 492 | 15300 |
| special-parallelogram-RectangleFromRightAngle | 492 | 23664 |
| special-parallelogram-SquareFromRectangle | 492 | 16776 |
| special-parallelogram-RectangleFromDiagonals | 492 | 19236 |
| special-parallelogram-RhombusFromPerpDiagonals | 492 | 20220 |
| angle-proofs | 492 | 15006 |

## Failures

None, all checks passed.
