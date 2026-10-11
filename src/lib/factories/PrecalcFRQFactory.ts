// PrecalcFRQFactory.ts
// AP Precalculus stimulus-based multi-part FRQs. Each FRQ is built around ONE
// stimulus (a graph, a table of values, or a verbal scenario) with subparts
// (a)-(d), exactly like AP FRQs: justification language ("justify your
// answer"), reasoning from definitions, and calculator-active vs
// no-calculator flavor per FRQ.
// Pure + seeded (mulberry32). Difficulty: 1 -> 2 subparts, 2 -> 3, 3 -> 4.

import type { RNG } from "./PrecalcTypes";
import {
  randInt,
  pick,
  fmt,
  fracStr,
  fmtComplex,
  piLabel,
  type PrecalcDifficulty,
  type PrecalcFRQ,
} from "./PrecalcTypes";
import type { BaseFRQProblem, FRQSubpart, APStimulus } from "../apTypes";

// Re-exported for cards/tests (apTypes must not be edited).
export type { BaseFRQProblem, FRQSubpart, APStimulus };

type FRQMaker = (rng: RNG, difficulty: PrecalcDifficulty) => PrecalcFRQ;

function subpartsFor<T>(difficulty: PrecalcDifficulty, two: T[], three: T[], four: T[]): T[] {
  if (difficulty === 1) return two;
  if (difficulty === 2) return [...two, ...three];
  return [...two, ...three, ...four];
}

// -- 1. Trig graph FRQ ----------------------------------------------------

function trigValueAt(A: number, B: number, c: number, D: number, fn: 0 | 1, x: number): number {
  const inner = B * (x - c);
  return A * (fn === 0 ? Math.sin(inner) : Math.cos(inner)) + D;
}

function makeTrigGraphFRQ(rng: RNG, difficulty: PrecalcDifficulty): PrecalcFRQ {
  const A = randInt(rng, 1, 4);
  const B = pick(rng, [1, 2, 3] as const);
  const fn = pick(rng, [0, 1] as const) as 0 | 1;
  const cPair = pick(rng, [[0, 1], [1, 6], [1, 4], [1, 3], [1, 2]] as const);
  const c = (cPair[0] / cPair[1]) * Math.PI;
  const D = randInt(rng, -2, 2);
  const fnName = fn === 0 ? "sin" : "cos";
  const periodStr = B === 1 ? "2π" : B === 2 ? "π" : "2π/3";
  const phaseStr = cPair[0] === 0 ? "0" : piLabel(cPair[0], cPair[1]);
  const yInt = trigValueAt(A, B, c, D, fn, 0);

  const params: Record<string, unknown> = {
    kind: "trig-graph",
    fnType: fnName,
    a: A, b: B, c, d: D,
    xMin: -1, xMax: 2 * Math.PI + 1,
    amplitude: A,
    periodNum: 2, periodDen: B,
    midline: D,
    phaseNum: cPair[0], phaseDen: cPair[1],
    maxY: D + A, minY: D - A,
    yIntercept: Number(yInt.toFixed(6)),
  };

  const subA: FRQSubpart = {
    label: "a",
    prompt: `What are the amplitude and the midline of f? Justify your answer using the graph.`,
    answer: `Amplitude ${A}; midline y = ${D}.`,
    justification: `The graph oscillates ${A} units above and below the horizontal center line y = ${D}, so the amplitude is ${A} and the midline is y = ${D}.`,
    points: 2,
  };
  const subB: FRQSubpart = {
    label: "b",
    prompt: `What is the period of f? Justify your answer using the graph.`,
    answer: `Period ${periodStr}.`,
    justification: `The graph completes one full cycle over an interval of length ${periodStr}, so the period is ${periodStr}.`,
    points: 2,
  };
  const subC: FRQSubpart = {
    label: "c",
    prompt: `Write an equation for f in the form y = A ${fnName}(B(x - C)) + D.`,
    answer: `y = ${A} ${fnName}(${B === 1 ? "" : B}(x - ${phaseStr})) ${D >= 0 ? "+" : "-"} ${Math.abs(D)}`,
    justification: `A = ${A} is the amplitude, B = ${B} gives period ${periodStr}, C = ${phaseStr} is the phase shift, D = ${D} is the midline.`,
    points: 3,
  };
  // Part (d): calculator-active numeric solve on [0, 2pi).
  const t = pick(rng, [0.35, 0.6, -0.45, 0.8] as const);
  const k = D + A * t;
  const s = t; // (k - D)/A
  const base = fn === 0 ? Math.asin(s) : Math.acos(s);
  const sols: number[] = [];
  for (let nIdx = -1; nIdx <= B + 1; nIdx++) {
    const th1 = base + 2 * Math.PI * nIdx;
    const th2 = (fn === 0 ? Math.PI - base : -base) + 2 * Math.PI * nIdx;
    for (const th of [th1, th2]) {
      const x = th / B + c;
      if (x >= -1e-9 && x < 2 * Math.PI - 1e-9) sols.push(x);
    }
  }
  // Dedupe numerically (rounded to 3 decimals), then sort numerically.
  const seen = new Set<string>();
  const uniqNums: number[] = [];
  for (const x of sols) {
    const key = fmt(x);
    if (!seen.has(key)) {
      seen.add(key);
      uniqNums.push(x);
    }
  }
  uniqNums.sort((p, q) => p - q);
  const uniq = uniqNums.map((x) => fmt(x));
  const subD: FRQSubpart = {
    label: "d",
    prompt: `Use a calculator to solve f(x) = ${fmt(k)} on the interval [0, 2π). Round to three decimal places.`,
    answer: `x = ${uniq.join(", ")}.`,
    justification: `Graphing y = f(x) and y = ${fmt(k)} shows intersections at x = ${uniq.join(", ")}.`,
    points: 2,
  };

  const subparts = subpartsFor(difficulty, [subA, subB], [subC], [subD]);
  const calculator = difficulty === 3; // part (d) needs a calculator
  return {
    type: "AP_FRQ",
    subject: "precalc",
    calculator,
    stimulus: {
      kind: "graph",
      graphKind: "precalc-trig-graph",
      params,
      caption: `The graph of a trigonometric function f over [0, 2π).`,
    },
    subparts,
    topicTag: "trig",
    topicLabel: "Trigonometry & Trig Functions",
    verify: {
      kind: "trig-graph",
      inputs: { A, B, cNum: cPair[0], cDen: cPair[1], D, fn, k, t },
    },
  };
}

// -- 2. Limits table FRQ ----------------------------------------------------

function makeLimitsTableFRQ(rng: RNG, difficulty: PrecalcDifficulty): PrecalcFRQ {
  const a = randInt(rng, 2, 6) * pick(rng, [1, -1] as const);
  const denomStr = a > 0 ? `(x − ${a})` : `(x + ${-a})`;
  const f = (x: number) => (x * x - a * a) / (x - a); // = x + a away from a
  const offs = [0.1, 0.01, 0.001];
  const rows: string[][] = [];
  for (const o of offs) rows.push([fmt(a - o, 3), fmt(f(a - o), 4)]);
  for (const o of offs) rows.push([fmt(a + o, 3), fmt(f(a + o), 4)]);
  const L = 2 * a;

  const subA: FRQSubpart = {
    label: "a",
    prompt: `Estimate lim(x→${a}) f(x). Justify your answer using the table.`,
    answer: `${L}.`,
    justification: `From the left, f(x) approaches ${fmt(L - 0.001, 4)} ≈ ${L}; from the right, f(x) approaches ${fmt(L + 0.001, 4)} ≈ ${L}. Both one-sided values agree, so the limit is ${L}.`,
    points: 2,
  };
  const subB: FRQSubpart = {
    label: "b",
    prompt: `Is f continuous at x = ${a}? Justify your answer.`,
    answer: `No.`,
    justification: `The limit as x→${a} is ${L}, but f(${a}) is undefined (division by zero), so lim(x→${a}) f(x) ≠ f(${a}).`,
    points: 2,
  };
  const subC: FRQSubpart = {
    label: "c",
    prompt: `Estimate lim(x→${a}) [3f(x) − 1]. Justify using the limit laws.`,
    answer: `${3 * L - 1}.`,
    justification: `By the limit laws, 3·lim f(x) − 1 = 3(${L}) − 1 = ${3 * L - 1}.`,
    points: 2,
  };
  const subD: FRQSubpart = {
    label: "d",
    prompt: `Find lim(x→${a}) f(x) algebraically. Show your reasoning.`,
    answer: `${L}.`,
    justification: `Factor: (x² − ${a * a})/(x − ${a}) = (x − ${a})(x + ${a})/(x − ${a}) = x + ${a} for x ≠ ${a}; substituting gives ${a} + ${a} = ${L}.`,
    points: 3,
  };
  return {
    type: "AP_FRQ",
    subject: "precalc",
    calculator: false,
    stimulus: {
      kind: "table",
      headers: ["x", "f(x)"],
      rows,
      caption: `Selected values of f(x) = (x² − ${a * a})/${denomStr} near x = ${a}. Note: f(${a}) is undefined.`,
    },
    subparts: subpartsFor(difficulty, [subA, subB], [subC], [subD]),
    topicTag: "limits",
    topicLabel: "Introduction to Limits",
    verify: { kind: "limits-table", inputs: { a } },
  };
}

// -- 3. Vector scenario FRQ ---------------------------------------------------

function makeVectorScenarioFRQ(rng: RNG, difficulty: PrecalcDifficulty): PrecalcFRQ {
  const p = pick(rng, [400, 500, 600] as const);
  const alpha = pick(rng, [20, 30, 45] as const);
  const w = pick(rng, [40, 60, 80] as const);
  const beta = pick(rng, [150, 200, 210] as const);
  const ar = (alpha * Math.PI) / 180;
  const br = (beta * Math.PI) / 180;
  const pvx = p * Math.cos(ar), pvy = p * Math.sin(ar);
  const wvx = w * Math.cos(br), wvy = w * Math.sin(br);
  const rx = pvx + wvx, ry = pvy + wvy;
  const speed = Math.hypot(rx, ry);
  const dirDeg = (Math.atan2(ry, rx) * 180) / Math.PI;

  const subA: FRQSubpart = {
    label: "a",
    prompt: `Write the wind velocity as a component vector (u, v) in km/h. Round to two decimal places.`,
    answer: `(${fmt(wvx, 2)}, ${fmt(wvy, 2)}).`,
    justification: `Wind components: (${w} cos ${beta}°, ${w} sin ${beta}°) = (${fmt(wvx, 2)}, ${fmt(wvy, 2)}).`,
    points: 2,
  };
  const subB: FRQSubpart = {
    label: "b",
    prompt: `Find the resultant ground velocity vector. Round to two decimal places.`,
    answer: `(${fmt(rx, 2)}, ${fmt(ry, 2)}).`,
    justification: `Add the air velocity (${fmt(pvx, 2)}, ${fmt(pvy, 2)}) and the wind vector from part (a).`,
    points: 2,
  };
  const subC: FRQSubpart = {
    label: "c",
    prompt: `Find the ground speed of the airplane in km/h. Round to one decimal place.`,
    answer: `${fmt(speed, 1)} km/h.`,
    justification: `Ground speed is the magnitude of the resultant: √(${fmt(rx, 2)}² + ${fmt(ry, 2)}²) ≈ ${fmt(speed, 1)}.`,
    points: 2,
  };
  const subD: FRQSubpart = {
    label: "d",
    prompt: `Find the direction angle of the resultant (standard position, degrees). Round to one decimal place.`,
    answer: `${fmt(dirDeg, 1)}°.`,
    justification: `θ = arctan(ry/rx) adjusted to the correct quadrant = ${fmt(dirDeg, 1)}°.`,
    points: 2,
  };
  return {
    type: "AP_FRQ",
    subject: "precalc",
    calculator: true,
    stimulus: {
      kind: "scenario",
      text: `An airplane flies with an airspeed of ${p} km/h at a standard-position angle of ${alpha}°. The wind blows at ${w} km/h at a standard-position angle of ${beta}°. Use a calculator for parts (c) and (d).`,
    },
    subparts: subpartsFor(difficulty, [subA, subB], [subC], [subD]),
    topicTag: "vectors",
    topicLabel: "Vectors",
    verify: { kind: "vector-scenario", inputs: { p, alpha, w, beta } },
  };
}

// -- 4. Polar graph FRQ --------------------------------------------------------

function makePolarGraphFRQ(rng: RNG, difficulty: PrecalcDifficulty): PrecalcFRQ {
  const a = pick(rng, [1, 2] as const);
  const b = a + pick(rng, [1, 2] as const);
  const maxR = a + b;
  const eq = `r = ${a} + ${b} cos θ`;
  const params: Record<string, unknown> = {
    kind: "polar-grid",
    points: [],
    rMax: maxR + 1,
    curve: { a, b, curveType: a === b ? "cardioid-cos" : "limacon-cos" },
    maxR, maxThetaDeg: 0,
    minR: a - b,
  };
  const subA: FRQSubpart = {
    label: "a",
    prompt: `What is the maximum value of r on the graph, and at what value of θ in [0, 2π) does it occur? Justify.`,
    answer: `Maximum r = ${maxR} at θ = 0.`,
    justification: `r = ${a} + ${b} cos θ is largest when cos θ = 1, i.e. θ = 0, giving r = ${a} + ${b} = ${maxR}.`,
    points: 2,
  };
  const subB: FRQSubpart = {
    label: "b",
    prompt: `Is the graph symmetric about the polar axis? Justify your answer using a symmetry test.`,
    answer: `Yes.`,
    justification: `Replacing θ with −θ: r = ${a} + ${b} cos(−θ) = ${a} + ${b} cos θ, unchanged. So the graph is symmetric about the polar axis.`,
    points: 2,
  };
  const subC: FRQSubpart = {
    label: "c",
    prompt: `Convert the point where r is maximal to rectangular coordinates (x, y).`,
    answer: `(${maxR}, 0).`,
    justification: `x = r cos θ = ${maxR}·cos 0 = ${maxR}; y = r sin θ = ${maxR}·sin 0 = 0.`,
    points: 2,
  };
  const subD: FRQSubpart = {
    label: "d",
    prompt: `Find the value(s) of θ in [0, π] where r = ${a}. Justify.`,
    answer: `θ = π/2.`,
    justification: `${a} + ${b} cos θ = ${a} gives cos θ = 0; in [0, π] this happens at θ = π/2.`,
    points: 2,
  };
  return {
    type: "AP_FRQ",
    subject: "precalc",
    calculator: false,
    stimulus: {
      kind: "graph",
      graphKind: "precalc-polar",
      params,
      caption: `The graph of the polar equation ${eq}.`,
    },
    subparts: subpartsFor(difficulty, [subA, subB], [subC], [subD]),
    topicTag: "parametric-polar",
    topicLabel: "Parametric & Polar",
    verify: { kind: "polar-graph", inputs: { a, b } },
  };
}

// -- 5. Conic scenario FRQ ------------------------------------------------------

function makeConicScenarioFRQ(rng: RNG, difficulty: PrecalcDifficulty): PrecalcFRQ {
  const useDish = rng() < 0.5;
  if (useDish) {
    const pair = pick(rng, [[8, 2], [12, 3], [8, 4], [16, 4]] as const);
    const w = pair[0], d = pair[1];
    const p = (w * w) / (16 * d); // integer by construction
    const eq = `y = x²/${4 * p}`;
    const subA: FRQSubpart = {
      label: "a",
      prompt: `Write the equation of the dish cross-section in the form y = x²/(4p).`,
      answer: `${eq} (p = ${p}).`,
      justification: `The rim point (${w / 2}, ${d}) lies on y = x²/(4p): ${d} = ${(w / 2) * (w / 2)}/(4p), so p = ${p}.`,
      points: 3,
    };
    const subB: FRQSubpart = {
      label: "b",
      prompt: `Where should the receiver be placed? Justify using the definition of a parabola.`,
      answer: `At the focus (0, ${p}), ${p} units above the vertex.`,
      justification: `For y = x²/(4p) the focus is (0, p) = (0, ${p}); rays parallel to the axis reflect to the focus.`,
      points: 2,
    };
    const subC: FRQSubpart = {
      label: "c",
      prompt: `What is the equation of the directrix?`,
      answer: `y = ${-p}.`,
      justification: `The directrix is p = ${p} units below the vertex: y = −p = ${-p}.`,
      points: 1,
    };
    const subD: FRQSubpart = {
      label: "d",
      prompt: `If the depth doubles while the diameter stays the same, what happens to p? Justify.`,
      answer: `p is halved.`,
      justification: `p = w²/(16d); doubling d halves the value, so the new p is ${p}/2.`,
      points: 2,
    };
    return {
      type: "AP_FRQ",
      subject: "precalc",
      calculator: false,
      stimulus: {
        kind: "scenario",
        text: `A satellite dish has a parabolic cross-section with diameter ${w} meters and depth ${d} meters. Place the vertex at the origin with the dish opening upward.`,
      },
      subparts: subpartsFor(difficulty, [subA, subB], [subC], [subD]),
      topicTag: "conics",
      topicLabel: "Conic Sections",
      verify: { kind: "conic-scenario", inputs: { w, d, p, variant: 0 } },
    };
  }
  // Elliptical gallery
  const o = pick(rng, [
    { a: 10, c: 6, b: 8 }, { a: 10, c: 8, b: 6 }, { a: 13, c: 12, b: 5 },
  ] as const);
  const eq = `x²/${o.a * o.a} + y²/${o.b * o.b} = 1`;
  const subA: FRQSubpart = {
    label: "a",
    prompt: `Write the equation of the elliptical ceiling (centered at the origin, major axis horizontal).`,
    answer: `${eq}.`,
    justification: `Semi-major axis a = ${o.a}; b² = a² − c² = ${o.a * o.a} − ${o.c * o.c} = ${o.b * o.b}.`,
    points: 3,
  };
  const subB: FRQSubpart = {
    label: "b",
    prompt: `What is the length of the minor axis? Justify.`,
    answer: `${2 * o.b}.`,
    justification: `b = √(${o.b * o.b}) = ${o.b}, so the minor axis is 2b = ${2 * o.b}.`,
    points: 2,
  };
  const subC: FRQSubpart = {
    label: "c",
    prompt: `What are the coordinates of the vertices?`,
    answer: `(−${o.a}, 0) and (${o.a}, 0).`,
    justification: `Vertices lie on the major axis at (±a, 0) = (±${o.a}, 0).`,
    points: 1,
  };
  const subD: FRQSubpart = {
    label: "d",
    prompt: `If the foci move twice as far from the center while the major axis stays the same, what happens to b? Justify.`,
    answer: `b decreases.`,
    justification: `b² = a² − c² with a fixed: doubling c increases c², so b² (and b) decreases.`,
    points: 2,
  };
  return {
    type: "AP_FRQ",
    subject: "precalc",
    calculator: false,
    stimulus: {
      kind: "scenario",
      text: `A whispering gallery has an elliptical ceiling with major axis ${2 * o.a} meters. Two people stand at the foci, ${o.c} meters on either side of the center, and can hear each other whisper.`,
    },
    subparts: subpartsFor(difficulty, [subA, subB], [subC], [subD]),
    topicTag: "conics",
    topicLabel: "Conic Sections",
    verify: { kind: "conic-scenario", inputs: { a: o.a, b: o.b, c: o.c, variant: 1 } },
  };
}

// -- 6. Complex plane FRQ -------------------------------------------------------

const Z1_OPTS = [
  { re: 1, im: 1, r: "√2", deg: 45 },
  { re: 2, im: 2, r: "2√2", deg: 45 },
  { re: 3, im: 0, r: "3", deg: 0 },
  { re: 0, im: 2, r: "2", deg: 90 },
];

function makeComplexPlaneFRQ(rng: RNG, difficulty: PrecalcDifficulty): PrecalcFRQ {
  const z1 = pick(rng, Z1_OPTS);
  const c = randInt(rng, -4, 4) || 2;
  const d = randInt(rng, -4, 4) || -1;
  const sumRe = z1.re + c, sumIm = z1.im + d;
  const mod2 = Math.hypot(c, d);
  const prodRe = z1.re * c - z1.im * d;
  const prodIm = z1.re * d + z1.im * c;
  const params: Record<string, unknown> = {
    kind: "complex-plane",
    points: [
      { re: z1.re, im: z1.im, label: "z1" },
      { re: c, im: d, label: "z2" },
    ],
    range: Math.max(Math.abs(z1.re), Math.abs(z1.im), Math.abs(c), Math.abs(d), 2) + 1,
  };
  const subA: FRQSubpart = {
    label: "a",
    prompt: `Write z1 + z2 in a+bi form. Justify using vector addition on the complex plane.`,
    answer: `${fmtComplex(sumRe, sumIm)}.`,
    justification: `Adding vectors tip-to-tail on the graph: (${fmtComplex(z1.re, z1.im)}) + (${fmtComplex(c, d)}) = ${fmtComplex(sumRe, sumIm)}.`,
    points: 2,
  };
  const subB: FRQSubpart = {
    label: "b",
    prompt: `Find |z2|.`,
    answer: `${fmt(mod2)}.`,
    justification: `|z2| = √(${c}² + ${d}²) = √${c * c + d * d} ≈ ${fmt(mod2)}.`,
    points: 2,
  };
  const subC: FRQSubpart = {
    label: "c",
    prompt: `Write z1 in polar form r(cos θ + i sin θ).`,
    answer: `${z1.r}(cos ${z1.deg}° + i sin ${z1.deg}°).`,
    justification: `r = √(${z1.re}² + ${z1.im}²) = ${z1.r}; θ = arctan(${z1.im}/${z1.re}) = ${z1.deg}°.`,
    points: 2,
  };
  const subD: FRQSubpart = {
    label: "d",
    prompt: `Compute z1 · z2 in a+bi form. Show your reasoning.`,
    answer: `${fmtComplex(prodRe, prodIm)}.`,
    justification: `FOIL with i² = −1: real part ${z1.re}·${c} − ${z1.im}·${d} = ${prodRe}, imaginary part ${z1.re}·${d} + ${z1.im}·${c} = ${prodIm}.`,
    points: 3,
  };
  return {
    type: "AP_FRQ",
    subject: "precalc",
    calculator: false,
    stimulus: {
      kind: "graph",
      graphKind: "precalc-complex-plane",
      params,
      caption: `The complex numbers z1 = ${fmtComplex(z1.re, z1.im)} and z2 = ${fmtComplex(c, d)} plotted on the complex plane.`,
    },
    subparts: subpartsFor(difficulty, [subA, subB], [subC], [subD]),
    topicTag: "complex",
    topicLabel: "Complex Numbers",
    verify: { kind: "complex-plane", inputs: { re1: z1.re, im1: z1.im, deg1: z1.deg, c, d } },
  };
}

// -- 7. Parametric scenario FRQ ---------------------------------------------------

function makeParametricScenarioFRQ(rng: RNG, difficulty: PrecalcDifficulty): PrecalcFRQ {
  const v = pick(rng, [10, 20] as const);
  const u = pick(rng, [20, 25, 30] as const);
  const tHit = u / 5;
  const yAt2 = 2 * u - 20;
  const maxH = (u * u) / 20;
  const slope = fracStr(u, v);
  const curve = fracStr(5, v * v);
  const subA: FRQSubpart = {
    label: "a",
    prompt: `Find the position (x, y) of the projectile at t = 2 seconds.`,
    answer: `(${2 * v}, ${yAt2}).`,
    justification: `x(2) = ${v}(2) = ${2 * v}; y(2) = ${u}(2) − 5(2)² = ${yAt2}.`,
    points: 2,
  };
  const subB: FRQSubpart = {
    label: "b",
    prompt: `Eliminate the parameter to write y as a function of x.`,
    answer: `y = ${slope}x − ${curve}x².`,
    justification: `t = x/${v}; substituting: y = ${u}(x/${v}) − 5(x/${v})² = ${slope}x − ${curve}x².`,
    points: 3,
  };
  const subC: FRQSubpart = {
    label: "c",
    prompt: `At what time t > 0 does the projectile hit the ground (y = 0)? Justify.`,
    answer: `t = ${fmt(tHit)} seconds.`,
    justification: `${u}t − 5t² = t(${u} − 5t) = 0 gives t = 0 (launch) or t = ${u}/5 = ${fmt(tHit)}.`,
    points: 2,
  };
  const subD: FRQSubpart = {
    label: "d",
    prompt: `What is the maximum height of the projectile? Justify.`,
    answer: `${fmt(maxH)} meters.`,
    justification: `The height is a downward parabola in t; its vertex is at t = ${u}/10 = ${fmt(u / 10)}, giving y = ${fmt(maxH)}.`,
    points: 2,
  };
  return {
    type: "AP_FRQ",
    subject: "precalc",
    calculator: false,
    stimulus: {
      kind: "scenario",
      text: `A projectile is launched with horizontal velocity ${v} m/s and initial vertical velocity ${u} m/s. Its position t seconds after launch is x = ${v}t, y = ${u}t − 5t² (meters).`,
    },
    subparts: subpartsFor(difficulty, [subA, subB], [subC], [subD]),
    topicTag: "parametric-polar",
    topicLabel: "Parametric & Polar",
    verify: { kind: "parametric-scenario", inputs: { v, u } },
  };
}

// -- Registry ---------------------------------------------------------------------

export const FRQ_MAKERS: Record<string, FRQMaker> = {
  trigGraph: makeTrigGraphFRQ,
  limitsTable: makeLimitsTableFRQ,
  vectorScenario: makeVectorScenarioFRQ,
  polarGraph: makePolarGraphFRQ,
  conicScenario: makeConicScenarioFRQ,
  complexPlane: makeComplexPlaneFRQ,
  parametricScenario: makeParametricScenarioFRQ,
};

export const FRQ_MAKER_KEYS = Object.keys(FRQ_MAKERS);

/** Generate n stimulus-based FRQs at the given difficulty (1->2 parts, 2->3, 3->4). */
export function generatePrecalcFRQs(
  rng: RNG,
  n: number,
  difficulty: PrecalcDifficulty = 2
): PrecalcFRQ[] {
  const keys = FRQ_MAKER_KEYS;
  return Array.from({ length: n }, () =>
    FRQ_MAKERS[keys[Math.floor(rng() * keys.length) % keys.length]](rng, difficulty)
  );
}
