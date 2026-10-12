// classicalDefinitions.ts
// Seed definition sets for CLASSICAL NOTES mode, keyed by registry entry id.
//
// Classical Notes is the middle of the worksheet spectrum:
//   guided notes (fill blanks) -> classical notes (structure given,
//   reasoning student's) -> blank.
// The DEFINITIONS block prints each term/theorem IN FULL because the grammar
// stage needs exact text for students to copy. Renderers OMIT the block
// gracefully when an entry id has no definitions here.
//
// Conventions:
// - Pure data + a lookup. No JSX, no styling (generation/rendering seam).
// - Plain-text unicode only (no LaTeX commands): renderers run definitions
//   through latexToText (web) / pdfSafeText (PDF), which pass plain text
//   through unchanged. Glyphs are limited to what the embedded DejaVu Serif
//   covers (√ θ π ∠ ° · ½ ₁ ₂ ⁻¹ × −).
// - Keyed by registry entry id on purpose: definitions live in this data file
//   so CurriculumRegistry.ts needs NO change (see tests/classical-notes).

/** Shared definition sets, reused by related entry ids. */
const CIRCLE_THEOREMS: string[] = [
  "Inscribed Angle Theorem: The measure of an angle formed by two chords in a circle with its vertex on the circle is half the measure of its intercepted arc.",
  "Central Angle Theorem: The measure of a central angle is equal to the measure of its intercepted arc.",
  "Tangent-Chord Angle Theorem: The measure of an angle formed by a tangent and a chord drawn to the point of tangency is half the measure of the intercepted arc.",
  "Intersecting Chords Theorem: If two chords intersect inside a circle, then the measure of the angle formed is half the sum of the measures of the intercepted arcs.",
  "Two Secants Theorem: If two secants are drawn from an external point to a circle, then the measure of the angle formed is half the difference of the measures of the intercepted arcs.",
];

const CONGRUENCE_THEOREMS: string[] = [
  "SSS (Side-Side-Side): If three sides of one triangle are congruent to three sides of another triangle, then the triangles are congruent.",
  "SAS (Side-Angle-Side): If two sides and the included angle of one triangle are congruent to two sides and the included angle of another triangle, then the triangles are congruent.",
  "ASA (Angle-Side-Angle): If two angles and the included side of one triangle are congruent to two angles and the included side of another triangle, then the triangles are congruent.",
  "AAS (Angle-Angle-Side): If two angles and a non-included side of one triangle are congruent to the corresponding parts of another triangle, then the triangles are congruent.",
  "HL (Hypotenuse-Leg): If the hypotenuse and a leg of one right triangle are congruent to the hypotenuse and a leg of another right triangle, then the triangles are congruent.",
];

const COORDINATE_FORMULAS: string[] = [
  "Distance Formula: The distance d between points (x₁, y₁) and (x₂, y₂) is d = √((x₂ − x₁)² + (y₂ − y₁)²).",
  "Midpoint Formula: The midpoint of the segment joining (x₁, y₁) and (x₂, y₂) is ((x₁ + x₂)/2, (y₁ + y₂)/2).",
  "Slope Formula: The slope m of the line through (x₁, y₁) and (x₂, y₂) is m = (y₂ − y₁)/(x₂ − x₁).",
];

const TRIG_RATIOS: string[] = [
  "Sine: In a right triangle, sin θ = opposite/hypotenuse.",
  "Cosine: In a right triangle, cos θ = adjacent/hypotenuse.",
  "Tangent: In a right triangle, tan θ = opposite/adjacent.",
  "SOH CAH TOA: A memory device — Sine is Opposite over Hypotenuse, Cosine is Adjacent over Hypotenuse, Tangent is Opposite over Adjacent.",
];

const INVERSE_TRIG: string[] = [
  ...TRIG_RATIOS,
  "Inverse Trigonometric Functions: If sin θ = x, then θ = sin⁻¹(x). Inverse cosine and inverse tangent work the same way, returning the angle measure.",
];

const ELEVATION_DEPRESSION: string[] = [
  ...TRIG_RATIOS,
  "Angle of Elevation: The angle formed by a horizontal line and the line of sight when looking upward.",
  "Angle of Depression: The angle formed by a horizontal line and the line of sight when looking downward.",
];

const SPECIAL_TRIANGLES: string[] = [
  "45-45-90 Triangle: The sides are in the ratio 1 : 1 : √2 — the legs are equal, and the hypotenuse is leg × √2.",
  "30-60-90 Triangle: The sides are in the ratio 1 : √3 : 2 — the short leg is opposite the 30° angle, the long leg is short leg × √3, and the hypotenuse is twice the short leg.",
];

const TRIG_MIXED: string[] = [...TRIG_RATIOS, ...SPECIAL_TRIANGLES];

const CIRCLE_MEASUREMENT: string[] = [
  "Circumference: The distance around a circle is C = 2πr, where r is the radius.",
  "Arc Length: The length of an arc with central angle θ (in degrees) in a circle of radius r is (θ/360) × 2πr.",
  "Sector Area: The area of a sector with central angle θ (in degrees) in a circle of radius r is (θ/360) × πr².",
];

const GEOMETRIC_PROBABILITY: string[] = [
  "Geometric Probability: For equally likely outcomes spread over a region, P(event) = (area of the favorable region) / (area of the total region).",
  "Bullseye Probability: The probability a dart lands in the inner circle is (area of inner circle) / (area of outer circle) = r²/R².",
  "Spinner Probability: The probability a spinner lands in a sector is (sector angle)/360°.",
];

/** Middle-school core — equations & inequalities (shared by related ids). */
const EQUATION_CORE: string[] = [
  "Equation: A mathematical sentence that uses an equals sign to show that two expressions have the same value.",
  "Solution of an Equation: A value of the variable that makes the equation true.",
  "Inverse Operations: Operations that undo each other — addition undoes subtraction, and multiplication undoes division.",
];

const MULTI_STEP_EQUATIONS: string[] = [
  ...EQUATION_CORE,
  "Equivalent Equations: Equations that have exactly the same solution, formed by performing the same operation on both sides of an equation.",
  "Multi-Step Equation: An equation that takes two or more steps to solve.",
];

const VARIABLES_BOTH_SIDES: string[] = [
  ...EQUATION_CORE,
  "Identity: An equation that is true for every value of the variable, so it has infinitely many solutions.",
  "No Solution: An equation that is false for every value of the variable — the variable terms cancel and leave a false statement.",
];

const PROPORTIONS: string[] = [
  "Ratio: A comparison of two quantities by division, written as a/b, a to b, or a:b.",
  "Proportion: An equation that states two ratios are equal, written a/b = c/d.",
  "Cross Products Property: In a proportion a/b = c/d, the cross products are equal: ad = bc.",
  "Rate: A ratio that compares two quantities with different units, such as miles per hour.",
  "Unit Rate: A rate with a denominator of 1, such as 60 miles per 1 hour.",
];

const INEQUALITY_CORE: string[] = [
  "Inequality: A mathematical sentence that compares two expressions using less than, greater than, less than or equal to, or greater than or equal to.",
  "Solution of an Inequality: A value of the variable that makes the inequality true; most inequalities have many solutions, not just one.",
  "Solution Set: The set of all values that make an inequality true, often shown as a graph on a number line.",
];

const MULTI_STEP_INEQUALITIES: string[] = [
  ...INEQUALITY_CORE,
  "Reversing the Inequality: When you multiply or divide both sides of an inequality by a negative number, you must reverse the direction of the inequality symbol.",
  "Number Line Graph: A picture of a solution set — an open circle shows the endpoint is not included, and a closed circle shows it is included.",
];

const COMPOUND_INEQUALITIES: string[] = [
  ...INEQUALITY_CORE,
  "Compound Inequality: Two inequalities joined by the word and or the word or.",
  "And and Or: In a compound inequality joined by and, both parts must be true and the graphs overlap; joined by or, at least one part must be true and the graphs are combined.",
];

/** Middle-school core — linear functions & data (shared by related ids). */
const RATE_OF_CHANGE: string[] = [
  "Rate of Change: A ratio that compares how much one quantity changes to how much another quantity changes.",
  "Slope: The rate of change of a line, equal to rise over run: m = (y₂ − y₁)/(x₂ − x₁).",
  "Rise: The vertical change between two points on a graph.",
  "Run: The horizontal change between two points on a graph.",
  "Constant Rate of Change: A rate of change that stays the same — the graph of a relationship with a constant rate of change is a straight line.",
];

const SLOPE_INTERCEPT: string[] = [
  "Slope-Intercept Form: An equation of a line in the form y = mx + b, where m is the slope and b is the y-intercept.",
  "Slope: The rate of change of a line, equal to rise over run: m = (y₂ − y₁)/(x₂ − x₁).",
  "Y-Intercept: The y-coordinate of the point where a line crosses the y-axis; it is the value b in y = mx + b.",
  "X-Intercept: The x-coordinate of the point where a line crosses the x-axis.",
  "Linear Function: A function whose graph is a straight line and whose equation can be written y = mx + b.",
];

const DIRECT_VARIATION: string[] = [
  "Direct Variation: A relationship in which one variable is a constant multiple of the other, written y = kx, where k is not 0.",
  "Constant of Variation: The number k in y = kx; for any pair of values in a direct variation, k = y/x.",
  "Proportion: An equation that states two ratios are equal; a direct variation can be written as the proportion y₁/x₁ = y₂/x₂.",
  "Origin: The point (0, 0) where the x-axis and y-axis cross; the graph of every direct variation is a line through the origin.",
  "Unit Rate: In a direct variation, the constant of variation is the unit rate — the amount of y for each 1 unit of x.",
];

const PARALLEL_PERPENDICULAR: string[] = [
  "Parallel Lines: Lines in the same plane that never intersect; parallel lines have equal slopes.",
  "Perpendicular Lines: Lines that intersect at a right angle; in perpendicular lines, the product of the slopes is −1.",
  "Opposite Reciprocals: Two numbers whose product is −1, such as 3 and −1/3; the slopes of perpendicular lines are opposite reciprocals.",
  "Right Angle: An angle with a measure of 90°.",
  "Slope: The rate of change of a line, equal to rise over run: m = (y₂ − y₁)/(x₂ − x₁).",
];

const FUNCTION_CORE: string[] = [
  "Function: A relation in which each input has exactly one output.",
  "Domain: The set of all input values (the x-values) of a relation or function.",
  "Range: The set of all output values (the y-values) of a relation or function.",
];

const RELATIONS_FUNCTIONS: string[] = [
  "Relation: A pairing of input values with output values, often written as a set of ordered pairs (x, y).",
  ...FUNCTION_CORE,
  "Vertical Line Test: A way to tell whether a graph shows a function — if any vertical line crosses the graph more than once, the graph is not a function.",
];

const FUNCTION_NOTATION: string[] = [
  ...FUNCTION_CORE,
  "Function Notation: A way to name and write a function — f(x), read 'f of x,' stands for the output of the function f when the input is x.",
  "Evaluating a Function: Finding the output of a function for a given input by substituting the input value for x in the function's rule.",
];

const SCATTER_TREND: string[] = [
  "Scatter Plot: A graph that displays two-variable data as ordered pairs (x, y) to show how the variables are related.",
  "Correlation: The kind of relationship shown between two data sets — positive, negative, or none.",
  "Positive Correlation: In a scatter plot, as x increases, y tends to increase, so the points trend upward.",
  "Negative Correlation: In a scatter plot, as x increases, y tends to decrease, so the points trend downward.",
  "Trend Line: A line that closely fits the points of a scatter plot and can be used to make predictions; also called a line of fit.",
  "Outlier: A data point that lies far away from the other points in a data set.",
];

const TWO_WAY_TABLES: string[] = [
  "Two-Way Table: A table that displays data about two characteristics collected from one group, with rows for one characteristic and columns for the other.",
  "Frequency: The number of times a particular value or category occurs in a data set.",
  "Row Total: The sum of all the entries in one row of a two-way table.",
  "Column Total: The sum of all the entries in one column of a two-way table.",
  "Relative Frequency: The ratio of a frequency to a total, written as a fraction, decimal, or percent, used to compare parts of the data.",
];

/** Algebra 2 Topic 5 — quadratics (shared by related ids). */
const QUADRATIC_CORE: string[] = [
  "Quadratic Function: A function that can be written f(x) = ax² + bx + c, where a is not 0.",
  "Parabola: The U-shaped graph of a quadratic function; the graph is symmetric about a vertical line through its highest or lowest point.",
];

const QUAD_ATTRIBUTES: string[] = [
  ...QUADRATIC_CORE,
  "Vertex Form: A quadratic function written f(x) = a(x − h)² + k; the vertex (h, k) can be read directly from the equation.",
  "Vertex: The highest or lowest point of the parabola.",
  "Axis of Symmetry: The vertical line x = h, across which the parabola mirrors itself.",
  "Transformation: A change in the position, shape, or direction of a graph — in f(x) = a(x − h)² + k, h shifts the graph left or right, k shifts it up or down, and a stretches, shrinks, or reflects it.",
];

const QUAD_STANDARD: string[] = [
  "Standard Form: A quadratic function written f(x) = ax² + bx + c, where a is not 0; a determines the direction and width of the parabola, and c is its y-intercept.",
  "Leading Coefficient: The coefficient a of the x² term; when a > 0 the parabola opens upward, when a < 0 it opens downward, and the greater |a| is, the narrower the parabola.",
  "Y-Intercept: The point (0, c) where the parabola crosses the y-axis, equal to the constant term of the function.",
  "Axis of Symmetry: The vertical line x = −b/(2a), across which the parabola mirrors itself; the vertex lies on this line.",
  "Maximum Value: The greatest value of a quadratic function — the y-coordinate of the vertex when the parabola opens downward.",
  "Minimum Value: The least value of a quadratic function — the y-coordinate of the vertex when the parabola opens upward.",
];

const QUAD_MODELING: string[] = [
  "Quadratic Model: A quadratic function used to represent a real situation, such as the height of a launched object or the area of a rectangular region.",
  "Projectile Motion: The motion of an object thrown or launched into the air; when its height is graphed against time, the graph is a parabola that opens downward.",
  "Initial Height: The height of an object at time 0; in h(t) = at² + bt + c, the initial height is the constant term c.",
  "Vertex in a Model: The vertex of a quadratic model gives the extreme value of the quantity modeled — for a projectile, the maximum height and the time at which it occurs.",
  "Zero in a Model: A zero of a height function is a time when the height is 0 — for a projectile, the time at which it lands.",
  "Quadratic Regression: A method of finding the quadratic function that best fits a set of data points.",
];

const FOCUS_DIRECTRIX: string[] = [
  "Parabola: The set of all points in a plane that are the same distance from a fixed point, the focus, as they are from a fixed line, the directrix.",
  "Focus: The fixed point used to define a parabola; it lies inside the curve of the parabola, on the axis of symmetry.",
  "Directrix: The fixed line used to define a parabola; it lies outside the curve of the parabola, perpendicular to the axis of symmetry.",
  "Vertex: The point of the parabola closest to the directrix; it lies halfway between the focus and the directrix.",
  "Focus of a Vertical Parabola: For the parabola y = a(x − h)² + k, the focus is the point (h, k + 1/(4a)).",
  "Directrix of a Vertical Parabola: For the parabola y = a(x − h)² + k, the directrix is the horizontal line y = k − 1/(4a).",
];

const QUAD_FACTORING: string[] = [
  "Factoring: Rewriting an expression as a product of simpler expressions; factoring a quadratic undoes the multiplication of two binomials.",
  "Factored Form: A quadratic written as a product of factors, such as a(x − p)(x − q); the values p and q are zeros of the function.",
  "Greatest Common Factor: The greatest expression that divides every term of a polynomial; factoring it out is the first step in factoring any polynomial.",
  "Zero Product Property: If the product of two quantities is 0, then at least one of the quantities is 0 — if ab = 0, then a = 0 or b = 0.",
  "Difference of Two Squares: The factoring pattern a² − b² = (a + b)(a − b).",
  "Perfect-Square Trinomial: A trinomial that is the square of a binomial: a² + 2ab + b² = (a + b)² or a² − 2ab + b² = (a − b)².",
];

const QUAD_EQUATIONS: string[] = [
  "Quadratic Equation: An equation that can be written in the form ax² + bx + c = 0, where a is not 0.",
  "Zero of a Function: An x-value for which f(x) = 0; the zeros of a quadratic function are the x-intercepts of its graph and the solutions of the equation f(x) = 0.",
  "Square Root Method: A way to solve an equation of the form x² = d: isolate the squared term, take the square root of both sides, and write both solutions, x = √d and x = −√d.",
  "Quadratic Formula: The solutions of ax² + bx + c = 0 are x = (−b + √(b² − 4ac))/(2a) and x = (−b − √(b² − 4ac))/(2a).",
  "Solution (Root): A value of x that makes an equation true; a quadratic equation has two, one, or no real solutions.",
];

const COMPLETING_SQUARE: string[] = [
  "Completing the Square: A method that rewrites a quadratic by building a perfect-square trinomial, used to solve quadratic equations and to convert a quadratic function to vertex form.",
  "Perfect-Square Trinomial: A trinomial of the form x² + bx + (b/2)², which factors as (x + b/2)².",
  "Completing Constant: To complete the square on x² + bx, add (b/2)² — the square of half the coefficient of x.",
  "Non-Monic Quadratic: A quadratic whose leading coefficient is not 1; before completing the square, factor the leading coefficient out of the x-terms so the squared part begins with x².",
  "Vertex Form: Completing the square rewrites f(x) = ax² + bx + c in the form f(x) = a(x − h)² + k, which reveals the vertex (h, k).",
];

const QUAD_FORMULA: string[] = [
  "Quadratic Formula: The solutions of ax² + bx + c = 0 are x = (−b + √(b² − 4ac))/(2a) and x = (−b − √(b² − 4ac))/(2a); the formula solves every quadratic equation.",
  "Discriminant: The expression b² − 4ac beneath the square root sign in the quadratic formula; its sign determines the number and type of solutions of the equation.",
  "Two Real Solutions: When the discriminant is positive, a quadratic equation has two different real solutions, and its graph crosses the x-axis at two points.",
  "One Real Solution: When the discriminant is 0, a quadratic equation has exactly one real solution, called a double root, and the vertex of its graph lies on the x-axis.",
  "No Real Solutions: When the discriminant is negative, a quadratic equation has no real solutions — its two solutions are complex numbers — and its graph never crosses the x-axis.",
];

const COMPLEX_NUMBERS: string[] = [
  "Imaginary Unit: The number i, defined by i = √(−1); it satisfies i² = −1.",
  "Imaginary Number: A number of the form bi, where b is a real number that is not 0 and i is the imaginary unit.",
  "Complex Number: A number of the form a + bi, where a and b are real numbers; a is called the real part and b is called the imaginary part.",
  "Complex Conjugates: Two complex numbers of the form a + bi and a − bi; their product is the real number a² + b².",
  "Square Root of a Negative Number: The square root of a negative number is imaginary: when r is greater than 0, √(−r) = i√r.",
  "Complex Solutions of a Quadratic: When the discriminant of a quadratic equation is negative, the equation has two complex solutions, and they are conjugates of each other.",
];

const QUAD_INEQUALITIES: string[] = [
  "Quadratic Inequality: An inequality that can be written with a quadratic expression compared to 0, such as ax² + bx + c > 0 or ax² + bx + c < 0.",
  "Critical Values: The zeros of the related quadratic equation; they divide the number line into intervals on which the quadratic expression is always positive or always negative.",
  "Test Point: A value chosen from one interval and substituted into the inequality to determine whether that interval belongs to the solution set.",
  "Sign Analysis: The process of determining, interval by interval, whether a quadratic expression is positive or negative, using its critical values and the direction its parabola opens.",
  "Boundary Points: The critical values of a quadratic inequality; each one is included in the solution set when the inequality permits equality, and excluded when it does not.",
  "Solution Set: The set of all x-values that make the inequality true, shown by shading a number line or by shading the corresponding region of the graph.",
];

const LIN_QUAD_SYSTEMS: string[] = [
  "System of Equations: A set of two or more equations that share the same variables; a solution of the system is an ordered pair that makes every equation in the system true.",
  "Linear-Quadratic System: A system consisting of one linear equation and one quadratic equation; its solutions are the points where the line and the parabola intersect.",
  "Substitution Method: A method for solving a system: solve one equation for a variable, then substitute the result into the other equation.",
  "Intersection Points: The points at which the graphs of a system meet; a line and a parabola can intersect in two points, in one point, or in no points.",
  "Tangent Line: A line that meets a parabola at exactly one point; a linear-quadratic system whose line is tangent to the parabola has exactly one solution.",
];

/**
 * Definitions per registry entry id. Entries with no real generator
 * (under-construction lessons) intentionally have NO key — renderers must
 * omit the definitions block gracefully for them.
 */
export const CLASSICAL_DEFINITIONS: Record<string, string[]> = {
  // Topic 12 — circle theorems
  "anatomy-of-a-circle": CIRCLE_THEOREMS,
  "ch12-test": CIRCLE_THEOREMS,
  // Topic 4 — triangle congruence
  "logic-of-congruence": CONGRUENCE_THEOREMS,
  "ch4-test": CONGRUENCE_THEOREMS,
  // Topic 7 — coordinate geometry
  "ch7-1-distance-midpoint": COORDINATE_FORMULAS,
  "ch7-test": COORDINATE_FORMULAS,
  // Topic 10 — trigonometry
  "trig-1-ratios": TRIG_RATIOS,
  "trig-2-sides": TRIG_RATIOS,
  "trig-3-angles": INVERSE_TRIG,
  "elevation-depression": ELEVATION_DEPRESSION,
  "special-right-triangles": SPECIAL_TRIANGLES,
  "ch10-test": TRIG_MIXED,
  // Topic 11 — circle measurement
  "ch11-1-circumference": CIRCLE_MEASUREMENT,
  "ch11-test": CIRCLE_MEASUREMENT,
  // Topic 15 — geometric probability
  "target-zone": GEOMETRIC_PROBABILITY,
  "ch15-test": GEOMETRIC_PROBABILITY,
  // Algebra 1 Topic 1 — equations & inequalities (middle-school core)
  "a1-1-1-multi-step-equations": MULTI_STEP_EQUATIONS,
  "a1-1-2-variables-both-sides": VARIABLES_BOTH_SIDES,
  "a1-1-4-proportions": PROPORTIONS,
  "a1-1-5-multi-step-inequalities": MULTI_STEP_INEQUALITIES,
  "a1-1-6-compound-inequalities": COMPOUND_INEQUALITIES,
  // Algebra 1 Topics 2/3 — linear functions & data (middle-school core)
  "a1-23-1-rate-of-change": RATE_OF_CHANGE,
  "a1-23-2-slope-intercept": SLOPE_INTERCEPT,
  "a1-23-3-direct-variation": DIRECT_VARIATION,
  "a1-23-8-relations-functions": RELATIONS_FUNCTIONS,
  "a1-23-9-function-notation": FUNCTION_NOTATION,
  "a1-23-10-parallel-perpendicular": PARALLEL_PERPENDICULAR,
  "a1-23-12-scatter-trend": SCATTER_TREND,
  "a1-23-13-two-way-tables": TWO_WAY_TABLES,
  // Algebra 2 Topic 5 — quadratics
  "a2-5-1-quad-attributes": QUAD_ATTRIBUTES,
  "a2-5-2-quad-standard": QUAD_STANDARD,
  "a2-5-3-quad-modeling": QUAD_MODELING,
  "a2-5-4-focus-directrix": FOCUS_DIRECTRIX,
  "a2-5-5-quad-factoring": QUAD_FACTORING,
  "a2-5-6-quad-equations": QUAD_EQUATIONS,
  "a2-5-7-completing-square": COMPLETING_SQUARE,
  "a2-5-8-quad-formula": QUAD_FORMULA,
  "a2-5-9-complex-numbers": COMPLEX_NUMBERS,
  "a2-5-10-quad-inequalities": QUAD_INEQUALITIES,
  "a2-5-11-lin-quad-systems": LIN_QUAD_SYSTEMS,
};

/**
 * Look up the definition set for a registry entry id.
 * Returns undefined when the entry has no seeded definitions — the renderer
 * then omits the DEFINITIONS block (no empty box, no crash).
 */
export function getClassicalDefinitions(entryId: string): string[] | undefined {
  return CLASSICAL_DEFINITIONS[entryId];
}
