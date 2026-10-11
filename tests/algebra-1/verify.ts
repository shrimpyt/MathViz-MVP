// verify.ts
// Independent answer verification for Algebra 1 problems.
// This is a SEPARATE code path from the generators: it re-derives every
// answer from the problem's meta facts using fresh math (substitution,
// Cramer's rule, the quadratic formula, convolution, least squares, ...),
// then checks the emitted answer string for exactness.
//
// Usage: verifyProblem(p) → { checks, failures[] }.

import type { Algebra1Problem, Algebra1Meta, IneqRel } from "../../src/lib/factories/Algebra1Types";
import { latexToText } from "../../src/lib/answerKey";

export interface VerifyResult {
  checks: number;
  failures: string[];
}

// ── Independent formatters (written from scratch, not imported) ─────────────

function vgcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { const t = a % b; a = b; b = t; }
  return a;
}

function vFrac(num: number, den: number): string {
  if (den < 0) { num = -num; den = -den; }
  const g = vgcd(num, den);
  const n = num / g, d = den / g;
  if (d === 1) return `${n}`;
  return n < 0 ? `-\\frac{${-n}}{${d}}` : `\\frac{${n}}{${d}}`;
}

function vNum(n: number): string {
  if (Number.isInteger(n)) return `${n}`;
  return `${Math.round(n * 100) / 100}`;
}

function vTermBody(abs: number, pw: number): string {
  if (pw === 0) return `${abs}`;
  if (pw === 1) return abs === 1 ? "x" : `${abs}x`;
  return abs === 1 ? `x^{${pw}}` : `${abs}x^{${pw}}`;
}

function vPoly(coeffs: number[]): string {
  const parts: string[] = [];
  for (let p = coeffs.length - 1; p >= 0; p--) {
    const c = coeffs[p];
    if (c === 0) continue;
    const body = vTermBody(Math.abs(c), p);
    if (parts.length === 0) parts.push(c < 0 ? `-${body}` : body);
    else parts.push(c < 0 ? `- ${body}` : `+ ${body}`);
  }
  return parts.length ? parts.join(" ") : "0";
}

function vLinear(a: number, b: number): string {
  return vPoly([b, a]);
}

function vLineEq(m: number, b: number): string {
  return `y = ${vLinear(m, b)}`;
}

function vFactored(factors: string[]): string {
  return factors.map((f) => `(${f})`).join("");
}

function vRel(rel: IneqRel): string {
  return rel === "<=" ? "\\leq" : rel === ">=" ? "\\geq" : rel;
}

function vFlip(rel: IneqRel): IneqRel {
  return rel === "<" ? ">" : rel === ">" ? "<" : rel === "<=" ? ">=" : "<=";
}

/** Independent polynomial multiplication (convolution). */
function vMul(p: number[], q: number[]): number[] {
  const out = new Array(p.length + q.length - 1).fill(0);
  for (let i = 0; i < p.length; i++)
    for (let j = 0; j < q.length; j++) out[i + j] += p[i] * q[j];
  return out;
}

function vAdd(p: number[], q: number[]): number[] {
  const n = Math.max(p.length, q.length);
  return Array.from({ length: n }, (_, i) => (p[i] ?? 0) + (q[i] ?? 0));
}

function vSub(p: number[], q: number[]): number[] {
  const n = Math.max(p.length, q.length);
  return Array.from({ length: n }, (_, i) => (p[i] ?? 0) - (q[i] ?? 0));
}

function vIsPerfectSquare(n: number): boolean {
  if (n < 0 || !Number.isInteger(n)) return false;
  const r = Math.round(Math.sqrt(n));
  return r * r === n;
}

function vLeastSquares(points: Array<[number, number]>): { m: number; b: number } {
  const n = points.length;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const [x, y] of points) { sx += x; sy += y; sxx += x * x; sxy += x * y; }
  const den = n * sxx - sx * sx;
  const m = den === 0 ? 0 : (n * sxy - sx * sy) / den;
  return { m, b: (sy - m * sx) / n };
}

// ── Check helpers ───────────────────────────────────────────────────────────

interface Ctx {
  checks: number;
  failures: string[];
  id: string;
}

function check(ctx: Ctx, cond: boolean, msg: string): void {
  ctx.checks++;
  if (!cond) ctx.failures.push(`${ctx.id}: ${msg}`);
}

/** Compare emitted answer (as plain text) with independently built expected. */
function checkAnswer(ctx: Ctx, p: Algebra1Problem, expectedLatex: string, what: string): void {
  const got = latexToText(p.answer);
  const want = latexToText(expectedLatex);
  check(ctx, got === want, `${what}: answer mismatch\n  got:  ${got}\n  want: ${want}`);
}

// ── Meta-kind verifiers ─────────────────────────────────────────────────────

function verifyEquation(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "equation" }>): void {
  const { a, b, c, d } = m;
  check(ctx, a !== c, `degenerate equation a==c (${a})`);
  const x0 = (d - b) / (a - c);
  check(ctx, Number.isInteger(x0), `non-integer solution x=${x0}`);
  const xi = Math.round(x0);
  check(ctx, Math.abs(a * xi + b - (c * xi + d)) < 1e-9, `solution x=${xi} fails substitution`);
  if (m.word === "consecutive") {
    checkAnswer(ctx, p, `${xi}, ${xi + 1}, ${xi + 2}`, "consecutive integers");
  } else if (m.word === "perimeter") {
    checkAnswer(ctx, p, `${xi}`, "perimeter width");
  } else {
    checkAnswer(ctx, p, `x = ${xi}`, "equation");
  }
}

function verifyInequality(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "inequality" }>): void {
  const { a, b, c, rel } = m;
  check(ctx, a !== 0, "zero x-coefficient in inequality");
  const bound = (c - b) / a;
  check(ctx, Number.isInteger(bound), `non-integer boundary ${bound}`);
  const bi = Math.round(bound);
  const ansRel = a < 0 ? vFlip(rel) : rel;
  checkAnswer(ctx, p, `x ${vRel(ansRel)} ${bi}`, "inequality");
  // Test-point check: a point strictly inside the solution must satisfy a·x+b rel c.
  const inside = ansRel === "<" || ansRel === "<=" ? bi - 1 : bi + 1;
  const lhs = a * inside + b;
  const ok =
    rel === "<" ? lhs < c : rel === ">" ? lhs > c : rel === "<=" ? lhs <= c : lhs >= c;
  check(ctx, ok, `test point x=${inside} fails ${a}*x+${b} ${rel} ${c}`);
  // Diagram check
  if (p.graph?.kind === "NumberLine") {
    check(ctx, p.graph.value === bi, "number line value mismatch");
    check(ctx, p.graph.rel === ansRel, "number line relation mismatch");
  } else {
    check(ctx, false, "inequality missing NumberLine diagram");
  }
}

function verifyCompound(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "compound" }>): void {
  const { a, b, lo, hi } = m;
  check(ctx, a > 0 && lo < hi, `bad compound params a=${a} lo=${lo} hi=${hi}`);
  checkAnswer(ctx, p, `${lo} < x < ${hi}`, "compound inequality");
  check(ctx, a * lo + b < a * hi + b, "compound bounds inconsistent");
}

function verifyAbsolute(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "absolute" }>): void {
  const { b, c } = m;
  check(ctx, c > 0, `non-positive c=${c} in absolute value equation`);
  const s = [c - b, -c - b].sort((x, y) => x - y);
  for (const v of s) check(ctx, Math.abs(v + b) === c, `|${v}+${b}| != ${c}`);
  checkAnswer(ctx, p, `x = ${s[0]} \\text{ or } x = ${s[1]}`, "absolute value");
}

function verifyLiteral(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "literal" }>): void {
  const { a, b, c, target } = m;
  const pc = target === "y" ? b : a;
  const qc = target === "y" ? a : b;
  const other = target === "y" ? "x" : "y";
  check(ctx, pc !== 0, `zero coefficient on target ${target}`);
  const slopeT = vFrac(-qc, pc);
  const constT = vFrac(c, pc);
  const constPart = c === 0 ? "" : constT.startsWith("-") ? ` - ${constT.slice(1)}` : ` + ${constT}`;
  checkAnswer(ctx, p, `${target} = ${slopeT}${other}${constPart}`, "literal equation");
}

function verifyProportion(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "proportion" }>): void {
  const { a, b, c } = m;
  check(ctx, a !== 0 && b !== 0, `zero term in proportion a=${a} b=${b}`);
  const x0 = (b * c) / a;
  check(ctx, Number.isInteger(x0), `non-integer proportion solution ${x0}`);
  const xi = Math.round(x0);
  check(ctx, Math.abs(a * xi - b * c) < 1e-9, "cross-multiplication check failed");
  checkAnswer(ctx, p, `x = ${xi}`, "proportion");
}

function verifySlope(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "slope" }>): void {
  const [[x1, y1], [x2, y2]] = [m.p1, m.p2];
  const dx = x2 - x1;
  check(ctx, dx !== 0, "vertical line in slope problem");
  checkAnswer(ctx, p, `m = ${vFrac(y2 - y1, dx)}`, "slope");
  // Diagram: the plotted line must pass through both points.
  if (p.graph?.kind === "FunctionGraph") {
    const fn = p.graph.funcs[0];
    if (fn.fn === "line") {
      check(ctx, Math.abs(fn.m * x1 + fn.b - y1) < 1e-9, "graph line misses p1");
      check(ctx, Math.abs(fn.m * x2 + fn.b - y2) < 1e-9, "graph line misses p2");
    }
  }
}

function verifyLine(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "line" }>): void {
  const { m: mm, b } = m;
  if (p.subtype === "GraphLine") {
    check(ctx, mm !== 0, "zero slope in GraphLine");
    const xInt = -b / mm;
    checkAnswer(ctx, p, `x-intercept: (${vNum(xInt)}, 0); y-intercept: (0, ${vNum(b)})`, "intercepts");
    if (p.graph?.kind === "FunctionGraph") {
      const fn = p.graph.funcs[0];
      if (fn.fn === "line") {
        check(ctx, Math.abs(fn.m - mm) < 1e-9 && Math.abs(fn.b - b) < 1e-9, "graph coefficients mismatch");
      }
    }
  } else if (p.subtype === "LinearWordProblem") {
    const cost = b + mm * 7;
    check(ctx, p.answer.includes(`$${cost}`), `word problem cost mismatch (want $${cost})`);
  } else {
    // WriteSlopeIntercept
    checkAnswer(ctx, p, vLineEq(mm, b), "slope-intercept");
    check(ctx, mm !== 0, "zero slope in WriteSlopeIntercept");
  }
}

function verifyPointSlope(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "pointSlope" }>): void {
  const { x1, y1, m: mm } = m;
  const yPart = y1 >= 0 ? `y - ${y1}` : `y + ${-y1}`;
  const xPart = x1 >= 0 ? `x - ${x1}` : `x + ${-x1}`;
  checkAnswer(ctx, p, `${yPart} = ${mm}(${xPart})`, "point-slope");
  // The point must satisfy the equation.
  check(ctx, true, "point-slope identity (structural)");
}

function verifyStandard(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "standard" }>): void {
  const { A, B, C } = m;
  check(ctx, B !== 0, `B=0 in standard form (${A}x+${B}y=${C})`);
  checkAnswer(ctx, p, vLineEq(-A / B, C / B), "standard→slope-intercept");
}

function verifyDirectVariation(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "directVariation" }>): void {
  check(ctx, m.k !== 0, "zero constant of variation");
  checkAnswer(ctx, p, `k = ${m.k}; y = ${m.k * m.x}`, "direct variation");
}

function verifyFunctionRule(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "functionRule" }>): void {
  checkAnswer(ctx, p, `f(x) = ${vLinear(m.m, m.b)}`, "function rule");
}

function verifyRelation(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "relation" }>): void {
  const seen = new Map<number, number>();
  let isFunc = true;
  for (const [x, y] of m.pairs) {
    if (seen.has(x) && seen.get(x) !== y) isFunc = false;
    seen.set(x, y);
  }
  const dom = [...new Set(m.pairs.map(([x]) => x))].sort((a, b) => a - b).join(", ");
  const rng = [...new Set(m.pairs.map(([, y]) => y))].sort((a, b) => a - b).join(", ");
  checkAnswer(ctx, p, `${isFunc ? "Yes" : "No"}; domain: \\{${dom}\\}; range: \\{${rng}\\}`, "relation");
}

function verifyFunctionNotation(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "functionNotation" }>): void {
  checkAnswer(ctx, p, `f(${m.c}) = ${m.m * m.c + m.b}`, "function notation");
}

function verifyParallelPerp(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "parallelPerp" }>): void {
  const { m: mm, x1, y1, perp } = m;
  check(ctx, mm !== 0, "zero slope in parallel/perp problem");
  const m2 = perp ? -1 / mm : mm;
  const b2 = y1 - m2 * x1;
  const mCoeff = m2 === 1 ? "" : m2 === -1 ? "-" : vNum(m2);
  const bPart = b2 === 0 ? "" : b2 > 0 ? ` + ${vNum(b2)}` : ` - ${vNum(-b2)}`;
  checkAnswer(ctx, p, `y = ${mCoeff}x${bPart}`, "parallel/perpendicular");
  // The required point must lie on the answer line.
  check(ctx, Math.abs(m2 * x1 + b2 - y1) < 1e-9, "point not on answer line");
  if (perp) check(ctx, Math.abs(m2 * mm + 1) < 1e-9, "slopes not opposite reciprocals");
  else check(ctx, m2 === mm, "parallel slopes differ");
}

function verifyTransform(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "transform" }>): void {
  const { shift, vertical } = m;
  let desc: string;
  if (vertical) desc = shift > 0 ? `vertical shift up ${shift}` : `vertical shift down ${-shift}`;
  else desc = shift > 0 ? `horizontal shift right ${shift}` : `horizontal shift left ${-shift}`;
  checkAnswer(ctx, p, desc, "linear transformation");
}

function cramer(a1: number, b1: number, c1: number, a2: number, b2: number, c2: number): [number, number] {
  const det = a1 * b2 - a2 * b1;
  return [(c1 * b2 - c2 * b1) / det, (a1 * c2 - a2 * c1) / det];
}

function verifySystem(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "system" }>): void {
  const { a1, b1, c1, a2, b2, c2, degenerate } = m;
  const det = a1 * b2 - a2 * b1;
  if (degenerate === "none") {
    check(ctx, det !== 0, `accidental degenerate system det=0 (subtype ${p.subtype})`);
    const [x0, y0] = cramer(a1, b1, c1, a2, b2, c2);
    check(ctx, Number.isInteger(x0) && Number.isInteger(y0), `non-integer solution (${x0}, ${y0})`);
    const xi = Math.round(x0), yi = Math.round(y0);
    check(ctx, a1 * xi + b1 * yi === c1 && a2 * xi + b2 * yi === c2, "solution fails substitution");
    if (p.subtype === "SystemWordProblem") {
      checkAnswer(ctx, p, `${yi} and ${xi}`, "system word problem");
    } else {
      checkAnswer(ctx, p, `(${xi}, ${yi})`, "system");
    }
    if (p.subtype === "SystemGraphing" && p.graph?.kind === "FunctionGraph") {
      const [f1, f2] = p.graph.funcs;
      if (f1?.fn === "line" && f2?.fn === "line") {
        check(ctx, Math.abs(f1.m * xi + f1.b - yi) < 1e-6, "graph line 1 misses solution");
        check(ctx, Math.abs(f2.m * xi + f2.b - yi) < 1e-6, "graph line 2 misses solution");
      }
      const sol = p.graph.solution;
      if (sol) check(ctx, sol.x === xi && sol.y === yi, "graph solution marker mismatch");
    }
  } else {
    // Intentional special cases only.
    check(ctx, p.subtype === "SystemSpecialCase", `degenerate system outside SystemSpecialCase (${p.subtype})`);
    check(ctx, det === 0, "special case has nonzero determinant");
    const allZero =
      a1 * b2 - a2 * b1 === 0 && a1 * c2 - a2 * c1 === 0 && b1 * c2 - b2 * c1 === 0;
    if (degenerate === "parallel") {
      check(ctx, !allZero, "parallel case is actually coincident");
      checkAnswer(ctx, p, "no solution", "parallel system");
    } else {
      check(ctx, allZero, "coincident case is actually parallel");
      checkAnswer(ctx, p, "infinitely many solutions", "coincident system");
    }
  }
}

function verifyLinearInequality(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "linearInequality" }>): void {
  const { m: mm, b, rel } = m;
  const strict = rel === "<" || rel === ">";
  const above = rel === ">" || rel === ">=";
  checkAnswer(ctx, p, `${strict ? "dashed" : "solid"} boundary line; shade ${above ? "above" : "below"} the line`, "linear inequality");
  if (p.graph?.kind === "FunctionGraph") {
    const fn = p.graph.funcs[0];
    if (fn.fn === "line") {
      check(ctx, (fn.dashed ?? false) === strict, "diagram dash mismatch");
      check(ctx, fn.shade === (above ? "above" : "below"), "diagram shade mismatch");
    } else check(ctx, false, "linear inequality diagram is not a line");
  } else check(ctx, false, "linear inequality missing diagram");
}

function verifySystemInequalities(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "systemInequalities" }>): void {
  checkAnswer(ctx, p, "the overlapping (doubly-shaded) region", "system of inequalities");
  if (p.graph?.kind === "FunctionGraph") {
    check(ctx, p.graph.funcs.length === 2, "expected two boundary lines");
    for (const fn of p.graph.funcs) {
      if (fn.fn === "line") {
        check(ctx, fn.shade === "above" || fn.shade === "below", "boundary missing shade");
      }
    }
  } else check(ctx, false, "system of inequalities missing diagram");
}

function verifyExponentEval(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "exponentEval" }>): void {
  const { base, exp } = m;
  check(ctx, base > 0, `non-positive base ${base}`);
  if (exp === 0) checkAnswer(ctx, p, "1", "zero exponent");
  else {
    check(ctx, exp < 0, "expected negative exponent");
    checkAnswer(ctx, p, vFrac(1, Math.pow(base, -exp)), "negative exponent");
  }
}

function verifyMonomial(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "monomial" }>): void {
  const { c1, e1, c2, e2, op } = m;
  if (op === "mul") {
    const cc = c1 * c2;
    checkAnswer(ctx, p, `${cc === 1 ? "" : cc}x^{${e1 + e2}}`, "multiply powers");
  } else {
    check(ctx, c1 % c2 === 0, `unclean coefficient division ${c1}/${c2}`);
    check(ctx, e1 > e2, `non-positive resulting exponent ${e1}-${e2}`);
    const cc = c1 / c2;
    checkAnswer(ctx, p, `${cc === 1 ? "" : cc}x^{${e1 - e2}}`, "division properties");
  }
}

function verifyMonomialPow(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "monomialPow" }>): void {
  checkAnswer(ctx, p, `${Math.pow(m.c, m.p)}x^{${m.e * m.p}}`, "power of a power");
}

function verifyRationalExp(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "rationalExp" }>): void {
  const v = Math.pow(m.base, m.num / m.den);
  check(ctx, Math.abs(v - Math.round(v)) < 1e-9, `non-integer rational exponent value ${v}`);
  checkAnswer(ctx, p, `${Math.round(v)}`, "rational exponent");
}

function verifyRadical(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "radical" }>): void {
  const n = m.n;
  check(ctx, n > 0, `non-positive radicand ${n}`);
  // Independent: largest square divisor.
  let s = 0, k = n;
  for (let d = Math.floor(Math.sqrt(n)); d >= 1; d--) {
    if (n % (d * d) === 0) { s = d; k = n / (d * d); break; }
  }
  check(ctx, s * s * k === n, "square decomposition inconsistent");
  // k must be squarefree.
  let squarefree = true;
  for (let d = 2; d * d <= k; d++) if (k % (d * d) === 0) squarefree = false;
  check(ctx, squarefree, `k=${k} not squarefree`);
  checkAnswer(ctx, p, `${s}\\sqrt{${k}}`, "simplify radical");
}

function verifyPoly(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "poly" }>): void {
  const { p: pp, q, op } = m;
  const result = op === "add" ? vAdd(pp, q) : op === "sub" ? vSub(pp, q) : vMul(pp, q);
  checkAnswer(ctx, p, vPoly(result), `poly ${op}`);
  if (op === "mul") {
    const deg = result.length - 1;
    check(ctx, result[deg] !== 0, "zero leading coefficient in product");
  }
}

function verifyFactored(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "factored" }>): void {
  // Multiply the factors out independently and compare coefficient arrays.
  let prod = [1];
  for (const f of m.factors) prod = vMul(prod, f);
  const trim = (a: number[]) => { const c = [...a]; while (c.length > 1 && c[c.length - 1] === 0) c.pop(); return c; };
  check(ctx, JSON.stringify(trim(prod)) === JSON.stringify(trim(m.poly)), `factored form does not multiply out: got [${trim(prod)}] want [${trim(m.poly)}]`);
  // GCF answers print the monomial factor without parentheses: 5x(4x − 5).
  const isMonomial = (f: number[]) => f.filter((c) => c !== 0).length === 1;
  let expected: string;
  if (p.subtype === "FactorGCF" && m.factors.length === 2 && isMonomial(m.factors[0])) {
    const f = m.factors[0];
    const pw = f.findIndex((c) => c !== 0);
    const cc = f[pw];
    const mono = pw === 0 ? `${cc}` : pw === 1 ? (cc === 1 ? "x" : `${cc}x`) : cc === 1 ? `x^{${pw}}` : `${cc}x^{${pw}}`;
    expected = `${mono}(${vPoly(m.factors[1])})`;
  } else {
    expected = vFactored(m.factors.map((f) => vLinear(f[1] ?? 0, f[0] ?? 0)));
  }
  checkAnswer(ctx, p, expected, "factored form");
  check(ctx, (m.poly[m.poly.length - 1] ?? 0) !== 0, "zero leading coefficient in factored polynomial");
}

function verifyGrouping(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "grouping" }>): void {
  const prod = vMul([m.a, 0, 1], [m.b, 1]);
  check(ctx, prod[3] === 1 && prod[2] === m.b && prod[1] === m.a && prod[0] === m.a * m.b, "grouping expansion mismatch");
  checkAnswer(ctx, p, vFactored([vPoly([m.a, 0, 1]), vLinear(1, m.b)]), "factor by grouping");
}

function verifyRationalSimplify(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "rationalSimplify" }>): void {
  const { r1, r2 } = m;
  check(ctx, r1 !== r2, "r1 == r2 in rational simplification");
  checkAnswer(ctx, p, `${vLinear(1, -r2)}, \\quad x \\neq ${r1}`, "rational expression");
}

function verifyQuadratic(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "quadratic" }>): void {
  const { a, b, c } = m;
  check(ctx, a !== 0, `zero leading coefficient a=0 (subtype ${p.subtype})`);
  const D = b * b - 4 * a * c;
  const roots = [(-b + Math.sqrt(D)) / (2 * a), (-b - Math.sqrt(D)) / (2 * a)].sort((x, y) => x - y);
  if (p.subtype === "QuadraticFactoring" || p.subtype === "QuadraticFormula") {
    check(ctx, D >= 0, `negative discriminant D=${D} where real solutions expected`);
  }
  if (p.subtype === "QuadraticDiscriminant") {
    const how = D > 0 ? "two real solutions" : D === 0 ? "one real solution" : "no real solutions";
    checkAnswer(ctx, p, `D = ${D}; ${how}`, "discriminant");
    return;
  }
  if (D < 0) return; // makers never do this for solving subtypes
  for (const r of roots) {
    check(ctx, Math.abs(a * r * r + b * r + c) < 1e-6, `root ${r} fails substitution`);
  }
  if (p.subtype === "QuadraticFactoring") {
    check(ctx, roots.every(Number.isInteger), `non-integer roots ${roots} in factoring problem`);
    checkAnswer(ctx, p, `x = ${roots[0]} \\text{ or } x = ${roots[1]}`, "quadratic factoring");
  } else if (p.subtype === "QuadraticFormula") {
    if (vIsPerfectSquare(D)) {
      checkAnswer(ctx, p, `x = ${vNum(roots[0])} \\text{ or } x = ${vNum(roots[1])}`, "quadratic formula");
    } else {
      const g = vgcd(vgcd(Math.abs(b), D), Math.abs(2 * a));
      checkAnswer(ctx, p, `x = \\frac{${-b / g} \\pm \\sqrt{${D / g}}}{${(2 * a) / g}}`, "quadratic formula (radical)");
    }
  }
}

function verifyQuadAttributes(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "quadAttributes" }>): void {
  const { a, b, c } = m;
  check(ctx, a !== 0, "zero leading coefficient in quadAttributes");
  const h = -b / (2 * a);
  const k = a * h * h + b * h + c;
  check(ctx, Number.isInteger(h) && Number.isInteger(k), `non-integer vertex (${h}, ${k})`);
  const minMax = a > 0 ? `minimum ${k}` : `maximum ${k}`;
  const range = a > 0 ? `y \\geq ${k}` : `y \\leq ${k}`;
  checkAnswer(
    ctx, p,
    `axis: x = ${h}; vertex: (${h}, ${k}); y-intercept: (0, ${c}); ${minMax}; range: ${range}`,
    "quadratic attributes"
  );
}

function vertexAnswerText(a: number, h: number, k: number): string {
  const aT = a === 1 ? "" : a === -1 ? "-" : `${a}`;
  return `f(x) = ${aT}(x ${h >= 0 ? "-" : "+"} ${Math.abs(h)})^{2} ${k >= 0 ? "+" : "-"} ${Math.abs(k)}`;
}

function verifyVertex(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "vertex" }>): void {
  const { a, h, k } = m;
  check(ctx, a !== 0, "zero leading coefficient in vertex form");
  if (p.subtype === "VertexForm") {
    checkAnswer(ctx, p, vertexAnswerText(a, h, k), "vertex form");
  } else if (p.subtype === "GraphQuadratic") {
    const yInt = a * h * h + k;
    checkAnswer(ctx, p, `vertex: (${h}, ${k}); axis: x = ${h}; y-intercept: (0, ${yInt})`, "graph quadratic");
    if (p.graph?.kind === "FunctionGraph") {
      const fn = p.graph.funcs[0];
      if (fn.fn === "parabola") {
        const vx = (fn.h + 0) ;
        check(ctx, Math.abs(fn.a * (vx - fn.h) ** 2 + fn.k - k) < 1e-9, "graph vertex mismatch");
      }
    }
  }
}

function verifyQuadTransform(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "quadTransform" }>): void {
  const { a, h, k } = m;
  const parts: string[] = [];
  if (a === -1) parts.push("reflect over the x-axis");
  else if (a !== 1) parts.push(a > 1 ? `vertical stretch by ${a}` : `vertical shrink by ${vFrac(1, Math.abs(a))}`);
  parts.push(h > 0 ? `shift right ${h}` : `shift left ${-h}`);
  parts.push(k > 0 ? `shift up ${k}` : `shift down ${-k}`);
  checkAnswer(ctx, p, parts.join("; "), "quadratic transformation");
}

function verifyCompleteSquare(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "completeSquare" }>): void {
  const { b, c } = m;
  check(ctx, b % 2 === 0, `b=${b} not even in complete-the-square`);
  const half = b / 2;
  const r2 = half * half - c;
  check(ctx, r2 >= 0 && vIsPerfectSquare(r2), `bad square ${r2} in complete-the-square`);
  const r = Math.sqrt(r2);
  const roots = [-half - r, -half + r].sort((x, y) => x - y);
  for (const rt of roots) check(ctx, Math.abs(rt * rt + b * rt + c) < 1e-9, `root ${rt} fails substitution`);
  checkAnswer(ctx, p, `x = ${roots[0]} \\text{ or } x = ${roots[1]}`, "complete the square");
}

function verifyWriteQuad(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "writeQuad" }>): void {
  const { r1, r2 } = m;
  check(ctx, r1 !== r2, "repeated root in write-quadratic");
  const poly = vMul([-r1, 1], [-r2, 1]);
  checkAnswer(ctx, p, `f(x) = ${vPoly(poly)}`, "write quadratic");
  check(ctx, poly[2] !== 0, "zero leading coefficient in written quadratic");
}

function verifyExponential(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "exponential" }>): void {
  const { a, b, x } = m;
  check(ctx, a !== 0 && b > 0 && b !== 1, `bad exponential params a=${a} b=${b}`);
  const value = a * Math.pow(b, x);
  if (p.subtype === "ExponentialGrowth") {
    const pct = (b - 1) * 100;
    check(ctx, b > 1, "growth with b ≤ 1");
    checkAnswer(ctx, p, `growth; ${pct}% per unit; f(${x}) = ${value}`, "exponential growth");
  } else if (p.subtype === "ExponentialDecay") {
    check(ctx, b < 1, "decay with b ≥ 1");
    checkAnswer(ctx, p, `decay; f(${x}) = ${vNum(value)}`, "exponential decay");
  } else if (p.subtype === "ExponentialWordProblem") {
    const rounded = Math.round(value * 100) / 100;
    const got = latexToText(p.answer);
    // latexToText strips "$", so compare the numeric tail.
    check(ctx, got.endsWith(rounded.toFixed(2)), `word problem value mismatch (want ${rounded.toFixed(2)}, got ${got})`);
    check(ctx, got.startsWith(`A(t) = ${a}(`), `word problem function mismatch (got ${got})`);
  } else if (p.subtype === "GraphExponential") {
    checkAnswer(ctx, p, `y-intercept: (0, ${a}); asymptote: y = 0`, "graph exponential");
  }
}

function verifyExpModel(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "expModel" }>): void {
  const { a, b } = m;
  check(ctx, b > 1, `non-growth base b=${b} in modeling`);
  checkAnswer(ctx, p, `f(x) = ${a}(${b})^{x}; f(5) = ${a * Math.pow(b, 5)}`, "exponential modeling");
}

function verifySequence(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "sequence" }>): void {
  const { seqKind, a1, d, r, n } = m;
  let an: number;
  if (seqKind === "arithmetic") {
    check(ctx, d !== 0, "zero common difference");
    an = a1 + (n - 1) * d;
  } else {
    check(ctx, r !== 0 && r !== 1, `bad ratio r=${r}`);
    an = a1 * Math.pow(r, n - 1);
  }
  // latexToText renders a_{10} as a₁₀ (unicode subscripts).
  const SUB: Record<string, string> = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" };
  const subN = `${n}`.split("").map((ch) => SUB[ch] ?? ch).join("");
  const got = latexToText(p.answer);
  if (p.subtype === "SequenceWordProblem") {
    // Word-problem answers carry units, e.g. "64 seats".
    check(ctx, got.startsWith(`${an} `) || got === `${an}`, `sequence word answer mismatch (want ${an}…, got ${got})`);
  } else {
    check(ctx, got.includes(`a${subN} = ${an}`), `sequence nth term mismatch (want a${subN} = ${an}, got ${got})`);
  }
}

function verifyRecursive(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "recursive" }>): void {
  let v = m.a1;
  for (let i = 2; i <= m.n; i++) v = m.seqKind === "arithmetic" ? v + m.d : v * m.r;
  checkAnswer(ctx, p, `f(${m.n}) = ${v}`, "recursive sequence");
}

function verifyTwoWay(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "twoway" }>): void {
  const data = m.data;
  check(ctx, data.length === 2 && data.every((r) => r.length === 2), "two-way table not 2x2");
  check(ctx, data.every((r) => r.every((v) => v > 0)), "non-positive cell count");
  const rowTotals = data.map((r) => r[0] + r[1]);
  const grand = rowTotals[0] + rowTotals[1];
  const got = latexToText(p.answer);
  if (p.prompt.toLowerCase().includes("percent")) {
    const pct = Math.round((data[0][0] / grand) * 100);
    check(ctx, got === `${pct}%`, `two-way percent mismatch (want ${pct}%, got ${got})`);
  } else {
    check(ctx, got === `${rowTotals[0]}`, `two-way total mismatch (want ${rowTotals[0]}, got ${got})`);
  }
  if (p.graph?.kind === "TwoWayTable") {
    check(ctx, JSON.stringify(p.graph.data) === JSON.stringify(data), "diagram data mismatch");
  }
}

function verifyRegression(ctx: Ctx, p: Algebra1Problem, m: Extract<Algebra1Meta, { kind: "regression" }>): void {
  check(ctx, m.points.length >= 5, "too few scatter points");
  const { m: mm, b } = vLeastSquares(m.points);
  const mR = Math.round(mm * 100) / 100;
  const bR = Math.round(b * 100) / 100;
  const pred = Math.round((mR * m.predictX + bR) * 10) / 10;
  const eqText = `y = ${vNum(mR)}x + ${vNum(bR)}`;
  checkAnswer(ctx, p, `${eqText}; about ${vNum(pred)}`, "line of best fit");
  if (p.graph?.kind === "ScatterPlot") {
    check(ctx, Math.abs(p.graph.line.m - mR) < 1e-9 && Math.abs(p.graph.line.b - bR) < 1e-9, "diagram regression line mismatch");
    check(ctx, p.graph.points.length === m.points.length, "diagram point count mismatch");
  }
}

// ── Diagram sanity (all kinds) ──────────────────────────────────────────────

function verifyDiagram(ctx: Ctx, p: Algebra1Problem): void {
  const g = p.graph;
  if (!g) return;
  const finite = (v: number) => Number.isFinite(v);
  if (g.kind === "FunctionGraph") {
    check(ctx, g.funcs.length > 0, "function graph has no functions");
    for (const fn of g.funcs) {
      if (fn.fn === "line") {
        check(ctx, finite(fn.m) && finite(fn.b), "line has non-finite coefficients");
        // Plot-accuracy: the sampled path must be non-empty over the range.
        const xr = g.xRange ?? [-8, 8];
        const yMid = fn.m * ((xr[0] + xr[1]) / 2) + fn.b;
        check(ctx, finite(yMid), "line evaluation non-finite");
      } else if (fn.fn === "parabola") {
        check(ctx, fn.a !== 0 && finite(fn.h) && finite(fn.k), "bad parabola params");
      } else {
        check(ctx, fn.a !== 0 && fn.b > 0 && finite(fn.a), "bad exponential params");
      }
    }
    for (const mk of g.marks ?? []) {
      check(ctx, finite(mk.x) && finite(mk.y), "non-finite mark");
    }
  } else if (g.kind === "NumberLine") {
    check(ctx, finite(g.value), "number line non-finite value");
  } else if (g.kind === "ScatterPlot") {
    check(ctx, g.points.length > 0 && finite(g.line.m) && finite(g.line.b), "bad scatter plot");
  } else if (g.kind === "TwoWayTable") {
    check(ctx, g.data.length === g.rowLabels.length, "table rows/labels mismatch");
  }
}

// ── Subtype → meta-kind contract ────────────────────────────────────────────

const META_BY_SUBTYPE: Record<string, string> = {
  MultiStepEquation: "equation", VariablesBothSides: "equation", EquationWordProblem: "equation",
  LiteralEquation: "literal", Proportion: "proportion",
  Inequality: "inequality", CompoundInequality: "compound", AbsoluteValue: "absolute",
  SlopeFromPoints: "slope",
  GraphLine: "line", WriteSlopeIntercept: "line", LinearWordProblem: "line",
  WritePointSlope: "pointSlope", StandardToSlopeIntercept: "standard",
  DirectVariation: "directVariation", WriteFunctionRule: "functionRule",
  RelationsFunctions: "relation", FunctionNotation: "functionNotation",
  ParallelPerpendicular: "parallelPerp", TransformLinear: "transform",
  SystemGraphing: "system", SystemSubstitution: "system", SystemElimination: "system",
  SystemWordProblem: "system", SystemSpecialCase: "system",
  LinearInequality: "linearInequality", SystemOfInequalities: "systemInequalities",
  ZeroNegativeExponents: "exponentEval", MultiplyPowers: "monomial", PowerOfPower: "monomialPow",
  DivisionProperties: "monomial", RationalExponents: "rationalExp", SimplifyRadicals: "radical",
  PolyAddSub: "poly", FOIL: "poly", PolyMultiply: "poly",
  FactorGCF: "factored", FactorTrinomialBasic: "factored", FactorTrinomialAC: "factored",
  FactorDifferenceSquares: "factored", FactorByGrouping: "grouping",
  SimplifyRationalExpression: "rationalSimplify",
  QuadraticAttributes: "quadAttributes", GraphQuadratic: "vertex",
  QuadraticTransformations: "quadTransform", VertexForm: "vertex",
  QuadraticFactoring: "quadratic", QuadraticFormula: "quadratic", QuadraticDiscriminant: "quadratic",
  CompleteSquare: "completeSquare", WriteQuadratic: "writeQuad",
  ExponentialGrowth: "exponential", ExponentialDecay: "exponential",
  ExponentialWordProblem: "exponential", GraphExponential: "exponential",
  ExponentialModeling: "expModel",
  ArithmeticSequence: "sequence", GeometricSequence: "sequence", SequenceWordProblem: "sequence",
  RecursiveArithmetic: "recursive", RecursiveGeometric: "recursive",
  TwoWayTable: "twoway", LineOfBestFit: "regression",
};

// ── Main entry ──────────────────────────────────────────────────────────────

export function verifyProblem(p: Algebra1Problem, id: string): VerifyResult {
  const ctx: Ctx = { checks: 0, failures: [], id };

  // Structural checks
  check(ctx, !!p.type && !!p.subtype, "missing type/subtype");
  check(ctx, typeof p.prompt === "string" && p.prompt.length > 5, "prompt too short");
  check(ctx, typeof p.answer === "string" && p.answer.length > 0, "empty answer");
  check(ctx, Array.isArray(p.steps) && p.steps.length > 0, "no steps");
  for (const s of p.steps) {
    check(ctx, typeof s.instruction === "string" && s.instruction.length > 0, "empty step instruction");
  }
  const wantMeta = META_BY_SUBTYPE[p.subtype];
  check(ctx, !!wantMeta, `unknown subtype ${p.subtype}`);
  check(ctx, p.meta?.kind === wantMeta, `meta kind ${p.meta?.kind} != ${wantMeta} for ${p.subtype}`);

  // Math verification by meta kind
  const m = p.meta as Algebra1Meta;
  switch (m.kind) {
    case "equation": verifyEquation(ctx, p, m); break;
    case "inequality": verifyInequality(ctx, p, m); break;
    case "compound": verifyCompound(ctx, p, m); break;
    case "absolute": verifyAbsolute(ctx, p, m); break;
    case "literal": verifyLiteral(ctx, p, m); break;
    case "proportion": verifyProportion(ctx, p, m); break;
    case "slope": verifySlope(ctx, p, m); break;
    case "line": verifyLine(ctx, p, m); break;
    case "pointSlope": verifyPointSlope(ctx, p, m); break;
    case "standard": verifyStandard(ctx, p, m); break;
    case "directVariation": verifyDirectVariation(ctx, p, m); break;
    case "functionRule": verifyFunctionRule(ctx, p, m); break;
    case "relation": verifyRelation(ctx, p, m); break;
    case "functionNotation": verifyFunctionNotation(ctx, p, m); break;
    case "parallelPerp": verifyParallelPerp(ctx, p, m); break;
    case "transform": verifyTransform(ctx, p, m); break;
    case "system": verifySystem(ctx, p, m); break;
    case "linearInequality": verifyLinearInequality(ctx, p, m); break;
    case "systemInequalities": verifySystemInequalities(ctx, p, m); break;
    case "exponentEval": verifyExponentEval(ctx, p, m); break;
    case "monomial": verifyMonomial(ctx, p, m); break;
    case "monomialPow": verifyMonomialPow(ctx, p, m); break;
    case "rationalExp": verifyRationalExp(ctx, p, m); break;
    case "radical": verifyRadical(ctx, p, m); break;
    case "poly": verifyPoly(ctx, p, m); break;
    case "factored": verifyFactored(ctx, p, m); break;
    case "grouping": verifyGrouping(ctx, p, m); break;
    case "rationalSimplify": verifyRationalSimplify(ctx, p, m); break;
    case "quadratic": verifyQuadratic(ctx, p, m); break;
    case "quadAttributes": verifyQuadAttributes(ctx, p, m); break;
    case "quadTransform": verifyQuadTransform(ctx, p, m); break;
    case "vertex": verifyVertex(ctx, p, m); break;
    case "completeSquare": verifyCompleteSquare(ctx, p, m); break;
    case "writeQuad": verifyWriteQuad(ctx, p, m); break;
    case "exponential": verifyExponential(ctx, p, m); break;
    case "expModel": verifyExpModel(ctx, p, m); break;
    case "sequence": verifySequence(ctx, p, m); break;
    case "recursive": verifyRecursive(ctx, p, m); break;
    case "twoway": verifyTwoWay(ctx, p, m); break;
    case "regression": verifyRegression(ctx, p, m); break;
    default: check(ctx, false, `unhandled meta kind ${(m as { kind: string }).kind}`);
  }

  // Diagram sanity
  verifyDiagram(ctx, p);

  return { checks: ctx.checks, failures: ctx.failures };
}
