// versions.ts
// Version planner for the IEP accommodation generator.
//
// Given one base MathProblem[] (the single source of truth from the seeded
// generator) and a class accommodation list, this produces a version plan:
// the base version plus one version per accommodation group, each carrying its
// own transformed presentation and its own answer key.
//
// Invariant (spec §4): an answer key is ALWAYS derived from its version's own
// final problem list — never from the base version. In Phase 1 the problems are
// identical across versions, but each version still gets its own key, so a
// later phase (e.g. reduced choices) cannot introduce a mismatch.

import type { MathProblem } from '../types';
import {
  ACCOMMODATION_DISPLAY_NAMES,
  activeAccommodationIds,
  type AccommodationGroup,
  type ClassAccommodationList,
  type Presentation,
} from './types';
import { applyAccommodations, type VersionInput } from './transforms';

export interface AnswerKeyEntry {
  /** 1-based number within its own version (numbering restarts per version). */
  number: number;
  text: string;
}

export interface PlannedVersion {
  kind: 'base' | 'group';
  /** 'base' for the base version, otherwise the group's uuid. */
  versionId: string;
  /** Display label: 'Base' or the group's anonymous label. */
  label: string;
  /** Students in this group (0 for base — base covers everyone else). */
  studentCount: number;
  /**
   * Copies the teacher should print for this version's divider page.
   * null for the base version: the teacher prints for the students who are
   * not in any accommodation group (a number we deliberately never store).
   */
  copiesToPrint: number | null;
  accommodations: string[];
  problems: MathProblem[];
  presentation: Presentation;
  /** Divider-page line, e.g. "Group A — Large print · 3 students · print 3 copies". */
  dividerText: string;
  /** Answer-key section header for this version. */
  answerKeyLabel: string;
}

export interface VersionPlan {
  base: PlannedVersion;
  groups: PlannedVersion[];
  /** All versions in export order: base first, then groups in list order. */
  all(): PlannedVersion[];
}

function describeAccommodations(group: AccommodationGroup): string {
  const ids = activeAccommodationIds(group.flags);
  return ids.map((id) => ACCOMMODATION_DISPLAY_NAMES[id]).join(', ');
}

function dividerTextFor(kind: 'base' | 'group', group?: AccommodationGroup): string {
  if (kind === 'base' || !group) {
    return 'Base version — print for students without accommodations';
  }
  const desc = describeAccommodations(group);
  const copies =
    group.studentCount === 0
      ? '0 students — no copies needed'
      : `${group.studentCount} student${group.studentCount === 1 ? '' : 's'} · print ${group.studentCount} ${group.studentCount === 1 ? 'copy' : 'copies'}`;
  return `${group.label} — ${desc} · ${copies}`;
}

function answerKeyLabelFor(kind: 'base' | 'group', group?: AccommodationGroup): string {
  if (kind === 'base' || !group) return 'Answer Key';
  return `Answer Key — ${group.label} (${describeAccommodations(group)})`;
}

function toPlannedVersion(
  kind: 'base' | 'group',
  transformed: VersionInput,
  group?: AccommodationGroup,
): PlannedVersion {
  return {
    kind,
    versionId: kind === 'base' ? 'base' : group!.id,
    label: kind === 'base' ? 'Base' : group!.label,
    studentCount: kind === 'base' ? 0 : group!.studentCount,
    copiesToPrint: kind === 'base' ? null : group!.studentCount,
    accommodations: kind === 'base' ? [] : activeAccommodationIds(group!.flags),
    problems: transformed.problems,
    presentation: transformed.presentation,
    dividerText: dividerTextFor(kind, group),
    answerKeyLabel: answerKeyLabelFor(kind, group),
  };
}

/**
 * Build the version plan. Pure: no I/O, no mutation of inputs.
 * A null/empty class list yields the base version only (feature invisible).
 */
export function planVersions(
  problems: MathProblem[],
  list: ClassAccommodationList | null | undefined,
): VersionPlan {
  const baseInput: VersionInput = {
    problems,
    presentation: {
      fontScale: 1,
      fontFamily: 'serif',
      spacingScale: 1,
      maxProblemsPerPage: 4,
    },
  };
  const base = toPlannedVersion('base', baseInput);

  const groups: PlannedVersion[] = [];
  if (list && Array.isArray(list.groups)) {
    for (const group of list.groups) {
      const transformed = applyAccommodations(problems, group.flags);
      groups.push(toPlannedVersion('group', transformed, group));
    }
  }

  const ordered = [base, ...groups];
  return { base, groups, all: () => ordered };
}

/**
 * Build an answer key from a version's OWN final problem list.
 * The formatter is injected (normally formatAnswer from src/lib/answerKey.ts)
 * so this module stays decoupled from the key-formatting machinery.
 */
export function buildAnswerKey(
  problems: MathProblem[],
  formatAnswer: (p: MathProblem) => string,
): AnswerKeyEntry[] {
  return problems.map((p, i) => ({ number: i + 1, text: formatAnswer(p) }));
}

/**
 * Assert the Phase 1 invariant: every version's key matches the base key
 * entry-for-entry (transforms are presentation-only, so keys cannot drift).
 * Returns the list of mismatches (empty = invariant holds).
 */
export function findKeyMismatches(
  plan: VersionPlan,
  formatAnswer: (p: MathProblem) => string,
): { versionId: string; index: number; base: string; other: string }[] {
  const mismatches: { versionId: string; index: number; base: string; other: string }[] = [];
  const baseKey = buildAnswerKey(plan.base.problems, formatAnswer);
  for (const v of plan.groups) {
    const key = buildAnswerKey(v.problems, formatAnswer);
    const n = Math.max(baseKey.length, key.length);
    for (let i = 0; i < n; i++) {
      const b = baseKey[i]?.text;
      const o = key[i]?.text;
      if (b !== o) mismatches.push({ versionId: v.versionId, index: i, base: b ?? '<missing>', other: o ?? '<missing>' });
    }
  }
  return mismatches;
}
