"use client";

import React, { useEffect, useState } from "react";
import { Box, Button, CssBaseline, Typography } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { ArrowLeft, Check } from "lucide-react";
import theme from "../../core/theme";
import { color, icon, radius, shadow, sx as ui } from "../../core/tokens";
import {
  createCheckoutUrl,
  fetchFoundersOffer,
  type CheckoutKind,
  type FoundersOffer,
} from "../../lib/account";

// Pricing copy source: goals/euclid-engine-deployment/files/pricing-page-copy.md
// (Trystan approves copy before this page ships.)

const cardSx = {
  flex: "1 1 280px",
  maxWidth: 400,
  bgcolor: color.surface,
  border: `1px solid ${color.border}`,
  borderRadius: `${radius.xl}px`,
  p: 3,
  display: "flex",
  flexDirection: "column",
} as const;

// A card's buttons sit 24px in from 24px corners; they get the standalone radius.
const buttonSx = { borderRadius: `${radius.md}px` } as const;

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <Box component="li" sx={{ display: "flex", gap: 1, alignItems: "flex-start", fontSize: "0.875rem", color: color.text, lineHeight: 1.6 }}>
      <Box component="span" sx={{ color: color.textMuted, display: "flex", pt: "3px", flexShrink: 0 }}>
        <Check size={icon.size} strokeWidth={icon.strokeWidth} aria-hidden />
      </Box>
      <span>{children}</span>
    </Box>
  );
}

const listSx = { listStyle: "none", p: 0, m: 0, display: "flex", flexDirection: "column", gap: 1 } as const;
const priceSx = { fontWeight: 700, fontSize: "2rem", letterSpacing: "-0.02em", lineHeight: 1.2 } as const;
const planNameSx = { fontWeight: 600, fontSize: "1rem", color: color.text } as const;
const noteSx = { ...ui.help, fontSize: "0.8125rem" } as const;

export default function PricingPage() {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [founders, setFounders] = useState<FoundersOffer | null>(null);

  useEffect(() => {
    void fetchFoundersOffer().then(setFounders);
  }, []);

  const checkout = async (kind: CheckoutKind) => {
    setBusy(kind);
    setMsg(null);
    const url = await createCheckoutUrl(kind);
    setBusy(null);
    if (url) {
      window.location.href = url;
      return;
    }
    if (kind === "founders") {
      const latest = await fetchFoundersOffer();
      setFounders(latest);
      if (latest && !latest.open) {
        setMsg("The Founders offer has closed. Pro annual at $79/year is the next best deal.");
        return;
      }
    }
    setMsg(
      "Checkout needs a signed-in account first: open the worksheet tool, use Sign in (top right), then come back here to upgrade.",
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box component="main" sx={{ minHeight: "100vh", bgcolor: color.bg, color: color.text, px: 2, py: { xs: 4, md: 6 } }}>
        <Box sx={{ maxWidth: 840, mx: "auto" }}>
          <Button
            href="/"
            startIcon={<ArrowLeft size={icon.size} strokeWidth={icon.strokeWidth} />}
            sx={{ mb: 4, ml: -1, px: 1 }}
          >
            Back to the worksheet tool
          </Button>
          <Typography
            component="h1"
            sx={{ fontSize: { xs: "1.75rem", md: "2.25rem" }, fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.2, mb: 2, maxWidth: "30ch" }}
          >
            Worksheets and guided notes,{" "}
            <Box component="span" sx={{ color: color.textMuted }}>
              with the accommodations built in.
            </Box>
          </Typography>
          <Typography sx={{ color: color.textMuted, fontWeight: 400, fontSize: "1rem", maxWidth: "62ch", mb: 6 }}>
            Euclid generates fresh TEKS-aligned math worksheets and guided notes,
            base versions and per-group IEP-accommodated versions that actually
            match, for middle-school math, Algebra I and II, Geometry and proofs,
            Precalculus, Calculus, and SAT practice.
          </Typography>

          {founders?.open && (
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 3,
                mb: 3,
                p: 3,
                maxWidth: 824,
                borderRadius: `${radius.xl}px`,
                border: `1px solid ${color.border}`,
              }}
            >
              <Box sx={{ flex: "1 1 320px" }}>
                <Typography sx={{ ...planNameSx, mb: 1 }}>
                  Founders: Pro for life, $150 once
                </Typography>
                <Typography sx={{ ...noteSx, fontSize: "0.875rem", maxWidth: "60ch" }}>
                  For the first 50 teachers, until January 31.{" "}
                  {founders.remaining} {founders.remaining === 1 ? "seat" : "seats"} left. One
                  teacher account, everything in Pro, for as long as Euclid Engine runs.
                </Typography>
              </Box>
              <Button
                variant="outlined"
                disabled={busy !== null}
                onClick={() => checkout("founders")}
                sx={buttonSx}
              >
                {busy === "founders" ? "Opening checkout…" : "Become a Founder, $150"}
              </Button>
            </Box>
          )}

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, mb: 3, alignItems: "stretch" }}>
            <Box sx={cardSx}>
              <Typography sx={planNameSx}>Free</Typography>
              <Typography sx={{ ...priceSx, mt: 1, mb: 3 }}>$0</Typography>
              <Box component="ul" sx={listSx}>
                <Feature>5 worksheet exports a month</Feature>
                <Feature>Algebra I and middle-school topics</Feature>
                <Feature>Watermarked PDFs, no answer keys</Feature>
              </Box>
              <Typography sx={{ ...noteSx, mt: 3 }}>
                Free is a trial, not a classroom tool, that&apos;s deliberate.
              </Typography>
              <Box sx={{ flex: 1 }} />
              <Button fullWidth href="/" sx={{ ...buttonSx, mt: 3 }}>
                Start free
              </Button>
            </Box>

            <Box sx={{ ...cardSx, bgcolor: color.bgRaised, border: `1px solid ${color.borderStrong}`, boxShadow: shadow.md }}>
              <Typography sx={planNameSx}>
                Pro{" "}
                <Box component="span" sx={{ color: color.textMuted, fontWeight: 500, fontSize: "0.875rem" }}>
                  for your classroom
                </Box>
              </Typography>
              <Typography sx={{ ...priceSx, mt: 1 }}>
                $79
                <Box component="span" sx={{ fontSize: "0.9375rem", fontWeight: 500, color: color.textMuted, letterSpacing: 0 }}>
                  /year
                </Box>
              </Typography>
              <Typography sx={{ ...noteSx, mt: 1, mb: 3 }}>
                About three months free versus monthly. Or $9/month.
              </Typography>
              <Box component="ul" sx={listSx}>
                <Feature>Unlimited generations, every topic</Feature>
                <Feature>
                  All IEP accommodations: word bank, large print, extra spacing, reduced
                  count, per-group versions with matched answer keys
                </Feature>
                <Feature>Answer keys for everything</Feature>
                <Feature>No watermark</Feature>
              </Box>
              <Typography sx={{ ...noteSx, mt: 3 }}>
                On monthly, pay only for the months you teach: billing pauses
                automatically from June 1 to August 1, and you keep Pro all summer.
              </Typography>
              <Box sx={{ flex: 1 }} />
              <Button
                fullWidth
                size="large"
                variant="contained"
                disabled={busy !== null}
                onClick={() => checkout("annual")}
                sx={{ ...buttonSx, mt: 3 }}
              >
                {busy === "annual" ? "Opening checkout…" : "Go Pro, $79/year"}
              </Button>
              <Button
                fullWidth
                variant="outlined"
                disabled={busy !== null}
                onClick={() => checkout("monthly")}
                sx={{ ...buttonSx, mt: 1 }}
              >
                {busy === "monthly" ? "Opening checkout…" : "Go Pro, $9/month"}
              </Button>
            </Box>
          </Box>

          {msg && (
            <Typography role="status" sx={{ color: color.text, fontWeight: 500, fontSize: "0.875rem", mb: 3, maxWidth: "62ch" }}>
              {msg}
            </Typography>
          )}

          <Box sx={{ mt: 6, display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography sx={{ color: color.textMuted, fontWeight: 400, fontSize: "0.9375rem" }}>
              Schools: $499/year for up to 10 teachers on one campus,{" "}
              <Box
                component="a"
                href="mailto:support@euclidengine.tech"
                sx={{ color: color.accent, textDecoration: "none", fontWeight: 500, "&:hover": { textDecoration: "underline" } }}
              >
                contact us
              </Box>
              .
            </Typography>
            <Typography sx={{ ...noteSx, maxWidth: "62ch" }}>
              14-day refund on your first payment, no questions. Teacher accounts only,
              we collect teacher emails, never student data. Support: support@euclidengine.tech
            </Typography>
          </Box>
          <Typography sx={{ color: color.textSubtle, fontWeight: 400, fontSize: "0.75rem", mt: 4 }}>
            <Box component="a" href="/terms" sx={{ color: "inherit", "&:hover": { color: color.text } }}>Terms</Box>
            {" · "}
            <Box component="a" href="/privacy" sx={{ color: "inherit", "&:hover": { color: color.text } }}>Privacy</Box>
            {" · "}
            <Box component="a" href="/refund" sx={{ color: "inherit", "&:hover": { color: color.text } }}>Refunds</Box>
          </Typography>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
