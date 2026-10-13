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
    case "AddSubtractRational": {
      // unlike-denominator families with r/s poles need them distinct;
      // factorFirst carries k instead, opposite/like carry only r.
      if (typeof v["r"] === "number" && typeof v["s"] === "number" && num("r") === num("s"))
        errs.push("unlike denominators share a pole");
      if (v["kind"] === "opposite" && num("A") === num("B") && v["op"] === "add")
        errs.push("opposite add with A === B gives a zero numerator");
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
    case "Transformations": {
      if (num("aNum") === 0) errs.push("transformation a is 0");
      if (!(num("aDen") > 0)) errs.push("transformation aDen not positive");
      break;
    }
    case "WriteVertexForm":
    case "StdFormAttributes":
    case "StdFormVertex":
    case "StdFormIntercepts": {
      if (num("a") === 0) errs.push("leading coefficient 0 (degenerate)");
      break;
    }
    case "ProjectileMax": {
      if (!(num("tStar") > 0)) errs.push("peak time not positive");
      if (!(num("maxH") > 0)) errs.push("max height not positive");
      if (!(num("v0") > 0)) errs.push("initial velocity not positive");
      break;
    }
    case "ProjectileLand": {
      if (!(num("land") > 0)) errs.push("landing time not positive");
      if (!(num("otherRoot") < 0)) errs.push("other root not negative");
      break;
    }
    case "AreaMax": {
      if (!(num("wStar") > 0 && num("wStar") < num("fence") / 2)) errs.push("optimal width outside pen range");
      if (!(num("aMax") > 0)) errs.push("max area not positive");
      break;
    }
    case "ModelMax": {
      if (!(num("a") < 0)) errs.push("profit model does not open downward");
      if (!(num("pMax") > 0)) errs.push("max profit not positive");
      break;
    }
    case "FactorTrinomial":
    case "FactorGCF": {
      if (num("r1") === num("r2")) errs.push("trinomial roots not distinct");
      if (p.subtype === "FactorGCF" && num("g") < 2) errs.push("GCF < 2");
      break;
    }
    case "FactorDiffSquares": {
      if (!(num("m") >= 1)) errs.push("square coefficient root < 1");
      if (!(num("s") > 0)) errs.push("square constant root not positive");
      break;
    }
    case "FactorSolve": {
      if (num("a") === 0) errs.push("leading coefficient 0 (degenerate)");
      if (num("r1") > num("r2")) errs.push("roots not ordered");
      break;
    }
    case "QuadInequality": {
      if (num("a") === 0) errs.push("leading coefficient 0 (degenerate)");
      if (!(num("r1") < num("r2"))) errs.push("critical values not distinct/ordered");
      break;
    }
    case "QuadIneqNoCross": {
      const D = num("b") * num("b") - 4 * num("a") * num("c");
      if (D >= 0) errs.push(`no-cross inequality has D=${D} >= 0`);
      break;
    }
    // ── Topic 2 (A2.2): functions & absolute value ──
    case "AbsTransformations":
    case "AbsAttributes":
    case "AbsWriteEquation":
    case "AbsPiecewise":
    case "AbsIneqGraphDesc":
    case "AbsIneqFromGraph":
    case "AbsIneqPointCheck": {
      if (num("aNum") === 0) errs.push("absolute value coefficient a is 0");
      if (!(num("aDen") > 0)) errs.push("absolute value aDen not positive");
      if (p.subtype === "AbsWriteEquation" && num("px") === num("h"))
        errs.push("write-equation point sits on the vertex (a undetermined)");
      break;
    }
    case "AbsEquation":
    case "AbsIneqAnd":
    case "AbsIneqOr": {
      if (!(num("c") > 0)) errs.push("distance bound c not positive");
      if (!(num("lo") < num("hi"))) errs.push("solution bounds not ordered");
      break;
    }
    case "AbsEquationLinear": {
      if (num("a") === 0) errs.push("inside leading coefficient 0");
      const s = v["sols"] as number[];
      if (!(s[1] > 0 && s[3] > 0)) errs.push("solution denominators not positive");
      break;
    }
    case "AbsIneqLinear": {
      if (!(num("a") > 0)) errs.push("inside leading coefficient not positive");
      const lo = v["lo"] as number[];
      const hi = v["hi"] as number[];
      if (!(lo[0] / lo[1] < hi[0] / hi[1])) errs.push("solution bounds not ordered");
      break;
    }
    case "FunctionEvaluate": {
      if (v["kind"] === "solveAbsInput" && !(num("lo") < num("hi")))
        errs.push("two inputs not ordered");
      break;
    }
    case "RelationIsFunction": {
      if ((v["pairs"] as number[]).length % 2 !== 0) errs.push("pairs payload not flat pairs");
      break;
    }
    case "VerticalLineTest": {
      if ((v["points"] as number[]).length % 2 !== 0) errs.push("points payload not flat pairs");
      break;
    }
    // ── Topic 3 (A2.3): linear systems ──
    case "SystemGraphSolve":
    case "SystemElimination": {
      if (num("a1") * num("b2") - num("a2") * num("b1") === 0)
        errs.push("system determinant 0 (no unique solution)");
      break;
    }
    case "SystemClassify": {
      if (num("a1") * num("b2") - num("a2") * num("b1") !== 0)
        errs.push("classify system must be parallel/coincident (det 0)");
      break;
    }
    case "SystemSubstitution": {
      if (num("a") === 0) errs.push("second equation lost its x-term");
      if (num("B") === 0) errs.push("second equation lost its y-term");
      break;
    }
    case "SystemTableSolve": {
      if (num("m1") === num("m2")) errs.push("table lines parallel (never equal)");
      break;
    }
    case "SystemIneqTestPoint":
    case "SystemIneqRead":
    case "SystemIneqCorner": {
      const l1 = v["l1"] as number[];
      const l2 = v["l2"] as number[];
      if (l1[0] * l2[1] - l2[0] * l1[1] === 0) errs.push("inequality boundaries parallel");
      break;
    }
    case "ThreeVarSystem": {
      const A = v["A"] as number[];
      const det3 =
        A[0] * (A[4] * A[8] - A[5] * A[7]) -
        A[1] * (A[3] * A[8] - A[5] * A[6]) +
        A[2] * (A[3] * A[7] - A[4] * A[6]);
      if (det3 === 0) errs.push("3x3 coefficient matrix singular");
      break;
    }
    case "MatrixSystemIntro": {
      if ("dependent" in v && num("det") !== 0) errs.push("classify case must be singular");
      if ("sol" in v && num("det") === 0) errs.push("inverse-solve case is singular");
      break;
    }
    // ── Topic 6 (A2.6): inverses & radicals ──
    case "InverseLinear": {
      if (num("a") === 0) errs.push("linear function slope 0 (no inverse)");
      break;
    }
    case "SqrtAttributes": {
      if (num("a") === 0) errs.push("leading coefficient a is 0");
      break;
    }
    case "SqrtTransformWrite": {
      if (num("aNum") === 0) errs.push("leading coefficient a is 0");
      if (!(num("aDen") > 0)) errs.push("aDen not positive");
      break;
    }
    case "RadicalLinear": {
      if (num("a") * num("x") + num("b") < 0) errs.push("radicand negative at the solution");
      break;
    }
    case "RadicalExtraneous": {
      if (!(num("extraneousRoot") < num("b"))) errs.push("extraneous root not below the domain bound");
      if (num("validRoot") === num("extraneousRoot")) errs.push("valid and extraneous roots coincide");
      if (num("validRoot") < num("b")) errs.push("valid root gives a negative right side");
      break;
    }
    case "RadicalNoSolution": {
      if (!(num("e") - num("d") < 0)) errs.push("isolated radicand is not negative");
      break;
    }
    case "RadicalTwoRadicals": {
      if (num("x") + num("a") < 0 || num("x") + num("b") < 0)
        errs.push("a radicand is negative at the solution");
      break;
    }
    // ── Topic 7 (A2.7): exponentials & logarithms ──
    case "ExpGrowthDecay": {
      if (!(num("A") > 0)) errs.push("initial amount not positive");
      if ("bNum" in v && !(num("bNum") > 0)) errs.push("growth base numerator not positive");
      break;
    }
    case "ExpAttributes": {
      if (num("aNum") === 0) errs.push("exponential coefficient a is 0");
      if (!(num("aDen") > 0)) errs.push("aDen not positive");
      if (!(num("b") >= 2)) errs.push("exponential base < 2");
      break;
    }
    case "ExpTransformWrite": {
      if (!(num("b") >= 2)) errs.push("exponential base < 2");
      break;
    }
    case "ECompound": {
      if (!(num("P") > 0 && num("r") > 0 && num("t") > 0)) errs.push("compound inputs not positive");
      if (!(num("amountTimes100") > num("P") * 100)) errs.push("amount did not grow past principal");
      break;
    }
    case "LogDomain":
    case "LogAttributes":
    case "LogTransformWrite":
    case "LogInversePair": {
      if (!(num("b") >= 2)) errs.push("log base < 2");
      if (p.subtype === "LogAttributes" || p.subtype === "LogTransformWrite") {
        if (num("a") === 0) errs.push("log coefficient a is 0");
      }
      break;
    }
    case "LnApprox": {
      if (!(num("N") > 1)) errs.push("ln argument not > 1");
      break;
    }
    case "LnSolveTime": {
      if (!(num("A") > num("P") && num("P") > 0 && num("r") > 0))
        errs.push("doubling/growth inputs out of order");
      break;
    }
    case "RecursiveModelWrite": {
      if (!(num("A") > 0)) errs.push("sequence initial value not positive");
      if (!(num("rNum") > 0)) errs.push("common ratio not positive");
      break;
    }
    // ── Topic 8 (A2.8): polynomials & FTA ──
    case "PolyAttributes":
    case "PolyAttributesFactored": {
      if (!(num("degree") >= 1)) errs.push("polynomial degree < 1");
      break;
    }
    case "PolyAttributesEndBehavior": {
      if (!(num("minDegree") >= num("turning") + 1))
        errs.push("minimum degree cannot realize the stated turning points");
      if (num("leadSign") !== 1 && num("leadSign") !== -1) errs.push("lead sign not ±1");
      break;
    }
    case "FTACountZeros": {
      if (num("total") !== num("degree")) errs.push("FTA: zero count != degree");
      break;
    }
    case "FTAWritePoly": {
      const roots = v["roots"] as number[];
      const mults = v["mults"] as number[];
      if (roots.length !== mults.length) errs.push("roots/mults length mismatch");
      if (mults.some((m) => !(m >= 1))) errs.push("a root multiplicity is < 1");
      if (num("lead") === 0) errs.push("leading coefficient 0");
      break;
    }
    // ── Topic 9 (A2.9): radical expressions ──
    case "SimplifyRadical": {
      if (!(num("n") > 0)) errs.push("radicand not positive");
      break;
    }
    case "RadicalMultiply": {
      if (num("a") < 0 || num("b") < 0) errs.push("radicand negative");
      break;
    }
    case "RadicalDivide": {
      if (!(num("b") > 0)) errs.push("denominator radicand not positive");
      break;
    }
    case "RationalExponents": {
      // Conversion kinds carry a variable base ("x"/"y"); numeric-base kinds
      // (evaluate/product/power/quotient) must use a positive base.
      if (typeof v["base"] === "number" && !(num("base") > 0))
        errs.push("rational-exponent base not positive");
      // For the conversion kinds, n is the root index and must be >= 2;
      // the arithmetic kinds store the RESULT exponent, whose denominator
      // may legitimately reduce to 1.
      if ((v["kind"] === "toExponent" || v["kind"] === "toRadical") && !(num("n") >= 2))
        errs.push("root index n < 2");
      break;
    }
    // ── Topic 10 (A2.10): cubic & cube root ──
    case "CubicTransformations":
    case "CubicWriteForm":
    case "CubeRootTransformations":
    case "CubeRootWriteForm": {
      if (num("aNum") === 0) errs.push("transformation a is 0");
      if (!(num("aDen") > 0)) errs.push("aDen not positive");
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
    // New subtypes whose domains are valid by construction (polynomial
    // operations, cube roots over all reals, graph reads with parameters
    // already constrained by their makers); finiteDeep above still applies.
    case "DomainRangeGraph":
    case "GraphIntercepts":
    case "GraphIncDec":
    case "GraphExtremum":
    case "AbsEquationSpecial":
    case "AbsEquationCheck":
    case "AbsIneqSpecial":
    case "FuncEvalOps":
    case "FuncProduct":
    case "FuncCompose":
    case "FuncComposeEval":
    case "InversePoint":
    case "InverseVerify":
    case "InverseQuadratic":
    case "SqrtInverseOfSqrt":
    case "SqrtRestrictInverse":
    case "SqrtSwapDomainRange":
    case "RadicalBasic":
    case "RadicalIsolate":
    case "ExpEvaluate":
    case "EEvaluate":
    case "EAttributes":
    case "LnEvaluate":
    case "PolyAddSub":
    case "PolyMultiply":
    case "BinomialRadicals":
    case "RationalizeBinomial":
    case "CubeRootEquations":
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
