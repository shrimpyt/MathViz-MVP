// checkers-special-quads.ts
// Strict fact-tracking checker for the rectangle / rhombus / square proofs.
// Every step's reason must be one this checker knows, and every step may use
// only facts established by EARLIER steps (or the givens). The diagram marks
// are recomputed from the givens alone.

import type { ProofProblem } from "@/lib/proofDiagrams";
import type { Ctx } from "./checkers";
import { check, norm } from "./checkers";

const QUAD = ["A", "B", "C", "D"];
const canonSeg = (s: string) => s.split("").sort().join("");

/** ∠ABC (an interior angle of ABCD) → "B"; ∠A → "A"; others → sorted outer letters. */
function canonAng(a: string): string {
  if (a.length === 1) return a;
  if (a.length !== 3) return a;
  const v = a[1];
  const i = QUAD.indexOf(v);
  if (i >= 0) {
    const nb = [QUAD[(i + 3) % 4], QUAD[(i + 1) % 4]].sort().join("");
    if ([a[0], a[2]].sort().join("") === nb) return v;
  }
  const o = [a[0], a[2]].sort();
  return o[0] + v + o[1];
}

class UF {
  private p = new Map<string, string>();
  find(x: string): string {
    if (!this.p.has(x)) this.p.set(x, x);
    const r = this.p.get(x)!;
    if (r === x) return x;
    const root = this.find(r);
    this.p.set(x, root);
    return root;
  }
  union(a: string, b: string) { this.p.set(this.find(a), this.find(b)); }
  same(a: string, b: string) { return this.find(a) === this.find(b); }
}

export type SpecialParallelogramFamilyName =
  | "RhombusFromConsecutiveSides"
  | "RectangleFromRightAngle"
  | "SquareFromRectangle"
  | "RectangleFromDiagonals"
  | "RhombusFromPerpDiagonals";

export function checkSpecialParallelogramProof(
  ctx: Ctx,
  p: ProofProblem,
  family: SpecialParallelogramFamilyName,
  tag: string
): void {
  check(ctx, p.family === `SpecialParallelogram:${family}`, `${tag}: family ${p.family}`);
  check(ctx, p.teks === "G.6(E)", `${tag}: teks ${p.teks}`);
  const expectProve = family.startsWith("Rhombus") ? "ABCD is a rhombus"
    : family.startsWith("Rectangle") ? "ABCD is a rectangle" : "ABCD is a square";
  check(ctx, p.prove === expectProve, `${tag}: prove "${p.prove}"`);

  const givenSet = new Set(p.given.map(norm));
  const seg = new UF();
  const angCong = new UF();
  const measure = new Map<string, number>();
  const eqMeasures = new UF();
  const sums: [string, string][] = [];
  const subEq: { known: number; ang: string }[] = [];
  const doubled = new Set<string>();
  const rightNamed = new Set<string>();
  const triPairs: [string, string][] = [];
  let para = false, rect = false, rhom = false, perp = false, atM = false;

  const segCong = (a: string, b: string) => seg.same(canonSeg(a), canonSeg(b));
  const isRight = (a: string) => measure.get(canonAng(a)) === 90 || rightNamed.has(canonAng(a));
  const consecutive = (x: string, y: string) => {
    const i = QUAD.indexOf(x), j = QUAD.indexOf(y);
    return i >= 0 && j >= 0 && (Math.abs(i - j) === 1 || Math.abs(i - j) === 3);
  };
  const opposite = (x: string, y: string) => {
    const i = QUAD.indexOf(x), j = QUAD.indexOf(y);
    return i >= 0 && j >= 0 && Math.abs(i - j) === 2;
  };
  const oppSidePair = (a: string, b: string) => {
    const k = [canonSeg(a), canonSeg(b)].sort().join("|");
    return k === "AB|CD" || k === "AD|BC";
  };
  const allFourSides = () => ["AB", "BC", "CD", "AD"].every((s) => segCong("AB", s));
  const triSides = (t: string) => [t[0] + t[1], t[1] + t[2], t[2] + t[0]];
  const triAng = (t: string, i: number) => t[(i + 2) % 3] + t[i] + t[(i + 1) % 3];

  const recordGiven = (s: string) => {
    if (s === "ABCD is a parallelogram") para = true;
    else if (s === "ABCD is a rectangle") { rect = true; }
    else if (s === "AC ⊥ BD") perp = true;
    else if (s === "AC and BD intersect at M") atM = true;
    else {
      const sc = s.match(/^([A-Z]{2}) ≅ ([A-Z]{2})$/);
      if (sc) seg.union(canonSeg(sc[1]), canonSeg(sc[2]));
      const ra = s.match(/^∠([A-Z]) is a right angle$/);
      if (ra) rightNamed.add(ra[1]);
    }
  };
  p.given.forEach((g) => recordGiven(norm(g)));

  p.steps.forEach((st, i) => {
    const s = norm(st.statement);
    const where = `${tag} step ${i + 1} "${s}"`;
    switch (st.reason) {
      case "Given":
        check(ctx, givenSet.has(s), `${where}: Given but not in given[]`);
        break;
      case "Opposite sides of a parallelogram are congruent": {
        const m = s.match(/^([A-Z]{2}) ≅ ([A-Z]{2})$/);
        check(ctx, para, `${where}: parallelogram not established`);
        check(ctx, !!m && oppSidePair(m[1], m[2]), `${where}: not a pair of opposite sides`);
        if (m) seg.union(canonSeg(m[1]), canonSeg(m[2]));
        break;
      }
      case "Opposite angles of a parallelogram are congruent": {
        check(ctx, para, `${where}: parallelogram not established`);
        const pairs = [...s.matchAll(/∠([A-Z]+) ≅ ∠([A-Z]+)/g)];
        check(ctx, pairs.length > 0, `${where}: no angle pair`);
        for (const m of pairs) {
          const a = canonAng(m[1]), b = canonAng(m[2]);
          check(ctx, opposite(a, b), `${where}: ∠${a}, ∠${b} not opposite`);
          angCong.union(a, b);
        }
        break;
      }
      case "Consecutive angles of a parallelogram are supplementary": {
        check(ctx, para, `${where}: parallelogram not established`);
        const m = s.match(/^m∠([A-Z]+) \+ m∠([A-Z]+) = 180°$/);
        check(ctx, !!m && consecutive(canonAng(m[1]), canonAng(m[2])), `${where}: not consecutive angles`);
        if (m) sums.push([canonAng(m[1]), canonAng(m[2])]);
        break;
      }
      case "Diagonals of a parallelogram bisect each other": {
        check(ctx, para && atM, `${where}: needs parallelogram and diagonals meeting at M`);
        const m = s.match(/^([A-Z]{2}) ≅ ([A-Z]{2})$/);
        const k = m ? [canonSeg(m[1]), canonSeg(m[2])].sort().join("|") : "";
        check(ctx, k === "AM|CM" || k === "BM|DM", `${where}: not the two halves of one diagonal`);
        if (m) seg.union(canonSeg(m[1]), canonSeg(m[2]));
        break;
      }
      case "Reflexive Property": {
        const m = s.match(/^([A-Z]{2}) ≅ ([A-Z]{2})$/);
        check(ctx, !!m && canonSeg(m[1]) === canonSeg(m[2]), `${where}: not a self-congruence`);
        break;
      }
      case "Transitive Property of Congruence": {
        const parts = s.split(" ≅ ");
        check(ctx, parts.length >= 3, `${where}: not a chain`);
        check(ctx, parts.every((x) => segCong(parts[0], x)), `${where}: chain not supported by earlier steps`);
        check(ctx, ["AB", "BC", "CD", "AD"].every((x) => parts.some((q) => canonSeg(q) === x)), `${where}: chain must name all four sides`);
        break;
      }
      case "Definition of rhombus":
        check(ctx, s === "ABCD is a rhombus", `${where}: must conclude a rhombus`);
        check(ctx, para && allFourSides(), `${where}: needs a parallelogram with four congruent sides`);
        rhom = true;
        break;
      case "Definition of rectangle":
        if (s === "ABCD is a parallelogram") {
          check(ctx, rect, `${where}: rectangle not established`);
          para = true;
        } else {
          check(ctx, s === "ABCD is a rectangle", `${where}: unexpected statement`);
          check(ctx, para && QUAD.every((v) => isRight(v)), `${where}: needs a parallelogram with four right angles`);
          rect = true;
        }
        break;
      case "Definition of square":
        check(ctx, s === "ABCD is a square", `${where}: must conclude a square`);
        check(ctx, rect && rhom, `${where}: needs both rectangle and rhombus`);
        break;
      case "A parallelogram with one right angle is a rectangle":
        check(ctx, s === "ABCD is a rectangle", `${where}: must conclude a rectangle`);
        check(ctx, para && QUAD.some((v) => isRight(v)), `${where}: needs a parallelogram with a right angle`);
        rect = true;
        break;
      case "Definition of right angle": {
        let m = s.match(/^m∠([A-Z]+) = 90°$/);
        if (m) {
          check(ctx, rightNamed.has(canonAng(m[1])), `${where}: ∠${m[1]} not known right`);
          measure.set(canonAng(m[1]), 90);
          break;
        }
        m = s.match(/^∠([A-Z]+) is a right angle$/);
        if (m) {
          check(ctx, measure.get(canonAng(m[1])) === 90, `${where}: m∠${m[1]} = 90° not established`);
          rightNamed.add(canonAng(m[1]));
          break;
        }
        const list = [...s.matchAll(/∠([A-Z]+)/g)].map((x) => canonAng(x[1]));
        check(ctx, /are right angles$/.test(s) && list.length >= 2, `${where}: unrecognized`);
        for (const a of list) {
          check(ctx, measure.get(a) === 90, `${where}: m∠${a} = 90° not established`);
          rightNamed.add(a);
        }
        break;
      }
      case "Substitution": {
        let m = s.match(/^(\d+)° \+ m∠([A-Z]+) = 180°$/);
        if (m) {
          const n = Number(m[1]);
          const b = canonAng(m[2]);
          const ok = sums.some(([x, y]) => (y === b && measure.get(x) === n) || (x === b && measure.get(y) === n));
          check(ctx, ok, `${where}: no known sum with a known measure ${n}°`);
          subEq.push({ known: n, ang: b });
          break;
        }
        m = s.match(/^2 · m∠([A-Z]+) = 180°$/);
        if (m) {
          const a = canonAng(m[1]);
          const ok = sums.some(([x, y]) => (x === a || y === a) && eqMeasures.same(x, y));
          check(ctx, ok, `${where}: needs a known sum of two equal measures`);
          doubled.add(a);
          break;
        }
        check(ctx, false, `${where}: substitution form unrecognized`);
        break;
      }
      case "Subtraction Property of Equality": {
        const m = s.match(/^m∠([A-Z]+) = (\d+)°$/);
        const e = m ? subEq.find((x) => x.ang === canonAng(m[1])) : undefined;
        check(ctx, !!e && 180 - e.known === Number(m![2]), `${where}: does not follow`);
        if (m) measure.set(canonAng(m[1]), Number(m[2]));
        break;
      }
      case "Division Property of Equality": {
        const m = s.match(/^m∠([A-Z]+) = 90°$/);
        check(ctx, !!m && doubled.has(canonAng(m[1])), `${where}: no 2 · m∠ = 180° step for this angle`);
        if (m) measure.set(canonAng(m[1]), 90);
        break;
      }
      case "Definition of congruent angles": {
        const m = s.match(/^m∠([A-Z]+) = m∠([A-Z]+)$/);
        if (m) {
          const a = canonAng(m[1]), b = canonAng(m[2]);
          check(ctx, angCong.same(a, b), `${where}: ∠${a} ≅ ∠${b} not established`);
          eqMeasures.union(a, b);
          break;
        }
        const parts = [...s.matchAll(/m∠([A-Z]+) = (\d+)°/g)];
        check(ctx, parts.length > 0, `${where}: unrecognized`);
        for (const x of parts) {
          const a = canonAng(x[1]);
          const v = Number(x[2]);
          const ok = QUAD.some((o) => o !== a && angCong.same(a, o) && measure.get(o) === v);
          check(ctx, ok, `${where}: no congruent angle with measure ${v}°`);
          measure.set(a, v);
        }
        break;
      }
      case "Definition of perpendicular lines": {
        check(ctx, perp && atM, `${where}: needs AC ⊥ BD meeting at M`);
        const names = [...s.matchAll(/∠([A-Z]{3})/g)].map((x) => x[1]);
        check(ctx, names.length > 0 && names.every((n) => n[1] === "M" && "AC".includes(n[0]) !== "AC".includes(n[2])), `${where}: not angles between the diagonals at M`);
        names.forEach((n) => rightNamed.add(canonAng(n)));
        break;
      }
      case "Right Angles Congruence Theorem": {
        const m = s.match(/^∠([A-Z]{3}) ≅ ∠([A-Z]{3})$/);
        check(ctx, !!m && isRight(m[1]) && isRight(m[2]), `${where}: both angles must be known right`);
        if (m) angCong.union(canonAng(m[1]), canonAng(m[2]));
        break;
      }
      case "SSS": case "SAS": {
        const m = s.match(/^△([A-Z]{3}) ≅ △([A-Z]{3})$/);
        check(ctx, !!m, `${where}: not a triangle congruence`);
        if (!m) break;
        const [t1, t2] = [m[1], m[2]];
        const s1 = triSides(t1), s2 = triSides(t2);
        if (st.reason === "SSS") {
          check(ctx, s1.every((x, k) => segCong(x, s2[k])), `${where}: SSS sides not all established`);
        } else {
          let ok = false;
          for (let v = 0; v < 3 && !ok; v++) {
            const a = segCong(t1[v] + t1[(v + 1) % 3], t2[v] + t2[(v + 1) % 3]);
            const b = segCong(t1[(v + 2) % 3] + t1[v], t2[(v + 2) % 3] + t2[v]);
            const ang = angCong.same(canonAng(triAng(t1, v)), canonAng(triAng(t2, v)));
            ok = a && b && ang;
          }
          check(ctx, ok, `${where}: SAS data not established`);
        }
        triPairs.push([t1, t2]);
        break;
      }
      case "CPCTC": {
        const sc = s.match(/^([A-Z]{2}) ≅ ([A-Z]{2})$/);
        const ac = s.match(/^∠([A-Z]{3}) ≅ ∠([A-Z]{3})$/);
        if (sc) {
          const ok = triPairs.some(([a, b]) => triSides(a).some((x, k) =>
            [canonSeg(x), canonSeg(triSides(b)[k])].sort().join("|") === [canonSeg(sc[1]), canonSeg(sc[2])].sort().join("|")));
          check(ctx, ok, `${where}: not corresponding sides`);
          seg.union(canonSeg(sc[1]), canonSeg(sc[2]));
        } else if (ac) {
          const ok = triPairs.some(([a, b]) => [0, 1, 2].some((k) =>
            [canonAng(triAng(a, k)), canonAng(triAng(b, k))].sort().join("|") === [canonAng(ac[1]), canonAng(ac[2])].sort().join("|")));
          check(ctx, ok, `${where}: not corresponding angles`);
          angCong.union(canonAng(ac[1]), canonAng(ac[2]));
        } else {
          check(ctx, false, `${where}: CPCTC form unrecognized`);
        }
        break;
      }
      default:
        check(ctx, false, `${where}: unknown reason "${st.reason}"`);
    }
  });

  const last = p.steps[p.steps.length - 1];
  check(ctx, norm(last.statement) === norm(p.prove), `${tag}: final ≠ prove`);

  // Diagram, recomputed from the givens only.
  const d = p.svgParams;
  check(ctx, d.kind === "ProofQuadrilateral", `${tag}: wrong diagram kind`);
  if (d.kind !== "ProofQuadrilateral") return;
  const shape = p.prove.replace("ABCD is a ", "");
  check(ctx, (d.shape ?? "parallelogram") === shape, `${tag}: drawn as ${d.shape}, proof concludes ${shape}`);
  const gSet = new Set(p.given.map(norm));
  const sideMarks = [0, 0, 0, 0];
  if (gSet.has("AB ≅ BC")) { sideMarks[0] = 1; sideMarks[1] = 1; }
  check(ctx, JSON.stringify(d.sideMarks) === JSON.stringify(sideMarks), `${tag}: side marks ${JSON.stringify(d.sideMarks)}`);
  const wantArrows = gSet.has("ABCD is a parallelogram");
  check(ctx, (d.parallelMarks.length > 0) === wantArrows && ((d.parallelMarks2 ?? []).length > 0) === wantArrows, `${tag}: parallel arrows must match the parallelogram given`);
  const wantRight = gSet.has("ABCD is a rectangle") ? ["A", "B", "C", "D"]
    : gSet.has("∠A is a right angle") ? ["A"] : gSet.has("AC ⊥ BD") ? ["M"] : [];
  check(ctx, JSON.stringify([...(d.rightAngles ?? [])].sort()) === JSON.stringify(wantRight), `${tag}: right-angle marks ${JSON.stringify(d.rightAngles)}`);
  const wantDiag = gSet.has("AC ≅ BD") || gSet.has("AC ⊥ BD") ? "both" : "none";
  check(ctx, d.diagonal === wantDiag, `${tag}: diagonal ${d.diagonal}`);
  check(ctx, d.diagMarks[0] === 0 && d.diagMarks[1] === 0, `${tag}: diagonal halves are not given congruent`);
}
