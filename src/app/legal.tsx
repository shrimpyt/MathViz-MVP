import React from "react";

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
        background: "#14161f",
        color: "#f2f3fa",
        padding: "40px 20px 64px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <a href="/" style={{ color: "#9aa0be", fontWeight: 700, textDecoration: "none" }}>
          ← Euclid Engine
        </a>
        <h1 style={{ fontSize: "1.9rem", fontWeight: 900, margin: "18px 0 6px" }}>{title}</h1>
        <p style={{ color: "#9aa0be", fontWeight: 600, margin: "0 0 28px" }}>
          Last updated: October 13, 2026
        </p>
        <div style={{ lineHeight: 1.65, fontSize: "0.95rem", color: "#d7d9e4" }}>{children}</div>
      </div>
    </main>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#f2f3fa", margin: "26px 0 8px" }}>
      {children}
    </h2>
  );
}
