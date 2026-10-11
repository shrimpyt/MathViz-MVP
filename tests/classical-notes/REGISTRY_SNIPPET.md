# Classical Notes — Registry Change Assessment

**None required.**

Definitions are seeded in the standalone data file
`src/lib/classicalDefinitions.ts` as `CLASSICAL_DEFINITIONS: Record<string,
string[]>` keyed by registry entry id, with the lookup
`getClassicalDefinitions(entryId): string[] | undefined`. Both renderers
(`ClassicalNotesCard.tsx`, `ClassicalNotesPdf.tsx`) call the lookup at render
time and omit the DEFINITIONS block gracefully when an entry id has no key.

The optional `definitions?: string[]` field on `CurriculumEntry` was
considered and rejected:

- `CurriculumRegistry.ts` is a shared file under active edit by other
  workers; the keyed-data-file approach required zero changes to it.
- Definitions are presentation content for one document mode, not generation
  data — per `AGENTS.md`'s generate/render seam, they belong on the rendering
  side, not in the registry.
- Under-construction entries (no key) automatically get no definitions
  block, with no `underConstruction` branching needed in the registry.

No snippet follows because there is nothing to apply.
