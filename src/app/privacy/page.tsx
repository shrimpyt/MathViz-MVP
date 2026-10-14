import React from "react";
import { H2, LegalShell } from "../legal";

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy">
      <p>
        Euclid Engine is built for teachers, and it is designed so that student
        data never enters the system. This policy says exactly what we collect,
        it is a short list on purpose.
      </p>
      <H2>What we collect</H2>
      <p>
        <strong>Teacher account email.</strong> When you sign in, we store your
        email address to operate your account and send sign-in links and receipts.
        That is the only personal information an account requires.
      </p>
      <p>
        <strong>Plan and usage data.</strong> Your subscription plan and status,
        and a monthly count of worksheet exports (used to enforce Free-plan
        limits). Worksheet settings you save in your library are stored with your
        account.
      </p>
      <p>
        <strong>Payment data.</strong> Payments are processed by Stripe. We never
        see or store your card number; Stripe gives us a customer reference and
        subscription status.
      </p>
      <H2>What we never collect</H2>
      <p>
        No student accounts. No student names, grades, records, or work. No
        classroom rosters. Accommodation groups in Euclid are anonymous by
        design (Group A, Group B) and contain no student information. Please do
        not type student information into the tool.
      </p>
      <H2>Cookies</H2>
      <p>
        One functional cookie keeps you signed in. Browser local storage on your
        own device may hold your drafts and anonymous accommodation groups; that
        data stays on your device unless you sign in and save it.
      </p>
      <H2>Sharing</H2>
      <p>
        We do not sell personal information. We share data only with the
        processors that run the service: Stripe (payments), Resend (sign-in and
        receipt email), and Cloudflare (hosting). Sign-in and receipt emails are
        the only emails we send; there is no marketing list.
      </p>
      <H2>Retention and your rights</H2>
      <p>
        Account data is kept while your account is active. Email
        support@euclidengine.tech to export or delete your account data; deletion
        removes your email, library, and usage records (payment records are kept
        by Stripe as required for accounting).
      </p>
      <H2>Contact</H2>
      <p>support@euclidengine.tech</p>
    </LegalShell>
  );
}
