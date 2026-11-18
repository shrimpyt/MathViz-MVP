import type { Metadata } from "next";
import { color, font } from "../../core/tokens";

// /login used to be a 404. Sign-in lives in the worksheet tool's header menu,
// so this page sends people there with the menu open (?signin=open). It works
// without JavaScript too: the refresh tag redirects, and the link is there if
// a browser ignores it.

export const metadata: Metadata = {
  title: "Sign in | Euclid Engine",
  robots: { index: false },
};

const TARGET = "/?signin=open";

export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: color.bg,
        color: color.text,
        fontFamily: font.ui,
        padding: 16,
        textAlign: "center",
      }}
    >
      <meta httpEquiv="refresh" content={`0; url=${TARGET}`} />
      <p style={{ fontWeight: 500, color: color.textMuted }}>
        Taking you to sign in…{" "}
        <a href={TARGET} style={{ color: color.accent, fontWeight: 600 }}>
          Continue
        </a>
      </p>
    </main>
  );
}
