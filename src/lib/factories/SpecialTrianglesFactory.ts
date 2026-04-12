import type { MathProblem, ProblemStep, TrigSVGParams } from '../types';
import { pick } from '../math-utils';

export type SpecialTriangleSubtype = '45-45-90' | '30-60-90';

export interface SpecialTriangleProblem {
  type: "G.9A";
  subtype: SpecialTriangleSubtype;
  given: Record<string, string | number>;
  find: string;
  answer: string | number;
  steps: ProblemStep[];
  svgParams: TrigSVGParams;
}

export function generateSpecialTriangleProblems(
  rng: () => number,
  count: number
): SpecialTriangleProblem[] {
  const problems: SpecialTriangleProblem[] = [];

  for (let i = 0; i < count; i++) {
    const subtype = pick(rng, ['45-45-90', '30-60-90'] as const);
    const steps: ProblemStep[] = [];
    let given: Record<string, string | number> = {};
    let find = '';
    let answer: string | number = '';
    
    // Abstract params for SVG
    let opp = 0;
    let adj = 0;
    let hyp = 0;
    let labels = { opposite: '', adjacent: '', hypotenuse: '' };
    let refAngleLabel = '';
    let refPos: 'base' | 'top' = 'base';

    const baseVal = Math.floor(rng() * 10) + 2; // 2 to 11

    if (subtype === '45-45-90') {
      // legs are x, hyp is x*sqrt(2)
      opp = baseVal;
      adj = baseVal;
      hyp = baseVal * Math.sqrt(2);
      refAngleLabel = '45°';
      
      const knownType = pick(rng, ['leg', 'hypotenuse'] as const);
      if (knownType === 'leg') {
        given = { leg: baseVal };
        find = 'hypotenuse (x)';
        answer = `${baseVal}\\sqrt{2}`;
        labels = { opposite: String(baseVal), adjacent: '', hypotenuse: 'x' };
        
        steps.push({
          instruction: "Recall the 45-45-90 relationship: Hypotenuse = Leg × √2",
        });
        steps.push({
          instruction: `Substitute the leg value: x = ${baseVal} × √2`,
          blanks: [{ label: 'x', answer: answer }]
        });
      } else {
        const hypVal = baseVal * 2; // Keep it clean, e.g. hyp is 10, leg is 5*sqrt(2)
        given = { hypotenuse: hypVal };
        find = 'leg (x)';
        answer = `${baseVal}\\sqrt{2}`;
        labels = { opposite: 'x', adjacent: '', hypotenuse: String(hypVal) };
        
        steps.push({
          instruction: "Recall the 45-45-90 relationship: Leg = Hypotenuse / √2",
        });
        steps.push({
          instruction: `Simplify the radical: ${hypVal} / √2 = ${baseVal}√2`,
          blanks: [{ label: 'x', answer: answer }]
        });
      }
    } else {
      // 30-60-90: short leg x, long leg x*sqrt(3), hyp 2x
      opp = baseVal; // short leg
      adj = baseVal * Math.sqrt(3); // long leg
      hyp = baseVal * 2;
      refAngleLabel = '30°'; // angle opposite to 'opp'
      
      const scenario = pick(rng, ['givenShort', 'givenLong', 'givenHyp'] as const);
      if (scenario === 'givenShort') {
        given = { shortLeg: baseVal };
        const findTarget = pick(rng, ['longLeg', 'hypotenuse'] as const);
        if (findTarget === 'longLeg') {
          find = 'long leg (y)';
          answer = `${baseVal}\\sqrt{3}`;
          labels = { opposite: String(baseVal), adjacent: 'y', hypotenuse: '' };
          steps.push({ instruction: "Long Leg = Short Leg × √3" });
        } else {
          find = 'hypotenuse (z)';
          answer = baseVal * 2;
          labels = { opposite: String(baseVal), adjacent: '', hypotenuse: 'z' };
          steps.push({ instruction: "Hypotenuse = 2 × Short Leg" });
        }
      } else if (scenario === 'givenHyp') {
        given = { hypotenuse: baseVal * 2 };
        find = 'short leg (x)';
        answer = baseVal;
        labels = { opposite: 'x', adjacent: '', hypotenuse: String(baseVal * 2) };
        steps.push({ instruction: "Short Leg = Hypotenuse / 2" });
      } else {
        // given long leg
        given = { longLeg: `${baseVal}\\sqrt{3}` };
        find = 'short leg (x)';
        answer = baseVal;
        labels = { opposite: 'x', adjacent: `${baseVal}√3`, hypotenuse: '' };
        steps.push({ instruction: "Short Leg = Long Leg / √3" });
      }
    }

    problems.push({
      type: "G.9A",
      subtype,
      given,
      find,
      answer,
      steps,
      svgParams: {
        kind: "RightTriangle",
        opposite: opp,
        adjacent: adj,
        hypotenuse: hyp,
        labels,
        referenceAnglePos: refPos,
        referenceAngleLabel: refAngleLabel,
        orientation: pick(rng, ['left', 'right'])
      }
    });
  }

  return problems;
}
