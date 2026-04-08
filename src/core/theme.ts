import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#d9a720', // Gold / Brass
      contrastText: '#172336',
    },
    secondary: {
      main: '#617483', // Slate Blue
    },
    background: {
      default: '#0f172a', // Slightly darker than Oxford Blue for contrast
      paper: '#172336',   // Oxford Blue
    },
    text: {
      primary: '#fbfbfb',
      secondary: '#94a3b8',
    },
  },
  typography: {
    fontFamily: 'var(--font-inter), sans-serif',
    h1: { fontFamily: 'var(--font-playfair), serif' },
    h2: { fontFamily: 'var(--font-playfair), serif' },
    h3: { fontFamily: 'var(--font-playfair), serif' },
    h4: { fontFamily: 'var(--font-playfair), serif' },
    h5: { fontFamily: 'var(--font-playfair), serif' },
    h6: { fontFamily: 'var(--font-playfair), serif' },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: 'rgba(23, 35, 54, 0.7)',
          backdropFilter: 'blur(12px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(12px)',
          boxShadow: 'none',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        },
      },
    },
  },
});

export default theme;
