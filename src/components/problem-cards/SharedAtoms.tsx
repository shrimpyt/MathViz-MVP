"use client";
// SharedAtoms.tsx
// Reusable micro-components shared by all problem cards.

import React from "react";
import type { BlankField, ProblemStep, OutputMode } from "@/lib/ProblemFactory";
import { latexToText } from "@/lib/answerKey";

// ── Blank rendering ───────────────────────────────────────────────────────────

export function Blank({
  field,
  mode,
  revealed,
}: {
  field: BlankField;
  mode: OutputMode;
  revealed: boolean;
}) {
  if (mode === "Test") {
    return (
      <span className="inline-block border-b-2 border-slate-700 min-w-[64px] mx-1 text-center font-serif text-sm">
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
      </span>
    );
  }
  if (mode === "Review") {
    return (
      <span className="inline-block mx-1 font-serif text-sm font-bold text-[#111]">
        {latexToText(field.answer)}
      </span>
    );
  }
  // GuidedNote
  return (
    <span className="inline-flex items-center mx-1 gap-1">
      {revealed ? (
        <span className="inline-block font-serif text-sm font-bold text-[#111]">
          {latexToText(field.answer)}
        </span>
      ) : (
        <span className="inline-block border-b-2 border-slate-900 min-w-[80px] px-1 font-serif text-sm text-slate-800 italic">
          {latexToText(field.label)}
        </span>
      )}
    </span>
  );
}

// ── Step rendering ────────────────────────────────────────────────────────────

export function StepBlock({
  step,
  stepIndex,
  mode,
  revealed,
}: {
  step: ProblemStep;
  stepIndex: number;
  mode: OutputMode;
  revealed: boolean;
}) {
  return (
    <div className="mb-2">
      <p className="font-serif text-sm text-slate-700 leading-relaxed">
        <span className="font-semibold text-slate-500 mr-1">
          Step {stepIndex + 1}.
        </span>
        {latexToText(step.instruction)}
        {step.blanks?.map((b, i) => (
          <React.Fragment key={i}>
            {" "}
            <Blank field={b} mode={mode} revealed={revealed} />
          </React.Fragment>
        ))}
      </p>
    </div>
  );
}

// ── TEKS badge ────────────────────────────────────────────────────────────────

export function TEKSBadge({ standard }: { standard: string }) {
  return (
    <span className="inline-block text-[10px] font-serif italic text-[#555] mr-2">
      TEKS {standard}
    </span>
  );
}

// ── SVG diagram box ───────────────────────────────────────────────────────────

export function DiagramBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-[140px] h-[140px] flex-shrink-0 overflow-hidden bg-white">
      {children}
    </div>
  );
}
