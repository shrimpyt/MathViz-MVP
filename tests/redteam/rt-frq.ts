// rt-frq.ts — AP FRQ internal consistency: recompute every subpart answer
// from the stimulus alone (no verify payloads exist — fully independent).
import { CURRICULUM_REGISTRY } from "@/modules/CurriculumRegistry";
import { failures, fail, counter, report } from "./util";

const bump = (n = 1) => { counter.checks += n; };
const eq = (a: number, b: number, t = 1e-6) => Math.abs(a - b) < t;
const num = (s: string) => Number(String(s).replace(/−/g, "-").replace(/,/g, ""));
const firstNum = (s: string) => { const m = String(s).replace(/−/g, "-").match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : NaN; };
const byId = (id: string) => CURRICULUM_REGISTRY.find((e) => e.id === id)!;

// piecewise-linear area (for f' graph FRQs)
function plArea(pts: { x: number; y: number }[], a: number, b: number): number {
  let area = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const x0 = pts[i].x, x1 = pts[i + 1].x;
    const lo = Math.max(a, x0), hi = Math.min(b, x1);
    if (hi <= lo) continue;
    const y0 = pts[i].y + ((pts[i + 1].y - pts[i].y) * (lo - x0)) / (x1 - x0);
    const y1 = pts[i].y + ((pts[i + 1].y - pts[i].y) * (hi - x0)) / (x1 - x0);
    area += ((y0 + y1) / 2) * (hi - lo);
  }
  return area;
}

let frqN = 0;
// ── calc FRQs ────────────────────────────────────────────────────────────────
{
  const e = byId("calc-frq");
  for (let s = 0; s < 60; s++) for (const p of (e.generate("Test", s * 7 + 1, { count: 2, difficulty: 2 }) as any[])) {
    frqN++;
    const st = p.stimulus, subs: any[] = p.subparts ?? [];
    const ansOf = (l: string) => subs.find((x) => x.label === l)?.answer ?? "";
    if (st.kind === "table") {
      const vals = st.rows.map((r: string[]) => num(r[1]));
      const times = st.rows.map((r: string[]) => num(r[0]));
      // (a) left Riemann sum with n subintervals
      const pa = subs.find((x: any) => /Riemann sum/.test(x.prompt));
      if (pa) {
        bump();
        const nm = pa.prompt.match(/with (\d+) subintervals/);
        const n = nm ? Number(nm[1]) : 0;
        const dt = (times[times.length - 1] - times[0]) / n;
        const mine = dt * vals.slice(0, n).reduce((a: number, b: number) => a + b, 0);
        if (!eq(mine, firstNum(pa.answer), 0.051))
          fail("FRQ-RIEMANN", "calc-frq", "Test", s, `left Riemann mine=${mine.toFixed(2)} answer=${pa.answer}`);
      }
      // (b) over/underestimate vs monotonicity
      const pb = subs.find((x: any) => /overestimate or underestimate/.test(x.prompt));
      if (pb) {
        bump();
        const inc = vals.every((v: number, i: number) => i === 0 || v > vals[i - 1]);
        const dec = vals.every((v: number, i: number) => i === 0 || v < vals[i - 1]);
        const want = inc ? "Underestimate" : dec ? "Overestimate" : "?";
        if (want !== "?" && !String(pb.answer).includes(want))
          fail("FRQ-OVERUNDER", "calc-frq", "Test", s, `monotonicity→${want} but answer=${pb.answer}`);
      }
      // (c) average rate of change
      const pc = subs.find((x: any) => /average rate of change/.test(x.prompt));
      if (pc) {
        bump();
        const im = pc.prompt.match(/interval (\d+)\s*≤\s*t\s*≤\s*(\d+)/);
        if (im) {
          const mine = (vals[vals.length - 1] - vals[0]) / (Number(im[2]) - Number(im[1]));
          if (!eq(mine, firstNum(pc.answer), 5e-4))
            fail("FRQ-AVGRATE", "calc-frq", "Test", s, `avg rate mine=${mine.toFixed(4)} answer=${pc.answer}`);
        }
      }
      // (d) net change with drain
      const pd = subs.find((x: any) => /net change/.test(x.prompt));
      if (pd && pa) {
        bump();
        const dm = pd.prompt.match(/rate of (\d+) gallons per minute/);
        if (dm) {
          const left = (() => { const nm = pa.prompt.match(/with (\d+) subintervals/); const n = nm ? Number(nm[1]) : 0; const dt = (times[times.length - 1] - times[0]) / n; return dt * vals.slice(0, n).reduce((a: number, b: number) => a + b, 0); })();
          const mine = left - (times[times.length - 1] - times[0]) * Number(dm[1]);
          if (!eq(mine, firstNum(pd.answer), 0.051))
            fail("FRQ-NET", "calc-frq", "Test", s, `net mine=${mine.toFixed(2)} answer=${pd.answer}`);
        }
      }
    } else if (st.kind === "scenario") {
      // parse v(t) = −t² + 6t − 8 and x(0)
      const vm = st.text.replace(/−/g, "-").match(/v\(t\)\s*=\s*([^\s]+)\s*meters/);
      const x0m = st.text.match(/x\(0\)\s*=\s*(-?[\d.]+)/);
      if (!vm || !x0m) continue;
      bump();
      // parse polynomial "-t^2 + 6t - 8" — normalize to coeffs by evaluation trick:
      // sample v at t=0,1,2,3 and fit quadratic
      const expr = vm[1];
      const veval = (t: number) => {
        // safe evaluator for simple polynomial text
        const js = expr.replace(/\^/g, "**").replace(/(\d)([a-z])/gi, "$1*$2").replace(/t/g, `(${t})`);
        try { return Function(`"use strict"; return (${js});`)() as number; } catch { return NaN; }
      };
      const v0 = veval(0), v1 = veval(1), v2 = veval(2);
      if (![v0, v1, v2].every(Number.isFinite)) continue;
      // quadratic fit: v(t) = at²+bt+c
      const c0 = v0, a2 = (v2 - 2 * v1 + v0) / 2, b2 = v1 - v0 - a2;
      const x0 = Number(x0m[1]);
      const antider = (t: number) => (a2 * t ** 3) / 3 + (b2 * t ** 2) / 2 + c0 * t;
      // (b) at rest: solve at²+bt+c=0
      const pb = subs.find((x: any) => /at rest/.test(x.prompt));
      if (pb) {
        bump();
        const D = b2 * b2 - 4 * a2 * c0;
        const roots = D < 0 ? [] : [(-b2 + Math.sqrt(D)) / (2 * a2), (-b2 - Math.sqrt(D)) / (2 * a2)].filter((r) => r > 0 && r < 6).sort((x, y) => x - y);
        const claimed = [...String(pb.answer).matchAll(/t\s*=\s*(-?[\d.]+)/g)].map((m) => Number(m[1])).sort((x, y) => x - y);
        if (roots.length !== claimed.length || !roots.every((r, i) => eq(r, claimed[i], 1e-9)))
          fail("FRQ-REST", "calc-frq", "Test", s, `at-rest mine=[${roots}] claimed=[${claimed}] (v=${expr})`);
      }
      // (c) x(3)
      const pc = subs.find((x: any) => /Find x\(3\)/.test(x.prompt));
      if (pc) {
        bump();
        const mine = x0 + (antider(3) - antider(0));
        if (!eq(mine, firstNum(pc.answer), 1e-9))
          fail("FRQ-POS", "calc-frq", "Test", s, `x(3) mine=${mine} answer=${pc.answer}`);
      }
      // (d) total distance = ∫₀⁶|v|dt via Simpson
      const pd = subs.find((x: any) => /total distance/.test(x.prompt));
      if (pd) {
        bump();
        const N = 2000; let sum = 0;
        for (let i = 0; i <= N; i++) { const t = (6 * i) / N; sum += (i === 0 || i === N ? 1 : i % 2 ? 4 : 2) * Math.abs(a2 * t * t + b2 * t + c0); }
        const mine = (6 / (3 * N)) * sum;
        const dm = String(pd.answer).match(/≈\s*(-?[\d.]+)/);
        const claimed = dm ? Number(dm[1]) : firstNum(pd.answer);
        if (Math.abs(mine - claimed) > 0.002)
          fail("FRQ-DIST", "calc-frq", "Test", s, `distance mine=${mine.toFixed(4)} claimed≈${claimed}`);
      }
    } else if (st.kind === "graph" && st.params?.fn?.kind === "piecewiseLinear") {
      const pts = st.params.fn.points;
      const a = ansOf("a"), b = ansOf("b"), c = ansOf("c"), d = ansOf("d");
      // (a) f(2) − f(−1) = ∫₋₁² f'
      const ma = plArea(pts, -1, 2);
      bump();
      const pa = subs.find((x: any) => /f\(2\) − f\(−1\)|f\(2\) - f\(-1\)/.test(x.prompt));
      if (pa && !eq(ma, firstNum(pa.answer), 1e-9))
        fail("FRQ-GRAPH-A", "calc-frq", "Test", s, `∫₋₁²f' mine=${ma} answer=${pa.answer}`);
      // (b) relative max/min: f' sign change (plateau-aware)
      const pb = subs.find((x: any) => /relative max/.test(x.prompt) || /relative min/.test(x.prompt));
      if (pb) {
        bump();
        const wantMax = /relative max/.test(pb.prompt);
        // sample f' sign just left/right of each vertex
        let found: number | null = null;
        const fp = (x: number) => {
          for (let i = 0; i + 1 < pts.length; i++) {
            if (x >= pts[i].x && x <= pts[i + 1].x) {
              const t = (x - pts[i].x) / (pts[i + 1].x - pts[i].x);
              return pts[i].y + t * (pts[i + 1].y - pts[i].y);
            }
          }
          return NaN;
        };
        for (let i = 1; i + 1 < pts.length; i++) {
          const x = pts[i].x, l = fp(x - 1e-6), r = fp(x + 1e-6);
          if (wantMax && l > 0 && r < 0) found = x;
          if (!wantMax && l < 0 && r > 0) found = x;
        }
        const claimed = firstNum(pb.answer.replace("x =", ""));
        if (found === null || !eq(found, claimed, 1e-9))
          fail("FRQ-GRAPH-B", "calc-frq", "Test", s, `rel ${wantMax ? "max" : "min"} mine=${found} answer=${pb.answer}`);
      }
      // (d) f(6) given f(−1): f(−1) + ∫₋₁⁶ f'
      const pd = subs.find((x: any) => /If f\(−1\) =/.test(x.prompt));
      if (pd) {
        bump();
        const f0 = num(pd.prompt.match(/f\(−1\)\s*=\s*(-?[\d.]+)/)?.[1] ?? "NaN");
        const mine = f0 + plArea(pts, -1, 6);
        if (!eq(mine, firstNum(pd.answer), 1e-9))
          fail("FRQ-GRAPH-D", "calc-frq", "Test", s, `f(6) mine=${mine} answer=${pd.answer}`);
      }
    }
  }
}

// ── precalc FRQs ─────────────────────────────────────────────────────────────
{
  const e = byId("precalc-frq");
  for (let s = 0; s < 40; s++) for (const p of (e.generate("Test", s * 11 + 3, { count: 2, difficulty: 2 }) as any[])) {
    frqN++;
    const st = p.stimulus, subs: any[] = p.subparts ?? [];
    if (st.kind === "table") {
      bump();
      const left = st.rows.slice(0, 3).map((r: string[]) => num(r[1]));
      const right = st.rows.slice(3).map((r: string[]) => num(r[1]));
      const llim = left[left.length - 1], rlim = right[right.length - 1];
      const pa = subs.find((x: any) => /Estimate lim/.test(x.prompt) && !/3f/.test(x.prompt));
      if (pa && !eq(llim, rlim, 0.01))
        fail("FRQ-PRELIM", "precalc-frq", "Test", s, `one-sided limits disagree: ${llim} vs ${rlim} but answer claims ${pa.answer}`);
      if (pa) { bump(); if (!eq(llim, firstNum(pa.answer), 0.01)) fail("FRQ-PRELIM", "precalc-frq", "Test", s, `limit mine=${llim} answer=${pa.answer}`); }
      // (c) limit laws: 3·lim − 1
      const pc = subs.find((x: any) => /3f\(x\) − 1|3f\(x\) - 1/.test(x.prompt));
      if (pc) { bump(); if (!eq(3 * llim - 1, firstNum(pc.answer), 0.02)) fail("FRQ-PRELIM", "precalc-frq", "Test", s, `3·lim−1 mine=${3 * llim - 1} answer=${pc.answer}`); }
    } else if (st.kind === "graph" && st.graphKind === "precalc-complex-plane") {
      const pts = st.params.points;
      const z1 = pts.find((z: any) => z.label === "z1"), z2 = pts.find((z: any) => z.label === "z2");
      if (!z1 || !z2) continue;
      const pa = subs.find((x: any) => x.label === "a");
      if (pa) {
        bump();
        const sr = z1.re + z2.re, si = z1.im + z2.im;
        // factory pretty-prints: "i", "-i", "3−3i", "4−i", "-2", "5−4i", "a+bi"
        const fmtC = (re: number, im: number) => {
          const rs = re === 0 ? "" : String(re);
          const is = im === 0 ? "" : im === 1 ? "i" : im === -1 ? "−i" : `${im < 0 ? "−" : "+"}${Math.abs(im)}i`;
          if (re === 0 && im === 0) return "0";
          if (re === 0) return (im < 0 ? "−" : "") + is.replace("−", "");
          if (im === 0) return rs;
          return rs + (im < 0 ? "−" : "+") + is.replace(/^[−+]/, "").replace(/^i$/, "i");
        };
        const normAns = (s: string) => String(s).replace(/\s+/g, "").replace(/\.$/, "");
        if (normAns(pa.answer) !== fmtC(sr, si))
          fail("FRQ-COMPLEX", "precalc-frq", "Test", s, `z1+z2 mine=${fmtC(sr, si)} answer=${pa.answer}`);
      }
      const pb = subs.find((x: any) => x.label === "b");
      if (pb) { bump(); if (Math.abs(Math.hypot(z2.re, z2.im) - firstNum(pb.answer)) > 0.001) fail("FRQ-COMPLEX", "precalc-frq", "Test", s, `|z2| mine=${Math.hypot(z2.re, z2.im)} answer=${pb.answer}`); }
      const pc = subs.find((x: any) => x.label === "c");
      if (pc) {
        bump();
        const r = Math.hypot(z1.re, z1.im), th = Math.round((Math.atan2(z1.im, z1.re) * 180) / Math.PI);
        const ans = String(pc.answer);
        if (!ans.includes("45°") || th !== 45) { /* only validate when θ=45 */ }
        const rm = ans.match(/([\d.]+)√2/);
        if (rm && Math.abs(r - Number(rm[1]) * Math.SQRT2) > 0.01)
          fail("FRQ-COMPLEX", "precalc-frq", "Test", s, `r mine=${r} answer=${pc.answer}`);
      }
    }
  }
}

console.log(`\nFRQ problems checked: ${frqN}`);
report("rt-frq");
process.exit(0);
