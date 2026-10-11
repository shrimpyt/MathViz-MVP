// test-answers.ts
// Independent answer verification: every MCQ subtype is recomputed from its
// `givens` by a SEPARATE code path (this file) and compared against the
// factory's expected choice. Also checks answer-key exactness via
// formatPrecalcAnswer across seeds/difficulties.

import { check, resetCounters, result, printResult, isMain, type SuiteResult } from "./helpers";
import { mulberry32 } from "@/lib/math-utils";
import type { PrecalcMCQ, PrecalcDifficulty } from "@/lib/factories/PrecalcTypes";
import { formatPrecalcAnswer } from "@/lib/factories/PrecalcTypes";
import { generatePrecalcProblems, PRECALC_GEN_TOPICS } from "@/lib/factories/PrecalcFactory";
import { VECTOR_MAKERS } from "@/lib/factories/PrecalcVectorsFactory";
import { COMPLEX_MAKERS } from "@/lib/factories/PrecalcComplexFactory";
import { CONIC_MAKERS } from "@/lib/factories/PrecalcConicsFactory";
import { TRIG_MAKERS } from "@/lib/factories/PrecalcTrigFactory";
import { LIMIT_MAKERS } from "@/lib/factories/PrecalcLimitsFactory";
import { PARAMPOLAR_MAKERS } from "@/lib/factories/PrecalcParamPolarFactory";

// -- Independent formatting helpers (duplicated on purpose) --------------------

function igcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b > 0) { const t = a % b; a = b; b = t; }
  return a || 1;
}
function ifrac(n: number, d: number): string {
  if (d < 0) { n = -n; d = -d; }
  const g = igcd(n, d);
  n /= g; d /= g;
  if (d === 1) return String(n);
  if (n === 0) return "0";
  return `${n}/${d}`;
}
function ifmt(n: number, digits = 3): string {
  if (!isFinite(n)) return "undefined";
  const r = Number(n.toFixed(digits));
  return String(Object.is(r, -0) ? 0 : r);
}
function ifmtComplex(re: number, im: number): string {
  const rs = ifmt(re);
  if (im === 0) return rs;
  const ia = Math.abs(im);
  const ip = ia === 1 ? "i" : `${ifmt(ia)}i`;
  if (re === 0) return im < 0 ? `−${ip}` : ip;
  return im < 0 ? `${rs}−${ip}` : `${rs}+${ip}`;
}
/** ASCII "pi" fraction, matching factory answer style ("pi/6"). */
function ipiAscii(num: number, den: number): string {
  const g = igcd(num, den);
  const n = num / g, d = den / g;
  if (n === 0) return "0";
  if (d === 1) return n === 1 ? "pi" : `${n}pi`;
  return n === 1 ? `pi/${d}` : `${n}pi/${d}`;
}
function ishift(v: "x" | "y", h: number): string {
  if (h === 0) return `${v}²`;
  const a = Math.abs(h);
  return h > 0 ? `(${v}−${a})²` : `(${v}+${a})²`;
}
function parseR(s: string): number {
  if (s === "√2") return Math.SQRT2;
  if (s === "2√2") return 2 * Math.SQRT2;
  const n = Number(s);
  if (!isFinite(n)) throw new Error(`parseR: ${s}`);
  return n;
}
/** Parse simple radical values like "1/2", "sqrt(3)/2", "sqrt(3)", "0". */
function parseSimpleVal(s: string): number {
  const t = s.replace("sqrt(2)", String(Math.SQRT2)).replace("sqrt(3)", String(Math.sqrt(3)));
  if (t.includes("/")) {
    const [n, d] = t.split("/").map(Number);
    return n / d;
  }
  return Number(t);
}

// Independent exact trig table: deg -> [sin, cos] strings.
const TRIG_TABLE: Record<number, [string, string]> = {
  0: ["0", "1"], 30: ["1/2", "√3/2"], 45: ["√2/2", "√2/2"], 60: ["√3/2", "1/2"],
  90: ["1", "0"], 120: ["√3/2", "−1/2"], 135: ["√2/2", "−√2/2"], 150: ["1/2", "−√3/2"],
  180: ["0", "−1"], 210: ["−1/2", "−√3/2"], 225: ["−√2/2", "−√2/2"], 240: ["−√3/2", "−1/2"],
  270: ["−1", "0"], 300: ["−√3/2", "1/2"], 315: ["−√2/2", "√2/2"], 330: ["−1/2", "√3/2"],
};
// Independent rect->polar table: "re,im" -> [r string, deg].
const RP_TABLE: Record<string, [string, number]> = {
  "1,1": ["√2", 45], "1,-1": ["√2", 315], "-1,1": ["√2", 135],
  "1,0": ["1", 0], "0,1": ["1", 90], "2,0": ["2", 0],
  "0,2": ["2", 90], "2,2": ["2√2", 45], "3,0": ["3", 0],
};

// -- Per-subtype independent verifiers ------------------------------------------
// Each returns the independently recomputed expected choice text.

type V = (p: PrecalcMCQ) => string;

const VERIFIERS: Record<string, V> = {
  // vectors
  AddComponents: (p) => `(${p.givens.a + p.givens.c}, ${p.givens.b + p.givens.d})`,
  SubtractComponents: (p) => `(${p.givens.a - p.givens.c}, ${p.givens.b - p.givens.d})`,
  ScalarMultiple: (p) => `(${p.givens.k * p.givens.a}, ${p.givens.k * p.givens.b})`,
  Magnitude: (p) => {
    const m = Math.hypot(p.givens.a, p.givens.b);
    if (!Number.isInteger(Math.round(m))) throw new Error("non-integer magnitude");
    return String(Math.round(m));
  },
  DotProduct: (p) => String(p.givens.a * p.givens.c + p.givens.b * p.givens.d),
  VectorFromPoints: (p) => `(${p.givens.x2 - p.givens.x1}, ${p.givens.y2 - p.givens.y1})`,
  UnitVector: (p) => {
    const m = Math.round(Math.hypot(p.givens.a, p.givens.b));
    return `(${ifrac(p.givens.a, m)}, ${ifrac(p.givens.b, m)})`;
  },
  OrthogonalCheck: (p) => {
    const dot = p.givens.a * p.givens.c + p.givens.b * p.givens.d;
    return dot === 0 ? "Yes; u · v = 0" : `No; u · v = ${dot}`;
  },
  MagnitudeApprox: (p) => ifmt(Math.hypot(p.givens.a, p.givens.b)),
  AngleBetween: (p) => {
    const deg = (Math.acos(p.givens.vx) * 180) / Math.PI;
    if (Math.abs(deg - p.givens.deg) > 0.01) throw new Error(`angle ${deg} != ${p.givens.deg}`);
    return `${p.givens.deg}°`;
  },
  LinearCombination: (p) =>
    `(${p.givens.p * p.givens.a - p.givens.q * p.givens.c}, ${p.givens.p * p.givens.b - p.givens.q * p.givens.d})`,
  ParallelCheck: (p) => {
    const { a, b, c, d } = p.givens;
    if (a * d !== b * c) return "No; v is not a scalar multiple of u";
    const k = c / a;
    if (!Number.isInteger(k)) throw new Error("non-integer parallel ratio");
    return `Yes; v = ${k}u`;
  },
  // complex
  AddSub: (p) => {
    const s = p.givens.plus === 1;
    return ifmtComplex(s ? p.givens.a + p.givens.c : p.givens.a - p.givens.c,
      s ? p.givens.b + p.givens.d : p.givens.b - p.givens.d);
  },
  Multiply: (p) => ifmtComplex(
    p.givens.a * p.givens.c - p.givens.b * p.givens.d,
    p.givens.a * p.givens.d + p.givens.b * p.givens.c),
  Conjugate: (p) => ifmtComplex(p.givens.a, -p.givens.b),
  Modulus: (p) => String(Math.round(Math.hypot(p.givens.a, p.givens.b))),
  PowersOfI: (p) => ["1", "i", "−1", "−i"][p.givens.n % 4],
  Divide: (p) => {
    const { a, b, c, d } = p.givens;
    const den = c * c + d * d;
    if (den === 0) throw new Error("zero divisor");
    const re = (a * c + b * d) / den;
    const im = (b * c - a * d) / den;
    if (!Number.isInteger(re) || !Number.isInteger(im)) throw new Error("non-integer quotient");
    return ifmtComplex(re, im);
  },
  RectToPolar: (p) => rectToPolar(p),
  RectToPolarQ2: (p) => rectToPolar(p),
  PolarToRect: (p) => {
    const m = p.stem.match(/\((.+)\(cos (\d+)° \+ i sin \d+°\)\)/);
    if (!m) throw new Error("stem parse failed");
    const r = parseR(m[1]);
    const deg = Number(m[2]);
    const x = r * Math.cos((deg * Math.PI) / 180);
    const y = r * Math.sin((deg * Math.PI) / 180);
    if (Math.abs(x - p.givens.re) > 1e-9 || Math.abs(y - p.givens.im) > 1e-9)
      throw new Error("polar->rect mismatch");
    return ifmtComplex(p.givens.re, p.givens.im);
  },
  DeMoivre: (p) => {
    const sm = p.stem.match(/\((.+)\(cos (\d+)° \+ i sin \d+°\)\)\^(\d+)/);
    const em = p.expected.match(/^(.+)\(cos (\d+)° \+ i sin \d+°\)$/);
    if (!sm || !em) throw new Error("deMoivre parse failed");
    const r = parseR(sm[1]);
    const deg = Number(sm[2]);
    const n = Number(sm[3]);
    const rPow = parseR(em[1]);
    const finalDeg = Number(em[2]);
    if (Math.abs(Math.pow(r, n) - rPow) > 1e-9) throw new Error("modulus power mismatch");
    if ((deg * n) % 360 !== finalDeg) throw new Error("angle mismatch");
    return p.expected; // structural verification above; return expected to compare
  },
  PolarMultiply: (p) => `${p.givens.r1 * p.givens.r2}(cos ${p.givens.t1 + p.givens.t2}° + i sin ${p.givens.t1 + p.givens.t2}°)`,
};

function rectToPolar(p: PrecalcMCQ): string {
  const key = `${p.givens.re},${p.givens.im}`;
  const entry = RP_TABLE[key];
  if (!entry) throw new Error(`no table entry for ${key}`);
  const [rStr, deg] = entry;
  const r = parseR(rStr);
  if (Math.abs(Math.hypot(p.givens.re, p.givens.im) - r) > 1e-9) throw new Error("r mismatch");
  const actualDeg = Math.round((Math.atan2(p.givens.im, p.givens.re) * 180) / Math.PI);
  const norm = ((actualDeg % 360) + 360) % 360;
  if (norm !== deg) throw new Error(`deg ${norm} != ${deg}`);
  return `${rStr}(cos ${deg}° + i sin ${deg}°)`;
}

// conics + trig + limits + parampolar verifiers appended below (part 2)

// -- conics verifiers ------------------------------------------------------------

function identifyConicKind(eq: string): string {
  if (/^y = /.test(eq) || /^x = /.test(eq)) return "Parabola";
  if (eq.includes("/")) return eq.includes(" + ") ? "Ellipse" : "Hyperbola";
  return "Circle";
}

Object.assign(VERIFIERS, {
  IdentifyConic: (p: PrecalcMCQ) => {
    const m = p.stem.match(/equation (.+) describe\?/);
    if (!m) throw new Error("stem parse failed");
    return identifyConicKind(m[1]);
  },
  CircleCenterRadius: (p: PrecalcMCQ) => `Center (${p.givens.h}, ${p.givens.k}), radius ${p.givens.r}`,
  CircleEquation: (p: PrecalcMCQ) =>
    `${ishift("x", p.givens.h)} + ${ishift("y", p.givens.k)} = ${p.givens.r * p.givens.r}`,
  ParabolaVertex: (p: PrecalcMCQ) => {
    const { a, h, k, vertical } = p.givens;
    const opens = vertical === 1 ? (a > 0 ? "upward" : "downward") : a > 0 ? "rightward" : "leftward";
    return `Vertex (${h}, ${k}); opens ${opens}`;
  },
  EllipseFeatures: (p: PrecalcMCQ) =>
    `Foci (${p.givens.h - p.givens.c}, ${p.givens.k}) and (${p.givens.h + p.givens.c}, ${p.givens.k})`,
  HyperbolaFeatures: (p: PrecalcMCQ) =>
    p.givens.askFoci === 1
      ? `Foci (−${p.givens.c}, 0) and (${p.givens.c}, 0)`
      : `Vertices (−${p.givens.a}, 0) and (${p.givens.a}, 0)`,
  ParabolaFocus: (p: PrecalcMCQ) => {
    const { p: fp, h, k, vertical, askFocus } = p.givens;
    if (askFocus === 1)
      return vertical === 1 ? `Focus (${h}, ${k + fp})` : `Focus (${h + fp}, ${k})`;
    return vertical === 1 ? `Directrix: y = ${k - fp}` : `Directrix: x = ${h - fp}`;
  },
  CompleteSquare: (p: PrecalcMCQ) => {
    const { h, k, r, D, E, F } = p.givens;
    if (D !== -2 * h || E !== -2 * k || F !== h * h + k * k - r * r)
      throw new Error("complete-square coefficients inconsistent");
    return `Center (${h}, ${k}), radius ${r}`;
  },
  EllipseFromFeatures: (p: PrecalcMCQ) => {
    const { a, b, c } = p.givens;
    if (b * b !== a * a - c * c) throw new Error("b^2 != a^2 - c^2");
    return `x^2/${a * a} + y^2/${b * b} = 1`;
  },
  HyperbolaFromFeatures: (p: PrecalcMCQ) => `x^2/${p.givens.a * p.givens.a} − y^2/${p.givens.b * p.givens.b} = 1`,
} as Record<string, V>);

// -- trig verifiers ---------------------------------------------------------------

Object.assign(VERIFIERS, {
  UnitCircleValue: (p: PrecalcMCQ) => {
    const e = TRIG_TABLE[p.givens.deg];
    if (!e) throw new Error(`no table entry for ${p.givens.deg}`);
    return p.givens.fn === 0 ? e[0] : e[1];
  },
  AmplitudePeriod: (p: PrecalcMCQ) => {
    if (p.givens.askAmp === 1) return String(Math.abs(p.givens.A));
    return p.givens.B === 1 ? "2pi" : p.givens.B === 2 ? "pi" : "2pi/3";
  },
  InverseTrig: (p: PrecalcMCQ) => {
    const m = p.stem.match(/Evaluate (arcsin|arccos|arctan)\((.+)\)\./);
    if (!m) throw new Error("stem parse failed");
    const val = parseSimpleVal(m[2]);
    const target = (p.givens.num / p.givens.den) * Math.PI;
    const got = m[1] === "arcsin" ? Math.asin(val) : m[1] === "arccos" ? Math.acos(val) : Math.atan(val);
    if (Math.abs(got - target) > 1e-9) throw new Error(`inverse trig ${got} != ${target}`);
    return ipiAscii(p.givens.num, p.givens.den);
  },
  TrigEquation: (p: PrecalcMCQ) => {
    const m = p.stem.match(/Solve (sin|cos) x = ([^\s]+) for/);
    if (!m) throw new Error("stem parse failed");
    const val = parseSimpleVal(m[2]);
    const fn = m[1] === "sin" ? Math.sin : Math.cos;
    for (const [n, d] of [[p.givens.v1n, p.givens.v1d], [p.givens.v2n, p.givens.v2d]]) {
      if (Math.abs(fn((n / d) * Math.PI) - val) > 1e-9) throw new Error("solution does not satisfy equation");
    }
    return `x = ${ipiAscii(p.givens.v1n, p.givens.v1d)}, ${ipiAscii(p.givens.v2n, p.givens.v2d)}`;
  },
  PhaseShift: (p: PrecalcMCQ) => {
    const s = p.givens.sd === 1 ? "pi" : `pi/${p.givens.sd}`;
    return `${s} to the right`;
  },
  CalculatorEval: (p: PrecalcMCQ) => {
    const fn = p.givens.fn === 0 ? Math.sin : p.givens.fn === 1 ? Math.cos : Math.tan;
    return ifmt(fn(p.givens.x));
  },
  GraphToEquation: (p: PrecalcMCQ) => {
    const { A, B, D, fn } = p.givens;
    const dStr = D === 0 ? "" : D > 0 ? ` + ${D}` : ` - ${-D}`;
    return `y = ${A} ${fn === 0 ? "sin" : "cos"}(${B === 1 ? "" : B}x)${dStr}`;
  },
  TrigEquationCalc: (p: PrecalcMCQ) => {
    const s1 = Math.asin(p.givens.t);
    const s2 = Math.PI - s1;
    const norm = (x: number) => ((x % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const sols = [norm(s1), norm(s2)].sort((x, y) => x - y);
    return `x = ${ifmt(sols[0])}, ${ifmt(sols[1])}`;
  },
  PythagoreanIdentity: (p: PrecalcMCQ) => {
    const { sinN, m } = p.givens;
    const cosN = -Math.round(Math.sqrt(m * m - sinN * sinN));
    if (Math.abs((sinN / m) ** 2 + (cosN / m) ** 2 - 1) > 1e-9) throw new Error("identity violated");
    return ifrac(cosN, m);
  },
} as Record<string, V>);

// -- limits verifiers -----------------------------------------------------------------

Object.assign(VERIFIERS, {
  DirectSubstitution: (p: PrecalcMCQ) =>
    String(p.givens.p * p.givens.a * p.givens.a + p.givens.q * p.givens.a + p.givens.r),
  LimitFromTable: (p: PrecalcMCQ) => String(2 * p.givens.a),
  SimplifyRational: (p: PrecalcMCQ) => String(2 * p.givens.a),
  LimitFromGraph: (p: PrecalcMCQ) => (p.givens.scenario === 1 ? "Does not exist" : String(p.givens.L)),
  LimitLaws: (p: PrecalcMCQ) => {
    const { L, M, kindCode } = p.givens;
    if (kindCode === 0) return String(L + 2 * M);
    if (kindCode === 1) return String(L * M);
    if (kindCode === 2) return ifmt(L / M);
    return String(3 * L - M);
  },
  OneSidedPiecewise: (p: PrecalcMCQ) => {
    const { a, p: pv, q, r, s, agree } = p.givens;
    const left = pv * a + q;
    const right = r * a + s;
    if (agree === 1) {
      if (left !== right) throw new Error("agree but limits differ");
      return `Yes; both one-sided limits equal ${left}`;
    }
    if (left === right) throw new Error("disagree but limits equal");
    return `No; left limit ${left} != right limit ${right}`;
  },
} as Record<string, V>);

// -- parametric/polar verifiers ------------------------------------------------------------

const RP2_TABLE: Record<string, [string, number]> = {
  "3,0": ["3", 0], "0,4": ["4", 90], "2,2": ["2sqrt(2)", 45],
  "-3,3": ["3sqrt(2)", 135], "1,-1": ["sqrt(2)", 315], "5,0": ["5", 0],
};

Object.assign(VERIFIERS, {
  ParametricEvaluate: (p: PrecalcMCQ) =>
    `(${p.givens.a * p.givens.t + p.givens.b}, ${p.givens.c * p.givens.t * p.givens.t + p.givens.d})`,
  PolarToRect: (p: PrecalcMCQ) => {
    const x = p.givens.r * Math.cos((p.givens.deg * Math.PI) / 180);
    const y = p.givens.r * Math.sin((p.givens.deg * Math.PI) / 180);
    return `(${ifmt(x)}, ${ifmt(y)})`;
  },
  EliminateParameter: (p: PrecalcMCQ) => {
    if (p.givens.kindCode === 0) {
      const c = p.givens.b - p.givens.m * p.givens.h;
      return `y = ${p.givens.m}x ${c >= 0 ? "+" : "-"} ${Math.abs(c)}`;
    }
    return `y = x^2/${p.givens.a * p.givens.a}`;
  },
  RectToPolar: (p: PrecalcMCQ) => {
    const key = `${p.givens.x},${p.givens.y}`;
    const entry = RP2_TABLE[key];
    if (!entry) throw new Error(`no table entry for ${key}`);
    const [rStr, deg] = entry;
    const rNum = rStr.includes("sqrt")
      ? Number(rStr.split("sqrt")[0] || 1) * Math.SQRT2
      : Number(rStr);
    if (Math.abs(Math.hypot(p.givens.x, p.givens.y) - rNum) > 1e-9) throw new Error("r mismatch");
    const actualDeg = Math.round((Math.atan2(p.givens.y, p.givens.x) * 180) / Math.PI);
    if ((((actualDeg % 360) + 360) % 360) !== deg) throw new Error("deg mismatch");
    return `(r, theta) = (${rStr}, ${deg} deg)`;
  },
  PlotPolarPoint: (p: PrecalcMCQ) => {
    const { r, deg } = p.givens;
    const eff = (((deg + (r < 0 ? 180 : 0)) % 360) + 360) % 360;
    const quad =
      eff === 0 || eff === 90 || eff === 180 || eff === 270
        ? "on an axis"
        : eff < 90 ? "Quadrant I" : eff < 180 ? "Quadrant II" : eff < 270 ? "Quadrant III" : "Quadrant IV";
    return `${quad}; distance ${Math.abs(r)} from the pole`;
  },
  PolarCurveIdentify: (p: PrecalcMCQ) => {
    const kc = p.givens.kindCode;
    if (kc === 0) return "Cardioid (heart-shaped)";
    if (kc === 1) return "Circle";
    if (kc === 3) return "Limacon (dimpled/looped)";
    const m = p.stem.match(/sin\((\d+)theta\)/);
    if (!m) throw new Error("stem parse failed");
    return `Rose with ${2 * Number(m[1])} petals`;
  },
  PolarSymmetry: (p: PrecalcMCQ) =>
    p.givens.useSin === 1
      ? "Symmetric about theta = pi/2 (the vertical axis)"
      : "Symmetric about the polar axis (theta = 0)",
  ParamTrigEliminate: (p: PrecalcMCQ) =>
    p.givens.kindCode === 0 ? `x^2 + y^2 = ${p.givens.r * p.givens.r}` : `x = y^2/4 + ${p.givens.a}`,
} as Record<string, V>);

// -- Runner -------------------------------------------------------------------------------

const ALL_MAKERS: Record<string, (rng: () => number) => PrecalcMCQ> = {
  ...VECTOR_MAKERS,
  ...COMPLEX_MAKERS,
  ...CONIC_MAKERS,
  ...TRIG_MAKERS,
  ...LIMIT_MAKERS,
  ...PARAMPOLAR_MAKERS,
};

export function runAnswers(): SuiteResult {
  resetCounters();
  const subtypes = Object.keys(ALL_MAKERS);
  check(subtypes.length >= 50, `>=50 MCQ subtypes under test (got ${subtypes.length})`);

  // Every registered maker must have an independent verifier.
  for (const st of subtypes) {
    check(!!VERIFIERS[st], `verifier exists for subtype ${st}`);
  }

  // Per-subtype: several seeds, recompute expected independently.
  subtypes.forEach((st, si) => {
    const verifier = VERIFIERS[st];
    if (!verifier) return;
    for (let s = 0; s < 6; s++) {
      const rng = mulberry32(5000 + si * 100 + s);
      const p = ALL_MAKERS[st](rng);
      const where = `${st}/seed${5000 + si * 100 + s}`;
      let recomputed: string;
      try {
        recomputed = verifier(p);
      } catch (e) {
        check(false, `${where}: verifier threw: ${(e as Error).message}`);
        continue;
      }
      check(recomputed === p.expected, `${where}: independent=${recomputed} vs factory=${p.expected}`);
      check(p.choices[p.correctIndex] === p.expected, `${where}: choice alignment`);
      // Answer-key exactness for this problem.
      const key = formatPrecalcAnswer(p);
      check(key === `${p.answerLetter}. ${p.expected}`, `${where}: answer key exact`);
    }
  });

  // Answer-key exactness across the unified generator: multi-topic, all
  // difficulties, several seeds. Key must be stable for a fixed seed.
  const diffs: PrecalcDifficulty[] = [1, 2, 3];
  for (const topic of PRECALC_GEN_TOPICS) {
    if (topic === "frq") continue;
    for (const d of diffs) {
      for (let s = 0; s < 3; s++) {
        const seed = 9000 + PRECALC_GEN_TOPICS.indexOf(topic) * 100 + d * 10 + s;
        const rng = mulberry32(seed);
        const probs = generatePrecalcProblems(rng, topic, 5, d);
        const keys1 = probs.map((p) => formatPrecalcAnswer(p as PrecalcMCQ));
        const rng2 = mulberry32(seed);
        const keys2 = generatePrecalcProblems(rng2, topic, 5, d).map((p) =>
          formatPrecalcAnswer(p as PrecalcMCQ)
        );
        check(
          JSON.stringify(keys1) === JSON.stringify(keys2),
          `key-stability ${topic}/d${d}/seed${seed}`
        );
        for (const k of keys1) check(k.length > 0, `key-nonempty ${topic}/d${d}`);
      }
    }
  }

  return result("answers");
}

if (isMain(import.meta.url)) {
  printResult(runAnswers());
}
