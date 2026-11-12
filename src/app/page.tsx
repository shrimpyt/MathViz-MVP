"use client";

import { useEffect, useState } from "react";
import { Box, CssBaseline, Link, Typography } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import WorksheetGenerator from "../components/WorksheetGenerator";
import ToastStack from "../components/ToastStack";
import theme from "../core/theme";
import { color, motion } from "../core/tokens";

const linkSx = {
  color: color.textMuted,
  fontWeight: 500,
  textDecoration: "none",
  transition: `color ${motion.exit}ms ${motion.easeOut}`,
  "&:hover": { color: color.text },
} as const;

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
          bgcolor: color.bg,
        }}
      >
        {/* Intro: what Euclid is, real sample PDFs, and where to read more. */}
        <Box
          component="header"
          sx={{
            flexShrink: 0,
            borderBottom: `1px solid ${color.border}`,
            px: { xs: 2, md: 3 },
            py: 1,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            columnGap: 3,
            rowGap: 1,
          }}
        >
          <Typography component="h1" sx={{ color: color.textMuted, fontWeight: 500, fontSize: "0.8125rem", lineHeight: 1.5, maxWidth: "70ch" }}>
            Fresh, printable math worksheets with answer keys you can trust, plus matched IEP versions, built by a classroom teacher.
          </Typography>
          <Box component="nav" aria-label="Samples" sx={{ display: "flex", flexWrap: "wrap", gap: 3, fontSize: "0.8125rem" }}>
            <Link href="/samples/geometry-worksheet-sample.pdf" target="_blank" rel="noopener" sx={linkSx}>
              Sample: Geometry worksheet
            </Link>
            <Link href="/samples/algebra-2-test-sample.pdf" target="_blank" rel="noopener" sx={linkSx}>
              Sample: Algebra II test
            </Link>
          </Box>
        </Box>

        <ToastStack
          toasts={
            signIn
              ? [
                  {
                    key: `signin-${signIn}`,
                    severity: signIn === "ok" ? "success" : "warning",
                    onClose: () => setSignIn(null),
                    text:
                      signIn === "ok"
                        ? "You're signed in."
                        : "That sign-in didn't go through. Use Sign in to try again.",
                  },
                ]
              : []
          }
        />

        <WorksheetGenerator />

        <Box
          component="footer"
          sx={{
            flexShrink: 0,
            borderTop: `1px solid ${color.border}`,
            px: { xs: 2, md: 3 },
            py: 1,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            columnGap: 3,
            rowGap: 1,
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
