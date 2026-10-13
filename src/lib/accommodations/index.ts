// index.ts, public surface of the accommodations module (Phase 1).
// Pure logic only: types, transforms, version planner, localStorage store.
// No JSX, no side effects at import time.

export {
  PHASE1_ACCOMMODATION_IDS,
  CONTENT_ACCOMMODATION_IDS,
  ALL_ACCOMMODATION_IDS,
  ACCOMMODATION_COMPOSITION_ORDER,
  ACCOMMODATION_DISPLAY_NAMES,
  EMPTY_FLAGS,
  DEFAULT_PRESENTATION,
  ACCOMMODATION_STORAGE_KEY,
  MAX_GROUP_LABEL_LENGTH,
  activeAccommodationIds,
  flagsFromIds,
  type Phase1AccommodationId,
  type ContentAccommodationId,
  type AccommodationId,
  type AccommodationFlags,
  type AccommodationGroup,
  type ClassAccommodationList,
  type NewGroupInput,
  type Presentation,
} from './types';

export {
  createAccommodationStore,
  validateGroupInput,
  validateClassLabel,
  looksLikePersonalData,
  type AccommodationStore,
  type KeyValueStorage,
  type ValidationResult,
} from './store';

export {
  largePrint,
  sansSerif,
  extraSpacing,
  fewerPerPage,
  reducedCount,
  wordBank,
  selectReducedProblems,
  reducedCountTarget,
  applyAccommodations,
  presentationForFlags,
  type AccommodationTransform,
  type VersionInput,
} from './transforms';

export { buildWordBank } from './wordbank';

export {
  planVersions,
  buildAnswerKey,
  findKeyMismatches,
  type AnswerKeyEntry,
  type PlannedVersion,
  type VersionPlan,
} from './versions';
