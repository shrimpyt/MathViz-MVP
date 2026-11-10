import type { TrigProblem, ProblemStep, BlankField, TrigSubtype } from '../types';
import { pick } from '../math-utils';

export function generateTrigProblems(
  rng: () => number,
  count: number,
  allowedSubtypes?: readonly TrigSubtype[]
): TrigProblem[] {
  const problems: TrigProblem[] = [];

  for (let i = 0; i < count; i++) {
    // 1. Pick ratio type: sin, cos, tan
    const ratioType = pick(rng, ['sin', 'cos', 'tan'] as const);
    
    // 2. Pick subtype
    // IdentifyRatio: Given all sides, write the fraction
    // SolveForSide: Given one acute angle and one side, find another
    // SolveForAngle: Given two sides, use inverse trig to find angle
    const subtypeOptions = allowedSubtypes && allowedSubtypes.length > 0 
      ? allowedSubtypes 
      : ['IdentifyRatio', 'SolveForSide', 'SolveForAngle'] as const;
    const subtype = pick(rng, subtypeOptions) as TrigSubtype;

    // Pythagorean triples to keep numbers clean
    const triples = [
      [3, 4, 5],
      [5, 12, 13],
      [8, 15, 17],
      [7, 24, 25]
    ];
    
    const scale = Math.floor(rng() * 3) + 1; // 1, 2, or 3
    const baseTriple = pick(rng, triples);
    const opp = baseTriple[0] * scale;
    const adj = baseTriple[1] * scale;
    const hyp = baseTriple[2] * scale;

    const angleValue = Math.round(Math.asin(opp / hyp) * (180 / Math.PI)); // degrees

    let given: Record<string, string | number> = {};
    let find = '';
    let answer: string | number = 0;
    const steps: ProblemStep[] = [];
    
    // SVG Labels
    let labelOpp = '';
    let labelAdj = '';
    let labelHyp = '';
    let refAngleLabel = 'θ';
    let scenario: string | undefined;

    if (subtype === 'IdentifyRatio') {
      given = { opposite: opp, adjacent: adj, hypotenuse: hyp };
      find = `\\(${ratioType} \\theta\\)`;
      
      labelOpp = String(opp);
      labelAdj = String(adj);
      labelHyp = String(hyp);
      refAngleLabel = 'θ';

      if (ratioType === 'sin') answer = `${opp}/${hyp}`;
      if (ratioType === 'cos') answer = `${adj}/${hyp}`;
      if (ratioType === 'tan') answer = `${opp}/${adj}`;

      steps.push({
        instruction: `Identify the definition of ${ratioType}:`,
        blanks: [
          { label: 'Numerator', answer: ratioType === 'tan' ? 'opposite' : ratioType === 'sin' ? 'opposite' : 'adjacent' },
          { label: 'Denominator', answer: ratioType === 'tan' ? 'adjacent' : 'hypotenuse' }
        ]
      });
      steps.push({
        instruction: `Substitute the known values based on angle $\\theta$:`,
        blanks: [
          { label: 'Value', answer: String(answer) }
        ]
      });

    } else if (subtype === 'SolveForSide' || subtype === 'ElevationDepression') {
      // Let's pretend we only know the angle and one side
      refAngleLabel = `${angleValue}°`;
      
      const isAltScenario = subtype === 'ElevationDepression';
      // The key must come from the angle the student sees (rounded to a
      // whole degree), not from the exact triple, or nearest-tenth answers
      // drift by up to ~0.3.
      const rad = angleValue * Math.PI / 180;
      const round1 = (v: number) => Math.round(v * 10) / 10;
      // Former scenario pick; still drawn so existing seeds keep their numbers.
      pick(rng, [0, 1, 2]);
      if (ratioType === 'sin') {
        given = { angle: angleValue, hypotenuse: hyp };
        find = `x`;
        answer = round1(hyp * Math.sin(rad));
        labelHyp = String(hyp);
        labelOpp = 'x';
        labelAdj = ''; 
        if (isAltScenario) {
          scenario = `A ${hyp}-foot kite string makes a ${angleValue}° angle of elevation with the ground. How high is the kite (x), in feet?`;
        }

        steps.push({
          instruction: `Select the correct trig ratio linking opposite and hypotenuse:`,
          blanks: [{ label: 'Ratio', answer: 'SOH' }]
        });
        steps.push({
          instruction: `Set up the equation: \\(\\sin(${angleValue}^\\circ) = \\frac{x}{${hyp}}\\)`,
          blanks: [{ label: 'x =', answer: `${hyp} * sin(${angleValue})` }]
        });
      } else if (ratioType === 'cos') {
        given = { angle: angleValue, hypotenuse: hyp };
        find = `x`;
        answer = round1(hyp * Math.cos(rad));
        labelHyp = String(hyp);
        labelAdj = 'x';
        labelOpp = '';
        if (isAltScenario) {
          scenario = `A ${hyp}-foot ladder leans against a wall and makes a ${angleValue}° angle with the ground. How far is the foot of the ladder from the wall (x), in feet?`;
        }

        steps.push({
          instruction: `Select the correct trig ratio linking adjacent and hypotenuse:`,
          blanks: [{ label: 'Ratio', answer: 'CAH' }]
        });
      } else {
        // tan
        given = { angle: angleValue, adjacent: adj };
        find = `x`;
        answer = round1(adj * Math.tan(rad));
        labelAdj = String(adj);
        labelOpp = 'x';
        labelHyp = '';
        if (isAltScenario) {
          scenario = `From a point ${adj} feet from the base of a building, the angle of elevation to the top is ${angleValue}°. How tall is the building (x), in feet?`;
        }

        steps.push({
          instruction: `Select the correct trig ratio linking opposite and adjacent:`,
          blanks: [{ label: 'Ratio', answer: 'TOA' }]
        });
      }
    } else {
      // SolveForAngle
      refAngleLabel = 'x°';
      find = `x`;
      answer = angleValue;

      if (ratioType === 'sin') {
        given = { opposite: opp, hypotenuse: hyp };
        labelOpp = String(opp);
        labelHyp = String(hyp);
        steps.push({
          instruction: `Set up the ratio: \\(\\sin(x) = \\frac{${opp}}{${hyp}}\\)`,
        });
      } else if (ratioType === 'cos') {
        given = { adjacent: adj, hypotenuse: hyp };
        labelAdj = String(adj);
        labelHyp = String(hyp);
        steps.push({
          instruction: `Set up the ratio: \\(\\cos(x) = \\frac{${adj}}{${hyp}}\\)`,
        });
      } else {
        given = { opposite: opp, adjacent: adj };
        labelOpp = String(opp);
        labelAdj = String(adj);
        steps.push({
          instruction: `Set up the ratio: \\(\\tan(x) = \\frac{${opp}}{${adj}}\\)`,
        });
      }

      steps.push({
        instruction: `Use the inverse trig function to find the angle:`,
        blanks: [{ label: 'x', answer: String(angleValue), unit: '°' }]
      });
    }

    problems.push({
      type: "G.9A",
      subtype,
      ratioType,
      given,
      find,
      answer,
      steps,
      ...(scenario ? { scenario } : {}),
      svgParams: {
        kind: "RightTriangle",
        opposite: opp,
        adjacent: adj,
        hypotenuse: hyp,
        labels: {
          opposite: labelOpp,
          adjacent: labelAdj,
          hypotenuse: labelHyp
        },
        referenceAnglePos: (() => {
          const pos = pick(rng, ['base', 'top'] as const);
          // An angle of elevation sits at ground level.
          return scenario ? 'base' : pos;
        })(),
        referenceAngleLabel: refAngleLabel,
        orientation: pick(rng, ['left', 'right'])
      }
    });
  }

  return problems;
}
