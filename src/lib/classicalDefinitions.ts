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

/** Geometry chapters — foundations, reasoning, and measurement (one seeded lesson per chapter). */
const GEO_POINTS_LINES: string[] = [
  "Point: One of the three undefined terms of geometry — a point is a location that has no size; it is drawn as a dot and named with a capital letter.",
  "Line: One of the three undefined terms of geometry — a line is a straight path made of points that extends without end in two opposite directions; it is named by any two points on it or by a single lowercase letter.",
  "Plane: One of the three undefined terms of geometry — a plane is a flat surface made of points that extends without end in all directions; it is named by a capital letter or by three points in it that are not on the same line.",
  "Collinear Points: Points that lie on the same line.",
  "Coplanar Points: Points that lie in the same plane; any three points are always coplanar, since a plane can be passed through any three points.",
  "Line Segment: A part of a line consisting of two endpoints and all the points between them; unlike a line, a segment has a length that can be measured.",
];

const GEO_INDUCTIVE_REASONING: string[] = [
  "Inductive Reasoning: A way of reasoning that examines specific examples, finds a pattern in them, and uses the pattern to reach a conclusion or make a prediction about cases not yet examined.",
  "Conjecture: A concluding statement reached by inductive reasoning; a conjecture is believed to be true but has not been proved.",
  "Counterexample: A specific example that shows a conjecture is false; finding just one counterexample is enough to disprove a conjecture.",
  "Pattern: A set of numbers, figures, or events arranged so that each one relates to the ones around it in a predictable way; patterns are the evidence on which inductive reasoning works.",
  "Deductive Reasoning: A way of reasoning that uses facts, definitions, accepted properties, and logic to reach a conclusion that must be true — unlike inductive reasoning, which only suggests a conclusion.",
];

const GEO_MIDSEGMENTS: string[] = [
  "Midpoint: A point that divides a segment into two congruent segments; the midpoint is the point halfway between the endpoints of the segment.",
  "Midsegment of a Triangle: A segment whose endpoints are the midpoints of two sides of a triangle.",
  "Triangle Midsegment Theorem: A segment joining the midpoints of two sides of a triangle is parallel to the third side of the triangle, and its length is half the length of that third side.",
  "Median of a Triangle: A segment from a vertex of a triangle to the midpoint of the opposite side; a median is not a midsegment, because a median touches a vertex and a midsegment touches no vertex.",
  "Four Congruent Triangles: The three midsegments of a triangle divide the triangle into four smaller triangles that are all congruent to each other.",
];

const GEO_POLYGON_ANGLES: string[] = [
  "Polygon: A closed plane figure formed by three or more line segments that intersect only at their endpoints; each segment is a side of the polygon, and each endpoint is a vertex.",
  "Diagonal of a Polygon: A segment that connects two nonconsecutive vertices of a polygon.",
  "Convex Polygon: A polygon in which every diagonal lies entirely inside the polygon; each interior angle of a convex polygon measures less than 180°.",
  "Polygon Angle-Sum Theorem: The sum of the measures of the interior angles of a convex polygon with n sides is (n − 2) × 180°.",
  "Regular Polygon: A polygon that has all sides congruent and all angles congruent; in a regular polygon with n sides, each interior angle measures (n − 2) × 180°/n.",
  "Exterior Angle-Sum Theorem: The sum of the measures of the exterior angles of a polygon, one at each vertex, is 360° for every polygon; in a regular polygon with n sides, each exterior angle measures 360°/n.",
];

const GEO_TRANSLATIONS: string[] = [
  "Transformation: A change in the position, shape, or size of a figure in the plane.",
  "Preimage and Image: The original figure in a transformation is the preimage; the figure that results is the image, and each point of the image is named with the same letter as its preimage, marked with a prime.",
  "Translation: A transformation that slides every point of a figure the same distance in the same direction; a translation changes neither the size nor the shape nor the orientation of the figure.",
  "Vector: A quantity that has both a length and a direction; a translation is described by a vector, whose initial point and terminal point show where each point of the figure starts and ends.",
  "Component Form: A translation written as the ordered pair (a, b) moves every point (x, y) of a figure to (x + a, y + b): a units in the horizontal direction and b units in the vertical direction.",
  "Isometry: A transformation that preserves distances and angle measures, so the image is congruent to the preimage; every translation is an isometry.",
];

const GEO_TANGENT_LINES: string[] = [
  "Circle: The set of all points in a plane that are the same distance, the radius, from a given point, the center.",
  "Radius: A segment with one endpoint at the center of a circle and the other endpoint on the circle; every radius of the same circle is congruent.",
  "Tangent Line: A line in the plane of a circle that intersects the circle at exactly one point.",
  "Point of Tangency: The single point at which a tangent line intersects a circle.",
  "Tangent-Radius Theorem: If a line is tangent to a circle, then the line is perpendicular to the radius drawn to the point of tangency.",
  "Tangent Segments Theorem: If two tangent segments are drawn to a circle from a common point outside the circle, then the two tangent segments are congruent.",
];

const GEO_AREA_POLYGONS: string[] = [
  "Area: The measure of the region enclosed by a figure, counted in square units; the areas of figures that do not overlap can be added.",
  "Base and Height: In a parallelogram or a triangle, any side can serve as the base; the height is the length of the segment drawn perpendicular to the base, or to the line containing the base, from the opposite side or vertex.",
  "Area of a Parallelogram: The area A of a parallelogram is the product of a base b and the height h drawn to that base: A = bh.",
  "Area of a Triangle: The area A of a triangle is half the product of a base b and the height h drawn to that base: A = (1/2)bh.",
  "Apothem: A segment drawn from the center of a regular polygon perpendicular to one of its sides; the length of the apothem is the distance from the center of the polygon to a side.",
  "Area of a Regular Polygon: The area A of a regular polygon is half the product of its apothem a and its perimeter P: A = (1/2)aP.",
];

const GEO_SURFACE_AREA: string[] = [
  "Net: A flat, two-dimensional pattern that folds up to form a three-dimensional figure; every face of the figure appears exactly once in its net.",
  "Lateral Faces: The faces of a prism or a cylinder that are not bases; in a prism the lateral faces are rectangles, and in a cylinder the lateral face unrolls into a rectangle.",
  "Lateral Area: The sum of the areas of the lateral faces of a solid; for a right prism, the lateral area is the perimeter of the base times the height, and for a right cylinder it is the circumference of the base times the height.",
  "Surface Area: The sum of the areas of all the faces of a solid; the total surface area equals the lateral area plus the areas of the bases.",
  "Surface Area of a Right Prism: S = Ph + 2B, where P is the perimeter of the base, h is the height of the prism, and B is the area of one base.",
  "Surface Area of a Right Cylinder: S = 2πrh + 2πr², where r is the radius of the base and h is the height; 2πrh is the lateral area and 2πr² is the area of the two circular bases.",
];

const GEO_PROBABILITY_BASICS: string[] = [
  "Probability: A number between 0 and 1, often written as a percent, that measures the likelihood of an event; 0 means the event cannot happen, and 1 means the event is certain to happen.",
  "Outcome and Sample Space: An outcome is one possible result of an experiment; the sample space is the set of all possible outcomes.",
  "Event: An outcome, or a collection of outcomes, of an experiment — the result whose probability is being measured.",
  "Theoretical Probability: A probability computed from reasoning about equally likely outcomes: the number of favorable outcomes divided by the total number of outcomes in the sample space; it states what should happen over many trials.",
  "Experimental Probability: A probability computed from trials that have actually been performed: the number of times an event occurred divided by the total number of trials; it states what did happen in those trials.",
  "Law of Large Numbers: As an experiment is repeated more and more times, the experimental probability of an event generally gets closer to its theoretical probability.",
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

/** Algebra 2 Topic 2 — absolute value (foundations shared by related ids). */
const FUNCTION_ATTRIBUTES: string[] = [
  "X-Intercept: The x-coordinate of a point where the graph of a function crosses the x-axis; it is an x-value for which f(x) = 0.",
  "Y-Intercept: The y-coordinate of the point where the graph of a function crosses the y-axis; it is the value f(0).",
  "Increasing: A function is increasing on an interval when its outputs grow as the inputs grow — the graph rises from left to right on that interval.",
  "Decreasing: A function is decreasing on an interval when its outputs shrink as the inputs grow — the graph falls from left to right on that interval.",
  "Relative Maximum: The output value at a point where the graph changes from increasing to decreasing — a peak of the graph.",
  "Relative Minimum: The output value at a point where the graph changes from decreasing to increasing — a valley of the graph.",
];

const ABS_VALUE_ONLY: string[] = [
  "Absolute Value: The distance a number is from 0 on the number line, written |x|; distance is never negative, so |x| is x when x is 0 or positive, and −x when x is negative.",
];

const ABS_VALUE_CORE: string[] = [
  ...ABS_VALUE_ONLY,
  "Absolute Value Function: A function that can be written f(x) = a|x − h| + k; its graph is a V-shape with vertex (h, k).",
  "Vertex of an Absolute Value Graph: The point (h, k) where the V changes direction — the maximum or minimum point of the graph.",
];

const ABS_TRANSFORMATIONS: string[] = [
  ...ABS_VALUE_CORE,
  "Transformation: A change in the position, shape, or direction of a graph — in f(x) = a|x − h| + k, h shifts the graph left or right, k shifts it up or down, and a stretches, shrinks, or reflects it.",
  "Vertical Stretch and Shrink: When |a| is greater than 1, the graph of f(x) = a|x − h| + k is stretched vertically and the V narrows; when |a| is between 0 and 1, the graph shrinks vertically and the V widens.",
];

const ABS_INEQ_GRAPH: string[] = [
  ...ABS_VALUE_CORE,
  "Boundary Graph: The graph of the related equation, such as y = |x − h| + k, drawn before shading; it is solid when the inequality permits equality and dashed when it does not.",
  "Shading: The half of the plane chosen by testing a point — if the test point makes the inequality true, shade the side containing it; if not, shade the other side.",
  "Solution of an Inequality in Two Variables: An ordered pair (x, y) that makes the inequality true; the solution set is the shaded region of the graph.",
];

const ABS_EQUATIONS: string[] = [
  ...ABS_VALUE_ONLY,
  "Absolute Value Equation: An equation that contains an absolute value expression, such as |x − 3| = 7.",
  "Isolate the Absolute Value: Before splitting an absolute value equation into cases, rewrite the equation so the absolute value expression stands alone on one side.",
  "Two Cases: Because the expression inside the absolute value bars can be positive or negative, an equation |A| = b with b greater than 0 splits into two equations: A = b or A = −b.",
  "Empty Case: An absolute value can never equal a negative number, so an equation of the form |A| = b with b negative has no solution.",
];

const ABS_INEQUALITIES: string[] = [
  ...ABS_VALUE_ONLY,
  "Absolute Value Inequality: An inequality that contains an absolute value expression, such as |x − 3| < 7.",
  "And Inequality (Between): |A| < b with b greater than 0 means A is within b units of 0; it is equivalent to the compound inequality −b < A < b, whose graph is the segment between two endpoints.",
  "Or Inequality (Outside): |A| > b with b greater than 0 means A is more than b units from 0; it is equivalent to A < −b or A > b, whose graph is two rays pointing away from each other.",
  "Distance Interpretation: |x − a| measures the distance between x and a on the number line, so |x − a| < b describes every x within b units of a.",
];

/** Algebra 2 Topic 3 — systems (shared by related ids). */
const SYSTEMS_CORE: string[] = [
  "System of Equations: A set of two or more equations that share the same variables; a solution of the system is an ordered pair that makes every equation in the system true.",
];

const SYSTEMS_CLASSIFY: string[] = [
  "Consistent System: A system of equations that has at least one solution.",
  "Inconsistent System: A system of equations that has no solution; the graphs of its equations are parallel lines.",
  "Independent System: A consistent system whose equations graph as different lines, so the system has exactly one solution.",
  "Dependent System: A system in which the equations graph as the same line, so every point on the line is a solution and the system has infinitely many solutions.",
];

const SYSTEMS_GRAPHS: string[] = [
  ...SYSTEMS_CORE,
  ...SYSTEMS_CLASSIFY,
  "Solving by Graphing: A method of solving a system by graphing each equation; the solution is the point where the graphs intersect.",
];

const SYSTEMS_ALGEBRAIC: string[] = [
  ...SYSTEMS_CORE,
  "Substitution Method: A method for solving a system: solve one equation for a variable, then substitute the result into the other equation.",
  "Elimination Method: A method for solving a system in which the equations are added or subtracted — after multiplying by constants as needed — so that one variable is eliminated.",
  "Equivalent System: A system formed by replacing one equation with a sum of it and a multiple of another equation; it has exactly the same solutions as the original system.",
  "Break-Even Point: In a system that models two cost or revenue plans, the solution is the break-even point — the input at which the two plans give the same value.",
];

const SYSTEMS_INEQUALITIES: string[] = [
  "System of Inequalities: A set of two or more inequalities that share the same variables; a solution is an ordered pair that makes every inequality in the system true.",
  "Solution Set of a System of Inequalities: The set of all ordered pairs that satisfy every inequality in the system, shown on a graph as the region where the shaded half-planes overlap.",
  "Half-Plane: One of the two regions into which a boundary line divides the plane; the points of one half-plane satisfy an inequality, and the points of the other do not.",
  "Boundary Line: The graph of the related equation of an inequality; it is solid when the inequality permits equality and dashed when it does not.",
  "Feasible Region: The region of the graph where all the inequalities of a system hold at once — named for applications in which only those points are possible choices.",
  "Test Point: A point substituted into an inequality to decide which half-plane to shade; (0, 0) is used whenever the boundary line does not pass through it.",
];

const THREE_VARIABLES: string[] = [
  "System in Three Variables: A set of three equations in the same three variables; a solution must satisfy all three equations at once.",
  "Ordered Triple: A solution of a system in three variables, written (x, y, z); it names the single point where the three planes of the system meet.",
  "Elimination in Three Variables: A method that reduces a 3 × 3 system to a 2 × 2 system, then to one equation in one variable, by eliminating the same variable from two pairs of equations.",
  "Back-Substitution: The final stage of solving a reduced system: each value found is substituted into an earlier equation to find the next unknown.",
  "No Solution and Many Solutions in Three Variables: If elimination reduces the system to a false statement, the system has no solution; if it reduces to an identity, the system has infinitely many solutions.",
];

const MATRIX_BASICS: string[] = [
  "Matrix: A rectangular array of numbers arranged in rows and columns.",
  "Dimensions of a Matrix: The number of rows by the number of columns, written rows × columns.",
];

const COEF_MATRIX: string[] = [
  "Coefficient Matrix: The matrix formed by the coefficients of the variables of a system, without the constants.",
];

const SYSTEMS_MATRICES_INTRO: string[] = [
  ...MATRIX_BASICS,
  ...COEF_MATRIX,
  "Augmented Matrix: A matrix that holds the coefficients of a system in its left columns and the constants in a final column, separated from the coefficients by a vertical bar.",
  "Row Operations: Operations that produce an equivalent augmented matrix: swap two rows, multiply a row by a nonzero number, or replace a row with the sum of itself and a multiple of another row.",
];

/** Algebra 2 Topic 4 — matrices (shared by related ids). */
const MATRIX_CORE: string[] = [
  ...MATRIX_BASICS,
  "Element (Entry): A single number in a matrix, located by its row and column; the position of an element is named with the row number first and the column number second.",
  "Equal Matrices: Two matrices that have the same dimensions and whose corresponding elements are all equal.",
];

const MATRIX_OPERATIONS: string[] = [
  ...MATRIX_CORE,
  "Matrix Addition and Subtraction: To add or subtract two matrices of the same dimensions, add or subtract their corresponding elements.",
  "Scalar Multiplication: The product of a scalar (a real number) and a matrix, formed by multiplying every element of the matrix by the scalar.",
];

const MATRIX_MULTIPLY: string[] = [
  "Matrix Product: The product AB of two matrices, formed row by column: the element in row i and column j of AB is the sum of the products of the corresponding elements of row i of A and column j of B.",
  "Dimension Rule for Multiplication: The product AB exists only when the number of columns of A equals the number of rows of B; the product then has as many rows as A and as many columns as B.",
  "Main Diagonal: The elements of a square matrix that run from the upper left corner to the lower right corner, where the row number equals the column number.",
  "Identity Matrix: A square matrix with 1s on the main diagonal and 0s elsewhere, written I; for any square matrix A of the same size, AI = IA = A.",
  "Non-Commutative Multiplication: Matrix multiplication is not commutative — in general AB is not BA, and one of the two products may not even exist.",
];

const DET_INVERSE: string[] = [
  "Determinant: A single number computed from a square matrix; for the 2 × 2 matrix with rows [a b] and [c d], the determinant is ad − bc, written det(A) or |A|.",
  "Inverse Matrix: A matrix A⁻¹ such that A times A⁻¹ and A⁻¹ times A both equal the identity matrix; only square matrices can have inverses, and not all of them do.",
  "Invertibility Test: A square matrix has an inverse exactly when its determinant is not 0; when the determinant is 0, the matrix has no inverse.",
  "Inverse of a 2 × 2 Matrix: When det(A) = ad − bc is not 0, A⁻¹ is 1/(ad − bc) times the matrix with rows [d −b] and [−c a] — swap the diagonal elements, negate the other two, and divide by the determinant.",
  "Singular Matrix: A square matrix whose determinant is 0; a singular matrix has no inverse.",
];

const SYSTEMS_MATRICES: string[] = [
  "Matrix Equation: An equation of the form AX = B, in which A is the coefficient matrix, X is the matrix of the variables, and B is the matrix of the constants.",
  ...COEF_MATRIX,
  "Solving with an Inverse: When the coefficient matrix A has an inverse, the system AX = B has the single solution X = A⁻¹B, found by multiplying both sides of the equation on the left by A⁻¹.",
  "Left Multiplication: Because matrix multiplication is not commutative, both sides of a matrix equation must be multiplied on the same side; the solution is X = A⁻¹B, not BA⁻¹.",
  "No Inverse, No Unique Solution: When the coefficient matrix is singular, the system has either no solution or infinitely many solutions, and the inverse method cannot be used.",
];

/** Algebra 2 Topic 6 — square root functions (shared by related ids). */
const FUNCTION_OPERATIONS: string[] = [
  "Sum, Difference, Product, and Quotient of Functions: New functions formed from f and g point by point: (f + g)(x) = f(x) + g(x), (f − g)(x) = f(x) − g(x), (fg)(x) = f(x)g(x), and (f/g)(x) = f(x)/g(x) wherever g(x) is not 0.",
  "Composition of Functions: A function formed by using the output of one function as the input of another, written f(g(x)), read 'f of g of x.' The input of f is the output of g.",
  "Domain of a Function Operation: The domain of a sum, difference, or product of f and g is the overlap of their domains; the domain of a quotient also excludes every x with g(x) = 0.",
  "Domain of a Composite Function: The set of inputs x that are in the domain of g and for which g(x) is in the domain of f.",
  "Order Matters in Composition: In general f(g(x)) and g(f(x)) are different functions; composition is not commutative.",
];

const INVERSE_CORE: string[] = [
  "Inverse Relation: The relation formed by swapping the inputs and outputs of a relation; the graph of an inverse relation is the reflection of the original graph across the line y = x.",
  "One-to-One Function: A function in which every output also has exactly one input, so the function has an inverse that is itself a function.",
];

const INVERSE_FUNCTIONS: string[] = [
  ...INVERSE_CORE,
  "Inverse Function: A function f⁻¹ that undoes f: f⁻¹(f(x)) = x for every x in the domain of f, and f(f⁻¹(x)) = x for every x in the domain of f⁻¹; the domain of f is the range of f⁻¹, and the range of f is the domain of f⁻¹.",
  "Finding an Inverse: To find the inverse of a function, replace f(x) with y, swap x and y, and solve the resulting equation for y.",
  "Horizontal Line Test: A function has an inverse that is a function exactly when every horizontal line crosses its graph at most once — that is, when the function is one-to-one.",
];

const SQRT_TRANSFORMATIONS: string[] = [
  "Square Root Function: A function whose rule contains a square root of the variable, such as f(x) = √x; the parent function f(x) = √x takes inputs of 0 or greater and gives outputs of 0 or greater.",
  "Radicand: The expression under the radical sign; in f(x) = a√(x − h) + k the radicand is x − h, and the function is defined only where the radicand is 0 or greater.",
  "Starting Point: For f(x) = a√(x − h) + k, the point (h, k) where the graph begins — the endpoint of the curve, playing the role the vertex plays for a parabola.",
  "Domain Restriction: Because the square root of a negative number is not a real number, the domain of a square root function includes only the inputs that make its radicand nonnegative.",
  "Transformations of the Square Root Graph: In f(x) = a√(x − h) + k, h shifts the starting point left or right, k shifts it up or down, a stretches or shrinks the curve vertically, and a negative a reflects it across a horizontal line.",
];

const SQRT_AS_INVERSES: string[] = [
  "Square Root as an Inverse: The function f(x) = √x is the inverse of g(x) = x² restricted to inputs of 0 or greater; each function undoes the other on that domain.",
  "Why the Restriction: The squaring function is not one-to-one — both 3 and −3 square to 9 — so it has no inverse function until its domain is restricted to the nonnegative inputs.",
  "Reflection Across y = x: The graph of a function and the graph of its inverse are mirror images across the line y = x, because forming the inverse swaps every (x, y) pair to (y, x).",
  "Squaring a Square Root: For x of 0 or greater, (√x)² = x and √(x²) = x; without the restriction, √(x²) = |x|, since a square root is never negative.",
  "Half-Parabola: The graph of f(x) = √x is the top half of a sideways parabola x = y² — the part with y of 0 or greater.",
];

const RADICAL_EQ_CORE: string[] = [
  "Radical Equation: An equation in which a variable appears under a radical sign, such as √(x + 3) = 5.",
  "Isolate the Radical: The first step in solving a radical equation: use inverse operations to get the radical expression alone on one side of the equation.",
];

const RADICAL_EQUATIONS_INTRO: string[] = [
  ...RADICAL_EQ_CORE,
  "Radical: The symbol √ together with the expression under it; the root indicated by √ is the square root.",
  "Principal Square Root: The nonnegative square root of a number; √9 = 3, never −3, even though (−3)² is also 9.",
  "Squaring Both Sides: If both sides of an equation are squared, every solution of the original equation is still a solution of the new equation — and this step removes a square root.",
];

const RADICAL_EQUATIONS_SOLVING: string[] = [
  ...RADICAL_EQ_CORE,
  "Extraneous Solution: A value produced by the solving process that does not satisfy the original equation; squaring both sides can create extraneous solutions, so every candidate must be checked in the original equation.",
  "Checking Solutions: Substituting each candidate back into the original equation; a candidate that makes a radicand negative, or makes the two sides unequal, is rejected.",
  "Two Radicals: An equation with a radical on each side, or with two radicals on one side, may need the square step twice: isolate one radical, square, isolate the remaining radical, and square again.",
  "No Solution Case: A radical equation has no solution when its only candidates are extraneous — for example, when the isolated radical would have to equal a negative number.",
];

/** Algebra 2 Topic 7 — exponential & logarithmic functions (shared by related ids). */
const EXP_ATTRIBUTES: string[] = [
  "Exponential Function: A function that can be written f(x) = a times (b to the x power), where a is not 0, b is greater than 0, and b is not 1; the variable appears in the exponent.",
  "Initial Value: The value a in an exponential function — the output when x = 0, because any base to the 0 power is 1.",
  "Growth Factor: The base b of an exponential function when b is greater than 1; each increase of 1 in x multiplies the output by b.",
  "Decay Factor: The base b of an exponential function when b is between 0 and 1; each increase of 1 in x multiplies the output by the fraction b.",
  "Horizontal Asymptote: A horizontal line the graph approaches as x grows large in one direction; the graph of an exponential function shifted up by k approaches the line y = k but never reaches it.",
  "Exponential Transformations: In a transformed exponential function, h shifts the graph left or right, k shifts it up or down and moves the horizontal asymptote to y = k, and a negative leading coefficient reflects the graph across a horizontal line.",
];

const E_FUNCTION: string[] = [
  "The Number e: An irrational number, approximately 2.718, that arises as the limiting value of (1 + 1/n) raised to the power n as n grows without bound; it is the base of the natural exponential function and the natural logarithm.",
  "Natural Exponential Function: The function that sends x to e raised to the power x; its graph passes through (0, 1) and (1, e) and has the x-axis as its horizontal asymptote.",
  "Continuous Growth: A quantity growing continuously at rate r follows A(t) = P times (e to the rt power), where P is the initial amount and t is time; the same formula with a negative r models continuous decay.",
  "Compound Interest: Interest calculated on the principal plus all interest already earned; compounded n times per year, an initial principal P at annual rate r grows after t years to P times (1 + r/n) raised to the power nt.",
  "Powers of e: Powers of e are evaluated with the e-to-the-x key of a calculator; e to the 0 power is 1, e to the 1 power is e, and e to a negative power gives a value between 0 and 1, just as with any base greater than 1.",
];

const RECURSIVE_MODELS: string[] = [
  "Recursive Formula: A formula that defines a sequence or model by giving the first term and a rule for finding each term from the term (or terms) before it.",
  "Initial Condition: The starting value given with a recursive formula, from which all later terms are built.",
  "Common Ratio: In a geometric sequence or recursive exponential model, the constant factor multiplied by each term to get the next term.",
  "Recursive Exponential Model: A model of the form 'next = b × current' with a stated initial value; it produces the same values as the explicit exponential function with initial value a and base b.",
  "Explicit Formula: A formula that gives the value of a term directly from its position, without reference to earlier terms — the closed form that a recursive model can be rewritten into.",
];

const LOG_ATTRIBUTES: string[] = [
  "Logarithm: The exponent to which a base must be raised to give a number: if b raised to the power y equals x, then the logarithm of x with base b is y.",
  "Logarithmic Function: The inverse of an exponential function: the function that takes logarithms with base b is the inverse of the exponential function with base b, so its domain is all positive x and its range is all real numbers.",
  "Vertical Asymptote: A vertical line the graph approaches but never reaches; the graph of a logarithmic function approaches the line x = 0, and the function is undefined at 0 and for every negative input.",
  "Logarithmic Transformations: In a transformed logarithmic function, a shift of h moves the graph left or right and moves the vertical asymptote to x = h, a shift of k moves it up or down, and a negative leading coefficient reflects it.",
  "Common Logarithm: A logarithm with base 10, written log x with no base shown; log 1000 = 3 because 10 raised to the power 3 is 1000.",
];

const NATURAL_LOG: string[] = [
  "Natural Logarithm: The logarithm with base e, written ln x; ln x is the exponent to which e must be raised to give x, so composing ln with the natural exponential in either order returns the input: ln of (e to the x power) is x for every real x, and e to the power (ln x) is x for positive x.",
  "Domain of ln: The natural logarithm accepts only positive inputs; ln 0 and the ln of a negative number are undefined, which is why candidate solutions of log equations are always checked.",
  "Key Values of ln: ln 1 = 0 and ln e = 1; ln x is negative for x between 0 and 1, and positive for x greater than 1.",
  "Solving with ln: Because ln is one-to-one, taking the natural logarithm of both sides of an exponential equation brings the variable exponent down where it can be isolated — the standard tool for equations with base e or with unlike bases.",
  "Continuous Models with ln: In A(t) = P times (e to the rt power), the time needed to reach a target amount is found by dividing by P and taking ln of both sides, which converts the exponential equation into a linear equation in t.",
];

const LOG_PROPERTIES: string[] = [
  "Product Property of Logarithms: The logarithm of a product is the sum of the logarithms: log base b of (xy) = log base b of x + log base b of y.",
  "Quotient Property of Logarithms: The logarithm of a quotient is the difference of the logarithms: log base b of (x/y) = log base b of x − log base b of y.",
  "Power Property of Logarithms: The logarithm of a power is the exponent times the logarithm: log base b of (x to the power p) = p × (log base b of x).",
  "Expanding and Condensing: To expand a logarithm is to rewrite it as a sum or difference of simpler logarithms; to condense is the reverse — combine sums and differences into a single logarithm.",
  "Change of Base Formula: A logarithm in any base can be computed from common or natural logarithms: log base b of x = (log x)/(log b) = (ln x)/(ln b).",
  "Logarithm of 1 and of the Base: For any base b, log base b of 1 = 0 (because b to the 0 power is 1) and log base b of b = 1 (because b to the 1 power is b).",
];

const EXP_LOG_EQUATIONS: string[] = [
  "One-to-One Property of Exponents: If b to the x power equals b to the y power for the same base b, then x = y; exponential equations are solved by rewriting both sides with a common base whenever one exists.",
  "One-to-One Property of Logarithms: If log base b of x = log base b of y, then x = y, for positive x and y; conversely, equal positive inputs have equal logarithms.",
  "Taking the Logarithm of Both Sides: When an exponential equation has no common base, apply log or ln to both sides and use the power property to bring the variable exponent down where it can be isolated.",
  "Converting Between Forms: A logarithmic equation is often solved by rewriting it in exponential form: log base b of x = y becomes x = (b to the y power).",
  "Extraneous Solutions of Log Equations: Logarithms are defined only for positive inputs, so every candidate solution must be checked: any value that makes the input of a logarithm 0 or negative is rejected.",
];

/** Algebra 2 Topic 8 — polynomials (shared by related ids). */
const RATIONAL_ROOT_THEOREM: string[] = [
  "Rational Root Theorem: If a polynomial equation with integer coefficients has a rational solution p/q in lowest terms, then p is a factor of the constant term and q is a factor of the leading coefficient.",
];

const POLY_ATTRIBUTES: string[] = [
  "Polynomial Function: A function whose rule is a polynomial — a sum of terms in which each term is a coefficient times a whole-number power of x, and no variable appears in a denominator or under a radical.",
  "Degree of a Polynomial: The greatest exponent of the variable in the polynomial; the degree names the polynomial (degree 1 linear, 2 quadratic, 3 cubic, 4 quartic) and equals the greatest number of zeros the polynomial can have.",
  "Leading Coefficient: The coefficient of the term with the greatest degree; together with the degree it determines the end behavior of the graph.",
  "End Behavior: The direction of the outputs of a function as x grows large in the positive and negative directions — described as the graph rising or falling on each side.",
  "End Behavior Rules: For an even degree, both ends of the graph point the same way (up when the leading coefficient is positive, down when negative); for an odd degree, the ends point opposite ways (down then up when the leading coefficient is positive).",
  "Turning Point: A point where the graph of a function changes from increasing to decreasing or the reverse; a polynomial of degree n has at most n − 1 turning points.",
];

const LINEAR_FACTORS_ZEROS: string[] = [
  "Zero of a Polynomial Function: An input value c for which the function value is 0; it is a solution of the polynomial equation and an x-intercept of the graph.",
  "Linear Factor Theorem: A polynomial function has the factor (x − c) exactly when c is a zero of the function — factors and zeros determine each other.",
  "Multiplicity: The number of times a linear factor appears in the factored form of a polynomial; a zero of even multiplicity makes the graph touch the x-axis and turn around, while a zero of odd multiplicity makes the graph cross the x-axis.",
  "Factoring by Grouping: A method for factoring a four-term polynomial: group the terms in pairs, factor a common factor from each pair, then factor out the common binomial.",
  "Sum and Difference of Cubes: The factoring patterns for cubes: a cubed plus b cubed factors as (a + b)(a² − ab + b²), and a cubed minus b cubed factors as (a − b)(a² + ab + b²).",
  ...RATIONAL_ROOT_THEOREM,
];

const POLY_OPERATIONS: string[] = [
  "Standard Form of a Polynomial: A polynomial written with its terms in order of decreasing degree, so the degree and leading coefficient can be read at once.",
  "Like Terms: Terms that have the same variable raised to the same power; only like terms can be added or subtracted, by adding or subtracting their coefficients.",
  "Adding and Subtracting Polynomials: Combine like terms; when subtracting, distribute the negative sign to every term of the polynomial being subtracted before combining.",
  "Multiplying Polynomials: Multiply every term of one polynomial by every term of the other, then combine like terms — the distributive property applied repeatedly.",
  "FOIL: A bookkeeping pattern for multiplying two binomials: the First, Outer, Inner, and Last products, added together.",
  "Degree of a Product: The degree of the product of two polynomials is the sum of their degrees — the product of the two leading terms is the leading term of the product.",
];

const POLY_SOLVE: string[] = [
  "Polynomial Equation: An equation in which a polynomial is set equal to 0 (or to another polynomial); its solutions are the zeros of the related polynomial function.",
  "Solving by Factoring: Set the polynomial equal to 0, factor it completely, and apply the Zero Product Property: if a product of factors is 0, at least one factor is 0.",
  "Zero Product Property: If the product of two quantities is 0, then at least one of the quantities is 0 — if ab = 0, then a = 0 or b = 0.",
  ...RATIONAL_ROOT_THEOREM,
  "Testing a Candidate Zero: A candidate c is an actual zero exactly when synthetic division by (x − c) leaves remainder 0; each zero found splits off a linear factor and lowers the degree of what remains.",
  "Complete Solution Count: A polynomial equation of degree n has n solutions in the complex numbers when multiplicity is counted; its real solutions are the x-intercepts of the graph.",
];

const POLY_DIVIDE: string[] = [
  "Polynomial Long Division: A division algorithm for polynomials modeled on whole-number long division: divide the leading terms, multiply, subtract, and repeat with the remainder until its degree is less than the degree of the divisor.",
  "Synthetic Division: A shortcut for dividing a polynomial by a binomial of the form (x − c): only the coefficients are written, c is the multiplier, and the process adds where long division subtracts.",
  "Quotient and Remainder: Dividing a polynomial P(x) by (x − c) gives P(x) = (x − c)Q(x) + R, where Q is the quotient polynomial and R is the constant remainder.",
  "Remainder Theorem: The remainder when a polynomial P(x) is divided by (x − c) is exactly P(c) — synthetic division and direct evaluation always agree.",
  "Factor Theorem: The binomial (x − c) is a factor of a polynomial P(x) exactly when P(c) = 0 — that is, exactly when c is a zero of the polynomial.",
];

const ROOT_THEOREMS: string[] = [
  ...RATIONAL_ROOT_THEOREM,
  "Possible Rational Zeros: The complete list of candidates the theorem allows: every factor of the constant term, with both its positive and negative values, divided by every factor of the leading coefficient, with both signs.",
  "Testing Candidates: A candidate is a zero exactly when substituting it into the polynomial gives 0, or equivalently when synthetic division by the corresponding factor leaves remainder 0; each zero found lowers the degree of the remaining factor.",
  "Conjugate Root Theorem: If a polynomial with real coefficients has the complex zero a + bi, it also has the zero a − bi; non-real zeros of such polynomials come in conjugate pairs.",
  "Irrational Conjugates: If a polynomial with rational coefficients has the zero a + √b, where b is not a perfect square, it also has the zero a − √b.",
];

const FTA: string[] = [
  "Fundamental Theorem of Algebra: Every polynomial of degree n (n at least 1) has at least one zero in the complex numbers; counted with multiplicity, such a polynomial has exactly n complex zeros.",
  "Complete Factorization: Every polynomial of degree n can be written as a product of exactly n linear factors over the complex numbers, one factor for each zero.",
  "Counting Zeros: A polynomial of degree n has exactly n zeros in the complex numbers when a repeated zero is counted as many times as its multiplicity.",
  "Complex Zeros Come in Pairs: For a polynomial with real coefficients, non-real zeros occur in conjugate pairs a + bi and a − bi, so the number of non-real zeros is always even.",
  "Real Zeros and the Graph: The real zeros of a polynomial are exactly the x-intercepts of its graph; a polynomial of degree n has at most n real zeros, and any zeros not seen on the graph are non-real.",
];

/** Algebra 2 Topic 9 — radical expressions (shared by related ids). */
const ROOTS_RADICALS: string[] = [
  "Radical Expression: An expression that contains a radical sign √; the number or expression under the sign is the radicand.",
  "Index: The small number written in the notch of a radical that names the root — an index of 2 means square root (and is not written), an index of 3 means cube root, and in general the index names the nth root.",
  "Principal Root: For an even index, the radical sign names the nonnegative root only — √16 = 4, never −4; for an odd index, the root keeps the sign of the radicand.",
  "Perfect Powers: Numbers that are exact powers matching an index — perfect squares such as 4, 9, 16, and 25 for square roots, and perfect cubes such as 8, 27, 64, and 125 for cube roots; factoring out the largest perfect-power factor of the radicand simplifies a radical.",
  "Product Property of Radicals: The root of a product is the product of the roots: the nth root of (ab) equals the nth root of a times the nth root of b, whenever the roots are real numbers.",
  "Simplest Form of a Radical: A radical is in simplest form when the radicand has no factor that is a perfect power of the index, no fraction remains under the radical, and no radical remains in a denominator.",
];

const RADICAL_MULT_DIV: string[] = [
  "Multiplying Radicals: Radicals with the same index are multiplied by multiplying their radicands and keeping the index: √a times √b is √(ab), for nonnegative a and b.",
  "Quotient Property of Radicals: The root of a quotient is the quotient of the roots: the nth root of (a/b) equals the nth root of a divided by the nth root of b, whenever the roots are real numbers and b is not 0.",
  "Rationalizing the Denominator: Rewriting a fraction so that no radical remains in its denominator, by multiplying the numerator and denominator by a radical that makes the denominator's radicand a perfect power.",
  "Like Radicals: Radical expressions with the same index and the same radicand; only like radicals can be added or subtracted, by combining their coefficients as with like terms.",
  "Coefficient of a Radical: The factor written in front of a radical, such as the 3 in 3√5; simplifying each radical first is what reveals whether two radicals are like radicals.",
];

const BINOMIAL_RADICALS: string[] = [
  "Binomial Radical Expression: An expression with two terms in which at least one term contains a radical, such as 3 + √5 or √7 − √2.",
  "Conjugates: Two binomial expressions that differ only in the sign between their terms, such as a + √b and a − √b; their product is the rational number a² − b.",
  "Product of Conjugates: Multiplying a binomial radical expression by its conjugate eliminates the radical, because the middle terms cancel and the radical term is squared: (a + √b)(a − √b) = a² − b.",
  "Rationalizing with Conjugates: To clear a radical from a denominator that is a binomial, multiply the numerator and the denominator by the conjugate of the denominator.",
  "Distributing with Radicals: Products of binomials containing radicals are expanded term by term, as with ordinary binomials, using (√a)² = a whenever a radical is squared.",
];

const RATIONAL_EXPONENTS: string[] = [
  "Rational Exponent: An exponent written as a fraction m/n; in a to the power (m/n), the denominator n is the index of a root and the numerator m is a power: a to the power (m/n) equals the mth power of the nth root of a, and equally the nth root of the mth power of a.",
  "Radical Form and Exponential Form: Two ways to write the same quantity: a to the power (1/n) is the nth root of a; converting to exponential form lets the laws of exponents apply to roots.",
  "Laws of Exponents with Rational Exponents: The product, quotient, and power rules for exponents hold for rational exponents exactly as they do for integer exponents, for positive bases.",
  "Simplifying with Rational Exponents: Rewrite radicals as powers, apply the laws of exponents, and convert back; an expression is fully simplified when it has no negative exponents and no exponent that is better written as a simple radical.",
  "Negative Rational Exponent: A negative exponent still means a reciprocal: a to the power (−m/n) equals 1 divided by a to the power (m/n), for a greater than 0.",
];

/** Algebra 2 Topic 10 — cubic & cube root functions (shared by related ids). */
const CUBIC_TRANSFORMATIONS: string[] = [
  "Cubic Function: A polynomial function of degree 3, such as the parent function f(x) = x cubed; its graph is a curve that falls on the left and rises on the right, passing through the origin.",
  "Point of Inflection: The point where the graph of a cubic function changes the direction of its bend — the point (h, k) of a transformed cubic, which plays the role for a cubic that the vertex plays for a parabola.",
  "Transformations of the Cubic Graph: In a transformed cubic, h shifts the graph left or right, k shifts it up or down, the coefficient a stretches or shrinks it vertically, and a negative a reflects it so the graph rises on the left and falls on the right.",
  "End Behavior of a Cubic: The ends of a cubic graph always point in opposite directions — down on the left and up on the right for the parent function — unlike the matching ends of an even-degree polynomial.",
  "Symmetry of the Cubic Graph: The parent cubic, the function that cubes x, is symmetric about the origin: rotating its graph a half-turn gives the same graph, the mark of an odd function.",
];

const CUBE_ROOT_DEF: string[] = [
  "Cube Root: The inverse of cubing: the cube root of a number is the value that, used as a factor three times, gives the number — the cube root of 8 is 2, and the cube root of −8 is −2.",
];

const CUBEROOT_TRANSFORMATIONS: string[] = [
  "Cube Root Function: A function whose rule contains a cube root of the variable; the parent function takes the cube root of x, accepts every real number as an input, and gives every real number as an output.",
  ...CUBE_ROOT_DEF,
  "Transformations of the Cube Root Graph: In a transformed cube root function, h shifts the graph left or right, k shifts it up or down, and the coefficient a stretches, shrinks, or reflects it; the inflection point of the graph sits at (h, k).",
  "Domain and Range of a Cube Root Function: Both are all real numbers — negative inputs have real cube roots, so the graph is never cut off the way a square root graph is.",
  "Inverse of a Cubic: A cube root function is the inverse of the corresponding cubic function, and their graphs are reflections of each other across the line y = x.",
];

const CUBEROOT_EQUATIONS: string[] = [
  "Cube Root Equation: An equation in which a variable appears inside a cube root, such as the cube root of (x + 5) set equal to 3.",
  ...CUBE_ROOT_DEF,
  "Isolate the Cube Root: As with square root equations, first use inverse operations to get the cube root expression alone on one side before cubing.",
  "Cubing Both Sides: Raising both sides of an equation to the third power removes a cube root: if the cube root of A equals B, then A equals B cubed.",
  "No Extraneous Solutions from Cubing: Unlike squaring, cubing gives an equivalent equation — every real number has exactly one cube root, so cubing both sides can never introduce an extraneous solution.",
  "Negative Radicands Allowed: A cube root equation may ask for the cube root of a negative quantity — always a real number — so no domain restriction arises before solving.",
];

/** Algebra 2 Topic 11 — rational functions & equations (shared by related ids). */
const RATIONAL_SIMPLIFY: string[] = [
  "Rational Expression: An expression that is the quotient of two polynomials; the denominator polynomial cannot be 0.",
  "Domain Restrictions: The values of the variable that make a denominator 0 are excluded from the domain; restrictions are read from the original expression, before any factors are canceled.",
  "Simplifying a Rational Expression: Factor the numerator and denominator completely, then divide out the factors they have in common; the simplified expression equals the original at every point of the original domain.",
  "Lowest Terms: A rational expression is in lowest terms when its numerator and denominator share no common factor other than 1 and −1.",
  "Opposite Factors: Factors that differ only by a sign, such as (x − 3) and (3 − x); their quotient is −1, so an expression containing opposite factors can be simplified by dividing them out with a sign change.",
];

const RATIONAL_MULT_DIV: string[] = [
  "Multiplying Rational Expressions: Multiply the numerators together and the denominators together, factoring everything first so that common factors can be divided out before or after multiplying.",
  "Dividing Rational Expressions: To divide by a rational expression, multiply by its reciprocal — flip the divisor and proceed as in multiplication.",
  "Reciprocal: The reciprocal of a nonzero expression is 1 divided by the expression; an expression and its reciprocal have product 1.",
  "Restrictions in Products and Quotients: Every value that makes any denominator in the problem 0 — including the divisor, before it is flipped — is excluded from the domain.",
  "Factor First: The working rule of rational arithmetic — factor every numerator and denominator before canceling, because only factors, never terms, can be divided out.",
];

const RATIONAL_ADD_SUB: string[] = [
  "Least Common Denominator: The least expression that every denominator in a problem divides into; it is built from each distinct factor of the denominators, taken at the greatest power with which that factor appears in any one denominator.",
  "Common Denominator: Any denominator that all the denominators of a problem divide into; rewriting an expression with a common denominator multiplies its numerator and denominator by the same factor, so the value of the expression does not change.",
  "Adding and Subtracting with Like Denominators: When rational expressions share a denominator, add or subtract the numerators only and keep the denominator; in subtraction the whole of the second numerator is subtracted, so it is treated as a single grouped quantity.",
  "Adding and Subtracting with Unlike Denominators: First rewrite each expression with the least common denominator, multiplying each numerator by the factor its denominator is missing; then combine the numerators. The denominators of an expression are never cleared away — clearing denominators is a move for equations, not for expressions.",
  "Simplifying the Sum or Difference: After the numerators are combined, factor the resulting numerator and divide out any factor it shares with the denominator; the restrictions on the variable still come from every denominator in the original problem.",
];

const ASYMPTOTES_HOLES: string[] = [
  "Rational Function: A function that can be written as the quotient of two polynomial functions, f(x) = P(x)/Q(x), with Q(x) not the zero polynomial.",
  "Vertical Asymptote: A vertical line x = c that the graph of a function approaches but never touches, occurring at a zero of the denominator that does not cancel with the numerator.",
  "Horizontal Asymptote: A horizontal line the graph approaches as x grows large in the positive or negative direction; for a rational function it is decided by comparing the degrees of the numerator and denominator.",
  "Hole (Removable Discontinuity): A single missing point in the graph of a rational function, occurring where a factor cancels between numerator and denominator; the x-value is excluded, as with a restriction, but the graph has no asymptote there — only a gap at one point.",
  "Degree Rules for Horizontal Asymptotes: If the degree of the numerator is less than the degree of the denominator, the horizontal asymptote is y = 0; if the degrees are equal, it is the ratio of the leading coefficients; if the degree of the numerator is greater, there is no horizontal asymptote.",
];

const RATIONAL_EQUATIONS: string[] = [
  "Rational Equation: An equation that contains at least one rational expression with the variable in a denominator.",
  "Least Common Denominator: The least expression that every denominator in an equation divides into; multiplying every term of the equation by the LCD clears all denominators at once.",
  "Clearing Denominators: Multiplying both sides of a rational equation by the LCD to rewrite it as a polynomial equation; the candidates of the new equation must still respect the original restrictions.",
  "Extraneous Solution: A candidate produced by clearing denominators that makes an original denominator 0; it lies outside the domain and must be rejected.",
  "Proportions: A rational equation stating that two ratios are equal can be solved by cross-multiplication, since a/b = c/d exactly when ad = bc, for nonzero denominators.",
];

/** Algebra 2 Topic 12 — data & regression (shared by related ids). */
const ANALYZING_DATA: string[] = [
  "Finite Differences: The differences between consecutive outputs of a table with evenly spaced inputs; constant first differences signal a linear model, and constant second differences signal a quadratic model.",
  "First and Second Differences: First differences subtract consecutive outputs directly; second differences subtract consecutive first differences — the level at which the differences become constant names the polynomial model.",
  "Common Ratio Test: Dividing each output of a table by the output before it; a constant ratio signals an exponential model, and the ratio is the growth or decay factor of the model.",
  "Model Selection: Choosing among linear, quadratic, and exponential models for data by testing which signature the table shows — constant differences, constant second differences, or constant ratios.",
  "Evenly Spaced Inputs: Tables are classified by differences and ratios only when the inputs increase by a constant amount; data with uneven inputs must be fitted with a function instead.",
];

const REGRESSION: string[] = [
  "Regression: A method of finding a function of a chosen type that fits a set of data points as closely as possible, used to describe the data and to make predictions.",
  "Least-Squares Line: The line of best fit for a data set: of all possible lines, it is the one that makes the sum of the squares of the vertical distances from the points to the line the smallest.",
  "Line of Best Fit: The regression line drawn through a scatter plot to summarize its trend; its equation is written in slope-intercept form and used for prediction.",
  "Correlation Coefficient: A number r between −1 and 1 that measures the strength and direction of a linear relationship: values near 1 or −1 mean the points cluster tightly around a line, and values near 0 mean little linear relationship.",
  "Residual: The vertical distance from a data point to the regression line — the observed value minus the value predicted by the model; small residuals with no pattern signal a good fit.",
];

const USING_MODELS: string[] = [
  "Prediction: Using the equation of a fitted model to estimate a value for an input, either from the pattern of the data or by direct substitution.",
  "Interpolation: Predicting a value inside the range of the data used to build the model; interpolation is generally more reliable than extrapolation.",
  "Extrapolation: Predicting a value outside the range of the data used to build the model; the farther the prediction reaches beyond the data, the less trustworthy it is.",
  "Choosing a Model for a Decision: A model is chosen by how well it fits — its residuals and correlation — and by whether its type matches the situation: constant change suggests linear, and constant percent change suggests exponential.",
  "Limits of a Model: Every model is an approximation that holds only near the data behind it; real quantities also obey real-world limits, such as nonnegative amounts, that a formula does not know.",
];

/** Algebra 2 supplementary — sequences, circles (shared by related ids). */
const SEQUENCES: string[] = [
  "Sequence: An ordered list of numbers, called terms, that follows a rule; a sequence can be described by an explicit formula or a recursive formula.",
  "Arithmetic Sequence: A sequence in which the difference between consecutive terms is constant; that constant is the common difference, and the nth term is the first term plus (n − 1) times the common difference.",
  "Geometric Sequence: A sequence in which the ratio of consecutive terms is constant; that constant is the common ratio, and the nth term is the first term times the common ratio raised to the (n − 1) power.",
  "Recursive Formula: A formula that defines a sequence or model by giving the first term and a rule for finding each term from the term (or terms) before it.",
  "Explicit Formula: A formula that gives the value of a term directly from its position, without reference to earlier terms — the closed form that a recursive model can be rewritten into.",
  "Series: The sum of the terms of a sequence; a finite series has a stated number of terms, and its sum is found by adding the terms in order.",
];

const CIRCLE_EQUATIONS: string[] = [
  "Circle: The set of all points in a plane that are a fixed distance, the radius, from a fixed point, the center.",
  "Center-Radius Form: The equation of a circle with center (h, k) and radius r: (x − h)² + (y − k)² = r².",
  "Radius from the Equation: In center-radius form the constant equals r², so the radius is its square root — the equation (x − h)² + (y − k)² = 25 describes a circle of radius 5, not 25.",
  "General Form: A circle equation written x² + y² + Dx + Ey + F = 0, with the squared terms having equal coefficients; completing the square on x and on y converts it to center-radius form.",
  "Completing the Square for a Circle: Group the x-terms and the y-terms, complete the square in each group, and add the same constants to the other side; the result names the center and the radius directly.",
];

const CIRCLE_LINE_SYSTEMS: string[] = [
  "Circle-Line System: A system consisting of one circle equation and one linear equation; its solutions are the points where the line and the circle meet.",
  "Substitution for a Circle-Line System: Solve the linear equation for one variable and substitute into the circle equation; the result is a quadratic equation in one variable whose solutions lead to the intersection points.",
  "Secant Line: A line that meets a circle at two points; a circle-line system whose line is a secant has two solutions.",
  "Tangent Line: A line that meets a circle at exactly one point; the system then has exactly one solution, and the radius drawn to the point of tangency is perpendicular to the line.",
  "No Intersection: A line that misses the circle entirely produces a quadratic with no real solutions when substituted, so the system has no solution.",
];

/** Algebra 1 Topic 1 — literal equations & absolute value (shared by related ids). */
const LITERAL_EQUATIONS: string[] = [
  "Literal Equation: An equation that contains two or more variables; solving a literal equation means rewriting it so that one variable is isolated in terms of the others.",
  "Formula: A literal equation that describes a relationship among quantities in a real situation, such as the equation A = lw that gives the area of a rectangle from its length and width.",
  "Solving for a Variable: Rewriting an equation so the chosen variable stands alone on one side, using the same inverse operations as for an equation in one variable while treating the other variables as known numbers.",
  "Equivalent Equations: Equations that have exactly the same solution, formed by performing the same operation on both sides of an equation.",
];

const A1_ABSOLUTE_VALUE: string[] = [
  ...ABS_VALUE_ONLY,
  "Absolute Value Equation: An equation that contains an absolute value expression, such as |x + b| = c.",
  "Two Cases: Because the expression inside the bars can be positive or negative, the equation |A| = c, with c positive, splits into two equations: A = c or A = −c.",
  "No Solution: An absolute value can never equal a negative number, so an equation of the form |A| = c with c negative has no solution.",
];

/** Algebra 1 Topics 2/3 — linear forms, function rules, transformations (shared by related ids). */
const FUNCTION_RULE_CORE: string[] = [
  "Function Rule: An equation that describes a function; for each input x it gives exactly one output y, such as y = 2x + 1.",
];

const POINT_SLOPE_FORM: string[] = [
  "Point-Slope Form: An equation of a line written y − y₁ = m(x − x₁), where m is the slope of the line and (x₁, y₁) is one point on the line.",
  "Slope: The rate of change of a line, equal to rise over run: m = (y₂ − y₁)/(x₂ − x₁).",
  "Writing an Equation from a Point and the Slope: Substitute the slope for m and the point's coordinates for x₁ and y₁ in point-slope form; simplify into slope-intercept form when the y-intercept is needed.",
  "Writing an Equation from Two Points: First use the slope formula on the two points to find m, then write point-slope form with either point — both choices describe the same line.",
];

const LINEAR_STANDARD_FORM: string[] = [
  "Standard Form: A linear equation written Ax + By = C, where A, B, and C are real numbers, usually integers, and A and B are not both 0.",
  "X-Intercept: The x-coordinate of the point where a line crosses the x-axis.",
  "Y-Intercept: The y-coordinate of the point where a line crosses the y-axis; it is the value b in y = mx + b.",
  "Graphing with Intercepts: To graph Ax + By = C, set y = 0 and solve for the x-intercept, then set x = 0 and solve for the y-intercept; the line through the two intercept points is the graph.",
  "Converting to Slope-Intercept Form: Solve Ax + By = C for y; the resulting equation y = mx + b names the slope and the y-intercept directly, and the two forms describe the same line.",
];

const GRAPHING_FUNCTION_RULE: string[] = [
  ...FUNCTION_RULE_CORE,
  "Table of Values: A table that pairs chosen input values of a function rule with the outputs the rule produces; each row of the table gives one point of the graph.",
  "Graph of a Function: The set of points (x, y) in the coordinate plane whose coordinates satisfy the function's rule.",
  "X-Intercept: The x-coordinate of the point where a line crosses the x-axis.",
  "Y-Intercept: The y-coordinate of the point where a line crosses the y-axis; it is the value b in y = mx + b.",
  "Linear Function: A function whose graph is a straight line and whose equation can be written y = mx + b.",
];

const WRITING_FUNCTION_RULE: string[] = [
  ...FUNCTION_RULE_CORE,
  "Independent Variable: The input variable of a function, usually written x; its values are the ones chosen or measured first.",
  "Dependent Variable: The output variable of a function, usually written y; its values are determined by the input through the function rule.",
  "Finding a Rule from a Table: Look at how the output changes when the input increases by 1; a constant change gives the slope m, and the output paired with input 0 gives the y-intercept b of the rule y = mx + b.",
];

const LINEAR_TRANSFORMATIONS: string[] = [
  "Parent Function: The simplest function in a family of functions; the parent of the linear functions is f(x) = x, the line with slope 1 through the origin.",
  "Transformation: A change in the position or shape of the graph of a function; adding a constant to the rule, or multiplying the rule by a constant, transforms the graph in a predictable way.",
  "Vertical Shift: Adding a constant k to a function rule, as in f(x) + k, slides every point of the graph up when k is positive and down when k is negative.",
  "Horizontal Shift: Replacing x with x − h in a function rule slides the graph to the right when h is positive and to the left when h is negative; the direction of the shift is opposite to the sign that appears in the rule.",
  "Reflection and Steepness: Multiplying a function rule by a negative number flips its graph, reversing the direction of the line; multiplying by a number with absolute value greater than 1 makes the line steeper, and multiplying by a number between 0 and 1 makes it flatter.",
];

/** Algebra 1 Topic 4 — systems of equations & inequalities (shared by related ids). */
const A1_SYSTEMS_GRAPHING: string[] = [
  ...SYSTEMS_CORE,
  "Solving by Graphing: Graphing both equations of a system on the same coordinate plane; the point where the two graphs intersect is the solution of the system.",
  "No Solution — Parallel Lines: When the graphs of a system are parallel lines, they never intersect, so the system has no solution.",
  "Infinitely Many Solutions — Same Line: When both equations of a system graph as the same line, every point on the line makes both equations true, so the system has infinitely many solutions.",
  "Checking a Solution: A solution must make both equations true; substitute the ordered pair into each original equation to check it.",
];

const A1_SYSTEMS_SUBSTITUTION: string[] = [
  ...SYSTEMS_CORE,
  "Substitution Method: A method for solving a system: solve one equation for a variable, then substitute the result into the other equation.",
  "Back-Substitution: Once one variable of a system is known, substitute its value into either of the original equations to find the value of the other variable.",
  "Equation in One Variable: Substitution trades a system of two equations in two variables for a single equation in one variable, which can be solved with inverse operations.",
];

const A1_SYSTEMS_ELIMINATION: string[] = [
  ...SYSTEMS_CORE,
  "Elimination Method: A method for solving a system in which the equations are added or subtracted — after multiplying by constants as needed — so that one variable is eliminated.",
  "Opposite Coefficients: Two terms whose coefficients sum to 0, such as 3x and −3x; adding equations that have opposite coefficients removes that variable from the result.",
  "Multiplying an Equation: Every term of an equation may be multiplied by the same nonzero number without changing the equation's solutions; this is the step used to create opposite coefficients.",
];

const A1_SYSTEMS_APPLICATIONS: string[] = [
  ...SYSTEMS_CORE,
  "Defining the Variables: The first step in solving a problem with a system: write in words what each variable stands for, including the units it is measured in.",
  "Break-Even Point: In a system that models two cost or revenue plans, the solution is the break-even point — the input at which the two plans give the same value.",
  "Interpreting the Solution: The last step in solving a problem with a system: state in words what the solution's coordinates mean in the situation, not just the numbers themselves.",
];

const A1_LINEAR_INEQUALITIES: string[] = [
  "Linear Inequality in Two Variables: An inequality in two variables that can be written in the form with ax + by on one side of an inequality symbol and c on the other; its solutions are ordered pairs, and together they fill a region of the coordinate plane.",
  "Solution of a Linear Inequality: An ordered pair (x, y) that makes the inequality true; a linear inequality has infinitely many solutions, and together they form the shaded region of its graph.",
  "Boundary Line: The graph of the related equation of an inequality; it is solid when the inequality permits equality and dashed when it does not.",
  "Half-Plane: One of the two regions into which a boundary line divides the plane; the points of one half-plane satisfy an inequality, and the points of the other do not.",
  "Test Point: A point substituted into an inequality to decide which half-plane to shade; (0, 0) is used whenever the boundary line does not pass through it.",
];

/** Algebra 1 Topic 5 — exponents & radicals (shared by related ids). */
const ZERO_NEGATIVE_EXPONENTS: string[] = [
  "Base: In a power, the number or expression that is used as a repeated factor.",
  "Exponent: In a power, the number that tells how many times the base is used as a factor.",
  "Zero Exponent Property: Every nonzero number raised to the power 0 equals 1.",
  "Negative Exponent Property: For a nonzero number a and a whole number n, a raised to the power negative n equals 1 divided by a raised to the power n — a negative exponent places the power on the other side of a fraction bar.",
];

const MULTIPLYING_POWERS: string[] = [
  "Monomial: A number, a variable, or a product of a number and one or more variables with whole-number exponents.",
  "Coefficient: The number in front of the variables of a monomial, such as the 3 in the monomial 3x².",
  "Product of Powers Property: To multiply two powers that have the same base, add their exponents and keep the base.",
  "Multiplying Monomials: Multiply the coefficients together, then apply the product of powers property to each pair of like bases.",
];

const POWER_OF_POWER: string[] = [
  "Power of a Power Property: To raise a power to another power, multiply the exponents and keep the base.",
  "Power of a Product Property: To raise a product to a power, raise every factor of the product to that power.",
  "Power of a Monomial: Raise the coefficient and each variable of the monomial to the given power, using the power of a product property first and then the power of a power property on each variable.",
  "Simplest Form of an Exponential Expression: An expression is in simplest form when each base appears only once, no power is raised to another power, and there are no parentheses and no negative or zero exponents.",
];

const DIVISION_PROPERTIES_EXP: string[] = [
  "Quotient of Powers Property: To divide two powers that have the same nonzero base, subtract the exponent in the denominator from the exponent in the numerator and keep the base.",
  "Power of a Quotient Property: To raise a quotient to a power, raise both the numerator and the denominator to that power.",
  "Dividing Monomials: Divide the coefficients, apply the quotient of powers property to each pair of like bases, and rewrite any negative exponents with the negative exponent property so the final answer has only positive exponents.",
  "Undefined Division: An expression with 0 in its denominator is undefined, so a base that appears in a denominator must not be 0.",
];

const A1_RATIONAL_EXPONENTS: string[] = [
  "Rational Exponent: An exponent that is a fraction; the denominator of the fraction names a root to take, and the numerator names a power to raise to.",
  "Power of 1/2: Raising a nonnegative number to the power 1/2 gives its square root — a raised to the power 1/2 is √a.",
  "Power of 1/3: Raising a number to the power 1/3 gives its cube root — the number that, used as a factor three times, returns the original number.",
  "Radical: The symbol √ used to indicate a root; the number or expression written under the symbol is the radicand.",
];

const SIMPLIFYING_RADICALS: string[] = [
  "Radical Expression: An expression that contains a radical symbol and a radicand, such as √12.",
  "Radicand: The number or expression under a radical symbol; simplifying a square root means reducing what the radicand contains, not changing the root being taken.",
  "Perfect Square: A number that is the square of a whole number — 1, 4, 9, 16, 25, and so on; perfect-square factors are the ones that can be taken out of a square root.",
  "Product Property of Square Roots: The square root of a product equals the product of the square roots of its factors, when neither factor is negative: √(ab) = √a × √b.",
  "Simplest Radical Form: A square root is in simplest radical form when the radicand has no perfect-square factor left in it other than 1.",
];

/** Algebra 1 Topic 6 — sequences (shared by related ids). */
const EXPLICIT_SEQUENCES: string[] = [
  "Sequence: An ordered list of numbers that follows a pattern; each number in the list is a term of the sequence.",
  "Arithmetic Sequence: A sequence in which the difference between one term and the next is always the same number.",
  "Common Difference: The constant difference between consecutive terms of an arithmetic sequence, found by subtracting any term from the term that follows it.",
  "Geometric Sequence: A sequence in which the ratio of one term to the next is always the same number.",
  "Common Ratio: The constant ratio between consecutive terms of a geometric sequence, found by dividing any term by the term before it.",
  "Explicit Formula: A formula that computes the nth term of a sequence directly from its position n — for an arithmetic sequence, the first term plus (n − 1) times the common difference; for a geometric sequence, the first term times the common ratio raised to the power (n − 1).",
];

const RECURSIVE_ARITHMETIC: string[] = [
  "Sequence: An ordered list of numbers that follows a pattern; each number in the list is a term of the sequence.",
  "Recursive Formula: A formula that defines a sequence by stating the first term and giving a rule that builds each new term from the term before it.",
  "Initial Term: The first term of a sequence, stated as part of a recursive formula; every later term is computed starting from it.",
  "Recursive Rule for an Arithmetic Sequence: Each term is the previous term plus the common difference, so the whole sequence is known once the first term and the common difference are given.",
];

const RECURSIVE_GEOMETRIC: string[] = [
  "Recursive Formula: A formula that defines a sequence by stating the first term and giving a rule that builds each new term from the term before it.",
  "Initial Term: The first term of a sequence, stated as part of a recursive formula; every later term is computed starting from it.",
  "Recursive Rule for a Geometric Sequence: Each term is the previous term multiplied by the common ratio, so the whole sequence is known once the first term and the common ratio are given.",
  "Common Ratio: The constant ratio between consecutive terms of a geometric sequence, found by dividing any term by the term before it.",
];

/** Algebra 1 Topic 7 — polynomials & factoring (shared by related ids). */
const A1_ADD_SUB_POLYNOMIALS: string[] = [
  "Polynomial: A monomial or a sum of monomials; each monomial in the sum is called a term of the polynomial.",
  "Monomial: A number, a variable, or a product of a number and one or more variables with whole-number exponents.",
  "Degree of a Polynomial: The greatest degree of any one term of the polynomial; the degree of a term in one variable is the exponent of that variable.",
  "Like Terms: Terms that have the same variable raised to the same power; only like terms can be added or subtracted, by adding or subtracting their coefficients.",
  "Standard Form of a Polynomial: A polynomial written with its terms in order from the greatest degree to the least degree.",
  "Adding and Subtracting Polynomials: Combine the like terms of the polynomials; when subtracting, first change the sign of every term of the polynomial being subtracted.",
];

const A1_MULTIPLY_AND_FACTOR: string[] = [
  "Factoring: Rewriting an expression as a product of two or more factors; factoring is the reverse of multiplying, so multiplying the factors back must return the original expression.",
  "Greatest Common Factor: The greatest expression that divides every term of a polynomial; factoring it out is the first step in factoring any polynomial.",
  "Distributive Property: A factor multiplied by a sum multiplies each term of the sum; factoring out a greatest common factor is this property read from right to left.",
  "Factoring Out the GCF: Rewriting a polynomial as its greatest common factor times what remains after each term is divided by that factor, such as 6x + 9 rewritten as 3(2x + 3).",
];

const MULTIPLYING_BINOMIALS: string[] = [
  "Binomial: A polynomial that has exactly two terms.",
  "Multiplying Binomials: Multiply every term of the first binomial by every term of the second binomial, then combine any like terms in the result.",
  "FOIL: A bookkeeping pattern for multiplying two binomials: the First, Outer, Inner, and Last products, added together.",
  "Trinomial: A polynomial that has exactly three terms; after like terms are combined, the product of two binomials is usually a trinomial.",
];

const FACTOR_MONIC_TRINOMIAL: string[] = [
  "Trinomial with Leading Coefficient 1: A trinomial of the form x² + bx + c, in which the coefficient of the squared term is 1.",
  "Factoring x² + bx + c: Find the two numbers whose product is c and whose sum is b; the trinomial then factors into the two binomials built from those numbers.",
  "Sign Patterns in Factoring: When c is positive, the two numbers have the same sign as each other — the sign of b; when c is negative, the two numbers have opposite signs.",
  "Prime Trinomial: A trinomial that cannot be factored using integer coefficients; if no pair of factors of c has sum b, the trinomial is prime.",
];

const FACTOR_NONMONIC_TRINOMIAL: string[] = [
  "Trinomial with Leading Coefficient Not 1: A trinomial of the form ax² + bx + c in which a is not 1; its factors must account for the leading coefficient as well as the constant term.",
  "The ac Method: Multiply a by c, find two numbers whose product is ac and whose sum is b, rewrite the middle term using those two numbers, and then factor the four terms by grouping.",
  "Splitting the Middle Term: Rewriting bx as the sum of two terms built from the numbers found by the ac method, so that the polynomial can be factored by grouping.",
  "Perfect-Square Trinomial: A trinomial that is the square of a binomial: a² + 2ab + b² = (a + b)² or a² − 2ab + b² = (a − b)².",
];

const SPECIAL_FACTORING_CASES: string[] = [
  "Difference of Two Squares: The factoring pattern a² − b² = (a + b)(a − b).",
  "Perfect Square: A term that is the square of another term, such as 25, the square of 5, or x², the square of x; spotting the perfect squares is what reveals a difference of squares.",
  "Sum of Two Squares: An expression of the form a² + b²; unlike a difference of squares, a sum of two squares cannot be factored with real coefficients and is prime.",
  "Checking by Multiplying: Every factoring can be checked by multiplying the factors back together; the product must be exactly the original expression.",
];

const FACTORING_BY_GROUPING: string[] = [
  "Factoring by Grouping: A method for factoring a polynomial with four terms: group the terms into two pairs, factor the greatest common factor out of each pair, and then factor out the binomial that the two pairs share.",
  "Common Binomial Factor: The binomial that appears in both groups after each pair is factored; factoring it out completes the factoring.",
  "Rearranging Terms: The terms of a polynomial may be written in a different order before grouping, since addition can be done in any order; a different order sometimes reveals a common binomial factor.",
  "Completely Factored: A polynomial is factored completely when it is written as a product of factors that cannot be factored any further.",
];

const A1_RATIONAL_EXPRESSIONS: string[] = [
  "Rational Expression: An expression that is the quotient of two polynomials; the denominator polynomial cannot be 0.",
  "Excluded Value: A value of the variable that makes the denominator of a rational expression equal to 0; such values are never allowed, because division by 0 is undefined.",
  "Simplifying a Rational Expression: Factor the numerator and the denominator completely, then divide out the factors they have in common; only factors may be divided out, never terms that are added or subtracted.",
  "Restrictions: The excluded values of an expression are recorded from its original denominator, and they remain excluded even after the expression is simplified.",
];

/** Algebra 1 Topic 8 — quadratic functions & equations (shared by related ids). */
const A1_QUAD_CORE: string[] = [
  "Quadratic Function: A function that can be written f(x) = ax² + bx + c, where a is not 0.",
  "Parabola: The U-shaped graph of a quadratic function; the two sides of the graph are mirror images of each other across a vertical line through its turning point.",
];

const A1_QUAD_VERTEX_AXIS: string[] = [
  "Vertex: The point where a parabola changes direction — its lowest point when the parabola opens upward and its highest point when the parabola opens downward.",
  "Axis of Symmetry: The vertical line through the vertex that divides the parabola into two matching halves; points on the graph occur in pairs equally far from this line.",
];

const A1_QUAD_GRAPHS_PROPERTIES: string[] = [
  ...A1_QUAD_CORE,
  ...A1_QUAD_VERTEX_AXIS,
  "Opening Direction: A parabola opens upward when its leading coefficient a is positive and opens downward when a is negative.",
  "Y-Intercept of a Parabola: The point where the parabola crosses the y-axis; for a function in the form f(x) = ax² + bx + c, the y-intercept is the number c.",
];

const A1_QUAD_GRAPHING: string[] = [
  ...A1_QUAD_CORE,
  ...A1_QUAD_VERTEX_AXIS,
  "X-Intercepts of a Parabola: The points where the parabola crosses the x-axis; a parabola can cross at two points, touch at one point, or not cross at all.",
  "Graphing with a Table: Choose input values on both sides of the axis of symmetry, compute the outputs, and plot the points; inputs equally far from the axis give equal outputs, which checks the work.",
];

const A1_QUAD_TRANSFORMATIONS: string[] = [
  "Parent Quadratic Function: The function f(x) = x², the simplest quadratic function; its graph is the parabola with its vertex at the origin that opens upward.",
  "Vertical Shift of a Parabola: Adding a constant to the parent function moves the parabola up or down: the graph of f(x) = x² + k is the parent graph shifted by k units.",
  "Horizontal Shift of a Parabola: Replacing x with x − h moves the parabola sideways: the graph of f(x) = (x − h)² is the parent graph shifted by h units, to the right when h is positive.",
  "Width and Reflection: Multiplying the parent function by a coefficient a makes the parabola narrower when the absolute value of a is greater than 1 and wider when it is between 0 and 1; a negative a also flips the parabola to open downward.",
];

const A1_QUAD_VERTEX_FORM: string[] = [
  "Vertex Form: A quadratic function written f(x) = a(x − h)² + k; the vertex (h, k) can be read directly from the equation.",
  ...A1_QUAD_VERTEX_AXIS,
  "Reading the Vertex from Vertex Form: The x-coordinate of the vertex has the opposite sign from the number subtracted inside the parentheses: f(x) = (x − 3)² + 2 has vertex (3, 2), while f(x) = (x + 3)² + 2 has vertex (−3, 2).",
  "Converting to Vertex Form: A quadratic in standard form can be rewritten in vertex form by completing the square; the two forms name the same function and the same graph.",
];

const A1_QUAD_SOLVING: string[] = [
  "Quadratic Equation: An equation that can be written in the form ax² + bx + c = 0, where a is not 0.",
  "Standard Form of a Quadratic Equation: The form ax² + bx + c = 0, with every term on one side and 0 on the other; most methods for solving quadratic equations start from this form.",
  "Solution (Root): A value of x that makes an equation true; a quadratic equation has two, one, or no real solutions.",
  "Zero of a Function: An x-value for which f(x) = 0; the zeros of a quadratic function are the x-intercepts of its graph and the solutions of the equation f(x) = 0.",
];

const A1_QUAD_FACTORING_SOLVE: string[] = [
  "Zero Product Property: If the product of two quantities is 0, then at least one of the quantities is 0 — if ab = 0, then a = 0 or b = 0.",
  "Solving by Factoring: Rewrite the equation in standard form, factor the quadratic expression completely, set each factor equal to 0, and solve the resulting simple equations.",
  "Factored Form: A quadratic written as a product of factors, such as a(x − p)(x − q); the values p and q are zeros of the function.",
  "Factoring Out the GCF First: Before choosing any other factoring method, check whether every term shares a common factor; factoring it out first makes the remaining factoring simpler.",
];

const A1_QUAD_WRITING: string[] = [
  "Zero of a Function: An x-value for which f(x) = 0; the zeros of a quadratic function are the x-intercepts of its graph and the solutions of the equation f(x) = 0.",
  "Intercept Form: A quadratic function written a(x − p)(x − q); the numbers p and q are the zeros of the function and the x-intercepts of its graph.",
  "Writing a Quadratic from Its Zeros: Given zeros p and q, write the factors (x − p) and (x − q) and multiply them; with a equal to 1 this gives the function in standard form.",
  "Zeros and Factors: A number r is a zero of a function exactly when (x − r) is one of its factors, so naming the zeros of a quadratic gives the same information as naming its factors.",
];

const A1_QUAD_COMPLETING_SQUARE: string[] = [
  "Completing the Square: A method that rewrites a quadratic by building a perfect-square trinomial, used to solve quadratic equations and to convert a quadratic function to vertex form.",
  "Perfect-Square Trinomial: A trinomial of the form x² + bx + (b/2)², which factors as (x + b/2)².",
  "Completing Constant: To complete the square on x² + bx, add (b/2)² — the square of half the coefficient of x.",
  "Square Root Step: After completing the square, the equation has a squared expression on one side equal to a number; take the square root of both sides and keep both the positive and the negative root to get the solutions.",
];

/** Algebra 1 Topic 9 — exponential functions & models (shared by related ids). */
const A1_EXPONENTIAL_FUNCTIONS: string[] = [
  "Exponential Function: A function in which the variable is an exponent, such as f(x) = 2 times (3 to the x power); as x increases by equal steps, the outputs are multiplied by the same factor each time.",
  "Initial Value: The value of an exponential function when x = 0; it is the starting amount in the situation being modeled and the y-intercept of the graph.",
  "Horizontal Asymptote: A horizontal line that the graph of a function approaches as x increases or decreases without bound; the graph of an exponential function flattens toward its asymptote but never touches or crosses it.",
  "Domain and Range: The domain of an exponential function is all real numbers; for a function with a positive initial value, the range is all positive numbers, since the outputs never reach 0.",
];

const A1_GROWTH_DECAY: string[] = [
  "Exponential Growth: Change in which a quantity increases by the same percent in each time period, so the amount added in each period grows larger and larger.",
  "Growth Factor: The factor a quantity is multiplied by in each period of exponential growth; it is 1 plus the percent increase written as a decimal, so it is always greater than 1.",
  "Exponential Decay: Change in which a quantity decreases by the same percent in each time period, so the amount removed in each period grows smaller and smaller.",
  "Decay Factor: The factor a quantity is multiplied by in each period of exponential decay; it is 1 minus the percent decrease written as a decimal, so it is always between 0 and 1.",
  "Rate of Growth or Decay: The percent by which a quantity changes in one period; a factor of 1.05 means growth of 5% per period, and a factor of 0.95 means decay of 5% per period.",
];

const A1_EXPONENTIAL_MODELING: string[] = [
  "Exponential Model: An exponential function written for a real situation, of the form y = a times (b to the t power), where a is the starting value and b is the factor by which the quantity is multiplied in each period.",
  "Initial Value: The value of an exponential function when x = 0; it is the starting amount in the situation being modeled and the y-intercept of the graph.",
  "Prediction: A value computed from a model for an input that was not measured; substituting a time into an exponential model predicts the amount at that time.",
  "Reading the Factor: The factor of an exponential model tells the percent change per period — a factor greater than 1 means the quantity grows by the part above 1 as a percent, and a factor less than 1 means it decays by the part below 1 as a percent.",
];

/**
 * Definitions are seeded for every lesson entry. Test, proof, and other
 * non-lesson entries have no key — renderers must omit the definitions
 * block gracefully for them.
 */
/** Middle school shared cores (grades 6–8). */
const MS_PERCENT_ONLY: string[] = [
  "Percent: A ratio that compares a number to 100; 25% means 25 out of 100.",
];

const MS_INTEGER_CORE: string[] = [
  "Integer: A whole number or its opposite; the integers include −3, −2, −1, 0, 1, 2, and 3, and continue in both directions.",
  "Positive Number: A number greater than 0, such as 5 or 2.5.",
  "Negative Number: A number less than 0, written with a minus sign, such as −4.",
  "Opposite: Two numbers that are the same distance from 0 on a number line but on different sides; 7 and −7 are opposites.",
  "Absolute Value: The distance of a number from 0 on a number line; the absolute value of −6 is 6, because −6 is 6 units from 0.",
];

const MS_RATIO_CORE: string[] = [
  "Ratio: A comparison of two quantities by division, written as a/b, a to b, or a:b; the ratio 3/5 can compare 3 red pens to 5 blue pens.",
  "Rate: A ratio that compares two quantities with different units, such as 150 miles in 3 hours.",
  "Unit Rate: A rate whose second quantity is 1 unit, such as 50 miles per 1 hour.",
];

const MS_CENTER_CORE: string[] = [
  "Mean: The average of a data set; add all the values and divide by how many values there are. The mean of 2, 4, and 9 is 5.",
  "Median: The middle value of a data set written in order; if there are two middle values, the median is halfway between them.",
  "Mode: The value or values that appear most often in a data set.",
  "Range: The spread of a data set, found by subtracting the least value from the greatest value.",
];

/** Middle school Grade 6 — numbers, expressions, proportionality, geometry, data, finance. */
const MS6_FRACTIONS: string[] = [
  "Fraction: A number that names part of a whole or part of a group, written with a numerator over a denominator, like 3/4.",
  "Numerator: The top number of a fraction; it tells how many parts are counted. In 3/4, the numerator is 3.",
  "Denominator: The bottom number of a fraction; it tells how many equal parts the whole is divided into. In 3/4, the denominator is 4.",
  "Mixed Number: A number made of a whole number and a fraction, such as 2 1/3.",
  "Reciprocal: One of two numbers whose product is 1; to find the reciprocal of a fraction, flip it — the reciprocal of 3/5 is 5/3.",
  "Simplest Form: A fraction is in simplest form when the numerator and denominator share no common factor except 1; 2/4 in simplest form is 1/2.",
];

const MS6_DECIMALS: string[] = [
  "Decimal: A number that uses a decimal point to show parts of a whole, based on tenths, hundredths, and thousandths; 0.75 is a decimal.",
  "Place Value: The value of a digit based on its position in a number; in 4.26, the 2 is in the tenths place and stands for 2 tenths.",
  "Decimal Point: The dot in a decimal number that separates the whole-number part from the part less than 1.",
  "Estimate: A close guess of a value; rounding 4.87 to 5 before adding gives an estimate that checks whether an answer is reasonable.",
  "Aligning Decimal Points: When adding or subtracting decimals, line up the decimal points so that digits with the same place value are in the same column.",
];

const MS6_FDP_CONVERSIONS: string[] = [
  ...MS_PERCENT_ONLY,
  "Equivalent Forms: Different ways to write the same value; 1/2, 0.5, and 50% are equivalent forms.",
  "Convert: To change a number from one form to another form with the same value, such as changing 3/4 to 0.75 or to 75%.",
  "Terminating Decimal: A decimal that ends, such as 0.375.",
  "Repeating Decimal: A decimal in which a digit or block of digits repeats forever, such as 0.333... for 1/3.",
];

const MS6_VARIABLES_EXPRESSIONS: string[] = [
  "Variable: A letter or symbol that stands for a number that can change or is not yet known, such as x in the expression x + 5.",
  "Algebraic Expression: A math phrase that has numbers, variables, and operations but no equals sign, such as 3x + 2.",
  "Evaluate: To find the value of an expression by replacing each variable with a given number and then computing; evaluating 3x + 2 when x = 4 gives 14.",
  "Substitute: To replace a variable in an expression with a number.",
  "Coefficient: The number multiplied by a variable in a term; in 5x, the coefficient is 5.",
  "Term: A number, a variable, or a product of numbers and variables in an expression; the terms of 3x + 2 are 3x and 2.",
];

const MS6_EQUIVALENT_EXPRESSIONS: string[] = [
  "Equivalent Expressions: Expressions that have the same value for every value of the variable; 2(x + 3) and 2x + 6 are equivalent expressions.",
  "Like Terms: Terms that have the same variable raised to the same power, such as 4x and 7x; like terms can be combined into one term.",
  "Distributive Property: A property that lets you multiply a number by a sum by multiplying it by each part: a(b + c) = ab + ac, so 3(x + 4) = 3x + 12.",
  "Constant: A term with no variable, such as the 5 in 2x + 5; a constant never changes value.",
];

const MS6_EQUATIONS_INEQUALITIES: string[] = [
  ...EQUATION_CORE,
  "One-Step Equation: An equation that takes just one operation to solve, such as x + 7 = 15.",
  "Inequality: A mathematical sentence that compares two values using less than, greater than, less than or equal to, or greater than or equal to; unlike an equation, an inequality usually has many solutions.",
  "Graphing an Inequality: Showing the solutions of an inequality on a number line — use an open circle when the endpoint is not a solution, a closed circle when it is a solution, and shade toward the solutions.",
];

const MS6_TWO_VARIABLE: string[] = [
  "Independent Variable: The input variable in a relationship, usually x; its value is chosen first.",
  "Dependent Variable: The output variable in a relationship, usually y; its value depends on the input.",
  "Two-Variable Equation: An equation with two variables that shows a rule connecting them, such as y = 3x + 2.",
  "Ordered Pair: A pair of numbers (x, y) that gives one input and its output, or the position of a point on the coordinate plane.",
  "Coordinate Plane: A flat surface formed by a horizontal x-axis and a vertical y-axis that cross at the origin, the point (0, 0).",
];

const MS6_RATIOS_RATES: string[] = [
  ...MS_RATIO_CORE,
  "Equivalent Ratios: Ratios that have the same value, such as 2/3 and 4/6.",
];

const MS6_RATIO_REASONING: string[] = [
  ...MS_PERCENT_ONLY,
  "Scaling: Multiplying or dividing both quantities of a ratio by the same number to make an equivalent ratio; scaling 2/3 by 4 gives 8/12.",
  "Percent of a Number: A part of a quantity, found by multiplying the quantity by a percent; 20% of 50 is 10.",
  "Tape Diagram: A rectangular bar model that shows the parts of a ratio; each equal box stands for the same amount.",
  "Double Number Line: Two number lines lined up together that show two quantities in a ratio and make equivalent ratios easy to see.",
];

const MS6_AREA_POLYGONS: string[] = [
  "Area: The number of square units needed to cover a surface, measured in square units such as square centimeters.",
  "Parallelogram: A four-sided figure with both pairs of opposite sides parallel; its area is A = bh, base times height.",
  "Height of a Parallelogram or Triangle: The perpendicular distance from the base to the opposite side or vertex; the height is not the length of a slanted side.",
  "Area of a Triangle: A = bh/2 — multiply the base by the height, then take one half; a triangle is half of a parallelogram with the same base and height.",
  "Trapezoid: A four-sided figure with exactly one pair of parallel sides, called the bases; its area is the height times the average of the two bases.",
];

const MS6_VOLUME_SURFACE: string[] = [
  "Volume: The number of cubic units needed to fill a solid figure, measured in cubic units such as cubic inches.",
  "Rectangular Prism: A solid figure whose faces are all rectangles, like a cereal box; its volume is V = lwh, length times width times height.",
  "Surface Area: The total area of all the faces of a solid figure — the amount of material it would take to cover the figure completely.",
  "Net: A flat pattern that folds up into a solid figure; the surface area of a prism is the area of its net.",
  "Face: A flat surface of a solid figure; a rectangular prism has six faces.",
];

const MS6_TRIANGLE_PROPERTIES: string[] = [
  "Triangle: A polygon with three sides and three angles.",
  "Angle Sum of a Triangle: The three interior angles of any triangle always add to 180°.",
  "Isosceles Triangle: A triangle with at least two sides of equal length; the angles opposite the equal sides are also equal.",
  "Equilateral Triangle: A triangle with all three sides equal and all three angles equal; each angle measures 60°.",
  "Interior Angle: An angle inside a polygon, formed by two sides that meet at a vertex.",
];

const MS6_DATA_DISPLAYS: string[] = [
  "Data: Information collected by counting, measuring, or asking questions.",
  "Frequency: The number of times a particular value or category appears in a data set.",
  "Frequency Table: A table that shows how many times each value or category appears in a data set.",
  "Bar Graph: A display that uses bars of different heights or lengths to show data in categories; taller bars mean greater frequency.",
  "Category: A group into which data is sorted, such as a favorite color or a type of pet.",
];

const MS6_CENTER_VARIATION: string[] = [
  ...MS_CENTER_CORE,
  "Measure of Center: A value — the mean, median, or mode — that describes the center of a data set with a single number.",
  "Measure of Variation: A value, such as the range, that describes how spread out the values of a data set are.",
];

const MS6_BANKING_CREDIT: string[] = [
  "Checking Account: A bank account used for everyday spending; money put in is a deposit, and money taken out is a withdrawal.",
  "Check Register: A record used to track every deposit and withdrawal so you always know your account balance.",
  "Balance: The amount of money in an account at a given time; a new balance is found by adding deposits to and subtracting withdrawals from the old balance.",
  "Credit Card: A card that lets you borrow money from a bank to make purchases; the borrowed money must be paid back.",
  "Interest: The cost of borrowing money, charged as a percent of the amount borrowed; a credit-card balance that is not paid in full grows by interest.",
];

const MS6_COLLEGE_SALARIES: string[] = [
  "Salary: The money a worker is paid for a job, often stated as an amount per hour or per year.",
  "Hourly Wage: The amount of pay earned for one hour of work.",
  "Annual Salary: The total amount of pay earned in one year; multiply an hourly wage by the hours worked per week and by 52 weeks to estimate it.",
  "Tuition: The price a college charges for classes; college costs also include books, fees, and housing.",
  "Total Cost of College: The sum of all college expenses — tuition, fees, books, supplies, and living costs — for the time a student attends.",
];

/** Middle school Grade 7 — rational numbers, equations, geometry, proportionality, data, finance. */
const MS_ANGLE_TYPES: string[] = [
  "Angle: A figure formed by two rays that share a common endpoint called the vertex.",
  "Degree: The unit used to measure angles; a full turn measures 360°.",
  "Acute Angle: An angle that measures greater than 0° and less than 90°.",
  "Right Angle: An angle that measures exactly 90°.",
  "Obtuse Angle: An angle that measures greater than 90° and less than 180°.",
  "Straight Angle: An angle that measures exactly 180° and looks like a straight line.",
];

const MS_CIRCLE_PARTS: string[] = [
  "Circle: The set of all points in a plane that are the same distance from a given point called the center.",
  "Center: The point in the middle of a circle, from which all points on the circle are the same distance.",
  "Radius: A segment from the center of a circle to any point on the circle; also the length of that segment, written r.",
  "Diameter: A segment that passes through the center with both endpoints on the circle; the diameter is twice the radius, d = 2r.",
  "Chord: A segment with both endpoints on a circle; the diameter is the longest chord.",
];

const MS_PROBABILITY_CORE: string[] = [
  "Probability: A number from 0 to 1 that measures how likely an event is; 0 means impossible and 1 means certain.",
  "Theoretical Probability: The probability found by reasoning about equally likely outcomes: P(event) = (number of favorable outcomes)/(total number of outcomes).",
  "Experimental Probability: A probability found from past results of an experiment: (number of times the event happened)/(number of trials).",
  "Outcome: One possible result of an action or experiment, such as rolling a 4 on a number cube.",
  "Event: One outcome or a set of outcomes of an experiment, such as rolling an even number.",
];

const MS7_RATIONAL_ABS: string[] = [
  "Rational Number: A number that can be written as a fraction a/b where a and b are integers and b is not 0; 3/4, −2, and 0.5 are rational numbers.",
  ...MS_INTEGER_CORE,
];

const MS7_ADD_SUB_RATIONAL: string[] = [
  "Sum: The result of adding two or more numbers.",
  "Difference: The result of subtracting one number from another.",
  "Addends with the Same Sign: When adding two numbers with the same sign, add their absolute values and keep the sign; −3 + (−4) = −7.",
  "Addends with Different Signs: When adding two numbers with different signs, subtract the lesser absolute value from the greater one and keep the sign of the number with the greater absolute value; −8 + 3 = −5.",
  "Additive Inverse: The opposite of a number; a number and its additive inverse add to 0, so subtracting a number is the same as adding its additive inverse: 5 − (−2) = 5 + 2.",
];

const MS7_MULT_DIV_RATIONAL: string[] = [
  "Product: The result of multiplying two or more numbers.",
  "Quotient: The result of dividing one number by another.",
  "Sign Rules for Multiplication and Division: The product or quotient of two numbers with the same sign is positive, and the product or quotient of two numbers with different signs is negative.",
  "Order of Operations: The set order for computing an expression — parentheses first, then exponents, then multiply and divide from left to right, then add and subtract from left to right.",
  "Multiplicative Inverse: The reciprocal of a number; dividing by a fraction is the same as multiplying by its reciprocal.",
];

const MS7_SIMPLE_EQUATIONS: string[] = [
  ...EQUATION_CORE,
  "One-Step Equation: An equation that takes just one operation to solve, such as x − 2.5 = 7.",
  "Isolate the Variable: To get the variable alone on one side of an equation by using inverse operations.",
];

const MS7_TWO_STEP_EQUATIONS: string[] = [
  ...EQUATION_CORE,
  "Two-Step Equation: An equation that takes two operations to solve, such as 3x + 4 = 19; undo the addition or subtraction first, then undo the multiplication or division.",
  "Isolate the Variable: To get the variable alone on one side of an equation by using inverse operations.",
];

const MS7_INEQUALITIES: string[] = [
  ...INEQUALITY_CORE,
  "Reversing the Inequality: When you multiply or divide both sides of an inequality by a negative number, you must reverse the direction of the inequality symbol.",
  "Number Line Graph: A picture of a solution set — an open circle shows the endpoint is not included, and a closed circle shows it is included.",
];

const MS7_PROBLEM_SITUATIONS: string[] = [
  "Verbal Description: A real-world situation told in words that must be translated into mathematics before it can be solved.",
  "Translating Words to Algebra: Turning phrases into symbols — 'five more than a number' becomes n + 5, and 'three times a number' becomes 3n.",
  "Unknown Quantity: The amount you are trying to find in a problem, usually represented by a variable.",
  "Equation from a Situation: An equation that models a word problem, written so that the two sides show two ways to express the same total.",
];

const MS7_ANGLE_PAIRS: string[] = [
  "Adjacent Angles: Two angles that share a vertex and a side but do not overlap.",
  "Complementary Angles: Two angles whose measures add to 90°.",
  "Supplementary Angles: Two angles whose measures add to 180°.",
  "Vertical Angles: The opposite angles formed when two lines cross; vertical angles have equal measures.",
  "Linear Pair: Two adjacent angles that form a straight line; the angles in a linear pair are supplementary.",
];

const MS7_TRIANGLE_ANGLE_SUM: string[] = [
  "Interior Angles of a Triangle: The three angles inside a triangle, one at each vertex.",
  "Triangle Angle Sum: The interior angles of any triangle always add to 180°, so a missing angle is found by subtracting the two known angles from 180°.",
  "Exterior Angle of a Triangle: An angle formed by extending one side of a triangle; its measure equals the sum of the two non-adjacent interior angles.",
  "Vertex of a Triangle: A corner point where two sides of the triangle meet.",
  "Right Triangle: A triangle with one right angle; its other two angles are complementary and add to 90°.",
];

const MS7_CIRCLE_MEASUREMENT: string[] = [
  "Radius: A segment from the center of a circle to any point on the circle, written r.",
  "Diameter: A segment through the center with both endpoints on the circle; the diameter is twice the radius, d = 2r.",
  "Pi: The ratio of the circumference of any circle to its diameter, about 3.14; pi is written with the symbol π.",
  "Circumference: The distance around a circle; C = 2πr using the radius, or C = πd using the diameter.",
  "Area of a Circle: A = πr² — multiply π by the radius squared.",
];

const MS7_SEMI_QUARTER: string[] = [
  "Semicircle: Exactly one half of a circle, cut off by a diameter.",
  "Area of a Semicircle: One half of the area of the full circle — find πr², then divide by 2.",
  "Quarter Circle: Exactly one fourth of a circle, cut off by two radii that meet at a right angle.",
  "Area of a Quarter Circle: One fourth of the area of the full circle — find πr², then divide by 4.",
];

const MS7_COMPOSITE: string[] = [
  "Composite Figure: A figure made of two or more simple shapes put together.",
  "Decompose: To break a figure into simple shapes whose areas you know how to find.",
  "Area by Addition: To find the area of a composite figure, split it into parts, find the area of each part, and add the areas.",
  "Area by Subtraction: To find the area of a figure with a piece missing, find the area of the whole shape and subtract the area of the missing piece.",
];

const MS7_NETS: string[] = [
  "Net: A flat pattern of polygons that folds up into a solid figure without overlaps.",
  "Surface Area: The total area of all the faces of a solid figure — the sum of the areas of the shapes in its net.",
  "Cube: A solid figure with six congruent square faces; if each edge has length s, the surface area is 6s².",
  "Face: A flat surface of a solid figure; each polygon in a net becomes one face of the solid.",
];

const MS7_PRISMS: string[] = [
  "Prism: A solid figure with two congruent faces, called bases, that lie in parallel planes, and whose other faces are rectangles.",
  "Triangular Prism: A prism whose two bases are triangles.",
  "Base of a Prism: One of the two congruent parallel faces; the shape of the base names the prism.",
  "Volume of a Prism: V = Bh — the area of the base times the height of the prism.",
  "Surface Area of a Prism: The sum of the areas of all its faces, often found by drawing the net and adding the area of each face.",
];

const MS7_PYRAMIDS: string[] = [
  "Pyramid: A solid figure with a polygon base whose other faces are triangles that meet at a single point called the apex.",
  "Square Pyramid: A pyramid whose base is a square.",
  "Volume of a Pyramid: V = Bh/3 — one third of the area of the base times the height; a pyramid holds exactly one third of a prism with the same base and height.",
  "Slant Height: The height of one triangular face of a pyramid, used when finding surface area.",
];

const MS7_RATIOS_RATES: string[] = [
  ...MS_RATIO_CORE,
  "Better Buy: The choice with the lower unit rate costs less for the same amount, so it is the better buy.",
  "Comparing Unit Rates: To compare prices, find the cost for 1 unit of each item; the item with the smaller unit price is the better value.",
];

const MS7_PROPORTIONAL: string[] = [
  "Proportional Relationship: A relationship between two quantities in which the ratio y/x is always the same; its graph is a straight line through the origin.",
  "Constant of Proportionality: The constant value k of the ratio y/x in a proportional relationship; the equation is y = kx.",
  "Origin: The point (0, 0) where the x-axis and y-axis cross; the graph of every proportional relationship passes through the origin.",
  "Non-Proportional Relationship: A relationship in which the ratio of the quantities changes from pair to pair, or whose graph does not pass through the origin.",
];

const MS7_LINEAR_RELATIONSHIPS: string[] = [
  "Linear Relationship: A relationship between two quantities whose graph is a straight line; it can be written as an equation in the form y = mx + b.",
  "Slope: The rate of change of a line, equal to rise over run — how much y changes when x increases by 1.",
  "Y-Intercept: The y-coordinate of the point where a line crosses the y-axis; it is the value b in y = mx + b and shows the starting value when x is 0.",
  "Table of Values: A table that pairs input values of x with their output values of y, computed from a rule.",
];

const MS7_PERCENTS: string[] = [
  ...MS_PERCENT_ONLY,
  "Percent of a Number: A part of a quantity, found by multiplying the quantity by the percent written as a decimal; 30% of 80 is 0.30 × 80 = 24.",
  "Discount: An amount subtracted from the original price of an item, often given as a percent of the price.",
  "Sale Price: The price paid after a discount is subtracted from the original price.",
];

const MS7_SAMPLING: string[] = [
  "Population: The whole group that a survey or study is about, such as all students in a school.",
  "Sample: A smaller part of a population that is actually surveyed and used to make predictions about the whole group.",
  "Random Sample: A sample in which every member of the population has an equal chance of being chosen, so the sample fairly represents the population.",
  "Inference: A prediction or conclusion about a population based on data from a sample; if 3 out of 10 sampled students ride the bus, you can predict that about 30% of all students ride the bus.",
];

const MS7_COMPARING_POPULATIONS: string[] = [
  ...MS_CENTER_CORE,
  "Comparing Centers: To compare two populations, compare their measures of center — the group with the greater mean or median tends to have the greater values.",
];

const MS7_COMPOUND_EVENTS: string[] = [
  "Probability: A number from 0 to 1 that measures how likely an event is; 0 means impossible and 1 means certain.",
  "Compound Event: An event made of two or more simple events, such as rolling a number cube and flipping a coin.",
  "Independent Events: Events in which the result of one event does not change the probability of the other, such as two separate coin flips.",
  "Probability of a Compound Event: For two independent events, multiply the probabilities: P(A and B) = P(A) × P(B).",
];

const MS7_ECONOMIC_THINKING: string[] = [
  "Sales Tax: A percent added to the price of an item by a government; the buyer pays the price plus the tax.",
  "Total Cost: The amount actually paid for an item — the price plus the sales tax.",
  "Budget: A plan that lists income and expenses so that spending stays within the money available.",
  "Income: Money received, such as pay from a job or an allowance.",
  "Expense: Money spent on goods, services, or bills.",
];

const MS7_PERCENTS_BEYOND: string[] = [
  ...MS_PERCENT_ONLY,
  "Percent Greater Than 100%: A percent over 100% stands for more than one whole; 150% of 40 is 60, which is more than 40.",
  "Percent Less Than 1%: A percent under 1% stands for a tiny part of a whole; 0.5% of 200 is 1.",
  "Percent as a Decimal: To write a percent as a decimal, divide by 100, moving the decimal point two places to the left: 250% = 2.5 and 0.4% = 0.004.",
];

const MS7_PERCENT_ERROR: string[] = [
  "Percent Error: A percent that measures how far a measured or estimated value is from the actual value: percent error = (amount of error)/(actual value) × 100%.",
  "Amount of Error: The difference between a measured value and the actual value, found by subtracting the smaller value from the larger so the result is never negative.",
  "Actual Value: The true or exact value that a measurement is compared against.",
  "Measured Value: The value found by measuring or estimating; percent error compares it to the actual value.",
];

const MS7_EXPANDING_FACTORING: string[] = [
  "Expand: To rewrite an expression by multiplying out the parentheses with the distributive property; expanding 4(x − 3) gives 4x − 12.",
  "Factor an Expression: To write an expression as a product of factors by taking out the greatest common factor — the reverse of expanding; 6x + 9 factors as 3(2x + 3).",
  "Greatest Common Factor: The greatest factor that two or more terms share; the GCF of 6x and 9 is 3.",
  "Distributive Property: A property that connects multiplication with addition: a(b + c) = ab + ac.",
];

const MS7_DISTRIBUTIVE_EQUATIONS: string[] = [
  ...EQUATION_CORE,
  "Distributive Property Equation: An equation with parentheses, such as 3(x + 2) = 21; distribute first to remove the parentheses, then solve the two-step equation that remains.",
  "Isolate the Variable: To get the variable alone on one side of an equation by using inverse operations.",
];

const MS7_MULTI_STEP_INEQUALITIES: string[] = [
  ...INEQUALITY_CORE,
  "Two-Step Inequality: An inequality that takes two operations to solve, such as 2x + 3 < 11.",
  "Reversing the Inequality: When you multiply or divide both sides of an inequality by a negative number, you must reverse the direction of the inequality symbol.",
  "Number Line Graph: The solutions of an inequality drawn on a number line, with an open or closed circle at the endpoint and shading in the direction of the solutions.",
];

/** Middle school Grade 8 — equations, functions, systems, geometry, number system, statistics. */
const MS8_LINEAR_EQUATIONS: string[] = [
  "Multi-Step Equation: An equation that takes several steps to solve, often needing the distributive property and combining like terms first.",
  "Variables on Both Sides: An equation with variable terms on both sides of the equals sign; move the variable terms to one side to solve.",
  "No Solution: An equation that is false for every value of the variable — the variables cancel and leave a false statement, such as 5 = 3.",
  "Infinitely Many Solutions: An equation that is true for every value of the variable — both sides simplify to the same expression, such as 2x + 4 = 2x + 4.",
  "Like Terms: Terms that have the same variable part, such as 3x and 5x; like terms can be combined into one term.",
];

const MS8_FUNCTIONS: string[] = [
  ...FUNCTION_CORE,
  "Linear Function: A function whose graph is a straight line and whose equation can be written y = mx + b.",
  "Nonlinear Function: A function whose graph is not a straight line, such as a curve or a V shape.",
  "Rate of Change: A ratio that compares how much one quantity changes to how much another quantity changes; a function with a constant rate of change is linear.",
];

const MS8_SYSTEMS: string[] = [
  "System of Equations: Two or more equations with the same variables, considered together.",
  "Solution of a System: An ordered pair (x, y) that makes every equation in the system true at the same time; on a graph, it is the point where the graphs cross.",
  "Intersection Point: The point where two graphs cross; for a system of equations, this point is the solution of the system.",
  "Inconsistent System: A system with no solution — its graphs are parallel lines that never meet.",
  "Infinitely Many Solutions in a System: When two equations graph as the same line, every point on the line is a solution of the system.",
];

const MS8_PYTHAGOREAN: string[] = [
  "Pythagorean Theorem: In a right triangle, the squares of the lengths of the legs add to the square of the length of the hypotenuse: a² + b² = c².",
  "Legs of a Right Triangle: The two sides of a right triangle that form the right angle.",
  "Hypotenuse: The side of a right triangle opposite the right angle; it is always the longest side of the triangle.",
  "Right Triangle: A triangle with one angle that measures 90°.",
  "Distance Between Two Points: The length of the segment joining two points on the coordinate plane; use the Pythagorean Theorem with the horizontal and vertical changes between the points as the legs.",
];

const MS8_TRANSFORMATIONS: string[] = [
  "Transformation: A change in the position, shape, or size of a figure on the coordinate plane.",
  "Translation: A slide — every point of a figure moves the same distance in the same direction; a translation that moves a point right 3 and up 2 sends (x, y) to (x + 3, y + 2).",
  "Reflection: A flip of a figure over a line, such as the x-axis or the y-axis; each point and its image are the same distance from the line of reflection.",
  "Rotation: A turn of a figure around a fixed point, usually the origin, by a given angle such as 90°.",
  "Congruent Figures: Figures that have the same size and shape; translations, reflections, and rotations produce figures congruent to the original.",
  "Image and Preimage: The original figure in a transformation is the preimage; the figure that results is the image, and its points are labeled with prime marks.",
];

const MS8_SCIENTIFIC_NOTATION: string[] = [
  "Scientific Notation: A way of writing a very large or very small number as a decimal from 1 up to, but not including, 10 times a power of 10; 450 in scientific notation is 4.5 × 10², and 0.045 is 4.5 × 10⁻².",
  "Power of 10: A number such as 10, 100, or 1000 written with 10 and an exponent; positive exponents give numbers greater than 1, and negative exponents give numbers less than 1.",
  "Exponent: The small raised number that tells how many times the base is used as a factor; in 10², the exponent is 2.",
  "Standard Form: The usual way of writing a number, such as 450 instead of 4.5 × 10².",
];

const MS8_VOLUME: string[] = [
  "Cylinder: A solid with two congruent circular bases connected by a curved surface, like a can.",
  "Volume of a Cylinder: V = πr²h — the area of the circular base times the height.",
  "Cone: A solid with a circular base that tapers to a single point called the apex.",
  "Volume of a Cone: V = πr²h/3 — one third of the volume of a cylinder with the same base and height.",
  "Sphere: A solid in which every point on the surface is the same distance from the center, like a ball.",
  "Volume of a Sphere: V = (4/3) × π × r × r × r — four thirds of π times the radius multiplied by itself three times.",
];

const MS8_SCATTER: string[] = [
  "Scatter Plot: A graph that displays two-variable data as ordered pairs (x, y) to show how the variables are related.",
  "Association: The pattern of a relationship shown in a scatter plot, described as positive, negative, or none.",
  "Positive Association: As x increases, y tends to increase, so the points trend upward.",
  "Negative Association: As x increases, y tends to decrease, so the points trend downward.",
  "Line of Best Fit: A straight line drawn to fit the points of a scatter plot as closely as possible; it can be used to make predictions.",
  "Outlier: A data point that lies far away from the other points in a data set.",
];

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
  // Geometry chapters — the seeded lesson of each chapter
  "ch1-1-points-lines": GEO_POINTS_LINES,
  "ch2-1-inductive-reasoning": GEO_INDUCTIVE_REASONING,
  "ch5-1-midsegments": GEO_MIDSEGMENTS,
  "ch6-1-polygons": GEO_POLYGON_ANGLES,
  "ch8-1-translations": GEO_TRANSLATIONS,
  "ch12-1-tangent-lines": GEO_TANGENT_LINES,
  "ch13-1-area-polygons": GEO_AREA_POLYGONS,
  "ch14-2-surface-area": GEO_SURFACE_AREA,
  "ch15-1-experimental-theoretical": GEO_PROBABILITY_BASICS,
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
  // Algebra 1 Topic 1 — remaining equations lessons
  "a1-1-3-literal-equations": LITERAL_EQUATIONS,
  "a1-1-7-absolute-value": A1_ABSOLUTE_VALUE,
  // Algebra 1 Topics 2/3 — remaining linear lessons
  "a1-23-4-point-slope": POINT_SLOPE_FORM,
  "a1-23-5-standard-form": LINEAR_STANDARD_FORM,
  "a1-23-6-graphing-function-rule": GRAPHING_FUNCTION_RULE,
  "a1-23-7-writing-function-rule": WRITING_FUNCTION_RULE,
  "a1-23-11-transform-linear": LINEAR_TRANSFORMATIONS,
  // Algebra 1 Topic 4 — systems
  "a1-4-1-systems-graphing": A1_SYSTEMS_GRAPHING,
  "a1-4-2-substitution": A1_SYSTEMS_SUBSTITUTION,
  "a1-4-3-elimination": A1_SYSTEMS_ELIMINATION,
  "a1-4-4-applications": A1_SYSTEMS_APPLICATIONS,
  "a1-4-5-linear-inequalities": A1_LINEAR_INEQUALITIES,
  "a1-4-6-systems-inequalities": SYSTEMS_INEQUALITIES,
  // Algebra 1 Topic 5 — exponents & radicals
  "a1-5-1-zero-negative-exponents": ZERO_NEGATIVE_EXPONENTS,
  "a1-5-2-multiplying-powers": MULTIPLYING_POWERS,
  "a1-5-3-power-of-power": POWER_OF_POWER,
  "a1-5-4-division-properties": DIVISION_PROPERTIES_EXP,
  "a1-5-5-rational-exponents": A1_RATIONAL_EXPONENTS,
  "a1-5-6-simplifying-radicals": SIMPLIFYING_RADICALS,
  // Algebra 1 Topic 6 — sequences
  "a1-6-1-explicit-sequences": EXPLICIT_SEQUENCES,
  "a1-6-2-recursive-arithmetic": RECURSIVE_ARITHMETIC,
  "a1-6-3-recursive-geometric": RECURSIVE_GEOMETRIC,
  // Algebra 1 Topic 7 — polynomials & factoring
  "a1-7-1-add-subtract-poly": A1_ADD_SUB_POLYNOMIALS,
  "a1-7-2-multiply-factor": A1_MULTIPLY_AND_FACTOR,
  "a1-7-3-multiplying-binomials": MULTIPLYING_BINOMIALS,
  "a1-7-4-factor-x2bxc": FACTOR_MONIC_TRINOMIAL,
  "a1-7-5-factor-ax2bxc": FACTOR_NONMONIC_TRINOMIAL,
  "a1-7-6-special-cases": SPECIAL_FACTORING_CASES,
  "a1-7-7-grouping": FACTORING_BY_GROUPING,
  "a1-7-8-rational-expressions": A1_RATIONAL_EXPRESSIONS,
  // Algebra 1 Topic 8 — quadratics
  "a1-8-1-graphs-properties": A1_QUAD_GRAPHS_PROPERTIES,
  "a1-8-2-quadratic-functions": A1_QUAD_GRAPHING,
  "a1-8-3-transformations": A1_QUAD_TRANSFORMATIONS,
  "a1-8-4-vertex-form": A1_QUAD_VERTEX_FORM,
  "a1-8-5-solving": A1_QUAD_SOLVING,
  "a1-8-6-factoring-solve": A1_QUAD_FACTORING_SOLVE,
  "a1-8-7-writing": A1_QUAD_WRITING,
  "a1-8-8-completing-square": A1_QUAD_COMPLETING_SQUARE,
  "a1-8-9-formula-discriminant": QUAD_FORMULA,
  // Algebra 1 Topic 9 — exponential functions
  "a1-9-1-exponential-functions": A1_EXPONENTIAL_FUNCTIONS,
  "a1-9-2-growth-decay": A1_GROWTH_DECAY,
  "a1-9-3-modeling": A1_EXPONENTIAL_MODELING,
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
  // Algebra 2 Topic 2 — absolute value
  "a2-2-1-relations-functions": RELATIONS_FUNCTIONS,
  "a2-2-2-attributes-functions": FUNCTION_ATTRIBUTES,
  "a2-2-3-abs-transformations": ABS_TRANSFORMATIONS,
  "a2-2-4-abs-inequalities-graph": ABS_INEQ_GRAPH,
  "a2-2-5-abs-equations": ABS_EQUATIONS,
  "a2-2-6-abs-inequalities": ABS_INEQUALITIES,
  // Algebra 2 Topic 3 — systems
  "a2-3-1-systems-graphs": SYSTEMS_GRAPHS,
  "a2-3-2-systems-algebraic": SYSTEMS_ALGEBRAIC,
  "a2-3-3-systems-inequalities": SYSTEMS_INEQUALITIES,
  "a2-3-4-three-variables": THREE_VARIABLES,
  "a2-3-5-matrices-systems": SYSTEMS_MATRICES_INTRO,
  // Algebra 2 Topic 4 — matrices
  "a2-4-1-matrix-add-subtract": MATRIX_OPERATIONS,
  "a2-4-2-matrix-multiply": MATRIX_MULTIPLY,
  "a2-4-3-det-inverse": DET_INVERSE,
  "a2-4-4-systems-matrices": SYSTEMS_MATRICES,
  // Algebra 2 Topic 6 — square root functions
  "a2-6-1-function-operations": FUNCTION_OPERATIONS,
  "a2-6-2-inverse-functions": INVERSE_FUNCTIONS,
  "a2-6-3-sqrt-transformations": SQRT_TRANSFORMATIONS,
  "a2-6-4-sqrt-as-inverses": SQRT_AS_INVERSES,
  "a2-6-5-sqrt-equations-intro": RADICAL_EQUATIONS_INTRO,
  "a2-6-6-sqrt-equations-solving": RADICAL_EQUATIONS_SOLVING,
  // Algebra 2 Topic 7 — exponential & logarithmic functions
  "a2-7-1-exp-attributes": EXP_ATTRIBUTES,
  "a2-7-2-e-to-x": E_FUNCTION,
  "a2-7-3-recursive-models": RECURSIVE_MODELS,
  "a2-7-4-log-attributes": LOG_ATTRIBUTES,
  "a2-7-5-natural-log": NATURAL_LOG,
  "a2-7-6-log-properties": LOG_PROPERTIES,
  "a2-7-7-exp-log-equations": EXP_LOG_EQUATIONS,
  // Algebra 2 Topic 8 — polynomials
  "a2-8-1-poly-attributes": POLY_ATTRIBUTES,
  "a2-8-2-linear-factors-zeros": LINEAR_FACTORS_ZEROS,
  "a2-8-3-poly-add-sub-mul": POLY_OPERATIONS,
  "a2-8-4-poly-solve": POLY_SOLVE,
  "a2-8-5-poly-divide": POLY_DIVIDE,
  "a2-8-6-root-theorems": ROOT_THEOREMS,
  "a2-8-7-fta": FTA,
  // Algebra 2 Topic 9 — radical expressions
  "a2-9-1-roots-radicals": ROOTS_RADICALS,
  "a2-9-2-radical-mult-div": RADICAL_MULT_DIV,
  "a2-9-3-binomial-radicals": BINOMIAL_RADICALS,
  "a2-9-4-rational-exponents": RATIONAL_EXPONENTS,
  // Algebra 2 Topic 10 — cubic & cube root functions
  "a2-10-1-cubic-transformations": CUBIC_TRANSFORMATIONS,
  "a2-10-2-cuberoot-transformations": CUBEROOT_TRANSFORMATIONS,
  "a2-10-3-cuberoot-equations": CUBEROOT_EQUATIONS,
  // Algebra 2 Topic 11 — rational functions & equations
  "a2-11-1-simplify": RATIONAL_SIMPLIFY,
  "a2-11-2-mult-div": RATIONAL_MULT_DIV,
  "a2-11-3-asymptotes-holes": ASYMPTOTES_HOLES,
  "a2-11-4-solve-rational": RATIONAL_EQUATIONS,
  "a2-11-5-add-subtract": RATIONAL_ADD_SUB,
  // Algebra 2 Topic 12 — data & regression
  "a2-12-1-analyzing-data": ANALYZING_DATA,
  "a2-12-2-regression": REGRESSION,
  "a2-12-3-using-models": USING_MODELS,
  // Algebra 2 supplementary
  "a2x-sequences": SEQUENCES,
  "a2x-circle-equations": CIRCLE_EQUATIONS,
  "a2x-circle-line-systems": CIRCLE_LINE_SYSTEMS,
  // Middle School Grade 6
  "ms6-1-1-multiplying-dividing-fractions": MS6_FRACTIONS,
  "ms6-1-2-decimal-fluency": MS6_DECIMALS,
  "ms6-1-3-fdp-conversions": MS6_FDP_CONVERSIONS,
  "ms6-2-1-integer-operations": MS_INTEGER_CORE,
  "ms6-3-1-variables-expressions": MS6_VARIABLES_EXPRESSIONS,
  "ms6-3-2-equivalent-expressions": MS6_EQUIVALENT_EXPRESSIONS,
  "ms6-3-3-equations-inequalities": MS6_EQUATIONS_INEQUALITIES,
  "ms6-3-4-two-variable-relationships": MS6_TWO_VARIABLE,
  "ms6-4-1-ratios-rates": MS6_RATIOS_RATES,
  "ms6-4-2-ratio-reasoning": MS6_RATIO_REASONING,
  "ms6-5-1-area-polygons": MS6_AREA_POLYGONS,
  "ms6-5-2-volume-surface-area": MS6_VOLUME_SURFACE,
  "ms6-5-3-triangle-properties": MS6_TRIANGLE_PROPERTIES,
  "ms6-6-1-data-displays": MS6_DATA_DISPLAYS,
  "ms6-6-2-measures-center-variation": MS6_CENTER_VARIATION,
  "ms6-7-1-banking-credit": MS6_BANKING_CREDIT,
  "ms6-7-2-college-salaries": MS6_COLLEGE_SALARIES,
  // Middle School Grade 7
  "ms7-1-1-rational-absolute-value": MS7_RATIONAL_ABS,
  "ms7-1-2-add-subtract-rational": MS7_ADD_SUB_RATIONAL,
  "ms7-1-3-multiply-divide-rational": MS7_MULT_DIV_RATIONAL,
  "ms7-2-1-solving-simple-equations": MS7_SIMPLE_EQUATIONS,
  "ms7-2-2-two-step-equations": MS7_TWO_STEP_EQUATIONS,
  "ms7-2-3-solving-inequalities": MS7_INEQUALITIES,
  "ms7-2-4-writing-problem-situations": MS7_PROBLEM_SITUATIONS,
  "ms7-3-1-measuring-angles": MS_ANGLE_TYPES,
  "ms7-3-2-angle-pairs": MS7_ANGLE_PAIRS,
  "ms7-3-3-triangle-angle-sum": MS7_TRIANGLE_ANGLE_SUM,
  "ms7-3-4-circle-parts": MS_CIRCLE_PARTS,
  "ms7-3-5-circumference-area-circles": MS7_CIRCLE_MEASUREMENT,
  "ms7-3-6-semicircles-quarter-circles": MS7_SEMI_QUARTER,
  "ms7-3-7-composite-figures": MS7_COMPOSITE,
  "ms7-3-8-nets": MS7_NETS,
  "ms7-3-9-prisms-sa-volume": MS7_PRISMS,
  "ms7-3-10-pyramids-sa-volume": MS7_PYRAMIDS,
  "ms7-4-1-ratios-rates": MS7_RATIOS_RATES,
  "ms7-4-2-proportional-relationships": MS7_PROPORTIONAL,
  "ms7-4-3-representing-linear-relationships": MS7_LINEAR_RELATIONSHIPS,
  "ms7-4-4-percents": MS7_PERCENTS,
  "ms7-5-1-sampling": MS7_SAMPLING,
  "ms7-5-2-comparing-populations": MS7_COMPARING_POPULATIONS,
  "ms7-5-3-probability-concepts": MS_PROBABILITY_CORE,
  "ms7-5-4-compound-events": MS7_COMPOUND_EVENTS,
  "ms7-6-1-economic-thinking": MS7_ECONOMIC_THINKING,
  "ms7-7-1-percents-beyond-100": MS7_PERCENTS_BEYOND,
  "ms7-7-2-percent-error": MS7_PERCENT_ERROR,
  "ms7-7-3-expanding-factoring": MS7_EXPANDING_FACTORING,
  "ms7-7-4-distributive-equations": MS7_DISTRIBUTIVE_EQUATIONS,
  "ms7-7-5-multi-step-inequalities": MS7_MULTI_STEP_INEQUALITIES,
  // Middle School Grade 8
  "ms8-1-linear-equations": MS8_LINEAR_EQUATIONS,
  "ms8-2-functions": MS8_FUNCTIONS,
  "ms8-3-systems": MS8_SYSTEMS,
  "ms8-4-pythagorean": MS8_PYTHAGOREAN,
  "ms8-5-transformations": MS8_TRANSFORMATIONS,
  "ms8-6-scientific-notation": MS8_SCIENTIFIC_NOTATION,
  "ms8-7-volume": MS8_VOLUME,
  "ms8-8-scatter-plots": MS8_SCATTER,
};

/**
 * Look up the definition set for a registry entry id.
 * Returns undefined when the entry has no seeded definitions — the renderer
 * then omits the DEFINITIONS block (no empty box, no crash).
 */
export function getClassicalDefinitions(entryId: string): string[] | undefined {
  return CLASSICAL_DEFINITIONS[entryId];
}
