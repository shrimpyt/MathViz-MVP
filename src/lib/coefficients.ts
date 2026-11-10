/**
 * Coefficient display helpers.
 *
 * Teachers write "x", "-x" and "x²", never "1x", "-1x" or "1x²". Every
 * generator that glues a number onto a variable should go through one of
 * these so a coefficient of 1 or -1 never prints as a digit.
 */

type Num = number | string;

const isOne = (c: Num) => Number(c) === 1 && String(c).trim() !== "";
const isNegOne = (c: Num) => Number(c) === -1 && String(c).trim() !== "";

/** Signed coefficient times a variable: (1, "x") → "x", (-1, "x") → "-x", (3, "x") → "3x". */
export function coefVar(c: Num, v: string): string {
  if (isOne(c)) return v;
  if (isNegOne(c)) return `-${v}`;
  return `${c}${v}`;
}

/** Magnitude of a coefficient times a variable, for use after a separate sign: 1 → "x", 3 → "3x". */
export function absCoefVar(c: Num, v: string): string {
  const n = Math.abs(Number(c));
  return n === 1 ? v : `${n}${v}`;
}

/** Leading coefficient in front of a function name: 1 → "", -1 → "-", 3 → "3 ". */
export function coefPrefixSpace(c: Num): string {
  if (isOne(c)) return "";
  if (isNegOne(c)) return "-";
  return `${c} `;
}

const SUP: Record<number, string> = { 2: "²", 3: "³" };

/** One term with its sign in front: (3, "x") → " + 3x", (-1, "x") → " − x", (0, ...) → "". */
export function signedTerm(c: number, v = "", minus = "−"): string {
  if (c === 0) return "";
  const body = v ? absCoefVar(c, v) : `${Math.abs(c)}`;
  return c < 0 ? ` ${minus} ${body}` : ` + ${body}`;
}

/**
 * Polynomial in one variable from coefficients, highest power first:
 * [2, -7, 6] → "2x² − 7x + 6", [1, 0, -4] → "x² − 4", [-1, 1] → "−x + 1".
 */
export function polyText(coeffs: number[], v = "x", minus = "−"): string {
  const deg = coeffs.length - 1;
  let out = "";
  coeffs.forEach((c, i) => {
    const p = deg - i;
    if (c === 0) return;
    const varPart = p === 0 ? "" : p === 1 ? v : `${v}${SUP[p] ?? `^${p}`}`;
    if (out === "") {
      const body = varPart ? absCoefVar(c, varPart) : `${Math.abs(c)}`;
      out = c < 0 ? `${minus}${body}` : body;
    } else {
      out += signedTerm(c, varPart, minus);
    }
  });
  return out === "" ? "0" : out;
}
