// Algebra2Helpers.ts
// Shared pure helpers for the Algebra 2 factories: seeded integer helpers,
// small polynomial arithmetic (descending coefficient arrays), and
// LaTeX-flavoured display formatting (rendered via latexToText on the
// presentation side). No JSX, no AI, fully deterministic.

import type { RNG } from "../math-utils";
import { randInt, mulberry32 } from "../math-utils";

// ── Seeded integer helpers ────────────────────────────────────────────────────

/** Random nonzero integer in [min, max]. */
export function randNonZero(rng: RNG, min: number, max: number): number {
  let v = 0;
  while (v === 0) v = randInt(rng, min, max);
  return v;
}

/** Random nonzero integer in [-max, -1] ∪ [1, max]. */
export function randSigned(rng: RNG, max: number): number {
  return randNonZero(rng, -max, max);
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a || 1;
}

/** Reduce n/d; returns [num, den] with den > 0. */
export function reduceFrac(n: number, d: number): [number, number] {
  if (d === 0) throw new Error("reduceFrac: zero denominator");
  const g = gcd(n, d);
  n /= g;
  d /= g;
  if (d < 0) {
    n = -n;
    d = -d;
  }
  return [n, d];
}

// ── Polynomials (descending coefficient arrays: [a_n, ..., a_1, a_0]) ─────────

export type Poly = number[];

/** Remove leading zeros. */
export function polyNorm(p: Poly): Poly {
  const q = [...p];
  while (q.length > 1 && q[0] === 0) q.shift();
  return q;
}

export function polyDegree(p: Poly): number {
  return polyNorm(p).length - 1;
}

export function polyAdd(a: Poly, b: Poly): Poly {
  const n = Math.max(a.length, b.length);
  const out = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const av = i < n - a.length ? 0 : a[i - (n - a.length)];
    const bv = i < n - b.length ? 0 : b[i - (n - b.length)];
    out[i] = av + bv;
  }
  return polyNorm(out);
}

export function polyMul(a: Poly, b: Poly): Poly {
  const out = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j];
  return polyNorm(out);
}

/** Long division of descending polys. Returns { quotient, remainder }. */
export function polyDiv(dividend: Poly, divisor: Poly): { quotient: Poly; remainder: Poly } {
  const dv = polyNorm(divisor);
  if (dv.length === 0 || dv[0] === 0) throw new Error("polyDiv: zero divisor");
  let rem = polyNorm(dividend);
  const qLen = Math.max(rem.length - dv.length + 1, 0);
  const q: Poly = new Array(qLen).fill(0);
  while (rem.length >= dv.length && !(rem.length === 1 && rem[0] === 0)) {
    const coeff = rem[0] / dv[0];
    const pos = qLen - (rem.length - dv.length) - 1;
    q[pos] = coeff;
    const sub = dv.map((c) => c * coeff);
    const padded = [...sub, ...new Array(rem.length - sub.length).fill(0)];
    rem = polyNorm(rem.map((c, i) => c - padded[i]));
    if (qLen === 0) break;
  }
  return { quotient: polyNorm(q.length ? q : [0]), remainder: rem };
}

export function polyEval(p: Poly, x: number): number {
  let acc = 0;
  for (const c of p) acc = acc * x + c;
  return acc;
}

export function polysEqual(a: Poly, b: Poly): boolean {
  const x = polyNorm(a);
  const y = polyNorm(b);
  return x.length === y.length && x.every((c, i) => c === y[i]);
}

// ── Display formatting (LaTeX-flavoured; latexToText renders it) ──────────────

/** "x^3", "x", "5" for a single term a*x^p (no sign handling). */
function termBody(a: number, p: number, variable: string): string {
  const abs = Math.abs(a);
  const coef = abs === 1 && p > 0 ? "" : `${abs}`;
  const xp = p === 0 ? "" : p === 1 ? variable : `${variable}^${p}`;
  return `${coef}${xp}`;
}

/** Polynomial → "x^3 - 2x^2 + 3x - 5". Descending coeffs. */
export function polyToLatex(p: Poly, variable = "x"): string {
  const q = polyNorm(p);
  const deg = q.length - 1;
  let out = "";
  q.forEach((c, i) => {
    const power = deg - i;
    if (c === 0) return;
    const body = termBody(c, power, variable);
    if (out === "") {
      out = (c < 0 ? "-" : "") + body;
    } else {
      out += c < 0 ? ` - ${body}` : ` + ${body}`;
    }
  });
  return out === "" ? "0" : out;
}

/** "(x - 3)" / "(x + 3)" / "(x)" for a linear factor x - r. */
export function linearFactor(r: number, variable = "x"): string {
  if (r === 0) return `(${variable})`;
  return r > 0 ? `(${variable} - ${r})` : `(${variable} + ${-r})`;
}

/** Signed integer with explicit sign: "+ 3" / "- 3" (for building strings). */
export function signed(n: number): string {
  return n < 0 ? `- ${-n}` : `+ ${n}`;
}

/** "a + bi" / "a - bi" for complex numbers (b may be 1). */
export function complexToLatex(re: number, im: number): string {
  const imAbs = Math.abs(im);
  const imPart = imAbs === 1 ? "i" : `${imAbs}i`;
  if (re === 0) return im < 0 ? `-${imPart}` : imPart;
  return `${re} ${im < 0 ? "-" : "+"} ${imPart}`;
}

/** Fraction display: "3/2" or "5" when integral. */
export function fracToLatex(n: number, d: number): string {
  const [rn, rd] = reduceFrac(n, d);
  return rd === 1 ? `${rn}` : `${rn}/${rd}`;
}

/** Point display: "(3, -2)". */
export function pointToLatex(x: number | string, y: number | string): string {
  return `(${x}, ${y})`;
}

// ── Maker selection with difficulty + subtype filtering ───────────────────────

export interface MakerLike {
  minDifficulty: 1 | 2 | 3;
  make: (rng: RNG) => { subtype: string };
}

/**
 * Select makers for a generate() call. Cumulative difficulty filtering, plus
 * an optional `only` subtype restriction for lesson wiring. Mirrors the
 * registry's filterAllowed philosophy: a lesson never generates zero
 * problems — if no maker at this difficulty can produce the requested
 * subtypes, the difficulty filter is widened (the lesson's subtypes win).
 * Selection is deterministic and consumes no caller RNG (probes use throwaway
 * seeds), so seed reproducibility is preserved.
 */
export function selectMakers<M extends MakerLike>(
  makers: readonly M[],
  difficulty: 1 | 2 | 3,
  only?: readonly string[]
): M[] {
  const allowed = makers.filter((m) => m.minDifficulty <= difficulty);
  const pool: M[] = allowed.length > 0 ? allowed : [...makers];
  if (!only) return pool;
  const probe = (m: M): string[] => {
    const seen = new Set<string>();
    for (const s of [13, 7919, 104729]) {
      try {
        seen.add(m.make(mulberry32(s)).subtype);
      } catch {
        /* a maker that throws on a probe seed is skipped for that seed */
      }
    }
    return [...seen];
  };
  const canMake = (m: M) => probe(m).some((st) => only.includes(st));
  const matching = pool.filter(canMake);
  if (matching.length > 0) return matching;
  const wide = makers.filter(canMake);
  return wide.length > 0 ? wide : pool;
}
