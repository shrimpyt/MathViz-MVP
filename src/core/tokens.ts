// Design tokens for the site chrome (not the printed worksheet).
//
// The "Notebook" look: a soft sage page, white sheets, deep green-black ink
// and one plum accent. The accent is used only for the primary action, the
// selected/active state, focus rings and key links. Everything else is a
// green-tinted neutral. Spacing is the MUI 8px unit: use 1, 2, 3, 4 and 6
// (8, 16, 24, 32, 48px). Radii nest: an element inside a padded container
// gets the container's radius minus the padding, so the corners stay
// concentric.

export const color = {
  bg: '#eef3f0',
  bgRaised: '#f6f9f7',
  surface: '#ffffff',
  surfaceHover: '#f5f8f6',
  border: 'rgba(27, 43, 38, 0.08)',
  borderStrong: 'rgba(27, 43, 38, 0.16)',
  text: '#1b2b26',
  textMuted: '#4d605a',
  textSubtle: '#5e6f69',
  hover: 'rgba(27, 43, 38, 0.05)',
  track: 'rgba(27, 43, 38, 0.18)',
  disabledBg: 'rgba(27, 43, 38, 0.06)',
  // The dark bar that holds the summary and Continue.
  ink: '#1b2b26',
  inkMuted: '#c9d6d0',
  accent: '#6d3b7a',
  accentHover: '#5a2f66',
  accentContrast: '#ffffff',
  accentSoft: 'rgba(109, 59, 122, 0.08)',
  accentRing: 'rgba(109, 59, 122, 0.45)',
  danger: '#b42318',
} as const;

// Radii, outer to inner. Card (24) - padding (16) = control (8).
export const radius = {
  sm: 8, // controls nested in a padded card; tags
  md: 12, // standalone buttons, inputs, list rows
  lg: 16, // standalone cards
  xl: 24, // cards that hold rounded controls at 16px padding
  pill: 999,
} as const;

// Soft layered elevation: a tight contact shadow plus wider, fainter ambient ones.
export const shadow = {
  sm: '0 1px 2px rgba(27, 43, 38, 0.04), 0 2px 6px rgba(27, 43, 38, 0.04)',
  md: '0 1px 2px rgba(27, 43, 38, 0.05), 0 4px 10px rgba(27, 43, 38, 0.05), 0 12px 24px rgba(27, 43, 38, 0.05)',
  lg: '0 2px 4px rgba(27, 43, 38, 0.12), 0 16px 40px rgba(27, 43, 38, 0.18)',
} as const;

// Motion: short, ease-out in, a little faster out.
export const motion = {
  enter: 200,
  exit: 150,
  easeOut: 'cubic-bezier(0.2, 0, 0, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
} as const;

export const font = {
  ui: 'var(--font-nunito), ui-sans-serif, system-ui, sans-serif',
} as const;

// Lucide icon defaults so every icon has the same box and stroke.
export const icon = { size: 16, strokeWidth: 1.75 } as const;

// Shared bits of sx used across screens.
export const sx = {
  // Muted section label above a group of controls.
  label: { fontSize: '0.8125rem', fontWeight: 600, color: color.text, lineHeight: 1.5 },
  help: { fontSize: '0.75rem', fontWeight: 400, color: color.textMuted, lineHeight: 1.6 },
  transition: (props: string) =>
    props
      .split(',')
      .map((p) => `${p.trim()} ${motion.enter}ms ${motion.easeOut}`)
      .join(', '),
} as const;
