// rt-verify5.ts — Algebra 1 batch 2: parse prompts independently, verify answers.
import { CURRICULUM_REGISTRY } from "@/modules/CurriculumRegistry";
import { failures, fail, counter, report } from "./util";

const bump = (n = 1) => { counter.checks += n; };
const eq = (a: number, b: number, t = 1e-9) => Math.abs(a - b) < t;
const byId = (id: string) => CURRICULUM_REGISTRY.find((e) => e.id === id)!;
const cov = new Map<string, { ok: number; skip: number }>();
const mark = (tag: string, ok: boolean) => {
  const c = cov.get(tag) ?? { ok: 0, skip: 0 };
  ok ? c.ok++ : c.skip++;
  cov.set(tag, c);
};
const clean = (s: string) =>
  String(s).replace(/\\\(|\\\)/g, "").replace(/\\text\{[^}]*\}/g, " ").replace(/\\cdot/g, "*")
    .replace(/\\geq/g, ">=").replace(/\\leq/g, "<=").replace(/\\neq/g, "!=")
    .replace(/\\quad/g, " ").replace(/\s+/g, "");
const expr = (prompt: string) => clean(prompt).replace(/^[A-Za-z]+:/, "");

function parseLin(s: string): { a: number; b: number } | null {
  s = s.replace(/\s+/g, "");
  // fractional coefficient \frac{a}{b}x
  const fm = s.match(/^([+-]?)\\frac\{(-?[\d.]+)\}\{(-?[\d.]+)\}x([+-].*)?$/);
  if (fm) {
    const a = (fm[1] === "-" ? -1 : 1) * Number(fm[2]) / Number(fm[3]);
    const b = fm[4] ? Number(fm[4]) : 0;
    return Number.isFinite(a) && Number.isFinite(b) ? { a, b } : null;
  }
  if (!s.includes("x")) { const b = Number(s); return Number.isFinite(b) ? { a: 0, b } : null; }
  const m = s.match(/^([+-]?(?:\d+(?:\.\d+)?)?)x([+-].*)?$/);
  if (!m) return null;
  const a = m[1] === "" || m[1] === "+" ? 1 : m[1] === "-" ? -1 : Number(m[1]);
  const b = m[2] ? Number(m[2]) : 0;
  return Number.isFinite(a) && Number.isFinite(b) ? { a, b } : null;
}
function parsePoly(s: string): number[] | null {
  s = s.replace(/\s+/g, "").replace(/\^{(\d+)}/g, "^$1");
  const terms = s.replace(/-/g, "+-").split("+").filter(Boolean);
  const map = new Map<number, number>();
  for (const t of terms) {
    const xm = t.match(/^(.*)x(?:\^(\d+))?$/);
    if (xm) {
      const k = xm[1];
      const c = k === "" || k === "+" ? 1 : k === "-" ? -1 : Number(k);
      const e = xm[2] ? Number(xm[2]) : 1;
      if (!Number.isFinite(c) || !Number.isFinite(e)) return null;
      map.set(e, (map.get(e) ?? 0) + c);
    } else {
      const c = Number(t);
      if (!Number.isFinite(c)) return null;
      map.set(0, (map.get(0) ?? 0) + c);
    }
  }
  if (map.size === 0) return null;
  const deg = Math.max(...map.keys());
  const out = new Array(deg + 1).fill(0);
  for (const [e, c] of map) out[deg - e] = c;
  return out;
}
const mulP = (P: number[], Q: number[]) => {
  const R = new Array(P.length + Q.length - 1).fill(0);
  for (let i = 0; i < P.length; i++) for (let j = 0; j < Q.length; j++) R[i + j] += P[i] * Q[j];
  return R;
};
/** parse a numeric answer that may be a \frac or plain number */
function parseFracSimple(s: string): number {
  const m = s.match(/(-?)\\frac\{([\d.]+)\}\{([\d.]+)\}/);
  if (m) return (m[1] === "-" ? -1 : 1) * Number(m[2]) / Number(m[3]);
  return Number(s);
}
function parseXAnswer(s: string): number[] {
  return [...String(s).matchAll(/x\s*=\s*(-?[\d.]+)/g)].map((m) => Number(m[1]));
}
function gen(id: string, seed: number): any[] {
  return byId(id).generate("Test", seed, { count: 3, difficulty: 2 }) as any[];
}
// expand a factored answer string into coefficients (highest-first);
// leading monomial factor is optional ("(x+2)(x+1)" has none)
function expandFactored(a: string): number[] | null {
  const lead = a.match(/^(\d*)x(?:\^\{(\d+)\})?\(/) ?? a.match(/^(\d+)\(/);
  const factors = [...a.matchAll(/\(([^()]+)\)/g)].map((m) => parsePoly(m[1]));
  if (factors.some((f) => !f)) return null;
  let poly: number[];
  if (lead && /^(\d*)x/.test(lead[0])) {
    const c = lead[1] === "" ? 1 : Number(lead[1]);
    const e = lead[2] ? Number(lead[2]) : 1;
    poly = new Array(e + 1).fill(0); poly[0] = c;
  } else if (lead) {
    poly = [Number(lead[1])];
  } else poly = [1];
  for (const f of factors) poly = mulP(poly, f!);
  return poly;
}
const strip0 = (c: number[]) => { const r = [...c]; while (r.length > 1 && r[0] === 0) r.shift(); return r; };

// ── DivisionProperties ───────────────────────────────────────────────────────
for (const id of ["a1-5-4-division-properties"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "DIVPROP";
    if (p.subtype !== "DivisionProperties") { mark(tag, false); continue; }
    bump();
    const m = expr(p.prompt).match(/\\frac\{(-?[\d.]+)x\^\{(\d+)\}\}\{(-?[\d.]+)x\^\{(\d+)\}\}/);
    if (!m) { mark(tag, false); continue; }
    mark(tag, true);
    const c = Number(m[1]) / Number(m[3]), e = Number(m[2]) - Number(m[4]);
    const ae = expr(p.answer);
    // forms: "2x^{3}", "x^{4}" (implicit 1), "5" (x^0)
    const am = ae.match(/^(-?[\d.]+)?x\^\{(\d+)\}$/) ?? ae.match(/^(-?[\d.]+)$/);
    if (!am) { fail("A1-DIV", id, "Test", s, `unparseable answer "${p.answer}"`); continue; }
    const ac = am[1] === undefined || am[1] === "" ? 1 : Number(am[1]);
    const axe = am[2] ? Number(am[2]) : 0;
    if (!eq(ac, c, 1e-9) || axe !== e)
      fail("A1-DIV", id, "Test", s, `mine ${c}x^${e} answer="${p.answer}"`);
  }
}

// ── Recursive sequences ──────────────────────────────────────────────────────
for (const id of ["a1-6-2-recursive-arithmetic", "a1-6-3-recursive-geometric"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "RECURSE";
    bump();
    const c = clean(p.prompt);
    const m = c.match(/f\(1\)=(-?[\d.]+),f\(n\)=f\(n-1\)([+-])(-?[\d.]+).*Findf\((-?[\d.]+)\)/) ??
              c.match(/f\(1\)=(-?[\d.]+),f\(n\)=f\(n-1\)\*(-?[\d.]+).*Findf\((-?[\d.]+)\)/);
    if (!m) { mark(tag, false); continue; }
    mark(tag, true);
    const f1 = Number(m[1]);
    let fn: number, n: number;
    if (p.subtype === "RecursiveArithmetic") {
      const d = Number(m[3]); n = Number(m[4]);
      fn = f1 + (m[2] === "+" ? 1 : -1) * d * (n - 1);
    } else {
      const r = Number(m[2]); n = Number(m[3]);
      fn = f1 * Math.pow(r, n - 1);
    }
    const am = expr(p.answer).match(new RegExp(`f\\(${n}\\)=(-?[\\d.]+)`));
    if (!am || !eq(Number(am[1]), fn, 1e-9))
      fail("A1-RECURSE", id, "Test", s, `${p.subtype}: mine f(${n})=${fn} answer="${p.answer}"`);
  }
}

// ── FOIL ─────────────────────────────────────────────────────────────────────
for (const id of ["a1-7-3-multiplying-binomials"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "FOIL";
    if (!/FOIL|PolyMultiply/.test(p.subtype)) { mark(tag, false); continue; }
    bump();
    const pm = expr(p.prompt).match(/^\((.+)\)\((.+)\)$/);
    const f1 = pm && parseLin(pm[1]), f2 = pm && parseLin(pm[2]);
    const ansC = parsePoly(expr(p.answer));
    if (!pm || !f1 || !f2 || !ansC) { mark(tag, false); continue; }
    mark(tag, true);
    const want = strip0([f1.a * f2.a, f1.a * f2.b + f1.b * f2.a, f1.b * f2.b]);
    const got = strip0(ansC);
    if (want.length !== got.length || !want.every((w, i) => eq(w, got[i], 1e-9)))
      fail("A1-FOIL", id, "Test", s, `mine [${want}] answer="${p.answer}"`);
  }
}

// ── factoring: expand answer, compare (x2+bx+c, ax2+bx+c, diff squares, grouping) ──
for (const id of ["a1-7-4-factor-x2bxc", "a1-7-5-factor-ax2bxc", "a1-7-6-special-cases", "a1-7-7-grouping"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "FACTOR2";
    if (!/Factor/.test(p.subtype)) { mark(tag, false); continue; }
    bump();
    const target = parsePoly(expr(p.prompt));
    const got = expandFactored(expr(p.answer));
    if (!target || !got) { mark(tag, false); continue; }
    mark(tag, true);
    const T = strip0(target), G = strip0(got);
    if (T.length !== G.length || !T.every((t, i) => eq(t, G[i], 1e-6)))
      fail("A1-FACTOR", id, "Test", s, `${p.subtype}: expand("${p.answer}")=[${G}] != prompt [${T}]`);
  }
}

// ── SimplifyRationalExpression: polynomial division + restriction ────────────
for (const id of ["a1-7-8-rational-expressions"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "RATEXPR";
    if (p.subtype !== "SimplifyRationalExpression") { mark(tag, false); continue; }
    bump();
    const m = expr(p.prompt).match(/\\frac\{(.+)\}\{(.+)\}/);
    const N = m && parsePoly(m[1]), D = m && parsePoly(m[2]);
    if (!m || !N || !D) { mark(tag, false); continue; }
    mark(tag, true);
    // positional polynomial long division N / D
    const d = D;
    const degN = N.length - 1, degD = d.length - 1;
    const qq: number[] = new Array(degN - degD + 1).fill(0);
    let n = [...N];
    while (n.length >= d.length && !(n.length === 1 && Math.abs(n[0]) < 1e-12)) {
      const pos = n.length - d.length; // t is the x^pos coefficient
      const t = n[0] / d[0];
      qq[qq.length - 1 - pos] += t;
      for (let i = 0; i < d.length; i++) n[i] -= t * d[i];
      n.shift();
      while (n.length > 1 && Math.abs(n[0]) < 1e-12) n.shift();
    }
    const rem = n.length === 1 && Math.abs(n[0]) < 1e-9 ? [0] : n;
    const a = expr(p.answer);
    // answer like "x-4, x \neq 2" → cleaned: "x-4,x!=-4" style ("x-4,x!=2")
    const qm2 = a.match(/^(.+?),x!=(-?[\d.]+)$/);
    if (!qm2) { fail("A1-RATEXPR", id, "Test", s, `unparseable answer "${p.answer}"`); continue; }
    const Q = parsePoly(qm2[1]);
    if (!Q) { fail("A1-RATEXPR", id, "Test", s, `unparseable quotient in "${p.answer}"`); continue; }
    const Qs = strip0(Q!), QQs = strip0(qq);
    const qOk = Qs.length === QQs.length && Qs.every((c, i) => eq(c, QQs[i], 1e-6));
    const remOk = rem.length === 1 && rem[0] === 0;
    // restriction: denominator zero
    const dRoot = D.length === 2 ? -D[1] / D[0] : null;
    const rOk = dRoot !== null && eq(Number(qm2[2]), dRoot, 1e-9);
    if (!qOk || !remOk || !rOk)
      fail("A1-RATEXPR", id, "Test", s, `mine Q=[${QQs}] rem=[${rem}] restr=${dRoot} answer="${p.answer}"`);
  }
}

// ── QuadraticAttributes ──────────────────────────────────────────────────────
for (const id of ["a1-8-1-graphs-properties"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "QUADATTR";
    if (p.subtype !== "QuadraticAttributes") { mark(tag, false); continue; }
    bump();
    const m = clean(p.prompt).match(/f\(x\)=(.+?):state/);
    const q = m && parsePoly(m[1]);
    if (!m || !q || q.length !== 3 || q[0] === 0) { mark(tag, false); continue; }
    mark(tag, true);
    const vx = -q[1] / (2 * q[0]), vy = q[0] * vx * vx + q[1] * vx + q[2];
    const a = clean(p.answer);
    const probs: string[] = [];
    if (!a.includes(`axis:x=${vx}`) && !a.includes(`axis:x=${vx}.0`)) probs.push(`axis x=${vx}`);
    if (!a.includes(`vertex:(${vx},${vy})`)) probs.push(`vertex (${vx},${vy})`);
    if (!a.includes(`y-intercept:(0,${q[2]})`)) probs.push(`yint ${q[2]}`);
    const mm = q[0] > 0 ? "minimum" : "maximum";
    if (!a.includes(`${mm}${vy}`)) probs.push(`${mm} ${vy}`);
    const rangeOp = q[0] > 0 ? ">=" : "<=";
    if (!a.includes(`range:y${rangeOp}${vy}`)) probs.push(`range y${rangeOp}${vy}`);
    if (probs.length) fail("A1-QUADATTR", id, "Test", s, `mismatch [${probs}] answer="${p.answer}"`);
  }
}

// ── QuadraticTransformations ─────────────────────────────────────────────────
for (const id of ["a1-8-3-transformations"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "QUADTRANS";
    if (p.subtype !== "QuadraticTransformations") { mark(tag, false); continue; }
    bump();
    const m = clean(p.prompt).match(/g\(x\)=(.+?)(\.|$)/);
    if (!m) { mark(tag, false); continue; }
    // vertex form a(x-h)^2+k
    const vm = m[1].match(/^(-?\d*)\(x([+-]\d+)\)\^\{2\}([+-]\d+)?$/);
    if (!vm) { mark(tag, false); continue; }
    mark(tag, true);
    const h = -Number(vm[2]), k = vm[3] ? Number(vm[3]) : 0;
    const a = clean(p.answer).toLowerCase();
    const probs: string[] = [];
    if (h > 0 && !/right/.test(a)) probs.push(`shift right ${h} missing`);
    if (h < 0 && !/left/.test(a)) probs.push(`shift left ${-h} missing`);
    if (k > 0 && !/up/.test(a)) probs.push(`shift up ${k} missing`);
    if (k < 0 && !/down/.test(a)) probs.push(`shift down ${-k} missing`);
    if (probs.length) fail("A1-QUADTRANS", id, "Test", s, `g(x)=${m[1]} [${probs}] answer="${p.answer}"`);
  }
}

// ── VertexForm ───────────────────────────────────────────────────────────────
for (const id of ["a1-8-4-vertex-form"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "VERTEXFORM";
    if (p.subtype !== "VertexForm") { mark(tag, false); continue; }
    bump();
    const c = clean(p.prompt);
    const m = c.match(/vertex\((-?[\d.]+),(-?[\d.]+)\)anda=(-?[\d.]+)/);
    if (!m) { mark(tag, false); continue; }
    mark(tag, true);
    const h = Number(m[1]), k = Number(m[2]), av = Number(m[3]);
    // answer "f(x) = (x - 1)^{2} + 4": expand and compare to a(x-h)^2+k
    const am = expr(p.answer).replace(/^f\(x\)=/, "");
    const g = parsePoly(am) ?? (() => {
      const vmm = am.match(/^(-?\d*)\(x([+-]\d+)\)\^\{2\}([+-]\d+)?$/);
      if (!vmm) return null;
      const aa = vmm[1] === "" ? 1 : vmm[1] === "-" ? -1 : Number(vmm[1]);
      const hh = -Number(vmm[2]), kk = vmm[3] ? Number(vmm[3]) : 0;
      return [aa, -2 * aa * hh, aa * hh * hh + kk];
    })();
    const want = [av, -2 * av * h, av * h * h + k];
    if (!g || g.length !== 3 || !want.every((w, i) => eq(w, g[i], 1e-9)))
      fail("A1-VERTEXFORM", id, "Test", s, `vertex=(${h},${k}) a=${av}: answer "${p.answer}" expands to [${g}]`);
  }
}

// ── CompleteSquare (= solve) & Discriminant ──────────────────────────────────
for (const id of ["a1-8-8-completing-square"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "COMPLETESQ";
    if (p.subtype !== "CompleteSquare") { mark(tag, false); continue; }
    bump();
    const m = expr(p.prompt).match(/^(.+)=0$/);
    const q = m && parsePoly(m[1]);
    if (!m || !q || q.length !== 3 || q[0] === 0) { mark(tag, false); continue; }
    const D = q[1] * q[1] - 4 * q[0] * q[2];
    if (D < 0) { mark(tag, false); continue; }
    mark(tag, true);
    const roots = [(-q[1] + Math.sqrt(D)) / (2 * q[0]), (-q[1] - Math.sqrt(D)) / (2 * q[0])].sort((x, y) => x - y);
    const got = parseXAnswer(p.answer).sort((x, y) => x - y);
    if (got.length < 1 || !got.every((r, i) => eq(r, roots[Math.min(i, roots.length - 1)], 1e-9)))
      fail("A1-COMPLETESQ", id, "Test", s, `mine [${roots}] answer="${p.answer}"`);
  }
}
for (const id of ["a1-8-9-formula-discriminant"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "DISCRIM";
    if (p.subtype !== "QuadraticDiscriminant") { mark(tag, false); continue; }
    bump();
    const m = expr(p.prompt).match(/discriminantof(.+?)andstate/);
    const q = m && parsePoly(m[1].replace(/=0$/, ""));
    if (!m || !q || q.length !== 3) { mark(tag, false); continue; }
    mark(tag, true);
    const D = q[1] * q[1] - 4 * q[0] * q[2];
    const a = clean(p.answer).toLowerCase();
    const want = D > 0 ? "tworeal" : D === 0 ? "onereal" : "noreal";
    if (!a.includes(`d=${D}`) || !a.includes(want))
      fail("A1-DISCRIM", id, "Test", s, `mine D=${D} (${want}) answer="${p.answer}"`);
  }
}

// ── exponentials ─────────────────────────────────────────────────────────────
for (const id of ["a1-9-1-exponential-functions", "a1-9-2-growth-decay"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "EXP";
    bump();
    const c = clean(p.prompt);
    const m = c.match(/f\(x\)=(-?[\d.]+)\((.+?)\)\^\{x\}/) ?? c.match(/f\(x\)=(-?[\d.]+)\(([\d.]+)\)\^x/);
    if (!m) { mark(tag, false); continue; }
    const A = Number(m[1]);
    const B = m[2].includes("frac") ? (() => { const f = m[2].match(/frac\{(\d+)\}\{(\d+)\}/); return f ? Number(f[1]) / Number(f[2]) : NaN; })() : Number(m[2]);
    if (!Number.isFinite(B)) { mark(tag, false); continue; }
    mark(tag, true);
    const a = clean(p.answer).toLowerCase();
    if (p.subtype === "ExponentialGrowth" || p.subtype === "ExponentialDecay") {
      const wantW = B > 1 ? "growth" : "decay";
      if (!a.includes(wantW)) { fail("A1-EXP", id, "Test", s, `b=${B} should be ${wantW}: "${p.answer}"`); continue; }
      const fm = a.match(/f\((-?[\d.]+)\)=(-?[\d.]+)/);
      if (fm) {
        const mine = A * Math.pow(B, Number(fm[1]));
        if (!eq(Number(fm[2]), mine, 0.006)) fail("A1-EXP", id, "Test", s, `f(${fm[1]}) mine=${mine} answer="${p.answer}"`);
      }
      const rm = a.match(/(\d+(?:\.\d+)?)%/);
      if (rm) {
        const wantR = B > 1 ? (B - 1) * 100 : (1 - B) * 100;
        if (!eq(Number(rm[1]), wantR, 0.6)) fail("A1-EXP", id, "Test", s, `rate mine=${wantR}% answer="${p.answer}"`);
      }
    } else if (p.subtype === "GraphExponential") {
      if (!a.includes(`(0,${A})`)) fail("A1-EXP", id, "Test", s, `y-int should be (0,${A}): "${p.answer}"`);
      if (!/asymptote:y=0/.test(a)) fail("A1-EXP", id, "Test", s, `asymptote should be y=0: "${p.answer}"`);
    } else mark(tag, false);
  }
}
for (const id of ["a1-9-3-modeling"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "EXPMODEL";
    bump();
    const c = clean(p.prompt);
    if (p.subtype === "ExponentialModeling") {
      const tm = c.match(/x&([\d.,&\s-]+)\\\\\\hliney&([\d.,&\s-]+)\\end\{array\}/) ??
                 c.match(/x&([^\\]+)\\\\\s*\\hline\s*y&([^\\]+)\\end\{array\}/);
      const pm = c.match(/predict(?:thevalue)?atx=(\d+)/);
      if (!tm || !pm) { mark(tag, false); continue; }
      const xs = tm[1].split("&").map(Number), ys = tm[2].split("&").map(Number);
      if (xs.some((x) => !Number.isFinite(x)) || ys.some((x) => !Number.isFinite(x))) { mark(tag, false); continue; }
      mark(tag, true);
      const r = ys[1] / ys[0];
      if (!ys.every((y, i) => i < 2 || eq(y / ys[i - 1], r, 1e-9))) { fail("A1-EXPMODEL", id, "Test", s, `table not geometric: "${p.answer}"`); continue; }
      const n = Number(pm[1]);
      const mine = ys[0] * Math.pow(r, n);
      const am = expr(p.answer).match(/f\(\d+\)=(-?[\d.]+)/);
      if (!am || !eq(Number(am[1]), mine, 1e-6))
        fail("A1-EXPMODEL", id, "Test", s, `mine f(${n})=${mine} answer="${p.answer}"`);
    } else if (p.subtype === "ExponentialWordProblem") {
      const m2 = c.match(/deposit\$([\d.]+).*?(\d+(?:\.\d+)?)%annualinterest.*?after(\d+)years/);
      if (!m2) { mark(tag, false); continue; }
      mark(tag, true);
      const P = Number(m2[1]), rate = Number(m2[2]) / 100, t = Number(m2[3]);
      const mine = P * Math.pow(1 + rate, t);
      const am = expr(p.answer).match(/\$([\d.]+)$/);
      if (!am || !eq(Number(am[1]), mine, 0.006))
        fail("A1-EXPMODEL", id, "Test", s, `mine $${mine.toFixed(2)} answer="${p.answer}"`);
    } else mark(tag, false);
  }
}

// ── SystemWordProblem (sum & difference) ─────────────────────────────────────
for (const id of ["a1-4-4-applications"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "SYSWORD";
    if (p.subtype !== "SystemWordProblem") { mark(tag, false); continue; }
    bump();
    const c = clean(p.prompt).toLowerCase();
    const m = c.match(/sumof(twonumbers)?is(\d+).*?differenceis(\d+)/);
    if (!m) { mark(tag, false); continue; }
    mark(tag, true);
    const S = Number(m[2]), Df = Number(m[3]);
    const n1 = (S - Df) / 2, n2 = (S + Df) / 2;
    const am = String(p.answer).match(/(-?[\d.]+)\s*and\s*(-?[\d.]+)/);
    if (!am) { fail("A1-SYSWORD", id, "Test", s, `unparseable answer "${p.answer}"`); continue; }
    const got = [Number(am[1]), Number(am[2])].sort((x, y) => x - y);
    if (!eq(got[0], n1, 1e-9) || !eq(got[1], n2, 1e-9) || !eq(got[0] + got[1], S, 1e-9) || !eq(got[1] - got[0], Df, 1e-9))
      fail("A1-SYSWORD", id, "Test", s, `sum=${S} diff=${Df}: mine ${n1},${n2} answer="${p.answer}"`);
  }
}

// ── LinearInequality: solid/dashed + shade direction ─────────────────────────
for (const id of ["a1-4-5-linear-inequalities"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "LININEQ";
    if (p.subtype !== "LinearInequality") { mark(tag, false); continue; }
    bump();
    const m = clean(p.prompt).match(/y(>=|<=|>|<)(.+)/);
    if (!m) { mark(tag, false); continue; }
    mark(tag, true);
    const a = clean(p.answer).toLowerCase();
    const wantB = />=|<=/.test(m[1]) ? "solid" : "dashed";
    const wantS = />|>=/.test(m[1]) ? "above" : "below";
    if (!a.includes(wantB) || !a.includes(wantS))
      fail("A1-LININEQ", id, "Test", s, `y ${m[1]} ...: want ${wantB}/${wantS}, answer="${p.answer}"`);
  }
}

// ── SlopeFromPoints / WritePointSlope / GraphLine ────────────────────────────
for (const id of ["a1-23-1-rate-of-change"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "SLOPEPTS";
    if (p.subtype !== "SlopeFromPoints") { mark(tag, false); continue; }
    bump();
    const m = clean(p.prompt).match(/through\((-?[\d.]+),(-?[\d.]+)\)and\((-?[\d.]+),(-?[\d.]+)\)/);
    if (!m) { mark(tag, false); continue; }
    mark(tag, true);
    const [x1, y1, x2, y2] = [m[1], m[2], m[3], m[4]].map(Number);
    const am = expr(p.answer).match(/m=(.+)$/);
    if (x2 === x1) { if (!/undefined/i.test(String(p.answer))) fail("A1-SLOPE", id, "Test", s, `vertical line, answer="${p.answer}"`); continue; }
    const got = am ? parseFracSimple(am[1]) : NaN;
    if (!am || !Number.isFinite(got) || !eq(got, (y2 - y1) / (x2 - x1), 1e-9))
      fail("A1-SLOPE", id, "Test", s, `mine m=${(y2 - y1) / (x2 - x1)} answer="${p.answer}"`);
  }
}
for (const id of ["a1-23-4-point-slope"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "PTSLOPE";
    if (p.subtype !== "WritePointSlope") { mark(tag, false); continue; }
    bump();
    const m = clean(p.prompt).match(/slope(-?[\d.]+)through\((-?[\d.]+),(-?[\d.]+)\)/);
    if (!m) { mark(tag, false); continue; }
    mark(tag, true);
    const sl = Number(m[1]), x1 = Number(m[2]), y1 = Number(m[3]);
    // answer "y - 1 = 1(x - 1)": parse and verify point + slope
    const am = expr(p.answer).match(/^y([+-])(-?[\d.]+)=(-?[\d.]+)\(x([+-])(-?[\d.]+)\)$/);
    if (!am) { fail("A1-PTSLOPE", id, "Test", s, `unparseable answer "${p.answer}"`); continue; }
    const ay = (am[1] === "+" ? -1 : 1) * Number(am[2]);
    const ax = (am[4] === "+" ? -1 : 1) * Number(am[5]);
    const asl = Number(am[3]);
    if (!eq(asl, sl, 1e-9) || !eq(ax, x1, 1e-9) || !eq(ay, y1, 1e-9))
      fail("A1-PTSLOPE", id, "Test", s, `mine y-${y1}=${sl}(x-${x1}) answer="${p.answer}"`);
  }
}
for (const id of ["a1-23-6-graphing-function-rule"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "GRAPHLINE";
    if (p.subtype !== "GraphLine") { mark(tag, false); continue; }
    bump();
    const m = clean(p.prompt).match(/Graphy=(.+?)\.Then/);
    const L = m && parseLin(m[1]);
    if (!m || !L || L.a === 0) { mark(tag, false); continue; }
    mark(tag, true);
    const xi = -L.b / L.a;
    const a = clean(p.answer);
    const xim = a.match(/x-intercept:\((-?[\d.]+),(-?[\d.]+)\)/);
    const yim = a.match(/y-intercept:\((-?[\d.]+),(-?[\d.]+)\)/);
    if (!xim || !yim || !eq(Number(xim[1]), xi, 0.0051) || !eq(Number(yim[2]), L.b, 1e-9))
      fail("A1-GRAPHLINE", id, "Test", s, `mine xint=(${xi},0) yint=(0,${L.b}) answer="${p.answer}"`);
  }
}

// ── WriteFunctionRule (table in prompt) ──────────────────────────────────────
for (const id of ["a1-23-7-writing-function-rule"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "FUNCRULE";
    if (p.subtype !== "WriteFunctionRule") { mark(tag, false); continue; }
    bump();
    const c = clean(p.prompt);
    const tm = c.match(/x&([^\\]+)\\\\\s*\\hline\s*y&([^\\]+)\\end\{array\}/);
    if (!tm) { mark(tag, false); continue; }
    const xs = tm[1].split("&").map(Number), ys = tm[2].split("&").map(Number);
    if (xs.some((x) => !Number.isFinite(x)) || ys.some((x) => !Number.isFinite(x))) { mark(tag, false); continue; }
    mark(tag, true);
    const sl = (ys[1] - ys[0]) / (xs[1] - xs[0]);
    const b = ys[0] - sl * xs[0];
    if (!ys.every((y, i) => eq(y, sl * xs[i] + b, 1e-9))) { fail("A1-FUNCRULE", id, "Test", s, `table not linear: "${p.answer}"`); continue; }
    const rhs = parseLin(expr(p.answer).replace(/^f\(x\)=/, ""));
    if (!rhs || !eq(rhs.a, sl, 1e-9) || !eq(rhs.b, b, 1e-9))
      fail("A1-FUNCRULE", id, "Test", s, `mine f(x)=${sl}x+${b} answer="${p.answer}"`);
  }
}

// ── RelationsFunctions ───────────────────────────────────────────────────────
for (const id of ["a1-23-8-relations-functions"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "RELFUNC";
    if (p.subtype !== "RelationsFunctions") { mark(tag, false); continue; }
    bump();
    const c = clean(p.prompt);
    const m = c.match(/\\\{(.+)\\\}.*Isitafunction/);
    if (!m) { mark(tag, false); continue; }
    mark(tag, true);
    const pairs = [...m[1].matchAll(/\((-?[\d.]+),(-?[\d.]+)\)/g)].map((x) => [Number(x[1]), Number(x[2])]);
    const dom = [...new Set(pairs.map((pr) => pr[0]))].sort((x, y) => x - y);
    const rng = [...new Set(pairs.map((pr) => pr[1]))].sort((x, y) => x - y);
    const isFunc = dom.length === pairs.length;
    const a = clean(p.answer);
    const probs: string[] = [];
    if (isFunc !== /^Yes/.test(a)) probs.push(`function? mine=${isFunc}`);
    const dm = a.match(/domain:\\\{([^}]+)\\\}/), rm = a.match(/range:\\\{([^}]+)\\\}/);
    if (!dm || dm[1].split(",").map(Number).sort((x, y) => x - y).join() !== dom.join()) probs.push(`domain mine={${dom}}`);
    if (!rm || rm[1].split(",").map(Number).sort((x, y) => x - y).join() !== rng.join()) probs.push(`range mine={${rng}}`);
    if (probs.length) fail("A1-RELFUNC", id, "Test", s, `[${probs}] answer="${p.answer}"`);
  }
}

// ── FunctionNotation ─────────────────────────────────────────────────────────
for (const id of ["a1-23-9-function-notation"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "FUNCNOT";
    if (p.subtype !== "FunctionNotation") { mark(tag, false); continue; }
    bump();
    const c = clean(p.prompt);
    const m = c.match(/f\(x\)=(.+?),findf\((-?[\d.]+)\)/);
    const L = m && parseLin(m[1]);
    if (!m || !L) { mark(tag, false); continue; }
    mark(tag, true);
    const x = Number(m[2]);
    const mine = L.a * x + L.b;
    const am = expr(p.answer).match(/f\(-?[\d.]+\)=(-?[\d.]+)/);
    if (!am || !eq(Number(am[1]), mine, 1e-9))
      fail("A1-FUNCNOT", id, "Test", s, `f(${x}) mine=${mine} answer="${p.answer}"`);
  }
}

// ── ParallelPerpendicular ────────────────────────────────────────────────────
for (const id of ["a1-23-10-parallel-perpendicular"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "PARPERP";
    if (p.subtype !== "ParallelPerpendicular") { mark(tag, false); continue; }
    bump();
    const c = clean(p.prompt);
    const m = c.match(/line(parallel|perpendicular)toy=(.+?)through\((-?[\d.]+),(-?[\d.]+)\)/);
    const L = m && parseLin(m[2]);
    if (!m || !L) { mark(tag, false); continue; }
    mark(tag, true);
    const wantM = m[1] === "parallel" ? L.a : -1 / L.a;
    const [x1, y1] = [Number(m[3]), Number(m[4])];
    const b = y1 - wantM * x1;
    const rhs = parseLin(expr(p.answer).replace(/^y=/, ""));
    if (!rhs || !eq(rhs.a, wantM, 1e-9) || !eq(rhs.b, b, 1e-9))
      fail("A1-PARPERP", id, "Test", s, `${m[1]}: mine y=${wantM}x+${b} answer="${p.answer}"`);
  }
}

// ── TransformLinear ──────────────────────────────────────────────────────────
for (const id of ["a1-23-11-transform-linear"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "TRANSLIN";
    if (p.subtype !== "TransformLinear") { mark(tag, false); continue; }
    bump();
    const c = clean(p.prompt);
    const m = c.match(/fromf\(x\)=(.+?)tog\(x\)=(.+?)\./);
    const F = m && parseLin(m[1]), G = m && parseLin(m[2]);
    if (!m || !F || !G) { mark(tag, false); continue; }
    mark(tag, true);
    // factory may describe the shift vertically OR horizontally; verify the
    // claimed transformation actually maps f to g.
    const a = clean(p.answer).toLowerCase();
    const tm = a.match(/(vertical|horizontal)shift(up|down|left|right)(\d+(?:\.\d+)?)/);
    if (!tm) { fail("A1-TRANSLIN", id, "Test", s, `unparseable answer "${p.answer}"`); continue; }
    const N = Number(tm[3]);
    let okShift: boolean;
    if (tm[1] === "vertical") {
      const wantB = tm[2] === "up" ? F.b + N : F.b - N;
      okShift = eq(G.a, F.a, 1e-9) && eq(G.b, wantB, 1e-9);
    } else {
      // g(x) = f(x - h): right h>0 → G.b = F.b - F.a*h; left → F.b + F.a*h
      const wantB = tm[2] === "right" ? F.b - F.a * N : F.b + F.a * N;
      okShift = eq(G.a, F.a, 1e-9) && eq(G.b, wantB, 1e-9);
    }
    if (!okShift)
      fail("A1-TRANSLIN", id, "Test", s, `f(x)=${F.a}x+${F.b} g(x)=${G.a}x+${G.b}: claimed "${p.answer}" doesn't map f→g`);
  }
}

// ── LineOfBestFit (data from graph payload) ──────────────────────────────────
for (const id of ["a1-23-12-scatter-trend"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "BESTFIT";
    if (p.subtype !== "LineOfBestFit") { mark(tag, false); continue; }
    bump();
    const pts = p.graph?.points as number[][] | undefined;
    if (!pts || pts.length < 2) { mark(tag, false); continue; }
    mark(tag, true);
    const n = pts.length;
    const sx = pts.reduce((s, q) => s + q[0], 0), sy = pts.reduce((s, q) => s + q[1], 0);
    const sxx = pts.reduce((s, q) => s + q[0] * q[0], 0), sxy = pts.reduce((s, q) => s + q[0] * q[1], 0);
    const m = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    const b = (sy - m * sx) / n;
    const mr = Math.round(m * 100) / 100, br = Math.round(b * 100) / 100;
    const a = clean(p.answer);
    const am = a.match(/y=(-?[\d.]+)x([+-])(-?[\d.]+);about(-?[\d.]+)/);
    if (!am) { fail("A1-BESTFIT", id, "Test", s, `unparseable answer "${p.answer}"`); continue; }
    const pm = Number(am[1]), pb = (am[2] === "+" ? 1 : -1) * Number(am[3]);
    const predX = (() => { const q = clean(p.prompt).match(/predictthescorefor(\d+)studyhours/); return q ? Number(q[1]) : null; })();
    const probs: string[] = [];
    if (!eq(pm, mr, 0.0051) || !eq(pb, br, 0.0051)) probs.push(`line mine y=${mr}x+${br}`);
    if (predX !== null && !eq(Number(am[4]), Math.round((mr * predX + br) * 10) / 10, 0.051)) probs.push(`pred mine=${mr * predX + br}`);
    if (probs.length) fail("A1-BESTFIT", id, "Test", s, `[${probs}] answer="${p.answer}"`);
  }
}

// ── TwoWayTable (data from graph payload) ─────────────────────────────────────
for (const id of ["a1-23-13-two-way-tables"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "TWOWAY";
    if (p.subtype !== "TwoWayTable") { mark(tag, false); continue; }
    bump();
    const g = p.graph as { rowLabels: string[]; colLabels: string[]; data: number[][] } | undefined;
    if (!g || !g.data) { mark(tag, false); continue; }
    const q = clean(p.prompt).toLowerCase();
    // joint-cell percent question: "both <row> and <col>" → cell/grand total
    const ri = g.rowLabels.findIndex((r) => q.includes(r.toLowerCase().replace(/\s+/g, "")));
    const ci = g.colLabels.findIndex((c) => q.includes(c.toLowerCase().replace(/\s+/g, "")));
    if (ri >= 0 && ci >= 0 && /both/.test(q)) {
      mark(tag, true);
      const total = g.data.flat().reduce((s, v) => s + v, 0);
      const mine = Math.round((g.data[ri][ci] / total) * 100);
      const am = String(p.answer).match(/(\d+)%/);
      if (!am || Number(am[1]) !== mine)
        fail("A1-TWOWAY", id, "Test", s, `cell[${ri}][${ci}]=${g.data[ri][ci]}/${total} mine=${mine}% answer="${p.answer}"`);
      continue;
    }
    // marginal total question: "how many ... <label> in total?"
    const tm = q.match(/howmany.+?([a-z][a-z\s]*)intotal/);
    if (tm) {
      const lab = tm[1].replace(/\s+/g, "");
      const rj = g.rowLabels.findIndex((r) => r.toLowerCase().replace(/\s+/g, "").includes(lab) || lab.includes(r.toLowerCase().replace(/\s+/g, "")));
      const cj = rj < 0 ? g.colLabels.findIndex((c) => c.toLowerCase().replace(/\s+/g, "").includes(lab) || lab.includes(c.toLowerCase().replace(/\s+/g, ""))) : -1;
      if (rj >= 0 || cj >= 0) {
        mark(tag, true);
        const mine = rj >= 0 ? g.data[rj].reduce((s, v) => s + v, 0) : g.data.reduce((s, row) => s + row[cj], 0);
        const am = String(p.answer).match(/(\d+)/);
        if (!am || Number(am[1]) !== mine)
          fail("A1-TWOWAY", id, "Test", s, `marginal "${tm[1].trim()}" mine=${mine} answer="${p.answer}"`);
        continue;
      }
    }
    mark(tag, false);
  }
}

console.log("\n[verify5] coverage per block (ok/skipped):");
for (const [t, c] of [...cov.entries()].sort()) console.log(`  ${t}: ok=${c.ok} skip=${c.skip}`);
report("rt-verify5 (algebra 1 batch 2)");
process.exit(0);
