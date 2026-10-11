// test-verify.ts
// Independent answer verification for every MCQ maker.
//
// For each maker × seed, the answer is recomputed with the harness's OWN
// numeric routines (central differences, numeric limits, composite Simpson —
// reimplemented in harness.ts, never imported from the factories) and
// compared against the factory's stored answer. Graph features (holes,
// asymptotes, tangent slopes, shade bounds) are checked against computed
// values; table cells are re-evaluated independently.

import { mulberry32 } from "@/lib/math-utils";
import type { CalcMCQProblem, Maker } from "@/lib/factories/CalculusUtils";
import { LIMIT_MAKERS } from "@/lib/factories/CalculusLimits";
import { DERIVATIVE_MAKERS } from "@/lib/factories/CalculusDerivatives";
import { DERIV_APPS_MAKERS } from "@/lib/factories/CalculusDerivApps";
import { INTEGRAL_MAKERS } from "@/lib/factories/CalculusIntegrals";
import {
  reset, check, checkEqual, checkClose, stats,
  indepEval, numDiff, numLimit, probeInfinity, simpson,
  findCriticalPoints, parseAnswerNumber, indepLineText,
} from "./harness";

const SEEDS = 40;

/** Subtypes whose expr-verify fn is a DERIVATIVE of source. */
const DERIV_SUBTYPES = new Set(["PowerRule", "ProductRule", "QuotientRule", "ChainTrigExp"]);
/** Subtypes whose expr-verify fn is an ANTIDERIVATIVE of source. */
const ANTI_SUBTYPES = new Set(["IndefiniteIntegral", "USubstitution"]);

const SAMPLE_TS = [-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2];

function checkExpr(p: CalcMCQProblem, where: string): void {
  const v = p.verify;
  const fn = v.fn!;
  const src = v.source!;
  const isDeriv = DERIV_SUBTYPES.has(p.subtype);
  const isAnti = ANTI_SUBTYPES.has(p.subtype);
  check(isDeriv || isAnti, `${where}: expr subtype class known`);
  let n = 0;
  for (const t of SAMPLE_TS) {
    let lhs: number;
    let rhs: number;
    if (isDeriv) {
      lhs = indepEval(fn, t);
      rhs = numDiff(src, t);
    } else {
      lhs = numDiff(fn, t);
      rhs = indepEval(src, t);
    }
    if (!isFinite(lhs) || !isFinite(rhs)) continue;
    checkClose(lhs, rhs, 1e-3, `${where}: expr sample at t=${t}`);
    n++;
  }
  check(n >= 4, `${where}: enough finite expr samples (${n})`);
}

/** Independent recompute for kind "number" with a source function. */
function checkNumber(p: CalcMCQProblem, where: string): void {
  const v = p.verify;
  const value = v.value!;
  check(isFinite(value), `${where}: verify.value finite`);
  const parsed = parseAnswerNumber(p.answer);
  check(!isNaN(parsed), `${where}: answer parses as number`);
  // display rounding: fmtNum trims to 4 decimals, so allow 1e-4 here
  if (!isNaN(parsed)) checkClose(parsed, value, Math.max(v.tol ?? 1e-6, 1e-4), `${where}: answer ≈ value`);
  if (!v.source) return; // nothing further to check independently
  const src = v.source;
  const tol = Math.max(v.tol ?? 1e-6, 1e-3); // numeric probes carry O(h) error
  switch (p.subtype) {
    case "LimitGraphical":
    case "LimitAlgebraic":
    case "LimitNumerical":
    case "LimitDifferenceQuotient":
      checkClose(numLimit(src, { point: v.point }), value, tol, `${where}: numeric limit`);
      break;
    case "LimitOneSided":
      checkClose(numLimit(src, { point: v.point, side: v.side }), value, tol, `${where}: one-sided numeric limit`);
      break;
    case "LimitEndBehavior":
      checkClose(numLimit(src, { atInfinity: v.atInfinity }), value, 1e-3, `${where}: end-behavior numeric limit`);
      break;
    case "ChainRule":
    case "ChainTrigExp": {
      const x = (v.data?.x as number) ?? 0;
      checkClose(numDiff(src, x), value, tol, `${where}: numeric derivative at x=${x}`);
      break;
    }
    case "TrigDerivative": {
      const angle = v.data?.angle as number;
      check(typeof angle === "number", `${where}: angle in data`);
      checkClose(numDiff(src, angle), value, tol, `${where}: numeric trig derivative`);
      break;
    }
    case "Extrema": {
      const r1 = v.data?.r1 as number;
      const cps = findCriticalPoints(src, -10, 10);
      check(cps.some((c) => Math.abs(c - r1) < 0.06), `${where}: critical point near ${r1} (found ${cps.map((c) => c.toFixed(2))})`);
      check(indepEval(src, r1) > indepEval(src, r1 + 0.5) && indepEval(src, r1) > indepEval(src, r1 - 0.5),
        `${where}: local max at r1`);
      checkClose(indepEval(src, r1), value, tol, `${where}: extremum value`);
      break;
    }
    case "DefiniteIntegral":
    case "AreaBetweenCurves": {
      const a = v.data?.a as number;
      const b = v.data?.b as number;
      if (p.subtype === "AreaBetweenCurves" && (v.data?.k as number) > 0) {
        // crossing variant: integrate |f|
        const k = v.data!.k as number;
        checkClose(absSimpson(src, -k, k), value, 1e-3, `${where}: |f| numeric area`);
      } else {
        check(typeof a === "number" && typeof b === "number", `${where}: bounds in data`);
        if (typeof a === "number" && typeof b === "number")
          checkClose(simpson(src, a, b), value, 1e-3, `${where}: Simpson integral`);
      }
      break;
    }
    case "USubstitution": {
      // definite variant: ∫_0^1 x(x^2+1)^n dx, data = {n}
      const n = v.data?.n as number;
      check(typeof n === "number", `${where}: n in data`);
      if (typeof n === "number") checkClose(simpson(src, 0, 1), value, 1e-3, `${where}: Simpson u-sub`);
      break;
    }
    case "FTC": {
      const variant = v.data?.variant as number;
      if (variant === 0) {
        checkClose(indepEval(src, v.data!.x0 as number), value, tol, `${where}: FTC Part 1`);
      } else {
        const t0 = v.data!.t0 as number;
        const t1 = v.data!.t1 as number;
        const x0 = v.data!.x0 as number;
        checkClose(x0 + simpson(src, t0, t1), value, 1e-3, `${where}: net change`);
      }
      break;
    }
    case "Optimization":
      checkOptimization(p, where);
      break;
    case "RelatedRates":
      checkRelatedRates(p, where);
      break;
    case "ImproperIntegral":
      checkImproper(p, where);
      break;
    default:
      break;
  }
}

/** Simpson's rule on |f| (independent, for the crossing area variant). */
function absSimpson(fn: NonNullable<CalcMCQProblem["verify"]["source"]>, a: number, b: number): number {
  const n = 4000;
  const h = (b - a) / n;
  let s = Math.abs(indepEval(fn, a)) + Math.abs(indepEval(fn, b));
  for (let i = 1; i < n; i++) s += Math.abs(indepEval(fn, a + i * h)) * (i % 2 === 0 ? 2 : 4);
  return (s * h) / 3;
}

function checkOptimization(p: CalcMCQProblem, where: string): void {
  const v = p.verify;
  const value = v.value!;
  const variant = v.data?.variant as number;
  if (variant === 0) {
    const P = v.data!.P as number;
    checkClose((P * P) / 8, value, 1e-9, `${where}: barn-pen optimum`);
  } else if (variant === 1) {
    // independent scan of V(x) = x(12-2x)^2 on [0, 6]
    let best = 0;
    for (let i = 0; i <= 6000; i++) {
      const x = (6 * i) / 6000;
      best = Math.max(best, x * Math.pow(12 - 2 * x, 2));
    }
    checkClose(best, value, 1e-6, `${where}: box optimum scan`);
  } else {
    const V = v.data!.V as number;
    // independent scan of S(r) = 2πr² + 2V/r
    let bestR = 1;
    let bestS = Infinity;
    for (let i = 0; i <= 20000; i++) {
      const r = 0.5 + ((19.5 * i) / 20000);
      const S = 2 * Math.PI * r * r + (2 * V) / r;
      if (S < bestS) { bestS = S; bestR = r; }
    }
    checkClose(bestR, value, 0.01, `${where}: can optimum scan`);
  }
}

function checkRelatedRates(p: CalcMCQProblem, where: string): void {
  const v = p.verify;
  const value = v.value!;
  const variant = v.data?.variant as number;
  if (variant === 0) {
    const L = v.data!.L as number;
    const x = v.data!.x as number;
    const dxdt = v.data!.dxdt as number;
    const y = Math.sqrt(L * L - x * x);
    checkClose(-(x / y) * dxdt, value, 1e-9, `${where}: ladder related rates`);
  } else if (variant === 1) {
    const dVdt = v.data!.dVdt as number;
    const h = v.data!.h as number;
    checkClose((27 * dVdt) / (Math.PI * h * h), value, 1e-9, `${where}: cone related rates`);
  } else {
    const dVdt = v.data!.dVdt as number;
    const r = v.data!.r as number;
    checkClose(dVdt / (4 * Math.PI * r * r), value, 1e-9, `${where}: sphere related rates`);
  }
}

function checkImproper(p: CalcMCQProblem, where: string): void {
  const v = p.verify;
  const value = v.value!;
  const variant = v.data?.variant as number;
  if (variant === 0) {
    const pp = v.data!.p as number;
    // numeric tail-aware check: integrate to 1e4, tail bounded by 1/((p-1) 1e4^{p-1})
    const f = { kind: "poly", coeffs: [0] } as const; // placeholder, not used
    void f;
    const g = (x: number) => Math.pow(x, -pp);
    const n = 20000;
    const B = 1e4;
    const h = (B - 1) / n;
    let s = g(1) + g(B);
    for (let i = 1; i < n; i++) s += g(1 + i * h) * (i % 2 === 0 ? 2 : 4);
    const numeric = (s * h) / 3;
    checkClose(numeric, value, 0.01, `${where}: improper integral numeric`);
  } else {
    // ∫_0^1 x^{-1/2} dx: numeric from eps to 1
    const g = (x: number) => 1 / Math.sqrt(x);
    const eps = 1e-6;
    const n = 20000;
    const h = (1 - eps) / n;
    let s = g(eps) + g(1);
    for (let i = 1; i < n; i++) s += g(eps + i * h) * (i % 2 === 0 ? 2 : 4);
    const numeric = (s * h) / 3;
    checkClose(numeric, value, 0.01, `${where}: singular improper integral numeric`);
  }
}

function checkText(p: CalcMCQProblem, where: string): void {
  const v = p.verify;
  checkEqual(p.answer, v.text, `${where}: answer === verify.text`);
  if ((p.answer === "∞" || p.answer === "-∞") && v.source) {
    const sgn = probeInfinity(v.source, { point: v.point, side: v.side, atInfinity: v.atInfinity });
    check(sgn === (p.answer === "∞" ? 1 : -1), `${where}: infinity sign probe`);
  }
  if ((p.subtype === "TangentLine" || p.subtype === "NormalLine") && v.source && v.data) {
    const a = v.data.a as number;
    const lineM = v.data.m as number;
    const lineB = v.data.b as number;
    const deriv = numDiff(v.source, a);
    // math: numeric derivative is the tangent slope; the normal slope is its opposite reciprocal
    if (p.subtype === "TangentLine") checkClose(deriv, lineM, 1e-6, `${where}: tangent slope`);
    else checkClose(deriv, -1 / lineM, 1e-6, `${where}: normal ⟂ tangent`);
    checkClose(indepEval(v.source, a) - lineM * a, lineB, 1e-6, `${where}: line intercept`);
    // format: the factory's exact (m, b) must render to the answer text
    checkEqual(p.answer, indepLineText(lineM, lineB), `${where}: line text`);
  }
  if (p.subtype === "IncreasingDecreasing" && v.source && v.data) {
    const r1 = v.data.r1 as number;
    const r2 = v.data.r2 as number;
    const askDec = v.data.askDec === 1;
    const mid = (r1 + r2) / 2;
    // f'(x) = (x-r1)(x-r2): negative strictly between the roots, positive outside
    check(indepEval(v.source, mid) < 0, `${where}: f' < 0 between roots`);
    check(indepEval(v.source, r1 - 1) > 0 && indepEval(v.source, r2 + 1) > 0, `${where}: f' > 0 outside roots`);
    const uni = (s: string) => s.replace(/-/g, "−");
    const want = askDec ? uni(`(${r1}, ${r2})`) : uni(`(−∞, ${r1}) ∪ (${r2}, ∞)`);
    checkEqual(p.answer, want, `${where}: interval text`);
  }
  if (p.subtype === "IndefiniteIntegral" && p.prompt.includes("∫")) {
    const expected = p.prompt.includes("sin(x)")
      ? "−cos(x) + C"
      : p.prompt.includes("cos(x)")
        ? "sin(x) + C"
        : p.prompt.includes("e^(2x)")
          ? "e^(2x)/2 + C"
          : p.prompt.includes("1/x")
            ? "ln|x| + C"
            : null;
    if (expected) checkEqual(p.answer, expected, `${where}: trig/exp antiderivative`);
  }
}

/** Graph features match computed values. */
function checkGraph(p: CalcMCQProblem, where: string): void {
  const g = p.graph;
  if (!g) return;
  const v = p.verify;
  if (p.subtype === "LimitGraphical" && v.point !== undefined && v.value !== undefined) {
    check(!!g.holes && g.holes.length === 1, `${where}: one hole drawn`);
    if (g.holes?.length === 1) {
      checkClose(g.holes[0].x, v.point, 1e-9, `${where}: hole x`);
      checkClose(g.holes[0].y, v.value, 1e-9, `${where}: hole y = limit`);
    }
  }
  if (p.subtype === "LimitOneSided" && v.point !== undefined) {
    check(!!g.holes && g.holes.length === 2, `${where}: two holes for jump`);
    check(!!g.fnDomain && !!g.fn2Domain, `${where}: piecewise domains set`);
    if (g.fnDomain && g.fn2Domain) {
      checkClose(g.fnDomain[1], v.point, 1e-9, `${where}: left domain ends at c`);
      checkClose(g.fn2Domain[0], v.point, 1e-9, `${where}: right domain starts at c`);
    }
  }
  if (p.subtype === "LimitInfinite" && v.point !== undefined) {
    check(!!g.asymptotes && g.asymptotes.includes(v.point), `${where}: asymptote at pole`);
  }
  if (p.subtype === "TangentLine" && v.data) {
    checkEqual(g.tangentAt, v.data.a as number, `${where}: tangent point`);
  }
  if (g.shade && v.data && (p.subtype === "DefiniteIntegral" || p.subtype === "AreaBetweenCurves" || p.subtype === "USubstitution")) {
    const s = g.shade;
    const a = (v.data.a as number) ?? -(v.data.k as number);
    const b = (v.data.b as number) ?? (v.data.k as number);
    if (typeof a === "number" && typeof b === "number") {
      checkClose(s.a, a, 1e-9, `${where}: shade lower bound`);
      checkClose(s.b, b, 1e-9, `${where}: shade upper bound`);
    }
  }
}

/** Table cells match independent re-evaluation (numerical limits table). */
function checkTable(p: CalcMCQProblem, where: string): void {
  if (!p.table || !p.verify.source) return;
  if (p.subtype !== "LimitNumerical") return;
  for (const row of p.table.rows) {
    const x = parseFloat(row[0]);
    const shown = parseFloat(row[1]);
    const recomputed = indepEval(p.verify.source, x);
    checkClose(recomputed, shown, 2e-3, `${where}: table cell x=${x}`);
  }
}

const ALL_MAKERS: { name: string; makers: Maker[] }[] = [
  { name: "limits", makers: LIMIT_MAKERS },
  { name: "derivatives", makers: DERIVATIVE_MAKERS },
  { name: "deriv-apps", makers: DERIV_APPS_MAKERS },
  { name: "integrals", makers: INTEGRAL_MAKERS },
];

export function runVerify(): void {
  reset();
  for (const { name, makers } of ALL_MAKERS) {
    for (const maker of makers) {
      for (let s = 0; s < SEEDS; s++) {
        const rng = mulberry32(91000 + s * 37);
        let p: CalcMCQProblem;
        try {
          p = maker.make(rng);
        } catch (e) {
          check(false, `${name}: maker threw on seed ${s}: ${(e as Error).message}`);
          continue;
        }
        const where = `${name}/${p.subtype}#${s}`;
        // every problem carries a checkable answer
        check(!!p.verify, `${where}: verify present`);
        if (p.verify.kind === "number") checkNumber(p, where);
        else if (p.verify.kind === "expr") checkExpr(p, where);
        else checkText(p, where);
        checkGraph(p, where);
        checkTable(p, where);
      }
    }
  }
}

// standalone
if (require.main === module) {
  runVerify();
  const s = stats();
  console.log(`verify: ${s.checks} checks, ${s.failures.length} failures`);
  for (const f of s.failures.slice(0, 20)) console.log("  FAIL:", f);
  process.exit(s.failures.length > 0 ? 1 : 0);
}
