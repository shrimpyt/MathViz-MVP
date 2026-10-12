// run-word-bank-tests.ts
// Standalone tests for the word-bank accommodation. Same tiny harness style
// as run-phase1-tests.ts / run-reduced-count-tests.ts.
// Compile with tsc and run with node (see bottom of file).
//
// Covers:
//  (a) bank contains exactly the version's blank answers, deduped
//  (b) determinism — same problems → same bank, every time
//  (c) bank is NOT in worksheet order (shuffled) when ≥3 distinct terms
//  (d) problems without steps/blanks yield an empty bank
//  (e) planVersions: only flagged groups get a bank; base never does
//  (f) word bank + reduced count: bank derives from the REDUCED subset
//  (g) word-bank flag alone never changes problems or answer keys
//  (h) flags plumbing: flagsFromIds / activeAccommodationIds round-trip

import type { MathProblem } from '../../types';
import {
  EMPTY_FLAGS,
  activeAccommodationIds,
  flagsFromIds,
  type AccommodationFlags,
  type ClassAccommodationList,
} from '../types';
import { buildWordBank } from '../wordbank';
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

function assertEq<T>(a: T, b: T, msg: string): void {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error(`${msg} — got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
  }
}

/** Stub problem with the given blank answers across two steps. */
function stubProblem(type: string, answers: string[]): MathProblem {
  const half = Math.ceil(answers.length / 2);
  return {
    type,
    steps: [
      { instruction: 'Step 1', blanks: answers.slice(0, half).map((a) => ({ label: 'x', answer: a })) },
      { instruction: 'Step 2', blanks: answers.slice(half).map((a) => ({ label: 'y', answer: a })) },
    ],
  } as unknown as MathProblem;
}

function listWith(flags: AccommodationFlags): ClassAccommodationList {
  return {
    id: 'list-1',
    classLabel: 'Test class',
    updatedAt: '2026-10-12T00:00:00.000Z',
    groups: [{ id: 'g1', label: 'Group A', studentCount: 3, flags }],
  };
}

const fmt = (p: MathProblem) => `key:${p.type}`;

// ── tests ─────────────────────────────────────────────────────────────────────

test('(a) bank = deduped blank answers of the problem list', () => {
  const problems = [
    stubProblem('G.9A', ['adjacent', 'hypotenuse', 'adjacent']),
    stubProblem('G.9A', ['opposite', 'hypotenuse']),
    stubProblem('G.2B', ['slope']),
  ];
  const bank = buildWordBank(problems);
  assertEq([...bank].sort(), ['adjacent', 'hypotenuse', 'opposite', 'slope'], 'bank terms');
});

test('(b) deterministic: same input, same bank order', () => {
  const problems = [stubProblem('G.9A', ['a1', 'b2', 'c3', 'd4', 'e5', 'f6'])];
  assertEq(buildWordBank(problems), buildWordBank(problems), 'repeat build');
});

test('(c) bank order differs from worksheet order for varied terms', () => {
  const answers = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta'];
  const bank = buildWordBank([stubProblem('G.9A', answers)]);
  assert(JSON.stringify(bank) !== JSON.stringify(answers), 'bank should be shuffled');
  assertEq([...bank].sort(), [...answers].sort(), 'same terms, different order');
});

test('(d) no steps / no blanks → empty bank', () => {
  assertEq(buildWordBank([{ type: 'SAT' } as unknown as MathProblem]), [], 'no steps');
  assertEq(buildWordBank([stubProblem('G.9A', [])]), [], 'no blanks');
  assertEq(buildWordBank([]), [], 'no problems');
});

test('(e) planVersions attaches a bank only to flagged groups', () => {
  const problems = [stubProblem('G.9A', ['one', 'two', 'three'])];
  const flagged = planVersions(problems, listWith({ ...EMPTY_FLAGS, wordBank: true }));
  assertEq(flagged.base.wordBank, [], 'base has no bank');
  assert(flagged.groups[0].wordBank.length === 3, 'flagged group has 3 terms');
  assert(flagged.groups[0].accommodations.includes('word-bank'), 'accommodation id listed');

  const unflagged = planVersions(problems, listWith({ ...EMPTY_FLAGS }));
  assertEq(unflagged.groups[0].wordBank, [], 'unflagged group has no bank');
});

test('(f) word bank + reduced count: bank built from the reduced subset', () => {
  const problems = [
    stubProblem('G.9A', ['keep-1']),
    stubProblem('G.9A', ['keep-2']),
    stubProblem('G.2B', ['keep-3']),
    stubProblem('G.2B', ['drop-me']),
  ];
  const plan = planVersions(
    problems,
    listWith({ ...EMPTY_FLAGS, wordBank: true, reducedCount: true }),
  );
  const v = plan.groups[0];
  assert(v.problems.length === 3, 'reduced to 3 problems');
  assert(!v.wordBank.includes('drop-me'), 'bank excludes dropped problem answers');
  assertEq([...v.wordBank].sort(), ['keep-1', 'keep-2', 'keep-3'], 'bank from subset');
});

test('(g) word-bank flag leaves problems and keys untouched', () => {
  const problems = [stubProblem('G.9A', ['x']), stubProblem('G.2B', ['y'])];
  const plan = planVersions(problems, listWith({ ...EMPTY_FLAGS, wordBank: true }));
  assertEq(plan.groups[0].problems, problems, 'problems identical');
  assertEq(findKeyMismatches(plan, fmt), [], 'no key mismatches');
  assertEq(buildAnswerKey(plan.groups[0].problems, fmt), buildAnswerKey(problems, fmt), 'keys equal');
});

test('(h) flags plumbing round-trips the word-bank id', () => {
  const flags = flagsFromIds(['word-bank']);
  assert(flags.wordBank === true, 'flagsFromIds sets wordBank');
  assertEq(activeAccommodationIds(flags), ['word-bank'], 'active ids');
  const both = flagsFromIds(['word-bank', 'reduced-count', 'large-print']);
  assertEq(activeAccommodationIds(both), ['reduced-count', 'word-bank', 'large-print'], 'composition order');
});

// ── report ────────────────────────────────────────────────────────────────────

console.log(`word-bank tests: ${passed} passed, ${failed} failed`);
for (const f of failures) console.log(`  FAIL ${f}`);
if (failed > 0) process.exit(1);

// Run (tsx, because wordbank.ts pulls latexToText from answerKey.ts, which
// uses the "@/…" path alias that plain tsc cannot resolve standalone):
//   cd ~/workspace/euclid-worksheet && npx tsx src/lib/accommodations/__tests__/run-word-bank-tests.ts
