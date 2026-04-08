import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#d9a720', // Gold / Brass
      contrastText: '#0f172a',
    },
    secondary: {
      main: '#1e293b', // Deep Slate
    },
    background: {
      default: '#0f172a', // Deep Oxford Blue
      paper: '#1e293b',    // Lighter Oxford for contrast
    },
    text: {
      primary: '#fbfbfb',
      secondary: '#94a3b8',
    },
  },
  typography: {
    fontFamily: 'var(--font-inter), sans-serif',
    h1: { fontFamily: 'var(--font-playfair), serif', letterSpacing: '0.05em' },
    h2: { fontFamily: 'var(--font-playfair), serif', letterSpacing: '0.04em' },
    h3: { fontFamily: 'var(--font-playfair), serif', letterSpacing: '0.03em' },
    h4: { fontFamily: 'var(--font-playfair), serif', letterSpacing: '0.02em' },
    h5: { fontFamily: 'var(--font-playfair), serif', letterSpacing: '0.01em' },
    h6: { fontFamily: 'var(--font-playfair), serif' },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600,
          fontFamily: 'var(--font-inter), sans-serif',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(16px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(12px)',
          boxShadow: 'none',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        },
      },
    },
  },
});

export default theme;
