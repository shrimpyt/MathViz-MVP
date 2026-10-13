// SegmentPartitionFactory.ts
// Topic 7: Partitioning a Segment (TEKS G.2(A)).
// Lesson ch7-2. D1: the point that divides a segment in a given ratio m:n,
// built with the section formula so the coordinates come out whole. D2: the
// same idea stated as a fraction of the way from A to B (the midpoint is the
// 1:1, halfway case). D3: work backwards, recover the endpoint B from A, the
// dividing point, and the ratio. All coordinates stay on the −8..8 grid.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { GeometryProblem } from "./GeometryTypes";
import {
  step, num, type Difficulty, type MakerEntry, M, sampleFromPool,
} from "./GeometryHelpers";

/** Coordinate pair with trimmed decimals, e.g. "(2.5, -1)". */
function ptNum(x: number, y: number): string {
  return `(${num(x)}, ${num(y)})`;
}

interface Built {
  ax: number; ay: number; bx: number; by: number;
  px: number; py: number; m: number; n: number;
}

/** Build A, B and the point P dividing AB in the ratio m:n, all whole
 *  numbers on the grid: the run from A to B is (m + n) copies of one step. */
function buildPartition(rng: RNG): Built {
  const ratios: [number, number][] = [
    [1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [3, 2], [1, 4], [4, 1], [3, 4], [4, 3],
  ];
  for (let tries = 0; tries < 40; tries++) {
    const [m, n] = pick(rng, ratios);
    const ax = randInt(rng, -5, 5);
    const ay = randInt(rng, -5, 5);
    const ux = randInt(rng, -2, 2);
    const uy = randInt(rng, -2, 2);
    if (ux === 0 && uy === 0) continue;
    const bx = ax + (m + n) * ux;
    const by = ay + (m + n) * uy;
    if (Math.abs(bx) > 7 || Math.abs(by) > 7) continue;
    return { ax, ay, bx, by, px: ax + m * ux, py: ay + m * uy, m, n };
  }
  // Fixed safe fallback (never reached in practice; deterministic).
  return { ax: -4, ay: -2, bx: 2, by: 4, px: -2, py: 0, m: 1, n: 2 };
}

function gridFigure(b: Built, showP: boolean) {
  return {
    kind: "GridFigure" as const,
    points: [
      { label: "A", x: b.ax, y: b.ay },
      { label: "B", x: b.bx, y: b.by },
      ...(showP ? [{ label: "P", x: b.px, y: b.py }] : []),
    ],
    lines: [{ x1: b.ax, y1: b.ay, x2: b.bx, y2: b.by }],
  };
}

function makeSegmentPartition(rng: RNG): GeometryProblem {
  const b = buildPartition(rng);
  const total = b.m + b.n;
  const ans = ptNum(b.px, b.py);
  return {
    type: "GEO.7",
    subtype: "SegmentPartition",
    prompt: `Point P divides the segment from A${ptNum(b.ax, b.ay)} to B${ptNum(b.bx, b.by)} in the ratio ${b.m}:${b.n}. Find the coordinates of P.`,
    given: { A: ptNum(b.ax, b.ay), B: ptNum(b.bx, b.by), ratio: `${b.m}:${b.n}` },
    find: "coordinates of the dividing point",
    answer: ans,
    steps: [
      step(`P lies ${b.m}/${total} of the way from A to B, so first find the run from A to B: (${b.bx} − ${b.ax}, ${b.by} − ${b.ay}) = (${b.bx - b.ax}, ${b.by - b.ay}).`, "A partition point is a fraction of the way along the segment."),
      step(`Take ${b.m}/${total} of that run: (${b.px - b.ax}, ${b.py - b.ay}).`, "Scale the run by the fraction m/(m + n).", [
        { label: "run used", answer: ptNum(b.px - b.ax, b.py - b.ay) },
      ]),
      step(`Add the scaled run to A: ${ptNum(b.ax, b.ay)} + ${ptNum(b.px - b.ax, b.py - b.ay)} = ${ans}.`, "Section formula.", [
        { label: "P", answer: ans },
      ]),
    ],
    svgParams: gridFigure(b, true),
    verify: { kind: "partition", ax: b.ax, ay: b.ay, bx: b.bx, by: b.by, m: b.m, n: b.n },
  };
}

function makeSegmentFraction(rng: RNG): GeometryProblem {
  const fracs: [number, number][] = [[1, 4], [1, 3], [1, 2], [2, 3], [3, 4]];
  const [fn, fd] = pick(rng, fracs);
  const isMidCase = fn === 1 && fd === 2;
  let ax = 0, ay = 0, bx = isMidCase ? 4 : fd, by = isMidCase ? 2 : fd; // safe fallback
  for (let tries = 0; tries < 40; tries++) {
    const tax = randInt(rng, -5, 5);
    const tay = randInt(rng, -5, 5);
    // For the halfway (midpoint) case any run works; other fractions use a
    // run that is a whole number of equal steps so P has whole coordinates.
    const ux = isMidCase ? randInt(rng, -5, 5) : randInt(rng, -2, 2) * fd;
    const uy = isMidCase ? randInt(rng, -5, 5) : randInt(rng, -2, 2) * fd;
    if (ux === 0 && uy === 0) continue;
    if (Math.abs(tax + ux) > 7 || Math.abs(tay + uy) > 7) continue;
    ax = tax; ay = tay; bx = tax + ux; by = tay + uy;
    break;
  }
  const px = ax + (bx - ax) * (fn / fd);
  const py = ay + (by - ay) * (fn / fd);
  const ans = ptNum(px, py);
  const isMid = fn === 1 && fd === 2;
  const fracText = isMid ? "halfway (the midpoint)" : `${fn}/${fd} of the way`;
  return {
    type: "GEO.7",
    subtype: "SegmentFraction",
    prompt: `Find the point that lies ${fracText} from A${ptNum(ax, ay)} to B${ptNum(bx, by)}.`,
    given: { A: ptNum(ax, ay), B: ptNum(bx, by), fraction: `${fn}/${fd}` },
    find: isMid ? "midpoint" : "coordinates of the point",
    answer: ans,
    steps: [
      step(`Find the run from A to B: (${bx} − ${ax}, ${by} − ${ay}) = (${bx - ax}, ${by - ay}).`, "Subtract the coordinates of A from the coordinates of B."),
      step(
        isMid
          ? `The midpoint is halfway along the run, and it is also the average of the endpoints: ((${ax} + ${bx})/2, (${ay} + ${by})/2).`
          : `Take ${fn}/${fd} of the run: (${num(px - ax)}, ${num(py - ay)}).`,
        isMid ? "Midpoint formula." : "Scale the run by the fraction.",
        [{ label: "scaled run", answer: ptNum(px - ax, py - ay) }]
      ),
      step(`Add the scaled run to A to get the point ${ans}.`, "Add the scaled run to the starting point.", [
        { label: "point", answer: ans },
      ]),
    ],
    svgParams: {
      kind: "GridFigure",
      points: [
        { label: "A", x: ax, y: ay },
        { label: "B", x: bx, y: by },
        { label: "P", x: px, y: py },
      ],
      lines: [{ x1: ax, y1: ay, x2: bx, y2: by }],
    },
    verify: { kind: "partitionFrac", ax, ay, bx, by, num: fn, den: fd },
  };
}

function makeSegmentEndpoint(rng: RNG): GeometryProblem {
  const b = buildPartition(rng);
  const total = b.m + b.n;
  const ans = ptNum(b.bx, b.by);
  return {
    type: "GEO.7",
    subtype: "SegmentEndpoint",
    prompt: `Point P${ptNum(b.px, b.py)} divides the segment from A${ptNum(b.ax, b.ay)} to B in the ratio ${b.m}:${b.n}. Find the coordinates of B.`,
    given: { A: ptNum(b.ax, b.ay), P: ptNum(b.px, b.py), ratio: `${b.m}:${b.n}` },
    find: "coordinates of the endpoint B",
    answer: ans,
    steps: [
      step(`P is ${b.m}/${total} of the way from A to B, so the run from A to P is ${b.m} of the ${total} equal parts of the whole run.`, "A partition point is a fraction of the way along the segment."),
      step(`Run from A to P: ${ptNum(b.px - b.ax, b.py - b.ay)}. One part is that run divided by ${b.m}: ${ptNum((b.px - b.ax) / b.m, (b.py - b.ay) / b.m)}.`, "Find the size of one part.", [
        { label: "one part", answer: ptNum((b.px - b.ax) / b.m, (b.py - b.ay) / b.m) },
      ]),
      step(`The whole run is ${total} parts, so B = A + ${total} parts = ${ans}.`, "Scale back up and add to A.", [
        { label: "B", answer: ans },
      ]),
    ],
    svgParams: gridFigure(b, true),
    verify: { kind: "partitionEndpoint", ax: b.ax, ay: b.ay, px: b.px, py: b.py, m: b.m, n: b.n },
  };
}

// ── Pool + public generator ───────────────────────────────────────────────────

export const SEGMENT_PARTITION_LESSON_POOL: MakerEntry[] = [
  M("SegmentPartition", 1, (rng) => makeSegmentPartition(rng)),
  M("SegmentFraction", 2, (rng) => makeSegmentFraction(rng)),
  M("SegmentEndpoint", 3, (rng) => makeSegmentEndpoint(rng)),
];

export function generatePartitionProblems(
  rng: RNG,
  n: number,
  difficulty: Difficulty,
  only?: readonly string[]
): GeometryProblem[] {
  const pool = only ? SEGMENT_PARTITION_LESSON_POOL.filter((e) => only.includes(e.subtype)) : SEGMENT_PARTITION_LESSON_POOL;
  return sampleFromPool(rng, pool, n, difficulty);
}
