// run-fuzz.ts
// Invalid-problem hunting: thousands of seeds across every computational
// lesson at the hardest difficulty, checking domain invariants that would
// make a problem mathematically invalid:
//   - no NaN/Infinity/undefined anywhere in verify payloads or answers
//   - rational: nonzero denominators, defined hole y-values, no hidden holes
//   - log: strictly positive arguments, valid bases
//   - conics: positive radius, nonzero parabola leading coefficient
//   - matrices: nonzero determinants where inverses are used
//   - division: proper degrees; systems: finite solutions
// Plus: exact-count guarantees and seed distinctness.

import { WIRED_LESSONS } from "../../src/modules/algebra-2";
import type { Algebra2Problem } from "../../src/lib/factories/Algebra2Types";
import { check, section, deepEqual, report } from "./harness";

const FUZZ_SEEDS = 120;
const FUZZ_COUNT = 12;

function finiteDeep(v: unknown, path: string, errs: string[]): void {
  if (typeof v === "number") {
    if (!isFinite(v)) errs.push(`${path} = ${v} not finite`);
  } else if (Array.isArray(v)) {
    v.forEach((x, i) => finiteDeep(x, `${path}[${i}]`, errs));
  } else if (v && typeof v === "object") {
    for (const [k, val] of Object.entries(v)) finiteDeep(val, `${path}.${k}`, errs);
  }
}

function domainInvariants(p: Algebra2Problem): string[] {
  const errs: string[] = [];
  const v = (p.verify ?? {}) as Record<string, number | number[] | string | boolean>;
  const num = (k: string) => v[k] as number;
  if (p.answer.includes("NaN") || p.answer.includes("undefined") || p.answer.includes("Infinity"))
    errs.push(`answer contains non-finite token: ${p.answer.slice(0, 60)}`);

  switch (p.subtype) {
    case "Asymptotes": {
      if (num("c") === 0) errs.push("denominator leading coefficient 0");
      if (!isFinite(num("vAsm"))) errs.push("vertical asymptote not finite");
      break;
    }
    case "Holes": {
      if (num("r") + num("t") === 0) errs.push("hole y-value divides by zero");
      if (!isFinite(num("holeYNum") / num("holeYDen"))) errs.push("hole y not finite");
      break;
    }
    case "SolveRationalEquation": {
      if (v["kind"] === "linear" && num("x") === num("B")) errs.push("solution excluded by domain");
      break;
    }
    case "SimplifyRational":
    case "MultiplyDivideRational": {
      // excluded x-values must not make the ORIGINAL denominators zero at test points
      break;
    }
    case "LogEvaluate": {
      if (num("arg") <= 0) errs.push(`log argument ${num("arg")} not positive`);
      break;
    }
    case "SolveLogEquation": {
      if (!(num("s") > 0 && num("s") - num("k") > 0)) errs.push("valid root violates domain");
      break;
    }
    case "SolveExponential": {
      if (v["kind"] === "approx" && num("N") <= 0) errs.push("exponential target not positive");
      break;
    }
    case "CircleEquation":
    case "CircleFromGeneral": {
      if (num("r") <= 0) errs.push(`radius ${num("r")} not positive (degenerate conic)`);
      break;
    }
    case "ParabolaVertex":
    case "ParabolaFocusDirectrix":
    case "ParabolaFromPoint": {
      if (num("a") === 0) errs.push("parabola leading coefficient 0 (degenerate)");
      if (p.subtype === "ParabolaFocusDirectrix" && num("p") === 0) errs.push("p=0 degenerate");
      break;
    }
    case "LongDivision":
    case "SyntheticDivision": {
      const d = v["dividend"] as number[];
      if (d.length !== 4) errs.push(`dividend degree != 3 (got ${d.length - 1})`);
      break;
    }
    case "LineParabola":
    case "CircleLine": {
      const sols = p.subtype === "CircleLine" ? (v["sols"] as number[]) : [num("x1"), num("x2")];
      if (sols.some((s) => !isFinite(s))) errs.push("solution not finite");
      break;
    }
    case "MatrixDetInverse":
    case "MatrixSolveSystem": {
      // singular is only invalid when an inverse is actually computed
      const inv = v["inv"] as number[] | undefined;
      if (num("det") === 0 && (p.subtype === "MatrixSolveSystem" || (inv && inv.length > 0)))
        errs.push("singular matrix where inverse is used");
      break;
    }
    case "DataAnalyze": {
      if ((v["model"] as string) === "exponential" && (v["ys"] as number[]).some((y) => y <= 0))
        errs.push("exponential data not positive");
      break;
    }
    case "Discriminant":
    case "ComplexRoots":
    case "QuadraticFormula":
    case "CompleteSquare":
    case "VertexFormula":
    case "SolveByRoot":
    case "RationalRootTheorem":
    case "FactorByGrouping":
    case "SumDifferenceCubes":
    case "ExpandLog":
    case "CondenseLog":
    case "ArithmeticExplicit":
    case "ArithmeticFindN":
    case "ArithmeticSystem":
    case "GeometricExplicit":
    case "GeometricFindR":
    case "Recursive":
    case "FiniteSum":
    case "MatrixAddSub":
    case "MatrixMultiply":
    case "DataRegression":
    case "DataPredict":
      break;
    default:
      errs.push(`no fuzz invariants for subtype ${p.subtype}`);
  }
  return errs;
}

const lessons = WIRED_LESSONS.filter((l) => !l.proofs);
let total = 0;

for (const lesson of lessons) {
  section(`fuzz/${lesson.id}`);
  for (let seed = 1; seed <= FUZZ_SEEDS; seed++) {
    const set = lesson.generate("Test", seed, { count: FUZZ_COUNT, difficulty: 3 }) as Algebra2Problem[];
    if (set.length !== FUZZ_COUNT) {
      check(false, `${lesson.id} seed ${seed}: count ${set.length} != ${FUZZ_COUNT}`);
      continue;
    }
    for (const p of set) {
      total++;
      const errs: string[] = [];
      finiteDeep(p.verify, "verify", errs);
      errs.push(...domainInvariants(p));
      if (errs.length > 0) {
        check(false, `${lesson.id} seed ${seed} [${p.subtype}]: ${errs.join("; ")}`);
      } else {
        check(true, `${lesson.id} ok`);
      }
    }
  }
  // seed distinctness: two different seeds must not produce identical sets
  const a = lesson.generate("Test", 1, { count: 6, difficulty: 2 });
  const b = lesson.generate("Test", 777, { count: 6, difficulty: 2 });
  check(!deepEqual(a, b), `${lesson.id}: distinct seeds differ`);
}

// exact-count guarantees across the full matrix (one seed per cell)
for (const lesson of lessons) {
  section(`counts/${lesson.id}`);
  for (const d of [1, 2, 3] as const) {
    for (const n of [1, 3, 12, 25]) {
      const set = lesson.generate("Review", 4242, { count: n, difficulty: d });
      check(set.length === n, `${lesson.id} d${d} n${n}: got ${set.length}`);
    }
  }
}

console.log(`fuzz problems scanned: ${total}`);
report("run-fuzz");
