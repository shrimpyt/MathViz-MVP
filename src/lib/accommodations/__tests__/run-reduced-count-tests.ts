// run-reduced-count-tests.ts
// Standalone tests for the reduced-count (25% fewer problems, TEKS kept)
// accommodation. Same tiny harness style as run-phase1-tests.ts.
// Compile with tsc and run with node (see bottom of file).
//
// Covers:
//  (a) reduced count ≈ 75% of base
//  (b) every TEKS in the base version appears ≥1 in the reduced version
//  (c) the version's answer key matches its reduced problem list exactly
//  (d) determinism — same input yields the same subset every time
//  (e) tiny-base edge case: coverage beats the 75% target
//  (+) round-robin fill order, input purity, planVersions/divider integration,
//      findKeyMismatches skips reduced versions (no false positives)

import type { MathProblem } from '../../types';
import {
  EMPTY_FLAGS,
  activeAccommodationIds,
  type AccommodationFlags,
} from '../types';
import { createAccommodationStore, type KeyValueStorage } from '../store';
import {
  applyAccommodations,
  selectReducedProblems,
  reducedCountTarget,
} from '../transforms';
import { planVersions, buildAnswerKey, findKeyMismatches } from '../versions';

// ── tiny harness ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures: string[] = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (e) {
    failed++;
    failures.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

/** Minimal stub problems tagged with TEKS codes via `type`. */
function teksProblems(teks: string[]): MathProblem[] {
  return teks.map(
    (t, i) => ({ __stub: true, index: i, type: t, answer: i * 7 }) as unknown as MathProblem,
  );
}

function memStorage(): KeyValueStorage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

const serialize = (p: MathProblem): string =>
  String((p as unknown as { answer: unknown }).answer ?? (p as unknown as { type: string }).type);

const REDUCED: AccommodationFlags = { ...EMPTY_FLAGS, reducedCount: true };

// ── (a) count ≈ 75% ──────────────────────────────────────────────────────────

test('(a) 12 problems → 9 (75%)', () => {
  const base = teksProblems(['G.9A', 'G.9A', 'G.9A', 'G.9A', 'G.9B', 'G.9B', 'G.9B', 'G.9B', 'G.12A', 'G.12A', 'G.12A', 'G.12A']);
  const out = selectReducedProblems(base);
  assert(out.length === 9, `expected 9, got ${out.length}`);
});

test('(a) 20 problems → 15 (75%)', () => {
  const teks: string[] = [];
  for (let i = 0; i < 20; i++) teks.push(['G.9A', 'G.9B', 'G.12A', 'G.2B'][i % 4]);
  assert(selectReducedProblems(teksProblems(teks)).length === 15, 'expected 15');
});

test('(a) reducedCountTarget helper', () => {
  assert(reducedCountTarget(12) === 9, 'target(12)');
  assert(reducedCountTarget(20) === 15, 'target(20)');
  assert(reducedCountTarget(1) === 1, 'target(1) floors at 1');
  assert(reducedCountTarget(0) === 1, 'target(0) floors at 1');
});

// ── (b) TEKS coverage ────────────────────────────────────────────────────────

test('(b) every base TEKS appears ≥1 in the reduced set', () => {
  const base = teksProblems(['G.9A', 'G.9A', 'G.9A', 'G.9B', 'G.9B', 'G.12A', 'G.2B', 'G.2B', 'G.2B', 'G.2B']);
  const out = selectReducedProblems(base);
  const baseTeks = new Set(base.map((p) => p.type));
  const outTeks = new Set(out.map((p) => p.type));
  for (const t of baseTeks) assert(outTeks.has(t), `TEKS ${t} dropped`);
});

test('(b) skewed distribution keeps rare TEKS', () => {
  // 10 of G.9A, 1 lonely G.12B — the lonely one must survive the cut.
  const teks = [...Array<string>(10).fill('G.9A'), 'G.12B', 'G.9A', 'G.9A'];
  const out = selectReducedProblems(teksProblems(teks));
  assert(out.some((p) => p.type === 'G.12B'), 'rare TEKS G.12B dropped');
});

// ── fill order ───────────────────────────────────────────────────────────────

test('round-robin fill preserves per-TEKS base order, then restores global order', () => {
  // A×5 (idx 0-4), B×4 (5-8), C×3 (9-11); target 9.
  const teks = ['G.9A','G.9A','G.9A','G.9A','G.9A','G.9B','G.9B','G.9B','G.9B','G.12A','G.12A','G.12A'];
  const base = teksProblems(teks);
  const out = selectReducedProblems(base);
  const idx = out.map((p) => (p as unknown as { index: number }).index);
  // Phase 1: 0(A),5(B),9(C); round-robin: 1,6,10,2,7,11 → sorted:
  assert(JSON.stringify(idx) === JSON.stringify([0, 1, 2, 5, 6, 7, 9, 10, 11]),
    `order=${JSON.stringify(idx)}`);
});

test('single-TEKS base takes the first 75% in order', () => {
  const out = selectReducedProblems(teksProblems(Array<string>(8).fill('G.9A')));
  const idx = out.map((p) => (p as unknown as { index: number }).index);
  assert(JSON.stringify(idx) === JSON.stringify([0, 1, 2, 3, 4, 5]), `idx=${JSON.stringify(idx)}`);
});

test('empty base → empty subset', () => {
  assert(selectReducedProblems([]).length === 0, 'expected []');
});

test('input list is never mutated', () => {
  const base = teksProblems(['G.9A', 'G.9B', 'G.9A', 'G.9B', 'G.9A', 'G.9B', 'G.9A', 'G.9B']);
  const frozen = JSON.stringify(base);
  selectReducedProblems(base);
  assert(JSON.stringify(base) === frozen, 'input mutated');
});

// ── (d) determinism ──────────────────────────────────────────────────────────

test('(d) same input → identical subset, repeatedly', () => {
  const teks: string[] = [];
  for (let i = 0; i < 17; i++) teks.push(['G.9A', 'G.9B', 'G.12A', 'G.12B', 'G.2B'][i % 5]);
  const base = teksProblems(teks);
  const a = JSON.stringify(selectReducedProblems(base));
  const b = JSON.stringify(selectReducedProblems(base));
  const c = JSON.stringify(selectReducedProblems(teksProblems(teks)));
  assert(a === b && b === c, 'non-deterministic selection');
});

// ── (e) tiny-base edge cases ─────────────────────────────────────────────────

test('(e) 4 problems / 4 TEKS: coverage beats the 75% target (keeps 4, not 3)', () => {
  const base = teksProblems(['G.9A', 'G.9B', 'G.12A', 'G.2B']);
  const out = selectReducedProblems(base);
  assert(out.length === 4, `expected 4 (coverage wins), got ${out.length}`);
  assert(new Set(out.map((p) => p.type)).size === 4, 'a TEKS was dropped');
});

test('(e) 3 problems / 3 TEKS keeps all 3', () => {
  const base = teksProblems(['G.9A', 'G.9B', 'G.12A']);
  assert(selectReducedProblems(base).length === 3, 'coverage must win');
});

test('(e) 2 problems / 1 TEKS → 2 problems (round(1.5) = 2)', () => {
  const base = teksProblems(['G.9A', 'G.9A']);
  const out = selectReducedProblems(base);
  assert(out.length === 2, `expected 2, got ${out.length}`);
});

test('(e) 1 problem → 1 problem', () => {
  assert(selectReducedProblems(teksProblems(['G.9A'])).length === 1, 'expected 1');
});

// ── planner integration ──────────────────────────────────────────────────────

test('planVersions: reduced group gets the subset; divider names the accommodation', () => {
  const store = createAccommodationStore(memStorage());
  const list = store.createList('Algebra 2 - Period 3');
  store.addGroup(list.id, { label: 'Group C', studentCount: 3, flags: REDUCED });
  const full = store.getList(list.id)!;
  const base = teksProblems(['G.9A','G.9A','G.9A','G.9A','G.9B','G.9B','G.9B','G.9B','G.12A','G.12A','G.12A','G.12A']);
  const plan = planVersions(base, full);
  const v = plan.groups[0];
  assert(v.problems.length === 9, `group has ${v.problems.length}, want 9`);
  assert(plan.base.problems.length === 12, 'base must stay full');
  assert(v.dividerText.includes('Group C'), 'divider names group');
  assert(v.dividerText.includes('25% reduction'), `divider names accommodation: ${v.dividerText}`);
  assert(v.dividerText.includes('print 3 copies'), `divider print count: ${v.dividerText}`);
  assert(v.answerKeyLabel.includes('Group C'), 'key label names group');
  assert(v.accommodations.includes('reduced-count'), 'accommodations lists reduced-count');
});

test('reduced composes with presentation flags (content first)', () => {
  const flags: AccommodationFlags = { ...EMPTY_FLAGS, reducedCount: true, largePrint: true };
  const base = teksProblems(['G.9A','G.9A','G.9A','G.9A','G.9B','G.9B','G.9B','G.9B']);
  const out = applyAccommodations(base, flags);
  assert(out.problems.length === 6, `problems=${out.problems.length}, want 6`);
  assert(out.presentation.fontScale === 1.25, 'large print still applies');
  const ids = activeAccommodationIds(flags);
  assert(ids[0] === 'reduced-count', `content must run first: ${JSON.stringify(ids)}`);
});

test('store validation accepts reduced-count groups and persists the flag', () => {
  const store = createAccommodationStore(memStorage());
  const list = store.createList('T');
  const g = store.addGroup(list.id, { label: 'Group C', studentCount: 2, flags: REDUCED });
  assert(g.flags.reducedCount === true, 'flag not persisted');
  const again = store.getList(list.id)!;
  assert(again.groups[0].flags.reducedCount === true, 'flag not round-tripped');
});

// ── (c) key matches subset ───────────────────────────────────────────────────

test('(c) reduced version key matches its own problems exactly', () => {
  const store = createAccommodationStore(memStorage());
  const list = store.createList('T');
  store.addGroup(list.id, { label: 'Group C', studentCount: 2, flags: REDUCED });
  const base = teksProblems(['G.9A','G.9A','G.9A','G.9A','G.9B','G.9B','G.9B','G.9B','G.12A','G.12A','G.12A','G.12A']);
  const plan = planVersions(base, store.getList(list.id)!);
  const v = plan.groups[0];
  const key = buildAnswerKey(v.problems, serialize);
  assert(key.length === v.problems.length, `key len ${key.length} != problems ${v.problems.length}`);
  for (let i = 0; i < v.problems.length; i++) {
    assert(key[i].number === i + 1, `numbering restarts per version (idx ${i})`);
    assert(key[i].text === serialize(v.problems[i]), `key entry ${i} mismatches problem`);
  }
  // And it must NOT equal the base key (fewer entries) — the per-version
  // derivation is what keeps them matched.
  const baseKey = buildAnswerKey(plan.base.problems, serialize);
  assert(key.length < baseKey.length, 'reduced key should be shorter than base key');
});

test('findKeyMismatches skips reduced versions (no false positives)', () => {
  const store = createAccommodationStore(memStorage());
  const list = store.createList('T');
  store.addGroup(list.id, { label: 'A', studentCount: 1, flags: { ...EMPTY_FLAGS, largePrint: true } });
  store.addGroup(list.id, { label: 'C', studentCount: 2, flags: REDUCED });
  const plan = planVersions(teksProblems(['G.9A','G.9A','G.9A','G.9A','G.9B','G.9B','G.9B','G.9B']), store.getList(list.id)!);
  const mismatches = findKeyMismatches(plan, serialize);
  assert(mismatches.length === 0, `false positives: ${JSON.stringify(mismatches[0])}`);
});

// ── report ────────────────────────────────────────────────────────────────────

console.log(`\nReduced-count accommodation tests: ${passed} passed, ${failed} failed`);
if (failures.length) {
  console.log('FAILURES:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
} else {
  console.log('All green.');
}

// Compile & run:
//   cd ~/workspace/euclid-worksheet && npx tsc src/lib/accommodations/__tests__/run-reduced-count-tests.ts \
//     src/lib/accommodations/types.ts src/lib/accommodations/store.ts \
//     src/lib/accommodations/transforms.ts src/lib/accommodations/versions.ts \
//     src/lib/accommodations/index.ts \
//     --outDir /tmp/reduced-tests --module commonjs --target es2020 \
//     --moduleResolution node --strict --esModuleInterop --skipLibCheck \
//   && node /tmp/reduced-tests/src/lib/accommodations/__tests__/run-reduced-count-tests.js
