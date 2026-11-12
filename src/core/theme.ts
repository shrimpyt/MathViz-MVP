import { createTheme } from '@mui/material/styles';
import { color, font, motion, radius, shadow } from './tokens';

// Euclid Engine site theme: indigo-tinted dark neutrals with one indigo
// accent, Nunito for every piece of UI text, hierarchy by weight and muted
// color rather than size. The printed worksheet has its own styles and is
// untouched by this file.
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: color.accent, light: color.accentHover, contrastText: color.accentContrast },
    // Kept equal to primary so the site has one accent color.
    secondary: { main: color.accent, light: color.accentHover, contrastText: color.accentContrast },
    error: { main: color.danger },
    background: { default: color.bg, paper: color.surface },
    text: { primary: color.text, secondary: color.textMuted, disabled: color.textSubtle },
    divider: color.border,
    action: {
      hover: 'rgba(160, 168, 214, 0.06)',
      selected: color.accentSoft,
      disabledBackground: 'rgba(160, 168, 214, 0.08)',
      disabled: color.textSubtle,
    },
  },
  typography: {
    fontFamily: font.ui,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700, letterSpacing: '-0.02em' },
    h4: { fontWeight: 700, fontSize: '1.75rem', lineHeight: 1.25, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700, letterSpacing: '-0.01em' },
    h6: { fontWeight: 600 },
    body1: { lineHeight: 1.6 },
    body2: { lineHeight: 1.6 },
    button: { fontWeight: 600, textTransform: 'none', letterSpacing: 0 },
  },
  shape: { borderRadius: radius.md },
  transitions: {
    duration: {
      shortest: motion.exit,
      shorter: motion.exit,
      short: motion.enter,
      standard: motion.enter,
      complex: 250,
      enteringScreen: motion.enter,
      leavingScreen: motion.exit,
    },
    easing: {
      easeOut: motion.easeOut,
      easeIn: motion.easeIn,
      easeInOut: motion.easeOut,
      sharp: motion.easeIn,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: color.bg, color: color.text },
        '*:focus-visible': { outline: `2px solid ${color.accentRing}`, outlineOffset: 2 },
      },
    },
    MuiButtonBase: { defaultProps: { disableRipple: true } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          fontWeight: 600,
          textTransform: 'none',
          transition: `background-color ${motion.exit}ms ${motion.easeOut}, border-color ${motion.exit}ms ${motion.easeOut}, color ${motion.exit}ms ${motion.easeOut}`,
        },
        sizeLarge: { padding: '8px 24px', fontSize: '0.9375rem' },
        contained: {
          backgroundColor: color.accent,
          color: color.accentContrast,
          boxShadow: shadow.sm,
          '&:hover': { backgroundColor: color.accentHover, boxShadow: shadow.sm },
          '&.Mui-disabled': { backgroundColor: 'rgba(160, 168, 214, 0.08)', color: color.textSubtle, boxShadow: 'none' },
        },
        outlined: {
          borderColor: color.borderStrong,
          color: color.text,
          '&:hover': { borderColor: 'rgba(160, 168, 214, 0.36)', backgroundColor: 'rgba(160, 168, 214, 0.06)' },
        },
        text: {
          color: color.textMuted,
          '&:hover': { color: color.text, backgroundColor: 'rgba(160, 168, 214, 0.06)' },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: radius.sm,
          color: color.textMuted,
          '&:hover': { color: color.text, backgroundColor: 'rgba(160, 168, 214, 0.08)' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: { borderColor: color.border },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { backgroundColor: color.surface, border: `1px solid ${color.border}`, borderRadius: radius.lg, boxShadow: 'none' },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: color.bgRaised,
          border: `1px solid ${color.border}`,
          borderRadius: radius.xl,
          boxShadow: shadow.lg,
        },
      },
    },
    MuiDialogTitle: { styleOverrides: { root: { fontWeight: 700, letterSpacing: '-0.01em', padding: '24px 24px 8px' } } },
    MuiDialogContent: { styleOverrides: { root: { padding: '8px 24px' } } },
    MuiDialogActions: { styleOverrides: { root: { padding: '16px 24px 24px', gap: 8 } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          backgroundColor: color.surface,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: color.border, borderWidth: 1 },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: color.borderStrong },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: color.accent, borderWidth: 1 },
          '&.Mui-focused': { boxShadow: `0 0 0 3px ${color.accentSoft}` },
        },
        input: { color: color.text },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { color: color.textMuted } } },
    MuiFormHelperText: { styleOverrides: { root: { color: color.textMuted, marginLeft: 0 } } },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: radius.pill,
          fontWeight: 600,
          transition: `background-color ${motion.exit}ms ${motion.easeOut}, border-color ${motion.exit}ms ${motion.easeOut}, color ${motion.exit}ms ${motion.easeOut}`,
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': { color: color.text },
          '&.Mui-checked + .MuiSwitch-track': { backgroundColor: color.accent, opacity: 1 },
        },
        track: { backgroundColor: 'rgba(160, 168, 214, 0.28)', opacity: 1 },
      },
    },
    MuiTooltip: {
      defaultProps: { enterDelay: 300 },
      styleOverrides: {
        tooltip: {
          backgroundColor: color.surfaceHover,
          color: color.text,
          border: `1px solid ${color.border}`,
          boxShadow: shadow.md,
          borderRadius: radius.sm,
          fontSize: '0.75rem',
          fontWeight: 500,
        },
        arrow: { color: color.surfaceHover },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: radius.md, border: `1px solid ${color.border}`, alignItems: 'center' },
        standardInfo: { backgroundColor: 'rgba(129, 140, 248, 0.08)', color: color.text, '& .MuiAlert-icon': { color: color.accent } },
        standardSuccess: { backgroundColor: 'rgba(74, 222, 128, 0.08)', color: color.text },
        standardWarning: { backgroundColor: 'rgba(251, 191, 36, 0.08)', color: color.text },
        standardError: { backgroundColor: 'rgba(248, 113, 113, 0.08)', color: color.text },
      },
    },
  },
});

export default theme;
