"use client";
// SATProblemCard.tsx
// Renders a single SAT math problem: multiple-choice (A–D) or student-produced
// response (grid-in), in digital-SAT style.

import React from "react";
import type { OutputMode } from "@/lib/types";
import type { SATProblem } from "@/lib/satTypes";
import { SAT_DOMAIN_META } from "@/lib/satTypes";
import { DiagramBox } from "./SharedAtoms";
import { SatWebDiagram } from "@/components/diagrams/SatWebDiagrams";
import { latexToText } from "@/lib/answerKey";

interface SATProblemCardProps {
  problem: SATProblem;
  index: number;
  mode: OutputMode;
  revealed: boolean;
}

function DifficultyDots({ level }: { level: 1 | 2 | 3 }) {
  return (
    <span className="text-[10px] tracking-tight text-slate-500" title={`Difficulty ${level}/3`}>
      {"●".repeat(level)}
      <span className="text-slate-300">{"●".repeat(3 - level)}</span>
    </span>
  );
}

function MCQOptions({
  problem,
  mode,
}: {
  problem: SATProblem;
  mode: OutputMode;
}) {
  const showKey = mode === "Review";
  return (
    <div className="mt-3 space-y-2">
      {problem.options!.map((opt) => {
        const isKey = opt.isKey;
        const highlight = showKey && isKey;
        return (
          <div key={opt.option}>
            <div
              className={`flex items-center gap-3 px-3 py-2 border rounded-sm font-serif ${
                highlight
                  ? "border-green-700 bg-green-50"
                  : "border-slate-300 bg-white"
              }`}
            >
              <span
                className={`flex items-center justify-center w-7 h-7 rounded-full border-2 text-sm font-bold shrink-0 ${
                  highlight
                    ? "border-green-700 bg-green-700 text-white"
                    : "border-[#0F172A] text-[#0F172A]"
                }`}
              >
                {opt.option}
              </span>
              <span className="text-[1.05rem] text-[#0F172A]">
                {latexToText(opt.label)}
              </span>
              {highlight && (
                <span className="ml-auto text-xs font-sans font-semibold text-green-800 uppercase tracking-wide">
                  Correct
                </span>
              )}
            </div>
            {showKey && !isKey && opt.misconceptionNote && (
              <p className="text-xs font-sans italic text-slate-500 mt-0.5 ml-10">
                Misconception ({opt.misconception}): {opt.misconceptionNote}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function GridInBoxes({
  problem,
  mode,
}: {
  problem: SATProblem;
  mode: OutputMode;
}) {
  const showKey = mode === "Review";
  const keyChars = showKey ? latexToText(problem.key).split("") : [];
  const boxes = 7;
  return (
    <div className="mt-3">
      <div className="flex gap-1">
        {Array.from({ length: boxes }, (_, i) => (
          <span
            key={i}
            className={`inline-flex items-center justify-center w-9 h-11 border-2 font-serif text-lg ${
              showKey
                ? "border-green-700 bg-green-50 text-green-900"
                : "border-[#0F172A] bg-white"
            }`}
          >
            {showKey ? keyChars[i] ?? "" : "\u00A0"}
          </span>
        ))}
      </div>
      <p className="text-xs font-sans text-slate-500 italic mt-1">
        Student-produced response: enter your answer as a fraction or decimal.
      </p>
    </div>
  );
}

export function SATProblemCard({
  problem,
  index,
  mode,
}: SATProblemCardProps) {
  const meta = SAT_DOMAIN_META[problem.domain];
  const isTable = problem.diagram?.kind === "SatTable";

  return (
    <div className="flex bg-white rounded-none border-2 border-[#0F172A] overflow-hidden break-inside-avoid mb-6 shadow-[6px_6px_0px_rgba(15,23,42,0.05)]">
      <div className="border-r-2 border-[#0F172A] px-4 py-6 flex flex-col items-center justify-start w-16 shrink-0" style={{ backgroundColor: `${meta.badge}12` }}>
        <span className="font-serif text-xl font-bold text-[#0F172A]">
          {index + 1}
        </span>
      </div>
      <div className="p-6 flex-1">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span
            className="inline-block text-[10px] font-mono tracking-wide px-1.5 py-0.5 rounded text-white mr-1"
            style={{ backgroundColor: meta.badge }}
          >
            SAT {meta.short}
          </span>
          <span className="text-xs text-slate-500 italic font-sans">
            {meta.label} · {problem.standard}
          </span>
          <span className="ml-auto flex items-center gap-2">
            <span className="text-[10px] font-sans uppercase tracking-wider text-slate-400">
              {problem.format === "MCQ" ? "Multiple choice" : "Grid-in"}
            </span>
            <DifficultyDots level={problem.difficulty} />
          </span>
        </div>

        <div className="flex flex-row items-start gap-6">
          <div className="flex-1 min-w-0">
            <p className="font-serif text-[1.1rem] text-[#0F172A] mb-2 leading-relaxed font-medium">
              {latexToText(problem.stem)}
            </p>
            {isTable && problem.diagram && (
              <SatWebDiagram params={problem.diagram} />
            )}
          </div>
          {!isTable && problem.diagram && (
            <DiagramBox>
              <SatWebDiagram params={problem.diagram} />
            </DiagramBox>
          )}
        </div>

        {problem.format === "MCQ" ? (
          <MCQOptions problem={problem} mode={mode} />
        ) : (
          <GridInBoxes problem={problem} mode={mode} />
        )}

        {mode === "Review" && (
          <div className="mt-4 pt-3 border-t border-slate-200">
            <p className="font-serif text-sm text-slate-700 leading-relaxed">
              <span className="font-semibold">Answer: </span>
              {latexToText(problem.key)}
              {problem.format === "GridIn" &&
                problem.acceptedForms &&
                problem.acceptedForms.length > 1 && (
                  <span className="text-slate-500">
                    {" "}
                    (also accepted:{" "}
                    {problem.acceptedForms
                      .filter((f) => f !== problem.key)
                      .map(latexToText)
                      .join(", ")}
                    )
                  </span>
                )}
            </p>
            <p className="font-serif text-sm text-slate-600 leading-relaxed mt-1">
              <span className="font-semibold">Solution: </span>
              {latexToText(problem.explanation)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
