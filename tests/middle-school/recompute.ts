// recompute.ts
// INDEPENDENT answer verification for middle-school problems.
// Recomputes the expected answer from `given` using fresh implementations
// (own gcd/fraction/rounding — not the generator's code path) and returns it
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
