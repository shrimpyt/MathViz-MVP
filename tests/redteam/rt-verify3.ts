// rt-verify3.ts — independent verification: Algebra 2, calculus, precalc, MS.
import { CURRICULUM_REGISTRY } from "@/modules/CurriculumRegistry";
import { failures, fail, report } from "./util";

import { counter } from "./util";
const bump = (n = 1) => { counter.checks += n; };
let unverified = 0;
const eq = (a: number, b: number, t = 1e-7) => Math.abs(a - b) < t;
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const polyEval = (c: number[], x: number) => c.reduce((s, ci, i) => s + ci * Math.pow(x, c.length - 1 - i), 0);
const polyDiff = (c: number[]) => c.slice(0, -1).map((ci, i) => ci * (c.length - 1 - i));
const byId = (id: string) => CURRICULUM_REGISTRY.find((e) => e.id === id)!;
function gen(id: string, seed: number, difficulty: 1 | 2 | 3 = 2, count = 2): any[] {
  return byId(id).generate("Test", seed, { count, difficulty }) as any[];
}
const norm = (s: string) => String(s).replace(/\s+/g, " ").trim();
function synth(dividend: number[], r: number): { q: number[]; rem: number } {
  const q: number[] = [];
  let carry = 0;
  for (const c of dividend) { const v = c + carry; q.push(v); carry = v * r; }
  return { q: q.slice(0, -1), rem: q[q.length - 1] };
}

// ── A2 matrices ──────────────────────────────────────────────────────────────
{
  for (let s = 0; s < 60; s++) for (const p of gen("a2-4-3-det-inverse", s * 7 + 1, 2)) {
    bump();
    const v = p.verify, [a, b, c, d] = v.M;
    const det = a * d - b * c;
    if (!eq(det, Number(v.det)) || String(p.answer) !== String(v.det))
      fail("A2-DET", "a2-4-3-det-inverse", "Test", s, `M=[${v.M}] myDet=${det} verify.det=${v.det} answer="${p.answer}"`);
    if (v.inv && v.inv.length === 4 && det !== 0) {
      bump();
      const [e, f, g, h] = v.inv.map((x: number) => x / det);
      const P = [a * e + b * g, a * f + b * h, c * e + d * g, c * f + d * h];
      if (!P.every((x, i) => eq(x, i % 3 === 0 ? 1 : 0)))
        fail("A2-INV", "a2-4-3-det-inverse", "Test", s, `M·inv ≠ I for M=[${v.M}]`);
    }
  }
  for (let s = 0; s < 40; s++) for (const p of gen("a2-4-1-matrix-add-subtract", s * 7 + 1, 2)) {
    bump();
    const v = p.verify;
    const mine = v.A.map((x: number, i: number) => (v.op === -1 ? x - v.B[i] : x + v.B[i]));
    if (!mine.every((x: number, i: number) => x === v.C[i]))
      fail("A2-ADDSUB", "a2-4-1-matrix-add-subtract", "Test", s, `mine=[${mine}] verify.C=[${v.C}]`);
  }
  for (let s = 0; s < 40; s++) for (const p of gen("a2-4-2-matrix-multiply", s * 7 + 1, 2)) {
    bump();
    const v = p.verify;
    const C: number[] = [];
    for (let i = 0; i < v.aRows; i++) for (let j = 0; j < v.bCols; j++) {
      let ssum = 0;
      for (let k = 0; k < v.aCols; k++) ssum += v.A[i * v.aCols + k] * v.B[k * v.bCols + j];
      C.push(ssum);
    }
    if (!C.every((x, i) => x === v.C[i]))
      fail("A2-MATMUL", "a2-4-2-matrix-multiply", "Test", s, `mine=[${C}] verify.C=[${v.C}]`);
  }
  for (let s = 0; s < 40; s++) for (const p of gen("a2-4-4-systems-matrices", s * 7 + 1, 2)) {
    bump();
    const v = p.verify, [a, b, c, d] = v.A, [e, f] = v.rhs;
    const det = a * d - b * c;
    if (det === 0) { unverified++; continue; }
    const x = (e * d - b * f) / det, y = (a * f - e * c) / det;
    if (!eq(x, v.sol[0]) || !eq(y, v.sol[1]))
      fail("A2-SYSMAT", "a2-4-4-systems-matrices", "Test", s, `mine=(${x},${y}) verify.sol=${v.sol}`);
    bump();
    if (!eq(a * x + b * y, e) || !eq(c * x + d * y, f))
      fail("A2-SYSMAT", "a2-4-4-systems-matrices", "Test", s, `solution doesn't satisfy system`);
  }
}

// ── A2 quadratics ────────────────────────────────────────────────────────────
{
  for (let s = 0; s < 60; s++) for (const p of gen("a2-5-8-quad-formula", s * 11 + 2, 3)) {
    bump();
    const v = p.verify;
    if (!v || v.a === undefined) { unverified++; continue; }
    if (p.subtype === "Discriminant") {
      const D = v.b * v.b - 4 * v.a * v.c;
      if (!eq(D, v.D)) fail("A2-DISC", "a2-5-8-quad-formula", "Test", s, `D mine=${D} verify=${v.D}`);
      bump();
      const want = D > 0 ? "two real" : D === 0 ? "one real" : "two complex";
      if (!String(p.answer).toLowerCase().includes(want))
        fail("A2-DISC", "a2-5-8-quad-formula", "Test", s, `D=${D} but answer says "${p.answer}"`);
      continue;
    }
    if (p.subtype === "QuadraticFormula" && v.r1 !== undefined) {
      const D = v.b * v.b - 4 * v.a * v.c;
      for (const r of [v.r1, v.r2]) {
        if (!eq(v.a * r * r + v.b * r + v.c, 0, 1e-6))
          fail("A2-QUAD", "a2-5-8-quad-formula", "Test", s, `root ${r} doesn't satisfy ${v.a}x²+${v.b}x+${v.c}=0`);
      }
      if (D >= 0) {
        bump();
        const mine = [(-v.b + Math.sqrt(D)) / (2 * v.a), (-v.b - Math.sqrt(D)) / (2 * v.a)].sort((x, y) => x - y);
        const theirs = [v.r1, v.r2].sort((x: number, y: number) => x - y);
        if (!mine.every((x, i) => eq(x, theirs[i], 1e-6)))
          fail("A2-QUAD", "a2-5-8-quad-formula", "Test", s, `formula roots ${mine} != verify roots ${theirs}`);
        // answer string must encode the same roots: "x = -6 or x = -4"
        bump();
        const roots = [...String(p.answer).matchAll(/x\s*=\s*(-?[\d.]+)/g)].map((m) => Number(m[1])).sort((x, y) => x - y);
        if (roots.length !== 2 || !roots.every((r, i) => eq(r, theirs[i], 1e-9)))
          fail("A2-QUAD", "a2-5-8-quad-formula", "Test", s, `answer "${p.answer}" doesn't encode roots ${theirs}`);
      } else {
        // complex roots: answer should mention i / complex
        bump();
        if (!/i\b|complex/i.test(String(p.answer)))
          fail("A2-QUAD", "a2-5-8-quad-formula", "Test", s, `D=${D}<0 but answer "${p.answer}" shows no complex roots`);
      }
    } else unverified++;
  }
  for (let s = 0; s < 40; s++) for (const p of gen("a2-5-7-completing-square", s * 11 + 2, 2)) {
    bump();
    const v = p.verify;
    const h = -v.b / (2 * v.a), k = v.c - v.a * h * h;
    if (!eq(h, v.h) || !eq(k, v.k))
      fail("A2-SQUARE", "a2-5-7-completing-square", "Test", s, `mine h=${h},k=${k} verify h=${v.h},k=${v.k}`);
    // answer string must encode (h,k): "y = (x - 5)^2 - 17"
    bump();
    const ans = norm(p.answer);
    const hm = ans.match(/\(x\s*([+-])\s*([\d.]+)\)\^2/);
    const km = ans.match(/\)\^2\s*([+-])\s*([\d.]+)/);
    if (hm && km) {
      const ah = (hm[1] === "-" ? 1 : -1) * Number(hm[2]);
      const ak = (km[1] === "-" ? -1 : 1) * Number(km[2]);
      if (!eq(ah, h) || !eq(ak, k))
        fail("A2-SQUARE", "a2-5-7-completing-square", "Test", s, `answer "${ans}" encodes h=${ah},k=${ak} but true h=${h},k=${k}`);
    } else unverified++;
  }
}

// ── A2 logs ──────────────────────────────────────────────────────────────────
{
  for (let s = 0; s < 40; s++) for (const p of gen("a2-7-6-log-properties", s * 13 + 3, 3)) {
    bump();
    const v = p.verify, ans = norm(p.answer);
    if (p.subtype === "LogEvaluate") {
      if (!eq(Math.pow(v.base, v.value), v.arg))
        fail("A2-LOGEVAL", "a2-7-6-log-properties", "Test", s, `base^value=${Math.pow(v.base, v.value)} != arg=${v.arg} (verify=${JSON.stringify(v)})`);
      bump();
      if (norm(p.answer) !== String(v.value))
        fail("A2-LOGEVAL", "a2-7-6-log-properties", "Test", s, `answer "${p.answer}" != value ${v.value}`);
    } else if (p.subtype === "ExpandLog") {
      if (v.useRoot) { unverified++; continue; }
      const b = v.base;
      // parse answer terms: "[±][coef] \log_{b}(var)", coef 1 implicit
      const terms = [...ans.matchAll(/([+-]?)\s*(\d*)\s*\\log_{(\d+)}\(([xyz])\)/g)];
      bump();
      const got: Record<string, number> = {};
      let okBase = true;
      for (const t of terms) {
        if (Number(t[3]) !== b) okBase = false;
        const c = t[2] === "" ? 1 : Number(t[2]);
        got[t[4]] = (t[1] === "-" ? -1 : 1) * c;
      }
      const want: Record<string, number> = { x: v.m, y: v.n, z: -v.p };
      if (!okBase || Object.keys(want).some((k) => got[k] !== want[k]))
        fail("A2-EXPANDLOG", "a2-7-6-log-properties", "Test", s, `answer "${ans}" != ${v.m}log(x)+${v.n}log(y)-${v.p}log(z)`);
    } else if (p.subtype === "CondenseLog") {
      bump();
      const want = `\\log_{${v.base}}(x^${v.m} y^${v.n} / z)`;
      if (norm(ans).replace(/\s+/g, "") !== want.replace(/\s+/g, ""))
        fail("A2-CONDENSE", "a2-7-6-log-properties", "Test", s, `answer "${ans}" != "${want}"`);
    }
  }
  for (let s = 0; s < 60; s++) for (const p of gen("a2-7-7-exp-log-equations", s * 13 + 3, 3)) {
    bump();
    const v = p.verify;
    if (p.subtype === "SolveExponential") {
      const rhsM = String(p.given.equation).match(/=\s*([\d.eE+-]+)\s*$/);
      if (v.kind === "samebase") {
        bump();
        // base^{x+k} = base^m  →  x = m - k
        if (v.x !== v.m - v.k)
          fail("A2-EXP", "a2-7-7-exp-log-equations", "Test", s, `x=${v.x} != m-k=${v.m - v.k} (verify=${JSON.stringify(v)})`);
        bump();
        if (!eq(Math.pow(v.base, v.x + v.k), Math.pow(v.base, v.m), 1e-9))
          fail("A2-EXP", "a2-7-7-exp-log-equations", "Test", s, `${v.base}^(${v.x}+${v.k}) != ${v.base}^${v.m}`);
        bump();
        const am = norm(p.answer).match(/x\s*=\s*(-?[\d.]+)/);
        if (!am || Number(am[1]) !== v.x)
          fail("A2-EXP", "a2-7-7-exp-log-equations", "Test", s, `answer "${p.answer}" != x=${v.x}`);
      } else if (v.kind === "approx") {
        bump();
        const exact = Math.log(v.N) / Math.log(v.base);
        if (!eq(exact, v.approx, 0.0051))
          fail("A2-EXP", "a2-7-7-exp-log-equations", "Test", s, `log_${v.base}(${v.N})=${exact} != approx ${v.approx}`);
        bump();
        const ans = norm(p.answer).replace(/\s+/g, "");
        if (!ans.includes(`log_{${v.base}}${v.N}`))
          fail("A2-EXP", "a2-7-7-exp-log-equations", "Test", s, `answer "${p.answer}" missing log_${v.base}(${v.N}) form`);
      } else unverified++;
    } else if (p.subtype === "SolveLogEquation") {
      const am = norm(p.answer).match(/x\s*=\s*(-?[\d.]+)/);
      const x = am ? Number(am[1]) : NaN;
      bump();
      if (!Number.isFinite(x)) { unverified++; continue; }
      // equation: log_b(x) + log_b((x+k)) = mExp  (k may be 0 → second arg is just x)
      const eqs = String(p.given.equation);
      const km = eqs.match(/\(\(x\s*([+-])\s*(\d+)\)\)/) ?? eqs.match(/log_\{\d+\}\(x\)\s*\+\s*log_\{\d+\}\(x\)/);
      const k = km && km[1] ? (km[1] === "+" ? 1 : -1) * Number(km[2]) : 0;
      const B = x + k;
      bump();
      const lhs = Math.log(x) / Math.log(v.base) + Math.log(B) / Math.log(v.base);
      if (!eq(lhs, v.mExp, 1e-9))
        fail("A2-LOGEQ", "a2-7-7-exp-log-equations", "Test", s, `x=${x}: log sum=${lhs} != ${v.mExp} (eqn ${eqs})`);
      bump();
      if (!eq(x * B, v.B, 1e-9))
        fail("A2-LOGEQ", "a2-7-7-exp-log-equations", "Test", s, `x*(x+k)=${x * B} != verify.B=${v.B}`);
      bump();
      if (!(x > 0 && B > 0)) fail("A2-LOGEQ", "a2-7-7-exp-log-equations", "Test", s, `domain violation: log of non-positive (x=${x}, x+k=${B})`);
    }
  }
}

// ── A2 polynomial division ───────────────────────────────────────────────────
{
  for (let s = 0; s < 40; s++) for (const p of gen("a2-8-5-poly-divide", s * 17 + 4, 2)) {
    bump();
    const v = p.verify;
    const { q, rem } = synth(v.dividend, v.r);
    if (!q.every((x, i) => x === v.quotient[i]) || q.length !== v.quotient.length || rem !== v.remainder)
      fail("A2-POLYDIV", "a2-8-5-poly-divide", "Test", s, `mine q=[${q}] r=${rem} vs verify q=[${v.quotient}] r=${v.remainder}`);
    // fundamental theorem: (x - r)*Q(x) + R == dividend — check at x=7
    bump();
    const x = 7;
    const Q = polyEval(v.quotient, x), D = polyEval(v.dividend, x);
    if (!eq((x - v.r) * Q + v.remainder, D, 1e-6))
      fail("A2-POLYDIV", "a2-8-5-poly-divide", "Test", s, `(x-r)Q+R != dividend at x=7`);
  }
}

// ── A2 rational ──────────────────────────────────────────────────────────────
{
  for (let s = 0; s < 40; s++) for (const p of gen("a2-11-4-solve-rational", s * 19 + 5, 2)) {
    bump();
    const v = p.verify;
    const am = norm(p.answer).match(/x\s*=\s*(-?[\d.]+)/);
    if (!am) { unverified++; continue; }
    const x = Number(am[1]);
    if (v.kind === "linear") {
      if (!eq((x - v.A) / (x - v.B), v.C) || x === v.B)
        fail("A2-RAT", "a2-11-4-solve-rational", "Test", s, `x=${x} fails (x-${v.A})/(x-${v.B})=${v.C}`);
    } else if (v.kind === "simple") {
      if (!eq(v.a / x, v.b) || x === 0)
        fail("A2-RAT", "a2-11-4-solve-rational", "Test", s, `x=${x} fails ${v.a}/x=${v.b}`);
    } else unverified++;
  }
  for (let s = 0; s < 40; s++) for (const p of gen("a2-11-3-asymptotes-holes", s * 19 + 5, 3)) {
    bump();
    const v = p.verify, ans = norm(p.answer);
    if (p.subtype === "Asymptotes") {
      const vAsm = -v.d / v.c, h = v.a / v.c;
      if (!eq(vAsm, v.vAsm) || !eq(h, v.hNum / v.hDen))
        fail("A2-ASYM", "a2-11-3-asymptotes-holes", "Test", s, `verify inconsistent: -d/c=${vAsm} a/c=${h} (verify=${JSON.stringify(v)})`);
      bump();
      const m = ans.match(/x\s*=\s*(-?[\d.]+).*y\s*=\s*(-?[\d.]+(?:\/[\d.]+)?)/);
      const frac = (t: string) => t.includes("/") ? Number(t.split("/")[0]) / Number(t.split("/")[1]) : Number(t);
      if (m && (!eq(Number(m[1]), vAsm) || !eq(frac(m[2]), h)))
        fail("A2-ASYM", "a2-11-3-asymptotes-holes", "Test", s, `answer "${ans}" != x=${vAsm}, y=${h}`);
    } else if (p.subtype === "Holes") {
      bump();
      const m = ans.match(/hole at\s*\((-?[\d.]+),\s*(-?[\d.]+)\);?\s*vertical asymptote x\s*=\s*(-?[\d.]+)/);
      if (m && (!eq(Number(m[1]), v.r) || !eq(Number(m[2]), v.holeYNum / v.holeYDen) || !eq(Number(m[3]), v.vAsm)))
        fail("A2-HOLE", "a2-11-3-asymptotes-holes", "Test", s, `answer "${ans}" inconsistent with verify ${JSON.stringify(v)}`);
      else if (!m) unverified++;
    }
  }
}

// ── A2 data / conics ─────────────────────────────────────────────────────────
{
  for (let s = 0; s < 30; s++) for (const p of gen("a2-12-2-regression", s * 23 + 6, 2)) {
    bump();
    const v = p.verify, n = v.xs.length;
    const sx = v.xs.reduce((a: number, b: number) => a + b, 0), sy = v.ys.reduce((a: number, b: number) => a + b, 0);
    const sxx = v.xs.reduce((a: number, b: number) => a + b * b, 0);
    const sxy = v.xs.reduce((a: number, x: number, i: number) => a + x * v.ys[i], 0);
    const m = (n * sxy - sx * sy) / (n * sxx - sx * sx), b = (sy - m * sx) / n;
    if (!eq(m, v.m, 1e-9) || !eq(b, v.b, 1e-9))
      fail("A2-REGR", "a2-12-2-regression", "Test", s, `least squares mine m=${m},b=${b} vs ${v.m},${v.b}`);
  }
  for (let s = 0; s < 30; s++) for (const p of gen("a2-5-4-focus-directrix", s * 23 + 6, 2)) {
    bump();
    const v = p.verify, ans = norm(p.answer);
    if (p.subtype !== "ParabolaFocusDirectrix") { unverified++; continue; }
    const orient = String(p.given.orientation);
    const fx = orient === "vertical" ? v.h : v.h + v.p;
    const fy = orient === "vertical" ? v.k + v.p : v.k;
    const dLine = orient === "vertical" ? `y = ${v.k - v.p}` : `x = ${v.h - v.p}`;
    bump();
    if (!ans.includes(`(${fx}, ${fy})`) && !ans.includes(`(${fx},${fy})`))
      fail("A2-FOCUS", "a2-5-4-focus-directrix", "Test", s, `answer "${ans}" missing focus (${fx},${fy})`);
    bump();
    if (!ans.includes(dLine)) fail("A2-FOCUS", "a2-5-4-focus-directrix", "Test", s, `answer "${ans}" missing directrix "${dLine}"`);
  }
}

// ── Calculus ─────────────────────────────────────────────────────────────────
{
  for (const cid of ["calc-limits", "calc-derivative-rules"]) {
    const e = byId(cid);
    for (let s = 0; s < 40; s++) for (const p of (e.generate("Test", s * 29 + 7, { count: 2, difficulty: 3 }) as any[])) {
      bump();
      const v = p.verify;
      if (!v) { unverified++; continue; }
      if (v.kind === "number" && v.source) {
        const src = v.source;
        const f = (x: number) => src.kind === "poly" ? polyEval(src.coeffs, x)
          : src.kind === "rational" ? polyEval(src.num, x) / polyEval(src.den, x) : NaN;
        // table rows must match the source function
        if (p.table) for (const row of p.table.rows) {
          bump();
          const x = Number(String(row[0]).replace(/−/g, "-")), fx = Number(String(row[1]).replace(/−/g, "-"));
          if (!eq(f(x), fx, 1e-6))
            fail("CALC-TABLE", cid, "Test", s, `${p.subtype}: table f(${x})=${fx} but source gives ${f(x)}`);
        }
        bump();
        if (v.point === undefined) {
          // limits at infinity: evaluate far out
          if (v.atInfinity && (v.atInfinity === "pos" || v.atInfinity === "neg")) {
            const far = f(v.atInfinity === "pos" ? 1e7 : -1e7);
            if (!eq(far, v.value, 1e-4))
              fail("CALC-LIMIT", cid, "Test", s, `${p.subtype}: my end-behavior ${far} != verify value ${v.value}`);
          } else unverified++;
          continue;
        }
        // approach the point (functions may have a removable discontinuity AT the point)
        const limL = f(v.point - 1e-7), limR = f(v.point + 1e-7);
        const lim = v.side === "left" ? limL : v.side === "right" ? limR : (limL + limR) / 2;
        if (!eq(lim, v.value, 1e-4) || (v.side === undefined && !eq(limL, limR, 1e-4)))
          fail("CALC-LIMIT", cid, "Test", s, `${p.subtype}: my limit ${lim} (L=${limL},R=${limR}) != verify value ${v.value}`);
      } else if (v.kind === "expr" && v.fn?.kind === "poly" && v.source?.kind === "poly") {
        bump();
        const mine = polyDiff(v.source.coeffs);
        if (mine.length !== v.fn.coeffs.length || !mine.every((c, i) => eq(c, v.fn.coeffs[i], 1e-9)))
          fail("CALC-DIFF", cid, "Test", s, `${p.subtype}: my derivative [${mine}] != verify.fn [${v.fn.coeffs}]`);
        const pm = String(p.prompt).match(/f′\((-?[\d.]+)\)/);
        if (pm) {
          bump();
          const val = polyEval(v.fn.coeffs, Number(pm[1]));
          if (!eq(val, Number(String(p.answer).replace(/−/g, "-")), 1e-6))
            fail("CALC-DIFF", cid, "Test", s, `${p.subtype}: f'(${pm[1]})=${val} != answer ${p.answer}`);
        } else unverified++;
      } else unverified++;
      // choices: unique, correctIndex in range, answer matches choices[correctIndex]
      if (p.choices) {
        bump();
        const ch = p.choices.map((c: string) => norm(c));
        if (new Set(ch).size !== ch.length) fail("CALC-DUPCHOICE", cid, "Test", s, `${p.subtype}: duplicate choices`);
        bump();
        if (p.correctIndex < 0 || p.correctIndex >= ch.length) fail("CALC-IDX", cid, "Test", s, `${p.subtype}: correctIndex ${p.correctIndex} out of range`);
        else if (norm(p.answer) !== ch[p.correctIndex])
          fail("CALC-ANSIDX", cid, "Test", s, `${p.subtype}: answer "${p.answer}" != choices[${p.correctIndex}] "${ch[p.correctIndex]}"`);
      }
    }
  }
  // integrals: numeric re-verification
  const ei = byId("calc-integrals");
  for (let s = 0; s < 40; s++) for (const p of (ei.generate("Test", s * 31 + 8, { count: 2, difficulty: 3 }) as any[])) {
    bump();
    const v = p.verify;
    if (!v) { unverified++; continue; }
    const ans = Number(String(p.answer).replace(/−/g, "-"));
    if (v.kind === "number" && v.source?.kind === "poly") {
      const F = (x: number) => { const c = v.source.coeffs; return c.reduce((s: number, ci: number, i: number) => s + (ci * Math.pow(x, c.length - i)) / (c.length - i), 0); };
      if (p.subtype === "DefiniteIntegral" && v.data) {
        bump();
        const mine = F(v.data.b) - F(v.data.a);
        if (!eq(mine, v.value, 1e-6) || !eq(mine, ans, 1e-6))
          fail("CALC-INT", "calc-integrals", "Test", s, `definite: mine=${mine} verify=${v.value} answer=${ans}`);
      } else if (p.subtype === "AreaBetweenCurves" && v.data) {
        bump();
        const N = 2000, { a, b } = v.data;
        let sum = 0;
        for (let i = 0; i <= N; i++) { const x = a + ((b - a) * i) / N; const w = i === 0 || i === N ? 1 : i % 2 ? 4 : 2; sum += w * Math.abs(polyEval(v.source.coeffs, x)); }
        const mine = ((b - a) / (3 * N)) * sum;
        if (Math.abs(mine - v.value) > 0.01 || Math.abs(mine - ans) > 0.01)
          fail("CALC-INT", "calc-integrals", "Test", s, `area: simpson=${mine} verify=${v.value} answer=${ans}`);
      } else if (p.subtype === "FTC" && v.data) {
        bump();
        let mine: number;
        if (v.data.variant === 1 && v.data.t0 !== undefined) {
          // particle: x(t1) = x(t0) + ∫[t0,t1] v(t) dt
          mine = v.data.x0 + (F(v.data.t1) - F(v.data.t0));
        } else {
          // F(x) = ∫[0,x] f(t) dt → F′(x0) = f(x0)
          mine = polyEval(v.source.coeffs, v.data.x0);
        }
        if (!eq(mine, v.value, 1e-9) || !eq(mine, ans, 1e-9))
          fail("CALC-INT", "calc-integrals", "Test", s, `FTC: mine=${mine} verify=${v.value} answer=${ans}`);
      } else unverified++;
    } else if (v.kind === "expr" && v.fn?.kind === "poly" && v.source?.kind === "poly") {
      // USubstitution: d/dx(fn) must equal source
      bump();
      const mine = polyDiff(v.fn.coeffs);
      if (mine.length !== v.source.coeffs.length || !mine.every((c, i) => eq(c, v.source.coeffs[i], 1e-6)))
        fail("CALC-USUB", "calc-integrals", "Test", s, `d/dx(answer) [${mine}] != integrand [${v.source.coeffs}]`);
    } else unverified++;
  }
}

// ── Precalc MCQ structural + spot recompute ──────────────────────────────────
{
  const ids = CURRICULUM_REGISTRY.filter((e) => e.id.startsWith("precalc-") && !e.underConstruction).map((e) => e.id);
  for (const id of ids) {
    const e = byId(id);
    for (let s = 0; s < 25; s++) for (const p of (e.generate("Test", s * 37 + 9, { count: 2, difficulty: 3 }) as any[])) {
      bump();
      if (p.type !== "PRECALC_MCQ") { unverified++; continue; }
      const idx = p.correctIndex, letter = p.answerLetter;
      if ("ABCDE"[idx] !== letter)
        fail("PRECALC-LETTER", id, "Test", s, `${p.subtype}: correctIndex ${idx} but answerLetter "${letter}"`);
      bump();
      const ch = (p.choices ?? []).map(norm);
      if (new Set(ch).size !== ch.length) fail("PRECALC-DUP", id, "Test", s, `${p.subtype}: duplicate choices ${ch.join("|")}`);
      bump();
      if (norm(p.expected) !== ch[idx])
        fail("PRECALC-EXPECTED", id, "Test", s, `${p.subtype}: expected "${p.expected}" != choices[${idx}] "${ch[idx]}"`);
    }
  }
}

// ── Middle school spot checks ────────────────────────────────────────────────
{
  for (let s = 0; s < 40; s++) for (const p of gen("ms6-1-1-multiplying-dividing-fractions", s * 41 + 10, 2)) {
    bump();
    const g = p.given;
    let n: number, d: number;
    if (g.op === "mul" && g.whole !== undefined) {
      // whole × n/d
      n = g.whole * g.n; d = g.d;
    } else {
      n = g.op === "add" ? g.n1 * g.d2 + g.n2 * g.d1 : g.op === "sub" ? g.n1 * g.d2 - g.n2 * g.d1 : g.op === "mul" ? g.n1 * g.n2 : g.n1 * g.d2;
      d = g.op === "div" ? g.d1 * g.n2 : g.d1 * g.d2;
    }
    const gg = gcd(Math.abs(n), Math.abs(d)) || 1;
    const want = d / gg === 1 ? `${n / gg}` : `${n / gg}/${d / gg}`;
    if (norm(p.answer) !== want) fail("MS-FRAC", "ms6-1-1-multiplying-dividing-fractions", "Test", s, `op=${g.op} mine=${want} answer="${p.answer}"`);
  }
  for (let s = 0; s < 40; s++) for (const p of gen("ms8-4-pythagorean", s * 41 + 10, 2)) {
    bump();
    const g = p.given;
    if (g.kind === "leg") {
      if (!eq(g.leg * g.leg + g.other * g.other, g.c * g.c))
        fail("MS-PYTH", "ms8-4-pythagorean", "Test", s, `triple doesn't satisfy Pythagoras: ${JSON.stringify(g)}`);
      bump();
      if (Number(p.answer) !== g.leg) fail("MS-PYTH", "ms8-4-pythagorean", "Test", s, `answer ${p.answer} != leg ${g.leg}`);
    } else if (g.kind === "hypotenuse") {
      if (!eq(g.a * g.a + g.b * g.b, g.c * g.c))
        fail("MS-PYTH", "ms8-4-pythagorean", "Test", s, `triple doesn't satisfy Pythagoras: ${JSON.stringify(g)}`);
      bump();
      if (Number(p.answer) !== g.c) fail("MS-PYTH", "ms8-4-pythagorean", "Test", s, `answer ${p.answer} != hyp ${g.c}`);
    } else if (g.kind === "distance") {
      if (g.dx !== Math.abs(g.x2 - g.x1) || g.dy !== Math.abs(g.y2 - g.y1))
        fail("MS-PYTH", "ms8-4-pythagorean", "Test", s, `dx/dy inconsistent: ${JSON.stringify(g)}`);
      bump();
      if (!eq(Math.hypot(g.dx, g.dy), g.dist, 1e-9))
        fail("MS-PYTH", "ms8-4-pythagorean", "Test", s, `dist ${g.dist} != hypot(${g.dx},${g.dy})`);
      bump();
      if (!eq(Number(p.answer), g.dist, 1e-9)) fail("MS-PYTH", "ms8-4-pythagorean", "Test", s, `answer ${p.answer} != dist ${g.dist}`);
    } else unverified++;
  }
  for (let s = 0; s < 40; s++) for (const p of gen("ms8-1-linear-equations", s * 41 + 10, 2)) {
    bump();
    const g = p.given;
    if (g.kind === "distributive-both") {
      // a(x+b) = cx+d
      if (g.a === g.c) { unverified++; continue; }
      const x = (g.d - g.a * g.b) / (g.a - g.c);
      if (!eq(x, Number(p.answer), 1e-9))
        fail("MS-LINEQ", "ms8-1-linear-equations", "Test", s, `mine x=${x} answer=${p.answer} (given=${JSON.stringify(g)})`);
      bump();
      if (!eq(g.a * (x + g.b), g.c * x + g.d, 1e-9))
        fail("MS-LINEQ", "ms8-1-linear-equations", "Test", s, `solution doesn't satisfy equation`);
    } else unverified++;
  }
}

// ── Calculus deep checks (prompt-parsed + data-driven) ────────────────────────
{
  const simpson = (f: (x: number) => number, a: number, b: number, n = 2000) => {
    let s = 0;
    for (let i = 0; i <= n; i++) { const x = a + ((b - a) * i) / n; s += (i === 0 || i === n ? 1 : i % 2 ? 4 : 2) * f(x); }
    return ((b - a) / (3 * n)) * s;
  };
  const polyMul = (a: number[], b: number[]): number[] => {
    const r = new Array(a.length + b.length - 1).fill(0);
    for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) r[i + j] += a[i] * b[j];
    return r;
  };
  const polySub = (a: number[], b: number[]) => { const n = Math.max(a.length, b.length); const r = new Array(n).fill(0); for (let i = 0; i < n; i++) r[i] = (a[i] ?? 0) - (b[i] ?? 0); return r; };
  const Eintries = ["calc-derivative-rules", "calc-derivative-apps", "calc-integrals", "calc-limits", "calc-mcq-mixed"];
  for (const cid of Eintries) {
    const e = byId(cid);
    for (let s = 0; s < 40; s++) for (const p of (e.generate("Test", s * 43 + 11, { count: 2, difficulty: 3 }) as any[])) {
      const v = p.verify; if (!v) continue;
      const ansN = Number(String(p.answer).replace(/−/g, "-").replace(/,/g, ""));
      const prompt = String(p.prompt);
      if (p.subtype === "ChainRule" && v.kind === "number" && v.source?.kind === "poly") {
        // parse "f(x) = (x + 2)²" or "(2x − 1)^3" for inner + exponent
        bump();
        const pm = prompt.replace(/−/g, "-").match(/\(\s*([\-x\d\s+\-^]+)\)\s*[\^²³]/);
        const em = prompt.replace(/−/g, "-").match(/\)\s*\^?\s*(\d)|\)(²|³)/);
        const expMap: Record<string, number> = { "²": 2, "³": 3 };
        const nExp = em ? Number(em[1] ?? expMap[em[2]]) : NaN;
        if (!pm || !Number.isFinite(nExp)) { unverified++; continue; }
        // inner poly: parse "x + 2" / "2x - 1"
        const inner = pm[1].replace(/\s+/g, "");
        const im = inner.match(/^([+-]?\d*)x([+-]\d+)?$/);
        if (!im) { unverified++; continue; }
        const ia = im[1] === "" || im[1] === "+" ? 1 : im[1] === "-" ? -1 : Number(im[1]);
        const ib = im[2] ? Number(im[2]) : 0;
        const x0 = v.data.x;
        const g = ia * x0 + ib;
        const mine = nExp * Math.pow(g, nExp - 1) * ia;
        if (!eq(mine, v.value, 1e-6)) fail("CALC-CHAIN", cid, "Test", s, `my f'(${x0})=${mine} != verify ${v.value} (prompt: ${prompt.slice(0, 50)})`);
        bump();
        if (!eq(mine, ansN, 1e-6) && String(p.answer).replace(/−/g, "-") !== String(v.value))
          fail("CALC-CHAIN", cid, "Test", s, `my f'(${x0})=${mine} != answer ${p.answer}`);
      } else if (p.subtype === "USubstitution" && v.kind === "number" && v.source?.kind === "poly") {
        bump();
        const bm = prompt.match(/from\s+(-?[\d.]+)\s+to\s+(-?[\d.]+|\\infty|∞)/);
        if (!bm) { unverified++; continue; }
        const mine = simpson((x) => polyEval(v.source.coeffs, x), Number(bm[1]), Number(bm[2]));
        if (Math.abs(mine - v.value) > 1e-4)
          fail("CALC-USUB-NUM", cid, "Test", s, `simpson=${mine} != verify ${v.value} (prompt: ${prompt.slice(0, 60)})`);
      } else if (p.subtype === "FTC" && v.kind === "number" && v.data?.variant === 1) {
        bump();
        const F = (x: number) => { const c = v.source.coeffs; return c.reduce((s: number, ci: number, i: number) => s + (ci * Math.pow(x, c.length - i)) / (c.length - i), 0); };
        const mine = v.data.x0 + (F(v.data.t1) - F(v.data.t0));
        if (!eq(mine, v.value, 1e-9) || !eq(mine, ansN, 1e-9))
          fail("CALC-FTC", cid, "Test", s, `mine=${mine} verify=${v.value} answer=${p.answer}`);
      } else if (p.subtype === "ImproperIntegral" && v.kind === "number") {
        bump();
        const d = v.data;
        let mine: number | null = null;
        if (d.variant === 0 && d.p > 1) mine = 1 / (d.p - 1);
        else if (d.variant === 1) mine = 2; // ∫₀¹ x^{-1/2} dx = 2
        if (mine === null) { unverified++; continue; }
        if (!eq(mine, v.value, 1e-9)) fail("CALC-IMPROPER", cid, "Test", s, `mine=${mine} verify=${v.value}`);
      } else if (p.subtype === "RelatedRates" && v.kind === "number") {
        bump();
        const d = v.data;
        let mine: number | null = null;
        if (d.variant === 0) { const y = Math.sqrt(d.L * d.L - d.x * d.x); mine = -(d.x / y) * d.dxdt; }
        else if (d.variant === 1) mine = (9 * d.dVdt) / (Math.PI * d.h * d.h); // V=πh³/27 → dh/dt = 9 dVdt/(πh²)
        else if (d.variant === 2) mine = d.dVdt / (4 * Math.PI * d.r * d.r);
        if (mine === null) { unverified++; continue; }
        if (Math.abs(mine - v.value) > (v.tol ?? 1e-9) + 1e-9)
          fail("CALC-RELRATE", cid, "Test", s, `INDEPENDENT mine=${mine.toFixed(4)} != factory ${v.value} (prompt: ${prompt.slice(0, 70)})`);
      } else if (p.subtype === "Optimization" && v.kind === "number") {
        bump();
        const d = v.data;
        let mine: number | null = null;
        if (d.variant === 0) mine = (d.P * d.P) / 8;
        else if (d.variant === 1) mine = 128; // V(2)=2·8²
        else if (d.variant === 2) mine = Math.pow(d.V / (2 * Math.PI), 1 / 3);
        if (mine === null) { unverified++; continue; }
        if (Math.abs(mine - v.value) > (v.tol ?? 1e-9) + 1e-9)
          fail("CALC-OPT", cid, "Test", s, `mine=${mine} != factory ${v.value}`);
      } else if (p.subtype === "TrigDerivative" && v.source?.kind === "trig") {
        bump();
        const sc = v.source, x = v.data.angle;
        const u = sc.freq * x + sc.phase;
        const dtrig = sc.base === "sin" ? Math.cos(u) : sc.base === "cos" ? -Math.sin(u) : NaN;
        if (!Number.isFinite(dtrig)) { unverified++; continue; }
        const mine = sc.amp * sc.freq * dtrig;
        if (!eq(mine, v.value, 1e-9)) fail("CALC-TRIGD", cid, "Test", s, `mine=${mine} verify=${v.value}`);
      } else if (p.subtype === "ChainTrigExp" && v.kind === "number") {
        bump();
        let mine: number | null = null;
        if (v.source?.kind === "exp") mine = v.source.coeff * v.source.rate * Math.exp(v.source.rate * v.data.x);
        else if (v.source?.kind === "trig") {
          const sc = v.source, u = sc.freq * v.data.x + sc.phase;
          mine = sc.base === "sin" ? sc.amp * sc.freq * Math.cos(u) : sc.amp * sc.freq * -Math.sin(u);
        }
        if (mine === null || !Number.isFinite(mine)) { unverified++; continue; }
        if (Math.abs(mine - v.value) > (v.tol ?? 1e-6)) fail("CALC-CHAINTE", cid, "Test", s, `mine=${mine} verify=${v.value}`);
      } else if (p.subtype === "QuotientRule" && v.kind === "expr" && v.fn?.kind === "rational" && v.source?.kind === "rational") {
        bump();
        const np = polyDiff(v.source.num), dp = polyDiff(v.source.den);
        const mineN = polySub(polyMul(np, v.source.den), polyMul(v.source.num, dp));
        const mineD = polyMul(v.source.den, v.source.den);
        // cross-multiply: mineN * fn.den == fn.num * mineD (align highest-first arrays on the right)
        const L = polyMul(mineN, v.fn.den), R = polyMul(v.fn.num, mineD);
        const n = Math.max(L.length, R.length);
        const at = (A: number[], i: number) => A[A.length - n + i] ?? 0;
        const ok = Array.from({ length: n }, (_, i) => eq(at(L, i), at(R, i), 1e-6)).every(Boolean);
        if (!ok) fail("CALC-QUOT", cid, "Test", s, `quotient rule mismatch`);
      } else if ((p.subtype === "TangentLine" || p.subtype === "NormalLine") && v.kind === "text" && v.source?.kind === "poly") {
        bump();
        const d = v.data, m = polyEval(polyDiff(v.source.coeffs), d.a), fa = polyEval(v.source.coeffs, d.a);
        const wantM = p.subtype === "TangentLine" ? m : -1 / m;
        if (!eq(wantM, d.m, 1e-9) || !eq(fa - wantM * d.a, d.b, 1e-9))
          fail("CALC-TANLINE", cid, "Test", s, `${p.subtype}: my m=${wantM},b=${fa - wantM * d.a} vs data m=${d.m},b=${d.b}`);
      } else if (p.subtype === "IncreasingDecreasing" && v.kind === "text") {
        bump();
        const d = v.data, lo = Math.min(d.r1, d.r2), hi = Math.max(d.r1, d.r2);
        if (v.source?.coeffs?.[0] <= 0) { unverified++; continue; } // sign logic assumes positive leading coeff
        const want = d.askDec ? `(${lo}, ${hi})` : `(−∞, ${lo}) ∪ (${hi}, ∞)`;
        const uni = (t: string) => t.replace(/−/g, "-");
        if (uni(norm(v.text)) !== uni(norm(want))) fail("CALC-INCDEC", cid, "Test", s, `text "${v.text}" != "${want}"`);
      } else if (p.subtype === "Extrema" && v.kind === "number" && v.source?.kind === "poly") {
        bump();
        const d = v.data, f = (x: number) => polyEval(v.source.coeffs, x);
        const isMax = /maximum/i.test(prompt);
        const cand = isMax ? Math.max(f(d.r1), f(d.r2)) : Math.min(f(d.r1), f(d.r2));
        if (!eq(cand, v.value, 1e-6)) fail("CALC-EXTREMA", cid, "Test", s, `mine=${cand} verify=${v.value} (prompt: ${prompt.slice(0, 60)})`);
      } else if (p.subtype === "CurveSketching" && v.kind === "text") {
        bump();
        const d = v.data;
        const want = d.ask === "max" ? d.r1 : d.ask === "min" ? d.r2 : d.infl;
        if (norm(v.text) !== norm(String(want)).replace(/-/g, "−") && norm(v.text) !== String(want))
          fail("CALC-SKETCH", cid, "Test", s, `text "${v.text}" != "${want}" (ask=${d.ask})`);
      } else if (p.subtype === "LimitInfinite" && v.kind === "text") {
        bump();
        if (norm(p.answer) !== norm(v.text)) fail("CALC-LIMINF", cid, "Test", s, `answer "${p.answer}" != verify "${v.text}"`);
        // independent: evaluate from the correct side at large magnitude
        const f = (x: number) => polyEval(v.source.num, x) / polyEval(v.source.den, x);
        const probe = f(v.point + (v.side === "right" ? 1e-4 : -1e-4));
        const wantInf = v.text.includes("-") ? -Infinity : Infinity;
        if (Math.sign(probe) !== Math.sign(wantInf) || Math.abs(probe) < 100)
          fail("CALC-LIMINF", cid, "Test", s, `one-sided probe ${probe} contradicts "${v.text}"`);
      }
    }
  }
}

console.log(`\n[verify3] unverified variants: ${unverified}`);
report("rt-verify3 (A2/calc/precalc/MS)");
process.exit(0);
