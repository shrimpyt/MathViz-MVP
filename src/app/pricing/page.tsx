"use client";

import React, { useState } from "react";
import { Box, Button, CssBaseline, Typography } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import theme from "../../core/theme";
import { createCheckoutUrl, type CheckoutKind } from "../../lib/account";

// Pricing copy source: goals/euclid-engine-deployment/files/pricing-page-copy.md
// (Trystan approves copy before this page ships.)

const cardSx = {
  flex: "1 1 260px",
  maxWidth: 360,
  bgcolor: "#1e2233",
  border: "1.5px solid #2c3247",
  borderRadius: "20px",
  p: 3,
} as const;

const liSx = { fontSize: "0.85rem", color: "#c6c9da", fontWeight: 600, mb: 0.75 } as const;

export default function PricingPage() {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const checkout = async (kind: CheckoutKind) => {
    setBusy(kind);
    setMsg(null);
    const url = await createCheckoutUrl(kind);
    setBusy(null);
    if (url) {
      window.location.href = url;
    } else {
      setMsg(
        "Checkout needs a signed-in account first: open the worksheet tool, use Sign in (top right), then come back here to upgrade.",
      );
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: "100vh", bgcolor: "#14161f", color: "#f2f3fa", px: 2, py: 5 }}>
        <Box sx={{ maxWidth: 900, mx: "auto" }}>
          <Button href="/" sx={{ color: "#9aa0be", fontWeight: 800, mb: 2 }}>
            ← Back to the worksheet tool
          </Button>
          <Typography sx={{ fontSize: { xs: "1.7rem", md: "2.3rem" }, fontWeight: 900, lineHeight: 1.15, mb: 1.5 }}>
            Worksheets and guided notes,{" "}
            <Box component="span" sx={{ color: "#818cf8" }}>
              with the accommodations built in.
            </Box>
          </Typography>
          <Typography sx={{ color: "#9aa0be", fontWeight: 600, maxWidth: 640, mb: 4 }}>
            Euclid generates fresh TEKS-aligned math worksheets, base versions and
            per-group IEP-accommodated versions that actually match, for Algebra I,
            Algebra II, Geometry, and middle-school math.
          </Typography>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2.5, mb: 3 }}>
            <Box sx={cardSx}>
              <Typography sx={{ fontWeight: 900, fontSize: "1.1rem", mb: 0.5 }}>Free</Typography>
              <Typography sx={{ fontWeight: 900, fontSize: "1.8rem", mb: 1.5 }}>$0</Typography>
              <Typography sx={liSx}>· 5 worksheet exports a month</Typography>
              <Typography sx={liSx}>· Algebra I and middle-school topics</Typography>
              <Typography sx={liSx}>· Watermarked PDFs, no answer keys</Typography>
              <Typography sx={{ ...liSx, mt: 1.5, color: "#9aa0be" }}>
                Free is a trial, not a classroom tool, that's deliberate.
              </Typography>
              <Button fullWidth variant="outlined" href="/" sx={{ mt: 2, borderRadius: "12px", borderColor: "#2c3247", color: "#f2f3fa", fontWeight: 800 }}>
                Start free
              </Button>
            </Box>

            <Box sx={{ ...cardSx, border: "1.5px solid #818cf8", boxShadow: "0 8px 32px rgba(129,140,248,.25)" }}>
              <Typography sx={{ fontWeight: 900, fontSize: "1.1rem", mb: 0.5 }}>
                Pro <Box component="span" sx={{ color: "#fb923c", fontSize: "0.75rem", letterSpacing: 0.8 }}>FOR YOUR CLASSROOM</Box>
              </Typography>
              <Typography sx={{ fontWeight: 900, fontSize: "1.8rem", mb: 1.5 }}>
                $9<Box component="span" sx={{ fontSize: "0.9rem", color: "#9aa0be" }}>/mo</Box>{" "}
                <Box component="span" sx={{ fontSize: "0.95rem", color: "#9aa0be" }}>or $79/yr</Box>
              </Typography>
              <Typography sx={liSx}>· Unlimited generations, every topic</Typography>
              <Typography sx={liSx}>
                · All IEP accommodations: word bank, large print, extra spacing, reduced
                count, per-group versions with matched answer keys
              </Typography>
              <Typography sx={liSx}>· Answer keys for everything</Typography>
              <Typography sx={liSx}>· No watermark</Typography>
              <Typography sx={liSx}>· Saved library of your worksheets</Typography>
              <Typography sx={{ ...liSx, mt: 1.5, color: "#9aa0be" }}>
                $79/year is about two months free versus monthly.
              </Typography>
              <Button
                fullWidth
                variant="contained"
                color="secondary"
                disabled={busy !== null}
                onClick={() => checkout("monthly")}
                sx={{ mt: 2, borderRadius: "12px", fontWeight: 800 }}
              >
                {busy === "monthly" ? "Opening checkout…" : "Go Pro, $9/month"}
              </Button>
              <Button
                fullWidth
                variant="outlined"
                disabled={busy !== null}
                onClick={() => checkout("annual")}
                sx={{ mt: 1, borderRadius: "12px", borderColor: "#2c3247", color: "#f2f3fa", fontWeight: 800 }}
              >
                {busy === "annual" ? "Opening checkout…" : "Go Pro, $79/year"}
              </Button>
            </Box>
          </Box>

          {msg && (
            <Typography sx={{ color: "#fb923c", fontWeight: 700, fontSize: "0.85rem", mb: 3, maxWidth: 640 }}>
              {msg}
            </Typography>
          )}

          <Typography sx={{ color: "#9aa0be", fontWeight: 700, mb: 1 }}>
            Schools: $299/year for up to 10 teachers,{" "}
            <Box
              component="a"
              href="mailto:support@euclidengine.tech"
              sx={{ color: "#818cf8" }}
            >
              contact us
            </Box>
            .
          </Typography>
          <Typography sx={{ color: "#9aa0be", fontWeight: 600, fontSize: "0.8rem", maxWidth: 640 }}>
            14-day refund on your first payment, no questions. Teacher accounts only,
            we collect teacher emails, never student data. Support: support@euclidengine.tech
          </Typography>
          <Typography sx={{ color: "#5b6076", fontWeight: 600, fontSize: "0.75rem", mt: 3 }}>
            <Box component="a" href="/terms" sx={{ color: "inherit" }}>Terms</Box>
            {" · "}
            <Box component="a" href="/privacy" sx={{ color: "inherit" }}>Privacy</Box>
            {" · "}
            <Box component="a" href="/refund" sx={{ color: "inherit" }}>Refunds</Box>
          </Typography>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
