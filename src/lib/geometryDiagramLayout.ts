// geometryDiagramLayout.ts
// Label layout for the Geometry circle diagrams (inscribed angle, tangent-
// chord) and the two-point coordinate grid,
// shared by the PDF (PdfGeometrySVG) and web (GeometrySVG) renderers. Both
// draw in a 200×200 viewBox with the circle at (100, 100), radius 70.
//
// The unknown angle is always labeled "?" at its vertex. The diagram never
// prints the answer: that is what the student is asked to find.

import {
  type Pt,
  type Rect,
  type Seg,
  angleArcPath,
  circleSegments,
  circleTangentAt,
  layoutGridPointLabels,
  nudgeClear,
  placeAngleLabel,
  radialLabel,
  rectAround,
  textBox,
} from "./labelPlacement";

export const CIRCLE_CENTER: Pt = { x: 100, y: 100 };
export const CIRCLE_R = 70;
export const VERTEX_ARC_R = 13;
const FONT = 8;
const VIEW: Rect = { x0: 2, y0: 2, x1: 198, y1: 198 };
const CIRCLE = circleSegments(CIRCLE_CENTER, CIRCLE_R);

export type PlacedLabel = { text: string; center: Pt; leader?: Seg };

function polar(r: number, angleDeg: number): Pt {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CIRCLE_CENTER.x + r * Math.cos(a), y: CIRCLE_CENTER.y + r * Math.sin(a) };
}

function place(labels: PlacedLabel[], text: string, center: Pt, ws: number): Rect {
  labels.push({ text, center });
  return rectAround(center, textBox(text, FONT, ws), 1);
}

/** Labels for the inscribed-angle figure: A, B, V outside the circle, the
 *  intercepted arc's measure beside the arc, and "?" inside the angle at V. */
export function inscribedLabels(
  A: Pt,
  B: Pt,
  V: Pt,
  interceptedArc: number,
  arcStart: number,
  widthScale = 1,
): PlacedLabel[] {
  const out: PlacedLabel[] = [];
  const taken: Rect[] = [];
  for (const [pt, name] of [[A, "A"], [B, "B"], [V, "V"]] as const) {
    taken.push(place(out, name, radialLabel(CIRCLE_CENTER, pt, textBox(name, FONT, widthScale), 4), widthScale));
  }
  const obstacles: Seg[] = [[V, A], [V, B], ...CIRCLE];
  const arcText = `${interceptedArc}°`;
  const arcMid = polar(CIRCLE_R, arcStart + interceptedArc / 2);
  const arcBox = textBox(arcText, FONT, widthScale);
  taken.push(place(out, arcText, nudgeClear(radialLabel(CIRCLE_CENTER, arcMid, arcBox, 5), arcBox, { obstacles, avoid: taken, bounds: VIEW, away: CIRCLE_CENTER }), widthScale));

  const q = placeAngleLabel(V, A, B, textBox("?", FONT, widthScale), {
    arcR: VERTEX_ARC_R,
    obstacles,
    bounds: VIEW,
    avoid: taken,
    callout: 12,
  });
  out.push({ text: "?", center: q.center, leader: q.leader });
  return out;
}

export type TangentLayout = {
  /** Tangent line end points; t2 is on the side of the intercepted arc. */
  t1: Pt;
  t2: Pt;
  labels: PlacedLabel[];
};

/** Tangent-chord figure: the tangent at A is drawn perpendicular to the
 *  radius OA (it used to be horizontal whatever the rotation), and the
 *  unknown angle between the tangent and chord AB is labeled "?". */
export function tangentLayout(A: Pt, B: Pt, tangentAngle: number, chordStart: number, widthScale = 1): TangentLayout {
  const t = circleTangentAt(CIRCLE_CENTER, A);
  const half = 45;
  const t1 = { x: A.x - t.x * half, y: A.y - t.y * half };
  const t2 = { x: A.x + t.x * half, y: A.y + t.y * half };

  const out: PlacedLabel[] = [];
  const taken: Rect[] = [];
  taken.push(place(out, "A", radialLabel(CIRCLE_CENTER, A, textBox("A", FONT, widthScale), 4), widthScale));
  taken.push(place(out, "B", radialLabel(CIRCLE_CENTER, B, textBox("B", FONT, widthScale), 4), widthScale));
  // "t" beside the far end of the tangent, away from the circle.
  taken.push(place(out, "t", radialLabel(CIRCLE_CENTER, t1, textBox("t", FONT, widthScale), 3), widthScale));
  const obstacles: Seg[] = [[t1, t2], [A, B], ...CIRCLE];
  const arcText = `${tangentAngle * 2}°`;
  const arcMid = polar(CIRCLE_R, chordStart + tangentAngle);
  const arcBox = textBox(arcText, FONT, widthScale);
  taken.push(place(out, arcText, nudgeClear(radialLabel(CIRCLE_CENTER, arcMid, arcBox, 5), arcBox, { obstacles, avoid: taken, bounds: VIEW, away: CIRCLE_CENTER }), widthScale));

  const q = placeAngleLabel(A, t2, B, textBox("?", FONT, widthScale), {
    arcR: VERTEX_ARC_R,
    obstacles,
    bounds: VIEW,
    avoid: taken,
    callout: 12,
  });
  out.push({ text: "?", center: q.center, leader: q.leader });
  return { t1, t2, labels: out };
}

/**
 * Labels for the Geometry two-point coordinate grid (G.2(B)): a 200×200
 * viewBox, origin at (100, 100), 10 units per grid step, axes from 20 to 180.
 * Each label goes beside its point, clear of the segment between the points,
 * the axes and the other point.
 */
export function coordinatePairLabels(
  p1: { x: number; y: number; label: string },
  p2: { x: number; y: number; label: string },
  widthScale = 1,
): PlacedLabel[] {
  const at = (q: { x: number; y: number }) => ({ x: 100 + q.x * 10, y: 100 - q.y * 10 });
  const a = at(p1);
  const b = at(p2);
  const centers = layoutGridPointLabels({
    points: [{ at: a, text: p1.label }, { at: b, text: p2.label }],
    lines: [[a, b]],
    axes: [[{ x: 20, y: 100 }, { x: 180, y: 100 }], [{ x: 100, y: 20 }, { x: 100, y: 180 }]],
    bounds: { x0: 0, y0: 0, x1: 200, y1: 200 },
    fontSize: 9,
    widthScale,
    marker: 3,
  });
  const out: PlacedLabel[] = [];
  if (centers[0]) out.push({ text: p1.label, center: centers[0] });
  if (centers[1]) out.push({ text: p2.label, center: centers[1] });
  return out;
}

export { angleArcPath };
