// ── Worksheet settings: the recipe a worksheet is rebuilt from ───────────────
// A saved worksheet (Pro library) and a downloaded draft file both store the
// generator's settings plus the random seed, never the PDF. Because every
// factory is seeded (mulberry32) and pure, the same settings always rebuild
// the same problems and the same answer key. This module is the one place
// that (1) cleans settings read back from storage and (2) turns settings into
// problem sets, so the generator page and the saved library can't drift.

import { CURRICULUM_REGISTRY } from '../modules/CurriculumRegistry';
import type { CurriculumEntry, DifficultyLevel } from '../modules/CurriculumRegistry';
import type { DocumentType } from '../core/types';
import type { MathProblem, OutputMode } from './ProblemFactory';
import { FRAMEWORKS, type StandardsFramework } from './standards';

export const DOCUMENT_TYPES: readonly DocumentType[] = [
  'worksheet',
  'guided-notes',
  'review',
  'test',
  'classical-notes',
  'proof-two-column',
  'proof-fill-reasons',
  'proof-elements',
  'proof-blank',
  'sat-practice',
];

/** Topics per worksheet a saved recipe may hold (the server enforces the same cap). */
export const MAX_SAVED_TOPICS = 60;
export const MIN_COUNT = 1;
export const MAX_COUNT = 25;

export interface WorksheetSettings {
  docType: DocumentType;
  /** Custom title typed by the teacher; empty means the generated default. */
  title: string;
  topicIds: string[];
  seed: number;
  count: number;
  /** Advanced mode only: per-topic problem counts keyed by topic id. */
  topicCounts: Record<string, number>;
  advancedCounts: boolean;
  /** Display-only: which standards labels are printed. */
  framework: StandardsFramework;
  difficulty: DifficultyLevel;
  includeAnswerKey: boolean;
  wordProblems: boolean;
  includeDiagrams: boolean;
}

// ── Map DocumentType → EuclidEngine OutputMode ───────────────────────────────

export function toOutputMode(docType: DocumentType): OutputMode {
  if (docType === 'guided-notes') return 'GuidedNote';
  if (docType === 'review') return 'Review';
  if (docType === 'test') return 'Test';
  if (docType === 'classical-notes') return 'Classical';
  // proof-fill-reasons / proof-elements / sat-practice generate the clean
  // student version; presentation is threaded separately (proofDocMode) or
  // handled by the card itself. proof-two-column shows the complete proof
  // (Review), so it renders differently from proof-fill-reasons (Test).
  if (docType === 'proof-two-column') return 'Review';
  if (docType === 'proof-fill-reasons') return 'Test';
  if (docType === 'proof-elements') return 'Test';
  if (docType === 'proof-blank') return 'Test';
  if (docType === 'sat-practice') return 'Test';
  return 'Review'; // 'worksheet' → Review style (no step hints)
}

const clampCount = (n: number) => Math.min(MAX_COUNT, Math.max(MIN_COUNT, Math.floor(n)));

/** Problems requested for one topic under these settings. */
export function countForTopic(
  s: Pick<WorksheetSettings, 'advancedCounts' | 'topicCounts' | 'count'>,
  id: string,
): number {
  return s.advancedCounts ? clampCount(s.topicCounts[id] ?? s.count) : s.count;
}

/** Seed for the i-th selected topic. Offsets keep different topics from
 *  drawing identical sequences. Changing this changes every saved worksheet. */
export function topicSeed(seed: number, index: number): number {
  return seed + index * 7919;
}

/** One problem set per entry, in the order given. The generator page and
 *  the saved library both build worksheets through here. */
export function generateModuleProblemSets(
  entries: CurriculumEntry[],
  s: Pick<WorksheetSettings, 'docType' | 'seed' | 'count' | 'advancedCounts' | 'topicCounts' | 'difficulty' | 'wordProblems'>,
): MathProblem[][] {
  return entries.map((entry, i) =>
    entry.generate(toOutputMode(s.docType), topicSeed(s.seed, i), {
      count: countForTopic(s, entry.id),
      difficulty: s.difficulty,
      wordProblems: s.wordProblems,
    }),
  );
}

/** Registry entries for the settings' topics, skipping unknown ids. */
export function entriesForSettings(s: Pick<WorksheetSettings, 'topicIds'>): CurriculumEntry[] {
  return s.topicIds
    .map((id) => CURRICULUM_REGISTRY.find((t) => t.id === id))
    .filter((m): m is CurriculumEntry => !!m);
}

/** Rebuild the problem sets a saved worksheet describes. */
export function generateFromSettings(s: WorksheetSettings): MathProblem[][] {
  return generateModuleProblemSets(entriesForSettings(s), s);
}

export const DEFAULT_SETTINGS: WorksheetSettings = {
  docType: 'guided-notes',
  title: '',
  topicIds: [],
  seed: 42,
  count: 3,
  topicCounts: {},
  advancedCounts: false,
  framework: 'teks',
  difficulty: 2,
  includeAnswerKey: true,
  wordProblems: false,
  includeDiagrams: true,
};

/** Clean settings read back from a draft file or the saved library. Unknown
 *  or retired topics are dropped and out-of-range numbers are clamped, the
 *  same rules draft files have always followed; missing optional fields take
 *  the defaults so older drafts still load. Returns null when the value
 *  isn't settings at all. */
export function sanitizeSettings(raw: unknown): WorksheetSettings | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const d = raw as Record<string, unknown>;
  const out: WorksheetSettings = { ...DEFAULT_SETTINGS, topicCounts: {} };

  if (typeof d.docType === 'string' && (DOCUMENT_TYPES as readonly string[]).includes(d.docType)) {
    out.docType = d.docType as DocumentType;
  }
  if (typeof d.title === 'string') out.title = d.title.slice(0, 120);
  if (Array.isArray(d.topicIds)) {
    const seen = new Set<string>();
    out.topicIds = d.topicIds
      .filter(
        (id): id is string =>
          typeof id === 'string' &&
          CURRICULUM_REGISTRY.some((t) => t.id === id && !t.underConstruction),
      )
      .filter((id) => (seen.has(id) ? false : (seen.add(id), true)))
      .slice(0, MAX_SAVED_TOPICS);
  }
  if (typeof d.seed === 'number' && Number.isFinite(d.seed)) out.seed = Math.floor(d.seed);
  if (typeof d.count === 'number' && Number.isFinite(d.count)) out.count = clampCount(d.count);
  if (d.topicCounts && typeof d.topicCounts === 'object' && !Array.isArray(d.topicCounts)) {
    for (const [id, v] of Object.entries(d.topicCounts as Record<string, unknown>)) {
      if (typeof v === 'number' && Number.isFinite(v)) out.topicCounts[id] = clampCount(v);
    }
  }
  if (typeof d.advancedCounts === 'boolean') out.advancedCounts = d.advancedCounts;
  if (typeof d.framework === 'string' && FRAMEWORKS.some((f) => f.id === d.framework)) {
    out.framework = d.framework as StandardsFramework;
  }
  if (d.difficulty === 1 || d.difficulty === 2 || d.difficulty === 3) out.difficulty = d.difficulty;
  if (typeof d.includeAnswerKey === 'boolean') out.includeAnswerKey = d.includeAnswerKey;
  if (typeof d.wordProblems === 'boolean') out.wordProblems = d.wordProblems;
  if (typeof d.includeDiagrams === 'boolean') out.includeDiagrams = d.includeDiagrams;
  return out;
}

/** Only the settings fields, in a fixed order, for saving. Per-topic
 *  counts for topics that aren't selected are dropped. */
export function settingsForSave(s: WorksheetSettings): WorksheetSettings {
  const topicCounts: Record<string, number> = {};
  for (const id of s.topicIds) {
    if (typeof s.topicCounts[id] === 'number') topicCounts[id] = s.topicCounts[id];
  }
  return {
    docType: s.docType,
    title: s.title,
    topicIds: [...s.topicIds],
    seed: s.seed,
    count: s.count,
    topicCounts,
    advancedCounts: s.advancedCounts,
    framework: s.framework,
    difficulty: s.difficulty,
    includeAnswerKey: s.includeAnswerKey,
    wordProblems: s.wordProblems,
    includeDiagrams: s.includeDiagrams,
  };
}
