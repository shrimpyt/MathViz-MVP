// answerKey.ts
// Helpers for rendering math answers and instruction text as plain unicode.
// Factories emit LaTeX-flavoured strings (e.g. "5\sqrt{2}", "\(sin \theta\)").
// The web preview and the PDF both need human-readable text, and @react-pdf
// cannot run KaTeX — so we convert to unicode instead of typesetting.

import type { MathProblem } from "./types";
import type { PrecalcFRQ } from "./factories/PrecalcTypes";
import { formatAlgebra1Answer } from "@/modules/algebra-1";
import { formatAlgebra2Answer } from "./factories/Algebra2Types";
import { formatPrecalcAnswer } from "./factories/PrecalcTypes";
import { formatCalculusAnswer } from "./factories/CalculusUtils";

// ── latexToText ───────────────────────────────────────────────────────────────

const SUPERSCRIPT: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
  "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
  "+": "⁺", "-": "⁻", "=": "⁼", "(": "⁽", ")": "⁾",
  n: "ⁿ", x: "ˣ", i: "ⁱ", a: "ᵃ", o: "ᵒ",
};

const SUBSCRIPT: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
  "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
  "+": "₊", "-": "₋", "(": "₍", ")": "₎",
  n: "ₙ", x: "ₓ", i: "ᵢ", a: "ₐ", o: "ₒ", e: "ₑ",
};

const SYMBOLS: [RegExp, string][] = [
  [/\^\\circ/g, "°"], // 37^\circ → 37°
  [/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "$1/$2"],
  [/\\sqrt\s*\{([^{}]*)\}/g, "√$1"],
  [/\\sqrt(?![a-zA-Z{])/g, "√"],
  [/\\times/g, "×"],
  [/\\div/g, "÷"],
  [/\\cdot/g, "·"],
  [/\\pm/g, "±"],
  [/\\approx/g, "≈"],
  [/\\neq/g, "≠"],
  [/\\leq?/g, "≤"],
  [/\\geq?/g, "≥"],
  [/\\theta/g, "θ"],
  [/\\pi/g, "π"],
  [/\\alpha/g, "α"],
  [/\\beta/g, "β"],
  [/\\gamma/g, "γ"],
  [/\\delta/g, "δ"],
  [/\\angle/g, "∠"],
  [/\\cong/g, "≅"],
  [/\\sim/g, "~"],
  [/\\circ/g, "°"],
  [/\\degree/g, "°"],
  [/\\infty/g, "∞"],
];

function mapChars(s: string, table: Record<string, string>): string {
  return s.split("").map((c) => table[c] ?? c).join("");
}

/**
 * Convert a LaTeX-flavoured string to readable unicode text.
 * Safe to call on plain text — it passes through unchanged.
 */
export function latexToText(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return "";
  let s = String(input);

  // Strip inline/display math delimiters: \( \) \[ \] and $
  s = s.replace(/\\\(|\\\)|\\\[|\\\]/g, "").replace(/\$/g, "");

  // Common commands → unicode
  for (const [re, rep] of SYMBOLS) {
    s = s.replace(re, rep);
  }

  // Subscripts written as _{xx} (e.g. x_{1}) — do before superscripts
  s = s.replace(/_\{([^}]*)\}/g, (_m, g: string) => mapChars(g, SUBSCRIPT));
  s = s.replace(/_([0-9+\-nxieao()])/g, (_m, c: string) => SUBSCRIPT[c] ?? c);

  // Superscripts ^{xx} and ^x
  s = s.replace(/\^\{([^}]*)\}/g, (_m, g: string) => mapChars(g, SUPERSCRIPT));
  s = s.replace(/\^([0-9+\-=nxiao()])/g, (_m, c: string) => SUPERSCRIPT[c] ?? c);

  // Any leftover backslash commands: drop the backslash, keep the name
  s = s.replace(/\\([a-zA-Z]+)/g, "$1");

  return s.replace(/\s+/g, " ").trim();
}

// ── formatAnswer ──────────────────────────────────────────────────────────────

/**
 * The PDF embeds DejaVu Serif, which covers every glyph this module emits
 * EXCEPT "≅" (U+2245). Map the few missing glyphs to look-alikes so nothing
 * ever prints as a wrong/missing character. Web preview keeps full unicode.
 */
const PDF_FONT_SUBSTITUTIONS: Record<string, string> = {
  "≅": "≃", // visually near-identical; DejaVu Serif lacks U+2245
};

export function pdfSafeText(input: string | number | null | undefined): string {
  let s = latexToText(input);
  for (const [from, to] of Object.entries(PDF_FONT_SUBSTITUTIONS)) {
    s = s.split(from).join(to);
  }
  return s;
}

/**
 * Human-readable names for the internal `given` keys factories use
 * (e.g. G.12A circle problems store { arc1, arc2 }).
 */
const GIVEN_KEY_NAMES: Record<string, string> = {
  interceptedArc: "intercepted arc",
  inscribedAngle: "inscribed angle",
  centralAngle: "central angle",
  tangentAngle: "tangent-chord angle",
  arc1: "arc 1",
  arc2: "arc 2",
  farArc: "far arc",
  nearArc: "near arc",
};

export function givenKeyName(key: string): string {
  return (
    GIVEN_KEY_NAMES[key] ??
    key.replace(/([A-Z])/g, " $1").toLowerCase().trim()
  );
}

/**
 * One-line printable answer for the answer key, in the problem's own units.
 */
export function formatAnswer(p: MathProblem): string {
  switch (p.type) {
    case "G.12A":
      return `${latexToText(p.answer)}°`;
    case "G.13B":
      return p.answerPct;
    case "G.6B":
      return p.answer;
    case "G.9A":
      return p.subtype === "SolveForAngle"
        ? `${latexToText(p.answer)}°`
        : latexToText(p.answer);
    case "G.9B":
      return latexToText(p.answer);
    case "G.2B":
      return latexToText(p.answer);
    case "G.12B":
      return p.unit ? `${latexToText(p.answer)} ${p.unit}` : latexToText(p.answer);
    case "Proof": {
      // The answer key must list each step's reason — a bare "I.1 — Q.E.D."
      // is ungradeable for proof-fill-reasons worksheets. Mirrors the
      // "Reasons:" convention of formatClassicalKeyLine.
      const header = p.elementsProposition ? `${p.elementsProposition} — Q.E.D.` : p.prove;
      const steps = Array.isArray(p.steps) ? p.steps.filter((s) => s.statement !== "Q.E.D.") : [];
      if (steps.length === 0) return header;
      const reasons = steps.map((s, i) => `Step ${i + 1}: ${s.reason}`).join("; ");
      return `${header} — Reasons: ${reasons}`;
    }
    case "A.5A": case "A.5B": case "A.12E": case "A.3B": case "A.2B":
    case "A.2D": case "A.3C": case "A.2C": case "A.12A": case "A.2A":
    case "A.2E": case "A.3E": case "A.4C": case "A.4B": case "A.3F":
    case "A.5C": case "A.2I": case "A.3D": case "A.3H": case "A.11B":
    case "A.11A": case "A.12D": case "A.12C": case "A.10A": case "A.10D":
    case "A.10B": case "A.10E": case "A.10F": case "A.6A": case "A.7A":
    case "A.7C": case "A.6B": case "A.8A": case "A.6C": case "A.9A":
    case "A.9B": case "A.9E":
      return formatAlgebra1Answer(p);
    case "A2.4": case "A2.5": case "A2.7": case "A2.8":
    case "A2.11": case "A2.12": case "A2.S": case "A2.C":
      return formatAlgebra2Answer(p);
    case "MS.6":
    case "MS.7":
    case "MS.8":
      return latexToText(p.answer);
    case "SAT":
      return p.format === "GridIn" && p.acceptedForms && p.acceptedForms.length > 1
        ? `${latexToText(p.key)} (also: ${p.acceptedForms.filter((f) => f !== p.key).map(latexToText).join(", ")})`
        : latexToText(p.key);
    case "PRECALC_MCQ":
      return formatPrecalcAnswer(p);
    case "CALC_MCQ":
      return latexToText(p.answer);
    case "AP_FRQ":
      return p.subject === "precalc"
        ? formatPrecalcAnswer(p as PrecalcFRQ)
        : formatCalculusAnswer(p);
    default:
      return "";
  }
}
