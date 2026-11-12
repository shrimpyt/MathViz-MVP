// Design tokens for the site chrome (not the printed worksheet).
//
// One accent, used only for the primary action, the selected/active state,
// focus rings and key links. Everything else is an indigo-tinted neutral.
// Spacing is the MUI 8px unit: use 1, 2, 3, 4 and 6 (8, 16, 24, 32, 48px).
// Radii nest: an element inside a padded container gets the container's
// radius minus the padding, so the corners stay concentric.

export const color = {
  bg: '#13151d',
  bgRaised: '#171a24',
  surface: '#1b1e2a',
  surfaceHover: '#212535',
  border: 'rgba(160, 168, 214, 0.12)',
  borderStrong: 'rgba(160, 168, 214, 0.22)',
  text: '#eef0f7',
  textMuted: '#9aa0be',
  textSubtle: '#6c7290',
  accent: '#818cf8',
  accentHover: '#9aa3fa',
  accentContrast: '#13151d',
  accentSoft: 'rgba(129, 140, 248, 0.12)',
  accentRing: 'rgba(129, 140, 248, 0.45)',
  danger: '#f87171',
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
  sm: '0 1px 1px rgba(4, 5, 12, 0.18), 0 2px 4px rgba(4, 5, 12, 0.14)',
  md: '0 1px 2px rgba(4, 5, 12, 0.20), 0 4px 8px rgba(4, 5, 12, 0.16), 0 12px 24px rgba(4, 5, 12, 0.14)',
  lg: '0 2px 4px rgba(4, 5, 12, 0.20), 0 8px 16px rgba(4, 5, 12, 0.18), 0 24px 48px rgba(4, 5, 12, 0.22)',
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
