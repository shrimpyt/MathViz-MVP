"use client";
// MathVizEngine.tsx
// Core rendering engine for GuidedNote / Review / Test output modes.
// Enforces US Letter (8.5" × 11") aspect ratio = 816px × 1056px at screen.
// Classical Academy header style: double-rule border, Times New Roman serif,
// dedicated Name / Date / Period slots.

import React, { useState } from "react";
import type {
  MathProblem,
  CircleProblem,
  ProbabilityProblem,
  CongruenceProblem,
  OutputMode,
  BlankField,
  ProblemStep,
} from "@/lib/ProblemFactory";
import { GeometrySVG } from "@/components/GeometrySVG";

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_WIDTH_PX = 816;
const PAGE_HEIGHT_PX = Math.round(PAGE_WIDTH_PX * (11 / 8.5)); // 1056

// ── Blank rendering ───────────────────────────────────────────────────────────

function Blank({
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
        <span className="inline-block px-2 py-0.5 bg-green-50 border border-green-400 rounded font-serif text-sm text-green-900">
          {field.answer}
        </span>
      ) : (
        <span className="inline-block border-b-2 border-slate-500 min-w-[80px] px-1 font-serif text-sm text-slate-400 italic">
          {field.label}
        </span>
      )}
    </span>
  );
}

// ── Step rendering ────────────────────────────────────────────────────────────

function StepBlock({
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

function TEKSBadge({ standard }: { standard: string }) {
  return (
    <span className="inline-block text-[10px] font-mono tracking-wide px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-600 mr-2">
      TEKS {standard}
    </span>
  );
}

// ── SVG diagram box ───────────────────────────────────────────────────────────

function DiagramBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-[130px] h-[130px] flex-shrink-0 border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
      {children}
    </div>
  );
}

// ── Circle Problem Card ───────────────────────────────────────────────────────

function CircleProblemCard({
  problem,
  index,
  mode,
  revealed,
}: {
  problem: CircleProblem;
  index: number;
  mode: OutputMode;
  revealed: boolean;
}) {
  const subtypeLabel: Record<CircleProblem["subtype"], string> = {
    InscribedAngle: "Inscribed Angle Theorem",
    CentralAngle: "Central Angle Theorem",
    Tangent: "Tangent-Chord Angle",
    TwoChords: "Intersecting Chords",
    TwoSecants: "Two Secants from External Point",
  };
  const givenEntries = Object.entries(problem.given);

  return (
    <div className="break-inside-avoid mb-5">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center mb-1">
            <span className="font-serif font-bold text-base text-slate-800 mr-2">
              {index + 1}.
            </span>
            <TEKSBadge standard="G.12(A)" />
            <span className="text-xs text-slate-500 italic">
              {subtypeLabel[problem.subtype]}
            </span>
          </div>
          <p className="font-serif text-sm text-slate-700 mb-2">
            <span className="font-semibold">Given: </span>
            {givenEntries.map(([k, v], i) => (
              <span key={k}>
                {k.replace(/([A-Z])/g, " $1").toLowerCase()} = {v}°
                {i < givenEntries.length - 1 ? ", " : ""}
              </span>
            ))}
            . Find the <span className="italic">{problem.find}</span>.
          </p>
          <div className="pl-3 border-l-2 border-blue-200">
            {problem.steps.map((s, i) => (
              <StepBlock
                key={i}
                step={s}
                stepIndex={i}
                mode={mode}
                revealed={revealed}
              />
            ))}
          </div>
          {mode === "Test" && (
            <p className="font-serif text-sm mt-2">
              <span className="font-semibold">Answer: </span>
              <span className="inline-block border-b-2 border-slate-700 min-w-[80px]">
                &nbsp;
              </span>
            </p>
          )}
        </div>
        <DiagramBox>
          <GeometrySVG
            params={
              problem.svgParams as Parameters<typeof GeometrySVG>[0]["params"]
            }
          />
        </DiagramBox>
      </div>
    </div>
  );
}

// ── Probability Problem Card ──────────────────────────────────────────────────

function ProbabilityProblemCard({
  problem,
  index,
  mode,
  revealed,
}: {
  problem: ProbabilityProblem;
  index: number;
  mode: OutputMode;
  revealed: boolean;
}) {
  const subtypeLabel: Record<ProbabilityProblem["subtype"], string> = {
    ConcentricCircles: "Concentric Circles",
    ShadedSector: "Shaded Sector",
  };
  const scenario =
    problem.subtype === "ConcentricCircles"
      ? `A dart is thrown randomly at a target. The outer circle has radius R = ${problem.outerR} and the inner circle has radius r = ${problem.innerR!}. Find the probability the dart lands in the inner circle.`
      : `A spinner has a shaded sector of ${problem.sectorAngle}°. Find the probability the spinner lands on the shaded region.`;

  return (
    <div className="break-inside-avoid mb-5">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center mb-1">
            <span className="font-serif font-bold text-base text-slate-800 mr-2">
              {index + 1}.
            </span>
            <TEKSBadge standard="G.13(B)" />
            <span className="text-xs text-slate-500 italic">
              {subtypeLabel[problem.subtype]}
            </span>
          </div>
          <p className="font-serif text-sm text-slate-700 mb-2">{scenario}</p>
          <div className="pl-3 border-l-2 border-emerald-200">
            {problem.steps.map((s, i) => (
              <StepBlock
                key={i}
                step={s}
                stepIndex={i}
                mode={mode}
                revealed={revealed}
              />
            ))}
          </div>
          {mode === "Test" && (
            <p className="font-serif text-sm mt-2">
              <span className="font-semibold">Probability: </span>
              <span className="inline-block border-b-2 border-slate-700 min-w-[80px]">
                &nbsp;
              </span>
            </p>
          )}
        </div>
        <DiagramBox>
          <GeometrySVG
            params={
              problem.svgParams as Parameters<typeof GeometrySVG>[0]["params"]
            }
          />
        </DiagramBox>
      </div>
    </div>
  );
}

// ── Congruence Problem Card ───────────────────────────────────────────────────

function CongruenceProblemCard({
  problem,
  index,
  mode,
  revealed,
}: {
  problem: CongruenceProblem;
  index: number;
  mode: OutputMode;
  revealed: boolean;
}) {
  const theoremName: Record<CongruenceProblem["subtype"], string> = {
    SSS: "Side-Side-Side",
    SAS: "Side-Angle-Side",
    ASA: "Angle-Side-Angle",
    AAS: "Angle-Angle-Side",
    HL: "Hypotenuse-Leg",
  };

  return (
    <div className="break-inside-avoid mb-5">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center mb-1">
            <span className="font-serif font-bold text-base text-slate-800 mr-2">
              {index + 1}.
            </span>
            <TEKSBadge standard="G.6(B)" />
            <span className="text-xs text-slate-500 italic">
              {theoremName[problem.subtype]}
            </span>
          </div>

          {/* Given list */}
          <div className="font-serif text-sm text-slate-700 mb-2">
            <span className="font-semibold">Given: </span>
            {problem.given.map((g, i) => (
              <span key={i}>
                {g}
                {i < problem.given.length - 1 ? "; " : ""}
              </span>
            ))}
            {". "}
            <span className="italic">{problem.find}</span>.
          </div>

          {/* Proof steps */}
          <div className="pl-3 border-l-2 border-violet-200">
            {problem.steps.map((s, i) => (
              <StepBlock
                key={i}
                step={s}
                stepIndex={i}
                mode={mode}
                revealed={revealed}
              />
            ))}
          </div>

          {mode === "Test" && (
            <p className="font-serif text-sm mt-2">
              <span className="font-semibold">Theorem: </span>
              <span className="inline-block border-b-2 border-slate-700 min-w-[120px]">
                &nbsp;
              </span>
            </p>
          )}
        </div>

        <DiagramBox>
          <GeometrySVG
            params={
              problem.svgParams as Parameters<typeof GeometrySVG>[0]["params"]
            }
          />
        </DiagramBox>
      </div>
    </div>
  );
}

// ── Classical Academy Document Header ────────────────────────────────────────
// Double top-rule, centered title in large serif, Name/Date/Period on one line.

function DocumentHeader({ mode, title }: { mode: OutputMode; title: string }) {
  const modeLabel: Record<OutputMode, string> = {
    GuidedNote: "Guided Notes",
    Review: "Review Practice",
    Test: "Assessment",
  };

  return (
    <div className="mb-6">
      {/* Classical double-rule header */}
      <div style={{ borderTop: "3px solid #1e293b", borderBottom: "1px solid #1e293b", paddingTop: "6px", paddingBottom: "6px", marginBottom: "12px" }}>
        <h1
          style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
          className="text-2xl font-bold text-center text-slate-900 leading-tight tracking-wide"
        >
          {title}
        </h1>
        <p
          style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
          className="text-center text-xs text-slate-500 tracking-widest uppercase mt-1"
        >
          {modeLabel[mode]}
        </p>
      </div>

      {/* Name / Date / Period row */}
      <div
        style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
        className="flex justify-between items-end text-sm text-slate-700 pb-2 border-b border-slate-300"
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

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 my-4">
      <div className="h-px flex-1 bg-slate-300" />
      <span className="font-serif text-xs font-semibold uppercase tracking-widest text-slate-500 px-2">
        {label}
      </span>
      <div className="h-px flex-1 bg-slate-300" />
    </div>
  );
}

// ── Main MathVizEngine component ──────────────────────────────────────────────

interface MathVizEngineProps {
  problems: MathProblem[];
  mode: OutputMode;
  title?: string;
}

export function MathVizEngine({
  problems,
  mode,
  title = "Geometry",
}: MathVizEngineProps) {
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

  // Global offset index for continuous numbering across all sections
  const circleOffset = 0;
  const probOffset = circleProblems.length;
  const congruenceOffset = probOffset + probProblems.length;

  return (
    <div className="flex flex-col items-center bg-slate-100 min-h-screen py-6">
      {/* GuidedNote reveal toggle */}
      {mode === "GuidedNote" && (
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => setRevealed((r) => !r)}
            className="px-4 py-1.5 rounded-full text-sm font-sans font-medium shadow-sm transition-colors"
            style={{
              background: revealed ? "#16a34a" : "#1d4ed8",
              color: "#fff",
            }}
          >
            {revealed ? "Hide Answers" : "Reveal Answers"}
          </button>
          <span className="text-xs text-slate-500 font-sans">
            Toggle to check your blanks
          </span>
        </div>
      )}

      {/* US Letter page */}
      <div
        className="bg-white shadow-2xl rounded overflow-hidden"
        style={{
          width: PAGE_WIDTH_PX,
          minHeight: PAGE_HEIGHT_PX,
          fontFamily: "'Times New Roman', Georgia, serif",
          padding: "48px 56px",
          boxSizing: "border-box",
        }}
      >
        <DocumentHeader mode={mode} title={title} />

        {/* G.12(A) — Circle Theorems */}
        {circleProblems.length > 0 && (
          <>
            <SectionDivider label="G.12(A) — Circle Theorems" />
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

        {/* G.13(B) — Area-Based Probability */}
        {probProblems.length > 0 && (
          <>
            <SectionDivider label="G.13(B) — Area-Based Probability" />
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

        {/* Footer */}
        <div className="mt-8 pt-3 border-t border-slate-200 flex justify-between text-[10px] font-sans text-slate-400">
          <span>Texas TEKS G.12(A) · G.13(B) · G.6(B)</span>
          <span>MathViz — generated {new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
