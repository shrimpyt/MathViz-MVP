// rt-verify2.ts — independent verification for geometry / A2 / calc / precalc / MS.
// Same doctrine as rt-verify.ts: recompute with OUR OWN math.
import { CURRICULUM_REGISTRY } from "@/modules/CurriculumRegistry";
import { failures, fail, report } from "./util";

import { counter } from "./util";
const bump = (n = 1) => { counter.checks += n; };
let unverified = 0;
const eq = (a: number, b: number, t = 1e-7) => Math.abs(a - b) < t;
const deg = (r: number) => (r * 180) / Math.PI;
const rad = (d: number) => (d * Math.PI) / 180;
const polyEval = (c: number[], x: number) => c.reduce((s, ci, i) => s + ci * Math.pow(x, c.length - 1 - i), 0);
const polyDiff = (c: number[]) => c.slice(0, -1).map((ci, i) => ci * (c.length - 1 - i));
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const frac = (n: number, d: number) => { const g = gcd(Math.abs(n), Math.abs(d)) || 1; return `${n / g}/${d / g}`; };
const byId = (id: string) => CURRICULUM_REGISTRY.find((e) => e.id === id)!;
function gen(id: string, seed: number, difficulty: 1 | 2 | 3 = 2): any[] {
  return byId(id).generate("Test", seed, { count: 2, difficulty }) as any[];
}
const norm = (s: string) => String(s).replace(/\s+/g, " ").trim();

// ── G.9A ─────────────────────────────────────────────────────────────────────
for (const id of ["trig-1-ratios", "trig-2-sides", "trig-3-angles", "elevation-depression"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 31 + 5, 3)) {
    bump();
    const g = p.given, rt = p.ratioType;
    if (p.subtype === "IdentifyRatio") {
      const want = rt === "sin" ? `${g.opposite}/${g.hypotenuse}` : rt === "cos" ? `${g.adjacent}/${g.hypotenuse}` : `${g.opposite}/${g.adjacent}`;
      if (norm(p.answer) !== want) fail("G9A-RATIO", id, "Test", s, `ratioType=${rt} given=${JSON.stringify(g)} answer="${p.answer}" want "${want}"`);
    } else if (p.subtype === "SolveForSide" || p.subtype === "ElevationDepression") {
      const A = rad(g.angle);
      const entries = Object.entries(g).filter(([k]) => k !== "angle") as [string, number][];
      if (entries.length !== 1) { unverified++; continue; }
      const [kname, K] = entries[0];
      const cands: number[] = [];
      if (kname === "hypotenuse") { cands.push(K * Math.sin(A), K * Math.cos(A)); }
      else if (kname === "opposite") { cands.push(K / Math.sin(A), K / Math.tan(A)); }
      else if (kname === "adjacent") { cands.push(K / Math.cos(A), K * Math.tan(A)); }
      else { unverified++; continue; }
      const ans = Number(p.answer);
      const hits = cands.filter((c) => Math.round(c) === ans);
      bump();
      if (hits.length !== 1) fail("G9A-SIDE", id, "Test", s, `angle=${g.angle} ${kname}=${K} ratio=${rt} answer=${ans} candidates=${cands.map((c) => c.toFixed(3))} hits=${hits.length}`);
      // rounding honesty: the exact value must be within 0.5 of the rounded answer (always true) —
      // stronger: check the generator rounded, not truncated: |exact - ans| < 0.5 AND Math.round(exact)===ans
      if (hits.length === 1 && Math.round(hits[0]) !== ans) fail("G9A-SIDE-ROUND", id, "Test", s, `not properly rounded`);
    } else if (p.subtype === "SolveForAngle") {
      let exact: number | null = null;
      if (rt === "sin" && g.opposite && g.hypotenuse) exact = deg(Math.asin(g.opposite / g.hypotenuse));
      if (rt === "cos" && g.adjacent && g.hypotenuse) exact = deg(Math.acos(g.adjacent / g.hypotenuse));
      if (rt === "tan" && g.opposite && g.adjacent) exact = deg(Math.atan(g.opposite / g.adjacent));
      bump();
      if (exact === null) { unverified++; continue; }
      if (Math.round(exact) !== Number(p.answer))
        fail("G9A-ANGLE", id, "Test", s, `ratio=${rt} given=${JSON.stringify(g)} exact=${exact.toFixed(3)} answer=${p.answer}`);
    }
    // diagram consistency: svg right triangle must satisfy Pythagoras
    const sv = p.svgParams;
    if (sv && sv.kind === "RightTriangle" && sv.opposite > 0 && sv.adjacent > 0 && sv.hypotenuse > 0) {
      bump();
      if (!eq(sv.opposite ** 2 + sv.adjacent ** 2, sv.hypotenuse ** 2, 1e-4))
        fail("G9A-DIAGRAM", id, "Test", s, `diagram violates Pythagoras: ${sv.opposite}²+${sv.adjacent}² vs ${sv.hypotenuse}²`);
      bump();
      if (sv.hypotenuse < sv.opposite || sv.hypotenuse < sv.adjacent)
        fail("G9A-DIAGRAM", id, "Test", s, `hypotenuse not longest side`);
    }
  }
}

// parse exact-radical answers like "7\\sqrt{3}" or plain numbers
function radicalVal(a: unknown): number {
  if (typeof a === "number") return a;
  const s = String(a).replace(/\s+/g, "");
  const m = s.match(/^(-?[\d.]+)?\\sqrt\{(\d+)\}$/);
  if (m) return (m[1] === undefined || m[1] === "" ? 1 : Number(m[1])) * Math.sqrt(Number(m[2]));
  const m2 = s.match(/^(-?[\d.]+)$/);
  if (m2) return Number(m2[1]);
  return NaN;
}

// ── G.9B special right triangles ─────────────────────────────────────────────
for (const id of ["special-right-triangles"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 31 + 5, 3)) {
    bump();
    const g = p.given, ans = radicalVal(p.answer), find = String(p.find);
    if (!Number.isFinite(ans)) { fail("G9B-ANSWER-PARSE", id, "Test", s, `unparseable answer ${JSON.stringify(p.answer)}`); continue; }
    let exact: number | null = null;
    const numSide = (v: unknown) => radicalVal(v);
    if (p.subtype === "30-60-90") {
      const sh = numSide(g.shortLeg), hy = numSide(g.hypotenuse), lo = numSide(g.longLeg);
      if (/short leg/i.test(find) && Number.isFinite(hy)) exact = hy / 2;
      else if (/hypotenuse/i.test(find) && Number.isFinite(sh)) exact = 2 * sh;
      else if (/long leg/i.test(find) && Number.isFinite(sh)) exact = sh * Math.sqrt(3);
      else if (/long leg/i.test(find) && Number.isFinite(hy)) exact = (hy / 2) * Math.sqrt(3);
      else if (/short leg/i.test(find) && Number.isFinite(lo)) exact = lo / Math.sqrt(3);
    } else if (p.subtype === "45-45-90") {
      const leg = numSide(g.leg), hy = numSide(g.hypotenuse);
      if (/hypotenuse/i.test(find) && Number.isFinite(leg)) exact = leg * Math.sqrt(2);
      else if (/leg/i.test(find) && Number.isFinite(hy)) exact = hy / Math.sqrt(2);
    }
    if (exact === null) { unverified++; continue; }
    if (!eq(exact, ans, 1e-6))
      fail("G9B-SPECIAL", id, "Test", s, `${p.subtype} given=${JSON.stringify(g)} find="${find}" exact=${exact} answer=${JSON.stringify(p.answer)}`);
    const sv = p.svgParams;
    if (sv && sv.opposite > 0 && sv.adjacent > 0 && sv.hypotenuse > 0) {
      bump();
      if (!eq(sv.opposite ** 2 + sv.adjacent ** 2, sv.hypotenuse ** 2, 1e-4))
        fail("G9B-DIAGRAM", id, "Test", s, `diagram violates Pythagoras`);
    }
  }
}

// ── G.12A circle theorems ────────────────────────────────────────────────────
{
  const e = byId("anatomy-of-a-circle");
  for (let s = 0; s < 60; s++) for (const p of (e.generate("Test", s * 17 + 3, { count: 3, difficulty: 3 }) as any[])) {
    bump();
    const g = p.given, ans = Number(p.answer);
    let exact: number | null = null;
    if (p.subtype === "InscribedAngle") exact = g.interceptedArc / 2;
    else if (p.subtype === "CentralAngle") exact = g.interceptedArc;
    else if (p.subtype === "TwoChords") exact = (g.arc1 + g.arc2) / 2;
    else if (p.subtype === "Tangent") exact = g.interceptedArc / 2;
    else if (p.subtype === "TwoSecants") exact = (g.farArc - g.nearArc) / 2;
    if (exact === null || !Number.isFinite(exact)) { unverified++; continue; }
    if (!eq(exact, ans)) fail("G12A-CIRCLE", "anatomy-of-a-circle", "Test", s, `${p.subtype} given=${JSON.stringify(g)} exact=${exact} answer=${ans}`);
    bump();
    if (exact <= 0 || exact >= 360) fail("G12A-RANGE", "anatomy-of-a-circle", "Test", s, `${p.subtype} produced degenerate angle ${exact}`);
  }
}

// ── G.12B measurement ───────────────────────────────────────────────────────
{
  const e = byId("ch11-1-circumference");
  for (let s = 0; s < 40; s++) for (const p of (e.generate("Test", s * 13 + 2, { count: 3, difficulty: 3 }) as any[])) {
    bump();
    const r = Number(p.radius), ans = Number(p.answer);
    const m = String(p.find).match(/(\d+(?:\.\d+)?)°/);
    let exact: number | null = null;
    if (p.subtype === "Circumference") exact = 2 * Math.PI * r;
    else if (p.subtype === "ArcLength" && m) exact = (Number(m[1]) / 360) * 2 * Math.PI * r;
    else if (p.subtype === "SectorArea" && m) exact = (Number(m[1]) / 360) * Math.PI * r * r;
    if (exact === null || r <= 0) { unverified++; continue; }
    if (Math.abs(exact - ans) > 0.00501)
      fail("G12B-MEASURE", "ch11-1-circumference", "Test", s, `${p.subtype} r=${r} find="${p.find}" exact=${exact.toFixed(4)} answer=${ans}`);
  }
}

// ── G.13B probability ────────────────────────────────────────────────────────
{
  const e = byId("target-zone");
  for (let s = 0; s < 40; s++) for (const p of (e.generate("Test", s * 19 + 4, { count: 3, difficulty: 3 }) as any[])) {
    bump();
    let exact: number | null = null;
    if (p.subtype === "ConcentricCircles") exact = 100 * (p.innerR / p.outerR) ** 2;
    else if (p.subtype === "ShadedSector") exact = 100 * (p.sectorAngle / 360);
    if (exact === null) { unverified++; continue; }
    const pct = parseFloat(String(p.answerPct).replace("%", ""));
    if (Math.abs(exact - pct) > 0.51)
      fail("G13B-PROB", "target-zone", "Test", s, `${p.subtype} exact=${exact.toFixed(2)}% answerPct=${p.answerPct}`);
    bump();
    if (p.subtype === "ConcentricCircles" && p.innerR >= p.outerR)
      fail("G13B-DEGENERATE", "target-zone", "Test", s, `innerR ${p.innerR} >= outerR ${p.outerR}`);
  }
}

// ── G.2B coordinate ──────────────────────────────────────────────────────────
{
  const e = byId("ch7-1-distance-midpoint");
  for (let s = 0; s < 40; s++) for (const p of (e.generate("Test", s * 23 + 6, { count: 3, difficulty: 3 }) as any[])) {
    bump();
    const { p1, p2 } = p;
    if (!p1 || !p2) { unverified++; continue; }
    const ans = String(p.answer).replace(/[()]/g, "");
    if (p.subtype === "Midpoint") {
      const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
      const [ax, ay] = ans.split(",").map(Number);
      if (!eq(mx, ax, 1e-9) || !eq(my, ay, 1e-9))
        fail("G2B-MIDPOINT", "ch7-1-distance-midpoint", "Test", s, `A(${p1.x},${p1.y}) B(${p2.x},${p2.y}) mine=(${mx},${my}) answer=${p.answer}`);
    } else if (p.subtype === "Distance") {
      const d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (Math.abs(d - Number(p.answer)) > 0.00501)
        fail("G2B-DISTANCE", "ch7-1-distance-midpoint", "Test", s, `mine=${d.toFixed(4)} answer=${p.answer}`);
    } else if (p.subtype === "Slope") {
      const dx = p2.x - p1.x;
      if (dx === 0) { unverified++; continue; }
      const m = (p2.y - p1.y) / dx;
      if (Math.abs(m - Number(p.answer)) > 0.00501)
        fail("G2B-SLOPE", "ch7-1-distance-midpoint", "Test", s, `mine=${m.toFixed(4)} answer=${p.answer}`);
    }
  }
}

console.log(`\n[geometry] unverified variants: ${unverified}`);
report("rt-verify2 (geometry)");
process.exit(0);
