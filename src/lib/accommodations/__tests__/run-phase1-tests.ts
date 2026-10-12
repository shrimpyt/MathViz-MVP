// run-phase1-tests.ts
// Standalone Phase 1 test script for the accommodations module.
// No test framework in the repo, so this is a tiny self-contained harness.
// Compile with tsc and run with node (see bottom of file).
//
// Covers:
//  1. Transforms are pure (inputs never mutated) and produce expected params.
//  2. Anonymous groups carry no PII-shaped data (validation rejects names/IDs).
//  3. Store CRUD round-trips through (fake) storage.
//  4. Version planner emits base + N groups with correct print counts/divider text.
//  5. Answer keys stay matched across every flag combination.

import type { MathProblem } from '../../types';
import {
  EMPTY_FLAGS,
  DEFAULT_PRESENTATION,
  activeAccommodationIds,
  flagsFromIds,
  type AccommodationFlags,
  type Presentation,
} from '../types';
import {
  createAccommodationStore,
  validateGroupInput,
  validateClassLabel,
  looksLikePersonalData,
  type KeyValueStorage,
} from '../store';
import {
  largePrint,
  sansSerif,
  extraSpacing,
  fewerPerPage,
  applyAccommodations,
  presentationForFlags,
  type VersionInput,
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

function deepFreeze<T>(obj: T): T {
  if (obj && typeof obj === 'object') {
    for (const v of Object.values(obj)) deepFreeze(v);
    Object.freeze(obj);
  }
  return obj;
}

// Stub problems: transforms must never inspect or alter these. Cast through
// unknown because only the pipeline shape matters here, not real math content.
function stubProblems(n: number): MathProblem[] {
  const out: MathProblem[] = [];
  for (let i = 0; i < n; i++) {
    out.push({ __stub: true, index: i, answer: i * 7 } as unknown as MathProblem);
  }
  return out;
}

const serialize = (p: MathProblem): string => JSON.stringify(p);

function memStorage(): KeyValueStorage & { raw(): Map<string, string> } {
  const m = new Map<string, string>();
  return {
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    setItem: (k, v) => { m.set(k, v); },
    removeItem: (k) => { m.delete(k); },
    raw: () => m,
  };
}

const ALL_FLAGS: AccommodationFlags = {
  largePrint: true,
  sansSerif: true,
  extraSpacing: true,
  fewerPerPage: true,
  reducedCount: true,
};

// ── 1. transform purity + expected params ─────────────────────────────────────

test('each transform is pure: frozen input is never mutated', () => {
  const transforms = [largePrint, sansSerif, extraSpacing, fewerPerPage];
  for (const t of transforms) {
    const input: VersionInput = deepFreeze({
      problems: stubProblems(3),
      presentation: { ...DEFAULT_PRESENTATION },
    });
    const before = JSON.stringify(input);
    const out = t(input);
    assert(JSON.stringify(input) === before, `${t.name} mutated its input`);
    assert(out !== input, `${t.name} must return a new object`);
    assert(out.presentation !== input.presentation, `${t.name} must return a new presentation`);
    assert(out.problems === input.problems, `${t.name} must pass problems through by reference`);
  }
});

test('largePrint scales font ×1.25 and touches nothing else', () => {
  const out = largePrint({ problems: [], presentation: { ...DEFAULT_PRESENTATION } });
  assert(out.presentation.fontScale === 1.25, `fontScale=${out.presentation.fontScale}`);
  assert(out.presentation.fontFamily === 'serif', 'fontFamily changed');
  assert(out.presentation.spacingScale === 1, 'spacingScale changed');
  assert(out.presentation.maxProblemsPerPage === 4, 'maxProblemsPerPage changed');
});

test('sansSerif flips the font token only', () => {
  const out = sansSerif({ problems: [], presentation: { ...DEFAULT_PRESENTATION } });
  assert(out.presentation.fontFamily === 'sans', `fontFamily=${out.presentation.fontFamily}`);
  assert(out.presentation.fontScale === 1, 'fontScale changed');
});

test('extraSpacing scales spacing ×1.5 only', () => {
  const out = extraSpacing({ problems: [], presentation: { ...DEFAULT_PRESENTATION } });
  assert(out.presentation.spacingScale === 1.5, `spacingScale=${out.presentation.spacingScale}`);
});

test('fewerPerPage halves the per-page cap (4 → 2), min 1', () => {
  const out = fewerPerPage({ problems: [], presentation: { ...DEFAULT_PRESENTATION } });
  assert(out.presentation.maxProblemsPerPage === 2, `cap=${out.presentation.maxProblemsPerPage}`);
  const again = fewerPerPage({ problems: [], presentation: { ...DEFAULT_PRESENTATION, maxProblemsPerPage: 1 } });
  assert(again.presentation.maxProblemsPerPage === 1, 'cap must not drop below 1');
});

test('applyAccommodations composes in fixed order and dedupes', () => {
  const out = applyAccommodations([], ALL_FLAGS);
  assert(out.presentation.fontScale === 1.25, 'fontScale');
  assert(out.presentation.fontFamily === 'sans', 'fontFamily');
  assert(out.presentation.spacingScale === 1.5, 'spacingScale');
  assert(out.presentation.maxProblemsPerPage === 2, 'maxProblemsPerPage');
  const ids = activeAccommodationIds(ALL_FLAGS);
  assert(
    JSON.stringify(ids) === JSON.stringify(['reduced-count', 'sans-serif-font', 'large-print', 'increased-spacing', 'fewer-per-page']),
    `order=${JSON.stringify(ids)}`,
  );
});

test('applyAccommodations with empty flags returns defaults (new object)', () => {
  const out = applyAccommodations([], { ...EMPTY_FLAGS });
  assert(JSON.stringify(out.presentation) === JSON.stringify(DEFAULT_PRESENTATION), 'not defaults');
  assert(out.presentation !== DEFAULT_PRESENTATION, 'must not return the shared default object');
});

test('flagsFromIds round-trips through activeAccommodationIds', () => {
  const flags = flagsFromIds(['large-print', 'large-print', 'bogus-id']);
  assert(flags.largePrint === true, 'largePrint not set');
  assert(flags.sansSerif === false, 'sansSerif leaked');
  assert(JSON.stringify(activeAccommodationIds(flags)) === JSON.stringify(['large-print']), 'ids mismatch');
});

// ── 2. anonymity / PII-shape rejection ────────────────────────────────────────

test('looksLikePersonalData flags names, emails, phones, long digits', () => {
  assert(looksLikePersonalData('John Smith') === true, 'full name missed');
  assert(looksLikePersonalData('Group A john.smith@example.com') === true, 'email missed');
  assert(looksLikePersonalData('Group A 555-123-4567') === true, 'phone missed');
  assert(looksLikePersonalData('Group 123456') === true, 'long digits missed');
  assert(looksLikePersonalData('Group A') === false, 'Group A flagged');
  assert(looksLikePersonalData('LP group') === false, 'LP group flagged');
  assert(looksLikePersonalData('') === false, 'empty flagged');
});

test('validateGroupInput rejects PII-shaped labels', () => {
  const bad = validateGroupInput({ label: 'John Smith', studentCount: 3, flags: { ...ALL_FLAGS } });
  assert(bad.ok === false, 'accepted a full name');
  assert(bad.errors.some((e) => e.includes('anonymous')), 'no anonymity guidance in error');
  const good = validateGroupInput({ label: 'Group A', studentCount: 3, flags: { ...ALL_FLAGS } });
  assert(good.ok === true, `rejected valid input: ${good.errors.join('; ')}`);
});

test('validateGroupInput enforces label length, count, and ≥1 accommodation', () => {
  const long = validateGroupInput({ label: 'x'.repeat(25), studentCount: 1, flags: { ...ALL_FLAGS } });
  assert(long.ok === false, 'accepted overlong label');
  const neg = validateGroupInput({ label: 'Group A', studentCount: -1, flags: { ...ALL_FLAGS } });
  assert(neg.ok === false, 'accepted negative count');
  const frac = validateGroupInput({ label: 'Group A', studentCount: 1.5, flags: { ...ALL_FLAGS } });
  assert(frac.ok === false, 'accepted fractional count');
  const none = validateGroupInput({ label: 'Group A', studentCount: 1, flags: { ...EMPTY_FLAGS } });
  assert(none.ok === false, 'accepted zero accommodations');
});

test('validateClassLabel rejects PII-shaped class labels', () => {
  const bad = validateClassLabel('Algebra 2 John Smith period');
  assert(bad.ok === false, 'accepted name in class label');
  const good = validateClassLabel('Algebra 2 — Period 3');
  assert(good.ok === true, 'rejected valid class label');
});

// ── 3. store CRUD ─────────────────────────────────────────────────────────────

test('store: full CRUD round-trips through storage', () => {
  const storage = memStorage();
  const store = createAccommodationStore(storage);

  const list = store.createList('Algebra 2 — Period 3');
  assert(list.groups.length === 0, 'new list should have no groups');

  const g1 = store.addGroup(list.id, { label: 'Group A', studentCount: 3, flags: { ...ALL_FLAGS } });
  const g2 = store.addGroup(list.id, {
    label: 'Group B',
    studentCount: 1,
    flags: { ...EMPTY_FLAGS, largePrint: true },
  });
  assert(store.getList(list.id)!.groups.length === 2, 'groups not persisted');

  const updated = store.updateGroup(list.id, g2.id, { studentCount: 2 });
  assert(updated.studentCount === 2, 'update did not persist');

  store.removeGroup(list.id, g1.id);
  assert(store.getList(list.id)!.groups.length === 1, 'remove failed');

  store.deleteList(list.id);
  assert(store.getList(list.id) === null, 'delete failed');
  assert(store.listLists().length === 0, 'list not removed');
});

test('store: stored JSON carries no PII-shaped fields by construction', () => {
  const storage = memStorage();
  const store = createAccommodationStore(storage);
  const list = store.createList('Geometry — Period 1');
  store.addGroup(list.id, { label: 'Group A', studentCount: 3, flags: { ...ALL_FLAGS } });

  const raw = storage.raw().get('euclid.accommodationLists.v1');
  assert(!!raw, 'nothing persisted');
  const parsed = JSON.parse(raw!);
  const groupKeys = Object.keys(parsed[0].groups[0]).sort();
  assert(
    JSON.stringify(groupKeys) === JSON.stringify(['flags', 'id', 'label', 'studentCount']),
    `unexpected group fields: ${groupKeys.join(',')}`,
  );
  const blob = JSON.stringify(parsed);
  // Strip machine-generated tokens (uuids, ISO timestamps) — the PII heuristics
  // target human-entered labels, and a random uuid can contain digit runs that
  // look phone-shaped. What matters: no name/email/ID-shaped *label* content.
  const scrubbed = blob
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '')
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d+Z/g, '')
    .replace(/Group A|Geometry|Period/g, '');
  assert(!looksLikePersonalData(scrubbed), `blob looks personal: ${scrubbed.slice(0, 120)}`);
});

test('store: addGroup rejects PII labels and bad counts (throws)', () => {
  const store = createAccommodationStore(memStorage());
  const list = store.createList('Algebra 1');
  let threw = 0;
  try { store.addGroup(list.id, { label: 'Jane Doe', studentCount: 2, flags: { ...ALL_FLAGS } }); }
  catch { threw++; }
  try { store.addGroup(list.id, { label: 'Group A', studentCount: -2, flags: { ...ALL_FLAGS } }); }
  catch { threw++; }
  assert(threw === 2, `expected 2 throws, got ${threw}`);
  assert(store.getList(list.id)!.groups.length === 0, 'invalid group was persisted');
});

test('store: corrupted storage degrades to empty (never throws on read)', () => {
  const storage = memStorage();
  storage.setItem('euclid.accommodationLists.v1', 'not-json{{{');
  const store = createAccommodationStore(storage);
  assert(store.listLists().length === 0, 'corrupt payload not handled');
});

// ── 4. version planner ────────────────────────────────────────────────────────

function makeListWithGroups(): ReturnType<ReturnType<typeof createAccommodationStore>['getList']> {
  const store = createAccommodationStore(memStorage());
  const list = store.createList('Algebra 2 — Period 3');
  store.addGroup(list.id, { label: 'Group A', studentCount: 3, flags: { ...ALL_FLAGS } });
  store.addGroup(list.id, { label: 'Group B', studentCount: 0, flags: { ...EMPTY_FLAGS, largePrint: true } });
  return store.getList(list.id);
}

test('planVersions emits base + one version per group, in order', () => {
  const list = makeListWithGroups();
  const plan = planVersions(stubProblems(5), list!);
  assert(plan.all().length === 3, `expected 3 versions, got ${plan.all().length}`);
  assert(plan.all()[0].kind === 'base', 'base must be first');
  assert(plan.groups.length === 2, 'group count wrong');
  assert(plan.groups[0].label === 'Group A', 'order not preserved');
});

test('print counts: groups get studentCount, base gets null, zero-student group kept', () => {
  const list = makeListWithGroups();
  const plan = planVersions(stubProblems(5), list!);
  assert(plan.base.copiesToPrint === null, 'base should have null copies');
  assert(plan.groups[0].copiesToPrint === 3, 'Group A copies wrong');
  assert(plan.groups[1].copiesToPrint === 0, 'Group B (0 students) copies wrong');
  assert(plan.groups[1].dividerText.includes('no copies needed'), 'zero-student divider wrong');
  assert(plan.groups[0].dividerText.includes('print 3 copies'), `divider: ${plan.groups[0].dividerText}`);
});

test('group presentations reflect their flags; base stays default', () => {
  const list = makeListWithGroups();
  const plan = planVersions(stubProblems(5), list!);
  const a = plan.groups[0].presentation;
  assert(a.fontScale === 1.25 && a.fontFamily === 'sans' && a.spacingScale === 1.5 && a.maxProblemsPerPage === 2, 'Group A presentation wrong');
  const b = plan.groups[1].presentation;
  assert(b.fontScale === 1.25 && b.fontFamily === 'serif', 'Group B presentation wrong');
  assert(JSON.stringify(plan.base.presentation) === JSON.stringify(DEFAULT_PRESENTATION), 'base presentation mutated');
  assert(plan.base.answerKeyLabel === 'Answer Key', 'base key label wrong');
  assert(plan.groups[0].answerKeyLabel.includes('Group A'), 'group key label wrong');
});

test('null/empty class list yields base version only', () => {
  const p1 = planVersions(stubProblems(2), null);
  assert(p1.all().length === 1 && p1.groups.length === 0, 'null list should give base only');
  const store = createAccommodationStore(memStorage());
  const empty = store.createList('Empty class');
  const p2 = planVersions(stubProblems(2), empty);
  assert(p2.all().length === 1, 'empty list should give base only');
});

// ── 5. answer-key invariant across every flag combination ─────────────────────

test('answer keys stay matched for all 16 flag combinations', () => {
  const problems = stubProblems(6);
  for (let mask = 0; mask < 16; mask++) {
    const flags: AccommodationFlags = {
      largePrint: !!(mask & 1),
      sansSerif: !!(mask & 2),
      extraSpacing: !!(mask & 4),
      fewerPerPage: !!(mask & 8),
      reducedCount: false,
    };
    const store = createAccommodationStore(memStorage());
    const list = store.createList('T');
    // mask 0 (no flags) is rejected by store validation (a group needs ≥1
    // accommodation), so build that list literally — planVersions itself
    // accepts it fine (it just yields a base-equivalent version).
    const fullList =
      mask === 0
        ? {
            id: list.id,
            classLabel: 'T',
            groups: [{ id: 'g0', label: 'G', studentCount: 2, flags }],
            updatedAt: new Date().toISOString(),
          }
        : (store.addGroup(list.id, { label: 'G', studentCount: 2, flags }),
          store.getList(list.id)!);
    const plan = planVersions(problems, fullList);

    // Problems must be byte-identical before/after (presentation-only).
    assert(
      JSON.stringify(plan.groups[0].problems) === JSON.stringify(problems),
      `mask ${mask}: problems altered by transform`,
    );
    // Keys derived per-version must match the base key entry-for-entry.
    const mismatches = findKeyMismatches(plan, serialize);
    assert(mismatches.length === 0, `mask ${mask}: key mismatch ${JSON.stringify(mismatches[0])}`);
  }
});

test('buildAnswerKey numbers from 1 per version', () => {
  const key = buildAnswerKey(stubProblems(3), serialize);
  assert(key[0].number === 1 && key[2].number === 3, 'numbering wrong');
  assert(typeof key[0].text === 'string' && key[0].text.length > 0, 'empty key text');
});

test('presentationForFlags is a pure convenience over applyAccommodations', () => {
  const p: Presentation = presentationForFlags({ ...EMPTY_FLAGS, extraSpacing: true });
  assert(p.spacingScale === 1.5 && p.fontScale === 1, 'wrong presentation');
});

// ── report ────────────────────────────────────────────────────────────────────

console.log(`\nPhase 1 accommodation tests: ${passed} passed, ${failed} failed`);
if (failures.length) {
  console.log('FAILURES:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
} else {
  console.log('All green.');
}

// Compile & run:
//   cd ~/workspace/euclid-worksheet && npx tsc src/lib/accommodations/__tests__/run-phase1-tests.ts \
//     src/lib/accommodations/types.ts src/lib/accommodations/store.ts \
//     src/lib/accommodations/transforms.ts src/lib/accommodations/versions.ts \
//     src/lib/accommodations/index.ts \
//     --outDir /tmp/accom-tests --module commonjs --target es2020 \
//     --moduleResolution node --strict --esModuleInterop --skipLibCheck \
//   && node /tmp/accom-tests/src/lib/accommodations/__tests__/run-phase1-tests.js
