// previewVisit.ts, anonymous timing for the Review step.
//
// One record per visit to Review: how long the preview took to show its
// first pages, how long the teacher stayed, page count, device type, and
// whether they exported, went back a step or left. It carries no name,
// email or worksheet contents, and the Worker stores no user id or IP.
//
// Everything here fails soft. Sending is fire-and-forget, every browser API
// is wrapped, and nothing waits on it, so a slow or broken API can never
// slow or break the preview or the export.

import { useCallback, useEffect, useRef } from 'react';
import { API_BASE } from './account';

export type PreviewDevice = 'phone' | 'tablet' | 'desktop' | 'unknown';
export type PreviewOutcome = 'exported' | 'back' | 'left';

export interface PreviewVisitRecord {
  renderMs: number | null;
  stayMs: number;
  pages: number;
  rebuilds: number;
  device: PreviewDevice;
  outcome: PreviewOutcome;
  previewFailed: boolean;
  gateHit: boolean;
  docType: string;
  versions: number;
}

/** Phone or tablet by touch-first pointer and screen size; desktop otherwise. */
export function detectDevice(): PreviewDevice {
  try {
    if (typeof window === 'undefined') return 'unknown';
    const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    const shortSide = Math.min(window.screen?.width ?? 0, window.screen?.height ?? 0);
    if (coarse && shortSide > 0 && shortSide < 600) return 'phone';
    if (coarse) return 'tablet';
    return 'desktop';
  } catch {
    return 'unknown';
  }
}

/** Fire-and-forget POST that survives the tab closing (keepalive). */
export function sendPreviewVisit(record: PreviewVisitRecord): void {
  try {
    void fetch(`${API_BASE}/preview-visit`, {
      method: 'POST',
      keepalive: true,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    }).catch(() => {});
  } catch {
    // Never let timing get in the teacher's way.
  }
}

interface OpenVisit {
  start: number;
  renderMs: number | null;
  pages: number;
  rebuilds: number;
  failed: boolean;
  gateHit: boolean;
}

/**
 * The visit bookkeeping, without React or the browser, so it can be tested.
 * A visit opens on Review, and closes on export, on going back, or on the tab
 * being closed or hidden. Coming back to the tab, or staying after an export,
 * opens a new visit whose pages are already showing (renderMs 0).
 */
export class PreviewVisitTracker {
  private visit: OpenVisit | null = null;
  private lastPages = 0;

  constructor(
    private readonly now: () => number,
    private readonly send: (r: PreviewVisitRecord) => void,
    private readonly context: () => { device: PreviewDevice; docType: string; versions: number }
  ) {}

  get open(): boolean {
    return this.visit !== null;
  }

  start(): void {
    if (this.visit) return;
    this.visit = {
      start: this.now(),
      renderMs: this.lastPages > 0 ? 0 : null,
      pages: this.lastPages,
      rebuilds: 0,
      failed: false,
      gateHit: false,
    };
  }

  /** The preview finished drawing (or gave up and showed the fallback). */
  rendered(pages: number, failed: boolean): void {
    if (failed) {
      if (this.visit) this.visit.failed = true;
      return;
    }
    this.lastPages = pages;
    const v = this.visit;
    if (!v) return;
    if (v.renderMs === null) v.renderMs = Math.max(0, Math.round(this.now() - v.start));
    else v.rebuilds++;
    v.pages = pages;
  }

  gateHit(): void {
    if (this.visit) this.visit.gateHit = true;
  }

  finish(outcome: PreviewOutcome): void {
    const v = this.visit;
    if (!v) return;
    this.visit = null;
    const ctx = this.context();
    this.send({
      renderMs: v.renderMs,
      stayMs: Math.max(0, Math.round(this.now() - v.start)),
      pages: v.pages,
      rebuilds: v.rebuilds,
      device: ctx.device,
      outcome,
      previewFailed: v.failed,
      gateHit: v.gateHit,
      docType: ctx.docType,
      versions: ctx.versions,
    });
  }
}

function clock(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/**
 * Times one Review-step visit. Call `rendered` from the preview, `exported`
 * from the Export button and `gateHit` when a Free user meets the Pro note.
 * Sends only from the production build, so local development adds no rows.
 */
export function usePreviewVisit({ docType, versions }: { docType: string; versions: number }) {
  const ctx = useRef({ docType, versions });
  useEffect(() => {
    ctx.current = { docType, versions };
  }, [docType, versions]);

  const tracker = useRef<PreviewVisitTracker | null>(null);
  // Built on first use (in an effect or event, never during render).
  const getTracker = useCallback((): PreviewVisitTracker => {
    if (tracker.current === null) {
      const device = detectDevice();
      tracker.current = new PreviewVisitTracker(
        clock,
        process.env.NODE_ENV === 'production' ? sendPreviewVisit : () => {},
        () => ({ device, ...ctx.current })
      );
    }
    return tracker.current;
  }, []);

  useEffect(() => {
    const t = getTracker();
    t.start();
    const onVisibility = () => {
      try {
        if (document.visibilityState === 'hidden') t.finish('left');
        else t.start();
      } catch {
        /* ignore */
      }
    };
    const onPageHide = () => t.finish('left');
    try {
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('pagehide', onPageHide);
    } catch {
      /* ignore */
    }
    return () => {
      try {
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('pagehide', onPageHide);
      } catch {
        /* ignore */
      }
      t.finish('back');
    };
  }, [getTracker]);

  const rendered = useCallback((pages: number, failed: boolean) => getTracker().rendered(pages, failed), [getTracker]);
  const exported = useCallback(() => {
    const t = getTracker();
    t.finish('exported');
    t.start();
  }, [getTracker]);
  const gateHit = useCallback(() => getTracker().gateHit(), [getTracker]);
  return { rendered, exported, gateHit };
}
