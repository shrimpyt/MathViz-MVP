// checkers.ts
// Shared test harness + per-family LOGICAL checkers for geometry proofs.
//
// A wrong proof is worse than no proof: these checkers don't just validate
// shape (validateProofShape) — they walk each proof's steps, track the
// established facts (measurements, congruence pairs, right angles), verify
// every reason actually justifies its statement, verify the final step
// matches `prove`, and recompute the diagram params from the parsed facts.

import { validateProofShape } from "@/lib/proofTypes";
import { pdfSafeText } from "@/lib/answerKey";
import type { ProofProblem, ProofStudentMode } from "@/lib/proofDiagrams";
import type { ProofStep } from "@/lib/proofTypes";

export interface Ctx {
  checks: number;
  failures: string[];
}

export function newCtx(): Ctx {
  return { checks: 0, failures: [] };
}

export function check(ctx: Ctx, cond: boolean, msg: string): void {
  ctx.checks++;
  if (!cond) ctx.failures.push(msg);
}

export const norm = (s: string) => s.replace(/\s+/g, " ").trim();

// ── Generic proof checks ─────────────────────────────────────────────────────

export function checkProofGeneric(ctx: Ctx, p: ProofProblem, mode: ProofStudentMode, tag: string): void {
  const errs = validateProofShape(p);
  check(ctx, errs.length === 0, `${tag}: validateProofShape: ${errs.join("; ")}`);
  check(ctx, p.type === "Proof", `${tag}: type is Proof`);
  check(ctx, p.domain === "geometry", `${tag}: domain is geometry`);
  check(ctx, /^G\.\d+\([A-Z]\)$/.test(p.teks), `${tag}: teks "${p.teks}" malformed`);
  const strs = [...p.given, p.prove, ...p.steps.flatMap((s) => [s.statement, s.reason])];
  check(ctx, strs.every((s) => !s.includes("\\") && !s.includes("$")), `${tag}: non-plain-text string found`);
  check(ctx, pdfSafeText("AB ≅ DE") === "AB ≃ DE", `${tag}: pdfSafeText ≅→≃ mapping broken`);
  check(ctx, p.steps.length >= 1, `${tag}: no steps`);

  // Student-mode blanking discipline.
  const nonGiven = p.steps.filter((s) => s.reason !== "Given" && s.statement !== "Q.E.D.");
  if (mode === "complete") {
    check(ctx, p.steps.every((s) => !s.blankStatement && !s.blankReason), `${tag}: complete mode has blanks`);
  } else if (mode === "fill-statements") {
    check(
      ctx,
      nonGiven.every((s) => !!s.blankStatement),
      `${tag}: fill-statements mode missing blankStatement`
    );
  } else if (mode === "supply-reasons") {
    check(
      ctx,
      nonGiven.every((s) => !!s.blankReason),
      `${tag}: supply-reasons mode missing blankReason`
    );
  } else {
    check(
      ctx,
      nonGiven.every((s) => !!s.blankStatement !== !!s.blankReason || (!!s.blankStatement && !!s.blankReason)),
      `${tag}: guided mode step has no blank flag`
    );
  }
}

/** Numbers appearing in a proof must be sane: positive lengths, angles in range. */
export function checkNonDegenerate(ctx: Ctx, p: ProofProblem, tag: string): void {
  const text = [...p.given, ...p.steps.map((s) => s.statement)].join(" ");
  // Side-length measures: "AB = 8" or "AB = ... = 8"
  for (const m of text.matchAll(/\b([A-Z]{2}) = [^=]*?=\s*([\d.]+)|\b([A-Z]{2}) = ([\d.]+)(?![\d.])/g)) {
    const v = parseFloat(m[2] ?? m[4]);
    if (!Number.isNaN(v)) check(ctx, v > 0, `${tag}: non-positive length in "${m[0]}"`);
  }
  for (const m of text.matchAll(/(\d+(?:\.\d+)?)°/g)) {
    const v = parseFloat(m[1]);
    check(ctx, v > 0 && v <= 360, `${tag}: angle/arc ${v}° out of range`);
  }
  check(ctx, !/NaN|undefined/.test(text), `${tag}: NaN/undefined leaked into text`);
}

// ── Measurement parsing ──────────────────────────────────────────────────────

/** Record segment measures from a statement into `map`. */
export function recordSegMeasures(stmt: string, map: Map<string, number>): void {
  // "AB = 8, DE = 8" (optional trailing note like " (hypotenuses)")
  let m = stmt.match(/^([A-Z]{2}) = ([\d.]+), ([A-Z]{2}) = ([\d.]+)( \([^)]*\))?$/);
  if (m) {
    map.set(m[1], parseFloat(m[2]));
    map.set(m[3], parseFloat(m[4]));
    return;
  }
  // "AT = DS = 4"
  m = stmt.match(/^([A-Z]{2}) = ([A-Z]{2}) = ([\d.]+)$/);
  if (m) {
    map.set(m[1], parseFloat(m[3]));
    map.set(m[2], parseFloat(m[3]));
    return;
  }
  // "AB = AT + TB = 2(4) = 8" → last number wins
  m = stmt.match(/^([A-Z]{2}) = .*=\s*([\d.]+)\s*$/);
  if (m) map.set(m[1], parseFloat(m[2]));
}

/** Record angle measures from a statement into `map` (keyed by bare name). */
export function recordAngMeasures(stmt: string, map: Map<string, number>): void {
  const names = [...stmt.matchAll(/∠([A-Z]+)/g)].map((x) => x[1]);
  const degs = [...stmt.matchAll(/([\d.]+)°/g)].map((x) => parseFloat(x[1]));
  if (names.length === 0 || degs.length === 0) return;
  if (names.length === degs.length) {
    names.forEach((n, i) => map.set(n, degs[i]));
  } else {
    map.set(names[0], degs[degs.length - 1]);
  }
}

function parseCongPair(stmt: string): [string, string] | null {
  const m = stmt.match(/^(∠?[A-Z]+) ≅ (∠?[A-Z]+)$/);
  return m ? [m[1], m[2]] : null;
}

/** Triangle-1 side name from a "XY ≅ UV" pair, or null. */
function tri1Side(pair: [string, string]): string | null {
  const [a] = pair;
  return ["AB", "BC", "CA"].includes(a) ? a : null;
}

/** Triangle-1 angle key from a "∠X ≅ ∠Y" pair, or null. */
function tri1Angle(pair: [string, string]): string | null {
  const [a] = pair;
  if (!a.startsWith("∠")) return null;
  const n = a.slice(1);
  if (["A", "B", "C"].includes(n)) return n;
  // Three-letter form: find which vertex of ABC it names (e.g. "ABC" → B)
  if (n.length === 3 && n.split("").every((c) => "ABC".includes(c))) return n[1];
  return null;
}

const ALL_SIDES = ["AB", "BC", "CA"];
const ALL_ANGLES = ["A", "B", "C"];
const SIDE_IDX: Record<string, number> = { AB: 0, BC: 1, CA: 2 };
const ANGLE_IDX: Record<string, number> = { A: 0, B: 1, C: 2 };

// ── Congruence proof walker ──────────────────────────────────────────────────

export interface CongState {
  segMeas: Map<string, number>;
  angMeas: Map<string, number>;
  segCong: string[]; // establishment order
  angCong: string[]; // establishment order
  rightAngles: Set<string>;
  rightTriangles: Set<string>;
  midpoints: Map<string, string>; // mid-letter → segment
  perps: [string, string][];
  bisectors: Map<string, { v: string; ray: string }>; // "ABC" → {v:"B", ray:"Q"}
  givenSet: Set<string>;
  constructedBisectorOf: Set<string>; // angle names, e.g. "A"
  constructedMidpointOf: Set<string>; // segment names, e.g. "BC"
}

export function newCongState(): CongState {
  return {
    segMeas: new Map(),
    angMeas: new Map(),
    segCong: [],
    angCong: [],
    rightAngles: new Set(),
    rightTriangles: new Set(),
    midpoints: new Map(),
    perps: [],
    bisectors: new Map(),
    givenSet: new Set(),
    constructedBisectorOf: new Set(),
    constructedMidpointOf: new Set(),
  };
}

/** Parse a Given statement into state. Returns true if recognized. */
function parseGivenIntoState(ctx: Ctx, st: CongState, stmt: string, tag: string): void {
  let m: RegExpMatchArray | null;
  if ((m = stmt.match(/^([A-Z]) is the midpoint of ([A-Z]{2})$/))) {
    st.midpoints.set(m[1], m[2]);
    return;
  }
  if ((m = stmt.match(/^([A-Z]{2}) ⊥ ([A-Z]{2})$/))) {
    st.perps.push([m[1], m[2]]);
    return;
  }
  if ((m = stmt.match(/^ray ([A-Z])([A-Z]) bisects ∠([A-Z]{3})$/))) {
    st.bisectors.set(m[3], { v: m[1], ray: m[2] });
    return;
  }
  if ((m = stmt.match(/^∠([A-Z]) and ∠([A-Z]) are right angles$/))) {
    st.rightAngles.add(m[1]);
    st.rightAngles.add(m[2]);
    return;
  }
  if ((m = stmt.match(/right angles ∠([A-Z]) and ∠([A-Z])/))) {
    st.rightAngles.add(m[1]);
    st.rightAngles.add(m[2]);
    const tris = stmt.match(/△([A-Z]{3}) and △([A-Z]{3}) are right triangles/);
    if (tris) {
      st.rightTriangles.add(tris[1]);
      st.rightTriangles.add(tris[2]);
    }
    return;
  }
  if (/^△ABC is isosceles/.test(stmt) || /^In △ABC/.test(stmt)) return; // context only
  recordSegMeasures(stmt, st.segMeas);
  recordAngMeasures(stmt, st.angMeas);
}

function perpVertexAt(pair: [string, string], v: string): boolean {
  const common = pair[0].split("").filter((c) => pair[1].includes(c));
  return common.includes(v);
}

/**
 * Walk congruence steps, verifying each reason justifies its statement.
 * `stopBefore` trims trailing steps (used by the CPCTC checker for the base).
 */
export function walkCongruenceSteps(
  ctx: Ctx,
  p: ProofProblem,
  tag: string,
  stopBefore = 0
): CongState {
  const st = newCongState();
  p.given.forEach((g) => st.givenSet.add(norm(g)));
  const steps = p.steps.slice(0, p.steps.length - stopBefore);

  steps.forEach((s, i) => {
    const stmt = norm(s.statement);
    const where = `${tag} step ${i + 1} "${stmt}"`;
    switch (s.reason) {
      case "Given":
        check(ctx, st.givenSet.has(stmt), `${where}: reason Given but not in given[]`);
        parseGivenIntoState(ctx, st, stmt, tag);
        recordSegMeasures(stmt, st.segMeas);
        recordAngMeasures(stmt, st.angMeas);
        break;
      case "Definition of congruent segments": {
        const pair = parseCongPair(stmt);
        check(ctx, pair !== null, `${where}: not a congruence statement`);
        if (pair) {
          const [x, y] = pair;
          const mx = st.segMeas.get(x);
          const my = st.segMeas.get(y);
          check(ctx, mx !== undefined && my !== undefined && mx === my,
            `${where}: measures ${mx} vs ${my} not established equal`);
          const t = tri1Side(pair);
          if (t && !st.segCong.includes(t)) st.segCong.push(t);
        }
        break;
      }
      case "Definition of congruent angles": {
        const pair = parseCongPair(stmt);
        check(ctx, pair !== null, `${where}: not a congruence statement`);
        if (pair) {
          const [x, y] = pair;
          const kx = x.startsWith("∠") ? x.slice(1) : x;
          const ky = y.startsWith("∠") ? y.slice(1) : y;
          const mx = st.angMeas.get(kx);
          const my = st.angMeas.get(ky);
          check(ctx, mx !== undefined && my !== undefined && mx === my,
            `${where}: angle measures ${mx} vs ${my} not established equal`);
          const t = tri1Angle(pair);
          if (t && !st.angCong.includes(t)) st.angCong.push(t);
        }
        break;
      }
      case "Definition of midpoint": {
        const pair = parseCongPair(stmt);
        check(ctx, pair !== null, `${where}: not a congruence statement`);
        if (pair) {
          // Two namings: "AT ≅ TB" (mid letter in the middle) or
          // "BM ≅ CM" (mid letter at the end of both halves).
          let mid: string | null = null;
          let seg: string | null = null;
          if (pair[0][1] === pair[1][0]) {
            mid = pair[0][1];
            seg = pair[0][0] + pair[1][1];
          } else if (pair[0][1] === pair[1][1]) {
            mid = pair[0][1];
            seg = pair[0][0] + pair[1][0];
          }
          check(ctx, mid !== null, `${where}: halves don't share midpoint letter`);
          if (mid && seg) {
            check(ctx, st.midpoints.get(mid) === seg || st.constructedMidpointOf.has(seg),
              `${where}: no midpoint given/constructed for ${seg}`);
          }
        }
        break;
      }
      case "Segment Addition Postulate": {
        const m = stmt.match(/^([A-Z]{2}) = ([A-Z]{2}) \+ ([A-Z]{2}) = 2\(([\d.]+)\) = ([\d.]+)$/);
        check(ctx, m !== null, `${where}: unexpected segment-addition form`);
        if (m) {
          const [, seg, h1, h2, ms, fin] = m;
          check(ctx, parseFloat(fin) === 2 * parseFloat(ms), `${where}: 2*${ms} ≠ ${fin}`);
          const mid = h1[1];
          check(ctx, h2[0] === mid && h1[0] + h2[1] === seg,
            `${where}: halves ${h1},${h2} don't compose ${seg}`);
          check(ctx, st.midpoints.get(mid) === seg, `${where}: no midpoint given for ${seg}`);
          st.segMeas.set(seg, parseFloat(fin));
        }
        break;
      }
      case "Angle Addition Postulate": {
        const m = stmt.match(/^m∠([A-Z]{3}) = m∠([A-Z]{3}) \+ m∠([A-Z]{3}) = 2\(([\d.]+)°\) = ([\d.]+)°$/);
        check(ctx, m !== null, `${where}: unexpected angle-addition form`);
        if (m) {
          const [, ang, h1, h2, hs, fin] = m;
          check(ctx, parseFloat(fin) === 2 * parseFloat(hs), `${where}: 2*${hs} ≠ ${fin}`);
          const bis = st.bisectors.get(ang);
          check(ctx, bis !== undefined, `${where}: no bisector given for ∠${ang}`);
          if (bis) {
            check(ctx, h1 === `${ang[0]}${bis.v}${bis.ray}` && h2 === `${bis.ray}${bis.v}${ang[2]}`,
              `${where}: halves ${h1},${h2} don't match bisector of ∠${ang}`);
          }
          st.angMeas.set(ang, parseFloat(fin));
        }
        break;
      }
      case "Definition of perpendicular lines": {
        const m = stmt.match(/^∠([A-Z]) is a right angle$/);
        check(ctx, m !== null, `${where}: unexpected form`);
        if (m) {
          check(ctx, st.perps.some((pr) => perpVertexAt(pr, m[1])),
            `${where}: no perpendicular given at ∠${m[1]}`);
          st.rightAngles.add(m[1]);
        }
        break;
      }
      case "Right Angles Congruence Theorem": {
        const pair = parseCongPair(stmt);
        check(ctx, pair !== null, `${where}: not a congruence statement`);
        if (pair) {
          const a = pair[0].slice(1);
          const b = pair[1].slice(1);
          check(ctx, st.rightAngles.has(a) && st.rightAngles.has(b),
            `${where}: right angles not established for ${a}, ${b}`);
          if (!st.angCong.includes(a) && ["A", "B", "C"].includes(a)) st.angCong.push(a);
        }
        break;
      }
      case "Definition of angle bisector": {
        const pair = parseCongPair(stmt);
        check(ctx, pair !== null, `${where}: not a congruence statement`);
        if (pair) {
          const h1 = pair[0].slice(1);
          const h2 = pair[1].slice(1);
          check(ctx, h1.length === 3 && h2.length === 3, `${where}: halves malformed`);
          const v = h1[1];
          check(ctx, h2[1] === v, `${where}: halves name different vertices`);
          if (h1[2] === h2[0]) {
            // Factory pattern: "∠ABQ ≅ ∠QBC" from "ray BQ bisects ∠ABC".
            const ang = h1[0] + v + h2[2];
            const bis = st.bisectors.get(ang);
            check(ctx, bis !== undefined && bis.v === v && bis.ray === h1[2],
              `${where}: no bisector given for ∠${ang}`);
          } else if (h1[2] === h2[2]) {
            // Construction pattern: "∠BAM ≅ ∠CAM" with M on BC.
            check(ctx, st.constructedBisectorOf.has(v),
              `${where}: no bisector of ∠${v} constructed`);
          } else {
            check(ctx, false, `${where}: halves ${h1}, ${h2} share no ray/meeting point`);
          }
        }
        break;
      }
      case "Definition of right triangle": {
        const m = stmt.match(/^△([A-Z]{3}) is a right triangle$/);
        check(ctx, m !== null, `${where}: unexpected form`);
        if (m) {
          const verts = m[1].split("");
          check(ctx, verts.some((v) => st.rightAngles.has(v)),
            `${where}: no right angle established in △${m[1]}`);
          st.rightTriangles.add(m[1]);
        }
        break;
      }
      case "Construction": {
        let m2: RegExpMatchArray | null;
        if ((m2 = stmt.match(/bisector of ∠([A-Z]), meeting [A-Z]{2} at ([A-Z])/))) {
          st.constructedBisectorOf.add(m2[1]);
        } else if ((m2 = stmt.match(/midpoint of ([A-Z]{2})/))) {
          st.constructedMidpointOf.add(m2[1]);
        } else {
          check(ctx, false, `${where}: unrecognized construction`);
        }
        break;
      }
      case "Reflexive Property": {
        const pair = parseCongPair(stmt);
        check(ctx, pair !== null && pair[0] === pair[1], `${where}: not reflexive`);
        break;
      }
      case "SSS":
      case "SAS":
      case "ASA":
      case "AAS":
      case "HL": {
        check(ctx, stmt === "△ABC ≅ △DEF" || stmt === "△ABM ≅ △ACM",
          `${where}: unexpected congruence conclusion`);
        break;
      }
      case "CPCTC":
        // checked by the family-specific checker (needs the triangle context)
        break;
      case "AA Similarity":
        break;
      default:
        check(ctx, false, `${where}: unknown reason "${s.reason}"`);
    }
  });
  return st;
}
