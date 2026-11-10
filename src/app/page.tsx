"use client";

import { useEffect, useState } from "react";
import { Alert, Box, CssBaseline, Link, Typography } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import WorksheetGenerator from "../components/WorksheetGenerator";
import theme from "../core/theme";

const linkSx = { color: "#9aa0be", fontWeight: 700, textDecoration: "none", "&:hover": { color: "#818cf8" } } as const;

type SignInResult = "ok" | "failed" | null;

export default function Home() {
  // The sign-in page sends people back here with ?signin=ok or ?signin=failed.
  // Read it once, then take it off the address so a reload doesn't repeat it.
  const [signIn, setSignIn] = useState<SignInResult>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get("signin");
    if (v !== "ok" && v !== "failed") return;
    // A one-time read of the address after mount; the static page can't know
    // it at build time, so this can't be initial state without a mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSignIn(v);
    params.delete("signin");
    const rest = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (rest ? `?${rest}` : "") + window.location.hash);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box 
        sx={{ 
          display: "flex", 
          flexDirection: "column", 
          height: "100vh",
          "@supports (height: 100dvh)": { height: "100dvh" },
          background: '#14161f',
        }}
      >
        {/* Intro: what Euclid is, real sample PDFs, and where to read more. */}
        <Box
          component="header"
          sx={{
            flexShrink: 0,
            borderBottom: "1px solid #2c3247",
            px: { xs: 2, md: 4 },
            py: 1.25,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Typography component="h1" sx={{ color: "#f2f3fa", fontWeight: 700, fontSize: { xs: "0.85rem", md: "0.95rem" }, maxWidth: 720 }}>
            Fresh, printable math worksheets with answer keys you can trust, plus matched IEP versions, built by a classroom teacher.
          </Typography>
          <Box component="nav" sx={{ display: "flex", flexWrap: "wrap", gap: 2, fontSize: "0.8rem" }}>
            <Link href="/samples/geometry-worksheet-sample.pdf" target="_blank" rel="noopener" sx={linkSx}>
              Sample: Geometry worksheet
            </Link>
            <Link href="/samples/algebra-2-test-sample.pdf" target="_blank" rel="noopener" sx={linkSx}>
              Sample: Algebra II test
            </Link>
            <Link href="/pricing" sx={linkSx}>Pricing</Link>
          </Box>
        </Box>

        {signIn && (
          <Alert
            severity={signIn === "ok" ? "success" : "warning"}
            onClose={() => setSignIn(null)}
            sx={{ flexShrink: 0, borderRadius: 0 }}
          >
            {signIn === "ok"
              ? "You're signed in."
              : "That sign-in link has expired or was already used. Use Sign in to get a new one."}
          </Alert>
        )}

        <WorksheetGenerator />

        <Box
          component="footer"
          sx={{
            flexShrink: 0,
            borderTop: "1px solid #2c3247",
            px: { xs: 2, md: 4 },
            py: 0.75,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 2.5,
            fontSize: "0.75rem",
          }}
        >
          <Link href="/pricing" sx={linkSx}>Pricing</Link>
          <Link href="/terms" sx={linkSx}>Terms</Link>
          <Link href="/privacy" sx={linkSx}>Privacy</Link>
          <Link href="/refund" sx={linkSx}>Refunds</Link>
          <Link href="mailto:support@euclidengine.tech" sx={linkSx}>support@euclidengine.tech</Link>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
