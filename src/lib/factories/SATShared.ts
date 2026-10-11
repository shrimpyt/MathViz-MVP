// SATShared.ts
// Shared helpers for the SAT math factories: exact rational arithmetic,
// MCQ option assembly with collision fail-fast, and format selection.
//
// Pure + seeded. No JSX. Factories import types from ../satTypes with
// `import type` only, so there is no runtime import cycle.

import type { RNG } from "../math-utils";
import { randInt } from "../math-utils";
import type {
  SATDifficulty,
  SATDistractor,
  SATFormat,
  SATMisconception,
  SATProblem,
} from "../satTypes";

// ── Maker signature ───────────────────────────────────────────────────────────

/** A single SAT problem maker: seeded RNG + difficulty tier → problem. */
export type SATMaker = (rng: RNG, difficulty: SATDifficulty) => SATProblem;
export type SATHOAMaker = SATMaker;
export type SATPSDAMaker = SATMaker;
export type SATPAMMaker = SATMaker;
export type SATATMMaker = SATMaker;

// ── Exact rational arithmetic ─────────────────────────────────────────────────
// Answers are tracked as reduced fractions so "1/2 vs 0.5" equivalence,
// distractor collisions, and independent verification are all exact.

export interface Frac {
  num: number; // reduced; sign lives on the numerator
  den: number; // > 0
}

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a || 1;
}

/** Reduced fraction; denominator normalized positive. */
export function q(num: number, den = 1): Frac {
  if (!Number.isInteger(num) || !Number.isInteger(den) || den === 0) {
    throw new Error(`q() requires integers, got ${num}/${den}`);
  }
  if (den < 0) {
    num = -num;
    den = -den;
  }
  const g = gcd(num, den);
  return { num: num / g, den: den / g };
}

export function qVal(f: Frac): number {
  return f.num / f.den;
}

/** Display label: "5", "-3", "3/2", "-7/4". */
export function qLabel(f: Frac): string {
  if (f.den === 1) return String(f.num);
  return `${f.num}/${f.den}`;
}

export function qEq(a: Frac, b: Frac): boolean {
  return a.num === b.num && a.den === b.den;
}

/** True when the reduced denominator only has prime factors 2 and 5. */
function terminates(f: Frac): boolean {
  let d = f.den;
  while (d % 2 === 0) d /= 2;
  while (d % 5 === 0) d /= 5;
  return d === 1;
}

/** Exact decimal expansion of a terminating fraction (no float dust). */
function decimalExpansion(f: Frac): string {
  const sign = f.num < 0 ? "-" : "";
  const n = Math.abs(f.num);
  const int = Math.floor(n / f.den);
  let rem = n % f.den;
  let frac = "";
  while (rem !== 0) {
    rem *= 10;
    frac += String(Math.floor(rem / f.den));
    rem = rem % f.den;
  }
  return `${sign}${int}${frac ? "." + frac : ""}`;
}

/**
 * Every acceptable exact grid-in form for a rational answer:
 * the fraction label plus the exact decimal when it terminates.
 * e.g. 1/2 → ["1/2", "0.5"]; 5 → ["5"]; 1/3 → ["1/3"].
 */
export function qForms(f: Frac): string[] {
  const forms = [qLabel(f)];
  if (f.den !== 1 && terminates(f)) {
    const dec = decimalExpansion(f);
    if (dec !== forms[0]) forms.push(dec);
  }
  return forms;
}

// ── MCQ assembly ──────────────────────────────────────────────────────────────

export interface DistractorSpec {
  label: string;
  value: number;
  misconception: SATMisconception;
  note: string;
}

const LETTERS = ["A", "B", "C", "D"] as const;

/**
 * Assemble 4 options in A–D display order with the key shuffled in.
 * FAILS FAST if any two options share a numeric value — an accidentally
 * correct distractor is a generator bug, never silently shipped.
 */
export function buildMCQ(
  rng: RNG,
  key: { label: string; value: number },
  distractors: [DistractorSpec, DistractorSpec, DistractorSpec]
): { options: [SATDistractor, SATDistractor, SATDistractor, SATDistractor]; keyIndex: 0 | 1 | 2 | 3 } {
  const vals = [key.value, ...distractors.map((d) => d.value)];
  for (let i = 0; i < vals.length; i++) {
    for (let j = i + 1; j < vals.length; j++) {
      if (Math.abs(vals[i] - vals[j]) < 1e-9) {
        throw new Error(
          `SAT distractor collision: options ${i} and ${j} both ≈ ${vals[i]}`
        );
      }
    }
  }
  // Shuffle: 4 slots, key goes to a random one.
  const order = [0, 1, 2, 3];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const keySlot = order[0];
  const options = [] as SATDistractor[];
  let di = 0;
  for (let slot = 0; slot < 4; slot++) {
    if (slot === keySlot) {
      options.push({
        option: LETTERS[slot],
        label: key.label,
        value: key.value,
        isKey: true,
      });
    } else {
      const d = distractors[di++];
      options.push({
        option: LETTERS[slot],
        label: d.label,
        value: d.value,
        misconception: d.misconception,
        misconceptionNote: d.note,
        isKey: false,
      });
    }
  }
  return {
    options: options as [SATDistractor, SATDistractor, SATDistractor, SATDistractor],
    keyIndex: keySlot as 0 | 1 | 2 | 3,
  };
}

/** ~3:1 MCQ to grid-in mix, mirroring the digital SAT. */
export function chooseFormat(rng: RNG): SATFormat {
  return rng() < 0.75 ? "MCQ" : "GridIn";
}

/**
 * Choose 3 distractors from a pool of documented-error candidates, dropping
 * any candidate that collides with the key or with an already-chosen
 * candidate. Fails fast if fewer than 3 survive — a pool that small is a
 * maker bug. (buildMCQ re-checks as defense in depth.)
 */
export function pickDistractors(
  rng: RNG,
  keyValue: number,
  pool: DistractorSpec[]
): [DistractorSpec, DistractorSpec, DistractorSpec] {
  const distinct: DistractorSpec[] = [];
  for (const d of pool) {
    if (Math.abs(d.value - keyValue) < 1e-9) continue;
    if (distinct.some((c) => Math.abs(c.value - d.value) < 1e-9)) continue;
    distinct.push(d);
  }
  if (distinct.length < 3) {
    throw new Error(
      `pickDistractors: only ${distinct.length} distinct distractors survived for key ${keyValue}; ` +
        `pool values were [${pool.map((d) => d.value).join(", ")}]`
    );
  }
  for (let i = distinct.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [distinct[i], distinct[j]] = [distinct[j], distinct[i]];
  }
  return [distinct[0], distinct[1], distinct[2]];
}

/** Random integer in [min,max] excluding any values in `avoid`. */
export function randIntAvoid(rng: RNG, min: number, max: number, avoid: number[] = []): number {
  for (let tries = 0; tries < 50; tries++) {
    const v = randInt(rng, min, max);
    if (!avoid.includes(v)) return v;
  }
  // Fallback: widen the range rather than loop forever.
  return randInt(rng, min, max + avoid.length + 2);
}

/** Display for multiples of π, e.g. 36 → "36π", 1 → "π". */
export function piLabel(coef: number): string {
  if (coef === 1) return "π";
  if (coef === -1) return "-π";
  return `${coef}π`;
}

// ── Problem assembly ──────────────────────────────────────────────────────────

export interface ProblemSpec {
  domain: SATProblem["domain"];
  subdomain: string;
  standard: string;
  difficulty: SATDifficulty;
  stem: string;
  diagram?: SATProblem["diagram"];
  key: { label: string; value: number };
  explanation: string;
  verify: SATProblem["verify"];
  format: SATFormat;
  /** Required when format is MCQ: exactly three documented distractors. */
  mcqDistractors?: [DistractorSpec, DistractorSpec, DistractorSpec];
  /** Grid-in: every acceptable exact form. Defaults to [key.label]. */
  gridInForms?: string[];
}

/** Assemble a complete SATProblem from a maker spec (MCQ or grid-in). */
export function assembleProblem(rng: RNG, spec: ProblemSpec): SATProblem {
  const base = {
    type: "SAT" as const,
    format: spec.format,
    domain: spec.domain,
    subdomain: spec.subdomain,
    standard: spec.standard,
    difficulty: spec.difficulty,
    stem: spec.stem,
    key: spec.key.label,
    keyValue: spec.key.value,
    explanation: spec.explanation,
    verify: spec.verify,
  };
  const diagram = spec.diagram ? { diagram: spec.diagram } : {};
  if (spec.format === "MCQ") {
    if (!spec.mcqDistractors) {
      throw new Error(`MCQ problem ${spec.subdomain} is missing distractors`);
    }
    const { options, keyIndex } = buildMCQ(rng, spec.key, spec.mcqDistractors);
    return { ...base, ...diagram, options, keyIndex };
  }
  return {
    ...base,
    ...diagram,
    acceptedForms: spec.gridInForms ?? [spec.key.label],
  };
}

/**
 * Cumulative difficulty tier: difficulty 1 → always tier 1;
 * difficulty 2 → tier 1–2; difficulty 3 → tier 1–3.
 */
export function tier(rng: RNG, difficulty: SATDifficulty): SATDifficulty {
  return (1 + Math.floor(rng() * difficulty)) as SATDifficulty;
}
