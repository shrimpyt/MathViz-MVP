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
  SpecialTriangleProblem,
  CoordinateProblem,
  MeasurementProblem,
  OutputMode,
} from "@/lib/types";
import type {
  ProofProblem,
  Algebra1Problem,
  Algebra2Problem,
  Algebra2ProofProblem,
  Grade6Problem,
  Grade7Problem,
  Grade8Problem,
  SATProblem,
  PrecalcMCQ,
  PrecalcFRQ,
  CalcMCQProblem,
  BaseFRQProblem,
} from "@/lib/ProblemFactory";
import {
  DocumentHeader,
  SectionDivider,
  CircleProblemCard,
  ProbabilityProblemCard,
  CongruenceProblemCard,
  TrigProblemCard,
  CoordinateProblemCard,
  MeasurementProblemCard,
  ProofProblemCard,
  Algebra1ProblemCard,
  Algebra2ProblemCard,
  Algebra2ProofCard,
  MiddleSchoolGrade6Card,
  MiddleSchoolGrade7Card,
  MiddleSchoolGrade8Card,
  SATProblemCard,
  PrecalcMCQCard,
  PrecalcFRQCard,
  CalculusMCQCard,
  CalculusFRQCard,
} from "./problem-cards";
import { ClassicalNotesCard } from "./problem-cards/ClassicalNotesCard";

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_WIDTH_PX = 816;
const PAGE_HEIGHT_PX = Math.round(PAGE_WIDTH_PX * (11 / 8.5)); // 1056

// ── Main EuclidEngine component ──────────────────────────────────────────────

interface EuclidEngineProps {
  problems: MathProblem[];
  mode: OutputMode;
  title?: string;
  /** Per-entry problem groups for Classical Notes mode (built by WorksheetGenerator). */
  classicalGroups?: ClassicalGroup[];
  /** Worksheet seed — drives deterministic margin-prompt rotation in Classical mode. */
  seed?: number;
  /** Proof document flavor: controls two-column vs Elements presentation. */
  proofDocMode?: "proof-two-column" | "proof-fill-reasons" | "proof-elements";
  /** Standards line for the footer (defaults to the geometry list). */
  standard?: string;
}

export interface ClassicalGroup {
  entryId: string;
  title: string;
  teks: string;
  problems: MathProblem[];
  startIndex: number;
}

export function EuclidEngine({
  problems,
  mode,
  title = "Geometry",
  classicalGroups,
  seed,
  proofDocMode,
  standard,
}: EuclidEngineProps) {
  const [revealed, setRevealed] = useState(false);

  const circleProblems = problems.filter(
    (p): p is CircleProblem => p.type === "G.12A"
  );
  const measurementProblems = problems.filter(
    (p): p is MeasurementProblem => p.type === "G.12B"
  );
  const probProblems = problems.filter(
    (p): p is ProbabilityProblem => p.type === "G.13B"
  );
  const congruenceProblems = problems.filter(
    (p): p is CongruenceProblem => p.type === "G.6B"
  );
  const coordinateProblems = problems.filter(
    (p): p is CoordinateProblem => p.type === "G.2B"
  );
  const trigProblems = problems.filter(
    (p): p is TrigProblem => p.type === "G.9A"
  );
  const specialProblems = problems.filter(
    (p): p is SpecialTriangleProblem => p.type === "G.9B"
  );

  // ── New subject areas ──
  const proofProblems = problems.filter(
    (p): p is ProofProblem =>
      p.type === "Proof" && (p as { domain?: string }).domain === "geometry"
  );
  const a2ProofProblems = problems.filter(
    (p): p is Algebra2ProofProblem =>
      p.type === "Proof" && (p as { domain?: string }).domain === "algebra2"
  );
  const algebra1Problems = problems.filter(
    (p): p is Algebra1Problem => (p as { type: string }).type.startsWith("A.")
  );
  const algebra2Problems = problems.filter(
    (p): p is Algebra2Problem => (p as { type: string }).type.startsWith("A2.")
  );
  const ms6Problems = problems.filter(
    (p): p is Grade6Problem => p.type === "MS.6"
  );
  const ms7Problems = problems.filter(
    (p): p is Grade7Problem => p.type === "MS.7"
  );
  const ms8Problems = problems.filter(
    (p): p is Grade8Problem => p.type === "MS.8"
  );
  const satProblems = problems.filter(
    (p): p is SATProblem => p.type === "SAT"
  );
  const precalcMCQs = problems.filter(
    (p): p is PrecalcMCQ => p.type === "PRECALC_MCQ"
  );
  const precalcFRQs = problems.filter(
    (p): p is PrecalcFRQ =>
      p.type === "AP_FRQ" && (p as { subject?: string }).subject === "precalc"
  );
  const calcMCQs = problems.filter(
    (p): p is CalcMCQProblem => p.type === "CALC_MCQ"
  );
  const calcFRQs = problems.filter(
    (p): p is BaseFRQProblem =>
      p.type === "AP_FRQ" && (p as { subject?: string }).subject === "calc"
  );

  // Global offset index for continuous numbering across all sections
  const circleOffset = 0;
  const measurementOffset = circleOffset + circleProblems.length;
  const probOffset = measurementOffset + measurementProblems.length;
  const congruenceOffset = probOffset + probProblems.length;
  const coordinateOffset = congruenceOffset + congruenceProblems.length;
  const trigOffset = coordinateOffset + coordinateProblems.length;
  const specialOffset = trigOffset + trigProblems.length;
  const proofOffset = specialOffset + specialProblems.length;
  const a2ProofOffset = proofOffset + proofProblems.length;
  const algebra1Offset = a2ProofOffset + a2ProofProblems.length;
  const algebra2Offset = algebra1Offset + algebra1Problems.length;
  const ms6Offset = algebra2Offset + algebra2Problems.length;
  const ms7Offset = ms6Offset + ms6Problems.length;
  const ms8Offset = ms7Offset + ms7Problems.length;
  const satOffset = ms8Offset + ms8Problems.length;
  const precalcMCQOffset = satOffset + satProblems.length;
  const precalcFRQOffset = precalcMCQOffset + precalcMCQs.length;
  const calcMCQOffset = precalcFRQOffset + precalcFRQs.length;
  const calcFRQOffset = calcMCQOffset + calcMCQs.length;

  const showClassicalGroups =
    mode === "Classical" && !!classicalGroups && classicalGroups.length > 0;

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

        {showClassicalGroups ? (
          <>
            {classicalGroups!.map((g) => (
              <ClassicalNotesCard
                key={g.entryId}
                entryId={g.entryId}
                problems={g.problems}
                mode={mode}
                seed={seed}
                startIndex={g.startIndex}
                sectionLabel={g.title}
                teksBadge={g.teks}
              />
            ))}
          </>
        ) : (
          <>

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

        {/* G.12(B) — Circle Measurement */}
        {measurementProblems.length > 0 && (
          <>
            <SectionDivider label="G.12(B) — Circle Measurement" />
            {measurementProblems.map((p, i) => (
              <MeasurementProblemCard
                key={i}
                problem={p}
                index={measurementOffset + i}
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

        {/* G.2(B) — Coordinate Geometry */}
        {coordinateProblems.length > 0 && (
          <>
            <SectionDivider label="G.2(B) — Coordinate Geometry" />
            {coordinateProblems.map((p, i) => (
              <CoordinateProblemCard
                key={i}
                problem={p}
                index={coordinateOffset + i}
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

        {/* G.9(B) — Special Right Triangles */}
        {specialProblems.length > 0 && (
          <>
            <SectionDivider label="G.9(B) — Special Right Triangles" />
            {specialProblems.map((p, i) => (
              <TrigProblemCard
                key={i}
                problem={p}
                idx={specialOffset + i}
                mode={mode}
                revealed={revealed}
              />
            ))}
          </>
        )}

        {/* Geometry Proofs */}
        {proofProblems.length > 0 && (
          <>
            <SectionDivider label="Geometry Proofs" />
            {proofProblems.map((p, i) => (
              <ProofProblemCard
                key={i}
                problem={p}
                index={proofOffset + i}
                mode={mode}
                revealed={revealed}
                presentation={
                  proofDocMode === "proof-elements"
                    ? p.elementsProposition
                      ? "elements"
                      : "two-column"
                    : "two-column"
                }
              />
            ))}
          </>
        )}

        {/* Algebra 2 — Proofs */}
        {a2ProofProblems.length > 0 && (
          <>
            <SectionDivider label="Algebra 2 — Proofs" />
            {a2ProofProblems.map((p, i) => (
              <Algebra2ProofCard
                key={i}
                problem={p}
                index={a2ProofOffset + i}
                mode={mode}
                revealed={revealed}
              />
            ))}
          </>
        )}

        {/* Algebra 1 */}
        {algebra1Problems.length > 0 && (
          <>
            <SectionDivider label="Algebra 1" />
            {algebra1Problems.map((p, i) => (
              <Algebra1ProblemCard
                key={i}
                problem={p}
                index={algebra1Offset + i}
                mode={mode}
                revealed={revealed}
              />
            ))}
          </>
        )}

        {/* Algebra 2 */}
        {algebra2Problems.length > 0 && (
          <>
            <SectionDivider label="Algebra 2" />
            {algebra2Problems.map((p, i) => (
              <Algebra2ProblemCard
                key={i}
                problem={p}
                index={algebra2Offset + i}
                mode={mode}
                revealed={revealed}
              />
            ))}
          </>
        )}

        {/* Grade 6 Math */}
        {ms6Problems.length > 0 && (
          <>
            <SectionDivider label="Grade 6 Math" />
            {ms6Problems.map((p, i) => (
              <MiddleSchoolGrade6Card
                key={i}
                problem={p}
                index={ms6Offset + i}
                mode={mode}
                revealed={revealed}
              />
            ))}
          </>
        )}

        {/* Grade 7 Math */}
        {ms7Problems.length > 0 && (
          <>
            <SectionDivider label="Grade 7 Math" />
            {ms7Problems.map((p, i) => (
              <MiddleSchoolGrade7Card
                key={i}
                problem={p}
                index={ms7Offset + i}
                mode={mode}
                revealed={revealed}
              />
            ))}
          </>
        )}

        {/* Grade 8 Math */}
        {ms8Problems.length > 0 && (
          <>
            <SectionDivider label="Grade 8 Math" />
            {ms8Problems.map((p, i) => (
              <MiddleSchoolGrade8Card
                key={i}
                problem={p}
                index={ms8Offset + i}
                mode={mode}
                revealed={revealed}
              />
            ))}
          </>
        )}

        {/* SAT Math Practice */}
        {satProblems.length > 0 && (
          <>
            <SectionDivider label="SAT Math Practice" />
            {satProblems.map((p, i) => (
              <SATProblemCard
                key={i}
                problem={p}
                index={satOffset + i}
                mode={mode}
                revealed={revealed}
              />
            ))}
          </>
        )}

        {/* AP Precalculus — Multiple Choice */}
        {precalcMCQs.length > 0 && (
          <>
            <SectionDivider label="AP Precalculus — Multiple Choice" />
            {precalcMCQs.map((p, i) => (
              <PrecalcMCQCard
                key={i}
                problem={p}
                index={precalcMCQOffset + i}
                mode={mode}
                revealed={revealed}
              />
            ))}
          </>
        )}

        {/* AP Precalculus — Free Response */}
        {precalcFRQs.length > 0 && (
          <>
            <SectionDivider label="AP Precalculus — Free Response" />
            {precalcFRQs.map((p, i) => (
              <PrecalcFRQCard
                key={i}
                problem={p}
                index={precalcFRQOffset + i}
                mode={mode}
                revealed={revealed}
              />
            ))}
          </>
        )}

        {/* AP Calculus — Multiple Choice */}
        {calcMCQs.length > 0 && (
          <>
            <SectionDivider label="AP Calculus — Multiple Choice" />
            {calcMCQs.map((p, i) => (
              <CalculusMCQCard
                key={i}
                problem={p}
                index={calcMCQOffset + i}
                mode={mode}
                revealed={revealed}
              />
            ))}
          </>
        )}

        {/* AP Calculus — Free Response */}
        {calcFRQs.length > 0 && (
          <>
            <SectionDivider label="AP Calculus — Free Response" />
            {calcFRQs.map((p, i) => (
              <CalculusFRQCard
                key={i}
                problem={p}
                index={calcFRQOffset + i}
                mode={mode}
                revealed={revealed}
              />
            ))}
          </>
        )}

          </>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] font-sans text-slate-400">
          <div className="flex gap-2">
            <span className="font-bold text-slate-600">TEKS</span>
            <span>{standard ?? "G.12(A) · G.12(B) · G.13(B) · G.6(B) · G.2(B) · G.9(A) · G.9(B)"}</span>
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
