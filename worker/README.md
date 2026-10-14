# Euclid API Worker

The only server-shaped piece of Euclid Engine: magic-link auth, plan
entitlement, the Free monthly generation counter, and Stripe
checkout/portal/webhooks. The app itself stays a static Pages export.
Spec: `~/workspace/goals/euclid-engine-deployment/files/auth-workers-spec.md`.

## Topology
- Worker route: `euclidengine.tech/api/*` (see wrangler.toml) — cookies
  are first-party to the app domain; the app calls
  `https://euclidengine.tech/api/...` (override with NEXT_PUBLIC_API_URL).
- Routes are matched by path suffix in src/index.ts, so the same build
  also answers on a workers.dev URL for testing.

## One-time setup (after Trystan's founder sitting)
1. `npx wrangler d1 create euclid` → put the id in wrangler.toml.
2. `npx wrangler d1 execute euclid --file=schema.sql` (and `--remote`).
3. Secrets (Trystan creates the accounts; values go through wrangler,
   never chat or repo):
   `wrangler secret put STRIPE_SECRET_KEY`
   `wrangler secret put STRIPE_WEBHOOK_SECRET`
   `wrangler secret put RESEND_API_KEY`
   Price ids (from Stripe test mode first) as vars or secrets:
   PRICE_PRO_MONTHLY, PRICE_PRO_ANNUAL, PRICE_SCHOOL, PRICE_FOUNDERS.
4. In Stripe: create the 4 products/prices; set the webhook endpoint to
   `https://euclidengine.tech/api/stripe/webhook` with events
   checkout.session.completed, customer.subscription.updated,
   customer.subscription.deleted, invoice.payment_failed. Enable the
   Billing customer portal.
5. `npx wrangler deploy`

## Local dev
`npx wrangler dev` + set DEV_AUTH=1 in a local .dev.vars (NOT committed):
request-link responses then include `devLink` so sign-in can be tested
without an email provider. DEV_AUTH must never be set in production.

## Notes / honest limits
- Soft gate: the Free 5/month counter is server-side per account; a user
  can register a second email. Accepted at $9 price points (spec).
- The Worker counts months in UTC; the app's anonymous local counter
  uses local time. Boundary-hour mismatch is acceptable (documented in
  src/core.ts monthKeyUTC).
- No student data anywhere in this system — teacher emails only.
