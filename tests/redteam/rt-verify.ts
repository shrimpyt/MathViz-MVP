// rt-verify.ts — INDEPENDENT answer verification.
// For every reachable problem we recompute the answer with OUR OWN math
// (never calling the factory's answer path) and require:
//   1. our recompute == the claimed key/answer
//   2. for MCQs: every option is evaluated — a distractor that ALSO satisfies
//      the true condition is an accidentally-correct answer (critical).
import { CURRICULUM_REGISTRY } from "@/modules/CurriculumRegistry";
import { failures, fail, report } from "./util";

import { counter } from "./util";
const bump = (n = 1) => { counter.checks += n; };
const eps = 1e-9;
const eq = (a: number, b: number) => Math.abs(a - b) < 1e-7;

// unicode minus / pi normalization for numeric parse
function num(s: string): number {
  const t = s.replace(/−/g, "-").replace(/\s+/g, "");
  if (/\/-?\d/.test(t) && !/e/i.test(t)) {
    const [n, d] = t.split("/").map(Number);
    return n / d;
  }
  return Number(t);
}

// ── generic MCQ structural checks ────────────────────────────────────────────
function checkSATStructure(p: any, tag: string) {
  bump();
  if (p.format !== "MCQ") return;
  const opts = p.options ?? [];
  const keys = opts.filter((o: any) => o.isKey);
  if (keys.length !== 1) fail("SAT-KEY-COUNT", tag, "Test", 0, `${p.subdomain}: ${keys.length} options marked isKey (stem: ${String(p.stem).slice(0,60)})`);
  bump();
  if (p.keyIndex == null || opts[p.keyIndex]?.isKey !== true)
    fail("SAT-KEYINDEX", tag, "Test", 0, `${p.subdomain}: keyIndex ${p.keyIndex} doesn't point at the key option`);
  bump();
  const labels = opts.map((o: any) => String(o.label).replace(/\s+/g, ""));
  if (new Set(labels).size !== labels.length)
    fail("SAT-DUP-LABEL", tag, "Test", 0, `${p.subdomain}: duplicate option labels: ${labels.join("|")}`);
  bump();
  if (String(p.key) !== String(opts[p.keyIndex]?.label))
    fail("SAT-KEY-MISMATCH", tag, "Test", 0, `${p.subdomain}: key "${p.key}" != key option label "${opts[p.keyIndex]?.label}"`);
}

// ── per-subdomain truth evaluators: option value -> is it REALLY correct? ────
type Ctx = { params: any; stem: string };
const truth: Record<string, (v: number, label: string, c: Ctx) => boolean | "skip"> = {
  LinearEquation1Var: (v, _l, c) => {
    const { a, b, cc } = { a: c.params.a, b: c.params.b, cc: c.params.c };
    return c.params.distributed ? eq(a * (v + b), cc) : eq(a * v + b, cc);
  },
  System2x2: (v, _l, c) => {
    const { a1, b1, c1, a2, b2, c2, askX, askSum } = c.params;
    const det = a1 * b2 - a2 * b1;
    if (det === 0) return "skip";
    const x = (c1 * b2 - c2 * b1) / det, y = (a1 * c2 - a2 * c1) / det;
    // sanity: our solution must satisfy both equations
    if (!eq(a1 * x + b1 * y, c1) || !eq(a2 * x + b2 * y, c2)) return "skip";
    if (askX) return eq(v, x);
    if (askSum) return eq(v, x + y);
    return eq(v, y); // askY variant
  },
  LinearInequality: (v, label, c) => {
    const uni = (s: string) => s.replace(/≤/g, "<=").replace(/≥/g, ">=");
    const norm = uni(label.replace(/\s+/g, ""));
    const m = norm.match(/^x(<=|>=|<|>)(\S+)$/);
    if (!m) return "skip";
    const boundary = (c.params.c - c.params.b) / c.params.a;
    return eq(num(m[2]), boundary) && m[1] === uni(String(c.params.correctOp));
  },
  LinearFunction: (v, _l, c) => {
    const p = c.params;
    if (p.word) return eq(v, p.rate * p.g + p.base); // C(g) = rate·g + base
    const { m, b, k, solveForX } = p;
    if (m === undefined) return "skip";
    // solveForX payload carries the target value as `v` (x = (v-b)/m), not `k`.
    return solveForX ? eq(m * v + b, p.v) : eq(v, m * k + b);
  },
  PercentChange: (v, _l, c) => {
    const { old, nw } = c.params;
    if (old === 0) return "skip";
    return eq(v, ((nw - old) / old) * 100);
  },
  RatioProportion: (v, _l, c) => {
    const p = c.params;
    if (p.scaleMode === 1) return eq(v, p.mapCm * p.perCm); // map scale: actual = mapCm × km-per-cm
    const { a, b, cc } = { a: p.a, b: p.b, cc: p.c };
    if (a === 0 || a === undefined) return "skip";
    return eq(v, (b * cc) / a);
  },
  OneVarStats: (v, _l, c) => {
    const d = [...c.params.data].sort((x: number, y: number) => x - y);
    const n = d.length;
    const stat = c.params.stat;
    let mine: number | "skip" = "skip";
    if (stat === "mean") mine = d.reduce((s: number, x: number) => s + x, 0) / n;
    else if (stat === "median") mine = n % 2 ? d[(n - 1) / 2] : (d[n / 2 - 1] + d[n / 2]) / 2;
    else if (stat === "range") mine = d[n - 1] - d[0];
    else if (stat === "mode") {
      const counts = new Map<number, number>();
      for (const x of d) counts.set(x, (counts.get(x) ?? 0) + 1);
      let best = d[0], bn = 0;
      for (const [x, nn] of counts) if (nn > bn) { bn = nn; best = x; }
      mine = best;
    }
    return mine === "skip" ? "skip" : eq(v, mine);
  },
  Probability: (v, _l, c) => {
    const p = c.params;
    if (p.tableMode === 0) {
      const t = p.total;
      if (!t) return "skip";
      return eq(v, p.complement ? 1 - p.fav / t : p.fav / t);
    }
    const total = p.a + p.b + p.c + p.d;
    if (!total) return "skip";
    return eq(v, p.complement ? 1 - p.cell / total : p.cell / total);
  },
  QuadraticRoots: (v, _l, c) => {
    const { r1, r2, ask } = c.params;
    if (ask === "sum") return eq(v, r1 + r2);
    if (ask === "product") return eq(v, r1 * r2);
    if (ask === "greater") return eq(v, Math.max(r1, r2));
    if (ask === "lesser") return eq(v, Math.min(r1, r2));
    return "skip";
  },
  EquivalentExpressions: (v, _l, c) => {
    const { a, b, lead, askMiddle } = c.params;
    if (lead === 2) return eq(v, a + 2 * b);
    if (askMiddle) return eq(v, a + b);
    return eq(v, a * b);
  },
  NonlinearFunction: (v, _l, c) => {
    const { a, p, q, x } = c.params;
    return eq(v, a * x * x + p * x + q);
  },
  NonlinearEquation: (v, _l, c) => {
    const { k, h } = c.params;
    if (!eq((v - h) * (v - h), k)) return false;
    const stem = c.stem;
    if (/x\s*>\s*0|positive solution/.test(stem)) return v > 0;
    if (/x\s*<\s*0|negative solution/.test(stem)) return v < 0;
    // "(x − h)² = k" has two roots; the stem asks for the greater one.
    if (/greater solution/.test(stem)) return eq(v, h + Math.sqrt(k));
    return true;
  },
  TriangleAngles: (v, _l, c) => {
    const { given, findBase, iso } = c.params;
    if (!iso) return "skip";
    return findBase ? eq(v, (180 - given) / 2) : eq(v, 180 - 2 * given);
  },
  CircleMeasure: (v, _l, c) => {
    const { r, ask } = c.params;
    if (ask === "area") return eq(v, Math.PI * r * r);
    if (ask === "circumference") return eq(v, 2 * Math.PI * r);
    return "skip";
  },
  RightTriangleTrig: (v, _l, c) => {
    const { opp, adj, hyp, ratio } = c.params;
    if (ratio === "sin") return eq(v, opp / hyp);
    if (ratio === "cos") return eq(v, adj / hyp);
    if (ratio === "tan") return eq(v, opp / adj);
    return "skip";
  },
  Volume: (v, _l, c) => {
    const p = c.params;
    if (p.cylinder) return eq(v, Math.PI * p.r * p.r * p.h);
    if (p.solveFor) {
      const V = p.l * p.w * p.h;
      const others = (["l", "w", "h"] as const).filter((d) => d !== p.solveFor);
      return eq(v, V / (p[others[0]] * p[others[1]]));
    }
    return eq(v, p.l * p.w * p.h);
  },
};

const satIds = CURRICULUM_REGISTRY.filter((e) => e.id.startsWith("sat-") && e.id !== "sat-full-module");
let satN = 0, satUnverified = 0;
for (const entry of satIds) {
  for (let s = 0; s < 40; s++) {
    const ps = entry.generate("Test", s * 131 + 7, { count: 3, difficulty: (s % 3) + 1 as 1 | 2 | 3 }) as any[];
    for (const p of ps) {
      satN++;
      checkSATStructure(p, entry.id);
      if (p.format !== "MCQ") {
        // GridIn: acceptedForms must all be numeric-equal to keyValue
        bump();
        const forms = p.acceptedForms ?? [];
        if (forms.length === 0) fail("SAT-GRIDIN-NOFORMS", entry.id, "Test", s, `${p.subdomain}: no acceptedForms`);
        for (const f of forms) {
          bump();
          if (!eq(num(String(f)), Number(p.keyValue)))
            fail("SAT-GRIDIN-FORM", entry.id, "Test", s, `${p.subdomain}: acceptedForm "${f}" != keyValue ${p.keyValue}`);
        }
        continue;
      }
      const ev = truth[p.subdomain];
      if (!ev || !p.verify?.params) { satUnverified++; continue; }
      const ctx: Ctx = { params: p.verify.params, stem: String(p.stem) };
      let correctCount = 0, skipped = false;
      const keyOpts: string[] = [];
      for (const o of p.options) {
        bump();
        const t = ev(Number(o.value), String(o.label), ctx);
        if (t === "skip") { skipped = true; satUnverified++; break; }
        if (t) { correctCount++; keyOpts.push(o.option); }
        if (t && !o.isKey)
          fail("SAT-DISTRACTOR-CORRECT", entry.id, "Test", s,
            `${p.subdomain}: option ${o.option} ("${o.label}") is ALSO mathematically correct! stem: ${String(p.stem).slice(0, 70)}`);
        if (!t && o.isKey)
          fail("SAT-KEY-WRONG", entry.id, "Test", s,
            `${p.subdomain}: marked key ${o.option} ("${o.label}") does NOT satisfy the equation! stem: ${String(p.stem).slice(0, 70)} params=${JSON.stringify(p.verify.params)}`);
      }
      bump();
      if (!skipped && correctCount === 0 && p.options.length)
        fail("SAT-NO-CORRECT", entry.id, "Test", s, `${p.subdomain}: no option satisfies the math. stem: ${String(p.stem).slice(0, 70)}`);
      // independent direction-flip check for inequalities
      if (p.subdomain === "LinearInequality" && !skipped) {
        bump();
        const flip: Record<string, string> = { "<": ">", ">": "<", "<=": ">=", ">=": "<=" };
        const opN = String(ctx.params.op).replace(/≤/g, "<=").replace(/≥/g, ">=");
        const expected = ctx.params.a < 0 ? flip[opN] : opN;
        const gotN = String(ctx.params.correctOp).replace(/≤/g, "<=").replace(/≥/g, ">=");
        if (expected !== gotN)
          fail("SAT-INEQ-FLIP", entry.id, "Test", s, `correctOp ${ctx.params.correctOp} != independently derived ${expected} (a=${ctx.params.a}, op=${ctx.params.op})`);
      }
    }
  }
}

// ── SAT PercentChange stem-vs-key sign consistency ────────────────────────────
// stem asks "percent increase/decrease" but key is a signed percent change.
for (const entry of satIds.filter((e) => e.id === "sat-psda-percent")) {
  for (let s = 0; s < 60; s++) {
    const ps = entry.generate("Test", s * 37 + 1, { count: 2, difficulty: 2 }) as any[];
    for (const p of ps) {
      bump();
      const stem = String(p.stem);
      const kv = Number(p.keyValue);
      if (/percent decrease/i.test(stem) && kv > 0)
        fail("SAT-PCT-SIGN", entry.id, "Test", s, `stem asks "percent decrease" but key is +${kv}`);
      if (/percent increase/i.test(stem) && kv < 0)
        fail("SAT-PCT-SIGN", entry.id, "Test", s, `stem asks "percent increase" but key is ${kv} (stem: ${stem.slice(0,60)})`);
      // explanation must agree with the key
      bump();
      const expl = String(p.explanation);
      const m = expl.match(/=\s*(-?[\d.]+)%/);
      if (m && !eq(Number(m[1]), kv))
        fail("SAT-PCT-EXPL", entry.id, "Test", s, `explanation claims ${m[1]}% but key is ${kv} (stem: ${stem.slice(0,60)})`);
    }
  }
}

// ── SAT QuadraticRoots: roots must satisfy the stem equation ─────────────────
for (const entry of satIds.filter((e) => e.id === "sat-pam-quadratics")) {
  for (let s = 0; s < 40; s++) {
    const ps = entry.generate("Test", s * 53 + 2, { count: 2, difficulty: 2 }) as any[];
    for (const p of ps) {
      const vp = p.verify?.params;
      if (!vp || vp.ask === undefined) continue;
      // parse "x² − 8x + 12 = 0" from stem
      const m = String(p.stem).replace(/−/g, "-").match(/x²\s*([+-])\s*(\d+)x\s*([+-])\s*(\d+)\s*=\s*0/);
      if (!m) continue;
      bump();
      const b = (m[1] === "-" ? -1 : 1) * Number(m[2]);
      const cst = (m[3] === "-" ? -1 : 1) * Number(m[4]);
      for (const r of [vp.r1, vp.r2]) {
        if (!eq(r * r + b * r + cst, 0))
          fail("SAT-QUAD-ROOT", entry.id, "Test", s, `claimed root ${r} doesn't satisfy stem equation (stem: ${String(p.stem).slice(0,50)})`);
      }
    }
  }
}

console.log(`\nsat problems checked: ${satN}, unverified-by-evaluator: ${satUnverified}`);
report("rt-verify (SAT)");
process.exit(0);
