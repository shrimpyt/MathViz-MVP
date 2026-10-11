"use client";
// Algebra2ProofCard.tsx
// Two-column proof card for A2.P algebra-2 proofs (BaseProofProblem).
// Flagged cells (blankStatement/blankReason) render as blanks in Test mode
// and in GuidedNote mode until revealed; Review/Classical show everything.

import React from "react";
import type { OutputMode } from "@/lib/ProblemFactory";
import type { Algebra2ProofProblem } from "@/lib/factories/Algebra2Types";
import { TEKSBadge } from "./SharedAtoms";
import { latexToText } from "@/lib/answerKey";

interface Algebra2ProofCardProps {
  problem: Algebra2ProofProblem;
  index: number;
  mode: OutputMode;
  revealed: boolean;
}

function Cell({
  text,
  blanked,
  align = "left",
}: {
  text: string;
  blanked: boolean;
  align?: "left" | "center";
}) {
  if (blanked) {
    return (
      <span
        data-blank="true"
        className={`inline-block border-b-2 border-slate-700 min-w-[140px] text-${align}`}
      >
        &nbsp;
      </span>
    );
  }
  return <span className="font-serif text-sm text-[#0F172A]">{latexToText(text)}</span>;
}

export function Algebra2ProofCard({
  problem,
  index,
  mode,
  revealed,
}: Algebra2ProofCardProps) {
  const blankCell = (flagged?: boolean) =>
    !!flagged && (mode === "Test" || (mode === "GuidedNote" && !revealed));

  return (
    <div className="bg-white rounded-none border-2 border-[#0F172A] overflow-hidden break-inside-avoid mb-6 shadow-[6px_6px_0px_rgba(15,23,42,0.05)]">
      <div className="flex">
        <div className="bg-[#f8fafc] border-r-2 border-[#0F172A] px-4 py-6 flex flex-col items-center justify-start w-16 shrink-0">
          <span className="font-serif text-xl font-bold text-[#0F172A]">
            {index + 1}
          </span>
        </div>
        <div className="p-6 flex-1">
          <div className="flex items-center mb-2">
            <TEKSBadge standard="A2.P" />
            <span className="text-xs text-slate-500 italic font-sans uppercase tracking-wider">
              Proof · {problem.family}
            </span>
          </div>
          <p className="font-serif text-[1.05rem] text-[#0F172A] mb-1 leading-relaxed">
            <span className="font-bold">Given: </span>
            {problem.given.map((g, i) => (
              <span key={i}>
                {latexToText(g)}
                {i < problem.given.length - 1 ? "; " : ""}
              </span>
            ))}
          </p>
          <p className="font-serif text-[1.05rem] text-[#0F172A] mb-4 leading-relaxed">
            <span className="font-bold">Prove: </span>
            <span className="italic">{latexToText(problem.prove)}</span>
          </p>

          <table className="w-full border-collapse border-2 border-[#0F172A]">
            <thead>
              <tr className="bg-[#f8fafc]">
                <th className="border border-[#0F172A] px-3 py-1.5 font-sans text-xs uppercase tracking-wider text-slate-500 w-10">
                  #
                </th>
                <th className="border border-[#0F172A] px-3 py-1.5 font-sans text-xs uppercase tracking-wider text-slate-500 text-left">
                  Statement
                </th>
                <th className="border border-[#0F172A] px-3 py-1.5 font-sans text-xs uppercase tracking-wider text-slate-500 text-left">
                  Reason
                </th>
              </tr>
            </thead>
            <tbody>
              {problem.steps.map((s, i) => (
                <tr key={i}>
                  <td className="border border-slate-300 px-3 py-1.5 text-center font-serif text-sm text-slate-500">
                    {i + 1}
                  </td>
                  <td className="border border-slate-300 px-3 py-1.5">
                    <Cell text={s.statement} blanked={blankCell(s.blankStatement)} />
                  </td>
                  <td className="border border-slate-300 px-3 py-1.5">
                    <Cell text={s.reason} blanked={blankCell(s.blankReason)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {mode === "Test" && (
            <p className="font-serif text-xs mt-3 text-slate-500 italic">
              Fill in each blank statement and reason to complete the proof.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
