// rt-verify4.ts — Algebra 1: NO verify payloads exist, so we parse the LaTeX
// prompt with our own parsers, solve independently, and compare to the answer.
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

// strip \( \), \text{}, and the leading English word prefix ("Solve:", "Simplify:", ...)
const clean = (s: string) =>
  String(s).replace(/\\\(|\\\)/g, "").replace(/\\text\{[^}]*\}/g, " ").replace(/\\cdot/g, "*")
    .replace(/\\geq/g, ">=").replace(/\\leq/g, "<=").replace(/\\neq/g, "!=")
    .replace(/\s+/g, "");
const expr = (prompt: string) => clean(prompt).replace(/^[A-Za-z]+:/, "");

/** parse linear expr in x: "2x+7", "-x+10", "7", "-2(x-3)" → {a,b} for ax+b */
function parseLin(s: string): { a: number; b: number } | null {
  s = s.replace(/\s+/g, "");
  // distributive form k(inner)
  const dm = s.match(/^(-?[\d.]+)\((.+)\)$/);
  if (dm) {
    const inner = parseLin(dm[1] === "" ? dm[2] : dm[2]);
    const k = Number(dm[1]);
    if (!inner || !Number.isFinite(k)) return null;
    return { a: k * inner.a, b: k * inner.b };
  }
  if (!s.includes("x")) { const b = Number(s); return Number.isFinite(b) ? { a: 0, b } : null; }
  const m = s.match(/^([+-]?(?:\d+(?:\.\d+)?)?)x([+-].*)?$/);
  if (!m) return null;
  const a = m[1] === "" || m[1] === "+" ? 1 : m[1] === "-" ? -1 : Number(m[1]);
  const b = m[2] ? Number(m[2]) : 0;
  return Number.isFinite(a) && Number.isFinite(b) ? { a, b } : null;
}

/** general polynomial parser "2x^{3}+12x^{2}+12x" → coeffs highest-first */
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
  const deg = Math.max(...map.keys());
  const out = new Array(deg + 1).fill(0);
  for (const [e, c] of map) out[deg - e] = c;
  return out;
}
const evPoly = (c: number[], x: number) => c.reduce((s, ci, i) => s + ci * Math.pow(x, c.length - 1 - i), 0);

/** evaluate simple numeric fraction "\frac{1}{16}" or "3" */
function parseFrac(s: string): number {
  s = s.replace(/\s+/g, "");
  const m = s.match(/\\frac\{(-?[\d.]+)\}\{(-?[\d.]+)\}/);
  if (m) return Number(m[1]) / Number(m[2]);
  return Number(s);
}

/** parse answer "x = 1" / "x = -6 or x = 6" → number[] */
function parseXAnswer(s: string): number[] {
  return [...String(s).matchAll(/x\s*=\s*(-?[\d.]+)/g)].map((m) => Number(m[1]));
}

function gen(id: string, seed: number): any[] {
  return byId(id).generate("Test", seed, { count: 3, difficulty: 2 }) as any[];
}

// ── 1. linear equations ──────────────────────────────────────────────────────
for (const id of ["a1-1-1-multi-step-equations", "a1-1-2-variables-both-sides"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "LINEQ";
    if (!/MultiStepEquation|VariablesBothSides/.test(p.subtype)) { mark(tag, false); continue; }
    bump();
    const m = expr(p.prompt).match(/^(.+)=(.+)$/);
    const L = m && parseLin(m[1]), R = m && parseLin(m[2]);
    if (!m || !L || !R || L.a === R.a) { mark(tag, false); continue; }
    mark(tag, true);
    const x = (R.b - L.b) / (L.a - R.a);
    const got = parseXAnswer(p.answer);
    if (got.length !== 1 || !eq(got[0], x, 1e-9))
      fail("A1-LINEQ", id, "Test", s, `prompt "${String(p.prompt).slice(0, 50)}" mine x=${x} answer="${p.answer}"`);
  }
}

// ── 2. proportions ───────────────────────────────────────────────────────────
{
  const id = "a1-1-4-proportions";
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "PROP";
    bump();
    const c = expr(p.prompt);
    const m = c.match(/\\frac\{([^}]*)\}\{([^}]*)\}=\\frac\{([^}]*)\}\{([^}]*)\}/);
    if (!m) { mark(tag, false); continue; }
    const [n1, d1, n2, d2] = [m[1], m[2], m[3], m[4]];
    const hasX = (t: string) => t.includes("x");
    let x: number | null = null;
    const num = (t: string) => Number(t);
    if (hasX(d2) && !hasX(n1) && !hasX(d1) && !hasX(n2)) x = (num(d1) * num(n2)) / num(n1);
    else if (hasX(d1) && !hasX(n1) && !hasX(n2) && !hasX(d2)) x = (num(n1) * num(d2)) / num(n2);
    else if (hasX(n1) && !hasX(d1) && !hasX(n2) && !hasX(d2)) x = (num(d1) * num(n2)) / num(d2);
    else if (hasX(n2) && !hasX(d1) && !hasX(n1) && !hasX(d2)) x = (num(d2) * num(n1)) / num(d1);
    if (x === null || !Number.isFinite(x)) { mark(tag, false); continue; }
    mark(tag, true);
    const got = parseXAnswer(p.answer);
    if (got.length !== 1 || !eq(got[0], x, 1e-9))
      fail("A1-PROPORTION", id, "Test", s, `mine x=${x} answer="${p.answer}" (prompt ${String(p.prompt).slice(0, 50)})`);
  }
}

// ── 3. inequalities ──────────────────────────────────────────────────────────
for (const id of ["a1-1-5-multi-step-inequalities"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "INEQ";
    if (p.subtype !== "Inequality") { mark(tag, false); continue; }
    bump();
    const m = expr(p.prompt).match(/^(.+)(>=|<=|>|<)(.+)$/);
    const am = expr(p.answer).match(/^x(>=|<=|>|<)(-?[\d.]+)$/);
    const L = m && parseLin(m[1]), R = m && parseLin(m[3]);
    if (!m || !am || !L || !R || L.a === 0) { mark(tag, false); continue; }
    mark(tag, true);
    const boundary = (R.b - L.b) / L.a;
    const flip: Record<string, string> = { ">": "<", "<": ">", ">=": "<=", "<=": ">=" };
    const wantOp = L.a < 0 ? flip[m[2]] : m[2];
    if (!eq(Number(am[2]), boundary, 1e-9) || am[1] !== wantOp)
      fail("A1-INEQ", id, "Test", s, `mine x ${wantOp} ${boundary} answer="${p.answer}"`);
  }
}
for (const id of ["a1-1-6-compound-inequalities"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "COMPOUND";
    if (p.subtype !== "CompoundInequality") { mark(tag, false); continue; }
    bump();
    const m = expr(p.prompt).match(/^(-?[\d.]+)(<|>)(.+)(<|>)(-?[\d.]+)$/);
    const am = expr(p.answer).match(/^(-?[\d.]+)(<|>)x(<|>)(-?[\d.]+)$/);
    const mid = m && parseLin(m[3]);
    if (!m || !am || !mid || mid.a === 0) { mark(tag, false); continue; }
    mark(tag, true);
    const b1 = (Number(m[1]) - mid.b) / mid.a, b2 = (Number(m[5]) - mid.b) / mid.a;
    const lo = Math.min(b1, b2), hi = Math.max(b1, b2);
    if (!eq(Number(am[1]), lo, 1e-9) || !eq(Number(am[4]), hi, 1e-9))
      fail("A1-COMPOUND", id, "Test", s, `mine ${lo} < x < ${hi} answer="${p.answer}"`);
  }
}

// ── 4. absolute value ────────────────────────────────────────────────────────
for (const id of ["a1-1-7-absolute-value"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "ABS";
    if (p.subtype !== "AbsoluteValue") { mark(tag, false); continue; }
    bump();
    const m = expr(p.prompt).match(/^\|(.+)\|=(-?[\d.]+)$/);
    const inner = m && parseLin(m[1]);
    if (!m || !inner || inner.a === 0) { mark(tag, false); continue; }
    const c = Number(m[2]);
    if (c < 0) { mark(tag, false); continue; }
    mark(tag, true);
    const roots = [(-inner.b + c) / inner.a, (-inner.b - c) / inner.a].sort((x, y) => x - y);
    const got = parseXAnswer(p.answer).sort((x, y) => x - y);
    if (got.length !== 2 || !got.every((r, i) => eq(r, roots[i], 1e-9)))
      fail("A1-ABS", id, "Test", s, `mine [${roots}] answer="${p.answer}"`);
  }
}

// ── 5. 2x2 systems ───────────────────────────────────────────────────────────
function solve2x2(e1: string, e2: string): [number, number] | null {
  // each like "4x+2y=2" or "y=3x+15": collect ax+by+const on each side, then move
  const side = (s: string) => {
    const terms = s.replace(/-/g, "+-").split("+").filter(Boolean);
    let a = 0, b = 0, c = 0;
    for (const t of terms) {
      if (/x/.test(t)) { const k = t.replace(/x/, ""); a += k === "" || k === "+" ? 1 : k === "-" ? -1 : Number(k); }
      else if (/y/.test(t)) { const k = t.replace(/y/, ""); b += k === "" || k === "+" ? 1 : k === "-" ? -1 : Number(k); }
      else c += Number(t);
    }
    return { a, b, c };
  };
  const parse = (s: string) => {
    const parts = s.split("=");
    if (parts.length !== 2) return null;
    const L = side(parts[0]), R = side(parts[1]);
    return { a: L.a - R.a, b: L.b - R.b, c: R.c - L.c };
  };
  const A = parse(e1), B = parse(e2);
  const det = A.a * B.b - B.a * A.b;
  if (det === 0 || ![A.a, A.b, A.c, B.a, B.b, B.c].every(Number.isFinite)) return null;
  return [(A.c * B.b - B.c * A.b) / det, (A.a * B.c - B.a * A.c) / det];
}
for (const id of ["a1-4-2-substitution", "a1-4-3-elimination", "a1-4-1-systems-graphing"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "SYSTEM";
    if (!/System/.test(p.subtype)) { mark(tag, false); continue; }
    bump();
    const m = clean(p.prompt).match(/\\begin\{cases\}(.+)\\\\(.+)\\end\{cases\}/);
    const sol = m && solve2x2(m[1], m[2]);
    const am = sol && expr(p.answer).match(/^\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/);
    if (!m || !sol || !am) { mark(tag, false); continue; }
    mark(tag, true);
    if (!eq(Number(am[1]), sol[0], 1e-9) || !eq(Number(am[2]), sol[1], 1e-9))
      fail("A1-SYSTEM", id, "Test", s, `${p.subtype}: mine (${sol}) answer="${p.answer}"`);
  }
}

// ── 6. exponents ─────────────────────────────────────────────────────────────
for (const id of ["a1-5-1-zero-negative-exponents"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "EXP0";
    if (p.subtype !== "ZeroNegativeExponents") { mark(tag, false); continue; }
    bump();
    const m = expr(p.prompt).match(/^\(?(-?[\d.]+)\)?\^\{(-?[\d.]+)\}$/);
    if (!m) { mark(tag, false); continue; }
    mark(tag, true);
    const mine = Math.pow(Number(m[1]), Number(m[2]));
    if (!eq(parseFrac(expr(p.answer)), mine, 1e-9))
      fail("A1-EXP", id, "Test", s, `${m[1]}^${m[2]} mine=${mine} answer="${p.answer}"`);
  }
}
for (const id of ["a1-5-2-multiplying-powers"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "EXP1";
    if (p.subtype !== "MultiplyPowers") { mark(tag, false); continue; }
    bump();
    const m = expr(p.prompt).match(/^\(?(-?[\d.]+)x\^\{(\d+)\}\)?\*\(?(-?[\d.]+)x\^\{(\d+)\}\)?$/);
    if (!m) { mark(tag, false); continue; }
    mark(tag, true);
    const want = `${Number(m[1]) * Number(m[3])}x^{${Number(m[2]) + Number(m[4])}}`;
    if (expr(p.answer) !== want)
      fail("A1-EXP", id, "Test", s, `mine ${want} answer="${p.answer}"`);
  }
}
for (const id of ["a1-5-3-power-of-power"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "EXP2";
    if (p.subtype !== "PowerOfPower") { mark(tag, false); continue; }
    bump();
    const m = expr(p.prompt).match(/^\(\(?(-?[\d.]+)x\^\{(\d+)\}\)?\)\^\{(\d+)\}$/);
    if (!m) { mark(tag, false); continue; }
    mark(tag, true);
    const want = `${Math.pow(Number(m[1]), Number(m[3]))}x^{${Number(m[2]) * Number(m[3])}}`;
    if (expr(p.answer) !== want)
      fail("A1-EXP", id, "Test", s, `mine ${want} answer="${p.answer}"`);
  }
}
for (const id of ["a1-5-5-rational-exponents"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "EXP3";
    if (p.subtype !== "RationalExponents") { mark(tag, false); continue; }
    bump();
    const m = expr(p.prompt).match(/^([\d.]+)\^\{(\d+)\/(\d+)\}$/);
    if (!m) { mark(tag, false); continue; }
    mark(tag, true);
    const mine = Math.pow(Number(m[1]), Number(m[2]) / Number(m[3]));
    const av = parseFrac(expr(p.answer));
    if (!eq(av, mine, 1e-9))
      fail("A1-EXP", id, "Test", s, `${m[1]}^${m[2]}/${m[3]} mine=${mine} answer="${p.answer}"`);
  }
}

// ── 7. polynomials ───────────────────────────────────────────────────────────
for (const id of ["a1-7-1-add-subtract-poly"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "POLYADD";
    if (p.subtype !== "PolyAddSub") { mark(tag, false); continue; }
    bump();
    const m = expr(p.prompt).match(/^\((.+)\)([+-])\((.+)\)$/);
    const A = m && parsePoly(m[1]), B = m && parsePoly(m[3]);
    const ansC = parsePoly(expr(p.answer));
    if (!m || !A || !B || !ansC) { mark(tag, false); continue; }
    mark(tag, true);
    const sgn = m[2] === "+" ? 1 : -1;
    const R = A.map((a, i) => a + sgn * (B[i] ?? 0));
    const strip = (c: number[]) => { const r = [...c]; while (r.length > 1 && r[0] === 0) r.shift(); return r; };
    const Rn = strip(R), An = strip(ansC);
    if (Rn.length !== An.length || !Rn.every((r, i) => eq(r, An[i], 1e-9)))
      fail("A1-POLY", id, "Test", s, `mine [${R}] answer="${p.answer}"`);
  }
}
for (const id of ["a1-7-2-multiply-factor"]) {
  for (let s = 0; s < 60; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "FACTOR";
    bump();
    if (/Factor/.test(p.subtype)) {
      const target = parsePoly(expr(p.prompt));
      const a = expr(p.answer);
      // leading monomial factor e.g. "4x(", "3x^{2}(", "x(", or scalar "3("
      const lead = a.match(/^(\d*)x(?:\^\{(\d+)\})?\(/) ?? a.match(/^(\d+)\(/);
      const factors = [...a.matchAll(/\(([^()]+)\)/g)].map((m) => parsePoly(m[1]));
      if (!target || !lead || factors.some((f) => !f)) { mark(tag, false); continue; }
      mark(tag, true);
      let poly = [1];
      const mul = (P: number[], Q: number[]) => {
        const R = new Array(P.length + Q.length - 1).fill(0);
        for (let i = 0; i < P.length; i++) for (let j = 0; j < Q.length; j++) R[i + j] += P[i] * Q[j];
        return R;
      };
      const lm = lead[0].startsWith("(") ? null : lead;
      let leadPoly: number[] | null = null;
      if (/^(\d*)x/.test(lead[0])) {
        const c = lead[1] === "" ? 1 : Number(lead[1]);
        const e = lead[2] ? Number(lead[2]) : 1;
        leadPoly = new Array(e + 1).fill(0); leadPoly[0] = c;
      } else if (/^\d+\($/.test(lead[0])) {
        leadPoly = [Number(lead[1])];
      }
      if (!leadPoly) { mark(tag, false); continue; }
      poly = mul(poly, leadPoly);
      for (const f of factors) poly = mul(poly, f!);
      while (poly.length < target.length) poly.unshift(0);
      if (poly.length !== target.length || !poly.every((c, i) => eq(c, target[i], 1e-6)))
        fail("A1-FACTOR", id, "Test", s, `${p.subtype}: expand("${p.answer}")=[${poly}] != prompt [${target}]`);
    } else if (/FOIL|PolyMultiply/.test(p.subtype)) {
      const pm = expr(p.prompt).match(/^\((.+)\)\((.+)\)$/);
      const f1 = pm && parseLin(pm[1]), f2 = pm && parseLin(pm[2]);
      const ansC = parsePoly(expr(p.answer));
      if (!pm || !f1 || !f2 || !ansC) { mark(tag, false); continue; }
      mark(tag, true);
      const want = [f1.a * f2.a, f1.a * f2.b + f1.b * f2.a, f1.b * f2.b];
      if (want.length !== ansC.length || !want.every((w, i) => eq(w, ansC[i], 1e-9)))
        fail("A1-POLY", id, "Test", s, `${p.subtype}: mine [${want}] answer="${p.answer}"`);
    } else mark(tag, false);
  }
}

// ── 8. sequences ─────────────────────────────────────────────────────────────
for (const id of ["a1-6-1-explicit-sequences"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "SEQ";
    bump();
    const c = clean(p.prompt);
    const tm = c.match(/begins(-?[\d.]+),(-?[\d.]+),(-?[\d.]+),(-?[\d.]+).*findthe(\d+)(?:st|nd|rd|th)term/);
    if (!tm) { mark(tag, false); continue; }
    const terms = [tm[1], tm[2], tm[3], tm[4]].map(Number), n = Number(tm[5]);
    let an: number | null = null;
    if (p.subtype === "ArithmeticSequence") {
      const d = terms[1] - terms[0];
      if (!terms.every((t, i) => i < 2 || eq(t - terms[i - 1], d))) { mark(tag, false); continue; }
      an = terms[0] + d * (n - 1);
    } else if (p.subtype === "GeometricSequence") {
      const r = terms[1] / terms[0];
      if (!terms.every((t, i) => i < 2 || eq(t / terms[i - 1], r))) { mark(tag, false); continue; }
      an = terms[0] * Math.pow(r, n - 1);
    } else { mark(tag, false); continue; }
    const am = expr(p.answer).match(new RegExp(`a_\\{${n}\\}=(-?[\\d.]+)`));
    if (!am) { mark(tag, false); continue; }
    mark(tag, true);
    if (!eq(Number(am[1]), an, 1e-6))
      fail("A1-SEQ", id, "Test", s, `${p.subtype}: mine a_${n}=${an} answer="${p.answer}"`);
  }
}

// ── 9. radicals ──────────────────────────────────────────────────────────────
for (const id of ["a1-5-6-simplifying-radicals"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "RADICAL";
    if (p.subtype !== "SimplifyRadicals") { mark(tag, false); continue; }
    bump();
    const m = expr(p.prompt).match(/\\sqrt\{(\d+)\}/);
    if (!m) { mark(tag, false); continue; }
    mark(tag, true);
    const N = Number(m[1]);
    let k = 1;
    for (let d = 2; d * d <= N; d++) if (N % (d * d) === 0) k = d;
    const rest = N / (k * k);
    const am = expr(p.answer).match(/^(?:(\d+)\\sqrt\{(\d+)\}|(\d+))$/);
    if (!am) { fail("A1-RADICAL", id, "Test", s, `sqrt(${N}): unparseable answer "${p.answer}"`); continue; }
    const bad = am[3] ? !eq(Number(am[3]), Math.sqrt(N), 1e-9) : (Number(am[1] ?? 1) !== k || Number(am[2]) !== rest);
    if (bad)
      fail("A1-RADICAL", id, "Test", s, `sqrt(${N}) mine=${k}√${rest} answer="${p.answer}"`);
  }
}

// ── 10. quadratics ──────────────────────────────────────────────────────────
for (const id of ["a1-8-6-factoring-solve"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "QUADSOLVE";
    if (p.subtype !== "QuadraticFactoring") { mark(tag, false); continue; }
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
      fail("A1-QUAD", id, "Test", s, `mine [${roots}] answer="${p.answer}"`);
  }
}
for (const id of ["a1-8-2-quadratic-functions"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "QUADGRAPH";
    if (p.subtype !== "GraphQuadratic") { mark(tag, false); continue; }
    bump();
    const m = clean(p.prompt).match(/f\(x\)=(.+?)\.State/);
    // standard form OR vertex form a(x-h)^{2}+k
    let q: number[] | null = m ? parsePoly(m[1]) : null;
    let vx = 0, vy = 0, haveV = false;
    const vm = m ? m[1].match(/^(-?\d*)\(x([+-]\d+)\)\^\{2\}([+-]\d+)$/) : null;
    if (vm) {
      const a = vm[1] === "" ? 1 : vm[1] === "-" ? -1 : Number(vm[1]);
      vx = -Number(vm[2]); vy = Number(vm[3]);
      q = [a, -2 * a * vx, a * vx * vx + vy];
      haveV = true;
    } else if (q && q.length === 3 && q[0] !== 0) {
      vx = -q[1] / (2 * q[0]); vy = q[0] * vx * vx + q[1] * vx + q[2];
      haveV = true;
    }
    if (!m || !haveV || !q) { mark(tag, false); continue; }
    mark(tag, true);
    const a = clean(p.answer);
    const am = a.match(/vertex:\((-?[\d.]+),(-?[\d.]+)\);axis:x=(-?[\d.]+);y-intercept:\((-?[\d.]+),(-?[\d.]+)\)/);
    if (!am) { fail("A1-QUAD", id, "Test", s, `unparseable answer "${p.answer}"`); continue; }
    if (!eq(Number(am[1]), vx, 1e-9) || !eq(Number(am[2]), vy, 1e-9) || !eq(Number(am[3]), vx, 1e-9) || !eq(Number(am[5]), q[2], 1e-9))
      fail("A1-QUAD", id, "Test", s, `mine vertex=(${vx},${vy}) yint=${q[2]} answer="${p.answer}"`);
  }
}

// ── 11. lines ────────────────────────────────────────────────────────────────
for (const id of ["a1-23-2-slope-intercept"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "SLOPEINT";
    if (p.subtype !== "WriteSlopeIntercept") { mark(tag, false); continue; }
    bump();
    const cp = clean(p.prompt);
    let sl: number, b: number;
    const m1 = cp.match(/slope(-?[\d.]+)through\((-?[\d.]+),(-?[\d.]+)\)/);
    const m2 = cp.match(/linethrough\((-?[\d.]+),(-?[\d.]+)\)and\((-?[\d.]+),(-?[\d.]+)\)/);
    if (m1) { sl = Number(m1[1]); b = Number(m1[3]) - sl * Number(m1[2]); }
    else if (m2) {
      const [x1, y1, x2, y2] = [m2[1], m2[2], m2[3], m2[4]].map(Number);
      if (x2 === x1) { mark(tag, false); continue; }
      sl = (y2 - y1) / (x2 - x1); b = y1 - sl * x1;
    } else { mark(tag, false); continue; }
    mark(tag, true);
    const rhs = parseLin(expr(p.answer).replace(/^y=/, ""));
    if (!rhs || !eq(rhs.a, sl, 1e-9) || !eq(rhs.b, b, 1e-9))
      fail("A1-LINE", id, "Test", s, `mine y=${sl}x+${b} answer="${p.answer}"`);
  }
}
for (const id of ["a1-23-5-standard-form"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "STDFORM";
    if (p.subtype !== "StandardToSlopeIntercept") { mark(tag, false); continue; }
    bump();
    const m = clean(p.prompt).match(/Rewrite(.+?)inslope-interceptform/);
    if (!m) { mark(tag, false); continue; }
    const [l, r] = m[1].split("=");
    const terms = l.replace(/-/g, "+-").split("+").filter(Boolean);
    let a = 0, b = 0;
    for (const t of terms) {
      if (/x/.test(t)) { const k = t.replace(/x/, ""); a += k === "" || k === "+" ? 1 : k === "-" ? -1 : Number(k); }
      else if (/y/.test(t)) { const k = t.replace(/y/, ""); b += k === "" || k === "+" ? 1 : k === "-" ? -1 : Number(k); }
    }
    const c = Number(r);
    if (b === 0 || !Number.isFinite(c)) { mark(tag, false); continue; }
    mark(tag, true);
    const rhs = parseLin(expr(p.answer).replace(/^y=/, ""));
    if (!rhs || !eq(rhs.a, -a / b, 1e-9) || !eq(rhs.b, c / b, 1e-9))
      fail("A1-LINE", id, "Test", s, `mine y=${-a / b}x+${c / b} answer="${p.answer}"`);
  }
}
for (const id of ["a1-23-3-direct-variation"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "DIRVAR";
    if (p.subtype !== "DirectVariation") { mark(tag, false); continue; }
    bump();
    const m = clean(p.prompt).match(/Whenx=(-?\d+(?:\.\d+)?),y=(-?\d+(?:\.\d+)?).*findywhenx=(-?\d+(?:\.\d+)?)/);
    if (!m) { mark(tag, false); continue; }
    mark(tag, true);
    const k = Number(m[2]) / Number(m[1]), y2 = k * Number(m[3]);
    const am = expr(p.answer).match(/^k=(-?[\d.]+);y=(-?[\d.]+)$/);
    if (!am || !eq(Number(am[1]), k, 1e-9) || !eq(Number(am[2]), y2, 1e-9))
      fail("A1-VAR", id, "Test", s, `mine k=${k},y=${y2} answer="${p.answer}"`);
  }
}

console.log("\n[verify4] coverage per block (ok/skipped):");
for (const [t, c] of [...cov.entries()].sort()) console.log(`  ${t}: ok=${c.ok} skip=${c.skip}`);
report("rt-verify4 (algebra 1)");
process.exit(0);
