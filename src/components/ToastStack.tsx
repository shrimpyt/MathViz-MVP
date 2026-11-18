'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Alert, Box, IconButton, Slide } from '@mui/material';
import { X } from 'lucide-react';
import { color, icon, motion, radius, shadow } from '../core/tokens';

// Notifications slide in from the right edge of the viewport and stack in
// one column at the bottom right. Every ToastStack on the page portals into
// the same container, so toasts from different parts of the page stack
// together instead of overlapping. The stack sits above the builder's
// bottom action bar so a toast never covers Continue or Export.

export type Toast = {
  key: string;
  severity: 'success' | 'info' | 'warning' | 'error';
  text: React.ReactNode;
  action?: React.ReactNode;
  onClose?: () => void;
  role?: 'status' | 'alert';
};

const ROOT_ID = 'euclid-toasts';

function toastRoot(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  let el = document.getElementById(ROOT_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = ROOT_ID;
    Object.assign(el.style, {
      position: 'fixed',
      right: '16px',
      bottom: '88px',
      zIndex: '1400',
      display: 'flex',
      flexDirection: 'column-reverse',
      alignItems: 'flex-end',
      gap: '8px',
      maxWidth: 'calc(100vw - 32px)',
      pointerEvents: 'none',
    } as Partial<CSSStyleDeclaration>);
    document.body.appendChild(el);
  }
  return el;
}

export default function ToastStack({ toasts }: { toasts: Toast[] }) {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  // Toasts that were just removed stay mounted until their exit slide ends.
  const [leaving, setLeaving] = useState<Toast[]>([]);
  const [prev, setPrev] = useState<Toast[]>(toasts);
  if (prev !== toasts) {
    const live = new Set(toasts.map((t) => t.key));
    const gone = prev.filter((t) => !live.has(t.key));
    setPrev(toasts);
    setLeaving((l) => [...l.filter((t) => !live.has(t.key)), ...gone.filter((g) => !l.some((t) => t.key === g.key))]);
  }
  useEffect(() => {
    // The container only exists in the browser, after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRoot(toastRoot());
  }, []);
  if (!root) return null;
  const all = [...toasts.map((t) => ({ t, on: true })), ...leaving.map((t) => ({ t, on: false }))];
  return createPortal(
    <>
      {all.map(({ t, on }) => (
        <Slide
          key={t.key}
          direction="left"
          in={on}
          appear
          onExited={() => setLeaving((l) => l.filter((x) => x.key !== t.key))}
          timeout={{ enter: motion.enter, exit: motion.exit }}
          easing={{ enter: motion.easeOut, exit: motion.easeIn }}
        >
          <Alert
            severity={t.severity}
            onClose={t.action ? undefined : t.onClose}
            action={
              t.action && t.onClose ? (
                // MUI drops its close button when an action is given, so
                // keep both: the action, then a dismiss button.
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {t.action}
                  <IconButton size="small" aria-label="Dismiss" onClick={t.onClose}>
                    <X size={icon.size} strokeWidth={icon.strokeWidth} />
                  </IconButton>
                </Box>
              ) : (
                t.action
              )
            }
            role={t.role}
            sx={{
              pointerEvents: 'auto',
              width: 400,
              maxWidth: '100%',
              bgcolor: color.bgRaised,
              backgroundImage: 'none',
              border: `1px solid ${color.borderStrong}`,
              borderRadius: `${radius.md}px`,
              boxShadow: shadow.lg,
              color: color.text,
              fontSize: '0.8125rem',
            }}
          >
            {t.text}
          </Alert>
        </Slide>
      ))}
    </>,
    root,
  );
}
