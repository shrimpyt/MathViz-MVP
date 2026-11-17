// pdfDiagramFont.ts
// The face every PDF diagram label prints in: the worksheet sans (Euclid
// Sans, with DejaVu Sans filling any glyph it lacks), so labels match the
// body text instead of printing in Times. Spread one of these into a
// <Text> style; importing this module registers the fonts.

import { SANS_STACK } from "../pdfFonts";

export const DIAGRAM_FONT = { fontFamily: SANS_STACK };
export const DIAGRAM_FONT_BOLD = { fontFamily: SANS_STACK, fontWeight: 700 as const };
export const DIAGRAM_FONT_ITALIC = { fontFamily: SANS_STACK, fontStyle: "italic" as const };
