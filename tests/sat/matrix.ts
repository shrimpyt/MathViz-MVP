// matrix.ts
// Full generation matrix: every domain × mode × difficulty 1–3 × count {1,3,12,25}.
// Schema/invariant checks only (no answer recomputation — see verify.ts).
//
// Per the Classical-notes contract update, "Classical" mode is handled exactly
// like "Review" by the SAT generators (they are mode-agnostic); the matrix
// covers the pre-existing modes and asserts mode-independence across them.

import { generateSATProblems } from "@/lib/satTypes";
import type { SATDomain, SATProblem, SATDifficulty } from "@/lib/satTypes";
import { SAT_MATH_REGISTRY } from "@/modules/sat-math";
import type { OutputMode } from "@/lib/ProblemFactory";
import { newCtx, check, mergeCtx, type CheckCtx } from "./checks";

export const DOMAINS: SATDomain[] = [
  "HeartOfAlgebra",
  "ProblemSolvingData",
  "PassportAdvancedMath",
  "AdditionalTopics",
];

export const SUBDOMAINS = new Set([
  "LinearEquation1Var",
  "System2x2",
  "LinearInequality",
  "LinearFunction",
  "PercentChange",
  "RatioProportion",
  "OneVarStats",
  "Probability",
  "QuadraticRoots",
  "EquivalentExpressions",
  "NonlinearFunction",
  "NonlinearEquation",
  "TriangleAngles",
  "CircleMeasure",
  "RightTriangleTrig",
  "Volume",
]);

const MISCONCEPTIONS = new Set([
  "sign-flip",
  "off-by-one",
  "order-of-operations",
  "wrong-variable",
  "dropped-negative",
  "inverted-ratio",
  "percent-base-error",
  "mean-median-confusion",
  "unsorted-data",
  "inequality-flip-missed",
  "area-circumference-confusion",
  "diameter-as-radius",
  "trig-ratio-swap",
  "added-instead-of-multiplied",
  "foil-error",
  "root-sign-error",
  "angle-sum-error",
  "complement-error",
  "range-error",
]);

const MODES: OutputMode[] = ["GuidedNote", "Review", "Test"];

/** Schema/invariant checks for one generated problem. */
export function checkProblemInvariants(
  ctx: CheckCtx,
  p: SATProblem,
  tag: string,
  expect?: { domain?: SATDomain; difficulty?: SATDifficulty; count?: number }
): void {
  const t = `${tag} [${p.domain}/${p.subdomain}]`;
  check(ctx, p.type === "SAT", `${t}: type is SAT`);
  check(ctx, p.format === "MCQ" || p.format === "GridIn", `${t}: format valid`);
  check(ctx, DOMAINS.includes(p.domain), `${t}: domain valid`);
  check(ctx, SUBDOMAINS.has(p.subdomain), `${t}: subdomain known`);
  check(
    ctx,
    p.difficulty === 1 || p.difficulty === 2 || p.difficulty === 3,
    `${t}: difficulty in 1..3`
  );
  check(ctx, typeof p.stem === "string" && p.stem.length > 8, `${t}: stem non-empty`);
  check(
    ctx,
    typeof p.explanation === "string" && p.explanation.length > 8,
    `${t}: explanation non-empty`
  );
  check(ctx, typeof p.key === "string" && p.key.length > 0, `${t}: key non-empty`);
  check(ctx, Number.isFinite(p.keyValue), `${t}: keyValue finite`);
  check(
    ctx,
    typeof p.standard === "string" && p.standard.length > 0,
    `${t}: standard non-empty`
  );
  check(
    ctx,
    p.verify != null && typeof p.verify.params === "object",
    `${t}: verify.params present`
  );
  if (expect?.domain) check(ctx, p.domain === expect.domain, `${t}: domain matches request`);
  if (expect?.difficulty)
    check(ctx, p.difficulty === expect.difficulty, `${t}: difficulty matches request`);

  if (p.format === "MCQ") {
    check(ctx, Array.isArray(p.options) && p.options.length === 4, `${t}: 4 options`);
    if (p.options) {
      const letters = p.options.map((o) => o.option).join("");
      check(ctx, letters === "ABCD", `${t}: options lettered A–D in order`);
      const keys = p.options.filter((o) => o.isKey);
      check(ctx, keys.length === 1, `${t}: exactly one keyed option`);
      check(
        ctx,
        p.keyIndex !== undefined && p.keyIndex >= 0 && p.keyIndex <= 3,
        `${t}: keyIndex in 0..3`
      );
      if (p.keyIndex !== undefined && p.options[p.keyIndex]) {
        const k = p.options[p.keyIndex];
        check(ctx, k.isKey === true, `${t}: keyIndex points at the key`);
        check(ctx, k.label === p.key, `${t}: keyed option label === key`);
        check(
          ctx,
          Math.abs(k.value - p.keyValue) < 1e-9,
          `${t}: keyed option value === keyValue`
        );
      }
      for (const o of p.options) {
        if (o.isKey) {
          check(ctx, o.misconception === undefined, `${t}: key carries no misconception`);
        } else {
          check(ctx, o.label !== p.key, `${t}: distractor ${o.option} label ≠ key`);
          check(
            ctx,
            o.misconception !== undefined && MISCONCEPTIONS.has(o.misconception),
            `${t}: distractor ${o.option} has documented misconception`
          );
          check(
            ctx,
            typeof o.misconceptionNote === "string" && o.misconceptionNote.length > 5,
            `${t}: distractor ${o.option} has teacher-facing note`
          );
        }
      }
    }
    check(ctx, p.acceptedForms === undefined, `${t}: MCQ has no acceptedForms`);
  } else {
    check(ctx, p.options === undefined, `${t}: grid-in has no options`);
    check(ctx, p.keyIndex === undefined, `${t}: grid-in has no keyIndex`);
    check(
      ctx,
      Array.isArray(p.acceptedForms) && p.acceptedForms.length >= 1,
      `${t}: acceptedForms non-empty`
    );
    if (p.acceptedForms) {
      check(
        ctx,
        p.acceptedForms.every((f) => typeof f === "string" && f.length > 0),
        `${t}: acceptedForms all non-empty strings`
      );
      check(
        ctx,
        new Set(p.acceptedForms).size === p.acceptedForms.length,
        `${t}: acceptedForms distinct`
      );
      check(ctx, p.acceptedForms.includes(p.key), `${t}: acceptedForms includes key`);
    }
  }

  if (p.diagram) {
    const d = p.diagram;
    if (d.kind === "SatTable") {
      check(ctx, d.headers.length >= 2, `${t}: table has headers`);
      check(
        ctx,
        d.rows.every((r) => r.length === d.headers.length),
        `${t}: table rows match header width`
      );
    } else if (d.kind === "SatRightTriangle") {
      check(
        ctx,
        d.adj > 0 && d.opp > 0 && d.hyp > 0,
        `${t}: right triangle sides positive`
      );
    } else if (d.kind === "SatTriangle") {
      check(ctx, d.vertices.length === 3, `${t}: triangle has 3 vertices`);
      check(ctx, d.angleLabels.length === 3, `${t}: triangle has 3 angle labels`);
    } else {
      check(ctx, false, `${t}: unknown diagram kind ${(d as { kind: string }).kind}`);
    }
  }
}

function seedFor(di: number, diff: number, count: number, salt: number): number {
  return salt * 1_000_000 + di * 10_000 + diff * 100 + count;
}

export function runMatrix(ctx: CheckCtx): { problems: number } {
  let problems = 0;
  const counts = [1, 3, 12, 25];

  // 1. Direct factory matrix: domain × difficulty × count.
  for (let di = 0; di < DOMAINS.length; di++) {
    const domain = DOMAINS[di];
    for (const diff of [1, 2, 3] as SATDifficulty[]) {
      for (const count of counts) {
        const seed = seedFor(di, diff, count, 7);
        const ps = generateSATProblems(domain, seed, count, diff);
        check(ctx, ps.length === count, `matrix ${domain} d${diff} n${count}: count matches`);
        problems += ps.length;
        for (const p of ps) {
          checkProblemInvariants(ctx, p, `matrix/${domain}/d${diff}/n${count}`, {
            domain,
            difficulty: diff,
          });
        }
      }
    }
  }

  // 2. Registry matrix: every SAT entry × mode × difficulty × count,
  //    asserting mode-independence (SAT generators ignore OutputMode).
  for (const entry of SAT_MATH_REGISTRY) {
    for (const diff of [1, 2, 3] as SATDifficulty[]) {
      for (const count of [1, 3]) {
        const seed = 1000 + entry.id.length * 37 + diff * 11 + count;
        const byMode = MODES.map((m) =>
          entry.generate(m, seed, { count, difficulty: diff })
        );
        for (let mi = 0; mi < byMode.length; mi++) {
          check(
            ctx,
            byMode[mi].length === count,
            `registry ${entry.id} mode=${MODES[mi]} d${diff}: count matches`
          );
        }
        const a = JSON.stringify(byMode[0]);
        for (let mi = 1; mi < byMode.length; mi++) {
          check(
            ctx,
            JSON.stringify(byMode[mi]) === a,
            `registry ${entry.id} d${diff}: mode-independent output`
          );
        }
        problems += byMode[0].length;
        for (const p of byMode[0] as unknown as SATProblem[]) {
          checkProblemInvariants(ctx, p, `registry/${entry.id}/d${diff}`);
        }
      }
    }
  }

  return { problems };
}

// Runnable directly: `npx tsx tests/sat/matrix.ts`
if (require.main === module) {
  const ctx = newCtx();
  const { problems } = runMatrix(ctx);
  const sub = newCtx();
  mergeCtx(sub, ctx);
  console.log(
    `matrix: ${problems} problems, ${sub.checks} checks, ${sub.failures.length} failures`
  );
  for (const f of sub.failures.slice(0, 20)) console.log("  FAIL:", f);
  process.exit(sub.failures.length ? 1 : 0);
}
