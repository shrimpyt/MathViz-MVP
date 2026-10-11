// rt-ui.ts — SSR-render preview components with hostile props (no browser).
// EuclidEngine + problem cards via react-dom/server renderToStaticMarkup.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CURRICULUM_REGISTRY } from "@/modules/CurriculumRegistry";
import { EuclidEngine } from "@/components/EuclidEngine";
import { failures, fail, counter, report } from "./util";

const bump = (n = 1) => { counter.checks += n; };
const byId = (id: string) => CURRICULUM_REGISTRY.find((e) => e.id === id)!;

function tryRender(name: string, el: React.ReactElement, expectContains?: string[]) {
  bump();
  let html = "";
  try {
    html = renderToStaticMarkup(el);
  } catch (e) {
    fail("UI-SSR-THROW", name, "-", 0, `renderToStaticMarkup threw: ${e instanceof Error ? e.message.slice(0, 200) : e}`);
    return "";
  }
  bump();
  if (!html || html.length < 20) fail("UI-SSR-EMPTY", name, "-", 0, `rendered ${html.length} chars`);
  for (const s of expectContains ?? []) {
    bump();
    if (!html.includes(s)) fail("UI-SSR-MISSING", name, "-", 0, `expected content missing: "${s.slice(0, 60)}"`);
  }
  bump();
  if (/undefined|NaN/.test(html.replace(/data-[a-z-]+="[^"]*"/g, "")))
    fail("UI-SSR-LEAK", name, "-", 0, `rendered "undefined"/"NaN" text`);
  return html;
}

// 1. empty problem list, all modes
for (const mode of ["GuidedNote", "Review", "Test", "Classical"] as const) {
  tryRender(`EuclidEngine/empty/${mode}`,
    React.createElement(EuclidEngine, { problems: [], mode, title: "Empty" }));
}

// 2. malformed problems
const malformed: any[] = [
  null, undefined, {}, { type: "BOGUS" }, { type: "G.12A" },
  { type: "G.12A", subtype: "InscribedAngle", given: null, answer: NaN, steps: null },
  { type: "SAT", format: "MCQ", options: null },
  { type: "Proof", steps: null },
];
for (let i = 0; i < malformed.length; i++) {
  tryRender(`EuclidEngine/malformed-${i}`,
    React.createElement(EuclidEngine, { problems: [malformed[i]].filter(Boolean) as any, mode: "Test", title: "X" }));
}

// 3. real problems, every mode + proof docModes
const mixed: any[] = [];
for (const id of ["trig-1-ratios", "anatomy-of-a-circle", "proofs-4-2-sss-sas", "sat-hoa-linear-equations", "calc-limits", "ms7-3-5-circumference-area-circles", "a2-4-3-det-inverse"]) {
  mixed.push(...(byId(id).generate("Test", 3, { count: 2, difficulty: 2 }) as any[]));
}
for (const mode of ["GuidedNote", "Review", "Test", "Classical"] as const) {
  tryRender(`EuclidEngine/mixed/${mode}`,
    React.createElement(EuclidEngine, { problems: mixed, mode, title: "Mixed √ θ π" }));
}
for (const pdm of ["proof-two-column", "proof-fill-reasons", "proof-elements"] as const) {
  const proofs = byId("proofs-4-2-sss-sas").generate("Test", 3, { count: 2, difficulty: 2 }) as any[];
  const html = tryRender(`EuclidEngine/${pdm}`,
    React.createElement(EuclidEngine, { problems: proofs, mode: "Test", title: "Proofs", proofDocMode: pdm }));
  // fill-reasons must NOT leak reason text when answers hidden
  if (pdm === "proof-fill-reasons" && html) {
    bump();
    const firstReason = String(proofs[0].steps.find((s: any) => s.blankReason)?.reason ?? "");
    if (firstReason && html.includes(firstReason))
      fail("UI-PROOF-LEAK", pdm, "-", 0, `blanked reason leaked into SSR HTML: "${firstReason.slice(0, 60)}"`);
  }
}

// 4. classical groups (mismatched startIndex / empty groups)
{
  const e = byId("trig-1-ratios");
  const problems = e.generate("Classical", 9, { count: 3, difficulty: 2 }) as any[];
  tryRender("EuclidEngine/classical",
    React.createElement(EuclidEngine, {
      problems, mode: "Classical", title: "Classical",
      classicalGroups: [{ entryId: e.id, title: e.title, teks: "G.9A", problems, startIndex: 5 }],
      seed: 9,
    }));
  // groups referencing problems not in the list
  tryRender("EuclidEngine/classical-orphan",
    React.createElement(EuclidEngine, {
      problems: [], mode: "Classical", title: "Classical",
      classicalGroups: [{ entryId: "nope", title: "Nope", teks: "X", problems: [{ type: "BOGUS" } as any], startIndex: 0 }],
      seed: 9,
    }));
}

// 5. rapid re-renders with changing modes (state churn)
{
  bump();
  try {
    for (let i = 0; i < 20; i++) {
      const mode = (["GuidedNote", "Review", "Test", "Classical"] as const)[i % 4];
      renderToStaticMarkup(React.createElement(EuclidEngine, { problems: mixed, mode, title: `T${i}` }));
    }
  } catch (e) {
    fail("UI-SSR-CHURN", "EuclidEngine", "-", 0, `rapid re-render threw: ${e instanceof Error ? e.message.slice(0, 160) : e}`);
  }
}

// 6. hostile titles
for (const t of ["", "A".repeat(10000), "<script>alert(1)</script> \\frac{x}{y} 🎉", null as any, 123 as any]) {
  tryRender(`EuclidEngine/title-${String(t).slice(0, 12)}`,
    React.createElement(EuclidEngine, { problems: mixed.slice(0, 2), mode: "Test", title: t }));
}

report("rt-ui");
process.exit(0);
