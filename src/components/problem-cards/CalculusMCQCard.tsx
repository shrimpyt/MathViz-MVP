"use client";
// CalculusMCQCard.tsx
// Renders a single AP-style calculus multiple-choice problem.

import React from "react";
import type { CalcMCQProblem } from "@/lib/factories/CalculusUtils";
import type { OutputMode } from "@/lib/ProblemFactory";
import { StepBlock, DiagramBox } from "./SharedAtoms";
import { latexToText } from "@/lib/answerKey";
import { CalcGraphWeb } from "@/components/diagrams/CalculusGraphs";

interface CalculusMCQCardProps {
  problem: CalcMCQProblem;
  index: number;
  mode: OutputMode;
  revealed: boolean;
}

const LETTERS = ["A", "B", "C", "D", "E"];

function Badge({ text, tone }: { text: string; tone: "calc" | "ap" | "bc" }) {
  const colors =
    tone === "calc"
      ? "bg-amber-100 border-amber-400 text-amber-900"
      : tone === "ap"
        ? "bg-slate-100 border-slate-300 text-slate-600"
        : "bg-purple-100 border-purple-400 text-purple-900";
  return (
    <span className={`inline-block text-[10px] font-mono tracking-wide px-1.5 py-0.5 rounded border mr-2 ${colors}`}>
      {text}
    </span>
  );
}

export function CalculusMCQCard({
  problem,
  index,
  mode,
  revealed,
}: CalculusMCQCardProps) {
  // Classical Notes shows full worked steps, exactly like Review.
  const stepMode: OutputMode = mode === "Classical" ? "Review" : mode;
  const showAnswer = stepMode === "Review" || (mode === "GuidedNote" && revealed);
  const hasDiagram = !!problem.graph;

  return (
    <div className="flex bg-white rounded-none border-2 border-[#0F172A] overflow-hidden break-inside-avoid mb-6 shadow-[6px_6px_0px_rgba(15,23,42,0.05)]">
      <div className="bg-[#f8fafc] border-r-2 border-[#0F172A] px-4 py-6 flex flex-col items-center justify-start w-16 shrink-0">
        <span className="font-serif text-xl font-bold text-[#0F172A]">
          {index + 1}
        </span>
      </div>
      <div className="p-6 flex-1 flex flex-row items-start gap-6">
        <div className="flex-1">
          <div className="flex items-center mb-2 flex-wrap gap-y-1">
            <Badge text="AP CALC" tone="ap" />
            <Badge
              text={problem.calculator ? "CALCULATOR ACTIVE" : "NO CALCULATOR"}
              tone="calc"
            />
            {problem.bcOnly && <Badge text="BC ONLY" tone="bc" />}
            <span className="text-xs text-slate-500 italic font-sans uppercase tracking-wider">
              {problem.topicLabel}
            </span>
          </div>
          <p className="font-serif text-[1.1rem] text-[#0F172A] mb-4 leading-relaxed font-medium">
            {latexToText(problem.prompt)}
          </p>
          {problem.table && (
            <table className="mb-4 border-2 border-[#0F172A] font-serif text-sm">
              <thead>
                <tr className="bg-slate-100">
                  {problem.table.headers.map((h, i) => (
                    <th key={i} className="border border-slate-300 px-3 py-1 font-semibold">
                      {latexToText(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {problem.table.rows.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 1 ? "bg-slate-50" : ""}>
                    {row.map((c, ci) => (
                      <td key={ci} className="border border-slate-300 px-3 py-1 text-center">
                        {latexToText(c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <ol className="mb-4 space-y-1.5">
            {problem.choices.map((choice, ci) => {
              const isCorrect = ci === problem.correctIndex;
              return (
                <li
                  key={ci}
                  className={`font-serif text-[1rem] flex items-start gap-2 px-2 py-1 rounded ${
                    showAnswer && isCorrect ? "bg-green-50 border border-green-700" : ""
                  }`}
                >
                  <span className="font-bold text-[#0F172A] w-6 shrink-0">
                    ({LETTERS[ci]})
                  </span>
                  <span className={showAnswer && isCorrect ? "font-semibold text-green-900" : "text-[#0F172A]"}>
                    {latexToText(choice)}
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="space-y-3">
            {problem.steps?.map((s, i) => (
              <StepBlock
                key={i}
                step={s}
                stepIndex={i}
                mode={stepMode}
                revealed={revealed}
              />
            ))}
          </div>
          {mode === "Test" && (
            <p className="font-serif text-sm mt-4 pt-4 border-t border-slate-100">
              <span className="font-semibold">Answer: </span>
              <span className="inline-block border-b-2 border-slate-900 min-w-[120px]">
                &nbsp;
              </span>
            </p>
          )}
        </div>
        {hasDiagram && (
          <DiagramBox>
            <CalcGraphWeb params={problem.graph!} />
          </DiagramBox>
        )}
      </div>
    </div>
  );
}
