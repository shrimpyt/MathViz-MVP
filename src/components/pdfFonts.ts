// pdfFonts.ts
// One place that registers every font the PDF worksheets embed. Import this
// module (for its side effect) from any PDF component instead of calling
// Font.register yourself: registering the same family twice with different
// files makes @react-pdf pick between them unpredictably.
//
//   WorksheetSans      Euclid Sans, the default worksheet face. It is GNU
//                      FreeFont FreeSans with a tightened degree sign, built by
//                      scripts/build-worksheet-fonts.py. Covers ≅ ∠ △ ⊥ ∥ √ π.
//   WorksheetSerif     DejaVu Serif, the serif accommodation (IEP) option.
//   WorksheetSerifBold DejaVu Serif Bold.
//   WorksheetFallback  DejaVu Sans. Never chosen directly: it sits second in
//                      every stack so a glyph the first face lacks (≅ in
//                      DejaVu Serif, for one) still prints instead of a box.

import { Font } from "@react-pdf/renderer";

// In the browser the font loads from the public URL; in Node (tests /
// prerender) it loads from the repo's public directory.
export function fontSrc(file: string): string {
  if (typeof window === "undefined") {
    return `${process.cwd()}/public/fonts/${file}`;
  }
  return `/fonts/${file}`;
}

let registered = false;

export function registerPdfFonts(): void {
  if (registered) return;
  registered = true;

  Font.register({
    family: "WorksheetSans",
    fonts: [
      { src: fontSrc("EuclidSans-Regular.ttf"), fontWeight: 400 },
      { src: fontSrc("EuclidSans-Bold.ttf"), fontWeight: 700 },
      { src: fontSrc("EuclidSans-Oblique.ttf"), fontWeight: 400, fontStyle: "italic" },
      { src: fontSrc("EuclidSans-BoldOblique.ttf"), fontWeight: 700, fontStyle: "italic" },
    ],
  });

  Font.register({
    family: "WorksheetSerif",
    fonts: [
      { src: fontSrc("DejaVuSerif.ttf"), fontWeight: 400 },
      { src: fontSrc("DejaVuSerif-Italic.ttf"), fontWeight: 400, fontStyle: "italic" },
    ],
  });

  Font.register({
    family: "WorksheetSerifBold",
    fonts: [
      { src: fontSrc("DejaVuSerif-Bold.ttf"), fontWeight: 700 },
      { src: fontSrc("DejaVuSerif-BoldItalic.ttf"), fontWeight: 700, fontStyle: "italic" },
    ],
  });

  Font.register({
    family: "WorksheetFallback",
    fonts: [
      { src: fontSrc("DejaVuSans.ttf"), fontWeight: 400 },
      { src: fontSrc("DejaVuSans-Bold.ttf"), fontWeight: 700 },
      { src: fontSrc("DejaVuSans-Oblique.ttf"), fontWeight: 400, fontStyle: "italic" },
      { src: fontSrc("DejaVuSans-BoldOblique.ttf"), fontWeight: 700, fontStyle: "italic" },
    ],
  });

  // Worksheet text is set word by word; never hyphenate a word to fit a line.
  Font.registerHyphenationCallback((word) => [word]);
}

registerPdfFonts();

/** Font stacks: the first face prints, the fallback fills missing glyphs. */
export const SANS_STACK = ["WorksheetSans", "WorksheetFallback"];
export const SERIF_STACK = ["WorksheetSerif", "WorksheetFallback"];
export const SERIF_BOLD_STACK = ["WorksheetSerifBold", "WorksheetFallback"];

/**
 * Presentation-aware family swap, shared by every PDF stylesheet. Returns a
 * spreadable style fragment. Bold serif maps to the sans bold weight so
 * headings stay bold in sans mode.
 */
export function pdfFamily(
  presentationFont: "serif" | "sans",
  f: "WorksheetSerif" | "WorksheetSerifBold",
): { fontFamily: string[]; fontWeight?: number } {
  if (presentationFont === "sans") {
    return f === "WorksheetSerifBold"
      ? { fontFamily: SANS_STACK, fontWeight: 700 }
      : { fontFamily: SANS_STACK };
  }
  return { fontFamily: f === "WorksheetSerifBold" ? SERIF_BOLD_STACK : SERIF_STACK };
}
