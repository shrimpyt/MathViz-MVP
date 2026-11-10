import type { Metadata } from "next";

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
        background: "#14161f",
        color: "#f2f3fa",
        fontFamily: "var(--font-nunito), sans-serif",
        padding: 16,
        textAlign: "center",
      }}
    >
      <meta httpEquiv="refresh" content={`0; url=${TARGET}`} />
      <p style={{ fontWeight: 700 }}>
        Taking you to sign in…{" "}
        <a href={TARGET} style={{ color: "#818cf8" }}>
          Continue
        </a>
      </p>
    </main>
  );
}
