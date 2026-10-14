import React from "react";
import { H2, LegalShell } from "../legal";

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service">
      <p>
        Euclid Engine ("Euclid", "we") is a worksheet-generation tool for teachers,
        operated by Trystan Oliver (TryOlive) at euclidengine.tech. By creating an
        account or using the service, you agree to these terms.
      </p>
      <H2>Accounts</H2>
      <p>
        Accounts are for individual teachers and educators. You sign in with your
        email address via a one-time link; you are responsible for activity under
        your account. Euclid accounts are not for students, and you must not enter
        student names, student records, or other student data into the service,
        the service is designed to work without it.
      </p>
      <H2>Plans and billing</H2>
      <p>
        Free accounts may generate a limited number of watermarked exports per
        month from a limited topic set. Pro subscriptions ($9/month or $79/year)
        unlock unlimited generation, all topics, answer keys, an un-watermarked
        export, the saved library, and the IEP accommodation features.
        Subscriptions renew automatically until cancelled; you can cancel any time
        from the billing portal, and cancellation takes effect at the end of the
        current paid period. School licenses ($299/year, up to 10 named teacher
        accounts) are arranged by contacting us.
      </p>
      <H2>Your worksheets</H2>
      <p>
        Worksheets and notes you generate are yours to print, copy, and use with
        your own students, in your own classroom, without restriction. You may not
        resell generated worksheets as standalone products or use the service to
        build a competing worksheet library for redistribution.
      </p>
      <H2>Acceptable use</H2>
      <p>
        Don't abuse the service (automated bulk generation outside normal
        classroom use, attempts to bypass plan limits, or interference with the
        service). We may suspend accounts that do.
      </p>
      <H2>Service and liability</H2>
      <p>
        The service is provided "as is". Generated problems are produced by
        verified algorithms, but you are responsible for reviewing materials
        before classroom use. To the extent permitted by law, our liability is
        limited to the amounts you paid us in the preceding 12 months.
      </p>
      <H2>Changes and contact</H2>
      <p>
        We may update these terms; material changes will be announced on this page
        with a new date. Questions: support@euclidengine.tech.
      </p>
    </LegalShell>
  );
}
