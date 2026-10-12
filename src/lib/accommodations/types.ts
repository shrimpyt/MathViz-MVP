// types.ts
// Phase 1 types for the Euclid Engine IEP accommodation generator.
// Pure types + small runtime catalogs. No JSX, no side effects.
//
// Design rule (from the Oct 10 agreement): groups are ANONYMOUS by construction.
// The only per-group datum is an integer student count. There is no field for a
// name, ID, or any other student-identifying value — so there is nothing to leak.

/** Phase 1 accommodation catalog (renderer-level, presentation-only). */
export const PHASE1_ACCOMMODATION_IDS = [
  'large-print',
  'sans-serif-font',
  'increased-spacing',
  'fewer-per-page',
] as const;

export type Phase1AccommodationId = (typeof PHASE1_ACCOMMODATION_IDS)[number];

/**
 * Content accommodation catalog (Phase 2): transforms that change the problem
 * list itself rather than just its presentation. Currently just reduced-count.
 */
export const CONTENT_ACCOMMODATION_IDS = ['reduced-count'] as const;

export type ContentAccommodationId = (typeof CONTENT_ACCOMMODATION_IDS)[number];

/** Every accommodation id the engine knows about. */
export type AccommodationId = Phase1AccommodationId | ContentAccommodationId;

/** All ids in one list, for validation and UI display-name lookups. */
export const ALL_ACCOMMODATION_IDS: readonly AccommodationId[] = [
  ...CONTENT_ACCOMMODATION_IDS,
  ...PHASE1_ACCOMMODATION_IDS,
];

/**
 * Fixed composition order for transforms. Content transforms (Phase 2) run
 * before presentation transforms; within Phase 1 the order is fixed so the
 * same group + same seed always yields byte-identical output.
 */
export const ACCOMMODATION_COMPOSITION_ORDER: readonly AccommodationId[] = [
  'reduced-count',
  'sans-serif-font',
  'large-print',
  'increased-spacing',
  'fewer-per-page',
];

/** Plain-language display names for UI labels and divider pages. */
export const ACCOMMODATION_DISPLAY_NAMES: Record<AccommodationId, string> = {
  'reduced-count': 'Fewer problems — 25% reduction, TEKS coverage kept',
  'large-print': 'Large print',
  'sans-serif-font': 'Sans-serif font',
  'increased-spacing': 'Increased spacing',
  'fewer-per-page': 'Fewer per page',
};

/** Set of accommodation flags on a group. A set — each flag applies at most once. */
export interface AccommodationFlags {
  largePrint: boolean;
  sansSerif: boolean;
  extraSpacing: boolean;
  fewerPerPage: boolean;
  /**
   * Reduced problem count: target 75% of base, with a HARD guarantee that
   * every TEKS standard in the base version keeps ≥1 problem (coverage wins
   * over the count on tiny bases — see selectReducedProblems).
   */
  reducedCount: boolean;
}

export const EMPTY_FLAGS: AccommodationFlags = {
  largePrint: false,
  sansSerif: false,
  extraSpacing: false,
  fewerPerPage: false,
  reducedCount: false,
};

const FLAG_TO_ID: Record<keyof AccommodationFlags, AccommodationId> = {
  reducedCount: 'reduced-count',
  largePrint: 'large-print',
  sansSerif: 'sans-serif-font',
  extraSpacing: 'increased-spacing',
  fewerPerPage: 'fewer-per-page',
};

/** Active accommodation ids from a flags object, in fixed composition order. */
export function activeAccommodationIds(flags: AccommodationFlags): AccommodationId[] {
  return ACCOMMODATION_COMPOSITION_ORDER.filter((id) => {
    const flagKey = (Object.keys(FLAG_TO_ID) as (keyof AccommodationFlags)[]).find(
      (k) => FLAG_TO_ID[k] === id,
    );
    return flagKey ? flags[flagKey] : false;
  });
}

/** Build a flags object from a list of ids (dedupes; ignores unknown ids). */
export function flagsFromIds(ids: readonly string[]): AccommodationFlags {
  const flags: AccommodationFlags = { ...EMPTY_FLAGS };
  for (const id of ids) {
    const flagKey = (Object.keys(FLAG_TO_ID) as (keyof AccommodationFlags)[]).find(
      (k) => FLAG_TO_ID[k] === id,
    );
    if (flagKey) flags[flagKey] = true;
  }
  return flags;
}

export interface AccommodationGroup {
  /** uuid, generated client-side. Identifies the group, never a student. */
  id: string;
  /** Teacher-facing anonymous label, e.g. "Group A". Never a student name. */
  label: string;
  /** The ONLY student datum stored: how many students are in this group. */
  studentCount: number;
  flags: AccommodationFlags;
}

export interface ClassAccommodationList {
  /** uuid, generated client-side. */
  id: string;
  /** e.g. "Algebra 2 — Period 3". Free text; UI warns against student info. */
  classLabel: string;
  groups: AccommodationGroup[];
  /** ISO timestamp of last mutation. */
  updatedAt: string;
}

/** Input for creating/updating a group (id assigned by the store). */
export interface NewGroupInput {
  label: string;
  studentCount: number;
  flags: AccommodationFlags;
}

/**
 * Renderer-level presentation overrides produced by Phase 1 transforms.
 * Consumed later by the PDF renderer (PdfDocument `presentation` prop) and the
 * web preview. Presentation only — never carries math content.
 */
export interface Presentation {
  /** Multiplier for text/diagram sizing. 1 = default. */
  fontScale: number;
  /** Font family token. 'serif' = current default (WorksheetSerif). */
  fontFamily: 'serif' | 'sans';
  /** Multiplier for margins/padding/line-height and problem-card gaps. */
  spacingScale: number;
  /** Max problems rendered per PDF page for this version. */
  maxProblemsPerPage: number;
}

export const DEFAULT_PRESENTATION: Presentation = {
  fontScale: 1,
  fontFamily: 'serif',
  spacingScale: 1,
  maxProblemsPerPage: 4,
};

/** localStorage namespace for class lists. Versioned so future migrations are safe. */
export const ACCOMMODATION_STORAGE_KEY = 'euclid.accommodationLists.v1';

/** UI guardrail: group labels stay short and generic. */
export const MAX_GROUP_LABEL_LENGTH = 24;
