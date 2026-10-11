// ProofElementsFactory.ts
// Euclid's Elements flagship propositions as parameterized classical proofs.
//
// Each proposition is the genuine Euclidean argument (following Heath's
// translation in structure: enunciation → setting-out → construction →
// demonstration → Q.E.D.), with the *measurements in the setting-out*
// randomized per seed. The lettering follows the classical figures, which is
// what makes it feel like the Elements.
//
// Flagships: I.1 (equilateral construction), I.4 (SAS), I.5 (pons asinorum),
// I.8 (SSS), I.29 (parallels), I.32 (angle sum), I.47 (Pythagoras),
// I.48 (converse of Pythagoras).
//
// Classical reason vocabulary: "Post. 1/2/3" (postulates), "C.N. 1–5" (common
// notions), "Def. 15/20" (definitions), "I.4" etc. (earlier propositions),
// "Hypothesis", "Construction", "Superposition", "Contradiction".
//
// Pure, seeded. No JSX, no AI.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { ProofStep } from "../proofTypes";
import type {
  ProofProblem,
  ProofStudentMode,
  ElementsProposition,
} from "../proofDiagrams";
import { applyStudentMode, randomAngleTriple } from "./ProofFactoryShared";

export const ELEMENTS_PROPOSITIONS: readonly ElementsProposition[] = [
  "I.1",
  "I.4",
  "I.5",
  "I.8",
  "I.29",
  "I.32",
  "I.47",
  "I.48",
];

/** Propositions unlocked at each difficulty tier (cumulative). */
export const ELEMENTS_BY_DIFFICULTY: Record<1 | 2 | 3, readonly ElementsProposition[]> = {
  1: ["I.1", "I.4", "I.8"],
  2: ["I.1", "I.4", "I.8", "I.5", "I.29", "I.32"],
  3: ELEMENTS_PROPOSITIONS,
};

const ENUNCIATIONS: Record<ElementsProposition, string> = {
  "I.1": "On a given finite straight line, to construct an equilateral triangle.",
  "I.4":
    "If two triangles have the two sides equal to two sides respectively, and have the angles contained by the equal straight lines equal, they will also have the base equal to the base, the triangle will be equal to the triangle, and the remaining angles will be equal to the remaining angles respectively, namely those which the equal sides subtend.",
  "I.5":
    "In isosceles triangles the angles at the base are equal to one another, and, if the equal straight lines be produced further, the angles under the base will be equal to one another.",
  "I.8":
    "If two triangles have the two sides equal to two sides respectively, and have also the base equal to the base, they will also have the angles equal which are contained by the equal straight lines.",
  "I.29":
    "A straight line falling on parallel straight lines makes the alternate angles equal to one another, the exterior angle equal to the interior and opposite angle, and the interior angles on the same side equal to two right angles.",
  "I.32":
    "In any triangle, if one of the sides be produced, the exterior angle is equal to the two interior and opposite angles, and the three interior angles of the triangle are equal to two right angles.",
  "I.47":
    "In right-angled triangles the square on the side subtending the right angle is equal to the squares on the sides containing the right angle.",
  "I.48":
    "If in a triangle the square on one of the sides be equal to the squares on the remaining two sides of the triangle, the angle contained by the remaining two sides of the triangle is right.",
};

const TITLES: Record<ElementsProposition, string> = {
  "I.1": "Construction of an equilateral triangle",
  "I.4": "Side-Angle-Side congruence",
  "I.5": "Pons asinorum — base angles of an isosceles triangle",
  "I.8": "Side-Side-Side congruence",
  "I.29": "Angles formed by a transversal on parallels",
  "I.32": "The exterior angle and the angle sum of a triangle",
  "I.47": "The theorem of Pythagoras",
  "I.48": "Converse of the theorem of Pythagoras",
};

interface ElementsProof {
  given: string[];
  steps: ProofStep[];
  /** Figure dimensions for the ProofElements diagram. */
  a?: number;
  b?: number;
}

function qed(steps: ProofStep[]): ProofStep[] {
  return [...steps, { statement: "Q.E.D.", reason: "Conclusion" }];
}

// ── The eight propositions ───────────────────────────────────────────────────

function propI1(rng: RNG): ElementsProof {
  const L = randInt(rng, 4, 10);
  return {
    given: [`AB is a given finite straight line, ${L} units long`],
    a: L,
    steps: qed([
      { statement: "Let AB be the given finite straight line.", reason: "Setting out" },
      { statement: "With centre A and distance AB describe the circle BCD.", reason: "Post. 3" },
      { statement: "With centre B and distance BA describe the circle ACE.", reason: "Post. 3" },
      { statement: "From C, where the circles cut one another, join CA and CB.", reason: "Post. 1" },
      { statement: "CA is equal to AB, for A is the centre of the circle BCD.", reason: "Def. 15" },
      { statement: "CB is equal to BA, for B is the centre of the circle ACE.", reason: "Def. 15" },
      { statement: "Since CA = AB and CB = AB, CA is equal to CB.", reason: "C.N. 1" },
      { statement: "Therefore CA, AB, BC are equal to one another, and the triangle ABC is equilateral.", reason: "Def. 20" },
    ]),
  };
}

function propI4(rng: RNG): ElementsProof {
  const a = randInt(rng, 4, 9);
  let b = randInt(rng, 4, 9);
  if (b === a) b = a === 9 ? 8 : a + 1;
  const theta = pick(rng, [35, 40, 50, 60, 70, 80, 100, 110, 120]);
  return {
    given: [
      `In △ABC and △DEF: AB = DE = ${a}`,
      `AC = DF = ${b}`,
      `∠BAC = ∠EDF = ${theta}°`,
    ],
    steps: qed([
      { statement: "Let ABC and DEF be two triangles with AB = DE, AC = DF, and the angle BAC equal to the angle EDF.", reason: "Hypothesis" },
      { statement: "Apply the triangle ABC to the triangle DEF, so that the point A falls on D and the straight line AB falls along DE.", reason: "Superposition" },
      { statement: "Then the point B will coincide with E, because AB is equal to DE.", reason: "Hypothesis" },
      { statement: "AB now coincides with DE; and since the angle BAC equals the angle EDF, the straight line AC will fall along DF.", reason: "Hypothesis" },
      { statement: "Then the point C will coincide with F, because AC is equal to DF.", reason: "Hypothesis" },
      { statement: "The base BC will coincide with the base EF, for its endpoints coincide.", reason: "C.N. 4" },
      { statement: "Hence the triangle ABC coincides with the triangle DEF and is equal to it; the remaining angles ABC, ACB equal the remaining angles DEF, DFE respectively.", reason: "C.N. 4" },
    ]),
  };
}

function propI5(rng: RNG): ElementsProof {
  const s = randInt(rng, 6, 12);
  return {
    given: [`△ABC is isosceles with AB = AC = ${s}`],
    a: s,
    steps: qed([
      { statement: "Let ABC be an isosceles triangle having the side AB equal to the side AC.", reason: "Hypothesis" },
      { statement: "Produce the straight lines AB to D and AC to E.", reason: "Post. 2" },
      { statement: "On BD take any point F, and cut off AG equal to AF from the greater AE.", reason: "I.3" },
      { statement: "Join the straight lines FC and GB.", reason: "Post. 1" },
      { statement: "In the triangles AFC and AGB: AF = AG, AC = AB, and the angle at A is common; hence the triangles are equal.", reason: "I.4" },
      { statement: "Therefore FC = GB, the angle ACF equals the angle ABG, and the angle AFC equals the angle AGB.", reason: "I.4" },
      { statement: "Since the whole AF equals the whole AG, and AB equals AC, the remainders BF and CG are equal.", reason: "C.N. 3" },
      { statement: "In the triangles BFC and CGB: BF = CG, FC = GB, and the angle BFC equals the angle CGB; hence the triangles are equal.", reason: "I.4" },
      { statement: "Therefore the angle FBC equals the angle GCB, and the angle BCF equals the angle CBG.", reason: "I.4" },
      { statement: "Since the angle ABG equals the angle ACF and the angle CBG equals the angle BCF, the remainders — the angle ABC and the angle ACB — are equal.", reason: "C.N. 3" },
      { statement: "These are the angles at the base of the triangle ABC.", reason: "Def. 20" },
    ]),
  };
}

function propI8(rng: RNG): ElementsProof {
  const a = randInt(rng, 4, 9);
  const b = randInt(rng, 4, 9);
  const lo = Math.abs(a - b) + 1;
  const hi = a + b - 1;
  const c = randInt(rng, lo, hi);
  return {
    given: [
      `In △ABC and △DEF: AB = DE = ${a}`,
      `AC = DF = ${b}`,
      `BC = EF = ${c}`,
    ],
    steps: qed([
      { statement: "Let ABC and DEF be two triangles with AB = DE, AC = DF, and BC = EF.", reason: "Hypothesis" },
      { statement: "Apply the triangle ABC to the triangle DEF, so that B falls on E and BC lies along EF, with A and D on the same side.", reason: "Superposition" },
      { statement: "Then C coincides with F, because BC is equal to EF.", reason: "Hypothesis" },
      { statement: "If A does not coincide with D, let it fall at G, and join DG.", reason: "Post. 1" },
      { statement: "Then GE = DE and GF = DF; hence the angle EGD equals the angle EDG, and the angle FGD equals the angle FDG.", reason: "I.5" },
      { statement: "But two different pairs of equal straight lines cannot stand on EF, on the same side, meeting at two different points.", reason: "I.7" },
      { statement: "Hence A coincides with D, and the angle BAC equals the angle EDF.", reason: "C.N. 4" },
    ]),
  };
}

function propI29(rng: RNG): ElementsProof {
  const theta = randInt(rng, 30, 150);
  return {
    given: [
      "AB is parallel to CD",
      `the transversal EF falls on them at G and H, with ∠AGE = ${theta}°`,
    ],
    steps: qed([
      { statement: "Let AB be parallel to CD, and let the straight line EF fall upon them at G and H.", reason: "Hypothesis" },
      { statement: "I say that the alternate angles AGH and GHD are equal, the exterior angle EGB equals the interior and opposite angle GHD, and the interior angles BGH and GHD are equal to two right angles.", reason: "Enunciation" },
      { statement: "If the angle AGH is unequal to the angle GHD, one of them is greater; let AGH be the greater.", reason: "Hypothesis" },
      { statement: "Add the angle BGH to each: then AGH + BGH is greater than GHD + BGH.", reason: "C.N. 4" },
      { statement: "But AGH + BGH is equal to two right angles.", reason: "I.13" },
      { statement: "Hence GHD + BGH is less than two right angles; so AB and CD, if produced, meet on that side — contrary to AB being parallel to CD.", reason: "Post. 5" },
      { statement: "Therefore the alternate angles AGH and GHD are equal.", reason: "Contradiction" },
      { statement: "The angle AGH equals the angle EGB, being vertical; hence the exterior angle EGB equals the interior and opposite angle GHD.", reason: "I.15" },
      { statement: "Add BGH to each of the equal angles AGH and GHD: then AGH + BGH equals GHD + BGH; the former is two right angles, so the interior angles on the same side are equal to two right angles.", reason: "I.13" },
    ]),
  };
}

function propI32(rng: RNG): ElementsProof {
  const [alpha, beta, gamma] = randomAngleTriple(rng);
  return {
    given: [
      `△ABC has ∠BAC = ${alpha}°, ∠ABC = ${beta}°, ∠ACB = ${gamma}°`,
      "the side BC is produced to D",
    ],
    steps: qed([
      { statement: "Let ABC be a triangle, and let the side BC be produced to D.", reason: "Post. 2" },
      { statement: "Through the point C draw CE parallel to the straight line AB.", reason: "I.31" },
      { statement: "The angle BAC equals the angle ACE, for they are alternate angles on the parallels AB and CE.", reason: "I.29" },
      { statement: "The angle ABC equals the angle ECD, for they are corresponding exterior and interior angles.", reason: "I.29" },
      { statement: "Hence the whole exterior angle ACD — that is, ACE + ECD — equals BAC + ABC.", reason: "C.N. 2" },
      { statement: "Add the angle ACB to each: ACD + ACB equals BAC + ABC + ACB.", reason: "C.N. 2" },
      { statement: "But ACD + ACB is equal to two right angles.", reason: "I.13" },
      { statement: "Therefore the three interior angles BAC, ABC, ACB are equal to two right angles.", reason: "C.N. 1" },
    ]),
  };
}

function propI47(rng: RNG): ElementsProof {
  const a = randInt(rng, 3, 12);
  const b = randInt(rng, 3, 12);
  return {
    given: [
      `△ABC is right-angled with ∠BAC = 90°`,
      `AB = ${a}`,
      `AC = ${b}`,
    ],
    a,
    b,
    steps: qed([
      { statement: "Let ABC be a right-angled triangle having the angle BAC right.", reason: "Hypothesis" },
      { statement: "On BC describe the square BDEC, and on BA and AC the squares GB and HC.", reason: "I.46" },
      { statement: "Through A draw AL parallel to BD and to CE.", reason: "I.31" },
      { statement: "Join AD and FC.", reason: "Post. 1" },
      { statement: "The angles DBC and FBA are both right; add the angle ABC to each, and the angle DBA equals the angle FBC.", reason: "C.N. 2" },
      { statement: "In the triangles ABD and FBC: DB = BC, FB = BA, and the angle DBA equals the angle FBC; hence the triangles are equal.", reason: "I.4" },
      { statement: "The parallelogram BL is double the triangle ABD, being on the same base BD and between the same parallels.", reason: "I.41" },
      { statement: "The square GB is double the triangle FBC, being on the same base FB and between the same parallels.", reason: "I.41" },
      { statement: "Doubles of equal things are equal: the parallelogram BL equals the square GB.", reason: "C.N. 2" },
      { statement: "Similarly, if AE and BK be joined, the parallelogram CL equals the square HC.", reason: "I.4, I.41" },
      { statement: "Therefore the whole square BDEC — that is, BL + CL — equals the squares GB + HC on the sides containing the right angle.", reason: "C.N. 2" },
    ]),
  };
}

function propI48(rng: RNG): ElementsProof {
  const [a, b, c] = pick(rng, [
    [3, 4, 5],
    [6, 8, 10],
    [5, 12, 13],
  ] as const);
  return {
    given: [
      `In △ABC: AB = ${a}, AC = ${b}, BC = ${c}`,
      `AB² + AC² = ${a * a} + ${b * b} = ${c * c} = BC²`,
    ],
    a,
    b,
    steps: qed([
      { statement: "Let ABC be a triangle in which the square on BC equals the squares on BA and AC.", reason: "Hypothesis" },
      { statement: "From the point A draw AD at right angles to AC, and make AD equal to AB; join DB.", reason: "I.11, I.3" },
      { statement: "Since AD = AB, the square on AD equals the square on AB; add the square on AC to each.", reason: "C.N. 2" },
      { statement: "By I.47 on the right-angled triangle DAC, the square on DB equals the squares on AD and AC; hence the square on DB equals the square on BC, and DB = BC.", reason: "I.47" },
      { statement: "In the triangles ABC and ADC: AB = AD, AC is common, and BC = BD; hence the triangles are equal.", reason: "I.8" },
      { statement: "Therefore the angle BAC equals the angle DAC; but DAC is right, so BAC is right.", reason: "C.N. 4" },
    ]),
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

const BUILDERS: Record<ElementsProposition, (rng: RNG) => ElementsProof> = {
  "I.1": propI1,
  "I.4": propI4,
  "I.5": propI5,
  "I.8": propI8,
  "I.29": propI29,
  "I.32": propI32,
  "I.47": propI47,
  "I.48": propI48,
};

export function makeElementsProof(
  rng: RNG,
  prop: ElementsProposition,
  studentMode: ProofStudentMode = "complete"
): ProofProblem {
  const proof = BUILDERS[prop](rng);
  return {
    type: "Proof",
    domain: "geometry",
    family: `Elements:${prop}`,
    given: proof.given,
    prove: "Q.E.D.",
    steps: applyStudentMode(proof.steps, studentMode),
    svgParams: {
      kind: "ProofElements",
      prop,
      a: proof.a,
      b: proof.b,
    },
    elementsProposition: prop,
    elementsEnunciation: ENUNCIATIONS[prop],
    teks: "G.4(B)",
    studentMode,
    presentation: "elements",
  };
}

/**
 * Generate n Elements proofs. `difficulty` is cumulative: each problem draws
 * a proposition uniformly from those unlocked at that tier.
 */
export function generateElementsProofs(
  rng: RNG,
  n: number,
  difficulty: 1 | 2 | 3 = 2,
  studentMode: ProofStudentMode = "complete"
): ProofProblem[] {
  const props = ELEMENTS_BY_DIFFICULTY[difficulty];
  return Array.from({ length: n }, () =>
    makeElementsProof(rng, pick(rng, props), studentMode)
  );
}

export { ENUNCIATIONS as ELEMENTS_ENUNCIATIONS, TITLES as ELEMENTS_TITLES };
