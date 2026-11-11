// Topic picker: search by plain words or a standard code, the picks tray's
// total, and the remembered course.
//
// Run: npx tsx tests/topic-picker.ts

import { CURRICULUM_REGISTRY, type RegisteredEntry } from "../src/modules/CurriculumRegistry";
import { FRAMEWORKS, standardsFor } from "../src/lib/standards";
import {
  entryMatches,
  expandQuery,
  indexEntry,
  looksLikeCode,
  normalizeCode,
  type EntryIndex,
} from "../src/lib/topicSearch";
import {
  COURSE_PREF_KEY,
  readRememberedCourse,
  rememberCourse,
  splitTotal,
  totalRange,
  trayTotal,
} from "../src/lib/pickerPrefs";
import {
  DEFAULT_SETTINGS,
  generateFromSettings,
  sanitizeSettings,
  settingsForSave,
} from "../src/lib/worksheetSettings";

let checks = 0;
const failures: string[] = [];
function ok(cond: boolean, label: string) {
  checks++;
  if (!cond) failures.push(label);
}

const index = new Map<string, EntryIndex>();
for (const e of CURRICULUM_REGISTRY) {
  const other = FRAMEWORKS.filter((f) => f.id !== "teks").map((f) => standardsFor(e.id, e.teks, f.id));
  index.set(e.id, indexEntry(e, other));
}
const search = (q: string, course?: string): RegisteredEntry[] =>
  CURRICULUM_REGISTRY.filter((e) => (!course || e.course === course) && entryMatches(q, index.get(e.id)!));
const titles = (q: string, course?: string) => search(q, course).map((e) => e.title);
const finds = (q: string, title: string, course?: string) => titles(q, course).includes(title);

// ── Every lesson is findable by its own name and by each of its TEKS codes ──
for (const e of CURRICULUM_REGISTRY) {
  if (e.underConstruction) continue;
  ok(search(e.title).some((h) => h.id === e.id), `"${e.title}" finds itself by name`);
  for (const code of e.teks.split("·").map((c) => c.trim()).filter(Boolean)) {
    ok(search(code).some((h) => h.id === e.id), `${e.id} found by its code ${code}`);
  }
}

// ── Standard codes ──
ok(normalizeCode("G.5(D)") === "g5d" && normalizeCode("2A.4F") === "2a4f", "codes normalize");
ok(looksLikeCode("g.5(d)") && looksLikeCode("2a.4f") && looksLikeCode("6.3") && !looksLikeCode("x²+bx+c"),
  "code detection");
const g5d = search("G.5(D)");
ok(g5d.length > 0 && g5d.every((e) => normalizeCode(e.teks).includes("g5d")), "G.5(D) finds only G.5D lessons");
ok(search("G.5 (D)").length === g5d.length, "a space inside the code doesn't matter");
const g5 = search("G.5");
ok(g5.length >= g5d.length && g5.every((e) => /G\.5\(/.test(e.teks)), "G.5 finds the whole G.5 standard");
ok(search("G.1").every((e) => /G\.1\(/.test(e.teks)), "G.1 doesn't pull in G.10–G.13");
const a2 = search("A2.4F");
ok(a2.length > 0 && a2.length === search("2A.4(F)").length && search("G-CO.C.10").length > 0, "A2.4F and 2A.4(F) find the same Algebra II lessons");

// ── Plain words and teacher shorthand ──
ok(finds("midsegment", "Midsegments of Triangles"), "midsegment → Midsegments of Triangles");
ok(finds("inequality", "Multi-Step Inequalities"), "singular finds plural");
ok(finds("foil", "Multiplying Binomials"), "foil → Multiplying Binomials");
ok(finds("pemdas", "Order of Operations"), "pemdas → Order of Operations");
ok(finds("gcf", "Greatest Common Factor & Least Common Multiple"), "gcf");
ok(finds("soh cah toa", "Trig Ratios: Sine, Cosine & Tangent"), "soh cah toa");
ok(finds("sohcahtoa", "Trig Ratios: Solving for Sides"), "sohcahtoa");
ok(finds("parabola", "Vertex Form"), "parabola → quadratics");
ok(finds("y=mx+b", "Slope-Intercept Form"), "y=mx+b");
ok(finds("pythagorean", "Pythagorean Theorem"), "pythagorean");
ok(finds("log", "Properties of Logarithms"), "log → logarithms");
ok(finds("completing square", "Completing the Square"), "stop words don't block a match");
ok(finds("triangle congruence", "SSS & SAS Congruence Proofs"), "words can match the concept group");
ok(!titles("sin").includes("Using Models for Decisions"), "sin doesn't match inside a word (using)");
ok(expandQuery("FOIL practice").includes("multiplying binomials practice"), "synonym expands inside a phrase");
ok(search("zzzz not a skill").length === 0, "nonsense finds nothing");

// ── Search stays in a course ──
const quadAll = search("quadratic");
const quadGeo = search("quadratic", "Geometry");
const quadA2 = search("quadratic", "Algebra II");
ok(quadAll.length > quadA2.length && quadA2.length > 0, "quadratic spans courses; Algebra II alone has fewer");
ok(quadGeo.length === 0, "quadratic finds nothing inside Geometry");

// ── Tray total ──
ok(JSON.stringify(Object.values(splitTotal(10, ["a", "b", "c"]))) === "[4,3,3]", "10 over 3 lessons splits 4/3/3");
ok(JSON.stringify(Object.values(splitTotal(2, ["a", "b", "c"]))) === "[1,1,1]", "total never drops a lesson below 1");
ok(JSON.stringify(Object.values(splitTotal(99, ["a", "b"]))) === "[25,25]", "total caps each lesson at 25");
ok(Object.keys(splitTotal(5, [])).length === 0, "empty tray splits nothing");
ok(totalRange(4).min === 4 && totalRange(4).max === 100, "total range");
ok(trayTotal({ advancedCounts: false, topicCounts: { a: 9 }, count: 3 }, ["a", "b"]) === 6,
  "shared count: total is count × lessons");
ok(trayTotal({ advancedCounts: true, topicCounts: { a: 9 }, count: 3 }, ["a", "b"]) === 12,
  "per-lesson counts: total is their sum");

// A tray total is saved the way per-lesson counts always were, so the
// recipe round-trips and rebuilds exactly that many problems.
const ids = ["ms6-3-11-properties-of-operations", "ms7-7-4-distributive-equations"].filter((id) =>
  CURRICULUM_REGISTRY.some((e) => e.id === id)
);
ok(ids.length === 2, "tray test lessons exist");
const traySettings = settingsForSave({
  ...DEFAULT_SETTINGS,
  topicIds: ids,
  advancedCounts: true,
  topicCounts: splitTotal(7, ids),
});
const back = sanitizeSettings(JSON.parse(JSON.stringify(traySettings)));
ok(!!back && JSON.stringify(back) === JSON.stringify(traySettings), "tray settings round-trip unchanged");
ok(generateFromSettings(back!).map((s) => s.length).join(",") === "4,3", "a 7-problem tray rebuilds 4 + 3");

// ── Remembered course ──
const store = new Map<string, string>();
const fake = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
const views = ["All", "Geometry", "Algebra II", "Grade 7"];
ok(readRememberedCourse(fake, views) === null, "nothing remembered at first");
rememberCourse(fake, "Algebra II");
ok(readRememberedCourse(fake, views) === "Algebra II", "remembers the picked course");
store.set(COURSE_PREF_KEY, "Retired Course");
ok(readRememberedCourse(fake, views) === null, "a course that no longer exists is ignored");
const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
rememberCourse(blocked, "Geometry");
ok(readRememberedCourse(blocked, views) === null, "blocked storage never throws");

console.log(`topic-picker: ${checks} checks, ${failures.length} failed`);
for (const f of failures.slice(0, 40)) console.log("  FAIL " + f);
if (failures.length) process.exit(1);
