// checkers-families.ts (appended to checkers.ts via run-all import)
// Per-family logical checkers: entailment of the final step, diagram
// recomputation, and family-specific arithmetic.

import type { Ctx } from "./checkers";
import { check, norm, walkCongruenceSteps } from "./checkers";
import type { ProofProblem } from "@/lib/proofDiagrams";

export type CongruenceFamily = "SSS" | "SAS" | "ASA" | "AAS" | "HL";

const SIDE_IDX: Record<string, number> = { AB: 0, BC: 1, CA: 2 };
const ANGLE_IDX: Record<string, number> = { A: 0, B: 1, C: 2 };

function sidesShare(side1: string, side2: string): string | null {
  const common = side1.split("").find((c) => side2.includes(c));
  return common ?? null;
}

// ── Triangle congruence ──────────────────────────────────────────────────────

export function checkCongruenceProof(
  ctx: Ctx,
  p: ProofProblem,
  family: CongruenceFamily,
  tag: string
): void {
  const st = walkCongruenceSteps(ctx, p, tag);
  const last = p.steps[p.steps.length - 1];

  check(ctx, last.statement === "△ABC ≅ △DEF", `${tag}: final statement not the triangle congruence`);
  check(ctx, last.reason === family, `${tag}: final reason "${last.reason}" ≠ family ${family}`);
  check(ctx, p.prove === "△ABC ≅ △DEF", `${tag}: prove mismatch`);

  // Entailment: the established facts must actually imply the postulate.
  const has = (arr: string[], ...xs: string[]) => xs.every((x) => arr.includes(x));
  let entails = false;
  let why = "";
  if (family === "SSS") {
    entails = has(st.segCong, "AB", "BC", "CA");
    why = "three side pairs";
  } else if (family === "SAS") {
    const v = sidesShare("AB", "BC");
    entails = has(st.segCong, "AB", "BC") && v !== null && st.angCong.includes(v);
    why = "two sides + included angle";
  } else if (family === "ASA") {
    // included side: endpoints A,B are exactly the two established angles
    entails = has(st.angCong, "A", "B") && st.segCong.includes("AB");
    why = "two angles + included side";
  } else if (family === "AAS") {
    // non-included side: BC's endpoints are not both in {A,B}
    entails = has(st.angCong, "A", "B") && st.segCong.includes("BC");
    why = "two angles + non-included side";
  } else {
    const hyp = st.segMeas.get("AB");
    const leg = st.segMeas.get("BC");
    entails =
      st.rightTriangles.has("ABC") &&
      st.segCong.includes("AB") &&
      st.segCong.includes("BC") &&
      hyp !== undefined && leg !== undefined && hyp > leg;
    why = "right triangle + hypotenuse + leg";
  }
  check(ctx, entails, `${tag}: established facts do not entail ${family} (${why})`);

  // Diagram recomputed from the established facts.
  const params = p.svgParams;
  check(ctx, params.kind === "ProofCongruence", `${tag}: wrong diagram kind ${params.kind}`);
  if (params.kind === "ProofCongruence") {
    const expMarks: [number, number, number] = [0, 0, 0];
    st.segCong.forEach((s, i) => {
      expMarks[SIDE_IDX[s]] = i + 1;
    });
    check(ctx, JSON.stringify(params.sideMarks) === JSON.stringify(expMarks),
      `${tag}: sideMarks ${JSON.stringify(params.sideMarks)} ≠ recomputed ${JSON.stringify(expMarks)}`);
    const expRight = family === "HL" ? 2 : family === "SAS" && st.rightAngles.has("B") ? 1 : -1;
    // The right-angle vertex is shown with a right-angle mark, not an arc.
    const expAngles: [boolean, boolean, boolean] = [
      st.angCong.includes("A") && expRight !== 0,
      st.angCong.includes("B") && expRight !== 1,
      st.angCong.includes("C") && expRight !== 2,
    ];
    check(ctx, params.rightAngleAt === expRight,
      `${tag}: rightAngleAt ${params.rightAngleAt} ≠ recomputed ${expRight}`);
    check(ctx, params.subtype === family, `${tag}: diagram subtype ${params.subtype} ≠ ${family}`);
  }
}

// ── CPCTC ────────────────────────────────────────────────────────────────────

const SIDE_CORR: Record<string, string> = { AB: "DE", BC: "EF", CA: "FD" };
const ANGLE_CORR: Record<string, string> = { A: "D", B: "E", C: "F" };

export function checkCPCTCProof(ctx: Ctx, p: ProofProblem, tag: string): void {
  const fam = p.family.startsWith("CPCTC:") ? p.family.slice(6) : "";
  check(ctx, ["SSS", "SAS", "ASA", "AAS", "HL"].includes(fam), `${tag}: bad CPCTC family ${p.family}`);
  const st = walkCongruenceSteps(ctx, p, tag, 1); // walk the base proof only
  const baseLast = p.steps[p.steps.length - 2];
  check(ctx, baseLast.statement === "△ABC ≅ △DEF", `${tag}: base proof doesn't end in triangle congruence`);
  check(ctx, baseLast.reason === fam, `${tag}: base reason ${baseLast.reason} ≠ ${fam}`);

  const last = p.steps[p.steps.length - 1];
  check(ctx, last.reason === "CPCTC", `${tag}: final reason not CPCTC`);
  check(ctx, norm(last.statement) === norm(p.prove), `${tag}: final ≠ prove`);
  const m = last.statement.match(/^(∠?[A-Z]+) ≅ (∠?[A-Z]+)$/);
  check(ctx, m !== null, `${tag}: CPCTC target not a congruence`);
  if (m) {
    const tri1 = m[1].startsWith("∠") ? m[1].slice(1) : m[1];
    const tri2 = m[2].startsWith("∠") ? m[2].slice(1) : m[2];
    const isSide = ["AB", "BC", "CA"].includes(tri1);
    const isAngle = ["A", "B", "C"].includes(tri1);
    check(ctx, isSide || isAngle, `${tag}: target ${tri1} not a part of △ABC`);
    if (isSide) {
      check(ctx, !st.segCong.includes(tri1), `${tag}: CPCTC target ${tri1} was already a given pair`);
      check(ctx, SIDE_CORR[tri1] === tri2, `${tag}: ${tri1} does not correspond to ${tri2}`);
    }
    if (isAngle) {
      check(ctx, !st.angCong.includes(tri1), `${tag}: CPCTC target ∠${tri1} was already a given pair`);
      check(ctx, ANGLE_CORR[tri1] === tri2, `${tag}: ∠${tri1} does not correspond to ∠${tri2}`);
    }
  }
  // Diagram shows the base proof's given pairs (the proved part is concluded).
  const params = p.svgParams;
  if (params.kind === "ProofCongruence") {
    const markedSides = params.sideMarks.filter((c) => c > 0).length;
    check(ctx, markedSides === st.segCong.length,
      `${tag}: diagram marks ${markedSides} sides but ${st.segCong.length} established`);
  }
}

// ── Isosceles ────────────────────────────────────────────────────────────────

export function checkIsoscelesProof(ctx: Ctx, p: ProofProblem, tag: string): void {
  const st = walkCongruenceSteps(ctx, p, tag, 1); // all but the CPCTC conclusion
  const last = p.steps[p.steps.length - 1];
  check(ctx, last.reason === "CPCTC", `${tag}: final reason not CPCTC`);
  check(ctx, norm(last.statement) === norm(p.prove), `${tag}: final ≠ prove`);
  check(ctx, ["∠B ≅ ∠C", "AB ≅ AC"].includes(norm(p.prove)), `${tag}: unexpected prove ${p.prove}`);

  // The middle step must be a valid SAS/SSS/AAS on △ABM ≅ △ACM.
  const mid = p.steps.find((s) => s.statement === "△ABM ≅ △ACM");
  check(ctx, mid !== undefined, `${tag}: missing △ABM ≅ △ACM step`);
  if (mid) {
    const needed =
      mid.reason === "SAS"
        ? ["AB≅AC", "∠BAM≅∠CAM", "AM≅AM"]
        : mid.reason === "SSS"
          ? ["AB≅AC", "BM≅CM", "AM≅AM"]
          : mid.reason === "AAS"
            ? ["∠B≅∠C", "∠BAM≅∠CAM", "AM≅AM"]
            : null;
    check(ctx, needed !== null, `${tag}: △ABM ≅ △ACM via unexpected ${mid.reason}`);
    if (needed) {
      const established = new Set<string>();
      for (const s of p.steps) {
        if (s === mid) break;
        const mm = s.statement.match(/^(∠?[A-Z]+) ≅ (∠?[A-Z]+)$/);
        if (mm && ["Definition of congruent segments", "Definition of congruent angles",
          "Definition of angle bisector", "Definition of midpoint", "Reflexive Property"].includes(s.reason)) {
          established.add(`${mm[1]}≅${mm[2]}`);
        }
      }
      needed.forEach((n) =>
        check(ctx, established.has(n), `${tag}: ${mid.reason} cites ${n} which was never established`)
      );
    }
  }
  const params = p.svgParams;
  check(ctx, params.kind === "ProofIsosceles", `${tag}: wrong diagram kind ${params.kind}`);
}

// ── Parallel lines ───────────────────────────────────────────────────────────

const CORR: [number, number][] = [[1, 5], [2, 6], [3, 7], [4, 8]];
const ALTINT: [number, number][] = [[3, 6], [4, 5]];
const ALTEXT: [number, number][] = [[1, 8], [2, 7]];
const SAMESIDE: [number, number][] = [[3, 5], [4, 6]];
const VERT: [number, number][] = [[1, 3], [2, 4], [5, 7], [6, 8]];
const LINEAR: [number, number][] = [[1, 2], [2, 3], [3, 4], [4, 1], [5, 6], [6, 7], [7, 8], [8, 5]];
const CHAIN: [number, number][] = [[2, 7], [4, 7], [1, 7]];

const hasPair = (pairs: [number, number][], i: number, j: number) =>
  pairs.some(([a, b]) => (a === i && b === j) || (a === j && b === i));

function parseAngleNum(tok: string): number | null {
  const m = tok.match(/^∠(\d)$/);
  return m ? parseInt(m[1], 10) : null;
}

export function checkParallelProof(ctx: Ctx, p: ProofProblem, tag: string): void {
  const givenSet = new Set(p.given.map(norm));
  const angMeas = new Map<number, number>();
  const congPairs = new Set<string>();
  const sum180 = new Set<string>();
  let parallelGiven = false;
  const key = (i: number, j: number) => (i < j ? `${i}-${j}` : `${j}-${i}`);

  p.given.forEach((g) => {
    const gg = norm(g);
    if (gg === "l ∥ m") parallelGiven = true;
    const m = gg.match(/^m∠(\d) = (\d+)°$/);
    if (m) angMeas.set(parseInt(m[1], 10), parseInt(m[2], 10));
    const m2 = gg.match(/^m∠(\d) = (\d+)°, m∠(\d) = (\d+)°$/);
    if (m2) {
      angMeas.set(parseInt(m2[1], 10), parseInt(m2[2], 10));
      angMeas.set(parseInt(m2[3], 10), parseInt(m2[4], 10));
    }
  });

  p.steps.forEach((s, i) => {
    const stmt = norm(s.statement);
    const where = `${tag} step ${i + 1} "${stmt}"`;
    switch (s.reason) {
      case "Given":
        check(ctx, givenSet.has(stmt), `${where}: reason Given but not in given[]`);
        break;
      case "Corresponding Angles Theorem":
      case "Alternate Interior Angles Theorem":
      case "Alternate Exterior Angles Theorem": {
        const m = stmt.match(/^(∠\d) ≅ (∠\d)$/);
        check(ctx, m !== null, `${where}: not an angle congruence`);
        if (m) {
          const a = parseAngleNum(m[1])!;
          const b = parseAngleNum(m[2])!;
          check(ctx, parallelGiven, `${where}: ${s.reason} needs l ∥ m`);
          const table = s.reason.startsWith("Corresponding") ? CORR : s.reason.includes("Interior") ? ALTINT : ALTEXT;
          check(ctx, hasPair(table, a, b), `${where}: (${a},${b}) not a valid pair for ${s.reason}`);
          congPairs.add(key(a, b));
        }
        break;
      }
      case "Same-Side Interior Angles Theorem": {
        const m = stmt.match(/^m∠(\d) \+ m∠(\d) = 180°$/);
        check(ctx, m !== null, `${where}: unexpected form`);
        if (m) {
          const a = parseInt(m[1], 10);
          const b = parseInt(m[2], 10);
          check(ctx, parallelGiven, `${where}: needs l ∥ m`);
          check(ctx, hasPair(SAMESIDE, a, b), `${where}: (${a},${b}) not same-side interior`);
          sum180.add(key(a, b));
        }
        break;
      }
      case "Vertical Angles Theorem": {
        const m = stmt.match(/^(∠\d) ≅ (∠\d)$/);
        check(ctx, m !== null, `${where}: not an angle congruence`);
        if (m) {
          const a = parseAngleNum(m[1])!;
          const b = parseAngleNum(m[2])!;
          check(ctx, hasPair(VERT, a, b), `${where}: (${a},${b}) not vertical`);
          congPairs.add(key(a, b));
        }
        break;
      }
      case "Linear Pair Postulate": {
        const m = stmt.match(/^m∠(\d) \+ m∠(\d) = 180°$/);
        check(ctx, m !== null, `${where}: unexpected form`);
        if (m) {
          const a = parseInt(m[1], 10);
          const b = parseInt(m[2], 10);
          check(ctx, hasPair(LINEAR, a, b), `${where}: (${a},${b}) not a linear pair`);
          sum180.add(key(a, b));
        }
        break;
      }
      case "Definition of congruent angles": {
        // Two uses: (a) "∠i ≅ ∠j" from equal measures; (b) "m∠j = θ°"
        // from an established ∠i ≅ ∠j with known m∠i.
        let m = stmt.match(/^(∠\d) ≅ (∠\d)$/);
        if (m) {
          const a = parseAngleNum(m[1])!;
          const b = parseAngleNum(m[2])!;
          const ma = angMeas.get(a);
          const mb = angMeas.get(b);
          check(ctx, ma !== undefined && mb !== undefined && ma === mb,
            `${where}: measures ${ma} vs ${mb} not established equal`);
          congPairs.add(key(a, b));
          break;
        }
        m = stmt.match(/^m∠(\d) = (\d+)°$/);
        check(ctx, m !== null, `${where}: unexpected form`);
        if (m) {
          const j = parseInt(m[1], 10);
          const v = parseInt(m[2], 10);
          // some established ∠i ≅ ∠j with m∠i = v
          const ok = [...congPairs].some((k) => {
            const [a, b] = k.split("-").map(Number);
            const other = a === j ? b : b === j ? a : null;
            return other !== null && angMeas.get(other) === v;
          });
          check(ctx, ok, `${where}: no established congruence justifies m∠${j} = ${v}°`);
          angMeas.set(j, v);
        }
        break;
      }
      case "Substitution": {
        // (a) sum form: "m∠4 + m∠6 = 70° + 110° = 180°"
        let m = stmt.match(/^m∠(\d) \+ m∠(\d) = (\d+)° \+ (\d+)° = 180°$/);
        if (m) {
          const a = parseInt(m[1], 10);
          const b = parseInt(m[2], 10);
          const x = parseInt(m[3], 10);
          const y = parseInt(m[4], 10);
          check(ctx, angMeas.get(a) === x && angMeas.get(b) === y,
            `${where}: addends not the established measures`);
          check(ctx, x + y === 180, `${where}: ${x}+${y} ≠ 180`);
          sum180.add(key(a, b));
          break;
        }
        // (b) difference form: "m∠6 = 180° − 85°"
        m = stmt.match(/^m∠(\d) = 180° − (\d+)°$/);
        check(ctx, m !== null, `${where}: unexpected form`);
        if (m) {
          const j = parseInt(m[1], 10);
          const t = parseInt(m[2], 10);
          const ok = [...sum180].some((k) => k.split("-").map(Number).includes(j));
          check(ctx, ok, `${where}: no sum-to-180 fact for ∠${j}`);
          angMeas.set(j, 180 - t);
        }
        break;
      }
      case "Simplify": {
        const m = stmt.match(/^m∠(\d) = (\d+)°$/);
        check(ctx, m !== null, `${where}: unexpected form`);
        if (m) {
          const j = parseInt(m[1], 10);
          const v = parseInt(m[2], 10);
          check(ctx, angMeas.get(j) === v, `${where}: m∠${j} = ${v}° not the computed value`);
        }
        break;
      }
      case "Corresponding Angles Converse":
      case "Alternate Interior Angles Converse": {
        check(ctx, stmt === "l ∥ m", `${where}: converse must conclude l ∥ m`);
        const table = s.reason.startsWith("Corresponding") ? CORR : ALTINT;
        const ok = [...congPairs].some((k) => {
          const [a, b] = k.split("-").map(Number);
          return hasPair(table, a, b);
        });
        check(ctx, ok, `${where}: no established ${s.reason.replace(" Converse", "")} pair`);
        break;
      }
      case "Same-Side Interior Angles Converse": {
        check(ctx, stmt === "l ∥ m", `${where}: converse must conclude l ∥ m`);
        const ok = [...sum180].some((k) => {
          const [a, b] = k.split("-").map(Number);
          return hasPair(SAMESIDE, a, b);
        });
        check(ctx, ok, `${where}: no established supplementary same-side pair`);
        break;
      }
      default:
        check(ctx, false, `${where}: unknown reason "${s.reason}"`);
    }
  });

  const last = p.steps[p.steps.length - 1];
  check(ctx, norm(last.statement) === norm(p.prove), `${tag}: final ≠ prove`);

  // Diagram recomputed: marked pair must be a genuinely related pair.
  const params = p.svgParams;
  check(ctx, params.kind === "ProofParallelLines", `${tag}: wrong diagram kind ${params.kind}`);
  if (params.kind === "ProofParallelLines") {
    const [m1, m2] = params.markedAngles;
    const related =
      hasPair(CORR, m1, m2) || hasPair(ALTINT, m1, m2) || hasPair(ALTEXT, m1, m2) ||
      hasPair(SAMESIDE, m1, m2) || hasPair(VERT, m1, m2) || hasPair(CHAIN, m1, m2);
    check(ctx, related, `${tag}: marked pair (${m1},${m2}) is not a related angle pair`);
    check(ctx, params.parallel === parallelGiven,
      `${tag}: diagram parallel=${params.parallel} but given parallel=${parallelGiven}`);
    if (params.givenAngleIndex !== undefined) {
      check(ctx, angMeas.get(params.givenAngleIndex) === params.givenAngle,
        `${tag}: diagram givenAngle mismatch`);
    }
    // Both marked angles must appear somewhere in the proof text.
    const text = [...p.given, ...p.steps.map((s) => s.statement)].join(" ");
    check(ctx, text.includes(`∠${m1}`) && text.includes(`∠${m2}`),
      `${tag}: marked angles (${m1},${m2}) not both in proof text`);
  }
}

// ── Circle theorems ──────────────────────────────────────────────────────────

export function checkCircleProof(
  ctx: Ctx,
  p: ProofProblem,
  family: "InscribedAngle" | "TangentChord",
  tag: string
): void {
  const givenSet = new Set(p.given.map(norm));
  const arcs = new Map<string, number>();
  p.given.forEach((g) => {
    const m = norm(g).match(/^m\((minor arc|major arc|arc) ([A-Z]{2})\) = (\d+)°$/);
    if (m) arcs.set(`${m[1]} ${m[2]}`, parseInt(m[3], 10));
  });

  const halfOf = (arcName: string): number | null => {
    const v = arcs.get(arcName);
    return v === undefined ? null : v / 2;
  };

  p.steps.forEach((s, i) => {
    const stmt = norm(s.statement);
    const where = `${tag} step ${i + 1} "${stmt}"`;
    switch (s.reason) {
      case "Given":
        check(ctx, givenSet.has(stmt), `${where}: reason Given but not in given[]`);
        break;
      case "Inscribed Angle Theorem":
      case "Tangent-Chord Angle Theorem": {
        // "m∠ABC = ½ · m(arc AC)" or "m∠ABC = ½ · m(arc AC) = ½(80°) = 40°"
        const m = stmt.match(/^m∠[A-Z]{3} = ½ · m\((minor arc|major arc|arc) ([A-Z]{2})\)(.*)$/);
        check(ctx, m !== null, `${where}: unexpected theorem-application form`);
        if (m) {
          const arcName = `${m[1]} ${m[2]}`;
          const rest = m[3];
          const arcVal = arcs.get(arcName);
          check(ctx, arcVal !== undefined, `${where}: arc ${arcName} not established`);
          const nums = [...rest.matchAll(/([\d.]+)°/g)].map((x) => parseFloat(x[1]));
          if (nums.length >= 1 && arcVal !== undefined) {
            check(ctx, nums[0] === arcVal, `${where}: substituted ${nums[0]} ≠ arc ${arcVal}`);
          }
          if (nums.length >= 2 && arcVal !== undefined) {
            check(ctx, nums[1] === arcVal / 2, `${where}: ${nums[1]} ≠ ½(${arcVal})`);
          }
          void halfOf;
        }
        break;
      }
      case "Arc Addition Postulate": {
        const m = stmt.match(/^m\(arc ([A-Z]{2})\) = m\(arc ([A-Z]{2})\) \+ m\(arc ([A-Z]{2})\) = (\d+)° \+ (\d+)° = (\d+)°$/);
        check(ctx, m !== null, `${where}: unexpected arc-addition form`);
        if (m) {
          const a = parseInt(m[4], 10);
          const b = parseInt(m[5], 10);
          const ssum = parseInt(m[6], 10);
          check(ctx, arcs.get(`arc ${m[2]}`) === a && arcs.get(`arc ${m[3]}`) === b,
            `${where}: addends not the given arcs`);
          check(ctx, a + b === ssum, `${where}: ${a}+${b} ≠ ${ssum}`);
          arcs.set(`arc ${m[1]}`, ssum);
        }
        break;
      }
      case "Substitution": {
        let m = stmt.match(/^m∠[A-Z]{3} = ½\((\d+)°\)$/);
        if (m) {
          // must follow a theorem statement naming the arc; check the number is a known arc
          const v = parseInt(m[1], 10);
          check(ctx, [...arcs.values()].includes(v), `${where}: substituted arc ${v}° unknown`);
          break;
        }
        m = stmt.match(/^m∠[A-Z]{3} = ½\((\d+)°\) = (\d+)°$/);
        if (m) {
          const v = parseInt(m[1], 10);
          const r = parseInt(m[2], 10);
          check(ctx, [...arcs.values()].includes(v), `${where}: substituted arc ${v}° unknown`);
          check(ctx, r === v / 2, `${where}: ${r} ≠ ½(${v})`);
          break;
        }
        m = stmt.match(/^m\(minor arc ([A-Z]{2})\) = 360° − (\d+)° = (\d+)°$/);
        if (m) {
          const major = parseInt(m[2], 10);
          const minor = parseInt(m[3], 10);
          check(ctx, 360 - major === minor, `${where}: 360−${major} ≠ ${minor}`);
          arcs.set(`minor arc ${m[1]}`, minor);
          break;
        }
        check(ctx, false, `${where}: unexpected substitution form`);
        break;
      }
      case "Simplify": {
        const m = stmt.match(/^m∠[A-Z]{3} = (\d+)°$/);
        check(ctx, m !== null, `${where}: unexpected simplify form`);
        if (m) {
          const v = parseInt(m[1], 10);
          check(ctx, [...arcs.values()].some((a) => a / 2 === v),
            `${where}: ${v}° is not half of any established arc`);
        }
        break;
      }
      case "Definition of congruent angles": {
        const m = stmt.match(/^(∠[A-Z]{3}) ≅ (∠[A-Z]{3})$/);
        check(ctx, m !== null, `${where}: not an angle congruence`);
        break;
      }
      default:
        check(ctx, false, `${where}: unknown reason "${s.reason}"`);
    }
  });

  const last = p.steps[p.steps.length - 1];
  check(ctx, norm(last.statement) === norm(p.prove), `${tag}: final ≠ prove`);

  const params = p.svgParams;
  check(ctx, params.kind === "ProofCircle", `${tag}: wrong diagram kind ${params.kind}`);
  if (params.kind === "ProofCircle") {
    check(ctx, params.figure === (family === "InscribedAngle" ? "inscribed" : "tangent"),
      `${tag}: diagram figure ${params.figure} ≠ family ${family}`);
    // Recompute from givens: the arc/angle numbers must match the proof text.
    const arcVals = [...arcs.values()];
    check(ctx, arcVals.includes(params.arc), `${tag}: diagram arc ${params.arc} not among ${arcVals}`);
    check(ctx, params.angle === params.arc / 2, `${tag}: diagram angle ${params.angle} ≠ ½(${params.arc})`);
  }
}

// ── Similarity ───────────────────────────────────────────────────────────────

export function checkSimilarityProof(ctx: Ctx, p: ProofProblem, tag: string): void {
  const st = walkCongruenceSteps(ctx, p, tag, 1);
  const last = p.steps[p.steps.length - 1];
  check(ctx, last.statement === "△ABC ~ △DEF", `${tag}: final not the similarity`);
  check(ctx, last.reason === "AA Similarity", `${tag}: final reason not AA`);
  check(ctx, p.prove === "△ABC ~ △DEF", `${tag}: prove mismatch`);
  check(ctx, st.angCong.length >= 2, `${tag}: fewer than 2 angle pairs established for AA`);
  const params = p.svgParams;
  check(ctx, params.kind === "ProofSimilarity", `${tag}: wrong diagram kind ${params.kind}`);
  if (params.kind === "ProofSimilarity") {
    check(ctx, JSON.stringify(params.angleMarks) === JSON.stringify([true, true, false]),
      `${tag}: angleMarks ≠ [true,true,false]`);
  }
}

// ── Elements ─────────────────────────────────────────────────────────────────

const CLASSICAL_REASONS = new Set([
  "Setting out",
  "Post. 1", "Post. 2", "Post. 3", "Post. 5",
  "Def. 15", "Def. 20",
  "C.N. 1", "C.N. 2", "C.N. 3", "C.N. 4",
  "Hypothesis", "Enunciation", "Construction", "Superposition", "Contradiction",
  "I.3", "I.4", "I.5", "I.7", "I.8", "I.11", "I.13", "I.15", "I.29", "I.31",
  "I.41", "I.46", "I.47", "I.11, I.3", "I.4, I.41",
  "Given", "Conclusion", "Q.E.D.",
]);

export function checkElementsProof(ctx: Ctx, p: ProofProblem, tag: string): void {
  check(ctx, p.elementsProposition !== undefined, `${tag}: missing elementsProposition`);
  check(ctx, /^I\.(1|4|5|8|29|32|47|48)$/.test(p.elementsProposition ?? ""),
    `${tag}: bad proposition ${p.elementsProposition}`);
  check(ctx, !!p.elementsEnunciation && p.elementsEnunciation.length > 20,
    `${tag}: enunciation missing/short`);
  check(ctx, p.prove === "Q.E.D.", `${tag}: prove not Q.E.D.`);
  const last = p.steps[p.steps.length - 1];
  check(ctx, last.statement === "Q.E.D.", `${tag}: final step not Q.E.D.`);
  check(ctx, p.steps.length >= 5, `${tag}: only ${p.steps.length} steps`);
  p.steps.forEach((s, i) => {
    check(ctx, CLASSICAL_REASONS.has(s.reason),
      `${tag} step ${i + 1}: non-classical reason "${s.reason}"`);
  });
  const params = p.svgParams;
  check(ctx, params.kind === "ProofElements", `${tag}: wrong diagram kind ${params.kind}`);
  if (params.kind === "ProofElements") {
    check(ctx, params.prop === p.elementsProposition,
      `${tag}: diagram prop ${params.prop} ≠ ${p.elementsProposition}`);
  }
  check(ctx, p.presentation === "elements", `${tag}: presentation not elements`);
  check(ctx, p.given.length >= 1, `${tag}: no givens`);
}
