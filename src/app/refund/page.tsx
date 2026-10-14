import React from "react";
import { H2, LegalShell } from "../legal";

export default function RefundPage() {
  return (
    <LegalShell title="Refund Policy">
      <H2>First payment: 14 days, no questions</H2>
      <p>
        If Euclid isn't for you, email support@euclidengine.tech within 14 days
        of your first Pro or School payment and we will refund it in full. No
        forms, no exit interview.
      </p>
      <H2>After that</H2>
      <p>
        Subscriptions can be cancelled any time from the billing portal;
        cancellation stops the next renewal and Pro stays active until the end
        of the period you already paid for. Renewal payments are not refunded
        except where the law requires it, but if a renewal genuinely surprised
        you, email us and we will make it right.
      </p>
      <H2>How refunds are paid</H2>
      <p>
        Refunds go back to the original payment method through Stripe and
        typically arrive within 5–10 business days depending on your bank.
      </p>
      <H2>Contact</H2>
      <p>support@euclidengine.tech</p>
    </LegalShell>
  );
}
