// latex-to-text.ts, checks that answer-key text has no raw LaTeX and keeps
// its grouping once the fraction bar and radical overbar are gone.
//
// Run: npx tsx tests/latex-to-text.ts

import { CURRICULUM_REGISTRY } from "../src/modules/CurriculumRegistry";
import { formatAnswer, latexToText, pdfSafeText } from "../src/lib/answerKey";
import type { OutputMode } from "../src/lib/ProblemFactory";

let checks = 0;
const failures: string[] = [];
function eq(input: string, want: string) {
  checks++;
  const got = latexToText(input);
  if (got !== want) failures.push(`${JSON.stringify(input)} -> ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

// Grouping that a printed fraction bar or radical overbar used to carry.
eq("x^2-2x-4+\\frac{1}{x+1}", "x²-2x-4+1/(x+1)");
eq("\\frac{y_2-y_1}{x_2-x_1}", "(y₂-y₁)/(x₂-x₁)");
eq("x + 5 + \\frac{4}{x^2 + 4x}", "x + 5 + 4/(x² + 4x)");
eq("\\frac{3}{2x}", "3/(2x)");
eq("\\frac{1}{x^{2}}", "1/x²");
eq("\\frac{x}{x+2}", "x/(x+2)");
eq("\\dfrac{a+b}{c}", "(a+b)/c");
eq("\\frac{-3}{4}", "-3/4");
eq("\\frac{\\frac{1}{2}}{3}", "(1/2)/3");
eq("\\sqrt{\\frac{x+1}{2}}", "√((x+1)/2)");
eq("\\sqrt{x - 3}", "√(x - 3)");
eq("\\sqrt[3]{\\frac{1}{8}}", "∛(1/8)");
eq("x = \\frac{3 \\pm \\sqrt{17}}{4}", "x = (3 ± √17)/4");
eq("\\frac{\\sqrt{2}}{2}", "√2/2");
// The usual answer-key convention for a coefficient: (1/2)x prints 1/2x.
eq("y = -\\frac{1}{2}x + \\frac{5}{2}", "y = -1/2x + 5/2");

// Exponents that can't be written as unicode superscripts.
eq("(1.05)^{t}", "(1.05)^t");
eq("Pe^{rt}", "Pe^(rt)");

// Words, symbols, sets, money.
eq("x = 2 \\text{ or } x = 12", "x = 2 or x = 12");
eq("a \\ne b", "a ≠ b");
eq("x \\leq 4", "x ≤ 4");
eq("\\left( x \\right) \\le 3", "( x ) ≤ 3");
eq("\\{-1, 0, 1, 4\\}", "{-1, 0, 1, 4}");
eq("2 \\pmod{5}", "2 (mod 5)");
eq("37^\\circ", "37°");
eq("\\overline{AB} \\cong \\overline{CD}", "AB ≅ CD");
eq("a $12 fee", "a $12 fee");
eq("a \\mp b", "a ∓ b");

// Every printed key in the registry: no LaTeX may reach the page.
const SEEDS = Number(process.env.SEEDS ?? 10);
const LEAK = /\\|text\{|\bfrac\b|dfrac|overline|≤ft|right\)/;
const MODES: OutputMode[] = ["Test", "Review"];
let keys = 0;
const leaks = new Map<string, string>();
for (const e of CURRICULUM_REGISTRY)
  for (const mode of MODES)
    for (const d of [1, 2, 3] as const)
      for (let seed = 1; seed <= SEEDS; seed++) {
        for (const p of e.generate(mode, seed, { count: 6, difficulty: d })) {
          keys++;
          const s = pdfSafeText(formatAnswer(p));
          if (LEAK.test(s) && !leaks.has(e.id)) leaks.set(e.id, s.slice(0, 100));
        }
      }
checks += keys;
for (const [id, s] of leaks) failures.push(`${id}: raw LaTeX in printed key: ${s}`);

console.log(`latex-to-text: ${checks} checks (${keys} printed keys), ${failures.length} failures`);
for (const f of failures) console.log("  FAIL " + f);
process.exit(failures.length ? 1 : 0);
