// quad-checks.ts, checker-side quadrilateral logic for verify.ts.
//
// Nothing here reads a factory's steps or answer text to decide what is
// true. Classification is re-derived from the MARKS on the diagram (tick
// marks, parallel arrows, angle arcs, right-angle squares) and from raw
// coordinates; mark accuracy is re-measured in drawing coordinates.

import type { GeometryProblem, PolygonFigureParams } from "../../src/lib/factories/GeometryTypes";

type Pt = { x: number; y: number };
type Kind = "quadrilateral" | "parallelogram" | "rectangle" | "rhombus" | "square";

/** Facts a set of marks states about quadrilateral V0V1V2V3 (center E). */
interface MarkFacts {
  letters: string[];
  center?: string;
  tickGroups: string[][]; // each group: segment keys (sorted letters)
  parGroups: string[][];
  arcGroups: string[][];
  rightVerts: string[];
  perpDiagonals: boolean;
  extraCong?: [string, string][];
}

const keyOf = (a: string, b: string) => [a, b].sort().join("");

function groups(rec: Record<string, number> | undefined, norm: (k: string) => string): string[][] {
  const by = new Map<number, string[]>();
  for (const [k, c] of Object.entries(rec ?? {})) {
    if (!by.has(c)) by.set(c, []);
    by.get(c)!.push(norm(k));
  }
  return [...by.values()];
}

/** Split a key like "AB" or "AE" into its two point labels. */
function splitKey(k: string): [string, string] {
  return [k[0], k.slice(1)];
}

export function factsFromParams(p: PolygonFigureParams): MarkFacts {
  const letters = p.vertices.map((v) => v.label);
  const segNorm = (k: string) => {
    const [a, b] = splitKey(k);
    return keyOf(a, b);
  };
  return {
    letters,
    center: p.center?.label,
    tickGroups: groups(p.ticks, segNorm),
    parGroups: groups(p.parallelMarks, segNorm),
    arcGroups: groups(p.angleArcs, (k) => k),
    rightVerts: p.rightAngles ?? [],
    perpDiagonals: (p.rightAngleMarks ?? []).some((m) => m.at === p.center?.label),
  };
}

export function classifyFacts(f: MarkFacts): Kind {
  const [A, B, C, D] = f.letters;
  const E = f.center;
  const extra = f.extraCong ?? [];
  const inGroup = (gs: string[][], a: string, b: string) =>
    a === b || gs.some((g) => g.includes(a) && g.includes(b)) ||
    extra.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  const cong = (s: string, t: string) => inGroup(f.tickGroups, s, t);
  const par = (s: string, t: string) => f.parGroups.some((g) => g.includes(s) && g.includes(t));
  const s0 = keyOf(A, B), s1 = keyOf(B, C), s2 = keyOf(C, D), s3 = keyOf(D, A);
  const ang = (a: string, b: string) => f.arcGroups.some((g) => g.includes(a) && g.includes(b));

  const fourRight = [A, B, C, D].every((v) => f.rightVerts.includes(v));
  const oppSides = cong(s0, s2) && cong(s1, s3);
  const bothPar = par(s0, s2) && par(s1, s3);
  const bisect = !!E && cong(keyOf(A, E), keyOf(E, C)) && cong(keyOf(B, E), keyOf(E, D));
  const oppAng = (ang(A, C) && ang(B, D)) || fourRight;
  const onePair = (cong(s0, s2) && par(s0, s2)) || (cong(s1, s3) && par(s1, s3));
  const isPara = oppSides || bothPar || bisect || oppAng || onePair;
  if (!isPara) {
    // Four congruent sides is a rhombus outright (it is a parallelogram).
    const allFour = cong(s0, s1) && cong(s1, s2) && cong(s2, s3);
    if (allFour) return f.rightVerts.length > 0 ? "square" : "rhombus";
    return "quadrilateral";
  }
  const anyRight = f.rightVerts.length > 0;
  const diagCong =
    (!!E && bisect && cong(keyOf(A, E), keyOf(B, E))) ||
    extra.some(([x, y]) => keyOf(x[0], x[1]) === keyOf(A, C) && keyOf(y[0], y[1]) === keyOf(B, D));
  const rect = anyRight || diagCong;
  const consec = cong(s0, s1) || cong(s1, s2) || cong(s2, s3) || cong(s3, s0);
  const rhom = consec || f.perpDiagonals;
  if (rect && rhom) return "square";
  if (rect) return "rectangle";
  if (rhom) return "rhombus";
  return "parallelogram";
}

function isParaFacts(f: MarkFacts): boolean {
  return classifyFacts(f) !== "quadrilateral";
}

const NAME: Record<Kind, string> = {
  quadrilateral: "Quadrilateral", parallelogram: "Parallelogram", rectangle: "Rectangle", rhombus: "Rhombus", square: "Square",
};
const ALL: Record<Kind, string[]> = {
  quadrilateral: [],
  parallelogram: ["parallelogram"],
  rectangle: ["parallelogram", "rectangle"],
  rhombus: ["parallelogram", "rhombus"],
  square: ["parallelogram", "rectangle", "rhombus", "square"],
};

export function verifyQuadMarks(p: GeometryProblem, form: string): boolean {
  if (p.svgParams?.kind !== "PolygonFigure") return false;
  const f = factsFromParams(p.svgParams);
  const k = classifyFacts(f);
  const A = p.answer;
  if (form === "most") return A.startsWith(`${NAME[k]}: `) && A.length > NAME[k].length + 20;
  if (form === "all") {
    const names = ALL[k];
    if (names.length === 0) return A.startsWith("None");
    const list = names.join(", ");
    return A.toLowerCase().startsWith(`${list}: `);
  }
  if (form === "para") return isParaFacts(f) ? A.startsWith("Yes. ") : A.startsWith("No: ");
  return false;
}

/** The start shape's marks classify as `start`; adding the stated fact makes
 *  them classify as `target`; and the fact is about the asked part. */
export function verifyQuadNeed(p: GeometryProblem, start: string, target: string, about: string): boolean {
  if (p.svgParams?.kind !== "PolygonFigure") return false;
  const f = factsFromParams(p.svgParams);
  if (classifyFacts(f) !== start) return false;
  const [A, B, C, D] = f.letters;
  const ans = p.answer;
  const g: MarkFacts = { ...f, rightVerts: [...f.rightVerts], extraCong: [] };
  let aboutOk = false;
  if (/right angle/.test(ans)) {
    const m = ans.match(/m∠(\w)/);
    if (m) g.rightVerts.push(m[1]);
    aboutOk = about === "angles";
  } else if (ans.includes(`${A}${C} ⊥ ${B}${D}`)) {
    g.perpDiagonals = true;
    aboutOk = about === "diagonals";
  } else if (ans.includes(`${A}${C} ≅ ${B}${D}`)) {
    g.extraCong = [[`${A}${C}`, `${B}${D}`]];
    aboutOk = about === "diagonals";
  } else {
    const m = ans.match(/(\w)(\w) ≅ (\w)(\w)/);
    if (m) {
      g.extraCong = [[keyOf(m[1], m[2]), keyOf(m[3], m[4])]];
      const sides = [keyOf(A, B), keyOf(B, C), keyOf(C, D), keyOf(D, A)];
      aboutOk = about === "sides" && sides.includes(keyOf(m[1], m[2])) && sides.includes(keyOf(m[3], m[4]));
    }
  }
  return aboutOk && classifyFacts(g) === target;
}

// ── Coordinates ──────────────────────────────────────────────────────────────

export function classifyCoords(xs: number[], ys: number[]): string {
  const P = xs.map((x, i) => ({ x, y: ys[i] }));
  const v = (i: number) => ({ x: P[(i + 1) % 4].x - P[i].x, y: P[(i + 1) % 4].y - P[i].y });
  const cross = (a: Pt, b: Pt) => a.x * b.y - a.y * b.x;
  const dot = (a: Pt, b: Pt) => a.x * b.x + a.y * b.y;
  const len2 = (a: Pt) => dot(a, a);
  const s = [0, 1, 2, 3].map(v);
  const par02 = cross(s[0], s[2]) === 0;
  const par13 = cross(s[1], s[3]) === 0;
  if (par02 && par13) {
    const right = dot(s[0], s[1]) === 0;
    const eq = len2(s[0]) === len2(s[1]);
    if (right && eq) return "Square";
    if (right) return "Rectangle";
    if (eq) return "Rhombus";
    return "Parallelogram";
  }
  if (par02 !== par13) return "Trapezoid";
  const L = s.map(len2);
  if ((L[0] === L[1] && L[2] === L[3]) || (L[1] === L[2] && L[3] === L[0])) return "Kite";
  return "Quadrilateral";
}

// ── Mark accuracy (drawing coordinates) ──────────────────────────────────────

/** Every mark on a PolygonFigure must be true of the figure as drawn.
 *  Returns a list of problems found (empty = accurate). */
export function markAccuracyIssues(p: PolygonFigureParams): string[] {
  const issues: string[] = [];
  const pts = new Map<string, Pt>();
  for (const v of p.vertices) pts.set(v.label, v);
  if (p.center) pts.set(p.center.label, p.center);
  for (const e of p.extraPoints ?? []) pts.set(e.label, e);
  const P = (l: string) => pts.get(l);
  const seg = (k: string) => {
    const [a, b] = splitKey(k);
    return [P(a), P(b)] as const;
  };
  const len = (k: string) => {
    const [a, b] = seg(k);
    if (!a || !b) return NaN;
    return Math.hypot(b.x - a.x, b.y - a.y);
  };
  const tick = groups(p.ticks, (k) => k);
  for (const g of tick) {
    const L = g.map(len);
    if (L.some((x) => Number.isNaN(x))) issues.push(`tick on unknown segment ${g.join(",")}`);
    else if (Math.max(...L) - Math.min(...L) > 0.8) issues.push(`ticks ${g.join(",")} not equal: ${L.map((x) => x.toFixed(1)).join(",")}`);
  }
  for (const g of groups(p.parallelMarks, (k) => k)) {
    const dirs = g.map((k) => {
      const [a, b] = seg(k);
      if (!a || !b) return null;
      const l = Math.hypot(b.x - a.x, b.y - a.y);
      return { x: (b.x - a.x) / l, y: (b.y - a.y) / l };
    });
    if (dirs.some((d) => !d)) issues.push(`arrow on unknown segment ${g.join(",")}`);
    else for (const d of dirs) if (Math.abs(d!.x * dirs[0]!.y - d!.y * dirs[0]!.x) > 0.01) issues.push(`arrows ${g.join(",")} not parallel`);
  }
  const n = p.vertices.length;
  const angleAt = (at: Pt, a: Pt, b: Pt) => {
    const u = { x: a.x - at.x, y: a.y - at.y };
    const w = { x: b.x - at.x, y: b.y - at.y };
    return (Math.acos((u.x * w.x + u.y * w.y) / (Math.hypot(u.x, u.y) * Math.hypot(w.x, w.y))) * 180) / Math.PI;
  };
  const vertexAngle = (label: string) => {
    const i = p.vertices.findIndex((v) => v.label === label);
    if (i < 0) return NaN;
    return angleAt(p.vertices[i], p.vertices[(i + n - 1) % n], p.vertices[(i + 1) % n]);
  };
  for (const g of groups(p.angleArcs, (k) => k)) {
    const A = g.map(vertexAngle);
    if (A.some((x) => Number.isNaN(x))) issues.push(`arc at unknown vertex ${g.join(",")}`);
    else if (Math.max(...A) - Math.min(...A) > 0.6) issues.push(`arcs ${g.join(",")} not equal: ${A.map((x) => x.toFixed(1)).join(",")}`);
  }
  for (const r of p.rightAngles ?? []) {
    const a = vertexAngle(r);
    if (!(Math.abs(a - 90) < 0.6)) issues.push(`right angle at ${r} measures ${a.toFixed(1)}°`);
  }
  for (const m of p.rightAngleMarks ?? []) {
    const at = P(m.at), a = P(m.from), b = P(m.to);
    if (!at || !a || !b) { issues.push(`right-angle mark on unknown point ${m.at}`); continue; }
    const deg = angleAt(at, a, b);
    if (!(Math.abs(deg - 90) < 0.6)) issues.push(`right angle at ${m.at} measures ${deg.toFixed(1)}°`);
  }
  if (p.center && p.diagonals) {
    // the center must lie on every drawn diagonal
    for (const [i, j] of p.diagonals) {
      const a = p.vertices[i], b = p.vertices[j], c = p.center;
      const cr = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
      if (Math.abs(cr) / Math.hypot(b.x - a.x, b.y - a.y) > 0.3) issues.push(`center ${c.label} is off diagonal ${a.label}${b.label}`);
    }
  }
  for (const v of p.vertices) {
    if (v.x < 8 || v.x > 192 || v.y < 8 || v.y > 192) issues.push(`vertex ${v.label} outside the frame`);
  }
  return issues;
}
