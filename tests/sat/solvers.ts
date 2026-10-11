// solvers.ts
// INDEPENDENT answer recomputation for every SAT subdomain.
//
// These solvers are written from the subdomain math spec and NEVER import the
// factories. Each takes the problem's raw `verify.params` and returns the
// expected canonical display string + numeric value, plus a defining-property
// check (usually substitution into the original equation). If a generator's
// key disagrees with its solver, the generator is wrong — by construction.

type Params = Record<string, number | string | number[]>;

export interface Solved {
  /** Expected canonical display label (must equal problem.key exactly). */
  display: string;
  /** Expected numeric value (must equal problem.keyValue within 1e-9). */
  value: number;
}

function gg(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a || 1;
}

/** Reduced fraction label, integers only. Independent copy for the tests. */
function sfrac(num: number, den: number): string {
  if (!Number.isInteger(num) || !Number.isInteger(den) || den === 0) {
    throw new Error(`sfrac needs integers, got ${num}/${den}`);
  }
  let n = num;
  let d = den;
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gg(n, d);
  n /= g;
  d /= g;
  return d === 1 ? String(n) : `${n}/${d}`;
}

function spi(coef: number): string {
  if (coef === 1) return "π";
  if (coef === -1) return "-π";
  return `${coef}π`;
}

function flip(op: string): string {
  if (op === "<") return ">";
  if (op === ">") return "<";
  if (op === "≤") return "≥";
  return "≤";
}

function holds(a: number, op: string, c: number): boolean {
  if (op === "<") return a < c;
  if (op === ">") return a > c;
  if (op === "≤") return a <= c;
  return a >= c;
}

const num = (p: Params, k: string): number => {
  const v = p[k];
  if (typeof v !== "number") throw new Error(`param ${k} is not a number`);
  return v;
};
const str = (p: Params, k: string): string => {
  const v = p[k];
  if (typeof v !== "string") throw new Error(`param ${k} is not a string`);
  return v;
};

// ── Heart of Algebra ──────────────────────────────────────────────────────────

function solveLinearEquation1Var(p: Params): Solved {
  const a = num(p, "a"), b = num(p, "b"), c = num(p, "c");
  const distributed = num(p, "distributed") === 1;
  const x = distributed ? c / a - b : (c - b) / a;
  if (!Number.isInteger(x)) throw new Error("non-integer x");
  // Defining-property check: substitute back into the ORIGINAL equation.
  const lhs = distributed ? a * (x + b) : a * x + b;
  if (lhs !== c) throw new Error(`substitution failed: ${lhs} ≠ ${c}`);
  return { display: String(x), value: x };
}

function solveSystem2x2(p: Params): Solved {
  const a1 = num(p, "a1"), b1 = num(p, "b1"), c1 = num(p, "c1");
  const a2 = num(p, "a2"), b2 = num(p, "b2"), c2 = num(p, "c2");
  const det = a1 * b2 - a2 * b1;
  if (det === 0) throw new Error("singular system");
  const x = (c1 * b2 - c2 * b1) / det;
  const y = (a1 * c2 - a2 * c1) / det;
  if (!Number.isInteger(x) || !Number.isInteger(y)) throw new Error("non-integer solution");
  if (a1 * x + b1 * y !== c1 || a2 * x + b2 * y !== c2) {
    throw new Error("substitution failed");
  }
  const ans = num(p, "askSum") === 1 ? x + y : num(p, "askX") === 1 ? x : y;
  return { display: String(ans), value: ans };
}

function solveLinearInequality(p: Params): Solved {
  const a = num(p, "a"), b = num(p, "b"), c = num(p, "c");
  const op = str(p, "op");
  const boundary = (c - b) / a;
  if (!Number.isInteger(boundary)) throw new Error("non-integer boundary");
  const dir = a < 0 ? flip(op) : op;
  // Check: boundary is the exact equality point…
  if (a * boundary + b !== c) throw new Error("boundary mismatch");
  // …and a point strictly inside the solution set satisfies the inequality.
  const inside = boundary + (dir === ">" || dir === "≥" ? 1 : -1);
  if (!holds(a * inside + b, op, c)) throw new Error("direction check failed");
  return { display: `x ${dir} ${boundary}`, value: boundary };
}

function solveLinearFunction(p: Params): Solved {
  if (p["word"] === 1) {
    const cost = num(p, "rate") * num(p, "g") + num(p, "base");
    return { display: String(cost), value: cost };
  }
  if (num(p, "solveForX") === 1) {
    const m = num(p, "m"), b = num(p, "b"), v = num(p, "v");
    const x = (v - b) / m;
    if (!Number.isInteger(x)) throw new Error("non-integer x");
    if (m * x + b !== v) throw new Error("substitution failed");
    return { display: String(x), value: x };
  }
  const val = num(p, "m") * num(p, "k") + num(p, "b");
  return { display: String(val), value: val };
}

// ── Problem Solving & Data Analysis ───────────────────────────────────────────

function solvePercentChange(p: Params): Solved {
  const old = num(p, "old"), nw = num(p, "nw");
  const pct = ((nw - old) / old) * 100;
  if (!Number.isInteger(pct)) throw new Error("non-integer pct");
  // Exact integer check: (new − old) * 100 = old * pct.
  if ((nw - old) * 100 !== old * pct) throw new Error("invertibility failed");
  return { display: String(pct), value: pct };
}

function solveRatioProportion(p: Params): Solved {
  if (num(p, "scaleMode") === 1) {
    const actual = num(p, "mapCm") * num(p, "perCm");
    return { display: String(actual), value: actual };
  }
  const a = num(p, "a"), b = num(p, "b"), c = num(p, "c");
  const x = (b * c) / a;
  if (!Number.isInteger(x)) throw new Error("non-integer x");
  if (a * x !== b * c) throw new Error("proportion check failed");
  return { display: String(x), value: x };
}

function solveOneVarStats(p: Params): Solved {
  const data = p["data"];
  if (!Array.isArray(data)) throw new Error("data not an array");
  const stat = str(p, "stat");
  const sorted = [...(data as number[])].sort((u, v) => u - v);
  const n = sorted.length;
  if (stat === "mean") {
    const sum = sorted.reduce((s, v) => s + v, 0);
    return { display: sfrac(sum, n), value: sum / n };
  }
  if (stat === "median") {
    const mid = Math.floor(n / 2);
    if (n % 2 === 1) return { display: String(sorted[mid]), value: sorted[mid] };
    return {
      display: sfrac(sorted[mid - 1] + sorted[mid], 2),
      value: (sorted[mid - 1] + sorted[mid]) / 2,
    };
  }
  const range = sorted[n - 1] - sorted[0];
  return { display: String(range), value: range };
}

function solveProbability(p: Params): Solved {
  if (num(p, "tableMode") === 1) {
    const total = num(p, "a") + num(p, "b") + num(p, "c") + num(p, "d");
    const cell = num(p, "cell");
    const fav = num(p, "complement") === 1 ? total - cell : cell;
    return { display: sfrac(fav, total), value: fav / total };
  }
  const fav = num(p, "fav"), total = num(p, "total");
  return { display: sfrac(fav, total), value: fav / total };
}

// ── Passport to Advanced Math ─────────────────────────────────────────────────

function solveQuadraticRoots(p: Params): Solved {
  const r1 = num(p, "r1"), r2 = num(p, "r2");
  const ask = str(p, "ask");
  // Check each root against x² −(r1+r2)x + r1r2 = 0.
  for (const r of [r1, r2]) {
    if (r * r - (r1 + r2) * r + r1 * r2 !== 0) throw new Error("root check failed");
  }
  const ans = ask === "greater" ? r2 : ask === "sum" ? r1 + r2 : r1 * r2;
  return { display: String(ans), value: ans };
}

function solveEquivalentExpressions(p: Params): Solved {
  const a = num(p, "a"), b = num(p, "b"), lead = num(p, "lead");
  if (lead === 2) {
    const mid = a + 2 * b;
    return { display: String(mid), value: mid };
  }
  const ans = num(p, "askMiddle") === 1 ? a + b : a * b;
  return { display: String(ans), value: ans };
}

function solveNonlinearFunction(p: Params): Solved {
  const a = num(p, "a"), pp = num(p, "p"), q0 = num(p, "q"), x = num(p, "x");
  const val = a * x * x + pp * x + q0;
  return { display: String(val), value: val };
}

function solveNonlinearEquation(p: Params): Solved {
  const k = num(p, "k"), h = num(p, "h"), c = num(p, "c");
  const root = Math.sqrt(k);
  if (!Number.isInteger(root)) throw new Error("k is not a perfect square");
  const x = h + root;
  if ((x - h) * (x - h) + c !== k + c) throw new Error("substitution failed");
  return { display: String(x), value: x };
}

// ── Additional Topics ─────────────────────────────────────────────────────────

function solveTriangleAngles(p: Params): Solved {
  if (p["iso"] === 1) {
    const given = num(p, "given");
    const ans = num(p, "findBase") === 1 ? (180 - given) / 2 : 180 - 2 * given;
    if (num(p, "findBase") === 1 && given + 2 * ans !== 180) {
      throw new Error("isosceles check failed");
    }
    if (num(p, "findBase") !== 1 && ans + 2 * given !== 180) {
      throw new Error("isosceles check failed");
    }
    return { display: String(ans), value: ans };
  }
  const A = num(p, "A"), B = num(p, "B");
  const C = 180 - A - B;
  if (A + B + C !== 180) throw new Error("angle sum failed");
  return { display: String(C), value: C };
}

function solveCircleMeasure(p: Params): Solved {
  const r = num(p, "r");
  const ask = str(p, "ask");
  if (ask === "circumference") return { display: spi(2 * r), value: 2 * r * Math.PI };
  if (ask === "area") return { display: spi(r * r), value: r * r * Math.PI };
  // Inversion branches: the π-coefficient is in params; invert with EXACT
  // integer arithmetic (float multiplication is not associative, so the
  // check must not go through Math.PI).
  const coef = num(p, "coef");
  if (ask === "radius-from-area") {
    const inv = Math.sqrt(coef);
    if (!Number.isInteger(inv) || inv * inv !== coef) {
      throw new Error("area inversion failed");
    }
    if (inv !== r) throw new Error("radius mismatch");
  } else {
    if (coef % 2 !== 0 || coef / 2 !== r) throw new Error("circumference inversion failed");
  }
  return { display: String(r), value: r };
}

function solveRightTriangleTrig(p: Params): Solved {
  const opp = num(p, "opp"), adj = num(p, "adj"), hyp = num(p, "hyp");
  const ratio = str(p, "ratio");
  if (opp * opp + adj * adj !== hyp * hyp) throw new Error("not a right triangle");
  if (ratio === "sin") return { display: sfrac(opp, hyp), value: opp / hyp };
  if (ratio === "cos") return { display: sfrac(adj, hyp), value: adj / hyp };
  return { display: sfrac(opp, adj), value: opp / adj };
}

function solveVolume(p: Params): Solved {
  if (p["cylinder"] === 1) {
    const r = num(p, "r"), h = num(p, "h");
    return { display: spi(r * r * h), value: r * r * h * Math.PI };
  }
  const l = num(p, "l"), w = num(p, "w"), h = num(p, "h");
  const sf = p["solveFor"];
  if (typeof sf === "string") {
    const dims: Record<string, number> = { l, w, h };
    const missing = dims[sf];
    if (!(sf === "l" || sf === "w" || sf === "h")) throw new Error("bad solveFor");
    return { display: String(missing), value: missing };
  }
  return { display: String(l * w * h), value: l * w * h };
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

const SOLVERS: Record<string, (p: Params) => Solved> = {
  LinearEquation1Var: solveLinearEquation1Var,
  System2x2: solveSystem2x2,
  LinearInequality: solveLinearInequality,
  LinearFunction: solveLinearFunction,
  PercentChange: solvePercentChange,
  RatioProportion: solveRatioProportion,
  OneVarStats: solveOneVarStats,
  Probability: solveProbability,
  QuadraticRoots: solveQuadraticRoots,
  EquivalentExpressions: solveEquivalentExpressions,
  NonlinearFunction: solveNonlinearFunction,
  NonlinearEquation: solveNonlinearEquation,
  TriangleAngles: solveTriangleAngles,
  CircleMeasure: solveCircleMeasure,
  RightTriangleTrig: solveRightTriangleTrig,
  Volume: solveVolume,
};

/** Independently recompute the expected answer for a problem's verify params. */
export function solveIndependent(subdomain: string, params: Params): Solved {
  const solver = SOLVERS[subdomain];
  if (!solver) throw new Error(`no solver for subdomain ${subdomain}`);
  return solver(params);
}

/** Parse a grid-in form to a number; NaN when the form is ambiguous/invalid. */
export function parseGridForm(s: string): number {
  const t = s.trim();
  const frac = t.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
  if (frac) {
    const d = parseInt(frac[2], 10);
    if (d === 0) return NaN;
    return parseInt(frac[1], 10) / d;
  }
  if (/^-?(\d+\.?\d*|\.\d+)$/.test(t)) return parseFloat(t);
  return NaN;
}
