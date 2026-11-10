---
paths:
  - "tests/**/*"
  - "src/lib/accommodations/__tests__/**/*"
---
# Test rules
- Suites are plain scripts, run with `npx tsx <file>`. No jest or vitest;
  don't add a framework without asking.
- A suite must exit non-zero on failure and print a short summary.
- Keep fuzz runs seeded so a failure can be reproduced from its seed.
- Never weaken or skip a check to get a green run. Fix the generator.
- When reporting, give pass/fail counts and the failing cases only.
