// harness.ts
// Shared test utilities for the calculus area.
//
// INDEPENDENCE CONTRACT: every numeric routine here is reimplemented from
// scratch (direct Math.pow summation, central differences, composite
// Simpson). Nothing is imported from the factory internals except TYPES
// (type-only imports are erased at compile time). A passing suite therefore
// means two genuinely separate code paths agree.

import type { CalcFunction } from "@/lib/factories/CalculusUtils";

let checks = 0;
let failures: string[] = [];

export function reset(): void {
  checks = 0;
  failures = [];
}

export function check(cond: boolean, msg: string): void {
  checks++;
  if (!cond) failures.push(msg);
}

export function checkClose(actual: number, expected: number, tol: number, msg: string): void {
  checks++;
  if (!isFinite(actual) || !isFinite(expected) || Math.abs(actual - expected) > tol) {
    failures.push(`${msg} — got ${actual}, want ${expected} ± ${tol}`);
  }
}

export function checkEqual<T>(actual: T, expected: T, msg: string): void {
  checks++;
  if (actual !== expected) failures.push(`${msg} — got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
}

export function stats(): { checks: number; failures: string[] } {
  return { checks, failures };
}

// ── Independent evaluator (direct summation, not Horner) ─────────────────────

export function indepEval(fn: CalcFunction, x: number): number {
  switch (fn.kind) {
    case "poly": {
      let s = 0;
      const deg = fn.coeffs.length - 1;
      for (let i = 0; i < fn.coeffs.length; i++) s += fn.coeffs[i] * Math.pow(x, deg - i);
      return s;
    }
    case "rational": {
      const d = indepEval({ kind: "poly", coeffs: fn.den }, x);
      if (d === 0) return NaN;
      return indepEval({ kind: "poly", coeffs: fn.num }, x) / d;
    }
    case "trig": {
      const t = fn.freq * x + fn.phase;
      const b = fn.base === "sin" ? Math.sin(t) : fn.base === "cos" ? Math.cos(t) : Math.tan(t);
      return fn.amp * b + fn.shift;
    }
    case "exp":
      return fn.coeff * Math.exp(fn.rate * x);
    case "piecewiseLinear": {
      const pts = fn.points;
      if (pts.length === 0) return NaN;
      if (x < pts[0].x || x > pts[pts.length - 1].x) return NaN;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        if (x >= a.x && x <= b.x) {
          if (b.x === a.x) return a.y;
          return a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y);
        }
      }
      return NaN;
    }
  }
}

/** Central-difference derivative. */
export function numDiff(fn: CalcFunction, x: number, h = 1e-5): number {
  return (indepEval(fn, x + h) - indepEval(fn, x - h)) / (2 * h);
}

/** Numeric limit: two-sided, one-sided, or at ±infinity. */
export function numLimit(
  fn: CalcFunction,
  opts: { point?: number; side?: "left" | "right"; atInfinity?: "pos" | "neg" }
): number {
  if (opts.atInfinity) {
    const sgn = opts.atInfinity === "pos" ? 1 : -1;
    return indepEval(fn, sgn * 1e6);
  }
  const c = opts.point ?? 0;
  const hs = [0.05, 0.01, 0.002, 0.0004, 0.00008];
  const seq: number[] = [];
  for (const h of hs) {
    if (!opts.side || opts.side === "left") seq.push(indepEval(fn, c - h));
    if (!opts.side || opts.side === "right") seq.push(indepEval(fn, c + h));
  }
  // Richardson-style: return the last (finest) value; caller checks convergence.
  return seq[seq.length - 1];
}

/**
 * Probe for an infinite limit. Returns +1 / -1 when values clearly diverge
 * with a consistent sign and growing magnitude, else 0.
 */
export function probeInfinity(
  fn: CalcFunction,
  opts: { point?: number; side?: "left" | "right"; atInfinity?: "pos" | "neg" }
): number {
  let xs: number[];
  if (opts.atInfinity) {
    const sgn = opts.atInfinity === "pos" ? 1 : -1;
    xs = [1e2, 1e3, 1e4, 1e5].map((m) => sgn * m);
  } else {
    const c = opts.point ?? 0;
    const dir = opts.side === "left" ? -1 : 1;
    xs = [1e-2, 1e-3, 1e-4, 1e-5].map((h) => c + dir * h);
  }
  const vals = xs.map((x) => indepEval(fn, x));
  if (vals.some((v) => !isFinite(v))) return 0;
  const signs = vals.map((v) => (v > 0 ? 1 : v < 0 ? -1 : 0));
  if (signs[0] === 0 || !signs.every((s) => s === signs[0])) return 0;
  const mags = vals.map(Math.abs);
  for (let i = 1; i < mags.length; i++) if (mags[i] < mags[i - 1] * 1.5) return 0;
  return signs[0];
}

/** Composite Simpson's rule. */
export function simpson(fn: CalcFunction, a: number, b: number, n = 2000): number {
  if (n % 2 === 1) n++;
  const h = (b - a) / n;
  let s = indepEval(fn, a) + indepEval(fn, b);
  for (let i = 1; i < n; i++) {
    s += indepEval(fn, a + i * h) * (i % 2 === 0 ? 2 : 4);
  }
  return (s * h) / 3;
}

/** Scan for critical points of fn on [lo, hi] via numeric-derivative sign changes. */
export function findCriticalPoints(fn: CalcFunction, lo: number, hi: number): number[] {
  const out: number[] = [];
  const n = 400;
  let prevX = lo;
  let prevD = numDiff(fn, lo);
  for (let i = 1; i <= n; i++) {
    const x = lo + ((hi - lo) * i) / n;
    const d = numDiff(fn, x);
    if (prevD === 0) out.push(prevX);
    else if (d === 0) out.push(x);
    else if ((prevD > 0) !== (d > 0)) {
      // bisect
      let a = prevX;
      let b = x;
      for (let k = 0; k < 40; k++) {
        const m = (a + b) / 2;
        const dm = numDiff(fn, m);
        if ((numDiff(fn, a) > 0) !== (dm > 0)) b = m;
        else a = m;
      }
      out.push((a + b) / 2);
    }
    prevX = x;
    prevD = d;
  }
  return out;
}

// ── Answer parsing ────────────────────────────────────────────────────────────

/** Parse the leading numeric value of an answer string. */
export function parseAnswerNumber(s: string): number {
  const t = s.replace(/−/g, "-").replace(/,/g, "").trim();
  const approx = t.match(/≈\s*(-?[\d.]+)/);
  if (approx) return parseFloat(approx[1]);
  const m = t.match(/^(-?[\d.]+)(?:\s*\/\s*(-?[\d.]+))?/);
  if (!m) return NaN;
  const num = parseFloat(m[1]);
  if (m[2] !== undefined) {
    const den = parseFloat(m[2]);
    if (den === 0) return NaN;
    return num / den;
  }
  return num;
}

/** Independent line formatter (same spec as the factory's lineText, separate code). */
export function indepLineText(m: number, b: number): string {
  const fmt = (v: number): string => {
    if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v)).replace("-", "−");
    for (let q = 2; q <= 12; q++) {
      const p = Math.round(v * q);
      if (Math.abs(v - p / q) < 1e-9) {
        const g = gcd(Math.abs(p), q);
        return `${p / g}/${q / g}`.replace("-", "−");
      }
    }
    return String(Math.round(v * 1e4) / 1e4).replace("-", "−");
  };
  const mT =
    Math.abs(m - 1) < 1e-12 ? "x" : Math.abs(m + 1) < 1e-12 ? "−x" : `${fmt(m)}x`;
  if (Math.abs(m) < 1e-12) return `y = ${fmt(b)}`;
  if (Math.abs(b) < 1e-12) return `y = ${mT}`;
  return b > 0 ? `y = ${mT} + ${fmt(b)}` : `y = ${mT} − ${fmt(-b)}`;
}

function gcd(a: number, b: number): number {
  while (b > 0) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a || 1;
}

/** PDF-safety: DejaVu Serif covers everything we emit except ≅ (must not appear). */
export function checkPdfSafe(s: string, where: string): void {
  checks++;
  if (s.includes("≅")) failures.push(`${where}: contains ≅ (not in DejaVu Serif)`);
  checks++;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(s)) failures.push(`${where}: contains control characters`);
}
