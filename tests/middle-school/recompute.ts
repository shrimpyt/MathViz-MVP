// recompute.ts
// INDEPENDENT answer verification for middle-school problems.
// Recomputes the expected answer from `given` using fresh implementations
// (own gcd/fraction/rounding, not the generator's code path) and returns it
// for comparison against problem.answer. Throws on unhandled makers so the
// matrix test surfaces gaps.

import type { MiddleSchoolProblem } from "@/lib/factories/MiddleSchoolTypes";

// ── Independent primitives (not imported from the generator) ─────────────────

function igcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
}

function ifrac(n: number, d: number): { n: number; d: number } {
  if (d === 0) throw new Error("denominator 0");
  const g = igcd(n, d);
  n /= g;
  d /= g;
  if (d < 0) {
    n = -n;
    d = -d;
  }
  return { n, d };
}

function ifracStr(n: number, d: number): string {
  const f = ifrac(n, d);
  return f.d === 1 ? String(f.n) : `${f.n}/${f.d}`;
}

function iround(n: number, places: number): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

function ifmt(n: number): string {
  return String(iround(n, 10));
}

function inum(g: Record<string, number | string>, k: string): number {
  const v = Number(g[k]);
  if (!isFinite(v)) throw new Error(`given.${k} is not numeric: ${g[k]}`);
  return v;
}

function istr(g: Record<string, number | string>, k: string): string {
  return String(g[k]);
}

const PI = 3.14;
const money = (n: number) => `$${n.toLocaleString("en-US")}`;

// ── Grade 6 ───────────────────────────────────────────────────────────────────

/** Numeric value of a displayed signed value: "3/4", "-2.6", or "-7". */
function parseSignedText(text: string): number {
  if (text.includes("/")) {
    const [ns, ds] = text.split("/");
    return Number(ns) / Number(ds);
  }
  return Number(text);
}

/** Negation or absolute value of a displayed signed value, reformatted. */
function flipSignedText(text: string, mode: "neg" | "abs"): string {
  if (text.includes("/")) {
    const [ns, ds] = text.split("/");
    const n = Number(ns);
    const d = Number(ds);
    return ifracStr(mode === "neg" ? -n : Math.abs(n), d);
  }
  if (text.includes(".")) {
    const v = Number(text);
    return ifmt(mode === "neg" ? -v : Math.abs(v));
  }
  const v = parseInt(text, 10);
  return String(mode === "neg" ? -v : Math.abs(v));
}

function recompute6(p: MiddleSchoolProblem): string | number {
  const g = p.given;
  switch (p.subtype) {
    case "MultiplyingDividingFractions": {
      if (g.wordKind !== undefined) {
        const wk = istr(g, "wordKind");
        if (wk === "of-class") return Math.round((inum(g, "n") / inum(g, "d")) * inum(g, "total"));
        if (wk === "percent-of") return Math.round((inum(g, "pct") / 100) * inum(g, "total"));
        if (wk === "recipe") return ifracStr(inum(g, "batches") * inum(g, "n"), inum(g, "d"));
        throw new Error(`unhandled FDP wordKind=${wk}`);
      }
      const op = istr(g, "op");
      if (op === "mul" && g.whole !== undefined) {
        return ifracStr(inum(g, "whole") * inum(g, "n"), inum(g, "d"));
      }
      const a = ifrac(inum(g, "n1"), inum(g, "d1"));
      const b = ifrac(inum(g, "n2"), inum(g, "d2"));
      if (op === "add") return ifracStr(a.n * b.d + b.n * a.d, a.d * b.d);
      if (op === "sub") return ifracStr(a.n * b.d - b.n * a.d, a.d * b.d);
      if (op === "mul") return ifracStr(a.n * b.n, a.d * b.d);
      if (op === "div") return ifracStr(a.n * b.d, a.d * b.n);
      throw new Error(`unhandled MultiplyingDividingFractions op=${op}`);
    }
    case "DecimalFluency": {
      if (istr(g, "wordKind") === "decimal-money") {
        return `$${ifmt(iround(inum(g, "price") * inum(g, "qty"), 2))}`;
      }
      const op = istr(g, "op");
      if (op === "div") return ifmt(inum(g, "dividend") / inum(g, "divisor"));
      const a = inum(g, "a");
      const b = inum(g, "b");
      if (op === "add") return ifmt(iround(a + b, 2));
      if (op === "sub") return ifmt(iround(a - b, 2));
      if (op === "mul") return ifmt(iround(a * b, 3));
      throw new Error(`unhandled DecimalFluency op=${op}`);
    }
    case "FDPConversions": {
      if (g.hundredths !== undefined) return `${inum(g, "hundredths")}%`;
      if (g.pct !== undefined) return ifracStr(inum(g, "pct"), 100);
      const val = inum(g, "n") / inum(g, "d");
      // makeFractionToPercent vs makeFracToDecimal: distinguished by the prompt
      return p.prompt.includes("as a percent") ? `${Math.round(val * 100)}%` : ifmt(val);
    }
    case "IntegerOperations": {
      if (g.wordKind !== undefined) {
        const wk = istr(g, "wordKind");
        if (wk === "temperature") return `${inum(g, "start") - inum(g, "drop")}°F`;
        if (wk === "elevation") return `${inum(g, "start") - inum(g, "down")} feet`;
        if (wk === "money") return `$${inum(g, "paid") - inum(g, "owed")}`;
        throw new Error(`unhandled integer wordKind=${wk}`);
      }
      if (g.values !== undefined) {
        const vals = istr(g, "values").split(",").map(Number);
        return [...vals].sort((x, y) => x - y).join(", ");
      }
      if (g.op === undefined) {
        const a = inum(g, "a");
        const b = inum(g, "b");
        return a < b ? "<" : ">";
      }
      const op = istr(g, "op");
      if (op === "div") return inum(g, "product") / inum(g, "b");
      const a = inum(g, "a");
      const b = inum(g, "b");
      if (op === "add") return a + b;
      if (op === "sub") return a - b;
      if (op === "mul") return a * b;
      throw new Error(`unhandled IntegerOperations op=${op}`);
    }
    case "VariablesAndExpressions": {
      if (istr(g, "kind") === "power") {
        const base = inum(g, "base");
        const exp = inum(g, "exp");
        let v = 1;
        for (let i = 0; i < exp; i++) v *= base;
        return v;
      }
      if (istr(g, "kind") === "prime-factorization") {
        let rest = inum(g, "n");
        const factors: number[] = [];
        for (let p = 2; p * p <= rest; p++) {
          while (rest % p === 0) {
            factors.push(p);
            rest /= p;
          }
        }
        if (rest > 1) factors.push(rest);
        return factors.join(" × ");
      }
      if (istr(g, "wordKind") === "expression") return `${inum(g, "price")}m + ${inum(g, "fee")}`;
      if (g.y !== undefined) return inum(g, "a") * inum(g, "x") + inum(g, "b") * inum(g, "y");
      return inum(g, "a") * inum(g, "x") + inum(g, "b");
    }
    case "EquivalentExpressions": {
      if (g.d !== undefined) {
        // combine like terms: {a,b,c,d}
        const xc = inum(g, "a") + inum(g, "b");
        const k = inum(g, "c") - inum(g, "d");
        return k === 0 ? `${xc}x` : `${xc}x ${k < 0 ? "−" : "+"} ${Math.abs(k)}`;
      }
      // distributive expand: {a,b,c}
      return `${inum(g, "a") * inum(g, "b")}x + ${inum(g, "a") * inum(g, "c")}`;
    }
    case "EquationsAndInequalities": {
      const kind = istr(g, "kind");
      if (kind === "add" || kind === "neg") return inum(g, "b") - inum(g, "a");
      if (kind === "mul") return inum(g, "b") / inum(g, "a");
      if (kind === "sub") return inum(g, "a") + inum(g, "b");
      if (kind === "div") return inum(g, "a") * inum(g, "quotient");
      if (kind === "inequality") return `x ${istr(g, "dir")} ${inum(g, "boundary")}`;
      if (istr(g, "wordKind") === "equation") return `$${inum(g, "price")}`;
      throw new Error(`unhandled EquationsAndInequalities kind=${kind}`);
    }
    case "TwoVariableRelationships": {
      if (istr(g, "wordKind") === "two-var") return `$${inum(g, "perMile") * inum(g, "miles") + inum(g, "base")}`;
      if (g.b === undefined) return inum(g, "a") * inum(g, "x"); // y = ax
      return inum(g, "a") * inum(g, "x") + inum(g, "b");
    }
    case "RatiosAndRates": {
      if (istr(g, "unitKind") === "speed") return `${inum(g, "miles") / inum(g, "hours")} miles per hour`;
      if (istr(g, "unitKind") === "price") return `$${inum(g, "total") / inum(g, "qty")} per notebook`;
      if (g.x !== undefined) return inum(g, "x"); // equivalent ratio
      const a = inum(g, "a");
      const b = inum(g, "b");
      const gg = igcd(a, b);
      return `${a / gg}:${b / gg}`;
    }
    case "RatioReasoning": {
      if (g.pct !== undefined) return Math.round((inum(g, "pct") / 100) * inum(g, "total"));
      if (g.k !== undefined) return inum(g, "b") * inum(g, "k");
      return (inum(g, "target") * inum(g, "cups")) / inum(g, "batch");
    }
    case "AreaOfPolygons": {
      if (istr(g, "kind") === "backward-parallelogram") return `${inum(g, "height")} cm`;
      if (istr(g, "kind") === "backward-triangle") return `${inum(g, "height")} in`;
      if (g.b1 !== undefined) return ((inum(g, "b1") + inum(g, "b2")) / 2) * inum(g, "h");
      if (istr(g, "shape") === "triangle") return (inum(g, "base") * inum(g, "height")) / 2;
      return inum(g, "base") * inum(g, "height");
    }
    case "VolumeAndSurfaceArea": {
      const l = inum(g, "l");
      const w = inum(g, "w");
      const h = inum(g, "h");
      if (istr(g, "wordKind") === "fish-tank") return `${l * w * h} cubic inches`;
      if (p.prompt.includes("surface area")) return 2 * (l * w + l * h + w * h);
      return l * w * h;
    }
    case "TriangleProperties": {
      if (istr(g, "kind") === "inequality-check") {
        const a = inum(g, "a"), b = inum(g, "b"), c = inum(g, "c");
        return a + b > c && a + c > b && b + c > a ? "yes" : "no";
      }
      if (istr(g, "kind") === "inequality-range") {
        const a = inum(g, "a"), b = inum(g, "b");
        return `greater than ${Math.abs(b - a)} and less than ${a + b}`;
      }
      if (istr(g, "kind") === "right" && inum(g, "known") + inum(g, "missing") !== 90) {
        throw new Error("right-triangle angle mismatch");
      }
      return `${inum(g, "missing")}°`;
    }
    case "DataDisplays": {
      if (g.counts !== undefined) {
        return istr(g, "counts").split(",").map(Number).reduce((s, v) => s + v, 0);
      }
      return inum(g, "b") - inum(g, "a");
    }
    case "MeasuresOfCenterAndVariation": {
      const vals = istr(g, "values").split(",").map(Number);
      if (p.find === "the interquartile range") {
        // Median-of-halves: split the ordered data into lower and upper
        // halves (median excluded), then IQR = Q3 - Q1.
        const s = [...vals].sort((x, y) => x - y);
        const mid = Math.floor(s.length / 2);
        const med = (arr: number[]) =>
          arr.length % 2 === 1
            ? arr[(arr.length - 1) / 2]
            : (arr[arr.length / 2 - 1] + arr[arr.length / 2]) / 2;
        return ifmt(med(s.slice(s.length - mid)) - med(s.slice(0, mid)));
      }
      if (p.find === "the mean" || p.find === "the mean score") {
        const m = vals.reduce((s, v) => s + v, 0) / vals.length;
        return p.find === "the mean score" ? Math.round(m) : m;
      }
      if (p.find === "the mode") {
        const freq = new Map<number, number>();
        for (const v of vals) freq.set(v, (freq.get(v) ?? 0) + 1);
        let best = vals[0];
        let bestC = 0;
        for (const [v, c] of freq) if (c > bestC) { bestC = c; best = v; }
        return best;
      }
      if (p.find === "the median") {
        const s = [...vals].sort((x, y) => x - y);
        const mid = s.length / 2;
        return s.length % 2 === 1 ? ifmt(s[Math.floor(mid)]) : ifmt((s[mid - 1] + s[mid]) / 2);
      }
      if (p.find === "the range") return Math.max(...vals) - Math.min(...vals);
      throw new Error(`unhandled stats find=${p.find}`);
    }
    case "BankingAndCredit": {
      if (g.rate !== undefined) return `$${Math.round((inum(g, "owed") * inum(g, "rate")) / 100)}`;
      return `$${inum(g, "start") + inum(g, "deposit") - inum(g, "withdrawal")}`;
    }
    case "CollegeAndSalaries": {
      if (istr(g, "wordKind") === "college-compare") {
        const tA = inum(g, "costA") * 4;
        const tB = inum(g, "costB") * 4 - inum(g, "scholarship");
        const cheaper = tA < tB ? "College A" : "College B";
        return `${cheaper} by $${Math.abs(tA - tB).toLocaleString("en-US")}`;
      }
      if (g.weeks === undefined) return `$${inum(g, "hourly") * inum(g, "hoursPerWeek")}`; // weekly pay
      return money(inum(g, "hourly") * inum(g, "hoursPerWeek") * inum(g, "weeks"));
    }
    case "CoordinateGraphing6": {
      const kind = istr(g, "kind");
      if (kind === "identify-point") return `(${inum(g, "x")}, ${inum(g, "y")})`;
      if (kind === "quadrant") {
        const x = inum(g, "x"), y = inum(g, "y");
        if (x === 0 && y === 0) return "the origin";
        if (x === 0) return "the y-axis";
        if (y === 0) return "the x-axis";
        if (x > 0 && y > 0) return "Quadrant I";
        if (x < 0 && y > 0) return "Quadrant II";
        if (x < 0 && y < 0) return "Quadrant III";
        return "Quadrant IV";
      }
      if (kind === "grid-distance") {
        const dx = Math.abs(inum(g, "x2") - inum(g, "x1"));
        const dy = Math.abs(inum(g, "y2") - inum(g, "y1"));
        if (dx !== 0 && dy !== 0) throw new Error("grid-distance points share neither coordinate");
        if (dx + dy === 0) throw new Error("grid-distance points are identical");
        return dx + dy;
      }
      if (kind === "reflect") {
        const x = inum(g, "x"), y = inum(g, "y");
        const axis = istr(g, "axis");
        if (axis === "x-axis") return `(${x}, ${-y})`;
        if (axis === "y-axis") return `(${-x}, ${y})`;
        throw new Error(`unhandled reflect axis=${axis}`);
      }
      throw new Error(`unhandled CoordinateGraphing6 kind=${kind}`);
    }
    case "UnitConversion6": {
      const kind = istr(g, "kind");
      if (kind === "convert") {
        const value = inum(g, "value"), per = inum(g, "per"), to = istr(g, "to");
        if (istr(g, "op") === "mul") return `${value * per} ${to}`;
        if (istr(g, "op") === "div") {
          if (value % per !== 0) throw new Error("conversion does not divide evenly");
          return `${value / per} ${to}`;
        }
        throw new Error(`unhandled convert op=${istr(g, "op")}`);
      }
      if (kind === "convert-chain") {
        return `${inum(g, "value") * inum(g, "per1") * inum(g, "per2")} ${istr(g, "to")}`;
      }
      throw new Error(`unhandled UnitConversion6 kind=${kind}`);
    }
    case "NumberSets6": {
      const kind = istr(g, "kind");
      if (kind === "classify-set") {
        const text = istr(g, "value");
        if (text.includes("/")) {
          const [ns, ds] = text.split("/");
          const n = Number(ns), d = Number(ds);
          if (n % d === 0) return n / d >= 0 ? "whole number" : "integer";
          return "rational number";
        }
        if (text.includes(".")) return "rational number";
        return Number(text) >= 0 ? "whole number" : "integer";
      }
      if (kind === "opposite") return flipSignedText(istr(g, "text"), "neg");
      if (kind === "abs") return flipSignedText(istr(g, "text"), "abs");
      if (kind === "compare-abs") {
        const aText = istr(g, "aText"), bText = istr(g, "bText");
        const av = Math.abs(parseSignedText(aText));
        const bv = Math.abs(parseSignedText(bText));
        if (av === bv) throw new Error("compare-abs tie");
        return av > bv ? aText : bText;
      }
      throw new Error(`unhandled NumberSets6 kind=${kind}`);
    }
    case "FractionMultiplyEffect": {
      const kind = istr(g, "kind");
      if (kind === "predict") {
        const n = inum(g, "n"), d = inum(g, "d");
        return n > d ? "greater than" : n < d ? "less than" : "equal to";
      }
      if (kind === "predict-compute") return ifracStr(inum(g, "start") * inum(g, "n"), inum(g, "d"));
      throw new Error(`unhandled FractionMultiplyEffect kind=${kind}`);
    }
    case "BenchmarkPercents": {
      const kind = istr(g, "kind");
      if (kind === "benchmark") return (inum(g, "base") * inum(g, "pct")) / 100;
      if (kind === "benchmark-estimate") return `$${(inum(g, "base") * inum(g, "bench")) / 100}`;
      throw new Error(`unhandled BenchmarkPercents kind=${kind}`);
    }
    case "CategoricalData6": {
      const kind = istr(g, "kind");
      if (kind === "rel-freq") {
        const pct = (inum(g, "count") * 100) / inum(g, "total");
        if (!Number.isInteger(pct)) throw new Error("relative frequency is not a whole percent");
        return `${pct}%`;
      }
      if (kind === "count-from-pct") {
        const count = (inum(g, "pct") * inum(g, "total")) / 100;
        if (!Number.isInteger(count)) throw new Error("count from percent is not whole");
        return count;
      }
      if (kind === "rel-freq-diff") {
        const pct = ((inum(g, "countA") - inum(g, "countB")) * 100) / inum(g, "total");
        if (!Number.isInteger(pct)) throw new Error("percent difference is not a whole percent");
        return `${pct}%`;
      }
      throw new Error(`unhandled CategoricalData6 kind=${kind}`);
    }
    case "WriteProblem6": {
      const form = istr(g, "form");
      const a = inum(g, "a"), b = inum(g, "b");
      const solution = (f: string): number => {
        if (f === "add") return b - a;
        if (f === "sub") return a + b;
        if (f === "mul") {
          if (b % a !== 0) throw new Error("mul situation has no whole-number solution");
          return b / a;
        }
        if (f === "div") return a * b;
        throw new Error(`unknown one-step form=${f}`);
      };
      const kind = istr(g, "kind");
      if (kind === "match") {
        const x = solution(form);
        if (!Number.isInteger(x) || x <= 0) throw new Error("match equation has no positive whole-number solution");
        const forms = istr(g, "options").split("|");
        const idx = forms.indexOf(form);
        if (idx === -1) throw new Error("match: correct form missing from options");
        if (idx !== inum(g, "correctIndex")) throw new Error("match: correctIndex mismatch");
        return "ABC"[idx];
      }
      if (kind === "write-eq-one") {
        const x = solution(form);
        if (!Number.isInteger(x) || x <= 0) throw new Error("write-eq-one has no positive whole-number solution");
        if (form === "add") return `x + ${a} = ${b}`;
        if (form === "sub") return `x − ${a} = ${b}`;
        if (form === "mul") return `${a}x = ${b}`;
        return `x/${a} = ${b}`;
      }
      throw new Error(`unhandled WriteProblem6 kind=${kind}`);
    }
    default:
      throw new Error(`unhandled grade-6 subtype ${(p as { subtype: string }).subtype}`);
  }
}

// ── Grade 7 ───────────────────────────────────────────────────────────────────

function recompute7(p: MiddleSchoolProblem): string | number {
  const g = p.given;
  switch (p.subtype) {
    case "RationalNumbersAndAbsoluteValue": {
      if (g.v !== undefined) {
        const v = inum(g, "v");
        return p.find === "the absolute value" ? Math.abs(v) : ifmt(-v);
      }
      const f = ifrac(inum(g, "n"), inum(g, "d"));
      return f.d === 1 ? String(-f.n) : `${-f.n}/${f.d}`;
    }
    case "AddSubtractRational": {
      const form = istr(g, "form");
      if (form === "decimal") return ifmt(iround(inum(g, "a") + inum(g, "b"), 1));
      const a = ifrac(inum(g, "n1"), inum(g, "d1"));
      const b = ifrac(inum(g, "n2"), inum(g, "d2"));
      return istr(g, "op") === "add"
        ? ifracStr(a.n * b.d + b.n * a.d, a.d * b.d)
        : ifracStr(a.n * b.d - b.n * a.d, a.d * b.d);
    }
    case "MultiplyDivideRational": {
      if (istr(g, "form") === "decimal") return ifmt(iround(inum(g, "a") * inum(g, "b"), 2));
      const a = ifrac(inum(g, "n1"), inum(g, "d1"));
      const b = ifrac(inum(g, "n2"), inum(g, "d2"));
      const op = istr(g, "op");
      if (op === "mul") return ifracStr(a.n * b.n, a.d * b.d);
      if (op === "div") return ifracStr(a.n * b.d, a.d * b.n);
      const c = ifrac(inum(g, "n3"), inum(g, "d3"));
      const prod = ifrac(b.n * c.n, b.d * c.d); // b×c
      return ifracStr(a.n * prod.d + prod.n * a.d, a.d * prod.d);
    }
    case "SolvingSimpleEquations": {
      const kind = istr(g, "kind");
      if (kind === "add-dec") return ifmt(iround(inum(g, "b") - inum(g, "a"), 1));
      return ifmt(iround(inum(g, "b") / inum(g, "a"), 1));
    }
    case "TwoStepEquations": {
      return (inum(g, "c") - inum(g, "b")) / inum(g, "a");
    }
    case "SolvingInequalities": {
      const kind = istr(g, "kind");
      if (kind === "simple-inequality") {
        if (inum(g, "c") - inum(g, "a") !== inum(g, "boundary")) throw new Error("boundary mismatch");
        return `x ${istr(g, "dir")} ${inum(g, "boundary")}`;
      }
      if (Math.abs((inum(g, "c") + inum(g, "b")) / inum(g, "a") - inum(g, "boundary")) > 1e-9) {
        throw new Error("inequality boundary mismatch");
      }
      return `x ${istr(g, "dir")} ${inum(g, "boundary")}`;
    }
    case "WritingProblemSituations": {
      const kind = istr(g, "kind");
      if (kind === "write-add" || kind === "write-simple") return `n + ${inum(g, "a")} = ${inum(g, "total")}`;
      if (kind === "write-mul") return `${inum(g, "a")}n = ${inum(g, "total")}`;
      return (inum(g, "total") - inum(g, "fee")) / inum(g, "rate");
    }
    case "MeasuringAngles": {
      const angle = inum(g, "angle");
      const expected = angle < 90 ? "acute" : angle === 90 ? "right" : "obtuse";
      if (expected !== istr(g, "kind")) throw new Error("angle kind mismatch");
      return expected;
    }
    case "AnglePairs": {
      const pair = istr(g, "pair");
      const known = inum(g, "known");
      if (pair === "complementary") return `${90 - known}°`;
      if (pair === "supplementary") return `${180 - known}°`;
      return `${known}°`;
    }
    case "FindingMissingAngles": {
      const form = istr(g, "form");
      if (form === "equation") {
        return istr(g, "pair") === "complementary" ? `${90 - inum(g, "known")}°` : `${180 - inum(g, "known")}°`;
      }
      if (form === "around-point") return `${360 - inum(g, "a") - inum(g, "b") - inum(g, "c")}°`;
      const fx = inum(g, "x");
      return `${fx}° and ${fx + inum(g, "d")}°`;
    }
    case "TriangleAngleSum":
      return `${180 - inum(g, "a1") - inum(g, "a2")}°`;
    case "CircleParts": {
      if (istr(g, "asked") === "diameter") return `${2 * inum(g, "r")} cm`;
      return `${ifmt(inum(g, "d") / 2)} cm`;
    }
    case "CircumferenceAndArea": {
      if (istr(g, "kind") === "backward") return `${inum(g, "r")} cm`;
      if (istr(g, "wordKind") === "circle-area" || p.find === "the area") {
        const r = g.r !== undefined ? inum(g, "r") : inum(g, "d") / 2;
        const area = `${ifmt(iround(PI * r * r, 2))}`;
        return p.find === "the area" && istr(g, "wordKind") === "circle-area"
          ? `${area} square feet`
          : `${area} cm²`;
      }
      const d = inum(g, "d");
      const r = inum(g, "r");
      const val = inum(g, "useDiameter") === 1 ? PI * d : 2 * PI * r;
      return `${ifmt(iround(val, 2))} cm`;
    }
    case "SemicirclesAndQuarterCircles": {
      if (g.half !== undefined) return `${ifmt(inum(g, "fullArea") / 2)} cm²`;
      const full = iround(PI * inum(g, "r") * inum(g, "r"), 2);
      const fracNum = istr(g, "fraction") === "half" ? 0.5 : 0.25;
      return `${ifmt(iround(full * fracNum, 2))} cm²`;
    }
    case "CompositeFigures": {
      if (istr(g, "wordKind") === "garden") {
        return `${inum(g, "w1") * inum(g, "h1") - inum(g, "cutW") * inum(g, "cutH")} ft²`;
      }
      return `${inum(g, "w1") * inum(g, "h1") + inum(g, "w2") * inum(g, "h2")} m²`;
    }
    case "Nets":
      return `${6 * inum(g, "s") * inum(g, "s")} cm²`;
    case "PrismsSurfaceAreaVolume": {
      if (istr(g, "kind") === "bh") return `${inum(g, "B") * inum(g, "h")} cm³`;
      if (istr(g, "wordKind") === "gift-box") {
        const l = inum(g, "l"), w = inum(g, "w"), h = inum(g, "h");
        return `${2 * (l * w + l * h + w * h)} in²`;
      }
      return `${((inum(g, "base") * inum(g, "height")) / 2) * inum(g, "length")} cm³`;
    }
    case "PyramidsSurfaceAreaVolume": {
      if (istr(g, "kind") === "bh") return `${ifmt((inum(g, "B") * inum(g, "h")) / 3)} m³`;
      const s = inum(g, "s");
      if (g.slant !== undefined) return `${s * s + 2 * s * inum(g, "slant")} ft²`;
      return `${ifmt((s * s * inum(g, "h")) / 3)} m³`;
    }
    case "RatiosRates7": {
      if (g.q1 !== undefined) {
        const r1 = inum(g, "t1") / inum(g, "q1");
        const r2 = inum(g, "t2") / inum(g, "q2");
        const better = r1 < r2 ? "the first" : "the second";
        return `${better} bag ($${ifmt(Math.min(r1, r2))}/lb)`;
      }
      return `$${istr(g, "priceEach")} per pound`;
    }
    case "ProportionalRelationships": {
      if (istr(g, "wordKind") === "proportional") {
        return (inum(g, "total") / inum(g, "batches")) * inum(g, "target");
      }
      if (g.proportional !== undefined) {
        const pts = istr(g, "points").match(/\(([^)]+)\)/g)!.map((s) => s.slice(1, -1).split(",").map(Number));
        const ratios = pts.map(([x, y]) => y / x);
        const allEqual = ratios.every((r) => Math.abs(r - ratios[0]) < 1e-9);
        if ((allEqual ? 1 : 0) !== inum(g, "proportional")) throw new Error("proportionality mismatch");
        return allEqual ? "proportional" : "not proportional";
      }
      if (g.k !== undefined && g.findX !== undefined) return inum(g, "k") * inum(g, "findX");
      return istr(g, "k");
    }
    case "RepresentingLinearRelationships": {
      if (istr(g, "kind") === "read") return inum(g, "b");
      if (g.x !== undefined) return inum(g, "m") * inum(g, "x") + inum(g, "b");
      return `y = ${inum(g, "m")}x + ${inum(g, "b")}`;
    }
    case "Percents": {
      if (istr(g, "kind") === "percent-change") {
        const old = inum(g, "old");
        const nw = inum(g, "new");
        if (nw === old) throw new Error("percent-change with no change");
        const pct = Math.round((Math.abs(nw - old) / old) * 100);
        return `${pct}% ${nw > old ? "increase" : "decrease"}`;
      }
      if (istr(g, "wordKind") === "discount") {
        const discount = iround((inum(g, "pct") / 100) * inum(g, "price"), 2);
        return `$${ifmt(iround(inum(g, "price") - discount, 2))}`;
      }
      return ifmt(iround((inum(g, "pct") / 100) * inum(g, "total"), 2));
    }
    case "Sampling":
      if (g.sample !== undefined) return ifracStr(inum(g, "sample"), inum(g, "population"));
      return Math.round((inum(g, "sampleCount") / inum(g, "sampleSize")) * inum(g, "population"));
    case "ComparingPopulations": {
      const a = inum(g, "meanA");
      const b = inum(g, "meanB");
      const higher = a > b ? "Class A" : "Class B";
      if (istr(g, "kind") === "simple") return higher;
      return `${higher} by ${Math.abs(a - b)} points`;
    }
    case "ProbabilityConcepts": {
      if (g.kind !== undefined) {
        const kind = istr(g, "kind");
        if (kind === "complement-frac") return ifracStr(inum(g, "total") - inum(g, "fav"), inum(g, "total"));
        if (kind === "complement-pct") return `${100 - inum(g, "pct")}%`;
        throw new Error(`unhandled ProbabilityConcepts kind=${kind}`);
      }
      if (g.trials !== undefined) return ifracStr(inum(g, "success"), inum(g, "trials"));
      if (g.sectors !== undefined) {
        const sectors = istr(g, "sectors").split(",");
        const fav = sectors.filter((s) => s === istr(g, "target")).length;
        if (fav !== inum(g, "favorable")) throw new Error("spinner count mismatch");
        return ifracStr(fav, inum(g, "n"));
      }
      if (istr(g, "wordKind") === "probability" || g.win !== undefined) {
        return ifracStr(inum(g, "win"), inum(g, "total"));
      }
      const counts = istr(g, "counts").split(",").map(Number);
      return ifracStr(counts[inum(g, "idx")], inum(g, "total"));
    }
    case "CompoundEvents": {
      if (istr(g, "kind") === "simple") return ifracStr(1, inum(g, "d1") * inum(g, "d2"));
      if (istr(g, "kind") === "coin-die") return "1/12";
      if (istr(g, "wordKind") === "compound-draw") {
        return ifracStr(inum(g, "red") * inum(g, "blue"), inum(g, "total") * inum(g, "total"));
      }
      return ifracStr(inum(g, "r1") * inum(g, "r2"), inum(g, "t1") * inum(g, "t2"));
    }
    case "EconomicThinking": {
      if (istr(g, "kind") === "income-tax") {
        const tax = ((inum(g, "gross") - inum(g, "deduction")) * inum(g, "rate")) / 100;
        return `$${tax.toLocaleString("en-US")}`;
      }
      if (g.tax !== undefined) return `$${ifmt(inum(g, "price") + inum(g, "tax"))}`;
      if (g.income !== undefined) {
        return `$${(inum(g, "income") - inum(g, "rent") - inum(g, "food") - inum(g, "other")).toLocaleString("en-US")}`;
      }
      const tax = iround((inum(g, "price") * inum(g, "rate")) / 100, 2);
      const total = iround(inum(g, "price") + tax, 2);
      return `tax $${ifmt(tax)}, total $${ifmt(total)}`;
    }
    case "PercentsBeyond100":
      return ifmt(iround((inum(g, "pct") / 100) * inum(g, "total"), 2));
    case "PercentError":
      if (istr(g, "kind") === "amount") return `${inum(g, "measured") - inum(g, "actual")} units`;
      return `${Math.round(((inum(g, "measured") - inum(g, "actual")) / inum(g, "actual")) * 100)}%`;
    case "ExpandingAndFactoring": {
      if (g.g !== undefined) return `${inum(g, "g")}(${inum(g, "b")}x + ${inum(g, "c")})`;
      const neg = inum(g, "neg") === 1;
      return `${inum(g, "a") * inum(g, "b")}x ${neg ? "−" : "+"} ${inum(g, "a") * inum(g, "c")}`;
    }
    case "DistributiveEquations":
      if (istr(g, "kind") === "first-step") return `${inum(g, "a")}x + ${inum(g, "a") * inum(g, "b")} = ${inum(g, "c")}`;
      return inum(g, "c") / inum(g, "a") - inum(g, "b");
    case "MultiStepInequalities":
      return `x ${istr(g, "dir")} ${inum(g, "boundary")}`;
    case "SimilarFigures7": {
      const kind = istr(g, "kind");
      if (kind === "scale-factor") return ifracStr(inum(g, "sideB"), inum(g, "sideA"));
      if (kind === "missing-side") {
        const v = (inum(g, "side1") * inum(g, "known2")) / inum(g, "known1");
        if (!Number.isInteger(v)) throw new Error("missing side not an integer");
        return v;
      }
      if (kind === "scale-drawing") return `${ifmt(inum(g, "map") * inum(g, "per"))} ${istr(g, "unit")}`;
      if (kind === "area-scale") {
        const s1 = inum(g, "side1");
        const s2 = inum(g, "side2");
        const a2 = (inum(g, "area1") * s2 * s2) / (s1 * s1);
        if (Math.abs(a2 - Math.round(a2)) > 1e-9) throw new Error("scaled area not an integer");
        return `${ifmt(a2)} cm²`;
      }
      throw new Error(`unhandled SimilarFigures7 kind=${kind}`);
    }
    case "ConversionsBetweenSystems": {
      const kind = istr(g, "kind");
      const v = inum(g, "value");
      const dir = istr(g, "dir");
      if (kind === "in-cm") return dir === "to-cm" ? `${ifmt(iround(v * 2.54, 2))} cm` : `${ifmt(iround(v / 2.54, 2))} inches`;
      if (kind === "mi-km") return dir === "to-km" ? `about ${ifmt(iround(v * 1.61, 2))} km` : `about ${ifmt(iround(v / 1.61, 2))} miles`;
      if (kind === "gal-L") return dir === "to-L" ? `about ${ifmt(iround(v * 3.79, 2))} liters` : `about ${ifmt(iround(v / 3.79, 2))} gallons`;
      if (kind === "lb-kg") return dir === "to-kg" ? `about ${ifmt(iround(v * 0.45, 2))} kg` : `about ${ifmt(iround(v / 0.45, 2))} pounds`;
      if (kind === "m-yd") return dir === "to-yd" ? `about ${ifmt(iround(v * 1.09, 2))} yards` : `about ${ifmt(iround(v / 1.09, 2))} meters`;
      if (kind === "ft-cm") return `${ifmt(iround(v * 12 * 2.54, 2))} cm`;
      throw new Error(`unhandled ConversionsBetweenSystems kind=${kind}`);
    }
    case "Interest7": {
      const kind = istr(g, "kind");
      const P = inum(g, "P");
      const r = inum(g, "r");
      const t = inum(g, "t");
      if (kind === "simple") return `$${((P * r * t) / 100).toFixed(2)}`;
      if (kind === "simple-balance") return `$${(P + (P * r * t) / 100).toFixed(2)}`;
      if (kind === "compound") return `$${iround(P * Math.pow(1 + r / 100, t), 2).toFixed(2)}`;
      if (kind === "compare-simple-compound") {
        const diff = P * Math.pow(1 + r / 100, t) - P - (P * r * t) / 100;
        return `$${iround(diff, 2).toFixed(2)}`;
      }
      throw new Error(`unhandled Interest7 kind=${kind}`);
    }
    case "NetWorth7": {
      const kind = istr(g, "kind");
      if (kind === "classify") {
        const table: Record<string, string> = {
          "a house": "asset",
          "a car": "asset",
          "money in a savings account": "asset",
          "a jewelry collection": "asset",
          "an investment account": "asset",
          "furniture and electronics": "asset",
          "a mortgage": "liability",
          "a credit card balance": "liability",
          "a student loan": "liability",
          "a car loan": "liability",
          "a personal loan": "liability",
          "money owed on a store credit card": "liability",
        };
        const expected = table[istr(g, "item")];
        if (expected === undefined) throw new Error(`unknown net-worth item ${istr(g, "item")}`);
        if (expected !== istr(g, "expected")) throw new Error("net-worth classify mismatch");
        return expected;
      }
      if (kind === "net-worth") {
        const sum = (csv: string) => csv.split(",").map(Number).reduce((a, b) => a + b, 0);
        return `$${(sum(istr(g, "assets")) - sum(istr(g, "liabilities"))).toLocaleString("en-US")}`;
      }
      if (kind === "nw-change") {
        const ev = istr(g, "event");
        const amt = inum(g, "amount");
        let d: number;
        if (ev === "payoff" || ev === "asset-gain") d = amt;
        else if (ev === "asset-drop" || ev === "new-debt-spent") d = -amt;
        else throw new Error(`unknown nw-change event ${ev}`);
        return `$${(inum(g, "start") + d).toLocaleString("en-US")}`;
      }
      throw new Error(`unhandled NetWorth7 kind=${kind}`);
    }
    case "FamilyBudgets7": {
      const kind = istr(g, "kind");
      const cats = () => inum(g, "rent") + inum(g, "food") + inum(g, "utilities") + inum(g, "transport") + inum(g, "other");
      if (kind === "expense-total") return `$${cats().toLocaleString("en-US")}`;
      if (kind === "min-income") return `$${(cats() + inum(g, "savings")).toLocaleString("en-US")}`;
      if (kind === "hourly-wage") return `$${ifmt(inum(g, "monthly") / (4 * inum(g, "hoursPerWeek")))} per hour`;
      if (kind === "category-percent") return `${Math.round((inum(g, "amount") / inum(g, "income")) * 100)}%`;
      throw new Error(`unhandled FamilyBudgets7 kind=${kind}`);
    }
    case "ReadingGraphs7": {
      const kind = istr(g, "kind");
      if (kind === "circle-percent") return `${Math.round((inum(g, "count") / inum(g, "total")) * 100)}%`;
      if (kind === "circle-count") return (inum(g, "pct") * inum(g, "total")) / 100;
      if (kind === "compare-cats") {
        const counts = istr(g, "counts").split(",").map(Number);
        const i = inum(g, "i");
        const j = inum(g, "j");
        if (istr(g, "mode") === "diff") {
          if (counts[i] <= counts[j]) throw new Error("compare-cats diff not positive");
          return counts[i] - counts[j];
        }
        return ifracStr(counts[i], counts[j]);
      }
      if (kind === "dot-median" || kind === "dot-mode") {
        const vals = istr(g, "data").split(",").map(Number).sort((a, b) => a - b);
        if (kind === "dot-median") {
          const n = vals.length;
          const med = n % 2 === 1 ? vals[Math.floor(n / 2)] : (vals[n / 2 - 1] + vals[n / 2]) / 2;
          return ifmt(med);
        }
        const freq = new Map<number, number>();
        for (const v of vals) freq.set(v, (freq.get(v) ?? 0) + 1);
        let best = -1;
        let modeVal = vals[0];
        for (const [v, c] of freq) {
          if (c > best) {
            best = c;
            modeVal = v;
          }
        }
        return modeVal;
      }
      throw new Error(`unhandled ReadingGraphs7 kind=${kind}`);
    }
    case "NumberSets7": {
      const kind = istr(g, "kind");
      const levelOf = (text: string): string => {
        if (text.includes("...")) return "rational";
        if (text.includes("/")) {
          const parts = text.split("/");
          const n = Number(parts[0]);
          const d = Number(parts[1]);
          if (n % d !== 0) return "rational";
          const v = n / d;
          return v > 0 ? "natural" : v === 0 ? "whole" : "integer";
        }
        if (text.includes(".")) return "rational";
        const v = Number(text);
        return v > 0 ? "natural" : v === 0 ? "whole" : "integer";
      };
      const label: Record<string, string> = {
        natural: "natural number",
        whole: "whole number",
        integer: "integer",
        rational: "rational number",
      };
      if (kind === "classify-set") return label[levelOf(istr(g, "value"))];
      if (kind === "subset-statement") {
        const table: Record<string, string> = {
          "Every integer is a rational number": "true",
          "Every rational number is an integer": "false",
          "Every whole number is a natural number": "false",
          "Every natural number is a whole number": "true",
          "Every integer is a whole number": "false",
          "Every whole number is an integer": "true",
          "Every rational number is a whole number": "false",
          "Every natural number is a rational number": "true",
          "Every natural number is an integer": "true",
          "Every integer is a natural number": "false",
        };
        const expected = table[istr(g, "statement")];
        if (expected === undefined) throw new Error(`unknown subset statement ${istr(g, "statement")}`);
        return expected;
      }
      if (kind === "all-sets") {
        const lv = levelOf(istr(g, "value"));
        if (lv === "natural") return "natural number, whole number, integer, rational number";
        if (lv === "whole") return "whole number, integer, rational number";
        if (lv === "integer") return "integer, rational number";
        return "rational number";
      }
      if (kind === "count-in-set") {
        const set = istr(g, "set");
        const vals = istr(g, "values").split(",");
        return vals.filter((v) => {
          const lv = levelOf(v);
          if (set === "natural numbers") return lv === "natural";
          if (set === "whole numbers") return lv === "natural" || lv === "whole";
          return lv !== "rational";
        }).length;
      }
      throw new Error(`unhandled NumberSets7 kind=${kind}`);
    }
    default:
      throw new Error(`unhandled grade-7 subtype ${(p as { subtype: string }).subtype}`);
  }
}

// ── Grade 8 ───────────────────────────────────────────────────────────────────

function recompute8(p: MiddleSchoolProblem): string | number {
  const g = p.given;
  switch (p.subtype) {
    case "LinearEquations": {
      const kind = istr(g, "kind");
      if (kind === "both-sides") return (inum(g, "d") - inum(g, "b")) / (inum(g, "a") - inum(g, "c"));
      if (kind === "distributive-both") {
        return (inum(g, "d") - inum(g, "a") * inum(g, "b")) / (inum(g, "a") - inum(g, "c"));
      }
      if (kind === "no-solution") return "no solution";
      if (kind === "infinite") return "infinitely many solutions";
      if (istr(g, "wordKind") === "plans") {
        return ifmt((inum(g, "feeA") - inum(g, "feeB")) / (inum(g, "rateB") - inum(g, "rateA")));
      }
      throw new Error(`unhandled LinearEquations kind=${kind}`);
    }
    case "Functions": {
      if (istr(g, "wordKind") === "function-eval") return `$${inum(g, "rate") * inum(g, "x") + inum(g, "base")}`;
      if (g.nonlinear !== undefined) return inum(g, "nonlinear") === 1 ? "nonlinear" : "linear";
      if (g.isFunction !== undefined) {
        const pts = istr(g, "points").match(/\(([^)]+)\)/g)!.map((s) => s.slice(1, -1).split(",").map(Number));
        const seen = new Map<number, number>();
        let isFunc = true;
        for (const [x, y] of pts) {
          if (seen.has(x) && seen.get(x) !== y) isFunc = false;
          seen.set(x, y);
        }
        if ((isFunc ? 1 : 0) !== inum(g, "isFunction")) throw new Error("function check mismatch");
        return isFunc ? "function" : "not a function";
      }
      return inum(g, "m1") > inum(g, "m2") ? "the table" : "the equation";
    }
    case "SystemsOfEquations": {
      if (istr(g, "wordKind") === "system-purchase") {
        const p0 = inum(g, "p0"), n0 = inum(g, "n0");
        if (2 * p0 + n0 !== inum(g, "t1") || p0 + 2 * n0 !== inum(g, "t2")) throw new Error("system totals mismatch");
        return `pen = $${p0}, notebook = $${n0}`;
      }
      if (istr(g, "kind") === "interpret") {
        return `Both stores charge $${inum(g, "sy")} for ${inum(g, "sx")} ${istr(g, "item")}`;
      }
      const sx = inum(g, "sx"), sy = inum(g, "sy");
      if (inum(g, "b1") !== sy - sx || inum(g, "b2") !== sy + sx) throw new Error("system line mismatch");
      return `(${sx}, ${sy})`;
    }
    case "PythagoreanTheorem": {
      const kind = istr(g, "kind");
      if (istr(g, "wordKind") === "ladder") {
        if (inum(g, "leg1") ** 2 + inum(g, "leg2") ** 2 !== inum(g, "hyp") ** 2) {
          throw new Error("ladder triple mismatch");
        }
        return `${inum(g, "leg2")} feet`;
      }
      if (kind === "hypotenuse" || kind === "leg") {
        const leg = kind === "hypotenuse" ? inum(g, "c") : inum(g, "leg");
        const a = kind === "hypotenuse" ? inum(g, "a") : inum(g, "other");
        const b = kind === "hypotenuse" ? inum(g, "b") : inum(g, "other");
        void a;
        if (kind === "hypotenuse" && inum(g, "a") ** 2 + inum(g, "b") ** 2 !== leg ** 2) {
          throw new Error("triple mismatch");
        }
        if (kind === "leg" && leg ** 2 + b ** 2 !== inum(g, "c") ** 2) throw new Error("triple mismatch");
        return kind === "hypotenuse" ? leg : inum(g, "leg");
      }
      if (kind === "distance") {
        const dx = Math.abs(inum(g, "x2") - inum(g, "x1"));
        const dy = Math.abs(inum(g, "y2") - inum(g, "y1"));
        if (dx !== inum(g, "dx") || dy !== inum(g, "dy")) throw new Error("delta mismatch");
        if (dx ** 2 + dy ** 2 !== inum(g, "dist") ** 2) throw new Error("distance triple mismatch");
        return inum(g, "dist");
      }
    }
    case "Transformations": {
      const kind = istr(g, "kind");
      if (kind === "translation") {
        if (inum(g, "nx") !== inum(g, "x") + inum(g, "dx") || inum(g, "ny") !== inum(g, "y") + inum(g, "dy")) {
          throw new Error("translation mismatch");
        }
        return `(${inum(g, "nx")}, ${inum(g, "ny")})`;
      }
      if (kind === "reflection") {
        const x = inum(g, "x"), y = inum(g, "y");
        const [ex, ey] = istr(g, "axis") === "x-axis" ? [x, -y] : [-x, y];
        if (ex !== inum(g, "nx") || ey !== inum(g, "ny")) throw new Error("reflection mismatch");
        return `(${inum(g, "nx")}, ${inum(g, "ny")})`;
      }
      if (kind === "rotation") {
        const x = inum(g, "x"), y = inum(g, "y");
        const dir = istr(g, "dir");
        const [ex, ey] = dir === "90° clockwise" ? [y, -x] : dir === "90° counterclockwise" ? [-y, x] : [-x, -y];
        if (ex !== inum(g, "nx") || ey !== inum(g, "ny")) throw new Error("rotation mismatch");
        return `(${inum(g, "nx")}, ${inum(g, "ny")})`;
      }
      if (kind === "describe") {
        const dx = inum(g, "dx"), dy = inum(g, "dy");
        return `translation ${dx > 0 ? `${dx} units right` : `${Math.abs(dx)} units left`} and ${dy > 0 ? `${dy} units up` : `${Math.abs(dy)} units down`}`;
      }
      // sequence word
      if (inum(g, "nx") !== -inum(g, "x") || inum(g, "ny") !== inum(g, "y") - 3) throw new Error("sequence mismatch");
      return `(${inum(g, "nx")}, ${inum(g, "ny")})`;
    }
    case "ScientificNotation": {
      if (istr(g, "wordKind") === "sci-distance") return `${inum(g, "coeff")} × 10^${inum(g, "exp")}`;
      if (g.bigger !== undefined) {
        const m = Math.max(inum(g, "c1"), inum(g, "c2"));
        return `${ifmt(m)} × 10^${inum(g, "exp")}`;
      }
      if (istr(g, "dir") === "big" || istr(g, "dir") === "small") {
        return ifmt(inum(g, "coeff") * 10 ** inum(g, "exp"));
      }
      return `${istr(g, "coeff")} × 10^${inum(g, "exp")}`;
    }
    case "Volume3D": {
      const r = inum(g, "r");
      const shape = istr(g, "shape");
      if (shape === "cylinder" || istr(g, "wordKind") === "can") {
        const h = inum(g, "h");
        const v = `${ifmt(iround(PI * r * r * h, 2))}`;
        return istr(g, "wordKind") === "can" ? `${v} cubic inches` : `${v} cm³`;
      }
      if (shape === "cone") return `${ifmt(iround((PI * r * r * inum(g, "h")) / 3, 2))} in³`;
      return `${ifmt(iround((4 / 3) * PI * r ** 3, 2))} ft³`;
    }
    case "ScatterPlots": {
      if (g.trend !== undefined && istr(g, "wordKind") !== "scatter-interpret") {
        const trend = istr(g, "trend");
        return trend === "positive" ? "positive association" : trend === "negative" ? "negative association" : "no association";
      }
      if (istr(g, "wordKind") === "scatter-interpret") {
        return istr(g, "trend") === "positive"
          ? "As temperature increases, ice cream sales increase (positive association)."
          : "As the number of absences increases, grades decrease (negative association).";
      }
      return `$${inum(g, "slope") * inum(g, "x") + inum(g, "intercept")}`;
    }
    case "SlopeRateOfChange": {
      const kind = istr(g, "kind");
      if (kind === "table") {
        const pts = istr(g, "table").match(/\(([^)]+)\)/g)!.map((t) => t.slice(1, -1).split(",").map(Number));
        const [x1, y1] = pts[0];
        const [x2, y2] = pts[pts.length - 1];
        const m = (y2 - y1) / (x2 - x1);
        if (m !== inum(g, "m")) throw new Error("table slope mismatch");
        return m;
      }
      if (kind === "points") {
        const m = (inum(g, "y2") - inum(g, "y1")) / (inum(g, "x2") - inum(g, "x1"));
        if (!Number.isInteger(m)) throw new Error("points slope not an integer");
        return m;
      }
      if (kind === "graph") {
        if (inum(g, "m") === 0) throw new Error("graph slope cannot be zero");
        return `m = ${inum(g, "m")}, b = ${inum(g, "b")}`;
      }
      if (kind === "unit-rate") return ifmt(inum(g, "total") / inum(g, "count"));
      if (kind === "write-eq") {
        const m = inum(g, "m"), b = inum(g, "b");
        if (b === 0) return `y = ${m}x`;
        return b > 0 ? `y = ${m}x + ${b}` : `y = ${m}x − ${-b}`;
      }
      throw new Error(`unhandled SlopeRateOfChange kind=${kind}`);
    }
    case "IrrationalNumbers": {
      const kind = istr(g, "kind");
      if (kind === "bracket") {
        const n = inum(g, "n");
        const lo = Math.floor(Math.sqrt(n));
        if (!(lo * lo < n && n < (lo + 1) * (lo + 1))) throw new Error("bracket bounds wrong");
        return `${lo} < √${n} < ${lo + 1}`;
      }
      if (kind === "classify") {
        const table: Record<string, string> = {
          "π": "irrational",
          "√7": "irrational",
          "√13": "irrational",
          "0.12112111211112… (the pattern of 1s keeps growing)": "irrational",
          "−4": "rational",
          "3/4": "rational",
          "0.666… (the 6 repeats forever)": "rational",
          "−1.25": "rational",
          "√16": "rational",
          "22/7": "rational",
        };
        const expected = table[istr(g, "label")];
        if (expected === undefined) throw new Error(`unknown classify label ${istr(g, "label")}`);
        if (expected !== istr(g, "expected")) throw new Error("classify kind mismatch");
        return expected;
      }
      if (kind === "approx") return ifmt(iround(Math.sqrt(inum(g, "n")), 1));
      if (kind === "order") {
        const labels = istr(g, "labels").split(",");
        const values = istr(g, "values").split(",").map(Number);
        if (labels.length !== values.length) throw new Error("order payload mismatch");
        const pairs = labels.map((label, i) => ({ label, val: values[i] }));
        pairs.sort((a, b) => a.val - b.val);
        return pairs.map((x) => x.label).join(" < ");
      }
      throw new Error(`unhandled IrrationalNumbers kind=${kind}`);
    }
    case "MeanAbsoluteDeviation": {
      const madFrom = (csv: string) => {
        const vals = csv.split(",").map(Number);
        const mean = vals.reduce((s2, v) => s2 + v, 0) / vals.length;
        return vals.reduce((s2, v) => s2 + Math.abs(v - mean), 0) / vals.length;
      };
      const kind = istr(g, "kind");
      if (kind === "mad") return ifmt(iround(madFrom(istr(g, "data")), 2));
      if (kind === "mad-tenth") return ifmt(iround(madFrom(istr(g, "data")), 1));
      if (kind === "compare-mad") {
        const madA = madFrom(istr(g, "dataA"));
        const madB = madFrom(istr(g, "dataB"));
        return madB >= madA ? "Set B" : "Set A";
      }
      throw new Error(`unhandled MeanAbsoluteDeviation kind=${kind}`);
    }
    case "SurfaceArea8": {
      const kind = istr(g, "kind");
      if (kind === "rect-prism") {
        const l = inum(g, "l"), w = inum(g, "w"), h = inum(g, "h");
        return `${2 * (l * w + l * h + w * h)} cm²`;
      }
      if (kind === "cylinder-total") {
        const r = inum(g, "r"), h = inum(g, "h");
        return `${ifmt(iround(2 * PI * r * r + 2 * PI * r * h, 2))} cm²`;
      }
      if (kind === "tri-prism") {
        const a = inum(g, "a"), b = inum(g, "b"), c = inum(g, "c"), L = inum(g, "L");
        if (a * a + b * b !== c * c) throw new Error("tri-prism legs are not a right triangle");
        return `${a * b + (a + b + c) * L} cm²`;
      }
      if (kind === "cylinder-lateral") {
        const r = inum(g, "r"), h = inum(g, "h");
        return `${ifmt(iround(2 * PI * r * h, 2))} cm²`;
      }
      throw new Error(`unhandled SurfaceArea8 kind=${kind}`);
    }
    case "InterestAndCredit": {
      const kind = istr(g, "kind");
      if (kind === "simple") return `$${((inum(g, "P") * inum(g, "r") * inum(g, "t")) / 100).toFixed(2)}`;
      if (kind === "simple-balance") {
        const P = inum(g, "P");
        return `$${(P + (P * inum(g, "r") * inum(g, "t")) / 100).toFixed(2)}`;
      }
      if (kind === "compound") {
        const A = inum(g, "P") * Math.pow(1 + inum(g, "r") / 100, inum(g, "t"));
        return `$${iround(A, 2).toFixed(2)}`;
      }
      if (kind === "compare-loans") {
        const P = inum(g, "P");
        const IA = (P * inum(g, "rA") * inum(g, "tA")) / 100;
        const IB = (P * inum(g, "rB") * inum(g, "tB")) / 100;
        if (IA === IB) throw new Error("compare-loans tie");
        return IB > IA ? "Loan B" : "Loan A";
      }
      throw new Error(`unhandled InterestAndCredit kind=${kind}`);
    }
    case "TransversalsSimilarity": {
      const kind = istr(g, "kind");
      if (kind === "transversal") {
        const a = inum(g, "angle");
        const rel = istr(g, "relation");
        if (rel === "equal") return a;
        if (rel === "supplementary") return 180 - a;
        throw new Error(`bad transversal relation ${rel}`);
      }
      if (kind === "exterior-angle") {
        const ext = inum(g, "r1") + inum(g, "r2");
        if (ext >= 180) throw new Error("remote interiors sum too large");
        return ext;
      }
      if (kind === "aa-similarity") {
        const a = inum(g, "a"), b = inum(g, "b");
        if (a + b >= 180) throw new Error("triangle angles impossible");
        return 180 - a - b;
      }
      if (kind === "transversal-algebra") {
        const m = inum(g, "m"), c = inum(g, "c");
        const partner = inum(g, "partner");
        const target = istr(g, "relation") === "equal" ? partner : 180 - partner;
        const x = (target - c) / m;
        if (!Number.isInteger(x) || x <= 0) throw new Error("algebra x not a positive integer");
        const A = m * x + c;
        if (A !== target) throw new Error("algebra angle mismatch");
        return `x = ${x}, angle = ${A}°`;
      }
      throw new Error(`unhandled TransversalsSimilarity kind=${kind}`);
    }
    case "DilationsCoordinate": {
      const kind = istr(g, "kind");
      if (kind === "dilate-point") {
        const x = inum(g, "x"), y = inum(g, "y"), kn = inum(g, "kn"), kd = inum(g, "kd");
        if ((x * kn) % kd !== 0 || (y * kn) % kd !== 0) throw new Error("dilation image not integral");
        return `(${(x * kn) / kd}, ${(y * kn) / kd})`;
      }
      if (kind === "find-k") {
        const x = inum(g, "x"), y = inum(g, "y"), ix = inum(g, "ix"), iy = inum(g, "iy");
        if (x === 0 || y === 0) throw new Error("find-k zero preimage coordinate");
        const kx = ifracStr(ix, x);
        const ky = ifracStr(iy, y);
        if (kx !== ky) throw new Error("find-k inconsistent ratios");
        return kx;
      }
      if (kind === "effect-length") {
        const len = inum(g, "len"), kn = inum(g, "kn"), kd = inum(g, "kd");
        if ((len * kn) % kd !== 0) throw new Error("effect-length not integral");
        return (len * kn) / kd;
      }
      if (kind === "effect-area") {
        const kn = inum(g, "kn"), kd = inum(g, "kd");
        let area: number;
        if (istr(g, "shape") === "rectangle") {
          area = inum(g, "w") * inum(g, "h");
        } else {
          const prod = inum(g, "b") * inum(g, "h");
          if (prod % 2 !== 0) throw new Error("triangle base times height is odd");
          area = prod / 2;
        }
        const scaled = (area * kn * kn) / (kd * kd);
        if (!Number.isInteger(scaled)) throw new Error("effect-area not integral");
        return scaled;
      }
      throw new Error(`unhandled DilationsCoordinate kind=${kind}`);
    }
    case "PropVsNonProp": {
      const kind = istr(g, "kind");
      if (kind === "classify-eq") {
        const eq = istr(g, "equation");
        if (eq.includes("x²")) return "not linear";
        const rhs = eq.replace(/^y = /, "");
        const m = rhs.match(/^(-?[\d.]+)x(?: ([+−]) (\d+))?$/);
        if (!m) throw new Error(`unparsable equation ${eq}`);
        if (m[2] === undefined) return "proportional";
        if (Number(m[3]) === 0) throw new Error("zero constant term in mxb form");
        return "non-proportional";
      }
      if (kind === "classify-table") {
        const pts = istr(g, "table").match(/\(([^)]+)\)/g)!.map((t) => t.slice(1, -1).split(",").map(Number));
        const sample = pts.find((pt) => pt[0] !== 0);
        if (!sample) throw new Error("table has no nonzero x");
        const k = sample[1] / sample[0];
        const prop = pts.every(([px, py]) => py === k * px);
        return prop ? "proportional" : "non-proportional";
      }
      if (kind === "direct-variation") {
        const k = inum(g, "y1") / inum(g, "x1");
        return istr(g, "ask") === "k" ? k : k * inum(g, "x2");
      }
      if (kind === "classify-situation") {
        if (inum(g, "rate") <= 0) throw new Error("situation rate must be positive");
        return inum(g, "fee") === 0 ? "proportional" : "non-proportional";
      }
      throw new Error(`unhandled PropVsNonProp kind=${kind}`);
    }
    case "CollegeCosts": {
      const kind = istr(g, "kind");
      if (kind === "total-cost") return `$${(inum(g, "yearly") * inum(g, "years")).toFixed(2)}`;
      if (kind === "savings-needed") {
        const goal = inum(g, "goal"), contribution = inum(g, "contribution");
        if (contribution >= goal) throw new Error("contribution must be less than the goal");
        return `$${(goal - contribution).toFixed(2)}`;
      }
      if (kind === "monthly-savings") {
        const amount = inum(g, "amount"), months = inum(g, "months");
        if (amount % months !== 0) throw new Error("monthly savings not a whole dollar amount");
        return `$${(amount / months).toFixed(2)}`;
      }
      if (kind === "compare-paths") {
        const mA = (inum(g, "totalA") - inum(g, "contribA")) / inum(g, "monthsA");
        const mB = (inum(g, "totalB") - inum(g, "contribB")) / inum(g, "monthsB");
        if (!Number.isInteger(mA) || !Number.isInteger(mB)) throw new Error("compare-paths monthly not integral");
        if (mA === mB) throw new Error("compare-paths tie");
        return mA < mB ? "Plan A" : "Plan B";
      }
      throw new Error(`unhandled CollegeCosts kind=${kind}`);
    }
    case "WriteTheProblem8": {
      const kind = istr(g, "kind");
      if (kind === "match") {
        const a = inum(g, "a"), b = inum(g, "b"), c = inum(g, "c"), d = inum(g, "d");
        if (a === c || (d - b) % (a - c) !== 0 || (d - b) / (a - c) <= 0) {
          throw new Error("match equation has no positive integer solution");
        }
        const opts = istr(g, "options").split("|").map((s) => s.split(",").map(Number));
        const idx = opts.findIndex((o) => o[0] === a && o[1] === b && o[2] === c && o[3] === d);
        if (idx === -1) throw new Error("match: correct option missing from options");
        if (idx !== inum(g, "correctIndex")) throw new Error("match: correctIndex mismatch");
        return "ABC"[idx];
      }
      if (kind === "write-eq-both") {
        const a = inum(g, "a"), b = inum(g, "b"), c = inum(g, "c"), d = inum(g, "d");
        if (a === c) throw new Error("write-eq-both: equal coefficients");
        const x = (d - b) / (a - c);
        if (!Number.isInteger(x) || x <= 0) throw new Error("write-eq-both: solution not a positive integer");
        const side = (coef: number, konst: number): string => {
          const t = coef === 1 ? "x" : `${coef}x`;
          if (konst === 0) return t;
          return konst > 0 ? `${t} + ${konst}` : `${t} − ${-konst}`;
        };
        return `${side(a, b)} = ${side(c, d)}`;
      }
      throw new Error(`unhandled WriteTheProblem8 kind=${kind}`);
    }
    default:
      throw new Error(`unhandled grade-8 subtype ${(p as { subtype: string }).subtype}`);
  }
}

/**
 * Independently recompute the expected answer for any middle-school problem.
 * Throws if the (type, subtype, given) combination is not handled.
 */
export function recomputeAnswer(p: MiddleSchoolProblem): string | number {
  if (p.type === "MS.6") return recompute6(p);
  if (p.type === "MS.7") return recompute7(p);
  if (p.type === "MS.8") return recompute8(p);
  throw new Error(`unknown type ${(p as { type: string }).type}`);
}
