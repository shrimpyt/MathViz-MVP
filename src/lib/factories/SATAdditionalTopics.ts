// SATAdditionalTopics.ts
// SAT "Additional Topics in Math" makers: triangle angles, circle measurement,
// right-triangle trigonometry, volume. Difficulty tiers are cumulative:
// tier d may draw any variant from tiers 1..d.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { SATDifficulty, SATProblem, SATDiagramParams } from "../satTypes";
import {
  q,
  qVal,
  qLabel,
  qForms,
  piLabel,
  assembleProblem,
  buildMCQ,
  chooseFormat,
  pickDistractors,
  tier,
  type SATMaker,
  type DistractorSpec,
} from "./SATShared";

// ── Maker 1: triangle angle sums (A.T.1) ───────────────────────────────────────

function makeTriangleAngles(rng: RNG, difficulty: SATDifficulty): SATProblem {
  const t = tier(rng, difficulty);
  const format = chooseFormat(rng);

  if (t === 1) {
    const A = randInt(rng, 20, 80);
    const B = randInt(rng, 20, 100 - A - 10);
    const C = 180 - A - B;
    const cFrac = q(C);
    const key = { label: qLabel(cFrac), value: qVal(cFrac) };
    const stem =
      `In triangle ABC, the measure of angle A is ${A}° and the measure of angle B is ${B}°. ` +
      `What is the measure of angle C?`;
    const diagram: SATDiagramParams = {
      kind: "SatTriangle",
      vertices: ["A", "B", "C"],
      angleLabels: [`${A}°`, `${B}°`, "?"],
    };
    const explanation = `The angles of a triangle sum to 180°: C = 180° − ${A}° − ${B}° = ${C}°.`;
    const pool: DistractorSpec[] = [
      {
        label: qLabel(q(A + B)),
        value: A + B,
        misconception: "angle-sum-error",
        note: "Added the two angles but forgot to subtract from 180°.",
      },
      {
        label: qLabel(q(360 - A - B)),
        value: 360 - A - B,
        misconception: "angle-sum-error",
        note: "Subtracted from 360° instead of 180°.",
      },
      {
        label: qLabel(q(C + 1)),
        value: C + 1,
        misconception: "off-by-one",
        note: "Arithmetic slip in the final subtraction.",
      },
      {
        label: qLabel(q(C - 1)),
        value: C - 1,
        misconception: "off-by-one",
        note: "Arithmetic slip in the final subtraction.",
      },
    ];
    if (format === "MCQ") {
      const { options, keyIndex } = buildMCQ(rng, key, pickDistractors(rng, key.value, pool));
      return {
        type: "SAT", format, domain: "AdditionalTopics", subdomain: "TriangleAngles",
        standard: "A.T.1", difficulty, stem, diagram, options, keyIndex,
        key: key.label, keyValue: key.value, explanation,
        verify: { params: { A, B }, note: "C = 180 − A − B; check A+B+C = 180." },
      };
    }
    return assembleProblem(rng, {
      domain: "AdditionalTopics", subdomain: "TriangleAngles", standard: "A.T.1",
      difficulty, stem, diagram, key, explanation,
      verify: { params: { A, B }, note: "C = 180 − A − B." },
      format, gridInForms: qForms(cFrac),
    });
  }

  // tiers 2–3: isosceles — vertex given, find base (or base given, find vertex)
  const findBase = rng() < 0.5;
  let given: number, ans: number;
  if (findBase) {
    given = randInt(rng, 20, 80); // vertex
    ans = (180 - given) / 2; // base — always integer when `given` even
    if (!Number.isInteger(ans)) {
      given += 1;
      ans = (180 - given) / 2;
    }
  } else {
    given = randInt(rng, 20, 70); // base
    ans = 180 - 2 * given; // vertex
  }
  const ansFrac = q(ans);
  const key = { label: qLabel(ansFrac), value: qVal(ansFrac) };
  const stem = findBase
    ? `In isosceles triangle DEF, DE = DF and the measure of the vertex angle D is ${given}°. What is the measure of a base angle?`
    : `In isosceles triangle DEF, DE = DF and the measure of each base angle is ${given}°. What is the measure of the vertex angle D?`;
  const explanation = findBase
    ? `Base angles are equal: each is (180° − ${given}°)/2 = ${ans}°.`
    : `Vertex angle = 180° − 2(${given}°) = ${ans}°.`;
  const pool: DistractorSpec[] = findBase
    ? [
        {
          label: qLabel(q(180 - given)),
          value: 180 - given,
          misconception: "angle-sum-error",
          note: "Forgot to split the remainder between the two base angles.",
        },
        {
          label: qLabel(q((180 + given) / 2)),
          value: (180 + given) / 2,
          misconception: "sign-flip",
          note: "Added the vertex angle instead of subtracting it.",
        },
        {
          label: qLabel(q(ans + 1)),
          value: ans + 1,
          misconception: "off-by-one",
          note: "Arithmetic slip in the final step.",
        },
        {
          label: qLabel(q(ans - 1)),
          value: ans - 1,
          misconception: "off-by-one",
          note: "Arithmetic slip in the final step.",
        },
      ]
    : [
        {
          label: qLabel(q(180 - given)),
          value: 180 - given,
          misconception: "angle-sum-error",
          note: "Subtracted only one base angle instead of both.",
        },
        {
          label: qLabel(q(given)),
          value: given,
          misconception: "wrong-variable",
          note: "Answered with the base angle instead of solving for the vertex.",
        },
        {
          label: qLabel(q(ans + 1)),
          value: ans + 1,
          misconception: "off-by-one",
          note: "Arithmetic slip in the final step.",
        },
        {
          label: qLabel(q(ans - 1)),
          value: ans - 1,
          misconception: "off-by-one",
          note: "Arithmetic slip in the final step.",
        },
      ];

  if (format === "MCQ") {
    const { options, keyIndex } = buildMCQ(rng, key, pickDistractors(rng, key.value, pool));
    return {
      type: "SAT", format, domain: "AdditionalTopics", subdomain: "TriangleAngles",
      standard: "A.T.1", difficulty, stem, options, keyIndex,
      key: key.label, keyValue: key.value, explanation,
      verify: {
        params: { given, findBase: findBase ? 1 : 0, iso: 1 },
        note: "Isosceles: vertex + 2·base = 180.",
      },
    };
  }
  return assembleProblem(rng, {
    domain: "AdditionalTopics", subdomain: "TriangleAngles", standard: "A.T.1",
    difficulty, stem, key, explanation,
    verify: { params: { given, findBase: findBase ? 1 : 0, iso: 1 }, note: "vertex + 2·base = 180." },
    format, gridInForms: qForms(ansFrac),
  });
}

// ── Maker 2: circle measurement (A.T.2) — MCQ only (answers in terms of π) ────

function makeCircleMeasure(rng: RNG, difficulty: SATDifficulty): SATProblem {
  const t = tier(rng, difficulty);

  const r = randInt(rng, 2, 12);
  const ask = t === 1 ? "circumference" : t === 2 ? pick(rng, ["area", "circumference"] as const) : pick(rng, ["area", "radius-from-area", "radius-from-circumference"] as const);

  let key: { label: string; value: number };
  let stem: string;
  let explanation: string;
  let pool: DistractorSpec[];
  let vParams: Record<string, number | string>;

  if (ask === "circumference") {
    key = { label: piLabel(2 * r), value: 2 * r * Math.PI };
    stem = `A circle has radius ${r}. What is the circumference of the circle, in terms of π?`;
    explanation = `C = 2πr = 2π(${r}) = ${piLabel(2 * r)}.`;
    pool = [
      {
        label: piLabel(r * r),
        value: r * r * Math.PI,
        misconception: "area-circumference-confusion",
        note: "Used the area formula πr² instead of 2πr.",
      },
      {
        label: piLabel(4 * r),
        value: 4 * r * Math.PI,
        misconception: "diameter-as-radius",
        note: "Used the diameter as the radius in 2πr.",
      },
      {
        label: piLabel(2 * r + 1),
        value: (2 * r + 1) * Math.PI,
        misconception: "off-by-one",
        note: "Arithmetic slip in the final multiplication.",
      },
      {
        label: piLabel(2 * r - 1),
        value: (2 * r - 1) * Math.PI,
        misconception: "off-by-one",
        note: "Arithmetic slip in the final multiplication.",
      },
    ];
    vParams = { r, ask, coef: 2 * r };
  } else if (ask === "area") {
    key = { label: piLabel(r * r), value: r * r * Math.PI };
    stem = `A circle has radius ${r}. What is the area of the circle, in terms of π?`;
    explanation = `A = πr² = π(${r})² = ${piLabel(r * r)}.`;
    pool = [
      {
        label: piLabel(2 * r),
        value: 2 * r * Math.PI,
        misconception: "area-circumference-confusion",
        note: "Used the circumference formula 2πr instead of πr².",
      },
      {
        label: piLabel(4 * r * r),
        value: 4 * r * r * Math.PI,
        misconception: "diameter-as-radius",
        note: "Used the diameter as the radius in πr².",
      },
      {
        label: piLabel(r * r + 1),
        value: (r * r + 1) * Math.PI,
        misconception: "off-by-one",
        note: "Arithmetic slip squaring the radius.",
      },
      {
        label: piLabel(r * r - 1),
        value: (r * r - 1) * Math.PI,
        misconception: "off-by-one",
        note: "Arithmetic slip squaring the radius.",
      },
    ];
    vParams = { r, ask, coef: r * r };
  } else if (ask === "radius-from-area") {
    key = { label: String(r), value: r };
    stem = `A circle has area ${piLabel(r * r)}. What is the radius of the circle?`;
    explanation = `πr² = ${piLabel(r * r)}, so r² = ${r * r} and r = ${r}.`;
    pool = [
      {
        label: String(r * r),
        value: r * r,
        misconception: "order-of-operations",
        note: "Stopped at r² without taking the square root.",
      },
      {
        label: String(2 * r),
        value: 2 * r,
        misconception: "diameter-as-radius",
        note: "Solved for the diameter instead of the radius.",
      },
      {
        label: String(r + 1),
        value: r + 1,
        misconception: "off-by-one",
        note: "Arithmetic slip in the final step.",
      },
      {
        label: String(r - 1),
        value: r - 1,
        misconception: "off-by-one",
        note: "Arithmetic slip in the final step.",
      },
    ];
    vParams = { r, ask, coef: r * r };
  } else {
    key = { label: String(r), value: r };
    stem = `A circle has circumference ${piLabel(2 * r)}. What is the radius of the circle?`;
    explanation = `2πr = ${piLabel(2 * r)}, so r = ${r}.`;
    pool = [
      {
        label: String(2 * r),
        value: 2 * r,
        misconception: "diameter-as-radius",
        note: "Solved for the diameter instead of the radius.",
      },
      {
        label: String(r * r),
        value: r * r,
        misconception: "area-circumference-confusion",
        note: "Mixed up the circumference and area formulas.",
      },
      {
        label: String(r + 1),
        value: r + 1,
        misconception: "off-by-one",
        note: "Arithmetic slip in the final step.",
      },
      {
        label: String(r - 1),
        value: r - 1,
        misconception: "off-by-one",
        note: "Arithmetic slip in the final step.",
      },
    ];
    vParams = { r, ask, coef: 2 * r };
  }

  const { options, keyIndex } = buildMCQ(rng, key, pickDistractors(rng, key.value, pool));
  return {
    type: "SAT",
    format: "MCQ",
    domain: "AdditionalTopics",
    subdomain: "CircleMeasure",
    standard: "A.T.2",
    difficulty,
    stem,
    options,
    keyIndex,
    key: key.label,
    keyValue: key.value,
    explanation,
    verify: { params: vParams, note: "C = 2πr, A = πr²; invert as needed." },
  };
}

// ── Maker 3: right-triangle trigonometry (A.T.3) ───────────────────────────────

const PYTH_TRIPLES: [number, number, number][] = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [6, 8, 10],
  [9, 12, 15],
];

function makeRightTriangleTrig(rng: RNG, difficulty: SATDifficulty): SATProblem {
  const t = tier(rng, difficulty);
  const format = chooseFormat(rng);

  const [legA, legB, hyp] = pick(rng, PYTH_TRIPLES);
  const ratio = pick(rng, ["sin", "cos", "tan"] as const);
  // Reference angle at the vertex between legA (adjacent) and hyp.
  const opp = legB;
  const adj = legA;
  const ansFrac = ratio === "sin" ? q(opp, hyp) : ratio === "cos" ? q(adj, hyp) : q(opp, adj);
  const key = { label: qLabel(ansFrac), value: qVal(ansFrac) };

  const diagram: SATDiagramParams = {
    kind: "SatRightTriangle",
    adj,
    opp,
    hyp,
    labels: { adj: String(adj), opp: String(opp), hyp: String(hyp) },
    angleLabel: "θ",
  };
  const stem =
    t === 3
      ? `A ${hyp}-foot ladder leans against a wall, reaching ${opp} feet up the wall. ` +
        `What is sin(θ), where θ is the angle between the ladder and the ground?`
      : `In the right triangle shown, what is ${ratio}(θ)?`;

  const ratioDef =
    ratio === "sin" ? `${opp}/${hyp}` : ratio === "cos" ? `${adj}/${hyp}` : `${opp}/${adj}`;
  const explanation = `${ratio}(θ) = ${ratio === "tan" ? "opposite/adjacent" : ratio === "sin" ? "opposite/hypotenuse" : "adjacent/hypotenuse"} = ${ratioDef} = ${qLabel(ansFrac)}.`;

  // Documented trig errors per ratio: swapped legs, reciprocal, or the
  // wrong ratio entirely (sine ↔ tangent ↔ cosine mix-ups).
  const d1 =
    ratio === "sin"
      ? { f: q(adj, hyp), note: "Swapped the legs — used adjacent/hypotenuse." }
      : ratio === "cos"
      ? { f: q(opp, hyp), note: "Swapped the legs — used opposite/hypotenuse." }
      : { f: q(adj, opp), note: "Used adjacent/opposite instead of opposite/adjacent." };
  const d2 =
    ratio === "sin"
      ? { f: q(hyp, opp), note: "Used the reciprocal — hypotenuse/opposite." }
      : ratio === "cos"
      ? { f: q(hyp, adj), note: "Used the reciprocal — hypotenuse/adjacent." }
      : { f: q(opp, hyp), note: "Used sine (opposite/hypotenuse) instead of tangent." };
  const d3 =
    ratio === "sin"
      ? { f: q(opp, adj), note: "Used tangent (opposite/adjacent) instead of sine." }
      : ratio === "cos"
      ? { f: q(adj, opp), note: "Used the reciprocal of tangent instead of cosine." }
      : { f: q(adj, hyp), note: "Used cosine (adjacent/hypotenuse) instead of tangent." };
  const pool: DistractorSpec[] = [d1, d2, d3].map((d) => ({
    label: qLabel(d.f),
    value: qVal(d.f),
    misconception: "trig-ratio-swap",
    note: d.note,
  }));

  if (format === "MCQ") {
    const { options, keyIndex } = buildMCQ(rng, key, pickDistractors(rng, key.value, pool));
    return {
      type: "SAT", format, domain: "AdditionalTopics", subdomain: "RightTriangleTrig",
      standard: "A.T.3", difficulty, stem, diagram, options, keyIndex,
      key: key.label, keyValue: key.value, explanation,
      verify: {
        params: { opp, adj, hyp, ratio },
        note: "sin=opp/hyp, cos=adj/hyp, tan=opp/adj from the labeled sides.",
      },
    };
  }
  return assembleProblem(rng, {
    domain: "AdditionalTopics", subdomain: "RightTriangleTrig", standard: "A.T.3",
    difficulty, stem, diagram, key, explanation,
    verify: { params: { opp, adj, hyp, ratio }, note: "ratio from labeled sides." },
    format, gridInForms: qForms(ansFrac),
  });
}

// ── Maker 4: volume (A.T.2) ───────────────────────────────────────────────────

function makeVolume(rng: RNG, difficulty: SATDifficulty): SATProblem {
  const t = tier(rng, difficulty);
  const format = chooseFormat(rng);

  if (t === 3) {
    // Cylinder V = πr²h — MCQ only (π in the answer).
    const r = randInt(rng, 2, 6);
    const h = randInt(rng, 3, 10);
    const key = { label: piLabel(r * r * h), value: r * r * h * Math.PI };
    const stem = `A right cylinder has radius ${r} and height ${h}. What is the volume of the cylinder, in terms of π?`;
    const explanation = `V = πr²h = π(${r})²(${h}) = ${piLabel(r * r * h)}.`;
    const pool: DistractorSpec[] = [
      {
        label: piLabel(2 * r * h),
        value: 2 * r * h * Math.PI,
        misconception: "order-of-operations",
        note: "Used 2πrh (lateral area) instead of πr²h.",
      },
      {
        label: piLabel(4 * r * r * h),
        value: 4 * r * r * h * Math.PI,
        misconception: "diameter-as-radius",
        note: "Used the diameter as the radius.",
      },
      {
        label: piLabel(r * r * h + r),
        value: (r * r * h + r) * Math.PI,
        misconception: "off-by-one",
        note: "Arithmetic slip in the final multiplication.",
      },
      {
        label: piLabel(r * r * h - r),
        value: (r * r * h - r) * Math.PI,
        misconception: "off-by-one",
        note: "Arithmetic slip in the final multiplication.",
      },
    ];
    const { options, keyIndex } = buildMCQ(rng, key, pickDistractors(rng, key.value, pool));
    return {
      type: "SAT", format: "MCQ", domain: "AdditionalTopics", subdomain: "Volume",
      standard: "A.T.2", difficulty, stem, options, keyIndex,
      key: key.label, keyValue: key.value, explanation,
      verify: { params: { r, h, cylinder: 1 }, note: "V = πr²h." },
    };
  }

  const l = randInt(rng, 2, 9);
  const w = randInt(rng, 2, 9);
  const h = randInt(rng, 2, 9);
  const solveFor = t === 2 && rng() < 0.4 ? pick(rng, ["l", "w", "h"] as const) : null;

  if (solveFor) {
    const dims = { l, w, h };
    const V = l * w * h;
    const missing = dims[solveFor];
    const mFrac = q(missing);
    const key = { label: qLabel(mFrac), value: qVal(mFrac) };
    const names = { l: "length", w: "width", h: "height" };
    const others = (["l", "w", "h"] as const).filter((d) => d !== solveFor);
    const stem =
      `A rectangular prism has volume ${V}. Its ${names[others[0]]} is ${dims[others[0]]} ` +
      `and its ${names[others[1]]} is ${dims[others[1]]}. What is its ${names[solveFor]}?`;
    const otherProd = dims[others[0]] * dims[others[1]];
    const explanation = `V = lwh, so ${names[solveFor]} = ${V}/${otherProd} = ${missing}.`;
    const pool: DistractorSpec[] = [
      {
        label: qLabel(q(V - (dims[others[0]] + dims[others[1]]))),
        value: V - (dims[others[0]] + dims[others[1]]),
        misconception: "added-instead-of-multiplied",
        note: "Subtracted the other dimensions instead of dividing by their product.",
      },
      {
        label: qLabel(q(missing + 1)),
        value: missing + 1,
        misconception: "off-by-one",
        note: "Arithmetic slip in the division.",
      },
      {
        label: qLabel(q(2 * missing)),
        value: 2 * missing,
        misconception: "order-of-operations",
        note: "Divided by only one dimension instead of two.",
      },
      {
        label: qLabel(q(missing - 1)),
        value: missing - 1,
        misconception: "off-by-one",
        note: "Arithmetic slip in the division.",
      },
    ];
    if (format === "MCQ") {
      const { options, keyIndex } = buildMCQ(rng, key, pickDistractors(rng, key.value, pool));
      return {
        type: "SAT", format, domain: "AdditionalTopics", subdomain: "Volume",
        standard: "A.T.2", difficulty, stem, options, keyIndex,
        key: key.label, keyValue: key.value, explanation,
        verify: { params: { l, w, h, solveFor }, note: "V = lwh; solve for the missing dimension." },
      };
    }
    return assembleProblem(rng, {
      domain: "AdditionalTopics", subdomain: "Volume", standard: "A.T.2",
      difficulty, stem, key, explanation,
      verify: { params: { l, w, h, solveFor }, note: "V = lwh." },
      format, gridInForms: qForms(mFrac),
    });
  }

  const V = l * w * h;
  const vFrac = q(V);
  const key = { label: qLabel(vFrac), value: qVal(vFrac) };
  const stem = `A rectangular prism has length ${l}, width ${w}, and height ${h}. What is the volume of the prism?`;
  const explanation = `V = lwh = ${l} × ${w} × ${h} = ${V}.`;
  const pool: DistractorSpec[] = [
    {
      label: qLabel(q(l + w + h)),
      value: l + w + h,
      misconception: "added-instead-of-multiplied",
      note: "Added the dimensions instead of multiplying them.",
    },
    {
      label: qLabel(q(2 * V)),
      value: 2 * V,
      misconception: "order-of-operations",
      note: "Doubled the volume — arithmetic slip.",
    },
    {
      label: qLabel(q(V + 1)),
      value: V + 1,
      misconception: "off-by-one",
      note: "Arithmetic slip in the final multiplication.",
    },
    {
      label: qLabel(q(V - 1)),
      value: V - 1,
      misconception: "off-by-one",
      note: "Arithmetic slip in the final multiplication.",
    },
  ];
  if (format === "MCQ") {
    const { options, keyIndex } = buildMCQ(rng, key, pickDistractors(rng, key.value, pool));
    return {
      type: "SAT", format, domain: "AdditionalTopics", subdomain: "Volume",
      standard: "A.T.2", difficulty, stem, options, keyIndex,
      key: key.label, keyValue: key.value, explanation,
      verify: { params: { l, w, h }, note: "V = lwh." },
    };
  }
  return assembleProblem(rng, {
    domain: "AdditionalTopics", subdomain: "Volume", standard: "A.T.2",
    difficulty, stem, key, explanation,
    verify: { params: { l, w, h }, note: "V = lwh." },
    format, gridInForms: qForms(vFrac),
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

export const SAT_ATM_MAKERS: SATMaker[] = [
  makeTriangleAngles,
  makeCircleMeasure,
  makeRightTriangleTrig,
  makeVolume,
];

/** Generate n Additional Topics problems using the provided RNG. */
export function generateSATAdditionalTopicsProblems(
  rng: RNG,
  n: number,
  difficulty: SATDifficulty
): SATProblem[] {
  return Array.from({ length: n }, () => {
    const maker = SAT_ATM_MAKERS[Math.floor(rng() * SAT_ATM_MAKERS.length)];
    return maker(rng, difficulty);
  });
}
