// middle-school.ts
// Registry entries for the middle-school area (grades 6/7/8).
//
// Structure follows the authoritative scope document
// (CURRICULUM_SCOPE.md): one entry per lesson-level row, entry titles use
// the doc's topic names. Grade 6 = SAVVAS year-at-a-glance (topics 1–7),
// Grade 7 = Pearson year-at-a-glance (topics 1–7 incl. Step-up), Grade 8 =
// TEKS / Common Core (not in the doc).
//
// WIRING: the coordinator merges MIDDLE_SCHOOL_ENTRIES into
// CURRICULUM_REGISTRY (see tests/middle-school/WIRING.md). "Classical" mode
// is treated exactly like "Review" (full steps, 3× count).

import type { CurriculumEntry, GenerateOptions } from "./CurriculumRegistry";
import type { MathProblem, OutputMode } from "@/lib/ProblemFactory";
import { mulberry32 } from "@/lib/math-utils";
import { assignDiagramVariants } from "@/lib/diagramVariants";
import { generateGrade6Problems } from "@/lib/factories/MiddleSchoolGrade6";
import type { Grade6Subtype } from "@/lib/factories/MiddleSchoolTypes";
import { generateGrade7Problems } from "@/lib/factories/MiddleSchoolGrade7";
import type { Grade7Subtype } from "@/lib/factories/MiddleSchoolTypes";
import { generateGrade8Problems } from "@/lib/factories/MiddleSchoolGrade8";
import type { Grade8Subtype } from "@/lib/factories/MiddleSchoolTypes";

type Grade = 6 | 7 | 8;
type LessonSubtype = Grade6Subtype | Grade7Subtype | Grade8Subtype;

interface LessonDef {
  id: string;
  topic: number;
  topicTitle: string;
  title: string;
  story: string;
  teks: string;
  description: string;
  grade: Grade;
  subtypes: LessonSubtype[];
}

function difficultyOf(options?: GenerateOptions): 1 | 2 | 3 {
  return options?.difficulty ?? 2;
}

function generateFor(def: LessonDef, mode: OutputMode, seed: number, options?: GenerateOptions): MathProblem[] {
  const rng = mulberry32(seed);
  // GuidedNote/Test = 1×, Review/Classical = 3× (Classical ≡ Review).
  const count = options?.count ?? (mode === "Review" || mode === "Classical" ? 9 : 3);
  const difficulty = difficultyOf(options);
  // Stamp seeded per-diagram presentation variants + de-duplicate
  // visually identical figures within this generation run.
  const stamp = (ps: MathProblem[]) => assignDiagramVariants(ps, rng);
  if (def.grade === 6) {
    return stamp(generateGrade6Problems(rng, count, difficulty, def.subtypes as Grade6Subtype[]));
  }
  if (def.grade === 7) {
    return stamp(generateGrade7Problems(rng, count, difficulty, def.subtypes as Grade7Subtype[]));
  }
  return stamp(generateGrade8Problems(rng, count, difficulty, def.subtypes as Grade8Subtype[]));
}

const G6 = "Grade 6 Math";
const G7 = "Grade 7 Math";
const G8 = "Grade 8 Math";

const LESSONS: LessonDef[] = [
  // ── Grade 6 · T1 Numbers & Operations ──────────────────────────────────────
  {
    id: "ms6-1-1-multiplying-dividing-fractions", topic: 30, topicTitle: `${G6} · T1 Numbers & Operations`,
    title: "1-1: Multiplying & Dividing Fractions",
    story: "Multiply and divide fractions and mixed numbers with confidence.",
    teks: "6.NS.A.1", description: "Fraction × whole, +/− with common denominators, ×/÷ in simplest form.",
    grade: 6, subtypes: ["MultiplyingDividingFractions"],
  },
  {
    id: "ms6-1-2-decimal-fluency", topic: 30, topicTitle: `${G6} · T1 Numbers & Operations`,
    title: "1-2: Fluency with Decimals",
    story: "Add, subtract, multiply, and divide decimals fluently.",
    teks: "6.NS.B.2 · 6.NS.B.3", description: "Decimal +/−/×/÷ including money contexts.",
    grade: 6, subtypes: ["DecimalFluency"],
  },
  {
    id: "ms6-1-3-fdp-conversions", topic: 30, topicTitle: `${G6} · T1 Numbers & Operations`,
    title: "1-3: Fraction, Decimal & Percent Conversions",
    story: "Move fluently between fractions, decimals, and percents.",
    teks: "6.RP.A.3c", description: "Convert between the three forms, including percents from fractions.",
    grade: 6, subtypes: ["FDPConversions"],
  },
  // ── Grade 6 · T2 Integers & Rational Numbers ───────────────────────────────
  {
    id: "ms6-2-1-integer-operations", topic: 30, topicTitle: `${G6} · T2 Integers & Rational Numbers`,
    title: "2-1: Integer Operations",
    story: "Compare, order, and compute with positive and negative integers.",
    teks: "6.NS.C.5–7", description: "Compare/order on a number line; +/−/×/÷ integers; integer word problems.",
    grade: 6, subtypes: ["IntegerOperations"],
  },
  // ── Grade 6 · T3 Expressions, Equations & Relationships ────────────────────
  {
    id: "ms6-3-1-variables-expressions", topic: 30, topicTitle: `${G6} · T3 Expressions, Equations & Relationships`,
    title: "3-1: Variables & Expressions",
    story: "Evaluate expressions and write expressions from words.",
    teks: "6.EE.A.2", description: "Evaluate one- and two-variable expressions; write expressions for situations.",
    grade: 6, subtypes: ["VariablesAndExpressions"],
  },
  {
    id: "ms6-3-2-equivalent-expressions", topic: 30, topicTitle: `${G6} · T3 Expressions, Equations & Relationships`,
    title: "3-2: Equivalent Expressions",
    story: "Combine like terms and use the distributive property.",
    teks: "6.EE.A.3 · 6.EE.A.4", description: "Combining like terms; expanding with the distributive property.",
    grade: 6, subtypes: ["EquivalentExpressions"],
  },
  {
    id: "ms6-3-3-equations-inequalities", topic: 30, topicTitle: `${G6} · T3 Expressions, Equations & Relationships`,
    title: "3-3: Equations & Inequalities",
    story: "Solve one-step equations and inequalities.",
    teks: "6.EE.B.5–8", description: "One-step equations (incl. negatives); one-step inequalities with number-line graphs.",
    grade: 6, subtypes: ["EquationsAndInequalities"],
  },
  {
    id: "ms6-3-4-two-variable-relationships", topic: 30, topicTitle: `${G6} · T3 Expressions, Equations & Relationships`,
    title: "3-4: Two-Variable Relationships",
    story: "Use rules like y = 3x + 2 to connect two quantities.",
    teks: "6.EE.C.9", description: "Evaluate two-variable rules; write rules for real situations.",
    grade: 6, subtypes: ["TwoVariableRelationships"],
  },
  // ── Grade 6 · T4 Proportionality ───────────────────────────────────────────
  {
    id: "ms6-4-1-ratios-rates", topic: 30, topicTitle: `${G6} · T4 Proportionality`,
    title: "4-1: Ratios & Rates",
    story: "Simplify ratios and find unit rates.",
    teks: "6.RP.A.1 · 6.RP.A.2", description: "Simplify ratios; equivalent ratios; unit rates (speed, price).",
    grade: 6, subtypes: ["RatiosAndRates"],
  },
  {
    id: "ms6-4-2-ratio-reasoning", topic: 30, topicTitle: `${G6} · T4 Proportionality`,
    title: "4-2: Ratio Reasoning",
    story: "Use ratios to solve percent and scaling problems.",
    teks: "6.RP.A.3", description: "Scale ratios; find a percent of a number; ratio word problems.",
    grade: 6, subtypes: ["RatioReasoning"],
  },
  // ── Grade 6 · T5 Geometry ──────────────────────────────────────────────────
  {
    id: "ms6-5-1-area-polygons", topic: 30, topicTitle: `${G6} · T5 Geometry`,
    title: "5-1: Area of Polygons",
    story: "Area of parallelograms, triangles, and trapezoids.",
    teks: "6.G.A.1", description: "Apply area formulas; work backwards to find a missing dimension.",
    grade: 6, subtypes: ["AreaOfPolygons"],
  },
  {
    id: "ms6-5-2-volume-surface-area", topic: 30, topicTitle: `${G6} · T5 Geometry`,
    title: "5-2: Volume & Surface Area of Rectangular Prisms",
    story: "Fill it up or wrap it up: volume and surface area.",
    teks: "6.G.A.2 · 6.G.A.4", description: "Volume V = lwh; surface area; real-world prism problems.",
    grade: 6, subtypes: ["VolumeAndSurfaceArea"],
  },
  {
    id: "ms6-5-3-triangle-properties", topic: 30, topicTitle: `${G6} · T5 Geometry`,
    title: "5-3: Triangles & Triangle Properties",
    story: "The angles of a triangle always add to 180°.",
    teks: "6.G.A", description: "Triangle angle sum; isosceles triangle problems.",
    grade: 6, subtypes: ["TriangleProperties"],
  },
  // ── Grade 6 · T6 Measurement & Data ────────────────────────────────────────
  {
    id: "ms6-6-1-data-displays", topic: 30, topicTitle: `${G6} · T6 Measurement & Data`,
    title: "6-1: Data Displays",
    story: "Read tables and bar graphs like a detective.",
    teks: "6.SP.A · 6.SP.B", description: "Read frequency tables and bar graphs; compare categories.",
    grade: 6, subtypes: ["DataDisplays"],
  },
  {
    id: "ms6-6-2-measures-center-variation", topic: 30, topicTitle: `${G6} · T6 Measurement & Data`,
    title: "6-2: Measures of Center & Variation",
    story: "Mean, median, mode, and range summarize a data set.",
    teks: "6.SP.A.2 · 6.SP.A.3", description: "Compute mean/median/mode/range, including word problems.",
    grade: 6, subtypes: ["MeasuresOfCenterAndVariation"],
  },
  // ── Grade 6 · T7 Personal Financial Literacy ───────────────────────────────
  {
    id: "ms6-7-1-banking-credit", topic: 30, topicTitle: `${G6} · T7 Personal Financial Literacy`,
    title: "7-1: Banking & Credit",
    story: "Track a checking account and understand credit-card interest.",
    teks: "TEKS 6.14A–C", description: "Balance a check register; simple credit-card interest.",
    grade: 6, subtypes: ["BankingAndCredit"],
  },
  {
    id: "ms6-7-2-college-salaries", topic: 30, topicTitle: `${G6} · T7 Personal Financial Literacy`,
    title: "7-2: Paying for College & Annual Salaries",
    story: "Compare college costs and compute annual salaries.",
    teks: "TEKS 6.14F–H", description: "Hourly wage → annual salary; compare total college costs.",
    grade: 6, subtypes: ["CollegeAndSalaries"],
  },
  // ── Grade 7 · T1 Numbers & Operations ──────────────────────────────────────
  {
    id: "ms7-1-1-rational-absolute-value", topic: 31, topicTitle: `${G7} · T1 Numbers & Operations`,
    title: "1-1: Rational Numbers, Opposites & Absolute Value",
    story: "Distance from zero and mirror images on the number line.",
    teks: "7.NS.A.1", description: "Absolute value; opposites of integers, decimals, and fractions.",
    grade: 7, subtypes: ["RationalNumbersAndAbsoluteValue"],
  },
  {
    id: "ms7-1-2-add-subtract-rational", topic: 31, topicTitle: `${G7} · T1 Numbers & Operations`,
    title: "1-2: Adding & Subtracting Rational Numbers",
    story: "Add and subtract decimals and fractions, signs included.",
    teks: "7.NS.A.1", description: "Signed decimal addition; fraction +/− in simplest form.",
    grade: 7, subtypes: ["AddSubtractRational"],
  },
  {
    id: "ms7-1-3-multiply-divide-rational", topic: 31, topicTitle: `${G7} · T1 Numbers & Operations`,
    title: "1-3: Multiplying & Dividing Rational Numbers",
    story: "Multiply and divide rationals, then tackle mixed operations.",
    teks: "7.NS.A.2", description: "Signed fraction ×/÷; order-of-operations with fractions.",
    grade: 7, subtypes: ["MultiplyDivideRational"],
  },
  // ── Grade 7 · T2 Expressions, Equations & Relationships ────────────────────
  {
    id: "ms7-2-1-solving-simple-equations", topic: 31, topicTitle: `${G7} · T2 Expressions, Equations & Relationships`,
    title: "2-1: Solving Simple Equations",
    story: "One-step equations with decimals.",
    teks: "7.EE.B.4a", description: "One-step equations with decimal coefficients and constants.",
    grade: 7, subtypes: ["SolvingSimpleEquations"],
  },
  {
    id: "ms7-2-2-two-step-equations", topic: 31, topicTitle: `${G7} · T2 Expressions, Equations & Relationships`,
    title: "2-2: Writing & Solving Two-Step Equations",
    story: "Undo in reverse: two-step equations with integers and decimals.",
    teks: "7.EE.B.4a", description: "Two-step equations; decimal two-step equations.",
    grade: 7, subtypes: ["TwoStepEquations"],
  },
  {
    id: "ms7-2-3-solving-inequalities", topic: 31, topicTitle: `${G7} · T2 Expressions, Equations & Relationships`,
    title: "2-3: Solving Simple Inequalities",
    story: "Solve inequalities and graph them on a number line.",
    teks: "7.EE.B.4b", description: "One- and two-step inequalities with number-line graphs.",
    grade: 7, subtypes: ["SolvingInequalities"],
  },
  {
    id: "ms7-2-4-writing-problem-situations", topic: 31, topicTitle: `${G7} · T2 Expressions, Equations & Relationships`,
    title: "2-4: Writing Problem Situations",
    story: "Turn words into equations, then solve.",
    teks: "7.EE.B.4a", description: "Write equations from verbal descriptions; two-step word problems.",
    grade: 7, subtypes: ["WritingProblemSituations"],
  },
  // ── Grade 7 · T3 Measurement & Geometry ────────────────────────────────────
  {
    id: "ms7-3-1-measuring-angles", topic: 31, topicTitle: `${G7} · T3 Measurement & Geometry`,
    title: "3-1: Measuring Angles",
    story: "Acute, right, or obtuse — classify by measure.",
    teks: "7.G.B.5", description: "Classify angles by degree measure.",
    grade: 7, subtypes: ["MeasuringAngles"],
  },
  {
    id: "ms7-3-2-angle-pairs", topic: 31, topicTitle: `${G7} · T3 Measurement & Geometry`,
    title: "3-2: Adjacent, Complementary, Supplementary & Vertical Angles",
    story: "Angle pairs that add to 90°, add to 180°, or match across.",
    teks: "7.G.B.5", description: "Complementary, supplementary, and vertical angle problems with diagrams.",
    grade: 7, subtypes: ["AnglePairs"],
  },
  {
    id: "ms7-3-3-triangle-angle-sum", topic: 31, topicTitle: `${G7} · T3 Measurement & Geometry`,
    title: "3-3: Triangle Angle Sum",
    story: "Interior angles always total 180°.",
    teks: "7.G.A.2", description: "Find a missing interior angle of a triangle.",
    grade: 7, subtypes: ["TriangleAngleSum"],
  },
  {
    id: "ms7-3-4-circle-parts", topic: 31, topicTitle: `${G7} · T3 Measurement & Geometry`,
    title: "3-4: Center, Radius & Diameter",
    story: "The basic vocabulary of circles.",
    teks: "7.G.B.4", description: "Convert between radius and diameter.",
    grade: 7, subtypes: ["CircleParts"],
  },
  {
    id: "ms7-3-5-circumference-area-circles", topic: 31, topicTitle: `${G7} · T3 Measurement & Geometry`,
    title: "3-5: Circumference & Area of Circles",
    story: "Around and inside: C = 2πr and A = πr².",
    teks: "7.G.B.4", description: "Circumference and area; work backwards from circumference to radius.",
    grade: 7, subtypes: ["CircumferenceAndArea"],
  },
  {
    id: "ms7-3-6-semicircles-quarter-circles", topic: 31, topicTitle: `${G7} · T3 Measurement & Geometry`,
    title: "3-6: Semicircles & Quarter Circles",
    story: "Half and quarter portions of a circle's area.",
    teks: "7.G.B.4", description: "Area of semicircles and quarter circles.",
    grade: 7, subtypes: ["SemicirclesAndQuarterCircles"],
  },
  {
    id: "ms7-3-7-composite-figures", topic: 31, topicTitle: `${G7} · T3 Measurement & Geometry`,
    title: "3-7: Composite Figures",
    story: "Break complex shapes into simple rectangles.",
    teks: "7.G.B.6", description: "Area of composite figures by addition and subtraction.",
    grade: 7, subtypes: ["CompositeFigures"],
  },
  {
    id: "ms7-3-8-nets", topic: 31, topicTitle: `${G7} · T3 Measurement & Geometry`,
    title: "3-8: Nets",
    story: "Unfold 3D shapes to find surface area.",
    teks: "7.G.B.6", description: "Surface area of a cube from its net.",
    grade: 7, subtypes: ["Nets"],
  },
  {
    id: "ms7-3-9-prisms-sa-volume", topic: 31, topicTitle: `${G7} · T3 Measurement & Geometry`,
    title: "3-9: Surface Area & Volume of Right Prisms",
    story: "Triangular prisms and gift-box wrapping problems.",
    teks: "7.G.B.6", description: "Volume of triangular prisms; surface area word problems.",
    grade: 7, subtypes: ["PrismsSurfaceAreaVolume"],
  },
  {
    id: "ms7-3-10-pyramids-sa-volume", topic: 31, topicTitle: `${G7} · T3 Measurement & Geometry`,
    title: "3-10: Surface Area & Volume of Right Pyramids",
    story: "Pyramids: a third of the prism's volume.",
    teks: "7.G.B.6", description: "Volume V = ⅓Bh and surface area of square pyramids.",
    grade: 7, subtypes: ["PyramidsSurfaceAreaVolume"],
  },
  // ── Grade 7 · T4 Proportionality ───────────────────────────────────────────
  {
    id: "ms7-4-1-ratios-rates", topic: 31, topicTitle: `${G7} · T4 Proportionality`,
    title: "4-1: Ratios & Rates",
    story: "Unit rates and better buys.",
    teks: "7.RP.A.1", description: "Unit rates; compare unit rates to find the better buy.",
    grade: 7, subtypes: ["RatiosRates7"],
  },
  {
    id: "ms7-4-2-proportional-relationships", topic: 31, topicTitle: `${G7} · T4 Proportionality`,
    title: "4-2: Proportional Relationships",
    story: "The constant of proportionality unlocks every table.",
    teks: "7.RP.A.2", description: "Constant of proportionality; proportional vs. non-proportional; missing values.",
    grade: 7, subtypes: ["ProportionalRelationships"],
  },
  {
    id: "ms7-4-3-representing-linear-relationships", topic: 31, topicTitle: `${G7} · T4 Proportionality`,
    title: "4-3: Representing Linear Relationships",
    story: "Words, tables, and equations for y = mx + b.",
    teks: "7.RP.A.2", description: "Evaluate linear rules; translate verbal statements to equations.",
    grade: 7, subtypes: ["RepresentingLinearRelationships"],
  },
  {
    id: "ms7-4-4-percents", topic: 31, topicTitle: `${G7} · T4 Proportionality`,
    title: "4-4: Percents",
    story: "Percent of a number and percent discounts.",
    teks: "7.RP.A.3", description: "Find a percent of a quantity; sale-price word problems.",
    grade: 7, subtypes: ["Percents"],
  },
  // ── Grade 7 · T5 Data ──────────────────────────────────────────────────────
  {
    id: "ms7-5-1-sampling", topic: 31, topicTitle: `${G7} · T5 Data`,
    title: "5-1: Sampling",
    story: "Use a random sample to predict a population.",
    teks: "7.SP.A.1 · 7.SP.A.2", description: "Proportional predictions from sample data.",
    grade: 7, subtypes: ["Sampling"],
  },
  {
    id: "ms7-5-2-comparing-populations", topic: 31, topicTitle: `${G7} · T5 Data`,
    title: "5-2: Comparing Two Populations",
    story: "Compare means to compare groups.",
    teks: "7.SP.B.3 · 7.SP.B.4", description: "Compare two populations using measures of center.",
    grade: 7, subtypes: ["ComparingPopulations"],
  },
  {
    id: "ms7-5-3-probability-concepts", topic: 31, topicTitle: `${G7} · T5 Data`,
    title: "5-3: Probability Concepts",
    story: "Theoretical and experimental probability.",
    teks: "7.SP.C.5–7", description: "Simple probability; spinners; experimental probability; word problems.",
    grade: 7, subtypes: ["ProbabilityConcepts"],
  },
  {
    id: "ms7-5-4-compound-events", topic: 31, topicTitle: `${G7} · T5 Data`,
    title: "5-4: Compound Events",
    story: "Two events, one probability: multiply for independence.",
    teks: "7.SP.C.8", description: "Compound probability of independent events.",
    grade: 7, subtypes: ["CompoundEvents"],
  },
  // ── Grade 7 · T6 Financial Literacy ────────────────────────────────────────
  {
    id: "ms7-6-1-economic-thinking", topic: 31, topicTitle: `${G7} · T6 Financial Literacy`,
    title: "6-1: Economic Thinking",
    story: "Sales tax and monthly budgets.",
    teks: "TEKS 7.13", description: "Compute sales tax and totals; build a simple monthly budget.",
    grade: 7, subtypes: ["EconomicThinking"],
  },
  // ── Grade 7 · T7 Step-up ───────────────────────────────────────────────────
  {
    id: "ms7-7-1-percents-beyond-100", topic: 31, topicTitle: `${G7} · T7 Step-up`,
    title: "7-1: Percents Greater Than 100% & Less Than 1%",
    story: "Percents beyond the usual 0–100 range.",
    teks: "7.RP.A.3", description: "Percent of a number above 100% and below 1%.",
    grade: 7, subtypes: ["PercentsBeyond100"],
  },
  {
    id: "ms7-7-2-percent-error", topic: 31, topicTitle: `${G7} · T7 Step-up`,
    title: "7-2: Percent Error",
    story: "How far off was the measurement?",
    teks: "7.RP.A.3", description: "Compute percent error from measured and actual values.",
    grade: 7, subtypes: ["PercentError"],
  },
  {
    id: "ms7-7-3-expanding-factoring", topic: 31, topicTitle: `${G7} · T7 Step-up`,
    title: "7-3: Expanding & Factoring Expressions",
    story: "Distribute out, factor back in.",
    teks: "7.EE.A.1", description: "Expand with the distributive property; factor out the GCF.",
    grade: 7, subtypes: ["ExpandingAndFactoring"],
  },
  {
    id: "ms7-7-4-distributive-equations", topic: 31, topicTitle: `${G7} · T7 Step-up`,
    title: "7-4: Distributive Property Equations",
    story: "Distribute first, then solve.",
    teks: "7.EE.B.4a", description: "Solve equations of the form a(x + b) = c.",
    grade: 7, subtypes: ["DistributiveEquations"],
  },
  {
    id: "ms7-7-5-multi-step-inequalities", topic: 31, topicTitle: `${G7} · T7 Step-up`,
    title: "7-5: Multi-Step Inequalities",
    story: "Two-step inequalities with number-line graphs.",
    teks: "7.EE.B.4b", description: "Solve and graph multi-step inequalities.",
    grade: 7, subtypes: ["MultiStepInequalities"],
  },
  // ── Grade 8 (TEKS / Common Core — not in the scope doc) ────────────────────
  {
    id: "ms8-1-linear-equations", topic: 32, topicTitle: `${G8} · Equations`,
    title: "Linear Equations",
    story: "Variables on both sides, special solutions, and real contexts.",
    teks: "8.EE.C.7", description: "Multi-step equations with variables on both sides; no/infinite solutions.",
    grade: 8, subtypes: ["LinearEquations"],
  },
  {
    id: "ms8-2-functions", topic: 32, topicTitle: `${G8} · Functions`,
    title: "Functions",
    story: "What makes a function? Compare representations.",
    teks: "8.F.A", description: "Identify functions; compare rates of change; linear vs. nonlinear.",
    grade: 8, subtypes: ["Functions"],
  },
  {
    id: "ms8-3-systems", topic: 32, topicTitle: `${G8} · Systems`,
    title: "Systems of Equations",
    story: "Two lines, one intersection: solve systems graphically.",
    teks: "8.EE.C.8", description: "Graphical solutions; interpret intersections; write systems from situations.",
    grade: 8, subtypes: ["SystemsOfEquations"],
  },
  {
    id: "ms8-4-pythagorean", topic: 32, topicTitle: `${G8} · Geometry`,
    title: "Pythagorean Theorem",
    story: "a² + b² = c² in triangles, on grids, and in the real world.",
    teks: "8.G.B", description: "Find hypotenuse or leg; distance between points; word problems.",
    grade: 8, subtypes: ["PythagoreanTheorem"],
  },
  {
    id: "ms8-5-transformations", topic: 32, topicTitle: `${G8} · Geometry`,
    title: "Transformations",
    story: "Slide, flip, and turn figures on the coordinate plane.",
    teks: "8.G.A", description: "Translations, reflections, rotations; describe transformations; sequences.",
    grade: 8, subtypes: ["Transformations"],
  },
  {
    id: "ms8-6-scientific-notation", topic: 32, topicTitle: `${G8} · Number System`,
    title: "Scientific Notation",
    story: "Write very large and very small numbers compactly.",
    teks: "8.EE.A.3 · 8.EE.A.4", description: "Convert to/from scientific notation; compare; real contexts.",
    grade: 8, subtypes: ["ScientificNotation"],
  },
  {
    id: "ms8-7-volume", topic: 32, topicTitle: `${G8} · Geometry`,
    title: "Volume of Cylinders, Cones & Spheres",
    story: "Round solids and their volumes.",
    teks: "8.G.C.9", description: "Volume of cylinders, cones, and spheres; real-world problems.",
    grade: 8, subtypes: ["Volume3D"],
  },
  {
    id: "ms8-8-scatter-plots", topic: 32, topicTitle: `${G8} · Statistics`,
    title: "Scatter Plots",
    story: "Trends in data and predictions from a line of best fit.",
    teks: "8.SP.A", description: "Describe associations; predict with lines of best fit.",
    grade: 8, subtypes: ["ScatterPlots"],
  },
];

/**
 * The 56 middle-school registry entries (17 grade 6 + 31 grade 7 + 8 grade 8).
 * The coordinator spreads these into CURRICULUM_REGISTRY.
 */
export const MIDDLE_SCHOOL_ENTRIES: CurriculumEntry[] = LESSONS.map((def) => ({
  id: def.id,
  topic: def.topic,
  topicTitle: def.topicTitle,
  title: def.title,
  story: def.story,
  teks: def.teks,
  description: def.description,
  generate: (mode: OutputMode, seed: number, options?: GenerateOptions) =>
    generateFor(def, mode, seed, options),
}));

/** Look up a middle-school entry by id. */
export function getMiddleSchoolEntry(id: string): CurriculumEntry | undefined {
  return MIDDLE_SCHOOL_ENTRIES.find((e) => e.id === id);
}
