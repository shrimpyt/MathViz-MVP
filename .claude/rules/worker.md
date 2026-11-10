---
paths:
  - "worker/**/*"
  - "tests/paygate/**/*"
---
# Worker rules (euclid-api)
- The worker is the only server code: sign-in, plans, the Free counter,
  saved worksheets and Stripe. It deploys automatically from `main`.
- Typecheck with `npx tsc --noEmit -p worker`, then run
  `npx tsx tests/paygate/run-worker-tests.ts` and the other
  `run-worker-*.ts` files that cover what you changed.
- Schema changes go in a new numbered file in `worker/migrations/` and in
  `worker/schema.sql`, using `IF NOT EXISTS` so re-running is safe.
- Secrets and price ids are set with `wrangler secret put`, never in
  `wrangler.toml`, the repo or chat. Local dev values live in
  `worker/.dev.vars`, which is not committed.
