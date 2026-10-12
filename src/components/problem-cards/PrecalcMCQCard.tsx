"use client";
// PrecalcMCQCard.tsx
// Renders a single AP Precalculus multiple-choice problem:
// calculator badge, stem, A-D choices, optional diagram, guided steps.

import React from "react";
import type { OutputMode } from "@/lib/ProblemFactory";
import type { PrecalcMCQ } from "@/lib/factories/PrecalcTypes";
import { PrecalcWebSVG } from "@/components/diagrams/PrecalcDiagrams";
import { StepBlock, DiagramBox } from "./SharedAtoms";
import { latexToText } from "@/lib/answerKey";

interface PrecalcMCQCardProps {
  problem: PrecalcMCQ;
  index: number;
  mode: OutputMode;
  revealed: boolean;
}

function CalculatorBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block text-[10px] font-mono tracking-wide px-1.5 py-0.5 rounded border mr-2 ${
        active
          ? "bg-[#eee] border-[#999] text-[#111]"
          : "bg-slate-100 border-slate-300 text-slate-600"
      }`}
    >
      {active ? "CALCULATOR ACTIVE" : "NO CALCULATOR"}
    </span>
  );
}

const LETTERS = ["A", "B", "C", "D"];

export function PrecalcMCQCard({ problem, index, mode, revealed }: PrecalcMCQCardProps) {
  const showAnswers = mode === "Review" || mode === "Classical" || (mode === "GuidedNote" && revealed);
  return (
    <div className="flex break-inside-avoid mb-8">
      <div className="pr-4 flex flex-col items-start justify-start w-10 shrink-0">
        <span className="font-serif text-lg font-bold text-[#111]">{index + 1}</span>
      </div>
      <div className="p-6 flex-1 flex flex-row items-start gap-6">
        <div className="flex-1">
          <div className="flex items-center mb-2 flex-wrap gap-y-1">
            <span className="inline-block text-[10px] font-mono tracking-wide px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-300 text-indigo-700 mr-2">
              AP PRECALCULUS
            </span>
            <CalculatorBadge active={problem.calculator} />
            <span className="text-xs text-slate-500 italic font-sans uppercase tracking-wider">
              {problem.topicLabel}
            </span>
          </div>
          <p className="font-serif text-[1.1rem] text-[#111] mb-4 leading-relaxed font-medium">
            {latexToText(problem.stem)}
          </p>
          <div className="grid grid-cols-1 gap-1.5 mb-4">
            {problem.choices.map((choice, i) => {
              const isCorrect = i === problem.correctIndex;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-3 py-1.5 rounded border font-serif text-[1rem] ${
                    showAnswers && isCorrect
                      ? "bg-[#eee] border-[#111] text-[#111]"
                      : "border-slate-200 text-[#111]"
                  }`}
                >
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full border-2 text-xs font-bold shrink-0 ${
                      showAnswers && isCorrect
                        ? "bg-[#111] text-white border-[#111]"
                        : "border-slate-400 text-slate-600"
                    }`}
                  >
                    {LETTERS[i]}
                  </span>
                  <span>{latexToText(choice)}</span>
                </div>
              );
            })}
          </div>
          {(mode === "GuidedNote" || mode === "Review" || mode === "Classical") && (
            <div className="space-y-3">
              {problem.steps.map((s, i) => (
                <StepBlock key={i} step={s} stepIndex={i} mode={mode === "Classical" ? "Review" : mode} revealed={revealed} />
              ))}
            </div>
          )}
          {mode === "Test" && (
            <p className="font-serif text-sm mt-4 pt-4 border-t border-slate-100">
              <span className="font-semibold">Answer: </span>
              <span className="inline-block border-b-2 border-slate-900 min-w-[120px]">&nbsp;</span>
            </p>
          )}
        </div>
        {problem.svgParams && (
          <DiagramBox>
            <PrecalcWebSVG params={problem.svgParams} />
          </DiagramBox>
        )}
      </div>
    </div>
  );
}
