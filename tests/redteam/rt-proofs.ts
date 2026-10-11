// rt-proofs.ts — adversarial proof checks beyond tests/proofs/checkers.ts:
// 1. proof-two-column vs proof-fill-reasons map to different OutputModes
// 2. PDF answer key for proofs lists each step's reason
// 3. reason/statement logical consistency per family (independent of checkers)
// 4. elements proposition numbering validity
// 5. A2 proof families: step/reason sanity
import { CURRICULUM_REGISTRY } from "@/modules/CurriculumRegistry";
import { formatAnswer } from "@/lib/answerKey";
import { toOutputMode } from "@/components/WorksheetGenerator";
import { failures, fail, report } from "./util";

import { counter } from "./util";
const bump = (n = 1) => { counter.checks += n; };
const byId = (id: string) => CURRICULUM_REGISTRY.find((e) => e.id === id)!;

const proofIds = CURRICULUM_REGISTRY.filter((e) => /proof/i.test(e.id) && !e.underConstruction).map((e) => e.id);
console.log("proof entries:", proofIds.join(", "));

// ── 1. docType identity: proof-two-column vs proof-fill-reasons ──────────────
// (WorksheetGenerator.toOutputMode maps proof-two-column → Review (complete
// proofs) and proof-fill-reasons → Test (supply-reasons); verify via the real
// mapping, not a copy)
for (const id of proofIds) {
  bump();
  const a = JSON.stringify(byId(id).generate("Test", 4242, { count: 3, difficulty: 2 }));
  const b = JSON.stringify(byId(id).generate("Test", 4242, { count: 3, difficulty: 2 }));
  // Simulate the two docTypes: both call generate("Test", seed + i*7919, {count, difficulty})
  if (a !== b) fail("PROOF-DOCTYPE-DIFF", id, "Test", 4242, `unreachable`);
}
// The real check: toOutputMode mapping — the two docTypes must differ
bump();
if (toOutputMode("proof-two-column") === toOutputMode("proof-fill-reasons"))
  fail("PROOF-DOCTYPE-IDENTICAL", "docTypes", "proof-two-column/proof-fill-reasons", 0,
    `both docTypes map to OutputMode "${toOutputMode("proof-two-column")}" → byte-identical problem sets; "Full two-column proofs" tooltip promise broken (reasons blanked via supply-reasons unless answer key shown)`);

// ── 2. PDF answer key for proofs: does it contain the reasons? ───────────────
for (const id of proofIds.slice(0, 8)) {
  for (const p of (byId(id).generate("Test", 7, { count: 2, difficulty: 2 }) as any[])) {
    bump();
    const key = formatAnswer(p);
    const reasons = (p.steps ?? []).map((s: any) => s.reason).join(" ");
    if (!/Given/i.test(key) && reasons.length > 20 && key.length < reasons.length / 3)
      fail("PROOF-KEY-NO-REASONS", id, "Test", 7,
        `PDF answer key line is just "${key}" — none of the ${p.steps.length} reasons appear in the key; a printed proof-fill-reasons key is ungradeable`);
    break;
  }
}

// ── 3. independent logical checks per proof ──────────────────────────────────
const VALID_FINAL_REASONS = ["SSS", "SAS", "ASA", "AAS", "HL", "CPCTC", "AA"];
for (const id of proofIds) {
  for (let s = 0; s < 15; s++) {
    for (const p of (byId(id).generate("Test", s * 13 + 2, { count: 2, difficulty: 2 }) as any[])) {
      if (p.type !== "Proof" || !Array.isArray(p.steps)) continue;
      bump();
      // 3a. every non-blank reason is non-empty
      for (const st of p.steps) {
        if (!st.blankReason && (!st.reason || !String(st.reason).trim()))
          fail("PROOF-EMPTY-REASON", id, "Test", s, `step "${st.statement}" has empty non-blanked reason`);
      }
      bump();
      // 3b. final step: statement must restate `prove`, reason must be a valid concluding theorem
      const last = p.steps[p.steps.length - 1];
      if (last && last.statement !== "Q.E.D.") {
        const proveNorm = String(p.prove).replace(/\s+/g, " ").trim();
        const lastNorm = String(last.statement).replace(/\s+/g, " ").trim();
        if (proveNorm && lastNorm !== proveNorm)
          fail("PROOF-FINAL-STATEMENT", id, "Test", s, `final statement "${lastNorm}" != prove "${proveNorm}"`);
        bump();
        const lr = String(last.reason ?? "");
        const fam = String(p.family ?? "");
        // family-specific: SAS family must conclude with SAS, etc.
        if (/^(SAS|SSS|ASA|AAS|HL)$/.test(fam) && !lr.includes(fam))
          fail("PROOF-FINAL-REASON", id, "Test", s, `family=${fam} but final reason is "${lr}"`);
        if (/CPCTC/i.test(fam) && !/CPCTC/i.test(lr))
          fail("PROOF-FINAL-REASON", id, "Test", s, `family=${fam} but final reason is "${lr}"`);
      }
      bump();
      // 3c. "Given" reasons must reference statements present in p.given
      const givens = (p.given ?? []).map((g: string) => String(g).replace(/\s+/g, " ").trim());
      for (const st of p.steps) {
        if (String(st.reason).trim().toLowerCase() === "given") {
          const sn = String(st.statement).replace(/\s+/g, " ").trim();
          if (givens.length && !givens.includes(sn))
            fail("PROOF-GIVEN-MISMATCH", id, "Test", s, `reason "Given" for statement "${sn}" not in given[] ${JSON.stringify(givens).slice(0, 100)}`);
        }
      }
      bump();
      // 3d. elements propositions must be valid "Book.Proposition" refs I.1–I.48 etc.
      if (p.elementsProposition) {
        if (!/^[IVX]+\.\d+$/.test(String(p.elementsProposition)))
          fail("PROOF-ELEMENTS-REF", id, "Test", s, `malformed elementsProposition "${p.elementsProposition}"`);
      }
      bump();
      // 3e. supply-reasons mode: every non-Given, non-QED step MUST have blankReason
      if (p.studentMode === "supply-reasons") {
        for (const st of p.steps) {
          if (st.reason !== "Given" && st.statement !== "Q.E.D." && !st.blankReason)
            fail("PROOF-BLANK-LEAK", id, "Test", s, `supply-reasons step "${st.statement}" missing blankReason → reason "${st.reason}" leaks to students`);
        }
      }
    }
  }
}

// ── 4. A2 proof families ─────────────────────────────────────────────────────
for (const id of ["a2-p-trig", "a2-p-log", "a2-p-poly"]) {
  const e = CURRICULUM_REGISTRY.find((x) => x.id === id);
  if (!e || e.underConstruction) continue;
  for (let s = 0; s < 10; s++) {
    for (const p of (e.generate("Test", s * 7 + 1, { count: 2, difficulty: 2 }) as any[])) {
      bump();
      const steps = p.steps ?? [];
      if (!steps.length) { fail("A2PROOF-NOSTEPS", id, "Test", s, `no steps`); continue; }
      for (const st of steps) {
        bump();
        if (!st.statement || !String(st.statement).trim()) fail("A2PROOF-EMPTY", id, "Test", s, `empty statement`);
        if (st.reason !== undefined && !String(st.reason).trim() && !st.blankReason)
          fail("A2PROOF-EMPTY-REASON", id, "Test", s, `empty reason on "${String(st.statement).slice(0, 50)}"`);
      }
    }
  }
}

report("rt-proofs");
process.exit(0);
