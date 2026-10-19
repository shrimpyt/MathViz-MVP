// middle-school.ts
// Registry entries for the middle-school area (grades 6/7/8).
//
// Structure follows the authoritative scope document
// (CURRICULUM_SCOPE.md): one entry per lesson-level row, entry titles use
// the doc's topic names. Grade 6 = SAVVAS year-at-a-glance (topics 1–7).
// The former Grade 7 (Pearson topics 1–7 incl. Step-up, plus TEKS
// extensions) and Grade 8 (TEKS / Common Core) courses were merged into a
// single Pre-Algebra course on Oct 19, 2026, at Trystan's direction; the
// lessons are unchanged and still dispatch to the grade 7 / grade 8
// factories by their `grade` field.
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
  wordProblems?: boolean;
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
  const wordProblems = options?.wordProblems ?? false;
  if (def.grade === 6) {
    return stamp(generateGrade6Problems(rng, count, difficulty, def.subtypes as Grade6Subtype[], wordProblems));
  }
  if (def.grade === 7) {
    return stamp(generateGrade7Problems(rng, count, difficulty, def.subtypes as Grade7Subtype[], wordProblems));
  }
  return stamp(generateGrade8Problems(rng, count, difficulty, def.subtypes as Grade8Subtype[], wordProblems));
}

const G6 = "Grade 6 Math";
const PA = "Pre-Algebra";

const LESSONS: LessonDef[] = [
  // ── Grade 6 · T1 Numbers & Operations ──────────────────────────────────────
  {
    id: "ms6-1-1-multiplying-dividing-fractions", topic: 30, topicTitle: `${G6} · T1 Numbers & Operations`,
    title: "1-1: Multiplying & Dividing Fractions",
    story: "Multiply and divide fractions and mixed numbers with confidence.",
    teks: "TEKS 6.3A · 6.3E", description: "Fraction × whole, +/− with common denominators, ×/÷ in simplest form.",
    grade: 6, subtypes: ["MultiplyingDividingFractions"],
  },
  {
    id: "ms6-1-2-decimal-fluency", topic: 30, topicTitle: `${G6} · T1 Numbers & Operations`,
    title: "1-2: Fluency with Decimals",
    story: "Add, subtract, multiply, and divide decimals fluently.",
    teks: "TEKS 6.3E", description: "Decimal +/−/×/÷ including money contexts.",
    grade: 6, subtypes: ["DecimalFluency"],
  },
  {
    id: "ms6-1-3-fdp-conversions", topic: 30, topicTitle: `${G6} · T1 Numbers & Operations`,
    title: "1-3: Fraction, Decimal & Percent Conversions",
    story: "Move fluently between fractions, decimals, and percents.",
    teks: "TEKS 6.4G · 6.5C", description: "Convert between the three forms, including percents from fractions.",
    grade: 6, subtypes: ["FDPConversions"],
  },
  // ── Grade 6 · T2 Integers & Rational Numbers ───────────────────────────────
  {
    id: "ms6-2-1-comparing-ordering-integers", topic: 30, topicTitle: `${G6} · T2 Integers & Rational Numbers`,
    title: "2-1: Comparing & Ordering Integers",
    story: "Which is greater, and how do they line up on the number line?",
    teks: "TEKS 6.2C · 6.2D", description: "Compare integers with < and >; order integers from least to greatest on a number line.",
    grade: 6, subtypes: ["ComparingOrderingIntegers"],
  },
  {
    id: "ms6-2-2-adding-subtracting-integers", topic: 30, topicTitle: `${G6} · T2 Integers & Rational Numbers`,
    title: "2-2: Adding & Subtracting Integers",
    story: "Add and subtract positive and negative integers.",
    teks: "TEKS 6.3D", description: "Integer addition and subtraction, including subtracting a negative.",
    grade: 6, subtypes: ["AddingSubtractingIntegers"],
  },
  {
    id: "ms6-2-3-multiplying-dividing-integers", topic: 30, topicTitle: `${G6} · T2 Integers & Rational Numbers`,
    title: "2-3: Multiplying & Dividing Integers",
    story: "Sign rules for multiplying and dividing integers.",
    teks: "TEKS 6.3D", description: "Integer multiplication and division with the sign rules.",
    grade: 6, subtypes: ["MultiplyingDividingIntegers"],
  },
  {
    id: "ms6-2-4-integer-word-add-subtract", topic: 30, topicTitle: `${G6} · T2 Integers & Rational Numbers`,
    title: "2-4: Word Problems: Adding & Subtracting Integers",
    story: "Temperature, elevation, and money situations with signed changes.",
    teks: "TEKS 6.3D", description: "Story problems: temperature changes, hiker elevation, bank deposits and withdrawals.",
    grade: 6, subtypes: ["IntegerWordAddSubtract"], wordProblems: true,
  },
  {
    id: "ms6-2-5-integer-word-multiply-divide", topic: 30, topicTitle: `${G6} · T2 Integers & Rational Numbers`,
    title: "2-5: Word Problems: Multiplying & Dividing Integers",
    story: "Repeated changes and equal shares with integers.",
    teks: "TEKS 6.3D", description: "Story problems: repeated temperature drops, a diver's descent, daily losses, sharing a debt, equal change per dive.",
    grade: 6, subtypes: ["IntegerWordMultiplyDivide"], wordProblems: true,
  },
  // ── Grade 6 · T3 Expressions, Equations & Relationships ────────────────────
  {
    id: "ms6-3-1-variables-expressions", topic: 30, topicTitle: `${G6} · T3 Expressions, Equations & Relationships`,
    title: "3-1: Variables & Expressions",
    story: "Evaluate expressions and write expressions from words.",
    teks: "TEKS 6.7A · 6.7B", description: "Evaluate one- and two-variable expressions; write expressions for situations.",
    grade: 6, subtypes: ["VariablesAndExpressions"],
  },
  {
    id: "ms6-3-2-equivalent-expressions", topic: 30, topicTitle: `${G6} · T3 Expressions, Equations & Relationships`,
    title: "3-2: Equivalent Expressions",
    story: "Combine like terms and use the distributive property.",
    teks: "TEKS 6.7C · 6.7D", description: "Combining like terms; expanding with the distributive property.",
    grade: 6, subtypes: ["EquivalentExpressions"],
  },
  {
    id: "ms6-3-3-equations-inequalities", topic: 30, topicTitle: `${G6} · T3 Expressions, Equations & Relationships`,
    title: "3-3: Equations & Inequalities",
    story: "Solve one-step equations and inequalities.",
    teks: "TEKS 6.9A · 6.9B · 6.10A", description: "One-step equations (incl. negatives); one-step inequalities with number-line graphs.",
    grade: 6, subtypes: ["EquationsAndInequalities"],
  },
  {
    id: "ms6-3-4-two-variable-relationships", topic: 30, topicTitle: `${G6} · T3 Expressions, Equations & Relationships`,
    title: "3-4: Two-Variable Relationships",
    story: "Use rules like y = 3x + 2 to connect two quantities.",
    teks: "TEKS 6.6A · 6.6B · 6.6C", description: "Evaluate two-variable rules; write rules for real situations.",
    grade: 6, subtypes: ["TwoVariableRelationships"],
  },
  // ── Grade 6 · T4 Proportionality ───────────────────────────────────────────
  {
    id: "ms6-4-1-ratios-rates", topic: 30, topicTitle: `${G6} · T4 Proportionality`,
    title: "4-1: Ratios & Rates",
    story: "Simplify ratios and find unit rates.",
    teks: "TEKS 6.4B · 6.4C · 6.4D", description: "Simplify ratios; equivalent ratios; unit rates (speed, price).",
    grade: 6, subtypes: ["RatiosAndRates"],
  },
  {
    id: "ms6-4-2-ratio-reasoning", topic: 30, topicTitle: `${G6} · T4 Proportionality`,
    title: "4-2: Ratio Reasoning",
    story: "Use ratios to solve percent and scaling problems.",
    teks: "TEKS 6.4B · 6.5A · 6.5B", description: "Scale ratios; find a percent of a number; ratio word problems.",
    grade: 6, subtypes: ["RatioReasoning"],
  },
  // ── Grade 6 · T5 Geometry ──────────────────────────────────────────────────
  {
    id: "ms6-5-1-area-polygons", topic: 30, topicTitle: `${G6} · T5 Geometry`,
    title: "5-1: Area of Polygons",
    story: "Area of parallelograms, triangles, and trapezoids.",
    teks: "TEKS 6.8C · 6.8D", description: "Apply area formulas; work backwards to find a missing dimension.",
    grade: 6, subtypes: ["AreaOfPolygons"],
  },
  {
    id: "ms6-5-2-volume-surface-area", topic: 30, topicTitle: `${G6} · T5 Geometry`,
    title: "5-2: Volume & Surface Area of Rectangular Prisms",
    story: "Fill it up or wrap it up: volume and surface area.",
    teks: "TEKS 6.8C · 6.8D", description: "Volume V = lwh; surface area; real-world prism problems.",
    grade: 6, subtypes: ["VolumeAndSurfaceArea"],
  },
  {
    id: "ms6-5-3-triangle-properties", topic: 30, topicTitle: `${G6} · T5 Geometry`,
    title: "5-3: Triangles & Triangle Properties",
    story: "The angles of a triangle always add to 180°.",
    teks: "TEKS 6.8A", description: "Triangle angle sum; isosceles triangle problems.",
    grade: 6, subtypes: ["TriangleProperties"],
  },
  // ── Grade 6 · T6 Measurement & Data ────────────────────────────────────────
  {
    id: "ms6-6-1-data-displays", topic: 30, topicTitle: `${G6} · T6 Measurement & Data`,
    title: "6-1: Data Displays",
    story: "Read tables and bar graphs like a detective.",
    teks: "TEKS 6.12A · 6.13A", description: "Read frequency tables and bar graphs; compare categories.",
    grade: 6, subtypes: ["DataDisplays"],
  },
  {
    id: "ms6-6-2-measures-center-variation", topic: 30, topicTitle: `${G6} · T6 Measurement & Data`,
    title: "6-2: Measures of Center & Variation",
    story: "Mean, median, mode, and range summarize a data set.",
    teks: "TEKS 6.12B · 6.12C", description: "Compute mean/median/mode/range, including word problems.",
    grade: 6, subtypes: ["MeasuresOfCenterAndVariation"],
  },
  // ── Grade 6 · T7 Personal Financial Literacy ───────────────────────────────
  {
    id: "ms6-7-1-banking-credit", topic: 30, topicTitle: `${G6} · T7 Personal Financial Literacy`,
    title: "7-1: Banking & Credit",
    story: "Track a checking account and understand credit-card interest.",
    teks: "TEKS 6.14A · 6.14B · 6.14C", description: "Balance a check register; simple credit-card interest.",
    grade: 6, subtypes: ["BankingAndCredit"],
  },
  {
    id: "ms6-7-2-college-salaries", topic: 30, topicTitle: `${G6} · T7 Personal Financial Literacy`,
    title: "7-2: Paying for College & Annual Salaries",
    story: "Compare college costs and compute annual salaries.",
    teks: "TEKS 6.14G · 6.14H", description: "Hourly wage → annual salary; compare total college costs.",
    grade: 6, subtypes: ["CollegeAndSalaries"],
  },
  // ── Grade 6 · T8 TEKS Extensions ───────────────────────────────────────────
  {
    id: "ms6-8-1-coordinate-graphing", topic: 30, topicTitle: `${G6} · T8 Coordinate Plane`,
    title: "8-1: Graphing Points in Four Quadrants",
    story: "Plot, locate, reflect, and measure points in all four quadrants.",
    teks: "TEKS 6.11", description: "Identify coordinates and quadrants; distances on shared axes; reflections across the axes.",
    grade: 6, subtypes: ["CoordinateGraphing6"],
  },
  {
    id: "ms6-8-2-unit-conversions", topic: 30, topicTitle: `${G6} · T8 Measurement & Units`,
    title: "8-2: Converting Units",
    story: "Change measurements within the customary and metric systems.",
    teks: "TEKS 6.4H", description: "Convert length, mass, and capacity units in both directions, including two-step chains.",
    grade: 6, subtypes: ["UnitConversion6"],
  },
  {
    id: "ms6-8-3-number-sets-absolute-value", topic: 30, topicTitle: `${G6} · T8 Number Sets`,
    title: "8-3: Number Sets, Opposites & Absolute Value",
    story: "Sort numbers into sets and find distances from zero.",
    teks: "TEKS 6.2A · 6.2B", description: "Classify whole numbers, integers, and rational numbers; opposites; absolute value and comparisons.",
    grade: 6, subtypes: ["NumberSets6"],
  },
  {
    id: "ms6-8-4-multiplying-by-fractions", topic: 30, topicTitle: `${G6} · T8 Fraction Operations`,
    title: "8-4: Multiplying by a Fraction: Bigger or Smaller?",
    story: "Predict whether a product grows or shrinks before you compute.",
    teks: "TEKS 6.3B", description: "Compare the multiplier to 1 to predict the size of a product, then verify by computing.",
    grade: 6, subtypes: ["FractionMultiplyEffect"],
  },
  {
    id: "ms6-8-5-benchmark-percents", topic: 30, topicTitle: `${G6} · T8 Percent Reasoning`,
    title: "8-5: Benchmark Percents",
    story: "Use 1%, 10%, 25%, 50%, and 75% to find and estimate percents.",
    teks: "TEKS 6.4F", description: "Find benchmark percents of a number, combine benchmarks, and estimate with benchmarks.",
    grade: 6, subtypes: ["BenchmarkPercents"],
  },
  {
    id: "ms6-8-6-categorical-data", topic: 30, topicTitle: `${G6} · T8 Data Analysis`,
    title: "8-6: Relative Frequency & Percent Bar Graphs",
    story: "Turn survey counts into percents of the whole.",
    teks: "TEKS 6.12D", description: "Compute relative frequencies as percents, recover counts from percents, and compare categories.",
    grade: 6, subtypes: ["CategoricalData6"],
  },
  {
    id: "ms6-8-7-write-the-problem", topic: 30, topicTitle: `${G6} · T8 Equations`,
    title: "8-7: Write the Problem",
    story: "Match one-step equations to the situations they represent.",
    teks: "TEKS 6.9C", description: "Choose the situation a one-step equation represents; write a one-step equation for a situation.",
    grade: 6, subtypes: ["WriteProblem6"],
  },
  // ── Pre-Algebra · T1 Numbers & Operations ──────────────────────────────────────────
  {
    id: "ms7-1-1-rational-absolute-value", topic: 31, topicTitle: `${PA} · T1 Numbers & Operations`,
    title: "Rational Numbers, Opposites & Absolute Value",
    story: "Distance from zero and mirror images on the number line.",
    teks: "TEKS 7.2 · 7.3A", description: "Absolute value; opposites of integers, decimals, and fractions.",
    grade: 7, subtypes: ["RationalNumbersAndAbsoluteValue"],
  },
  {
    id: "ms7-1-2-add-subtract-rational", topic: 31, topicTitle: `${PA} · T1 Numbers & Operations`,
    title: "Adding & Subtracting Rational Numbers",
    story: "Add and subtract decimals and fractions, signs included.",
    teks: "TEKS 7.3A · 7.3B", description: "Signed decimal addition; fraction +/− in simplest form.",
    grade: 7, subtypes: ["AddSubtractRational"],
  },
  {
    id: "ms7-1-3-multiply-divide-rational", topic: 31, topicTitle: `${PA} · T1 Numbers & Operations`,
    title: "Multiplying & Dividing Rational Numbers",
    story: "Multiply and divide rationals, then tackle mixed operations.",
    teks: "TEKS 7.3A · 7.3B", description: "Signed fraction ×/÷; order-of-operations with fractions.",
    grade: 7, subtypes: ["MultiplyDivideRational"],
  },
  // ── Pre-Algebra · T2 Expressions, Equations & Relationships ────────────────────────
  {
    id: "ms7-2-1-solving-simple-equations", topic: 31, topicTitle: `${PA} · T2 Expressions, Equations & Relationships`,
    title: "Solving Simple Equations",
    story: "One-step equations with decimals.",
    teks: "TEKS 7.11A", description: "One-step equations with decimal coefficients and constants.",
    grade: 7, subtypes: ["SolvingSimpleEquations"],
  },
  {
    id: "ms7-2-2-two-step-equations", topic: 31, topicTitle: `${PA} · T2 Expressions, Equations & Relationships`,
    title: "Writing & Solving Two-Step Equations",
    story: "Undo in reverse: two-step equations with integers and decimals.",
    teks: "TEKS 7.11A", description: "Two-step equations; decimal two-step equations.",
    grade: 7, subtypes: ["TwoStepEquations"],
  },
  {
    id: "ms7-2-3-solving-inequalities", topic: 31, topicTitle: `${PA} · T2 Expressions, Equations & Relationships`,
    title: "Solving Simple Inequalities",
    story: "Solve inequalities and graph them on a number line.",
    teks: "TEKS 7.10B · 7.11A", description: "One- and two-step inequalities with number-line graphs.",
    grade: 7, subtypes: ["SolvingInequalities"],
  },
  {
    id: "ms7-2-4-writing-problem-situations", topic: 31, topicTitle: `${PA} · T2 Expressions, Equations & Relationships`,
    title: "Writing Problem Situations",
    story: "Turn words into equations, then solve.",
    teks: "TEKS 7.10A · 7.10C", description: "Write equations from verbal descriptions; two-step word problems.",
    grade: 7, subtypes: ["WritingProblemSituations"],
  },
  // ── Pre-Algebra · T3 Measurement & Geometry ────────────────────────────────────────
  {
    id: "ms7-3-1-measuring-angles", topic: 31, topicTitle: `${PA} · T3 Measurement & Geometry`,
    title: "Measuring Angles",
    story: "Acute, right, or obtuse, classify by measure.",
    teks: "TEKS 7.11C", description: "Classify angles by degree measure.",
    grade: 7, subtypes: ["MeasuringAngles"], wordProblems: true,
  },
  {
    id: "ms7-3-2-angle-pairs", topic: 31, topicTitle: `${PA} · T3 Measurement & Geometry`,
    title: "Adjacent, Complementary, Supplementary & Vertical Angles",
    story: "Angle pairs that add to 90°, add to 180°, or match across.",
    teks: "TEKS 7.11C", description: "Complementary, supplementary, and vertical angle problems with diagrams.",
    grade: 7, subtypes: ["AnglePairs"], wordProblems: true,
  },
  {
    id: "ms7-3-3-triangle-angle-sum", topic: 31, topicTitle: `${PA} · T3 Measurement & Geometry`,
    title: "Triangle Angle Sum",
    story: "Interior angles always total 180°.",
    teks: "TEKS 7.11C", description: "Find a missing interior angle of a triangle.",
    grade: 7, subtypes: ["TriangleAngleSum"],
  },
  {
    id: "ms7-3-4-circle-parts", topic: 31, topicTitle: `${PA} · T3 Measurement & Geometry`,
    title: "Center, Radius & Diameter",
    story: "The basic vocabulary of circles.",
    teks: "TEKS 7.5B", description: "Convert between radius and diameter.",
    grade: 7, subtypes: ["CircleParts"],
  },
  {
    id: "ms7-3-5-circumference-area-circles", topic: 31, topicTitle: `${PA} · T3 Measurement & Geometry`,
    title: "Circumference & Area of Circles",
    story: "Around and inside: C = 2πr and A = πr².",
    teks: "TEKS 7.9B", description: "Circumference and area; work backwards from circumference to radius.",
    grade: 7, subtypes: ["CircumferenceAndArea"],
  },
  {
    id: "ms7-3-6-semicircles-quarter-circles", topic: 31, topicTitle: `${PA} · T3 Measurement & Geometry`,
    title: "Semicircles & Quarter Circles",
    story: "Half and quarter portions of a circle's area.",
    teks: "TEKS 7.9B", description: "Area of semicircles and quarter circles.",
    grade: 7, subtypes: ["SemicirclesAndQuarterCircles"],
  },
  {
    id: "ms7-3-7-composite-figures", topic: 31, topicTitle: `${PA} · T3 Measurement & Geometry`,
    title: "Composite Figures",
    story: "Break complex shapes into simple rectangles.",
    teks: "TEKS 7.9C", description: "Area of composite figures by addition and subtraction.",
    grade: 7, subtypes: ["CompositeFigures"],
  },
  {
    id: "ms7-3-8-nets", topic: 31, topicTitle: `${PA} · T3 Measurement & Geometry`,
    title: "Nets",
    story: "Unfold 3D shapes to find surface area.",
    teks: "TEKS 7.9D", description: "Surface area of a cube from its net.",
    grade: 7, subtypes: ["Nets"],
  },
  {
    id: "ms7-3-9-prisms-sa-volume", topic: 31, topicTitle: `${PA} · T3 Measurement & Geometry`,
    title: "Surface Area & Volume of Right Prisms",
    story: "Triangular prisms and gift-box wrapping problems.",
    teks: "TEKS 7.9A · 7.9D", description: "Volume of triangular prisms; surface area word problems.",
    grade: 7, subtypes: ["PrismsSurfaceAreaVolume"],
  },
  {
    id: "ms7-3-10-pyramids-sa-volume", topic: 31, topicTitle: `${PA} · T3 Measurement & Geometry`,
    title: "Surface Area & Volume of Right Pyramids",
    story: "Pyramids: a third of the prism's volume.",
    teks: "TEKS 7.9A · 7.9D", description: "Volume V = ⅓Bh and surface area of square pyramids.",
    grade: 7, subtypes: ["PyramidsSurfaceAreaVolume"],
  },
  {
    id: "ms7-3-11-finding-missing-angles", topic: 31, topicTitle: `${PA} · T3 Measurement & Geometry`,
    title: "Finding Missing Angles",
    story: "Set up an equation from the angle relationship and solve for the unknown measure.",
    teks: "TEKS 7.11C", description: "Missing angle measures: complementary and supplementary equations, angles around a point, and algebraic angle pairs.",
    grade: 7, subtypes: ["FindingMissingAngles"],
  },
  {
    id: "ms7-8-2-converting-between-systems", topic: 31, topicTitle: `${PA} · T3 Measurement & Geometry`,
    title: "Converting Between Measurement Systems",
    story: "Inches to centimeters, miles to kilometers, gallons to liters.",
    teks: "TEKS 7.4E", description: "Convert length, distance, capacity, and mass between customary and metric units using stated approximations.",
    grade: 7, subtypes: ["ConversionsBetweenSystems"],
  },
  // ── Pre-Algebra · T4 Proportionality & Slope ───────────────────────────────────────
  {
    id: "ms7-4-1-ratios-rates", topic: 31, topicTitle: `${PA} · T4 Proportionality & Slope`,
    title: "Ratios & Rates",
    story: "Unit rates and better buys.",
    teks: "TEKS 7.4B", description: "Unit rates; compare unit rates to find the better buy.",
    grade: 7, subtypes: ["RatiosRates7"],
  },
  {
    id: "ms7-4-2-proportional-relationships", topic: 31, topicTitle: `${PA} · T4 Proportionality & Slope`,
    title: "Proportional Relationships",
    story: "The constant of proportionality unlocks every table.",
    teks: "TEKS 7.4A · 7.4C", description: "Constant of proportionality; proportional vs. non-proportional; missing values.",
    grade: 7, subtypes: ["ProportionalRelationships"],
  },
  {
    id: "ms7-4-3-representing-linear-relationships", topic: 31, topicTitle: `${PA} · T4 Proportionality & Slope`,
    title: "Representing Linear Relationships",
    story: "Words, tables, and equations for y = mx + b.",
    teks: "TEKS 7.4A · 7.7", description: "Evaluate linear rules; translate verbal statements to equations.",
    grade: 7, subtypes: ["RepresentingLinearRelationships"],
  },
  {
    id: "ms7-4-4-percents", topic: 31, topicTitle: `${PA} · T4 Proportionality & Slope`,
    title: "Percents",
    story: "Percent of a number and percent discounts.",
    teks: "TEKS 7.4D · 7.13F", description: "Find a percent of a quantity; sale-price word problems.",
    grade: 7, subtypes: ["Percents"],
  },
  {
    id: "ms8-9-slope-rate-of-change", topic: 31, topicTitle: `${PA} · T4 Proportionality & Slope`,
    title: "Slope & Rate of Change",
    story: "Slope from tables, graphs, and points, and slope as a unit rate.",
    teks: "TEKS 8.4B · 8.4C", description: "Slope from tables, points and graphs; unit rate as slope; write y = mx + b from situations.",
    grade: 8, subtypes: ["SlopeRateOfChange"],
  },
  {
    id: "ms8-16-proportional-relationships", topic: 31, topicTitle: `${PA} · T4 Proportionality & Slope`,
    title: "Proportional vs. Non-Proportional",
    story: "Tell y = kx from y = mx + b in equations, tables, and stories.",
    teks: "TEKS 8.5A · 8.5E · 8.5F · 8.5H", description: "Classify equations, tables, and situations as proportional or non-proportional; direct variation problems.",
    grade: 8, subtypes: ["PropVsNonProp"],
  },
  // ── Pre-Algebra · T5 Data & Statistics ─────────────────────────────────────────────
  {
    id: "ms7-5-1-sampling", topic: 31, topicTitle: `${PA} · T5 Data & Statistics`,
    title: "Sampling",
    story: "Use a random sample to predict a population.",
    teks: "TEKS 7.6F · 7.12B", description: "Proportional predictions from sample data.",
    grade: 7, subtypes: ["Sampling"],
  },
  {
    id: "ms7-5-2-comparing-populations", topic: 31, topicTitle: `${PA} · T5 Data & Statistics`,
    title: "Comparing Two Populations",
    story: "Compare means to compare groups.",
    teks: "TEKS 7.12A · 7.12C", description: "Compare two populations using measures of center.",
    grade: 7, subtypes: ["ComparingPopulations"],
  },
  {
    id: "ms7-5-3-probability-concepts", topic: 31, topicTitle: `${PA} · T5 Data & Statistics`,
    title: "Probability Concepts",
    story: "Theoretical and experimental probability.",
    teks: "TEKS 7.6C · 7.6D · 7.6I", description: "Simple probability; spinners; experimental probability; word problems.",
    grade: 7, subtypes: ["ProbabilityConcepts"],
  },
  {
    id: "ms7-5-4-compound-events", topic: 31, topicTitle: `${PA} · T5 Data & Statistics`,
    title: "Compound Events",
    story: "Two events, one probability: multiply for independence.",
    teks: "TEKS 7.6A · 7.6D", description: "Compound probability of independent events.",
    grade: 7, subtypes: ["CompoundEvents"],
  },
  {
    id: "ms7-8-6-reading-graphs", topic: 31, topicTitle: `${PA} · T5 Data & Statistics`,
    title: "Reading Bar, Dot & Circle Graphs",
    story: "Pull numbers and percents back out of finished graphs.",
    teks: "TEKS 7.6G", description: "Find percents and counts for circle graph sections; compare categories with differences and ratios; median and mode from dot plot data.",
    grade: 7, subtypes: ["ReadingGraphs7"],
  },
  {
    id: "ms8-8-scatter-plots", topic: 31, topicTitle: `${PA} · T5 Data & Statistics`,
    title: "Scatter Plots",
    story: "Trends in data and predictions from a line of best fit.",
    teks: "TEKS 8.11A · 8.5D", description: "Describe associations; predict with lines of best fit.",
    grade: 8, subtypes: ["ScatterPlots"],
  },
  {
    id: "ms8-11-mean-absolute-deviation", topic: 31, topicTitle: `${PA} · T5 Data & Statistics`,
    title: "Mean Absolute Deviation",
    story: "How spread out is the data, on average?",
    teks: "TEKS 8.11B", description: "Compute the MAD of small data sets and compare the spread of two sets.",
    grade: 8, subtypes: ["MeanAbsoluteDeviation"],
  },
  // ── Pre-Algebra · T6 Financial Literacy ────────────────────────────────────────────
  {
    id: "ms7-6-1-economic-thinking", topic: 31, topicTitle: `${PA} · T6 Financial Literacy`,
    title: "Economic Thinking",
    story: "Sales tax and monthly budgets.",
    teks: "TEKS 7.13A · 7.13B", description: "Compute sales tax and totals; build a simple monthly budget.",
    grade: 7, subtypes: ["EconomicThinking"],
  },
  {
    id: "ms7-8-3-simple-compound-interest", topic: 31, topicTitle: `${PA} · T6 Financial Literacy`,
    title: "Simple & Compound Interest",
    story: "Money that earns money: interest on the principal, then on itself.",
    teks: "TEKS 7.13E", description: "Simple interest and balances; compound interest over 2 to 3 years; compare simple and compound growth on the same principal.",
    grade: 7, subtypes: ["Interest7"],
  },
  {
    id: "ms7-8-4-net-worth", topic: 31, topicTitle: `${PA} · T6 Financial Literacy`,
    title: "Net Worth & Financial Records",
    story: "What you own minus what you owe.",
    teks: "TEKS 7.13C", description: "Classify assets and liabilities; compute net worth from financial records; track how events change net worth.",
    grade: 7, subtypes: ["NetWorth7"],
  },
  {
    id: "ms7-8-5-family-budgets", topic: 31, topicTitle: `${PA} · T6 Financial Literacy`,
    title: "Family Budgets & Wages",
    story: "Plan the month: expenses, income, and the wage that makes it work.",
    teks: "TEKS 7.13D", description: "Total monthly expenses; minimum income with a savings goal; hourly wage needed; percents of income by category.",
    grade: 7, subtypes: ["FamilyBudgets7"],
  },
  {
    id: "ms8-13-interest-credit", topic: 31, topicTitle: `${PA} · T6 Financial Literacy`,
    title: "Simple & Compound Interest",
    story: "What money earns, and what borrowing really costs.",
    teks: "TEKS 8.12A · 8.12D", description: "Simple interest and balances, compound interest, and comparing loan costs by rate and term.",
    grade: 8, subtypes: ["InterestAndCredit"],
  },
  {
    id: "ms8-17-college-costs", topic: 31, topicTitle: `${PA} · T6 Financial Literacy`,
    title: "College Costs & Savings Plans",
    story: "What college costs, and how saving a little each month adds up.",
    teks: "TEKS 8.12G", description: "Total cost of 2-year and 4-year programs; savings still needed after family contributions; monthly savings plans; compare two college paths.",
    grade: 8, subtypes: ["CollegeCosts"],
  },
  // ── Pre-Algebra · T7 Step-up ───────────────────────────────────────────────────────
  {
    id: "ms7-7-1-percents-beyond-100", topic: 31, topicTitle: `${PA} · T7 Step-up`,
    title: "Percents Greater Than 100% & Less Than 1%",
    story: "Percents beyond the usual 0–100 range.",
    teks: "TEKS 7.4D", description: "Percent of a number above 100% and below 1%.",
    grade: 7, subtypes: ["PercentsBeyond100"],
  },
  {
    id: "ms7-7-2-percent-error", topic: 31, topicTitle: `${PA} · T7 Step-up`,
    title: "Percent Error",
    story: "How far off was the measurement?",
    teks: "TEKS 7.4D (extension)", description: "Compute percent error from measured and actual values.",
    grade: 7, subtypes: ["PercentError"],
  },
  {
    id: "ms7-7-3-expanding-factoring", topic: 31, topicTitle: `${PA} · T7 Step-up`,
    title: "Expanding & Factoring Expressions",
    story: "Distribute out, factor back in.",
    teks: "TEKS 7.11A (extension)", description: "Expand with the distributive property; factor out the GCF.",
    grade: 7, subtypes: ["ExpandingAndFactoring"],
  },
  {
    id: "ms7-7-4-distributive-equations", topic: 31, topicTitle: `${PA} · T7 Step-up`,
    title: "Distributive Property Equations",
    story: "Distribute first, then solve.",
    teks: "TEKS 7.11A", description: "Solve equations of the form a(x + b) = c.",
    grade: 7, subtypes: ["DistributiveEquations"],
  },
  {
    id: "ms7-7-5-multi-step-inequalities", topic: 31, topicTitle: `${PA} · T7 Step-up`,
    title: "Multi-Step Inequalities",
    story: "Two-step inequalities with number-line graphs.",
    teks: "TEKS 7.10B · 7.11A", description: "Solve and graph multi-step inequalities.",
    grade: 7, subtypes: ["MultiStepInequalities"],
  },
  // ── Pre-Algebra · T8 Equations & Functions ─────────────────────────────────────────
  {
    id: "ms8-1-linear-equations", topic: 31, topicTitle: `${PA} · T8 Equations & Functions`,
    title: "Linear Equations",
    story: "Variables on both sides, special solutions, and real contexts.",
    teks: "TEKS 8.8A · 8.8C", description: "Multi-step equations with variables on both sides; no/infinite solutions.",
    grade: 8, subtypes: ["LinearEquations"],
  },
  {
    id: "ms8-2-functions", topic: 31, topicTitle: `${PA} · T8 Equations & Functions`,
    title: "Functions",
    story: "What makes a function? Compare representations.",
    teks: "TEKS 8.5G", description: "Identify functions; compare rates of change; linear vs. nonlinear.",
    grade: 8, subtypes: ["Functions"],
  },
  {
    id: "ms8-3-systems", topic: 31, topicTitle: `${PA} · T8 Equations & Functions`,
    title: "Systems of Equations",
    story: "Two lines, one intersection: solve systems graphically.",
    teks: "TEKS 8.9", description: "Graphical solutions; interpret intersections; write systems from situations.",
    grade: 8, subtypes: ["SystemsOfEquations"],
  },
  {
    id: "ms8-18-write-the-problem", topic: 31, topicTitle: `${PA} · T8 Equations & Functions`,
    title: "Writing Problems for Equations",
    story: "Match situations to equations with variables on both sides.",
    teks: "TEKS 8.8B", description: "Choose the situation an equation represents; write a both-sides equation for a described situation.",
    grade: 8, subtypes: ["WriteTheProblem8"],
  },
  // ── Pre-Algebra · T9 Geometry ──────────────────────────────────────────────────────
  {
    id: "ms7-8-1-similar-figures", topic: 31, topicTitle: `${PA} · T9 Geometry`,
    title: "Similar Figures & Scale Drawings",
    story: "Same shape, different size: scale factors and proportions.",
    teks: "TEKS 7.5A · 7.5C", description: "Find scale factors and missing sides in similar figures; use scale drawings; scale areas by the square of the scale factor.",
    grade: 7, subtypes: ["SimilarFigures7"],
  },
  {
    id: "ms8-4-pythagorean", topic: 31, topicTitle: `${PA} · T9 Geometry`,
    title: "Pythagorean Theorem",
    story: "a² + b² = c² in triangles, on grids, and in the real world.",
    teks: "TEKS 8.7C · 8.7D", description: "Find hypotenuse or leg; distance between points; word problems.",
    grade: 8, subtypes: ["PythagoreanTheorem"],
  },
  {
    id: "ms8-5-transformations", topic: 31, topicTitle: `${PA} · T9 Geometry`,
    title: "Transformations",
    story: "Slide, flip, and turn figures on the coordinate plane.",
    teks: "TEKS 8.10A · 8.10B · 8.10C", description: "Translations, reflections, rotations; describe transformations; sequences.",
    grade: 8, subtypes: ["Transformations"],
  },
  {
    id: "ms8-7-volume", topic: 31, topicTitle: `${PA} · T9 Geometry`,
    title: "Volume of Cylinders, Cones & Spheres",
    story: "Round solids and their volumes.",
    teks: "TEKS 8.7A", description: "Volume of cylinders, cones, and spheres; real-world problems.",
    grade: 8, subtypes: ["Volume3D"],
  },
  {
    id: "ms8-12-surface-area", topic: 31, topicTitle: `${PA} · T9 Geometry`,
    title: "Surface Area of Prisms & Cylinders",
    story: "Wrapping solids: total and lateral surface area.",
    teks: "TEKS 8.7B", description: "Total surface area of rectangular prisms, triangular prisms and cylinders; lateral surface area.",
    grade: 8, subtypes: ["SurfaceArea8"],
  },
  {
    id: "ms8-14-angle-relationships", topic: 31, topicTitle: `${PA} · T9 Geometry`,
    title: "Angle Relationships & Similar Triangles",
    story: "Parallel lines, transversals, and the AA criterion.",
    teks: "TEKS 8.8D", description: "Corresponding, alternate, and same-side angles with a transversal; exterior angle theorem; AA similarity.",
    grade: 8, subtypes: ["TransversalsSimilarity"],
  },
  {
    id: "ms8-15-dilations", topic: 31, topicTitle: `${PA} · T9 Geometry`,
    title: "Dilations on the Coordinate Plane",
    story: "Grow and shrink points and figures from the origin.",
    teks: "TEKS 8.3A · 8.3B · 8.3C", description: "Dilate points by integer and fractional scale factors; identify scale factors; effects on lengths and areas.",
    grade: 8, subtypes: ["DilationsCoordinate"],
  },
  // ── Pre-Algebra · T10 Number System ─────────────────────────────────────────────────
  {
    id: "ms7-8-7-number-sets", topic: 31, topicTitle: `${PA} · T10 Number System`,
    title: "Rational Number Sets & Subsets",
    story: "Natural inside whole inside integers inside rational numbers.",
    teks: "TEKS 7.2", description: "Classify numbers by their most specific set, including negative fractions and repeating decimals; judge subset statements; count members of a set.",
    grade: 7, subtypes: ["NumberSets7"],
  },
  {
    id: "ms8-6-scientific-notation", topic: 31, topicTitle: `${PA} · T10 Number System`,
    title: "Scientific Notation",
    story: "Write very large and very small numbers compactly.",
    teks: "TEKS 8.2C", description: "Convert to/from scientific notation; compare; real contexts.",
    grade: 8, subtypes: ["ScientificNotation"],
  },
  {
    id: "ms8-10-irrational-numbers", topic: 31, topicTitle: `${PA} · T10 Number System`,
    title: "Irrational Numbers & Estimation",
    story: "Square roots that never end: estimate, classify, and order real numbers.",
    teks: "TEKS 8.2A · 8.2B · 8.2D", description: "Bracket square roots between integers, approximate to tenths, classify rational vs irrational, order real numbers.",
    grade: 8, subtypes: ["IrrationalNumbers"],
  },
];

/**
 * The 85 middle-school registry entries (28 grade 6 + 57 Pre-Algebra).
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
  wordProblems: def.wordProblems,
  generate: (mode: OutputMode, seed: number, options?: GenerateOptions) =>
    generateFor(def, mode, seed, options),
}));

/** The factory subtypes a lesson draws from (inspection/test helper). */
export function getMiddleSchoolSubtypes(id: string): string[] | undefined {
  const def = LESSONS.find((d) => d.id === id);
  return def ? [...def.subtypes] : undefined;
}

/** Look up a middle-school entry by id. */
export function getMiddleSchoolEntry(id: string): CurriculumEntry | undefined {
  return MIDDLE_SCHOOL_ENTRIES.find((e) => e.id === id);
}
