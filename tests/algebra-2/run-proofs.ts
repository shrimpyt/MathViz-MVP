// run-proofs.ts
// Deep proof-validity testing for A2.P: validateProofShape on every proof,
// per-step truth via INDEPENDENT numeric sampling (trig/log/exp, using
// tests/algebra-2/verify.ts) or symbolic expansion (polynomial), final-step
// == prove, reason-vocabulary check, blank-flag scaffolding requirements,
// difficulty filtering, and seed reproducibility.

import { mulberry32 } from "../../src/lib/math-utils";
import {
  generateProofProblems,
  PROOF_TEMPLATES,
  type ProofFamily,
} from "../../src/lib/factories/Algebra2Proofs";
import { validateProofShape } from "../../src/lib/proofTypes";
import { check, section, deepEqual, report } from "./harness";
import { checkEquationNumeric, checkPolyIdentity, type Env } from "./verify";

// ── Reason vocabulary (patterns the templates are allowed to use) ─────────────

const REASON_PATTERNS: RegExp[] = [
  /^Distributive property$/,
  /^Reciprocal identity$/,
  /^Common denominator$/,
  /^Pythagorean identity$/,
  /^Factor$/,
  /^Quotient identity$/,
  /^Multiply$/,
  /^Given \(Pythagorean identity\)$/,
  /^Divide both sides by (sin|cos)\^2\((θ|x)\)$/,
  /^Distribute; definition of secant$/,
  /^Distribute; definition of cosecant$/,
  /^Quotient identity; simplify$/,
  /^Rewrite A\+B as A-\(-B\)$/,
  /^Difference formula for sine \(given\)$/,
  /^Even\/odd properties$/,
  /^Simplify$/,
  /^Transitive property( of equality)?$/,
  /^Cofunction identit(y|ies)$/,
  /^Regroup terms$/,
  /^Sum formulas for sine and cosine$/,
  /^Divide numerator and denominator by cos\(A\)\*cos\(B\)$/,
  /^2\*A = A \+ A$/,
  /^Sum formula for (sine|cosine) \(given\)$/,
  /^Combine like terms$/,
  /^Definition of square$/,
  /^Definition of m$/,
  /^Definition of n$/,
  /^Exponential form( of step \d+)?$/,
  /^Multiply the equations$/,
  /^Divide the equations$/,
  /^Product of powers$/,
  /^Quotient of powers$/,
  /^Definition of logarithm$/,
  /^Definition of exponent( \(\d+ factors\))?$/,
  /^Remove parentheses$/,
  /^Count factors \(\d+ copies of \d+\)$/,
  /^Power of a power$/,
  /^Raise both sides to the power \d+$/,
  /^Substitution \(steps? 1(, 2)?\)$/,
  /^Opposites cancel$/,
  /^Square of a binomial$/,
];

// ── Samplers (independent of the factories) ───────────────────────────────────

function linspace(rng: () => number, lo: number, hi: number, n: number): number[] {
  return Array.from({ length: n }, () => lo + rng() * (hi - lo));
}

function trigEnvs(rng: () => number, vars: string[]): Env[] {
  const envs: Env[] = [];
  const ranges: Record<string, [number, number]> = { "θ": [0.25, 1.25], x: [0.25, 1.25], A: [-1.2, 1.2], B: [-1, 1] };
  for (let i = 0; i < 24; i++) {
    const e: Env = {};
    for (const v of vars) {
      const [lo, hi] = ranges[v] ?? [-1, 1];
      e[v] = lo + rng() * (hi - lo);
    }
    envs.push(e);
  }
  return envs;
}

function logEnvs(rng: () => number, base: number, vars: string[]): Env[] {
  const envs: Env[] = [];
  for (let i = 0; i < 16; i++) {
    const e: Env = { b: base };
    for (const v of vars) {
      const val = 0.5 + rng() * 5.5;
      e[v] = val;
      if (v === "x") e["m"] = Math.log(val) / Math.log(base);
      if (v === "y") e["n"] = Math.log(val) / Math.log(base);
    }
    envs.push(e);
  }
  return envs;
}
void linspace;

type Kind = "trig1" | "trig2" | "log2" | "log1" | "exp" | "poly";

function checkStepTruth(
  stmt: string,
  kind: Kind,
  rng: () => number,
  vars: string[],
  base: number
): { ok: boolean; detail: string } {
  if (kind === "poly") return checkPolyIdentity(stmt, "x");
  let envs: Env[];
  if (kind === "trig1" || kind === "trig2") envs = trigEnvs(rng, vars);
  else if (kind === "log2") envs = logEnvs(rng, base, vars);
  else if (kind === "log1") envs = logEnvs(rng, base, ["x"]);
  else envs = [{}];
  // constant identities need just one evaluation; sampled ones need breadth
  const minValid = kind === "exp" ? 1 : 8;
  const res = checkEquationNumeric(stmt, envs, 1e-9, minValid);
  if (!res.ok && res.detail.startsWith("eval failed")) {
    // retry with fresh samples once (singularity hit)
    const envs2 = kind === "trig1" || kind === "trig2" ? trigEnvs(rng, vars) : logEnvs(rng, base, vars);
    return checkEquationNumeric(stmt, envs2, 1e-9, minValid);
  }
  return res;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const FAMILIES = PROOF_TEMPLATES.map((t) => t.family);
let proofs = 0;

for (const family of FAMILIES) {
  section(`proof/${family}`);
  const tmpl = PROOF_TEMPLATES.find((t) => t.family === family)!;

  // difficulty filtering: without `only`, a family appears iff difficulty >= minDifficulty.
  // (With an explicit family request, the lesson filter widens rather than
  // returning zero — a lesson never yields no problems.)
  for (const d of [1, 2, 3] as const) {
    const set = generateProofProblems(mulberry32(99), 200, d);
    const appears = set.some((p) => p.family === family);
    const shouldAppear = tmpl.minDifficulty <= d;
    check(appears === shouldAppear, `${family}: difficulty ${d} ${shouldAppear ? "present" : "absent"}`);
    // explicit family request always yields that family (widened if needed)
    const exact = generateProofProblems(mulberry32(99), 10, d, [family]);
    check(
      exact.length === 10 && exact.every((p) => p.family === family),
      `${family}: explicit request at d${d} yields the family`
    );
  }

  for (let si = 0; si < 4; si++) {
    const seed = 5000 + FAMILIES.indexOf(family) * 37 + si;
    const rng = mulberry32(seed);
    const [p] = generateProofProblems(rng, 1, 3, [family]);
    const tag = `${family}#${si}`;
    proofs++;

    check(p.type === "Proof" && p.domain === "algebra2", `${tag}: type/domain`);
    check(p.family === family, `${tag}: family tag`);
    const shapeErrs = validateProofShape(p);
    check(shapeErrs.length === 0, `${tag}: shape: ${shapeErrs.join("; ")}`);

    // final step matches prove, and is never blank
    const last = p.steps[p.steps.length - 1];
    check(!last.blankStatement && !last.blankReason, `${tag}: final step not blanked`);
    const norm = (t: string) => t.replace(/\s+/g, " ").trim();
    check(norm(last.statement) === norm(p.prove), `${tag}: final == prove`);

    // scaffolding: at least 2 flagged cells across the proof
    const flagged = p.steps.filter((s) => s.blankStatement || s.blankReason).length;
    check(flagged >= 2, `${tag}: >=2 flagged cells (got ${flagged})`);

    // givens present except for self-contained exp/poly proofs
    if (family.startsWith("Exp") || family.startsWith("Poly")) {
      check(Array.isArray(p.given), `${tag}: given is array`);
    } else {
      check(p.given.length > 0, `${tag}: givens present`);
    }

    // per-step validity
    const kind = (p.verify?.["kind"] as Kind) ?? "poly";
    const rawVars = p.verify?.["vars"];
    const varList: string[] = Array.isArray(rawVars) ? (rawVars as string[]) : [rawVars as string];
    const base = (p.verify?.["base"] as number) ?? 2;
    p.steps.forEach((s, i) => {
      const stag = `${tag} step ${i + 1}`;
      check(!!s.statement.trim() && !!s.reason.trim(), `${stag}: non-empty`);
      check(
        REASON_PATTERNS.some((re) => re.test(s.reason)),
        `${stag}: reason "${s.reason}" in vocabulary`
      );
      // statement must be a single equation in the canonical grammar
      const eqCount = (s.statement.match(/=/g) ?? []).length;
      check(eqCount === 1, `${stag}: exactly one = (grammar)`);
      const truth = checkStepTruth(s.statement, kind, mulberry32(seed * 7 + i), varList, base);
      check(truth.ok, `${stag}: true as equation${truth.detail ? ": " + truth.detail : ""}`);
    });

    // reproducibility
    const again = generateProofProblems(mulberry32(seed), 1, 3, [family])[0];
    check(deepEqual(p, again), `${tag}: reproducible`);
  }
}

console.log(`proofs checked: ${proofs}`);
report("run-proofs");
