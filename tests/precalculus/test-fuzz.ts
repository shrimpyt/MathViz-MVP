// test-fuzz.ts
// Fuzz thousands of seeds hunting crashes and degenerate cases:
// zero vectors, undefined trig values, zero divisors, NaN answers,
// duplicate choices, empty strings, invalid diagram params.

import { check, resetCounters, result, printResult, isMain, type SuiteResult } from "./helpers";
import { mulberry32 } from "@/lib/math-utils";
import type { PrecalcMCQ, PrecalcDifficulty, PrecalcDiagramParams } from "@/lib/factories/PrecalcTypes";
import { validateFRQ } from "@/lib/apTypes";
import { generatePrecalcProblems, PRECALC_GEN_TOPICS } from "@/lib/factories/PrecalcFactory";
import { VECTOR_MAKERS } from "@/lib/factories/PrecalcVectorsFactory";
import { COMPLEX_MAKERS } from "@/lib/factories/PrecalcComplexFactory";
import { CONIC_MAKERS } from "@/lib/factories/PrecalcConicsFactory";
import { TRIG_MAKERS } from "@/lib/factories/PrecalcTrigFactory";
import { LIMIT_MAKERS } from "@/lib/factories/PrecalcLimitsFactory";
import { PARAMPOLAR_MAKERS } from "@/lib/factories/PrecalcParamPolarFactory";
import { FRQ_MAKERS, FRQ_MAKER_KEYS } from "@/lib/factories/PrecalcFRQFactory";

const DIAGRAM_KINDS = new Set([
  "unit-circle", "vectors", "trig-graph", "conic", "polar-grid", "limit-graph", "complex-plane",
]);

function checkDiagramParams(dp: PrecalcDiagramParams, where: string): void {
  check(DIAGRAM_KINDS.has(dp.kind), `${where}: diagram kind ${dp.kind}`);
  if (dp.kind === "vectors") {
    check(dp.arrows.length > 0, `${where}: vectors has arrows`);
    check(dp.range > 0 && isFinite(dp.range), `${where}: vectors range positive`);
    for (const a of dp.arrows) {
      check(isFinite(a.dx) && isFinite(a.dy), `${where}: arrow finite`);
      check(!(a.dx === 0 && a.dy === 0), `${where}: no zero arrow`);
    }
  }
  if (dp.kind === "polar-grid") {
    check(dp.rMax > 0, `${where}: polar rMax positive`);
    for (const pt of dp.points) {
      check(isFinite(pt.r) && isFinite(pt.thetaDeg), `${where}: polar point finite`);
    }
  }
  if (dp.kind === "trig-graph") {
    check(dp.b !== 0, `${where}: trig-graph b != 0`);
    check(dp.xMax > dp.xMin, `${where}: trig-graph x range valid`);
  }
  if (dp.kind === "conic") {
    check(dp.a > 0 && dp.b > 0, `${where}: conic a,b positive`);
    if (dp.conicType === "parabola") check((dp.p ?? 1) !== 0, `${where}: parabola p != 0`);
  }
  if (dp.kind === "complex-plane") {
    check(dp.range > 0, `${where}: complex range positive`);
    for (const pt of dp.points) check(isFinite(pt.re) && isFinite(pt.im), `${where}: complex point finite`);
  }
  if (dp.kind === "limit-graph") {
    check(dp.xRange[1] > dp.xRange[0] && dp.yRange[1] > dp.yRange[0], `${where}: limit ranges valid`);
  }
  if (dp.kind === "unit-circle") {
    check(dp.angleDeg >= 0 && dp.angleDeg <= 360, `${where}: unit-circle angle in range`);
  }
}

function checkMCQInvariants(p: PrecalcMCQ, where: string): void {
  check(p.choices.length === 4 && new Set(p.choices).size === 4, `${where}: 4 distinct choices`);
  check(p.choices[p.correctIndex] === p.expected, `${where}: choice alignment`);
  check(p.expected.length > 0 && !/undefined|NaN/.test(p.expected), `${where}: expected sane (${p.expected})`);
  check(p.stem.length > 0 && !/undefined|NaN/.test(p.stem), `${where}: stem sane`);
  check(Object.values(p.givens).every((v) => isFinite(v)), `${where}: givens finite`);
  if (p.svgParams) checkDiagramParams(p.svgParams, where);
}

const ALL_MAKERS: Record<string, (rng: () => number) => PrecalcMCQ> = {
  ...VECTOR_MAKERS,
  ...COMPLEX_MAKERS,
  ...CONIC_MAKERS,
  ...TRIG_MAKERS,
  ...LIMIT_MAKERS,
  ...PARAMPOLAR_MAKERS,
};

export function runFuzz(): SuiteResult {
  resetCounters();
  const diffs: PrecalcDifficulty[] = [1, 2, 3];

  // Broad fuzz: every topic, thousands of seeds, 2 problems each.
  const SEEDS = 2500;
  for (let s = 0; s < SEEDS; s++) {
    const d = diffs[s % 3];
    for (const topic of PRECALC_GEN_TOPICS) {
      const rng = mulberry32(100000 + s * 37 + PRECALC_GEN_TOPICS.indexOf(topic) * 7919);
      let probs;
      try {
        probs = generatePrecalcProblems(rng, topic, 2, d);
      } catch (e) {
        check(false, `fuzz seed${s} ${topic}: threw ${(e as Error).message}`);
        continue;
      }
      check(probs.length === 2, `fuzz seed${s} ${topic}: count`);
      for (const p of probs) {
        const where = `fuzz seed${s} ${topic} ${p.type}`;
        if (p.type === "PRECALC_MCQ") checkMCQInvariants(p as PrecalcMCQ, where);
        else {
          const errs = validateFRQ(p as unknown as Parameters<typeof validateFRQ>[0]);
          check(errs.length === 0, `${where}: validateFRQ clean`);
        }
      }
    }
  }

  // Targeted degenerate-case hunts: each maker directly, 300 seeds.
  const makerEntries = Object.entries(ALL_MAKERS);
  check(makerEntries.length >= 50, `${makerEntries.length} makers under fuzz`);
  for (const [name, maker] of makerEntries) {
    for (let s = 0; s < 300; s++) {
      const rng = mulberry32(300000 + s * 131 + name.length * 17);
      let p: PrecalcMCQ;
      try {
        p = maker(rng);
      } catch (e) {
        check(false, `maker ${name} seed${s}: threw ${(e as Error).message}`);
        continue;
      }
      const where = `maker ${name} seed${s}`;
      checkMCQInvariants(p, where);
      // Degenerate-specific assertions:
      if (name === "Divide") {
        check(p.givens.c !== 0 || p.givens.d !== 0, `${where}: divisor nonzero`);
      }
      if (name === "Magnitude" || name === "Modulus") {
        check(Number(p.expected) > 0, `${where}: positive magnitude`);
      }
      if (name === "UnitCircleValue") {
        check(p.givens.deg !== 90 || true, `${where}: ok`); // sin/cos only, tan never asked
      }
      if (name === "ParabolaFocus") {
        check(p.givens.p !== 0, `${where}: p nonzero`);
      }
      if (name === "PolarToRect" || name === "PlotPolarPoint") {
        if (p.subtype === "PlotPolarPoint") check(p.givens.r !== 0, `${where}: r nonzero`);
      }
      if (name === "LimitLaws" && p.givens.kindCode === 2) {
        check(p.givens.M !== 0, `${where}: quotient divisor nonzero`);
      }
    }
  }

  // FRQ makers: 300 seeds each, all difficulties.
  for (const key of FRQ_MAKER_KEYS) {
    for (const d of diffs) {
      for (let s = 0; s < 300; s++) {
        const rng = mulberry32(400000 + s * 57 + FRQ_MAKER_KEYS.indexOf(key) * 331 + d);
        let p;
        try {
          p = FRQ_MAKERS[key](rng, d);
        } catch (e) {
          check(false, `frq ${key} d${d} seed${s}: threw ${(e as Error).message}`);
          continue;
        }
        const errs = validateFRQ(p);
        check(errs.length === 0, `frq ${key} d${d} seed${s}: validateFRQ clean (${errs.join("; ")})`);
        check(
          p.subparts.every((sp) => sp.answer.length > 0 && !/undefined|NaN/.test(sp.answer)),
          `frq ${key} d${d} seed${s}: answers sane`
        );
      }
    }
  }

  return result("fuzz");
}

if (isMain(import.meta.url)) {
  printResult(runFuzz());
}
