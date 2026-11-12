import React from "react";
import { color, font } from "../core/tokens";

// Shared shell for the plain legal pages (Terms / Privacy / Refunds).
// Drafts prepared for Trystan's approval before the first charge, see
// monetization-roadmap.md pre-charge checklist.

export function LegalShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: color.bg,
        color: color.text,
        padding: "48px 16px 64px",
        fontFamily: font.ui,
      }}
    >
      <div style={{ maxWidth: "68ch", margin: "0 auto" }}>
        <a href="/" style={{ color: color.textMuted, fontWeight: 500, textDecoration: "none" }}>
          ← Euclid Engine
        </a>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.02em", margin: "24px 0 8px" }}>{title}</h1>
        <p style={{ color: color.textMuted, fontWeight: 400, margin: "0 0 32px" }}>
          Last updated: November 10, 2026
        </p>
        <div style={{ lineHeight: 1.7, fontSize: "0.9375rem", color: "#d3d6e4" }}>{children}</div>
      </div>
    </main>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: "1.0625rem", fontWeight: 600, color: color.text, margin: "32px 0 8px" }}>
      {children}
    </h2>
  );
}
