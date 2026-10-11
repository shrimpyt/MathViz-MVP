"use client";
// CalculusFRQCard.tsx
// Renders a single AP-style calculus free-response question: one stimulus
// (graph, table, or scenario) followed by subparts (a)–(d).

import React from "react";
import type { BaseFRQProblem, APStimulus } from "@/lib/apTypes";
import type { OutputMode } from "@/lib/ProblemFactory";
import { StepBlock, DiagramBox } from "./SharedAtoms";
import { latexToText } from "@/lib/answerKey";
import { CalcGraphWeb } from "@/components/diagrams/CalculusGraphs";
import type { CalcGraphParams } from "@/lib/factories/CalculusUtils";

interface CalculusFRQCardProps {
  problem: BaseFRQProblem;
  index: number;
  mode: OutputMode;
  revealed: boolean;
}

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

function StimulusBlock({ stimulus }: { stimulus: APStimulus }) {
  if (stimulus.kind === "graph") {
    const params = stimulus.params as unknown as CalcGraphParams;
    return (
      <div className="mb-4 flex items-start gap-4">
        <DiagramBox>
          <CalcGraphWeb params={params} />
        </DiagramBox>
        {stimulus.caption && (
          <p className="font-serif text-sm italic text-slate-600 pt-2">
            {latexToText(stimulus.caption)}
          </p>
        )}
      </div>
    );
  }
  if (stimulus.kind === "table") {
    return (
      <div className="mb-4">
        <table className="border-2 border-[#0F172A] font-serif text-sm">
          <thead>
            <tr className="bg-slate-100">
              {stimulus.headers.map((h, i) => (
                <th key={i} className="border border-slate-300 px-3 py-1 font-semibold">
                  {latexToText(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stimulus.rows.map((row, ri) => (
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
        {stimulus.caption && (
          <p className="font-serif text-sm italic text-slate-600 mt-2">
            {latexToText(stimulus.caption)}
          </p>
        )}
      </div>
    );
  }
  return (
    <p className="font-serif text-[1.05rem] text-[#0F172A] mb-4 leading-relaxed bg-slate-50 border-l-4 border-[#0F172A] pl-4 py-2">
      {latexToText(stimulus.text)}
    </p>
  );
}

export function CalculusFRQCard({
  problem,
  index,
  mode,
  revealed,
}: CalculusFRQCardProps) {
  // Classical Notes shows full worked steps, exactly like Review.
  const stepMode: OutputMode = mode === "Classical" ? "Review" : mode;
  const showAnswers = stepMode === "Review" || (mode === "GuidedNote" && revealed);

  return (
    <div className="flex bg-white rounded-none border-2 border-[#0F172A] overflow-hidden break-inside-avoid mb-6 shadow-[6px_6px_0px_rgba(15,23,42,0.05)]">
      <div className="bg-[#f8fafc] border-r-2 border-[#0F172A] px-4 py-6 flex flex-col items-center justify-start w-16 shrink-0">
        <span className="font-serif text-xl font-bold text-[#0F172A]">
          {index + 1}
        </span>
      </div>
      <div className="p-6 flex-1">
        <div className="flex items-center mb-2 flex-wrap gap-y-1">
          <Badge text="AP CALC · FRQ" tone="ap" />
          <Badge
            text={problem.calculator ? "CALCULATOR ACTIVE" : "NO CALCULATOR"}
            tone="calc"
          />
          <span className="text-xs text-slate-500 italic font-sans uppercase tracking-wider">
            {problem.topicLabel}
          </span>
        </div>

        <StimulusBlock stimulus={problem.stimulus} />

        <ol className="space-y-5">
          {problem.subparts.map((sp) => (
            <li key={sp.label} className="border-t border-slate-100 pt-3">
              <p className="font-serif text-[1.05rem] text-[#0F172A] leading-relaxed mb-2">
                <span className="font-bold">({sp.label}) </span>
                {latexToText(sp.prompt)}
                {sp.points != null && (
                  <span className="text-xs text-slate-400 font-sans ml-2">
                    [{sp.points} pts]
                  </span>
                )}
              </p>
              {sp.steps && (
                <div className="space-y-2 mb-2">
                  {sp.steps.map((s, i) => (
                    <StepBlock
                      key={i}
                      step={s}
                      stepIndex={i}
                      mode={stepMode}
                      revealed={revealed}
                    />
                  ))}
                </div>
              )}
              {showAnswers ? (
                <div className="bg-green-50 border border-green-700 rounded px-3 py-2">
                  <p className="font-serif text-sm text-green-900">
                    <span className="font-bold">Answer: </span>
                    {latexToText(sp.answer)}
                  </p>
                  {sp.justification && (
                    <p className="font-serif text-sm italic text-green-800 mt-1">
                      {latexToText(sp.justification)}
                    </p>
                  )}
                </div>
              ) : (
                mode === "Test" && (
                  <div className="min-h-[72px] border-b-2 border-slate-200">&nbsp;</div>
                )
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
