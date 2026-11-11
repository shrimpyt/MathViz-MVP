// Topic catalog: every lesson has a course, a concept group and a skill name,
// lesson ids never change (saved worksheets and drafts store them), and
// nothing a teacher sees numbers the groups or calls them an order.
// Run: npx tsx tests/topic-catalog.ts

import { readFileSync } from "node:fs";
import { CURRICULUM_REGISTRY, getModule } from "../src/modules/CurriculumRegistry";
import { CATALOG_ORDER, COURSES, COURSE_GROUPS, TOPIC_CATALOG } from "../src/modules/topicCatalog";
import { sanitizeSettings, settingsForSave, entriesForSettings } from "../src/lib/worksheetSettings";
import { validateWorksheetSettings } from "../worker/src/worksheets";

let checks = 0;
let failures = 0;
function ck(label: string, ok: boolean) {
  checks++;
  if (!ok) {
    failures++;
    if (failures <= 25) console.log(`  ✗ ${label}`);
  }
}

const registryIds = new Set(CURRICULUM_REGISTRY.map((e) => e.id));
const catalogIds = new Set(Object.keys(TOPIC_CATALOG));

// 1. One catalog row per lesson, no strays.
for (const id of registryIds) ck(`catalog row for ${id}`, catalogIds.has(id));
for (const id of catalogIds) ck(`catalog row ${id} is a real lesson`, registryIds.has(id));

// 2. Every lesson id from before the rename still exists and still loads.
const before: string[] = JSON.parse(
  readFileSync(new URL("./fixtures/lesson-ids-before-rename.json", import.meta.url), "utf8"),
);
ck(`fixture has ids (${before.length})`, before.length > 300);
for (const id of before) ck(`old id ${id} still in the registry`, !!getModule(id));
const live = before.filter((id) => !getModule(id)?.underConstruction);
for (let i = 0; i < live.length; i += 10) {
  const topicIds = live.slice(i, i + 10);
  // A library row as the Worker stores it: full settings naming the old ids.
  const base = sanitizeSettings({ docType: "worksheet", title: "Saved before the rename", topicIds, seed: 42, count: 4 });
  const stored = base ? JSON.parse(JSON.stringify(settingsForSave({ ...base, topicIds }))) : null;
  const fromLibrary = validateWorksheetSettings(stored);
  ck(`worker accepts saved ids ${topicIds[0]}…`, !!fromLibrary);
  const loaded = sanitizeSettings(fromLibrary);
  ck(`saved ids load unchanged ${topicIds[0]}…`, JSON.stringify(loaded?.topicIds) === JSON.stringify(topicIds));
  ck(`saved ids resolve ${topicIds[0]}…`, loaded ? entriesForSettings(loaded).length === topicIds.length : false);
}

// 3. The registry shows the catalog's names, courses and groups.
for (const e of CURRICULUM_REGISTRY) {
  const cat = TOPIC_CATALOG[e.id];
  if (!cat) continue;
  ck(`${e.id} title is the skill name`, e.title === cat.name);
  ck(`${e.id} course`, e.course === cat.course);
  ck(`${e.id} group`, e.group === cat.group);
  ck(`${e.id} group is listed for its course`, COURSE_GROUPS[e.course].includes(e.group));
  ck(`${e.id} grade only in Pre-Algebra`, (e.course === "Pre-Algebra") === (e.grade === 7 || e.grade === 8));
}

// 4. Grade 7 and Grade 8 views come from Pre-Algebra's own lessons.
const pre = CURRICULUM_REGISTRY.filter((e) => e.course === "Pre-Algebra");
ck("Pre-Algebra has Grade 7 lessons", pre.some((e) => e.grade === 7));
ck("Pre-Algebra has Grade 8 lessons", pre.some((e) => e.grade === 8));
for (const e of pre) ck(`${e.id} grade matches its id`, e.id.startsWith(`ms${e.grade}-`));

// 5. Trig lessons are Geometry (the Review screen used to call them Precalculus).
for (const e of CURRICULUM_REGISTRY.filter((x) => x.id.startsWith("trig-") || x.id.startsWith("special-") || x.id.startsWith("elevation-")))
  ck(`${e.id} is Geometry`, e.course === "Geometry");

// 6. Catalog order keeps each course's groups together and in COURSE_GROUPS order.
let lastCourse = -1;
let lastGroup = -1;
for (const id of CATALOG_ORDER) {
  const cat = TOPIC_CATALOG[id];
  const c = COURSES.indexOf(cat.course);
  const g = COURSE_GROUPS[cat.course].indexOf(cat.group);
  const ok = c > lastCourse || (c === lastCourse && g >= lastGroup);
  ck(`${id} in course/group order`, ok);
  if (c !== lastCourse) lastGroup = -1;
  lastCourse = c;
  lastGroup = g;
}

// 7. No numbering or order wording in anything the picker shows.
const ORDER_WORDS = /^\s*\d|\b(unit|topic|chapter|lesson|step|part|module)\s*\d|\b\d+\s*-\s*\d+\s*:|\b(first|second|third|next|sequence|in order|course order)\b/i;
const shown = new Set<string>([...COURSES]);
for (const groups of Object.values(COURSE_GROUPS)) for (const g of groups) shown.add(g);
for (const cat of Object.values(TOPIC_CATALOG)) shown.add(cat.name);
for (const text of shown) ck(`no order wording in "${text}"`, !ORDER_WORDS.test(text));

console.log(failures === 0 ? `topic-catalog: ${checks} checks, 0 failures` : `topic-catalog: ${failures} of ${checks} checks failed`);
process.exit(failures === 0 ? 0 : 1);
