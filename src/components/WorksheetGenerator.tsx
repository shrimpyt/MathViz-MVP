"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Drawer,
  Typography,
  Button,
  TextField,
  AppBar,
  Toolbar,
  Tooltip,
  Checkbox,
  FormControlLabel,
  Switch,
  Divider,
  IconButton,
  Alert,
  Collapse,
  Chip,
  InputAdornment,
  MenuItem,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Save,
  UploadFile,
  PictureAsPdf,
  MenuBook,
  Assignment,
  RateReview,
  Quiz,
  Casino,
  AutoStories,
  ViewColumn,
  EditNote,
  HistoryEdu,
  Timer,
  ExpandMore,
  Search as SearchIcon,
  Clear as ClearIcon,
  Menu as MenuIcon,
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
  if (docType === 'proof-elements') return "Elements";
  if (docType === 'sat-practice') return 'SAT Practice';
  return 'Practice';
}

// ── Document mode definitions (sidebar segmented control) ────────────────────

const DOC_MODES: {
  value: DocumentType;
  label: string;
  icon: React.ElementType;
  tip: string;
}[] = [
  { value: 'guided-notes', label: 'Guided', icon: MenuBook, tip: 'Fill-in-the-blank scaffolding' },
  { value: 'review', label: 'Review', icon: RateReview, tip: 'High-density practice with answers shown' },
  { value: 'test', label: 'Test', icon: Quiz, tip: 'Formal assessment, no hints' },
  { value: 'worksheet', label: 'Sheet', icon: Assignment, tip: 'Standard worksheet' },
  { value: 'classical-notes', label: 'Classical', icon: AutoStories, tip: 'Structure given, reasoning yours — definitions printed in full, reasons blanked' },
  { value: 'proof-two-column', label: 'Proofs', icon: ViewColumn, tip: 'Full two-column proofs' },
  { value: 'proof-fill-reasons', label: 'Fill Reasons', icon: EditNote, tip: 'Statements given, reasons blanked for the student' },
  { value: 'proof-elements', label: 'Elements', icon: HistoryEdu, tip: "Euclid's Elements exposition — enunciation to Q.E.D." },
  { value: 'sat-practice', label: 'SAT', icon: Timer, tip: 'Timed SAT-style practice module' },
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

// Shared dark input styling for the Parameters section
const paramFieldSx = {
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'rgba(2,6,23,0.55)',
    borderRadius: 2,
    fontSize: '0.85rem',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.10)' },
    '&:hover fieldset': { borderColor: 'rgba(217,167,32,0.40)' },
    '&.Mui-focused fieldset': { borderColor: '#d9a720', borderWidth: 1 },
  },
  '& .MuiInputBase-input': { color: '#fbfbfb', py: 1 },
  '& .MuiInputBase-input::-webkit-outer-spin-button, & .MuiInputBase-input::-webkit-inner-spin-button': {
    opacity: 0.4,
  },
} as const;

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
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function WorksheetGenerator() {
  const [docType, setDocType] = useState<DocumentType>('guided-notes');
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>(['trig-1-ratios']);

  const [customTitle, setCustomTitle] = useState('');
  const [seed, setSeed] = useState(42);
  const [count, setCount] = useState(3);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(2);
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
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
      // localStorage unavailable — the feature simply stays hidden.
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
    setSelectedTopicIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  // ── Topic group accordion state ──
  // Collapsed by default; the group holding the default-selected topic starts open.
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const entry = CURRICULUM_REGISTRY.find((e) => e.id === 'trig-1-ratios');
    return new Set(entry ? [entry.topicTitle] : []);
  });

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

  // ── Mobile: drawer becomes a temporary slide-over with hamburger toggle ──
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  // ── Generation ──
  // Per-module problem sets (seed offset per topic so different topics don't
  // draw identical sequences). Kept per-module so Classical Notes mode can
  // chunk them back into per-entry groups for its section renderer.
  const moduleProblemSets = useMemo<MathProblem[][]>(() => {
    return selectedModules.map((mod, i) =>
      mod.generate(toOutputMode(docType), seed + i * 7919, { count, difficulty })
    );
  }, [selectedModules, docType, seed, count, difficulty]);

  const advancedProblems = useMemo<MathProblem[]>((
  ) => moduleProblemSets.flat(), [moduleProblemSets]);

  // Classical Notes groups: one definitions block + narration per entry.
  const classicalGroups = useMemo<ClassicalGroup[] | undefined>(() => {
    if (docType !== 'classical-notes') return undefined;
    let start = 0;
    return selectedModules.map((mod, i) => {
      const problems = moduleProblemSets[i] ?? [];
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
  }, [docType, selectedModules, moduleProblemSets]);

  // Proof document flavor, threaded to EuclidEngine → ProofProblemCard.
  const proofDocMode = useMemo(
    () =>
      docType === 'proof-two-column' ||
      docType === 'proof-fill-reasons' ||
      docType === 'proof-elements'
        ? docType
        : undefined,
    [docType]
  );

  // Questions for the PDF (paired with problems inside PdfDocument)
  const questions = useMemo(() => {
    return advancedProblems.map((p, i) => problemToQuestion(p, i));
  }, [advancedProblems]);

  // ── Version plan (IEP accommodations) ──
  // One base version plus one version per accommodation group, all derived
  // from the same generated problem set. Empty list → base version only and
  // the feature stays invisible.
  const versionPlan = useMemo(
    () => planVersions(advancedProblems, accomList),
    [advancedProblems, accomList]
  );
  const hasAccommodations = versionPlan.groups.length > 0;
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
      v.problems.map((p, i) => problemToQuestion(p, i)),
    ])),
    [versionPlan]
  );

  // ── Title & standards ──
  const defaultTitle = useMemo(() => {
    if (selectedModules.length === 0) return 'Geometry Practice';
    const word = modeWord(docType);
    if (selectedModules.length === 1) return `${selectedModules[0].title} — ${word}`;
    return `${selectedModules[0].title} + ${selectedModules.length - 1} more — ${word}`;
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
              title={v.kind === 'base' ? title : `${title} — ${v.label}`}
              questions={versionQuestions.get(v.versionId) ?? []}
              advancedProblems={v.problems}
              docType={docType}
              standard={standards}
              includeAnswerKey={includeAnswerKey}
              logoSrc="/logo_light.png"
              classicalGroups={classicalGroups}
              seed={seed}
              presentation={v.presentation}
              keyHeading={v.answerKeyLabel}
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
      } catch (e) {
        setDraftError(e instanceof Error ? e.message : 'Could not read that draft file.');
      }
    };
    reader.onerror = () => setDraftError('Could not read that draft file.');
    reader.readAsText(file);
  };

  const randomizeSeed = () => setSeed(Math.floor(Math.random() * 100000));

  const errorBoundaryKey = `${docType}-${seed}-${count}-${difficulty}-${selectedTopicIds.join(',')}`;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        bgcolor: '#121416',
      }}
    >
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: 'var(--glass-bg)',
          backdropFilter: 'blur(12px)',
          color: 'var(--gold)',
          borderBottom: '1px solid var(--glass-border)',
          boxShadow: 'none',
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              edge="start"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Open control panel"
              sx={{ mr: 1.5, color: 'var(--gold)' }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
            <Box
              component="img"
              src="/logo_dark.png"
              alt="Euclid Engine Logo"
              className="logo-blend"
              sx={{ height: 40, width: 40 }}
            />
            <Typography
              variant="h6"
              noWrap
              className="scholarly-title"
              sx={{
                fontWeight: 700,
                color: 'var(--gold)',
                fontSize: '1.2rem'
              }}
            >
              Euclid Engine
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', flexGrow: 1, pt: '64px' }}>
        {/* ── Control Panel Drawer ── */}
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? mobileOpen : true}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          className="geometric-grid"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: {
              width: drawerWidth,
              boxSizing: 'border-box',
              pt: '80px',
              backgroundColor: 'var(--glass-bg)',
              backdropFilter: 'blur(16px)',
              borderRight: '1px solid var(--glass-border)',
            },
          }}
        >
          <Box sx={{ p: 2.5, overflowY: 'auto' }}>
            <Box mb={3}>
              <Typography
                sx={{
                  fontFamily: 'var(--font-playfair), serif',
                  fontWeight: 700,
                  color: 'var(--gold)',
                  fontSize: '1.12rem',
                  letterSpacing: '0.05em',
                }}
              >
                Control Panel
              </Typography>
              <Box
                sx={{
                  mt: 1,
                  height: 2,
                  width: 40,
                  borderRadius: 1,
                  backgroundColor: 'rgba(217,167,32,0.55)',
                }}
              />
            </Box>

            {/* ── Document Mode ── */}
            <PanelSection title="Document Mode">
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 0.75,
                }}
              >
                {DOC_MODES.map((m) => {
                  const selected = docType === m.value;
                  const Icon = m.icon;
                  return (
                    <Tooltip key={m.value} title={m.tip} placement="top" arrow>
                      <Button
                        onClick={() => setDocType(m.value)}
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 0.5,
                          py: 1.15,
                          px: 0.5,
                          borderRadius: 2,
                          textTransform: 'none',
                          border: '1px solid',
                          borderColor: selected
                            ? 'rgba(217,167,32,0.55)'
                            : 'rgba(255,255,255,0.09)',
                          backgroundColor: selected
                            ? 'rgba(217,167,32,0.13)'
                            : 'rgba(2,6,23,0.35)',
                          color: selected ? '#d9a720' : 'rgba(148,163,184,0.92)',
                          transition:
                            'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease',
                          '&:hover': {
                            borderColor: 'rgba(217,167,32,0.55)',
                            backgroundColor: selected
                              ? 'rgba(217,167,32,0.18)'
                              : 'rgba(217,167,32,0.06)',
                            color: '#d9a720',
                          },
                        }}
                      >
                        <Icon sx={{ fontSize: 19 }} />
                        <Typography
                          sx={{
                            fontSize: '0.62rem',
                            fontWeight: 600,
                            letterSpacing: 0.3,
                            lineHeight: 1.15,
                            textAlign: 'center',
                          }}
                        >
                          {m.label}
                        </Typography>
                      </Button>
                    </Tooltip>
                  );
                })}
              </Box>
            </PanelSection>

            {/* ── Curriculum Selection (multi-topic accordion) ── */}
            <PanelSection
              title={`Topics · ${selectedTopicIds.length} selected`}
              action={
                <Button
                  size="small"
                  onClick={allEffectiveExpanded ? collapseAllFiltered : expandAllFiltered}
                  sx={{
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    color: 'rgba(148,163,184,0.9)',
                    textTransform: 'none',
                    letterSpacing: 0.2,
                    minWidth: 0,
                    px: 1,
                    py: 0.25,
                    '&:hover': {
                      color: '#d9a720',
                      backgroundColor: 'rgba(217,167,32,0.07)',
                    },
                  }}
                >
                  {allEffectiveExpanded ? 'Collapse all' : 'Expand all'}
                </Button>
              }
            >
              {/* ── Topic search ── */}
              <TextField
                size="small"
                fullWidth
                value={topicSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search topics or TEKS…"
                aria-label="Search topics"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon
                          sx={{ fontSize: 16, color: 'rgba(148,163,184,0.7)' }}
                        />
                      </InputAdornment>
                    ),
                    endAdornment: topicSearch ? (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          aria-label="Clear search"
                          onClick={() => handleSearchChange('')}
                          sx={{
                            p: 0.4,
                            color: 'rgba(148,163,184,0.7)',
                            '&:hover': { color: '#d9a720' },
                          }}
                        >
                          <ClearIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      </InputAdornment>
                    ) : undefined,
                  },
                }}
                sx={{
                  mb: 1,
                  ...paramFieldSx,
                  '& .MuiInputBase-input': {
                    color: '#fbfbfb',
                    py: 1,
                    fontSize: '0.8rem',
                    '&::placeholder': {
                      color: 'rgba(148,163,184,0.55)',
                      opacity: 1,
                    },
                  },
                }}
              />
              {/* ── Filters ── */}
              <Box sx={{ display: 'flex', gap: 0.75, mb: 1.5, alignItems: 'center' }}>
                <Chip
                  clickable
                  label="Available only"
                  aria-pressed={availableOnly}
                  onClick={() => setAvailableOnly((v) => !v)}
                  sx={{
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    height: 30,
                    border: '1px solid',
                    borderColor: availableOnly
                      ? 'rgba(217,167,32,0.55)'
                      : 'rgba(255,255,255,0.10)',
                    backgroundColor: availableOnly
                      ? 'rgba(217,167,32,0.13)'
                      : 'rgba(2,6,23,0.35)',
                    color: availableOnly
                      ? '#d9a720'
                      : 'rgba(148,163,184,0.92)',
                    transition:
                      'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease',
                    '&:hover': {
                      borderColor: 'rgba(217,167,32,0.55)',
                      backgroundColor: availableOnly
                        ? 'rgba(217,167,32,0.18)'
                        : 'rgba(217,167,32,0.06)',
                      color: '#d9a720',
                    },
                  }}
                />
                <TextField
                  select
                  size="small"
                  value={subjectFilter}
                  aria-label="Filter by subject"
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    ...paramFieldSx,
                    '& .MuiInputBase-input': {
                      color:
                        subjectFilter === 'All'
                          ? 'rgba(148,163,184,0.92)'
                          : '#d9a720',
                      py: 0.85,
                      fontSize: '0.72rem',
                      fontWeight: 600,
                    },
                    '& .MuiSelect-icon': {
                      color: 'rgba(148,163,184,0.7)',
                    },
                  }}
                  SelectProps={{
                    MenuProps: {
                      PaperProps: {
                        sx: {
                          backgroundColor: '#0b1226',
                          border: '1px solid rgba(217,167,32,0.25)',
                          '& .MuiMenuItem-root': {
                            fontSize: '0.75rem',
                            color: 'rgba(251,251,251,0.85)',
                            '&.Mui-selected': {
                              backgroundColor: 'rgba(217,167,32,0.14)',
                              color: '#d9a720',
                            },
                            '&.Mui-selected:hover': {
                              backgroundColor: 'rgba(217,167,32,0.20)',
                            },
                            '&:hover': {
                              backgroundColor: 'rgba(217,167,32,0.07)',
                            },
                          },
                        },
                      },
                    },
                  }}
                >
                  {subjectOptions.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s === 'All' ? 'All subjects' : s}
                    </MenuItem>
                  ))}
                </TextField>
                {isFiltering && (
                  <Button
                    size="small"
                    onClick={clearTopicFilters}
                    sx={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      color: 'rgba(148,163,184,0.9)',
                      textTransform: 'none',
                      minWidth: 0,
                      px: 1,
                      py: 0.5,
                      '&:hover': {
                        color: '#d9a720',
                        backgroundColor: 'rgba(217,167,32,0.07)',
                      },
                    }}
                  >
                    Clear
                  </Button>
                )}
              </Box>
              <Box>
                {effectiveGroups.map(([groupTitle, entries]) => {
                  const open = expandedGroups.has(groupTitle);
                  const selectedCount = entries.filter((e) =>
                    selectedTopicIds.includes(e.id)
                  ).length;
                  return (
                    <Box
                      key={groupTitle}
                      sx={{
                        mb: 0.75,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: open
                          ? 'rgba(217,167,32,0.20)'
                          : 'rgba(255,255,255,0.06)',
                        backgroundColor: open
                          ? 'rgba(255,255,255,0.028)'
                          : 'rgba(2,6,23,0.35)',
                        overflow: 'hidden',
                        transition:
                          'background-color 0.25s ease, border-color 0.25s ease',
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
                          gap: 1,
                          px: 1.1,
                          py: 0.9,
                          textTransform: 'none',
                          borderRadius: 0,
                          '&:hover': {
                            backgroundColor: 'rgba(217,167,32,0.05)',
                          },
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.8,
                            minWidth: 0,
                          }}
                        >
                          <ExpandMore
                            sx={{
                              fontSize: 18,
                              flexShrink: 0,
                              color: open
                                ? '#d9a720'
                                : 'rgba(148,163,184,0.7)',
                              transform: open
                                ? 'rotate(0deg)'
                                : 'rotate(-90deg)',
                              transition: 'transform 0.25s ease, color 0.25s ease',
                            }}
                          />
                          <Typography
                            sx={{
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              letterSpacing: 0.2,
                              color: open
                                ? '#d9a720'
                                : 'rgba(251,251,251,0.88)',
                              textAlign: 'left',
                              lineHeight: 1.35,
                              transition: 'color 0.25s ease',
                            }}
                          >
                            {groupTitle}
                          </Typography>
                        </Box>
                        {selectedCount > 0 && (
                          <Chip
                            size="small"
                            label={selectedCount}
                            sx={{
                              height: 20,
                              minWidth: 22,
                              fontSize: '0.66rem',
                              fontWeight: 700,
                              backgroundColor: 'rgba(217,167,32,0.16)',
                              color: '#d9a720',
                              '& .MuiChip-label': { px: 0.75 },
                            }}
                          />
                        )}
                      </Button>
                      <Collapse in={open} timeout={280} unmountOnExit>
                        <Box sx={{ px: 0.75, pb: 0.9, pt: 0.25 }}>
                          {entries.map((entry) => {
                            const checked = selectedTopicIds.includes(entry.id);
                            return (
                              <FormControlLabel
                                key={entry.id}
                                control={
                                  <Checkbox
                                    size="small"
                                    checked={checked}
                                    onChange={() => toggleTopic(entry.id)}
                                    disabled={entry.underConstruction}
                                    sx={{
                                      p: 0.45,
                                      mr: 0.7,
                                      color: 'rgba(255,255,255,0.28)',
                                      '&:hover': {
                                        backgroundColor:
                                          'rgba(217,167,32,0.10)',
                                      },
                                      '&.Mui-checked': {
                                        color: '#d9a720',
                                      },
                                      '&.Mui-disabled': {
                                        color: 'rgba(255,255,255,0.12)',
                                      },
                                    }}
                                  />
                                }
                                label={
                                  <Box sx={{ py: 0.15 }}>
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        fontSize: '0.79rem',
                                        fontWeight: checked ? 600 : 400,
                                        color: entry.underConstruction
                                          ? 'rgba(255,255,255,0.30)'
                                          : checked
                                            ? '#fbfbfb'
                                            : 'rgba(251,251,251,0.78)',
                                        lineHeight: 1.3,
                                      }}
                                    >
                                      {entry.title}
                                    </Typography>
                                    <Typography
                                      component="span"
                                      sx={{
                                        display: 'inline-block',
                                        fontSize: '0.60rem',
                                        fontWeight: 500,
                                        letterSpacing: 0.4,
                                        lineHeight: 1.5,
                                        px: 0.9,
                                        mt: 0.3,
                                        borderRadius: 1,
                                        backgroundColor: entry.underConstruction
                                          ? 'rgba(148,163,184,0.08)'
                                          : 'rgba(148,163,184,0.10)',
                                        color: 'rgba(148,163,184,0.80)',
                                        border:
                                          '1px solid rgba(148,163,184,0.14)',
                                      }}
                                    >
                                      {entry.underConstruction
                                        ? 'Coming soon'
                                        : entry.teks}
                                    </Typography>
                                  </Box>
                                }
                                sx={{
                                  m: 0,
                                  width: '100%',
                                  px: 0.75,
                                  py: 0.3,
                                  borderRadius: 1.5,
                                  alignItems: 'flex-start',
                                  cursor: entry.underConstruction
                                    ? 'default'
                                    : 'pointer',
                                  transition: 'background-color 0.15s ease',
                                  '&:hover': {
                                    backgroundColor: entry.underConstruction
                                      ? 'transparent'
                                      : 'rgba(217,167,32,0.05)',
                                  },
                                }}
                                title={
                                  entry.underConstruction
                                    ? 'Not available yet'
                                    : entry.description
                                }
                              />
                            );
                          })}
                        </Box>
                      </Collapse>
                    </Box>
                  );
                })}
                {effectiveGroups.length === 0 && (
                  <Box sx={{ textAlign: 'center', py: 3.5, px: 2 }}>
                    <Typography
                      sx={{
                        fontSize: '0.8rem',
                        color: 'rgba(251,251,251,0.65)',
                        mb: 1.5,
                      }}
                    >
                      No topics match your search.
                    </Typography>
                    <Button
                      size="small"
                      onClick={clearTopicFilters}
                      sx={{
                        color: '#d9a720',
                        textTransform: 'none',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        '&:hover': {
                          backgroundColor: 'rgba(217,167,32,0.07)',
                        },
                      }}
                    >
                      Clear search & filters
                    </Button>
                  </Box>
                )}
              </Box>
            </PanelSection>

            {/* ── Parameters ── */}
            <PanelSection title="Parameters">
              <Typography
                variant="caption"
                display="block"
                sx={{ mb: 0.5, color: 'rgba(148,163,184,0.9)', fontSize: '0.7rem', fontWeight: 600 }}
              >
                Document Title
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={title}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Leave blank for auto title"
                sx={{ mb: 2.25, ...paramFieldSx }}
              />

              <Typography
                variant="caption"
                display="block"
                sx={{ mb: 0.5, color: 'rgba(148,163,184,0.9)', fontSize: '0.7rem', fontWeight: 600 }}
              >
                Problems per topic
              </Typography>
              <TextField
                type="number"
                size="small"
                fullWidth
                value={count}
                inputProps={{ min: 1, max: 25 }}
                onChange={(e) => {
                  const v = Math.floor(Number(e.target.value));
                  if (Number.isFinite(v)) setCount(Math.min(25, Math.max(1, v)));
                }}
                sx={{ mb: 2.25, ...paramFieldSx }}
              />

              <Typography
                variant="caption"
                display="block"
                sx={{ mb: 0.75, color: 'rgba(148,163,184,0.9)', fontSize: '0.7rem', fontWeight: 600 }}
              >
                Difficulty
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.75, mb: 2.25 }}>
                {[
                  { value: 1, label: 'Easy' },
                  { value: 2, label: 'Medium' },
                  { value: 3, label: 'Hard' },
                ].map((d) => {
                  const selected = difficulty === d.value;
                  return (
                    <Button
                      key={d.value}
                      onClick={() => setDifficulty(d.value as DifficultyLevel)}
                      sx={{
                        py: 0.85,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        letterSpacing: 0.2,
                        border: '1px solid',
                        borderColor: selected
                          ? 'rgba(217,167,32,0.55)'
                          : 'rgba(255,255,255,0.09)',
                        backgroundColor: selected
                          ? 'rgba(217,167,32,0.13)'
                          : 'rgba(2,6,23,0.35)',
                        color: selected ? '#d9a720' : 'rgba(148,163,184,0.92)',
                        transition: 'background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease',
                        '&:hover': {
                          borderColor: 'rgba(217,167,32,0.55)',
                          backgroundColor: selected
                            ? 'rgba(217,167,32,0.18)'
                            : 'rgba(217,167,32,0.06)',
                          color: '#d9a720',
                        },
                      }}
                    >
                      {d.label}
                    </Button>
                  );
                })}
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={includeAnswerKey}
                    onChange={(e) => setIncludeAnswerKey(e.target.checked)}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#d9a720',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: 'rgba(217,167,32,0.45)',
                      },
                      '& .MuiSwitch-track': {
                        backgroundColor: 'rgba(255,255,255,0.14)',
                      },
                    }}
                  />
                }
                label={
                  <Typography sx={{ color: 'rgba(251,251,251,0.8)', fontSize: '0.78rem' }}>
                    Include answer key in PDF
                  </Typography>
                }
                sx={{ mb: 1.5, ml: 0 }}
              />

              <Typography
                variant="caption"
                display="block"
                sx={{ mb: 0.5, color: 'rgba(148,163,184,0.9)', fontSize: '0.7rem', fontWeight: 600 }}
              >
                Problem Set Seed
              </Typography>
              <Typography
                variant="caption"
                display="block"
                sx={{ mb: 0.75, color: 'rgba(148,163,184,0.55)', fontSize: '0.65rem' }}
              >
                Same seed reproduces the same problem set
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                <TextField
                  type="number"
                  size="small"
                  fullWidth
                  value={seed}
                  onChange={(e) => setSeed(Math.floor(Number(e.target.value)) || 0)}
                  sx={paramFieldSx}
                />
                <Tooltip title="Generate a fresh set of problems" arrow>
                  <IconButton
                    size="small"
                    onClick={randomizeSeed}
                    sx={{
                      color: 'rgba(255,255,255,0.55)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      borderRadius: 2,
                      p: 1,
                      '&:hover': {
                        color: '#d9a720',
                        borderColor: 'rgba(217,167,32,0.5)',
                        backgroundColor: 'rgba(217,167,32,0.07)',
                      },
                    }}
                  >
                    <Casino fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </PanelSection>

            {/* ── Accommodations (IEP generator) ── */}
            <PanelSection
              title="Accommodations"
              action={
                hasAccommodations ? (
                  <Chip
                    size="small"
                    label={`${versionPlan.groups.length} group${versionPlan.groups.length === 1 ? '' : 's'}`}
                    data-testid="accom-group-count-chip"
                    sx={{
                      height: 20,
                      fontSize: '0.64rem',
                      fontWeight: 700,
                      backgroundColor: 'rgba(217,167,32,0.16)',
                      color: '#d9a720',
                      '& .MuiChip-label': { px: 0.75 },
                    }}
                  />
                ) : undefined
              }
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
            </PanelSection>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 2 }} />
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', display: 'block', mb: 1 }}>
              {advancedProblems.length} problem{advancedProblems.length === 1 ? '' : 's'} in this set
            </Typography>
          </Box>
        </Drawer>

        {/* ── Main Preview Area ── */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            bgcolor: '#1a1c1e',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            overflowY: 'auto',
          }}
        >
          {/* Action buttons */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              width: '100%',
              maxWidth: '8.5in',
              px: 4,
              pt: 3,
              pb: 2,
              gap: 2,
              alignItems: 'center',
            }}
          >
            <Button
              variant="outlined"
              startIcon={<Save />}
              onClick={saveDraft}
              sx={{
                borderRadius: 8,
                borderColor: 'rgba(255, 255, 255, 0.15)',
                color: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(4px)',
                '&:hover': {
                  borderColor: '#d9a720',
                  color: '#d9a720',
                  backgroundColor: 'rgba(217, 167, 32, 0.05)',
                }
              }}
            >
              Save Draft
            </Button>
            <Button
              variant="outlined"
              startIcon={<UploadFile />}
              onClick={() => fileRef.current?.click()}
              sx={{
                borderRadius: 8,
                borderColor: 'rgba(255, 255, 255, 0.15)',
                color: 'rgba(255, 255, 255, 0.8)',
                '&:hover': {
                  borderColor: '#d9a720',
                  color: '#d9a720',
                  backgroundColor: 'rgba(217, 167, 32, 0.05)',
                }
              }}
            >
              Load Draft
            </Button>
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
            {mounted && selectedModules.length > 0 && (
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
                      includeAnswerKey={includeAnswerKey}
                      logoSrc="/logo_light.png"
                      classicalGroups={classicalGroups}
                      seed={seed}
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
                    color="primary"
                    startIcon={<PictureAsPdf />}
                    disabled={loading}
                    sx={{ borderRadius: 8 }}
                  >
                    {loading ? 'Preparing PDF…' : 'Export to PDF'}
                  </Button>
                )}
              </PDFDownloadLink>
            )}
          </Box>

          {draftError && (
            <Alert severity="error" sx={{ mb: 2, maxWidth: '8.5in', width: '100%' }}>
              {draftError}
            </Alert>
          )}

          {/* Preview */}
          {selectedModules.length === 0 ? (
            <Alert severity="info" sx={{ maxWidth: '8.5in', width: '100%', mt: 2 }}>
              Select at least one topic from the control panel to build a worksheet.
            </Alert>
          ) : (
            <>
              {/* ── Version tabs (visible only when accommodation groups exist) ── */}
              {hasAccommodations && (
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    width: '100%',
                    maxWidth: '8.5in',
                    px: 4,
                    pb: 1.5,
                  }}
                  data-testid="version-tab-strip"
                >
                  {versionPlan.all().map((v) => {
                    const selected = v.versionId === activeVersion.versionId;
                    return (
                      <Button
                        key={v.versionId}
                        onClick={() => setActiveVersionId(v.versionId)}
                        data-testid={`version-tab-${v.versionId}`}
                        sx={{
                          textTransform: 'none',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          borderRadius: 8,
                          px: 2,
                          py: 0.75,
                          border: '1px solid',
                          borderColor: selected
                            ? 'rgba(217,167,32,0.55)'
                            : 'rgba(255,255,255,0.12)',
                          backgroundColor: selected
                            ? 'rgba(217,167,32,0.13)'
                            : 'rgba(2,6,23,0.35)',
                          color: selected ? '#d9a720' : 'rgba(148,163,184,0.92)',
                          '&:hover': {
                            borderColor: 'rgba(217,167,32,0.55)',
                            color: '#d9a720',
                          },
                        }}
                      >
                        {v.label}
                        {v.kind === 'group' ? ` (${v.studentCount})` : ''}
                      </Button>
                    );
                  })}
                  <Typography
                    sx={{
                      fontSize: '0.68rem',
                      color: 'rgba(148,163,184,0.65)',
                      ml: 0.5,
                    }}
                  >
                    Previewing: {activeVersion.label}
                    {activeVersion.accommodations.length > 0 &&
                      ` — ${activeVersion.accommodations.join(', ')}`}
                  </Typography>
                </Box>
              )}
              <PreviewErrorBoundary key={errorBoundaryKey}>
                <EuclidEngine
                  problems={activeVersion.problems}
                  mode={toOutputMode(docType)}
                  title={title}
                  classicalGroups={classicalGroups}
                  seed={seed}
                  proofDocMode={proofDocMode}
                  standard={standards}
                  presentation={activeVersion.presentation}
                />
              </PreviewErrorBoundary>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
