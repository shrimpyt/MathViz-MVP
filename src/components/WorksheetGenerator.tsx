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
  Grow,
} from '@mui/material';
import {
  ArrowLeft,
  ArrowRight,
  BookmarkPlus,
  Check,
  ChevronDown,
  ClipboardCheck,
  Dices,
  FileDown,
  FileText,
  Landmark,
  ListChecks,
  NotebookPen,
  PenLine,
  Save,
  Search,
  SquareDashed,
  Timer,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react';
import ToastStack, { type Toast } from './ToastStack';
import { color, icon, motion, radius, shadow, sx as ui } from '../core/tokens';
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
  Icon: LucideIcon;
  blurb: string;
}[] = [
  { value: 'guided-notes', label: 'Guided Notes', Icon: NotebookPen, blurb: 'Fill-in-the-blank scaffolding' },
  { value: 'review', label: 'Review', Icon: ListChecks, blurb: 'High-density practice, answers shown' },
  { value: 'test', label: 'Test', Icon: ClipboardCheck, blurb: 'Formal assessment, no hints' },
  { value: 'worksheet', label: 'Worksheet', Icon: FileText, blurb: 'Everyday practice set' },
  { value: 'classical-notes', label: 'Classical Notes', Icon: Landmark, blurb: 'Definitions printed, reasoning yours' },
  { value: 'proof-fill-reasons', label: 'Proofs: Fill in the Blanks', Icon: PenLine, blurb: 'Proof table printed, blanks left for students to complete' },
  { value: 'proof-blank', label: 'Proofs: Blank Workspace', Icon: SquareDashed, blurb: 'Just Given and Prove, one big open space to write the whole proof' },
  { value: 'sat-practice', label: 'SAT Practice', Icon: Timer, blurb: 'Timed SAT-style module' },
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
    });
    return () => {
      live = false;
    };
  }, []);
  const isPro = account.plan === 'pro';
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
      return `Format: ${m ? m.label : docType}`;
    }
    if (step === 1) {
      return `${selectedTopicIds.length} topic${selectedTopicIds.length === 1 ? '' : 's'} · ${advancedProblems.length} problems · ${frameworkMeta(framework).short} ${teksSelected}/${teksTotal}`;
    }
    if (hasAccommodations) {
      return `${versionPlan.groups.length} group${versionPlan.groups.length === 1 ? '' : 's'} → ${versionPlan.all().length} versions ready`;
    }
    return 'No accommodations, everyone gets the base version';
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
        bgcolor: color.bg,
      }}
    >
      <WizardTopbar
        step={step}
        goTo={goToStep}
        accountControl={
          <AccountControl account={account} onAccountChange={setAccount} open={signInOpen} setOpen={setSignInOpen} />
        }
      />

      <ToastStack
        toasts={
          gateMsg
            ? [
                {
                  key: 'gate',
                  severity: 'info',
                  text: gateMsg,
                  onClose: () => setGateMsg(null),
                  action: (
                    <Button color="inherit" size="small" href="/pricing">
                      See Pro
                    </Button>
                  ),
                },
              ]
            : []
        }
      />

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {step === 0 && (
          <StepFormat
            docType={docType}
            setDocType={setDocType}
            customTitle={customTitle}
            setCustomTitle={setCustomTitle}
            defaultTitle={defaultTitle}
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
        <DialogTitle>Save to your library</DialogTitle>
        <DialogContent>
          <Typography sx={{ ...ui.help, fontSize: '0.875rem', mb: 2 }}>
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
          <Button onClick={() => setSaveDialogOpen(false)} disabled={saving}>
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
              <DialogTitle>{copy.title}</DialogTitle>
              <DialogContent>
                {copy.body.map((line) => (
                  <Typography key={line} sx={{ fontSize: '0.875rem', color: color.textMuted, mb: 1 }}>
                    {line}
                  </Typography>
                ))}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setExportGateOpen(false)}>
                  Not now
                </Button>
                {account.status !== 'signed-in' && (
                  <Button
                    variant="outlined"
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
        <Typography
          title={account.email ?? undefined}
          sx={{
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: color.textMuted,
            maxWidth: { xs: 150, md: 280 },
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            mr: 1,
          }}
        >
          {account.email}
          <Box component="span" sx={{ color: color.text, fontWeight: 600 }}>
            {' · '}
            {account.plan === 'pro' ? 'Pro' : 'Free'}
          </Box>
        </Typography>
        <Button size="small" href="/saved" sx={{ whiteSpace: 'nowrap', px: 1 }}>
          Saved
        </Button>
        {account.plan === 'pro' ? (
          <Button
            size="small"
            sx={{ whiteSpace: 'nowrap', px: 1 }}
            onClick={async () => {
              const url = await createPortalUrl();
              if (url) window.location.href = url;
            }}
          >
            Billing
          </Button>
        ) : (
          <Button size="small" href="/pricing" sx={{ color: color.accent, whiteSpace: 'nowrap', px: 1, '&:hover': { color: color.accentHover } }}>
            Upgrade
          </Button>
        )}
        <Button
          size="small"
          sx={{ whiteSpace: 'nowrap', px: 1 }}
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
      <Button size="small" href="/pricing" sx={{ whiteSpace: 'nowrap', px: 1 }}>
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
        sx={{ whiteSpace: 'nowrap', px: 2 }}
      >
        Sign in
      </Button>
      {/* The menu grows out of the Sign in button (top right corner). */}
      <Grow
        in={open}
        unmountOnExit
        style={{ transformOrigin: 'top right' }}
        timeout={{ enter: motion.enter, exit: motion.exit }}
        easing={{ enter: motion.easeOut, exit: motion.easeIn }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            zIndex: 30,
            width: 320,
            bgcolor: color.bgRaised,
            border: `1px solid ${color.borderStrong}`,
            borderRadius: `${radius.xl}px`,
            p: 2,
            boxShadow: shadow.lg,
            // Controls inside sit 16px in, so their corners are 24 - 16 = 8.
            '& .MuiOutlinedInput-root, & .MuiButton-root': { borderRadius: `${radius.sm}px` },
          }}
        >
          {sent ? (
            <>
              <Typography sx={{ ...ui.label, mb: 0.5 }}>
                Enter the 6-digit code
              </Typography>
              <Typography sx={{ ...ui.help, mb: 2, overflowWrap: 'anywhere' }}>
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
                    style: { letterSpacing: '0.3em', fontWeight: 600, textAlign: 'center' },
                  },
                }}
                sx={{ mb: 1 }}
              />
              {error && (
                <Typography sx={{ fontSize: '0.75rem', color: color.danger, fontWeight: 500, mb: 1 }}>
                  {error}
                </Typography>
              )}
              <Button
                fullWidth
                variant="contained"
                disabled={busy || !codeReady}
                onClick={checkCode}
              >
                {busy ? 'Checking…' : 'Sign in'}
              </Button>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Button size="small" disabled={busy} onClick={sendCode} sx={{ px: 1 }}>
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
                  sx={{ px: 1 }}
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
                  >
                    Continue with Google
                  </Button>
                  <Typography sx={{ ...ui.help, textAlign: 'center', my: 1 }}>
                    or
                  </Typography>
                </>
              )}
              <Typography sx={{ ...ui.label, mb: 1 }}>
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
                <Typography sx={{ fontSize: '0.75rem', color: color.danger, fontWeight: 500, mb: 1 }}>
                  {error}
                </Typography>
              )}
              <Button
                fullWidth
                variant="contained"
                disabled={busy || !email.includes('@')}
                onClick={sendCode}
              >
                {busy ? 'Sending…' : 'Email me a sign-in code'}
              </Button>
              <Typography sx={{ ...ui.help, mt: 1 }}>
                Teacher accounts only. We never collect student data.
              </Typography>
            </>
          )}
        </Box>
      </Grow>
    </Box>
    </ClickAwayListener>
  );
}

// ── Wizard chrome ─────────────────────────────────────────────────────────────

const WIZARD_STEPS = ['Format', 'Topics', 'Accommodations', 'Review'] as const;

function WizardTopbar({
  step,
  goTo,
  accountControl,
}: {
  step: number;
  goTo: (n: number) => void;
  accountControl?: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: { xs: 2, md: 3 },
        py: 1,
        minHeight: 64,
        bgcolor: color.bgRaised,
        borderBottom: `1px solid ${color.border}`,
        flexShrink: 0,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <Box
          aria-hidden
          sx={{
            width: 32,
            height: 32,
            borderRadius: `${radius.sm}px`,
            bgcolor: color.accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 16,
            color: color.accentContrast,
          }}
        >
          E
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
          Euclid <Box component="span" sx={{ color: color.textMuted, fontWeight: 500 }}>Engine</Box>
        </Typography>
      </Box>
      <Typography
        sx={{
          display: { xs: 'block', md: 'none' },
          fontSize: '0.75rem',
          fontWeight: 500,
          color: color.textMuted,
          whiteSpace: 'nowrap',
        }}
      >
        {step + 1} / 4 · {WIZARD_STEPS[step]}
      </Typography>

      <Box
        component="nav"
        aria-label="Steps"
        sx={{
          display: { xs: 'none', md: 'flex' },
          alignItems: 'center',
          gap: 1,
          mx: 'auto',
        }}
      >
        {WIZARD_STEPS.map((label, i) => {
          const current = i === step;
          const done = i < step;
          return (
            <React.Fragment key={label}>
              {i > 0 && <Box aria-hidden sx={{ width: 24, height: '1px', bgcolor: color.borderStrong }} />}
              <Button
                onClick={() => goTo(i)}
                aria-current={current ? 'step' : undefined}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1,
                  py: 0.5,
                  borderRadius: `${radius.sm}px`,
                  minWidth: 0,
                  color: current ? color.text : color.textMuted,
                  '&:hover': { color: color.text, backgroundColor: 'rgba(160, 168, 214, 0.06)' },
                }}
              >
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    flexShrink: 0,
                    backgroundColor: current ? color.accent : 'transparent',
                    color: current ? color.accentContrast : color.textMuted,
                    border: current ? `1px solid ${color.accent}` : `1px solid ${color.borderStrong}`,
                    transition: ui.transition('background-color, border-color, color'),
                  }}
                >
                  {done ? <Check size={icon.size} strokeWidth={icon.strokeWidth} aria-label="done" /> : i + 1}
                </Box>
                <Typography component="span" sx={{ fontSize: '0.8125rem', fontWeight: current ? 600 : 500, color: 'inherit' }}>
                  {label}
                </Typography>
              </Button>
            </React.Fragment>
          );
        })}
      </Box>

      <Box sx={{ ml: { xs: 'auto', md: 0 } }}>{accountControl}</Box>
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
        px: { xs: 2, md: 4 },
        py: 2,
        bgcolor: color.bgRaised,
        borderTop: `1px solid ${color.border}`,
        flexShrink: 0,
      }}
    >
      {step > 0 ? (
        <Button
          onClick={() => setStep(step - 1)}
          startIcon={<ArrowLeft size={icon.size} strokeWidth={icon.strokeWidth} />}
          sx={{ px: 2, minWidth: 128, justifyContent: 'flex-start' }}
        >
          Back
        </Button>
      ) : (
        <Box sx={{ width: 128 }} />
      )}
      <Typography
        sx={{
          mx: 'auto',
          color: color.textMuted,
          fontWeight: 500,
          fontSize: '0.875rem',
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
            size="large"
            disabled={!canContinue}
            onClick={() => setStep(step + 1)}
            endIcon={<ArrowRight size={icon.size} strokeWidth={icon.strokeWidth} />}
            sx={{ minWidth: 128 }}
          >
            Continue
          </Button>
        </span>
      </Tooltip>
      ) : (
        <Box sx={{ width: 128 }} />
      )}
    </Box>
  );
}

// Shared scrollable step container
const stepScrollSx = {
  flex: 1,
  overflowY: 'auto',
  px: { xs: 2, md: 4 },
  py: { xs: 4, md: 6 },
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  bgcolor: color.bg,
} as const;

function StepHeading({ title, sub }: { title: string; sub: string }) {
  return (
    <Box sx={{ textAlign: 'center', mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Typography variant="h4" component="h2" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Typography sx={{ color: color.textMuted, fontWeight: 400, fontSize: '0.9375rem', maxWidth: '62ch' }}>
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
}: {
  docType: DocumentType;
  setDocType: (d: DocumentType) => void;
  customTitle: string;
  setCustomTitle: (s: string) => void;
  defaultTitle: string;
}) {
  return (
    <Box sx={stepScrollSx}>
      <StepHeading
        title="What are you making?"
        sub="Pick a format, you can always change it later."
      />
      <TextField
        label="Document title"
        placeholder={defaultTitle}
        value={customTitle}
        onChange={(e) => setCustomTitle(e.target.value)}
        helperText="Leave blank to use the automatic title"
        sx={{ width: '100%', maxWidth: 560, mb: 4 }}
      />
      <Box
        role="radiogroup"
        aria-label="Format"
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
          gap: 2,
          width: '100%',
          maxWidth: 784,
        }}
      >
        {DOC_MODES.map((m) => {
          const selected = docType === m.value;
          return (
            <Button
              key={m.value}
              role="radio"
              aria-checked={selected}
              onClick={() => setDocType(m.value)}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                textAlign: 'left',
                gap: 1,
                p: 2,
                borderRadius: `${radius.lg}px`,
                border: '1px solid',
                borderColor: selected ? color.accent : color.border,
                backgroundColor: selected ? color.accentSoft : color.surface,
                boxShadow: selected ? `0 0 0 1px ${color.accent}` : 'none',
                transition: ui.transition('border-color, background-color, box-shadow'),
                '&:hover': {
                  borderColor: selected ? color.accent : color.borderStrong,
                  backgroundColor: selected ? color.accentSoft : color.surfaceHover,
                },
              }}
            >
              <m.Icon
                size={icon.size}
                strokeWidth={icon.strokeWidth}
                color={selected ? color.accent : color.textMuted}
                aria-hidden
              />
              <Typography sx={{ fontWeight: 600, fontSize: '0.9375rem', color: color.text }}>
                {m.label}
              </Typography>
              <Typography sx={{ fontSize: '0.8125rem', color: color.textMuted, fontWeight: 400, lineHeight: 1.5 }}>
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
  justifyContent: 'flex-start',
  textAlign: 'left',
  gap: 1,
  p: 2,
  borderRadius: `${radius.md}px`,
  border: '1px solid',
  borderColor: checked ? color.accent : color.border,
  backgroundColor: checked ? color.accentSoft : color.surface,
  boxShadow: checked ? `0 0 0 1px ${color.accent}` : 'none',
  transition: ui.transition('border-color, background-color, box-shadow'),
  '&:hover': {
    borderColor: checked ? color.accent : color.borderStrong,
    backgroundColor: checked ? color.accentSoft : color.surfaceHover,
  },
  '&.Mui-disabled': {
    opacity: 0.45,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
});

// Small neutral tag ("Pro", standard codes). Not the accent: it isn't an action.
const tagSx = {
  display: 'inline-flex',
  alignItems: 'center',
  fontSize: '0.6875rem',
  fontWeight: 600,
  letterSpacing: '0.02em',
  lineHeight: 1.6,
  color: color.textMuted,
  border: `1px solid ${color.borderStrong}`,
  borderRadius: `${radius.sm}px`,
  px: 1,
} as const;

// Course filters and the Available only toggle.
const filterChipSx = (active: boolean) => ({
  fontWeight: active ? 600 : 500,
  border: '1px solid',
  borderColor: active ? color.accent : color.border,
  backgroundColor: active ? color.accentSoft : 'transparent',
  color: active ? color.accent : color.textMuted,
  '&:hover': {
    borderColor: active ? color.accent : color.borderStrong,
    backgroundColor: active ? color.accentSoft : 'rgba(160, 168, 214, 0.06)',
    color: active ? color.accent : color.text,
  },
});

// A choice in a segmented row (standards, difficulty, versions). Selected
// takes the accent; idle is a quiet outline.
const segmentSx = (active: boolean) => ({
  minWidth: 0,
  fontSize: '0.8125rem',
  fontWeight: active ? 600 : 500,
  py: 1,
  borderRadius: `${radius.sm}px`,
  border: '1px solid',
  borderColor: active ? color.accent : color.border,
  backgroundColor: active ? color.accentSoft : 'transparent',
  color: active ? color.accent : color.textMuted,
  transition: ui.transition('border-color, background-color, color'),
  '&:hover': {
    borderColor: active ? color.accent : color.borderStrong,
    backgroundColor: active ? color.accentSoft : 'rgba(160, 168, 214, 0.06)',
    color: active ? color.accent : color.text,
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
    width: 24,
    height: 24,
    p: 0,
    borderRadius: `${radius.sm}px`,
    fontWeight: 500,
    fontSize: '0.9375rem',
    lineHeight: 1,
    color: color.textMuted,
    border: `1px solid ${color.border}`,
    '&:hover': { borderColor: color.borderStrong, color: color.text, backgroundColor: 'rgba(160, 168, 214, 0.06)' },
    '&.Mui-disabled': { color: color.textSubtle, borderColor: color.border, opacity: 0.5 },
  } as const;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
      <Button sx={btnSx} disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={`Fewer problems: ${label}`}>
        −
      </Button>
      <Typography
        sx={{ minWidth: 24, textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: color.text, fontVariantNumeric: 'tabular-nums' }}
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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, minHeight: 24 }}>
        <Typography sx={{ ...ui.label, fontSize: '0.875rem' }}>
          Your picks
          {picks.length > 0 && (
            <Box component="span" sx={{ color: color.textMuted, fontWeight: 500 }}>
              {` · ${picks.length}`}
            </Box>
          )}
        </Typography>
        {picks.length > 0 && (
          <Button
            size="small"
            onClick={clearPicks}
            sx={{ fontSize: '0.75rem', minWidth: 0, px: 1, py: 0, borderRadius: `${radius.sm}px`, '&:hover': { color: color.danger, backgroundColor: 'transparent' } }}
          >
            Clear all
          </Button>
        )}
      </Box>
      {picks.length === 0 ? (
        <>
          <Typography sx={ui.help}>
            Tap lessons, or search and press Enter, to add them here. You can mix lessons from any course.
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
            <Typography sx={ui.label}>Problems per lesson</Typography>
            <CountStepper value={count} min={1} max={25} onChange={setCount} label="each new lesson" />
          </Box>
        </>
      ) : (
        <>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 288, overflowY: 'auto', pr: 1, py: 1 }}>
            {picks.map((e) => (
              <Box key={e.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton
                  size="small"
                  aria-label={`Remove ${e.title}`}
                  onClick={() => removePick(e.id)}
                  sx={{ p: 0.5, '&:hover': { color: color.danger, backgroundColor: 'transparent' } }}
                >
                  <X size={icon.size} strokeWidth={icon.strokeWidth} />
                </IconButton>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{ fontSize: '0.8125rem', fontWeight: 600, color: color.text, lineHeight: 1.4 }}
                    title={e.title}
                  >
                    {e.title}
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 400, color: color.textMuted, lineHeight: 1.4 }}>
                    {e.course} · {e.group}
                    {!isPro && !isFreeTopic(e.id) && (
                      <Box component="span" sx={{ ...tagSx, ml: 1 }}>
                        Pro
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
              mt: 1,
              pt: 2,
              borderTop: `1px solid ${color.border}`,
            }}
          >
            <Typography sx={{ ...ui.label, fontSize: '0.875rem' }}>Total problems</Typography>
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
              sx={{ width: 88, '& .MuiOutlinedInput-root': { borderRadius: `${radius.sm}px` } }}
            />
          </Box>
          <Typography sx={{ ...ui.help, mt: 1 }}>
            {picks.length > 1
              ? 'A new total is shared evenly. Use − and + to give one lesson more or fewer.'
              : 'Use − and + or type a total.'}
          </Typography>
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
}) {
  // The picks tray is the one card in the rail: 24px corners, 16px in, so
  // its nested controls get 8px corners. The settings under it are grouped
  // by space alone.
  const trayCardSx = {
    bgcolor: color.surface,
    border: `1px solid ${color.border}`,
    borderRadius: `${radius.xl}px`,
    boxShadow: shadow.sm,
    p: 2,
    width: '100%',
  } as const;
  const railCardSx = { width: '100%', px: 2 } as const;
  const railTitleSx = { ...ui.label, mb: 1 } as const;
  const switchRowSx = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 } as const;
  return (
    <Box sx={stepScrollSx}>
      <StepHeading
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
            width: { xs: '100%', md: 304 },
            flexShrink: 0,
            position: { md: 'sticky' },
            top: { md: 0 },
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <PicksTray
            cardSx={trayCardSx}
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
          />
          <Box sx={railCardSx}>
            <Typography sx={railTitleSx}>Standards</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
              {FRAMEWORKS.map((f) => {
                const active = framework === f.id;
                return (
                  <Box
                    key={f.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={active}
                    onClick={() => setFramework(f.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setFramework(f.id);
                      }
                    }}
                    sx={{
                      ...segmentSx(active),
                      textAlign: 'center',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    {f.label}
                  </Box>
                );
              })}
            </Box>
            <Typography sx={{ ...ui.help, mt: 1 }}>
              {frameworkMeta(framework).note}
            </Typography>
          </Box>
          <Box sx={railCardSx}>
            <Typography sx={railTitleSx}>Difficulty</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
              {[
                { value: 1, label: 'Easy' },
                { value: 2, label: 'Medium' },
                { value: 3, label: 'Hard' },
              ].map((d) => {
                const selected = difficulty === d.value;
                return (
                  <Button
                    key={d.value}
                    aria-pressed={selected}
                    onClick={() => setDifficulty(d.value as DifficultyLevel)}
                    sx={segmentSx(selected)}
                  >
                    {d.label}
                  </Button>
                );
              })}
            </Box>
          </Box>
          <Box sx={railCardSx}>
            <Box sx={switchRowSx}>
              <Typography sx={ui.label}>Word problems</Typography>
              <Switch
                checked={wordProblems}
                onChange={(e) => setWordProblems(e.target.checked)}
                inputProps={{ 'aria-label': 'Include word problems' }}
              />
            </Box>
            <Typography sx={ui.help}>
              {wordProblems
                ? wordCapableSelected.length > 0
                  ? `Story versions on for: ${wordCapableSelected.join(' · ')}`
                  : 'On, but none of the selected lessons offer story versions yet. Pre-Algebra angle lessons do, and more are coming.'
                : 'The same problems in story form, where a lesson offers them.'}
            </Typography>
          </Box>
          <Box sx={railCardSx}>
            <Box sx={switchRowSx}>
              <Typography sx={ui.label}>Diagrams</Typography>
              <Switch
                checked={includeDiagrams}
                onChange={(e) => setIncludeDiagrams(e.target.checked)}
                inputProps={{ 'aria-label': 'Include diagrams' }}
              />
            </Box>
            <Typography sx={ui.help}>
              {includeDiagrams ? 'Problems show their drawings.' : 'Words only: every drawing is left off the worksheet.'}
            </Typography>
          </Box>
          {showTopicOrder && (
            <Box sx={railCardSx}>
              <Box sx={switchRowSx}>
                <Typography sx={ui.label}>Keep topics grouped</Typography>
                <Switch
                  checked={keepTopicsGrouped}
                  onChange={(e) => setKeepTopicsGrouped(e.target.checked)}
                  inputProps={{ 'aria-label': 'Keep topics grouped' }}
                />
              </Box>
              <Typography sx={ui.help}>
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
              ? 'Search a skill or standard, like midsegment or G.5(D)'
              : `Search ${subjectFilter}: a skill or standard`
          }
          aria-label="Search topics"
          sx={{ width: '100%', maxWidth: 560, mb: 2 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start" sx={{ color: color.textMuted }}>
                  <Search size={icon.size} strokeWidth={icon.strokeWidth} aria-hidden />
                </InputAdornment>
              ),
              endAdornment: topicSearch ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    aria-label="Clear search"
                    onClick={() => handleSearchChange('')}
                  >
                    <X size={icon.size} strokeWidth={icon.strokeWidth} />
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
            mb: 4,
            maxWidth: 920,
          }}
        >
          <Chip
            clickable
            label="Available only"
            aria-pressed={availableOnly}
            onClick={() => setAvailableOnly((v) => !v)}
            sx={filterChipSx(availableOnly)}
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
                sx={filterChipSx(active)}
              />
            );
          })}
          {(topicSearch.trim() !== '' || availableOnly) && (
            <Button size="small" onClick={clearTopicFilters} sx={{ px: 1 }}>
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
                sx={{ fontSize: '0.75rem', px: 1 }}
              >
                {otherCourseMatches} more in other courses · Search all courses
              </Button>
            ) : (
              <span />
            )}
            <Button
              size="small"
              onClick={allEffectiveExpanded ? collapseAllFiltered : expandAllFiltered}
              sx={{ fontSize: '0.75rem', px: 1 }}
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
                sx={{ borderBottom: `1px solid ${color.border}` }}
              >
                <Button
                  fullWidth
                  onClick={() => toggleGroup(groupKey)}
                  aria-expanded={open}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    px: 1,
                    py: 2,
                    borderRadius: 0,
                    color: color.text,
                    '&:hover': { backgroundColor: 'transparent', color: color.text },
                    '&:hover .group-chevron': { color: color.text },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                    <Box
                      component={ChevronDown}
                      className="group-chevron"
                      size={icon.size}
                      strokeWidth={icon.strokeWidth}
                      aria-hidden
                      sx={{
                        flexShrink: 0,
                        color: color.textMuted,
                        transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
                        transition: ui.transition('transform, color'),
                      }}
                    />
                    <Typography sx={{ fontWeight: 600, fontSize: '0.9375rem', color: 'inherit', textAlign: 'left' }}>
                      {groupTitle}
                      {showCourse && (
                        <Box
                          component="span"
                          sx={{ ml: 1, fontWeight: 400, fontSize: '0.8125rem', color: color.textMuted }}
                        >
                          {groupCourse}
                        </Box>
                      )}
                    </Typography>
                  </Box>
                  {selectedCount > 0 && (
                    <Typography component="span" sx={{ fontSize: '0.8125rem', fontWeight: 600, color: color.accent, flexShrink: 0 }}>
                      {selectedCount} selected
                    </Typography>
                  )}
                </Button>
                <Collapse
                  in={open}
                  timeout={{ enter: motion.enter, exit: motion.exit }}
                  easing={{ enter: motion.easeOut, exit: motion.easeIn }}
                  unmountOnExit
                >
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                      gap: 2,
                      pt: 0,
                      pb: 3,
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
                            aria-hidden
                            sx={{
                              position: 'absolute',
                              top: 16,
                              right: 16,
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: checked ? color.accent : 'transparent',
                              border: '1px solid',
                              borderColor: checked ? color.accent : color.borderStrong,
                              color: color.accentContrast,
                              transition: ui.transition('background-color, border-color'),
                            }}
                          >
                            {checked && <Check size={icon.size} strokeWidth={icon.strokeWidth} />}
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', pr: 4 }}>
                            <Typography component="span" sx={{ fontSize: '0.75rem', fontWeight: 500, color: color.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                              {entry.underConstruction ? 'Coming soon' : standardsFor(entry.id, entry.teks, framework)}
                            </Typography>
                            {!isPro && !isFreeTopic(entry.id) && !entry.underConstruction && (
                              <Box component="span" sx={tagSx}>
                                Pro
                              </Box>
                            )}
                          </Box>
                          <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: color.text, lineHeight: 1.4 }}>
                            {entry.title}
                          </Typography>
                          {checked && (
                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: color.accent }}>
                              ×{countFor(entry.id)} problems
                            </Typography>
                          )}
                          {!entry.underConstruction && entry.story && (
                            <Typography sx={{ ...ui.help, fontSize: '0.75rem' }}>
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
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography sx={{ color: color.textMuted, fontWeight: 500, mb: 2 }}>
                {subjectFilter === 'All'
                  ? 'No topics match your search.'
                  : `Nothing in ${subjectFilter} matches.`}
              </Typography>
              {otherCourseMatches > 0 && (
                <Button variant="outlined" onClick={searchAllCourses} sx={{ mr: 1 }}>
                  Search all courses ({otherCourseMatches})
                </Button>
              )}
              <Button onClick={clearTopicFilters}>
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
        title="Who needs a different version?"
        sub="Set up anonymous groups once, every version shares the same math. Skip this step if everyone gets the same worksheet."
      />
      <Box
        sx={{
          width: '100%',
          maxWidth: 680,
          bgcolor: color.surface,
          border: `1px solid ${color.border}`,
          borderRadius: `${radius.xl}px`,
          boxShadow: shadow.sm,
          p: 2,
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
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', mt: 3, maxWidth: 680 }}>
          {versionPlan.all().map((v) => (
            <Chip
              key={v.versionId}
              label={v.kind === 'base' ? `Base · ${v.problems.length}` : `${v.label} · ${v.problems.length}`}
              variant="outlined"
              sx={{ fontWeight: 500, color: color.textMuted, borderColor: color.border }}
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
        <Typography key={i} sx={{ fontSize: '0.8125rem', fontWeight: 400, lineHeight: 1.6 }}>
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
          columnGap: 2,
          rowGap: 1,
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 2, md: 4 },
          pt: 3,
          pb: 2,
          flexShrink: 0,
        }}
      >
        {/* Secondary actions stay quiet; Export PDF is the one filled button. */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
          <Button
            size="small"
            startIcon={<Save size={icon.size} strokeWidth={icon.strokeWidth} />}
            onClick={saveDraft}
            sx={{ px: 1 }}
          >
            Save draft
          </Button>
          <Button
            size="small"
            startIcon={<Upload size={icon.size} strokeWidth={icon.strokeWidth} />}
            onClick={() => fileRef.current?.click()}
            sx={{ px: 1 }}
          >
            Load draft
          </Button>
          <Tooltip title={isPro ? 'Keep it in your library and rebuild it exactly, any time' : 'Saved worksheets are part of Pro'} arrow>
            <span>
              <Button
                size="small"
                startIcon={<BookmarkPlus size={icon.size} strokeWidth={icon.strokeWidth} />}
                onClick={onSaveToLibrary}
                disabled={selectedModules.length === 0}
                sx={{ px: 1 }}
              >
                Save to library{isPro ? '' : ' (Pro)'}
              </Button>
            </span>
          </Tooltip>
        </Box>
        <Box aria-hidden sx={{ width: '1px', height: 24, bgcolor: color.border, display: { xs: 'none', sm: 'block' } }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography component="label" htmlFor="seed-input" sx={{ fontSize: '0.8125rem', fontWeight: 500, color: color.textMuted }}>
            Seed
          </Typography>
          <TextField
            id="seed-input"
            type="number"
            size="small"
            value={seed}
            onChange={(e) => setSeed(Math.floor(Number(e.target.value)) || 0)}
            sx={{ width: 96, '& .MuiOutlinedInput-root': { borderRadius: `${radius.sm}px` }, '& input': { py: 0.75, fontVariantNumeric: 'tabular-nums' } }}
          />
          <Tooltip title="Fresh problem set" arrow>
            <IconButton size="small" aria-label="Fresh problem set" onClick={randomizeSeed}>
              <Dices size={icon.size} strokeWidth={icon.strokeWidth} />
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
            />
          }
          label={<Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: color.text }}>Answer key{isPro ? '' : ' (Pro)'}</Typography>}
          sx={{ ml: 0, mr: 1 }}
        />
        {mounted && selectedModules.length > 0 && gateReason ? (
          <Button
            variant="contained"
            size="large"
            startIcon={<FileDown size={icon.size} strokeWidth={icon.strokeWidth} />}
            onClick={onGatedExport}
          >
            Export PDF
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
                size="large"
                startIcon={<FileDown size={icon.size} strokeWidth={icon.strokeWidth} />}
                disabled={loading}
              >
                {loading ? 'Preparing PDF…' : 'Export PDF'}
              </Button>
            )}
          </PDFDownloadLink>
          </Box>
        ) : null}
      </Box>

      {/* Export scope guard: packet contents, with a warning on course mixes */}
      {selectedModules.length > 0 &&
        (mixesCourses ? (
          <Alert severity="warning" sx={{ mx: 'auto', mb: 2, maxWidth: '8.5in', width: 'calc(100% - 32px)' }}>
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
              This packet mixes {mixSummary}.
            </Typography>
            {scopeList}
          </Alert>
        ) : (
          <Box
            sx={{
              mx: 'auto',
              mb: 2,
              maxWidth: '8.5in',
              width: 'calc(100% - 32px)',
              bgcolor: color.surface,
              border: `1px solid ${color.border}`,
              borderRadius: `${radius.md}px`,
              px: 2,
              py: 1,
              color: color.text,
            }}
          >
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: color.textMuted }}>
              In this packet
            </Typography>
            {scopeList}
          </Box>
        ))}

      {gateReason && (
        <Alert
          severity="warning"
          action={
            <Button color="inherit" size="small" href="/pricing">
              See Pro
            </Button>
          }
          sx={{ mx: 'auto', mb: 2, maxWidth: '8.5in', width: 'calc(100% - 32px)' }}
        >
          {gateReason === 'accommodations'
            ? 'Accommodated versions (IEP groups) export with Pro, the accommodations are the Pro feature.'
            : 'You have used your free exports for this month. Pro is unlimited.'}
        </Alert>
      )}
      {usageNote && !gateReason && (
        <Typography sx={{ textAlign: 'center', fontSize: '0.75rem', color: color.textMuted, fontWeight: 400, mb: 1 }}>
          {usageNote} · Free exports carry a small footer note and no answer key.
        </Typography>
      )}

      {/* Save and load results slide in from the screen edge and stack. */}
      <ToastStack
        toasts={[
          ...(libraryMsg
            ? [
                {
                  key: `library-${libraryMsg.text}`,
                  severity: libraryMsg.severity,
                  text: libraryMsg.text,
                  onClose: clearLibraryMsg,
                  action:
                    libraryMsg.severity === 'success' ? (
                      <Button color="inherit" size="small" href="/saved">
                        Saved worksheets
                      </Button>
                    ) : undefined,
                } satisfies Toast,
              ]
            : []),
          ...(draftError
            ? [{ key: `draft-error-${draftError}`, severity: 'error', text: draftError, role: 'alert' } satisfies Toast]
            : []),
          ...(draftNotice
            ? [
                {
                  key: `draft-${draftNotice}`,
                  severity: 'success',
                  text: draftNotice,
                  onClose: clearDraftNotice,
                  role: 'status',
                } satisfies Toast,
              ]
            : []),
        ]}
      />

      {/* Version tabs */}
      {hasAccommodations && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', px: 2, pb: 2, flexShrink: 0 }} data-testid="version-tab-strip">
          {versionPlan.all().map((v) => {
            const selected = v.versionId === activeVersionId;
            return (
              <Button
                key={v.versionId}
                onClick={() => setActiveVersionId(v.versionId)}
                data-testid={`version-tab-${v.versionId}`}
                aria-pressed={selected}
                sx={{ ...segmentSx(selected), borderRadius: `${radius.pill}px`, px: 2 }}
              >
                {v.label}
                {v.kind === 'group' && v.studentCount ? ` (${v.studentCount})` : ''}
              </Button>
            );
          })}
          <Typography sx={{ fontSize: '0.75rem', color: color.textMuted, fontWeight: 400, ml: 1 }}>
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
          bgcolor: color.bg,
        }}
      >
        {selectedModules.length === 0 ? (
          <Alert severity="info" sx={{ maxWidth: '8.5in', width: '100%', mt: 2, alignSelf: 'flex-start' }}>
            Head back to Topics and pick at least one.
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
