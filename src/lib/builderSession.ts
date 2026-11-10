// ── Builder state that survives leaving the page ────────────────────────────
// Going to Pricing (or Stripe checkout) and coming back used to reset the
// wizard to an empty Format step. The builder now keeps its settings and the
// step it was on in sessionStorage for the tab, and restores them on load.
// The stored value goes through the same sanitizer as draft files, so a stale
// or hand-edited entry can never put retired topics or wild numbers back.

import { sanitizeSettings, settingsForSave, type WorksheetSettings } from './worksheetSettings';

export const BUILDER_SESSION_KEY = 'euclid-builder-v1';

export interface BuilderSession {
  settings: WorksheetSettings;
  /** Wizard step, 0 Format · 1 Topics · 2 Accommodations · 3 Review. */
  step: number;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

/** Clamp a stored step the way the wizard's own navigation does: steps past
 *  Topics need at least one topic, so they land on Topics without one. */
export function clampStep(step: unknown, topicCount: number): number {
  const n = typeof step === 'number' && Number.isFinite(step) ? Math.floor(step) : 0;
  const inRange = Math.min(3, Math.max(0, n));
  return inRange > 1 && topicCount === 0 ? 1 : inRange;
}

export function writeBuilderSession(storage: StorageLike | null | undefined, s: BuilderSession): void {
  if (!storage) return;
  try {
    storage.setItem(
      BUILDER_SESSION_KEY,
      JSON.stringify({ v: 1, step: s.step, settings: settingsForSave(s.settings) }),
    );
  } catch {
    // Storage full or blocked: the builder still works, it just won't survive a reload.
  }
}

export function readBuilderSession(storage: StorageLike | null | undefined): BuilderSession | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(BUILDER_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { v?: unknown; step?: unknown; settings?: unknown };
    if (!parsed || parsed.v !== 1) return null;
    const settings = sanitizeSettings(parsed.settings);
    if (!settings) return null;
    return { settings, step: clampStep(parsed.step, settings.topicIds.length) };
  } catch {
    return null;
  }
}

/** sessionStorage when the browser allows it, otherwise null. */
export function sessionStore(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}
