import { createTheme } from '@mui/material/styles';

// Classroom Canvas, dark friendly theme.
// Deep indigo-tinted surfaces, glowing indigo accents, warm coral actions,
// Nunito for the friendly voice. The worksheet engine underneath is untouched.
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#818cf8', // glowing indigo
      contrastText: '#14161f',
    },
    secondary: {
      main: '#fb923c', // warm coral
      contrastText: '#1a1005',
    },
    background: {
      default: '#14161f',
      paper: '#1e2233',
    },
    text: {
      primary: '#f2f3fa',
      secondary: '#9aa0be',
    },
    divider: '#2c3247',
  },
  typography: {
    fontFamily: 'var(--font-nunito), var(--font-inter), sans-serif',
    h1: { fontFamily: 'var(--font-nunito), sans-serif', fontWeight: 900 },
    h2: { fontFamily: 'var(--font-nunito), sans-serif', fontWeight: 900 },
    h3: { fontFamily: 'var(--font-nunito), sans-serif', fontWeight: 800 },
    h4: { fontFamily: 'var(--font-nunito), sans-serif', fontWeight: 800 },
    h5: { fontFamily: 'var(--font-nunito), sans-serif', fontWeight: 800 },
    h6: { fontFamily: 'var(--font-nunito), sans-serif', fontWeight: 800 },
    button: { fontFamily: 'var(--font-nunito), sans-serif', fontWeight: 800 },
  },
  shape: {
    borderRadius: 14,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 12,
          fontWeight: 800,
          fontFamily: 'var(--font-nunito), sans-serif',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#1e2233',
          border: '1px solid #2c3247',
          borderRadius: 18,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: '#1e2233',
            fontFamily: 'var(--font-nunito), sans-serif',
            '& fieldset': { borderColor: '#2c3247', borderWidth: 2 },
            '&:hover fieldset': { borderColor: 'rgba(129,140,248,0.5)' },
            '&.Mui-focused fieldset': { borderColor: '#818cf8' },
          },
          '& .MuiInputBase-input': { color: '#f2f3fa' },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontFamily: 'var(--font-nunito), sans-serif',
          fontWeight: 700,
        },
      },
    },
  },
});

export default theme;
