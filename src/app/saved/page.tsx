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
import { ArrowLeft, Check, ExternalLink, Pencil, Trash2, X } from "lucide-react";
import theme from "../../core/theme";
import { color, icon, radius } from "../../core/tokens";
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

// One row per saved worksheet: a quiet list, separated by hairlines.
const cardSx = {
  borderBottom: `1px solid ${color.border}`,
  px: 1,
  py: 2,
} as const;

const iconProps = { size: icon.size, strokeWidth: icon.strokeWidth } as const;

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
      <Box component="main" sx={{ minHeight: "100vh", bgcolor: color.bg, color: color.text, px: 2, pt: { xs: 4, md: 6 }, pb: 6 }}>
        <Box sx={{ maxWidth: 760, mx: "auto" }}>
          <Button
            component={NextLink}
            href="/"
            startIcon={<ArrowLeft {...iconProps} />}
            sx={{ ml: -1, px: 1 }}
          >
            Euclid Engine
          </Button>
          <Typography component="h1" sx={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.02em", mt: 3, mb: 1 }}>
            Saved worksheets
          </Typography>
          <Typography sx={{ color: color.textMuted, fontWeight: 400, mb: 4, fontSize: "0.9375rem", maxWidth: "62ch" }}>
            Each one rebuilds the exact same problems and answer key from its settings and seed.
          </Typography>

          {msg && (
            <Alert severity="error" onClose={() => setMsg(null)} sx={{ mb: 2 }}>
              {msg}
            </Alert>
          )}

          {lib === null && <Typography sx={{ color: color.textMuted }}>Loading…</Typography>}

          {lib?.status === "signed-out" && (
            <Alert severity="info" action={<Button color="inherit" size="small" href="/">Sign in</Button>}>
              Sign in on the worksheet page (top right) to see your saved worksheets.
            </Alert>
          )}
          {(lib?.status === "unavailable" || lib?.status === "rate_limited") && (
            <Alert severity="warning">Your library can&apos;t be reached right now. Try again in a moment.</Alert>
          )}

          {lib?.status === "ok" && !pro && (
            <Alert
              severity="info"
              action={<Button color="inherit" size="small" href="/pricing">See Pro</Button>}
              sx={{ mb: 2 }}
            >
              {items.length > 0
                ? "Your saved worksheets are kept. Opening and saving them is part of Pro."
                : "Saved worksheets are part of Pro. Save a worksheet once, then reprint the exact same problems and answer key next year."}
            </Alert>
          )}

          {lib?.status === "ok" && pro && items.length === 0 && (
            <Box sx={{ py: 6, textAlign: "center", border: `1px dashed ${color.borderStrong}`, borderRadius: `${radius.lg}px` }}>
              <Typography sx={{ fontWeight: 600, mb: 1 }}>Nothing saved yet</Typography>
              <Typography sx={{ color: color.textMuted, fontSize: "0.875rem" }}>
                Build a worksheet, then use Save to library on the Review step.
              </Typography>
            </Box>
          )}

          {items.length > 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", borderTop: `1px solid ${color.border}` }}>
              {items.map((w) => (
                <Box key={w.id} sx={{ ...cardSx, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                  <Box sx={{ flex: "1 1 280px", minWidth: 0 }}>
                    {editing === w.id ? (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
                        <IconButton aria-label="Save name" disabled={busy || !draftName.trim()} onClick={() => void rename(w.id)} sx={{ color: color.accent }}>
                          <Check {...iconProps} />
                        </IconButton>
                        <IconButton aria-label="Cancel rename" onClick={() => setEditing(null)}>
                          <X {...iconProps} />
                        </IconButton>
                      </Box>
                    ) : (
                      <Typography sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>{w.name}</Typography>
                    )}
                    <Typography sx={{ color: color.textMuted, fontSize: "0.8125rem", fontWeight: 400 }}>
                      {descriptions.get(w.id)}
                    </Typography>
                    <Typography sx={{ color: color.textSubtle, fontSize: "0.75rem", fontWeight: 400 }}>
                      Saved {savedOn(w.createdAt)}
                    </Typography>
                  </Box>

                  {confirmDelete === w.id ? (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography sx={{ fontSize: "0.8125rem", fontWeight: 500 }}>Delete it?</Typography>
                      <Button size="small" color="error" variant="contained" disabled={busy} onClick={() => void remove(w.id)}>
                        Delete
                      </Button>
                      <Button size="small" onClick={() => setConfirmDelete(null)}>
                        Keep
                      </Button>
                    </Box>
                  ) : (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Tooltip title={pro ? "Rebuild it in the generator" : "Opening saved worksheets is part of Pro"} arrow>
                        <span>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<ExternalLink {...iconProps} />}
                            disabled={!pro}
                            href={`/?open=${w.id}`}
                            sx={{ px: 2 }}
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
                        >
                          <Pencil {...iconProps} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete" arrow>
                        <IconButton
                          aria-label={`Delete ${w.name}`}
                          onClick={() => {
                            setConfirmDelete(w.id);
                            setEditing(null);
                          }}
                          sx={{ "&:hover": { color: color.danger } }}
                        >
                          <Trash2 {...iconProps} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                </Box>
              ))}
              {lib?.status === "ok" && (
                <Typography sx={{ color: color.textSubtle, fontSize: "0.75rem", fontWeight: 400, mt: 2 }}>
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
