// answerKey.ts
// Helpers for rendering math answers and instruction text as plain unicode.
// Factories emit LaTeX-flavoured strings (e.g. "5\sqrt{2}", "\(sin \theta\)").
// The web preview and the PDF both need human-readable text, and @react-pdf
// cannot run KaTeX, so we convert to unicode instead of typesetting.

import type { MathProblem } from "./types";
import type { PrecalcFRQ } from "./factories/PrecalcTypes";
import { formatAlgebra1Answer } from "@/modules/algebra-1";
import { formatAlgebra2Answer } from "./factories/Algebra2Types";
import { formatPrecalcAnswer } from "./factories/PrecalcTypes";
import { formatCalculusAnswer } from "./factories/CalculusUtils";
import { formatGeometryAnswer } from "./factories/GeometryTypes";
import type { GeometryProblem } from "./factories/GeometryTypes";

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

// Every command is anchored with (?![a-zA-Z]) so a short name never matches
// inside a longer one: \le must not eat the start of \left, \pm of \pmod,
// \ne of \neq.
const SYMBOLS: [RegExp, string][] = [
  [/\^\\circ(?![a-zA-Z])/g, "°"], // 37^\circ → 37°
  [/\\times(?![a-zA-Z])/g, "×"],
  [/\\div(?![a-zA-Z])/g, "÷"],
  [/\\cdot(?![a-zA-Z])/g, "·"],
  [/\\pmod\s*\{([^{}]*)\}/g, "(mod $1)"],
  [/\\pm(?![a-zA-Z])/g, "±"],
  [/\\mp(?![a-zA-Z])/g, "∓"],
  [/\\approx(?![a-zA-Z])/g, "≈"],
  [/\\neq?(?![a-zA-Z])/g, "≠"],
  [/\\leq?(?![a-zA-Z])/g, "≤"],
  [/\\geq?(?![a-zA-Z])/g, "≥"],
  [/\\theta(?![a-zA-Z])/g, "θ"],
  [/\\pi(?![a-zA-Z])/g, "π"],
  [/\\alpha(?![a-zA-Z])/g, "α"],
  [/\\beta(?![a-zA-Z])/g, "β"],
  [/\\gamma(?![a-zA-Z])/g, "γ"],
  [/\\delta(?![a-zA-Z])/g, "δ"],
  [/\\angle(?![a-zA-Z])/g, "∠"],
  [/\\cong(?![a-zA-Z])/g, "≅"],
  [/\\sim(?![a-zA-Z])/g, "~"],
  [/\\circ(?![a-zA-Z])/g, "°"],
  [/\\degree(?![a-zA-Z])/g, "°"],
  [/\\infty(?![a-zA-Z])/g, "∞"],
  [/\\to(?![a-zA-Z])/g, "→"],
  [/\\in(?![a-zA-Z])/g, "∈"],
  [/\\cup(?![a-zA-Z])/g, "∪"],
  [/\\cap(?![a-zA-Z])/g, "∩"],
  [/\\emptyset(?![a-zA-Z])/g, "∅"],
  [/\\varnothing(?![a-zA-Z])/g, "∅"],
  [/\\perp(?![a-zA-Z])/g, "⊥"],
  [/\\parallel(?![a-zA-Z])/g, "∥"],
  [/\\triangle(?![a-zA-Z])/g, "△"],
];

// Placeholders for literal braces (\{ \}) so the {…} group regexes below
// never mistake set braces for LaTeX argument braces.
const LBRACE = "\u0002";
const RBRACE = "\u0003";
const CARET = "\u0004";

function mapChars(s: string, table: Record<string, string>): string {
  return s.split("").map((c) => table[c] ?? c).join("");
}

/** True when `t` is a single parenthesized unit: "(x - 3)", "((a))". */
function wrapsWhole(t: string): boolean {
  if (!t.startsWith("(") || !t.endsWith(")")) return false;
  let depth = 0;
  for (let i = 0; i < t.length; i++) {
    if (t[i] === "(") depth++;
    else if (t[i] === ")") {
      depth--;
      if (depth === 0 && i < t.length - 1) return false;
    }
  }
  return depth === 0;
}

/**
 * A multi-term radicand needs visible grouping once the radical sign loses
 * its overbar: "\sqrt{x - 3}" must read "√(x - 3)", not "√x - 3" (which
 * parses as (√x) - 3). Single terms stay bare: "\sqrt{5}" → "√5",
 * "\sqrt{2x}" → "√2x". A leading minus belongs to the radicand's value,
 * not its term structure, so it is ignored for the multi-term test.
 */
function groupRadicand(rad: string): string {
  const t = rad.trim();
  if (t === "" || wrapsWhole(t)) return t;
  const body = t.startsWith("-") ? t.slice(1) : t;
  const multiTerm = /[+\-/]/.test(body) || /\s/.test(body);
  return multiTerm ? `(${t})` : t;
}

/**
 * Radical forms, applied after \frac (so a fraction inside a radicand has
 * already become "a/b" and is grouped as a multi-term radicand).
 */
function replaceRoots(s: string): string {
  s = s.replace(/\\sqrt\[3\]\s*\{([^{}]*)\}/g, (_m, r: string) => `∛${groupRadicand(r)}`);
  s = s.replace(/\\sqrt\[4\]\s*\{([^{}]*)\}/g, (_m, r: string) => `∜${groupRadicand(r)}`);
  s = s.replace(/\\sqrt\[(\d+)\]\s*\{([^{}]*)\}/g, (_m, n: string, r: string) => `√[${n}]${groupRadicand(r)}`);
  s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, (_m, r: string) => `√${groupRadicand(r)}`);
  return s;
}

/** True when a fraction part reads unambiguously without parentheses:
 *  a number, a single letter or Greek symbol (with optional super/subscript),
 *  or something already wrapped in one pair of parentheses. */
function isAtomic(t: string): boolean {
  if (wrapsWhole(t)) return true;
  if (/^-?\d+(\.\d+)?$/.test(t)) return true;
  return /^[a-zA-Zπθαβγδ][⁰¹²³⁴⁵⁶⁷⁸⁹⁻ⁿˣⁱᵃᵒ₀₁₂₃₄₅₆₇₈₉ₙₓᵢₐₒₑ]*$/.test(t);
}

/** More than one additive term ("x + 1", "2 - x"); a leading sign alone
 *  doesn't count. Terms inside parentheses don't count either. */
function hasAdditiveTerms(t: string): boolean {
  let depth = 0;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (depth === 0 && i > 0 && (c === "+" || c === "-" || c === "−" || c === "±" || c === "∓")) return true;
  }
  return false;
}

/**
 * "\frac{a}{b}" as inline text. Once the fraction bar is gone, grouping must
 * be written out: \frac{x+1}{x-1} → "(x + 1)/(x - 1)", \frac{4}{x^2+4x} →
 * "4/(x² + 4x)", \frac{3}{2x} → "3/(2x)". Simple parts stay bare: "1/2",
 * "3x/4", "1/x²". A coefficient written \frac{1}{2}x stays "1/2x", the usual
 * answer-key convention for (1/2)x.
 */
function inlineFraction(num: string, den: string): string {
  const n = num.trim();
  const d = den.trim();
  const nn = (hasAdditiveTerms(n) || n.includes("/")) && !wrapsWhole(n) ? `(${n})` : n;
  const dd = isAtomic(d) ? d : `(${d})`;
  return `${nn}/${dd}`;
}

/** Superscript group as unicode when every character has a superscript
 *  form; otherwise "^(…)" so it can't fuse with the base: (1.05)^{t} →
 *  "(1.05)^t", Pe^{rt} → "Pe^(rt)". */
function superscript(g: string): string {
  if (g.split("").every((c) => SUPERSCRIPT[c] !== undefined)) return mapChars(g, SUPERSCRIPT);
  // CARET stands in for "^" until the end, so the bare-caret rule below
  // doesn't turn this "(" into a superscript one.
  return g.length === 1 ? `${CARET}${g}` : `${CARET}(${g})`;
}

function subscript(g: string): string {
  if (g.split("").every((c) => SUBSCRIPT[c] !== undefined)) return mapChars(g, SUBSCRIPT);
  return `_${g}`;
}

/**
 * Convert a LaTeX-flavoured string to readable unicode text.
 * Safe to call on plain text, it passes through unchanged.
 */
export function latexToText(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return "";
  let s = String(input);

  // Strip inline/display math delimiters: \( \) \[ \] and $
  // A $ directly before a digit is currency, not a delimiter (word problems
  // price things: "a $12 sign-up fee"). Protect currency through the strip
  // and restore it after, or every price loses its dollar sign.
  s = s.replace(/\\\(|\\\)|\\\[|\\\]/g, "");
  s = s.replace(/\$(?=\d)/g, "\u0001");
  s = s.replace(/\$/g, "");
  s = s.replace(/\u0001/g, "$");

  // Literal set braces and spacing/sizing commands carry no math.
  s = s.replace(/\\\{/g, LBRACE).replace(/\\\}/g, RBRACE);
  s = s.replace(/\\(left|right)(?![a-zA-Z])\s*([()[\]|.]|\u0002|\u0003)?/g, (_m, _w: string, d?: string) =>
    d === undefined || d === "." ? "" : d,
  );
  s = s.replace(/\\[,;:!]/g, " ").replace(/\\q?quad(?![a-zA-Z])/g, " ");
  s = s.replace(/\\(?:d|t)frac(?![a-zA-Z])/g, "\\frac");
  // \text{ or }, \mathrm{cm}, \textbf{…}: keep the words, drop the command.
  s = s.replace(/\\(?:text|textbf|textit|mathrm|mathbf|mathit|operatorname)\s*\{([^{}]*)\}/g, " $1 ");
  // \overline{AB} → AB (the segment bar can't be drawn in plain text).
  s = s.replace(/\\(?:overline|overleftrightarrow|overrightarrow|vec|bar)\s*\{([^{}]*)\}/g, "$1");
  s = s.replace(/\^\\circ(?![a-zA-Z])/g, "°");

  // Sub/superscripts before fractions, so \frac{1}{x^{2}} has no inner braces.
  s = s.replace(/_\{([^{}]*)\}/g, (_m, g: string) => subscript(g));
  s = s.replace(/_([0-9+\-nxieao()])/g, (_m, c: string) => SUBSCRIPT[c] ?? c);
  s = s.replace(/\^\{([^{}]*)\}/g, (_m, g: string) => superscript(g));
  s = s.replace(/\^([0-9+\-=nxiao()])/g, (_m, c: string) => SUPERSCRIPT[c] ?? c);

  // ± and ∓ first, so a fraction like \frac{3 \pm \sqrt{17}}{4} sees two
  // terms in its numerator and keeps them grouped.
  s = s.replace(/\\pm(?![a-zA-Z])/g, "±").replace(/\\mp(?![a-zA-Z])/g, "∓");

  // Fractions and radicals, innermost first, until none are left. A \frac
  // inside a radicand must already read "a/b" when the radical grouping is
  // decided, and a \sqrt inside a fraction must be gone before the \frac
  // around it can match.
  for (let guard = 0; guard < 12; guard++) {
    let next = s.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, (_m, a: string, b: string) =>
      inlineFraction(a, b),
    );
    next = replaceRoots(next);
    if (next === s) break;
    s = next;
  }
  s = s.replace(/\\sqrt(?![a-zA-Z{[])/g, "√");

  // Common commands → unicode
  for (const [re, rep] of SYMBOLS) {
    s = s.replace(re, rep);
  }

  // Any leftover backslash commands: drop the backslash, keep the name
  s = s.replace(/\\([a-zA-Z]+)/g, "$1");
  s = s.replace(new RegExp(LBRACE, "g"), "{").replace(new RegExp(RBRACE, "g"), "}");
  s = s.replace(new RegExp(CARET, "g"), "^");

  return s.replace(/\s+/g, " ").trim();
}

// ── formatAnswer ──────────────────────────────────────────────────────────────

/**
 * Plain text for the PDF. The worksheet font (Euclid Sans, see
 * src/components/pdfFonts.ts) covers every glyph this module emits, ≅
 * included, and every PDF font stack ends in DejaVu Sans for anything a face
 * lacks, so no look-alike substitution is needed any more. (≅ used to print
 * as ≃ because DejaVu Serif has no U+2245.)
 */
export function pdfSafeText(input: string | number | null | undefined): string {
  return latexToText(input);
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
  if ((p as { type: string }).type.startsWith("GEO.")) {
    return formatGeometryAnswer(p as GeometryProblem);
  }
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
      // The answer key must list each step's reason, a bare "I.1, Q.E.D."
      // is ungradeable for proof-fill-reasons worksheets. Mirrors the
      // "Reasons:" convention of formatClassicalKeyLine.
      const header = p.elementsProposition ? `${p.elementsProposition}, Q.E.D.` : p.prove;
      const steps = Array.isArray(p.steps) ? p.steps.filter((s) => s.statement !== "Q.E.D.") : [];
      if (steps.length === 0) return header;
      const reasons = steps.map((s, i) => `Step ${i + 1}: ${s.reason}`).join("; ");
      return `${header}, Reasons: ${reasons}`;
    }
    case "A.5A": case "A.5B": case "A.12E": case "A.3B": case "A.2B":
    case "A.2D": case "A.3C": case "A.2C": case "A.12A": case "A.2A":
    case "A.2E": case "A.3E": case "A.4C": case "A.4B": case "A.3F":
    case "A.5C": case "A.2I": case "A.3D": case "A.3H": case "A.11B":
    case "A.11A": case "A.12D": case "A.12C": case "A.10A": case "A.10D":
    case "A.10B": case "A.10E": case "A.10F": case "A.6A": case "A.7A":
    case "A.7C": case "A.6B": case "A.8A": case "A.6C": case "A.9A":
    case "A.9B": case "A.9E":
    case "A.10C": case "A.2H": case "A.2G": case "A.3A": case "A.3G":
    case "A.7B": case "A.9C": case "A.9D": case "A.4A": case "A.8B":
      return formatAlgebra1Answer(p);
    case "A2.2": case "A2.3":
    case "A2.4": case "A2.5": case "A2.6": case "A2.7": case "A2.8":
    case "A2.9": case "A2.10":
    case "A2.11": case "A2.12": case "A2.S": case "A2.C":
      return formatAlgebra2Answer(p);
    case "MS.6":
    case "MS.7":
    case "MS.8": {
      // Word problems carry their unit on the problem (months, feet,
      // dollars): the key should show it, unless the answer already does.
      const base = latexToText(p.answer);
      const unit = (p as { unit?: string }).unit;
      if (unit && !base.includes(unit) && !(unit === "dollars" && base.includes("$"))) {
        return `${base} ${unit}`;
      }
      return base;
    }
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

/**
 * Text for a step blank whose answer is shown (Review, Classical, a revealed
 * Guided Note). Shown bare after its step, an answer can read as part of the
 * step: "Take the square root: b = √64. 8". So a label that ends in a
 * relation ("b =", "x ≈") is kept with the answer ("b = 8"), and an answer
 * that follows a finished sentence gets its label ("Answer: 58°"). An answer
 * after a colon, or one whose label is a fill-in pattern ("½ × ?"), stays bare.
 */
export function revealedBlankText(instruction: string, label: string, answer: string): string {
  const lbl = (label ?? "").trim();
  const ans = String(answer ?? "").trim();
  if (!lbl || lbl.includes("?")) return ans;
  if (/[=≈<>≤≥]$/.test(lbl)) {
    const name = lbl.replace(/\s*[=≈<>≤≥]$/, "").trim();
    // Avoid "x = x = 7" when the answer already names its variable.
    if (name && ans.replace(/\s+/g, "").startsWith(name.replace(/\s+/g, "") + lbl.slice(-1))) return ans;
    return `${lbl} ${ans}`;
  }
  if (/[.!?]\s*$/.test(instruction ?? "")) {
    return `${lbl.charAt(0).toUpperCase()}${lbl.slice(1)}: ${ans}`;
  }
  return ans;
}
