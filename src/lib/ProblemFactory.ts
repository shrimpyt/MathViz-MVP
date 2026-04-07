// ProblemFactory.ts
// Core math logic for Texas TEKS G.12(A) and G.13(B)

export type TEKSStandard = "G.12A" | "G.13B";
export type OutputMode = "GuidedNote" | "Review" | "Test";

// ── Shared types ──────────────────────────────────────────────────────────────

export interface BlankField {
  label: string;       // hint shown in GuidedNote blanks, hidden in Test
  answer: string;      // the correct value (numeric or symbolic)
  unit?: string;
}

export interface ProblemStep {
  instruction: string;
  blanks?: BlankField[];
}

export interface CircleProblem {
  type: "G.12A";
  subtype: "InscribedAngle" | "CentralAngle" | "Tangent" | "TwoChords" | "TwoSecants";
  given: Record<string, number>;   // named angle/arc values
  find: string;                    // what to solve for
  answer: number;                  // degrees
  unit: string;
  steps: ProblemStep[];
  svgParams: InscribedAngleSVGParams | TangentSVGParams | ChordSVGParams;
}

export interface ProbabilityProblem {
  type: "G.13B";
  subtype: "ConcentricCircles" | "ShadedSector";
  outerR: number;       // outer radius (arbitrary units)
  innerR?: number;      // for concentric circles
  sectorAngle?: number; // degrees, for shaded sector
  answer: number;       // probability as decimal, rounded to 4 places
  answerPct: string;    // "xx.x%"
  steps: ProblemStep[];
  svgParams: ConcentricSVGParams | SectorSVGParams;
}

// ── G.6(B): Triangle Congruence types ────────────────────────────────────────

export type CongruenceSubtype = "SSS" | "SAS" | "ASA" | "AAS" | "HL";

export interface CongruenceProblem {
  type: "G.6B";
  subtype: CongruenceSubtype;
  /** Human-readable list of given congruences (e.g. "AB ≅ DE (8 units)") */
  given: string[];
  find: string;
  /** The theorem name as the answer ("SSS", "SAS", etc.) */
  answer: string;
  steps: ProblemStep[];
  svgParams: CongruenceSVGParams;
}

export interface CongruenceSVGParams {
  kind: "Congruence";
  subtype: CongruenceSubtype;
  sideA: number;
  sideB: number;
  sideC: number;
  /**
   * Tick count (1, 2, or 3) for each side of triangle 1: [AB, BC, CA].
   * 0 means no tick mark on that side.
   */
  sideMarks: [number, number, number];
  /** Whether each vertex of triangle 1 gets an angle-congruence arc: [A, B, C] */
  angleMarks: [boolean, boolean, boolean];
  /** Index of the right-angle vertex in triangle 1 (0=A,1=B,2=C), -1 if none */
  rightAngleAt: number;
}

export type MathProblem = CircleProblem | ProbabilityProblem | CongruenceProblem;

// ── SVG parameter types ───────────────────────────────────────────────────────

export interface InscribedAngleSVGParams {
  kind: "InscribedAngle" | "CentralAngle" | "TwoChords" | "TwoSecants";
  interceptedArc: number;   // degrees
  inscribedAngle?: number;
  centralAngle?: number;
}

export interface TangentSVGParams {
  kind: "Tangent";
  tangentAngle: number;
}

export interface ChordSVGParams {
  kind: "TwoChords";
  arc1: number;
  arc2: number;
}

export interface ConcentricSVGParams {
  kind: "ConcentricCircles";
  outerR: number;
  innerR: number;
}

export interface SectorSVGParams {
  kind: "ShadedSector";
  sectorAngle: number;
}

// ── Seeded PRNG for reproducible randomness ───────────────────────────────────

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng: () => number, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ── G.12(A): Circle Theorem Problems ─────────────────────────────────────────

function makeInscribedAngleProblem(rng: () => number): CircleProblem {
  // Inscribed angle = half the intercepted arc
  const arc = randInt(rng, 4, 17) * 10; // multiples of 10: 40–170
  const angle = arc / 2;
  return {
    type: "G.12A",
    subtype: "InscribedAngle",
    given: { interceptedArc: arc },
    find: "inscribed angle",
    answer: angle,
    unit: "°",
    steps: [
      {
        instruction: "Recall the Inscribed Angle Theorem:",
        blanks: [
          {
            label: "formula",
            answer: "Inscribed Angle = ½ × Intercepted Arc",
          },
        ],
      },
      {
        instruction: `Substitute the intercepted arc measure of ${arc}°:`,
        blanks: [
          { label: "½ × ?", answer: `½ × ${arc}°` },
          { label: "answer", answer: `${angle}°` },
        ],
      },
    ],
    svgParams: {
      kind: "InscribedAngle",
      interceptedArc: arc,
      inscribedAngle: angle,
    },
  };
}

function makeCentralAngleProblem(rng: () => number): CircleProblem {
  // Central angle = intercepted arc
  const arc = randInt(rng, 3, 17) * 10;
  return {
    type: "G.12A",
    subtype: "CentralAngle",
    given: { interceptedArc: arc },
    find: "central angle",
    answer: arc,
    unit: "°",
    steps: [
      {
        instruction: "Recall the Central Angle Theorem:",
        blanks: [{ label: "formula", answer: "Central Angle = Intercepted Arc" }],
      },
      {
        instruction: `The central angle equals the intercepted arc of ${arc}°:`,
        blanks: [{ label: "answer", answer: `${arc}°` }],
      },
    ],
    svgParams: {
      kind: "CentralAngle",
      interceptedArc: arc,
      centralAngle: arc,
    },
  };
}

function makeTangentProblem(rng: () => number): CircleProblem {
  // Angle formed by tangent-chord = half intercepted arc
  const arc = randInt(rng, 4, 17) * 10;
  const angle = arc / 2;
  return {
    type: "G.12A",
    subtype: "Tangent",
    given: { interceptedArc: arc },
    find: "tangent-chord angle",
    answer: angle,
    unit: "°",
    steps: [
      {
        instruction: "An angle formed by a tangent and a chord equals half the intercepted arc:",
        blanks: [{ label: "formula", answer: "Tangent-Chord Angle = ½ × Intercepted Arc" }],
      },
      {
        instruction: `Substitute ${arc}°:`,
        blanks: [
          { label: "½ × ?", answer: `½ × ${arc}°` },
          { label: "answer", answer: `${angle}°` },
        ],
      },
    ],
    svgParams: { kind: "Tangent", tangentAngle: angle },
  };
}

function makeTwoChordsProblem(rng: () => number): CircleProblem {
  // Angle = ½(arc1 + arc2), arc1 + arc2 must be even and both ≥ 20
  const arc1 = randInt(rng, 2, 8) * 20;
  const arc2 = randInt(rng, 2, 8) * 20;
  const angle = (arc1 + arc2) / 2;
  return {
    type: "G.12A",
    subtype: "TwoChords",
    given: { arc1, arc2 },
    find: "angle formed by two chords",
    answer: angle,
    unit: "°",
    steps: [
      {
        instruction: "Two chords intersect inside a circle. The angle equals half the sum of intercepted arcs:",
        blanks: [{ label: "formula", answer: "Angle = ½(arc₁ + arc₂)" }],
      },
      {
        instruction: `Substitute arc₁ = ${arc1}° and arc₂ = ${arc2}°:`,
        blanks: [
          { label: "½(? + ?)", answer: `½(${arc1}° + ${arc2}°)` },
          { label: "½ × ?", answer: `½ × ${arc1 + arc2}°` },
          { label: "answer", answer: `${angle}°` },
        ],
      },
    ],
    svgParams: { kind: "TwoChords", arc1, arc2 },
  };
}

function makeTwoSecantsProblem(rng: () => number): CircleProblem {
  // Angle = ½|farArc - nearArc|, both even, farArc > nearArc
  const nearArc = randInt(rng, 1, 5) * 20;
  const farArc = nearArc + randInt(rng, 2, 7) * 20;
  const angle = (farArc - nearArc) / 2;
  return {
    type: "G.12A",
    subtype: "TwoSecants",
    given: { farArc, nearArc },
    find: "angle formed by two secants",
    answer: angle,
    unit: "°",
    steps: [
      {
        instruction: "Two secants drawn from an external point. The angle equals half the difference of intercepted arcs:",
        blanks: [{ label: "formula", answer: "Angle = ½(far arc − near arc)" }],
      },
      {
        instruction: `Substitute far arc = ${farArc}°, near arc = ${nearArc}°:`,
        blanks: [
          { label: "½(? − ?)", answer: `½(${farArc}° − ${nearArc}°)` },
          { label: "½ × ?", answer: `½ × ${farArc - nearArc}°` },
          { label: "answer", answer: `${angle}°` },
        ],
      },
    ],
    svgParams: {
      kind: "TwoSecants",
      interceptedArc: farArc,
    } as InscribedAngleSVGParams,
  };
}

// ── G.13(B): Area-Based Probability Problems ──────────────────────────────────

function makeConcentricProblem(rng: () => number): ProbabilityProblem {
  const innerR = randInt(rng, 2, 6);
  const outerR = innerR + randInt(rng, 2, 6);
  const prob = parseFloat(((innerR ** 2) / (outerR ** 2)).toFixed(4));
  const pct = (prob * 100).toFixed(1) + "%";
  return {
    type: "G.13B",
    subtype: "ConcentricCircles",
    outerR,
    innerR,
    answer: prob,
    answerPct: pct,
    steps: [
      {
        instruction: "Probability = (favorable area) ÷ (total area):",
        blanks: [
          { label: "formula", answer: "P = π·r² / π·R²  =  r² / R²" },
        ],
      },
      {
        instruction: `Substitute inner radius r = ${innerR}, outer radius R = ${outerR}:`,
        blanks: [
          { label: "r²", answer: `${innerR}² = ${innerR ** 2}` },
          { label: "R²", answer: `${outerR}² = ${outerR ** 2}` },
          { label: "P", answer: `${innerR ** 2}/${outerR ** 2} ≈ ${pct}` },
        ],
      },
    ],
    svgParams: { kind: "ConcentricCircles", outerR, innerR },
  };
}

function makeSectorProblem(rng: () => number): ProbabilityProblem {
  const sectorAngle = randInt(rng, 1, 11) * 30; // 30, 60, …, 330
  const prob = parseFloat((sectorAngle / 360).toFixed(4));
  const pct = (prob * 100).toFixed(1) + "%";
  const radius = randInt(rng, 4, 10);
  return {
    type: "G.13B",
    subtype: "ShadedSector",
    outerR: radius,
    sectorAngle,
    answer: prob,
    answerPct: pct,
    steps: [
      {
        instruction: "Sector area = (θ/360°) × πr². Probability = sector area ÷ circle area:",
        blanks: [
          { label: "formula", answer: "P = θ / 360°" },
        ],
      },
      {
        instruction: `Substitute sector angle θ = ${sectorAngle}°:`,
        blanks: [
          { label: "θ / 360", answer: `${sectorAngle}° / 360°` },
          { label: "P", answer: `≈ ${pct}` },
        ],
      },
    ],
    svgParams: { kind: "ShadedSector", sectorAngle },
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

const CIRCLE_MAKERS = [
  makeInscribedAngleProblem,
  makeCentralAngleProblem,
  makeTangentProblem,
  makeTwoChordsProblem,
  makeTwoSecantsProblem,
];

const PROB_MAKERS = [makeConcentricProblem, makeSectorProblem];

export class ProblemFactory {
  private rng: () => number;

  constructor(seed?: number) {
    this.rng = mulberry32(seed ?? Date.now());
  }

  /** Generate n problems for G.12(A) */
  generateCircle(n: number): CircleProblem[] {
    return Array.from({ length: n }, () => pick(this.rng, CIRCLE_MAKERS)(this.rng));
  }

  /** Generate n problems for G.13(B) */
  generateProbability(n: number): ProbabilityProblem[] {
    return Array.from({ length: n }, () => pick(this.rng, PROB_MAKERS)(this.rng));
  }

  /** Generate a full set sized for the given output mode */
  generateForMode(mode: OutputMode): MathProblem[] {
    const multiplier = mode === "Review" ? 3 : 1;
    const circleCount = 3 * multiplier;
    const probCount = 2 * multiplier;
    return [
      ...this.generateCircle(circleCount),
      ...this.generateProbability(probCount),
    ];
  }
}
