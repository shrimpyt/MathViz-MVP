"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Drawer,
  Typography,
  Button,
  Select,
  MenuItem,
  TextField,
  Slider,
  AppBar,
  Toolbar,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material';
import {
  Save,
  PictureAsPdf,
  MenuBook,
  Assignment,
  RateReview,
  Quiz,
} from '@mui/icons-material';
import { PDFDownloadLink } from '@react-pdf/renderer';
import PdfDocument from './PdfDocument';
import { MathVizEngine } from './MathVizEngine';
import { geometryCurriculum } from '../data/geometryCurriculum';
import { DocumentType } from '../core/types';
import type { OutputMode, MathProblem } from '@/lib/ProblemFactory';

const drawerWidth = 320;

// ── Map DocumentType → MathVizEngine OutputMode ───────────────────────────────

function toOutputMode(docType: DocumentType): OutputMode {
  if (docType === 'guided-notes') return 'GuidedNote';
  if (docType === 'review') return 'Review';
  if (docType === 'test') return 'Test';
  return 'Review'; // 'worksheet' → Review style (no step hints)
}

// ── Basic diagram for the fallback preview ────────────────────────────────────

const WebDiagram = ({ type }: { type: string }) => {
  if (type === 'circle') {
    return (
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" stroke="#334155" strokeWidth="2" fill="none" />
        <line x1="50" y1="50" x2="90" y2="50" stroke="#334155" strokeWidth="2" />
        <circle cx="50" cy="50" r="2" fill="#334155" />
        <text x="70" y="45" fontSize="10" fontFamily="Georgia,serif" fill="#334155">r</text>
      </svg>
    );
  }
  if (type === 'surface-area') {
    return (
      <svg width="100" height="100" viewBox="0 0 100 100">
        <ellipse cx="50" cy="20" rx="30" ry="10" stroke="#334155" strokeWidth="2" fill="none" />
        <ellipse cx="50" cy="80" rx="30" ry="10" stroke="#334155" strokeWidth="2" fill="none" />
        <line x1="20" y1="20" x2="20" y2="80" stroke="#334155" strokeWidth="2" />
        <line x1="80" y1="20" x2="80" y2="80" stroke="#334155" strokeWidth="2" />
      </svg>
    );
  }
  if (type === 'angle') {
    return (
      <svg width="100" height="100" viewBox="0 0 100 100">
        <line x1="10" y1="30" x2="90" y2="30" stroke="#334155" strokeWidth="2" />
        <line x1="10" y1="70" x2="90" y2="70" stroke="#334155" strokeWidth="2" />
        <line x1="30" y1="10" x2="70" y2="90" stroke="#334155" strokeWidth="2" />
      </svg>
    );
  }
  return null;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function WorksheetGenerator() {
  const [docType, setDocType] = useState<DocumentType>('guided-notes');
  const [selectedStoryModuleId, setSelectedStoryModuleId] = useState(
    geometryCurriculum.modules[0].id
  );
  const [selectedLessonId, setSelectedLessonId] = useState(
    geometryCurriculum.modules[0].lessons[0].id
  );
  const [title, setTitle] = useState('Geometry Practice');
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState(40);
  const [seed, setSeed] = useState(42);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const activeStoryModule = geometryCurriculum.modules.find(
      (m) => m.id === selectedStoryModuleId
    );
    const activeLesson = activeStoryModule?.lessons.find(
      (t) => t.id === selectedLessonId
    );
    if (activeLesson) {
      const modeWord =
        docType === 'guided-notes'
          ? 'Notes'
          : docType === 'test'
          ? 'Assessment'
          : docType === 'review'
          ? 'Review'
          : 'Practice';
      setTitle(`${activeLesson.title} — ${modeWord}`);
    }
  }, [selectedStoryModuleId, selectedLessonId, docType]);

  const activeStoryModule = useMemo(
    () => geometryCurriculum.modules.find((m) => m.id === selectedStoryModuleId),
    [selectedStoryModuleId]
  );

  const activeLesson = useMemo(
    () => activeStoryModule?.lessons.find((t) => t.id === selectedLessonId),
    [activeStoryModule, selectedLessonId]
  );

  const handleStoryModuleChange = (newId: string) => {
    setSelectedStoryModuleId(newId);
    const mod = geometryCurriculum.modules.find((m) => m.id === newId);
    if (mod?.lessons.length) {
      setSelectedLessonId(mod.lessons[0].id);
    }
  };

  // Advanced problems for MathVizEngine (null if lesson doesn't support it)
  const advancedProblems = useMemo<MathProblem[] | null>(() => {
    if (!activeLesson?.generateProblems) return null;
    return activeLesson.generateProblems(toOutputMode(docType), seed);
  }, [activeLesson, docType, seed]);

  // Basic questions for the fallback preview and PDF
  const questions = useMemo(() => {
    if (!activeLesson) return [];
    return activeLesson.generateQuestions(numQuestions, docType);
  }, [activeLesson, numQuestions, docType]);

  // Whether to use MathVizEngine preview
  const useAdvancedPreview = advancedProblems !== null;

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
          backgroundColor: '#121416',
          color: '#66d9cc',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: 'none',
        }}
      >
        <Toolbar>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ flexGrow: 1, fontWeight: 'bold', color: '#66d9cc' }}
          >
            MathViz AI
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', flexGrow: 1, pt: '64px' }}>
        {/* ── Control Panel Drawer ── */}
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: {
              width: drawerWidth,
              boxSizing: 'border-box',
              pt: '64px',
              backgroundColor: 'rgba(40, 42, 44, 0.6)',
              backdropFilter: 'blur(10px)',
              borderRight: '1px solid rgba(255, 255, 255, 0.05)',
            },
          }}
        >
          <Box sx={{ p: 3, overflowY: 'auto' }}>
            <Box mb={4}>
              <Typography variant="h6" fontWeight="bold" color="primary">
                Control Panel
              </Typography>
            </Box>

            {/* ── Document Mode ── */}
            <Box mb={4}>
              <Typography
                variant="caption"
                sx={{
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  color: 'text.secondary',
                  fontWeight: 'bold',
                }}
                gutterBottom
              >
                Document Mode
              </Typography>
              <ToggleButtonGroup
                value={docType}
                exclusive
                onChange={(_, val) => val && setDocType(val as DocumentType)}
                fullWidth
                size="small"
                sx={{ mt: 1, mb: 2, flexWrap: 'wrap', gap: 0.5 }}
              >
                <Tooltip title="Fill-in-the-blank scaffolding">
                  <ToggleButton
                    value="guided-notes"
                    sx={{
                      color: 'text.secondary',
                      '&.Mui-selected': {
                        color: 'primary.main',
                        bgcolor: 'rgba(102, 217, 204, 0.1)',
                      },
                    }}
                  >
                    <MenuBook fontSize="small" sx={{ mr: 0.5 }} /> Guided
                  </ToggleButton>
                </Tooltip>
                <Tooltip title="High-density practice with answers shown">
                  <ToggleButton
                    value="review"
                    sx={{
                      color: 'text.secondary',
                      '&.Mui-selected': {
                        color: 'primary.main',
                        bgcolor: 'rgba(102, 217, 204, 0.1)',
                      },
                    }}
                  >
                    <RateReview fontSize="small" sx={{ mr: 0.5 }} /> Review
                  </ToggleButton>
                </Tooltip>
                <Tooltip title="Formal assessment, no hints">
                  <ToggleButton
                    value="test"
                    sx={{
                      color: 'text.secondary',
                      '&.Mui-selected': {
                        color: 'primary.main',
                        bgcolor: 'rgba(102, 217, 204, 0.1)',
                      },
                    }}
                  >
                    <Quiz fontSize="small" sx={{ mr: 0.5 }} /> Test
                  </ToggleButton>
                </Tooltip>
                <Tooltip title="Standard worksheet">
                  <ToggleButton
                    value="worksheet"
                    sx={{
                      color: 'text.secondary',
                      '&.Mui-selected': {
                        color: 'primary.main',
                        bgcolor: 'rgba(102, 217, 204, 0.1)',
                      },
                    }}
                  >
                    <Assignment fontSize="small" sx={{ mr: 0.5 }} /> Sheet
                  </ToggleButton>
                </Tooltip>
              </ToggleButtonGroup>
            </Box>

            {/* ── Curriculum Selection ── */}
            <Box mb={4}>
              <Typography
                variant="caption"
                sx={{
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  color: 'text.secondary',
                  fontWeight: 'bold',
                }}
                gutterBottom
              >
                Curriculum Selection
              </Typography>

              <Typography
                variant="caption"
                display="block"
                sx={{ mt: 1, mb: 0.5, color: 'text.secondary' }}
              >
                Story Module
              </Typography>
              <Select
                value={selectedStoryModuleId}
                onChange={(e) => handleStoryModuleChange(e.target.value)}
                fullWidth
                size="small"
                sx={{ mb: 2, backgroundColor: '#282a2c', borderRadius: 2 }}
              >
                {geometryCurriculum.modules.map((mod) => (
                  <MenuItem key={mod.id} value={mod.id}>
                    {mod.title}
                  </MenuItem>
                ))}
              </Select>

              <Typography
                variant="caption"
                display="block"
                sx={{ mb: 0.5, color: 'text.secondary' }}
              >
                Lesson &amp; Standard
              </Typography>
              <Select
                value={selectedLessonId}
                onChange={(e) => setSelectedLessonId(e.target.value)}
                fullWidth
                size="small"
                sx={{ backgroundColor: '#282a2c', borderRadius: 2 }}
              >
                {activeStoryModule?.lessons.map((lesson) => (
                  <MenuItem key={lesson.id} value={lesson.id}>
                    {lesson.title} ({lesson.standard})
                  </MenuItem>
                ))}
              </Select>
            </Box>

            {/* ── Parameters ── */}
            <Box mb={4}>
              <Typography
                variant="caption"
                sx={{
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  color: 'text.secondary',
                  fontWeight: 'bold',
                }}
                gutterBottom
              >
                Parameters
              </Typography>

              <Typography
                variant="caption"
                display="block"
                sx={{ mt: 1, mb: 0.5, color: 'text.secondary' }}
              >
                Document Title
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                sx={{ mb: 2, backgroundColor: '#282a2c', borderRadius: 2 }}
              />

              {/* Show seed control for advanced modules */}
              {useAdvancedPreview && (
                <>
                  <Typography
                    variant="caption"
                    display="block"
                    sx={{ mb: 0.5, color: 'text.secondary' }}
                  >
                    Problem Set Seed (for reproducibility)
                  </Typography>
                  <TextField
                    type="number"
                    size="small"
                    fullWidth
                    value={seed}
                    onChange={(e) => setSeed(Number(e.target.value))}
                    sx={{ mb: 2, backgroundColor: '#282a2c', borderRadius: 2 }}
                  />
                </>
              )}

              {/* Show question count for basic modules */}
              {!useAdvancedPreview && (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="caption"
                      display="block"
                      sx={{ mb: 0.5, color: 'text.secondary' }}
                    >
                      Questions
                    </Typography>
                    <TextField
                      type="number"
                      size="small"
                      fullWidth
                      value={numQuestions}
                      onChange={(e) => setNumQuestions(Number(e.target.value))}
                      sx={{ backgroundColor: '#282a2c', borderRadius: 2 }}
                    />
                  </Box>
                  <Box sx={{ flex: 2 }}>
                    <Typography
                      variant="caption"
                      display="block"
                      sx={{ mb: 0.5, color: 'text.secondary' }}
                    >
                      Difficulty
                    </Typography>
                    <Slider
                      value={difficulty}
                      onChange={(_, val) => setDifficulty(val as number)}
                      size="small"
                    />
                  </Box>
                </Box>
              )}
            </Box>
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
            }}
          >
            <Button
              variant="outlined"
              startIcon={<Save />}
              sx={{
                borderRadius: 8,
                borderColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
              }}
            >
              Save Draft
            </Button>
            {mounted && (
              <PDFDownloadLink
                document={
                  <PdfDocument
                    title={title}
                    questions={questions}
                    docType={docType}
                    standard={activeLesson?.standard ?? 'Texas TEKS Geometry'}
                  />
                }
                fileName={`${title.replace(/\s+/g, '_').toLowerCase()}.pdf`}
                style={{ textDecoration: 'none' }}
              >
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<PictureAsPdf />}
                  sx={{ borderRadius: 8 }}
                >
                  Export to PDF
                </Button>
              </PDFDownloadLink>
            )}
          </Box>

          {/* Preview — MathVizEngine for advanced modules, basic Paper for others */}
          {useAdvancedPreview ? (
            <MathVizEngine
              problems={advancedProblems!}
              mode={toOutputMode(docType)}
              title={title}
            />
          ) : (
            <Box
              sx={{
                width: '8.5in',
                minHeight: '11in',
                p: '0.65in',
                bgcolor: 'white',
                color: 'black',
                boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
                borderRadius: 1,
                mb: 4,
              }}
            >
              {/* Classical Academy header */}
              <Box
                sx={{
                  borderTop: '3px solid #1e293b',
                  borderBottom: '1px solid #1e293b',
                  py: 1,
                  mb: 1.5,
                  textAlign: 'center',
                }}
              >
                <Typography
                  sx={{
                    fontFamily: "'Times New Roman', Georgia, serif",
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    color: '#0f172a',
                  }}
                >
                  {title}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: "'Times New Roman', Georgia, serif",
                    fontSize: '0.7rem',
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: 2,
                  }}
                >
                  {docType === 'guided-notes'
                    ? 'Guided Notes'
                    : docType === 'test'
                    ? 'Assessment'
                    : docType === 'review'
                    ? 'Review Practice'
                    : 'Practice Worksheet'}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  pb: 1,
                  mb: 3,
                  borderBottom: '1px solid #94a3b8',
                  fontFamily: "'Times New Roman', Georgia, serif",
                  fontSize: '0.85rem',
                  color: '#334155',
                }}
              >
                <span>
                  Name:{' '}
                  <span
                    style={{
                      display: 'inline-block',
                      width: 180,
                      borderBottom: '1px solid #334155',
                    }}
                  />
                </span>
                <span style={{ display: 'flex', gap: 24 }}>
                  <span>
                    Date:{' '}
                    <span
                      style={{
                        display: 'inline-block',
                        width: 70,
                        borderBottom: '1px solid #334155',
                      }}
                    />
                  </span>
                  <span>
                    Period:{' '}
                    <span
                      style={{
                        display: 'inline-block',
                        width: 35,
                        borderBottom: '1px solid #334155',
                      }}
                    />
                  </span>
                </span>
              </Box>

              {/* Questions */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {questions.map((q) => (
                  <Box
                    key={q.id}
                    sx={{ display: 'flex', gap: 2, breakInside: 'avoid' }}
                  >
                    <Typography
                      sx={{
                        fontFamily: "'Times New Roman', Georgia, serif",
                        fontWeight: 'bold',
                        minWidth: 20,
                      }}
                    >
                      {q.id}.
                    </Typography>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography
                        sx={{
                          fontFamily: "'Times New Roman', Georgia, serif",
                          fontSize: '0.9rem',
                          mb: 1,
                        }}
                      >
                        {q.text}
                      </Typography>

                      {q.scaffolding && (
                        <Box
                          sx={{
                            ml: 2,
                            mt: 2,
                            p: 2,
                            bgcolor: '#f8fafc',
                            borderLeft: '2px solid #66d9cc',
                            borderRadius: 1,
                          }}
                        >
                          {q.scaffolding.map((step, idx) => (
                            <Typography
                              key={idx}
                              sx={{
                                fontFamily: "'Times New Roman', Georgia, serif",
                                fontSize: '0.85rem',
                                mb: 1.5,
                                color: '#334155',
                              }}
                            >
                              {step.text}
                              {step.blankLength && (
                                <span
                                  style={{
                                    display: 'inline-block',
                                    width: `${step.blankLength * 8}px`,
                                    borderBottom: '1px solid black',
                                    marginLeft: '4px',
                                  }}
                                />
                              )}
                            </Typography>
                          ))}
                        </Box>
                      )}

                      <Box
                        sx={{
                          mt: 2,
                          height: '100px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <WebDiagram type={q.diagramType || ''} />
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
