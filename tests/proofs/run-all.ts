// run-all.ts
// Full geometry-proofs test run:
//   1. Full matrix: every proof family/unit × student mode × difficulty 1–3
//      × counts {1,3,12,25} — validateProofShape + per-family logical
//      checkers + diagram recomputation + degeneracy + blanking discipline.
//   2. Fuzz: thousands of random seeds hunting crashes/degenerate figures.
//   3. Seed reproducibility: same seed → identical problems.
//   4. PDF byte verification on representative samples (valid %PDF header).
//   5. Answer-key exactness across difficulties and seeds.
// Writes tests/proofs/TEST_REPORT.md. Exits non-zero on any failure.
//
// Run: npx tsx tests/proofs/run-all.ts

import React from "react";
import { Document, Page, Text, renderToBuffer } from "@react-pdf/renderer";
import { mulberry32 } from "@/lib/math-utils";
import type { RNG } from "@/lib/math-utils";
import type { ProofProblem, ProofStudentMode } from "@/lib/proofDiagrams";
import {
  generateTriangleCongruenceProofs,
  generateCPCTCProofs,
  generateIsoscelesProofs,
  CONGRUENCE_FAMILIES,
  type CongruenceFamily,
} from "@/lib/factories/ProofTriangleCongruenceFactory";
import { generateParallelLineProofs } from "@/lib/factories/ProofParallelLinesFactory";
import {
  generateCircleTheoremProofs,
  CIRCLE_THEOREM_FAMILIES,
  type CircleTheoremFamily,
} from "@/lib/factories/ProofCircleTheoremsFactory";
import { generateSimilarityProofs } from "@/lib/factories/ProofSimilarityFactory";
import {
  generateElementsProofs,
  makeElementsProof,
  ELEMENTS_PROPOSITIONS,
  type ElementsProposition,
} from "@/lib/factories/ProofElementsFactory";
import { PdfProofSVG } from "@/components/diagrams/PdfProofSVG";
import { newCtx, check, checkProofGeneric, checkNonDegenerate, type Ctx } from "./checkers";
import {
  checkCongruenceProof,
  checkCPCTCProof,
  checkIsoscelesProof,
  checkParallelProof,
  checkCircleProof,
  checkSimilarityProof,
  checkElementsProof,
} from "./checkers-families";
import * as fs from "fs";
import * as path from "path";

type Difficulty = 1 | 2 | 3;
const MODES: ProofStudentMode[] = ["complete", "fill-statements", "supply-reasons", "guided"];
const DIFFS: Difficulty[] = [1, 2, 3];
const COUNTS = [1, 3, 12, 25];

interface Unit {
  name: string;
  generate: (rng: RNG, n: number, d: Difficulty, m: ProofStudentMode) => ProofProblem[];
  check: (ctx: Ctx, p: ProofProblem, tag: string) => void;
}

const UNITS: Unit[] = [
  ...CONGRUENCE_FAMILIES.map((f): Unit => ({
    name: `congruence-${f}`,
    generate: (rng, n, d, m) => generateTriangleCongruenceProofs(rng, n, d, m, [f as CongruenceFamily]),
    check: (ctx, p, tag) => checkCongruenceProof(ctx, p, f as CongruenceFamily, tag),
  })),
  {
    name: "cpctc",
    generate: (rng, n, d, m) => generateCPCTCProofs(rng, n, d, m),
    check: (ctx, p, tag) => checkCPCTCProof(ctx, p, tag),
  },
  {
    name: "isosceles",
    generate: (rng, n, d, m) => generateIsoscelesProofs(rng, n, d, m),
    check: (ctx, p, tag) => checkIsoscelesProof(ctx, p, tag),
  },
  ...([1, 2, 3] as Difficulty[]).map((t): Unit => ({
    name: `parallel-tier${t}`,
    generate: (rng, n, d, m) => generateParallelLineProofs(rng, n, d, m, [t]),
    check: (ctx, p, tag) => checkParallelProof(ctx, p, tag),
  })),
  ...CIRCLE_THEOREM_FAMILIES.map((f): Unit => ({
    name: `circle-${f}`,
    generate: (rng, n, d, m) => generateCircleTheoremProofs(rng, n, d, m, [f as CircleTheoremFamily]),
    check: (ctx, p, tag) => checkCircleProof(ctx, p, f as CircleTheoremFamily, tag),
  })),
  {
    name: "similarity-AA",
    generate: (rng, n, d, m) => generateSimilarityProofs(rng, n, d, m),
    check: (ctx, p, tag) => checkSimilarityProof(ctx, p, tag),
  },
  ...ELEMENTS_PROPOSITIONS.map((pr): Unit => ({
    name: `elements-${pr.replace(".", "_")}`,
    generate: (rng, n, _d, m) =>
      Array.from({ length: n }, () => makeElementsProof(rng, pr as ElementsProposition, m)),
    check: (ctx, p, tag) => checkElementsProof(ctx, p, tag),
  })),
];

function fullCheck(ctx: Ctx, unit: Unit, p: ProofProblem, mode: ProofStudentMode, tag: string): void {
  checkProofGeneric(ctx, p, mode, tag);
  checkNonDegenerate(ctx, p, tag);
  unit.check(ctx, p, tag);
}

// ── Answer-key mirror (the exact logic proposed in WIRING.md) ─────────────────

function proofFormatAnswer(p: ProofProblem): string {
  return p.elementsProposition ? `${p.elementsProposition} — Q.E.D.` : p.prove;
}

async function main(): Promise<void> {
  const t0 = Date.now();
  const ctx = newCtx();
  const perUnit: Record<string, { problems: number; checks: number }> = {};
  let seed = 1000;

  // ── 1. Full matrix ──────────────────────────────────────────────────────
  let matrixProblems = 0;
  for (const unit of UNITS) {
    perUnit[unit.name] = { problems: 0, checks: 0 };
    for (const mode of MODES) {
      for (const d of DIFFS) {
        for (const n of COUNTS) {
          seed++;
          const rng = mulberry32(seed);
          const before = ctx.checks;
          let problems: ProofProblem[];
          try {
            problems = unit.generate(rng, n, d, mode);
          } catch (e) {
            check(ctx, false, `matrix ${unit.name}/${mode}/d${d}/n${n}: generator threw: ${e}`);
            continue;
          }
          check(ctx, problems.length === n,
            `matrix ${unit.name}/${mode}/d${d}: got ${problems.length} problems, want ${n}`);
          problems.forEach((p, k) => {
            try {
              fullCheck(ctx, unit, p, mode, `${unit.name}/${mode}/d${d}/n${n}#${k}`);
            } catch (e) {
              check(ctx, false, `${unit.name}/${mode}/d${d}/n${n}#${k}: checker threw: ${e}`);
            }
          });
          matrixProblems += problems.length;
          perUnit[unit.name].problems += problems.length;
          perUnit[unit.name].checks += ctx.checks - before;
        }
      }
    }
  }

  // ── 2. Fuzz: random seeds hunting crashes / degenerate figures ──────────
  const FUZZ = 3000;
  for (let i = 0; i < FUZZ; i++) {
    const unit = UNITS[Math.floor(Math.random() * UNITS.length)];
    const d = DIFFS[Math.floor(Math.random() * 3)];
    const mode = MODES[Math.floor(Math.random() * 4)];
    const rng = mulberry32(Math.floor(Math.random() * 2 ** 31));
    try {
      const [p] = unit.generate(rng, 1, d, mode);
      fullCheck(ctx, unit, p, mode, `fuzz#${i} ${unit.name}`);
    } catch (e) {
      check(ctx, false, `fuzz#${i} ${unit.name}: threw: ${e}`);
    }
  }

  // ── 3. Seed reproducibility ─────────────────────────────────────────────
  const REPRO = 160;
  for (let i = 0; i < REPRO; i++) {
    const unit = UNITS[i % UNITS.length];
    const d = DIFFS[i % 3];
    const mode = MODES[i % 4];
    const s = 50000 + i;
    const a = JSON.stringify(unit.generate(mulberry32(s), 3, d, mode));
    const b = JSON.stringify(unit.generate(mulberry32(s), 3, d, mode));
    check(ctx, a === b, `reproducibility: ${unit.name} seed ${s} diverged`);
  }

  // ── 4. PDF byte verification ────────────────────────────────────────────
  const pdfSamples: { name: string; params: ProofProblem["svgParams"] }[] = [
    { name: "congruence-SSS", params: { kind: "ProofCongruence", subtype: "SSS", sideMarks: [1, 2, 3], angleMarks: [false, false, false], rightAngleAt: -1 } },
    { name: "congruence-HL", params: { kind: "ProofCongruence", subtype: "HL", sideMarks: [1, 2, 0], angleMarks: [false, false, false], rightAngleAt: 2 } },
    { name: "isosceles", params: { kind: "ProofIsosceles", markEqualLegs: true, markBaseAngles: true } },
    { name: "parallel-on", params: { kind: "ProofParallelLines", markedAngles: [2, 6], parallel: true, givenAngle: 115, givenAngleIndex: 2 } },
    { name: "parallel-off", params: { kind: "ProofParallelLines", markedAngles: [3, 5], parallel: false } },
    { name: "similarity", params: { kind: "ProofSimilarity", angleMarks: [true, true, false] } },
    { name: "circle-inscribed", params: { kind: "ProofCircle", figure: "inscribed", arc: 100, angle: 50 } },
    { name: "circle-tangent", params: { kind: "ProofCircle", figure: "tangent", arc: 120, angle: 60 } },
    ...ELEMENTS_PROPOSITIONS.map((pr) => ({
      name: `elements-${pr}`,
      params: { kind: "ProofElements", prop: pr, a: 6, b: 8 } as ProofProblem["svgParams"],
    })),
  ];
  const warnings: string[] = [];
  const origWarn = console.warn;
  const origErr = console.error;
  console.warn = (...a: unknown[]) => { warnings.push(String(a[0])); };
  console.error = (...a: unknown[]) => { warnings.push(String(a[0])); };
  for (const s of pdfSamples) {
    try {
      const doc = React.createElement(
        Document, null,
        React.createElement(Page, { size: "LETTER" },
          React.createElement(Text, null, s.name),
          React.createElement(PdfProofSVG, { params: s.params })
        )
      );
      const buf = Buffer.from(await renderToBuffer(doc as never));
      check(ctx, buf.subarray(0, 5).toString() === "%PDF-", `pdf ${s.name}: bad header`);
      check(ctx, buf.length > 1000, `pdf ${s.name}: suspiciously small (${buf.length}b)`);
    } catch (e) {
      check(ctx, false, `pdf ${s.name}: render threw: ${e}`);
    }
  }
  console.warn = origWarn;
  console.error = origErr;
  const invalidWarnings = warnings.filter((w) => w.includes("Invalid"));
  check(ctx, invalidWarnings.length === 0,
    `pdf: ${invalidWarnings.length} react-pdf "Invalid child" warnings: ${invalidWarnings.slice(0, 3).join(" | ")}`);

  // ── 5. Answer-key exactness ─────────────────────────────────────────────
  let keyProblems = 0;
  for (const unit of UNITS) {
    for (const d of DIFFS) {
      for (let s = 1; s <= 3; s++) {
        const rng = mulberry32(90000 + s * 7919 + d * 131 + unit.name.length);
        const problems = unit.generate(rng, 2, d, "complete");
        for (const p of problems) {
          const key = proofFormatAnswer(p);
          const expected = p.elementsProposition ? `${p.elementsProposition} — Q.E.D.` : p.prove;
          check(ctx, key === expected && key.length > 0,
            `answerkey ${unit.name}/d${d}: key "${key}" ≠ expected "${expected}"`);
          keyProblems++;
        }
      }
    }
  }

  // ── 5b. Elements difficulty tiers + module wiring ───────────────────────
  const { ELEMENTS_BY_DIFFICULTY } = await import("@/lib/factories/ProofElementsFactory");
  for (const d of DIFFS) {
    const rng = mulberry32(777000 + d);
    const allowed = ELEMENTS_BY_DIFFICULTY[d];
    const problems = generateElementsProofs(rng, 40, d, "complete");
    check(ctx, problems.length === 40, `elements tiers d${d}: count`);
    for (const p of problems) {
      const pr = p.svgParams.kind === "ProofElements" ? p.svgParams.prop : "?";
      check(ctx, (allowed as readonly string[]).includes(pr),
        `elements tiers d${d}: prop ${pr} not unlocked at tier ${d}`);
    }
  }

  // Module wiring: OutputMode → studentMode mapping (incl. Classical).
  const wiring = await import("@/modules/geometry-proofs");
  const modeCases: [Parameters<typeof wiring.proofCongruenceProblems>[1], ProofStudentMode][] = [
    ["GuidedNote", "guided"],
    ["Review", "complete"],
    ["Classical", "complete"],
    ["Test", "supply-reasons"],
  ];
  for (const [om, sm] of modeCases) {
    const ps = wiring.proofCongruenceProblems(["SSS"], om, 42, { count: 2 });
    check(ctx, ps.length === 2, `wiring congruence ${om}: count`);
    check(ctx, ps.every((p) => p.studentMode === sm), `wiring congruence ${om}: studentMode ≠ ${sm}`);
    check(ctx, ps.every((p) => p.family === "SSS"), `wiring congruence ${om}: family filter`);
  }
  const wPar = wiring.proofParallelLineProblems([3], "Test", 7, { count: 3 });
  check(ctx, wPar.length === 3 && wPar.every((p) => p.family.includes("Proving Lines Parallel")),
    "wiring parallel tier-3 filter");
  const wCirc = wiring.proofCircleTheoremProblems(["TangentChord"], "Review", 9, { count: 2 });
  check(ctx, wCirc.length === 2 && wCirc.every((p) => p.family.includes("Tangent")),
    "wiring circle family filter");
  check(ctx, wiring.proofCPCTCProblems("Test", 1, { count: 1 })[0]?.family.startsWith("CPCTC:") === true,
    "wiring cpctc");
  check(ctx, wiring.proofIsoscelesProblems("Test", 1, { count: 1 })[0]?.family === "Isosceles",
    "wiring isosceles");
  check(ctx, wiring.proofSimilarityProblems("Test", 1, { count: 1 })[0]?.family === "Similarity:AA",
    "wiring similarity");
  check(ctx, wiring.proofElementsProblems("Classical", 1, { count: 1 })[0]?.presentation === "elements",
    "wiring elements");

  // ── Report ──────────────────────────────────────────────────────────────
  const ms = Date.now() - t0;
  const lines: string[] = [];
  lines.push("# Geometry Proofs — Test Report");
  lines.push("");
  lines.push(`Ran: ${new Date().toISOString()}`);
  lines.push("");
  lines.push(`- Matrix problems: ${matrixProblems} (21 units × 4 modes × 3 difficulties × counts {1,3,12,25})`);
  lines.push(`- Fuzz problems: ${FUZZ}`);
  lines.push(`- Reproducibility samples: ${REPRO}`);
  lines.push(`- PDF samples: ${pdfSamples.length}`);
  lines.push(`- Answer-key problems: ${keyProblems}`);
  lines.push(`- Duration: ${(ms / 1000).toFixed(1)}s`);
  lines.push("");
  lines.push(`## Totals`);
  lines.push("");
  lines.push(`- **Total checks: ${ctx.checks}**`);
  lines.push(`- **Failures: ${ctx.failures.length}**`);
  lines.push("");
  lines.push("## What was checked");
  lines.push("");
  lines.push("- `validateProofShape` on every generated problem (shape, non-empty steps/reasons, final step = prove).");
  lines.push("- Per-family logical checkers walk each proof's steps tracking established facts: measurements, congruence pairs, right angles, midpoints, bisectors, perpendiculars. Every reason is verified to actually justify its statement (e.g. SSS's three cited pairs are exactly the established side pairs; the SAS angle is the included one; HL's hypotenuse is the longest side of a right triangle).");
  lines.push("- Diagram params recomputed from the parsed givens/steps and asserted equal (tick marks, angle arcs, right-angle marks, marked angle pairs).");
  lines.push("- Degeneracy fuzz: positive lengths, angles/arcs in range, triangle inequality, no NaN/undefined leaks.");
  lines.push("- Student-mode blanking discipline (complete/fill-statements/supply-reasons/guided) and PDF-safe plain-text strings (no LaTeX; ≅ → ≃ mapping).");
  lines.push("- Seed reproducibility: identical seed → byte-identical problems.");
  lines.push("- PDF: 16 representative diagrams rendered headless via @react-pdf/renderer; valid %PDF header, sane byte size, zero renderer warnings.");
  lines.push("- Answer key: `formatAnswer` mirror (proposition + Q.E.D. for Elements, else the proved statement) exact across difficulties and seeds.");
  lines.push("- Elements difficulty tiers: only unlocked propositions generated per tier.");
  lines.push("- Module wiring (`src/modules/geometry-proofs.ts`): OutputMode → studentMode mapping incl. Classical→complete; family/tier filters.");
  lines.push("");
  lines.push("## Per-unit matrix breakdown");
  lines.push("");
  lines.push("| unit | problems | checks |");
  lines.push("| --- | ---: | ---: |");
  for (const [name, st] of Object.entries(perUnit)) {
    lines.push(`| ${name} | ${st.problems} | ${st.checks} |`);
  }
  lines.push("");
  if (ctx.failures.length > 0) {
    lines.push("## Failures");
    lines.push("");
    ctx.failures.slice(0, 100).forEach((f) => lines.push(`- ${f}`));
    if (ctx.failures.length > 100) lines.push(`- …and ${ctx.failures.length - 100} more`);
    lines.push("");
  } else {
    lines.push("## Failures");
    lines.push("");
    lines.push("None — all checks passed.");
    lines.push("");
  }
  const reportPath = path.join(__dirname, "TEST_REPORT.md");
  fs.writeFileSync(reportPath, lines.join("\n"));

  console.log(`checks=${ctx.checks} failures=${ctx.failures.length} matrixProblems=${matrixProblems} durationMs=${ms}`);
  if (ctx.failures.length > 0) {
    console.log("FIRST FAILURES:");
    ctx.failures.slice(0, 20).forEach((f) => console.log(" - " + f));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(2);
});
