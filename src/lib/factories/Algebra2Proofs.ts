// Algebra2Proofs.ts
// A2.P — Algebra 2 proofs: step-scaffolded "prove the identity" problems.
// Parameterized TEMPLATES ONLY — no free-form generation. Every template
// produces ordered steps that are LOGICALLY VALID as listed: each statement
// follows from the givens + previous steps, and each reason justifies its
// statement. Statements use a restricted canonical grammar (documented in
// tests/algebra-2/verify.ts) so tests can verify every step independently by
// numeric sampling (trig/log) or symbolic expansion (polynomial).
//
// Convention: verification-style proofs restate the LHS in every step
// ("LHS = <current form>"), so the final step IS the prove statement.
// Derivation-style proofs (sum formulas) chain through intermediate results
// and close with transitivity. The final step is never blanked, so
// validateProofShape() checks final-step == prove.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { ProofStep } from "../proofTypes";
import type { Algebra2ProofProblem } from "./Algebra2Types";

export type ProofFamily =
  | "TrigVerify_SecMinusCos"
  | "TrigVerify_TanSinPlusCos"
  | "PythagoreanToSecTan"
  | "PythagoreanToCscCot"
  | "SumFormulaSine"
  | "SumFormulaCosine"
  | "SumFormulaTangent"
  | "DoubleAngleSine"
  | "DoubleAngleCosine"
  | "LogProductRule"
  | "LogQuotientRule"
  | "LogPowerRule"
  | "ExpProductOfPowers"
  | "ExpPowerOfPower"
  | "PolySquareOfBinomial"
  | "PolyDifferenceOfSquares"
  | "PolySumOfCubes"
  | "PolyCubeOfBinomial";

interface Template {
  family: ProofFamily;
  minDifficulty: 1 | 2 | 3;
  make: (rng: RNG) => Algebra2ProofProblem;
}

function S(statement: string, reason: string, blankStatement = false, blankReason = false): ProofStep {
  const s: ProofStep = { statement, reason };
  if (blankStatement) s.blankStatement = true;
  if (blankReason) s.blankReason = true;
  return s;
}

function proof(
  family: ProofFamily,
  given: string[],
  prove: string,
  steps: ProofStep[],
  verify?: Record<string, number | number[] | string | string[] | boolean>
): Algebra2ProofProblem {
  return { type: "Proof", domain: "algebra2", family, given, prove, steps, verify };
}

// ── Trig identity proofs ──────────────────────────────────────────────────────

function trigVerifySecMinusCos(rng: RNG): Algebra2ProofProblem {
  const v = pick(rng, ["θ", "x"]);
  const LHS = `sec(${v}) - cos(${v})`;
  const RHS = `sin(${v})*tan(${v})`;
  return proof(
    "TrigVerify_SecMinusCos",
    [`sin^2(${v}) + cos^2(${v}) = 1`, `sec(${v}) = 1/cos(${v})`, `tan(${v}) = sin(${v})/cos(${v})`, `cos(${v}) ≠ 0`],
    `${LHS} = ${RHS}`,
    [
      S(`${LHS} = 1/cos(${v}) - cos(${v})`, "Reciprocal identity", false, true),
      S(`${LHS} = (1 - cos^2(${v}))/cos(${v})`, "Common denominator", true, false),
      S(`${LHS} = sin^2(${v})/cos(${v})`, "Pythagorean identity", false, true),
      S(`${LHS} = sin(${v})*(sin(${v})/cos(${v}))`, "Factor", false, false),
      S(`${LHS} = ${RHS}`, "Quotient identity"),
    ],
    { vars: v, kind: "trig1" }
  );
}

function trigVerifyTanSinPlusCos(rng: RNG): Algebra2ProofProblem {
  const v = pick(rng, ["θ", "x"]);
  const LHS = `tan(${v})*sin(${v}) + cos(${v})`;
  return proof(
    "TrigVerify_TanSinPlusCos",
    [`sin^2(${v}) + cos^2(${v}) = 1`, `tan(${v}) = sin(${v})/cos(${v})`, `sec(${v}) = 1/cos(${v})`, `cos(${v}) ≠ 0`],
    `${LHS} = sec(${v})`,
    [
      S(`${LHS} = (sin(${v})/cos(${v}))*sin(${v}) + cos(${v})`, "Quotient identity", false, true),
      S(`${LHS} = sin^2(${v})/cos(${v}) + cos(${v})`, "Multiply", true, false),
      S(`${LHS} = (sin^2(${v}) + cos^2(${v}))/cos(${v})`, "Common denominator", false, true),
      S(`${LHS} = 1/cos(${v})`, "Pythagorean identity", false, false),
      S(`${LHS} = sec(${v})`, "Reciprocal identity"),
    ],
    { vars: v, kind: "trig1" }
  );
}

function pythagoreanToSecTan(rng: RNG): Algebra2ProofProblem {
  const v = pick(rng, ["θ", "x"]);
  return proof(
    "PythagoreanToSecTan",
    [`sin^2(${v}) + cos^2(${v}) = 1 (Pythagorean identity)`, `cos(${v}) ≠ 0`],
    `tan^2(${v}) + 1 = sec^2(${v})`,
    [
      S(`sin^2(${v}) + cos^2(${v}) = 1`, "Given (Pythagorean identity)", false, false),
      S(`(sin^2(${v}) + cos^2(${v}))/cos^2(${v}) = 1/cos^2(${v})`, `Divide both sides by cos^2(${v})`, true, false),
      S(`sin^2(${v})/cos^2(${v}) + cos^2(${v})/cos^2(${v}) = sec^2(${v})`, "Distribute; definition of secant", false, true),
      S(`tan^2(${v}) + 1 = sec^2(${v})`, "Quotient identity; simplify"),
    ],
    { vars: v, kind: "trig1" }
  );
}

function pythagoreanToCscCot(rng: RNG): Algebra2ProofProblem {
  const v = pick(rng, ["θ", "x"]);
  return proof(
    "PythagoreanToCscCot",
    [`sin^2(${v}) + cos^2(${v}) = 1 (Pythagorean identity)`, `sin(${v}) ≠ 0`],
    `1 + cot^2(${v}) = csc^2(${v})`,
    [
      S(`sin^2(${v}) + cos^2(${v}) = 1`, "Given (Pythagorean identity)", false, false),
      S(`(sin^2(${v}) + cos^2(${v}))/sin^2(${v}) = 1/sin^2(${v})`, `Divide both sides by sin^2(${v})`, false, true),
      S(`sin^2(${v})/sin^2(${v}) + cos^2(${v})/sin^2(${v}) = csc^2(${v})`, "Distribute; definition of cosecant", true, false),
      S(`1 + cot^2(${v}) = csc^2(${v})`, "Quotient identity; simplify"),
    ],
    { vars: v, kind: "trig1" }
  );
}

function sumFormulaSine(): Algebra2ProofProblem {
  return proof(
    "SumFormulaSine",
    ["sin(A-B) = sin(A)*cos(B) - cos(A)*sin(B)", "cos(-B) = cos(B) (even)", "sin(-B) = -sin(B) (odd)"],
    "sin(A+B) = sin(A)*cos(B) + cos(A)*sin(B)",
    [
      S("sin(A+B) = sin(A-(-B))", "Rewrite A+B as A-(-B)", false, true),
      S("sin(A-(-B)) = sin(A)*cos(-B) - cos(A)*sin(-B)", "Difference formula for sine (given)", false, false),
      S("sin(A)*cos(-B) - cos(A)*sin(-B) = sin(A)*cos(B) - cos(A)*(-sin(B))", "Even/odd properties", true, false),
      S("sin(A)*cos(B) - cos(A)*(-sin(B)) = sin(A)*cos(B) + cos(A)*sin(B)", "Simplify", false, true),
      S("sin(A+B) = sin(A)*cos(B) + cos(A)*sin(B)", "Transitive property of equality"),
    ],
    { vars: ["A", "B"], kind: "trig2" }
  );
}

function sumFormulaCosine(): Algebra2ProofProblem {
  return proof(
    "SumFormulaCosine",
    ["sin(U-V) = sin(U)*cos(V) - cos(U)*sin(V)", "sin(π/2 - u) = cos(u) (cofunction)", "cos(π/2 - u) = sin(u) (cofunction)"],
    "cos(A+B) = cos(A)*cos(B) - sin(A)*sin(B)",
    [
      S("cos(A+B) = sin(π/2-(A+B))", "Cofunction identity", false, true),
      S("π/2-(A+B) = (π/2-A)-B", "Regroup terms", true, false),
      S("sin((π/2-A)-B) = sin(π/2-A)*cos(B) - cos(π/2-A)*sin(B)", "Difference formula for sine (given)", false, false),
      S("sin(π/2-A)*cos(B) - cos(π/2-A)*sin(B) = cos(A)*cos(B) - sin(A)*sin(B)", "Cofunction identities", false, true),
      S("cos(A+B) = cos(A)*cos(B) - sin(A)*sin(B)", "Transitive property of equality"),
    ],
    { vars: ["A", "B"], kind: "trig2" }
  );
}

function sumFormulaTangent(): Algebra2ProofProblem {
  return proof(
    "SumFormulaTangent",
    ["sin(A+B) = sin(A)*cos(B) + cos(A)*sin(B)", "cos(A+B) = cos(A)*cos(B) - sin(A)*sin(B)", "tan(u) = sin(u)/cos(u)", "cos(A) ≠ 0, cos(B) ≠ 0"],
    "tan(A+B) = (tan(A) + tan(B))/(1 - tan(A)*tan(B))",
    [
      S("tan(A+B) = sin(A+B)/cos(A+B)", "Quotient identity", false, true),
      S("sin(A+B)/cos(A+B) = (sin(A)*cos(B) + cos(A)*sin(B))/(cos(A)*cos(B) - sin(A)*sin(B))", "Sum formulas for sine and cosine", false, false),
      S("(sin(A)*cos(B) + cos(A)*sin(B))/(cos(A)*cos(B) - sin(A)*sin(B)) = (tan(A) + tan(B))/(1 - tan(A)*tan(B))", "Divide numerator and denominator by cos(A)*cos(B)", true, false),
      S("tan(A+B) = (tan(A) + tan(B))/(1 - tan(A)*tan(B))", "Transitive property of equality"),
    ],
    { vars: ["A", "B"], kind: "trig2" }
  );
}

function doubleAngleSine(): Algebra2ProofProblem {
  return proof(
    "DoubleAngleSine",
    ["sin(A+B) = sin(A)*cos(B) + cos(A)*sin(B)"],
    "sin(2*A) = 2*sin(A)*cos(A)",
    [
      S("sin(2*A) = sin(A+A)", "2*A = A + A", false, true),
      S("sin(A+A) = sin(A)*cos(A) + cos(A)*sin(A)", "Sum formula for sine (given)", false, false),
      S("sin(A)*cos(A) + cos(A)*sin(A) = 2*sin(A)*cos(A)", "Combine like terms", true, false),
      S("sin(2*A) = 2*sin(A)*cos(A)", "Transitive property of equality"),
    ],
    { vars: ["A"], kind: "trig1" }
  );
}

function doubleAngleCosine(): Algebra2ProofProblem {
  return proof(
    "DoubleAngleCosine",
    ["cos(A+B) = cos(A)*cos(B) - sin(A)*sin(B)", "sin^2(A) + cos^2(A) = 1"],
    "cos(2*A) = 2*cos^2(A) - 1",
    [
      S("cos(2*A) = cos(A+A)", "2*A = A + A", false, true),
      S("cos(A+A) = cos(A)*cos(A) - sin(A)*sin(A)", "Sum formula for cosine (given)", false, false),
      S("cos(A)*cos(A) - sin(A)*sin(A) = cos^2(A) - sin^2(A)", "Definition of square", true, false),
      S("cos^2(A) - sin^2(A) = cos^2(A) - (1 - cos^2(A))", "Pythagorean identity", false, true),
      S("cos^2(A) - (1 - cos^2(A)) = 2*cos^2(A) - 1", "Simplify", false, false),
      S("cos(2*A) = 2*cos^2(A) - 1", "Transitive property of equality"),
    ],
    { vars: ["A"], kind: "trig1" }
  );
}

// ── Logarithm / exponent property proofs ──────────────────────────────────────

function logProductRule(rng: RNG): Algebra2ProofProblem {
  const b = pick(rng, [2, 3]);
  return proof(
    "LogProductRule",
    [`x > 0`, `y > 0`, `b = ${b} > 0, b ≠ 1`],
    `log_${b}(x*y) = log_${b}(x) + log_${b}(y)`,
    [
      S(`m = log_${b}(x)`, "Definition of m", false, false),
      S(`n = log_${b}(y)`, "Definition of n", false, false),
      S(`b^m = x`, "Exponential form of step 1", false, true),
      S(`b^n = y`, "Exponential form of step 2", false, false),
      S(`x*y = b^m*b^n`, "Multiply the equations", true, false),
      S(`b^m*b^n = b^(m+n)`, "Product of powers", false, true),
      S(`x*y = b^(m+n)`, "Transitive property", false, false),
      S(`log_${b}(x*y) = m + n`, "Definition of logarithm", true, false),
      S(`m + n = log_${b}(x) + log_${b}(y)`, "Substitution (steps 1, 2)", false, false),
      S(`log_${b}(x*y) = log_${b}(x) + log_${b}(y)`, "Transitive property of equality"),
    ],
    { base: b, vars: ["x", "y"], kind: "log2" }
  );
}

function logQuotientRule(rng: RNG): Algebra2ProofProblem {
  const b = pick(rng, [2, 3]);
  return proof(
    "LogQuotientRule",
    [`x > 0`, `y > 0`, `b = ${b} > 0, b ≠ 1`],
    `log_${b}(x/y) = log_${b}(x) - log_${b}(y)`,
    [
      S(`m = log_${b}(x)`, "Definition of m", false, false),
      S(`n = log_${b}(y)`, "Definition of n", false, false),
      S(`b^m = x`, "Exponential form of step 1", false, true),
      S(`b^n = y`, "Exponential form of step 2", false, false),
      S(`x/y = b^m/b^n`, "Divide the equations", true, false),
      S(`b^m/b^n = b^(m-n)`, "Quotient of powers", false, true),
      S(`x/y = b^(m-n)`, "Transitive property", false, false),
      S(`log_${b}(x/y) = m - n`, "Definition of logarithm", true, false),
      S(`m - n = log_${b}(x) - log_${b}(y)`, "Substitution (steps 1, 2)", false, false),
      S(`log_${b}(x/y) = log_${b}(x) - log_${b}(y)`, "Transitive property of equality"),
    ],
    { base: b, vars: ["x", "y"], kind: "log2" }
  );
}

function logPowerRule(rng: RNG): Algebra2ProofProblem {
  const b = pick(rng, [2, 3]);
  const n = pick(rng, [2, 3]);
  return proof(
    "LogPowerRule",
    [`x > 0`, `b = ${b} > 0, b ≠ 1`, `n = ${n}`],
    `log_${b}(x^${n}) = ${n}*log_${b}(x)`,
    [
      S(`m = log_${b}(x)`, "Definition of m", false, false),
      S(`b^m = x`, "Exponential form", false, true),
      S(`(b^m)^${n} = x^${n}`, `Raise both sides to the power ${n}`, true, false),
      S(`(b^m)^${n} = b^(m*${n})`, "Power of a power", false, true),
      S(`x^${n} = b^(m*${n})`, "Transitive property", false, false),
      S(`log_${b}(x^${n}) = m*${n}`, "Definition of logarithm", false, false),
      S(`m*${n} = ${n}*log_${b}(x)`, "Substitution (step 1)", true, false),
      S(`log_${b}(x^${n}) = ${n}*log_${b}(x)`, "Transitive property of equality"),
    ],
    { base: b, vars: ["x"], n, kind: "log1" }
  );
}

function expProductOfPowers(rng: RNG): Algebra2ProofProblem {
  const b = pick(rng, [2, 3]);
  const m = randInt(rng, 2, 4);
  const n = randInt(rng, 2, 4);
  const lhs = `${b}^${m}*${b}^${n}`;
  const rhs = `${b}^${m + n}`;
  const exp1 = `(${Array(m).fill(b).join("*")})`;
  const exp2 = `(${Array(n).fill(b).join("*")})`;
  const all = Array(m + n).fill(b).join("*");
  return proof(
    "ExpProductOfPowers",
    [],
    `${lhs} = ${rhs}`,
    [
      S(`${lhs} = ${exp1}*${exp2}`, "Definition of exponent", false, true),
      S(`${exp1}*${exp2} = ${all}`, "Remove parentheses", true, false),
      S(`${all} = ${rhs}`, `Definition of exponent (${m + n} factors)`, false, false),
      S(`${lhs} = ${rhs}`, "Transitive property of equality"),
    ],
    { base: b, m, n, kind: "exp" }
  );
}

function expPowerOfPower(rng: RNG): Algebra2ProofProblem {
  const b = pick(rng, [2, 3]);
  const m = randInt(rng, 2, 3);
  const n = randInt(rng, 2, 3);
  const lhs = `(${b}^${m})^${n}`;
  const rhs = `${b}^${m * n}`;
  const inner = `(${Array(m).fill(b).join("*")})`;
  const expanded = Array(n).fill(inner).join("*");
  const all = Array(m * n).fill(b).join("*");
  return proof(
    "ExpPowerOfPower",
    [],
    `${lhs} = ${rhs}`,
    [
      S(`${lhs} = ${expanded}`, "Definition of exponent", false, true),
      S(`${expanded} = ${all}`, `Count factors (${m * n} copies of ${b})`, true, false),
      S(`${all} = ${rhs}`, "Definition of exponent", false, false),
      S(`${lhs} = ${rhs}`, "Transitive property of equality"),
    ],
    { base: b, m, n, kind: "exp" }
  );
}

// ── Polynomial identity proofs ────────────────────────────────────────────────

function polySquareOfBinomial(rng: RNG): Algebra2ProofProblem {
  const k = randInt(rng, 2, 5);
  return proof(
    "PolySquareOfBinomial",
    [],
    `(x+${k})^2 = x^2 + ${2 * k}*x + ${k * k}`,
    [
      S(`(x+${k})^2 = (x+${k})*(x+${k})`, "Definition of exponent", false, true),
      S(`(x+${k})*(x+${k}) = x^2 + ${k}*x + ${k}*x + ${k * k}`, "Distributive property", true, false),
      S(`x^2 + ${k}*x + ${k}*x + ${k * k} = x^2 + ${2 * k}*x + ${k * k}`, "Combine like terms", false, true),
      S(`(x+${k})^2 = x^2 + ${2 * k}*x + ${k * k}`, "Transitive property of equality"),
    ],
    { k, kind: "poly" }
  );
}

function polyDifferenceOfSquares(rng: RNG): Algebra2ProofProblem {
  const k = randInt(rng, 2, 5);
  return proof(
    "PolyDifferenceOfSquares",
    [],
    `(x+${k})*(x-${k}) = x^2 - ${k * k}`,
    [
      S(`(x+${k})*(x-${k}) = x^2 - ${k}*x + ${k}*x - ${k * k}`, "Distributive property", false, true),
      S(`x^2 - ${k}*x + ${k}*x - ${k * k} = x^2 - ${k * k}`, "Opposites cancel", true, false),
      S(`(x+${k})*(x-${k}) = x^2 - ${k * k}`, "Transitive property of equality"),
    ],
    { k, kind: "poly" }
  );
}

function polySumOfCubes(rng: RNG): Algebra2ProofProblem {
  const k = randInt(rng, 2, 4);
  const k2 = k * k, k3 = k2 * k;
  return proof(
    "PolySumOfCubes",
    [],
    `(x+${k})*(x^2-${k}*x+${k2}) = x^3 + ${k3}`,
    [
      S(
        `(x+${k})*(x^2-${k}*x+${k2}) = x^3 - ${k}*x^2 + ${k2}*x + ${k}*x^2 - ${k2}*x + ${k3}`,
        "Distributive property",
        false, true
      ),
      S(
        `x^3 - ${k}*x^2 + ${k2}*x + ${k}*x^2 - ${k2}*x + ${k3} = x^3 + ${k3}`,
        "Combine like terms",
        true, false
      ),
      S(`(x+${k})*(x^2-${k}*x+${k2}) = x^3 + ${k3}`, "Transitive property of equality"),
    ],
    { k, kind: "poly" }
  );
}

function polyCubeOfBinomial(rng: RNG): Algebra2ProofProblem {
  const k = randInt(rng, 2, 4);
  const k2 = k * k, k3 = k2 * k;
  return proof(
    "PolyCubeOfBinomial",
    [],
    `(x+${k})^3 = x^3 + ${3 * k}*x^2 + ${3 * k2}*x + ${k3}`,
    [
      S(`(x+${k})^3 = (x+${k})^2*(x+${k})`, "Definition of exponent", false, true),
      S(`(x+${k})^2*(x+${k}) = (x^2+${2 * k}*x+${k2})*(x+${k})`, "Square of a binomial", true, false),
      S(
        `(x^2+${2 * k}*x+${k2})*(x+${k}) = x^3 + ${k}*x^2 + ${2 * k}*x^2 + ${2 * k2}*x + ${k2}*x + ${k3}`,
        "Distributive property",
        false, true
      ),
      S(
        `x^3 + ${k}*x^2 + ${2 * k}*x^2 + ${2 * k2}*x + ${k2}*x + ${k3} = x^3 + ${3 * k}*x^2 + ${3 * k2}*x + ${k3}`,
        "Combine like terms",
        false, false
      ),
      S(`(x+${k})^3 = x^3 + ${3 * k}*x^2 + ${3 * k2}*x + ${k3}`, "Transitive property of equality"),
    ],
    { k, kind: "poly" }
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

const TEMPLATES: Template[] = [
  { family: "TrigVerify_SecMinusCos", minDifficulty: 1, make: trigVerifySecMinusCos },
  { family: "TrigVerify_TanSinPlusCos", minDifficulty: 1, make: trigVerifyTanSinPlusCos },
  { family: "LogPowerRule", minDifficulty: 1, make: logPowerRule },
  { family: "ExpProductOfPowers", minDifficulty: 1, make: expProductOfPowers },
  { family: "ExpPowerOfPower", minDifficulty: 1, make: expPowerOfPower },
  { family: "PolySquareOfBinomial", minDifficulty: 1, make: polySquareOfBinomial },
  { family: "PolyDifferenceOfSquares", minDifficulty: 1, make: polyDifferenceOfSquares },
  { family: "PythagoreanToSecTan", minDifficulty: 2, make: pythagoreanToSecTan },
  { family: "PythagoreanToCscCot", minDifficulty: 2, make: pythagoreanToCscCot },
  { family: "LogProductRule", minDifficulty: 2, make: logProductRule },
  { family: "LogQuotientRule", minDifficulty: 2, make: logQuotientRule },
  { family: "PolySumOfCubes", minDifficulty: 2, make: polySumOfCubes },
  { family: "SumFormulaSine", minDifficulty: 3, make: () => sumFormulaSine() },
  { family: "SumFormulaCosine", minDifficulty: 3, make: () => sumFormulaCosine() },
  { family: "SumFormulaTangent", minDifficulty: 3, make: () => sumFormulaTangent() },
  { family: "DoubleAngleSine", minDifficulty: 3, make: () => doubleAngleSine() },
  { family: "DoubleAngleCosine", minDifficulty: 3, make: () => doubleAngleCosine() },
  { family: "PolyCubeOfBinomial", minDifficulty: 3, make: polyCubeOfBinomial },
];

function groupOf(f: ProofFamily): string {
  if (f.startsWith("Trig") || f.startsWith("Pythagorean") || f.startsWith("SumFormula") || f.startsWith("DoubleAngle"))
    return "trig";
  if (f.startsWith("Log") || f.startsWith("Exp")) return "log";
  return "poly";
}

/**
 * Generate n algebra-2 proof problems at the given cumulative difficulty tier.
 * `only` optionally restricts to families (exact names or "trig"|"log"|"poly"
 * groups) for lesson wiring. Like selectMakers, a lesson never yields zero
 * problems: if nothing at this difficulty matches, the difficulty filter is
 * widened before giving up.
 */
export function generateProofProblems(
  rng: RNG,
  n: number,
  difficulty: 1 | 2 | 3 = 2,
  only?: readonly string[]
): Algebra2ProofProblem[] {
  const allowed = TEMPLATES.filter((t) => t.minDifficulty <= difficulty);
  const base = allowed.length > 0 ? allowed : TEMPLATES;
  const matches = (t: Template): boolean => {
    if (!only) return true;
    return only.includes(t.family) || only.includes(groupOf(t.family));
  };
  let pool = base.filter(matches);
  if (pool.length === 0) pool = TEMPLATES.filter(matches);
  if (pool.length === 0) pool = base;
  return Array.from({ length: n }, () => pool[Math.floor(rng() * pool.length)].make(rng));
}

export const PROOF_TEMPLATES = TEMPLATES;
