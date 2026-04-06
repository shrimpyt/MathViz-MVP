"use client";

import React, { useState, useEffect } from 'react';
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
  Toolbar
} from '@mui/material';
import { Save, PictureAsPdf } from '@mui/icons-material';
import { PDFDownloadLink } from '@react-pdf/renderer';
import PdfDocument from './PdfDocument';

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
  const [grade, setGrade] = useState('Grade 10 - Geometry');
  const [standard, setStandard] = useState('Circle Theorems (G.12(A) TEKS)');
  const [title, setTitle] = useState('Circle Theorems 1');
  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState(40);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const questions = React.useMemo(() => {
    const qs = [];
    for (let i = 0; i < numQuestions; i++) {
        let text = '';
        let diagramType = '';

        if (standard.includes('Circle Theorems')) {
            text = `In circle O, m∠ABC = ${Math.floor(Math.abs(Math.sin(i * 12345)) * 40) + 30}°. Find m∠AOC.`;
            diagramType = 'circle';
        } else if (standard.includes('Surface Area')) {
            text = `Find the surface area of a cylinder with radius ${Math.floor(Math.abs(Math.sin(i * 12345)) * 8) + 2} cm and height ${Math.floor(Math.abs(Math.sin(i * 12345)) * 10) + 5} cm.`;
            diagramType = 'surface-area';
        } else if (standard.includes('Angle Relationships')) {
            text = `Lines L1 and L2 are parallel. If m∠1 = ${Math.floor(Math.abs(Math.sin(i * 12345)) * 60) + 40}°, find the measure of the alternate interior angle.`;
            diagramType = 'angle';
        } else {
            text = `Find the value of x in problem #${i + 1}.`;
            diagramType = 'unknown';
        }

        qs.push({
            id: i + 1,
            text,
            points: 10,
            diagramType
        });
    }
    return qs;
  }, [numQuestions, standard]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, backgroundColor: 'white', color: 'black', borderBottom: '1px solid #e0e0e0', boxShadow: 'none' }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 'bold', color: '#1976D2' }}>
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
            [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', pt: '64px', backgroundColor: '#f3f4f5' },
          }}
        >
          <Box sx={{ p: 3, overflowY: 'auto' }}>
            <Box mb={4}>
                <Typography variant="h6" fontWeight="bold" color="primary">
                  Control Panel
                </Typography>
                <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary', fontWeight: 'bold' }}>
                  Configure Worksheet
                </Typography>
            </Box>

            <Box mb={4}>
                <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary', fontWeight: 'bold' }} gutterBottom>
                    Academic Standards
                </Typography>
                <Select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    fullWidth
                    size="small"
                    sx={{ mb: 2, backgroundColor: 'white', borderRadius: 2 }}
                >
                    <MenuItem value="Grade 10 - Geometry">Grade 10 - Geometry</MenuItem>
                    <MenuItem value="Grade 12 - Advanced Math">Grade 12 - Advanced Math</MenuItem>
                </Select>
                <Select
                    value={standard}
                    onChange={(e) => setStandard(e.target.value)}
                    fullWidth
                    size="small"
                    sx={{ backgroundColor: 'white', borderRadius: 2 }}
                >
                    <MenuItem value="Circle Theorems (G.12(A) TEKS)">Circle Theorems (G.12(A) TEKS)</MenuItem>
                    <MenuItem value="Surface Area & Volume">Surface Area & Volume</MenuItem>
                                    <MenuItem value="Angle Relationships (G.6(A) TEKS)">Angle Relationships (G.6(A) TEKS)</MenuItem>
                </Select>
            </Box>

            <Box mb={4}>
                <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: 1, color: 'text.secondary', fontWeight: 'bold' }} gutterBottom>
                    Worksheet Parameters
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 1, mb: 0.5, color: 'text.secondary' }}>Worksheet Title</Typography>
                <TextField
                    fullWidth
                    size="small"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    sx={{ mb: 2, backgroundColor: 'white', borderRadius: 2 }}
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
                            sx={{ backgroundColor: 'white', borderRadius: 2 }}
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
        <Box component="main" sx={{ flexGrow: 1, p: 4, bgcolor: '#e7e8e9', display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%', maxWidth: '8.5in', mb: 2, gap: 2 }}>
                <Button variant="outlined" startIcon={<Save />} sx={{ borderRadius: 8, bgcolor: 'white' }}>Save Draft</Button>
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
            <Paper elevation={3} sx={{ width: '8.5in', minHeight: '11in', p: '0.5in', bgcolor: 'white' }}>
                <Typography variant="h4" align="center" gutterBottom fontWeight="bold" sx={{ fontFamily: 'Manrope, sans-serif' }}>{title}</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, borderBottom: '1px solid #ccc', pb: 2 }}>
                    <Typography variant="subtitle1">Name: ______________________</Typography>
                    <Typography variant="subtitle1">Date: ________</Typography>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {questions.map((q) => (
                        <Box key={q.id} sx={{ display: 'flex', gap: 2, breakInside: 'avoid' }}>
                            <Typography variant="body1" fontWeight="bold">{q.id}.</Typography>
                            <Box sx={{ flexGrow: 1 }}>
                                <Typography variant="body1">{q.text}</Typography>
                                <Box sx={{ mt: 2, height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <WebDiagram type={q.diagramType || ''} />
                                </Box>
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
