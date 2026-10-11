# Classical Notes — Test Report

Generated: 2026-10-10T22:15:53.635Z
Runner: `npx tsx tests/classical-notes/run-classical-tests.tsx`

## Summary

**1800 checks, 1800 passed, 0 failed.**

## Groups

| Group | Passed | Failed |
| ----- | ------ | ------ |
| A — generation sweep (all entries x difficulties x counts) | 1296 | 0 |
| B — Classical generation treated like Review (same seed => identical) | 63 | 0 |
| C — definitions keyed by entry id | 84 | 0 |
| D — web render (ClassicalNotesCard) per real entry | 224 | 0 |
| E — reason blanking (synthetic reasons) | 6 | 0 |
| F — graceful handling (unknown ids, empty worksheets) | 8 | 0 |
| G — PDF byte verification (%PDF) across all problem types | 14 | 0 |
| H — PDF structure (tree walk: reasons absent, prompts sane) | 8 | 0 |
| I — margin-prompt rotation unit tests | 4 | 0 |
| J — fuzz (30 random seeds: generate + web render + pdf walk) | 90 | 0 |
| K — seed reproducibility | 3 | 0 |

## Coverage

- Registry entries: 36 (all), difficulties 1-3, counts {1, 3, 12}, mode "Classical".
- Entries with seeded definitions: 16 (anatomy-of-a-circle, ch12-test, logic-of-congruence, ch4-test, ch7-1-distance-midpoint, ch7-test, trig-1-ratios, trig-2-sides, trig-3-angles, elevation-depression, special-right-triangles, ch10-test, ch11-1-circumference, ch11-test, target-zone, ch15-test).
- PDF byte verification: one sample per problem type (G.12A, G.12B, G.13B, G.6B, G.2B, G.9A, G.9B), answer key included.
- Fuzz: 30 random (entry, seed, difficulty, count) combos; generate + web render + PDF tree walk.

## Failures

None — all checks passed.
