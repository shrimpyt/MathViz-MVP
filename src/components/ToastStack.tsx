'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Alert, Slide } from '@mui/material';
import { color, motion, radius, shadow } from '../core/tokens';

// Notifications slide in from the right edge of the viewport and stack in
// one column at the bottom right. Every ToastStack on the page portals into
// the same container, so toasts from different parts of the page stack
// together instead of overlapping.

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
      bottom: '16px',
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
  useEffect(() => {
    // The container only exists in the browser, after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRoot(toastRoot());
  }, []);
  if (!root) return null;
  return createPortal(
    <>
      {toasts.map((t) => (
        <Slide
          key={t.key}
          direction="left"
          in
          appear
          timeout={{ enter: motion.enter, exit: motion.exit }}
          easing={{ enter: motion.easeOut, exit: motion.easeIn }}
        >
          <Alert
            severity={t.severity}
            onClose={t.onClose}
            action={t.action}
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
