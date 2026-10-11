// rt-verify6.ts — Middle school: NO verify payloads; parse prompts, recompute, compare.
import { CURRICULUM_REGISTRY } from "@/modules/CurriculumRegistry";
import { failures, fail, counter, report } from "./util";

const bump = (n = 1) => { counter.checks += n; };
const eq = (a: number, b: number, t = 1e-9) => Math.abs(a - b) < t;
const byId = (id: string) => CURRICULUM_REGISTRY.find((e) => e.id === id)!;
const cov = new Map<string, { ok: number; skip: number }>();
const mark = (tag: string, ok: boolean) => {
  const c = cov.get(tag) ?? { ok: 0, skip: 0 };
  ok ? c.ok++ : c.skip++;
  cov.set(tag, c);
};
// normalize unicode math to ascii
const N = (s: string) => String(s).replace(/−/g, "-").replace(/×/g, "*").replace(/÷/g, "/").replace(/°/g, "").replace(/\s+/g, "");
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
function gen(id: string, seed: number): any[] {
  const diff = Number(process.env.DIFF ?? 2);
  return byId(id).generate("Test", seed, { count: 3, difficulty: diff }) as any[];
}
const numAns = (a: unknown): number => Number(String(a).replace(/[^0-9.\-]/g, ""));

// ── DecimalFluency / IntegerOperations: "Find: 5.32 * 9.8." ────────────────
for (const [id, tag] of [["ms6-1-2-decimal-fluency", "DEC"], ["ms6-2-1-integer-operations", "INT"]] as const) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    bump();
    const nc = N(p.prompt);
    // variants: "Find: 5.32 * 9.8.", "Find: -8/(2).", "Find: 3-(-2)."
    const m = nc.match(/Find:(-?[\d.]+)([+\-*/])\(?(-?[\d.]+)\)?\./);
    if (m) {
      mark(tag, true);
      const [a, op, b] = [Number(m[1]), m[2], Number(m[3])];
      const mine = op === "+" ? a + b : op === "-" ? a - b : op === "*" ? a * b : a / b;
      if (!eq(numAns(p.answer), mine, 1e-9))
        fail("MS-ARITH", id, "Test", s, `${a}${op}${b}: mine=${mine} answer="${p.answer}"`);
      continue;
    }
    // "Order the integers from least to greatest: 12,-1,-9,-2."
    const mo = nc.match(/Ordertheintegersfromleasttogreatest:([-\d.,]+)\./);
    if (mo) {
      mark(tag, true);
      const want = mo[1].split(",").map(Number).sort((a, b) => a - b).join(",");
      if (N(p.answer) !== want)
        fail("MS-ARITH", id, "Test", s, `order: mine=${want} answer="${p.answer}"`);
      continue;
    }
    // "Compare: 4___-6. Write <,>,or=."
    const mc = nc.match(/Compare:(-?[\d.]+)___(-?[\d.]+)\./);
    if (mc) {
      mark(tag, true);
      const [a, b] = [Number(mc[1]), Number(mc[2])];
      const want = a < b ? "<" : a > b ? ">" : "=";
      if (!String(p.answer).includes(want))
        fail("MS-ARITH", id, "Test", s, `compare ${a} vs ${b}: mine=${want} answer="${p.answer}"`);
      continue;
    }
    mark(tag, false);
  }
}

// ── rational add/sub/mul/div ────────────────────────────────────────────────
for (const id of ["ms7-1-2-add-subtract-rational", "ms7-1-3-multiply-divide-rational"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "RAT";
    bump();
    // normalize unicode minus but KEEP ÷ distinct from fraction "/"
    const raw = String(p.prompt).replace(/−/g, "-").replace(/\s+/g, "");
    // expression sits between "Find:" and ". Write" (e.g. "Find: 3/2 + 5/2 × 3/2. Write ...")
    const em = raw.match(/Find:(.+?)\.(?:Write|$)/);
    if (!em) { mark(tag, false); continue; }
    // proper tokenizer + shunting-yard: correct precedence, no sign/operator ambiguity
    const evalRational = (expr: string): number => {
      const s = expr; // keep × ÷ distinct from fraction "/"
      const values: number[] = [];
      const ops: string[] = [];
      const apply = () => {
        const op = ops.pop()!;
        const b = values.pop()!;
        const a = values.pop()!;
        values.push(op === "+" ? a + b : op === "-" ? a - b : op === "*" || op === "×" ? a * b : a / b);
      };
      const prec = (op: string) => (op === "+" || op === "-") ? 1 : 2;
      let i = 0;
      let expectOperand = true;
      while (i < s.length) {
        const ch = s[i];
        if (/\s/.test(ch)) { i++; continue; }
        if (expectOperand) {
          if (ch === "(") { ops.push(ch); i++; continue; }
          const m = s.slice(i).match(/^([+-]?)(\d+(?:\.\d+)?)(?:\/(\d+(?:\.\d+)?))?/);
          if (!m) throw new Error("bad operand: " + s.slice(i));
          let v = Number(m[2]);
          if (m[3] !== undefined) v = v / Number(m[3]);
          if (m[1] === "-") v = -v;
          values.push(v);
          i += m[0].length;
          expectOperand = false;
        } else {
          if (ch === ")") {
            while (ops.length && ops[ops.length - 1] !== "(") apply();
            ops.pop(); i++; continue;
          }
          if ("+-*/×÷".includes(ch)) {
            while (ops.length && ops[ops.length - 1] !== "(" && prec(ops[ops.length - 1]) >= prec(ch)) apply();
            ops.push(ch); i++; expectOperand = true; continue;
          }
          throw new Error("bad operator: " + ch);
        }
      }
      while (ops.length) apply();
      if (values.length !== 1) throw new Error("bad expr");
      return values[0];
    };
    let mine: number;
    try { mine = evalRational(em[1]); }
    catch { mark(tag, false); continue; }
    if (!Number.isFinite(mine)) { mark(tag, false); continue; }
    mark(tag, true);
    const am = N(p.answer).match(/(-?\d+)\/(-?\d+)/);
    const got = am ? Number(am[1]) / Number(am[2]) : numAns(p.answer);
    if (!eq(got, mine, 1e-9))
      fail("MS-RAT", id, "Test", s, `mine=${mine} answer="${p.answer}" (prompt: ${String(p.prompt).slice(0, 50)})`);
  }
}

// ── FDPConversions ──────────────────────────────────────────────────────────
for (const id of ["ms6-1-3-fdp-conversions"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "FDP";
    bump();
    const c = N(p.prompt);
    let ok = false;
    const m1 = c.match(/Write(\d+(?:\.\d+)?)%asafractioninsimplestform\./);
    if (m1) {
      ok = true;
      const pct = Number(m1[1]);
      const g = gcd(Math.round(pct * 100), 10000);
      const want = `${(pct * 100) / g}/${10000 / g}`;
      const want2 = `${pct / (g / 100)}/${100 / (g / 100)}`;
      const a = String(p.answer).replace(/\s/g, "");
      if (a !== want && a !== want2 && !(pct % 1 === 0 && a === `${pct / gcd(pct, 100)}/${100 / gcd(pct, 100)}`))
        fail("MS-FDP", id, "Test", s, `${pct}%: mine=${want} answer="${p.answer}"`);
    }
    const m2 = c.match(/Write(\d+)\/(\d+)asapercent\./);
    if (m2) {
      ok = true;
      const mine = (Number(m2[1]) / Number(m2[2])) * 100;
      if (!eq(numAns(p.answer), mine, 1e-9))
        fail("MS-FDP", id, "Test", s, `${m2[1]}/${m2[2]}: mine=${mine}% answer="${p.answer}"`);
    }
    const m3 = c.match(/Writethefraction(\d+)\/(\d+)asadecimal\./);
    if (m3) {
      ok = true;
      const mine = Number(m3[1]) / Number(m3[2]);
      if (!eq(numAns(p.answer), mine, 1e-9))
        fail("MS-FDP", id, "Test", s, `${m3[1]}/${m3[2]} as decimal: mine=${mine} answer="${p.answer}"`);
    }
    // "Write 0.01 as a percent."
    const m4 = c.match(/Write([\d.]+)asapercent\./);
    if (m4) {
      ok = true;
      const mine = Number(m4[1]) * 100;
      if (!eq(numAns(p.answer), mine, 1e-9))
        fail("MS-FDP", id, "Test", s, `${m4[1]} as percent: mine=${mine}% answer="${p.answer}"`);
    }
    mark(tag, ok);
  }
}

// ── RatiosAndRates: "2/6 = ?/36" ────────────────────────────────────────────
for (const id of ["ms6-4-1-ratios-rates"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "RATIO";
    if (p.subtype !== "RatiosAndRates") { mark(tag, false); continue; }
    bump();
    const m = N(p.prompt).match(/(\d+)\/(\d+)=\?\/(\d+)/);
    if (m) {
      mark(tag, true);
      const mine = (Number(m[1]) * Number(m[3])) / Number(m[2]);
      if (!eq(numAns(p.answer), mine, 1e-9))
        fail("MS-RATIO", id, "Test", s, `mine=${mine} answer="${p.answer}"`);
      continue;
    }
    // "A car travels 212 miles in 4 hours at a constant speed. What is the unit rate in miles per hour?"
    const mu = N(p.prompt).match(/travels([\d.]+)\w*in([\d.]+)\w*ataconstantspeed\.Whatistheunitrate/);
    if (mu) {
      mark(tag, true);
      const mine = Number(mu[1]) / Number(mu[2]);
      if (!eq(numAns(p.answer), mine, 1e-9))
        fail("MS-RATIO", id, "Test", s, `unit rate: mine=${mine} answer="${p.answer}"`);
      continue;
    }
    // "Simplify the ratio 21:49 to lowest terms."
    const ms = N(p.prompt).match(/Simplifytheratio(\d+):(\d+)tolowestterms\./);
    if (ms) {
      mark(tag, true);
      const g = gcd(Number(ms[1]), Number(ms[2]));
      const want = `${Number(ms[1]) / g}:${Number(ms[2]) / g}`;
      if (N(p.answer) !== want)
        fail("MS-RATIO", id, "Test", s, `simplify: mine=${want} answer="${p.answer}"`);
      continue;
    }
    // "2 notebooks cost $8. What is the unit rate (price per notebook)?"
    const mn = N(p.prompt).match(/(\d+)notebookscost\$([\d.]+)\.Whatistheunitrate/);
    if (mn) {
      mark(tag, true);
      const mine = Number(mn[2]) / Number(mn[1]);
      if (!eq(numAns(p.answer), mine, 1e-9))
        fail("MS-RATIO", id, "Test", s, `unit rate notebooks: mine=${mine} answer="${p.answer}"`);
      continue;
    }
    mark(tag, false);
  }
}

// ── Percents: "Find 15% of 120." ────────────────────────────────────────────
for (const id of ["ms7-4-4-percents", "ms6-4-2-ratio-reasoning", "ms7-7-1-percents-beyond-100"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "PCT";
    bump();
    const m = N(p.prompt).match(/Find([\d.]+)%of([\d.]+)\./);
    if (m) {
      mark(tag, true);
      const mine = (Number(m[1]) / 100) * Number(m[2]);
      if (!eq(numAns(p.answer), mine, 1e-6))
        fail("MS-PCT", id, "Test", s, `${m[1]}% of ${m[2]}: mine=${mine} answer="${p.answer}"`);
      continue;
    }
    // "A recipe uses a ratio of 4:3 for eggs to cups of milk. If you use 16 eggs, how much cups of milk do you need?"
    const mr = N(p.prompt).match(/usesaratioof(\d+):(\d+).*Ifyouuse([\d.]+)/);
    if (mr) {
      mark(tag, true);
      const mine = (Number(mr[3]) * Number(mr[2])) / Number(mr[1]);
      if (!eq(numAns(p.answer), mine, 1e-9))
        fail("MS-PCT", id, "Test", s, `recipe ratio: mine=${mine} answer="${p.answer}"`);
      continue;
    }
    mark(tag, false);
  }
}

// ── AnglePairs / TriangleAngleSum / TriangleProperties ──────────────────────
for (const id of ["ms7-3-2-angle-pairs"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "ANGLE";
    bump();
    const c = N(p.prompt).toLowerCase();
    const m = c.match(/oneanglemeasures([\d.]+)/);
    if (!m) { mark(tag, false); continue; }
    mark(tag, true);
    const a = Number(m[1]);
    const mine = /supplementary/.test(c) ? 180 - a : /complementary/.test(c) ? 90 - a : /vertical/.test(c) ? a : NaN;
    if (!Number.isFinite(mine)) { mark(tag, false); continue; }
    if (!eq(numAns(p.answer), mine, 1e-9))
      fail("MS-ANGLE", id, "Test", s, `mine=${mine} answer="${p.answer}"`);
  }
}
for (const id of ["ms7-3-3-triangle-angle-sum", "ms6-5-3-triangle-properties"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "TRIANG";
    bump();
    const c = N(p.prompt).toLowerCase();
    const nums = [...c.matchAll(/([\d.]+)/g)].map((m) => Number(m[1]));
    const m = c.match(/(\d+)[a-z]*and(\d+)/) ?? c.match(/measuring(\d+)/);
    let mine: number | null = null;
    if (/twoangles/.test(c) && nums.length >= 2) mine = 180 - nums[0] - nums[1];
    else if (/oneacuteangle/.test(c) && m) mine = 90 - Number(m[1] ?? m[2]);
    if (mine === null) { mark(tag, false); continue; }
    mark(tag, true);
    if (!eq(numAns(p.answer), mine, 1e-9))
      fail("MS-TRIANG", id, "Test", s, `mine=${mine} answer="${p.answer}"`);
  }
}

// ── circles: area/circumference/radius/diameter, semicircles ─────────────────
for (const id of ["ms7-3-5-circumference-area-circles", "ms7-3-6-semicircles-quarter-circles", "ms7-3-4-circle-parts"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "CIRCLE";
    bump();
    const c = N(p.prompt).toLowerCase();
    const pi = /3\.14/.test(c) ? 3.14 : Math.PI;
    let mine: number | null = null;
    let m = c.match(/areaofacirclewithradius([\d.]+)/);
    if (m) mine = pi * Number(m[1]) ** 2;
    m = c.match(/circumferenceofacirclewithradius([\d.]+)/);
    if (m) mine = 2 * pi * Number(m[1]);
    m = c.match(/circumference([\d.]+).*whatisitsradius/);
    if (m) mine = Number(m[1]) / (2 * pi);
    m = c.match(/radiusof([\d.]+).*whatisitsdiameter/);
    if (m) mine = 2 * Number(m[1]);
    m = c.match(/areaofasemicirclewithradius([\d.]+)/);
    if (m) mine = (pi * Number(m[1]) ** 2) / 2;
    m = c.match(/circumferenceofacirclewithdiameter([\d.]+)/);
    if (m) mine = pi * Number(m[1]);
    m = c.match(/areaofaquartercirclewithradius([\d.]+)/);
    if (m) mine = (pi * Number(m[1]) ** 2) / 4;
    m = c.match(/fullcirclewithradius[\d.]+cmhasarea([\d.]+)cm.*whatistheareaofasemicircle/);
    if (m) mine = Number(m[1]) / 2;
    m = c.match(/circlehasadiameterof([\d.]+)cm\.whatisitsradius\?/);
    if (m) mine = Number(m[1]) / 2;
    if (mine === null) { mark(tag, false); continue; }
    mark(tag, true);
    if (!eq(numAns(p.answer), mine, 0.0051))
      fail("MS-CIRCLE", id, "Test", s, `mine=${mine} answer="${p.answer}" (prompt: ${String(p.prompt).slice(0, 60)})`);
  }
}

// ── Transformations ─────────────────────────────────────────────────────────
for (const id of ["ms8-5-transformations"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "TRANS";
    bump();
    const c = N(p.prompt);
    const pm = c.match(/Point[A-Z]?\((-?[\d.]+),(-?[\d.]+)\)/) ?? c.match(/at\((-?[\d.]+),(-?[\d.]+)\)/);
    if (!pm) { mark(tag, false); continue; }
    const [x, y] = [Number(pm[1]), Number(pm[2])];
    let mine: [number, number] | null = null;
    const lc = c.toLowerCase();
    // composition ("...reflected across the y-axis, then translated 3 units down") must come first
    const steps = /then/.test(lc) ? lc.match(/is(.*)\.whatarethefin/) : null;
    if (steps) {
      let px = x, py = y;
      const ops: string[] = [];
      const re = /(reflectedacrossthey-axis|reflectedacrossthex-axis|rotated180|translated\d+units(?:up|down|left|right))/g;
      let om: RegExpExecArray | null;
      while ((om = re.exec(steps[1]))) ops.push(om[1]);
      for (const o of ops) {
        if (o === "reflectedacrossthey-axis") px = -px;
        else if (o === "reflectedacrossthex-axis") py = -py;
        else if (o === "rotated180") { px = -px; py = -py; }
        else {
          const tm = o.match(/translated(\d+)units(up|down|left|right)/)!;
          const n = Number(tm[1]);
          if (tm[2] === "up") py += n; else if (tm[2] === "down") py -= n;
          else if (tm[2] === "left") px -= n; else px += n;
        }
      }
      if (ops.length) mine = [px, py];
    }
    else if (/rotated180/.test(lc)) mine = [-x, -y];
    else if (/rotated90/.test(lc) && /counterclockwise/.test(lc)) mine = [-y, x];
    else if (/rotated90/.test(lc) && /clockwise/.test(lc)) mine = [y, -x];
    else if (/reflectedacross.*y-axis/.test(lc)) mine = [-x, y];
    else if (/reflectedacross.*x-axis/.test(lc)) mine = [x, -y];
    else {
      // "Point P(1,-2) is translated 2 right and 3 up."
      const mt = lc.match(/translated(\d+)rightand(\d+)up/);
      if (mt) mine = [x + Number(mt[1]), y + Number(mt[2])];
      const mt2 = lc.match(/translated(\d+)leftand(\d+)down/);
      if (mt2) mine = [x - Number(mt2[1]), y - Number(mt2[2])];
      const mt3 = lc.match(/translated(\d+)rightand(\d+)down/);
      if (mt3) mine = [x + Number(mt3[1]), y - Number(mt3[2])];
      const mt4 = lc.match(/translated(\d+)leftand(\d+)up/);
      if (mt4) mine = [x - Number(mt4[1]), y + Number(mt4[2])];
    }
    if (!mine) { mark(tag, false); continue; }
    mark(tag, true);
    const am = N(p.answer).match(/\((-?[\d.]+),(-?[\d.]+)\)/);
    if (!am || !eq(Number(am[1]), mine[0], 1e-9) || !eq(Number(am[2]), mine[1], 1e-9))
      fail("MS-TRANS", id, "Test", s, `mine=(${mine}) answer="${p.answer}"`);
  }
}

// ── ScientificNotation ──────────────────────────────────────────────────────
for (const id of ["ms8-6-scientific-notation"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "SCINOT";
    bump();
    const c = N(p.prompt);
    const m = c.match(/Write([\d.]+)\*10\^(-?\d+)instandardform\./);
    if (m) {
      mark(tag, true);
      const mine = Number(m[1]) * Math.pow(10, Number(m[2]));
      if (!eq(numAns(p.answer), mine, 1e-9 * Math.max(1, Math.abs(mine))))
        fail("MS-SCINOT", id, "Test", s, `${m[1]}e${m[2]}: mine=${mine} answer="${p.answer}"`);
      continue;
    }
    const m2 = c.match(/Whichisgreater:([\d.]+)\*10\^(\d+)or([\d.]+)\*10\^(\d+)\?/);
    if (m2) {
      mark(tag, true);
      const v1 = Number(m2[1]) * 10 ** Number(m2[2]), v2 = Number(m2[3]) * 10 ** Number(m2[4]);
      const want = v1 >= v2 ? `${m2[1]} * 10^${m2[2]}` : `${m2[3]} * 10^${m2[4]}`;
      if (N(p.answer) !== N(want))
        fail("MS-SCINOT", id, "Test", s, `mine greater=${want} answer="${p.answer}"`);
      continue;
    }
    // "Write 370000 in scientific notation." → "3.7 × 10^5"
    const m4 = c.match(/Write(\d+)inscientificnotation\./);
    if (m4) {
      mark(tag, true);
      const digits = m4[1];
      const exp = digits.length - 1;
      const rest = digits.slice(1).replace(/0+$/, "");
      const coeff = rest ? `${digits[0]}.${rest}` : digits[0];
      const want = `${coeff} * 10^${exp}`;
      if (N(p.answer) !== N(want))
        fail("MS-SCINOT", id, "Test", s, `mine=${want} answer="${p.answer}"`);
      continue;
    }
    mark(tag, false);
  }
}

// ── median / mean / range ────────────────────────────────────────────────────
for (const id of ["ms6-6-2-measures-center-variation"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "STATS";
    bump();
    const c = N(p.prompt).toLowerCase();
    const dm = c.match(/dataset:([-\d.,\s]+)\./);
    if (!dm) { mark(tag, false); continue; }
    const data = dm[1].split(",").map(Number).sort((a, b) => a - b);
    let mine: number | null = null;
    if (/median/.test(c)) mine = data.length % 2 ? data[(data.length - 1) / 2] : (data[data.length / 2 - 1] + data[data.length / 2]) / 2;
    else if (/mean/.test(c)) mine = data.reduce((s, v) => s + v, 0) / data.length;
    else if (/range/.test(c)) mine = data[data.length - 1] - data[0];
    else if (/mode/.test(c)) {
      const freq = new Map<number, number>();
      for (const v of data) freq.set(v, (freq.get(v) ?? 0) + 1);
      let best = data[0], bc = 0;
      for (const [v, f] of freq) if (f > bc) { bc = f; best = v; }
      mine = best;
    }
    if (mine === null) { mark(tag, false); continue; }
    mark(tag, true);
    if (!eq(numAns(p.answer), mine, 1e-9))
      fail("MS-STATS", id, "Test", s, `mine=${mine} answer="${p.answer}"`);
  }
}

// ── simple equations ─────────────────────────────────────────────────────────
for (const id of ["ms7-2-1-solving-simple-equations", "ms6-3-3-equations-inequalities", "ms7-7-4-distributive-equations", "ms8-1-linear-equations"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "MSEQU";
    bump();
    const c = N(p.prompt);
    // forms: "x + 5.9 = 11.6", "x + (-12) = -11", "2(x + 6) = 24", "2(x + 5) = x + 15"
    let mine: number | null = null;
    let m = c.match(/Solveforx:(-?\d+)\(x([+-])([\d.]+)\)=(-?[\d.]+)\./);
    if (m) mine = (Number(m[4]) / Number(m[1]) - (m[2] === "+" ? 1 : -1) * Number(m[3]));
    m = c.match(/Solveforx:(-?\d+)\(x([+-])([\d.]+)\)=x([+-])([\d.]+)\./);
    if (m) { const a = Number(m[1]), b = (m[2] === "+" ? 1 : -1) * Number(m[3]), d = (m[4] === "+" ? 1 : -1) * Number(m[5]); mine = (d - a * b) / (a - 1); }
    m = c.match(/Solveforx:x([+-])\(?(-?[\d.]+)\)?=(-?[\d.]+)\./) ?? c.match(/Solveforx:x([+-])([\d.]+)=(-?[\d.]+)\./);
    if (m && mine === null) mine = Number(m[3]) - (m[1] === "+" ? Number(m[2]) : -Number(m[2]));
    m = c.match(/Solveforx:(-?[\d.]+)x=(-?[\d.]+)\./);
    if (m && mine === null && Number(m[1]) !== 0) mine = Number(m[2]) / Number(m[1]);
    // "Solve for x: x/7 = 2. (That is, x/7 = 2.)"
    m = c.match(/Solveforx:x\/([\d.]+)=(-?[\d.]+)\./);
    if (m && mine === null) mine = Number(m[2]) * Number(m[1]);
    // "Consider the equation 2(x + 4) = 26. After distributing 2, what equation do you get? (Do not solve.)"
    m = c.match(/Considertheequation(-?\d+)\(x([+-])([\d.]+)\)=(-?[\d.]+)\.Afterdistributing/);
    if (m && mine === null) {
      const a = Number(m[1]), b = (m[2] === "+" ? 1 : -1) * Number(m[3]);
      const want = `${a}x${b < 0 ? " - " + Math.abs(a * b) : " + " + a * b} = ${m[4]}`;
      mark(tag, true);
      if (N(p.answer) !== N(want))
        fail("MS-EQU", id, "Test", s, `distribute: mine="${want}" answer="${p.answer}"`);
      continue;
    }
    m = c.match(/buys(\d+)identicalnotebooksforatotalof\$([\d.]+)\./);
    if (m && mine === null) {
      const want = Number(m[2]) / Number(m[1]);
      mark(tag, true);
      if (!eq(numAns(p.answer), want, 1e-9))
        fail("MS-EQU", id, "Test", s, `notebook: mine=$${want} answer="${p.answer}"`);
      continue;
    }
    // "Solve for x: 2x + 10 = x + 18."
    m = c.match(/Solveforx:(-?[\d.]+)x([+-])([\d.]+)=(-?[\d.]+)x([+-])([\d.]+)\./);
    if (m && mine === null) {
      const a = Number(m[1]), b = (m[2] === "+" ? 1 : -1) * Number(m[3]);
      const cc = Number(m[4]), d = (m[5] === "+" ? 1 : -1) * Number(m[6]);
      if (a !== cc) mine = (d - b) / (a - cc);
    }
    m = c.match(/Solvetheinequality:x([+-])([\d.]+)(<=|>=|<|>)(-?[\d.]+)\./);
    if (m && mine === null) {
      const boundary = Number(m[4]) - (m[1] === "+" ? Number(m[2]) : -Number(m[2]));
      const am = N(p.answer).match(/^x(<=|>=|<|>)(-?[\d.]+)$/);
      mark(tag, true);
      if (!am || am[1] !== m[3] || !eq(Number(am[2]), boundary, 1e-9))
        fail("MS-EQU", id, "Test", s, `inequality: mine x ${m[3]} ${boundary} answer="${p.answer}"`);
      continue;
    }
    if (mine === null || !Number.isFinite(mine)) { mark(tag, false); continue; }
    mark(tag, true);
    if (!eq(numAns(p.answer), mine, 1e-9))
      fail("MS-EQU", id, "Test", s, `mine x=${mine} answer="${p.answer}" (prompt: ${String(p.prompt).slice(0, 50)})`);
  }
}

// ── inequalities: "2x < 12" / "2x - 8 < 4" ───────────────────────────────────
for (const id of ["ms7-7-5-multi-step-inequalities", "ms7-2-3-solving-inequalities"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "MSINEQ";
    bump();
    const c = N(p.prompt);
    const m = c.match(/([+\-]?\d*)x([+\-][\d.]+)?(<=|>=|<|>)(-?[\d.]+)/);
    if (!m) { mark(tag, false); continue; }
    const a = m[1] === "" || m[1] === "+" ? 1 : m[1] === "-" ? -1 : Number(m[1]);
    const b = m[2] ? Number(m[2]) : 0;
    const rhs = Number(m[4]);
    if (a === 0) { mark(tag, false); continue; }
    mark(tag, true);
    const boundary = (rhs - b) / a;
    const flip: Record<string, string> = { "<": ">", ">": "<", "<=": ">=", ">=": "<=" };
    const wantOp = a < 0 ? flip[m[3]] : m[3];
    const am = N(p.answer).match(/^x(<=|>=|<|>)(-?[\d.]+)$/);
    if (!am || am[1] !== wantOp || !eq(Number(am[2]), boundary, 1e-9))
      fail("MS-INEQ", id, "Test", s, `mine x ${wantOp} ${boundary} answer="${p.answer}"`);
  }
}

// ── PercentError ─────────────────────────────────────────────────────────────
for (const id of ["ms7-7-2-percent-error"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "PCTERR";
    bump();
    const m = N(p.prompt).match(/recordedas([\d.]+).*actualvalueis([\d.]+)/);
    if (!m) { mark(tag, false); continue; }
    mark(tag, true);
    const [rec, act] = [Number(m[1]), Number(m[2])];
    if (/percenterror/.test(N(p.prompt).toLowerCase())) {
      const mine = (Math.abs(rec - act) / act) * 100;
      if (!eq(numAns(p.answer), mine, 0.51))
        fail("MS-PCTERR", id, "Test", s, `mine=${mine}% answer="${p.answer}"`);
    } else if (/amountoferror/.test(N(p.prompt).toLowerCase())) {
      const mine = Math.abs(rec - act);
      if (!eq(numAns(p.answer), mine, 1e-9))
        fail("MS-PCTERR", id, "Test", s, `mine=${mine} units answer="${p.answer}"`);
    } else mark(tag, false);
  }
}

// ── CompoundEvents ───────────────────────────────────────────────────────────
for (const id of ["ms7-5-4-compound-events"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "COMPEVT";
    bump();
    const c = N(p.prompt);
    let mine: number | null = null;
    const m = c.match(/P\(A\)=(\d+)\/(\d+)andP\(B\)=(\d+)\/(\d+).*P\(AandB\)/i);
    if (m) mine = (Number(m[1]) / Number(m[2])) * (Number(m[3]) / Number(m[4]));
    const m2 = c.match(/BagAhas(\d+)redmarblesoutof(\d+)total\.BagBhas(\d+)redmarblesoutof(\d+)total/);
    if (m2) mine = (Number(m2[1]) / Number(m2[2])) * (Number(m2[3]) / Number(m2[4]));
    const m3 = c.match(/gettingheadsANDrollinga(\d+)\?/i);
    if (m3) mine = (1 / 2) * (1 / 6);
    if (mine === null) { mark(tag, false); continue; }
    mark(tag, true);
    const am = String(p.answer).match(/(\d+)\/(\d+)/);
    const got = am ? Number(am[1]) / Number(am[2]) : numAns(p.answer);
    if (!eq(got, mine, 1e-9))
      fail("MS-COMPEVT", id, "Test", s, `mine=${mine} answer="${p.answer}"`);
  }
}

// ── ProportionalRelationships / RepresentingLinearRelationships / Sampling ───
for (const id of ["ms7-4-2-proportional-relationships"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "PROP7";
    bump();
    const c = N(p.prompt);
    const m = c.match(/Whenx=([\d.]+),y=([\d.]+)\.Whatisywhenx=([\d.]+)\?/);
    if (m) {
      mark(tag, true);
      const mine = (Number(m[2]) / Number(m[1])) * Number(m[3]);
      if (!eq(numAns(p.answer), mine, 1e-9))
        fail("MS-PROP", id, "Test", s, `mine=${mine} answer="${p.answer}"`);
      continue;
    }
    const m2 = c.match(/relationshipinthetableisproportional:(.*)\./);
    if (m2) {
      mark(tag, true);
      const pairs = [...m2[1].matchAll(/\(([\d.]+),([\d.]+)\)/g)].map((x) => [Number(x[1]), Number(x[2])]);
      if (pairs.length < 2) { mark(tag, false); continue; }
      const rs = pairs.map(([x, y]) => y / x);
      const prop = rs.every((r) => eq(r, rs[0], 1e-9));
      const wantNot = /notproportional/.test(N(p.answer).toLowerCase());
      if (prop === wantNot)
        fail("MS-PROP", id, "Test", s, `mine proportional=${prop} answer="${p.answer}"`);
      continue;
    }
    // "A proportional relationship passes through the points (2,10),(3,15). What is the constant of proportionality?"
    const m3 = c.match(/proportionalrelationshippassesthroughthepoints(.*)\.Whatistheconstantofproportionality\?/);
    if (m3) {
      mark(tag, true);
      const pairs = [...m3[1].matchAll(/\(([\d.]+),([\d.]+)\)/g)].map((x) => [Number(x[1]), Number(x[2])]);
      if (pairs.length < 1) { mark(tag, false); continue; }
      const mine = pairs[0][1] / pairs[0][0];
      if (!eq(numAns(p.answer), mine, 1e-9))
        fail("MS-PROP", id, "Test", s, `constant of proportionality: mine=${mine} answer="${p.answer}"`);
      continue;
    }
    mark(tag, false);
  }
}
for (const id of ["ms7-4-3-representing-linear-relationships"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "LINREL";
    bump();
    const c = N(p.prompt);
    const m = c.match(/y=(-?[\d.]+)x([+-])([\d.]+).*whenx=(-?[\d.]+)/);
    if (!m) { mark(tag, false); continue; }
    mark(tag, true);
    const mine = Number(m[1]) * Number(m[4]) + (m[2] === "+" ? 1 : -1) * Number(m[3]);
    if (!eq(numAns(p.answer), mine, 1e-9))
      fail("MS-LINREL", id, "Test", s, `mine=${mine} answer="${p.answer}"`);
  }
}
for (const id of ["ms7-5-1-sampling"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "SAMPLE";
    bump();
    const m = N(p.prompt).match(/sampleof(\d+).*?,(\d+)prefer.*howmanyofthe(\d+)/);
    if (m) {
      mark(tag, true);
      const mine = (Number(m[2]) / Number(m[1])) * Number(m[3]);
      // factory rounds to whole students
      if (Math.abs(numAns(p.answer) - mine) > 0.5001)
        fail("MS-SAMPLE", id, "Test", s, `mine=${mine} answer="${p.answer}"`);
      continue;
    }
    // "A school has 500 students. A random sample of 20 students is surveyed. What fraction of the school is in the sample?"
    const mf = N(p.prompt).match(/schoolhas(\d+)students\.Arandomsampleof(\d+)studentsissurveyed\.Whatfractionoftheschoolisinthesample\?/);
    if (mf) {
      mark(tag, true);
      const [n, d] = [Number(mf[2]), Number(mf[1])];
      const g = gcd(n, d);
      const want = `${n / g}/${d / g}`;
      const am = N(p.answer).match(/(\d+)\/(\d+)/);
      const got = am ? `${Number(am[1])}/${Number(am[2])}` : "";
      if (got !== want)
        fail("MS-SAMPLE", id, "Test", s, `fraction: mine=${want} answer="${p.answer}"`);
      continue;
    }
    mark(tag, false);
  }
}

// ── Nets (cube surface area) ─────────────────────────────────────────────────
for (const id of ["ms7-3-8-nets"]) {
  for (let s = 0; s < 40; s++) for (const p of gen(id, s * 7 + 1)) {
    const tag = "NETS";
    bump();
    const m = N(p.prompt).match(/cube.*sidelength([\d.]+)/);
    if (!m) { mark(tag, false); continue; }
    mark(tag, true);
    const mine = 6 * Number(m[1]) ** 2;
    if (!eq(numAns(p.answer), mine, 1e-9))
      fail("MS-NETS", id, "Test", s, `mine=${mine} answer="${p.answer}"`);
  }
}

console.log("\n[verify6] coverage per block (ok/skipped):");
for (const [t, c] of [...cov.entries()].sort()) console.log(`  ${t}: ok=${c.ok} skip=${c.skip}`);
report("rt-verify6 (middle school)");
process.exit(0);
