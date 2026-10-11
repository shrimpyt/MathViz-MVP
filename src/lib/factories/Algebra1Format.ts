// Algebra1Format.ts
// Pure formatting helpers for Algebra 1 problem text.
// Everything here emits LaTeX-flavoured strings; the renderers convert
// them to unicode via latexToText() / pdfSafeText().

/** Greatest common divisor (always ≥ 0). */
export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}

/**
 * Format num/den as a reduced fraction.
 * Returns an integer when it divides evenly, e.g. "3", "-2",
 * otherwise a LaTeX fraction like "\frac{3}{2}" or "-\frac{3}{2}".
 */
export function fmtFrac(num: number, den: number): string {
  if (den === 0) throw new Error("fmtFrac: zero denominator");
  if (den < 0) {
    num = -num;
    den = -den;
  }
  const g = gcd(num, den);
  const n = num / g;
  const d = den / g;
  if (d === 1) return `${n}`;
  if (n < 0) return `-\\frac{${-n}}{${d}}`;
  return `\\frac{${n}}{${d}}`;
}

/** Format a plain number: integers as-is, others to a short decimal. */
export function fmtNum(n: number, digits = 2): string {
  if (Number.isInteger(n)) return `${n}`;
  const r = Number(n.toFixed(digits));
  return `${r}`;
}

/** Sign-aware join helper: returns e.g. " + 5", " - 3", "" for 0. */
function signedTerm(value: number, fmt: (v: number) => string): string {
  if (value === 0) return "";
  return value > 0 ? ` + ${fmt(value)}` : ` - ${fmt(-value)}`;
}

/**
 * Format a polynomial given as coefficients with index = power of x:
 * coeffs = [c0, c1, c2] → "c2x^{2} + c1x + c0".
 * Zero coefficients are skipped; an all-zero polynomial renders "0".
 */
export function fmtPoly(coeffs: number[]): string {
  const parts: string[] = [];
  for (let p = coeffs.length - 1; p >= 0; p--) {
    const c = coeffs[p];
    if (c === 0) continue;
    const abs = Math.abs(c);
    const neg = c < 0;
    let body: string;
    if (p === 0) {
      body = `${abs}`;
    } else if (p === 1) {
      body = abs === 1 ? "x" : `${abs}x`;
    } else {
      body = abs === 1 ? `x^{${p}}` : `${abs}x^{${p}}`;
    }
    if (parts.length === 0) {
      parts.push(neg ? `-${body}` : body);
    } else {
      parts.push(neg ? `- ${body}` : `+ ${body}`);
    }
  }
  return parts.length > 0 ? parts.join(" ") : "0";
}

/** Format a linear expression a·x + b (a may be 0). */
export function fmtLinear(a: number, b: number): string {
  return fmtPoly([b, a]);
}

/** Format the equation y = m·x + b. */
export function fmtLineEq(m: number, b: number): string {
  return `y = ${fmtLinear(m, b)}`;
}

/** Format a linear equation a·x + b = c·x + d. */
export function fmtEquation(a: number, b: number, c: number, d: number): string {
  return `${fmtLinear(a, b)} = ${fmtLinear(c, d)}`;
}

/** Format a point as "(x, y)". */
export function fmtPoint(x: number, y: number): string {
  return `(${fmtNum(x)}, ${fmtNum(y)})`;
}

/** Format a system solution: "(2, -1)", "no solution", "infinitely many solutions". */
export function fmtSystemAnswer(x: number | null, y: number | null): string {
  if (x === null || y === null) return "no solution";
  return fmtPoint(x, y);
}

/**
 * Wrap factors as "(...)" joined with multiplication, e.g.
 * ["x + 3", "x - 2"] → "(x + 3)(x - 2)".
 */
export function fmtFactored(factors: string[]): string {
  return factors.map((f) => `(${f})`).join("");
}

/** Inequality relation → unicode-ish latex symbol. */
export function fmtRel(rel: "<" | ">" | "<=" | ">="): string {
  switch (rel) {
    case "<":
      return "<";
    case ">":
      return ">";
    case "<=":
      return "\\leq";
    case ">=":
      return "\\geq";
  }
}

/** Flip an inequality relation (dividing/multiplying by a negative). */
export function flipRel(rel: "<" | ">" | "<=" | ">="): "<" | ">" | "<=" | ">=" {
  switch (rel) {
    case "<":
      return ">";
    case ">":
      return "<";
    case "<=":
      return ">=";
    case ">=":
      return "<=";
  }
}

/** Multiply two polynomials (index = power). Used by makers, not tests. */
export function polyMul(p: number[], q: number[]): number[] {
  const out = new Array(p.length + q.length - 1).fill(0);
  for (let i = 0; i < p.length; i++) {
    for (let j = 0; j < q.length; j++) {
      out[i + j] += p[i] * q[j];
    }
  }
  return out;
}

/** Add two polynomials (index = power). */
export function polyAdd(p: number[], q: number[]): number[] {
  const n = Math.max(p.length, q.length);
  const out = new Array(n).fill(0);
  for (let i = 0; i < n; i++) out[i] = (p[i] ?? 0) + (q[i] ?? 0);
  return out;
}

/** Subtract q from p (index = power). */
export function polySub(p: number[], q: number[]): number[] {
  const n = Math.max(p.length, q.length);
  const out = new Array(n).fill(0);
  for (let i = 0; i < n; i++) out[i] = (p[i] ?? 0) - (q[i] ?? 0);
  return out;
}
