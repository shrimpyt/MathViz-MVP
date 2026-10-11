// MiddleSchoolGrade8.ts
// Grade 8 problem generators: multi-step linear equations (variables on both
// sides), functions, systems of equations (graphical intro), Pythagorean
// theorem, transformations on coordinate grids, scientific notation, volume of
// cylinders/cones/spheres, scatter plot basics.
// Pure, seeded, deterministic. Difficulty tiers 1|2|3 are cumulative.
//
// TEKS alignment (Texas, grade 8): 8.8 (equations), 8.5 (functions &
// representations), 8.9 (systems, graphical), 8.7 (Pythagorean), 8.10
// (transformations), 8.2 (scientific notation), 8.7 (volume of 3D solids),
// 8.11 (scatter plots).

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type {
  Grade8Problem,
  Grade8Subtype,
  MiddleSchoolSVGParams,
  MSPoint,
} from "./MiddleSchoolTypes";
import {
  fmt,
  roundTo,
  randNonZero,
  shuffled,
  signStr,
  linearEquation,
} from "./MiddleSchoolUtils";

export type Grade8Difficulty = 1 | 2 | 3;

type Maker = (rng: RNG) => Grade8Problem;
interface MakerEntry {
  tier: Grade8Difficulty;
  subtype: Grade8Subtype;
  make: Maker;
}

function build(
  subtype: Grade8Subtype,
  prompt: string,
  find: string,
  answer: number | string,
  steps: Grade8Problem["steps"],
  given: Record<string, number | string>,
  svgParams?: MiddleSchoolSVGParams | null,
  unit?: string
): Grade8Problem {
  return {
    type: "MS.8",
    subtype,
    prompt,
    find,
    answer,
    steps,
    given,
    svgParams: svgParams ?? null,
    ...(unit ? { unit } : {}),
  };
}

function grid(
  points: MSPoint[] = [],
  segments: { x1: number; y1: number; x2: number; y2: number; dashed?: boolean }[] = [],
  polygons: { points: MSPoint[]; label?: string; dashed?: boolean }[] = []
): MiddleSchoolSVGParams {
  return {
    kind: "MSCoordinateGrid",
    minX: -10,
    maxX: 10,
    minY: -10,
    maxY: 10,
    points,
    segments,
    polygons,
    showAxesLabels: true,
  };
}

/** Endpoints of y = m·x + b clipped to the [-10, 10]² box. */
function lineBoxEndpoints(m: number, b: number): { x1: number; y1: number; x2: number; y2: number } {
  const B = 10;
  const pts: [number, number][] = [];
  for (const x of [-B, B]) {
    const y = m * x + b;
    if (y >= -B && y <= B) pts.push([x, y]);
  }
  if (m !== 0) {
    for (const y of [-B, B]) {
      const x = (y - b) / m;
      if (x >= -B && x <= B && !pts.some(([px, py]) => Math.abs(px - x) < 1e-9 && Math.abs(py - y) < 1e-9)) {
        pts.push([x, y]);
      }
    }
  }
  if (pts.length < 2) return { x1: -B, y1: m * -B + b, x2: B, y2: m * B + b };
  // take the two points farthest apart
  let best: [number, number][] = [pts[0], pts[1]];
  let bestD = -1;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const d = (pts[i][0] - pts[j][0]) ** 2 + (pts[i][1] - pts[j][1]) ** 2;
      if (d > bestD) {
        bestD = d;
        best = [pts[i], pts[j]];
      }
    }
  }
  return { x1: best[0][0], y1: best[0][1], x2: best[1][0], y2: best[1][1] };
}

// ── Linear equations (variables on both sides) ───────────────────────────────

function makeVariablesBothSides(rng: RNG): Grade8Problem {
  // ax + b = cx + d with a != c, integer solution
  const a = randInt(rng, 2, 6);
  const c = randInt(rng, 1, a - 1 + 1);
  const cc = c === a ? a - 1 : c;
  const x = randInt(rng, -8, 8) || 2;
  const b = randInt(rng, -10, 10);
  const d = (a - cc) * x + b;
  const eq = linearEquation(a, b, cc, d);
  const lhsSimplified = `${a - cc === 1 ? "x" : `${a - cc}x`} ${signStr(b)} ${Math.abs(b)} = ${d}`;
  return build(
    "LinearEquations",
    `Solve for x: ${eq}.`,
    "the value of x",
    x,
    [
      {
        instruction: `Subtract ${cc === 1 ? "x" : `${cc}x`} from both sides and simplify:`,
        blanks: [{ label: "simplified", answer: lhsSimplified }],
      },
      {
        instruction: `Undo the constant, then divide by ${a - cc}:`,
        blanks: [{ label: "x =", answer: String(x) }],
      },
    ],
    { a, b, c: cc, d, kind: "both-sides" }
  );
}

function makeDistributiveBothSides(rng: RNG): Grade8Problem {
  // a(x + b) = cx + d
  const a = randInt(rng, 2, 4);
  const x = randInt(rng, 2, 8);
  const b = randInt(rng, 1, 5);
  const cc = randInt(rng, 1, a - 1); // < a, so a − cc > 0 and x is unique
  const d = (a - cc) * x + a * b; // > 0
  const eq = `${a}(x + ${b}) = ${linearEquationRight(cc, d)}`;
  return build(
    "LinearEquations",
    `Solve for x: ${eq}.`,
    "the value of x",
    x,
    [
      {
        instruction: `Distribute ${a}: ${a}x + ${a * b} = ${linearEquationRight(cc, d)}.`,
        blanks: [{ label: "distributed", answer: `${a}x + ${a * b} = ${linearEquationRight(cc, d)}` }],
      },
      {
        instruction: "Collect x-terms on one side, then solve:",
        blanks: [{ label: "x =", answer: String(x) }],
      },
    ],
    { a, b, c: cc, d, kind: "distributive-both" }
  );
}

function linearEquationRight(c: number, d: number): string {
  return d === 0 ? (c === 1 ? "x" : `${c}x`) : `${c === 1 ? "x" : `${c}x`} ${signStr(d)} ${Math.abs(d)}`;
}

function makeSpecialSolutions(rng: RNG): Grade8Problem {
  const noSolution = rng() < 0.5;
  const a = randInt(rng, 2, 6);
  const b = randInt(rng, 1, 9);
  const d = noSolution ? b + randNonZero(rng, 1, 5) : b;
  const eq = linearEquation(a, b, a, d);
  const ans = noSolution ? "no solution" : "infinitely many solutions";
  return build(
    "LinearEquations",
    `Solve for x: ${eq}. If there is no solution, write "no solution". If there are infinitely many solutions, write "infinitely many solutions".`,
    "the solution",
    ans,
    [
      {
        instruction: `Subtract ${a === 1 ? "x" : `${a}x`} from both sides:`,
        blanks: [{ label: "simplified", answer: noSolution ? `${b} = ${d}` : `${b} = ${b}` }],
      },
      {
        instruction: noSolution
          ? `${b} = ${d} is false, so the equation has:`
          : `${b} = ${b} is always true, so the equation has:`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { a, b, d, kind: noSolution ? "no-solution" : "infinite" }
  );
}

function makeLinearWord8(rng: RNG): Grade8Problem {
  const rateA = randInt(rng, 8, 15);
  const rateB = rateA + randInt(rng, 2, 6);
  const feeA = randInt(rng, 20, 50);
  const feeB = Math.max(0, feeA - randInt(rng, 10, 25));
  // rateA * m + feeA = rateB * m + feeB → m = (feeA - feeB)/(rateB - rateA)
  const num = feeA - feeB;
  const den = rateB - rateA;
  const m = num / den;
  const months = Math.round(m * 2) / 2;
  // rebuild totals with the rounded month count for a clean answer
  const totalA = roundTo(rateA * months + feeA, 2);
  return build(
    "LinearEquations",
    `Plan A charges $${feeA} plus $${rateA} per month. Plan B charges $${feeB} plus $${rateB} per month. After how many months will the two plans cost the same?`,
    "the number of months",
    fmt(months),
    [
      {
        instruction: `Write the equation: ${rateA}m + ${feeA} = ${rateB}m + ${feeB}.`,
        blanks: [{ label: "equation", answer: `${rateA}m + ${feeA} = ${rateB}m + ${feeB}` }],
      },
      {
        instruction: "Solve for m:",
        blanks: [{ label: "m =", answer: fmt(months) }],
      },
    ],
    { rateA, rateB, feeA, feeB, months: fmt(months), wordKind: "plans", check: fmt(totalA) }
  );
}

// ── Functions ────────────────────────────────────────────────────────────────

function makeIdentifyFunction(rng: RNG): Grade8Problem {
  const isFunction = rng() < 0.6;
  const xs = shuffled(rng, [1, 2, 3, 4, 5, 6]);
  const use = xs.slice(0, 4);
  let pairs: { x: number; y: number }[];
  if (isFunction) {
    pairs = use.map((x) => ({ x, y: randInt(rng, 1, 20) }));
  } else {
    pairs = use.map((x) => ({ x, y: randInt(rng, 1, 20) }));
    pairs[3] = { x: pairs[0].x, y: pairs[0].y + randInt(rng, 1, 5) }; // repeated x, different y
  }
  const table = pairs.map((p) => `(${p.x}, ${p.y})`).join(", ");
  const ans = isFunction ? "function" : "not a function";
  return build(
    "Functions",
    `Determine whether the relation ${table} is a function.`,
    "function or not",
    ans,
    [
      {
        instruction: "A relation is a function if each input (x) has exactly one output (y).",
        blanks: [{ label: "repeated input?", answer: isFunction ? "no" : "yes" }],
      },
      {
        instruction: "Therefore the relation is a:",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { points: table, isFunction: isFunction ? 1 : 0 }
  );
}

function makeCompareFunctions(rng: RNG): Grade8Problem {
  // f: y = m1 x + b1 (table), g: y = m2 x + b2 (equation); which has greater rate of change?
  const m1 = randInt(rng, 1, 5);
  const b1 = randInt(rng, 0, 8);
  let m2 = randInt(rng, 1, 5);
  while (m2 === m1) m2 = randInt(rng, 1, 5);
  const b2 = randInt(rng, 0, 8);
  const xs = [0, 1, 2, 3];
  const table = xs.map((x) => `(${x}, ${m1 * x + b1})`).join(", ");
  const faster = m1 > m2 ? "the table" : "the equation";
  return build(
    "Functions",
    `Function f is shown in the table: ${table}. Function g is given by y = ${m2}x + ${b2}. Which function has the greater rate of change?`,
    "the function with the greater rate",
    faster,
    [
      {
        instruction: `Rate of change of f: y increases by ${m1} each time x increases by 1.`,
        blanks: [{ label: "rate of f", answer: String(m1) }],
      },
      {
        instruction: `Rate of change of g: the coefficient of x is ${m2}. Compare:`,
        blanks: [{ label: "answer", answer: faster }],
      },
    ],
    { m1, b1, m2, b2, table }
  );
}

function makeLinearVsNonlinear(rng: RNG): Grade8Problem {
  const nonlinear = rng() < 0.5;
  const a = randInt(rng, 2, 5);
  const b = randInt(rng, 1, 6);
  const eq = nonlinear ? `y = ${a}x² + ${b}` : `y = ${a}x + ${b}`;
  const xs = [0, 1, 2, 3];
  const ys = xs.map((x) => (nonlinear ? a * x * x + b : a * x + b));
  const table = xs.map((x, i) => `(${x}, ${ys[i]})`).join(", ");
  const ans = nonlinear ? "nonlinear" : "linear";
  return build(
    "Functions",
    `Is the function ${eq} linear or nonlinear? Use the table ${table} to justify.`,
    "linear or nonlinear",
    ans,
    [
      {
        instruction: nonlinear
          ? `First differences of y: ${ys[1] - ys[0]}, ${ys[2] - ys[1]}, ${ys[3] - ys[2]} — not constant.`
          : `First differences of y: ${ys[1] - ys[0]}, ${ys[2] - ys[1]}, ${ys[3] - ys[2]} — constant.`,
        blanks: [{ label: "differences constant?", answer: nonlinear ? "no" : "yes" }],
      },
      {
        instruction: "Therefore the function is:",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { a, b, nonlinear: nonlinear ? 1 : 0, table }
  );
}

function makeFunctionWord(rng: RNG): Grade8Problem {
  const rate = randInt(rng, 2, 6);
  const base = randInt(rng, 5, 20);
  const x = randInt(rng, 3, 10);
  const ans = rate * x + base;
  return build(
    "Functions",
    `The function f(x) = ${rate}x + ${base} models the total cost of renting equipment for x hours. What is f(${x})?`,
    "the value",
    `$${ans}`,
    [
      {
        instruction: `Substitute ${x} for x: f(${x}) = ${rate}(${x}) + ${base}.`,
        blanks: [{ label: "substituted", answer: `${rate * x} + ${base}` }],
      },
      {
        instruction: "Simplify and include units:",
        blanks: [{ label: "answer", answer: `$${ans}` }],
      },
    ],
    { rate, base, x, wordKind: "function-eval" }
  );
}

// ── Systems of equations (graphical intro) ───────────────────────────────────

function makeSystemGraph(rng: RNG): Grade8Problem {
  // y = x + b1 and y = -x + b2 intersect at integer point
  const sx = randInt(rng, -4, 4);
  const sy = randInt(rng, -4, 4);
  const b1 = sy - sx;
  const b2 = sy + sx;
  const eq1 = `y = x ${signStr(b1)} ${Math.abs(b1)}`;
  const eq2 = `y = −x ${signStr(b2)} ${Math.abs(b2)}`;
  const ans = `(${sx}, ${sy})`;
  const seg1 = lineBoxEndpoints(1, b1);
  const seg2 = lineBoxEndpoints(-1, b2);
  return build(
    "SystemsOfEquations",
    `The lines ${eq1} and ${eq2} are graphed below. What is the solution to the system?`,
    "the solution",
    ans,
    [
      {
        instruction: "The solution is the point where the two lines intersect:",
        blanks: [{ label: "intersection", answer: ans }],
      },
    ],
    { sx, sy, b1, b2 },
    grid(
      [{ x: sx, y: sy, filled: true }],
      [
        { x1: seg1.x1, y1: seg1.y1, x2: seg1.x2, y2: seg1.y2 },
        { x1: seg2.x1, y1: seg2.y1, x2: seg2.x2, y2: seg2.y2 },
      ]
    )
  );
}

function makeSystemInterpret(rng: RNG): Grade8Problem {
  const sx = randInt(rng, 1, 6);
  const sy = randInt(rng, 1, 6);
  const item = pick(rng, ["pencils", "tickets", "shirts"]);
  return build(
    "SystemsOfEquations",
    `Two stores graph their total cost for buying x ${item}. The lines intersect at (${sx}, ${sy}). What does the point (${sx}, ${sy}) mean in this situation?`,
    "the meaning",
    `Both stores charge $${sy} for ${sx} ${item}`,
    [
      {
        instruction: `The x-coordinate ${sx} is the number of ${item}; the y-coordinate ${sy} is the cost in dollars.`,
        blanks: [{ label: "meaning", answer: `Both stores charge $${sy} for ${sx} ${item}` }],
      },
    ],
    { sx, sy, item, kind: "interpret" },
    grid([{ x: sx, y: sy, filled: true }])
  );
}

function makeSystemWord(rng: RNG): Grade8Problem {
  // Two purchase scenarios -> clean integer prices. Solve by graphing/elimination.
  const p0 = randInt(rng, 2, 5); // pen price
  const n0 = randInt(rng, 3, 6); // notebook price
  // scenario 1: 2 pens + 1 notebook; scenario 2: 1 pen + 2 notebooks
  const t1 = 2 * p0 + n0;
  const t2 = p0 + 2 * n0;
  return build(
    "SystemsOfEquations",
    `At one store, 2 pens and 1 notebook cost $${t1}. At another store, 1 pen and 2 notebooks cost $${t2}. ` +
      `Write a system of two equations (let p = price of a pen, n = price of a notebook) and solve for p and n.`,
    "the prices",
    `pen = $${p0}, notebook = $${n0}`,
    [
      {
        instruction: "Translate each purchase into an equation:",
        blanks: [{ label: "system", answer: `2p + n = ${t1}; p + 2n = ${t2}` }],
      },
      {
        instruction: "Solve the system (by graphing, substitution, or elimination):",
        blanks: [{ label: "p =", answer: `$${p0}` }, { label: "n =", answer: `$${n0}` }],
      },
    ],
    { p0, n0, t1, t2, wordKind: "system-purchase" }
  );
}

// ── Pythagorean theorem ──────────────────────────────────────────────────────

function makeFindHypotenuse(rng: RNG): Grade8Problem {
  const triples: [number, number, number][] = [
    [3, 4, 5], [5, 12, 13], [6, 8, 10], [8, 15, 17], [9, 12, 15], [7, 24, 25],
  ];
  const [a, b, c] = pick(rng, triples);
  return build(
    "PythagoreanTheorem",
    `A right triangle has legs of length ${a} and ${b}. Find the length of the hypotenuse.`,
    "the hypotenuse",
    c,
    [
      {
        instruction: `a² + b² = c² → ${a}² + ${b}² = c².`,
        blanks: [{ label: "c² =", answer: String(a * a + b * b) }],
      },
      {
        instruction: `Take the square root: c = √${c * c}.`,
        blanks: [{ label: "c =", answer: String(c) }],
      },
    ],
    { a, b, c, kind: "hypotenuse" }
  );
}

function makeFindLeg(rng: RNG): Grade8Problem {
  const triples: [number, number, number][] = [
    [3, 4, 5], [5, 12, 13], [6, 8, 10], [8, 15, 17], [9, 12, 15],
  ];
  const [a, b, c] = pick(rng, triples);
  const hideFirst = rng() < 0.5;
  const leg = hideFirst ? a : b;
  const other = hideFirst ? b : a;
  return build(
    "PythagoreanTheorem",
    `A right triangle has hypotenuse ${c} and one leg of length ${other}. Find the missing leg.`,
    "the missing leg",
    leg,
    [
      {
        instruction: `a² + b² = c² → ${other}² + b² = ${c}².`,
        blanks: [{ label: "b² =", answer: String(c * c - other * other) }],
      },
      {
        instruction: `Take the square root: b = √${leg * leg}.`,
        blanks: [{ label: "b =", answer: String(leg) }],
      },
    ],
    { leg, other, c, kind: "leg" }
  );
}

function makeDistancePoints(rng: RNG): Grade8Problem {
  // pick two points whose distance is an integer (scaled triple);
  // base point near the origin so both points stay on the [-10, 10] grid
  const triples: [number, number, number][] = [
    [3, 4, 5], [6, 8, 10],
  ];
  const [dx, dy, dist] = pick(rng, triples);
  const x1 = randInt(rng, -2, 2);
  const y1 = randInt(rng, -2, 2);
  let x2 = x1 + (rng() < 0.5 ? -dx : dx);
  if (x2 < -10 || x2 > 10) x2 = x1 + (x2 < x1 ? dx : -dx);
  let y2 = y1 + (rng() < 0.5 ? -dy : dy);
  if (y2 < -10 || y2 > 10) y2 = y1 + (y2 < y1 ? dy : -dy);
  const adx = Math.abs(x2 - x1);
  const ady = Math.abs(y2 - y1);
  return build(
    "PythagoreanTheorem",
    `Find the distance between A(${x1}, ${y1}) and B(${x2}, ${y2}).`,
    "the distance",
    dist,
    [
      {
        instruction: `Horizontal change = ${adx}, vertical change = ${ady}.`,
        blanks: [{ label: "legs", answer: `${adx} and ${ady}` }],
      },
      {
        instruction: `Distance = √(${adx}² + ${ady}²) = √${dist * dist}.`,
        blanks: [{ label: "distance", answer: String(dist) }],
      },
    ],
    { x1, y1, x2, y2, dx: adx, dy: ady, dist, kind: "distance" },
    grid(
      [
        { x: x1, y: y1, label: "A", filled: true },
        { x: x2, y: y2, label: "B", filled: true },
      ],
      [{ x1, y1, x2, y2, dashed: true }]
    )
  );
}

function makePythagoreanWord(rng: RNG): Grade8Problem {
  const triples: [number, number, number][] = [
    [3, 4, 5], [6, 8, 10], [9, 12, 15], [5, 12, 13],
  ];
  const [leg1, leg2, hyp] = pick(rng, triples);
  return build(
    "PythagoreanTheorem",
    `A ${hyp}-foot ladder leans against a wall. The base of the ladder is ${leg1} feet from the wall. How high up the wall does the ladder reach? (Assume the ground is level and the wall is vertical.)`,
    "the height",
    `${leg2} feet`,
    [
      {
        instruction: `The ladder is the hypotenuse: ${leg1}² + h² = ${hyp}², so h² = ${hyp * hyp} − ${leg1 * leg1}.`,
        blanks: [{ label: "h² =", answer: String(hyp * hyp - leg1 * leg1) }],
      },
      {
        instruction: "Take the square root:",
        blanks: [{ label: "answer", answer: `${leg2} feet` }],
      },
    ],
    { leg1, leg2, hyp, wordKind: "ladder", kind: "leg" }
  );
}

// ── Transformations ──────────────────────────────────────────────────────────

function makeTranslation(rng: RNG): Grade8Problem {
  const x = randInt(rng, -5, 5);
  const y = randInt(rng, -5, 5);
  // choose the image first so both points stay on the [-10, 10] grid
  let nx = randInt(rng, -8, 8);
  if (nx === x) nx = x < 8 ? x + 1 : x - 1;
  let ny = randInt(rng, -8, 8);
  if (ny === y) ny = y < 8 ? y + 1 : y - 1;
  const dx = nx - x;
  const dy = ny - y;
  const dxStr = dx > 0 ? `${dx} right` : `${Math.abs(dx)} left`;
  const dyStr = dy > 0 ? `${dy} up` : `${Math.abs(dy)} down`;
  return build(
    "Transformations",
    `Point P(${x}, ${y}) is translated ${dxStr} and ${dyStr}. What are the coordinates of P′?`,
    "the image coordinates",
    `(${nx}, ${ny})`,
    [
      {
        instruction: `Add ${dx} to the x-coordinate: ${x} + ${dx > 0 ? dx : `(${dx})`} = ${nx}.`,
        blanks: [{ label: "x′", answer: String(nx) }],
      },
      {
        instruction: `Add ${dy} to the y-coordinate: ${y} + ${dy > 0 ? dy : `(${dy})`} = ${ny}.`,
        blanks: [{ label: "P′", answer: `(${nx}, ${ny})` }],
      },
    ],
    { x, y, dx, dy, nx, ny, kind: "translation" },
    grid(
      [
        { x, y, label: "P", filled: true },
        { x: nx, y: ny, label: "P′" },
      ],
      [{ x1: x, y1: y, x2: nx, y2: ny, dashed: true }]
    )
  );
}

function makeReflection(rng: RNG): Grade8Problem {
  const x = randNonZero(rng, -6, 6);
  const y = randNonZero(rng, -6, 6);
  const overX = rng() < 0.5;
  const nx = overX ? x : -x;
  const ny = overX ? -y : y;
  const axis = overX ? "x-axis" : "y-axis";
  return build(
    "Transformations",
    `Point Q(${x}, ${y}) is reflected across the ${axis}. What are the coordinates of Q′?`,
    "the image coordinates",
    `(${nx}, ${ny})`,
    [
      {
        instruction: overX
          ? "Reflecting across the x-axis changes the sign of the y-coordinate:"
          : "Reflecting across the y-axis changes the sign of the x-coordinate:",
        blanks: [{ label: "Q′", answer: `(${nx}, ${ny})` }],
      },
    ],
    { x, y, nx, ny, axis, kind: "reflection" },
    grid([
      { x, y, label: "Q", filled: true },
      { x: nx, y: ny, label: "Q′" },
    ])
  );
}

function makeRotation(rng: RNG): Grade8Problem {
  const x = randNonZero(rng, -6, 6);
  const y = randNonZero(rng, -6, 6);
  const dir = pick(rng, ["90° clockwise", "90° counterclockwise", "180°"] as const);
  let nx: number, ny: number;
  if (dir === "90° clockwise") {
    nx = y; ny = -x;
  } else if (dir === "90° counterclockwise") {
    nx = -y; ny = x;
  } else {
    nx = -x; ny = -y;
  }
  return build(
    "Transformations",
    `Point R(${x}, ${y}) is rotated ${dir} about the origin. What are the coordinates of R′?`,
    "the image coordinates",
    `(${nx}, ${ny})`,
    [
      {
        instruction:
          dir === "90° clockwise"
            ? "A 90° clockwise rotation maps (x, y) → (y, −x):"
            : dir === "90° counterclockwise"
            ? "A 90° counterclockwise rotation maps (x, y) → (−y, x):"
            : "A 180° rotation maps (x, y) → (−x, −y):",
        blanks: [{ label: "R′", answer: `(${nx}, ${ny})` }],
      },
    ],
    { x, y, nx, ny, dir, kind: "rotation" },
    grid([
      { x, y, label: "R", filled: true },
      { x: nx, y: ny, label: "R′" },
    ])
  );
}

function makeDescribeTransformation(rng: RNG): Grade8Problem {
  // triangle translated by (dx, dy); keep both triangles on the [-10, 10] grid
  const dx = randNonZero(rng, -3, 3);
  const dy = randNonZero(rng, -3, 3);
  const tri: MSPoint[] = [
    { x: randInt(rng, -5, -1), y: randInt(rng, -4, 2) },
    { x: randInt(rng, -5, -1), y: randInt(rng, -4, 2) },
    { x: randInt(rng, -5, -1), y: randInt(rng, -4, 2) },
  ];
  // ensure non-degenerate triangle (nonzero area)
  const area2 = Math.abs(
    tri[0].x * (tri[1].y - tri[2].y) + tri[1].x * (tri[2].y - tri[0].y) + tri[2].x * (tri[0].y - tri[1].y)
  );
  if (area2 === 0) tri[2] = { x: tri[2].x + 2, y: tri[2].y + 1 };
  const image = tri.map((p) => ({ x: p.x + dx, y: p.y + dy }));
  const dxStr = dx > 0 ? `${dx} units right` : `${Math.abs(dx)} units left`;
  const dyStr = dy > 0 ? `${dy} units up` : `${Math.abs(dy)} units down`;
  const ans = `translation ${dxStr} and ${dyStr}`;
  return build(
    "Transformations",
    "Triangle ABC is mapped to triangle A′B′C′ as shown. Describe the transformation.",
    "the transformation",
    ans,
    [
      {
        instruction: `Compare x-coordinates: each vertex moved ${dx > 0 ? "+" : "−"}${Math.abs(dx)} in x.`,
        blanks: [{ label: "horizontal", answer: dxStr }],
      },
      {
        instruction: `Compare y-coordinates: each vertex moved ${dy > 0 ? "+" : "−"}${Math.abs(dy)} in y.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { dx, dy, kind: "describe" },
    grid(
      [],
      [],
      [
        { points: tri, label: "ABC" },
        { points: image, label: "A′B′C′", dashed: true },
      ]
    )
  );
}

function makeTransformationWord(rng: RNG): Grade8Problem {
  const x = randInt(rng, -5, 5);
  const y = randInt(rng, -5, 5);
  return build(
    "Transformations",
    `A game piece at (${x}, ${y}) on a coordinate grid is reflected across the y-axis, then translated 3 units down. What are the final coordinates?`,
    "the final coordinates",
    `(${-x}, ${y - 3})`,
    [
      {
        instruction: `Reflect across the y-axis: (${x}, ${y}) → (${-x}, ${y}).`,
        blanks: [{ label: "after reflection", answer: `(${-x}, ${y})` }],
      },
      {
        instruction: "Translate 3 units down (subtract 3 from y):",
        blanks: [{ label: "final", answer: `(${-x}, ${y - 3})` }],
      },
    ],
    { x, y, nx: -x, ny: y - 3, kind: "sequence", wordKind: "transform-sequence" }
  );
}

// ── Scientific notation ──────────────────────────────────────────────────────

function makeToSciNotation(rng: RNG): Grade8Problem {
  const exp = randInt(rng, 2, 6);
  const coeff = roundTo(randInt(rng, 11, 99) / 10, 1);
  const value = coeff * 10 ** exp;
  const ans = `${fmt(coeff)} × 10^${exp}`;
  return build(
    "ScientificNotation",
    `Write ${fmt(value)} in scientific notation.`,
    "scientific notation",
    ans,
    [
      {
        instruction: `Move the decimal point ${exp} places left to get a number between 1 and 10: ${fmt(coeff)}.`,
        blanks: [{ label: "coefficient", answer: fmt(coeff) }],
      },
      {
        instruction: `Multiply by 10 to the power of the number of places moved:`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { value: fmt(value), coeff: fmt(coeff), exp }
  );
}

function makeFromSciNotation(rng: RNG): Grade8Problem {
  const kind = pick(rng, ["big", "small"] as const);
  if (kind === "big") {
    const exp = randInt(rng, 2, 5);
    const coeff = roundTo(randInt(rng, 11, 99) / 10, 1);
    const value = coeff * 10 ** exp;
    const ans = fmt(value);
    return build(
      "ScientificNotation",
      `Write ${fmt(coeff)} × 10^${exp} in standard form.`,
      "standard form",
      ans,
      [
        {
          instruction: `Move the decimal point ${exp} places right:`,
          blanks: [{ label: "answer", answer: ans }],
        },
      ],
      { coeff: fmt(coeff), exp, dir: "big" }
    );
  }
  const exp = randInt(rng, 2, 4);
  const coeff = roundTo(randInt(rng, 11, 99) / 10, 1);
  const value = roundTo(coeff * 10 ** -exp, exp + 2);
  const ans = fmt(value);
  return build(
    "ScientificNotation",
    `Write ${fmt(coeff)} × 10^${-exp} in standard form.`,
    "standard form",
    ans,
    [
      {
        instruction: `Move the decimal point ${exp} places left:`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { coeff: fmt(coeff), exp: -exp, dir: "small" }
  );
}

function makeCompareSciNotation(rng: RNG): Grade8Problem {
  const exp = randInt(rng, 2, 5);
  const c1 = roundTo(randInt(rng, 11, 99) / 10, 1);
  let c2 = roundTo(randInt(rng, 11, 99) / 10, 1);
  while (c2 === c1) c2 = roundTo(randInt(rng, 11, 99) / 10, 1);
  const bigger = c1 > c2 ? "first" : "second";
  const ans = `${fmt(Math.max(c1, c2))} × 10^${exp}`;
  return build(
    "ScientificNotation",
    `Which is greater: ${fmt(c1)} × 10^${exp} or ${fmt(c2)} × 10^${exp}?`,
    "the greater number",
    ans,
    [
      {
        instruction: "The powers of 10 are equal, so compare the coefficients:",
        blanks: [{ label: "greater coefficient", answer: fmt(Math.max(c1, c2)) }],
      },
      {
        instruction: "The greater number is:",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { c1: fmt(c1), c2: fmt(c2), exp, bigger }
  );
}

function makeSciNotationWord(rng: RNG): Grade8Problem {
  const exp = randInt(rng, 5, 8);
  const coeff = randInt(rng, 2, 9);
  return build(
    "ScientificNotation",
    `The distance from Earth to the Moon is about ${fmt(coeff * 10 ** exp)} kilometers. Write this distance in scientific notation.`,
    "scientific notation",
    `${coeff} × 10^${exp}`,
    [
      {
        instruction: `The coefficient must be between 1 and 10: ${coeff}. The decimal moved ${exp} places.`,
        blanks: [{ label: "answer", answer: `${coeff} × 10^${exp}` }],
      },
    ],
    { coeff, exp, wordKind: "sci-distance" }
  );
}

// ── Volume of cylinders, cones, spheres ──────────────────────────────────────

function makeVolumeCylinder(rng: RNG): Grade8Problem {
  const r = randInt(rng, 2, 8);
  const h = randInt(rng, 3, 12);
  // NOTE: 3.14 (not Math.PI) so the answer matches student work with 3.14.
  const ans = `${fmt(roundTo(3.14 * r * r * h, 2))} cm³`;
  return build(
    "Volume3D",
    `Find the volume of a cylinder with radius ${r} cm and height ${h} cm. Use 3.14 for π.`,
    "the volume",
    ans,
    [
      {
        instruction: "V = πr²h.",
        blanks: [{ label: "formula", answer: "V = πr²h" }],
      },
      {
        instruction: `Substitute: V = 3.14 × ${r}² × ${h} = 3.14 × ${r * r * h}.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { r, h, pi: "3.14", shape: "cylinder" },
    { kind: "MSGeometryFigure", figure: "cylinder", dims: { radius: r, height: h } },
    "cm³"
  );
}

function makeVolumeCone(rng: RNG): Grade8Problem {
  const r = randInt(rng, 2, 6);
  const h = pick(rng, [3, 6, 9, 12]); // multiple of 3 → clean ÷3
  const ans = `${fmt(roundTo((3.14 * r * r * h) / 3, 2))} in³`;
  return build(
    "Volume3D",
    `Find the volume of a cone with radius ${r} in and height ${h} in. Use 3.14 for π.`,
    "the volume",
    ans,
    [
      {
        instruction: "V = ⅓πr²h.",
        blanks: [{ label: "formula", answer: "V = ⅓πr²h" }],
      },
      {
        instruction: `Substitute: V = ⅓ × 3.14 × ${r}² × ${h}.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { r, h, pi: "3.14", shape: "cone" },
    { kind: "MSGeometryFigure", figure: "cone", dims: { radius: r, height: h } },
    "in³"
  );
}

function makeVolumeSphere(rng: RNG): Grade8Problem {
  const r = pick(rng, [3, 6, 9]); // multiple of 3 → clean 4/3 factor
  const ans = `${fmt(roundTo((4 / 3) * 3.14 * r ** 3, 2))} ft³`;
  return build(
    "Volume3D",
    `Find the volume of a sphere with radius ${r} ft. Use 3.14 for π.`,
    "the volume",
    ans,
    [
      {
        instruction: "V = ⁴⁄₃πr³.",
        blanks: [{ label: "formula", answer: "V = ⁴⁄₃πr³" }],
      },
      {
        instruction: `Substitute: V = ⁴⁄₃ × 3.14 × ${r}³.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { r, pi: "3.14", shape: "sphere" },
    { kind: "MSGeometryFigure", figure: "sphere", dims: { radius: r } },
    "ft³"
  );
}

function makeVolumeWord(rng: RNG): Grade8Problem {
  const r = randInt(rng, 2, 5);
  const h = randInt(rng, 6, 15);
  const ans = `${fmt(roundTo(3.14 * r * r * h, 2))} cubic inches`;
  return build(
    "Volume3D",
    `A cylindrical can has a radius of ${r} inches and a height of ${h} inches. How much liquid can it hold? Use 3.14 for π.`,
    "the volume",
    ans,
    [
      {
        instruction: `V = πr²h = 3.14 × ${r}² × ${h}.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { r, h, pi: "3.14", shape: "cylinder", wordKind: "can" },
    { kind: "MSGeometryFigure", figure: "cylinder", dims: { radius: r, height: h } },
    "cubic inches"
  );
}

// ── Scatter plots ────────────────────────────────────────────────────────────

function makeScatterTrend(rng: RNG): Grade8Problem {
  const trend = pick(rng, ["positive", "negative", "none"] as const);
  const n = 10;
  const points: MSPoint[] = [];
  for (let i = 0; i < n; i++) {
    const x = randInt(rng, 1, 9);
    let y: number;
    if (trend === "positive") y = roundTo(0.8 * x + 1 + randInt(rng, -10, 10) / 10, 1);
    else if (trend === "negative") y = roundTo(9 - 0.8 * x + randInt(rng, -10, 10) / 10, 1);
    else y = roundTo(randInt(rng, 20, 80) / 10, 1);
    points.push({ x, y: Math.min(9.5, Math.max(0.5, y)) });
  }
  const ans =
    trend === "positive"
      ? "positive association"
      : trend === "negative"
      ? "negative association"
      : "no association";
  return build(
    "ScatterPlots",
    "The scatter plot shows study time (hours) vs. quiz score. Describe the association between the two variables.",
    "the association",
    ans,
    [
      {
        instruction: "Look at the overall pattern of the points as x increases:",
        blanks: [{ label: "trend", answer: trend }],
      },
      {
        instruction: "The association is:",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { trend, n },
    {
      kind: "MSScatterPlot",
      points,
      maxX: 10,
      maxY: 10,
      xLabel: "Study time (h)",
      yLabel: "Quiz score",
    }
  );
}

function makeScatterPredict(rng: RNG): Grade8Problem {
  // line of best fit y = 2x + 10; predict at a given x
  const x = randInt(rng, 4, 12);
  const ans = 2 * x + 10;
  const points: MSPoint[] = [];
  for (let i = 0; i < 8; i++) {
    const px = randInt(rng, 1, 13);
    points.push({ x: px, y: Math.min(44, Math.max(1, roundTo(2 * px + 10 + randInt(rng, -6, 6), 1))) });
  }
  return build(
    "ScatterPlots",
    `The line of best fit for a scatter plot is y = 2x + 10, where x is the number of hours worked and y is dollars earned. Use the line of best fit to predict the earnings for ${x} hours of work.`,
    "the predicted value",
    `$${ans}`,
    [
      {
        instruction: `Substitute x = ${x} into y = 2x + 10: y = 2(${x}) + 10.`,
        blanks: [{ label: "y =", answer: String(ans) }],
      },
      {
        instruction: "Write the prediction with units:",
        blanks: [{ label: "answer", answer: `$${ans}` }],
      },
    ],
    { x, slope: 2, intercept: 10 },
    {
      kind: "MSScatterPlot",
      points,
      maxX: 15,
      maxY: 45,
      xLabel: "Hours worked",
      yLabel: "Dollars earned",
      trendline: { x1: 0, y1: 10, x2: 15, y2: 40 },
    }
  );
}

function makeScatterWord(rng: RNG): Grade8Problem {
  const trend = pick(rng, ["positive", "negative"] as const);
  const ans =
    trend === "positive"
      ? "As temperature increases, ice cream sales increase (positive association)."
      : "As the number of absences increases, grades decrease (negative association).";
  return build(
    "ScatterPlots",
    trend === "positive"
      ? "A scatter plot shows daily temperature vs. ice cream sales. The points trend upward to the right. What kind of association is this, and what does it mean?"
      : "A scatter plot shows student absences vs. final grades. The points trend downward to the right. What kind of association is this, and what does it mean?",
    "the association and meaning",
    ans,
    [
      {
        instruction: `The points trend ${trend === "positive" ? "up" : "down"} to the right:`,
        blanks: [{ label: "association", answer: `${trend} association` }],
      },
      {
        instruction: "In context, this means:",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { trend, wordKind: "scatter-interpret" }
  );
}

// ── Maker table with difficulty tiers ─────────────────────────────────────────

const MAKERS: MakerEntry[] = [
  // Linear equations (variables on both sides)
  { tier: 1, subtype: "LinearEquations", make: makeVariablesBothSides },
  { tier: 2, subtype: "LinearEquations", make: makeDistributiveBothSides },
  { tier: 2, subtype: "LinearEquations", make: makeSpecialSolutions },
  { tier: 3, subtype: "LinearEquations", make: makeLinearWord8 },
  // Functions
  { tier: 1, subtype: "Functions", make: makeIdentifyFunction },
  { tier: 2, subtype: "Functions", make: makeCompareFunctions },
  { tier: 2, subtype: "Functions", make: makeLinearVsNonlinear },
  { tier: 3, subtype: "Functions", make: makeFunctionWord },
  // Systems of equations (graphical)
  { tier: 1, subtype: "SystemsOfEquations", make: makeSystemGraph },
  { tier: 2, subtype: "SystemsOfEquations", make: makeSystemInterpret },
  { tier: 3, subtype: "SystemsOfEquations", make: makeSystemWord },
  // Pythagorean theorem
  { tier: 1, subtype: "PythagoreanTheorem", make: makeFindHypotenuse },
  { tier: 2, subtype: "PythagoreanTheorem", make: makeFindLeg },
  { tier: 2, subtype: "PythagoreanTheorem", make: makeDistancePoints },
  { tier: 3, subtype: "PythagoreanTheorem", make: makePythagoreanWord },
  // Transformations
  { tier: 1, subtype: "Transformations", make: makeTranslation },
  { tier: 1, subtype: "Transformations", make: makeReflection },
  { tier: 2, subtype: "Transformations", make: makeRotation },
  { tier: 2, subtype: "Transformations", make: makeDescribeTransformation },
  { tier: 3, subtype: "Transformations", make: makeTransformationWord },
  // Scientific notation
  { tier: 1, subtype: "ScientificNotation", make: makeToSciNotation },
  { tier: 1, subtype: "ScientificNotation", make: makeFromSciNotation },
  { tier: 2, subtype: "ScientificNotation", make: makeCompareSciNotation },
  { tier: 3, subtype: "ScientificNotation", make: makeSciNotationWord },
  // Volume of cylinders, cones, spheres
  { tier: 1, subtype: "Volume3D", make: makeVolumeCylinder },
  { tier: 2, subtype: "Volume3D", make: makeVolumeCone },
  { tier: 2, subtype: "Volume3D", make: makeVolumeSphere },
  { tier: 3, subtype: "Volume3D", make: makeVolumeWord },
  // Scatter plots
  { tier: 1, subtype: "ScatterPlots", make: makeScatterTrend },
  { tier: 2, subtype: "ScatterPlots", make: makeScatterPredict },
  { tier: 3, subtype: "ScatterPlots", make: makeScatterWord },
];

/** Makers unlocked at the given difficulty tier (cumulative). */
export function grade8MakersFor(difficulty: Grade8Difficulty): Maker[] {
  return MAKERS.filter((m) => m.tier <= difficulty).map((m) => m.make);
}

export const GRADE8_SUBTYPES: Grade8Subtype[] = [
  "LinearEquations",
  "Functions",
  "SystemsOfEquations",
  "PythagoreanTheorem",
  "Transformations",
  "ScientificNotation",
  "Volume3D",
  "ScatterPlots",
];

/**
 * Generate n Grade 8 problems using the provided RNG.
 * `subtypes` optionally restricts to certain topics; `difficulty` filters tiers.
 */
export function generateGrade8Problems(
  rng: RNG,
  n: number,
  difficulty: Grade8Difficulty = 2,
  subtypes?: readonly Grade8Subtype[]
): Grade8Problem[] {
  // Lesson-first, like the registry's filterAllowed: intersect the lesson's own
  // makers with the difficulty filter, falling back to the lesson's full list
  // (so a lesson never generates zero problems).
  const lessonPool =
    subtypes && subtypes.length > 0
      ? MAKERS.filter((m) => subtypes.includes(m.subtype))
      : MAKERS;
  const tierPool = lessonPool.filter((m) => m.tier <= difficulty);
  const finalPool = tierPool.length > 0 ? tierPool : lessonPool;
  return Array.from({ length: n }, () => {
    const entry = pick(rng, finalPool);
    const problem = entry.make(rng);
    problem.tier = entry.tier;
    return problem;
  });
}
