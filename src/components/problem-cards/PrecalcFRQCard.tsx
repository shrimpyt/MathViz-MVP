"use client";
// PrecalcFRQCard.tsx
// Renders a single AP Precalculus stimulus-based free-response question:
// the stimulus (table, graph, or scenario), then subparts (a)-(d) with
// workspace, answers, and AP-style justifications.

import React from "react";
import type { OutputMode } from "@/lib/ProblemFactory";
import type { PrecalcFRQ, PrecalcDiagramParams } from "@/lib/factories/PrecalcTypes";
import type { APStimulus } from "@/lib/apTypes";
import { PrecalcWebSVG } from "@/components/diagrams/PrecalcDiagrams";
import { StepBlock, DiagramBox } from "./SharedAtoms";
import { latexToText } from "@/lib/answerKey";

interface PrecalcFRQCardProps {
  problem: PrecalcFRQ;
  index: number;
  mode: OutputMode;
  revealed: boolean;
}

function StimulusBlock({ stimulus }: { stimulus: APStimulus }) {
  if (stimulus.kind === "table") {
    return (
      <div className="mb-4 overflow-x-auto">
        {stimulus.caption && (
          <p className="font-serif text-sm italic text-slate-600 mb-2">{latexToText(stimulus.caption)}</p>
        )}
        <table className="border-collapse border-2 border-[#0F172A] font-serif text-sm">
          <thead>
            <tr>
              {stimulus.headers.map((h, i) => (
                <th key={i} className="border border-[#0F172A] bg-slate-100 px-3 py-1 font-bold">
                  {latexToText(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stimulus.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} className="border border-slate-300 px-3 py-1 text-center">
                    {latexToText(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (stimulus.kind === "graph") {
    // FRQ graph params carry the same `kind` discriminator as PrecalcDiagramParams
    // (extra verification fields are ignored by the renderer).
    const params = stimulus.params as unknown as PrecalcDiagramParams;
    const drawable =
      params.kind === "trig-graph" ||
      params.kind === "polar-grid" ||
      params.kind === "complex-plane" ||
      params.kind === "limit-graph" ||
      params.kind === "conic" ||
      params.kind === "unit-circle" ||
      params.kind === "vectors";
    return (
      <div className="mb-4 flex items-start gap-4">
        {drawable ? (
          <DiagramBox>
            <PrecalcWebSVG params={params} />
          </DiagramBox>
        ) : null}
        {stimulus.caption && (
          <p className="font-serif text-sm italic text-slate-600 flex-1">{latexToText(stimulus.caption)}</p>
        )}
      </div>
    );
  }
  return (
    <div className="mb-4 px-4 py-3 bg-slate-50 border-l-4 border-[#0F172A]">
      <p className="font-serif text-[1.02rem] text-[#0F172A] leading-relaxed">{latexToText(stimulus.text)}</p>
    </div>
  );
}

export function PrecalcFRQCard({ problem, index, mode, revealed }: PrecalcFRQCardProps) {
  const showKey = mode === "Review" || mode === "Classical" || (mode === "GuidedNote" && revealed);
  const totalPoints = problem.subparts.reduce((s, p) => s + (p.points ?? 0), 0);
  return (
    <div className="bg-white rounded-none border-2 border-[#0F172A] overflow-hidden break-inside-avoid mb-6 shadow-[6px_6px_0px_rgba(15,23,42,0.05)]">
      <div className="flex flex-row">
        <div className="bg-[#f8fafc] border-r-2 border-[#0F172A] px-4 py-6 flex flex-col items-center justify-start w-16 shrink-0">
          <span className="font-serif text-xl font-bold text-[#0F172A]">{index + 1}</span>
        </div>
        <div className="p-6 flex-1">
          <div className="flex items-center mb-3 flex-wrap gap-y-1">
            <span className="inline-block text-[10px] font-mono tracking-wide px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-300 text-indigo-700 mr-2">
              AP PRECALCULUS · FRQ
            </span>
            <span
              className={`inline-block text-[10px] font-mono tracking-wide px-1.5 py-0.5 rounded border mr-2 ${
                problem.calculator
                  ? "bg-amber-50 border-amber-400 text-amber-800"
                  : "bg-slate-100 border-slate-300 text-slate-600"
              }`}
            >
              {problem.calculator ? "CALCULATOR ACTIVE" : "NO CALCULATOR"}
            </span>
            <span className="text-xs text-slate-500 italic font-sans uppercase tracking-wider">
              {problem.topicLabel}
            </span>
            <span className="ml-auto text-xs font-sans text-slate-400">[{totalPoints} points]</span>
          </div>

          <StimulusBlock stimulus={problem.stimulus} />

          <div className="space-y-4">
            {problem.subparts.map((sp) => (
              <div key={sp.label} className="border-t border-slate-100 pt-3">
                <p className="font-serif text-[1.05rem] text-[#0F172A] leading-relaxed mb-2">
                  <span className="font-bold">({sp.label})</span> {latexToText(sp.prompt)}
                  {sp.points ? (
                    <span className="text-xs font-sans text-slate-400 ml-2">[{sp.points} pt]</span>
                  ) : null}
                </p>
                {showKey ? (
                  <div className="ml-6 px-3 py-2 bg-green-50 border border-green-200 rounded">
                    <p className="font-serif text-sm text-green-900">
                      <span className="font-bold">Answer: </span>
                      {latexToText(sp.answer)}
                    </p>
                    {sp.justification && (
                      <p className="font-serif text-sm text-green-800 italic mt-1">
                        <span className="font-bold not-italic">Justification: </span>
                        {latexToText(sp.justification)}
                      </p>
                    )}
                    {sp.steps && (
                      <div className="mt-2 space-y-2">
                        {sp.steps.map((s, i) => (
                          <StepBlock
                            key={i}
                            step={s}
                            stepIndex={i}
                            mode={mode === "Classical" ? "Review" : mode}
                            revealed={revealed}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="ml-6 space-y-2">
                    <div className="border-b border-slate-300 h-6" />
                    <div className="border-b border-slate-300 h-6" />
                    {mode === "Test" && <div className="border-b border-slate-300 h-6" />}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
