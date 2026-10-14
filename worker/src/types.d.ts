// Minimal ambient types for the Cloudflare runtime pieces this Worker uses.
// Deliberately hand-written so the repo needs no @cloudflare/workers-types
// dependency; wrangler provides the real runtime.

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<{ success: boolean }>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface Env {
  DB: D1Database;
  APP_URL?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  RESEND_API_KEY?: string;
  PRICE_PRO_MONTHLY?: string;
  PRICE_PRO_ANNUAL?: string;
  PRICE_SCHOOL?: string;
  PRICE_FOUNDERS?: string;
  /** "1" in local dev only: request-link responses include the sign-in URL
   *  so the flow can be tested without an email provider. Never in prod. */
  DEV_AUTH?: string;
}
