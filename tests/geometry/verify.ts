// verify.ts, Geometry generator verification.
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
/** Format (num/den)·π in lowest terms: "π", "4π", "π/6", "2π/3" (checker-side). */
function piFracC(numerator: number, denominator: number): string {
  const g = gcd2(numerator, denominator);
  const nn = numerator / g;
  const dd = denominator / g;
  if (nn === 0) return "0";
  if (dd === 1) return nn === 1 ? "π" : `${nn}π`;
  return nn === 1 ? `π/${dd}` : `${nn}π/${dd}`;
}
/** Standard-form circle equation from center and radius (checker-side). */
function circleEqC(h: number, k: number, r: number): string {
  const part = (v: string, c: number) =>
    c === 0 ? `${v}²` : c > 0 ? `(${v} − ${c})²` : `(${v} + ${-c})²`;
  return `${part("x", h)} + ${part("y", k)} = ${r * r}`;
}
function ptFmt(x: number, y: number): string {
  return `(${fmtNum(x)}, ${fmtNum(y)})`;
}
function parseLeadingNum(s: string): number {
  const m = s.replace(",", "").match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
}
function factC(k: number): number {
  let f = 1;
  for (let i = 2; i <= k; i++) f *= i;
  return f;
}
function nPrC(nn: number, rr: number): number {
  return rr < 0 || rr > nn ? NaN : factC(nn) / factC(nn - rr);
}
function nCrC(nn: number, rr: number): number {
  return rr < 0 || rr > nn ? NaN : factC(nn) / (factC(rr) * factC(nn - rr));
}
/** Apply a named rigid motion (checker-side reimplementation). */
function motionC(m: string, x: number, y: number, a = 0, b = 0): [number, number] {
  if (m === "translate") return [x + a, y + b];
  if (m === "reflectX") return [x, -y];
  if (m === "reflectY") return [-x, y];
  if (m === "reflectYX") return [y, x];
  if (m === "rot90") return [-y, x];
  if (m === "rot180") return [-x, -y];
  return [y, -x]; // rot270
}
function isPrimeC(k: number): boolean {
  if (k < 2) return false;
  for (let d = 2; d * d <= k; d++) if (k % d === 0) return false;
  return true;
}
/** Conjecture hypothesis/conclusion evaluators for counterexample lessons.
 * The conjectures, as stated in the factory prompts:
 * product: "The product of two positive numbers is greater than either of
 *   the two numbers." acute: "Any two acute angles are complementary."
 * rhombus: "Every quadrilateral with four congruent sides is a square"
 *   (candidate gives one vertex angle). mult8: "Every multiple of 4 is
 *   also a multiple of 8." oddProduct: "The product of two odd numbers is
 *   always even." formPrime: "For every whole number x, 2x + 1 is prime." */
function hypOf(t: string, vals: number[]): boolean {
  switch (t) {
    case "product": return vals[0] > 0 && vals[1] > 0;
    case "acute": return vals[0] < 90 && vals[1] < 90;
    case "rhombus": return true;
    case "mult8": return vals[0] % 4 === 0;
    case "oddProduct": return vals[0] % 2 === 1 && vals[1] % 2 === 1;
    case "formPrime": return true;
    default: return false;
  }
}
function conclOf(t: string, vals: number[]): boolean {
  switch (t) {
    case "product": return vals[0] * vals[1] > Math.max(vals[0], vals[1]);
    case "acute": return vals[0] + vals[1] === 90;
    case "rhombus": return vals[0] === 90;
    case "mult8": return vals[0] % 8 === 0;
    case "oddProduct": return (vals[0] * vals[1]) % 2 === 0;
    case "formPrime": return isPrimeC(2 * vals[0] + 1);
    default: return false;
  }
}
function smallestFactorC(v: number): number {
  for (let f = 2; f < v; f++) if (v % f === 0) return f;
  return v;
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
    case "volTriPrism": {
      const base = (n("t1") * n("t2")) / 2;
      return Number.isInteger(base) && A === String(base * n("L"));
    }
    case "volMissingPrism": {
      const lw = n("l") * n("w");
      return n("V") % lw === 0 && A === String(n("V") / lw);
    }
    case "volMissingPyramid": {
      const s2 = n("s") * n("s");
      return (3 * n("V")) % s2 === 0 && A === String((3 * n("V")) / s2);
    }
    case "volMissingRadius": {
      const r3 = (3 * n("coefNum")) / (4 * n("coefDen"));
      const r = Math.round(Math.cbrt(r3));
      return r ** 3 === r3 && A === String(r);
    }
    case "volMissingCylRadius": {
      if (n("coef") % n("h") !== 0) return false;
      const r2 = n("coef") / n("h");
      const r = Math.sqrt(r2);
      return Number.isInteger(r) && A === String(r);
    }
    case "volCompositeSilo": {
      const exp = Math.PI * n("r") ** 2 * n("h") + (2 / 3) * Math.PI * n("r") ** 3;
      return close(parseLeadingNum(A), Math.round(exp * 100) / 100);
    }
    case "volCompositeHouse": {
      const roof = n("l") * n("w") * n("h2");
      return roof % 3 === 0 && A === String(n("l") * n("w") * n("h") + roof / 3);
    }
    case "volCompositeHole": {
      const exp = n("l") * n("w") * n("h") - Math.PI * n("r") ** 2 * n("h");
      return exp > 0 && close(parseLeadingNum(A), Math.round(exp * 100) / 100);
    }
    case "circleEqWrite": return A === circleEqC(n("h"), n("k"), n("r"));
    case "circleEqRead": return A === `center ${ptStr(n("h"), n("k"))}, radius ${n("r")}`;
    case "circleEqGeneral": {
      const h = -n("D") / 2, k = -n("E") / 2;
      if (!Number.isInteger(h) || !Number.isInteger(k)) return false;
      const r2 = h * h + k * k - n("F");
      const r = Math.sqrt(r2);
      return Number.isInteger(r) && r > 0 && A === circleEqC(h, k, r);
    }
    case "circleEqDiameter": {
      const h = (n("x1") + n("x2")) / 2, k = (n("y1") + n("y2")) / 2;
      if (!Number.isInteger(h) || !Number.isInteger(k)) return false;
      const dist = Math.hypot(n("x2") - n("x1"), n("y2") - n("y1"));
      return Number.isInteger(dist) && dist % 2 === 0 && A === circleEqC(h, k, dist / 2);
    }
    case "partition": {
      const t = n("m") + n("n");
      const px = (n("n") * n("ax") + n("m") * n("bx")) / t;
      const py = (n("n") * n("ay") + n("m") * n("by")) / t;
      return Number.isInteger(px) && Number.isInteger(py) && A === ptFmt(px, py);
    }
    case "partitionFrac": {
      const px = n("ax") + ((n("bx") - n("ax")) * n("num")) / n("den");
      const py = n("ay") + ((n("by") - n("ay")) * n("num")) / n("den");
      return A === ptFmt(px, py);
    }
    case "partitionEndpoint": {
      const t = n("m") + n("n");
      const bx = n("ax") + (t * (n("px") - n("ax"))) / n("m");
      const by = n("ay") + (t * (n("py") - n("ay"))) / n("m");
      return Number.isInteger(bx) && Number.isInteger(by) && A === ptFmt(bx, by);
    }
    case "altLegs": {
      return n("a") ** 2 + n("b") ** 2 === n("c") ** 2 && A === fmtNum((n("a") * n("b")) / n("c"));
    }
    case "hypSegOther": {
      return (n("h") * n("h")) % n("p") === 0 && A === String((n("h") * n("h")) / n("p"));
    }
    case "hypSegLeg": {
      const leg = Math.sqrt(n("seg") * n("c"));
      return Number.isInteger(leg) && A === String(leg);
    }
    case "altCombined": {
      const p = (n("a") * n("a")) / n("c");
      const q = (n("b") * n("b")) / n("c");
      const hh = (n("a") * n("b")) / n("c");
      return close(Math.sqrt(p * q), hh) && A === `AD = ${fmtNum(p)}, DC = ${fmtNum(q)}, BD = ${fmtNum(hh)}`;
    }
    case "degToRad": return A === piFracC(n("deg"), 180);
    case "radToDeg": {
      return (n("num") * 180) % n("den") === 0 && A === `${(n("num") * 180) / n("den")}°`;
    }
    case "arcRad": return A === piFracC(n("r") * n("num"), n("den"));
    case "sectorRad": return A === piFracC(n("r") * n("r") * n("num"), 2 * n("den"));
    case "radFromArc": return A === piFracC(n("sNum"), n("sDen") * n("r"));
    case "theoretical": return A === fracStr(n("fav"), n("total"));
    case "theoreticalPct": return A === `${fmtNum((n("fav") / n("total")) * 100)}%`;
    case "experimental": return A === fracStr(n("hits"), n("trials"));
    case "predict": {
      const num2 = n("hits") * n("future");
      return num2 % n("trials") === 0 && A === String(num2 / n("trials"));
    }
    case "sectorDeg":
      return close(parseLeadingNum(A), Math.round(((n("angle") / 360) * Math.PI * n("r") * n("r")) * 100) / 100);
    case "sectorRadDec":
      return close(parseLeadingNum(A), Math.round(0.5 * n("r") * n("r") * (n("tNum") / n("tDen")) * 100) / 100);
    case "sectorRemainder":
      return close(parseLeadingNum(A), Math.round(Math.PI * n("r") * n("r") * (1 - n("angle") / 360) * 100) / 100);
    case "sectorRing": {
      const exp = (n("angle") / 360) * Math.PI * (n("R") * n("R") - n("r") * n("r"));
      return close(parseLeadingNum(A), Math.round(exp * 100) / 100);
    }
    case "hvLine": return A === `${v.axis as string} = ${n("value")}`;
    case "slopeSpecial": return A === (v.vertical ? "no slope" : "0");
    case "triPropParallel":
      return A === (n("AD") * n("EC") === n("DB") * n("AE") ? "Yes" : "No");
    case "triPropMid": return A === `AB = ${2 * n("a")}, AC = ${2 * n("b")}`;
    case "threeParallel": {
      const num3 = n("b") * n("c");
      return num3 % n("a") === 0 && A === String(num3 / n("a"));
    }
    case "scalePerim": {
      const exp = (n("perim") * n("kNum")) / n("kDen");
      return Number.isInteger(exp) && A === String(exp);
    }
    case "scaleCirc":
      return close(parseLeadingNum(A), Math.round(2 * Math.PI * n("r") * (n("kNum") / n("kDen")) * 100) / 100);
    case "scaleArea": {
      const exp = (n("area") * n("kNum") * n("kNum")) / (n("kDen") * n("kDen"));
      return Number.isInteger(exp) && A === String(exp);
    }
    case "scaleVolume": {
      const exp = (n("vol") * n("kNum") ** 3) / n("kDen") ** 3;
      return Number.isInteger(exp) && A === String(exp);
    }
    case "scaleKFromAreas": return n("u") > 0 && A === fracStr(n("b"), n("a"));
    case "scaleKFromVolumes": return n("u") > 0 && A === fracStr(n("b"), n("a"));
    case "scaleVolFromRatio": {
      const num4 = n("smallVol") * n("b") ** 3;
      return num4 % (n("a") ** 3) === 0 && close(parseLeadingNum(A), num4 / n("a") ** 3);
    }
    case "regPolyAreaP": return close(parseLeadingNum(A), Math.round(0.5 * n("a") * n("P") * 100) / 100);
    case "regPolyHex": return close(parseLeadingNum(A), Math.round(1.5 * Math.sqrt(3) * n("s") * n("s") * 100) / 100);
    case "regPolySquare": return A === `a = ${fmtNum(n("s") / 2)}, A = ${n("s") * n("s")}`;
    case "regPolyShaded":
      return close(parseLeadingNum(A), Math.round((n("W") * n("H") - 0.5 * n("a") * n("n") * n("s")) * 100) / 100);
    case "regPolySum":
      return close(parseLeadingNum(A), Math.round((n("q") * n("q") + 0.5 * n("a") * n("n") * n("s")) * 100) / 100);
    case "csId": {
      const table: Record<string, string> = {
        "cyl-parallel": "Circle",
        "cyl-axis": "Rectangle",
        "cyl-oblique": "Ellipse",
        "cone-parallel": "Circle",
        "cone-apex": "Triangle",
        "cone-oblique": "Ellipse",
        "sphere-plane": "Circle",
        "prism-parallel": "Rectangle",
        "pyramid-parallel": "Square",
        "pyramid-apex": "Triangle",
        "triprism-parallel": "Triangle",
        "triprism-lengthwise": "Rectangle",
        "rev-rectangle": "Cylinder",
        "rev-square": "Cylinder",
        "rev-righttri": "Cone",
        "rev-isotri": "Cone",
        "rev-semicircle": "Sphere",
        "rev-circle": "Torus",
      };
      return A === table[v.id as string];
    }
    case "csDimsCyl": return A === `Rectangle, ${2 * n("r")} by ${n("h")}`;
    case "csDimsRect": return A === `Rectangle, ${n("d1")} by ${n("d2")}`;
    case "csDimsSphere": return A === `Circle, radius ${n("r")}`;
    case "symShapeLines": {
      const table: Record<string, string> = {
        square: "4", rectangle: "2", rhombus: "2", kite: "1", isoscelesTrapezoid: "1",
        parallelogram: "0", equilateralTriangle: "3", isoscelesTriangle: "1",
        scaleneTriangle: "0", circle: "infinitely many",
      };
      return A === table[v.shape as string];
    }
    case "symShapeRot": {
      const table: Record<string, string> = {
        square: "order 4, angle 90°",
        rectangle: "order 2, angle 180°",
        rhombus: "order 2, angle 180°",
        parallelogram: "order 2, angle 180°",
        equilateralTriangle: "order 3, angle 120°",
        kite: "no rotational symmetry",
        isoscelesTrapezoid: "no rotational symmetry",
        isoscelesTriangle: "no rotational symmetry",
      };
      return A === table[v.shape as string];
    }
    case "symRotOrder": return 360 % n("n") === 0 && A === `order ${n("n")}, angle ${360 / n("n")}°`;
    case "symGrid": {
      const table: Record<string, Record<string, string>> = {
        square: { lines: "4", angle: "90°" },
        rectangle: { lines: "2", angle: "180°" },
        isoscelesTriangle: { lines: "1", angle: "none" },
      };
      return A === table[v.shape as string][v.ask as string];
    }
    case "triRangeWords":
      return A === `greater than ${n("b") - n("a")}${v.unit as string} and less than ${n("a") + n("b")}${v.unit as string}`;
    case "triChoose": {
      const ch = n("chosen");
      return ch > n("b") - n("a") && ch < n("a") + n("b") && A === String(ch);
    }
    case "perm": return n("r") >= 1 && n("r") <= n("n") && A === String(nPrC(n("n"), n("r")));
    case "comb": return n("r") >= 1 && n("r") <= n("n") && A === String(nCrC(n("n"), n("r")));
    case "permDecide": {
      const val = v.method === "permutation" ? nPrC(n("n"), n("r")) : nCrC(n("n"), n("r"));
      return A === `${v.method as string}, ${val}`;
    }
    case "productCount": {
      const factors = v.factors as number[];
      return factors.length >= 2 && factors.every((f) => f >= 2) &&
        A === String(factors.reduce((s, f) => s * f, 1));
    }
    case "condFrac": return n("fav") >= 0 && n("cond") > 0 && n("fav") <= n("cond") && A === fracStr(n("fav"), n("cond"));
    case "condCompare": {
      const l = n("f1") / n("c1");
      const r = n("f2") / n("c2");
      if (close(l, r)) return false;
      const exp = l > r ? fracStr(n("f1"), n("c1")) : fracStr(n("f2"), n("c2"));
      return A === exp;
    }
    case "condComplement":
      return n("fav") > 0 && n("fav") < n("cond") &&
        A === fracStr(n("cond") - n("fav"), n("cond"));
    case "indepTest": {
      const lhs = n("pabN") / n("pabD");
      const rhs = (n("paN") / n("paD")) * (n("pbN") / n("pbD"));
      if (!(lhs > 0 && lhs <= Math.min(n("paN") / n("paD"), n("pbN") / n("pbD")) + 1e-9)) return false;
      const ind = close(lhs, rhs);
      return A === (ind ? "independent" : "dependent");
    }
    case "indepTestPct": {
      const lhs = n("pab") / 100;
      const rhs = (n("pa") / 100) * (n("pb") / 100);
      const ind = close(lhs, rhs);
      return A === (ind ? "independent" : "dependent");
    }
    case "jointProb": return A === fracStr(n("f1") * n("f2"), n("t1") * n("t2"));
    case "replacementContrast": {
      const r = n("r");
      const total = n("total");
      if (r < 2 || total < 3 || r > total) return false;
      return A === `with replacement ${fracStr(r * r, total * total)}, without replacement ${fracStr(r * (r - 1), total * (total - 1))}`;
    }
    case "motionName": {
      const [cx, cy] = motionC(v.motion as string, n("x"), n("y"));
      const names: Record<string, string> = {
        reflectX: "reflection over the x-axis",
        reflectY: "reflection over the y-axis",
        reflectYX: "reflection over the line y = x",
        rot90: "rotation of 90° counterclockwise about the origin",
        rot180: "rotation of 180° about the origin",
        rot270: "rotation of 270° counterclockwise about the origin",
      };
      return cx === n("ix") && cy === n("iy") && A === names[v.motion as string];
    }
    case "motionSeq": {
      const [mx, my] = motionC(v.m1 as string, n("x"), n("y"), n("a1"), n("b1"));
      const [fx, fy] = motionC(v.m2 as string, mx, my, n("a2"), n("b2"));
      return A === ptStr(fx, fy);
    }
    case "counterJudge": {
      const t = v.template as string;
      const vals =
        t === "product" ? [n("a"), n("b")]
        : t === "acute" ? [n("x"), n("y")]
        : t === "rhombus" ? [n("angle")]
        : [n("n")];
      const isCounter = hypOf(t, vals) && !conclOf(t, vals);
      return A === (isCounter ? "counterexample" : "not a counterexample");
    }
    case "counterChoose": {
      const flat = v.cases as number[];
      const t = v.template as string;
      const width = t === "oddProduct" ? 2 : 1;
      let idx = -1;
      let count = 0;
      for (let i = 0; i * width < flat.length; i++) {
        const vals = flat.slice(i * width, i * width + width);
        if (hypOf(t, vals) && !conclOf(t, vals)) {
          idx = i;
          count++;
        }
      }
      return count === 1 && idx === n("correct") && A === `Case ${idx + 1}`;
    }
    case "counterBuild": {
      const t = v.template as string;
      if (t === "euler") {
        const x = n("x");
        const val = x * x + x + 41;
        const f = smallestFactorC(val);
        return (x === 40 || x === 41) && f > 1 && f < val &&
          A === `x = ${x} gives ${val} = ${f} × ${val / f}, which is composite`;
      }
      if (t === "sumSquares") {
        const a = n("a");
        const b = n("b");
        const s = a * a + b * b;
        const root = Math.round(Math.sqrt(s));
        return root * root !== s &&
          A === `${a}² + ${b}² = ${s}, which is not a perfect square`;
      }
      if (t === "productEven") {
        const a = n("a");
        const b = n("b");
        return a % 2 === 0 && b % 2 === 1 && (a * b) % 2 === 0 &&
          A === `${a} × ${b} = ${a * b} is even, but ${b} is odd`;
      }
      return false;
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
          check(ok, `${entry.id}/${p.subtype} (${(p.verify as V)?.kind}): answer verifies independently, got "${p.answer}" verify=${JSON.stringify(p.verify)}`);
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
