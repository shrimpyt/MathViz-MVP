import { CURRICULUM_REGISTRY } from "@/modules/CurriculumRegistry";
const ids = process.argv[2] ? process.argv[2].split(",") : [];
for (const id of ids) {
  const e = CURRICULUM_REGISTRY.find((x) => x.id === id);
  if (!e) { console.log("NOT FOUND", id); continue; }
  const ps = e.generate("Test", 11, { count: 2, difficulty: 2 }) as any[];
  console.log("=====", id);
  for (const p of ps) console.log(JSON.stringify(p).slice(0, 1200));
}
