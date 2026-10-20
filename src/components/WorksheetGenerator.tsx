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
} from '@mui/material';
import {
  Save,
  UploadFile,
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
import type { CurriculumEntry, DifficultyLevel } from '../modules/CurriculumRegistry';
import { DocumentType, problemToQuestion } from '../core/types';
import {
  ANON_ACCOUNT,
  FREE_GENERATION_LIMIT,
  bumpLocalUsage,
  isFreeTopic,
  readLocalUsage,
  type AccountState,
} from '../lib/plan';
import {
  createPortalUrl,
  fetchAccount,
  logExportEvent,
  recordGeneration,
  requestSignInLink,
  signOut as apiSignOut,
} from '../lib/account';
import type { OutputMode, MathProblem } from '@/lib/ProblemFactory';

const drawerWidth = 320;

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
  difficulty: DifficultyLevel;
  includeAnswerKey: boolean;
  wordProblems?: boolean;
  includeDiagrams?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WorksheetGenerator() {
  const [docType, setDocType] = useState<DocumentType>('guided-notes');
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);

  const [customTitle, setCustomTitle] = useState('');
  const [seed, setSeed] = useState(42);
  const [count, setCount] = useState(3);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(2);
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true);
  const [wordProblems, setWordProblems] = useState(false);
  const [includeDiagrams, setIncludeDiagrams] = useState(true);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // ── Account / pay gate (soft gate, see lib/plan.ts) ──
  const [account, setAccount] = useState<AccountState>(ANON_ACCOUNT);
  const [gateMsg, setGateMsg] = useState<string | null>(null);
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

  // ── Topic groups (registry order) ──
  const topicGroups = useMemo(() => {
    const map = new Map<string, CurriculumEntry[]>();
    for (const entry of CURRICULUM_REGISTRY) {
      const arr = map.get(entry.topicTitle);
      if (arr) arr.push(entry);
      else map.set(entry.topicTitle, [entry]);
    }
    return [...map.entries()];
  }, []);

  const selectedModules = useMemo(
    () =>
      selectedTopicIds
        .map((id) => CURRICULUM_REGISTRY.find((t) => t.id === id))
        .filter((m): m is CurriculumEntry => !!m),
    [selectedTopicIds]
  );

  const toggleTopic = (id: string) => {
    if (!selectedTopicIds.includes(id) && !isPro && !isFreeTopic(id)) {
      setGateMsg(
        'That topic is part of Pro. Free covers Algebra I and middle-school topics, Pro unlocks everything, plus accommodations and answer keys.'
      );
      return;
    }
    setSelectedTopicIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
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
  // Subject is derived from the registry's topic-number bands (the registry
  // carries no explicit subject field).
  const subjectOfTopic = (topicNum: number): string => {
    if (topicNum >= 1 && topicNum <= 15) return 'Geometry';
    if (topicNum === 16) return 'Precalculus';
    if (topicNum === 21) return 'AP Calculus';
    if (topicNum >= 30 && topicNum <= 32) return 'Middle School';
    if (topicNum >= 101 && topicNum <= 109) return 'Algebra I';
    if (topicNum >= 202 && topicNum <= 214) return 'Algebra II';
    if (topicNum === 401) return 'SAT Math';
    return 'Other';
  };

  const subjectOptions = useMemo(() => {
    const seen: string[] = [];
    for (const e of CURRICULUM_REGISTRY) {
      const s = subjectOfTopic(e.topic);
      if (!seen.includes(s)) seen.push(s);
    }
    return ['All', ...seen];
  }, []);

  const [topicSearch, setTopicSearch] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState('All');
  // Stash of the pre-search collapse state, restored when search is cleared.
  const savedExpandedRef = useRef<Set<string> | null>(null);

  const isFiltering =
    topicSearch.trim() !== '' || availableOnly || subjectFilter !== 'All';

  const visibleGroups = useMemo(() => {
    if (!isFiltering) return topicGroups;
    const q = topicSearch.trim().toLowerCase();
    return topicGroups
      .map(([groupTitle, entries]): [string, CurriculumEntry[]] => {
        const groupHit = q !== '' && groupTitle.toLowerCase().includes(q);
        const kept = entries.filter((e) => {
          if (availableOnly && e.underConstruction) return false;
          if (subjectFilter !== 'All' && subjectOfTopic(e.topic) !== subjectFilter)
            return false;
          if (q === '') return true;
          if (groupHit) return true;
          return (
            e.title.toLowerCase().includes(q) ||
            e.teks.toLowerCase().includes(q)
          );
        });
        return [groupTitle, kept];
      })
      .filter(([, entries]) => entries.length > 0);
  }, [topicGroups, isFiltering, topicSearch, availableOnly, subjectFilter]);

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

  const clearTopicFilters = () => {
    handleSearchChange('');
    setAvailableOnly(false);
    setSubjectFilter('All');
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

  // ── Generation ──
  // Per-module problem sets (seed offset per topic so different topics don't
  // draw identical sequences). Kept per-module so Classical Notes mode can
  // chunk them back into per-entry groups for its section renderer.
  const moduleProblemSets = useMemo<MathProblem[][]>(() => {
    return selectedModules.map((mod, i) =>
      mod.generate(toOutputMode(docType), seed + i * 7919, { count, difficulty, wordProblems })
    );
  }, [selectedModules, docType, seed, count, difficulty, wordProblems]);

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

  const advancedProblems = useMemo<MathProblem[]>((
  ) => displayProblemSets.flat(), [displayProblemSets]);

  // Classical Notes groups: one definitions block + narration per entry.
  const classicalGroups = useMemo<ClassicalGroup[] | undefined>(() => {
    if (docType !== 'classical-notes') return undefined;
    let start = 0;
    return selectedModules.map((mod, i) => {
      const problems = displayProblemSets[i] ?? [];
      const group: ClassicalGroup = {
        entryId: mod.id,
        title: mod.title,
        teks: mod.teks.split(' · ')[0],
        problems,
        startIndex: start,
      };
      start += problems.length;
      return group;
    });
  }, [docType, selectedModules, displayProblemSets]);

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
    const teks = [...new Set(selectedModules.map((m) => m.teks))];
    return teks.length > 0 ? teks.join(' · ') : 'Texas TEKS Geometry';
  }, [selectedModules]);

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
            />
          );
          return nodes;
        })}
      </PdfRendererDocument>
    );
  }, [hasAccommodations, versionPlan, versionQuestions, title, docType, standards, includeAnswerKey, classicalGroups, seed]);

  // ── Draft save / load ──
  const saveDraft = () => {
    const draft: DraftFile = {
      app: 'euclid-engine-worksheet',
      version: 1,
      savedAt: new Date().toISOString(),
      docType,
      title: customTitle,
      topicIds: selectedTopicIds,
      seed,
      count,
      difficulty,
      includeAnswerKey,
      wordProblems,
      includeDiagrams,
    };
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `euclid-draft-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const loadDraftFile = (file: File) => {
    setDraftError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(String(reader.result)) as Partial<DraftFile>;
        if (d.app !== 'euclid-engine-worksheet') {
          throw new Error('That file is not a Euclid Engine draft.');
        }
        if (d.docType === 'worksheet' || d.docType === 'guided-notes' || d.docType === 'review' || d.docType === 'test' || d.docType === 'classical-notes' || d.docType === 'proof-two-column' || d.docType === 'proof-fill-reasons' || d.docType === 'proof-elements' || d.docType === 'sat-practice') {
          setDocType(d.docType);
        }
        if (typeof d.title === 'string') setCustomTitle(d.title);
        if (Array.isArray(d.topicIds)) {
          const valid = d.topicIds.filter(
            (id): id is string =>
              typeof id === 'string' &&
              CURRICULUM_REGISTRY.some((t) => t.id === id && !t.underConstruction)
          );
          setSelectedTopicIds(valid);
          // Expand the groups holding the loaded topics so the draft is visible
          const groups = new Set<string>();
          for (const id of valid) {
            const entry = CURRICULUM_REGISTRY.find((t) => t.id === id);
            if (entry) groups.add(entry.topicTitle);
          }
          setExpandedGroups(groups);
        }
        if (typeof d.seed === 'number' && Number.isFinite(d.seed)) setSeed(Math.floor(d.seed));
        if (typeof d.count === 'number' && Number.isFinite(d.count)) {
          setCount(Math.min(25, Math.max(1, Math.floor(d.count))));
        }
        if (d.difficulty === 1 || d.difficulty === 2 || d.difficulty === 3) {
          setDifficulty(d.difficulty);
        }
        if (typeof d.includeAnswerKey === 'boolean') setIncludeAnswerKey(d.includeAnswerKey);
        if (typeof d.wordProblems === 'boolean') setWordProblems(d.wordProblems);
        if (typeof d.includeDiagrams === 'boolean') setIncludeDiagrams(d.includeDiagrams);
      } catch (e) {
        setDraftError(e instanceof Error ? e.message : 'Could not read that draft file.');
      }
    };
    reader.onerror = () => setDraftError('Could not read that draft file.');
    reader.readAsText(file);
  };

  const randomizeSeed = () => setSeed(Math.floor(Math.random() * 100000));

  const errorBoundaryKey = `${docType}-${seed}-${count}-${difficulty}-${wordProblems}-${includeDiagrams}-${selectedTopicIds.join(',')}`;

  // Titles of the selected lessons that offer story (word problem) variants.
  const wordCapableSelected = useMemo(
    () => selectedModules.filter((m) => m.wordProblems).map((m) => m.title.replace(/^\d+-\d+:\s*/, '')),
    [selectedModules]
  );

  // ── Wizard footer summary + TEKS coverage ──
  const teksSelected = useMemo(
    () =>
      new Set(
        selectedModules.flatMap((m) => m.teks.split(' · ').map((t) => t.trim()))
      ).size,
    [selectedModules]
  );
  const teksTotal = useMemo(
    () =>
      new Set(
        CURRICULUM_REGISTRY.filter((e) => !e.underConstruction).flatMap((e) =>
          e.teks.split(' · ').map((t) => t.trim())
        )
      ).size,
    []
  );
  const footerSummary = useMemo(() => {
    if (step === 0) {
      const m = DOC_MODES.find((d) => d.value === docType);
      return `Format: ${m ? m.label : docType} ${m ? m.emoji : ''}`;
    }
    if (step === 1) {
      return `${selectedTopicIds.length} topic${selectedTopicIds.length === 1 ? '' : 's'} · ${advancedProblems.length} problems · TEKS ${teksSelected}/${teksTotal}`;
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
        accountControl={<AccountControl account={account} onAccountChange={setAccount} />}
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
          />
        )}
        {step === 1 && (
          <StepTopics
            topicSearch={topicSearch}
            handleSearchChange={handleSearchChange}
            clearTopicFilters={clearTopicFilters}
            isFiltering={isFiltering}
            availableOnly={availableOnly}
            setAvailableOnly={setAvailableOnly}
            subjectFilter={subjectFilter}
            setSubjectFilter={setSubjectFilter}
            subjectOptions={subjectOptions}
            effectiveGroups={effectiveGroups}
            expandedGroups={expandedGroups}
            toggleGroup={toggleGroup}
            allEffectiveExpanded={allEffectiveExpanded}
            expandAllFiltered={expandAllFiltered}
            collapseAllFiltered={collapseAllFiltered}
            selectedTopicIds={selectedTopicIds}
            toggleTopic={toggleTopic}
            isPro={isPro}
            count={count}
            setCount={setCount}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            wordProblems={wordProblems}
            setWordProblems={setWordProblems}
            wordCapableSelected={wordCapableSelected}
            includeDiagrams={includeDiagrams}
            setIncludeDiagrams={setIncludeDiagrams}
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
            fileRef={fileRef}
            mounted={mounted}
            draftError={draftError}
            proofDocMode={proofDocMode}
            selectedModules={selectedModules}
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

// Compact account control for the topbar: sign-in via emailed magic link,
// plan chip, sign-out, and (for Pro) the Stripe billing portal. All API
// calls fail soft, if accounts are not live yet, the button says so.
function AccountControl({
  account,
  onAccountChange,
}: {
  account: AccountState;
  onAccountChange: (a: AccountState) => void;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 1 }}>
      <Button size="small" href="/pricing" sx={{ color: '#9aa0be', fontWeight: 800, whiteSpace: 'nowrap' }}>
        Pricing
      </Button>
      <Button
        size="small"
        variant="outlined"
        onClick={() => setOpen((o) => !o)}
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
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: '#f2f3fa' }}>
              Check your email, your sign-in link is on its way. It expires in 15 minutes.
            </Typography>
          ) : (
            <>
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
                onClick={async () => {
                  setBusy(true);
                  setError(null);
                  const ok = await requestSignInLink(email.trim());
                  setBusy(false);
                  if (ok) setSent(true);
                  else setError('Sign-in is not available yet, accounts are launching soon.');
                }}
                sx={{ borderRadius: '10px', fontWeight: 800 }}
              >
                {busy ? 'Sending…' : 'Email me a sign-in link'}
              </Button>
              <Typography sx={{ fontSize: '0.7rem', color: '#9aa0be', mt: 1, fontWeight: 600 }}>
                Teacher accounts only. We never collect student data.
              </Typography>
            </>
          )}
        </Box>
      )}
    </Box>
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
        emoji="🎨"
        title="What are you making?"
        sub="Pick a format, you can always change it later."
      />
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

function StepTopics({
  topicSearch,
  handleSearchChange,
  clearTopicFilters,
  isFiltering,
  availableOnly,
  setAvailableOnly,
  subjectFilter,
  setSubjectFilter,
  subjectOptions,
  effectiveGroups,
  expandedGroups,
  toggleGroup,
  allEffectiveExpanded,
  expandAllFiltered,
  collapseAllFiltered,
  selectedTopicIds,
  toggleTopic,
  isPro,
  count,
  setCount,
  difficulty,
  setDifficulty,
  wordProblems,
  setWordProblems,
  wordCapableSelected,
  includeDiagrams,
  setIncludeDiagrams,
}: {
  topicSearch: string;
  handleSearchChange: (v: string) => void;
  clearTopicFilters: () => void;
  isFiltering: boolean;
  availableOnly: boolean;
  setAvailableOnly: (v: boolean | ((p: boolean) => boolean)) => void;
  subjectFilter: string;
  setSubjectFilter: (s: string) => void;
  subjectOptions: string[];
  effectiveGroups: [string, CurriculumEntry[]][];
  expandedGroups: Set<string>;
  toggleGroup: (t: string) => void;
  allEffectiveExpanded: boolean;
  expandAllFiltered: () => void;
  collapseAllFiltered: () => void;
  selectedTopicIds: string[];
  toggleTopic: (id: string) => void;
  isPro: boolean;
  count: number;
  setCount: (n: number) => void;
  difficulty: DifficultyLevel;
  setDifficulty: (d: DifficultyLevel) => void;
  wordProblems: boolean;
  setWordProblems: (b: boolean) => void;
  wordCapableSelected: string[];
  includeDiagrams: boolean;
  setIncludeDiagrams: (b: boolean) => void;
}) {
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
        sub="Tap to add, mix and match across subjects. We'll keep your TEKS covered."
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
          <Box sx={railCardSx}>
            <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', mb: 1 }}>Problems per topic 🔢</Typography>
            <TextField
              type="number"
              value={count}
              inputProps={{ min: 1, max: 25 }}
              onChange={(e) => {
                const v = Math.floor(Number(e.target.value));
                if (Number.isFinite(v)) setCount(Math.min(25, Math.max(1, v)));
              }}
              sx={{ width: 120 }}
            />
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
          placeholder="🔍 Search topics or TEKS…"
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
                onClick={() => setSubjectFilter(s)}
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
          {isFiltering && (
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
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
            <Button
              size="small"
              onClick={allEffectiveExpanded ? collapseAllFiltered : expandAllFiltered}
              sx={{ color: '#9aa0be', fontWeight: 800, fontSize: '0.75rem', '&:hover': { color: '#818cf8' } }}
            >
              {allEffectiveExpanded ? 'Collapse all' : 'Expand all'}
            </Button>
          </Box>
          {effectiveGroups.map(([groupTitle, entries]) => {
            const open = expandedGroups.has(groupTitle);
            const selectedCount = entries.filter((e) => selectedTopicIds.includes(e.id)).length;
            return (
              <Box
                key={groupTitle}
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
                  onClick={() => toggleGroup(groupTitle)}
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
                            {entry.underConstruction ? 'COMING SOON' : entry.teks}
                          </Typography>
                          <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: '#f2f3fa', lineHeight: 1.35 }}>
                            {entry.title}
                          </Typography>
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
                No topics match your search. 🔍
              </Typography>
              <Button onClick={clearTopicFilters} sx={{ color: '#818cf8', fontWeight: 800 }}>
                Clear search & filters
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
  fileRef,
  mounted,
  draftError,
  proofDocMode,
  selectedModules,
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
  fileRef: React.RefObject<HTMLInputElement | null>;
  mounted: boolean;
  draftError: string | null;
  proofDocMode: 'proof-two-column' | 'proof-fill-reasons' | 'proof-elements' | 'proof-blank' | undefined;
  selectedModules: CurriculumEntry[];
  errorBoundaryKey: string;
  isPro: boolean;
  gateReason: 'accommodations' | 'limit' | null;
  onExportCount: () => void;
  usageNote: string | null;
}) {
  void fileRef;
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
            href="/pricing"
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

      {draftError && (
        <Alert severity="error" sx={{ mx: 'auto', mb: 1.5, maxWidth: '8.5in', width: 'calc(100% - 32px)' }}>
          {draftError}
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
            />
            </ScaledPreview>
          </PreviewErrorBoundary>
        )}
      </Box>
    </Box>
  );
}
