import { CURRICULUM_REGISTRY } from "@/modules/CurriculumRegistry";
const t0 = Date.now();
let n = 0;
for (const e of CURRICULUM_REGISTRY) {
  e.generate("Test", 42, { count: 3, difficulty: 2 });
  n++;
}
const dt = Date.now() - t0;
console.log(`${n} entries, 3 probs each, ${dt}ms -> ${(dt/n).toFixed(2)}ms/entry`);
