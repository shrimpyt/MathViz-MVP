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
        email address to operate your account and send sign-in codes and receipts.
        If you choose Sign in with Google, Google tells us only your verified
        email address. That is the only personal information an account requires.
      </p>
      <p>
        <strong>Plan and usage data.</strong> Your subscription plan and status,
        and a monthly count of worksheet exports (used to enforce Free-plan
        limits). For signed-in accounts we also record which topics and format
        each export used, so we can tell which lessons teachers actually run.
        We never receive or store the worksheets themselves.
      </p>
      <p>
        <strong>Payment data.</strong> Payments are processed by Stripe. We never
        see or store your card number; Stripe gives us a customer reference and
        subscription status.
      </p>
      <H2>Student data</H2>
      <p>
        Euclid does not need, ask for, or store any student data. Worksheets are
        generated and printed without student names, and accommodation groups are
        labeled anonymously. If a school uses Euclid under a school license, we act
        as a “school official” under FERPA: any education-record information we
        receive is used only to provide the service to that school, stays under
        the school’s control, and is never sold or used for advertising.
      </p>
      <H2>Who can use Euclid</H2>
      <p>
        Euclid accounts are for teachers and other educators 18 or older. Students
        do not use Euclid and cannot create accounts, and we do not knowingly
        collect personal information from anyone under 18. If you believe a
        student has created an account, email us and we will delete it.
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
        data stays on your device and is never sent to us.
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
        support@euclidengine.tech to export or delete your account data. We
        delete your email, sign-in sessions, and usage records within 30 days of
        your request, and they leave our backups within 30 days after that.
        Payment records are kept by Stripe as required for accounting.
      </p>
      <H2>Contact</H2>
      <p>support@euclidengine.tech</p>
    </LegalShell>
  );
}
