import { CURRICULUM_REGISTRY } from "@/modules/CurriculumRegistry";
console.log("entries:", CURRICULUM_REGISTRY.length);
const e0 = CURRICULUM_REGISTRY[0];
console.log(e0.id, e0.topic, e0.title);
const probs = e0.generate("Test", 42, { count: 2, difficulty: 2 });
console.log("problems:", probs.length, "types:", [...new Set(probs.map(p=>p.type))].join(","));
console.log(JSON.stringify(probs[0], null, 1).slice(0, 800));
