"use client";
// SharedAtoms.tsx
// Reusable micro-components shared by all problem cards.

import React from "react";
import type { BlankField, ProblemStep, OutputMode } from "@/lib/ProblemFactory";

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
      <span className="inline-block mx-1 px-2 py-0.5 bg-blue-50 border border-blue-300 rounded font-serif text-sm text-blue-900">
        {field.answer}
      </span>
    );
  }
  // GuidedNote
  return (
    <span className="inline-flex items-center mx-1 gap-1">
      {revealed ? (
        <span className="inline-block px-2 py-0.5 bg-green-50 border border-green-800 font-serif text-sm text-green-900">
          {field.answer}
        </span>
      ) : (
        <span className="inline-block border-b-2 border-slate-900 min-w-[80px] px-1 font-serif text-sm text-slate-800 italic">
          {field.label}
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
        {step.instruction}
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
    <span className="inline-block text-[10px] font-mono tracking-wide px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-600 mr-2">
      TEKS {standard}
    </span>
  );
}

// ── SVG diagram box ───────────────────────────────────────────────────────────

export function DiagramBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-[140px] h-[140px] flex-shrink-0 border-2 border-[#1e293b] overflow-hidden bg-white shadow-[4px_4px_0px_rgba(30,41,59,0.1)]">
      {children}
    </div>
  );
}
