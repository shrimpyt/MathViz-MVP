# Euclid API Worker

The only server-shaped piece of Euclid Engine: sign-in (emailed 6-digit
code, Sign in with Google, and the older magic link), plan
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
   Optional, for Sign in with Google (see "Sign in with Google" below):
   `wrangler secret put GOOGLE_CLIENT_ID`
   `wrangler secret put GOOGLE_CLIENT_SECRET`
   Price ids (from Stripe test mode first) as vars or secrets:
   PRICE_PRO_MONTHLY, PRICE_PRO_ANNUAL, PRICE_SCHOOL, PRICE_FOUNDERS.
4. In Stripe: create the 4 products/prices; set the webhook endpoint to
   `https://euclidengine.tech/api/stripe/webhook` with events
   checkout.session.completed, checkout.session.async_payment_succeeded,
   customer.subscription.updated, customer.subscription.deleted,
   invoice.payment_failed. Enable the Billing customer portal.
5. `npx wrangler deploy`

## Local dev
`npx wrangler dev` + set DEV_AUTH=1 and APP_URL=http://localhost:3000 in a
local .dev.vars (NOT committed): request-code responses then include
`devCode` (and request-link responses `devLink`) so sign-in can be tested
without an email provider. DEV_AUTH is
ignored unless APP_URL is localhost, so it can never take effect in
production. localhost is likewise only an allowed CORS origin when APP_URL
is localhost.

## Sign-in flow
The page offers "Continue with Google" (only when GOOGLE_CLIENT_ID and
GOOGLE_CLIENT_SECRET are set; GET /api/auth/methods says which) and an
emailed code as the backup. Both end in the same account for the same
email address.

### Emailed code (default)
1. POST /api/auth/request-code {email} (our own pages only; shares the
   3-per-email and 10-per-IP-per-15-minutes budget with request-link)
   stores sha256("signin-code:<email>:<code>") in signin_codes and emails
   a 6-digit code. No user row is created yet. Nothing in the email can be
   clicked, so mail scanners can't use it up, and it works when the email
   is read on a phone but the site is open on a laptop.
2. POST /api/auth/verify-code {email, code}: one UPDATE checks and spends
   the code (10-minute expiry). A wrong guess counts against every live
   code for that address; 5 wrong guesses kill them, and a new code starts
   fresh. Code checks are also capped at 60 per IP per 15 minutes. On
   success the user row is created if needed and the session cookie is set
   on the JSON response.
3. signin_codes is created by the Worker on first use if schema.sql hasn't
   been rerun yet.

### Sign in with Google
1. GET /api/auth/google/start stores a random state and PKCE verifier in a
   10-minute HttpOnly cookie (euclid_oauth) and redirects to Google with
   scope "openid email".
2. Google redirects to GET /api/auth/google/callback?code&state. The state
   must match the cookie; the code is exchanged at Google's token endpoint
   with the client secret and PKCE verifier; the ID token's iss, aud, exp
   and email_verified are checked (the token comes straight from Google
   over TLS, so its signature isn't re-verified, per OpenID Connect Core
   3.1.3.7). Then the session starts and the browser lands on /?signin=ok.
3. Google Cloud Console setup: OAuth consent screen (External, scopes
   openid and email), then Credentials → OAuth client ID → Web
   application, with authorized redirect URI
   `https://euclidengine.tech/api/auth/google/callback`.

### Magic link (older, still answered)
1. POST /api/auth/request-link (from our own pages only; limited to 3 per
   email and 10 per IP every 15 minutes) stores a hashed token in
   signin_tokens and emails the link. No user row is created yet.
2. GET /api/auth/verify?token=… only shows a "Sign in" page. School mail
   filters open every link to scan it, so the GET must not spend the token.
3. The page's button POSTs the token back; one UPDATE checks and spends it,
   then the user row is created if needed and a session cookie is set.

## Schema changes
schema.sql only uses CREATE … IF NOT EXISTS, so re-running it on the live
database adds new tables without touching existing ones:
`npx wrangler d1 execute euclid --remote --file=schema.sql`

## Notes / honest limits
- Soft gate: the Free 5/month counter is server-side per account; a user
  can register a second email. Accepted at $9 price points (spec).
- The Worker counts months in UTC; the app's anonymous local counter
  uses local time. Boundary-hour mismatch is acceptable (documented in
  src/core.ts monthKeyUTC).
- No student data anywhere in this system — teacher emails only.
