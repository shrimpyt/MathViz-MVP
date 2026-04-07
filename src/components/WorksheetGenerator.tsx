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
  Paper,
  AppBar,
  Toolbar,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import { Save, PictureAsPdf, MenuBook, Assignment } from '@mui/icons-material';
import { PDFDownloadLink } from '@react-pdf/renderer';
import PdfDocument from './PdfDocument';
import { geometryCurriculum } from '../data/geometryCurriculum';
import { DocumentType } from '../core/types';

const drawerWidth = 320;

const WebDiagram = ({ type }: { type: string }) => {
  if (type === 'circle') {
    return (
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" stroke="black" strokeWidth="2" fill="none" />
        <line x1="50" y1="50" x2="90" y2="50" stroke="black" strokeWidth="2" />
        <circle cx="50" cy="50" r="2" fill="black" />
        <text x="70" y="45" fontSize="10">r</text>
      </svg>
    );
  }
  if (type === 'surface-area') {
    return (
      <svg width="100" height="100" viewBox="0 0 100 100">
        <ellipse cx="50" cy="20" rx="30" ry="10" stroke="black" strokeWidth="2" fill="none" />
        <ellipse cx="50" cy="80" rx="30" ry="10" stroke="black" strokeWidth="2" fill="none" />
        <line x1="20" y1="20" x2="20" y2="80" stroke="black" strokeWidth="2" />
        <line x1="80" y1="20" x2="80" y2="80" stroke="black" strokeWidth="2" />
      </svg>
    );
  }
  if (type === 'angle') {
    return (
      <svg width="100" height="100" viewBox="0 0 100 100">
        <line x1="10" y1="30" x2="90" y2="30" stroke="black" strokeWidth="2" />
        <line x1="10" y1="70" x2="90" y2="70" stroke="black" strokeWidth="2" />
        <line x1="30" y1="10" x2="70" y2="90" stroke="black" strokeWidth="2" />
      </svg>
    );
  }
  return null;
};

export default function WorksheetGenerator() {
  const [docType, setDocType] = useState<DocumentType>('worksheet');
  const [selectedStoryModuleId, setSelectedStoryModuleId] = useState(geometryCurriculum.modules[0].id);
  const [selectedLessonId, setSelectedLessonId] = useState(geometryCurriculum.modules[0].lessons[0].id);
  const [title, setTitle] = useState('Geometry Practice');
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState(40);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    // Sync title based on topic selection when it changes if we want, or just let user set it.
    const activeStoryModule = geometryCurriculum.modules.find(m => m.id === selectedStoryModuleId);
    const activeLesson = activeStoryModule?.lessons.find(t => t.id === selectedLessonId);
    if (activeLesson) {
        setTitle(`${activeLesson.title} ${docType === 'guided-notes' ? 'Notes' : 'Practice'}`);
    }
  }, [selectedStoryModuleId, selectedLessonId, docType]);

  const activeStoryModule = useMemo(() => geometryCurriculum.modules.find(m => m.id === selectedStoryModuleId), [selectedStoryModuleId]);

  const handleStoryModuleChange = (newStoryModuleId: string) => {
    setSelectedStoryModuleId(newStoryModuleId);
    const mod = geometryCurriculum.modules.find(m => m.id === newStoryModuleId);
    if (mod && mod.lessons.length > 0) {
        setSelectedLessonId(mod.lessons[0].id);
    }
  };

  const questions = useMemo(() => {
    const topic = activeStoryModule?.lessons.find(t => t.id === selectedLessonId);
    if (!topic) return [];
    return topic.generateQuestions(numQuestions, docType);
  }, [activeStoryModule, selectedLessonId, numQuestions, docType]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#121416' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, backgroundColor: '#121416', color: '#66d9cc', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: 'none' }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 'bold', color: '#66d9cc' }}>
            MathViz AI
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: 'flex', flexGrow: 1, pt: '64px' }}>
        {/* Control Panel Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', pt: '64px', backgroundColor: 'rgba(40, 42, 44, 0.6)', backdropFilter: 'blur(10px)', borderRight: '1px solid rgba(255, 255, 255, 0.05)' },
          }}
        >
          <Box sx={{ p: 3, overflowY: 'auto' }}>
            <Box mb={4}>
                <Typography variant="h6" fontWeight="bold" color="primary">
                  Control Panel
                </Typography>
            </Box>

            <Box mb={4}>
                <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary', fontWeight: 'bold' }} gutterBottom>
                    Document Mode
                </Typography>
                <ToggleButtonGroup
                    value={docType}
                    exclusive
                    onChange={(e, val) => val && setDocType(val as DocumentType)}
                    fullWidth
                    size="small"
                    sx={{ mt: 1, mb: 2 }}
                >
                    <ToggleButton value="worksheet" sx={{ color: 'text.secondary', '&.Mui-selected': { color: 'primary.main', bgcolor: 'rgba(102, 217, 204, 0.1)' } }}>
                        <Assignment fontSize="small" sx={{ mr: 1 }}/> Worksheet
                    </ToggleButton>
                    <ToggleButton value="guided-notes" sx={{ color: 'text.secondary', '&.Mui-selected': { color: 'primary.main', bgcolor: 'rgba(102, 217, 204, 0.1)' } }}>
                        <MenuBook fontSize="small" sx={{ mr: 1 }}/> Guided Notes
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            <Box mb={4}>
                <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary', fontWeight: 'bold' }} gutterBottom>
                    Curriculum Selection
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1, mb: 0.5, color: 'text.secondary' }}>StoryModule</Typography>
                <Select
                    value={selectedStoryModuleId}
                    onChange={(e) => handleStoryModuleChange(e.target.value)}
                    fullWidth
                    size="small"
                    sx={{ mb: 2, backgroundColor: '#282a2c', borderRadius: 2 }}
                >
                    {geometryCurriculum.modules.map(mod => (
                        <MenuItem key={mod.id} value={mod.id}>{mod.title}</MenuItem>
                    ))}
                </Select>

                <Typography variant="caption" display="block" sx={{ mb: 0.5, color: 'text.secondary' }}>Lesson & Standard</Typography>
                <Select
                    value={selectedLessonId}
                    onChange={(e) => setSelectedLessonId(e.target.value)}
                    fullWidth
                    size="small"
                    sx={{ backgroundColor: '#282a2c', borderRadius: 2 }}
                >
                    {activeStoryModule?.lessons.map(topic => (
                        <MenuItem key={topic.id} value={topic.id}>{topic.title} ({topic.standard})</MenuItem>
                    ))}
                </Select>
            </Box>

            <Box mb={4}>
                <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary', fontWeight: 'bold' }} gutterBottom>
                    Parameters
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1, mb: 0.5, color: 'text.secondary' }}>Document Title</Typography>
                <TextField
                    fullWidth
                    size="small"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    sx={{ mb: 2, backgroundColor: '#282a2c', borderRadius: 2 }}
                />
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" display="block" sx={{ mb: 0.5, color: 'text.secondary' }}>Questions</Typography>
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
                        <Typography variant="caption" display="block" sx={{ mb: 0.5, color: 'text.secondary' }}>Difficulty</Typography>
                        <Slider
                            value={difficulty}
                            onChange={(e, val) => setDifficulty(val as number)}
                            size="small"
                        />
                    </Box>
                </Box>
            </Box>

          </Box>
        </Drawer>

        {/* Main Content Area - Preview */}
        <Box component="main" sx={{ flexGrow: 1, p: 4, bgcolor: '#1a1c1e', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%', maxWidth: '8.5in', mb: 2, gap: 2 }}>
                <Button variant="outlined" startIcon={<Save />} sx={{ borderRadius: 8, borderColor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}>Save Draft</Button>
                {mounted && (
                    <PDFDownloadLink
                        document={<PdfDocument title={title} questions={questions} />}
                        fileName={`${title.replace(/\s+/g, '_').toLowerCase()}.pdf`}
                        style={{ textDecoration: 'none' }}
                    >
                        <Button variant="contained" color="primary" startIcon={<PictureAsPdf />} sx={{ borderRadius: 8 }}>
                           Export to PDF
                        </Button>
                    </PDFDownloadLink>
                )}
            </Box>
            <Paper elevation={3} sx={{ width: '8.5in', minHeight: '11in', p: '0.5in', bgcolor: 'white', color: 'black' }}>
                <Typography variant="h4" align="center" gutterBottom fontWeight="bold" sx={{ fontFamily: 'Lexend, sans-serif' }}>{title}</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, borderBottom: '1px solid #ccc', pb: 2 }}>
                    <Typography variant="subtitle1">Name: ______________________</Typography>
                    <Typography variant="subtitle1">Date: ________</Typography>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {questions.map((q) => (
                        <Box key={q.id} sx={{ display: 'flex', gap: 2, breakInside: 'avoid' }}>
                            <Typography variant="body1" fontWeight="bold">{q.id}.</Typography>
                            <Box sx={{ flexGrow: 1 }}>
                                <Typography variant="body1" sx={{ mb: 1 }}>{q.text}</Typography>

                                {q.scaffolding && (
                                    <Box sx={{ ml: 2, mt: 2, p: 2, bgcolor: '#f8f9fa', borderLeft: '3px solid #66d9cc', borderRadius: 1 }}>
                                        {q.scaffolding.map((step, idx) => (
                                            <Typography key={idx} variant="body2" sx={{ mb: 1.5, color: '#333' }}>
                                                {step.text}
                                                {step.blankLength && (
                                                    <span style={{ display: 'inline-block', width: `${step.blankLength * 10}px`, borderBottom: '1px solid black', marginLeft: '4px' }}></span>
                                                )}
                                            </Typography>
                                        ))}
                                    </Box>
                                )}

                                <Box sx={{ mt: 2, height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <WebDiagram type={q.diagramType || ''} />
                                </Box>

                                {!q.scaffolding && (
                                    <Box sx={{ mt: 2, height: '100px' }} /> // Empty space for work in worksheet mode
                                )}
                            </Box>
                        </Box>
                    ))}
                </Box>
            </Paper>
        </Box>
      </Box>
    </Box>
  );
}
