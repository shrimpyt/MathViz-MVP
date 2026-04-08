"use client";
// DocumentHeader.tsx
// Classical Academy document header and section divider.

import React from "react";
import type { OutputMode } from "@/lib/ProblemFactory";

// ── Document Header ───────────────────────────────────────────────────────────

export function DocumentHeader({ mode, title }: { mode: OutputMode; title: string }) {
  const modeLabel: Record<OutputMode, string> = {
    GuidedNote: "Guided Notes",
    Review: "Review Practice",
    Test: "Assessment",
  };

  return (
    <div className="mb-6">
      {/* Classical double-rule header */}
      <div style={{ borderTop: "3px solid #172336", borderBottom: "1px solid #172336", paddingTop: "6px", paddingBottom: "6px", marginBottom: "12px" }}>
        <h1
          className="font-serif text-2xl font-bold text-center text-slate-900 leading-tight tracking-wide"
        >
          {title}
        </h1>
        <p
          className="font-serif text-center text-xs text-slate-500 tracking-widest uppercase mt-1"
        >
          {modeLabel[mode]}
        </p>
      </div>

      {/* Name / Date / Period row */}
      <div
        className="font-serif flex justify-between items-end text-sm text-slate-700 pb-2 border-b border-slate-300"
      >
        <div>
          Name:{" "}
          <span className="inline-block border-b border-slate-600 min-w-[180px]">
            &nbsp;
          </span>
        </div>
        <div className="flex gap-6">
          <div>
            Date:{" "}
            <span className="inline-block border-b border-slate-600 min-w-[80px]">
              &nbsp;
            </span>
          </div>
          <div>
            Period:{" "}
            <span className="inline-block border-b border-slate-600 min-w-[40px]">
              &nbsp;
            </span>
          </div>
        </div>
      </div>

      {/* Mode-specific directions */}
      {mode === "GuidedNote" && (
        <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs font-sans text-amber-800">
          <span className="font-semibold">Directions:</span> Fill in each blank
          as we work through the problems together. Use the diagrams to guide
          your thinking.
        </div>
      )}
      {mode === "Test" && (
        <div className="mt-3 p-2 bg-slate-50 border border-slate-200 rounded text-xs font-sans text-slate-700">
          <span className="font-semibold">Directions:</span> Show all work.
          Write your final answer on each answer line. Partial credit may be
          awarded for correct steps.
        </div>
      )}
    </div>
  );
}

// ── Section Divider ───────────────────────────────────────────────────────────

export function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 my-4">
      <div className="h-px flex-1" style={{ backgroundColor: "#d9a720", opacity: 0.5 }} />
      <span className="font-serif text-xs font-semibold uppercase tracking-widest px-2" style={{ color: "#172336" }}>
        {label}
      </span>
      <div className="h-px flex-1" style={{ backgroundColor: "#d9a720", opacity: 0.5 }} />
    </div>
  );
}
