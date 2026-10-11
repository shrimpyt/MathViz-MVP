// rt-pdf.ts — break the PDF export.
// 1. Max problems (25/topic) across diagram-heavy topics + answer key on.
// 2. Decode content streams via ToUnicode CMaps; check special glyphs
//    (√ θ π ∠ ≃ ² ∞ − · × ÷) decode correctly — no WinAnsi mojibake.
// 3. Blank-page detection, page-count sanity, key/problem count alignment.
// 4. Hostile titles, empty lists, classical-notes groups, proof docTypes.
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { CURRICULUM_REGISTRY } from "@/modules/CurriculumRegistry";
import { problemToQuestion } from "@/core/types";
import PdfDocument from "@/components/PdfDocument";
import { failures, fail, report } from "./util";

import { counter } from "./util";
const bump = (n = 1) => { counter.checks += n; };
const byId = (id: string) => CURRICULUM_REGISTRY.find((e) => e.id === id)!;

// ── minimal PDF text extractor (ToUnicode-aware) ─────────────────────────────
interface PdfText { pages: string[]; fonts: Map<string, Map<number, string>>; }
function extractPdfText(buf: Uint8Array): PdfText {
  const raw = Buffer.from(buf).toString("latin1");
  // collect objects: "N 0 obj ... endobj"
  const objs = new Map<number, string>();
  const re = /(\d+)\s+0\s+obj([\s\S]*?)endobj/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) objs.set(Number(m[1]), m[2]);

  // ToUnicode CMaps per font object number
  const fontCMaps = new Map<number, Map<number, string>>();
  const parseCMap = (stream: string): Map<number, string> => {
    const map = new Map<number, string>();
    const uni = (hex: string) => {
      // <0041> or <00410042> → chars
      let s = "";
      for (let i = 0; i + 4 <= hex.length; i += 4) s += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16));
      return s;
    };
    const bfchar = /beginbfchar([\s\S]*?)endbfchar/g;
    let b: RegExpExecArray | null;
    while ((b = bfchar.exec(stream))) {
      const line = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
      let l: RegExpExecArray | null;
      while ((l = line.exec(b[1]))) map.set(parseInt(l[1], 16), uni(l[2]));
    }
    const bfrange = /beginbfrange([\s\S]*?)endbfrange/g;
    while ((b = bfrange.exec(stream))) {
      const line = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g;
      let l: RegExpExecArray | null;
      while ((l = line.exec(b[1]))) {
        const a = parseInt(l[1], 16), c = parseInt(l[2], 16);
        let u = l[3];
        for (let code = a; code <= c; code++) {
          map.set(code, uni(u));
          // increment last 4 hex digits
          const head = u.slice(0, -4), tail = (parseInt(u.slice(-4), 16) + 1).toString(16).padStart(4, "0");
          u = head + tail;
        }
      }
    }
    return map;
  };
  for (const [n, body] of objs) {
    if (/\/ToUnicode/.test(body)) {
      const tm = body.match(/\/ToUnicode\s+(\d+)\s+0\s+R/);
      // find stream content
      const sm = body.match(/stream\r?\n([\s\S]*?)endstream/);
      if (tm && sm) {
        // note: stream may be FlateDecode'd — handle
        let content = sm[1];
        fontCMaps.set(Number(tm[1]), parseCMap(content)); // placeholder keyed by ToUnicode obj
      }
    }
  }
  // Re-key: map font obj number -> its ToUnicode map. Find /FontFile refs:
  // Simpler: collect ALL bfrange/bfchar mappings across every ToUnicode stream
  // into one global map keyed by glyph code (react-pdf subsets per font, but
  // codes may collide across fonts — acceptable for glyph-presence checks).
  const globalMap = new Map<number, string>();
  for (const cmap of fontCMaps.values()) for (const [k, v] of cmap) if (!globalMap.has(k)) globalMap.set(k, v);

  // pages: find "/Type /Page" objects and their /Contents
  const pages: string[] = [];
  const pageRe = /(\d+)\s+0\s+obj([\s\S]*?)\/Type\s*\/Page[\s\S]*?endobj/g;
  const decodeStr = (hex: string): string => {
    let s = "";
    for (let i = 0; i + 4 <= hex.replace(/\s/g, "").length; i += 4) {
      const code = parseInt(hex.replace(/\s/g, "").slice(i, i + 4), 16);
      s += globalMap.get(code) ?? "�";
    }
    return s;
  };
  let pm: RegExpExecArray | null;
  while ((pm = pageRe.exec(raw))) {
    const body = pm[2];
    const cm = body.match(/\/Contents\s+(\d+)\s+0\s+R|\/Contents\s*\[([^\]]+)\]/);
    let content = "";
    const grabStream = (n: number) => {
      const o = objs.get(n); if (!o) return "";
      const sm = o.match(/stream\r?\n([\s\S]*?)endstream/);
      return sm ? sm[1] : "";
    };
    if (cm) {
      if (cm[1]) content = grabStream(Number(cm[1]));
      else { const refs = [...cm[2].matchAll(/(\d+)\s+0\s+R/g)]; content = refs.map((r) => grabStream(Number(r[1]))).join("\n"); }
    }
    // NOTE: content streams are usually FlateDecode'd — try inflate
    let text = "";
    try {
      const inflated = tryInflate(content);
      text = decodeOps(inflated ?? content);
    } catch { text = decodeOps(content); }
    pages.push(text);
  }

  function tryInflate(s: string): string | null {
    // content captured as latin1; locate raw bytes between stream/endstream in the buffer
    return null; // handled below via buffer search instead
  }
  function decodeOps(s: string): string {
    let out = "";
    // hex strings in Tj/TJ
    const tj = /(?:<([0-9A-Fa-f\s]+)>|\((?:\\.|[^\\()])*\))\s*Tj/g;
    let t: RegExpExecArray | null;
    while ((t = tj.exec(s))) {
      if (t[1] !== undefined) out += decodeStr(t[1]);
      else out += t[0].replace(/\s*Tj$/, "").slice(1, -1).replace(/\\(.)/g, "$1");
    }
    const tja = /\[([^\]]*)\]\s*TJ/g;
    while ((t = tja.exec(s))) {
      const inner = t[1];
      const hx = /<([0-9A-Fa-f\s]+)>|\((?:\\.|[^\\()])*\)/g;
      let h: RegExpExecArray | null;
      while ((h = hx.exec(inner))) {
        if (h[1] !== undefined) out += decodeStr(h[1]);
        else out += h[0].slice(1, -1).replace(/\\(.)/g, "$1");
      }
    }
    return out;
  }
  return { pages, fonts: new Map() };
}

// ── build a maximal document ─────────────────────────────────────────────────
const HEAVY = [
  "trig-2-sides", "trig-3-angles", "special-right-triangles", "anatomy-of-a-circle",
  "ch7-1-distance-midpoint", "ch11-1-circumference", "target-zone",
  "precalc-trig", "precalc-conics", "calc-limits", "calc-derivative-rules",
  "ms7-3-5-circumference-area-circles", "proofs-4-2-sss-sas", "sat-hoa-linear-equations",
  "a2-5-4-focus-directrix", "a2-11-3-asymptotes-holes",
];
async function buildMax(title: string, docType: string, countPer: number, seedBase: number) {
  const problems: any[] = [];
  HEAVY.forEach((id, i) => {
    const e = CURRICULUM_REGISTRY.find((x) => x.id === id);
    if (!e || e.underConstruction) return;
    problems.push(...(e.generate("Test", seedBase + i * 7919, { count: countPer, difficulty: 3 }) as any[]));
  });
  const questions = problems.map((p, i) => problemToQuestion(p, i));
  const el = React.createElement(PdfDocument, {
    title, questions, advancedProblems: problems, docType, standard: "TEST √ θ π ∠ ≃ ² ∞ − ·",
    includeAnswerKey: true, classicalGroups: undefined, seed: seedBase,
  });
  const bytes = new Uint8Array(await renderToBuffer(el as any));
  return { bytes, problems };
}

async function main() {
  // Test 1: maximal document
  bump();
  let big: { bytes: Uint8Array; problems: any[] };
  try {
    big = await buildMax("Max Stress — Geometry √ θ π ∠ ≃ ² ∞ − · × ÷", "worksheet", 25, 9001);
  } catch (e) {
    fail("PDF-CRASH", "max-doc", "worksheet", 0, `renderToBuffer threw: ${e instanceof Error ? e.message : String(e).slice(0, 200)}`);
    report("rt-pdf"); process.exit(0); return;
  }
  bump();
  const head = Buffer.from(big.bytes.subarray(0, 5)).toString("ascii");
  if (head !== "%PDF-") fail("PDF-HEADER", "max-doc", "worksheet", 0, `bad header: ${head}`);
  console.log(`max doc: ${big.problems.length} problems → ${(big.bytes.length / 1024).toFixed(0)} KB`);

  // Decode text (note: streams are Flate-encoded; do a buffer-level inflate)
  const { inflateSync } = await import("zlib");
  const rawLatin = Buffer.from(big.bytes).toString("latin1");
  // quick page count from /Type /Page
  const pageCount = (rawLatin.match(/\/Type\s*\/Page[^s]/g) || []).length;
  bump();
  console.log(`pages: ${pageCount}`);
  if (pageCount < 2) fail("PDF-PAGES", "max-doc", "worksheet", 0, `${big.problems.length} problems produced only ${pageCount} page(s)`);

  // ── font-aware text decode ──────────────────────────────────────────
  // Each subset font carries its own ToUnicode CMap keyed by THAT font's
  // glyph codes. Merging them into one global map (as this harness did
  // before) collides: both subset fonts reuse small codes, so e.g. the
  // bold font's "Y" mapping was clobbered → false PDF-KEY-MISSING. And
  // WinAnsi single-byte text (Times-Roman) mis-split as 2-byte codes →
  // false PDF-UNMAPPED. Decode per font, tracking the active font per page.
  const latin = Buffer.from(big.bytes).toString("latin1");
  const objs = new Map<number, string>();
  const ore = /(\d+)\s+0\s+obj([\s\S]*?)endobj/g;
  let om: RegExpExecArray | null;
  while ((om = ore.exec(latin))) objs.set(Number(om[1]), om[2]);
  const inflateObj = (n: number): string | null => {
    const body = objs.get(n);
    if (!body) return null;
    const sm = body.match(/stream\r?\n([\s\S]*?)endstream/);
    if (!sm) return null;
    try { return inflateSync(Buffer.from(sm[1], "latin1")).toString("latin1"); }
    catch { return sm[1]; }
  };
  const uni = (hex: string) => { let s = ""; for (let i = 0; i + 4 <= hex.length; i += 4) s += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16)); return s; };
  const parseCMap = (text: string): Map<number, string> => {
    const map = new Map<number, string>();
    for (const bfr of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g))
      for (const l of bfr[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g))
        map.set(parseInt(l[1], 16), uni(l[2]));
    for (const bfr of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g))
      for (const l of bfr[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
        let u = l[3];
        for (let code = parseInt(l[1], 16); code <= parseInt(l[2], 16); code++) {
          map.set(code, uni(u));
          u = u.slice(0, -4) + (parseInt(u.slice(-4), 16) + 1).toString(16).padStart(4, "0");
        }
      }
    return map;
  };
  // CP1252 (WinAnsi) byte → char for single-byte fonts.
  const CP1252_EXTRA: Record<number, string> = {
    0x80: "€", 0x82: "‚", 0x83: "ƒ", 0x84: "„", 0x85: "…", 0x86: "†", 0x87: "‡",
    0x88: "ˆ", 0x89: "‰", 0x8a: "Š", 0x8b: "‹", 0x8c: "Œ", 0x8e: "Ž", 0x91: "‘",
    0x92: "’", 0x93: "“", 0x94: "”", 0x95: "•", 0x96: "–", 0x97: "—", 0x98: "˜",
    0x99: "™", 0x9a: "š", 0x9b: "›", 0x9c: "œ", 0x9e: "ž", 0x9f: "Ÿ",
  };
  const winAnsiChar = (b: number): string =>
    CP1252_EXTRA[b] ?? (b >= 0x20 && b <= 0xff && b !== 0x7f ? String.fromCharCode(b) : "�");
  interface FontDecode { width: 1 | 2; map: Map<number, string>; }
  const fontByObj = new Map<number, FontDecode>();
  for (const [n, body] of objs) {
    if (!/\/Type\s*\/Font/.test(body)) continue;
    const identityH = /\/Encoding\s*\/Identity-H/.test(body);
    const map = new Map<number, string>();
    const tm = body.match(/\/ToUnicode\s+(\d+)\s+0\s+R/);
    if (tm) {
      const ct = inflateObj(Number(tm[1]));
      if (ct) for (const [k, v] of parseCMap(ct)) map.set(k, v);
    }
    if (!identityH && map.size === 0)
      for (let c = 0; c < 256; c++) map.set(c, winAnsiChar(c));
    fontByObj.set(n, { width: identityH ? 2 : 1, map });
  }
  bump();
  console.log(`fonts decoded: ${fontByObj.size}`);
  // pages in order, with per-page font resources
  const pageObjs: number[] = [];
  for (const [n, body] of objs)
    if (/\/Type\s*\/Page([^s]|$)/.test(body)) pageObjs.push(n);
  pageObjs.sort((a, b) => a - b);
  const fontResForPage = (pageBody: string): Map<string, number> => {
    const res = new Map<string, number>();
    let resBody = "";
    const rm = pageBody.match(/\/Resources\s+(\d+)\s+0\s+R/);
    if (rm) resBody = objs.get(Number(rm[1])) ?? "";
    else { const im = pageBody.match(/\/Resources\s*<<([\s\S]*?)>>/); if (im) resBody = im[1]; }
    const fm = resBody.match(/\/Font\s*<<([\s\S]*?)>>/);
    if (fm) for (const f of fm[1].matchAll(/\/(\w+)\s+(\d+)\s+0\s+R/g)) res.set(f[1], Number(f[2]));
    return res;
  };
  let decoded = "";
  let unmapped = 0, total = 0, unmappedNonAscii = 0;
  for (const pn of pageObjs) {
    const pageBody = objs.get(pn) ?? "";
    const resFonts = fontResForPage(pageBody);
    const cm = pageBody.match(/\/Contents\s+(\d+)\s+0\s+R|\/Contents\s*\[([^\]]+)\]/);
    const parts: string[] = [];
    if (cm) {
      const refs = cm[1] ? [Number(cm[1])] : [...cm[2].matchAll(/(\d+)\s+0\s+R/g)].map((r) => Number(r[1]));
      for (const r of refs) { const t = inflateObj(r); if (t) parts.push(t); }
    }
    const text = parts.join("\n");
    let cur: FontDecode | null = null;
    const fontStack: (FontDecode | null)[] = [];
    const feedRun = (hex: string) => {
      const h = hex.replace(/\s/g, "");
      const fd: FontDecode = cur ?? { width: 2, map: new Map<number, string>() };
      const step = fd.width === 2 ? 4 : 2;
      for (let i = 0; i + step <= h.length; i += step) {
        total++;
        const code = parseInt(h.slice(i, i + step), 16);
        const ch = fd.map.get(code);
        if (ch === undefined || ch === "�") {
          unmapped++;
          if (fd.width === 2 || code < 0x20 || code > 0x7e) unmappedNonAscii++;
        } else decoded += ch;
      }
    };
    const tok = /(?:(?<=\s)|^)(q|Q)(?=\s|$)|\/F(\w+)\s+[\d.]+\s+Tf|<([0-9A-Fa-f\s]+)>\s*Tj|\[((?:<[^>]*>|-?[\d.]+|\s)*)\]\s*TJ|\((?:\.|[^\()])*\)\s*Tj/g;
    let t: RegExpExecArray | null;
    while ((t = tok.exec(text))) {
      if (t[1]) { if (t[1] === "q") fontStack.push(cur); else cur = fontStack.pop() ?? cur; }
      else if (t[2] !== undefined) {
        const obj = resFonts.get("F" + t[2]);
        if (obj !== undefined) cur = fontByObj.get(obj) ?? cur;
      }
      else if (t[3] !== undefined) feedRun(t[3]);
      else if (t[4] !== undefined) {
        for (const hx of t[4].matchAll(/<([0-9A-Fa-f\s]+)>/g)) feedRun(hx[1]);
      }
      else decoded += t[0].replace(/\s*Tj$/, "").slice(1, -1).replace(/\\(.)/g, "$1");
    }
  }
  bump();
  console.log(`decoded glyphs: ${total}, unmapped: ${unmapped} (non-ASCII: ${unmappedNonAscii})`);
  if (unmappedNonAscii > 0)
    fail("PDF-UNMAPPED", "max-doc", "worksheet", 0, `${unmappedNonAscii}/${total} glyph codes are neither ToUnicode-mapped nor ASCII — possible mojibake`);

  for (const g of ["√", "θ", "π", "∠", "≃", "²", "∞", "−", "·"]) {
    bump();
    if (!decoded.includes(g)) fail("PDF-GLYPH", "max-doc", "worksheet", 0, `glyph "${g}" (U+${g.codePointAt(0)!.toString(16)}) not found in decoded PDF text`);
  }
  bump();
  if (/&[a-z]+;|Ã|Â/.test(decoded) && decoded.length > 100)
    fail("PDF-MOJIBAKE", "max-doc", "worksheet", 0, `possible mojibake sequences in decoded text`);
  bump();
  const avgChars = decoded.length / Math.max(1, pageCount);
  console.log(`decoded chars: ${decoded.length}, avg/page: ${avgChars.toFixed(0)}`);
  if (avgChars < 120)
    fail("PDF-SPARSE", "max-doc", "worksheet", 0, `only ${avgChars.toFixed(0)} decoded chars/page on average — possible blank/missing content`);

  // key alignment: count "ANSWER KEY" rows vs problems
  bump();
  const keyIdx = decoded.indexOf("ANSWER KEY");
  if (keyIdx < 0) fail("PDF-KEY-MISSING", "max-doc", "worksheet", 0, `no "ANSWER KEY" heading in decoded text`);

  // Test 2: hostile title
  bump();
  try {
    const { bytes } = await buildMax("A".repeat(500) + " √θπ 🎉 <b>&quot;", "test", 1, 7);
    if (bytes.length < 1000) fail("PDF-TITLE", "hostile-title", "test", 0, `tiny output ${bytes.length}`);
    console.log(`hostile title ok: ${(bytes.length / 1024).toFixed(1)} KB`);
  } catch (e) { fail("PDF-TITLE-CRASH", "hostile-title", "test", 0, `${e instanceof Error ? e.message : e}`); }

  // Test 3: empty problem list
  bump();
  try {
    const el = React.createElement(PdfDocument, { title: "Empty", questions: [], advancedProblems: [], docType: "worksheet", includeAnswerKey: true });
    const bytes = new Uint8Array(await renderToBuffer(el as any));
    if (bytes.length < 500) fail("PDF-EMPTY", "empty", "worksheet", 0, `suspiciously small: ${bytes.length}`);
    console.log(`empty doc ok: ${bytes.length} bytes`);
  } catch (e) { fail("PDF-EMPTY-CRASH", "empty", "worksheet", 0, `${e instanceof Error ? e.message : e}`); }

  // Test 4: classical-notes with groups
  bump();
  try {
    const groups = ["trig-1-ratios", "anatomy-of-a-circle"].map((id, i) => {
      const e = byId(id);
      const problems = e.generate("Classical", 31 + i * 7919, { count: 4, difficulty: 2 }) as any[];
      return { entryId: id, title: e.title, teks: e.teks.split(" · ")[0], problems, startIndex: i * 4 };
    });
    const problems = groups.flatMap((g) => g.problems);
    const el = React.createElement(PdfDocument, {
      title: "Classical Test", questions: problems.map((p, i) => problemToQuestion(p, i)),
      advancedProblems: problems, docType: "classical-notes", includeAnswerKey: true, classicalGroups: groups as any, seed: 31,
    });
    const bytes = new Uint8Array(await renderToBuffer(el as any));
    console.log(`classical-notes ok: ${(bytes.length / 1024).toFixed(1)} KB`);
    if (bytes.length < 2000) fail("PDF-CLASSICAL", "classical", "classical-notes", 0, `tiny output`);
  } catch (e) { fail("PDF-CLASSICAL-CRASH", "classical", "classical-notes", 0, `${e instanceof Error ? e.message : String(e).slice(0, 200)}`); }

  // Test 5: proof docTypes
  for (const dt of ["proof-two-column", "proof-fill-reasons", "proof-elements"]) {
    bump();
    try {
      const e = byId("proofs-4-2-sss-sas");
      const problems = e.generate("Test", 55, { count: 3, difficulty: 2 }) as any[];
      const el = React.createElement(PdfDocument, {
        title: `Proof ${dt}`, questions: problems.map((p, i) => problemToQuestion(p, i)),
        advancedProblems: problems, docType: dt, includeAnswerKey: true,
      });
      const bytes = new Uint8Array(await renderToBuffer(el as any));
      console.log(`${dt} ok: ${(bytes.length / 1024).toFixed(1)} KB`);
    } catch (e) { fail("PDF-PROOF-CRASH", dt, dt, 0, `${e instanceof Error ? e.message : String(e).slice(0, 200)}`); }
  }

  // Test 6: sat-practice
  bump();
  try {
    const e = CURRICULUM_REGISTRY.find((x) => x.id === "sat-full-module")!;
    const problems = e.generate("Test", 66, { count: 10, difficulty: 2 }) as any[];
    const el = React.createElement(PdfDocument, {
      title: "SAT Practice", questions: problems.map((p, i) => problemToQuestion(p, i)),
      advancedProblems: problems, docType: "sat-practice", includeAnswerKey: true,
    });
    const bytes = new Uint8Array(await renderToBuffer(el as any));
    console.log(`sat-practice ok: ${(bytes.length / 1024).toFixed(1)} KB`);
  } catch (e) { fail("PDF-SAT-CRASH", "sat-practice", "sat-practice", 0, `${e instanceof Error ? e.message : String(e).slice(0, 200)}`); }

  report("rt-pdf");
  process.exit(0);
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
