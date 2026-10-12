"use client";

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Checkbox,
  FormControlLabel,
  IconButton,
  Alert,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import {
  ALL_ACCOMMODATION_IDS,
  ACCOMMODATION_DISPLAY_NAMES,
  EMPTY_FLAGS,
  type AccommodationFlags,
  type ClassAccommodationList,
  type NewGroupInput,
} from '../lib/accommodations';

// Dark input styling, matching the Control Panel drawer conventions.
const accomFieldSx = {
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'rgba(2,6,23,0.55)',
    borderRadius: 2,
    fontSize: '0.8rem',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.10)' },
    '&:hover fieldset': { borderColor: 'rgba(129,140,248,0.40)' },
    '&.Mui-focused fieldset': { borderColor: '#818cf8', borderWidth: 1 },
  },
  '& .MuiInputBase-input': { color: '#fbfbfb', py: 0.9 },
  '& .MuiInputBase-input::placeholder': {
    color: 'rgba(148,163,184,0.55)',
    opacity: 1,
  },
} as const;

const FLAG_KEYS = ['reducedCount', 'largePrint', 'sansSerif', 'extraSpacing', 'fewerPerPage'] as const;
type FlagKey = (typeof FLAG_KEYS)[number];

const FLAG_TO_ID: Record<FlagKey, string> = {
  reducedCount: 'reduced-count',
  largePrint: 'large-print',
  sansSerif: 'sans-serif-font',
  extraSpacing: 'increased-spacing',
  fewerPerPage: 'fewer-per-page',
};

function flagCheckboxes(
  flags: AccommodationFlags,
  onToggle: (key: FlagKey) => void,
  testPrefix: string
) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.25, mt: 0.75 }}>
      {FLAG_KEYS.map((key) => {
        const id = FLAG_TO_ID[key];
        const displayId = (ALL_ACCOMMODATION_IDS as readonly string[]).includes(id)
          ? (ACCOMMODATION_DISPLAY_NAMES as Record<string, string>)[id]
          : id;
        return (
          <FormControlLabel
            key={key}
            control={
              <Checkbox
                size="small"
                checked={flags[key]}
                onChange={() => onToggle(key)}
                data-testid={`${testPrefix}-flag-${key}`}
                sx={{
                  p: 0.4,
                  mr: 0.5,
                  color: 'rgba(255,255,255,0.28)',
                  '&:hover': { backgroundColor: 'rgba(129,140,248,0.10)' },
                  '&.Mui-checked': { color: '#818cf8' },
                }}
              />
            }
            label={
              <Typography sx={{ fontSize: '0.7rem', color: 'rgba(251,251,251,0.78)', lineHeight: 1.25 }}>
                {displayId}
              </Typography>
            }
            sx={{ m: 0 }}
          />
        );
      })}
    </Box>
  );
}

export interface AccommodationsPanelProps {
  list: ClassAccommodationList | null;
  onCreateList: (classLabel: string) => void;
  onUpdateClassLabel: (listId: string, classLabel: string) => void;
  onAddGroup: (listId: string, input: NewGroupInput) => void;
  onUpdateGroup: (listId: string, groupId: string, patch: Partial<NewGroupInput>) => void;
  onRemoveGroup: (listId: string, groupId: string) => void;
  error: string | null;
}

export default function AccommodationsPanel({
  list,
  onCreateList,
  onUpdateClassLabel,
  onAddGroup,
  onUpdateGroup,
  onRemoveGroup,
  error,
}: AccommodationsPanelProps) {
  const [classLabelDraft, setClassLabelDraft] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newCount, setNewCount] = useState(2);
  const [newFlags, setNewFlags] = useState<AccommodationFlags>({ ...EMPTY_FLAGS });

  const toggleNewFlag = (key: FlagKey) =>
    setNewFlags((f) => ({ ...f, [key]: !f[key] }));

  if (!list) {
    return (
      <Box>
        <Typography sx={{ fontSize: '0.72rem', color: 'rgba(148,163,184,0.85)', mb: 1, lineHeight: 1.5 }}>
          Save a reusable accommodation profile for a class. Groups are anonymous —
          student counts only, never names.
        </Typography>
        <TextField
          fullWidth
          size="small"
          value={classLabelDraft}
          onChange={(e) => setClassLabelDraft(e.target.value)}
          placeholder="Class label, e.g. Algebra 2 — Period 3"
          data-testid="accom-class-label"
          sx={{ mb: 1.25, ...accomFieldSx }}
        />
        <Button
          fullWidth
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => onCreateList(classLabelDraft)}
          data-testid="accom-create-list"
          sx={{
            textTransform: 'none',
            fontSize: '0.75rem',
            fontWeight: 600,
            borderColor: 'rgba(129,140,248,0.45)',
            color: '#818cf8',
            '&:hover': {
              borderColor: '#818cf8',
              backgroundColor: 'rgba(129,140,248,0.07)',
            },
          }}
        >
          Create class list
        </Button>
        {error && (
          <Alert severity="error" sx={{ mt: 1.25, fontSize: '0.72rem' }}>
            {error}
          </Alert>
        )}
      </Box>
    );
  }

  return (
    <Box>
      <TextField
        fullWidth
        size="small"
        defaultValue={list.classLabel}
        key={list.id + list.classLabel}
        onBlur={(e) => {
          if (e.target.value.trim() && e.target.value.trim() !== list.classLabel) {
            onUpdateClassLabel(list.id, e.target.value);
          }
        }}
        placeholder="Class label"
        aria-label="Class label"
        data-testid="accom-class-label"
        sx={{ mb: 0.5, ...accomFieldSx }}
      />
      <Typography sx={{ fontSize: '0.65rem', color: 'rgba(148,163,184,0.6)', mb: 1.5, lineHeight: 1.5 }}>
        Anonymous groups only — never enter student names.
      </Typography>

      {list.groups.map((g) => (
        <Box
          key={g.id}
          sx={{
            mb: 1,
            p: 1.25,
            borderRadius: 2,
            border: '1px solid rgba(255,255,255,0.08)',
            backgroundColor: 'rgba(2,6,23,0.35)',
          }}
        >
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              size="small"
              value={g.label}
              onChange={(e) => onUpdateGroup(list.id, g.id, { label: e.target.value })}
              placeholder="Group A"
              aria-label="Group label"
              data-testid={`accom-group-label-${g.id}`}
              sx={{ flex: 1, ...accomFieldSx }}
            />
            <TextField
              size="small"
              type="number"
              value={g.studentCount}
              inputProps={{ min: 0 }}
              onChange={(e) => {
                const v = Math.floor(Number(e.target.value));
                if (Number.isFinite(v) && v >= 0) onUpdateGroup(list.id, g.id, { studentCount: v });
              }}
              aria-label="Student count"
              title="Number of students in this group"
              data-testid={`accom-group-count-${g.id}`}
              sx={{ width: 76, ...accomFieldSx }}
            />
            <IconButton
              size="small"
              aria-label={`Remove ${g.label}`}
              onClick={() => onRemoveGroup(list.id, g.id)}
              data-testid={`accom-group-delete-${g.id}`}
              sx={{
                color: 'rgba(148,163,184,0.7)',
                '&:hover': { color: '#e11d48', backgroundColor: 'rgba(225,29,72,0.08)' },
              }}
            >
              <DeleteIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Box>
          {flagCheckboxes(
            g.flags,
            (key) => onUpdateGroup(list.id, g.id, { flags: { ...g.flags, [key]: !g.flags[key] } }),
            `accom-group-${g.id}`
          )}
        </Box>
      ))}

      {/* ── Add group ── */}
      <Box
        sx={{
          mt: 1.5,
          p: 1.25,
          borderRadius: 2,
          border: '1px dashed rgba(129,140,248,0.30)',
          backgroundColor: 'rgba(129,140,248,0.04)',
        }}
      >
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#818cf8', mb: 1 }}>
          Add group
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Group A"
            aria-label="New group label"
            data-testid="accom-new-label"
            sx={{ flex: 1, ...accomFieldSx }}
          />
          <TextField
            size="small"
            type="number"
            value={newCount}
            inputProps={{ min: 0 }}
            onChange={(e) => {
              const v = Math.floor(Number(e.target.value));
              if (Number.isFinite(v) && v >= 0) setNewCount(v);
            }}
            aria-label="New group student count"
            title="Number of students"
            data-testid="accom-new-count"
            sx={{ width: 76, ...accomFieldSx }}
          />
        </Box>
        {flagCheckboxes(newFlags, toggleNewFlag, 'accom-new')}
        <Button
          fullWidth
          size="small"
          startIcon={<AddIcon />}
          onClick={() => {
            onAddGroup(list.id, { label: newLabel, studentCount: newCount, flags: newFlags });
            setNewLabel('');
            setNewCount(2);
            setNewFlags({ ...EMPTY_FLAGS });
          }}
          data-testid="accom-add-group"
          sx={{
            mt: 1,
            textTransform: 'none',
            fontSize: '0.72rem',
            fontWeight: 600,
            color: '#818cf8',
            border: '1px solid rgba(129,140,248,0.35)',
            borderRadius: 2,
            '&:hover': { backgroundColor: 'rgba(129,140,248,0.08)', borderColor: '#818cf8' },
          }}
        >
          Add group
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 1.25, fontSize: '0.72rem' }}>
          {error}
        </Alert>
      )}

      <Typography sx={{ fontSize: '0.65rem', color: 'rgba(148,163,184,0.55)', mt: 1.5, lineHeight: 1.5 }}>
        Versions reflect your list at the time of generation. Re-export after
        changing groups.
      </Typography>
    </Box>
  );
}
