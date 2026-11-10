"use client";

// Saved worksheets (Pro library). Each saved worksheet is its settings and
// seed; "Open" loads them into the generator (/?open=<id>), which rebuilds
// the exact same problems and answer key. Listing, renaming and deleting
// work on any plan, so a teacher whose Pro lapses can still tidy up; saving
// and opening are Pro.

import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, CssBaseline, IconButton, TextField, Tooltip, Typography } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import NextLink from "next/link";
import { Check, Close, DeleteOutline, Edit, OpenInNew } from "@mui/icons-material";
import theme from "../../core/theme";
import {
  deleteSavedWorksheet,
  listSavedWorksheets,
  renameSavedWorksheet,
  type SavedLibrary,
  type SavedWorksheet,
} from "../../lib/account";
import { entriesForSettings, generateFromSettings, sanitizeSettings } from "../../lib/worksheetSettings";

const FORMAT_LABELS: Record<string, string> = {
  worksheet: "Worksheet",
  "guided-notes": "Guided notes",
  review: "Review",
  test: "Test",
  "classical-notes": "Classical notes",
  "proof-two-column": "Two-column proofs",
  "proof-fill-reasons": "Proofs, fill in the blanks",
  "proof-elements": "Elements proofs",
  "proof-blank": "Proofs, blank workspace",
  "sat-practice": "SAT practice",
};

const cardSx = {
  bgcolor: "#1e2233",
  border: "1.5px solid #2c3247",
  borderRadius: "16px",
  px: 2.5,
  py: 2,
} as const;

function describe(item: SavedWorksheet): string {
  const s = sanitizeSettings(item.settings);
  if (!s) return "These settings can't be read.";
  const entries = entriesForSettings(s);
  if (entries.length === 0) return "Its topics are no longer offered.";
  let problems = 0;
  try {
    problems = generateFromSettings(s).reduce((n, set) => n + set.length, 0);
  } catch {
    problems = 0;
  }
  const first = entries[0].title;
  const topics = entries.length === 1 ? first : `${first} + ${entries.length - 1} more`;
  const parts = [FORMAT_LABELS[s.docType] ?? s.docType, topics];
  if (problems > 0) parts.push(`${problems} problem${problems === 1 ? "" : "s"}`);
  parts.push(`seed ${s.seed}`);
  return parts.join(" · ");
}

function savedOn(sec: number): string {
  return new Date(sec * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function SavedWorksheetsPage() {
  const [lib, setLib] = useState<SavedLibrary | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    listSavedWorksheets().then((l) => {
      if (live) setLib(l);
    });
    return () => {
      live = false;
    };
  }, []);

  const items = useMemo(() => (lib?.status === "ok" ? lib.items : []), [lib]);
  const pro = lib?.status === "ok" && lib.pro;
  // Describing a worksheet rebuilds it to count problems, so do it once per
  // list, not on every keystroke while renaming.
  const descriptions = useMemo(() => new Map(items.map((w) => [w.id, describe(w)])), [items]);

  const setItems = (next: SavedWorksheet[]) =>
    setLib((l) => (l && l.status === "ok" ? { ...l, items: next } : l));

  const writeError = (e: string) =>
    e === "rate_limited"
      ? "Too many changes in a short time. Wait a few minutes and try again."
      : e === "signed-out"
        ? "You are signed out. Sign in again on the worksheet page."
        : e === "not_found"
          ? "That saved worksheet is already gone."
          : e === "invalid"
            ? "Names need 1 to 80 characters."
            : "That didn't go through. Try again in a moment.";

  const rename = async (id: string) => {
    const name = draftName.trim();
    if (!name) return;
    setBusy(true);
    const r = await renameSavedWorksheet(id, name);
    setBusy(false);
    if (r.ok) {
      setItems(items.map((w) => (w.id === id ? { ...w, name: r.value } : w)));
      setEditing(null);
      setMsg(null);
    } else {
      setMsg(writeError(r.error));
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    const r = await deleteSavedWorksheet(id);
    setBusy(false);
    setConfirmDelete(null);
    if (r.ok || r.error === "not_found") {
      setItems(items.filter((w) => w.id !== id));
      setMsg(null);
    } else {
      setMsg(writeError(r.error));
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box component="main" sx={{ minHeight: "100vh", bgcolor: "#14161f", color: "#f2f3fa", px: 2.5, pt: 5, pb: 8 }}>
        <Box sx={{ maxWidth: 760, mx: "auto" }}>
          <NextLink href="/" style={{ color: "#9aa0be", fontWeight: 700, textDecoration: "none" }}>
            ← Euclid Engine
          </NextLink>
          <Typography component="h1" sx={{ fontSize: "1.9rem", fontWeight: 900, mt: 2.25, mb: 0.75 }}>
            Saved worksheets
          </Typography>
          <Typography sx={{ color: "#9aa0be", fontWeight: 600, mb: 3, fontSize: "0.92rem" }}>
            Each one rebuilds the exact same problems and answer key from its settings and seed.
          </Typography>

          {msg && (
            <Alert severity="error" onClose={() => setMsg(null)} sx={{ mb: 2 }}>
              {msg}
            </Alert>
          )}

          {lib === null && <Typography sx={{ color: "#9aa0be" }}>Loading…</Typography>}

          {lib?.status === "signed-out" && (
            <Alert severity="info" action={<Button color="inherit" size="small" href="/" sx={{ fontWeight: 800 }}>Sign in</Button>}>
              Sign in on the worksheet page (top right) to see your saved worksheets.
            </Alert>
          )}
          {(lib?.status === "unavailable" || lib?.status === "rate_limited") && (
            <Alert severity="warning">Your library can&apos;t be reached right now. Try again in a moment.</Alert>
          )}

          {lib?.status === "ok" && !pro && (
            <Alert
              severity="info"
              action={<Button color="inherit" size="small" href="/pricing" sx={{ fontWeight: 800 }}>See Pro</Button>}
              sx={{ mb: 2 }}
            >
              {items.length > 0
                ? "Your saved worksheets are kept. Opening and saving them is part of Pro."
                : "Saved worksheets are part of Pro. Save a worksheet once, then reprint the exact same problems and answer key next year."}
            </Alert>
          )}

          {lib?.status === "ok" && pro && items.length === 0 && (
            <Box sx={cardSx}>
              <Typography sx={{ fontWeight: 800, mb: 0.5 }}>Nothing saved yet</Typography>
              <Typography sx={{ color: "#9aa0be", fontSize: "0.88rem" }}>
                Build a worksheet, then use Save to library on the Review step.
              </Typography>
            </Box>
          )}

          {items.length > 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
              {items.map((w) => (
                <Box key={w.id} sx={{ ...cardSx, display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                  <Box sx={{ flex: "1 1 280px", minWidth: 0 }}>
                    {editing === w.id ? (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <TextField
                          autoFocus
                          size="small"
                          fullWidth
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value.slice(0, 80))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void rename(w.id);
                            if (e.key === "Escape") setEditing(null);
                          }}
                          inputProps={{ "aria-label": "New name" }}
                        />
                        <IconButton aria-label="Save name" disabled={busy || !draftName.trim()} onClick={() => void rename(w.id)} sx={{ color: "#818cf8" }}>
                          <Check />
                        </IconButton>
                        <IconButton aria-label="Cancel rename" onClick={() => setEditing(null)} sx={{ color: "#9aa0be" }}>
                          <Close />
                        </IconButton>
                      </Box>
                    ) : (
                      <Typography sx={{ fontWeight: 800, overflowWrap: "anywhere" }}>{w.name}</Typography>
                    )}
                    <Typography sx={{ color: "#9aa0be", fontSize: "0.8rem", fontWeight: 600, mt: 0.25 }}>
                      {descriptions.get(w.id)}
                    </Typography>
                    <Typography sx={{ color: "#6f7590", fontSize: "0.74rem", fontWeight: 600 }}>
                      Saved {savedOn(w.createdAt)}
                    </Typography>
                  </Box>

                  {confirmDelete === w.id ? (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography sx={{ fontSize: "0.82rem", fontWeight: 700 }}>Delete it?</Typography>
                      <Button size="small" color="error" variant="contained" disabled={busy} onClick={() => void remove(w.id)}>
                        Delete
                      </Button>
                      <Button size="small" onClick={() => setConfirmDelete(null)} sx={{ color: "#9aa0be" }}>
                        Keep
                      </Button>
                    </Box>
                  ) : (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Tooltip title={pro ? "Rebuild it in the generator" : "Opening saved worksheets is part of Pro"} arrow>
                        <span>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<OpenInNew />}
                            disabled={!pro}
                            href={`/?open=${w.id}`}
                            sx={{ borderRadius: "10px", fontWeight: 800 }}
                          >
                            Open
                          </Button>
                        </span>
                      </Tooltip>
                      <Tooltip title="Rename" arrow>
                        <IconButton
                          aria-label={`Rename ${w.name}`}
                          onClick={() => {
                            setEditing(w.id);
                            setDraftName(w.name);
                            setConfirmDelete(null);
                          }}
                          sx={{ color: "#9aa0be" }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete" arrow>
                        <IconButton
                          aria-label={`Delete ${w.name}`}
                          onClick={() => {
                            setConfirmDelete(w.id);
                            setEditing(null);
                          }}
                          sx={{ color: "#9aa0be" }}
                        >
                          <DeleteOutline fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                </Box>
              ))}
              {lib?.status === "ok" && (
                <Typography sx={{ color: "#6f7590", fontSize: "0.74rem", fontWeight: 600, mt: 0.5 }}>
                  {items.length} of {lib.limit} saved
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
