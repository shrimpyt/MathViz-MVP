# Euclid Engine

@AGENTS.md

AGENTS.md above is the shared architecture guide (other agents read it too).
Everything below is for Claude Code only. Keep this file short: add a line
only after the same correction has been needed twice.

<!-- Area rules live in .claude/rules/ and load only when Claude touches
     matching files. Cheap subagents live in .claude/agents/. HTML comments
     like this one are stripped before Claude sees the file. -->

## Commands
- Package manager is npm (lockfile `package-lock.json`). Never use pnpm or yarn.
- Dev: `npm run dev` · Build: `npm run build` · Lint: `npm run lint`
- Typecheck app: `npx tsc --noEmit` (root tsconfig excludes `tests/` and `worker/`)
- Typecheck worker: `npx tsc --noEmit -p worker`
- There is no test framework. Every suite is a plain script run with
  `npx tsx <file>`; it prints a summary and exits non-zero on failure.

## Which tests to run
Run typecheck plus the suite for the area you touched before saying done.
Hand long runs to the `test-runner` agent so only failures come back.
- Any generator or registry change: `npx tsx tests/smoke.ts`
- Middle school: `npx tsx tests/middle-school/run-all.ts`
- Geometry: `npx tsx tests/geometry/verify.ts` (also `fuzz.ts`, `pdf-check.tsx`)
- Proofs: `npx tsx tests/proofs/run-all.ts`
- Algebra 1: `npx tsx tests/algebra-1/verify.ts` (also `run-matrix.ts`, `fuzz.ts`)
- Algebra 2: `npx tsx tests/algebra-2/verify.ts` (and the `run-*.ts` files)
- Precalculus, calculus, SAT: `npx tsx tests/<area>/run-all.ts`
- Classical notes: `npx tsx tests/classical-notes/run-classical-tests.tsx`
- Answer and PDF text: `tests/latex-to-text.ts`, `tests/printed-keys.ts`
- Worker (sign-in, plans, Stripe): `npx tsx tests/paygate/run-worker-tests.ts`
  and the other `tests/paygate/run-worker-*.ts`
- Saved worksheets: `npx tsx tests/saved-worksheets.ts`

## Ship rules
- `main` auto-deploys both the site (Cloudflare Pages) and the API worker.
  Work on a branch and open a PR. Never push to `main`, merge, or deploy
  unless Trystan says so for that PR.
- Secrets go through `wrangler secret put`, never into the repo or chat.
- Don't touch the live D1 database or Stripe from a session unless asked.

## Context hygiene
- `.planning/` is stale (April 2026; it says no tests exist). Trust the code
  and this file over it.
- `src/lib/standards.ts` and `src/lib/classicalDefinitions.ts` are large data
  files. Grep them for the entry you need instead of reading them whole.
- `tests/*/TEST_REPORT.md`, `WIRING.md` and `REGISTRY_SNIPPET.md` are past
  build notes. Read one only when working in that area.
- Specs for planned features live in `specs/`. Read the relevant one by
  path; don't ask Trystan to paste it.
- Report test runs as failures only, never the full passing output.

## Compaction
When compacting, keep: the task in one line, files changed, which test
commands were run and their last result, open TODOs, and any decision
Trystan made in this session.
