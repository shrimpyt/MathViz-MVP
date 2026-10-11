"use client";
// ProofProblemCard.tsx
// Renders a single geometry proof problem: Given / Prove, the diagram, and
// either a two-column Statement|Reason table or the classical Elements
// exposition (enunciation → demonstration → Q.E.D.).
//
// Student blanking comes from the proof's own blankStatement/blankReason
// flags (set by the factory per student mode). Review mode (or `revealed`)
// shows the completed proof.

import React from "react";
import type { OutputMode } from "@/lib/ProblemFactory";
import type { ProofProblem } from "@/lib/proofDiagrams";
import type { ProofPresentation } from "@/lib/proofTypes";
import { ProofGeometrySVG } from "@/components/diagrams/ProofDiagrams";
import { TEKSBadge, DiagramBox } from "./SharedAtoms";
import { latexToText } from "@/lib/answerKey";

interface ProofProblemCardProps {
  problem: ProofProblem;
  index: number;
  mode: OutputMode;
  revealed: boolean;
  presentation?: ProofPresentation;
}

function familyLabel(family: string): string {
  if (family.startsWith("Elements:")) {
    const prop = family.slice("Elements:".length);
    return `Euclid's Elements · Prop. ${prop}`;
  }
  if (family.startsWith("ParallelLines:")) return `Parallel Lines — ${family.slice("ParallelLines:".length)}`;
  if (family.startsWith("CircleTheorem:")) return family.slice("CircleTheorem:".length);
  if (family.startsWith("Similarity:")) return "AA Similarity Proof";
  if (family.startsWith("CPCTC:")) return `CPCTC via ${family.slice("CPCTC:".length)}`;
  if (family === "Isosceles") return "Isosceles Triangle Proof";
  return `${family} Congruence Proof`;
}

function BlankCell({ wide }: { wide?: boolean }) {
  return (
    <span
      className={`inline-block border-b-2 border-slate-700 text-center font-serif text-sm ${
        wide ? "min-w-[220px]" : "min-w-[140px]"
      }`}
    >
      &nbsp;
    </span>
  );
}

function TwoColumnTable({
  problem,
  mode,
  revealed,
}: {
  problem: ProofProblem;
  mode: OutputMode;
  revealed: boolean;
}) {
  const showAnswers = revealed || mode === "Review";
  return (
    <table className="w-full border-collapse font-serif text-[0.95rem]">
      <thead>
        <tr className="border-b-2 border-[#0F172A]">
          <th className="text-left py-1 pr-4 font-bold w-8">#</th>
          <th className="text-left py-1 pr-4 font-bold">Statement</th>
          <th className="text-left py-1 font-bold w-[38%]">Reason</th>
        </tr>
      </thead>
      <tbody>
        {problem.steps.map((s, i) => {
          const blankStmt = !!s.blankStatement && !showAnswers;
          const blankReason = !!s.blankReason && !showAnswers;
          return (
            <tr key={i} className="border-b border-slate-200 align-top">
              <td className="py-1.5 pr-4 text-slate-500">{i + 1}</td>
              <td className="py-1.5 pr-4">
                {blankStmt ? <BlankCell wide /> : latexToText(s.statement)}
              </td>
              <td className="py-1.5 italic text-slate-600">
                {blankReason ? <BlankCell /> : latexToText(s.reason)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ElementsExposition({
  problem,
  mode,
  revealed,
}: {
  problem: ProofProblem;
  mode: OutputMode;
  revealed: boolean;
}) {
  const showAnswers = revealed || mode === "Review";
  return (
    <div>
      {problem.elementsEnunciation && (
        <p className="font-serif italic text-[1.02rem] text-[#0F172A] leading-relaxed mb-4 border-l-4 border-[#D9A720] pl-4">
          {latexToText(problem.elementsEnunciation)}
        </p>
      )}
      <ol className="space-y-2.5">
        {problem.steps.map((s, i) => {
          const isQed = s.statement === "Q.E.D.";
          const blankReason = !!s.blankReason && !showAnswers;
          return (
            <li key={i} className="font-serif text-[0.95rem] leading-relaxed text-[#0F172A]">
              {isQed ? (
                <p className="text-right font-bold tracking-widest mt-3">Q.E.D.</p>
              ) : (
                <p>
                  <span className="text-slate-400 mr-2 select-none">{i + 1}.</span>
                  {latexToText(s.statement)}{" "}
                  <span className="italic text-slate-500 text-[0.85rem]">
                    [{blankReason ? <BlankCell /> : latexToText(s.reason)}]
                  </span>
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function ProofProblemCard({
  problem,
  index,
  mode,
  revealed,
  presentation,
}: ProofProblemCardProps) {
  const style: ProofPresentation =
    presentation ?? problem.presentation ?? (problem.elementsProposition ? "elements" : "two-column");

  return (
    <div className="flex bg-white rounded-none border-2 border-[#0F172A] overflow-hidden break-inside-avoid mb-6 shadow-[6px_6px_0px_rgba(15,23,42,0.05)]">
      <div className="bg-[#f8fafc] border-r-2 border-[#0F172A] px-4 py-6 flex flex-col items-center justify-start w-16 shrink-0">
        <span className="font-serif text-xl font-bold text-[#0F172A]">{index + 1}</span>
      </div>
      <div className="p-6 flex-1 flex flex-row items-start gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center mb-2 flex-wrap">
            <TEKSBadge standard={problem.teks} />
            <span className="text-xs text-slate-500 italic font-sans uppercase tracking-wider">
              {familyLabel(problem.family)}
            </span>
          </div>
          {style === "elements" && problem.elementsProposition ? (
            <p className="font-serif text-[1.15rem] font-bold text-[#0F172A] mb-3">
              Proposition {problem.elementsProposition}
            </p>
          ) : (
            <p className="font-serif text-[1.1rem] text-[#0F172A] mb-4 leading-relaxed font-medium">
              <span className="font-bold">Prove: </span>
              {latexToText(problem.prove)}
            </p>
          )}
          <div className="mb-4">
            <p className="font-serif text-[0.95rem] font-bold text-[#0F172A] mb-1">Given:</p>
            <ul className="list-disc list-inside font-serif text-[0.95rem] text-slate-700 space-y-0.5">
              {problem.given.map((g, i) => (
                <li key={i}>{latexToText(g)}</li>
              ))}
            </ul>
          </div>
          {style === "elements" ? (
            <ElementsExposition problem={problem} mode={mode} revealed={revealed} />
          ) : (
            <TwoColumnTable problem={problem} mode={mode} revealed={revealed} />
          )}
        </div>
        <DiagramBox>
          <ProofGeometrySVG params={problem.svgParams} />
        </DiagramBox>
      </div>
    </div>
  );
}
