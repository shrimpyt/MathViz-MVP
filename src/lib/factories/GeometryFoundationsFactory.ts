// GeometryFoundationsFactory.ts
// Topic 1: Tools of Geometry (TEKS G.1(A), G.2(B), G.4(D), G.5(C)).
//
// Lesson ch1-1: the registry entry is "1-1: Nets and Drawings" AND Topic 1's
// only lesson slot, so the generator carries both halves of the chapter's
// foundation: (a) nets / orthographic drawings of solids, and (b) the
// points-lines-planes language the whole course is built on, undefined
// terms, collinear/coplanar, intersections, stated with correct postulate
// language. The chapter-test pool adds measuring segments/angles, angle
// pairs, and basic constructions (the registry's ch1-test description:
// "Points, lines, planes, segments, and basic constructions").
//
// Pure + seeded. Every step carries its reason.

import type { RNG } from "../math-utils";
import { randInt, pick } from "../math-utils";
import type { GeometryProblem } from "./GeometryTypes";
import {
  M, step, sampleFromPool, signedTerm,
  type Difficulty, type MakerEntry,
} from "./GeometryHelpers";

// ── Shared sketch: plane P, line l through A, B, C, point D off the line ─────

function planeSketch() {
  return {
    kind: "SketchFigure" as const,
    planeLabel: "P",
    points: [
      { label: "A", x: 55, y: 128 },
      { label: "B", x: 100, y: 117 },
      { label: "C", x: 148, y: 105 },
      { label: "D", x: 118, y: 152 },
    ],
    lines: [{ x1: 38, y1: 133, x2: 172, y2: 99, label: "l" }],
  };
}

const SOLID_NAMES: Record<string, string> = {
  cube: "Cube",
  rectPrism: "Rectangular prism",
  triPrism: "Triangular prism",
  sqPyramid: "Square pyramid",
  cylinder: "Cylinder",
};

// Faces / edges / vertices a teacher expects (cylinder: 2 circular bases +
// 1 curved lateral surface = 3 faces, 2 edges, 0 vertices).
const SOLID_COUNTS: Record<string, { faces: number; edges: number; vertices: number }> = {
  cube: { faces: 6, edges: 12, vertices: 8 },
  rectPrism: { faces: 6, edges: 12, vertices: 8 },
  triPrism: { faces: 5, edges: 9, vertices: 6 },
  sqPyramid: { faces: 5, edges: 8, vertices: 5 },
  cylinder: { faces: 3, edges: 2, vertices: 0 },
};

// ── Lesson makers ─────────────────────────────────────────────────────────────

function makeNetToSolid(rng: RNG): GeometryProblem {
  const solid = pick(rng, ["cube", "rectPrism", "triPrism", "sqPyramid", "cylinder"] as const);
  const name = SOLID_NAMES[solid];
  return {
    type: "GEO.1",
    subtype: "NetToSolid",
    prompt: "The diagram shows a flat net. Which solid does the net fold into?",
    given: { diagram: "net" },
    find: "the solid formed by the net",
    answer: name,
    steps: [
      step("Count the faces in the net and note their shapes.", "A net is a two-dimensional pattern that folds into a three-dimensional solid."),
      step(`The faces fold so that matching edges meet, forming a closed solid.`, "Folding a net joins congruent edges."),
      step(`The solid is a ${name.toLowerCase()}.`, "Identify the solid from its faces.", [{ label: "solid", answer: name }]),
    ],
    svgParams: { kind: "NetFigure", solid },
    verify: { kind: "oneOf", options: [name] },
  };
}

function makeNetCount(rng: RNG): GeometryProblem {
  const solid = pick(rng, ["cube", "rectPrism", "triPrism", "sqPyramid", "cylinder"] as const);
  const name = SOLID_NAMES[solid];
  const counts = SOLID_COUNTS[solid];
  const ask = pick(rng, ["faces", "edges", "vertices"] as const);
  const value = counts[ask];
  return {
    type: "GEO.1",
    subtype: "NetCount",
    prompt: `The diagram shows the net of a ${name.toLowerCase()}. How many ${ask} does the solid have?`,
    given: { solid: name },
    find: `number of ${ask}`,
    answer: String(value),
    steps: [
      step(`Fold the net mentally: the solid is a ${name.toLowerCase()}.`, "A net folds into exactly one solid."),
      step(
        solid === "cylinder"
          ? "A cylinder has 2 circular bases and 1 curved lateral surface, with 2 edges (the circles) and no vertices."
          : `Count on the folded solid: it has ${counts.faces} faces, ${counts.edges} edges, and ${counts.vertices} vertices.`,
        "Faces, edges, and vertices are counted on the solid, not on the flat net."
      ),
      step(`The number of ${ask} is ${value}.`, "Count of faces/edges/vertices.", [{ label: ask, answer: String(value) }]),
    ],
    svgParams: { kind: "NetFigure", solid },
    verify: { kind: "netCount", solid, ask },
  };
}

function makeNamePlane(rng: RNG): GeometryProblem {
  void rng;
  return {
    type: "GEO.1",
    subtype: "NamePlane",
    prompt:
      "In the diagram, points A, B, and C lie on line l, point D is in plane P but not on line l. Give another name for plane P using three points from the diagram.",
    given: { plane: "P" },
    find: "another name for plane P",
    answer: "plane ABD",
    steps: [
      step("A plane can be named by any three noncollinear points in it.", "Through any three noncollinear points there is exactly one plane."),
      step("A, B, and C are collinear, so they cannot be used together to name the plane.", "Collinear points lie on the same line, so they do not determine a unique plane."),
      step("A, B, and D are noncollinear and all lie in plane P.", "Definition of coplanar points."),
      step("Another name is plane ABD.", "Naming a plane.", [{ label: "name", answer: "plane ABD" }]),
    ],
    svgParams: planeSketch(),
    verify: { kind: "oneOf", options: ["plane ABD", "plane ACD", "plane BCD", "plane BAD", "plane ADB", "plane CAD", "plane CBD"] },
  };
}

function makeCollinearCoplanar(rng: RNG): GeometryProblem {
  const q = pick(rng, [
    { text: "Are points A, B, and D collinear?", expected: "No", why: "D is not on line l, so no single line contains all three points." },
    { text: "Are points A, B, and C coplanar?", expected: "Yes", why: "All three points lie in plane P." },
    { text: "Are points A, C, and D collinear?", expected: "No", why: "D is not on the line through A and C." },
    { text: "Are points B, C, and D coplanar?", expected: "Yes", why: "Any three points are coplanar, and all three lie in plane P." },
  ] as const);
  return {
    type: "GEO.1",
    subtype: "CollinearCoplanar",
    prompt: `In the diagram, points A, B, and C lie on line l in plane P, and point D is in plane P but not on line l. ${q.text} Answer Yes or No.`,
    given: { figure: "points A, B, C on line l; D in plane P, not on l" },
    find: "yes or no, with the diagram as evidence",
    answer: q.expected,
    steps: [
      step("Points on the same line are collinear; points in the same plane are coplanar.", "Definitions of collinear and coplanar points."),
      step(q.why, "Read the positions from the diagram."),
      step(`Answer: ${q.expected}.`, "Apply the definitions.", [{ label: "answer", answer: q.expected }]),
    ],
    svgParams: planeSketch(),
    verify: { kind: "oneOf", options: [q.expected] },
  };
}

function makeIntersection(rng: RNG): GeometryProblem {
  const q = pick(rng, [
    {
      text: "What is the intersection of line l and plane P?",
      answer: "line l (the whole line lies in the plane)",
      short: "line l",
      why: "Every point of line l is in plane P, so the intersection is the line itself.",
      reason: "If a line lies in a plane, their intersection is the line.",
    },
    {
      text: "Line m passes through point D and crosses plane P only at D. What is the intersection of line m and plane P?",
      answer: "point D",
      short: "point D",
      why: "The only point the line and the plane have in common is D.",
      reason: "A line not lying in a plane meets the plane in exactly one point.",
    },
    {
      text: "Plane Q is a second plane that contains line l. What is the intersection of plane P and plane Q?",
      answer: "line l",
      short: "line l",
      why: "The two planes share exactly the points of line l.",
      reason: "If two planes intersect, then their intersection is a line.",
    },
  ] as const);
  return {
    type: "GEO.1",
    subtype: "Intersection",
    prompt: `In the diagram, line l lies in plane P and point D is in plane P. ${q.text}`,
    given: { figure: "line l in plane P, point D in plane P" },
    find: "the intersection",
    answer: q.answer,
    steps: [
      step("The intersection of two figures is the set of points they have in common.", "Definition of intersection."),
      step(q.why, q.reason),
      step(`The intersection is ${q.answer}.`, q.reason, [{ label: "intersection", answer: q.short }]),
    ],
    svgParams: planeSketch(),
    verify: { kind: "oneOf", options: [q.answer, q.short] },
  };
}

const POSTULATES = [
  {
    id: "twoPointsLine",
    scenario: "A surveyor marks two points A and B and stretches a string tightly between them. The string follows the one and only straight path through A and B.",
    ask: "Which postulate guarantees that there is exactly one line through points A and B?",
    answer: "Through any two points there is exactly one line.",
  },
  {
    id: "threePointsPlane",
    scenario: "A three-legged stool never wobbles, because its feet always rest in a single flat surface, while a four-legged chair can rock.",
    ask: "Which postulate explains why three noncollinear points determine a single plane?",
    answer: "Through any three noncollinear points there is exactly one plane.",
  },
  {
    id: "lineInPlane",
    scenario: "Points A and B both lie in plane P. Every point of the line through A and B also lies in plane P.",
    ask: "Which postulate states that if two points lie in a plane, then the line containing them lies in the plane?",
    answer: "If two points lie in a plane, then the line containing them lies in the plane.",
  },
  {
    id: "twoLinesIntersect",
    scenario: "Two straight railroad tracks cross at a grade crossing. They share the crossing location and no other point.",
    ask: "Which postulate states that if two lines intersect, then their intersection is exactly one point?",
    answer: "If two lines intersect, then their intersection is exactly one point.",
  },
] as const;

function makePostulateIdentify(rng: RNG): GeometryProblem {
  const p = pick(rng, POSTULATES);
  return {
    type: "GEO.1",
    subtype: "PostulateIdentify",
    prompt: `${p.scenario} ${p.ask}`,
    given: { scenario: p.id },
    find: "the postulate",
    answer: p.answer,
    steps: [
      step("A postulate is a statement accepted as true without proof; it is the justification for the conclusion.", "Definition of postulate."),
      step("Match the situation to the statement about points, lines, and planes it illustrates.", "Postulates about points, lines, and planes."),
      step(`The postulate is: ${p.answer}`, "Postulate.", [{ label: "postulate", answer: p.answer }]),
    ],
    verify: { kind: "oneOf", options: [p.answer] },
  };
}

function makeOrthographic(rng: RNG): GeometryProblem {
  const form = pick(rng, ["prism", "cylinder"] as const);
  if (form === "prism") {
    const l = randInt(rng, 4, 12);
    const w = randInt(rng, 3, 9);
    const h = randInt(rng, 2, 8);
    const view = pick(rng, [
      { name: "front", a: l, b: h },
      { name: "top", a: l, b: w },
      { name: "right side", a: w, b: h },
    ] as const);
    const answer = `Rectangle, ${view.a} by ${view.b}`;
    return {
      type: "GEO.1",
      subtype: "OrthographicView",
      prompt: `A rectangular prism is ${l} units long, ${w} units wide, and ${h} units high. In an orthographic drawing, what shape is the ${view.name} view, and what are its dimensions?`,
      given: { length: l, width: w, height: h },
      find: `${view.name} view`,
      answer,
      steps: [
        step("An orthographic drawing shows a solid from directly in front, above, or the side, so only two of the three dimensions appear.", "Definition of orthographic drawing."),
        step(`The ${view.name} view shows the dimensions ${view.a} and ${view.b}.`, "Project the solid onto the viewing plane."),
        step(`The ${view.name} view is a rectangle, ${view.a} by ${view.b}.`, "Orthographic view of a prism face.", [{ label: "view", answer }]),
      ],
      svgParams: { kind: "SolidFigure", solid: "rectPrism", dims: { l: String(l), w: String(w), h: String(h) } },
      verify: { kind: "orthoRect", view: view.name, l, w, h },
    };
  }
  const r = randInt(rng, 2, 7);
  const h = randInt(rng, 4, 12);
  const view = pick(rng, ["top", "front"] as const);
  const answer = view === "top" ? `Circle, radius ${r}` : `Rectangle, ${2 * r} by ${h}`;
  return {
    type: "GEO.1",
    subtype: "OrthographicView",
    prompt: `A cylinder has radius ${r} units and height ${h} units. In an orthographic drawing, what shape is the ${view} view, and what is its key dimension?`,
    given: { radius: r, height: h },
    find: `${view} view`,
    answer,
    steps: [
      step("An orthographic drawing shows a solid from directly in front, above, or the side.", "Definition of orthographic drawing."),
      step(
        view === "top"
          ? "Looking straight down, the circular base is seen face-on."
          : `From the front, the curved surface projects to a rectangle whose width is the diameter ${2 * r}.`,
        "Project the solid onto the viewing plane."
      ),
      step(`The ${view} view is: ${answer}.`, "Orthographic view of a cylinder.", [{ label: "view", answer }]),
    ],
    svgParams: { kind: "SolidFigure", solid: "cylinder", dims: { r: String(r), h: String(h) } },
    verify: { kind: "orthoCyl", view, r, h },
  };
}

// ── Chapter-test makers ───────────────────────────────────────────────────────

function makeSegmentAddition(rng: RNG, difficulty: Difficulty): GeometryProblem {
  if (difficulty >= 2 && rng() < 0.6) {
    // Algebraic: AB = px + q, BC = r (number), AC = T.
    const p = randInt(rng, 2, 4);
    const x = randInt(rng, 3, 9);
    const q = randInt(rng, 0, 6);
    const bc = randInt(rng, 4, 12);
    const ab = p * x + q;
    const ac = ab + bc;
    return {
      type: "GEO.1",
      subtype: "SegmentAddition",
      prompt: `Point B is between A and C on segment AC. AB = ${p}x ${signedTerm(q)}, BC = ${bc}, and AC = ${ac}. Find x and AB.`,
      given: { AB: `${p}x ${signedTerm(q)}`, BC: bc, AC: ac },
      find: "x and AB",
      answer: `x = ${x}, AB = ${ab}`,
      steps: [
        step("Because B is between A and C, the two parts make the whole segment.", "Segment Addition Postulate.", [
          { label: "AB + BC", answer: "AC" },
        ]),
        step(`Substitute: (${p}x ${signedTerm(q)}) + ${bc} = ${ac}.`, "Substitution.", [
          { label: "equation", answer: `${p}x ${signedTerm(q + bc)} = ${ac}` },
        ]),
        step(`Solve: ${p}x = ${ac - q - bc}, so x = ${x}.`, "Subtraction and Division Properties of Equality.", [
          { label: "x", answer: String(x) },
        ]),
        step(`AB = ${p}(${x}) ${signedTerm(q)} = ${ab}.`, "Substitution.", [{ label: "AB", answer: String(ab) }]),
      ],
      verify: { kind: "segAddAlg", p, q, bc, ac },
    };
  }
  const ab = randInt(rng, 3, 15);
  const bc = randInt(rng, 3, 15);
  const ac = ab + bc;
  const askWhole = rng() < 0.5;
  if (askWhole) {
    return {
      type: "GEO.1",
      subtype: "SegmentAddition",
      prompt: `Point B is between A and C. AB = ${ab} and BC = ${bc}. Find AC.`,
      given: { AB: ab, BC: bc },
      find: "AC",
      answer: String(ac),
      unit: "units",
      steps: [
        step("The parts of a segment add to the whole segment.", "Segment Addition Postulate."),
        step(`AC = AB + BC = ${ab} + ${bc}.`, "Substitution.", [{ label: "AC", answer: `${ab} + ${bc}` }]),
        step(`AC = ${ac}.`, "Addition.", [{ label: "AC", answer: String(ac) }]),
      ],
      verify: { kind: "segAdd", ab, bc, ask: "whole" },
    };
  }
  return {
    type: "GEO.1",
    subtype: "SegmentAddition",
    prompt: `Point B is between A and C. AC = ${ac} and AB = ${ab}. Find BC.`,
    given: { AC: ac, AB: ab },
    find: "BC",
    answer: String(bc),
    unit: "units",
    steps: [
      step("The parts of a segment add to the whole segment.", "Segment Addition Postulate."),
      step(`AB + BC = AC, so ${ab} + BC = ${ac}.`, "Substitution.", [{ label: "equation", answer: `${ab} + BC = ${ac}` }]),
      step(`BC = ${ac} − ${ab} = ${bc}.`, "Subtraction Property of Equality.", [{ label: "BC", answer: String(bc) }]),
    ],
    verify: { kind: "segAdd", ab, bc, ask: "part" },
  };
}

function makeNumberLine(rng: RNG): GeometryProblem {
  const a = randInt(rng, -9, 2);
  const gap = randInt(rng, 2, 7) * 2; // even gap → integer midpoint
  const b = a + gap;
  const ask = pick(rng, ["distance", "midpoint"] as const);
  const mid = (a + b) / 2;
  return {
    type: "GEO.1",
    subtype: "NumberLineMeasure",
    prompt:
      ask === "distance"
        ? `Points P and Q are on a number line with coordinates ${a} and ${b}. Find PQ, the distance between them.`
        : `Points P and Q are on a number line with coordinates ${a} and ${b}. Find the coordinate of the midpoint of segment PQ.`,
    given: { P: a, Q: b },
    find: ask === "distance" ? "PQ" : "midpoint coordinate",
    answer: ask === "distance" ? String(gap) : String(mid),
    steps:
      ask === "distance"
        ? [
            step("Distance on a number line is the absolute value of the difference of the coordinates.", "Ruler Postulate (distance)."),
            step(`PQ = |${b} − (${a})| = |${gap}|.`, "Substitution.", [{ label: "difference", answer: String(gap) }]),
            step(`PQ = ${gap}.`, "Absolute value.", [{ label: "PQ", answer: String(gap) }]),
          ]
        : [
            step("The midpoint's coordinate is the average of the two endpoint coordinates.", "Midpoint Formula (one dimension)."),
            step(`M = (${a} + ${b}) / 2 = ${a + b} / 2.`, "Substitution.", [{ label: "sum", answer: String(a + b) }]),
            step(`M = ${mid}.`, "Division.", [{ label: "M", answer: String(mid) }]),
          ],
    verify: { kind: "numLine", a, b, ask },
  };
}

function makeAngleAddition(rng: RNG): GeometryProblem {
  const part1 = randInt(rng, 15, 65);
  const part2 = randInt(rng, 15, 65);
  const whole = part1 + part2;
  const askPart = rng() < 0.5;
  return {
    type: "GEO.1",
    subtype: "AngleAddition",
    prompt: askPart
      ? `Ray BD is in the interior of ∠ABC. m∠ABC = ${whole}° and m∠ABD = ${part1}°. Find m∠DBC.`
      : `Ray BD is in the interior of ∠ABC. m∠ABD = ${part1}° and m∠DBC = ${part2}°. Find m∠ABC.`,
    given: askPart ? { ABC: whole, ABD: part1 } : { ABD: part1, DBC: part2 },
    find: askPart ? "m∠DBC" : "m∠ABC",
    answer: askPart ? `${part2}°` : `${whole}°`,
    steps: [
      step("The measures of the two adjacent angles add to the measure of the whole angle.", "Angle Addition Postulate."),
      step(
        askPart ? `m∠ABD + m∠DBC = m∠ABC, so ${part1}° + m∠DBC = ${whole}°.` : `m∠ABC = ${part1}° + ${part2}°.`,
        "Substitution."
      ),
      step(askPart ? `m∠DBC = ${whole}° − ${part1}° = ${part2}°.` : `m∠ABC = ${whole}°.`, askPart ? "Subtraction Property of Equality." : "Addition.", [
        { label: "answer", answer: askPart ? `${part2}°` : `${whole}°` },
      ]),
    ],
    verify: { kind: "angleAdd", part1, part2, askPart },
  };
}

function makeCompSupp(rng: RNG): GeometryProblem {
  const mode = pick(rng, ["complementary", "supplementary"] as const);
  const target = mode === "complementary" ? 90 : 180;
  const m = mode === "complementary" ? randInt(rng, 15, 75) : randInt(rng, 100, 165);
  const other = target - m;
  return {
    type: "GEO.1",
    subtype: "CompSuppAngles",
    prompt: `∠A and ∠B are ${mode}. m∠A = ${m}°. Find m∠B.`,
    given: { A: m, relationship: mode },
    find: "m∠B",
    answer: `${other}°`,
    steps: [
      step(
        mode === "complementary"
          ? "Complementary angles have measures that sum to 90°."
          : "Supplementary angles have measures that sum to 180°.",
        mode === "complementary" ? "Definition of complementary angles." : "Definition of supplementary angles."
      ),
      step(`m∠A + m∠B = ${target}°, so ${m}° + m∠B = ${target}°.`, "Substitution."),
      step(`m∠B = ${target}° − ${m}° = ${other}°.`, "Subtraction Property of Equality.", [{ label: "m∠B", answer: `${other}°` }]),
    ],
    svgParams: {
      kind: "AngleFigure",
      form: mode === "complementary" ? "complementary" : "supplementary",
      labels: [`${m}°`, "?"],
    },
    verify: { kind: "compSupp", m, mode },
  };
}

function makeVerticalLinear(rng: RNG): GeometryProblem {
  const a = randInt(rng, 25, 155);
  const vertical = rng() < 0.5;
  const ans = vertical ? a : 180 - a;
  return {
    type: "GEO.1",
    subtype: "VerticalLinearPair",
    prompt: vertical
      ? `Two lines intersect, forming vertical angles ∠1 and ∠3. m∠1 = ${a}°. Find m∠3.`
      : `Two lines intersect. ∠1 and ∠2 form a linear pair, and m∠1 = ${a}°. Find m∠2.`,
    given: { angle1: a },
    find: vertical ? "m∠3" : "m∠2",
    answer: `${ans}°`,
    steps: [
      step(
        vertical
          ? "Vertical angles, the opposite angles formed by two intersecting lines, are congruent."
          : "A linear pair is supplementary: the two angles form a straight line.",
        vertical ? "Vertical Angles Theorem." : "Linear Pair Postulate (supplementary angles)."
      ),
      step(
        vertical ? `m∠3 = m∠1 = ${a}°.` : `m∠1 + m∠2 = 180°, so m∠2 = 180° − ${a}° = ${ans}°.`,
        vertical ? "Congruent angles have equal measures." : "Subtraction Property of Equality.",
        [{ label: "answer", answer: `${ans}°` }]
      ),
    ],
    svgParams: { kind: "AngleFigure", form: "vertical", labels: [`${a}°`, null, "?", null] },
    verify: { kind: "verticalLinear", a, vertical },
  };
}

function makeAngleBisectorSolve(rng: RNG): GeometryProblem {
  const half = randInt(rng, 12, 40);
  const whole = half * 2;
  const askWhole = rng() < 0.5;
  return {
    type: "GEO.1",
    subtype: "AngleBisector",
    prompt: askWhole
      ? `Ray BD bisects ∠ABC. m∠ABD = ${half}°. Find m∠ABC.`
      : `Ray BD bisects ∠ABC. m∠ABC = ${whole}°. Find m∠DBC.`,
    given: askWhole ? { ABD: half } : { ABC: whole },
    find: askWhole ? "m∠ABC" : "m∠DBC",
    answer: askWhole ? `${whole}°` : `${half}°`,
    steps: [
      step("An angle bisector divides an angle into two congruent angles.", "Definition of angle bisector."),
      step(
        askWhole
          ? `m∠ABC = 2 × m∠ABD = 2 × ${half}°.`
          : `m∠DBC = ½ × m∠ABC = ½ × ${whole}°.`,
        "The two halves are equal, so the whole is twice a half."
      ),
      step(askWhole ? `m∠ABC = ${whole}°.` : `m∠DBC = ${half}°.`, "Multiplication/Division.", [
        { label: "answer", answer: askWhole ? `${whole}°` : `${half}°` },
      ]),
    ],
    svgParams: { kind: "AngleFigure", form: "bisector", labels: askWhole ? [`${half}°`, `${half}°`] : ["?", "?"] },
    verify: { kind: "bisector", half, askWhole },
  };
}

const CONSTRUCTIONS = [
  {
    id: "copySegment",
    desc: "A compass is opened to the length of segment AB, and that same opening is used to mark off a congruent segment on a new line.",
    answer: "Copying a segment (constructing a congruent segment)",
  },
  {
    id: "perpBisector",
    desc: "Arcs are drawn from both endpoints of a segment with the same compass opening, above and below the segment. A line is drawn through the two arc intersections.",
    answer: "Perpendicular bisector construction",
  },
  {
    id: "angleBisector",
    desc: "An arc centered at the vertex cuts both sides of an angle. From those two points, equal arcs are drawn inside the angle, and a ray is drawn from the vertex through their intersection.",
    answer: "Angle bisector construction",
  },
  {
    id: "copyAngle",
    desc: "An arc centered at the vertex of an angle cuts both sides. The same arc is drawn at a new vertex, the distance between the two cut points is measured with the compass and transferred, and a ray is drawn.",
    answer: "Copying an angle (constructing a congruent angle)",
  },
  {
    id: "parallelThroughPoint",
    desc: "A transversal is drawn through a point not on a given line, an angle on the line is copied at the point, and the new line is drawn through the point.",
    answer: "Parallel line through a point construction",
  },
] as const;

function makeConstructionIdentify(rng: RNG): GeometryProblem {
  const c = pick(rng, CONSTRUCTIONS);
  return {
    type: "GEO.1",
    subtype: "ConstructionIdentify",
    prompt: `A student performs a construction with a compass and straightedge: ${c.desc} Which construction is this?`,
    given: { description: c.id },
    find: "the construction",
    answer: c.answer,
    steps: [
      step("Identify the key marks: equal compass openings create congruent distances, and intersecting arcs locate special points.", "Compass-and-straightedge construction principles."),
      step("Match the described marks to the construction they produce.", "Basic constructions."),
      step(`This is the construction: ${c.answer}.`, "Basic constructions.", [{ label: "construction", answer: c.answer }]),
    ],
    verify: { kind: "oneOf", options: [c.answer] },
  };
}

// ── Pools + public generators ─────────────────────────────────────────────────

export const FOUNDATIONS_LESSON_POOL: MakerEntry[] = [
  M("NetToSolid", 1, (rng) => makeNetToSolid(rng)),
  M("NetCount", 1, (rng) => makeNetCount(rng)),
  M("NamePlane", 1, (rng) => makeNamePlane(rng)),
  M("CollinearCoplanar", 1, (rng) => makeCollinearCoplanar(rng)),
  M("OrthographicView", 2, (rng) => makeOrthographic(rng)),
  M("Intersection", 2, (rng) => makeIntersection(rng)),
  M("PostulateIdentify", 3, (rng) => makePostulateIdentify(rng)),
];

/** Extra makers that appear only on the chapter test (measuring + constructions). */
export const FOUNDATIONS_TEST_POOL: MakerEntry[] = [
  M("SegmentAddition", 1, (rng, d) => makeSegmentAddition(rng, d)),
  M("NumberLineMeasure", 1, (rng) => makeNumberLine(rng)),
  M("AngleAddition", 1, (rng) => makeAngleAddition(rng)),
  M("CompSuppAngles", 1, (rng) => makeCompSupp(rng)),
  M("VerticalLinearPair", 2, (rng) => makeVerticalLinear(rng)),
  M("AngleBisector", 2, (rng) => makeAngleBisectorSolve(rng)),
  M("ConstructionIdentify", 3, (rng) => makeConstructionIdentify(rng)),
];

export function generateFoundationsProblems(
  rng: RNG,
  n: number,
  difficulty: Difficulty,
  only?: readonly string[]
): GeometryProblem[] {
  const pool = only ? FOUNDATIONS_LESSON_POOL.filter((e) => only.includes(e.subtype)) : FOUNDATIONS_LESSON_POOL;
  return sampleFromPool(rng, pool, n, difficulty);
}
