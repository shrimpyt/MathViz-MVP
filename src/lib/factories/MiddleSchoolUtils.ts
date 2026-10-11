// MiddleSchoolUtils.ts
// Pure helpers shared by the middle-school factories: fractions, formatting,
// and small RNG conveniences. No JSX, no side effects.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";

// ── Greatest common divisor ─────────────────────────────────────────────────

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a === 0 ? 1 : a;
}

export function lcm(a: number, b: number): number {
  return (Math.abs(a * b) / gcd(a, b)) || 1;
}

// ── Fractions ─────────────────────────────────────────────────────────────────

export interface Frac {
  n: number; // numerator (may be negative)
  d: number; // denominator, always positive after reduce
}

/** Build a reduced fraction from numerator/denominator. */
export function makeFrac(n: number, d: number): Frac {
  if (d === 0) throw new Error("makeFrac: denominator 0");
  const g = gcd(n, d);
  n = n / g;
  d = d / g;
  if (d < 0) {
    n = -n;
    d = -d;
  }
  return { n, d };
}

/** Random reduced fraction with denominator in 2..maxDen (inclusive). */
export function randFrac(rng: RNG, maxDen = 10, maxNum?: number): Frac {
  const d = randInt(rng, 2, maxDen);
  const n = randInt(rng, 1, maxNum ?? d * 2);
  return makeFrac(n, d);
}

export function fracAdd(a: Frac, b: Frac): Frac {
  return makeFrac(a.n * b.d + b.n * a.d, a.d * b.d);
}
export function fracSub(a: Frac, b: Frac): Frac {
  return makeFrac(a.n * b.d - b.n * a.d, a.d * b.d);
}
export function fracMul(a: Frac, b: Frac): Frac {
  return makeFrac(a.n * b.n, a.d * b.d);
}
export function fracDiv(a: Frac, b: Frac): Frac {
  return makeFrac(a.n * b.d, a.d * b.n);
}
export function fracValue(f: Frac): number {
  return f.n / f.d;
}

/** "3/4", "-2/5", or "5" when the denominator reduces to 1. */
export function fracToString(f: Frac): string {
  if (f.d === 1) return String(f.n);
  return `${f.n}/${f.d}`;
}

/** Mixed-number string: 7/3 -> "2 1/3". Falls back to fracToString otherwise. */
export function fracToMixed(f: Frac): string {
  const whole = Math.trunc(f.n / f.d);
  const rem = Math.abs(f.n % f.d);
  if (rem === 0) return String(whole);
  if (whole === 0) return fracToString(f);
  const sign = f.n < 0 ? "-" : "";
  return `${sign}${Math.abs(whole)} ${rem}/${f.d}`;
}

// ── Number formatting ─────────────────────────────────────────────────────────

/** Round to `places` decimals. */
export function roundTo(n: number, places: number): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

/** Trim trailing zeros: 4.50 -> "4.5", 3 -> "3". */
export function fmt(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  const r = roundTo(n, 10);
  return String(r);
}

/** Format with exactly `places` decimals (for money etc.). */
export function fmtFixed(n: number, places: number): string {
  return roundTo(n, places).toFixed(places);
}

// ── Small RNG conveniences ────────────────────────────────────────────────────

/** Random integer in [min, max] that is never 0. */
export function randNonZero(rng: RNG, min: number, max: number): number {
  let v = 0;
  while (v === 0) v = randInt(rng, min, max);
  return v;
}

/** Random choice that is not equal to `not` (tries up to 20 times). */
export function pickNot<T>(rng: RNG, arr: readonly T[], not: T): T {
  let v = pick(rng, arr);
  for (let i = 0; i < 20 && v === not; i++) v = pick(rng, arr);
  return v;
}

/** Shuffle a copy of an array (Fisher–Yates). */
export function shuffled<T>(rng: RNG, arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Sign of n as "+" or "−" for display in expressions like "3x − 5". */
export function signStr(n: number): "+" | "−" {
  return n < 0 ? "−" : "+";
}

/** "5", "−3", "+7": signed display of an integer (no + for 0). */
export function signed(n: number): string {
  if (n === 0) return "0";
  return n < 0 ? `−${Math.abs(n)}` : `+${n}`;
}

/** Term string for a linear expression: coefficient 1/-1 become x/-x. */
export function coeffTerm(coeff: number, variable = "x"): string {
  if (coeff === 1) return variable;
  if (coeff === -1) return `−${variable}`;
  return `${coeff}${variable}`;
}

/**
 * Join terms into an expression string, e.g. ["3x", "-5", "2x"] is handled
 * per-term: joinTerms("3x", "−5") -> "3x − 5".
 */
export function joinTerms(...terms: string[]): string {
  return terms
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .join(" ")
    .replace(/\+ -/g, "− ")
    .replace(/\+ −/g, "− ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Format a linear equation "ax + b = cx + d" with nice signs. */
export function linearEquation(a: number, b: number, c: number, d: number, variable = "x"): string {
  const lhs = b === 0 ? coeffTerm(a, variable) : `${coeffTerm(a, variable)} ${signStr(b)} ${Math.abs(b)}`;
  const rhs = d === 0 ? coeffTerm(c, variable) : `${coeffTerm(c, variable)} ${signStr(d)} ${Math.abs(d)}`;
  return `${lhs} = ${rhs}`;
}

/** Format "ax + b = c". */
export function twoStepEquation(a: number, b: number, c: number, variable = "x"): string {
  const lhs = b === 0 ? coeffTerm(a, variable) : `${coeffTerm(a, variable)} ${signStr(b)} ${Math.abs(b)}`;
  return `${lhs} = ${c}`;
}
