// run-matrix.ts
// Full generation matrix: every wired lesson × difficulties 1–3 ×
// counts {1,3,12,25}, rendered in GuidedNote/Review/Test.
// (Classical is intentionally NOT in this matrix per the contract update;
// the coordinator verifies cross-mode at integration.)
//
// Per problem: shape, subtype filter, verify payload, independent math
// verification + exact answer string, LaTeX/PDF safety, and card rendering
// in all three modes.

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WIRED_LESSONS } from "../../src/modules/algebra-2";
import type {
  Algebra2Problem,
  Algebra2ProofProblem,
} from "../../src/lib/factories/Algebra2Types";
import { formatAlgebra2Answer } from "../../src/lib/factories/Algebra2Types";
import { latexToText, pdfSafeText } from "../../src/lib/answerKey";
import { validateProofShape } from "../../src/lib/proofTypes";
import { Algebra2ProblemCard } from "../../src/components/problem-cards/Algebra2ProblemCard";
import { Algebra2ProofCard } from "../../src/components/problem-cards/Algebra2ProofCard";
import { check, section, deepEqual, report } from "./harness";
import { verifyProblem } from "./checkers";

type Mode = "GuidedNote" | "Review" | "Test";
const MODES: Mode[] = ["GuidedNote", "Review", "Test"];
const DIFFS = [1, 2, 3] as const;
const COUNTS = [1, 3, 12, 25];

function isProof(p: Algebra2Problem | Algebra2ProofProblem): p is Algebra2ProofProblem {
  return (p as Algebra2ProofProblem).type === "Proof";
}

let problems = 0;

for (let li = 0; li < WIRED_LESSONS.length; li++) {
  const lesson = WIRED_LESSONS[li];
  for (const diff of DIFFS) {
    for (let ci = 0; ci < COUNTS.length; ci++) {
      const count = COUNTS[ci];
      const seed = 10000 + li * 1000 + diff * 100 + ci * 17;
      section(`${lesson.id}/d${diff}/n${count}`);

      const gen = (s: number) =>
        lesson.generate("GuidedNote", s, { count, difficulty: diff }) as (
          | Algebra2Problem
          | Algebra2ProofProblem
        )[];

      const setA = gen(seed);
      const setB = gen(seed);
      check(setA.length === count, `count: got ${setA.length}, want ${count} (seed ${seed})`);
      check(deepEqual(setA, setB), `seed reproducibility (seed ${seed})`);

      for (let pi = 0; pi < setA.length; pi++) {
        const p = setA[pi];
        problems++;
        const tag = `${lesson.id}#${pi} seed=${seed}`;

        // — shape —
        check(!!p.type, `${tag}: type present`);
        if (isProof(p)) {
          check(!!p.family, `${tag}: family present`);
          check(p.steps.length > 0, `${tag}: proof has steps`);
          check(!!p.prove, `${tag}: prove present`);
          const shapeErrs = validateProofShape(p);
          check(shapeErrs.length === 0, `${tag}: validateProofShape: ${shapeErrs.join("; ")}`);
        } else {
          const cp = p as Algebra2Problem;
          check(!!cp.find && cp.steps.length > 0, `${tag}: find/steps present`);
          check(cp.answer !== undefined && cp.answer !== null, `${tag}: answer present`);
          check(
            lesson.subtypes.length === 0 || lesson.subtypes.includes(cp.subtype),
            `${tag}: subtype ${cp.subtype} allowed`
          );
          check(!!cp.verify && Object.keys(cp.verify).length > 0, `${tag}: verify payload present`);

          // — independent math + exact answer —
          const res = verifyProblem(cp);
          check(res.errors.length === 0, `${tag}: math: ${res.errors.join("; ")}`);
          check(cp.answer === res.expectedAnswer, `${tag}: answer exact`);

          // — answer key / text safety —
          const key = formatAlgebra2Answer(cp);
          check(key === latexToText(res.expectedAnswer), `${tag}: answer-key exact`);
          check(!latexToText(cp.answer).includes("\\"), `${tag}: latex fully converted`);
          try {
            const safe = pdfSafeText(cp.answer);
            check(!safe.includes("≅"), `${tag}: pdf-safe`);
          } catch (e) {
            check(false, `${tag}: pdfSafeText threw`);
          }
        }

        // — rendering in all modes —
        for (const mode of MODES) {
          let html = "";
          try {
            html = isProof(p)
              ? renderToStaticMarkup(
                  React.createElement(Algebra2ProofCard, {
                    problem: p as Algebra2ProofProblem,
                    index: pi,
                    mode,
                    revealed: false,
                  })
                )
              : renderToStaticMarkup(
                  React.createElement(Algebra2ProblemCard, {
                    problem: p as Algebra2Problem,
                    index: pi,
                    mode,
                    revealed: false,
                  })
                );
            check(html.length > 500, `${tag}/${mode}: card renders`);
          } catch (e) {
            check(false, `${tag}/${mode}: render threw ${(e as Error).message}`);
            continue;
          }
          if (mode === "Review") {
            if (isProof(p)) {
              const needle = latexToText((p as Algebra2ProofProblem).prove);
              check(html.includes(needle), `${tag}/Review: shows prove line`);
            } else {
              // Review mode reveals every blank's answer inline
              const cp = p as Algebra2Problem;
              const blanks = cp.steps.flatMap((s) => s.blanks ?? []);
              check(blanks.length > 0, `${tag}/Review: has blanks`);
              const missing = blanks.filter((b) => !html.includes(latexToText(b.answer)));
              check(missing.length === 0, `${tag}/Review: all blank answers shown (${missing.length} missing)`);
            }
          }
          if (mode === "Test") {
            const hasBlank = isProof(p)
              ? html.includes('data-blank="true"')
              : html.includes("Answer:");
            check(hasBlank, `${tag}/Test: has blanks`);
          }
        }
      }
    }
  }
}

console.log(`problems generated: ${problems}`);
report("run-matrix");
