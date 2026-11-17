'use client';

// PdfPagePreview.tsx, the Review step's preview: the real PDF, page by page.
//
// The document element passed in is rendered with @react-pdf (the same
// renderer and the same element the Export button downloads), then each page
// is drawn to an image with pdf.js. So what the teacher sees is the file, with
// its real page breaks, figure sizes, fonts, footer and answer key, not an
// HTML look-alike.
//
// The finished file is handed back through onReady, so Export can download
// exactly these bytes without rendering the document a second time.

import React, { useEffect, useRef, useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Box, CircularProgress, Typography } from '@mui/material';
import { color, shadow } from '../core/tokens';

/** Page image width in CSS pixels at 1x (US Letter is 612pt wide). */
const RENDER_SCALE = 2;
/** Wait this long after the last change before rebuilding the file. */
const DEBOUNCE_MS = 350;

type PageImage = { url: string; width: number; height: number };

type PdfJs = typeof import('pdfjs-dist');
let pdfjsPromise: Promise<PdfJs> | null = null;
function loadPdfJs(): Promise<PdfJs> {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();
      return lib;
    });
    // A failed load (offline, blocked) may succeed on the next try.
    pdfjsPromise.catch(() => {
      pdfjsPromise = null;
    });
  }
  return pdfjsPromise;
}

/** Draw every page of a PDF to an image URL. */
async function rasterize(data: ArrayBuffer, isCurrent: () => boolean): Promise<PageImage[] | null> {
  const lib = await loadPdfJs();
  const task = lib.getDocument({ data });
  const doc = await task.promise;
  const out: PageImage[] = [];
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      if (!isCurrent()) return null;
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale: RENDER_SCALE });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas is not available');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Could not draw page ' + n);
      out.push({ url: URL.createObjectURL(blob), width: canvas.width, height: canvas.height });
      page.cleanup();
    }
  } catch (e) {
    out.forEach((p) => URL.revokeObjectURL(p.url));
    throw e;
  } finally {
    void task.destroy();
  }
  if (!isCurrent()) {
    out.forEach((p) => URL.revokeObjectURL(p.url));
    return null;
  }
  return out;
}

export default function PdfPagePreview({
  document: pdfDocument,
  onReady,
  onRendered,
  fallback,
}: {
  /** The @react-pdf <Document> to show. Memoize it: a new element rebuilds the preview. */
  document: React.ReactElement;
  /** The finished file, or null while it is being rebuilt (failed: it could not be built). */
  onReady?: (blob: Blob | null, failed?: boolean) => void;
  /** Pages finished drawing (failed: the preview gave up and shows the fallback). For timing only. */
  onRendered?: (pages: number, failed: boolean) => void;
  /** Shown if the PDF cannot be drawn in this browser. */
  fallback?: React.ReactNode;
}) {
  const [pages, setPages] = useState<PageImage[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const run = useRef(0);
  const onReadyRef = useRef(onReady);
  const onRenderedRef = useRef(onRendered);
  useEffect(() => {
    onReadyRef.current = onReady;
    onRenderedRef.current = onRendered;
  }, [onReady, onRendered]);
  // Timing callbacks must never break the preview.
  const reportRendered = (pages: number, failed: boolean) => {
    try {
      onRenderedRef.current?.(pages, failed);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const id = ++run.current;
    const isCurrent = () => run.current === id;
    setBusy(true);
    onReadyRef.current?.(null);
    const timer = setTimeout(async () => {
      let blob: Blob;
      try {
        blob = await pdf(pdfDocument as Parameters<typeof pdf>[0]).toBlob();
      } catch (e) {
        if (!isCurrent()) return;
        console.error('PDF build failed:', e);
        onReadyRef.current?.(null, true);
        setError(e instanceof Error ? e.message : String(e));
        setBusy(false);
        reportRendered(0, true);
        return;
      }
      try {
        if (!isCurrent()) return;
        onReadyRef.current?.(blob);
        const images = await rasterize(await blob.arrayBuffer(), isCurrent);
        if (!images || !isCurrent()) return;
        setPages((old) => {
          old.forEach((p) => URL.revokeObjectURL(p.url));
          return images;
        });
        setError(null);
        reportRendered(images.length, false);
      } catch (e) {
        if (!isCurrent()) return;
        console.error('PDF preview failed:', e);
        setError(e instanceof Error ? e.message : String(e));
        reportRendered(0, true);
      } finally {
        if (isCurrent()) setBusy(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [pdfDocument]);

  // Free the page images when the preview goes away.
  const pagesRef = useRef(pages);
  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);
  useEffect(
    () => () => {
      run.current++;
      pagesRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    },
    []
  );

  if (error && pages.length === 0) {
    return (
      <Box sx={{ width: '100%' }}>
        <Typography
          role="status"
          sx={{ textAlign: 'center', fontSize: '0.8rem', color: color.danger, fontWeight: 600, mb: 1.5 }}
        >
          The page preview couldn&apos;t be drawn in this browser, so this is a close approximation. Export still
          downloads the real PDF.
        </Typography>
        {fallback}
      </Box>
    );
  }

  return (
    <Box
      data-testid="pdf-preview"
      aria-busy={busy}
      sx={{ width: '100%', maxWidth: '8.5in', mx: 'auto', position: 'relative' }}
    >
      {busy && (
        <Box
          role="status"
          sx={{
            position: pages.length ? 'sticky' : 'static',
            top: 8,
            zIndex: 2,
            display: 'flex',
            justifyContent: 'center',
            mb: pages.length ? -4.5 : 0,
            mt: pages.length ? 0 : 6,
          }}
        >
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              px: 1.75,
              py: 0.75,
              borderRadius: '999px',
              bgcolor: color.surface,
              border: `1px solid ${color.border}`,
              color: color.text,
              boxShadow: shadow.md,
            }}
          >
            <CircularProgress size={14} thickness={6} sx={{ color: color.accent }} />
            <Typography sx={{ fontSize: '0.78rem', fontWeight: 600 }}>
              {pages.length ? 'Updating preview…' : 'Building the PDF preview…'}
            </Typography>
          </Box>
        </Box>
      )}
      {pages.map((p, i) => (
        <Box key={p.url} sx={{ mb: 3 }}>
          <Box
            component="img"
            src={p.url}
            alt={`Page ${i + 1} of ${pages.length}`}
            width={p.width / RENDER_SCALE}
            height={p.height / RENDER_SCALE}
            sx={{
              display: 'block',
              width: '100%',
              height: 'auto',
              bgcolor: '#fff',
              borderRadius: '4px',
              boxShadow: shadow.md,
              opacity: busy ? 0.6 : 1,
              transition: 'opacity .15s',
            }}
          />
          <Typography sx={{ textAlign: 'center', fontSize: '0.72rem', color: color.textMuted, fontWeight: 500, mt: 0.75 }}>
            Page {i + 1} of {pages.length}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
