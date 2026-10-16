// Worker core tests (pay gate). Independent of the app suites: exercises the
// pure decision logic in worker/src/core.ts, plan entitlement, the Free
// counter rule, Stripe webhook signature verification, and the event →
// user-update reducer. Run: npx tsx tests/paygate/run-worker-tests.ts

import {
  FREE_GENERATION_LIMIT,
  effectivePlan,
  generationAllowed,
  hmacSha256Hex,
  monthKeyUTC,
  planUpdateFromStripeEvent,
  sha256Hex,
  validateExportEvent,
  verifyStripeSignature,
} from "../../worker/src/core";

let checks = 0;
let failures = 0;
function ck(label: string, ok: boolean) {
  checks++;
  if (!ok) {
    failures++;
    console.log(`  ✗ ${label}`);
  }
}
function eq<T>(label: string, got: T, want: T) {
  ck(`${label} (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`, got === want);
}

async function main() {
  // sha256 known vector
  eq(
    "sha256('abc')",
    await sha256Hex("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );

  // month key
  eq("monthKeyUTC Jan", monthKeyUTC(new Date(Date.UTC(2026, 0, 5))), "2026-01");
  eq("monthKeyUTC Dec", monthKeyUTC(new Date(Date.UTC(2026, 11, 31))), "2026-12");

  // entitlement matrix
  const now = 1_800_000_000;
  const base = { plan: "free", subscriptionStatus: null, currentPeriodEnd: null, founders: false };
  eq("free stays free", effectivePlan(base, now), "free");
  eq("pro active", effectivePlan({ ...base, plan: "pro", subscriptionStatus: "active" }, now), "pro");
  eq("pro trialing", effectivePlan({ ...base, plan: "pro", subscriptionStatus: "trialing" }, now), "pro");
  eq("school active", effectivePlan({ ...base, plan: "school", subscriptionStatus: "active" }, now), "pro");
  eq(
    "past_due inside paid period (grace)",
    effectivePlan({ ...base, plan: "pro", subscriptionStatus: "past_due", currentPeriodEnd: now + 100 }, now),
    "pro",
  );
  eq(
    "past_due past period end",
    effectivePlan({ ...base, plan: "pro", subscriptionStatus: "past_due", currentPeriodEnd: now - 100 }, now),
    "free",
  );
  eq("canceled", effectivePlan({ ...base, plan: "pro", subscriptionStatus: "canceled", currentPeriodEnd: now + 100 }, now), "free");
  eq("founders overrides canceled", effectivePlan({ ...base, founders: true, subscriptionStatus: "canceled" }, now), "pro");

  // counter rule
  eq("free at limit-1 allowed", generationAllowed("free", FREE_GENERATION_LIMIT - 1), true);
  eq("free at limit blocked", generationAllowed("free", FREE_GENERATION_LIMIT), false);
  eq("pro unlimited", generationAllowed("pro", 9999), true);

  // Stripe signature verification
  const secret = "whsec_test_123";
  const payload = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
  const t = 1_800_000_000;
  const sig = await hmacSha256Hex(secret, `${t}.${payload}`);
  const header = `t=${t},v1=${sig}`;
  eq("valid signature", await verifyStripeSignature(payload, header, secret, t + 60), true);
  eq("tampered body rejected", await verifyStripeSignature(payload + " ", header, secret, t + 60), false);
  eq("wrong secret rejected", await verifyStripeSignature(payload, header, "whsec_other", t + 60), false);
  eq("stale timestamp rejected", await verifyStripeSignature(payload, header, secret, t + 3600), false);
  eq("garbage header rejected", await verifyStripeSignature(payload, "nonsense", secret, t), false);
  eq(
    "second v1 accepted",
    await verifyStripeSignature(payload, `t=${t},v1=deadbeef,v1=${sig}`, secret, t + 10),
    true,
  );

  // event reducer
  const foundersEvt = planUpdateFromStripeEvent({
    type: "checkout.session.completed",
    data: {
      object: {
        client_reference_id: "user1",
        customer: "cus_1",
        metadata: { user_id: "user1", kind: "founders" },
      },
    },
  });
  ck("checkout founders → userId lookup", foundersEvt?.by === "userId" && foundersEvt?.key === "user1");
  ck("checkout founders sets flag", foundersEvt?.update.founders === true && foundersEvt?.update.plan === "pro");

  const monthlyEvt = planUpdateFromStripeEvent({
    type: "checkout.session.completed",
    data: { object: { client_reference_id: "user2", customer: "cus_2", metadata: { kind: "monthly" } } },
  });
  ck("checkout monthly → pro/active", monthlyEvt?.update.plan === "pro" && monthlyEvt?.update.subscriptionStatus === "active");

  const updEvt = planUpdateFromStripeEvent({
    type: "customer.subscription.updated",
    data: {
      object: {
        customer: "cus_9",
        status: "past_due",
        items: { data: [{ current_period_end: 1_800_100_000 }] },
      },
    },
  });
  ck(
    "subscription.updated reads items period end",
    updEvt?.by === "customerId" && updEvt?.update.currentPeriodEnd === 1_800_100_000 && updEvt?.update.subscriptionStatus === "past_due",
  );

  const delEvt = planUpdateFromStripeEvent({
    type: "customer.subscription.deleted",
    data: { object: { customer: "cus_9" } },
  });
  ck("subscription.deleted → free", delEvt?.update.plan === "free" && delEvt?.update.subscriptionStatus === "canceled");

  const failEvt = planUpdateFromStripeEvent({
    type: "invoice.payment_failed",
    data: { object: { customer: "cus_9" } },
  });
  ck("invoice.payment_failed → past_due", failEvt?.update.subscriptionStatus === "past_due");

  eq(
    "unhandled event → null",
    planUpdateFromStripeEvent({ type: "ping", data: { object: {} } }),
    null,
  );

  // export telemetry validation
  const good = validateExportEvent({
    type: "export",
    topics: ["ms7-3-2-angle-pairs", "a1-5-2-systems"],
    docType: "worksheet",
    problems: 10,
    versions: 2,
  });
  ck("export event: valid payload accepted", good !== null);
  eq("export event: topics kept", JSON.stringify(good?.topics), JSON.stringify(["ms7-3-2-angle-pairs", "a1-5-2-systems"]));
  eq("export event: problems", good?.problems, 10);
  eq("export event: versions", good?.versions, 2);
  eq("export event: wrong type rejected", validateExportEvent({ type: "click", topics: [] }), null);
  eq("export event: topics must be an array", validateExportEvent({ type: "export", topics: "x" }), null);
  eq("export event: null body rejected", validateExportEvent(null), null);
  const clamped = validateExportEvent({ type: "export", topics: [], problems: 1e9, versions: 0 });
  eq("export event: problems clamped", clamped?.problems, 100000);
  eq("export event: versions floored at 1", clamped?.versions, 1);
  const filtered = validateExportEvent({ type: "export", topics: ["ok", 42, "", "x".repeat(200)] });
  eq("export event: bad topic entries dropped", JSON.stringify(filtered?.topics), JSON.stringify(["ok"]));
  eq("export event: docType defaults", filtered?.docType, "worksheet");

  console.log(`run-worker-tests: ${checks} checks, ${failures} failures`);
  if (failures > 0) process.exit(1);
}

void main();
