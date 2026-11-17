// Taught shelf: keeping the app's copy in step after an export or a tap,
// and choosing lessons for "Again" and "Review what I've taught", with Free
// lessons only for a Free teacher and a quick review that rebuilds.
//
// Run: npx tsx tests/taught-shelf.ts

import { CURRICULUM_REGISTRY } from "../src/modules/CurriculumRegistry";
import { isTopicAvailable } from "../src/lib/plan";
import {
  againLessons,
  markOnShelf,
  removeFromShelf,
  reviewCounts,
  reviewLessons,
  sortShelf,
  taughtWhen,
  REVIEW_LESSONS,
  REVIEW_PROBLEMS,
  type ShelfLesson,
} from "../src/lib/taughtShelf";
import { DEFAULT_SETTINGS, generateFromSettings, settingsForSave } from "../src/lib/worksheetSettings";

let checks = 0;
const failures: string[] = [];
function ok(cond: boolean, label: string) {
  checks++;
  if (!cond) failures.push(label);
}

const DAY = 86400;
const T = 1_800_000_000;
const L = (topicId: string, daysAgo: number, firstDaysAgo = daysAgo): ShelfLesson => ({
  topicId,
  taughtAt: T - firstDaysAgo * DAY,
  lastAt: T - daysAgo * DAY,
});
const all = () => true;

// ── Sorting and marking ──
const shelf = sortShelf([L("b", 5), L("a", 1), L("c", 20), L("d", 1)]);
ok(shelf.map((l) => l.topicId).join() === "a,d,b,c", "newest first, ties by id");
const marked = markOnShelf(shelf, ["c", "e"], T + 10);
ok(marked[0].lastAt === T + 10 && marked[1].lastAt === T + 10, "marked lessons go to the top");
ok(marked.find((l) => l.topicId === "c")!.taughtAt === T - 20 * DAY, "a repeat keeps its first date");
ok(marked.find((l) => l.topicId === "e")!.taughtAt === T + 10, "a new lesson starts today");
ok(marked.length === 5, "no duplicates");
ok(markOnShelf([], [], T).length === 0, "marking nothing changes nothing");
ok(removeFromShelf(marked, ["c", "zz"]).map((l) => l.topicId).join() === "e,a,d,b", "remove takes only what's named");

// ── Again ──
ok(againLessons(shelf, all).join() === "a,d", "Again is the lessons taught together most recently");
ok(againLessons(shelf, (id) => id !== "a").join() === "d", "Again skips a lesson the teacher can't use");
ok(againLessons(shelf, (id) => id === "c").join() === "c", "Again falls back to the newest usable one");
ok(againLessons([], all).length === 0, "Again on an empty shelf is empty");

// ── Review leans on lessons practised longest ago ──
const long = sortShelf([L("n1", 0), L("n2", 0), L("o1", 40), L("o2", 9), L("o3", 3), L("o4", 70), L("o5", 15), L("o6", 2)]);
const r = reviewLessons(long, all);
ok(r.length === REVIEW_LESSONS, "review mixes 5 lessons");
ok(r.join() === "o4,o1,o5,o2,o3", "stalest first");
ok(!r.includes("n1") && !r.includes("n2"), "lessons just taught are left out when there are older ones");
ok(reviewLessons(sortShelf([L("n1", 0), L("n2", 0)]), all).join() === "n1,n2", "with only today's lessons, review uses them");
ok(reviewLessons(long, all, (id) => id === "o2" || id === "o6").join() === "o2,o6", "the teacher's course comes first");
ok(reviewLessons(long, all, () => false).length === REVIEW_LESSONS, "no lessons in the course: review uses the whole shelf");
ok(reviewLessons(long, (id) => id.startsWith("n")).join() === "n1,n2", "only usable lessons");
ok(reviewLessons([], all).length === 0, "empty shelf, no review");

const counts = reviewCounts(r);
ok(Object.values(counts).reduce((a, b) => a + b, 0) === REVIEW_PROBLEMS, "review is 10 problems");
ok(counts.o4 === 2 && counts.o3 === 2, "shared evenly");
ok(reviewCounts(["x"]).x === 10, "one lesson gets all 10");

// ── Free vs Pro, with real lessons ──
const live = CURRICULUM_REGISTRY.filter((e) => !e.underConstruction);
const usableFor = (pro: boolean) => (id: string) => {
  const e = live.find((x) => x.id === id);
  return !!e && isTopicAvailable(e, pro);
};
const free = live.filter((e) => isTopicAvailable(e, false)).slice(0, 4);
const pro = live.filter((e) => !isTopicAvailable(e, false)).slice(0, 4);
ok(free.length === 4 && pro.length === 4, "registry has Free and Pro lessons");
const realShelf = sortShelf([
  ...free.map((e, i) => L(e.id, 10 + i)),
  ...pro.map((e, i) => L(e.id, 30 + i)),
  L("retired-lesson", 90),
]);
const freeReview = reviewLessons(realShelf, usableFor(false));
ok(freeReview.length === 4 && freeReview.every((id) => free.some((e) => e.id === id)), "a Free teacher's review uses Free lessons only");
const proReview = reviewLessons(realShelf, usableFor(true));
ok(proReview.length === 5 && proReview.some((id) => pro.some((e) => e.id === id)), "a Pro teacher's review includes Pro lessons");
ok(!proReview.includes("retired-lesson"), "a lesson no longer in the catalog is skipped");
ok(againLessons(sortShelf([L(pro[0].id, 0), L(free[0].id, 1)]), usableFor(false)).join() === free[0].id, "Free Again skips a locked Pro lesson");

// The quick review builds a real worksheet.
const settings = settingsForSave({
  ...DEFAULT_SETTINGS,
  docType: "review",
  topicIds: proReview,
  advancedCounts: true,
  topicCounts: reviewCounts(proReview),
  seed: 4242,
});
const built = generateFromSettings(settings);
ok(built.length === proReview.length, "review worksheet has a set per lesson");
ok(built.reduce((n, set) => n + set.length, 0) >= proReview.length, "review worksheet has problems");

// ── When ──
const noon = new Date(2026, 10, 12, 12, 0, 0).getTime();
const at = (y: number, m: number, d: number, h = 9) => Math.floor(new Date(y, m, d, h).getTime() / 1000);
ok(taughtWhen(at(2026, 10, 12, 8), noon) === "today", "today");
ok(taughtWhen(at(2026, 10, 11, 23), noon) === "yesterday", "late last night is yesterday");
ok(taughtWhen(at(2026, 10, 9), noon) === "3 days ago", "3 days ago");
ok(taughtWhen(at(2026, 9, 29), noon) === "2 weeks ago", "2 weeks ago");
ok(taughtWhen(at(2026, 6, 1), noon) === "4 months ago", "4 months ago");
ok(taughtWhen(at(2026, 10, 13), noon) === "today", "a clock running ahead reads today");

console.log(`taught-shelf: ${checks} checks, ${failures.length} failed`);
for (const f of failures.slice(0, 40)) console.log("  FAIL " + f);
if (failures.length) process.exit(1);
