"use client";
// DocumentHeader.tsx
// Plain teacher-handout document header and section divider.
// Matches the Classical Notes 5.1 print style: centered serif title,
// gray course line, Name/Date/Period rule, unadorned section headings.

import React from "react";
import type { OutputMode } from "@/lib/ProblemFactory";

// ── Document Header ───────────────────────────────────────────────────────────

export function DocumentHeader({ mode, title }: { mode: OutputMode; title: string }) {
  const modeLabel: Record<OutputMode, string> = {
    GuidedNote: "Guided Notes",
    Review: "Review Practice",
    Test: "Assessment",
    Classical: "Classical Notes",
  };

  return (
    <div className="mb-6">
      {/* Plain centered title block */}
      <div className="text-center mb-1">
        <h1 className="font-serif text-2xl font-bold text-[#111] leading-tight">
          {title}
        </h1>
        <p className="font-serif text-sm text-[#555] mt-1">
          {modeLabel[mode]}
        </p>
      </div>

      {/* Name / Date / Period row */}
      <div className="font-serif flex justify-between items-end text-sm text-[#111] py-2 border-b border-[#111]">
        <div>
          Name:{" "}
          <span className="inline-block border-b border-[#111] min-w-[180px]">
            &nbsp;
          </span>
        </div>
        <div className="flex gap-6">
          <div>
            Date:{" "}
            <span className="inline-block border-b border-[#111] min-w-[80px]">
              &nbsp;
            </span>
          </div>
          <div>
            Period:{" "}
            <span className="inline-block border-b border-[#111] min-w-[40px]">
              &nbsp;
            </span>
          </div>
        </div>
      </div>

      {/* Mode-specific directions — plain italic, no boxes */}
      {mode === "GuidedNote" && (
        <p className="mt-3 font-serif text-xs italic text-[#444]">
          Directions: Fill in each blank as we work through the problems
          together. Use the diagrams to guide your thinking.
        </p>
      )}
      {mode === "Test" && (
        <p className="mt-3 font-serif text-xs italic text-[#444]">
          Directions: Show all work. Write your final answer on each answer
          line. Partial credit may be awarded for correct steps.
        </p>
      )}
    </div>
  );
}

// ── Section Divider ───────────────────────────────────────────────────────────

export function SectionDivider({ label }: { label: string }) {
  return (
    <h2 className="font-serif text-base font-bold text-[#111] mt-5 mb-2 pb-1 border-b border-[#999]">
      {label}
    </h2>
  );
}
