// verify.ts
// INDEPENDENT verification code for Algebra 2 tests. This file is written
// from scratch against the documented statement grammar — it shares NO code
// with the factories (no imports from src/lib/factories/*).
//
// Canonical statement grammar (used by Algebra2Proofs.ts):
//   expr    := term (('+'|'-') term)*
//   term    := factor (('*'|'/') factor | implicitMul factor)*
//   factor  := '-' factor | power
//   power   := primary ('^' primary)?
//   primary := number | variable | funcCall | '(' expr ')'
//   funcCall:= funcName '(' expr ')' ('^' primary)?
//   funcName:= sin|cos|tan|sec|csc|cot|ln|sqrt | log_N (N = digits)
//   variable:= single letter a-z or 'θ'; constant 'π'
// Implicit multiplication: number/variable/')'/funcCall followed by
// number/variable/funcName/'('.

type Tok =
  | { t: "num"; v: number }
  | { t: "var"; v: string }
  | { t: "func"; v: string }
  | { t: "op"; v: string }
  | { t: "lp" }
  | { t: "rp" }
  | { t: "eq" };

const FUNCS = new Set(["sin", "cos", "tan", "sec", "csc", "cot", "ln", "sqrt"]);

export function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  const isDigit = (c: string) => c >= "0" && c <= "9";
  const isLetter = (c: string) => (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "θ" || c === "π";
  while (i < src.length) {
    const c = src[i];
    if (c === " " || c === "\t") { i++; continue; }
    if (isDigit(c) || (c === "." && isDigit(src[i + 1] ?? ""))) {
      let j = i;
      while (j < src.length && (isDigit(src[j]) || src[j] === ".")) j++;
      toks.push({ t: "num", v: parseFloat(src.slice(i, j)) });
      i = j;
      continue;
    }
    if (isLetter(c)) {
      let j = i;
      while (j < src.length && isLetter(src[j])) j++;
      let name = src.slice(i, j);
      // log_2 style: absorb _digits
      if (name === "log" && src[j] === "_") {
        let k = j + 1;
        while (k < src.length && isDigit(src[k])) k++;
        name = src.slice(i, k);
        toks.push({ t: "func", v: name });
        i = k;
        continue;
      }
      if (FUNCS.has(name)) toks.push({ t: "func", v: name });
      else if (name.length === 1) toks.push({ t: "var", v: name });
      else throw new Error(`unknown identifier "${name}" in "${src}"`);
      i = j;
      continue;
    }
    if (c === "(") { toks.push({ t: "lp" }); i++; continue; }
    if (c === ")") { toks.push({ t: "rp" }); i++; continue; }
    if ("+-*/^".includes(c)) { toks.push({ t: "op", v: c }); i++; continue; }
    if (c === "=") { toks.push({ t: "eq" }); i++; continue; }
    throw new Error(`unexpected char "${c}" in "${src}"`);
  }
  return toks;
}

// ── AST ───────────────────────────────────────────────────────────────────────

type Node =
  | { k: "num"; v: number }
  | { k: "var"; v: string }
  | { k: "neg"; e: Node }
  | { k: "add"; a: Node; b: Node }
  | { k: "sub"; a: Node; b: Node }
  | { k: "mul"; a: Node; b: Node }
  | { k: "div"; a: Node; b: Node }
  | { k: "pow"; a: Node; b: Node }
  | { k: "call"; f: string; e: Node };

class Parser {
  toks: Tok[];
  pos = 0;
  constructor(toks: Tok[]) { this.toks = toks; }
  peek(): Tok | undefined { return this.toks[this.pos]; }
  next(): Tok {
    const t = this.toks[this.pos++];
    if (!t) throw new Error("unexpected end of expression");
    return t;
  }
  parseExpr(): Node {
    let e = this.parseTerm();
    for (;;) {
      const t = this.peek();
      if (t && t.t === "op" && (t.v === "+" || t.v === "-")) {
        this.next();
        const r = this.parseTerm();
        e = t.v === "+" ? { k: "add", a: e, b: r } : { k: "sub", a: e, b: r };
      } else return e;
    }
  }
  parseTerm(): Node {
    let e = this.parseFactor();
    for (;;) {
      const t = this.peek();
      if (t && t.t === "op" && (t.v === "*" || t.v === "/")) {
        this.next();
        const r = this.parseFactor();
        e = t.v === "*" ? { k: "mul", a: e, b: r } : { k: "div", a: e, b: r };
      } else if (t && (t.t === "num" || t.t === "var" || t.t === "func" || t.t === "lp")) {
        // implicit multiplication
        const r = this.parseFactor();
        e = { k: "mul", a: e, b: r };
      } else return e;
    }
  }
  parseFactor(): Node {
    const t = this.peek();
    if (t && t.t === "op" && t.v === "-") {
      this.next();
      return { k: "neg", e: this.parseFactor() };
    }
    return this.parsePower();
  }
  parsePower(): Node {
    let base = this.parsePrimary();
    const t = this.peek();
    if (t && t.t === "op" && t.v === "^") {
      this.next();
      const exp = this.parsePrimary();
      base = { k: "pow", a: base, b: exp };
    }
    return base;
  }
  parsePrimary(): Node {
    const t = this.next();
    if (t.t === "num") return { k: "num", v: t.v };
    if (t.t === "var") {
      if (t.v === "π") return { k: "num", v: Math.PI };
      return { k: "var", v: t.v };
    }
    if (t.t === "func") {
      // support both sin(x)^2 and sin^2(x) forms
      let expNode: Node | null = null;
      let nx0 = this.peek();
      if (nx0 && nx0.t === "op" && nx0.v === "^") {
        this.next();
        expNode = this.parsePrimary();
      }
      const lp = this.next();
      if (lp.t !== "lp") throw new Error(`expected ( after ${t.v}`);
      const e = this.parseExpr();
      const rp = this.next();
      if (rp.t !== "rp") throw new Error(`expected ) after ${t.v}(`);
      let call: Node = { k: "call", f: t.v, e };
      if (expNode) {
        call = { k: "pow", a: call, b: expNode };
      } else {
        const nx = this.peek();
        if (nx && nx.t === "op" && nx.v === "^") {
          this.next();
          call = { k: "pow", a: call, b: this.parsePrimary() };
        }
      }
      return call;
    }
    if (t.t === "lp") {
      const e = this.parseExpr();
      const rp = this.next();
      if (rp.t !== "rp") throw new Error("expected )");
      return e;
    }
    throw new Error(`unexpected token in primary: ${JSON.stringify(t)}`);
  }
}

export function parseExpression(src: string): Node {
  const p = new Parser(tokenize(src));
  const e = p.parseExpr();
  if (p.pos !== p.toks.length) throw new Error(`trailing tokens in "${src}"`);
  return e;
}

// ── Numeric evaluation ────────────────────────────────────────────────────────

export type Env = Record<string, number>;

export function evaluate(n: Node, env: Env): number {
  switch (n.k) {
    case "num": return n.v;
    case "var": {
      if (!(n.v in env)) throw new Error(`unbound variable ${n.v}`);
      return env[n.v];
    }
    case "neg": return -evaluate(n.e, env);
    case "add": return evaluate(n.a, env) + evaluate(n.b, env);
    case "sub": return evaluate(n.a, env) - evaluate(n.b, env);
    case "mul": return evaluate(n.a, env) * evaluate(n.b, env);
    case "div": {
      const d = evaluate(n.b, env);
      if (d === 0) throw new Error("division by zero in evaluation");
      return evaluate(n.a, env) / d;
    }
    case "pow": return Math.pow(evaluate(n.a, env), evaluate(n.b, env));
    case "call": {
      const x = evaluate(n.e, env);
      switch (n.f) {
        case "sin": return Math.sin(x);
        case "cos": return Math.cos(x);
        case "tan": return Math.tan(x);
        case "sec": return 1 / Math.cos(x);
        case "csc": return 1 / Math.sin(x);
        case "cot": return 1 / Math.tan(x);
        case "ln": return Math.log(x);
        case "sqrt": return Math.sqrt(x);
        default: {
          const m = /^log_(\d+)$/.exec(n.f);
          if (m) return Math.log(x) / Math.log(parseInt(m[1], 10));
          throw new Error(`unknown function ${n.f}`);
        }
      }
    }
  }
}

/** Split "LHS = RHS" (top-level) into parsed sides. */
export function parseEquation(stmt: string): [Node, Node] {
  const toks = tokenize(stmt);
  const eqIdx = toks.findIndex((t) => t.t === "eq");
  if (eqIdx < 0) throw new Error(`no = in statement "${stmt}"`);
  if (toks.filter((t) => t.t === "eq").length !== 1)
    throw new Error(`multiple = in statement "${stmt}"`);
  const left = new Parser(toks.slice(0, eqIdx));
  const right = new Parser(toks.slice(eqIdx + 1));
  const l = left.parseExpr();
  const r = right.parseExpr();
  if (left.pos !== eqIdx || right.pos !== toks.length - eqIdx - 1)
    throw new Error(`trailing tokens in "${stmt}"`);
  return [l, r];
}

/** Check an equation statement numerically over sampled envs. */
export function checkEquationNumeric(
  stmt: string,
  envs: Env[],
  tol = 1e-9,
  minValid = 8
): { ok: boolean; detail: string } {
  let l: Node, r: Node;
  try {
    [l, r] = parseEquation(stmt);
  } catch (e) {
    return { ok: false, detail: `parse failed: ${(e as Error).message}` };
  }
  let valid = 0;
  for (let i = 0; i < envs.length; i++) {
    let lv: number, rv: number;
    try {
      lv = evaluate(l, envs[i]);
      rv = evaluate(r, envs[i]);
    } catch (e) {
      return { ok: false, detail: `eval failed on sample ${i}: ${(e as Error).message}` };
    }
    if (!isFinite(lv) || !isFinite(rv))
      return { ok: false, detail: `non-finite value on sample ${i}` };
    // skip near-pole samples where both sides blow up (identity still holds)
    if (Math.abs(lv) > 1e6 || Math.abs(rv) > 1e6) continue;
    valid++;
    const err = Math.abs(lv - rv);
    if (err > tol * (1 + Math.abs(lv) + Math.abs(rv)))
      return { ok: false, detail: `mismatch on sample ${i}: ${lv} vs ${rv}` };
  }
  if (valid < minValid)
    return { ok: false, detail: `only ${valid} valid samples (need ${minValid})` };
  return { ok: true, detail: "" };
}

// ── Symbolic polynomial expansion (ascending coeff arrays) ────────────────────
// Independent of the factories' string building. Supports single variable.

export type PolyAsc = number[]; // a0 + a1 x + a2 x^2 ...

function pAdd(a: PolyAsc, b: PolyAsc): PolyAsc {
  const n = Math.max(a.length, b.length);
  const o = new Array(n).fill(0);
  for (let i = 0; i < n; i++) o[i] = (a[i] ?? 0) + (b[i] ?? 0);
  return pTrim(o);
}
function pSub(a: PolyAsc, b: PolyAsc): PolyAsc {
  const n = Math.max(a.length, b.length);
  const o = new Array(n).fill(0);
  for (let i = 0; i < n; i++) o[i] = (a[i] ?? 0) - (b[i] ?? 0);
  return pTrim(o);
}
function pMul(a: PolyAsc, b: PolyAsc): PolyAsc {
  const o = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < b.length; j++) o[i + j] += a[i] * b[j];
  return pTrim(o);
}
function pTrim(p: PolyAsc): PolyAsc {
  const q = [...p];
  while (q.length > 1 && q[q.length - 1] === 0) q.pop();
  return q;
}
function pPowInt(a: PolyAsc, n: number): PolyAsc {
  if (!Number.isInteger(n) || n < 0) throw new Error("non-integer power in poly expand");
  let r: PolyAsc = [1];
  for (let i = 0; i < n; i++) r = pMul(r, a);
  return r;
}

/** Expand an expression to ascending coefficients; variable must be `variable`. */
export function expandPolynomial(src: string, variable: string): PolyAsc {
  const ast = parseExpression(src);
  const rec = (n: Node): PolyAsc => {
    switch (n.k) {
      case "num": return [n.v];
      case "var":
        if (n.v !== variable) throw new Error(`unexpected variable ${n.v}`);
        return [0, 1];
      case "neg": return rec(n.e).map((c) => -c);
      case "add": return pAdd(rec(n.a), rec(n.b));
      case "sub": return pSub(rec(n.a), rec(n.b));
      case "mul": return pMul(rec(n.a), rec(n.b));
      case "div": {
        const b = rec(n.b);
        if (b.length === 1 && b[0] !== 0) return rec(n.a).map((c) => c / b[0]);
        throw new Error("non-constant divisor in poly expand");
      }
      case "pow": {
        const e = rec(n.b);
        if (e.length === 1) return pPowInt(rec(n.a), e[0]);
        throw new Error("non-constant exponent in poly expand");
      }
      case "call": throw new Error(`function ${n.f} in poly expand`);
    }
  };
  return rec(ast);
}

/** Check a polynomial identity statement by expanding both sides. */
export function checkPolyIdentity(stmt: string, variable: string): { ok: boolean; detail: string } {
  const eqIdx = stmt.indexOf("=");
  if (eqIdx < 0) return { ok: false, detail: "no =" };
  try {
    const l = expandPolynomial(stmt.slice(0, eqIdx), variable);
    const r = expandPolynomial(stmt.slice(eqIdx + 1), variable);
    const d = pSub(l, r);
    const ok = d.every((c) => Math.abs(c) < 1e-9);
    return { ok, detail: ok ? "" : `diff coeffs: ${d}` };
  } catch (e) {
    return { ok: false, detail: `expand failed: ${(e as Error).message}` };
  }
}
