// ProofTriangleCongruenceFactory.ts
// Parameterized two-column triangle-congruence proofs: SSS, SAS, ASA, AAS, HL.
//
// Soundness design (a wrong proof is worse than no proof):
//   • Every proof works on two concretely named triangles, △ABC and △DEF,
//     with correspondence A↔D, B↔E, C↔F.
//   • Side lengths come from randomTriangle() (strict triangle inequality,
//     angles via the Law of Cosines); HL uses a genuine Pythagorean triple
//     with the right angle at C/F and hypotenuse AB/DE.
//   • Difficulty changes the *justification* of the congruence facts:
//       1 (Easy):   measurements given directly → Definition of congruent
//                   segments/angles → postulate.
//       2 (Medium): one fact derived from an auxiliary given (midpoint →
//                   Segment Addition, angle bisector → Angle Addition,
//                   perpendicular lines → right angles).
//       3 (Hard):   two facts derived, chained through the same machinery.
//   • Diagram marks are computed from the same established-fact set the
//     steps claim, so the figure can never contradict the proof.
//
// Pure, seeded (mulberry32). No JSX, no AI.

import type { RNG } from "../math-utils";
import { randInt } from "../math-utils";
import type { ProofStep } from "../proofTypes";
import type { ProofProblem, ProofStudentMode } from "../proofDiagrams";
import {
  R,
  randomTriangle,
  randomRightTriangleAtB,
  randomHLTriangle,
  applyStudentMode,
  type TriangleDims,
} from "./ProofFactoryShared";

export type CongruenceFamily = "SSS" | "SAS" | "ASA" | "AAS" | "HL";

export const CONGRUENCE_FAMILIES: readonly CongruenceFamily[] = [
  "SSS",
  "SAS",
  "ASA",
  "AAS",
  "HL",
];

interface CongProof {
  given: string[];
  steps: ProofStep[];
  /** Established side pairs: "AB" | "BC" | "CA" (triangle-1 side names). */
  sides: ("AB" | "BC" | "CA")[];
  /** Established angle pairs: "A" | "B" | "C". */
  angles: ("A" | "B" | "C")[];
  rightAngles: boolean;
}

// ── Small step builders ──────────────────────────────────────────────────────

function givenStep(statement: string): ProofStep {
  return { statement, reason: R.given };
}

function segCong(side1: string, side2: string, n: number): ProofStep[] {
  return [
    givenStep(`${side1} = ${n}, ${side2} = ${n}`),
    { statement: `${side1} ≅ ${side2}`, reason: R.defCongSeg },
  ];
}

function angCong(ang1: string, ang2: string, deg: number): ProofStep[] {
  return [
    givenStep(`m${ang1} = ${deg}°, m${ang2} = ${deg}°`),
    { statement: `${ang1} ≅ ${ang2}`, reason: R.defCongAng },
  ];
}

/**
 * Derive "XY ≅ UV" for a whole side from midpoints:
 * T midpoint of XY, S midpoint of UV, AT.. i.e. XT = US = m, so XY = UV = 2m.
 */
function midpointSide(
  side1: [string, string], // e.g. ["A","B"] for AB
  side2: [string, string], // e.g. ["D","E"] for DE
  m: number
): { given: string[]; steps: ProofStep[] } {
  const [x1, y1] = side1;
  const [x2, y2] = side2;
  const T = "T";
  const S = "S";
  const seg1 = `${x1}${y1}`;
  const seg2 = `${x2}${y2}`;
  const half1a = `${x1}${T}`;
  const half1b = `${T}${y1}`;
  const half2a = `${x2}${S}`;
  const half2b = `${S}${y2}`;
  return {
    given: [
      `${T} is the midpoint of ${seg1}`,
      `${S} is the midpoint of ${seg2}`,
      `${half1a} = ${half2a} = ${m}`,
    ],
    steps: [
      givenStep(`${T} is the midpoint of ${seg1}`),
      { statement: `${half1a} ≅ ${half1b}`, reason: R.defMidpoint },
      givenStep(`${S} is the midpoint of ${seg2}`),
      { statement: `${half2a} ≅ ${half2b}`, reason: R.defMidpoint },
      givenStep(`${half1a} = ${half2a} = ${m}`),
      {
        statement: `${seg1} = ${half1a} + ${half1b} = 2(${m}) = ${2 * m}`,
        reason: R.segAddition,
      },
      {
        statement: `${seg2} = ${half2a} + ${half2b} = 2(${m}) = ${2 * m}`,
        reason: R.segAddition,
      },
      { statement: `${seg1} ≅ ${seg2}`, reason: R.defCongSeg },
    ],
  };
}

/**
 * Derive "∠ABC ≅ ∠DEF" from angle bisectors: ray BQ bisects ∠ABC,
 * ray ER bisects ∠DEF, halves both h°, so both wholes are 2h°.
 */
function bisectorAngle(
  v1: string, // "B"
  adj1: [string, string], // ["A","C"]
  v2: string, // "E"
  adj2: [string, string], // ["D","F"]
  h: number
): { given: string[]; steps: ProofStep[] } {
  const [a1, c1] = adj1;
  const [a2, c2] = adj2;
  const ang1 = `∠${a1}${v1}${c1}`;
  const ang2 = `∠${a2}${v2}${c2}`;
  const half1a = `∠${a1}${v1}Q`;
  const half1b = `∠Q${v1}${c1}`;
  const half2a = `∠${a2}${v2}R`;
  const half2b = `∠R${v2}${c2}`;
  return {
    given: [
      `ray ${v1}Q bisects ${ang1}`,
      `ray ${v2}R bisects ${ang2}`,
      `m${half1a} = m${half2a} = ${h}°`,
    ],
    steps: [
      givenStep(`ray ${v1}Q bisects ${ang1}`),
      { statement: `${half1a} ≅ ${half1b}`, reason: R.defAngleBisector },
      givenStep(`ray ${v2}R bisects ${ang2}`),
      { statement: `${half2a} ≅ ${half2b}`, reason: R.defAngleBisector },
      givenStep(`m${half1a} = m${half2a} = ${h}°`),
      {
        statement: `m${ang1} = m${half1a} + m${half1b} = 2(${h}°) = ${2 * h}°`,
        reason: R.angAddition,
      },
      {
        statement: `m${ang2} = m${half2a} + m${half2b} = 2(${h}°) = ${2 * h}°`,
        reason: R.angAddition,
      },
      { statement: `${ang1} ≅ ${ang2}`, reason: R.defCongAng },
    ],
  };
}

/** Derive "∠B ≅ ∠E" (right angles) from perpendicular givens. */
function perpendicularAngles(
  seg1a: string, seg1b: string, // "AB", "BC" meeting at B
  seg2a: string, seg2b: string, // "DE", "EF" meeting at E
  v1: string, // "B"
  v2: string // "E"
): { given: string[]; steps: ProofStep[] } {
  return {
    given: [`${seg1a} ⊥ ${seg1b}`, `${seg2a} ⊥ ${seg2b}`],
    steps: [
      givenStep(`${seg1a} ⊥ ${seg1b}`),
      { statement: `∠${v1} is a right angle`, reason: R.defPerp },
      givenStep(`${seg2a} ⊥ ${seg2b}`),
      { statement: `∠${v2} is a right angle`, reason: R.defPerp },
      { statement: `∠${v1} ≅ ∠${v2}`, reason: R.rightAnglesCong },
    ],
  };
}

function conclusionStep(family: CongruenceFamily): ProofStep {
  return { statement: "△ABC ≅ △DEF", reason: R[family] };
}

// ── Family builders (difficulty 1–3) ─────────────────────────────────────────

function buildSSS(rng: RNG, t: TriangleDims, difficulty: 1 | 2 | 3): CongProof {
  const { sAB, sBC, sCA } = t;
  if (difficulty === 1) {
    return {
      given: [
        `AB = ${sAB}, DE = ${sAB}`,
        `BC = ${sBC}, EF = ${sBC}`,
        `CA = ${sCA}, FD = ${sCA}`,
      ],
      steps: [
        ...segCong("AB", "DE", sAB),
        ...segCong("BC", "EF", sBC),
        ...segCong("CA", "FD", sCA),
        conclusionStep("SSS"),
      ],
      sides: ["AB", "BC", "CA"],
      angles: [],
      rightAngles: false,
    };
  }
  const d2 = midpointSide(["A", "B"], ["D", "E"], sAB / 2);
  if (difficulty === 2) {
    return {
      given: [
        ...d2.given,
        `BC = ${sBC}, EF = ${sBC}`,
        `CA = ${sCA}, FD = ${sCA}`,
      ],
      steps: [
        ...d2.steps,
        ...segCong("BC", "EF", sBC),
        ...segCong("CA", "FD", sCA),
        conclusionStep("SSS"),
      ],
      sides: ["AB", "BC", "CA"],
      angles: [],
      rightAngles: false,
    };
  }
  const d3 = midpointSide(["B", "C"], ["E", "F"], sBC / 2);
  return {
    given: [...d2.given, ...d3.given, `CA = ${sCA}, FD = ${sCA}`],
    steps: [...d2.steps, ...d3.steps, ...segCong("CA", "FD", sCA), conclusionStep("SSS")],
    sides: ["AB", "BC", "CA"],
    angles: [],
    rightAngles: false,
  };
}

function buildSAS(rng: RNG, t: TriangleDims, difficulty: 1 | 2 | 3): CongProof {
  const { sAB, sBC, angB } = t;
  if (difficulty === 1) {
    return {
      given: [
        `AB = ${sAB}, DE = ${sAB}`,
        `m∠B = ${angB}°, m∠E = ${angB}°`,
        `BC = ${sBC}, EF = ${sBC}`,
      ],
      steps: [
        ...segCong("AB", "DE", sAB),
        ...angCong("∠B", "∠E", angB),
        ...segCong("BC", "EF", sBC),
        conclusionStep("SAS"),
      ],
      sides: ["AB", "BC"],
      angles: ["B"],
      rightAngles: false,
    };
  }
  if (difficulty === 2) {
    // Right triangle at B (t is already right-angled there): the included
    // angle comes from the perpendicular givens.
    const p = perpendicularAngles("AB", "BC", "DE", "EF", "B", "E");
    return {
      given: [...p.given, `AB = ${sAB}, DE = ${sAB}`, `BC = ${sBC}, EF = ${sBC}`],
      steps: [
        ...p.steps,
        ...segCong("AB", "DE", sAB),
        ...segCong("BC", "EF", sBC),
        conclusionStep("SAS"),
      ],
      sides: ["AB", "BC"],
      angles: ["B"],
      rightAngles: true,
    };
  }
  const dSide = midpointSide(["A", "B"], ["D", "E"], sAB / 2);
  const h = Math.max(1, Math.round(angB / 2));
  const dAng = bisectorAngle("B", ["A", "C"], "E", ["D", "F"], h);
  return {
    given: [...dSide.given, ...dAng.given, `BC = ${sBC}, EF = ${sBC}`],
    steps: [...dSide.steps, ...dAng.steps, ...segCong("BC", "EF", sBC), conclusionStep("SAS")],
    sides: ["AB", "BC"],
    angles: ["B"],
    rightAngles: false,
  };
}

function buildASA(rng: RNG, t: TriangleDims, difficulty: 1 | 2 | 3): CongProof {
  const { sAB, angA, angB } = t;
  if (difficulty === 1) {
    return {
      given: [
        `m∠A = ${angA}°, m∠D = ${angA}°`,
        `AB = ${sAB}, DE = ${sAB}`,
        `m∠B = ${angB}°, m∠E = ${angB}°`,
      ],
      steps: [
        ...angCong("∠A", "∠D", angA),
        ...segCong("AB", "DE", sAB),
        ...angCong("∠B", "∠E", angB),
        conclusionStep("ASA"),
      ],
      sides: ["AB"],
      angles: ["A", "B"],
      rightAngles: false,
    };
  }
  const hB = Math.max(1, Math.round(angB / 2));
  const dAngB = bisectorAngle("B", ["A", "C"], "E", ["D", "F"], hB);
  if (difficulty === 2) {
    return {
      given: [`m∠A = ${angA}°, m∠D = ${angA}°`, ...dAngB.given, `AB = ${sAB}, DE = ${sAB}`],
      steps: [
        ...angCong("∠A", "∠D", angA),
        ...dAngB.steps,
        ...segCong("AB", "DE", sAB),
        conclusionStep("ASA"),
      ],
      sides: ["AB"],
      angles: ["A", "B"],
      rightAngles: false,
    };
  }
  const hA = Math.max(1, Math.round(angA / 2));
  const dAngA = bisectorAngle("A", ["C", "B"], "D", ["F", "E"], hA);
  return {
    given: [...dAngA.given, ...dAngB.given, `AB = ${sAB}, DE = ${sAB}`],
    steps: [...dAngA.steps, ...dAngB.steps, ...segCong("AB", "DE", sAB), conclusionStep("ASA")],
    sides: ["AB"],
    angles: ["A", "B"],
    rightAngles: false,
  };
}

function buildAAS(rng: RNG, t: TriangleDims, difficulty: 1 | 2 | 3): CongProof {
  const { sBC, angA, angB } = t;
  if (difficulty === 1) {
    return {
      given: [
        `m∠A = ${angA}°, m∠D = ${angA}°`,
        `m∠B = ${angB}°, m∠E = ${angB}°`,
        `BC = ${sBC}, EF = ${sBC}`,
      ],
      steps: [
        ...angCong("∠A", "∠D", angA),
        ...angCong("∠B", "∠E", angB),
        ...segCong("BC", "EF", sBC),
        conclusionStep("AAS"),
      ],
      sides: ["BC"],
      angles: ["A", "B"],
      rightAngles: false,
    };
  }
  const dSide = midpointSide(["B", "C"], ["E", "F"], sBC / 2);
  if (difficulty === 2) {
    return {
      given: [`m∠A = ${angA}°, m∠D = ${angA}°`, `m∠B = ${angB}°, m∠E = ${angB}°`, ...dSide.given],
      steps: [
        ...angCong("∠A", "∠D", angA),
        ...angCong("∠B", "∠E", angB),
        ...dSide.steps,
        conclusionStep("AAS"),
      ],
      sides: ["BC"],
      angles: ["A", "B"],
      rightAngles: false,
    };
  }
  const hB = Math.max(1, Math.round(angB / 2));
  const dAng = bisectorAngle("B", ["A", "C"], "E", ["D", "F"], hB);
  return {
    given: [`m∠A = ${angA}°, m∠D = ${angA}°`, ...dAng.given, ...dSide.given],
    steps: [...angCong("∠A", "∠D", angA), ...dAng.steps, ...dSide.steps, conclusionStep("AAS")],
    sides: ["BC"],
    angles: ["A", "B"],
    rightAngles: false,
  };
}

function buildHL(rng: RNG, difficulty: 1 | 2 | 3): CongProof {
  const { legA, legB, hyp } = randomHLTriangle(rng);
  // Right angle at C/F; hypotenuse AB/DE; leg BC/EF = legB (even, for midpoints).
  const n = legB / 2;
  if (difficulty === 1) {
    return {
      given: [
        "△ABC and △DEF are right triangles with right angles ∠C and ∠F",
        `AB = ${hyp}, DE = ${hyp} (hypotenuses)`,
        `BC = ${legB}, EF = ${legB}`,
      ],
      steps: [
        givenStep("△ABC and △DEF are right triangles with right angles ∠C and ∠F"),
        givenStep(`AB = ${hyp}, DE = ${hyp} (hypotenuses)`),
        { statement: "AB ≅ DE", reason: R.defCongSeg },
        ...segCong("BC", "EF", legB),
        conclusionStep("HL"),
      ],
      sides: ["AB", "BC"],
      angles: [],
      rightAngles: true,
    };
  }
  const p = perpendicularAngles("AC", "BC", "DF", "EF", "C", "F");
  if (difficulty === 2) {
    return {
      given: [...p.given, `AB = ${hyp}, DE = ${hyp} (hypotenuses)`, `BC = ${legB}, EF = ${legB}`],
      steps: [
        ...p.steps,
        { statement: "△ABC is a right triangle", reason: R.defRightTriangle },
        { statement: "△DEF is a right triangle", reason: R.defRightTriangle },
        givenStep(`AB = ${hyp}, DE = ${hyp} (hypotenuses)`),
        { statement: "AB ≅ DE", reason: R.defCongSeg },
        ...segCong("BC", "EF", legB),
        conclusionStep("HL"),
      ],
      sides: ["AB", "BC"],
      angles: [],
      rightAngles: true,
    };
  }
  const dLeg = midpointSide(["B", "C"], ["E", "F"], n);
  return {
    given: [...p.given, `AB = ${hyp}, DE = ${hyp} (hypotenuses)`, ...dLeg.given],
    steps: [
      ...p.steps,
      { statement: "△ABC is a right triangle", reason: R.defRightTriangle },
      { statement: "△DEF is a right triangle", reason: R.defRightTriangle },
      givenStep(`AB = ${hyp}, DE = ${hyp} (hypotenuses)`),
        { statement: "AB ≅ DE", reason: R.defCongSeg },
      ...dLeg.steps,
      conclusionStep("HL"),
    ],
    sides: ["AB", "BC"],
    angles: [],
    rightAngles: true,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

const FAMILY_TEKS: Record<CongruenceFamily, string> = {
  SSS: "G.6(B)",
  SAS: "G.6(B)",
  ASA: "G.6(B)",
  AAS: "G.6(B)",
  HL: "G.6(B)",
};

const FAMILY_LABEL: Record<CongruenceFamily, string> = {
  SSS: "SSS Congruence",
  SAS: "SAS Congruence",
  ASA: "ASA Congruence",
  AAS: "AAS Congruence",
  HL: "HL Congruence",
};

function sideMarkIndex(side: "AB" | "BC" | "CA"): number {
  return side === "AB" ? 0 : side === "BC" ? 1 : 2;
}
function angleMarkIndex(ang: "A" | "B" | "C"): number {
  return ang === "A" ? 0 : ang === "B" ? 1 : 2;
}

export function makeCongruenceProof(
  rng: RNG,
  family: CongruenceFamily,
  difficulty: 1 | 2 | 3,
  studentMode: ProofStudentMode = "complete"
): ProofProblem {
  const needEvenAB =
    (family === "SSS" && difficulty >= 2) ||
    (family === "SAS" && difficulty === 3);
  const needEvenBC =
    (family === "SSS" && difficulty === 3) || (family === "AAS" && difficulty >= 2);
  const t =
    family === "SAS" && difficulty === 2
      ? randomRightTriangleAtB(rng)
      : randomTriangle(rng, { evenAB: needEvenAB, evenBC: needEvenBC });

  let proof: CongProof;
  switch (family) {
    case "SSS": proof = buildSSS(rng, t, difficulty); break;
    case "SAS": proof = buildSAS(rng, t, difficulty); break;
    case "ASA": proof = buildASA(rng, t, difficulty); break;
    case "AAS": proof = buildAAS(rng, t, difficulty); break;
    case "HL": proof = buildHL(rng, difficulty); break;
  }

  // Diagram marks computed from the established facts — never hand-written.
  // (The right-angle vertex gets a right-angle mark, not a congruence arc.)
  const rightAngleAt = family === "HL" ? 2 : proof.rightAngles && family === "SAS" ? 1 : -1;
  const sideMarks: [number, number, number] = [0, 0, 0];
  proof.sides.forEach((s, i) => {
    sideMarks[sideMarkIndex(s)] = i + 1;
  });
  const angleMarks: [boolean, boolean, boolean] = [false, false, false];
  proof.angles.forEach((a) => {
    if (angleMarkIndex(a) !== rightAngleAt) angleMarks[angleMarkIndex(a)] = true;
  });

  return {
    type: "Proof",
    domain: "geometry",
    family,
    given: proof.given,
    prove: "△ABC ≅ △DEF",
    steps: applyStudentMode(proof.steps, studentMode),
    svgParams: {
      kind: "ProofCongruence",
      subtype: family,
      sideMarks,
      angleMarks,
      rightAngleAt,
    },
    teks: FAMILY_TEKS[family],
    studentMode,
    presentation: "two-column",
  };
}

/**
 * Generate n triangle-congruence proofs. `difficulty` is cumulative: each
 * problem draws a tier uniformly from 1..difficulty and a family uniformly
 * from `families` (default: all five).
 */
export function generateTriangleCongruenceProofs(
  rng: RNG,
  n: number,
  difficulty: 1 | 2 | 3 = 2,
  studentMode: ProofStudentMode = "complete",
  families: readonly CongruenceFamily[] = CONGRUENCE_FAMILIES
): ProofProblem[] {
  return Array.from({ length: n }, () => {
    const family = families[randInt(rng, 0, families.length - 1)];
    const tier = randInt(rng, 1, difficulty) as 1 | 2 | 3;
    return makeCongruenceProof(rng, family, tier, studentMode);
  });
}

// ── CPCTC proofs (T4 4-4) ────────────────────────────────────────────────────

const SIDE_CORR: Record<string, string> = { AB: "DE", BC: "EF", CA: "FD" };
const ANGLE_CORR: Record<string, string> = { A: "∠D", B: "∠E", C: "∠F" };

/**
 * CPCTC: establish △ABC ≅ △DEF via a congruence postulate, then conclude a
 * *corresponding part that was not among the givens*. The base proof is built
 * with the ordinary builders, so its givens/diagram stay sound.
 */
export function makeCPCTCProof(
  rng: RNG,
  difficulty: 1 | 2 | 3,
  studentMode: ProofStudentMode = "complete"
): ProofProblem {
  const baseFamily = CONGRUENCE_FAMILIES[randInt(rng, 0, CONGRUENCE_FAMILIES.length - 1)];
  const tier = randInt(rng, 1, difficulty) as 1 | 2 | 3;
  const t = randomTriangle(rng, {});
  let proof: CongProof;
  switch (baseFamily) {
    case "SSS": proof = buildSSS(rng, t, tier); break;
    case "SAS": proof = buildSAS(rng, t, tier); break;
    case "ASA": proof = buildASA(rng, t, tier); break;
    case "AAS": proof = buildAAS(rng, t, tier); break;
    case "HL": proof = buildHL(rng, tier); break;
  }

  // Choose a corresponding part not already established as a given pair.
  // (HL establishes the right-angle pair ∠C ≅ ∠F via the Right Angles
  // Congruence Theorem even though it isn't in proof.angles.)
  const establishedAngles = baseFamily === "HL" ? [...proof.angles, "C"] : proof.angles;
  const freeSides = (["AB", "BC", "CA"] as const).filter((s) => !proof.sides.includes(s));
  const freeAngles = (["A", "B", "C"] as const).filter((a) => !establishedAngles.includes(a));
  const options: string[] = [
    ...freeSides.map((s) => `${s} ≅ ${SIDE_CORR[s]}`),
    ...freeAngles.map((a) => `∠${a} ≅ ${ANGLE_CORR[a]}`),
  ];
  const target = options[randInt(rng, 0, options.length - 1)];

  const sideMarks: [number, number, number] = [0, 0, 0];
  proof.sides.forEach((s, i) => {
    sideMarks[sideMarkIndex(s)] = i + 1;
  });
  const angleMarks: [boolean, boolean, boolean] = [false, false, false];
  proof.angles.forEach((a) => {
    angleMarks[angleMarkIndex(a)] = true;
  });

  return {
    type: "Proof",
    domain: "geometry",
    family: `CPCTC:${baseFamily}`,
    given: proof.given,
    prove: target,
    steps: applyStudentMode(
      [...proof.steps, { statement: target, reason: R.cpctc }],
      studentMode
    ),
    svgParams: {
      kind: "ProofCongruence",
      subtype: baseFamily,
      sideMarks,
      angleMarks,
      rightAngleAt: baseFamily === "HL" ? 2 : proof.rightAngles && baseFamily === "SAS" ? 1 : -1,
    },
    teks: "G.6(B)",
    studentMode,
    presentation: "two-column",
  };
}

export function generateCPCTCProofs(
  rng: RNG,
  n: number,
  difficulty: 1 | 2 | 3 = 2,
  studentMode: ProofStudentMode = "complete"
): ProofProblem[] {
  return Array.from({ length: n }, () => makeCPCTCProof(rng, difficulty, studentMode));
}

// ── Isosceles / equilateral triangle proofs (T4 4-5) ─────────────────────────

/**
 * Prove the base angles of an isosceles triangle congruent (d1: bisector +
 * SAS; d2: median + SSS), or prove the converse (d3: equal base angles ⟹
 * equal legs, via AAS). Each proof constructs the auxiliary segment AM
 * explicitly — no hidden steps.
 */
export function makeIsoscelesProof(
  rng: RNG,
  difficulty: 1 | 2 | 3,
  studentMode: ProofStudentMode = "complete"
): ProofProblem {
  const tier = difficulty === 1 ? 1 : difficulty === 2 ? (randInt(rng, 1, 2) as 1 | 2) : 3;
  let given: string[];
  let steps: ProofStep[];
  let prove: string;

  if (tier === 1) {
    const s = randInt(rng, 6, 12);
    given = [`AB = ${s}, AC = ${s}`, "△ABC is isosceles"];
    prove = "∠B ≅ ∠C";
    steps = [
      givenStep(`AB = ${s}, AC = ${s}`),
      { statement: "AB ≅ AC", reason: R.defCongSeg },
      { statement: "Draw the bisector of ∠A, meeting BC at M.", reason: R.construction },
      { statement: "∠BAM ≅ ∠CAM", reason: R.defAngleBisector },
      { statement: "AM ≅ AM", reason: R.reflexive },
      { statement: "△ABM ≅ △ACM", reason: R.SAS },
      { statement: prove, reason: R.cpctc },
    ];
  } else if (tier === 2) {
    const s = randInt(rng, 6, 12);
    given = [`AB = ${s}, AC = ${s}`, "△ABC is isosceles"];
    prove = "∠B ≅ ∠C";
    steps = [
      givenStep(`AB = ${s}, AC = ${s}`),
      { statement: "AB ≅ AC", reason: R.defCongSeg },
      { statement: "Let M be the midpoint of BC.", reason: R.construction },
      { statement: "BM ≅ CM", reason: R.defMidpoint },
      { statement: "AM ≅ AM", reason: R.reflexive },
      { statement: "△ABM ≅ △ACM", reason: R.SSS },
      { statement: prove, reason: R.cpctc },
    ];
  } else {
    const b = randInt(rng, 30, 70);
    given = [`m∠B = ${b}°, m∠C = ${b}°`];
    prove = "AB ≅ AC";
    steps = [
      givenStep(`m∠B = ${b}°, m∠C = ${b}°`),
      { statement: "∠B ≅ ∠C", reason: R.defCongAng },
      { statement: "Draw the bisector of ∠A, meeting BC at M.", reason: R.construction },
      { statement: "∠BAM ≅ ∠CAM", reason: R.defAngleBisector },
      { statement: "AM ≅ AM", reason: R.reflexive },
      { statement: "△ABM ≅ △ACM", reason: R.AAS },
      { statement: prove, reason: R.cpctc },
    ];
  }

  return {
    type: "Proof",
    domain: "geometry",
    family: "Isosceles",
    given,
    prove,
    steps: applyStudentMode(steps, studentMode),
    svgParams: {
      kind: "ProofIsosceles",
      markEqualLegs: true,
      markBaseAngles: true,
    },
    teks: "G.6(B)",
    studentMode,
    presentation: "two-column",
  };
}

export function generateIsoscelesProofs(
  rng: RNG,
  n: number,
  difficulty: 1 | 2 | 3 = 2,
  studentMode: ProofStudentMode = "complete"
): ProofProblem[] {
  return Array.from({ length: n }, () => makeIsoscelesProof(rng, difficulty, studentMode));
}

export { FAMILY_LABEL as CONGRUENCE_FAMILY_LABEL };
