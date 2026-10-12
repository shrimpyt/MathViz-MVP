# REGISTRY_SNIPPET.md — Geometry placeholder replacements

Paste-ready changes for `src/modules/CurriculumRegistry.ts`. Each of the 18
entries below already exists in the registry; the change is only: **remove
`underConstruction: true`** and **replace the `generate` field** as shown.
No entry text (title/story/teks/description) is modified.

## Import to add (top of CurriculumRegistry.ts)

```ts
import {
  geo_1_1_foundations,
  geo_2_1_inductive,
  geo_5_1_midsegments,
  geo_6_1_polygons,
  geo_8_1_translations,
  geo_12_1_tangentLines,
  geo_13_1_area,
  geo_14_2_surfaceArea,
  geo_15_1_probability,
  geoTopicTest,
} from "./geometry-lessons";
```

## Lessons (replace `generate: placeholderGenerator`)

| Entry id | New generate |
|---|---|
| `ch1-1-points-lines` | `generate: geo_1_1_foundations` |
| `ch2-1-inductive-reasoning` | `generate: geo_2_1_inductive` |
| `ch5-1-midsegments` | `generate: geo_5_1_midsegments` |
| `ch6-1-polygons` | `generate: geo_6_1_polygons` |
| `ch8-1-translations` | `generate: geo_8_1_translations` |
| `ch12-1-tangent-lines` | `generate: geo_12_1_tangentLines` |
| `ch13-1-area-polygons` | `generate: geo_13_1_area` |
| `ch14-2-surface-area` | `generate: geo_14_2_surfaceArea` |
| `ch15-1-experimental-theoretical` | `generate: geo_15_1_probability` |

## Chapter tests (replace `generate: (m, s, o) => topicTestGenerator(N, m, s, o)`)

| Entry id | New generate |
|---|---|
| `ch1-test` | `generate: (m, s, o) => geoTopicTest(1, m, s, o)` |
| `ch2-test` | `generate: (m, s, o) => geoTopicTest(2, m, s, o)` |
| `ch3-test` | `generate: (m, s, o) => geoTopicTest(3, m, s, o)` |
| `ch5-test` | `generate: (m, s, o) => geoTopicTest(5, m, s, o)` |
| `ch6-test` | `generate: (m, s, o) => geoTopicTest(6, m, s, o)` |
| `ch8-test` | `generate: (m, s, o) => geoTopicTest(8, m, s, o)` |
| `ch9-test` | `generate: (m, s, o) => geoTopicTest(9, m, s, o)` |
| `ch13-test` | `generate: (m, s, o) => geoTopicTest(13, m, s, o)` |
| `ch14-test` | `generate: (m, s, o) => geoTopicTest(14, m, s, o)` |

The finished tests (ch4, ch7, ch10, ch11, ch12, ch15) keep using
`topicTestGenerator` unchanged. `placeholderGenerator` and the `default:`
branch of `topicTestGenerator` become unreachable for these topics but can
stay in the file harmlessly (other callers may still reference them).
