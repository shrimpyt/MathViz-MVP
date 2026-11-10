// unit-coefficients.ts, checks that no generated text prints a coefficient
// of 1 or -1 as a digit ("1x", "-1y", "1x^2", "sin(1x)", "-1i"), and that no
// number leaks in JavaScript exponent form ("1e-12").
//
// Run: npx tsx tests/unit-coefficients.ts   (SEEDS=n to widen the sweep)

import { CURRICULUM_REGISTRY } from "../src/modules/CurriculumRegistry";
import type { OutputMode } from "../src/lib/types";
import { absCoefVar, coefPrefixSpace, coefVar, polyText, signedTerm } from "../src/lib/coefficients";

let checks = 0;
const failures: string[] = [];
function eq(got: string, want: string) {
  checks++;
  if (got !== want) failures.push(`helper: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

// Helpers.
eq(coefVar(1, "x"), "x");
eq(coefVar(-1, "y"), "-y");
eq(coefVar("1", "x"), "x");
eq(coefVar("-1", "t"), "-t");
eq(coefVar(3, "x"), "3x");
eq(coefVar(10, "x"), "10x");
eq(coefVar("1/2", "x"), "1/2x");
eq(coefVar(1, "(x-3)"), "(x-3)");
eq(absCoefVar(-1, "x"), "x");
eq(absCoefVar(-4, "y"), "4y");
eq(coefPrefixSpace(1), "");
eq(coefPrefixSpace(-1), "-");
eq(coefPrefixSpace(-4), "-4 ");
eq(signedTerm(-1, "x"), " − x");
eq(signedTerm(6), " + 6");
eq(signedTerm(0, "x"), "");
eq(polyText([1, -1, -30]), "x² − x − 30");
eq(polyText([2, -7, 6]), "2x² − 7x + 6");
eq(polyText([1, 0, -4]), "x² − 4");
eq(polyText([-1, 1]), "−x + 1");
eq(polyText([0, 0]), "0");

// A digit 1 standing alone in front of a single-letter variable. Not after
// another digit, a decimal point, a letter, a subscript or exponent marker,
// a closing brace or a dollar sign, so "10x", "0.1x", "x_1y", "\frac{1}{x}"
// and "$1" pass. "1s" followed by a word is the plural ("the pattern of 1s").
const UNIT = /(?<![\w.\\^_}$])1([a-zA-Z])(?![a-zA-Z0-9])(?!(?<=1s) [a-z])/g;
const EXPONENT = /\d(?:\.\d+)?e[-+]\d/;
const SKIP_KEYS = new Set(["svg", "svgParams", "diagram", "id", "color", "shadeColor", "colors"]);

const SEEDS = Number(process.env.SEEDS ?? 8);
const MODES: OutputMode[] = ["GuidedNote", "Review", "Test", "Classical"];
const found = new Map<string, string>();
let strings = 0;

function walk(v: unknown, path: string, id: string) {
  if (typeof v === "string") {
    strings++;
    UNIT.lastIndex = 0;
    const m = UNIT.exec(v);
    const key = `${id} ${path}`;
    if (m && !found.has(key)) found.set(key, `"${v.slice(Math.max(0, m.index - 20), m.index + 15)}"`);
    if (EXPONENT.test(v) && !found.has(key + " (e)")) found.set(key + " (e)", `exponent form: "${v.slice(0, 60)}"`);
  } else if (Array.isArray(v)) {
    v.forEach((x) => walk(x, path + "[]", id));
  } else if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v)) if (!SKIP_KEYS.has(k)) walk(x, path ? `${path}.${k}` : k, id);
  }
}

for (const e of CURRICULUM_REGISTRY)
  for (const mode of MODES)
    for (const d of [1, 2, 3] as const)
      for (let seed = 1; seed <= SEEDS; seed++) {
        let problems: unknown[] = [];
        try {
          problems = e.generate(mode, seed, { count: 6, difficulty: d });
        } catch {
          continue; // a mode an entry doesn't support is not this test's concern
        }
        for (const p of problems) walk(p, "", e.id);
      }
checks += strings;
for (const [where, s] of found) failures.push(`${where}: ${s}`);

console.log(`unit-coefficients: ${checks} checks (${strings} generated strings), ${failures.length} failures`);
for (const f of failures) console.log("  FAIL " + f);
process.exit(failures.length ? 1 : 0);
