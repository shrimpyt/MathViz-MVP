"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Drawer,
  Typography,
  Button,
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
import { EuclidEngine } from './EuclidEngine';
import { CURRICULUM_REGISTRY } from '../modules/CurriculumRegistry';
import { Autocomplete } from '@mui/material';
import { DocumentType, DiagramData, problemToQuestion } from '../core/types';
import type { OutputMode, MathProblem } from '@/lib/ProblemFactory';

const drawerWidth = 320;

// ── Map DocumentType → EuclidEngine OutputMode ───────────────────────────────

function toOutputMode(docType: DocumentType): OutputMode {
  if (docType === 'guided-notes') return 'GuidedNote';
  if (docType === 'review') return 'Review';
  if (docType === 'test') return 'Test';
  return 'Review'; // 'worksheet' → Review style (no step hints)
}

// ── Basic diagram for the fallback preview ────────────────────────────────────

const WebDiagram = ({ type, data }: { type: string; data?: DiagramData }) => {
  if (type === 'circle') {
    return (
      <svg width="150" height="150" viewBox="0 0 150 150">
        <circle cx="75" cy="75" r="50" stroke="black" strokeWidth="2" fill="none" />
        <circle cx="75" cy="75" r="2" fill="black" />
        <text x="70" y="90" fontSize="12" fontWeight="bold">O</text>
        <line x1="75" y1="75" x2="25" y2="75" stroke="black" strokeWidth="1" />
        <line x1="75" y1="75" x2="110" y2="40" stroke="black" strokeWidth="1" />
        <line x1="25" y1="75" x2="110" y2="40" stroke="black" strokeWidth="1" />
        <line x1="25" y1="75" x2="110" y2="110" stroke="black" strokeWidth="1" />
        <line x1="110" y1="40" x2="110" y2="110" stroke="black" strokeWidth="1" />
        <text x="15" y="80" fontSize="12">B</text>
        <text x="115" y="35" fontSize="12">A</text>
        <text x="115" y="120" fontSize="12">C</text>
        {data?.angle && <text x="35" y="70" fontSize="10">{data.angle}°</text>}
      </svg>
    );
  }
  if (type === 'surface-area') {
    return (
      <svg width="150" height="150" viewBox="0 0 150 150">
        <ellipse cx="75" cy="30" rx="40" ry="15" stroke="black" strokeWidth="2" fill="none" />
        <ellipse cx="75" cy="120" rx="40" ry="15" stroke="black" strokeWidth="2" fill="none" />
        <line x1="35" y1="30" x2="35" y2="120" stroke="black" strokeWidth="2" />
        <line x1="115" y1="30" x2="115" y2="120" stroke="black" strokeWidth="2" />
        <line x1="75" y1="30" x2="115" y2="30" stroke="black" strokeWidth="1" strokeDasharray="4" />
        {data?.radius && <text x="85" y="25" fontSize="12">r={data.radius}</text>}
        {data?.height && <text x="125" y="75" fontSize="12">h={data.height}</text>}
      </svg>
    );
  }
  if (type === 'angle') {
    return (
      <svg width="150" height="150" viewBox="0 0 150 150">
        <line x1="20" y1="50" x2="130" y2="50" stroke="black" strokeWidth="2" />
        <line x1="20" y1="100" x2="130" y2="100" stroke="black" strokeWidth="2" />
        <line x1="40" y1="20" x2="110" y2="130" stroke="black" strokeWidth="2" />
        <text x="10" y="45" fontSize="12">L1</text>
        <text x="10" y="95" fontSize="12">L2</text>
        <text x="60" y="45" fontSize="12">1</text>
        {data?.angleValue && <text x="75" y="45" fontSize="10">{data.angleValue}°</text>}
      </svg>
    );
  }
  return null;
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function WorksheetGenerator() {
  const [docType, setDocType] = useState<DocumentType>('guided-notes');
  const [selectedTopicId, setSelectedTopicId] = useState(CURRICULUM_REGISTRY[0].id);

  const [customTitle, setCustomTitle] = useState('');
  const activeModule = useMemo(() => CURRICULUM_REGISTRY.find(t => t.id === selectedTopicId), [selectedTopicId]);
  const defaultTitle = useMemo(() => {
    if (!activeModule) return 'Geometry Practice';
    const modeWord = docType === 'guided-notes' ? 'Notes' : docType === 'test' ? 'Assessment' : docType === 'review' ? 'Review' : 'Practice';
    return `${activeModule.title} — ${modeWord}`;
  }, [activeModule, docType]);
  const title = customTitle || defaultTitle;
  const handleTitleChange = (val: string) => setCustomTitle(val);
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState(40);
  const [seed, setSeed] = useState(42);
  const [mounted, setMounted] = useState(false);


  useEffect(() => {
    // Defer setMounted
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Moved title logic out of useEffect to avoid set-state-in-effect






  // Advanced problems for EuclidEngine (null if lesson doesn't support it)

  const advancedProblems = useMemo<MathProblem[]>(() => {
    if (!activeModule) return [];
    return activeModule.generate(toOutputMode(docType), seed);
  }, [activeModule, docType, seed]);

  // Basic questions for the fallback preview and PDF

  const questions = useMemo(() => {
    return advancedProblems.map((p, i) => problemToQuestion(p, i)).slice(0, numQuestions);
  }, [advancedProblems, numQuestions]);

  // Whether to use EuclidEngine preview
  const useAdvancedPreview = true;

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
            Euclid AI
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
                Topic
              </Typography>
              <Autocomplete
                options={CURRICULUM_REGISTRY}
                getOptionLabel={(option) => option.title}
                value={CURRICULUM_REGISTRY.find(t => t.id === selectedTopicId) || CURRICULUM_REGISTRY[0]}
                onChange={(_, newValue) => {
                  if (newValue) setSelectedTopicId(newValue.id);
                }}
                renderInput={(params) => <TextField {...params} size="small" />}
                sx={{ mb: 2, backgroundColor: '#282a2c', borderRadius: 2, '.MuiOutlinedInput-root': { padding: '3px' } }}
                disableClearable
              />
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
                onChange={(e) => handleTitleChange(e.target.value)}
                sx={{ mb: 2, backgroundColor: '#282a2c', borderRadius: 2 }}
              />

              {useAdvancedPreview && (
                <>
                  <Typography
                    variant="caption"
                    display="block"
                    sx={{ mb: 0.5, color: 'text.secondary' }}
                  >
                    Problem Set Seed (reproducibility)
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
                    advancedProblems={advancedProblems}
                    docType={docType}
                    standard={activeModule?.teks ?? 'Texas TEKS Geometry'}
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

          {/* Preview — EuclidEngine for advanced modules, basic Paper for others */}
          {useAdvancedPreview ? (
            <EuclidEngine
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
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <WebDiagram type={q.diagramType || ''} data={q.diagramData} />
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
