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
  fmtFixed,
  roundTo,
  randNonZero,
  shuffled,
  signStr,
  linearEquation,
  dedupeGenerate,
} from "./MiddleSchoolUtils";

export type Grade8Difficulty = 1 | 2 | 3;

type Maker = (rng: RNG, wordProblems?: boolean) => Grade8Problem;
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
          ? `First differences of y: ${ys[1] - ys[0]}, ${ys[2] - ys[1]}, ${ys[3] - ys[2]}, not constant.`
          : `First differences of y: ${ys[1] - ys[0]}, ${ys[2] - ys[1]}, ${ys[3] - ys[2]}, constant.`,
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


// ── Slope & rate of change (TEKS 8.4B, 8.4C, 8.5I) ─────────────────────────

function slopeAnswer(m: number): string {
  return fmt(m);
}

function makeSlopeFromTable(rng: RNG): Grade8Problem {
  const m = pick(rng, [-3, -2, -1, 1, 2, 3, 4]);
  const b = randInt(rng, -5, 8);
  const xs = [0, 1, 2, 3];
  const table = xs.map((x) => `(${x}, ${m * x + b})`).join(", ");
  return build(
    "SlopeRateOfChange",
    `The table shows a linear relationship: ${table}. Find the slope of the line.`,
    "the slope",
    m,
    [
      {
        instruction: "Slope is the change in y divided by the change in x between two points.",
        blanks: [{ label: "change in y", answer: String(m) }, { label: "change in x", answer: "1" }],
      },
      { instruction: "So the slope is:", blanks: [{ label: "answer", answer: slopeAnswer(m) }] },
    ],
    { kind: "table", m, b, table }
  );
}

function makeSlopeFromPoints(rng: RNG): Grade8Problem {
  const m = pick(rng, [-4, -3, -2, -1, 1, 2, 3, 4, 5]);
  const x1 = randInt(rng, -4, 4);
  const dx = pick(rng, [1, 2, 3]);
  const x2 = x1 + dx;
  const y1 = randInt(rng, -6, 6);
  const y2 = y1 + m * dx;
  return build(
    "SlopeRateOfChange",
    `Find the slope of the line through (${x1}, ${y1}) and (${x2}, ${y2}).`,
    "the slope",
    m,
    [
      {
        instruction: `Slope = (y2 − y1) / (x2 − x1) = (${y2} − ${y1}) / (${x2} − ${x1}) = ${y2 - y1} / ${dx}.`,
        blanks: [{ label: "slope", answer: slopeAnswer(m) }],
      },
      { instruction: "So the slope is:", blanks: [{ label: "answer", answer: slopeAnswer(m) }] },
    ],
    { kind: "points", x1, y1, x2, y2 }
  );
}

function makeSlopeInterceptGraph(rng: RNG): Grade8Problem {
  const m = pick(rng, [-2, -1, 1, 2]);
  const b = randInt(rng, -4, 4);
  const ans = `m = ${m}, b = ${b}`;
  const ep = lineBoxEndpoints(m, b);
  return build(
    "SlopeRateOfChange",
    "The graph shows a line. Find its slope and y-intercept.",
    "the slope and y-intercept",
    ans,
    [
      {
        instruction: `The line crosses the y-axis at ${b}, so the y-intercept is ${b}.`,
        blanks: [{ label: "y-intercept", answer: String(b) }],
      },
      {
        instruction: "Count rise over run between two lattice points on the line.",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "graph", m, b },
    grid(
      [
        { x: 0, y: b, label: `(0, ${b})` },
        { x: 2, y: 2 * m + b, label: `(2, ${2 * m + b})` },
      ],
      [{ x1: ep.x1, y1: ep.y1, x2: ep.x2, y2: ep.y2 }]
    )
  );
}

function makeUnitRateSlope(rng: RNG): Grade8Problem {
  const contexts: { item: string; unit: string; rates: number[] }[] = [
    { item: "notebooks", unit: "notebook", rates: [1.5, 2, 2.5, 3, 4] },
    { item: "pounds of apples", unit: "pound", rates: [1.5, 2, 2.5, 3] },
    { item: "movie tickets", unit: "ticket", rates: [8, 9, 10, 12] },
    { item: "gallons of gas", unit: "gallon", rates: [2.5, 3, 3.5, 4] },
  ];
  const c = pick(rng, contexts);
  const rate = pick(rng, c.rates);
  const count = randInt(rng, 3, 9);
  const total = rate * count;
  return build(
    "SlopeRateOfChange",
    `${count} ${c.item} cost $${fmtFixed(total, 2)} in total, and the cost is proportional to the amount. What is the unit rate, which is also the slope of the graph of this relationship?`,
    "the unit rate (slope)",
    rate,
    [
      {
        instruction: `Unit rate = total cost ÷ amount = ${fmtFixed(total, 2)} ÷ ${count}.`,
        blanks: [{ label: "answer", answer: fmt(rate) }],
      },
      {
        instruction: `So each ${c.unit} costs $${fmt(rate)}, and the slope of the graph is ${fmt(rate)}.`,
        blanks: [{ label: "slope", answer: fmt(rate) }],
      },
    ],
    { kind: "unit-rate", total, count }
  );
}

function linearEqStr(m: number, b: number): string {
  if (b === 0) return `y = ${m}x`;
  return b > 0 ? `y = ${m}x + ${b}` : `y = ${m}x − ${-b}`;
}

function makeWriteLinearEquation(rng: RNG): Grade8Problem {
  const contexts = [
    { who: "A gym", baseName: "sign-up fee", perName: "each month", unit: "months" },
    { who: "A taxi service", baseName: "pickup charge", perName: "each mile", unit: "miles" },
    { who: "A plumber", baseName: "service call fee", perName: "each hour of work", unit: "hours" },
    { who: "A streaming plan", baseName: "activation fee", perName: "each month", unit: "months" },
  ];
  const c = pick(rng, contexts);
  const b = pick(rng, [10, 15, 20, 25, 30, 40, 50]);
  const m = randInt(rng, 2, 15);
  const ans = linearEqStr(m, b);
  return build(
    "SlopeRateOfChange",
    `${c.who} charges a $${b} ${c.baseName} plus $${m} for ${c.perName}. Write an equation in the form y = mx + b for the total cost y after x ${c.unit}.`,
    "the equation",
    ans,
    [
      {
        instruction: `The slope m is the charge per unit: ${m}. The y-intercept b is the one-time fee: ${b}.`,
        blanks: [{ label: "m", answer: String(m) }, { label: "b", answer: String(b) }],
      },
      { instruction: "So the equation is:", blanks: [{ label: "answer", answer: ans }] },
    ],
    { kind: "write-eq", m, b }
  );
}

// ── Irrational numbers & estimation (TEKS 8.2A, 8.2B, 8.2D) ────────────────

const NONSQUARES = [2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 17, 19, 21, 24, 26, 29, 31, 33, 38, 41, 47, 50, 53, 57, 61, 65, 72, 77, 82, 90, 97, 101, 110, 122, 133, 145, 157, 170, 185, 197];

function makeBracketSqrt(rng: RNG): Grade8Problem {
  const n = pick(rng, NONSQUARES);
  const lo = Math.floor(Math.sqrt(n));
  const hi = lo + 1;
  const ans = `${lo} < √${n} < ${hi}`;
  return build(
    "IrrationalNumbers",
    `Between which two consecutive integers does √${n} lie?`,
    "the two integers",
    ans,
    [
      {
        instruction: `${lo}² = ${lo * lo} and ${hi}² = ${hi * hi}, and ${n} is between ${lo * lo} and ${hi * hi}.`,
        blanks: [{ label: "lower square", answer: String(lo * lo) }, { label: "upper square", answer: String(hi * hi) }],
      },
      { instruction: "So:", blanks: [{ label: "answer", answer: ans }] },
    ],
    { kind: "bracket", n }
  );
}

const CLASSIFY_POOL: { label: string; kind: "rational" | "irrational" }[] = [
  { label: "π", kind: "irrational" },
  { label: "√7", kind: "irrational" },
  { label: "√13", kind: "irrational" },
  { label: "0.12112111211112… (the pattern of 1s keeps growing)", kind: "irrational" },
  { label: "−4", kind: "rational" },
  { label: "3/4", kind: "rational" },
  { label: "0.666… (the 6 repeats forever)", kind: "rational" },
  { label: "−1.25", kind: "rational" },
  { label: "√16", kind: "rational" },
  { label: "22/7", kind: "rational" },
];

function makeClassifyReal(rng: RNG): Grade8Problem {
  const c = pick(rng, CLASSIFY_POOL);
  return build(
    "IrrationalNumbers",
    `Is ${c.label} a rational number or an irrational number?`,
    "rational or irrational",
    c.kind,
    [
      {
        instruction:
          c.kind === "irrational"
            ? "Irrational numbers cannot be written as a simple fraction; their decimals never end and never repeat."
            : "Rational numbers can be written as a simple fraction of two integers; their decimals end or repeat.",
        blanks: [{ label: "answer", answer: c.kind }],
      },
    ],
    { kind: "classify", label: c.label, expected: c.kind }
  );
}

function makeApproxSqrtTenth(rng: RNG): Grade8Problem {
  const n = pick(rng, NONSQUARES);
  const approx = roundTo(Math.sqrt(n), 1);
  const ans = fmt(approx);
  const lo = Math.floor(Math.sqrt(n));
  return build(
    "IrrationalNumbers",
    `Approximate √${n} to the nearest tenth.`,
    "the approximation",
    ans,
    [
      {
        instruction: `√${n} is between ${lo} and ${lo + 1}. Check tenths: ${lo}.5² = ${fmt((lo + 0.5) * (lo + 0.5))}.`,
        blanks: [{ label: "between", answer: `${lo} and ${lo + 1}` }],
      },
      { instruction: `The tenth closest to √${n} is:`, blanks: [{ label: "answer", answer: ans }] },
    ],
    { kind: "approx", n }
  );
}

const ORDER_POOL: { label: string; val: number }[] = [
  { label: "π", val: 3.141592653589793 },
  { label: "√10", val: 3.1622776601683795 },
  { label: "3.2", val: 3.2 },
  { label: "7/2", val: 3.5 },
  { label: "√3", val: 1.7320508075688772 },
  { label: "1.7", val: 1.7 },
  { label: "−√5", val: -2.23606797749979 },
  { label: "−2", val: -2 },
  { label: "5/2", val: 2.5 },
  { label: "√6", val: 2.449489742783178 },
];

function makeOrderReals(rng: RNG): Grade8Problem {
  const chosen = shuffled(rng, ORDER_POOL).slice(0, 4);
  const shown = shuffled(rng, chosen);
  const sorted = [...chosen].sort((a, b) => a.val - b.val);
  const ans = sorted.map((c) => c.label).join(" < ");
  return build(
    "IrrationalNumbers",
    `Order the numbers from least to greatest: ${shown.map((c) => c.label).join(", ")}.`,
    "the order, least to greatest",
    ans,
    [
      {
        instruction: "Write each number as a decimal approximation, then compare the decimals.",
        blanks: chosen.map((c) => ({ label: c.label, answer: fmt(roundTo(c.val, 3)) })),
      },
      { instruction: "From least to greatest:", blanks: [{ label: "answer", answer: ans }] },
    ],
    {
      kind: "order",
      labels: chosen.map((c) => c.label).join(","),
      values: chosen.map((c) => String(c.val)).join(","),
    }
  );
}

// ── Mean absolute deviation (TEKS 8.11B) ────────────────────────────────────

function madOf(vals: number[]): number {
  const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
  return vals.reduce((s, v) => s + Math.abs(v - mean), 0) / vals.length;
}

function makeMadBasic(rng: RNG): Grade8Problem {
  const vals = Array.from({ length: 5 }, () => randInt(rng, 2, 15));
  const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
  const ans = fmt(roundTo(madOf(vals), 2));
  return build(
    "MeanAbsoluteDeviation",
    `Find the mean absolute deviation (MAD) of the data set: ${vals.join(", ")}.`,
    "the MAD",
    ans,
    [
      { instruction: `First find the mean: ${fmt(roundTo(mean, 2))}.`, blanks: [{ label: "mean", answer: fmt(roundTo(mean, 2)) }] },
      {
        instruction: "Then find the distance from each value to the mean, and average those distances.",
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "mad", data: vals.join(",") }
  );
}

function makeMadContext(rng: RNG): Grade8Problem {
  const contexts = [
    { who: "A basketball player scored", unit: "points in 6 games" },
    { who: "The daily high temperatures were", unit: "degrees over 6 days" },
    { who: "A student read for", unit: "minutes on 6 days" },
  ];
  const c = pick(rng, contexts);
  const vals = Array.from({ length: 6 }, () => randInt(rng, 4, 30));
  const ans = fmt(roundTo(madOf(vals), 1));
  return build(
    "MeanAbsoluteDeviation",
    `${c.who} ${vals.join(", ")} ${c.unit}. Find the mean absolute deviation, rounded to the nearest tenth.`,
    "the MAD",
    ans,
    [
      { instruction: "Find the mean, then average the absolute differences from the mean.", blanks: [{ label: "answer", answer: ans }] },
    ],
    { kind: "mad-tenth", data: vals.join(",") }
  );
}

function makeCompareMad(rng: RNG): Grade8Problem {
  const a = Array.from({ length: 5 }, () => randInt(rng, 8, 12));
  const b = Array.from({ length: 5 }, () => randInt(rng, 2, 20));
  const madA = madOf(a);
  const madB = madOf(b);
  const greater = madB >= madA ? "B" : "A";
  const ans = `Set ${greater}`;
  return build(
    "MeanAbsoluteDeviation",
    `Set A: ${a.join(", ")}. Set B: ${b.join(", ")}. Which data set has the greater mean absolute deviation?`,
    "the set with the greater MAD",
    ans,
    [
      {
        instruction: `MAD of Set A is about ${fmt(roundTo(madA, 2))}; MAD of Set B is about ${fmt(roundTo(madB, 2))}.`,
        blanks: [{ label: "MAD of A", answer: fmt(roundTo(madA, 2)) }, { label: "MAD of B", answer: fmt(roundTo(madB, 2)) }],
      },
      { instruction: "The greater MAD belongs to:", blanks: [{ label: "answer", answer: ans }] },
    ],
    { kind: "compare-mad", dataA: a.join(","), dataB: b.join(",") }
  );
}

// ── Surface area of prisms & cylinders (TEKS 8.7B) ───────────────────────────

function makeRectPrismSA(rng: RNG): Grade8Problem {
  const l = randInt(rng, 2, 12);
  const w = randInt(rng, 2, 10);
  const h = randInt(rng, 2, 9);
  const sa = 2 * (l * w + l * h + w * h);
  const ans = `${sa} cm²`;
  return build(
    "SurfaceArea8",
    `Find the total surface area of a rectangular prism with length ${l} cm, width ${w} cm, and height ${h} cm.`,
    "the total surface area",
    ans,
    [
      {
        instruction: `SA = 2(lw + lh + wh) = 2(${l * w} + ${l * h} + ${w * h}).`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "rect-prism", l, w, h },
    undefined,
    "cm²"
  );
}

function makeCylinderSA(rng: RNG): Grade8Problem {
  const r = randInt(rng, 2, 9);
  const h = randInt(rng, 3, 12);
  const sa = roundTo(2 * 3.14 * r * r + 2 * 3.14 * r * h, 2);
  const ans = `${fmt(sa)} cm²`;
  return build(
    "SurfaceArea8",
    `Find the total surface area of a cylinder with radius ${r} cm and height ${h} cm. Use 3.14 for π.`,
    "the total surface area",
    ans,
    [
      {
        instruction: `SA = 2πr² + 2πrh = 2(3.14)(${r})² + 2(3.14)(${r})(${h}).`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "cylinder-total", r, h },
    { kind: "MSGeometryFigure", figure: "cylinder", dims: { radius: r, height: h } },
    "cm²"
  );
}

function makeTriPrismSA(rng: RNG): Grade8Problem {
  const triples: [number, number, number][] = [[3, 4, 5], [5, 12, 13], [6, 8, 10], [8, 15, 17]];
  const [a, b, c] = pick(rng, triples);
  const L = randInt(rng, 4, 14);
  const sa = a * b + (a + b + c) * L;
  const ans = `${sa} cm²`;
  return build(
    "SurfaceArea8",
    `Find the total surface area of a triangular prism. The triangular base has legs ${a} cm and ${b} cm and hypotenuse ${c} cm, and the prism is ${L} cm long.`,
    "the total surface area",
    ans,
    [
      {
        instruction: `Two triangular faces: 2 × (1/2 × ${a} × ${b}) = ${a * b}. Three rectangular faces have total area (${a} + ${b} + ${c}) × ${L} = ${(a + b + c) * L}.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "tri-prism", a, b, c, L },
    undefined,
    "cm²"
  );
}

function makeCylinderLateral(rng: RNG): Grade8Problem {
  const r = randInt(rng, 2, 8);
  const h = randInt(rng, 4, 15);
  const lsa = roundTo(2 * 3.14 * r * h, 2);
  const ans = `${fmt(lsa)} cm²`;
  return build(
    "SurfaceArea8",
    `A label wraps around the side of a can with radius ${r} cm and height ${h} cm, covering only the curved surface (not the top or bottom). Find the lateral surface area. Use 3.14 for π.`,
    "the lateral surface area",
    ans,
    [
      {
        instruction: `Lateral SA = 2πrh = 2(3.14)(${r})(${h}).`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "cylinder-lateral", r, h },
    { kind: "MSGeometryFigure", figure: "cylinder", dims: { radius: r, height: h } },
    "cm²"
  );
}

// ── Simple & compound interest (TEKS 8.12A, 8.12D) ──────────────────────────

function money(n: number): string {
  return `$${fmtFixed(n, 2)}`;
}

function makeSimpleInterest(rng: RNG): Grade8Problem {
  const P = pick(rng, [200, 300, 400, 500, 600, 800, 1000, 1200, 1500, 2000]);
  const r = pick(rng, [2, 3, 4, 5, 6]);
  const t = randInt(rng, 1, 5);
  const I = (P * r * t) / 100;
  const ans = money(I);
  return build(
    "InterestAndCredit",
    `You deposit $${P} into an account that pays ${r}% simple interest per year. How much interest will you earn in ${t} year${t === 1 ? "" : "s"}?`,
    "the interest earned",
    ans,
    [
      {
        instruction: `I = Prt = ${P} × 0.0${r} × ${t}.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "simple", P, r, t },
    undefined,
    "dollars"
  );
}

function makeSimpleBalance(rng: RNG): Grade8Problem {
  const P = pick(rng, [250, 400, 500, 750, 900, 1000, 1600]);
  const r = pick(rng, [2, 3, 4, 5]);
  const t = randInt(rng, 2, 6);
  const A = P + (P * r * t) / 100;
  const ans = money(A);
  return build(
    "InterestAndCredit",
    `A savings account starts with $${P} and earns ${r}% simple interest each year. What is the balance after ${t} years if no money is added or taken out?`,
    "the balance",
    ans,
    [
      {
        instruction: `Interest = ${P} × 0.0${r} × ${t} = ${money((P * r * t) / 100)}. Add it to the principal.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "simple-balance", P, r, t },
    undefined,
    "dollars"
  );
}

function makeCompoundInterest(rng: RNG): Grade8Problem {
  const P = pick(rng, [200, 400, 500, 800, 1000]);
  const r = pick(rng, [2, 3, 4, 5]);
  const t = randInt(rng, 2, 4);
  const A = P * Math.pow(1 + r / 100, t);
  const ans = money(A);
  return build(
    "InterestAndCredit",
    `You invest $${P} at ${r}% interest compounded yearly. What is the balance after ${t} years? Round to the nearest cent.`,
    "the balance",
    ans,
    [
      {
        instruction: `Each year the balance is multiplied by ${fmt(1 + r / 100)}. After ${t} years the balance is ${P} multiplied by ${fmt(1 + r / 100)} a total of ${t} times.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "compound", P, r, t },
    undefined,
    "dollars"
  );
}

function makeCompareLoans(rng: RNG): Grade8Problem {
  const P = pick(rng, [1000, 1500, 2000, 3000, 5000]);
  const rA = pick(rng, [4, 5, 6, 8]);
  const tA = pick(rng, [2, 3, 4]);
  let rB = pick(rng, [4, 5, 6, 8, 10]);
  let tB = pick(rng, [2, 3, 4, 5]);
  // Ensure the two simple-interest totals actually differ.
  if ((P * rA * tA) / 100 === (P * rB * tB) / 100) { tB = tB + 1; }
  const IA = (P * rA * tA) / 100;
  const IB = (P * rB * tB) / 100;
  const ans = IB > IA ? "Loan B" : "Loan A";
  return build(
    "InterestAndCredit",
    `You borrow $${P} and are choosing between two loans that charge simple interest. Loan A charges ${rA}% per year for ${tA} years. Loan B charges ${rB}% per year for ${tB} years. Which loan costs more in total interest?`,
    "the loan that costs more interest",
    ans,
    [
      {
        instruction: `Loan A interest: ${P} × 0.0${rA} × ${tA} = ${money(IA)}. Loan B interest: ${P} × 0.0${rB} × ${tB} = ${money(IB)}.`,
        blanks: [
          { label: "Loan A interest", answer: money(IA) },
          { label: "Loan B interest", answer: money(IB) },
        ],
      },
      { instruction: "The loan costing more interest is:", blanks: [{ label: "answer", answer: ans }] },
    ],
    { kind: "compare-loans", P, rA, tA, rB, tB },
    undefined,
    "dollars"
  );
}

// ── Angle relationships & similar triangles (TEKS 8.8D) ─────────────────────

function makeTransversalAngle(rng: RNG): Grade8Problem {
  const angle = pick(rng, [35, 40, 48, 55, 62, 70, 75, 82, 95, 105, 112, 120, 128, 135, 142, 150]);
  const positions = [
    { name: "corresponding", relation: "equal" },
    { name: "alternate interior", relation: "equal" },
    { name: "alternate exterior", relation: "equal" },
    { name: "vertical", relation: "equal" },
    { name: "same-side interior", relation: "supplementary" },
    { name: "same-side exterior", relation: "supplementary" },
  ];
  const pos = pick(rng, positions);
  const ans = pos.relation === "equal" ? angle : 180 - angle;
  const steps: Grade8Problem["steps"] =
    pos.relation === "equal"
      ? [
          {
            instruction: `When parallel lines are cut by a transversal, ${pos.name} angles have equal measures.`,
            blanks: [{ label: "answer", answer: String(ans) }],
          },
        ]
      : [
          {
            instruction: `Same-side angles formed by parallel lines are supplementary, so the measures add to 180°. Subtract: 180 − ${angle} = ${ans}.`,
            blanks: [{ label: "answer", answer: String(ans) }],
          },
        ];
  return build(
    "TransversalsSimilarity",
    `Two parallel lines are cut by a transversal. One angle measures ${angle}°. Find the measure of the ${pos.name} angle.`,
    "the angle measure",
    ans,
    steps,
    { kind: "transversal", angle, relation: pos.relation },
    undefined,
    "degrees"
  );
}

function makeExteriorAngle(rng: RNG): Grade8Problem {
  const r1 = pick(rng, [25, 30, 35, 40, 45, 50, 55, 60, 65, 70]);
  let r2 = pick(rng, [25, 30, 35, 40, 45, 50, 55, 60, 70, 80]);
  if (r1 + r2 >= 175) r2 = 30;
  const ext = r1 + r2;
  return build(
    "TransversalsSimilarity",
    `In a triangle, the two remote interior angles for one exterior angle measure ${r1}° and ${r2}°. What is the measure of that exterior angle?`,
    "the exterior angle measure",
    ext,
    [
      {
        instruction: "The measure of an exterior angle of a triangle equals the sum of the two remote interior angles.",
        blanks: [{ label: "sum of remote interiors", answer: String(ext) }],
      },
      { instruction: "So the exterior angle measures:", blanks: [{ label: "answer", answer: `${ext}°` }] },
    ],
    { kind: "exterior-angle", r1, r2 },
    undefined,
    "degrees"
  );
}

function makeAASimilarity(rng: RNG): Grade8Problem {
  const a = pick(rng, [30, 35, 40, 45, 50, 55, 60, 65]);
  let b = pick(rng, [40, 45, 50, 55, 60, 70, 75, 80]);
  if (a + b >= 150) b = 40;
  const third = 180 - a - b;
  return build(
    "TransversalsSimilarity",
    `Triangle ABC has two angles measuring ${a}° and ${b}°. Triangle DEF also has two angles measuring ${a}° and ${b}°, so the triangles are similar by the AA criterion. What is the measure of the third angle in each triangle?`,
    "the third angle measure",
    third,
    [
      {
        instruction: "AA similarity: two pairs of congruent angles guarantee that the triangles have the same shape.",
        blanks: [{ label: "criterion", answer: "AA" }],
      },
      {
        instruction: `The angles of a triangle add to 180°, so the third angle is 180 − ${a} − ${b}.`,
        blanks: [{ label: "answer", answer: String(third) }],
      },
    ],
    { kind: "aa-similarity", a, b },
    undefined,
    "degrees"
  );
}

function makeTransversalAlgebra(rng: RNG): Grade8Problem {
  let m = 4;
  let x = 10;
  let c = 8;
  let A = 48;
  for (let tries = 0; tries < 40; tries++) {
    const tm = pick(rng, [2, 3, 4, 5]);
    const tx = randInt(rng, 5, 14);
    const tc = pick(rng, [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
    const tA = tm * tx + tc;
    if (tA >= 40 && tA <= 160) {
      m = tm;
      x = tx;
      c = tc;
      A = tA;
      break;
    }
  }
  const relation = pick(rng, ["equal", "supplementary"] as const);
  const partner = relation === "equal" ? A : 180 - A;
  const posName = relation === "equal" ? "alternate interior" : "same-side interior";
  const ans = `x = ${x}, angle = ${A}°`;
  return build(
    "TransversalsSimilarity",
    `Two parallel lines are cut by a transversal. A ${posName} angle measures (${m}x + ${c})°, and the angle it pairs with measures ${partner}°. The two angles are ${relation === "equal" ? "congruent" : "supplementary"}. Find the value of x and the measure of the first angle.`,
    "x and the angle measure",
    ans,
    [
      {
        instruction:
          relation === "equal"
            ? `Congruent angles have equal measures, so ${m}x + ${c} = ${partner}. Solve for x.`
            : `Supplementary angles add to 180°, so ${m}x + ${c} = 180 − ${partner} = ${A}. Solve for x.`,
        blanks: [{ label: "x", answer: String(x) }],
      },
      {
        instruction: `Substitute x back into ${m}x + ${c} to get the angle measure.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "transversal-algebra", m, c, relation, partner },
    undefined,
    "degrees"
  );
}

// ── Dilations on the coordinate plane (TEKS 8.3A, 8.3B, 8.3C) ──────────────

/** Reduce kn/kd and display as "3" or "3/2". */
function fracValueStr(kn: number, kd: number): string {
  let a = Math.abs(kn);
  let b = Math.abs(kd);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  const g = a || 1;
  const n = kn / g;
  const d = kd / g;
  return d === 1 ? String(n) : `${n}/${d}`;
}

function dilatePointProblem(rng: RNG, kn: number, kd: number, coords: number[]): Grade8Problem {
  const x = pick(rng, coords);
  const y = pick(rng, coords);
  const ix = (x * kn) / kd;
  const iy = (y * kn) / kd;
  const kStr = fracValueStr(kn, kd);
  return build(
    "DilationsCoordinate",
    `Point A(${x}, ${y}) is dilated from the origin by a scale factor of ${kStr}. What are the coordinates of the image A′?`,
    "the image coordinates",
    `(${ix}, ${iy})`,
    [
      {
        instruction: `Multiply the x-coordinate by the scale factor: ${x} × ${kStr} = ${ix}.`,
        blanks: [{ label: "x′", answer: String(ix) }],
      },
      {
        instruction: `Multiply the y-coordinate by the scale factor: ${y} × ${kStr} = ${iy}.`,
        blanks: [{ label: "A′", answer: `(${ix}, ${iy})` }],
      },
    ],
    { kind: "dilate-point", x, y, kn, kd },
    grid(
      [
        { x, y, label: "A", filled: true },
        { x: ix, y: iy, label: "A′" },
      ],
      [{ x1: x, y1: y, x2: ix, y2: iy, dashed: true }]
    )
  );
}

function makeDilatePointInt(rng: RNG): Grade8Problem {
  const cfg = pick(rng, [
    { k: 2, coords: [-4, -3, -2, -1, 1, 2, 3, 4] },
    { k: 3, coords: [-3, -2, -1, 1, 2, 3] },
  ]);
  return dilatePointProblem(rng, cfg.k, 1, cfg.coords);
}

function makeDilatePointFraction(rng: RNG): Grade8Problem {
  const cfg = pick(rng, [
    { kn: 1, kd: 2, coords: [-8, -6, -4, -2, 2, 4, 6, 8] },
    { kn: 1, kd: 3, coords: [-9, -6, -3, 3, 6, 9] },
    { kn: 3, kd: 2, coords: [-6, -4, -2, 2, 4, 6] },
  ]);
  return dilatePointProblem(rng, cfg.kn, cfg.kd, cfg.coords);
}

function makeFindScaleFactor(rng: RNG): Grade8Problem {
  const cfg = pick(rng, [
    { kn: 2, kd: 1, base: [-4, -3, -2, -1, 1, 2, 3, 4] },
    { kn: 3, kd: 1, base: [-3, -2, -1, 1, 2, 3] },
    { kn: 1, kd: 2, base: [-8, -6, -4, -2, 2, 4, 6, 8] },
    { kn: 1, kd: 3, base: [-9, -6, -3, 3, 6, 9] },
    { kn: 3, kd: 2, base: [-6, -4, -2, 2, 4, 6] },
    { kn: 2, kd: 3, base: [-9, -6, -3, 3, 6, 9] },
  ]);
  const x = pick(rng, cfg.base);
  const y = pick(rng, cfg.base);
  const ix = (x * cfg.kn) / cfg.kd;
  const iy = (y * cfg.kn) / cfg.kd;
  const ans = fracValueStr(cfg.kn, cfg.kd);
  return build(
    "DilationsCoordinate",
    `A dilation centered at the origin maps point P(${x}, ${y}) to P′(${ix}, ${iy}). What is the scale factor of the dilation?`,
    "the scale factor",
    ans,
    [
      {
        instruction: `Divide an image coordinate by the matching preimage coordinate: ${ix} ÷ ${x} = ${ans}.`,
        blanks: [{ label: "scale factor from x", answer: ans }],
      },
      {
        instruction: `Check with the y-coordinates: ${iy} ÷ ${y} = ${ans}. Both quotients agree.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "find-k", x, y, ix, iy },
    grid(
      [
        { x, y, label: "P", filled: true },
        { x: ix, y: iy, label: "P′" },
      ],
      [{ x1: x, y1: y, x2: ix, y2: iy, dashed: true }]
    )
  );
}

function makeDilationEffectLength(rng: RNG): Grade8Problem {
  const kf = pick(rng, [
    { kn: 2, kd: 1 },
    { kn: 3, kd: 1 },
    { kn: 1, kd: 2 },
  ]);
  const dims = kf.kd === 2 ? [4, 6, 8, 10, 12] : [2, 3, 4, 5, 6, 7, 8, 9];
  const w = pick(rng, dims);
  const h = pick(rng, dims);
  const sideName = pick(rng, ["width", "height"] as const);
  const len = sideName === "width" ? w : h;
  const newLen = (len * kf.kn) / kf.kd;
  const kStr = fracValueStr(kf.kn, kf.kd);
  return build(
    "DilationsCoordinate",
    `A rectangle has a width of ${w} cm and a height of ${h} cm. The rectangle is dilated by a scale factor of ${kStr}. What is the ${sideName} of the image?`,
    `the new ${sideName}`,
    newLen,
    [
      {
        instruction: `In a dilation, every length is multiplied by the scale factor: ${len} × ${kStr} = ${newLen}.`,
        blanks: [{ label: "answer", answer: String(newLen) }],
      },
    ],
    { kind: "effect-length", len, kn: kf.kn, kd: kf.kd },
    undefined,
    "cm"
  );
}

function makeDilationEffectArea(rng: RNG): Grade8Problem {
  const shape = pick(rng, ["rectangle", "triangle"] as const);
  const k = pick(rng, [2, 3]);
  if (shape === "rectangle") {
    const w = randInt(rng, 2, 9);
    const h = randInt(rng, 2, 9);
    const area = w * h;
    const ans = area * k * k;
    return build(
      "DilationsCoordinate",
      `A rectangle measuring ${w} cm by ${h} cm is dilated by a scale factor of ${k}. What is the area of the image?`,
      "the area of the image",
      ans,
      [
        {
          instruction: `The original area is ${w} × ${h} = ${area} cm². Areas grow by the square of the scale factor: ${area} × ${k}² = ${ans}.`,
          blanks: [{ label: "answer", answer: String(ans) }],
        },
      ],
      { kind: "effect-area", shape, w, h, kn: k, kd: 1 },
      undefined,
      "cm²"
    );
  }
  const b = pick(rng, [4, 6, 8, 10, 12]);
  const h = randInt(rng, 3, 9);
  const area = (b * h) / 2;
  const ans = area * k * k;
  return build(
    "DilationsCoordinate",
    `A triangle with a base of ${b} cm and a height of ${h} cm is dilated by a scale factor of ${k}. What is the area of the image?`,
    "the area of the image",
    ans,
    [
      {
        instruction: `The original area is (1/2) × ${b} × ${h} = ${area} cm². Areas grow by the square of the scale factor: ${area} × ${k}² = ${ans}.`,
        blanks: [{ label: "answer", answer: String(ans) }],
      },
    ],
    { kind: "effect-area", shape, b, h, kn: k, kd: 1 },
    undefined,
    "cm²"
  );
}

// ── Proportional vs. non-proportional (TEKS 8.5A, 8.5E, 8.5F, 8.5H) ───────

function makeClassifyEquation(rng: RNG): Grade8Problem {
  const form = pick(rng, ["kx", "mxb", "quad"] as const);
  let equation: string;
  let note: string;
  let ans: string;
  if (form === "kx") {
    const k = pick(rng, [2, 3, 4, 5, 6, 7, 8, 9]);
    equation = `y = ${k}x`;
    ans = "proportional";
    note = "The equation has the form y = kx with nothing added, so its graph is a line through the origin.";
  } else if (form === "mxb") {
    const m = pick(rng, [2, 3, 4, 5, 6, 7]);
    const b = randInt(rng, 1, 12);
    equation = pick(rng, [linearEqStr(m, b), linearEqStr(m, -b)]);
    ans = "non-proportional";
    note = "The equation is linear, but a constant is added or subtracted, so its graph does not pass through the origin.";
  } else {
    const a = pick(rng, [1, 2, 3]);
    const b = pick(rng, [0, 2, 3, 5]);
    const sq = a === 1 ? "x²" : `${a}x²`;
    equation = b === 0 ? `y = ${sq}` : `y = ${sq} + ${b}`;
    ans = "not linear";
    note = "The equation has an x² term, so its graph is a curve instead of a line.";
  }
  return build(
    "PropVsNonProp",
    `Classify the relationship shown by the equation ${equation}. Is it proportional, non-proportional, or not linear?`,
    "the classification",
    ans,
    [{ instruction: note, blanks: [{ label: "answer", answer: ans }] }],
    { kind: "classify-eq", equation }
  );
}

function makeClassifyTableProp(rng: RNG): Grade8Problem {
  const proportional = rng() < 0.5;
  const xs = [0, 1, 2, 3];
  let table: string;
  let ans: string;
  let note: string;
  if (proportional) {
    const k = pick(rng, [2, 3, 4, 5, 6]);
    table = xs.map((x) => `(${x}, ${k * x})`).join(", ");
    ans = "proportional";
    note = `Every y value is ${k} times the matching x value, and the pairs include (0, 0).`;
  } else {
    const m = pick(rng, [2, 3, 4, 5]);
    const b = randInt(rng, 1, 9);
    table = xs.map((x) => `(${x}, ${m * x + b})`).join(", ");
    ans = "non-proportional";
    note = `When x is 0, y is ${b} instead of 0, so the graph does not pass through the origin.`;
  }
  return build(
    "PropVsNonProp",
    `A relationship between x and y is shown by the pairs ${table}. Is the relationship proportional or non-proportional?`,
    "the classification",
    ans,
    [{ instruction: note, blanks: [{ label: "answer", answer: ans }] }],
    { kind: "classify-table", table }
  );
}

interface DVContext {
  ks: number[];
  promptK: (x1: number, y1: number) => string;
  promptY: (x1: number, y1: number, x2: number) => string;
}

const DV_CONTEXTS: DVContext[] = [
  {
    ks: [2, 3, 4, 5],
    promptK: (x1, y1) =>
      `${x1} pounds of grapes cost $${y1}. The cost y in dollars is proportional to the weight x in pounds, so y = kx. Find the constant of proportionality k.`,
    promptY: (x1, y1, x2) =>
      `${x1} pounds of grapes cost $${y1}, and the cost is proportional to the weight. How much do ${x2} pounds of grapes cost?`,
  },
  {
    ks: [40, 45, 50, 55, 60],
    promptK: (x1, y1) =>
      `A car travels ${y1} miles in ${x1} hours at a constant speed. The distance y in miles is proportional to the time x in hours, so y = kx. Find the constant of proportionality k.`,
    promptY: (x1, y1, x2) =>
      `A car travels ${y1} miles in ${x1} hours at a constant speed. How far does the car travel in ${x2} hours?`,
  },
  {
    ks: [10, 12, 15, 18, 20, 25],
    promptK: (x1, y1) =>
      `Sam earns $${y1} for ${x1} hours of work, and the pay is proportional to the hours worked. With pay as y and hours as x, y = kx. Find the constant of proportionality k.`,
    promptY: (x1, y1, x2) =>
      `Sam earns $${y1} for ${x1} hours of work, and the pay is proportional to the hours worked. How much does Sam earn for ${x2} hours of work?`,
  },
];

function makeDirectVariation(rng: RNG): Grade8Problem {
  const ctx = pick(rng, DV_CONTEXTS);
  const k = pick(rng, ctx.ks);
  const x1 = randInt(rng, 2, 6);
  const y1 = k * x1;
  let x2 = randInt(rng, 2, 9);
  if (x2 === x1) x2 = x1 + 1;
  const ask = pick(rng, ["k", "y"] as const);
  const ans = ask === "k" ? k : k * x2;
  const steps: Grade8Problem["steps"] = [
    {
      instruction: `The constant of proportionality is k = y ÷ x = ${y1} ÷ ${x1} = ${k}.`,
      blanks: [{ label: "k", answer: String(k) }],
    },
  ];
  if (ask === "y") {
    steps.push({
      instruction: `Multiply k by the new x value: ${k} × ${x2} = ${ans}.`,
      blanks: [{ label: "answer", answer: String(ans) }],
    });
  }
  return build(
    "PropVsNonProp",
    ask === "k" ? ctx.promptK(x1, y1) : ctx.promptY(x1, y1, x2),
    ask === "k" ? "the constant of proportionality" : "the missing value",
    ans,
    steps,
    { kind: "direct-variation", x1, y1, x2, ask }
  );
}

function makeClassifySituation(rng: RNG): Grade8Problem {
  const feeBased = rng() < 0.5;
  if (!feeBased) {
    const rate = pick(rng, [2, 3, 4, 5, 6, 8]);
    const text = pick(rng, [
      `A store sells notebooks for $${rate} each, with no other charges. The total cost depends on how many notebooks are bought.`,
      `A farmer sells eggs for $${rate} per dozen. The total cost depends on how many dozen eggs are bought.`,
    ]);
    return build(
      "PropVsNonProp",
      `${text} Is the relationship between the amount bought and the total cost proportional or non-proportional?`,
      "the classification",
      "proportional",
      [
        {
          instruction: "There is no starting fee, and the total is always the rate times the amount, so the graph passes through the origin.",
          blanks: [{ label: "answer", answer: "proportional" }],
        },
      ],
      { kind: "classify-situation", fee: 0, rate }
    );
  }
  const fee = pick(rng, [10, 15, 20, 25, 30, 40]);
  const rate = pick(rng, [5, 8, 10, 12, 15, 20]);
  const text = pick(rng, [
    `A gym charges a joining fee of $${fee} plus $${rate} per month. The total cost depends on how many months you belong.`,
    `A taxi company charges a pickup fee of $${fee} plus $${rate} per mile. The total fare depends on how many miles you ride.`,
  ]);
  return build(
    "PropVsNonProp",
    `${text} Is the relationship between the amount used and the total cost proportional or non-proportional?`,
    "the classification",
    "non-proportional",
    [
      {
        instruction: `The fee of $${fee} is charged even when the amount is 0, so the graph does not pass through the origin.`,
        blanks: [{ label: "answer", answer: "non-proportional" }],
      },
    ],
    { kind: "classify-situation", fee, rate }
  );
}

// ── College costs & savings plans (TEKS 8.12G) ──────────────────────────────

function makeTotalCollegeCost(rng: RNG): Grade8Problem {
  const years = pick(rng, [2, 4]);
  const yearly = pick(rng, [6000, 7500, 8000, 9000, 10000, 11000, 12000, 14000, 15000, 18000, 20000]);
  const total = yearly * years;
  const ans = money(total);
  const school = years === 4 ? "a four-year university" : "a two-year college";
  return build(
    "CollegeCosts",
    `Attending ${school} costs about $${yearly} per year for tuition, fees, and housing. What is the total cost for ${years} years?`,
    "the total cost",
    ans,
    [
      {
        instruction: `Multiply the yearly cost by the number of years: ${yearly} × ${years} = ${total}.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "total-cost", yearly, years },
    undefined,
    "dollars"
  );
}

function makeSavingsNeeded(rng: RNG): Grade8Problem {
  const goal = pick(rng, [12000, 15000, 18000, 20000, 24000, 30000, 36000, 40000]);
  const options = [1500, 2000, 2500, 3000, 4000, 5000, 6000, 7500, 8000, 10000].filter((v) => v < goal);
  const contribution = pick(rng, options);
  const need = goal - contribution;
  const ans = money(need);
  return build(
    "CollegeCosts",
    `The total cost of a college program is $${goal}. Your family can contribute $${contribution} toward the cost. How much do you still need to save?`,
    "the amount still needed",
    ans,
    [
      {
        instruction: `Subtract the family contribution from the total cost: ${goal} − ${contribution} = ${need}.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "savings-needed", goal, contribution },
    undefined,
    "dollars"
  );
}

function makeMonthlySavings(rng: RNG): Grade8Problem {
  const months = pick(rng, [12, 24, 36, 48, 60]);
  const monthly = pick(rng, [25, 40, 50, 60, 75, 80, 100, 125, 150, 200, 250, 300]);
  const amount = monthly * months;
  const years = months / 12;
  const ans = money(monthly);
  return build(
    "CollegeCosts",
    `You want to save $${amount} in ${years} year${years === 1 ? "" : "s"} before starting college. That is ${months} months of saving. If you save the same amount each month, how much should you save per month?`,
    "the monthly savings amount",
    ans,
    [
      {
        instruction: `Divide the goal by the number of months: ${amount} ÷ ${months} = ${monthly}.`,
        blanks: [{ label: "answer", answer: ans }],
      },
    ],
    { kind: "monthly-savings", amount, months },
    undefined,
    "dollars"
  );
}

function makeCompareCollegePaths(rng: RNG): Grade8Problem {
  const combos = [
    { monthly: 125, months: 48 },
    { monthly: 150, months: 60 },
    { monthly: 200, months: 48 },
    { monthly: 250, months: 36 },
    { monthly: 300, months: 48 },
  ];
  const [comboA, comboB] = shuffled(rng, combos).slice(0, 2);
  const programs = [
    { yearly: 15000, years: 2 },
    { yearly: 9000, years: 4 },
    { yearly: 10000, years: 4 },
    { yearly: 12000, years: 4 },
    { yearly: 16000, years: 2 },
    { yearly: 20000, years: 2 },
    { yearly: 15000, years: 4 },
  ];
  const progA = pick(rng, programs);
  const progB = pick(rng, programs);
  const totalA = progA.yearly * progA.years;
  const totalB = progB.yearly * progB.years;
  const needA = comboA.monthly * comboA.months;
  const needB = comboB.monthly * comboB.months;
  const contribA = totalA - needA;
  const contribB = totalB - needB;
  const ans = comboA.monthly < comboB.monthly ? "Plan A" : "Plan B";
  return build(
    "CollegeCosts",
    `Plan A: A ${progA.years}-year program costs $${progA.yearly} per year. Your family will contribute $${contribA}, and you have ${comboA.months} months to save the rest. Plan B: A ${progB.years}-year program costs $${progB.yearly} per year. Your family will contribute $${contribB}, and you have ${comboB.months} months to save the rest. Which plan requires the smaller amount of savings each month?`,
    "the plan with the smaller monthly savings",
    ans,
    [
      {
        instruction: `Plan A leaves ${totalA} − ${contribA} = ${needA} to save, which is ${needA} ÷ ${comboA.months} = $${comboA.monthly} per month.`,
        blanks: [{ label: "Plan A per month", answer: money(comboA.monthly) }],
      },
      {
        instruction: `Plan B leaves ${totalB} − ${contribB} = ${needB} to save, which is ${needB} ÷ ${comboB.months} = $${comboB.monthly} per month.`,
        blanks: [{ label: "Plan B per month", answer: money(comboB.monthly) }],
      },
      { instruction: "The plan with the smaller monthly savings is:", blanks: [{ label: "answer", answer: ans }] },
    ],
    { kind: "compare-paths", totalA, contribA, monthsA: comboA.months, totalB, contribB, monthsB: comboB.months },
    undefined,
    "dollars"
  );
}

// ── Writing problems for equations (TEKS 8.8B) ──────────────────────────────

interface MatchParts {
  r1: number;
  s1: number;
  r2: number;
  s2: number;
}

interface MatchTemplate {
  unit: string;
  text: (t: MatchParts) => string;
}

const MATCH_GYM: MatchTemplate = {
  unit: "months",
  text: (t) =>
    `Gym A charges a sign-up fee of $${t.s1} plus $${t.r1} per month. Gym B charges a sign-up fee of $${t.s2} plus $${t.r2} per month.`,
};

const MATCH_SAVINGS: MatchTemplate = {
  unit: "weeks",
  text: (t) =>
    `Lena starts with $${t.s1} in a savings account and deposits $${t.r1} each week. Marco starts with $${t.s2} in a savings account and deposits $${t.r2} each week.`,
};

function matchSituationProblem(rng: RNG, template: MatchTemplate): Grade8Problem {
  const r1 = randInt(rng, 5, 12);
  const r2 = randInt(rng, 1, r1 - 1);
  const x = randInt(rng, 2, 10);
  const s1 = pick(rng, [0, 5, 10, 15, 20, 25, 30]);
  const s2 = s1 + (r1 - r2) * x;
  const correct: MatchParts = { r1, s1, r2, s2 };
  const feeSwap: MatchParts = { r1, s1: s2, r2, s2: s1 };
  const rateSwap: MatchParts = { r1: r2, s1, r2: r1, s2 };
  const options = shuffled(rng, [correct, feeSwap, rateSwap]);
  const correctIndex = options.indexOf(correct);
  const letters = ["A", "B", "C"];
  const letter = letters[correctIndex];
  const eq = linearEquation(r1, s1, r2, s2);
  const optionsText = options.map((o, i) => `${letters[i]}. ${template.text(o)}`).join(" ");
  return build(
    "WriteTheProblem8",
    `Which situation can be represented by the equation ${eq}, where x is the number of ${template.unit}? ${optionsText}`,
    "the matching situation",
    letter,
    [
      {
        instruction: `The left side of the equation multiplies x by ${r1} and then adds ${s1}. Look for the situation that uses ${r1} as the rate and ${s1} as the starting value, in that order.`,
        blanks: [
          { label: "rate on the left", answer: String(r1) },
          { label: "starting value on the left", answer: String(s1) },
        ],
      },
      { instruction: "The situation that matches the equation is option:", blanks: [{ label: "answer", answer: letter }] },
    ],
    {
      kind: "match",
      a: r1,
      b: s1,
      c: r2,
      d: s2,
      options: options.map((o) => `${o.r1},${o.s1},${o.r2},${o.s2}`).join("|"),
      correctIndex,
    }
  );
}

function makeMatchGym(rng: RNG): Grade8Problem {
  return matchSituationProblem(rng, MATCH_GYM);
}

function makeMatchSavings(rng: RNG): Grade8Problem {
  return matchSituationProblem(rng, MATCH_SAVINGS);
}

function makeWriteEquationBoth(rng: RNG): Grade8Problem {
  const variant = pick(rng, ["gym", "elevator"] as const);
  const a = randInt(rng, 5, 12);
  const c = randInt(rng, 1, a - 1);
  const x = randInt(rng, 2, 10);
  if (variant === "gym") {
    const B = pick(rng, [0, 10, 20, 30, 40]);
    const D = B + (a - c) * x;
    const eq = linearEquation(a, B, c, D);
    return build(
      "WriteTheProblem8",
      `Gym A charges a sign-up fee of $${B} plus $${a} per month. Gym B charges a sign-up fee of $${D} plus $${c} per month. Write an equation that can be used to find the number of months x when the total costs of the two gyms are equal.`,
      "the equation",
      eq,
      [
        {
          instruction: "Write each total cost as a rate times x plus a starting fee, then set the two expressions equal.",
          blanks: [
            { label: "rate for Gym A", answer: String(a) },
            { label: "rate for Gym B", answer: String(c) },
          ],
        },
        { instruction: "The equation is:", blanks: [{ label: "answer", answer: eq }] },
      ],
      { kind: "write-eq-both", a, b: B, c, d: D }
    );
  }
  const depth2 = pick(rng, [10, 20, 30, 40, 50, 60]);
  const depth1 = depth2 + (a - c) * x;
  const eq = linearEquation(a, -depth1, c, -depth2);
  return build(
    "WriteTheProblem8",
    `Elevator A starts ${depth1} feet below ground level and rises ${a} feet per second. Elevator B starts ${depth2} feet below ground level and rises ${c} feet per second. Positions below ground are negative, and ground level is position 0. Write an equation that can be used to find the number of seconds x when the two elevators are at the same position.`,
    "the equation",
    eq,
    [
      {
        instruction: "Write each position as a rate times x plus a starting position, then set the two expressions equal.",
        blanks: [
          { label: "starting position of A", answer: String(-depth1) },
          { label: "starting position of B", answer: String(-depth2) },
        ],
      },
      { instruction: "The equation is:", blanks: [{ label: "answer", answer: eq }] },
    ],
    { kind: "write-eq-both", a, b: -depth1, c, d: -depth2 }
  );
}

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
  // Slope & rate of change
  { tier: 1, subtype: "SlopeRateOfChange", make: makeSlopeFromTable },
  { tier: 1, subtype: "SlopeRateOfChange", make: makeSlopeFromPoints },
  { tier: 2, subtype: "SlopeRateOfChange", make: makeSlopeInterceptGraph },
  { tier: 2, subtype: "SlopeRateOfChange", make: makeUnitRateSlope },
  { tier: 3, subtype: "SlopeRateOfChange", make: makeWriteLinearEquation },
  // Irrational numbers & estimation
  { tier: 1, subtype: "IrrationalNumbers", make: makeBracketSqrt },
  { tier: 1, subtype: "IrrationalNumbers", make: makeClassifyReal },
  { tier: 2, subtype: "IrrationalNumbers", make: makeApproxSqrtTenth },
  { tier: 3, subtype: "IrrationalNumbers", make: makeOrderReals },
  // Mean absolute deviation
  { tier: 1, subtype: "MeanAbsoluteDeviation", make: makeMadBasic },
  { tier: 2, subtype: "MeanAbsoluteDeviation", make: makeMadContext },
  { tier: 3, subtype: "MeanAbsoluteDeviation", make: makeCompareMad },
  // Surface area of prisms & cylinders
  { tier: 1, subtype: "SurfaceArea8", make: makeRectPrismSA },
  { tier: 2, subtype: "SurfaceArea8", make: makeCylinderSA },
  { tier: 2, subtype: "SurfaceArea8", make: makeTriPrismSA },
  { tier: 3, subtype: "SurfaceArea8", make: makeCylinderLateral },
  // Simple & compound interest
  { tier: 1, subtype: "InterestAndCredit", make: makeSimpleInterest },
  { tier: 2, subtype: "InterestAndCredit", make: makeSimpleBalance },
  { tier: 2, subtype: "InterestAndCredit", make: makeCompoundInterest },
  { tier: 3, subtype: "InterestAndCredit", make: makeCompareLoans },
  // Angle relationships & similar triangles
  { tier: 1, subtype: "TransversalsSimilarity", make: makeTransversalAngle },
  { tier: 2, subtype: "TransversalsSimilarity", make: makeExteriorAngle },
  { tier: 2, subtype: "TransversalsSimilarity", make: makeAASimilarity },
  { tier: 3, subtype: "TransversalsSimilarity", make: makeTransversalAlgebra },
  // Dilations on the coordinate plane
  { tier: 1, subtype: "DilationsCoordinate", make: makeDilatePointInt },
  { tier: 2, subtype: "DilationsCoordinate", make: makeDilatePointFraction },
  { tier: 2, subtype: "DilationsCoordinate", make: makeFindScaleFactor },
  { tier: 3, subtype: "DilationsCoordinate", make: makeDilationEffectLength },
  { tier: 3, subtype: "DilationsCoordinate", make: makeDilationEffectArea },
  // Proportional vs. non-proportional
  { tier: 1, subtype: "PropVsNonProp", make: makeClassifyEquation },
  { tier: 1, subtype: "PropVsNonProp", make: makeClassifyTableProp },
  { tier: 2, subtype: "PropVsNonProp", make: makeDirectVariation },
  { tier: 3, subtype: "PropVsNonProp", make: makeClassifySituation },
  // College costs & savings plans
  { tier: 1, subtype: "CollegeCosts", make: makeTotalCollegeCost },
  { tier: 2, subtype: "CollegeCosts", make: makeSavingsNeeded },
  { tier: 2, subtype: "CollegeCosts", make: makeMonthlySavings },
  { tier: 3, subtype: "CollegeCosts", make: makeCompareCollegePaths },
  // Writing problems for equations
  { tier: 1, subtype: "WriteTheProblem8", make: makeMatchGym },
  { tier: 2, subtype: "WriteTheProblem8", make: makeMatchSavings },
  { tier: 3, subtype: "WriteTheProblem8", make: makeWriteEquationBoth },
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
  "SlopeRateOfChange",
  "IrrationalNumbers",
  "MeanAbsoluteDeviation",
  "SurfaceArea8",
  "InterestAndCredit",
  "TransversalsSimilarity",
  "DilationsCoordinate",
  "PropVsNonProp",
  "CollegeCosts",
  "WriteTheProblem8",
];

/**
 * Generate n Grade 8 problems using the provided RNG.
 * `subtypes` optionally restricts to certain topics; `difficulty` filters tiers.
 */
export function generateGrade8Problems(
  rng: RNG,
  n: number,
  difficulty: Grade8Difficulty = 2,
  subtypes?: readonly Grade8Subtype[],
  wordProblems = false
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
  return dedupeGenerate(() => {
    const entry = pick(rng, finalPool);
    const problem = entry.make(rng, wordProblems);
    problem.tier = entry.tier;
    return problem;
  }, n);
}
