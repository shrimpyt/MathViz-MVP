# Algebra 2 — REGISTRY SNIPPET

Exact `CurriculumEntry` blocks for `src/modules/CurriculumRegistry.ts`,
aligned to `CURRICULUM_SCOPE.md` ("Algebra II — Topics 2–12"). One entry per
lesson row; TEKS `A2.*` by topic; T11 titles use the standard rational-functions
sequencing (simplifying; multiplying/dividing; asymptotes & holes; solving).
T4 (matrices) and T12 (data/regression) have real generators.

**Replaced placeholder ids:** none — the registry currently contains only
geometry topics (1–15); these blocks are purely additive. Insert after the
Topic 15 section.

**Topic-number note:** entries use the doc's exact numbering (Topics 2–12),
which overlaps the geometry topic numbers already in the registry. The
coordinator should namespace these (e.g. a `subject: "algebra2"` field or
separate registry array) — see `WIRING.md`.

## Imports (add at the top of CurriculumRegistry.ts)

```ts
import {
  a2_4_1_addSubtract,
  a2_4_2_multiply,
  a2_4_3_detInverse,
  a2_4_4_systemsMatrices,
  a2_5_4_focusDirectrix,
  a2_5_6_quadEquations,
  a2_5_7_completingSquare,
  a2_5_8_quadFormula,
  a2_5_9_complexNumbers,
  a2_5_11_linQuadSystems,
  a2_7_6_logProperties,
  a2_7_7_expLogEquations,
  a2_8_2_linearFactorsZeros,
  a2_8_4_polySolve,
  a2_8_5_polyDivide,
  a2_8_6_rootTheorems,
  a2_11_1_simplify,
  a2_11_2_multDiv,
  a2_11_3_asymptotesHoles,
  a2_11_4_solveRational,
  a2_12_1_analyzingData,
  a2_12_2_regression,
  a2_12_3_usingModels,
  a2_p_trigIdentities,
  a2_p_logExpProofs,
  a2_p_polyIdentities,
  a2x_sequences,
  a2x_circleEquations,
  a2x_circleLineSystems,
} from "./algebra-2";
```

`MathProblem` is already imported in `CurriculumRegistry.ts`. Wired entries
cast through `as unknown as MathProblem[]` until the union gains the
Algebra 2 types (see `WIRING.md`). Under-construction entries reuse the
file-local `placeholderGenerator`.

## Group: Algebra 2

### Topic 2: Absolute Value (TEKS A2.2)

```ts
{
  id: "a2-2-1-relations-functions",
  topic: 2,
  topicTitle: "Topic 2: Absolute Value",
  title: "2-1: Relations & Functions",
  story: "Decide whether a relation is a function.",
  teks: "A2.2",
  description: "Domain, range, and the vertical line test.",
  underConstruction: true,
  generate: placeholderGenerator,
},
{
  id: "a2-2-2-attributes-functions",
  topic: 2,
  topicTitle: "Topic 2: Absolute Value",
  title: "2-2: Attributes of Functions",
  story: "Intercepts, intervals of increase/decrease, and extrema.",
  teks: "A2.2",
  description: "Read key attributes directly from graphs and tables.",
  underConstruction: true,
  generate: placeholderGenerator,
},
{
  id: "a2-2-3-abs-transformations",
  topic: 2,
  topicTitle: "Topic 2: Absolute Value",
  title: "2-3: Absolute Value Transformations",
  story: "Shift, stretch, and reflect the V-shape.",
  teks: "A2.2",
  description: "Attributes and transformations of absolute value functions.",
  underConstruction: true,
  generate: placeholderGenerator,
},
{
  id: "a2-2-4-abs-inequalities-graph",
  topic: 2,
  topicTitle: "Topic 2: Absolute Value",
  title: "2-4: Graphing Absolute Value Inequalities",
  story: "Shade the region that satisfies the inequality.",
  teks: "A2.2",
  description: "Graph absolute value inequalities in two variables.",
  underConstruction: true,
  generate: placeholderGenerator,
},
{
  id: "a2-2-5-abs-equations",
  topic: 2,
  topicTitle: "Topic 2: Absolute Value",
  title: "2-5: Absolute Value Equations",
  story: "Split into two cases and check for extraneous roots.",
  teks: "A2.2",
  description: "Solve absolute value equations algebraically.",
  underConstruction: true,
  generate: placeholderGenerator,
},
{
  id: "a2-2-6-abs-inequalities",
  topic: 2,
  topicTitle: "Topic 2: Absolute Value",
  title: "2-6: Absolute Value Inequalities",
  story: "And-bound versus or-bound solution sets.",
  teks: "A2.2",
  description: "Solve absolute value inequalities algebraically.",
  underConstruction: true,
  generate: placeholderGenerator,
},
```

### Topic 3: Systems (TEKS A2.3)

```ts
{
  id: "a2-3-1-systems-graphs",
  topic: 3,
  topicTitle: "Topic 3: Systems",
  title: "3-1: Systems from Tables & Graphs",
  story: "Read the solution where the graphs cross.",
  teks: "A2.3",
  description: "Solve systems by interpreting tables and graphs.",
  underConstruction: true,
  generate: placeholderGenerator,
},
{
  id: "a2-3-2-systems-algebraic",
  topic: 3,
  topicTitle: "Topic 3: Systems",
  title: "3-2: Algebraic Methods",
  story: "Substitution and elimination, step by step.",
  teks: "A2.3",
  description: "Solve linear systems by substitution and elimination.",
  underConstruction: true,
  generate: placeholderGenerator,
},
{
  id: "a2-3-3-systems-inequalities",
  topic: 3,
  topicTitle: "Topic 3: Systems",
  title: "3-3: Systems of Inequalities",
  story: "Overlap the half-planes to find the feasible region.",
  teks: "A2.3",
  description: "Graph systems of linear inequalities.",
  underConstruction: true,
  generate: placeholderGenerator,
},
{
  id: "a2-3-4-three-variables",
  topic: 3,
  topicTitle: "Topic 3: Systems",
  title: "3-4: Systems in Three Variables",
  story: "Eliminate one variable at a time.",
  teks: "A2.3",
  description: "Solve 3×3 linear systems algebraically.",
  underConstruction: true,
  generate: placeholderGenerator,
},
{
  id: "a2-3-5-matrices-systems",
  topic: 3,
  topicTitle: "Topic 3: Systems",
  title: "3-5: Matrices in Systems",
  story: "First look at matrices as an organizing tool.",
  teks: "A2.3",
  description: "Introduce matrices in the context of linear systems.",
  underConstruction: true,
  generate: placeholderGenerator,
},
```

### Topic 4: Matrices (TEKS A2.4)

```ts
{
  id: "a2-4-1-matrix-add-subtract",
  topic: 4,
  topicTitle: "Topic 4: Matrices",
  title: "4-1: Add & Subtract Matrices",
  story: "Combine matrices entry by entry.",
  teks: "A2.4",
  description: "Add and subtract matrices of matching dimensions.",
  generate: (m, s, o) => a2_4_1_addSubtract(m, s, o) as unknown as MathProblem[],
},
{
  id: "a2-4-2-matrix-multiply",
  topic: 4,
  topicTitle: "Topic 4: Matrices",
  title: "4-2: Matrix Multiplication",
  story: "Rows times columns — dimension discipline matters.",
  teks: "A2.4",
  description: "Multiply matrices with compatible inner dimensions.",
  generate: (m, s, o) => a2_4_2_multiply(m, s, o) as unknown as MathProblem[],
},
{
  id: "a2-4-3-det-inverse",
  topic: 4,
  topicTitle: "Topic 4: Matrices",
  title: "4-3: Determinants & Inverses",
  story: "The 2×2 determinant decides invertibility.",
  teks: "A2.4",
  description: "Compute 2×2 determinants and inverses (det ±1).",
  generate: (m, s, o) => a2_4_3_detInverse(m, s, o) as unknown as MathProblem[],
},
{
  id: "a2-4-4-systems-matrices",
  topic: 4,
  topicTitle: "Topic 4: Matrices",
  title: "4-4: Systems & Matrices",
  story: "Solve 2×2 systems with X = A⁻¹B.",
  teks: "A2.4",
  description: "Solve linear systems using inverse matrices.",
  generate: (m, s, o) => a2_4_4_systemsMatrices(m, s, o) as unknown as MathProblem[],
},
```

### Topic 5: Quadratics (TEKS A2.5)

```ts
{
  id: "a2-5-1-quad-attributes",
  topic: 5,
  topicTitle: "Topic 5: Quadratics",
  title: "5-1: Attributes & Transformations",
  story: "How a, h, k reshape the parabola.",
  teks: "A2.5",
  description: "Attributes and transformations of quadratic functions.",
  underConstruction: true,
  generate: placeholderGenerator,
},
{
  id: "a2-5-2-quad-standard",
  topic: 5,
  topicTitle: "Topic 5: Quadratics",
  title: "5-2: Standard Form",
  story: "Read direction, width, and the y-intercept from ax²+bx+c.",
  teks: "A2.5",
  description: "Work with quadratics in standard form.",
  underConstruction: true,
  generate: placeholderGenerator,
},
{
  id: "a2-5-3-quad-modeling",
  topic: 5,
  topicTitle: "Topic 5: Quadratics",
  title: "5-3: Modeling with Quadratics",
  story: "Fit a parabola to projectile and area situations.",
  teks: "A2.5",
  description: "Model real situations with quadratic functions.",
  underConstruction: true,
  generate: placeholderGenerator,
},
{
  id: "a2-5-4-focus-directrix",
  topic: 5,
  topicTitle: "Topic 5: Quadratics",
  title: "5-4: Focus & Directrix",
  story: "The geometric definition of a parabola.",
  teks: "A2.5",
  description: "Find the focus and directrix of a vertical parabola; read vertex and direction from vertex form.",
  generate: (m, s, o) => a2_5_4_focusDirectrix(m, s, o) as unknown as MathProblem[],
},
{
  id: "a2-5-5-quad-factoring",
  topic: 5,
  topicTitle: "Topic 5: Quadratics",
  title: "5-5: Factoring Quadratics",
  story: "Undo the multiplication to find the zeros.",
  teks: "A2.5",
  description: "Factor quadratics over the integers.",
  underConstruction: true,
  generate: placeholderGenerator,
},
{
  id: "a2-5-6-quad-equations",
  topic: 5,
  topicTitle: "Topic 5: Quadratics",
  title: "5-6: Solving Quadratic Equations",
  story: "Square roots and the quadratic formula in action.",
  teks: "A2.5",
  description: "Solve quadratics by square roots and the quadratic formula.",
  generate: (m, s, o) => a2_5_6_quadEquations(m, s, o) as unknown as MathProblem[],
},
{
  id: "a2-5-7-completing-square",
  topic: 5,
  topicTitle: "Topic 5: Quadratics",
  title: "5-7: Completing the Square",
  story: "Build the perfect-square trinomial to reveal the vertex.",
  teks: "A2.5",
  description: "Rewrite quadratics in vertex form by completing the square (including non-monic leading coefficients).",
  generate: (m, s, o) => a2_5_7_completingSquare(m, s, o) as unknown as MathProblem[],
},
{
  id: "a2-5-8-quad-formula",
  topic: 5,
  topicTitle: "Topic 5: Quadratics",
  title: "5-8: Quadratic Formula & Discriminant",
  story: "The discriminant predicts the solution story.",
  teks: "A2.5",
  description: "Apply the quadratic formula; use the discriminant to classify solutions.",
  generate: (m, s, o) => a2_5_8_quadFormula(m, s, o) as unknown as MathProblem[],
},
{
  id: "a2-5-9-complex-numbers",
  topic: 5,
  topicTitle: "Topic 5: Quadratics",
  title: "5-9: Complex Numbers",
  story: "When the discriminant goes negative, i saves the day.",
  teks: "A2.5",
  description: "Solve quadratics with complex (non-real) solutions in a±bi form.",
  generate: (m, s, o) => a2_5_9_complexNumbers(m, s, o) as unknown as MathProblem[],
},
{
  id: "a2-5-10-quad-inequalities",
  topic: 5,
  topicTitle: "Topic 5: Quadratics",
  title: "5-10: Quadratic Inequalities",
  story: "Sign charts turn parabolas into interval answers.",
  teks: "A2.5",
  description: "Solve quadratic inequalities algebraically and graphically.",
  underConstruction: true,
  generate: placeholderGenerator,
},
{
  id: "a2-5-11-lin-quad-systems",
  topic: 5,
  topicTitle: "Topic 5: Quadratics",
  title: "5-11: Linear-Quadratic Systems",
  story: "Where does the line meet the parabola?",
  teks: "A2.5",
  description: "Solve line–parabola systems by substitution (two intersections or tangent).",
  generate: (m, s, o) => a2_5_11_linQuadSystems(m, s, o) as unknown as MathProblem[],
},
```

### Topic 6: Square Root Functions (TEKS A2.6)

```ts
{
  id: "a2-6-1-function-operations",
  topic: 6,
  topicTitle: "Topic 6: Square Root Functions",
  title: "6-1: Function Operations & Composition",
  story: "Add, multiply, and chain functions together.",
  teks: "A2.6",
  description: "Operations on functions and composition (f∘g)(x).",
  underConstruction: true,
  generate: placeholderGenerator,
},
{
  id: "a2-6-2-inverse-functions",
  topic: 6,
  topicTitle: "Topic 6: Square Root Functions",
  title: "6-2: Inverse Functions",
  story: "Undo a function by swapping x and y.",
  teks: "A2.6",
  description: "Find and verify inverse functions.",
  underConstruction: true,
  generate: placeholderGenerator,
},
{
  id: "a2-6-3-sqrt-transformations",
  topic: 6,
  topicTitle: "Topic 6: Square Root Functions",
  title: "6-3: Attributes & Transformations",
  story: "The square root curve, shifted and stretched.",
  teks: "A2.6",
  description: "Attributes and transformations of square root functions.",
  underConstruction: true,
  generate: placeholderGenerator,
},
{
  id: "a2-6-4-sqrt-as-inverses",
  topic: 6,
  topicTitle: "Topic 6: Square Root Functions",
  title: "6-4: Square Roots as Inverses",
  story: "Square roots undo squaring — with a domain catch.",
  teks: "A2.6",
  description: "Connect square root functions to inverse quadratic relationships.",
  underConstruction: true,
  generate: placeholderGenerator,
},
{
  id: "a2-6-5-sqrt-equations-intro",
  topic: 6,
  topicTitle: "Topic 6: Square Root Functions",
  title: "6-5: Intro to Radical Equations",
  story: "Isolate the radical before you square.",
  teks: "A2.6",
  description: "First steps solving equations with radicals.",
  underConstruction: true,
  generate: placeholderGenerator,
},
{
  id: "a2-6-6-sqrt-equations-solving",
  topic: 6,
  topicTitle: "Topic 6: Square Root Functions",
  title: "6-6: Solving Radical Equations",
  story: "Square both sides — then check every candidate.",
  teks: "A2.6",
  description: "Solve radical equations and reject extraneous roots.",
  underConstruction: true,
  generate: placeholderGenerator,
},
```

### Topic 7: Exponential & Logarithmic Functions (TEKS A2.7)

```ts
{
  id: "a2-7-1-exp-attributes",
  topic: 7,
  topicTitle: "Topic 7: Exponential & Logarithmic Functions",
  title: "7-1: Exponentials: Attributes & Transformations",
  story: "Growth curves and their horizontal asymptote.",
  teks: "A2.7",
  description: "Attributes and transformations of exponential functions.",
  underConstruction: true,
  generate: placeholderGenerator,
},
{
  id: "a2-7-2-e-to-x",
  topic: 7,
  topicTitle: "Topic 7: Exponential & Logarithmic Functions",
  title: "7-2: The Number e and e^x",
  story: "Continuous growth has its own base.",
  teks: "A2.7",
  description: "Evaluate and graph functions with base e.",
  underConstruction: true,
  generate: placeholderGenerator,
},
{
  id: "a2-7-3-recursive-models",
  topic: 7,
  topicTitle: "Topic 7: Exponential & Logarithmic Functions",
  title: "7-3: Recursive Models",
  story: "Each term builds on the last.",
  teks: "A2.7",
  description: "Write and evaluate recursive exponential models.",
  underConstruction: true,
  generate: placeholderGenerator,
},
{
  id: "a2-7-4-log-attributes",
  topic: 7,
  topicTitle: "Topic 7: Exponential & Logarithmic Functions",
  title: "7-4: Logarithms: Attributes & Transformations",
  story: "The exponential curve, reflected.",
  teks: "A2.7",
  description: "Attributes and transformations of logarithmic functions.",
  underConstruction: true,
  generate: placeholderGenerator,
},
{
  id: "a2-7-5-natural-log",
  topic: 7,
  topicTitle: "Topic 7: Exponential & Logarithmic Functions",
  title: "7-5: Natural Logarithms",
  story: "Base e gets its own button: ln.",
  teks: "A2.7",
  description: "Evaluate and apply natural logarithms.",
  underConstruction: true,
  generate: placeholderGenerator,
},
{
  id: "a2-7-6-log-properties",
  topic: 7,
  topicTitle: "Topic 7: Exponential & Logarithmic Functions",
  title: "7-6: Properties of Logarithms",
  story: "Product, quotient, and power rules unlock every log.",
  teks: "A2.7",
  description: "Evaluate logs; expand and condense logarithmic expressions.",
  generate: (m, s, o) => a2_7_6_logProperties(m, s, o) as unknown as MathProblem[],
},
{
  id: "a2-7-7-exp-log-equations",
  topic: 7,
  topicTitle: "Topic 7: Exponential & Logarithmic Functions",
  title: "7-7: Exponential & Logarithmic Equations",
  story: "Same base, or take a log — and always check the domain.",
  teks: "A2.7",
  description: "Solve exponential equations (exact and approximate) and logarithmic equations with extraneous-root checks.",
  generate: (m, s, o) => a2_7_7_expLogEquations(m, s, o) as unknown as MathProblem[],
},
```

### Topic 8: Polynomials (TEKS A2.8)

```ts
{
  id: "a2-8-1-poly-attributes",
  topic: 8,
  topicTitle: "Topic 8: Polynomials",
  title: "8-1: Attributes of Polynomials",
  story: "End behavior and turning points from degree and leading coefficient.",
  teks: "A2.8",
  description: "Describe polynomial attributes from equations and graphs.",
  underConstruction: true,
  generate: placeholderGenerator,
},
{
  id: "a2-8-2-linear-factors-zeros",
  topic: 8,
  topicTitle: "Topic 8: Polynomials",
  title: "8-2: Linear Factors & Zeros",
  story: "Zeros become factors; factors reveal zeros.",
  teks: "A2.8",
  description: "Find rational zeros with the rational root theorem; factor by grouping and sum/difference of cubes.",
  generate: (m, s, o) => a2_8_2_linearFactorsZeros(m, s, o) as unknown as MathProblem[],
},
{
  id: "a2-8-3-poly-add-sub-mul",
  topic: 8,
  topicTitle: "Topic 8: Polynomials",
  title: "8-3: Add, Subtract & Multiply Polynomials",
  story: "Polynomial arithmetic, term by term.",
  teks: "A2.8",
  description: "Add, subtract, and multiply polynomials.",
  underConstruction: true,
  generate: placeholderGenerator,
},
{
  id: "a2-8-4-poly-solve",
  topic: 8,
  topicTitle: "Topic 8: Polynomials",
  title: "8-4: Solving Polynomial Equations",
  story: "Find every zero the rational root theorem allows.",
  teks: "A2.8",
  description: "Solve polynomial equations by finding all rational zeros.",
  generate: (m, s, o) => a2_8_4_polySolve(m, s, o) as unknown as MathProblem[],
},
{
  id: "a2-8-5-poly-divide",
  topic: 8,
  topicTitle: "Topic 8: Polynomials",
  title: "8-5: Dividing Polynomials",
  story: "Long division and synthetic division, side by side.",
  teks: "A2.8",
  description: "Divide polynomials by linear divisors with long and synthetic division (including remainders).",
  generate: (m, s, o) => a2_8_5_polyDivide(m, s, o) as unknown as MathProblem[],
},
{
  id: "a2-8-6-root-theorems",
  topic: 8,
  topicTitle: "Topic 8: Polynomials",
  title: "8-6: Root Theorems",
  story: "List every possible rational zero before testing.",
  teks: "A2.8",
  description: "Apply the rational root theorem: list ±p/q candidates, then find actual zeros.",
  generate: (m, s, o) => a2_8_6_rootTheorems(m, s, o) as unknown as MathProblem[],
},
{
  id: "a2-8-7-fta",
  topic: 8,
  topicTitle: "Topic 8: Polynomials",
  title: "8-7: Fundamental Theorem of Algebra",
  story: "A degree-n polynomial has exactly n complex zeros.",
  teks: "A2.8",
  description: "Use the Fundamental Theorem of Algebra to count zeros.",
  underConstruction: true,
  generate: placeholderGenerator,
},
```

### Topic 9: Radical Expressions (TEKS A2.9)

```ts
{
  id: "a2-9-1-roots-radicals",
  topic: 9,
  topicTitle: "Topic 9: Radical Expressions",
  title: "9-1: Roots & Radicals",
  story: "Simplify radicals to their cleanest form.",
  teks: "A2.9",
  description: "Simplify radical expressions.",
  underConstruction: true,
  generate: placeholderGenerator,
},
{
  id: "a2-9-2-radical-mult-div",
  topic: 9,
  topicTitle: "Topic 9: Radical Expressions",
  title: "9-2: Multiplying & Dividing Radicals",
  story: "Combine radicals, then rationalize.",
  teks: "A2.9",
  description: "Multiply and divide radical expressions.",
  underConstruction: true,
  generate: placeholderGenerator,
},
{
  id: "a2-9-3-binomial-radicals",
  topic: 9,
  topicTitle: "Topic 9: Radical Expressions",
  title: "9-3: Binomial Radicals",
  story: "Conjugates clear the denominator.",
  teks: "A2.9",
  description: "Operate with binomial radical expressions and rationalize denominators.",
  underConstruction: true,
  generate: placeholderGenerator,
},
{
  id: "a2-9-4-rational-exponents",
  topic: 9,
  topicTitle: "Topic 9: Radical Expressions",
  title: "9-4: Rational Exponents",
  story: "Fractional exponents are radicals in disguise.",
  teks: "A2.9",
  description: "Convert between radical and rational-exponent forms; simplify.",
  underConstruction: true,
  generate: placeholderGenerator,
},
```

### Topic 10: Cubic & Cube Root Functions (TEKS A2.10)

```ts
{
  id: "a2-10-1-cubic-transformations",
  topic: 10,
  topicTitle: "Topic 10: Cubic & Cube Root Functions",
  title: "10-1: Cubics: Attributes & Transformations",
  story: "The S-curve and its inflection point.",
  teks: "A2.10",
  description: "Attributes and transformations of cubic functions.",
  underConstruction: true,
  generate: placeholderGenerator,
},
{
  id: "a2-10-2-cuberoot-transformations",
  topic: 10,
  topicTitle: "Topic 10: Cubic & Cube Root Functions",
  title: "10-2: Cube Roots: Attributes & Transformations",
  story: "Cube roots keep their sign — and their shape.",
  teks: "A2.10",
  description: "Attributes and transformations of cube root functions.",
  underConstruction: true,
  generate: placeholderGenerator,
},
{
  id: "a2-10-3-cuberoot-equations",
  topic: 10,
  topicTitle: "Topic 10: Cubic & Cube Root Functions",
  title: "10-3: Cube Root Equations",
  story: "Cube both sides — no extraneous roots this time.",
  teks: "A2.10",
  description: "Solve cube root equations.",
  underConstruction: true,
  generate: placeholderGenerator,
},
```

### Topic 11: Rational Functions & Equations (TEKS A2.11)

```ts
{
  id: "a2-11-1-simplify",
  topic: 11,
  topicTitle: "Topic 11: Rational Functions & Equations",
  title: "11-1: Simplifying Rational Expressions",
  story: "Factor first, cancel second, restrict always.",
  teks: "A2.11",
  description: "Simplify rational expressions and state domain restrictions.",
  generate: (m, s, o) => a2_11_1_simplify(m, s, o) as unknown as MathProblem[],
},
{
  id: "a2-11-2-mult-div",
  topic: 11,
  topicTitle: "Topic 11: Rational Functions & Equations",
  title: "11-2: Multiplying & Dividing",
  story: "Factor everything before you cancel anything.",
  teks: "A2.11",
  description: "Multiply and divide rational expressions.",
  generate: (m, s, o) => a2_11_2_multDiv(m, s, o) as unknown as MathProblem[],
},
{
  id: "a2-11-3-asymptotes-holes",
  topic: 11,
  topicTitle: "Topic 11: Rational Functions & Equations",
  title: "11-3: Asymptotes & Holes",
  story: "Zeros of the denominator draw the graph's guardrails.",
  teks: "A2.11",
  description: "Find vertical/horizontal asymptotes and removable discontinuities (with graphs).",
  generate: (m, s, o) => a2_11_3_asymptotesHoles(m, s, o) as unknown as MathProblem[],
},
{
  id: "a2-11-4-solve-rational",
  topic: 11,
  topicTitle: "Topic 11: Rational Functions & Equations",
  title: "11-4: Solving Rational Equations",
  story: "Clear denominators — then interrogate every candidate.",
  teks: "A2.11",
  description: "Solve rational equations, including extraneous-root (no-solution) cases.",
  generate: (m, s, o) => a2_11_4_solveRational(m, s, o) as unknown as MathProblem[],
},
```

### Topic 12: Data & Regression (TEKS A2.12)

```ts
{
  id: "a2-12-1-analyzing-data",
  topic: 12,
  topicTitle: "Topic 12: Data & Regression",
  title: "12-1: Analyzing Data",
  story: "Differences and ratios reveal the hidden model.",
  teks: "A2.12",
  description: "Classify data as linear, quadratic, or exponential with finite differences and ratios.",
  generate: (m, s, o) => a2_12_1_analyzingData(m, s, o) as unknown as MathProblem[],
},
{
  id: "a2-12-2-regression",
  topic: 12,
  topicTitle: "Topic 12: Data & Regression",
  title: "12-2: Regression & Model Choice",
  story: "Least squares finds the line of best fit.",
  teks: "A2.12",
  description: "Compute least-squares regression lines from data tables.",
  generate: (m, s, o) => a2_12_2_regression(m, s, o) as unknown as MathProblem[],
},
{
  id: "a2-12-3-using-models",
  topic: 12,
  topicTitle: "Topic 12: Data & Regression",
  title: "12-3: Using Models for Decisions",
  story: "Extend the model to predict what comes next.",
  teks: "A2.12",
  description: "Use linear and exponential models to make predictions.",
  generate: (m, s, o) => a2_12_3_usingModels(m, s, o) as unknown as MathProblem[],
},
```

## Group: Algebra 2 Proofs

Proof entries use `topic: 99` (outside the doc's 2–12 range; the group is
mission-defined, not scope-defined). The coordinator may renumber.

```ts
{
  id: "a2-p-trig-identities",
  topic: 99,
  topicTitle: "Algebra 2 Proofs",
  title: "Trig Identity Proofs",
  story: "Prove identities step by step: Pythagorean, sum formulas, double-angle.",
  teks: "A2.P",
  description: "Step-scaffolded two-column proofs of trigonometric identities (parameterized templates).",
  generate: (m, s, o) => a2_p_trigIdentities(m, s, o) as unknown as MathProblem[],
},
{
  id: "a2-p-log-exp-proofs",
  topic: 99,
  topicTitle: "Algebra 2 Proofs",
  title: "Logarithm & Exponent Proofs",
  story: "Prove the product, quotient, and power rules from the definition.",
  teks: "A2.P",
  description: "Step-scaffolded two-column proofs of logarithm and exponent properties (parameterized templates).",
  generate: (m, s, o) => a2_p_logExpProofs(m, s, o) as unknown as MathProblem[],
},
{
  id: "a2-p-poly-identities",
  topic: 99,
  topicTitle: "Algebra 2 Proofs",
  title: "Polynomial Identity Proofs",
  story: "Prove (x+k)², difference of squares, sum of cubes, and (x+k)³.",
  teks: "A2.P",
  description: "Step-scaffolded two-column proofs of polynomial identities (parameterized templates).",
  generate: (m, s, o) => a2_p_polyIdentities(m, s, o) as unknown as MathProblem[],
},
```

## Group: Algebra 2 — Supplementary (not in the scope doc)

These generators were required by the original mission but have no lesson
row in `CURRICULUM_SCOPE.md`. They are grouped separately so the doc's
rows stay exact. `topic: 100`; the coordinator may fold them elsewhere.

```ts
{
  id: "a2x-sequences",
  topic: 100,
  topicTitle: "Supplementary Topics",
  title: "Sequences & Series",
  story: "Explicit and recursive formulas, finite sums.",
  teks: "A2.S",
  description: "Arithmetic/geometric sequences (explicit, recursive) and finite series sums. Supplementary: not in the scope doc.",
  generate: (m, s, o) => a2x_sequences(m, s, o) as unknown as MathProblem[],
},
{
  id: "a2x-circle-equations",
  topic: 100,
  topicTitle: "Supplementary Topics",
  title: "Circle Equations",
  story: "Center-radius form and completing the square.",
  teks: "A2.C",
  description: "Write circle equations from center/radius; complete the square from general form (with graphs). Supplementary: not in the scope doc.",
  generate: (m, s, o) => a2x_circleEquations(m, s, o) as unknown as MathProblem[],
},
{
  id: "a2x-circle-line-systems",
  topic: 100,
  topicTitle: "Supplementary Topics",
  title: "Circle-Line Systems",
  story: "Where does the line cut the circle?",
  teks: "A2.C",
  description: "Solve circle-line systems by substitution (two intersections or tangent). Supplementary: not in the scope doc.",
  generate: (m, s, o) => a2x_circleLineSystems(m, s, o) as unknown as MathProblem[],
},
```
