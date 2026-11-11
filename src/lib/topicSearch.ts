// ── Topic search: plain words or a standard code ────────────────────────────
// Teachers type what they call a skill ("foil", "soh cah toa", "pemdas") or
// the standard they're covering ("G.5(D)", "2A.4F", "6.3"). Lesson names are
// skill names, not any one textbook's, so the search has to bridge the
// everyday words to them. Pure functions, no React, so the picker and the
// tests share one matcher.

export interface SearchableEntry {
  id: string;
  title: string;
  course: string;
  group: string;
  teks: string;
  description?: string;
  story?: string;
}

/** Everyday words → words that appear in lesson names. Keys are matched as
 *  whole words or phrases; every target is tried as its own query. */
export const SEARCH_SYNONYMS: Record<string, string[]> = {
  foil: ['multiplying binomials'],
  'box method': ['multiplying binomials'],
  gcf: ['greatest common factor'],
  lcm: ['least common multiple'],
  pemdas: ['order of operations'],
  gemdas: ['order of operations'],
  'y=mx+b': ['slope-intercept'],
  'slope intercept': ['slope-intercept'],
  'point slope': ['point-slope'],
  sohcahtoa: ['trig ratios'],
  'soh cah toa': ['trig ratios'],
  'sine cosine tangent': ['trig ratios'],
  sin: ['sine'],
  cos: ['cosine'],
  tan: ['tangent'],
  trigonometry: ['trig'],
  pythagorean: ['pythagorean theorem'],
  pythag: ['pythagorean theorem'],
  log: ['logarithm'],
  logs: ['logarithm'],
  ln: ['natural logarithm'],
  parabola: ['quadratic'],
  parabolas: ['quadratic'],
  imaginary: ['complex numbers'],
  'x-intercepts': ['zeros'],
  'x intercepts': ['zeros'],
  roots: ['zeros', 'roots'],
  matrix: ['matrices', 'matrix'],
  reflection: ['transformations'],
  reflections: ['transformations'],
  rotation: ['transformations'],
  rotations: ['transformations'],
  dilation: ['dilations'],
  'rigid motion': ['rigid motions'],
  'mean median mode': ['measures of center'],
  mean: ['measures of center', 'mean'],
  median: ['measures of center'],
  mode: ['measures of center'],
  mad: ['mean absolute deviation'],
  'distance formula': ['distance and midpoint'],
  'midpoint formula': ['distance and midpoint'],
  combinations: ['permutations & combinations'],
  permutations: ['permutations & combinations'],
  'exponent rules': ['exponents'],
  'laws of exponents': ['exponents'],
  'scientific notation': ['scientific notation'],
  sector: ['area of a sector'],
  'two column': ['proofs'],
  'two-column': ['proofs'],
  abs: ['absolute value'],
  'absolute value': ['absolute value'],
  'synthetic division': ['dividing polynomials'],
  'long division': ['dividing polynomials'],
  'difference of squares': ['special factoring'],
  'perfect square': ['special factoring', 'completing the square'],
  'unit rate': ['ratios & rates'],
  'unit rates': ['ratios & rates'],
  'like terms': ['equivalent expressions', 'expanding'],
  'inverse trig': ['trig ratios: solving for angles'],
  'line of best fit': ['trend lines', 'regression'],
  'best fit': ['trend lines', 'regression'],
  'stem and leaf': ['data displays'],
  'box plot': ['data displays'],
  'box and whisker': ['data displays'],
  histogram: ['data displays'],
};

const STOP_WORDS = new Set(['a', 'an', 'and', 'the', 'of', 'to', 'in', 'for', 'with', 'on', '&']);

/** Lowercase, curly quotes straightened, runs of spaces collapsed. */
function clean(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** A standard code with everything but letters and digits removed:
 *  "G.5(D)" → "g5d", "2A.4F" → "2a4f", "HSA-REI.B.3" → "hsareib3". */
export function normalizeCode(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** True for a query token that reads as a standard code, not a word:
 *  it has a digit next to a dot, or is letters/digits with a digit and a
 *  dot or parenthesis ("G.5(D)", "2A.4F", "6.3", "8.EE.A.1"). */
export function looksLikeCode(token: string): boolean {
  if (!/\d/.test(token)) return false;
  if (/[²³^+=*/<>]/.test(token)) return false;
  return /\d\.|\.\d|\(\w\)/.test(token);
}

/** Codes an entry is filed under, in every framework label it shows. */
function codesOf(labels: string[]): string[] {
  const out: string[] = [];
  for (const label of labels) {
    for (const part of label.split(/·|,|;|\s+/)) {
      const n = normalizeCode(part);
      if (n) out.push(n);
    }
  }
  return out;
}

/** One code query against one code: exact, or the query stops where the code
 *  switches between digits and letters, so a whole standard finds its parts
 *  ("g5" finds "g5d", "gcoc" finds "gcoc10") but "g1" never finds "g10a". */
function codeMatches(query: string, code: string): boolean {
  if (code === query) return true;
  if (!code.startsWith(query)) return false;
  const last = query.charAt(query.length - 1);
  const next = code.charAt(query.length);
  return /\d/.test(last) !== /\d/.test(next);
}

function codeQueryMatches(token: string, codes: string[]): boolean {
  const q = normalizeCode(token);
  if (!q) return false;
  // Algebra II is written both 2A.4F (TEKS) and A2.4F (some districts).
  const variants = q.startsWith('a2') ? [q, '2a' + q.slice(2)] : [q];
  return variants.some((v) => codes.some((c) => codeMatches(v, c)));
}

/** Singular/plural variants so "inequality" finds "Inequalities". */
function wordVariants(w: string): string[] {
  const out = new Set([w]);
  if (w.endsWith('ies') && w.length > 4) out.add(w.slice(0, -3) + 'y');
  else if (w.endsWith('y') && w.length > 3) out.add(w.slice(0, -1) + 'ies');
  if (w.endsWith('es') && w.length > 4) out.add(w.slice(0, -2));
  if (w.endsWith('s') && w.length > 3) out.add(w.slice(0, -1));
  return [...out];
}

/** Whole query plus one alternative per synonym phrase it contains. */
export function expandQuery(query: string): string[] {
  const q = clean(query);
  if (!q) return [];
  const out = [q];
  for (const [key, targets] of Object.entries(SEARCH_SYNONYMS)) {
    const re = new RegExp(`(^|[^a-z0-9])${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`);
    if (!re.test(q)) continue;
    for (const t of targets) {
      const alt = clean(q.replace(re, `$1${t}$2`));
      if (!out.includes(alt)) out.push(alt);
    }
  }
  return out;
}

function tokens(q: string): string[] {
  return q.split(' ').filter((t) => t && !STOP_WORDS.has(t));
}

/** Searchable text and codes for one entry, built once per entry. */
export interface EntryIndex {
  text: string;
  codes: string[];
  labels: string;
}

export function indexEntry(e: SearchableEntry, extraLabels: string[] = []): EntryIndex {
  const labels = [e.teks, ...extraLabels];
  return {
    text: clean([e.title, e.group, e.course, e.description ?? '', e.story ?? ''].join(' • ')),
    codes: codesOf(labels),
    labels: clean(labels.join(' · ')),
  };
}

/** True when `w` starts a word somewhere in `text` ("cos" finds "Cosine",
 *  but "sin" doesn't find "Using"). */
function hasWordPrefix(text: string, w: string): boolean {
  let at = text.indexOf(w);
  while (at !== -1) {
    if (at === 0 || !/[a-z0-9]/.test(text.charAt(at - 1))) return true;
    at = text.indexOf(w, at + 1);
  }
  return false;
}

function alternativeMatches(alt: string, ix: EntryIndex): boolean {
  const toks = tokens(alt);
  if (toks.length === 0) return false;
  return toks.every((t) =>
    looksLikeCode(t)
      ? codeQueryMatches(t, ix.codes)
      : wordVariants(t).some((v) => hasWordPrefix(ix.text, v) || hasWordPrefix(ix.labels, v)),
  );
}

/** Does this entry answer the query? An empty query matches everything. */
export function entryMatches(query: string, ix: EntryIndex): boolean {
  const q = clean(query);
  if (!q) return true;
  // A code typed with spaces ("G.5 (D)") is still one code. Codes match
  // code by code, never as loose text, so "G.5" can't find "MA.AG.5".
  if (looksLikeCode(q.replace(/\s+/g, ''))) {
    if (codeQueryMatches(q, ix.codes)) return true;
  } else if (ix.labels.includes(q)) {
    // Words typed into a standards label still match it ("no direct").
    return true;
  }
  return expandQuery(q).some((alt) => alternativeMatches(alt, ix));
}
