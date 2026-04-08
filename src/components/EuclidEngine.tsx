"use client";
// EuclidEngine.tsx
// Orchestrator — filters problems by type, calculates offsets, renders cards.
// All visual components live in ./problem-cards/.

import React, { useState } from "react";
import type {
  MathProblem,
  CircleProblem,
  ProbabilityProblem,
  CongruenceProblem,
  TrigProblem,
  OutputMode,
} from "@/lib/types";
import {
  DocumentHeader,
  SectionDivider,
  CircleProblemCard,
  ProbabilityProblemCard,
  CongruenceProblemCard,
  TrigProblemCard,
} from "./problem-cards";

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_WIDTH_PX = 816;
const PAGE_HEIGHT_PX = Math.round(PAGE_WIDTH_PX * (11 / 8.5)); // 1056

// ── Main EuclidEngine component ──────────────────────────────────────────────

interface EuclidEngineProps {
  problems: MathProblem[];
  mode: OutputMode;
  title?: string;
}

export function EuclidEngine({
  problems,
  mode,
  title = "Geometry",
}: EuclidEngineProps) {
  const [revealed, setRevealed] = useState(false);

  const circleProblems = problems.filter(
    (p): p is CircleProblem => p.type === "G.12A"
  );
  const probProblems = problems.filter(
    (p): p is ProbabilityProblem => p.type === "G.13B"
  );
  const congruenceProblems = problems.filter(
    (p): p is CongruenceProblem => p.type === "G.6B"
  );
  const trigProblems = problems.filter(
    (p): p is TrigProblem => p.type === "G.9A"
  );

  // Global offset index for continuous numbering across all sections
  const circleOffset = 0;
  const probOffset = circleProblems.length;
  const congruenceOffset = probOffset + probProblems.length;
  const trigOffset = congruenceOffset + congruenceProblems.length;

  return (
    <div className="flex flex-col items-center min-h-screen py-6 geometric-grid" style={{ backgroundColor: '#0F172A' }}>
      {/* GuidedNote reveal toggle */}
      {mode === "GuidedNote" && (
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => setRevealed((r) => !r)}
            className="px-4 py-1.5 rounded-full text-sm font-sans font-medium shadow-sm transition-colors"
            style={{
              background: revealed ? "#d9a720" : "rgba(30, 45, 69, 0.4)",
              color: revealed ? "#0F172A" : "#fff",
              backdropFilter: "blur(4px)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            {revealed ? "Hide Answers" : "Reveal Answers"}
          </button>
          <span className="text-xs text-slate-500 font-sans italic opacity-70">
            Toggle to check your analytical truth
          </span>
        </div>
      )}

      {/* US Letter page */}
      <div
        className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-sm overflow-hidden"
        style={{
          width: PAGE_WIDTH_PX,
          minHeight: PAGE_HEIGHT_PX,
          fontFamily: "'Times New Roman', Georgia, serif",
          padding: "48px 56px",
          boxSizing: "border-box",
        }}
      >
        <DocumentHeader mode={mode} title={title} />
        
        {/* G.12(A) — Circles */}
        {circleProblems.length > 0 && (
          <>
            <SectionDivider label="G.12(A) — Circle Relationships" />
            {circleProblems.map((p, i) => (
              <CircleProblemCard
                key={i}
                problem={p}
                index={circleOffset + i}
                mode={mode}
                revealed={revealed}
              />
            ))}
          </>
        )}

        {/* G.13(B) — Probability */}
        {probProblems.length > 0 && (
          <>
            <SectionDivider label="G.13(B) — Geometric Probability" />
            {probProblems.map((p, i) => (
              <ProbabilityProblemCard
                key={i}
                problem={p}
                index={probOffset + i}
                mode={mode}
                revealed={revealed}
              />
            ))}
          </>
        )}

        {/* G.6(B) — Triangle Congruence */}
        {congruenceProblems.length > 0 && (
          <>
            <SectionDivider label="G.6(B) — Triangle Congruence" />
            {congruenceProblems.map((p, i) => (
              <CongruenceProblemCard
                key={i}
                problem={p}
                index={congruenceOffset + i}
                mode={mode}
                revealed={revealed}
              />
            ))}
          </>
        )}

        {/* G.9(A) — Right Triangles & Trigonometry */}
        {trigProblems.length > 0 && (
          <>
            <SectionDivider label="G.9(A) — Right Triangles & Trigonometry" />
            {trigProblems.map((p, i) => (
              <TrigProblemCard
                key={i}
                problem={p}
                idx={trigOffset + i}
                mode={mode}
                revealed={revealed}
              />
            ))}
          </>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] font-sans text-slate-400">
          <div className="flex gap-2">
            <span className="font-bold text-slate-600">TEKS</span>
            <span>G.12(A) · G.13(B) · G.6(B) · G.9(A)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-serif italic">Euclid Engine</span>
            <span>—</span>
            <span>{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
