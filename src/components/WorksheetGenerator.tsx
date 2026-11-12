"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Tooltip,
  FormControlLabel,
  Switch,
  IconButton,
  Alert,
  Collapse,
  Chip,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ClickAwayListener,
} from '@mui/material';
import {
  Save,
  UploadFile,
  BookmarkAdd,
  PictureAsPdf,
  Casino,
  ExpandMore,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { PDFDownloadLink, Document as PdfRendererDocument } from '@react-pdf/renderer';
import PdfDocument, { PdfVersionPages, AccommodationDividerPage } from './PdfDocument';
import { EuclidEngine } from './EuclidEngine';
import type { ClassicalGroup } from './EuclidEngine';
import AccommodationsPanel from './AccommodationsPanel';
import {
  createAccommodationStore,
  planVersions,
  type ClassAccommodationList,
  type NewGroupInput,
} from '../lib/accommodations';
import { CURRICULUM_REGISTRY } from '../modules/CurriculumRegistry';
import { CATALOG_ORDER, COURSES, COURSE_GROUPS } from '../modules/topicCatalog';
import type { RegisteredEntry, DifficultyLevel } from '../modules/CurriculumRegistry';
import { DocumentType, problemToQuestion } from '../core/types';
import {
  ANON_ACCOUNT,
  FREE_GENERATION_LIMIT,
  bumpLocalUsage,
  exportGateCopy,
  isFreeTopic,
  isTopicAvailable,
  readLocalUsage,
  type AccountState,
} from '../lib/plan';
import { readBuilderSession, sessionStore, writeBuilderSession } from '../lib/builderSession';
import {
  createPortalUrl,
  fetchAccount,
  logExportEvent,
  recordGeneration,
  GOOGLE_SIGNIN_URL,
  fetchSignInMethods,
  requestSignInCode,
  signOut as apiSignOut,
  verifySignInCode,
  listSavedWorksheets,
  saveWorksheet,
  fetchTaughtShelf,
  markTaughtLessons,
  removeTaughtLessons,
} from '../lib/account';
import {
  countForTopic,
  generateModuleProblemSets,
  mixesTopics,
  orderProblemSets,
  sanitizeSettings,
  settingsForSave,
  toOutputMode,
  type WorksheetSettings,
} from '../lib/worksheetSettings';
import { standardsFor, FRAMEWORKS, frameworkMeta, type StandardsFramework } from '../lib/standards';
import { entryMatches, indexEntry, type EntryIndex } from '../lib/topicSearch';
import {
  localStore,
  readRememberedCourse,
  rememberCourse,
  splitTotal,
  totalRange,
  trayTotal,
} from '../lib/pickerPrefs';
import {
  againLessons,
  markOnShelf,
  removeFromShelf,
  reviewCounts,
  reviewLessons,
  sortShelf,
  taughtWhen,
  type ShelfLesson,
} from '../lib/taughtShelf';
import type { OutputMode, MathProblem } from '@/lib/ProblemFactory';

const drawerWidth = 320;

// DocumentType → OutputMode lives with the settings code so saved
// worksheets rebuild through the same mapping; re-exported for callers.
export { toOutputMode };

function modeWord(docType: DocumentType): string {
  if (docType === 'guided-notes') return 'Notes';
  if (docType === 'test') return 'Assessment';
  if (docType === 'review') return 'Review';
  if (docType === 'classical-notes') return 'Classical Notes';
  if (docType === 'proof-two-column') return 'Two-Column Proofs';
  if (docType === 'proof-fill-reasons') return 'Proof Practice';
  if (docType === 'proof-blank') return 'Proof Workspace';
  if (docType === 'proof-elements') return "Elements";
  if (docType === 'sat-practice') return 'SAT Practice';
  return 'Practice';
}

// ── Export scope guard ───────────────────────────────────────────────────────
// Course label for a registry entry, from the topic catalog. Used by
// StepReview to show exactly which lessons are in the packet before export,
// and to warn when the selection mixes courses (e.g. stale Algebra II
// selections inside a Geometry packet).
function courseOfEntry(entry: RegisteredEntry): string {
  return entry.course;
}

// Grade 6 and Pre-Algebra share middle-school classrooms, so mixing them is
// not flagged as a stray selection (it wasn't before the courses split).
function courseFamily(course: string): string {
  return course === 'Grade 6' || course === 'Pre-Algebra' ? 'Middle School' : course;
}

// Accordion key for a concept group. Group names repeat across courses
// (Systems, Geometry, ...), so the key carries the course too.
function groupKeyOf(entry: Pick<RegisteredEntry, 'course' | 'group'>): string {
  return `${entry.course}::${entry.group}`;
}

// Picker views: every course, plus Grade 7 and Grade 8 as views of Pre-Algebra.
const SUBJECT_VIEWS: string[] = COURSES.flatMap((c) =>
  c === 'Pre-Algebra' ? [c, 'Grade 7', 'Grade 8'] : [c]
);

const REGISTRY_BY_ID = new Map(CURRICULUM_REGISTRY.map((e) => [e.id, e]));

function entryInView(entry: RegisteredEntry, view: string): boolean {
  if (view === 'All') return true;
  if (view === 'Grade 7') return entry.course === 'Pre-Algebra' && entry.grade === 7;
  if (view === 'Grade 8') return entry.course === 'Pre-Algebra' && entry.grade === 8;
  return entry.course === view;
}

// ── Document mode definitions (sidebar segmented control) ────────────────────

const DOC_MODES: {
  value: DocumentType;
  label: string;
  emoji: string;
  blurb: string;
}[] = [
  { value: 'guided-notes', label: 'Guided Notes', emoji: '📝', blurb: 'Fill-in-the-blank scaffolding' },
  { value: 'review', label: 'Review', emoji: '📊', blurb: 'High-density practice, answers shown' },
  { value: 'test', label: 'Test', emoji: '✅', blurb: 'Formal assessment, no hints' },
  { value: 'worksheet', label: 'Worksheet', emoji: '📄', blurb: 'Everyday practice set' },
  { value: 'classical-notes', label: 'Classical Notes', emoji: '🏛️', blurb: 'Definitions printed, reasoning yours' },
  { value: 'proof-fill-reasons', label: 'Proofs: Fill in the Blanks', emoji: '✏️', blurb: 'Proof table printed, blanks left for students to complete' },
  { value: 'proof-blank', label: 'Proofs: Blank Workspace', emoji: '⬜', blurb: 'Just Given and Prove, one big open space to write the whole proof' },
  { value: 'sat-practice', label: 'SAT Practice', emoji: '⏱️', blurb: 'Timed SAT-style module' },
];

// ── Sidebar section wrapper: consistent label row ─────────────────────────────

function PanelSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Box sx={{ mb: 3.5 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1.25,
          px: 0.5,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            textTransform: 'uppercase',
            letterSpacing: 2,
            color: 'rgba(148,163,184,0.85)',
            fontWeight: 700,
            fontSize: '0.66rem',
          }}
        >
          {title}
        </Typography>
        {action}
      </Box>
      {children}
    </Box>
  );
}

// ── Error boundary around the live preview ────────────────────────────────────

class PreviewErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Worksheet preview failed:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <Box
          sx={{
            width: '8.5in',
            maxWidth: '100%',
            p: 4,
            bgcolor: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: 2,
            color: '#7f1d1d',
            mb: 4,
          }}
        >
          <Typography variant="h6" gutterBottom>
            Preview failed to render
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {this.state.error.message || 'Something went wrong while building the preview.'}
          </Typography>
          <Button
            variant="outlined"
            color="error"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}

// ── Draft save / load messages ──────────────────────────────────────────────

function draftSavedText(fileName: string, topics: number): string {
  const base = `Draft saved as ${fileName} in your downloads. Load draft opens it again, on this computer or another.`;
  return topics === 0 ? `${base} It has no topics selected yet.` : base;
}

function draftLoadedText(fileName: string, topics: number, skipped: number): string {
  const t = `${topics} topic${topics === 1 ? '' : 's'}`;
  const skip =
    skipped > 0
      ? ` ${skipped} topic${skipped === 1 ? ' was' : 's were'} left out because ${skipped === 1 ? "it's" : "they're"} no longer offered.`
      : '';
  return `Loaded ${fileName}: ${t}, with its settings and problem seed.${skip}`;
}

// ── Draft file shape ──────────────────────────────────────────────────────────

interface DraftFile {
  app: 'euclid-engine-worksheet';
  version: 1;
  savedAt: string;
  docType: DocumentType;
  title: string;
  topicIds: string[];
  seed: number;
  count: number;
  /** Advanced mode: per-topic problem counts, keyed by topic id. Topics
      without an entry use the global `count`. Optional so older drafts load. */
  topicCounts?: Record<string, number>;
  advancedCounts?: boolean;
  /** Standards framework the labels were shown in. Optional so older drafts load. */
  framework?: StandardsFramework;
  difficulty: DifficultyLevel;
  includeAnswerKey: boolean;
  wordProblems?: boolean;
  includeDiagrams?: boolean;
  /** Missing in drafts saved before topic mixing; those load grouped. */
  keepTopicsGrouped?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WorksheetGenerator() {
  const [docType, setDocType] = useState<DocumentType>('guided-notes');
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);

  const [customTitle, setCustomTitle] = useState('');
  const [seed, setSeed] = useState(42);
  const [count, setCount] = useState(3);
  // Advanced mode: a separate problem count per selected topic. The map only
  // holds topics the user has given a custom count; anything else falls back
  // to the global `count` above.
  const [advancedCounts, setAdvancedCounts] = useState(false);
  const [topicCounts, setTopicCounts] = useState<Record<string, number>>({});
  // Standards framework: TEKS is native to the catalog; Common Core labels
  // come from the crosswalk in lib/standards. Display-only: generation,
  // problems and keys are identical under either framework.
  const [framework, setFramework] = useState<StandardsFramework>('teks');
  const stdFor = (e: { id: string; teks: string }) => standardsFor(e.id, e.teks, framework);
  const clampCount = (n: number) => Math.min(25, Math.max(1, Math.floor(n)));
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(2);
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true);
  const [wordProblems, setWordProblems] = useState(false);
  const [includeDiagrams, setIncludeDiagrams] = useState(true);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // ── Account / pay gate (soft gate, see lib/plan.ts) ──
  const [account, setAccount] = useState<AccountState>(ANON_ACCOUNT);
  const [gateMsg, setGateMsg] = useState<string | null>(null);
  // The header sign-in menu. Lifted here so other places (the export
  // explanation, /login) can open it.
  const [signInOpen, setSignInOpen] = useState(false);
  const [exportGateOpen, setExportGateOpen] = useState(false);
  // /login sends people here with ?signin=open; open the menu and take the
  // flag off the address so a reload doesn't reopen it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('signin') !== 'open') return;
    // A one-time read of the address after mount (static page).
    setSignInOpen(true);
    params.delete('signin');
    const rest = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : '') + window.location.hash);
  }, []);
  useEffect(() => {
    let live = true;
    fetchAccount().then((a) => {
      if (live) setAccount(a ?? { ...ANON_ACCOUNT, used: readLocalUsage() });
      if (live && !a) setShelfStatus('signed-out');
    });
    return () => {
      live = false;
    };
  }, []);
  const isPro = account.plan === 'pro';

  // ── Taught shelf (saved to the teacher's account) ──
  // Every export adds its lessons on the server; the app keeps its own copy
  // in step so the shelf updates without a reload.
  const [shelf, setShelf] = useState<ShelfLesson[]>([]);
  const [shelfStatus, setShelfStatus] = useState<'loading' | 'ok' | 'signed-out' | 'unavailable'>('loading');
  const [shelfMsg, setShelfMsg] = useState<string | null>(null);
  useEffect(() => {
    if (account.status !== 'signed-in') return;
    let live = true;
    fetchTaughtShelf().then((r) => {
      if (!live) return;
      if (r.status === 'ok') {
        setShelf(sortShelf(r.items));
        setShelfStatus('ok');
      } else setShelfStatus(r.status === 'signed-out' ? 'signed-out' : 'unavailable');
    });
    return () => {
      live = false;
    };
  }, [account.status, account.email]);
  // ── Wizard step: 0 Format · 1 Topics · 2 Accommodations · 3 Review ──
  const [step, setStep] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── IEP accommodations ──
  // Anonymous, localStorage-backed class lists. The version plan is derived
  // from the same base problem set, so every version shares identical math.
  const [accomStore] = useState(() => createAccommodationStore());
  const [accomList, setAccomList] = useState<ClassAccommodationList | null>(null);
  const [activeVersionId, setActiveVersionId] = useState<string>('base');
  const [accomError, setAccomError] = useState<string | null>(null);

  useEffect(() => {
    // Load the most recently updated class list (browser only).
    try {
      const lists = accomStore.listLists();
      if (lists.length > 0) {
        const latest = [...lists].sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt)
        )[0];
        setAccomList(latest);
      }
    } catch {
      // localStorage unavailable, the feature simply stays hidden.
    }
  }, [accomStore]);

  const refreshAccomList = (id: string) => {
    const l = accomStore.getList(id);
    setAccomList(l);
    if (l) {
      // If the active version's group was deleted, fall back to base.
      setActiveVersionId((v) =>
        v !== 'base' && !l.groups.some((g) => g.id === v) ? 'base' : v
      );
    }
  };

  const handleAccomOp = (op: () => ClassAccommodationList | void, listId?: string) => {
    setAccomError(null);
    try {
      op();
      if (listId) refreshAccomList(listId);
      else {
        const lists = accomStore.listLists();
        const latest = [...lists].sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt)
        )[0];
        setAccomList(latest ?? null);
      }
    } catch (e) {
      setAccomError(e instanceof Error ? e.message : 'Could not save accommodation.');
    }
  };

  useEffect(() => {
    // Defer setMounted so PDFDownloadLink only renders on the client
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // ── Topic groups (catalog order: course, then concept group, then lesson) ──
  const topicGroups = useMemo(() => {
    const rank = (e: RegisteredEntry, i: number) => {
      const c = COURSES.indexOf(e.course);
      const g = COURSE_GROUPS[e.course].indexOf(e.group);
      const l = CATALOG_ORDER.indexOf(e.id);
      return [c, g < 0 ? 1e3 : g, l < 0 ? 1e4 + i : l];
    };
    const sorted = CURRICULUM_REGISTRY.map((e, i) => ({ e, r: rank(e, i) }))
      .sort((a, b) => a.r[0] - b.r[0] || a.r[1] - b.r[1] || a.r[2] - b.r[2])
      .map(({ e }) => e);
    const map = new Map<string, RegisteredEntry[]>();
    for (const entry of sorted) {
      const key = groupKeyOf(entry);
      const arr = map.get(key);
      if (arr) arr.push(entry);
      else map.set(key, [entry]);
    }
    return [...map.entries()];
  }, []);

  const selectedModules = useMemo(
    () =>
      selectedTopicIds
        .map((id) => CURRICULUM_REGISTRY.find((t) => t.id === id))
        .filter((m): m is RegisteredEntry => !!m),
    [selectedTopicIds]
  );

  const toggleTopic = (id: string) => {
    if (!selectedTopicIds.includes(id) && !isPro && !isFreeTopic(id)) {
      setGateMsg(
        'That topic is part of Pro. Free covers Algebra I and middle-school topics, Pro unlocks everything, plus accommodations and answer keys.'
      );
      return;
    }
    // The Pro notice describes a pick that didn't go through; once the
    // selection changes it no longer applies.
    setGateMsg(null);
    setSelectedTopicIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  // One-tap reset: selections otherwise persist for the whole session, so a
  // packet built earlier (say Algebra 2) silently rides along into the next
  // one (say Geometry) unless every topic is untapped by hand.
  const clearTopics = () => {
    setGateMsg(null);
    setSelectedTopicIds([]);
  };

  // ── Picks tray counts ──
  // The tray shows one total and a count per lesson. Both write the per-lesson
  // counts a worksheet has always stored (advancedCounts + topicCounts), so a
  // saved worksheet or draft file keeps its shape and rebuilds the same way.
  const countSettings = { advancedCounts, topicCounts, count };
  const setPickCount = (id: string, n: number) => {
    setTopicCounts((prev) => {
      const next = { ...prev };
      // Switching from one shared count: pin every pick at what it shows now.
      if (!advancedCounts) for (const pid of selectedTopicIds) next[pid] = count;
      next[id] = clampCount(n);
      return next;
    });
    setAdvancedCounts(true);
  };
  const setTrayTotal = (total: number) => {
    if (selectedTopicIds.length === 0) return;
    setTopicCounts((prev) => ({ ...prev, ...splitTotal(total, selectedTopicIds) }));
    setAdvancedCounts(true);
  };

  // ── Topic group accordion state ──
  // Collapsed by default; no topic is pre-selected, so no group starts open.
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set()
  );

  const toggleGroup = (groupTitle: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupTitle)) next.delete(groupTitle);
      else next.add(groupTitle);
      return next;
    });
  };

  const expandAllGroups = () =>
    setExpandedGroups(new Set(topicGroups.map(([t]) => t)));
  const collapseAllGroups = () => setExpandedGroups(new Set());
  const allGroupsExpanded =
    topicGroups.length > 0 && expandedGroups.size === topicGroups.length;

  // ── Topic search + filters ──────────────────────────────────────────────
  const subjectOptions = useMemo(() => ['All', ...SUBJECT_VIEWS], []);

  const [topicSearch, setTopicSearch] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState('All');
  // Stash of the pre-search collapse state, restored when search is cleared.
  const savedExpandedRef = useRef<Set<string> | null>(null);

  const isFiltering =
    topicSearch.trim() !== '' || availableOnly || subjectFilter !== 'All';

  // The course chip a teacher picks is remembered in this browser, so the
  // picker opens on their course next time. Read once after mount (static
  // page), and written only when a chip is tapped.
  useEffect(() => {
    const saved = readRememberedCourse(localStore(), subjectOptions);
    if (saved) setSubjectFilter(saved);
  }, [subjectOptions]);
  const pickCourse = (view: string) => {
    setSubjectFilter(view);
    rememberCourse(localStore(), view);
  };

  // Search index: skill name, concept group, course, description and every
  // standards label (TEKS plus the other frameworks' codes), built once.
  const searchIndex = useMemo(() => {
    const m = new Map<string, EntryIndex>();
    for (const e of CURRICULUM_REGISTRY) {
      const other = FRAMEWORKS.filter((f) => f.id !== 'teks').map((f) => standardsFor(e.id, e.teks, f.id));
      m.set(e.id, indexEntry(e, other));
    }
    return m;
  }, []);
  const matchesSearch = (e: RegisteredEntry, q: string) => {
    const ix = searchIndex.get(e.id);
    return !ix || entryMatches(q, ix);
  };

  const visibleGroups = useMemo(() => {
    if (!isFiltering) return topicGroups;
    const q = topicSearch.trim();
    return topicGroups
      .map(([groupKey, entries]): [string, RegisteredEntry[]] => {
        const kept = entries.filter((e) => {
          if (availableOnly && !isTopicAvailable(e, isPro)) return false;
          if (!entryInView(e, subjectFilter)) return false;
          return q === '' || matchesSearch(e, q);
        });
        return [groupKey, kept];
      })
      .filter(([, entries]) => entries.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicGroups, isFiltering, topicSearch, availableOnly, subjectFilter, isPro, searchIndex]);

  // Search stays inside the teacher's course; this counts what it would
  // find in the other courses, so the picker can offer to widen it.
  const otherCourseMatches = useMemo(() => {
    const q = topicSearch.trim();
    if (q === '' || subjectFilter === 'All') return 0;
    return CURRICULUM_REGISTRY.filter(
      (e) =>
        !entryInView(e, subjectFilter) &&
        (!availableOnly || isTopicAvailable(e, isPro)) &&
        matchesSearch(e, q)
    ).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicSearch, subjectFilter, availableOnly, isPro, searchIndex]);

  const handleSearchChange = (v: string) => {
    const was = topicSearch.trim() !== '';
    const is = v.trim() !== '';
    if (is && !was) savedExpandedRef.current = new Set(expandedGroups);
    if (!is && was && savedExpandedRef.current) {
      setExpandedGroups(savedExpandedRef.current);
      savedExpandedRef.current = null;
    }
    setTopicSearch(v);
  };

  // Clear keeps the teacher's course: it's a setting, not a filter they
  // typed. "All subjects" is one tap away on the chips.
  const clearTopicFilters = () => {
    handleSearchChange('');
    setAvailableOnly(false);
  };

  // Enter in the search box adds the lesson when the search narrowed the
  // list to exactly one, then clears the box for the next one.
  const addOnlyMatch = () => {
    if (topicSearch.trim() === '') return;
    const hits = visibleGroups.flatMap(([, es]) => es).filter((e) => !e.underConstruction);
    if (hits.length !== 1) return;
    if (!selectedTopicIds.includes(hits[0].id)) toggleTopic(hits[0].id);
    handleSearchChange('');
  };

  // While searching, auto-expand every group that contains a match.
  useEffect(() => {
    if (topicSearch.trim() === '') return;
    setExpandedGroups((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const [t] of visibleGroups) {
        if (!next.has(t)) {
          next.add(t);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [topicSearch, visibleGroups]);

  // Filter-aware expand/collapse-all (identical to the old behavior when no
  // filter is active).
  const effectiveGroups = isFiltering ? visibleGroups : topicGroups;
  const expandAllFiltered = () =>
    setExpandedGroups(
      (prev) => new Set([...prev, ...effectiveGroups.map(([t]) => t)])
    );
  const collapseAllFiltered = () =>
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      for (const [t] of effectiveGroups) next.delete(t);
      return next;
    });
  const allEffectiveExpanded =
    effectiveGroups.length > 0 &&
    effectiveGroups.every(([t]) => expandedGroups.has(t));

  // Mixed-topic worksheets print their problems in one seeded order unless
  // the teacher keeps topics grouped (see orderProblemSets).
  const [keepTopicsGrouped, setKeepTopicsGrouped] = useState(false);

  // ── Generation ──
  // Per-module problem sets (seed offset per topic so different topics don't
  // draw identical sequences). Kept per-module so Classical Notes mode can
  // chunk them back into per-entry groups for its section renderer.
  const moduleProblemSets = useMemo<MathProblem[][]>(() => {
    return generateModuleProblemSets(selectedModules, {
      docType,
      seed,
      count,
      advancedCounts,
      topicCounts,
      difficulty,
      wordProblems,
    });
  }, [selectedModules, docType, seed, count, difficulty, wordProblems, advancedCounts, topicCounts]);

  // Words-only mode (render-side transform, generation untouched): every
  // diagram rides on the problem's svgParams or on the built question's
  // diagramType/diagramData. Strip the problem channel here and the
  // question channel where questions are built.
  const displayProblemSets = useMemo<MathProblem[][]>(() => {
    if (includeDiagrams) return moduleProblemSets;
    return moduleProblemSets.map((set) =>
      set.map((p) => ('svgParams' in p ? ({ ...p, svgParams: null } as MathProblem) : p))
    );
  }, [moduleProblemSets, includeDiagrams]);

  // The print order every output shares: preview, PDF, answer key,
  // accommodated versions. Mixed when 2+ topics and not kept grouped.
  const mixedOrder = mixesTopics({ docType, keepTopicsGrouped }, displayProblemSets);
  const advancedProblems = useMemo<MathProblem[]>(
    () => orderProblemSets(displayProblemSets, { docType, keepTopicsGrouped, seed }),
    [displayProblemSets, docType, keepTopicsGrouped, seed]
  );

  // Classical Notes groups: one definitions block + narration per entry.
  const classicalGroups = useMemo<ClassicalGroup[] | undefined>(() => {
    if (docType !== 'classical-notes') return undefined;
    let start = 0;
    return selectedModules.map((mod, i) => {
      const problems = displayProblemSets[i] ?? [];
      const group: ClassicalGroup = {
        entryId: mod.id,
        title: mod.title,
        teks: stdFor(mod).split(' · ')[0],
        problems,
        startIndex: start,
      };
      start += problems.length;
      return group;
    });
  }, [docType, selectedModules, displayProblemSets, framework]);

  // Proof document flavor, threaded to EuclidEngine → ProofProblemCard.
  const proofDocMode = useMemo(
    () =>
      docType === 'proof-two-column' ||
      docType === 'proof-fill-reasons' ||
      docType === 'proof-elements' ||
      docType === 'proof-blank'
        ? docType
        : undefined,
    [docType]
  );

  // Questions for the PDF (paired with problems inside PdfDocument)
  const stripQuestionDiagram = (q: ReturnType<typeof problemToQuestion>) =>
    includeDiagrams ? q : { ...q, diagramType: undefined, diagramData: undefined };
  const questions = useMemo(() => {
    return advancedProblems.map((p, i) => stripQuestionDiagram(problemToQuestion(p, i)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advancedProblems, includeDiagrams]);

  // ── Version plan (IEP accommodations) ──
  // One base version plus one version per accommodation group, all derived
  // from the same generated problem set. Empty list → base version only and
  // the feature stays invisible.
  const versionPlan = useMemo(
    () => planVersions(advancedProblems, accomList),
    [advancedProblems, accomList]
  );
  const hasAccommodations = versionPlan.groups.length > 0;

  // ── Pay-gate verdict for the export button ──
  const gateReason: 'accommodations' | 'limit' | null = isPro
    ? null
    : hasAccommodations
      ? 'accommodations'
      : account.used >= (account.limit ?? FREE_GENERATION_LIMIT)
        ? 'limit'
        : null;
  const handleExportCount = async () => {
    if (account.status === 'signed-in') {
      void logExportEvent({
        topics: selectedTopicIds,
        docType,
        problems: advancedProblems.length,
        versions: versionPlan.all().length,
      });
      setShelf((prev) => markOnShelf(prev, selectedTopicIds, Math.floor(Date.now() / 1000)));
    }
    if (isPro) return;
    if (account.status === 'signed-in') {
      const verdict = await recordGeneration();
      if (verdict) setAccount((p) => ({ ...p, used: verdict.used }));
    } else {
      setAccount((p) => ({ ...p, used: bumpLocalUsage() }));
    }
  };
  const activeVersion = useMemo(
    () =>
      versionPlan.all().find((v) => v.versionId === activeVersionId) ??
      versionPlan.base,
    [versionPlan, activeVersionId]
  );
  // Per-version questions (identical to base in Phase 1; derived per version
  // so later content transforms stay correct).
  const versionQuestions = useMemo(
    () => new Map(versionPlan.all().map((v) => [
      v.versionId,
      v.problems.map((p, i) => stripQuestionDiagram(problemToQuestion(p, i))),
    ])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [versionPlan, includeDiagrams]
  );

  // ── Title & standards ──
  const defaultTitle = useMemo(() => {
    if (selectedModules.length === 0) return 'Geometry Practice';
    const word = modeWord(docType);
    if (selectedModules.length === 1) return `${selectedModules[0].title}, ${word}`;
    return `${selectedModules[0].title} + ${selectedModules.length - 1} more, ${word}`;
  }, [selectedModules, docType]);
  const title = customTitle || defaultTitle;

  const standards = useMemo(() => {
    const labels = [...new Set(selectedModules.map((m) => stdFor(m)))];
    return labels.length > 0 ? labels.join(' · ') : frameworkMeta(framework).fallback;
  }, [selectedModules, framework]);

  // Combined multi-version PDF document for the accommodated export.
  // Base version + its key, then each group version + its key, with labeled
  // divider pages between versions. (Keys always derive from their own
  // version's problems.)
  const accommodatedDocument = useMemo(() => {
    if (!hasAccommodations) return null;
    return (
      <PdfRendererDocument>
        {versionPlan.all().flatMap((v, vi) => {
          const nodes: React.ReactNode[] = [];
          // Divider page between versions (none before the base version).
          if (vi > 0) {
            nodes.push(
              <AccommodationDividerPage key={`div-${v.versionId}`} text={v.dividerText} />
            );
          }
          nodes.push(
            <PdfVersionPages
              key={v.versionId}
              title={v.kind === 'base' ? title : `${title}, ${v.label}`}
              questions={versionQuestions.get(v.versionId) ?? []}
              advancedProblems={v.problems}
              docType={docType}
              standard={standards}
              includeAnswerKey={includeAnswerKey}
              classicalGroups={classicalGroups}
              seed={seed}
              presentation={v.presentation}
              keyHeading={v.answerKeyLabel}
              wordBank={v.wordBank}
              mixedOrder={mixedOrder}
            />
          );
          return nodes;
        })}
      </PdfRendererDocument>
    );
  }, [hasAccommodations, versionPlan, versionQuestions, title, docType, standards, includeAnswerKey, classicalGroups, seed, mixedOrder]);

  // ── Draft save / load ──
  const saveDraft = () => {
    const draft: DraftFile = {
      app: 'euclid-engine-worksheet',
      version: 1,
      savedAt: new Date().toISOString(),
      ...currentSettings(),
    };
    const fileName = `euclid-draft-${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    // The download used to be the only sign anything happened, and browsers
    // that save silently showed nothing at all.
    setDraftError(null);
    setDraftNotice(draftSavedText(fileName, draft.topicIds.length));
  };

  // The settings this worksheet is rebuilt from (draft files and the
  // saved library both store exactly this, plus the seed).
  const currentSettings = (): WorksheetSettings =>
    settingsForSave({
      docType,
      title: customTitle,
      topicIds: selectedTopicIds,
      seed,
      count,
      topicCounts,
      advancedCounts,
      framework,
      difficulty,
      includeAnswerKey,
      wordProblems,
      includeDiagrams,
      keepTopicsGrouped,
    });

  const applySettings = (d: WorksheetSettings) => {
    setDocType(d.docType);
    setCustomTitle(d.title);
    setSelectedTopicIds(d.topicIds);
    // Expand the groups holding the loaded topics so the selection is visible
    const groups = new Set<string>();
    for (const id of d.topicIds) {
      const entry = CURRICULUM_REGISTRY.find((t) => t.id === id);
      if (entry) groups.add(groupKeyOf(entry));
    }
    setExpandedGroups(groups);
    setSeed(d.seed);
    setCount(d.count);
    setTopicCounts(d.topicCounts);
    setAdvancedCounts(d.advancedCounts);
    setFramework(d.framework);
    setDifficulty(d.difficulty);
    setIncludeAnswerKey(d.includeAnswerKey);
    setWordProblems(d.wordProblems);
    setIncludeDiagrams(d.includeDiagrams);
    setKeepTopicsGrouped(d.keepTopicsGrouped);
  };

  const loadDraftFile = (file: File) => {
    setDraftError(null);
    setDraftNotice(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(String(reader.result)) as Partial<DraftFile>;
        if (d.app !== 'euclid-engine-worksheet') {
          throw new Error('That file is not a Euclid Engine draft.');
        }
        const settings = sanitizeSettings(d);
        if (!settings) throw new Error('Could not read that draft file.');
        applySettings(settings);
        const asked = Array.isArray(d.topicIds) ? d.topicIds.length : 0;
        setDraftNotice(draftLoadedText(file.name, settings.topicIds.length, asked - settings.topicIds.length));
      } catch (e) {
        setDraftError(e instanceof Error ? e.message : 'Could not read that draft file.');
      }
    };
    reader.onerror = () => setDraftError('Could not read that draft file.');
    reader.readAsText(file);
  };

  // ── Keep the builder across navigation ──
  // Restore once on load, then write after every change. Writing waits for
  // the restore pass so the defaults never overwrite what was saved.
  const [sessionRestored, setSessionRestored] = useState(false);
  useEffect(() => {
    const saved = readBuilderSession(sessionStore());
    if (saved) {
      // One-time restore from the browser after mount (static page).
      applySettings(saved.settings);
      setStep(saved.step);
    }
    setSessionRestored(true);
  }, []);
  useEffect(() => {
    if (!sessionRestored) return;
    writeBuilderSession(sessionStore(), { settings: currentSettings(), step });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionRestored, step, docType, customTitle, selectedTopicIds, seed, count, topicCounts, advancedCounts, framework, difficulty, includeAnswerKey, wordProblems, includeDiagrams, keepTopicsGrouped]);

  // ── Saved library (Pro) ──
  const [libraryMsg, setLibraryMsg] = useState<{ severity: 'success' | 'error'; text: string } | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);

  const openSaveDialog = () => {
    setLibraryMsg(null);
    if (account.status !== 'signed-in') {
      setGateMsg('Saved worksheets are part of Pro. Sign in with your Pro account to save this one and rebuild it any time.');
      return;
    }
    if (!isPro) {
      setGateMsg('Saved worksheets are part of Pro. Save a worksheet once, then reprint the exact same problems and answer key next year.');
      return;
    }
    setSaveName(title.slice(0, 80));
    setSaveDialogOpen(true);
  };

  const confirmSave = async () => {
    const name = saveName.trim();
    if (!name) return;
    setSaving(true);
    const result = await saveWorksheet(name, currentSettings());
    setSaving(false);
    setSaveDialogOpen(false);
    if (result.ok) {
      setLibraryMsg({ severity: 'success', text: `Saved "${result.value.name}" to your library.` });
      return;
    }
    const why: Record<typeof result.error, string> = {
      'signed-out': 'You are signed out. Sign in again, then save.',
      pro_required: 'Saved worksheets are part of Pro.',
      library_full: 'Your library is full. Delete a saved worksheet to make room.',
      invalid: 'This worksheet could not be saved. Check that it has at least one topic.',
      not_found: 'This worksheet could not be saved.',
      rate_limited: 'Too many changes in a short time. Wait a few minutes and try again.',
      unavailable: 'Saving is unavailable right now. Try again in a moment.',
    };
    setLibraryMsg({ severity: 'error', text: why[result.error] });
  };

  // Opened from the Saved worksheets page as /?open=<id>: load that
  // worksheet's settings and go straight to Review. Read once after mount,
  // then take the parameter off the address so a reload doesn't repeat it.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('open');
    if (!id) return;
    params.delete('open');
    const rest = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : '') + window.location.hash);
    let live = true;
    listSavedWorksheets().then((lib) => {
      if (!live) return;
      if (lib.status !== 'ok') {
        setLibraryMsg({ severity: 'error', text: lib.status === 'signed-out' ? 'Sign in to open your saved worksheets.' : 'Could not open that saved worksheet right now. Try again in a moment.' });
        return;
      }
      if (!lib.pro) {
        setGateMsg('Opening saved worksheets is part of Pro. Your saved worksheets are kept; renew Pro to rebuild them.');
        return;
      }
      const item = lib.items.find((w) => w.id === id);
      const settings = item ? sanitizeSettings(item.settings) : null;
      if (!item || !settings || settings.topicIds.length === 0) {
        setLibraryMsg({ severity: 'error', text: 'That saved worksheet could not be found.' });
        return;
      }
      applySettings(settings);
      setStep(3);
      setLibraryMsg({ severity: 'success', text: `Opened "${item.name}". Same problems and answer key as when you saved it.` });
    });
    return () => {
      live = false;
    };
    // Runs once on mount; applySettings only calls state setters.
  }, []);

  const randomizeSeed = () => setSeed(Math.floor(Math.random() * 100000));

  // ── Quick starts from the taught shelf ──
  // Each one fills the picks, draws fresh problems and goes straight to
  // Review, so repeating a lesson is two clicks: the quick start, then
  // Download. A Pro lesson stays locked for Free: it's skipped here.
  const usableLesson = (id: string) => {
    const e = REGISTRY_BY_ID.get(id);
    return !!e && !e.underConstruction && isTopicAvailable(e, isPro);
  };
  const inChosenCourse = (id: string) => {
    const e = REGISTRY_BY_ID.get(id);
    return !!e && entryInView(e, subjectFilter);
  };
  const againIds = againLessons(shelf, usableLesson);
  const reviewIds = reviewLessons(shelf, usableLesson, inChosenCourse);
  const startQuick = (ids: string[], opts: { docType?: DocumentType; counts?: Record<string, number> } = {}) => {
    if (ids.length === 0) return;
    setGateMsg(null);
    setShelfMsg(null);
    setSelectedTopicIds(ids);
    if (opts.counts) {
      setTopicCounts((prev) => ({ ...prev, ...opts.counts }));
      setAdvancedCounts(true);
    }
    if (opts.docType) setDocType(opts.docType);
    randomizeSeed();
    setStep(3);
  };
  const quickAgain = () => startQuick(againIds);
  const quickReview = () => {
    setKeepTopicsGrouped(false);
    startQuick(reviewIds, { docType: 'review', counts: reviewCounts(reviewIds) });
  };
  const quickQuiz = () => startQuick(selectedTopicIds, { docType: 'test' });

  const markPicksTaught = async () => {
    const ids = [...selectedTopicIds];
    if (ids.length === 0) return;
    const before = shelf;
    setShelf((prev) => markOnShelf(prev, ids, Math.floor(Date.now() / 1000)));
    const r = await markTaughtLessons(ids);
    if (r.ok) {
      setShelfMsg(`Marked ${ids.length === 1 ? 'that lesson' : `${ids.length} lessons`} taught.`);
      return;
    }
    setShelf(before);
    setShelfMsg(
      r.error === 'signed-out'
        ? 'You are signed out. Sign in again to mark lessons taught.'
        : r.error === 'rate_limited'
          ? 'Too many changes in a short time. Wait a few minutes and try again.'
          : 'Could not mark those lessons right now. Try again in a moment.'
    );
  };
  const takeOffShelf = async (id: string) => {
    const before = shelf;
    setShelf((prev) => removeFromShelf(prev, [id]));
    const r = await removeTaughtLessons([id]);
    if (!r.ok) {
      setShelf(before);
      setShelfMsg('Could not take that lesson off the shelf right now. Try again in a moment.');
    }
  };
  const taughtView: TaughtView = {
    status: account.status === 'signed-in' ? shelfStatus : shelfStatus === 'loading' ? 'loading' : 'signed-out',
    shelf,
    againIds,
    reviewIds,
    picks: selectedTopicIds,
    msg: shelfMsg,
    onAgain: quickAgain,
    onReview: quickReview,
    onQuiz: quickQuiz,
    onRemove: takeOffShelf,
    onSignIn: () => setSignInOpen(true),
  };

  const errorBoundaryKey = `${docType}-${seed}-${count}-${difficulty}-${wordProblems}-${includeDiagrams}-${selectedTopicIds.join(',')}-${advancedCounts ? JSON.stringify(topicCounts) : ''}`;

  // Titles of the selected lessons that offer story (word problem) variants.
  const wordCapableSelected = useMemo(
    () => selectedModules.filter((m) => m.wordProblems).map((m) => m.title),
    [selectedModules]
  );

  // ── Wizard footer summary + TEKS coverage ──
  const teksSelected = useMemo(
    () =>
      new Set(
        selectedModules.flatMap((m) => stdFor(m).split(' · ').map((t) => t.trim()))
      ).size,
    [selectedModules, framework]
  );
  const teksTotal = useMemo(
    () =>
      new Set(
        CURRICULUM_REGISTRY.filter((e) => !e.underConstruction).flatMap((e) =>
          stdFor(e).split(' · ').map((t) => t.trim())
        )
      ).size,
    [framework]
  );
  const footerSummary = useMemo(() => {
    if (step === 0) {
      const m = DOC_MODES.find((d) => d.value === docType);
      return `Format: ${m ? m.label : docType} ${m ? m.emoji : ''}`;
    }
    if (step === 1) {
      return `${selectedTopicIds.length} topic${selectedTopicIds.length === 1 ? '' : 's'} · ${advancedProblems.length} problems · ${frameworkMeta(framework).short} ${teksSelected}/${teksTotal}`;
    }
    if (hasAccommodations) {
      return `${versionPlan.groups.length} group${versionPlan.groups.length === 1 ? '' : 's'} → ${versionPlan.all().length} versions ready 🎉`;
    }
    return 'No accommodations, everyone gets the base version 👍';
  }, [step, docType, selectedTopicIds.length, advancedProblems.length, teksSelected, teksTotal, hasAccommodations, versionPlan]);

  // Topbar step jumps follow the footer's Continue rule: steps past Topics
  // require a topic selection. With nothing selected, a forward jump lands
  // on Topics instead of an empty Accommodations/Review step.
  const goToStep = (n: number) =>
    setStep(n > 1 && selectedTopicIds.length === 0 ? 1 : n);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        '@supports (height: 100dvh)': { height: '100dvh' },
        bgcolor: '#14161f',
      }}
    >
      <WizardTopbar
        step={step}
        goTo={goToStep}
        problemCount={advancedProblems.length}
        accountControl={
          <AccountControl account={account} onAccountChange={setAccount} open={signInOpen} setOpen={setSignInOpen} />
        }
      />

      {gateMsg && (
        <Alert
          severity="info"
          onClose={() => setGateMsg(null)}
          action={
            <Button color="inherit" size="small" href="/pricing" sx={{ fontWeight: 800 }}>
              See Pro
            </Button>
          }
          sx={{ mx: 2, mt: 1.5, flexShrink: 0 }}
        >
          {gateMsg}
        </Alert>
      )}

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {step === 0 && (
          <StepFormat
            docType={docType}
            setDocType={setDocType}
            customTitle={customTitle}
            setCustomTitle={setCustomTitle}
            defaultTitle={defaultTitle}
            taught={taughtView}
          />
        )}
        {step === 1 && (
          <StepTopics
            topicSearch={topicSearch}
            handleSearchChange={handleSearchChange}
            clearTopicFilters={clearTopicFilters}
            availableOnly={availableOnly}
            setAvailableOnly={setAvailableOnly}
            subjectFilter={subjectFilter}
            pickCourse={pickCourse}
            searchAllCourses={() => setSubjectFilter('All')}
            otherCourseMatches={otherCourseMatches}
            addOnlyMatch={addOnlyMatch}
            subjectOptions={subjectOptions}
            effectiveGroups={effectiveGroups}
            expandedGroups={expandedGroups}
            toggleGroup={toggleGroup}
            allEffectiveExpanded={allEffectiveExpanded}
            expandAllFiltered={expandAllFiltered}
            collapseAllFiltered={collapseAllFiltered}
            selectedTopicIds={selectedTopicIds}
            toggleTopic={toggleTopic}
            clearTopics={clearTopics}
            isPro={isPro}
            count={count}
            setCount={setCount}
            countFor={(id) => countForTopic(countSettings, id)}
            trayTotal={trayTotal(countSettings, selectedTopicIds)}
            setPickCount={setPickCount}
            setTrayTotal={setTrayTotal}
            selectedEntries={selectedModules}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            wordProblems={wordProblems}
            setWordProblems={setWordProblems}
            wordCapableSelected={wordCapableSelected}
            includeDiagrams={includeDiagrams}
            setIncludeDiagrams={setIncludeDiagrams}
            keepTopicsGrouped={keepTopicsGrouped}
            setKeepTopicsGrouped={setKeepTopicsGrouped}
            showTopicOrder={selectedModules.length > 1 && docType !== 'classical-notes'}
            framework={framework}
            setFramework={setFramework}
            taught={taughtView}
            onMarkTaught={markPicksTaught}
          />
        )}
        {step === 2 && (
          <StepAccommodations
            accomList={accomList}
            accomError={accomError}
            handleAccomOp={handleAccomOp}
            accomStore={accomStore}
            versionPlan={versionPlan}
            hasAccommodations={hasAccommodations}
          />
        )}
        {step === 3 && (
          <StepReview
            hasAccommodations={hasAccommodations}
            accommodatedDocument={accommodatedDocument}
            questions={questions}
            advancedProblems={advancedProblems}
            mixedOrder={mixedOrder}
            docType={docType}
            title={title}
            standards={standards}
            includeAnswerKey={includeAnswerKey}
            setIncludeAnswerKey={setIncludeAnswerKey}
            classicalGroups={classicalGroups}
            seed={seed}
            setSeed={setSeed}
            randomizeSeed={randomizeSeed}
            versionPlan={versionPlan}
            activeVersion={activeVersion}
            activeVersionId={activeVersionId}
            setActiveVersionId={setActiveVersionId}
            saveDraft={saveDraft}
            onSaveToLibrary={openSaveDialog}
            libraryMsg={libraryMsg}
            clearLibraryMsg={() => setLibraryMsg(null)}
            fileRef={fileRef}
            mounted={mounted}
            draftError={draftError}
            draftNotice={draftNotice}
            clearDraftNotice={() => setDraftNotice(null)}
            onGatedExport={() => setExportGateOpen(true)}
            proofDocMode={proofDocMode}
            selectedModules={selectedModules}
            moduleProblemCounts={displayProblemSets.map((set) => set.length)}
            errorBoundaryKey={errorBoundaryKey}
            isPro={isPro}
            gateReason={gateReason}
            onExportCount={handleExportCount}
            usageNote={
              isPro
                ? null
                : `${account.used} of ${account.limit ?? FREE_GENERATION_LIMIT} free exports used this month`
            }
          />
        )}
      </Box>

      <WizardFooter
        step={step}
        setStep={setStep}
        canContinue={step === 0 || selectedTopicIds.length > 0}
        summary={footerSummary}
      />

      <Dialog open={saveDialogOpen} onClose={() => !saving && setSaveDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>Save to your library</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: '0.82rem', color: '#9aa0be', mb: 1.5 }}>
            Saves this worksheet&apos;s settings and seed, so you can rebuild the exact same problems and answer key later.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Name"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value.slice(0, 80))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && saveName.trim() && !saving) void confirmSave();
            }}
            helperText={`${saveName.length}/80`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)} disabled={saving} sx={{ color: '#9aa0be' }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void confirmSave()} disabled={saving || !saveName.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Why Free can't export this one (was a silent jump to /pricing) */}
      <Dialog open={exportGateOpen && !!gateReason} onClose={() => setExportGateOpen(false)} maxWidth="xs" fullWidth>
        {gateReason && (() => {
          const copy = exportGateCopy(gateReason, {
            signedIn: account.status === 'signed-in',
            limit: account.limit ?? FREE_GENERATION_LIMIT,
          });
          return (
            <>
              <DialogTitle sx={{ fontWeight: 800 }}>{copy.title}</DialogTitle>
              <DialogContent>
                {copy.body.map((line) => (
                  <Typography key={line} sx={{ fontSize: '0.9rem', mb: 1 }}>
                    {line}
                  </Typography>
                ))}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setExportGateOpen(false)} sx={{ color: '#9aa0be' }}>
                  Not now
                </Button>
                {account.status !== 'signed-in' && (
                  <Button
                    onClick={() => {
                      setExportGateOpen(false);
                      setSignInOpen(true);
                    }}
                  >
                    Sign in
                  </Button>
                )}
                <Button variant="contained" href="/pricing">
                  See Pro
                </Button>
              </DialogActions>
            </>
          );
        })()}
      </Dialog>

      {/* Hidden draft file input */}
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) loadDraftFile(f);
          e.target.value = '';
        }}
      />
    </Box>
  );
}

// ── Wizard chrome ─────────────────────────────────────────────────────────────

// Scales the fixed-width (816px) worksheet page down to fit narrow
// screens. Measures the rendered page and applies a CSS transform scale
// with height compensation; at desktop widths the scale is 1 and nothing
// changes. Fixes the mobile preview overflow (audit Oct 13, 2026).
function ScaledPreview({ children }: { children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const measure = () => {
      const contentW = inner.scrollWidth;
      const availW = outer.clientWidth;
      if (contentW <= 0 || availW <= 0) return;
      const s = Math.min(1, availW / contentW);
      setScale(s);
      setHeight(s < 1 ? inner.scrollHeight * s : undefined);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, []);

  return (
    <Box ref={outerRef} sx={{ width: '100%', height, overflow: 'hidden' }}>
      <Box
        ref={innerRef}
        sx={{
          width: 'fit-content',
          mx: scale < 1 ? 0 : 'auto',
          transform: scale < 1 ? `scale(${scale})` : undefined,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

// Compact account control for the topbar: Sign in with Google (when the
// Worker has it set up) or a 6-digit code emailed to the teacher, plan chip,
// sign-out, and (for Pro) the Stripe billing portal. All API calls fail
// soft, if accounts are not live yet, the button says so.

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.7 17.8 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.3 5.7c4.3-4 7-9.9 7-17.1z" />
      <path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.3-5.7c-2.2 1.5-5 2.3-8.6 2.3-6.2 0-11.5-4.2-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}

const CODE_ERRORS: Record<string, string> = {
  wrong_code: "That code doesn't match. Check the latest email and try again.",
  expired: 'That code has expired or was already used. Send a new one.',
  too_many_attempts: 'Too many wrong tries. Send a new code.',
  rate_limited: 'Too many tries from this network. Please wait 15 minutes.',
  unavailable: 'Sign-in is not available right now. Please try again later.',
};
function AccountControl({
  account,
  onAccountChange,
  open,
  setOpen,
}: {
  account: AccountState;
  onAccountChange: (a: AccountState) => void;
  open: boolean;
  setOpen: (v: boolean | ((o: boolean) => boolean)) => void;
}) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [google, setGoogle] = useState(false);

  // When the menu opens, ask which sign-in methods are live, so the Google
  // button only shows once the Worker has it set up.
  useEffect(() => {
    if (!open) return;
    let live = true;
    fetchSignInMethods().then((m) => {
      if (live) setGoogle(m.google);
    });
    return () => {
      live = false;
    };
  }, [open]);

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    const result = await requestSignInCode(email.trim());
    setBusy(false);
    if (result === 'sent') {
      setSent(true);
      setCode('');
    } else if (result === 'rate_limited')
      setError('Too many sign-in emails were requested. Please wait 15 minutes and try again.');
    else if (result === 'invalid_email') setError('Please check the email address.');
    else setError('Sign-in is not available right now. Please try again later.');
  };

  const checkCode = async () => {
    setBusy(true);
    setError(null);
    const result = await verifySignInCode(email.trim(), code);
    if (result === 'ok') {
      const a = await fetchAccount();
      setBusy(false);
      if (a) {
        setOpen(false);
        setSent(false);
        setCode('');
        onAccountChange(a);
      } else {
        setError(CODE_ERRORS.unavailable);
      }
      return;
    }
    setBusy(false);
    setError(CODE_ERRORS[result]);
  };
  const codeReady = code.replace(/\D/g, '').length === 6;

  if (account.status === 'signed-in') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          label={`${account.email} · ${account.plan === 'pro' ? 'Pro' : 'Free'}`}
          sx={{
            fontWeight: 800,
            fontSize: '0.72rem',
            maxWidth: { xs: 150, md: 280 },
            backgroundColor: 'rgba(129,140,248,0.13)',
            color: '#818cf8',
            border: '1px solid rgba(129,140,248,0.30)',
          }}
        />
        <Button size="small" href="/saved" sx={{ color: '#9aa0be', fontWeight: 800, whiteSpace: 'nowrap' }}>
          Saved
        </Button>
        {account.plan === 'pro' ? (
          <Button
            size="small"
            sx={{ color: '#9aa0be', fontWeight: 800, whiteSpace: 'nowrap' }}
            onClick={async () => {
              const url = await createPortalUrl();
              if (url) window.location.href = url;
            }}
          >
            Billing
          </Button>
        ) : (
          <Button size="small" href="/pricing" sx={{ color: '#fb923c', fontWeight: 800, whiteSpace: 'nowrap' }}>
            Upgrade
          </Button>
        )}
        <Button
          size="small"
          sx={{ color: '#9aa0be', fontWeight: 800, whiteSpace: 'nowrap' }}
          onClick={async () => {
            await apiSignOut();
            onAccountChange({ ...ANON_ACCOUNT, used: readLocalUsage() });
          }}
        >
          Sign out
        </Button>
      </Box>
    );
  }

  return (
    <ClickAwayListener onClickAway={() => open && setOpen(false)}>
    <Box
      sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1 }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) setOpen(false);
      }}
    >
      <Button size="small" href="/pricing" sx={{ color: '#9aa0be', fontWeight: 800, whiteSpace: 'nowrap' }}>
        Pricing
      </Button>
      {/* A real link to /login, so a click before the page has finished
          loading still gets somewhere (it used to do nothing until reload).
          Once loaded, the click opens the menu in place instead. */}
      <Button
        size="small"
        variant="outlined"
        href="/login"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={(e: React.MouseEvent) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
        sx={{ borderColor: '#2c3247', color: '#f2f3fa', borderRadius: '10px', fontWeight: 800, whiteSpace: 'nowrap', '&:hover': { borderColor: '#818cf8' } }}
      >
        Sign in
      </Button>
      {open && (
        <Box
          sx={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            zIndex: 30,
            width: 300,
            bgcolor: '#1e2233',
            border: '1.5px solid #2c3247',
            borderRadius: '14px',
            p: 2,
            boxShadow: '0 16px 40px rgba(0,0,0,.5)',
          }}
        >
          {sent ? (
            <>
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 800, color: '#f2f3fa', mb: 0.5 }}>
                Enter the 6-digit code
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#9aa0be', fontWeight: 600, mb: 1, overflowWrap: 'anywhere' }}>
                We emailed it to {email.trim()}. It expires in 10 minutes.
              </Typography>
              <TextField
                fullWidth
                size="small"
                autoFocus
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^\d\s-]/g, '').slice(0, 7))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && codeReady && !busy) checkCode();
                }}
                slotProps={{
                  htmlInput: {
                    inputMode: 'numeric',
                    autoComplete: 'one-time-code',
                    'aria-label': 'Sign-in code',
                    style: { letterSpacing: '0.3em', fontWeight: 800, textAlign: 'center' },
                  },
                }}
                sx={{ mb: 1 }}
              />
              {error && (
                <Typography sx={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 700, mb: 1 }}>
                  {error}
                </Typography>
              )}
              <Button
                fullWidth
                variant="contained"
                disabled={busy || !codeReady}
                onClick={checkCode}
                sx={{ borderRadius: '10px', fontWeight: 800 }}
              >
                {busy ? 'Checking…' : 'Sign in'}
              </Button>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Button size="small" disabled={busy} onClick={sendCode} sx={{ color: '#9aa0be', fontWeight: 700, px: 0.5 }}>
                  Send a new code
                </Button>
                <Button
                  size="small"
                  disabled={busy}
                  onClick={() => {
                    setSent(false);
                    setCode('');
                    setError(null);
                  }}
                  sx={{ color: '#9aa0be', fontWeight: 700, px: 0.5 }}
                >
                  Change email
                </Button>
              </Box>
            </>
          ) : (
            <>
              {google && (
                <>
                  <Button
                    fullWidth
                    variant="outlined"
                    href={GOOGLE_SIGNIN_URL}
                    startIcon={<GoogleMark />}
                    sx={{
                      borderRadius: '10px',
                      fontWeight: 800,
                      textTransform: 'none',
                      color: '#f2f3fa',
                      borderColor: '#2c3247',
                      '&:hover': { borderColor: '#818cf8' },
                    }}
                  >
                    Continue with Google
                  </Button>
                  <Typography sx={{ fontSize: '0.7rem', color: '#9aa0be', fontWeight: 700, textAlign: 'center', my: 1 }}>
                    or
                  </Typography>
                </>
              )}
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 800, color: '#f2f3fa', mb: 1 }}>
                Sign in with your email
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="email"
                placeholder="you@school.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && email.includes('@') && !busy) sendCode();
                }}
                slotProps={{ htmlInput: { autoComplete: 'email', 'aria-label': 'Email address' } }}
                sx={{ mb: 1 }}
              />
              {error && (
                <Typography sx={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 700, mb: 1 }}>
                  {error}
                </Typography>
              )}
              <Button
                fullWidth
                variant="contained"
                disabled={busy || !email.includes('@')}
                onClick={sendCode}
                sx={{ borderRadius: '10px', fontWeight: 800 }}
              >
                {busy ? 'Sending…' : 'Email me a sign-in code'}
              </Button>
              <Typography sx={{ fontSize: '0.7rem', color: '#9aa0be', mt: 1, fontWeight: 600 }}>
                Teacher accounts only. We never collect student data.
              </Typography>
            </>
          )}
        </Box>
      )}
    </Box>
    </ClickAwayListener>
  );
}

// ── Wizard chrome ─────────────────────────────────────────────────────────────

const WIZARD_STEPS = ['Format', 'Topics', 'Accommodations', 'Review'] as const;
const WIZARD_EMOJI = ['🎨', '📚', '♿', '🎉'] as const;

function WizardTopbar({
  step,
  goTo,
  problemCount,
  accountControl,
}: {
  step: number;
  goTo: (n: number) => void;
  problemCount: number;
  accountControl?: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: { xs: 2, md: 3 },
        py: 1.5,
        bgcolor: '#0f1119',
        borderBottom: '1px solid #2c3247',
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '12px',
          background: 'linear-gradient(135deg,#818cf8,#4f46e5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 900,
          fontSize: 19,
          color: '#fff',
          boxShadow: '0 4px 16px rgba(129,140,248,.4)',
          fontFamily: 'var(--font-nunito), sans-serif',
        }}
      >
        E
      </Box>
      <Typography sx={{ fontWeight: 900, fontSize: '1.05rem', whiteSpace: 'nowrap' }}>
        Euclid <Box component="span" sx={{ color: '#818cf8' }}>Engine</Box>
      </Typography>
      <Typography
        sx={{
          display: { xs: 'block', md: 'none' },
          fontSize: '0.72rem',
          fontWeight: 800,
          color: '#9aa0be',
          whiteSpace: 'nowrap',
        }}
      >
        {step + 1} / 4 · {WIZARD_STEPS[step]}
      </Typography>

      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          alignItems: 'center',
          gap: 0.75,
          mx: 'auto',
        }}
      >
        {WIZARD_STEPS.map((label, i) => (
          <React.Fragment key={label}>
            {i > 0 && (
              <Box sx={{ width: 32, height: 2, borderRadius: 2, bgcolor: i <= step ? '#818cf8' : '#2c3247' }} />
            )}
            <Button
              onClick={() => goTo(i)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 0.75,
                borderRadius: '999px',
                minWidth: 0,
                opacity: i === step ? 1 : 0.75,
                '&:hover': { backgroundColor: 'rgba(129,140,248,0.10)', opacity: 1 },
              }}
            >
              <Box
                sx={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  flexShrink: 0,
                  backgroundColor:
                    i < step ? '#818cf8' : i === step ? '#fb923c' : '#252b40',
                  color: i <= step ? '#14161f' : '#9aa0be',
                  border: i === step ? 'none' : '1.5px solid #2c3247',
                }}
              >
                {i < step ? '✓' : i + 1}
              </Box>
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 800, color: i === step ? '#f2f3fa' : '#9aa0be' }}>
                {WIZARD_EMOJI[i]} {label}
              </Typography>
            </Button>
          </React.Fragment>
        ))}
      </Box>

      {accountControl}

      <Chip
        label={`${problemCount} problem${problemCount === 1 ? '' : 's'}`}
        sx={{
          ml: { xs: 'auto', md: 0 },
          fontWeight: 800,
          fontSize: '0.72rem',
          backgroundColor: 'rgba(129,140,248,0.13)',
          color: '#818cf8',
          border: '1px solid rgba(129,140,248,0.30)',
        }}
      />
    </Box>
  );
}

function WizardFooter({
  step,
  setStep,
  canContinue,
  summary,
}: {
  step: number;
  setStep: (n: number) => void;
  canContinue: boolean;
  summary: string;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: { xs: 2.5, md: 5 },
        py: 2,
        bgcolor: '#0f1119',
        borderTop: '1px solid #2c3247',
        flexShrink: 0,
      }}
    >
      {step > 0 ? (
        <Button
          variant="outlined"
          onClick={() => setStep(step - 1)}
          sx={{
            borderColor: '#2c3247',
            color: '#f2f3fa',
            borderRadius: '12px',
            px: 2.5,
            '&:hover': { borderColor: '#818cf8', color: '#818cf8' },
          }}
        >
          ← Back
        </Button>
      ) : (
        <Box sx={{ width: 110 }} />
      )}
      <Typography
        sx={{
          mx: 'auto',
          color: '#818cf8',
          fontWeight: 800,
          fontSize: '0.88rem',
          textAlign: 'center',
        }}
      >
        {summary}
      </Typography>
      {step < 3 ? (
      <Tooltip title={canContinue ? '' : 'Pick at least one topic to continue'} arrow>
        <span>
          <Button
            variant="contained"
            color="secondary"
            disabled={!canContinue}
            onClick={() => setStep(step + 1)}
            sx={{
              borderRadius: '12px',
              px: 3.5,
              py: 1.25,
              fontSize: '0.92rem',
              boxShadow: '0 4px 16px rgba(251,146,60,.35)',
              '&.Mui-disabled': {
                backgroundColor: '#252b40',
                color: '#5a6080',
                boxShadow: 'none',
              },
            }}
          >
            Continue →
          </Button>
        </span>
      </Tooltip>
      ) : (
        <Box sx={{ width: 132 }} />
      )}
    </Box>
  );
}

// Shared scrollable step container
const stepScrollSx = {
  flex: 1,
  overflowY: 'auto',
  px: { xs: 2.5, md: 5 },
  py: 4,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  background: 'radial-gradient(ellipse at 50% -10%, #1c2033 0%, #14161f 60%)',
} as const;

function StepHeading({ emoji, title, sub }: { emoji: string; title: string; sub: string }) {
  return (
    <Box sx={{ textAlign: 'center', mb: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 0.75 }}>
        {emoji} {title}
      </Typography>
      <Typography sx={{ color: '#9aa0be', fontWeight: 600, fontSize: '0.92rem', maxWidth: 560 }}>
        {sub}
      </Typography>
    </Box>
  );
}

// ── Step 1 · Format ───────────────────────────────────────────────────────────

function StepFormat({
  docType,
  setDocType,
  customTitle,
  setCustomTitle,
  defaultTitle,
  taught,
}: {
  docType: DocumentType;
  setDocType: (d: DocumentType) => void;
  customTitle: string;
  setCustomTitle: (s: string) => void;
  defaultTitle: string;
  taught: TaughtView;
}) {
  return (
    <Box sx={stepScrollSx}>
      <StepHeading
        emoji="🎨"
        title="What are you making?"
        sub="Pick a format, you can always change it later."
      />
      <TaughtPanel view={taught} compact />
      <TextField
        label="Document title"
        placeholder={defaultTitle}
        value={customTitle}
        onChange={(e) => setCustomTitle(e.target.value)}
        helperText="Leave blank to use the automatic title"
        sx={{ width: '100%', maxWidth: 560, mb: 3.5 }}
        FormHelperTextProps={{ sx: { color: '#9aa0be' } }}
        InputLabelProps={{ sx: { color: '#9aa0be' } }}
      />
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
          gap: 1.75,
          width: '100%',
          maxWidth: 780,
        }}
      >
        {DOC_MODES.map((m) => {
          const selected = docType === m.value;
          return (
            <Button
              key={m.value}
              onClick={() => setDocType(m.value)}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                textAlign: 'left',
                gap: 0.75,
                p: 2.25,
                borderRadius: '18px',
                border: '2.5px solid',
                borderColor: selected ? '#818cf8' : '#2c3247',
                backgroundColor: selected ? 'rgba(129,140,248,0.13)' : '#1e2233',
                transition: 'border-color .15s, background-color .15s, transform .15s',
                '&:hover': {
                  borderColor: '#818cf8',
                  backgroundColor: selected ? 'rgba(129,140,248,0.18)' : '#252b40',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <Typography sx={{ fontSize: '1.7rem', lineHeight: 1 }}>{m.emoji}</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#f2f3fa' }}>
                {m.label}
              </Typography>
              <Typography sx={{ fontSize: '0.76rem', color: '#9aa0be', fontWeight: 600, lineHeight: 1.45 }}>
                {m.blurb}
              </Typography>
            </Button>
          );
        })}
      </Box>
    </Box>
  );
}

// ── Step 2 · Topics ───────────────────────────────────────────────────────────

const topicCardSx = (checked: boolean) => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  textAlign: 'left',
  gap: 0.6,
  p: 1.75,
  borderRadius: '14px',
  border: '2px solid',
  borderColor: checked ? '#818cf8' : '#2c3247',
  backgroundColor: checked ? 'rgba(129,140,248,0.13)' : '#1e2233',
  transition: 'border-color .12s, background-color .12s, transform .12s',
  '&:hover': {
    borderColor: '#818cf8',
    transform: 'translateY(-1px)',
  },
  '&.Mui-disabled': {
    opacity: 0.45,
    borderColor: '#2c3247',
    backgroundColor: '#1e2233',
  },
});

// ── Picks tray: what's in the packet, with one total ─────────────────────────
// Every lesson picked so far, in pick order, with its own count and one total
// for the packet. Changing the total splits it evenly (the first picks take
// any extra); the − and + on a lesson change just that lesson.
function CountStepper({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  label: string;
}) {
  const btnSx = {
    minWidth: 0,
    width: 26,
    height: 26,
    p: 0,
    borderRadius: '8px',
    fontWeight: 900,
    fontSize: '0.95rem',
    color: '#c7cbe3',
    border: '1.5px solid #2c3247',
    '&:hover': { borderColor: '#818cf8', color: '#818cf8' },
    '&.Mui-disabled': { color: '#3a4058', borderColor: '#262b3d' },
  } as const;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
      <Button sx={btnSx} disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={`Fewer problems: ${label}`}>
        −
      </Button>
      <Typography
        sx={{ minWidth: 22, textAlign: 'center', fontWeight: 800, fontSize: '0.85rem', color: '#f2f3fa' }}
        aria-label={`${value} problems: ${label}`}
      >
        {value}
      </Typography>
      <Button sx={btnSx} disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`More problems: ${label}`}>
        +
      </Button>
    </Box>
  );
}

// ── Taught shelf panel ───────────────────────────────────────────────────────
// Lessons this teacher has taught, newest first, with the quick starts. On
// Format it shows the quick starts only; on Topics, the shelf too.

interface TaughtView {
  status: 'loading' | 'ok' | 'signed-out' | 'unavailable';
  shelf: ShelfLesson[];
  againIds: string[];
  reviewIds: string[];
  picks: string[];
  msg: string | null;
  onAgain: () => void;
  onReview: () => void;
  onQuiz: () => void;
  onRemove: (id: string) => void;
  onSignIn: () => void;
}

const SHELF_PREVIEW = 12;

const titlesLabel = (ids: string[]) => {
  const first = REGISTRY_BY_ID.get(ids[0])?.title ?? '';
  return ids.length > 1 ? `${first} + ${ids.length - 1} more` : first;
};

function QuickStartButton({
  emoji,
  label,
  sub,
  disabled,
  onClick,
}: {
  emoji: string;
  label: string;
  sub: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      sx={{
        flex: '1 1 200px',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        textAlign: 'left',
        gap: 0.25,
        px: 1.75,
        py: 1.25,
        borderRadius: '12px',
        border: '1.5px solid #2c3247',
        backgroundColor: 'rgba(129,140,248,0.06)',
        textTransform: 'none',
        '&:hover': { borderColor: '#818cf8', backgroundColor: 'rgba(129,140,248,0.12)' },
        '&.Mui-disabled': { opacity: 0.5 },
      }}
    >
      <Typography sx={{ fontWeight: 800, fontSize: '0.86rem', color: '#f2f3fa' }}>
        {emoji} {label}
      </Typography>
      <Typography
        sx={{
          fontSize: '0.7rem',
          fontWeight: 600,
          color: '#9aa0be',
          lineHeight: 1.35,
          width: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={sub}
      >
        {sub}
      </Typography>
    </Button>
  );
}

function TaughtPanel({
  view,
  compact = false,
  isPro = false,
  subjectFilter = 'All',
  selectedTopicIds = [],
  toggleTopic,
}: {
  view: TaughtView;
  compact?: boolean;
  isPro?: boolean;
  subjectFilter?: string;
  selectedTopicIds?: string[];
  toggleTopic?: (id: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  if (view.status === 'loading') return null;
  if (compact && (view.status !== 'ok' || view.shelf.length === 0)) return null;
  const cardSx = {
    width: '100%',
    maxWidth: compact ? 780 : 920,
    mb: compact ? 3 : 2.5,
    bgcolor: '#1e2233',
    border: '1.5px solid #2c3247',
    borderRadius: '16px',
    p: 2,
  } as const;

  if (view.status === 'signed-out') {
    return (
      <Box sx={{ ...cardSx, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }} role="region" aria-label="Taught lessons">
        <Typography sx={{ flex: '1 1 260px', fontSize: '0.8rem', fontWeight: 600, color: '#9aa0be', lineHeight: 1.5 }}>
          📌 Sign in and every lesson you export is kept here, so you can run it again or mix a review in one tap.
        </Typography>
        <Button size="small" variant="outlined" onClick={view.onSignIn} sx={{ borderRadius: '10px', fontWeight: 800 }}>
          Sign in
        </Button>
      </Box>
    );
  }
  if (view.status === 'unavailable') {
    return (
      <Box sx={cardSx} role="region" aria-label="Taught lessons">
        <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#9aa0be' }}>
          📌 Your taught lessons can&apos;t be loaded right now. Picking and exporting still work.
        </Typography>
      </Box>
    );
  }

  const inCourse = (id: string) => {
    const e = REGISTRY_BY_ID.get(id);
    return !!e && entryInView(e, subjectFilter);
  };
  const known = view.shelf.filter((l) => REGISTRY_BY_ID.has(l.topicId));
  const courseShelf = subjectFilter === 'All' ? known : known.filter((l) => inCourse(l.topicId));
  const listed = showAll ? known : courseShelf;
  const shown = showAll ? listed : listed.slice(0, SHELF_PREVIEW);
  const hidden = known.length - shown.length;

  return (
    <Box sx={cardSx} role="region" aria-label="Taught lessons">
      <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', mb: 1.25 }}>
        {compact ? 'Quick start ⚡' : 'Taught 📌'}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap' }}>
        <QuickStartButton
          emoji="↻"
          label="Again"
          sub={view.againIds.length > 0 ? titlesLabel(view.againIds) : 'Nothing taught yet'}
          disabled={view.againIds.length === 0}
          onClick={view.onAgain}
        />
        <QuickStartButton
          emoji="🌀"
          label="Review what I've taught"
          sub={
            view.reviewIds.length > 0
              ? `10 problems from ${view.reviewIds.length === 1 ? '1 lesson' : `${view.reviewIds.length} lessons`}, oldest first`
              : 'Nothing taught yet'
          }
          disabled={view.reviewIds.length === 0}
          onClick={view.onReview}
        />
        <QuickStartButton
          emoji="✅"
          label="Quiz on picks"
          sub={
            view.picks.length > 0
              ? `A test on ${view.picks.length === 1 ? 'your 1 pick' : `your ${view.picks.length} picks`}`
              : 'Pick lessons first'
          }
          disabled={view.picks.length === 0}
          onClick={view.onQuiz}
        />
      </Box>
      {view.msg && (
        <Typography sx={{ fontSize: '0.74rem', fontWeight: 700, color: '#818cf8', mt: 1 }}>{view.msg}</Typography>
      )}
      {!compact && (
        <Box sx={{ mt: 1.75 }}>
          {known.length === 0 ? (
            <Typography sx={{ fontSize: '0.76rem', fontWeight: 600, color: '#9aa0be', lineHeight: 1.5 }}>
              Lessons you export land here, newest first. Taught some without the site? Pick them and tap Mark these taught.
            </Typography>
          ) : (
            <>
              {shown.length === 0 && (
                <Typography sx={{ fontSize: '0.76rem', fontWeight: 600, color: '#9aa0be', mb: 1 }}>
                  Nothing taught in {subjectFilter} yet.
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {shown.map((l) => {
                  const e = REGISTRY_BY_ID.get(l.topicId)!;
                  const picked = selectedTopicIds.includes(l.topicId);
                  const locked = !isPro && !isFreeTopic(l.topicId);
                  return (
                    <Chip
                      key={l.topicId}
                      clickable
                      disabled={e.underConstruction}
                      onClick={() => toggleTopic?.(l.topicId)}
                      onDelete={() => view.onRemove(l.topicId)}
                      aria-pressed={picked}
                      title={`${e.course} · taught ${taughtWhen(l.lastAt)}`}
                      label={
                        <span>
                          {e.title}
                          <Box component="span" sx={{ ml: 0.75, fontWeight: 600, color: picked ? '#c7cbe3' : '#7d84a6' }}>
                            {taughtWhen(l.lastAt)}
                          </Box>
                          {locked && (
                            <Box component="span" sx={{ ml: 0.75, color: '#fb923c', fontWeight: 900, fontSize: '0.62rem' }}>
                              PRO
                            </Box>
                          )}
                        </span>
                      }
                      deleteIcon={<ClearIcon aria-label={`Take ${e.title} off the taught shelf`} />}
                      sx={{
                        fontWeight: 800,
                        fontSize: '0.74rem',
                        border: '1.5px solid',
                        borderColor: picked ? '#818cf8' : '#2c3247',
                        backgroundColor: picked ? 'rgba(129,140,248,0.15)' : '#171a27',
                        color: picked ? '#f2f3fa' : '#c7cbe3',
                        '& .MuiChip-deleteIcon': { color: '#7d84a6', fontSize: 16, '&:hover': { color: '#f87171' } },
                      }}
                    />
                  );
                })}
              </Box>
              {(hidden > 0 || showAll) && (
                <Button
                  size="small"
                  onClick={() => setShowAll((v) => !v)}
                  sx={{ mt: 0.75, color: '#9aa0be', fontWeight: 800, fontSize: '0.72rem', textTransform: 'none', '&:hover': { color: '#818cf8' } }}
                >
                  {showAll ? 'Show fewer' : `Show all ${known.length}`}
                </Button>
              )}
            </>
          )}
        </Box>
      )}
    </Box>
  );
}

function PicksTray({
  cardSx,
  picks,
  isPro,
  count,
  setCount,
  countFor,
  total,
  setPickCount,
  setTotal,
  removePick,
  clearPicks,
  onMarkTaught,
}: {
  cardSx: Record<string, unknown>;
  picks: RegisteredEntry[];
  isPro: boolean;
  count: number;
  setCount: (n: number) => void;
  countFor: (id: string) => number;
  total: number;
  setPickCount: (id: string, n: number) => void;
  setTotal: (n: number) => void;
  removePick: (id: string) => void;
  clearPicks: () => void;
  /** Shown when signed in: puts the picks on the taught shelf. */
  onMarkTaught?: () => void;
}) {
  const range = totalRange(picks.length);
  // The total box takes typing; it applies on Enter or when it loses focus,
  // so typing 12 doesn't split 1 first.
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft == null) return;
    const v = Math.floor(Number(draft));
    if (draft.trim() !== '' && Number.isFinite(v)) setTotal(v);
    setDraft(null);
  };
  return (
    <Box sx={cardSx} role="region" aria-label="Your picks">
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '0.85rem' }}>
          Your picks{picks.length > 0 ? ` (${picks.length})` : ''} 🧺
        </Typography>
        {picks.length > 0 && (
          <Button
            size="small"
            onClick={clearPicks}
            sx={{ color: '#f0a0a0', fontWeight: 800, fontSize: '0.72rem', minWidth: 0, p: 0.25, '&:hover': { color: '#f87171' } }}
          >
            Clear all
          </Button>
        )}
      </Box>
      {picks.length === 0 ? (
        <>
          <Typography sx={{ fontSize: '0.74rem', color: '#9aa0be', fontWeight: 600, lineHeight: 1.5 }}>
            Tap lessons, or search and press Enter, to add them here. You can mix lessons from any course.
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1.5 }}>
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, color: '#c7cbe3' }}>Problems per lesson</Typography>
            <CountStepper value={count} min={1} max={25} onChange={setCount} label="each new lesson" />
          </Box>
        </>
      ) : (
        <>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 280, overflowY: 'auto', pr: 0.5 }}>
            {picks.map((e) => (
              <Box key={e.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton
                  size="small"
                  aria-label={`Remove ${e.title}`}
                  onClick={() => removePick(e.id)}
                  sx={{ color: '#9aa0be', '&:hover': { color: '#f87171' }, p: 0.25 }}
                >
                  <ClearIcon sx={{ fontSize: 14 }} />
                </IconButton>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{ fontSize: '0.78rem', fontWeight: 800, color: '#f2f3fa', lineHeight: 1.3 }}
                    title={e.title}
                  >
                    {e.title}
                  </Typography>
                  <Typography sx={{ fontSize: '0.66rem', fontWeight: 600, color: '#9aa0be', lineHeight: 1.3 }}>
                    {e.course} · {e.group}
                    {!isPro && !isFreeTopic(e.id) && (
                      <Box component="span" sx={{ ml: 0.75, color: '#fb923c', fontWeight: 900 }}>
                        PRO
                      </Box>
                    )}
                  </Typography>
                </Box>
                <CountStepper
                  value={countFor(e.id)}
                  min={1}
                  max={25}
                  onChange={(n) => setPickCount(e.id, n)}
                  label={e.title}
                />
              </Box>
            ))}
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mt: 1.5,
              pt: 1.5,
              borderTop: '1.5px solid #2c3247',
            }}
          >
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, color: '#f2f3fa' }}>Total problems</Typography>
            <TextField
              type="number"
              size="small"
              value={draft ?? String(total)}
              onChange={(ev) => setDraft(ev.target.value)}
              onBlur={commit}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter') commit();
              }}
              inputProps={{ min: range.min, max: range.max, 'aria-label': 'Total problems' }}
              sx={{ width: 84 }}
            />
          </Box>
          <Typography sx={{ fontSize: '0.72rem', color: '#9aa0be', fontWeight: 600, lineHeight: 1.5, mt: 0.75 }}>
            {picks.length > 1
              ? 'A new total is shared evenly. Use − and + to give one lesson more or fewer.'
              : 'Use − and + or type a total.'}
          </Typography>
          {onMarkTaught && (
            <Button
              size="small"
              onClick={onMarkTaught}
              title="For lessons you taught without the site: puts them on your taught shelf"
              sx={{ mt: 1, color: '#9aa0be', fontWeight: 800, fontSize: '0.74rem', textTransform: 'none', p: 0.25, '&:hover': { color: '#818cf8' } }}
            >
              📌 Mark these taught
            </Button>
          )}
        </>
      )}
    </Box>
  );
}

function StepTopics({
  topicSearch,
  handleSearchChange,
  clearTopicFilters,
  availableOnly,
  setAvailableOnly,
  subjectFilter,
  pickCourse,
  searchAllCourses,
  otherCourseMatches,
  addOnlyMatch,
  subjectOptions,
  effectiveGroups,
  expandedGroups,
  toggleGroup,
  allEffectiveExpanded,
  expandAllFiltered,
  collapseAllFiltered,
  selectedTopicIds,
  toggleTopic,
  clearTopics,
  isPro,
  count,
  setCount,
  countFor,
  trayTotal,
  setPickCount,
  setTrayTotal,
  selectedEntries,
  difficulty,
  setDifficulty,
  wordProblems,
  setWordProblems,
  wordCapableSelected,
  includeDiagrams,
  setIncludeDiagrams,
  keepTopicsGrouped,
  setKeepTopicsGrouped,
  showTopicOrder,
  framework,
  setFramework,
  taught,
  onMarkTaught,
}: {
  topicSearch: string;
  handleSearchChange: (v: string) => void;
  clearTopicFilters: () => void;
  availableOnly: boolean;
  setAvailableOnly: (v: boolean | ((p: boolean) => boolean)) => void;
  subjectFilter: string;
  pickCourse: (s: string) => void;
  searchAllCourses: () => void;
  otherCourseMatches: number;
  addOnlyMatch: () => void;
  subjectOptions: string[];
  effectiveGroups: [string, RegisteredEntry[]][];
  expandedGroups: Set<string>;
  toggleGroup: (t: string) => void;
  allEffectiveExpanded: boolean;
  expandAllFiltered: () => void;
  collapseAllFiltered: () => void;
  selectedTopicIds: string[];
  toggleTopic: (id: string) => void;
  clearTopics: () => void;
  isPro: boolean;
  count: number;
  setCount: (n: number) => void;
  countFor: (id: string) => number;
  trayTotal: number;
  setPickCount: (id: string, n: number) => void;
  setTrayTotal: (n: number) => void;
  selectedEntries: RegisteredEntry[];
  difficulty: DifficultyLevel;
  setDifficulty: (d: DifficultyLevel) => void;
  wordProblems: boolean;
  setWordProblems: (b: boolean) => void;
  wordCapableSelected: string[];
  includeDiagrams: boolean;
  setIncludeDiagrams: (b: boolean) => void;
  keepTopicsGrouped: boolean;
  setKeepTopicsGrouped: (b: boolean) => void;
  showTopicOrder: boolean;
  framework: StandardsFramework;
  setFramework: (f: StandardsFramework) => void;
  taught: TaughtView;
  onMarkTaught: () => void;
}) {
  const lastTaught = new Map(
    taught.status === 'ok' ? taught.shelf.map((l) => [l.topicId, l.lastAt] as const) : []
  );
  const railCardSx = {
    bgcolor: '#1e2233',
    border: '1.5px solid #2c3247',
    borderRadius: '16px',
    p: 2.25,
    width: '100%',
  } as const;
  return (
    <Box sx={stepScrollSx}>
      <StepHeading
        emoji="📚"
        title="Which topics should it cover?"
        sub={`Tap to add, mix and match across subjects. We'll keep your ${frameworkMeta(framework).coverName} covered.`}
      />
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 3,
          width: '100%',
          maxWidth: 1240,
          alignItems: { xs: 'stretch', md: 'flex-start' },
        }}
      >
        {/* ── Side rail: tuning controls live here, not under the topic list ── */}
        <Box
          sx={{
            order: { xs: 1, md: 2 },
            width: { xs: '100%', md: 300 },
            flexShrink: 0,
            position: { md: 'sticky' },
            top: { md: 0 },
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <PicksTray
            cardSx={railCardSx}
            picks={selectedEntries}
            isPro={isPro}
            count={count}
            setCount={setCount}
            countFor={countFor}
            total={trayTotal}
            setPickCount={setPickCount}
            setTotal={setTrayTotal}
            removePick={toggleTopic}
            clearPicks={clearTopics}
            onMarkTaught={taught.status === 'ok' ? onMarkTaught : undefined}
          />
          <Box sx={railCardSx}>
            <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', mb: 1 }}>Standards 🏷️</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {FRAMEWORKS.map((f) => {
                const active = framework === f.id;
                return (
                  <Box
                    key={f.id}
                    onClick={() => setFramework(f.id)}
                    sx={{
                      flex: '1 1 45%',
                      textAlign: 'center',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      py: 0.9,
                      borderRadius: '10px',
                      color: active ? '#14161f' : '#9aa0be',
                      backgroundColor: active ? '#818cf8' : 'rgba(129,140,248,0.08)',
                      border: '1.5px solid',
                      borderColor: active ? '#818cf8' : '#2c3247',
                    }}
                  >
                    {f.label}
                  </Box>
                );
              })}
            </Box>
            <Typography sx={{ fontSize: '0.74rem', color: '#9aa0be', fontWeight: 600, lineHeight: 1.5, mt: 1 }}>
              {frameworkMeta(framework).note}
            </Typography>
          </Box>
          <Box sx={railCardSx}>
            <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', mb: 1 }}>Difficulty 💪</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
              {[
                { value: 1, label: 'Easy 😌' },
                { value: 2, label: 'Medium 🙂' },
                { value: 3, label: 'Hard 🥵' },
              ].map((d) => {
                const selected = difficulty === d.value;
                return (
                  <Button
                    key={d.value}
                    onClick={() => setDifficulty(d.value as DifficultyLevel)}
                    sx={{
                      py: 1,
                      borderRadius: '10px',
                      fontSize: '0.78rem',
                      border: '2px solid',
                      borderColor: selected ? '#818cf8' : '#2c3247',
                      backgroundColor: selected ? 'rgba(129,140,248,0.15)' : 'transparent',
                      color: selected ? '#818cf8' : '#9aa0be',
                      '&:hover': { borderColor: '#818cf8' },
                    }}
                  >
                    {d.label}
                  </Button>
                );
              })}
            </Box>
          </Box>
          <Box sx={railCardSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontWeight: 800, fontSize: '0.85rem' }}>Word problems 📖</Typography>
              <Switch
                checked={wordProblems}
                onChange={(e) => setWordProblems(e.target.checked)}
                inputProps={{ 'aria-label': 'Include word problems' }}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: '#818cf8' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#818cf8' },
                }}
              />
            </Box>
            <Typography sx={{ fontSize: '0.74rem', color: '#9aa0be', fontWeight: 600, lineHeight: 1.5, mt: 0.5 }}>
              {wordProblems
                ? wordCapableSelected.length > 0
                  ? `Story versions on for: ${wordCapableSelected.join(' · ')}`
                  : 'On, but none of the selected lessons offer story versions yet. Pre-Algebra angle lessons do, and more are coming.'
                : 'The same problems in story form, where a lesson offers them.'}
            </Typography>
          </Box>
          <Box sx={railCardSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontWeight: 800, fontSize: '0.85rem' }}>Diagrams 🖼️</Typography>
              <Switch
                checked={includeDiagrams}
                onChange={(e) => setIncludeDiagrams(e.target.checked)}
                inputProps={{ 'aria-label': 'Include diagrams' }}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: '#818cf8' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#818cf8' },
                }}
              />
            </Box>
            <Typography sx={{ fontSize: '0.74rem', color: '#9aa0be', fontWeight: 600, lineHeight: 1.5, mt: 0.5 }}>
              {includeDiagrams ? 'Problems show their drawings.' : 'Words only: every drawing is left off the worksheet.'}
            </Typography>
          </Box>
          {showTopicOrder && (
            <Box sx={railCardSx}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontWeight: 800, fontSize: '0.85rem' }}>Keep topics grouped 🗂️</Typography>
                <Switch
                  checked={keepTopicsGrouped}
                  onChange={(e) => setKeepTopicsGrouped(e.target.checked)}
                  inputProps={{ 'aria-label': 'Keep topics grouped' }}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': { color: '#818cf8' },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#818cf8' },
                  }}
                />
              </Box>
              <Typography sx={{ fontSize: '0.74rem', color: '#9aa0be', fontWeight: 600, lineHeight: 1.5, mt: 0.5 }}>
                {keepTopicsGrouped
                  ? 'Each topic gets its own section, in the order you picked them.'
                  : 'Topics are mixed together, numbered straight through. The answer key follows the same order.'}
              </Typography>
            </Box>
          )}
        </Box>
        {/* ── Main column: search, filters, topic list ── */}
        <Box
          sx={{
            order: { xs: 2, md: 1 },
            flex: 1,
            minWidth: 0,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
        <TaughtPanel
          view={taught}
          isPro={isPro}
          subjectFilter={subjectFilter}
          selectedTopicIds={selectedTopicIds}
          toggleTopic={toggleTopic}
        />
        <TextField
          value={topicSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addOnlyMatch();
            }
          }}
          placeholder={
            subjectFilter === 'All'
              ? '🔍 Search a skill or standard, like midsegment or G.5(D)'
              : `🔍 Search ${subjectFilter}: a skill or standard`
          }
          aria-label="Search topics"
          sx={{ width: '100%', maxWidth: 520, mb: 1.5 }}
          slotProps={{
            input: {
              endAdornment: topicSearch ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    aria-label="Clear search"
                    onClick={() => handleSearchChange('')}
                    sx={{ color: '#9aa0be', '&:hover': { color: '#818cf8' } }}
                  >
                    <ClearIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            },
          }}
        />
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            flexWrap: 'wrap',
            justifyContent: 'center',
            mb: 2.5,
            maxWidth: 920,
          }}
        >
          <Chip
            clickable
            label="Available only"
            aria-pressed={availableOnly}
            onClick={() => setAvailableOnly((v) => !v)}
            sx={{
              fontWeight: 800,
              border: '1.5px solid',
              borderColor: availableOnly ? '#818cf8' : '#2c3247',
              backgroundColor: availableOnly ? 'rgba(129,140,248,0.15)' : '#1e2233',
              color: availableOnly ? '#818cf8' : '#9aa0be',
              '&:hover': { borderColor: '#818cf8', color: '#818cf8' },
            }}
          />
          {subjectOptions.map((s) => {
            const active = subjectFilter === s;
            return (
              <Chip
                key={s}
                clickable
                label={s === 'All' ? 'All subjects' : s}
                onClick={() => pickCourse(s)}
                aria-pressed={active}
                sx={{
                  fontWeight: 800,
                  border: '1.5px solid',
                  borderColor: active ? '#818cf8' : '#2c3247',
                  backgroundColor: active ? 'rgba(129,140,248,0.15)' : '#1e2233',
                  color: active ? '#818cf8' : '#9aa0be',
                  '&:hover': { borderColor: '#818cf8', color: '#818cf8' },
                }}
              />
            );
          })}
          {(topicSearch.trim() !== '' || availableOnly) && (
            <Button
              size="small"
              onClick={clearTopicFilters}
              sx={{ color: '#9aa0be', fontWeight: 800, '&:hover': { color: '#818cf8' } }}
            >
              Clear
            </Button>
          )}
        </Box>

        <Box sx={{ width: '100%', maxWidth: 920 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            {otherCourseMatches > 0 ? (
              <Button
                size="small"
                onClick={searchAllCourses}
                sx={{ color: '#9aa0be', fontWeight: 800, fontSize: '0.75rem', textTransform: 'none', '&:hover': { color: '#818cf8' } }}
              >
                {otherCourseMatches} more in other courses · Search all courses
              </Button>
            ) : (
              <span />
            )}
            <Button
              size="small"
              onClick={allEffectiveExpanded ? collapseAllFiltered : expandAllFiltered}
              sx={{ color: '#9aa0be', fontWeight: 800, fontSize: '0.75rem', '&:hover': { color: '#818cf8' } }}
            >
              {allEffectiveExpanded ? 'Collapse all' : 'Expand all'}
            </Button>
          </Box>
          {effectiveGroups.map(([groupKey, entries]) => {
            const open = expandedGroups.has(groupKey);
            const { group: groupTitle, course: groupCourse } = entries[0];
            // The course goes beside the group name unless one course is
            // already picked (group names like Systems repeat across courses).
            const showCourse = subjectFilter === 'All';
            const selectedCount = entries.filter((e) => selectedTopicIds.includes(e.id)).length;
            return (
              <Box
                key={groupKey}
                sx={{
                  mb: 1.25,
                  borderRadius: '16px',
                  border: '1.5px solid #2c3247',
                  backgroundColor: '#1e2233',
                  overflow: 'hidden',
                }}
              >
                <Button
                  fullWidth
                  onClick={() => toggleGroup(groupKey)}
                  aria-expanded={open}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    px: 2,
                    py: 1.25,
                    borderRadius: 0,
                    '&:hover': { backgroundColor: 'rgba(129,140,248,0.06)' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                    <ExpandMore
                      sx={{
                        color: open ? '#818cf8' : '#9aa0be',
                        transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
                        transition: 'transform .2s',
                      }}
                    />
                    <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: '#f2f3fa', textAlign: 'left' }}>
                      {groupTitle}
                      {showCourse && (
                        <Box
                          component="span"
                          sx={{ ml: 1, fontWeight: 600, fontSize: '0.78rem', color: '#9aa0be' }}
                        >
                          {groupCourse}
                        </Box>
                      )}
                    </Typography>
                  </Box>
                  {selectedCount > 0 && (
                    <Chip
                      size="small"
                      label={`${selectedCount} selected`}
                      sx={{ backgroundColor: 'rgba(129,140,248,0.15)', color: '#818cf8', fontWeight: 800 }}
                    />
                  )}
                </Button>
                <Collapse in={open} timeout={220} unmountOnExit>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                      gap: 1.25,
                      p: 2,
                      pt: 0.5,
                    }}
                  >
                    {entries.map((entry) => {
                      const checked = selectedTopicIds.includes(entry.id);
                      return (
                        <Button
                          key={entry.id}
                          disabled={entry.underConstruction}
                          onClick={() => toggleTopic(entry.id)}
                          title={entry.underConstruction ? 'Not available yet' : entry.description}
                          sx={topicCardSx(checked)}
                        >
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 10,
                              right: 10,
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 900,
                              backgroundColor: checked ? '#818cf8' : 'transparent',
                              border: '2px solid',
                              borderColor: checked ? '#818cf8' : '#2c3247',
                              color: checked ? '#14161f' : 'transparent',
                            }}
                          >
                            ✓
                          </Box>
                          <Typography
                            sx={{
                              fontSize: '0.64rem',
                              fontWeight: 800,
                              letterSpacing: 0.6,
                              color: '#818cf8',
                              backgroundColor: 'rgba(129,140,248,0.12)',
                              px: 1,
                              py: 0.35,
                              borderRadius: '6px',
                              pr: 4,
                            }}
                          >
                            {entry.underConstruction ? 'COMING SOON' : standardsFor(entry.id, entry.teks, framework)}
                          </Typography>
                          <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: '#f2f3fa', lineHeight: 1.35 }}>
                            {entry.title}
                          </Typography>
                          {checked && (
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: '#818cf8' }}>
                              ×{countFor(entry.id)} problems
                            </Typography>
                          )}
                          {lastTaught.has(entry.id) && (
                            <Typography sx={{ fontSize: '0.66rem', fontWeight: 700, color: '#7d84a6' }}>
                              📌 Taught {taughtWhen(lastTaught.get(entry.id)!)}
                            </Typography>
                          )}
                          {!isPro && !isFreeTopic(entry.id) && !entry.underConstruction && (
                            <Typography sx={{ fontSize: '0.62rem', fontWeight: 900, letterSpacing: 0.8, color: '#fb923c' }}>
                              PRO
                            </Typography>
                          )}
                          {!entry.underConstruction && entry.story && (
                            <Typography sx={{ fontSize: '0.72rem', color: '#9aa0be', fontWeight: 600, lineHeight: 1.4 }}>
                              {entry.story}
                            </Typography>
                          )}
                        </Button>
                      );
                    })}
                  </Box>
                </Collapse>
              </Box>
            );
          })}
          {effectiveGroups.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography sx={{ color: '#9aa0be', fontWeight: 700, mb: 2 }}>
                {subjectFilter === 'All'
                  ? 'No topics match your search. 🔍'
                  : `Nothing in ${subjectFilter} matches. 🔍`}
              </Typography>
              {otherCourseMatches > 0 && (
                <Button onClick={searchAllCourses} sx={{ color: '#818cf8', fontWeight: 800, mr: 1 }}>
                  Search all courses ({otherCourseMatches})
                </Button>
              )}
              <Button onClick={clearTopicFilters} sx={{ color: '#818cf8', fontWeight: 800 }}>
                Clear search
              </Button>
            </Box>
          )}
        </Box>

        </Box>
      </Box>
    </Box>
  );
}

// ── Step 3 · Accommodations ───────────────────────────────────────────────────

function StepAccommodations({
  accomList,
  accomError,
  handleAccomOp,
  accomStore,
  versionPlan,
  hasAccommodations,
}: {
  accomList: ClassAccommodationList | null;
  accomError: string | null;
  handleAccomOp: (op: () => ClassAccommodationList | void, listId?: string) => void;
  accomStore: ReturnType<typeof createAccommodationStore>;
  versionPlan: ReturnType<typeof planVersions>;
  hasAccommodations: boolean;
}) {
  return (
    <Box sx={stepScrollSx}>
      <StepHeading
        emoji="♿"
        title="Who needs a different version?"
        sub="Set up anonymous groups once, every version shares the same math. Skip this step if everyone gets the same worksheet."
      />
      <Box
        sx={{
          width: '100%',
          maxWidth: 680,
          bgcolor: '#1e2233',
          border: '1.5px solid #2c3247',
          borderRadius: '20px',
          p: { xs: 2, md: 3 },
        }}
      >
        <AccommodationsPanel
          list={accomList}
          error={accomError}
          onCreateList={(classLabel) =>
            handleAccomOp(() => {
              accomStore.createList(classLabel);
            })
          }
          onUpdateClassLabel={(listId, classLabel) =>
            handleAccomOp(() => {
              accomStore.updateClassLabel(listId, classLabel);
            }, listId)
          }
          onAddGroup={(listId, input: NewGroupInput) =>
            handleAccomOp(() => {
              accomStore.addGroup(listId, input);
            }, listId)
          }
          onUpdateGroup={(listId, groupId, patch) =>
            handleAccomOp(() => {
              accomStore.updateGroup(listId, groupId, patch);
            }, listId)
          }
          onRemoveGroup={(listId, groupId) =>
            handleAccomOp(() => {
              accomStore.removeGroup(listId, groupId);
            }, listId)
          }
        />
      </Box>
      {hasAccommodations && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', mt: 2.5, maxWidth: 680 }}>
          {versionPlan.all().map((v) => (
            <Chip
              key={v.versionId}
              label={v.kind === 'base' ? `Base · ${v.problems.length}` : `${v.label} · ${v.problems.length}`}
              sx={{
                fontWeight: 800,
                backgroundColor: 'rgba(129,140,248,0.13)',
                color: '#818cf8',
                border: '1px solid rgba(129,140,248,0.30)',
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

// ── Step 4 · Review & Export ──────────────────────────────────────────────────

function StepReview({
  hasAccommodations,
  accommodatedDocument,
  questions,
  advancedProblems,
  mixedOrder,
  docType,
  title,
  standards,
  includeAnswerKey,
  setIncludeAnswerKey,
  classicalGroups,
  seed,
  setSeed,
  randomizeSeed,
  versionPlan,
  activeVersion,
  activeVersionId,
  setActiveVersionId,
  saveDraft,
  onSaveToLibrary,
  libraryMsg,
  clearLibraryMsg,
  fileRef,
  mounted,
  draftError,
  draftNotice,
  clearDraftNotice,
  onGatedExport,
  proofDocMode,
  selectedModules,
  moduleProblemCounts,
  errorBoundaryKey,
  isPro,
  gateReason,
  onExportCount,
  usageNote,
}: {
  hasAccommodations: boolean;
  accommodatedDocument: React.ReactElement | null;
  questions: ReturnType<typeof problemToQuestion>[];
  advancedProblems: MathProblem[];
  /** Mixed-topic order: one list, no section headings. */
  mixedOrder: boolean;
  docType: DocumentType;
  title: string;
  standards: string;
  includeAnswerKey: boolean;
  setIncludeAnswerKey: (b: boolean) => void;
  classicalGroups: ClassicalGroup[] | undefined;
  seed: number;
  setSeed: (n: number) => void;
  randomizeSeed: () => void;
  versionPlan: ReturnType<typeof planVersions>;
  activeVersion: ReturnType<typeof planVersions> extends never ? never : { versionId: string; label: string; kind: string; problems: MathProblem[]; accommodations: string[]; presentation: import('../lib/accommodations').Presentation; studentCount?: number; wordBank: string[] };
  activeVersionId: string;
  setActiveVersionId: (id: string) => void;
  saveDraft: () => void;
  onSaveToLibrary: () => void;
  libraryMsg: { severity: 'success' | 'error'; text: string } | null;
  clearLibraryMsg: () => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
  mounted: boolean;
  draftError: string | null;
  draftNotice: string | null;
  clearDraftNotice: () => void;
  /** Free can't export this one: explain why instead of leaving the page. */
  onGatedExport: () => void;
  proofDocMode: 'proof-two-column' | 'proof-fill-reasons' | 'proof-elements' | 'proof-blank' | undefined;
  selectedModules: RegisteredEntry[];
  /** Per-module generated problem counts, parallel to selectedModules. */
  moduleProblemCounts: number[];
  errorBoundaryKey: string;
  isPro: boolean;
  gateReason: 'accommodations' | 'limit' | null;
  onExportCount: () => void;
  usageNote: string | null;
}) {
  void fileRef;
  // Export scope guard: exactly which lessons are in the packet, grouped by
  // course, so a mixed selection can never slip into an export unnoticed.
  const problemsWord = (n: number) => `${n} problem${n === 1 ? '' : 's'}`;
  const scopeRows = selectedModules.map((mod, i) => ({
    title: mod.title,
    course: courseOfEntry(mod),
    count: moduleProblemCounts[i] ?? 0,
  }));
  const scopeCourses: { course: string; count: number }[] = [];
  for (const row of scopeRows) {
    const found = scopeCourses.find((c) => c.course === row.course);
    if (found) found.count += row.count;
    else scopeCourses.push({ course: row.course, count: row.count });
  }
  const mixesCourses = new Set(scopeCourses.map((c) => courseFamily(c.course))).size > 1;
  const mixParts = scopeCourses.map((c) => `${c.course} (${problemsWord(c.count)})`);
  const mixSummary =
    mixParts.length > 1
      ? `${mixParts.slice(0, -1).join(', ')} and ${mixParts[mixParts.length - 1]}`
      : (mixParts[0] ?? '');
  const scopeList = (
    <Box sx={{ mt: 0.5 }}>
      {scopeRows.map((row, i) => (
        <Typography key={i} sx={{ fontSize: '0.78rem', fontWeight: 600, lineHeight: 1.55 }}>
          {row.title} · {problemsWord(row.count)}
          {mixesCourses ? ` · ${row.course}` : ''}
        </Typography>
      ))}
    </Box>
  );
  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Action bar */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.25,
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 2, md: 4 },
          pt: 2.5,
          pb: 1.5,
          flexShrink: 0,
        }}
      >
        <Button
          variant="outlined"
          startIcon={<Save />}
          onClick={saveDraft}
          sx={{ borderColor: '#2c3247', color: '#f2f3fa', borderRadius: '12px', '&:hover': { borderColor: '#818cf8', color: '#818cf8' } }}
        >
          Save draft
        </Button>
        <Button
          variant="outlined"
          startIcon={<UploadFile />}
          onClick={() => fileRef.current?.click()}
          sx={{ borderColor: '#2c3247', color: '#f2f3fa', borderRadius: '12px', '&:hover': { borderColor: '#818cf8', color: '#818cf8' } }}
        >
          Load draft
        </Button>
        <Tooltip title={isPro ? 'Keep it in your library and rebuild it exactly, any time' : 'Saved worksheets are part of Pro'} arrow>
          <Button
            variant="outlined"
            startIcon={<BookmarkAdd />}
            onClick={onSaveToLibrary}
            disabled={selectedModules.length === 0}
            sx={{ borderColor: '#2c3247', color: '#f2f3fa', borderRadius: '12px', '&:hover': { borderColor: '#818cf8', color: '#818cf8' } }}
          >
            Save to library{isPro ? '' : ' (Pro)'}
          </Button>
        </Tooltip>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#1e2233', border: '1.5px solid #2c3247', borderRadius: '12px', px: 1.5, py: 0.5 }}>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: '#9aa0be' }}>Seed</Typography>
          <TextField
            type="number"
            size="small"
            value={seed}
            onChange={(e) => setSeed(Math.floor(Number(e.target.value)) || 0)}
            sx={{ width: 92, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
          />
          <Tooltip title="Fresh problem set 🎲" arrow>
            <IconButton size="small" onClick={randomizeSeed} sx={{ color: '#9aa0be', '&:hover': { color: '#818cf8' } }}>
              <Casino fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <FormControlLabel
          control={
            <Switch
              size="small"
              disabled={!isPro}
              checked={isPro ? includeAnswerKey : false}
              onChange={(e) => setIncludeAnswerKey(e.target.checked)}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': { color: '#818cf8' },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: 'rgba(129,140,248,0.45)' },
              }}
            />
          }
          label={<Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#f2f3fa' }}>Answer key{isPro ? '' : ' (Pro)'}</Typography>}
          sx={{ ml: 0 }}
        />
        {mounted && selectedModules.length > 0 && gateReason ? (
          <Button
            variant="contained"
            color="secondary"
            startIcon={<PictureAsPdf />}
            onClick={onGatedExport}
            sx={{ borderRadius: '12px', px: 3, py: 1.25, boxShadow: '0 4px 16px rgba(251,146,60,.35)' }}
          >
            Export PDF 🎉
          </Button>
        ) : mounted && selectedModules.length > 0 ? (
          <Box onClick={() => onExportCount()}>
          <PDFDownloadLink
            document={
              hasAccommodations && accommodatedDocument ? (
                accommodatedDocument
              ) : (
                <PdfDocument
                  title={title}
                  questions={questions}
                  advancedProblems={advancedProblems}
                  docType={docType}
                  standard={standards}
                  includeAnswerKey={isPro ? includeAnswerKey : false}
                  classicalGroups={classicalGroups}
                  seed={seed}
                  watermark={!isPro}
                  mixedOrder={mixedOrder}
                />
              )
            }
            fileName={
              hasAccommodations
                ? `${title.replace(/\s+/g, '_').toLowerCase()}-accommodated.pdf`
                : `${title.replace(/\s+/g, '_').toLowerCase()}.pdf`
            }
            style={{ textDecoration: 'none' }}
          >
            {({ loading }: { loading: boolean }) => (
              <Button
                variant="contained"
                color="secondary"
                startIcon={<PictureAsPdf />}
                disabled={loading}
                sx={{ borderRadius: '12px', px: 3, py: 1.25, boxShadow: '0 4px 16px rgba(251,146,60,.35)' }}
              >
                {loading ? 'Preparing PDF…' : 'Export PDF 🎉'}
              </Button>
            )}
          </PDFDownloadLink>
          </Box>
        ) : null}
      </Box>

      {/* Export scope guard: packet contents, with a warning on course mixes */}
      {selectedModules.length > 0 &&
        (mixesCourses ? (
          <Alert severity="warning" sx={{ mx: 'auto', mb: 1.5, maxWidth: '8.5in', width: 'calc(100% - 32px)' }}>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 800 }}>
              This packet mixes {mixSummary}.
            </Typography>
            {scopeList}
          </Alert>
        ) : (
          <Box
            sx={{
              mx: 'auto',
              mb: 1.5,
              maxWidth: '8.5in',
              width: 'calc(100% - 32px)',
              bgcolor: '#1e2233',
              border: '1.5px solid #2c3247',
              borderRadius: '12px',
              px: 2,
              py: 1.25,
              color: '#f2f3fa',
            }}
          >
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: '#9aa0be', letterSpacing: '0.04em' }}>
              IN THIS PACKET
            </Typography>
            {scopeList}
          </Box>
        ))}

      {gateReason && (
        <Alert
          severity="warning"
          action={
            <Button color="inherit" size="small" href="/pricing" sx={{ fontWeight: 800 }}>
              See Pro
            </Button>
          }
          sx={{ mx: 'auto', mb: 1.5, maxWidth: '8.5in', width: 'calc(100% - 32px)' }}
        >
          {gateReason === 'accommodations'
            ? 'Accommodated versions (IEP groups) export with Pro, the accommodations are the Pro feature.'
            : 'You have used your free exports for this month. Pro is unlimited.'}
        </Alert>
      )}
      {usageNote && !gateReason && (
        <Typography sx={{ textAlign: 'center', fontSize: '0.72rem', color: '#9aa0be', fontWeight: 600, mb: 1 }}>
          {usageNote} · Free exports carry a small footer note and no answer key.
        </Typography>
      )}

      {libraryMsg && (
        <Alert
          severity={libraryMsg.severity}
          onClose={clearLibraryMsg}
          action={
            libraryMsg.severity === 'success' ? (
              <Button color="inherit" size="small" href="/saved" sx={{ fontWeight: 800 }}>
                Saved worksheets
              </Button>
            ) : undefined
          }
          sx={{ mx: 'auto', mb: 1.5, maxWidth: '8.5in', width: 'calc(100% - 32px)' }}
        >
          {libraryMsg.text}
        </Alert>
      )}

      {draftError && (
        <Alert severity="error" sx={{ mx: 'auto', mb: 1.5, maxWidth: '8.5in', width: 'calc(100% - 32px)' }}>
          {draftError}
        </Alert>
      )}
      {draftNotice && (
        <Alert
          severity="success"
          onClose={clearDraftNotice}
          role="status"
          sx={{ mx: 'auto', mb: 1.5, maxWidth: '8.5in', width: 'calc(100% - 32px)' }}
        >
          {draftNotice}
        </Alert>
      )}

      {/* Version tabs */}
      {hasAccommodations && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', px: 2, pb: 1, flexShrink: 0 }} data-testid="version-tab-strip">
          {versionPlan.all().map((v) => {
            const selected = v.versionId === activeVersionId;
            return (
              <Button
                key={v.versionId}
                onClick={() => setActiveVersionId(v.versionId)}
                data-testid={`version-tab-${v.versionId}`}
                sx={{
                  fontSize: '0.78rem',
                  borderRadius: '999px',
                  px: 2.25,
                  py: 0.85,
                  border: '2px solid',
                  borderColor: selected ? '#818cf8' : '#2c3247',
                  backgroundColor: selected ? 'rgba(129,140,248,0.15)' : '#1e2233',
                  color: selected ? '#818cf8' : '#9aa0be',
                  '&:hover': { borderColor: '#818cf8' },
                }}
              >
                {v.label}
                {v.kind === 'group' && v.studentCount ? ` (${v.studentCount})` : ''}
              </Button>
            );
          })}
          <Typography sx={{ fontSize: '0.72rem', color: '#9aa0be', fontWeight: 600, ml: 1 }}>
            Previewing: {activeVersion.label}
            {activeVersion.accommodations.length > 0 && `, ${activeVersion.accommodations.join(', ')}`}
          </Typography>
        </Box>
      )}

      {/* Preview */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          justifyContent: 'center',
          py: 2,
          px: 2,
          background: 'radial-gradient(ellipse at 50% -10%, #1c2033 0%, #14161f 60%)',
        }}
      >
        {selectedModules.length === 0 ? (
          <Alert severity="info" sx={{ maxWidth: '8.5in', width: '100%', mt: 2, alignSelf: 'flex-start' }}>
            Head back to Topics and pick at least one. 📚
          </Alert>
        ) : (
          <PreviewErrorBoundary key={errorBoundaryKey}>
            <ScaledPreview>
            <EuclidEngine
              problems={activeVersion.problems}
              mode={toOutputMode(docType)}
              title={title}
              classicalGroups={classicalGroups}
              seed={seed}
              proofDocMode={proofDocMode}
              standard={standards}
              presentation={activeVersion.presentation}
              wordBank={activeVersion.wordBank}
              mixedOrder={mixedOrder}
            />
            </ScaledPreview>
          </PreviewErrorBoundary>
        )}
      </Box>
    </Box>
  );
}
