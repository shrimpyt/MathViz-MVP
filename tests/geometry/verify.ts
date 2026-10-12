// verify.ts — Geometry generator verification.
//
// For every wired geometry entry (9 lessons + 9 chapter tests):
//  • generation succeeds across difficulties 1–3 and many seeds, no exceptions
//  • every problem has a prompt, a non-empty answer, ≥2 steps, a reason on
//    EVERY step, and at least one guided-notes blank
//  • the subtype belongs to the entry's declared pool
//  • determinism: same (entry, mode, seed, options) → byte-identical JSON
//  • INDEPENDENT answer checking: each problem carries `verify` raw givens;
//    the checkers below recompute the expected answer from those givens with
//    their own math (never reading the factory's steps) and compare, and for
//    counterexamples they re-evaluate the conjecture at the witness.
//
// Run: npx tsx tests/geometry/verify.ts

import { WIRED_GEOMETRY } from "../../src/modules/geometry-lessons";
import type { GeometryProblem } from "../../src/lib/factories/GeometryTypes";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(cond: boolean, label: string) {
  if (cond) passed++;
  else {
    failed++;
    if (failures.length < 60) failures.push(label);
  }
}
function section(name: string) {
  console.log(`\n== ${name} ==`);
}

// ── Independent formatting/math helpers (checker-side, not imported) ─────────

function gcd2(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { const t = a % b; a = b; b = t; }
  return a || 1;
}
function fracStr(p: number, q: number): string {
  const g = gcd2(p, q);
  let rp = p / g, rq = q / g;
  if (rq < 0) { rp = -rp; rq = -rq; }
  return rq === 1 ? String(rp) : `${rp}/${rq}`;
}
function fmtNum(n: number): string {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : String(r);
}
function ptStr(x: number, y: number): string {
  return `(${x}, ${y})`;
}
function ruleStrC(a: number, b: number): string {
  const xs = a === 0 ? "x" : a > 0 ? `x + ${a}` : `x − ${-a}`;
  const ys = b === 0 ? "y" : b > 0 ? `y + ${b}` : `y − ${-b}`;
  return `(x, y) → (${xs}, ${ys})`;
}
function close(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-9;
}
function parseLeadingNum(s: string): number {
  const m = s.replace(",", "").match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
}

type V = Record<string, number | string | boolean | number[] | string[]>;

/** Returns true when the problem's answer is independently confirmed. */
function verifyAnswer(p: GeometryProblem): boolean {
  const v = p.verify as V | undefined;
  if (!v) return false;
  const kind = v.kind as string;
  const A = p.answer;
  const n = (k: string) => v[k] as number;
  switch (kind) {
    case "oneOf": return (v.options as string[]).includes(A);
    case "netCount": {
      const counts: Record<string, Record<string, number>> = {
        cube: { faces: 6, edges: 12, vertices: 8 },
        rectPrism: { faces: 6, edges: 12, vertices: 8 },
        triPrism: { faces: 5, edges: 9, vertices: 6 },
        sqPyramid: { faces: 5, edges: 8, vertices: 5 },
        cylinder: { faces: 3, edges: 2, vertices: 0 },
      };
      return A === String(counts[v.solid as string][v.ask as string]);
    }
    case "orthoRect": {
      const [l, w, h] = [n("l"), n("w"), n("h")];
      const dims = v.view === "front" ? [l, h] : v.view === "top" ? [l, w] : [w, h];
      return A === `Rectangle, ${dims[0]} by ${dims[1]}`;
    }
    case "orthoCyl":
      return v.view === "top"
        ? A === `Circle, radius ${n("r")}`
        : A === `Rectangle, ${2 * n("r")} by ${n("h")}`;
    case "segAdd": return A === String(v.ask === "whole" ? n("ab") + n("bc") : n("bc"));
    case "segAddAlg": {
      const x = (n("ac") - n("q") - n("bc")) / n("p");
      return Number.isInteger(x) && A === `x = ${x}, AB = ${n("p") * x + n("q")}`;
    }
    case "numLine":
      return v.ask === "distance" ? A === String(Math.abs(n("b") - n("a"))) : A === String((n("a") + n("b")) / 2);
    case "angleAdd": {
      const expected = v.askPart ? n("part2") : n("part1") + n("part2");
      return A === `${expected}°`;
    }
    case "compSupp": {
      const target = v.mode === "complementary" ? 90 : 180;
      return A === `${target - n("m")}°`;
    }
    case "verticalLinear": return A === `${v.vertical ? n("a") : 180 - n("a")}°`;
    case "bisector": return A === (v.askWhole ? `${2 * n("half")}°` : `${n("half")}°`);
    case "arithPattern": return A === String(n("a1") + (n("n") - 1) * n("d"));
    case "arithNext": return A === `${n("a1") + 5 * n("d")}, ${n("a1") + 6 * n("d")}`;
    case "geoNext": return A === `${n("a1") * n("r") ** 5}, ${n("a1") * n("r") ** 6}`;
    case "triangular": return parseLeadingNum(A) === (n("n") * (n("n") + 1)) / 2;
    case "oddSum": return A === String(n("n") * n("n"));
    case "counterSumOdd": return n("a") % 2 === 1 && n("b") % 2 === 1 && (n("a") + n("b")) % 2 === 0;
    case "counterDivisible": return n("n") % 3 === 0 && n("n") % 6 !== 0;
    case "counterSquare": return n("x") * n("x") <= n("x");
    case "counterPrimeForm": {
      const val = 2 * n("x") + 1;
      let composite = false;
      for (let d = 2; d < val; d++) if (val % d === 0) composite = true;
      return composite;
    }
    case "counterRect": return n("l") !== n("w") && n("l") > 0 && n("w") > 0;
    case "counterAdjacent": return n("a") + n("b") !== 180;
    case "linearEq": {
      const m = A.match(/x = (-?\d+)/);
      return !!m && n("a") * parseInt(m[1]) + n("b") === n("c");
    }
    case "midsegment": return A === String(v.givenBase ? n("base") / 2 : n("base"));
    case "midsegmentAlg": {
      const x = n("mult") === 3 ? 2 * n("a") : n("a");
      return 2 * (x + n("a")) === n("mult") * x && A === `x = ${x}, DE = ${x + n("a")}`;
    }
    case "medialPerim": {
      const s = n("a") + n("b") + n("c");
      const ok = n("a") + n("b") > n("c") && n("a") + n("c") > n("b") && n("b") + n("c") > n("a");
      return ok && s % 2 === 0 && A === String(s / 2);
    }
    case "midAngle": return A === `${n("ang")}°`;
    case "coordMid": {
      const dx = (n("ax") + n("bx")) / 2, dy = (n("ay") + n("by")) / 2;
      const ex = (n("ax") + n("cx")) / 2, ey = (n("ay") + n("cy")) / 2;
      const de = Math.hypot(ex - dx, ey - dy);
      const bc = Math.hypot(n("cx") - n("bx"), n("cy") - n("by"));
      const expected = `D${ptStr(dx, dy)}, E${ptStr(ex, ey)}; DE = ${fmtNum(de)}`;
      return close(de * 2, bc) && A === expected;
    }
    case "perpBis": return A === String(n("d"));
    case "perpBisAlg": return A === `x = ${n("x")}, PA = ${3 * n("x") + 2}`;
    case "angBisDist": return A === `${n("d")} units`;
    case "centroid": return v.askWhole ? A === String(n("median")) : A === String((2 * n("median")) / 3);
    case "triRange": return A === `${n("b") - n("a")} < x < ${n("a") + n("b")}`;
    case "triPossible": {
      const ok = n("a") + n("b") > n("c") && n("a") + n("c") > n("b") && n("b") + n("c") > n("a");
      return A === (ok ? "Yes" : "No");
    }
    case "interiorSum": return A === `${(n("n") - 2) * 180}°`;
    case "regularInterior": return A === `${((n("n") - 2) * 180) / n("n")}°`;
    case "exteriorN": return 360 % n("ext") === 0 && A === String(360 / n("ext"));
    case "exteriorEach": return A === `${360 / n("n")}°`;
    case "missingInterior": {
      const known = v.known as number[];
      const sum = known.reduce((s, x) => s + x, 0);
      return A === `${(n("n") - 2) * 180 - sum}°`;
    }
    case "sidesFromSum": return A === String(n("sum") / 180 + 2);
    case "paraSidesAlg": return A === `x = ${n("x")}, AB = ${2 * n("x") + 3}`;
    case "paraPerim": return A === String(2 * (n("w") + n("h")));
    case "paraAngles": {
      const s = 180 - n("a");
      return v.askOpp ? A === `m∠C = ${n("a")}°, m∠B = ${s}°` : A === `m∠B = ${s}°, m∠D = ${s}°`;
    }
    case "paraDiag": return A === String(v.askWholeDiag ? 2 * n("half") : n("half"));
    case "rectDiag": return A === `x = ${n("x")}, diagonals = ${3 * n("x") + 1}`;
    case "rhombusSide": {
      const s2 = (n("d1") / 2) ** 2 + (n("d2") / 2) ** 2;
      const s = Math.sqrt(s2);
      return Number.isInteger(s) && A === String(s);
    }
    case "trapMid": return A === fmtNum((n("b1") + n("b2")) / 2);
    case "trapMidInv": return A === String(2 * n("mid") - n("b1"));
    case "kiteAngles": {
      const rest = 360 - 2 * n("pair") - n("other1");
      return rest > 0 && A === `${rest}°`;
    }
    case "transversal": {
      const equal = ["corresponding", "altInterior", "altExterior", "vertical"].includes(v.rel as string);
      return A === `${equal ? n("val") : 180 - n("val")}°`;
    }
    case "transAlg": {
      let x: number;
      if (v.equal) x = (n("d") - n("b")) / (n("a") - n("c"));
      else x = (180 - n("b") - n("d")) / (n("a") + n("c"));
      const v1 = n("a") * x + n("b");
      const v2 = n("c") * x + n("d");
      const relationOk = v.equal ? v1 === v2 : v1 + v2 === 180;
      return Number.isInteger(x) && relationOk && A === `x = ${x}; angles are ${v1}° and ${v2}°`;
    }
    case "slope": return A === fracStr(n("y2") - n("y1"), n("x2") - n("x1"));
    case "slopeRelation": {
      const expected = n("p1") * n("q2") === n("p2") * n("q1") ? "Parallel"
        : n("p1") * n("p2") + n("q1") * n("q2") === 0 ? "Perpendicular" : "Neither";
      return A === expected;
    }
    case "slopePP": return A === (v.perp ? fracStr(-n("q"), n("p")) : fracStr(n("p"), n("q")));
    case "lineEq": {
      const m = n("mNum");
      let mStr = "";
      for (let q = 1; q <= 12 && !mStr; q++) {
        const p = m * q;
        if (Number.isInteger(p)) mStr = fracStr(p, q);
      }
      const mPart = mStr === "1" ? "" : mStr === "-1" ? "-" : mStr;
      const b = n("b");
      return A === `y = ${mPart}x ${b >= 0 ? `+ ${b}` : `− ${-b}`}`;
    }
    case "translate": return A === ptStr(n("x") + n("a"), n("y") + n("b"));
    case "translateFigure": {
      const pts = v.pts as number[];
      const labels = ["A", "B", "C"];
      const exp = [0, 1, 2].map((i) => `${labels[i]}′${ptStr(pts[2 * i] + n("a"), pts[2 * i + 1] + n("b"))}`).join(", ");
      return A === exp;
    }
    case "findRule": return A === `${ruleStrC(n("a"), n("b"))}; vector ⟨${n("a")}, ${n("b")}⟩`;
    case "preimage": return A === ptStr(n("x") - n("a"), n("y") - n("b"));
    case "reflect": {
      const [x, y, k] = [n("x"), n("y"), n("k")];
      const r: Record<string, [number, number]> = {
        xAxis: [x, -y], yAxis: [-x, y], yEqX: [y, x], xEqK: [2 * k - x, y], yEqK: [x, 2 * k - y],
      };
      const exp = r[v.rk as string];
      return !!exp && A === ptStr(exp[0], exp[1]);
    }
    case "rotate": {
      const [x, y] = [n("x"), n("y")];
      const exp = n("rot") === 90 ? [-y, x] : n("rot") === 180 ? [-x, -y] : [y, -x];
      return A === ptStr(exp[0], exp[1]);
    }
    case "symLines": return A === String(n("n"));
    case "symRot": return A === `${360 / n("n")}°`;
    case "compose": {
      const tx = n("x") + n("a"), ty = n("y") + n("b");
      const exp = v.mirror === "xAxis" ? [tx, -ty] : [-tx, ty];
      return A === ptStr(exp[0], exp[1]);
    }
    case "similarSide": return A === String(n("k") * n("s2"));
    case "proportion": {
      const x = (n("q") * n("r")) / n("p");
      return Number.isInteger(x) && n("p") * x === n("q") * n("r") && A === String(x);
    }
    case "triProp": {
      if (v.askEC) {
        const ec = (n("AE") * n("DB")) / n("AD");
        return Number.isInteger(ec) && A === String(ec);
      }
      const ae = (n("EC") * n("AD")) / n("DB");
      return Number.isInteger(ae) && A === String(ae);
    }
    case "geoMean": {
      const s = Math.sqrt(n("p") * n("q"));
      return Number.isInteger(s) && A === String(s);
    }
    case "dilationK": return A === `${n("k")} (enlargement)`;
    case "dilationImg": {
      const pts = v.pts as number[];
      const labels = ["A", "B", "C"];
      const exp = [0, 1, 2].map((i) => `${labels[i]}′${ptStr((pts[2 * i] * n("kNum")) / n("kDen"), (pts[2 * i + 1] * n("kNum")) / n("kDen"))}`).join(", ");
      return A === exp;
    }
    case "shadow": {
      const h = (n("personH") * n("treeShadow")) / n("personShadow");
      return A === `${h} ft`;
    }
    case "tangentLen": {
      const t = Math.sqrt(n("hyp") ** 2 - n("radius") ** 2);
      return Number.isInteger(t) && A === String(t);
    }
    case "twoTangent": return A === String(n("len"));
    case "twoTangentAlg": return A === `x = ${n("x")}, length = ${2 * n("x") + 3}`;
    case "tangentAngle": return A === `${180 - n("angP")}°`;
    case "isTangent": return A === (n("r") ** 2 + n("t") ** 2 === n("d") ** 2 ? "Yes" : "No");
    case "circumPerim": return A === String(2 * (n("p") + n("q") + n("r")));
    case "paraArea": return close(parseLeadingNum(A), n("b") * n("h"));
    case "triArea": return close(parseLeadingNum(A), (n("b") * n("h")) / 2);
    case "areaMissing": {
      const exp = v.isTri ? (2 * n("area")) / n("dim") : n("area") / n("dim");
      return close(parseLeadingNum(A), exp);
    }
    case "coordArea": return close(parseLeadingNum(A), (n("la") * n("lb")) / 2);
    case "trapArea": return close(parseLeadingNum(A), ((n("b1") + n("b2")) / 2) * n("h"));
    case "diagArea": return close(parseLeadingNum(A), (n("d1") * n("d2")) / 2);
    case "regPolyArea": return close(parseLeadingNum(A), Math.round(0.5 * n("a") * n("n") * n("s") * 100) / 100);
    case "compositeAdd": return close(parseLeadingNum(A), n("w") * n("h") + (n("tb") * n("th")) / 2);
    case "compositeSub": return close(parseLeadingNum(A), n("W") * n("H") - n("w") * n("h"));
    case "areaRatioLin": return A === `${n("a") * n("a")}:${n("b") * n("b")}`;
    case "areaFromRatio": return close(parseLeadingNum(A), (n("smallArea") * n("b") * n("b")) / (n("a") * n("a")));
    case "rectPrismSA": return A === String(2 * (n("l") * n("w") + n("l") * n("h") + n("w") * n("h")));
    case "openBox": return A === String(2 * (n("l") + n("w")) * n("h") + n("l") * n("w"));
    case "triPrismSA": return close(parseLeadingNum(A), n("t1") * n("t2") + n("L") * (n("t1") + n("t2") + n("t3")));
    case "cylLateral": return close(parseLeadingNum(A), Math.round(2 * Math.PI * n("r") * n("h") * 100) / 100);
    case "cylSA": return close(parseLeadingNum(A), Math.round((2 * Math.PI * n("r") * n("h") + 2 * Math.PI * n("r") ** 2) * 100) / 100);
    case "pyramidSA": return close(parseLeadingNum(A), n("s") * n("s") + 0.5 * 4 * n("s") * n("slant"));
    case "coneSA": return close(parseLeadingNum(A), Math.round((Math.PI * n("r") ** 2 + Math.PI * n("r") * n("slant")) * 100) / 100);
    case "sphereSA": return close(parseLeadingNum(A), Math.round(4 * Math.PI * n("r") ** 2 * 100) / 100);
    case "volRectPrism": return A === String(n("l") * n("w") * n("h"));
    case "volCylinder": return close(parseLeadingNum(A), Math.round(Math.PI * n("r") ** 2 * n("h") * 100) / 100);
    case "volPyramid": return close(parseLeadingNum(A), Math.round(((n("s") * n("s") * n("h")) / 3) * 100) / 100);
    case "volCone": return close(parseLeadingNum(A), Math.round((Math.PI * n("r") ** 2 * n("h")) / 3 * 100) / 100);
    case "volSphere": return close(parseLeadingNum(A), Math.round(((4 / 3) * Math.PI * n("r") ** 3) * 100) / 100);
    case "theoretical": return A === fracStr(n("fav"), n("total"));
    case "theoreticalPct": return A === `${fmtNum((n("fav") / n("total")) * 100)}%`;
    case "experimental": return A === fracStr(n("hits"), n("trials"));
    case "predict": {
      const num2 = n("hits") * n("future");
      return num2 % n("trials") === 0 && A === String(num2 / n("trials"));
    }
    default: return false;
  }
}

// ── Matrix run ────────────────────────────────────────────────────────────────

function main() {
  section("structure + independent answer verification");
  const seeds = [1, 7, 42, 1234, 9999];
  let totalProblems = 0;
  const subtypeSeen = new Map<string, Set<string>>();
  for (const entry of WIRED_GEOMETRY) {
    const seen = new Set<string>();
    subtypeSeen.set(entry.id, seen);
    for (const difficulty of [1, 2, 3] as const) {
      for (const seed of seeds) {
        let problems: GeometryProblem[] = [];
        try {
          problems = entry.generate("Review", seed, { count: 12, difficulty });
        } catch (e) {
          check(false, `${entry.id} d${difficulty} seed ${seed}: threw ${(e as Error).message}`);
          continue;
        }
        check(problems.length === 12, `${entry.id} d${difficulty} seed ${seed}: expected 12 problems, got ${problems.length}`);
        for (const p of problems) {
          totalProblems++;
          seen.add(p.subtype);
          check(typeof p.prompt === "string" && p.prompt.length > 10, `${entry.id}/${p.subtype}: prompt present`);
          check(typeof p.answer === "string" && p.answer.length > 0, `${entry.id}/${p.subtype}: answer present`);
          check(Array.isArray(p.steps) && p.steps.length >= 2, `${entry.id}/${p.subtype}: ≥2 steps`);
          check(p.steps.every((s) => typeof s.reason === "string" && s.reason.length > 0), `${entry.id}/${p.subtype}: every step has a reason`);
          check(p.steps.some((s) => (s.blanks ?? []).length > 0), `${entry.id}/${p.subtype}: has a guided-notes blank`);
          check(entry.subtypes.includes(p.subtype), `${entry.id}/${p.subtype}: subtype declared for entry`);
          let ok = false;
          try { ok = verifyAnswer(p); } catch { ok = false; }
          check(ok, `${entry.id}/${p.subtype} (${(p.verify as V)?.kind}): answer verifies independently — got "${p.answer}" verify=${JSON.stringify(p.verify)}`);
        }
        // determinism
        const again = entry.generate("Review", seed, { count: 12, difficulty });
        check(JSON.stringify(again) === JSON.stringify(problems), `${entry.id} d${difficulty} seed ${seed}: deterministic`);
      }
    }
  }
  console.log(`checked ${totalProblems} problems across ${WIRED_GEOMETRY.length} entries`);

  section("default counts by mode");
  for (const entry of WIRED_GEOMETRY) {
    const isTest = entry.id.endsWith("-test");
    const g = entry.generate("GuidedNote", 5);
    const t = entry.generate("Test", 5);
    const r = entry.generate("Review", 5);
    if (isTest) {
      check(t.length === 10, `${entry.id}: Test default = 10 (got ${t.length})`);
      check(r.length === 15, `${entry.id}: Review default = 15 (got ${r.length})`);
    } else {
      check(g.length === 3, `${entry.id}: GuidedNote default = 3 (got ${g.length})`);
      check(r.length === 9, `${entry.id}: Review default = 9 (got ${r.length})`);
    }
  }

  section("subtype coverage at difficulty 3");
  for (const entry of WIRED_GEOMETRY) {
    const seen = subtypeSeen.get(entry.id)!;
    for (const st of entry.subtypes) {
      check(seen.has(st), `${entry.id}: subtype ${st} generated at least once across the matrix`);
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.log("FAILURES:");
    for (const f of failures) console.log("  -", f);
  }
  process.exit(failed > 0 ? 1 : 0);
}

main();
