// fuzz.ts
// Fuzz thousands of seeds across every factory, hunting invalid problems:
// zero leading coefficients, accidental degenerate systems, negative
// discriminants where real solutions are expected, non-finite diagram data.
// Also re-checks seed reproducibility on a sample.
//
// Run: npx tsx tests/algebra-1/fuzz.ts

import { mulberry32 } from "../../src/lib/math-utils";
import { generateEquationProblems } from "../../src/lib/factories/Algebra1Equations";
import { generateLinearProblems } from "../../src/lib/factories/Algebra1Linear";
import { generateSystemProblems } from "../../src/lib/factories/Algebra1Systems";
import { generateExponentProblems } from "../../src/lib/factories/Algebra1Exponents";
import { generatePolynomialProblems } from "../../src/lib/factories/Algebra1Polynomials";
import { generateQuadraticProblems } from "../../src/lib/factories/Algebra1Quadratics";
import { generateExponentialProblems } from "../../src/lib/factories/Algebra1Exponential";
import { generateSequenceProblems } from "../../src/lib/factories/Algebra1Sequences";
import { generateStatisticsProblems } from "../../src/lib/factories/Algebra1Statistics";
import { generateAlgebra1Mixed } from "../../src/modules/algebra-1";
import type { DifficultyLevel } from "../../src/modules/CurriculumRegistry";
import { verifyProblem } from "./verify";

const FACTORIES = [
  generateEquationProblems,
  generateLinearProblems,
  generateSystemProblems,
  generateExponentProblems,
  generatePolynomialProblems,
  generateQuadraticProblems,
  generateExponentialProblems,
  generateSequenceProblems,
  generateStatisticsProblems,
];

const SEEDS = 4000;
let totalChecks = 0;
let totalProblems = 0;
const failures: string[] = [];
let degenerateIntentional = 0;
let degenerateAccidental = 0;
let negativeDiscriminant = 0;

for (let s = 0; s < SEEDS; s++) {
  const seed = 777000 + s * 13;
  const rng = mulberry32(seed);
  const difficulty = ((s % 3) + 1) as DifficultyLevel;
  const gen = FACTORIES[s % FACTORIES.length];
  const problems = gen(mulberry32(seed), 3, difficulty);
  // Mixed review every 10th seed.
  const extra = s % 10 === 0 ? generateAlgebra1Mixed(mulberry32(seed + 1), 3, difficulty) : [];
  for (const p of [...problems, ...extra]) {
    totalProblems++;
    const id = `fuzz#${s}[${p.subtype}]`;
    const r = verifyProblem(p, id);
    totalChecks += r.checks;
    failures.push(...r.failures);
    // Invalid-problem hunting (independent of the verifier's own asserts).
    const m = p.meta as { kind: string; degenerate?: string; a?: number };
    if (m.kind === "system") {
      const mm = m as { a1: number; b1: number; a2: number; b2: number; degenerate: string };
      const det = mm.a1 * mm.b2 - mm.a2 * mm.b1;
      if (det === 0) {
        if (mm.degenerate === "none") degenerateAccidental++;
        else degenerateIntentional++;
      }
    }
    if (m.kind === "quadratic" && (p.subtype === "QuadraticFactoring" || p.subtype === "QuadraticFormula")) {
      const q = m as { a: number; b: number; c: number };
      if (q.b * q.b - 4 * q.a * q.c < 0) negativeDiscriminant++;
    }
    if (m.kind === "quadratic" || m.kind === "quadAttributes") {
      const q = m as { a: number };
      if (q.a === 0) failures.push(`${id}: ZERO leading coefficient`);
      totalChecks++;
    }
  }
  // Seed reproducibility sample: every 500th seed regenerates identically.
  if (s % 500 === 0) {
    const a = gen(mulberry32(seed), 3, difficulty);
    const b = gen(mulberry32(seed), 3, difficulty);
    totalChecks++;
    if (JSON.stringify(a) !== JSON.stringify(b)) failures.push(`fuzz#${s}: not reproducible`);
  }
}

console.log("=== FUZZ ===");
console.log(`seeds: ${SEEDS}`);
console.log(`problems: ${totalProblems}`);
console.log(`checks: ${totalChecks}`);
console.log(`intentional degenerate systems: ${degenerateIntentional}`);
console.log(`accidental degenerate systems: ${degenerateAccidental}`);
console.log(`negative discriminants (factoring/formula): ${negativeDiscriminant}`);
console.log(`failures: ${failures.length}`);
for (const f of failures.slice(0, 30)) console.log("FAIL:", f);
if (failures.length > 30) console.log(`... and ${failures.length - 30} more`);
process.exit(failures.length > 0 ? 1 : 0);
