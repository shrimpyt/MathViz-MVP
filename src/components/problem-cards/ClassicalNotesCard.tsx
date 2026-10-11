// ClassicalNotesCard.tsx
// Web preview renderer for CLASSICAL NOTES document mode.
//
// Spectrum: guided notes (fill blanks) -> classical notes (structure given,
// reasoning student's) -> blank. Per topic section this renders:
//   1. DEFINITIONS block — terms/theorems printed IN FULL for students to
//      copy (grammar stage needs exact text). Omitted gracefully when the
//      entry id has no seeded definitions.
//   2. DEMONSTRATION area — worked steps are SHOWN, but each step's
//      reason/justification is blanked as a ruled line for the student to
//      fill in. Steps without a `reason` render normally; the reason slot
//      holds a generic margin prompt instead.
//   3. MARGIN prompts — one Socratic question printed alongside every step,
//      rotated from a seeded prompt bank with no adjacent repeats.
//   4. NARRATION box + error log at the bottom of the section.
//
// Generation contract: factories treat OutputMode "Classical" like "Review"
// (full steps, answers visible) — this renderer never reaches into factories.

import React from "react";
import type { MathProblem, OutputMode, ProblemStep } from "@/lib/ProblemFactory";
import type { ProofSVGParams } from "@/lib/proofDiagrams";
import { GeometrySVG } from "@/components/GeometrySVG";
import { ProofGeometrySVG } from "@/components/diagrams/ProofDiagrams";
import { Blank, DiagramBox, TEKSBadge } from "./SharedAtoms";
import { getClassicalDefinitions } from "@/lib/classicalDefinitions";
import {
  assignMarginPrompts,
  GENERIC_MARGIN_PROMPT,
} from "@/lib/classicalPrompts";
import { problemToQuestion } from "@/core/types";
import { formatAnswer, latexToText } from "@/lib/answerKey";

// ── Step/diagram normalization ──────────────────────────────────────────────
// The classical renderer was built when every MathProblem carried steps +
// geometry svgParams. New areas differ: SAT/FRQ problems have no steps,
// proof steps use { statement, reason } instead of { instruction, ... }.
// Normalize here so the section still renders.

type ProofStepLike = { statement?: string; reason?: string };

/** Steps as the classical step renderer expects them (instruction-based). */
function classicalSteps(p: MathProblem): ProblemStep[] {
  if (!("steps" in p) || !Array.isArray(p.steps)) return [];
  return (p.steps as (ProblemStep | ProofStepLike)[]).map((s) =>
    "instruction" in s && typeof (s as ProblemStep).instruction === "string"
      ? (s as ProblemStep)
      : {
          instruction:
            "statement" in s && typeof (s as ProofStepLike).statement === "string"
              ? ((s as ProofStepLike).statement as string)
              : "",
          ...((s as ProofStepLike).reason
            ? { reason: (s as ProofStepLike).reason as string }
            : {}),
        }
  );
}

/**
 * Diagram params the classical card can draw: geometry kinds go to
 * GeometrySVG, proof kinds to ProofGeometrySVG. Other areas' diagrams are
 * rendered by their own cards/sections, not the classical section.
 */
function classicalDiagram(p: MathProblem): { kind: string } | undefined {
  if (!("svgParams" in p)) return undefined;
  const sp = p.svgParams as { kind?: unknown } | null | undefined;
  if (!sp || typeof sp.kind !== "string") return undefined;
  return sp as { kind: string };
}

export interface ClassicalNotesCardProps {
  /** Registry entry id — used to look up the DEFINITIONS block. */
  entryId: string;
  /** Problems for this topic section. */
  problems: MathProblem[];
  mode: OutputMode;
  /** Worksheet seed — drives deterministic margin-prompt rotation. */
  seed?: number;
  /** Global problem number offset (continuous numbering across sections). */
  startIndex?: number;
  /** Accepted for interface compatibility; Classical mode has no reveal toggle. */
  revealed?: boolean;
  /** Section heading, e.g. "G.12(A) — Circle Relationships". */
  sectionLabel?: string;
  /** TEKS badge text, e.g. "G.12(A)". */
  teksBadge?: string;
}

// ── Ruled writing lines ───────────────────────────────────────────────────────

function RuledLines({ count, testId }: { count: number; testId?: string }) {
  return (
    <div>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          data-testid={testId}
          className="border-b border-slate-400 h-7"
        />
      ))}
    </div>
  );
}

// ── One demonstration step ────────────────────────────────────────────────────

function ClassicalStep({
  step,
  stepIndex,
  marginPrompt,
}: {
  step: ProblemStep;
  stepIndex: number;
  marginPrompt: string;
}) {
  return (
    <div className="flex gap-4 items-start" data-testid="classical-step">
      <div className="flex-1 min-w-0">
        <p className="font-serif text-sm text-slate-700 leading-relaxed">
          <span className="font-semibold text-slate-500 mr-1">
            Step {stepIndex + 1}.
          </span>
          {latexToText(step.instruction)}
          {step.blanks?.map((b, i) => (
            <React.Fragment key={i}>
              {" "}
              {/* Classical mode is Review-like: answers shown, reasoning blanked */}
              <Blank field={b} mode="Review" revealed={false} />
            </React.Fragment>
          ))}
        </p>
        {step.reason ? (
          // The dialectic margin made structural: instruction shown, reason blanked.
          <p className="font-serif text-sm text-slate-700 mt-1 flex items-end gap-2">
            <span className="font-semibold text-slate-500 shrink-0">
              Reason:
            </span>
            <span
              data-testid="reason-blank"
              className="inline-block border-b-2 border-slate-900 flex-1 min-w-[120px]"
            >
              &nbsp;
            </span>
          </p>
        ) : (
          // No reason on this step: it renders normally, and the reason slot
          // carries a generic margin prompt instead of a blank line.
          <p
            data-testid="generic-margin-prompt"
            className="font-serif text-xs italic text-slate-500 mt-1"
          >
            {GENERIC_MARGIN_PROMPT}
          </p>
        )}
      </div>
      {/* Margin prompt alongside the step */}
      <div className="w-40 shrink-0 border-l-2 border-[#d9a720] pl-2">
        <p
          data-testid="margin-prompt"
          className="font-serif text-xs italic text-slate-600 leading-snug"
        >
          {marginPrompt}
        </p>
      </div>
    </div>
  );
}

// ── The card ──────────────────────────────────────────────────────────────────

export function ClassicalNotesCard({
  entryId,
  problems,
  mode: _mode,
  seed = 1,
  startIndex = 0,
  revealed: _revealed,
  sectionLabel,
  teksBadge,
}: ClassicalNotesCardProps) {
  const definitions = getClassicalDefinitions(entryId);

  const stepLists = problems.map(classicalSteps);
  const totalSteps = stepLists.reduce((n, steps) => n + steps.length, 0);
  const marginPrompts = assignMarginPrompts(seed, totalSteps);

  // Distribute prompts across problems in step order (no adjacent repeats
  // across the whole section, including problem boundaries).
  let promptCursor = 0;
  const promptsFor = (count: number) => {
    const slice = marginPrompts.slice(promptCursor, promptCursor + count);
    promptCursor += count;
    return slice;
  };

  return (
    <div className="bg-white border-2 border-[#0F172A] overflow-hidden mb-8 shadow-[6px_6px_0px_rgba(15,23,42,0.05)]">
      {/* Section header */}
      <div className="bg-[#f8fafc] border-b-2 border-[#0F172A] px-6 py-4">
        {teksBadge && <TEKSBadge standard={teksBadge} />}
        <span className="font-serif text-lg font-bold text-[#0F172A]">
          {sectionLabel ?? "Classical Notes"}
        </span>
        <span className="block font-serif text-xs italic text-slate-500 mt-1">
          Study the demonstration. Supply each missing reason. Answer the
          margin questions.
        </span>
      </div>

      <div className="p-6">
        {/* 1. DEFINITIONS block — printed in full, students copy the exact text */}
        {definitions && definitions.length > 0 && (
          <div
            data-testid="definitions-block"
            className="mb-8 border-2 border-[#0F172A] bg-[#fffdf5] p-5 break-inside-avoid"
          >
            <h3 className="font-serif text-base font-bold text-[#0F172A] uppercase tracking-wide mb-1">
              Definitions
            </h3>
            <p className="font-serif text-xs italic text-slate-500 mb-4">
              Copy each definition exactly as written.
            </p>
            <ol className="space-y-4">
              {definitions.map((d, i) => (
                <li key={i} data-testid="definition">
                  <p className="font-serif text-sm text-[#0F172A] leading-relaxed">
                    <span className="font-bold mr-1">{i + 1}.</span>
                    {latexToText(d)}
                  </p>
                  <div className="mt-1 ml-6 mr-2">
                    <RuledLines count={2} testId="definition-copy-line" />
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* 2 + 3. DEMONSTRATION area with margin prompts */}
        <div className="space-y-8">
          {problems.map((p, pi) => {
            const q = problemToQuestion(p, startIndex + pi);
            const steps = stepLists[pi];
            const stepPrompts = promptsFor(steps.length);
            const diagram = classicalDiagram(p);
            return (
              <div
                key={pi}
                data-testid="classical-problem"
                className="break-inside-avoid"
              >
                <div className="flex flex-row items-start gap-6">
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-[1.05rem] text-[#0F172A] mb-4 leading-relaxed font-medium">
                      <span className="font-bold">
                        {startIndex + pi + 1}.{" "}
                      </span>
                      {latexToText(q.text)}
                    </p>
                    <div className="space-y-4">
                      {steps.map((s, si) => (
                        <ClassicalStep
                          key={si}
                          step={s}
                          stepIndex={si}
                          marginPrompt={stepPrompts[si] ?? GENERIC_MARGIN_PROMPT}
                        />
                      ))}
                    </div>
                    <p className="font-serif text-sm mt-3 text-slate-700">
                      <span className="font-semibold">Answer: </span>
                      {latexToText(formatAnswer(p))}
                    </p>
                  </div>
                  {diagram && (
                    <DiagramBox>
                      {diagram.kind.startsWith("Proof") ? (
                        <ProofGeometrySVG params={diagram as unknown as ProofSVGParams} />
                      ) : (
                        <GeometrySVG
                          params={
                            diagram as Parameters<
                              typeof GeometrySVG
                            >[0]["params"]
                          }
                        />
                      )}
                    </DiagramBox>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 4. NARRATION box + error log — once per section */}
        <div
          data-testid="narration-box"
          className="mt-10 border-2 border-[#0F172A] p-5 break-inside-avoid"
        >
          <h3 className="font-serif text-base font-bold text-[#0F172A] uppercase tracking-wide mb-1">
            Narration
          </h3>
          <p className="font-serif text-xs italic text-slate-500 mb-3">
            Explain this idea in your own words.
          </p>
          <RuledLines count={5} testId="narration-line" />
        </div>

        <div
          data-testid="error-log"
          className="mt-4 border border-slate-400 p-4 break-inside-avoid"
        >
          <h4 className="font-serif text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
            Error log
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-serif text-xs font-semibold text-slate-500 mb-1">
                My mistake
              </p>
              <RuledLines count={3} testId="error-log-line" />
            </div>
            <div>
              <p className="font-serif text-xs font-semibold text-slate-500 mb-1">
                My correction
              </p>
              <RuledLines count={3} testId="error-log-line" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
