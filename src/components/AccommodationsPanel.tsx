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
import { Plus, Trash2 } from 'lucide-react';
import { color, icon, radius, sx as ui } from '../core/tokens';
import {
  ALL_ACCOMMODATION_IDS,
  ACCOMMODATION_DISPLAY_NAMES,
  EMPTY_FLAGS,
  type AccommodationFlags,
  type ClassAccommodationList,
  type NewGroupInput,
} from '../lib/accommodations';

// Inputs sit 16px inside a 24px-corner card, so their corners are 8px.
// Border, focus and colors come from the theme.
const accomFieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: `${radius.sm}px`,
    fontSize: '0.875rem',
  },
  '& .MuiInputBase-input::placeholder': { color: color.textSubtle, opacity: 1 },
} as const;

const quietButtonSx = { px: 2, borderRadius: `${radius.sm}px` } as const;

const FLAG_KEYS = ['reducedCount', 'wordBank', 'largePrint', 'sansSerif', 'extraSpacing', 'fewerPerPage'] as const;
type FlagKey = (typeof FLAG_KEYS)[number];

const FLAG_TO_ID: Record<FlagKey, string> = {
  reducedCount: 'reduced-count',
  wordBank: 'word-bank',
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
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 2, mt: 1 }}>
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
                  p: 0.5,
                  mr: 1,
                  color: color.borderStrong,
                  '&:hover': { backgroundColor: 'transparent', color: color.textMuted },
                  '&.Mui-checked': { color: color.accent },
                }}
              />
            }
            label={
              <Typography sx={{ fontSize: '0.8125rem', color: color.text, lineHeight: 1.5 }}>
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
        <Typography sx={{ ...ui.help, fontSize: '0.875rem', mb: 2, maxWidth: '60ch' }}>
          Save a reusable accommodation profile for a class. Groups are anonymous,
          student counts only, never names.
        </Typography>
        <TextField
          fullWidth
          size="small"
          value={classLabelDraft}
          onChange={(e) => setClassLabelDraft(e.target.value)}
          placeholder="Class label, e.g. Algebra 2, Period 3"
          data-testid="accom-class-label"
          sx={{ mb: 2, ...accomFieldSx }}
        />
        <Button
          fullWidth
          variant="outlined"
          startIcon={<Plus size={icon.size} strokeWidth={icon.strokeWidth} />}
          onClick={() => onCreateList(classLabelDraft)}
          data-testid="accom-create-list"
          sx={quietButtonSx}
        >
          Create class list
        </Button>
        {error && (
          <Alert severity="error" sx={{ mt: 2, fontSize: '0.8125rem' }}>
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
        sx={{ mb: 1, ...accomFieldSx }}
      />
      <Typography sx={{ ...ui.help, mb: 2 }}>
        Anonymous groups only, never enter student names.
      </Typography>

      {list.groups.map((g) => (
        <Box
          key={g.id}
          sx={{ py: 2, borderTop: `1px solid ${color.border}` }}
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
              sx={{ width: 80, ...accomFieldSx }}
            />
            <IconButton
              size="small"
              aria-label={`Remove ${g.label}`}
              onClick={() => onRemoveGroup(list.id, g.id)}
              data-testid={`accom-group-delete-${g.id}`}
              sx={{ '&:hover': { color: color.danger, backgroundColor: 'rgba(248, 113, 113, 0.08)' } }}
            >
              <Trash2 size={icon.size} strokeWidth={icon.strokeWidth} />
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
        sx={{ pt: 2, borderTop: `1px solid ${color.border}` }}
      >
        <Typography sx={{ ...ui.label, mb: 1 }}>
          Add a group
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
            sx={{ width: 80, ...accomFieldSx }}
          />
        </Box>
        {flagCheckboxes(newFlags, toggleNewFlag, 'accom-new')}
        <Button
          fullWidth
          size="small"
          variant="outlined"
          startIcon={<Plus size={icon.size} strokeWidth={icon.strokeWidth} />}
          onClick={() => {
            onAddGroup(list.id, { label: newLabel, studentCount: newCount, flags: newFlags });
            setNewLabel('');
            setNewCount(2);
            setNewFlags({ ...EMPTY_FLAGS });
          }}
          data-testid="accom-add-group"
          sx={{ ...quietButtonSx, mt: 2 }}
        >
          Add group
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2, fontSize: '0.8125rem' }}>
          {error}
        </Alert>
      )}

      <Typography sx={{ ...ui.help, color: color.textSubtle, mt: 2 }}>
        Versions reflect your list at the time of generation. Re-export after
        changing groups.
      </Typography>
    </Box>
  );
}
