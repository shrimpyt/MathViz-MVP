"use client";

/**
 * KaTeX renderer backed by vendored local files in /public/vendor/katex/.
 * No network requests — safe for offline/sandboxed environments.
 */

import React, { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    katex?: {
      renderToString: (
        expression: string,
        options?: { displayMode?: boolean; throwOnError?: boolean }
      ) => string;
    };
  }
}

let loadPromise: Promise<void> | null = null;

function loadKaTeX(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    if (window.katex) {
      resolve();
      return;
    }
    // Inject CSS
    if (!document.querySelector('link[data-katex]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "/vendor/katex/katex.min.css";
      link.dataset.katex = "1";
      document.head.appendChild(link);
    }
    // Inject JS
    const script = document.createElement("script");
    script.src = "/vendor/katex/katex.min.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load vendored KaTeX"));
    document.head.appendChild(script);
  });
  return loadPromise;
}

interface KaTeXProps {
  math: string;
  display?: boolean;
  className?: string;
}

export default function KaTeX({ math, display = false, className }: KaTeXProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadKaTeX()
      .then(() => {
        if (cancelled || !ref.current || !window.katex) return;
        ref.current.innerHTML = window.katex.renderToString(math, {
          displayMode: display,
          throwOnError: false,
        });
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [math, display]);

  if (error) {
    return <span className={className} style={{ color: "red", fontSize: "0.8em" }}>{math}</span>;
  }

  return (
    <span
      ref={ref}
      className={className}
      style={display ? { display: "block", textAlign: "center" } : undefined}
    />
  );
}
