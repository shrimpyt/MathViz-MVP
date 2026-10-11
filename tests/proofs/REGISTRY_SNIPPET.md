# Geometry Proofs — Registry Snippet

Exact `CurriculumEntry` blocks to insert into `CURRICULUM_REGISTRY` in
`src/modules/CurriculumRegistry.ts`. Lesson numbering follows
`CURRICULUM_SCOPE.md` ("Geometry — Topics 1–15"); TEKS codes are G.* per the
alignment update. **Do not edit any other file** — all generator code is new.

## 1. Imports — add to the top of CurriculumRegistry.ts

```ts
import {
  proofCongruenceProblems,
  proofCPCTCProblems,
  proofIsoscelesProblems,
  proofParallelLineProblems,
  proofSimilarityProblems,
  proofCircleTheoremProblems,
  proofElementsProblems,
} from "./geometry-proofs";
```

(`MathProblem` and `OutputMode` are already imported there. The
`as unknown as MathProblem[]` casts below can be dropped once WIRING.md step 1
— adding `ProofProblem` to the `MathProblem` union — is done.)

## 2. Placeholder entries replaced — DELETE these two

| id | replaced by |
|---|---|
| `ch3-1-lines-angles` (Topic 3, "coming soon") | `proofs-3-3-proving-parallel` |
| `ch9-2-similar-polygons` (Topic 9, "coming soon") | `proofs-9-3-similarity` |

## 3. New entries — insert in topic order

### Topic 2: Reasoning and Proof

```ts
{
  id: "proofs-2-4-elements",
  topic: 2,
  topicTitle: "Topic 2: Reasoning and Proof",
  title: "2-4: Deductive Reasoning — Euclid's Elements",
  story: "Prove the great theorems the way Euclid did — I.47 and friends, in classical style.",
  teks: "G.4(B)",
  description:
    "Eight flagship propositions (I.1, I.4, I.5, I.8, I.29, I.32, I.47, I.48) with classical enunciation, construction diagrams, demonstration, and Q.E.D.",
  generate: (m, s, o) => proofElementsProblems(m, s, o) as unknown as MathProblem[],
},
```

### Topic 3: Parallel and Perpendicular Lines

```ts
{
  id: "proofs-3-2-parallel-properties",
  topic: 3,
  topicTitle: "Topic 3: Parallel and Perpendicular Lines",
  title: "3-2: Properties of Parallel Lines — Proofs",
  story: "Corresponding, alternate interior, and same-side angles — proved, not just stated.",
  teks: "G.5(A)",
  description:
    "Two-column transversal proofs: one-theorem applications and two-step angle chases, with marked 8-angle diagrams.",
  generate: (m, s, o) => proofParallelLineProblems([1, 2], m, s, o) as unknown as MathProblem[],
},
{
  id: "proofs-3-3-proving-parallel",
  topic: 3,
  topicTitle: "Topic 3: Parallel and Perpendicular Lines",
  title: "3-3: Proving Lines Parallel — Proofs",
  story: "Turn angle data into a parallelism proof via the converses.",
  teks: "G.5(A)",
  description:
    "Two-column proofs that conclude l ∥ m from congruent or supplementary angle pairs (Corresponding / Alternate Interior / Same-Side Interior converses).",
  generate: (m, s, o) => proofParallelLineProblems([3], m, s, o) as unknown as MathProblem[],
},
```

### Topic 4: Congruent Triangles

```ts
{
  id: "proofs-4-2-sss-sas",
  topic: 4,
  topicTitle: "Topic 4: Congruent Triangles",
  title: "4-2: Triangle Congruence by SSS and SAS — Proofs",
  story: "Three sides, or two sides and the included angle — build the proof.",
  teks: "G.6(B)",
  description:
    "Parameterized two-column SSS/SAS proofs with randomized side lengths and marked diagrams. Harder tiers derive facts from midpoints, bisectors, and perpendiculars.",
  generate: (m, s, o) => proofCongruenceProblems(["SSS", "SAS"], m, s, o) as unknown as MathProblem[],
},
{
  id: "proofs-4-3-asa-aas",
  topic: 4,
  topicTitle: "Topic 4: Congruent Triangles",
  title: "4-3: Triangle Congruence by ASA and AAS — Proofs",
  story: "Two angles and a side — included or not — build the proof.",
  teks: "G.6(B)",
  description:
    "Parameterized two-column ASA/AAS proofs with randomized angle measures and marked diagrams.",
  generate: (m, s, o) => proofCongruenceProblems(["ASA", "AAS"], m, s, o) as unknown as MathProblem[],
},
{
  id: "proofs-4-4-cpctc",
  topic: 4,
  topicTitle: "Topic 4: Congruent Triangles",
  title: "4-4: Corresponding Parts (CPCTC) — Proofs",
  story: "The triangles are congruent — now prove the part you weren't given.",
  teks: "G.6(B)",
  description:
    "Establish △ABC ≅ △DEF via SSS/SAS/ASA/AAS/HL, then conclude a non-given corresponding part by CPCTC.",
  generate: (m, s, o) => proofCPCTCProblems(m, s, o) as unknown as MathProblem[],
},
{
  id: "proofs-4-5-isosceles",
  topic: 4,
  topicTitle: "Topic 4: Congruent Triangles",
  title: "4-5: Isosceles and Equilateral Triangles — Proofs",
  story: "Equal legs, equal base angles — prove it with a bisector, a median, or the converse.",
  teks: "G.6(B)",
  description:
    "Two-column proofs of the isosceles base-angles theorem (bisector+SAS or median+SSS, then CPCTC) and its converse (AAS).",
  generate: (m, s, o) => proofIsoscelesProblems(m, s, o) as unknown as MathProblem[],
},
{
  id: "proofs-4-6-hl",
  topic: 4,
  topicTitle: "Topic 4: Congruent Triangles",
  title: "4-6: Triangle Congruence by HL — Proofs",
  story: "Right triangles, hypotenuse and leg — build the proof.",
  teks: "G.6(B)",
  description:
    "Parameterized two-column HL proofs on genuine Pythagorean triples, with right-angle marks and ticked hypotenuse/leg.",
  generate: (m, s, o) => proofCongruenceProblems(["HL"], m, s, o) as unknown as MathProblem[],
},
```

### Topic 9: Similarity

```ts
{
  id: "proofs-9-3-similarity",
  topic: 9,
  topicTitle: "Topic 9: Similarity",
  title: "9-3: Proving Triangles Similar — Proofs",
  story: "Two angles match — the triangles are similar. Prove it.",
  teks: "G.7(A)",
  description:
    "Parameterized two-column AA similarity proofs with marked angle pairs.",
  generate: (m, s, o) => proofSimilarityProblems(m, s, o) as unknown as MathProblem[],
},
```

### Topic 12: Circle Theorems

```ts
{
  id: "proofs-12-1-tangent-lines",
  topic: 12,
  topicTitle: "Topic 12: Circle Theorems",
  title: "12-1: Tangent Lines — Proofs",
  story: "A tangent meets a chord — prove the angle is half the intercepted arc.",
  teks: "G.12(A)",
  description:
    "Two-column tangent-chord angle proofs, including minor-arc derivation (360° − major arc) and tangent/inscribed comparison.",
  generate: (m, s, o) => proofCircleTheoremProblems(["TangentChord"], m, s, o) as unknown as MathProblem[],
},
{
  id: "proofs-12-3-inscribed-angles",
  topic: 12,
  topicTitle: "Topic 12: Circle Theorems",
  title: "12-3: Inscribed Angles — Proofs",
  story: "An inscribed angle is half its intercepted arc — prove it.",
  teks: "G.12(A)",
  description:
    "Two-column inscribed-angle proofs, including arc-addition derivations and two-angles-one-arc congruence.",
  generate: (m, s, o) => proofCircleTheoremProblems(["InscribedAngle"], m, s, o) as unknown as MathProblem[],
},
```

## 4. Difficulty behavior

All entries honor `options.difficulty` (1|2|3, cumulative) and
`options.count`. Difficulty tiers live in the factories:
- Congruence/CPCTC/isosceles/parallel/circle/similarity: 1 = direct application, 2 = one derived fact, 3 = chained derivations.
- Elements: 1 → I.1, I.4, I.8; 2 → + I.5, I.29, I.32; 3 → all eight.

## 5. Not covered (left as "coming soon")

T6 "Proving That a Quadrilateral is a Parallelogram" (6-3) and 6-5
(rhombus/rectangle/square conditions), and T7 "Proofs Using Coordinate
Geometry" (7-3), have no proof generators yet — their placeholders stay.
