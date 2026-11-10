// PdfMathText.tsx
// Prints a question, choice or proof line with real math layout:
//   • \frac{a}{b}      stacked, with a fraction bar
//   • \sqrt{x}, \sqrt[n]{x}  a radical sign whose bar runs over the radicand
//   • ^{…}             a raised, smaller exponent when unicode superscripts
//                      can't spell it (letters like y, nested fractions)
//   • segment names    a bar over both sides of a segment congruence
//                      ("AB ≅ DE" prints as AB and DE with bars), and over
//                      anything written \overline{…}
// Text with none of these prints exactly as before, as one <Text> through
// pdfSafeText, so most problems are untouched. Rich text is laid out word by
// word in a wrapping row, which is how it keeps normal line breaks.
//
// This is render-side only (see AGENTS.md): it reads the same strings the
// factories already produce and never changes them.

import React from "react";
import { Svg, Path, Text, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { latexToText, pdfSafeText } from "@/lib/answerKey";

// ── Parse ────────────────────────────────────────────────────────────────────

type Node =
  | { k: "text"; s: string } // raw LaTeX-ish text, converted by latexToText
  | { k: "frac"; num: Node[]; den: Node[] }
  | { k: "sqrt"; rad: Node[]; index?: string }
  | { k: "sup"; exp: Node[] }
  | { k: "bar"; body: Node[] };

// Characters unicode superscripts can spell (mirrors answerKey's table).
const SUPERABLE = /^[0-9+\-=()nxiao]*$/;

function stripDelimiters(s: string): string {
  s = s.replace(/\\\(|\\\)|\\\[|\\\]/g, "");
  s = s.replace(/\$(?=\d)/g, "\u0001");
  s = s.replace(/\$/g, "");
  return s.replace(/\u0001/g, "$");
}

class Parser {
  i = 0;
  constructor(private s: string) {}

  /** Parse until end of input or an unmatched closing brace. */
  parseSeq(): Node[] {
    const out: Node[] = [];
    let buf = "";
    const flush = () => {
      if (buf) out.push({ k: "text", s: buf });
      buf = "";
    };
    const s = this.s;
    while (this.i < s.length) {
      const c = s[this.i];
      if (c === "}") break;
      if (c === "{") {
        this.i++;
        const inner = this.parseSeq();
        this.i++; // skip }
        // splice a bare group into this sequence
        for (const n of inner) {
          if (n.k === "text") buf += n.s;
          else {
            flush();
            out.push(n);
          }
        }
        continue;
      }
      if (c === "\\") {
        const m = /^\\([a-zA-Z]+)\s*/.exec(s.slice(this.i));
        if (m) {
          const cmd = m[1];
          if (cmd === "frac" || cmd === "dfrac" || cmd === "tfrac") {
            this.i += m[0].length;
            flush();
            const num = this.group();
            const den = this.group();
            out.push({ k: "frac", num, den });
            continue;
          }
          if (cmd === "sqrt") {
            this.i += m[0].length;
            flush();
            let index: string | undefined;
            if (s[this.i] === "[") {
              const end = s.indexOf("]", this.i);
              index = s.slice(this.i + 1, end);
              this.i = end + 1;
            }
            out.push({ k: "sqrt", rad: this.group(), index });
            continue;
          }
          if (cmd === "overline" || cmd === "bar") {
            this.i += m[0].length;
            flush();
            out.push({ k: "bar", body: this.group() });
            continue;
          }
          if (cmd === "left" || cmd === "right") {
            this.i += m[0].length;
            continue;
          }
          buf += m[0];
          this.i += m[0].length;
          continue;
        }
        buf += s.slice(this.i, this.i + 2);
        this.i += 2;
        continue;
      }
      if (c === "^") {
        // ^\circ and ^{\circ} stay text (latexToText makes them °)
        const rest = s.slice(this.i + 1);
        const deg = /^(\\circ|\{\\circ\})/.exec(rest);
        if (deg) {
          buf += "°";
          this.i += 1 + deg[0].length;
          continue;
        }
        const raw = this.peekGroupRaw(this.i + 1);
        if (raw !== null && SUPERABLE.test(raw.text)) {
          buf += "^{" + raw.text + "}";
          this.i = raw.end;
          continue;
        }
        this.i++;
        flush();
        out.push({ k: "sup", exp: this.group() });
        continue;
      }
      if (c === "_") {
        const raw = this.peekGroupRaw(this.i + 1);
        if (raw !== null) {
          buf += "_{" + raw.text + "}";
          this.i = raw.end;
          continue;
        }
      }
      buf += c;
      this.i++;
    }
    flush();
    return out;
  }

  /** A {group} or a single character / command. */
  group(): Node[] {
    const s = this.s;
    while (s[this.i] === " ") this.i++;
    if (s[this.i] === "{") {
      this.i++;
      const inner = this.parseSeq();
      this.i++;
      return inner;
    }
    const m = /^\\[a-zA-Z]+/.exec(s.slice(this.i));
    if (m) {
      this.i += m[0].length;
      return [{ k: "text", s: m[0] }];
    }
    const ch = s[this.i] ?? "";
    this.i++;
    return ch ? [{ k: "text", s: ch }] : [];
  }

  /** Raw text of a flat {group} or single char at `at`, if it has no nesting. */
  peekGroupRaw(at: number): { text: string; end: number } | null {
    const s = this.s;
    if (s[at] === "{") {
      const end = s.indexOf("}", at);
      if (end < 0) return null;
      const text = s.slice(at + 1, end);
      if (/[{\\]/.test(text)) return null;
      return { text, end: end + 1 };
    }
    if (at < s.length && /[A-Za-z0-9+\-()=]/.test(s[at])) return { text: s[at], end: at + 1 };
    return null;
  }
}

// ── Slash fractions ──────────────────────────────────────────────────────────
// Several generators write rational expressions with a slash:
// "(x^2 - 25)/(x - 5)". When at least one side is in parentheses it is an
// algebraic fraction, so print it stacked (the parentheses were only there to
// group, and the bar does that job). Plain "3/4" or "-48/x" stays inline, and
// so does anything glued to a word, like P(A)/P(B).
const PAREN = String.raw`\((?:[^()]|\([^()]*\))*\)`;
const TOKEN = String.raw`-?[A-Za-z0-9]+(?:\.[0-9]+)?(?:\^\{[^}]*\}|\^[0-9a-z])?`;
const SLASH_FRAC = new RegExp(
  String.raw`(?<![A-Za-z0-9)\]}^/])(${PAREN}|${TOKEN})\s*/\s*(${PAREN}|${TOKEN})(?![A-Za-z0-9(^/])`,
  "g",
);
const isParen = (t: string) => t.startsWith("(") && t.endsWith(")");
const unwrap = (t: string) => (isParen(t) ? t.slice(1, -1) : t);

function hasSlashFraction(s: string): boolean {
  SLASH_FRAC.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SLASH_FRAC.exec(s))) if (isParen(m[1]) || isParen(m[2])) return true;
  return false;
}

function slashToFrac(s: string): string {
  return s.replace(SLASH_FRAC, (whole, a: string, b: string) =>
    isParen(a) || isParen(b) ? `\\frac{${unwrap(a)}}{${unwrap(b)}}` : whole,
  );
}

export function parseMath(input: string): Node[] {
  return new Parser(slashToFrac(stripDelimiters(input))).parseSeq();
}

// ── Segment bars ─────────────────────────────────────────────────────────────
// A two-letter capital name on either side of ≅ is a segment ("AB ≅ DE").
// Angles (∠B), triangles (△ABC) and lengths (AB = 12) are left alone.
const SEGMENT_CONG =
  /(?<![A-Za-z∠△∆⊙])([A-Z]{2})(?![A-Za-z])(?=\s*≅)|(?<=≅\s*)(?<![A-Za-z∠△∆⊙])([A-Z]{2})(?![A-Za-z])/g;

function hasSegmentCongruence(text: string): boolean {
  SEGMENT_CONG.lastIndex = 0;
  return SEGMENT_CONG.test(text);
}

/** True when the string needs the rich layout; otherwise print it plainly. */
export function needsMathLayout(input: string | number | null | undefined): boolean {
  if (input === null || input === undefined) return false;
  const s = String(input);
  if (/\\(d|t)?frac|\\sqrt|\\overline|\\bar\{/.test(s)) return true;
  if (/\^\{[^}]*[^0-9+\-=()nxiao}][^}]*\}/.test(s)) return true;
  if (hasSlashFraction(stripDelimiters(s))) return true;
  return hasSegmentCongruence(latexToText(s));
}

// ── Layout ───────────────────────────────────────────────────────────────────

interface Ctx {
  fs: number; // font size
  style: Style[]; // base text style (family, colour)
  color: string;
}

// Space width of the worksheet sans (FreeSans space = 278/1000 em).
const SPACE = 0.278;
const RULE = 0.7;

type Item =
  | { k: "word"; s: string; gapAfter: boolean }
  | { k: "node"; n: Exclude<Node, { k: "text" }>; gapAfter: boolean };

/** Flatten nodes into words and math atoms, tracking where spaces were. */
function toItems(nodes: Node[]): Item[] {
  const items: Item[] = [];
  for (const n of nodes) {
    if (n.k !== "text") {
      items.push({ k: "node", n, gapAfter: false });
      continue;
    }
    const raw = n.s;
    if (/^\s/.test(raw) && items.length) items[items.length - 1].gapAfter = true;
    const text = latexToText(raw);
    const words = text.split(" ").filter((w) => w.length > 0);
    words.forEach((w, idx) => {
      items.push({ k: "word", s: w, gapAfter: idx < words.length - 1 });
    });
    if (/\s$/.test(raw) && items.length && words.length) items[items.length - 1].gapAfter = true;
  }
  return items;
}

/** Estimated height of a laid-out sequence (used to size radical signs). */
function seqHeight(nodes: Node[], fs: number): number {
  let h = fs * 1.15;
  for (const n of nodes) {
    if (n.k === "frac") h = Math.max(h, seqHeight(n.num, fs * 0.85) + seqHeight(n.den, fs * 0.85) + 3);
    else if (n.k === "sqrt") h = Math.max(h, seqHeight(n.rad, fs) + 3);
    else if (n.k === "bar") h = Math.max(h, seqHeight(n.body, fs) + 2);
  }
  return h;
}

function Word({ s, ctx, gap, bar }: { s: string; ctx: Ctx; gap: boolean; bar?: boolean }) {
  const t = (
    <Text style={[...ctx.style, { fontSize: ctx.fs, lineHeight: 1.15 }]}>{s}</Text>
  );
  const margin = { marginRight: gap ? ctx.fs * SPACE : 0 };
  if (!bar) return <View style={margin}>{t}</View>;
  return (
    <View style={[margin, { borderTopWidth: 0.6, borderTopColor: ctx.color, borderTopStyle: "solid", paddingTop: 0.4 }]}>
      {t}
    </View>
  );
}

function Seq({ nodes, ctx, wrap }: { nodes: Node[]; ctx: Ctx; wrap: boolean }) {
  const items = toItems(nodes);
  // Mark segment names that sit beside ≅ (looking across word boundaries).
  const bars = new Set<number>();
  items.forEach((it, idx) => {
    if (it.k !== "word" || !/^[A-Z]{2}[,.;:)]?$/.test(it.s)) return;
    const prev = items[idx - 1];
    const next = items[idx + 1];
    const prevCong = prev && prev.k === "word" && prev.s.endsWith("≅");
    const nextCong = next && next.k === "word" && next.s.startsWith("≅") && !it.s.match(/[,.;:)]$/);
    if (prevCong || nextCong) bars.add(idx);
  });
  return (
    <View style={{ flexDirection: "row", flexWrap: wrap ? "wrap" : "nowrap", alignItems: "center" }}>
      {items.map((it, idx) => {
        if (it.k === "word") {
          if (bars.has(idx)) {
            const m = /^([A-Z]{2})([,.;:)]?)$/.exec(it.s)!;
            return (
              <View key={idx} style={{ flexDirection: "row", alignItems: "flex-end", marginRight: it.gapAfter ? ctx.fs * SPACE : 0 }}>
                <Word s={m[1]} ctx={ctx} gap={false} bar />
                {m[2] ? <Word s={m[2]} ctx={ctx} gap={false} /> : null}
              </View>
            );
          }
          return <Word key={idx} s={it.s} ctx={ctx} gap={it.gapAfter} />;
        }
        return <Atom key={idx} n={it.n} ctx={ctx} gap={it.gapAfter} />;
      })}
    </View>
  );
}

function Atom({ n, ctx, gap }: { n: Exclude<Node, { k: "text" }>; ctx: Ctx; gap: boolean }) {
  const margin = { marginRight: gap ? ctx.fs * SPACE : 0 };
  if (n.k === "frac") {
    const inner = { ...ctx, fs: ctx.fs * 0.85 };
    return (
      <View style={[margin, { alignItems: "center", marginLeft: 1.5, marginRight: (gap ? ctx.fs * SPACE : 0) + 1.5 }]}>
        <Seq nodes={n.num} ctx={inner} wrap={false} />
        <View style={{ alignSelf: "stretch", borderTopWidth: RULE, borderTopColor: ctx.color, borderTopStyle: "solid", marginTop: 1, marginBottom: 1.5 }} />
        <Seq nodes={n.den} ctx={inner} wrap={false} />
      </View>
    );
  }
  if (n.k === "sqrt") {
    const h = seqHeight(n.rad, ctx.fs) + 2;
    const w = ctx.fs * 0.55;
    const half = RULE / 2;
    return (
      <View style={[margin, { flexDirection: "row", alignItems: "flex-end", marginLeft: 1 }]}>
        {n.index ? (
          <Text style={[...ctx.style, { fontSize: ctx.fs * 0.6, marginRight: -w * 0.55, marginBottom: h * 0.42 }]}>
            {latexToText(n.index)}
          </Text>
        ) : null}
        <Svg width={w} height={h}>
          <Path
            d={`M 0 ${h * 0.6} L ${w * 0.22} ${h * 0.52} L ${w * 0.5} ${h - half} L ${w - half} ${half}`}
            stroke={ctx.color}
            strokeWidth={RULE}
            fill="none"
          />
        </Svg>
        <View style={{ height: h, justifyContent: "center", borderTopWidth: RULE, borderTopColor: ctx.color, borderTopStyle: "solid", paddingLeft: 1, paddingRight: 1.5 }}>
          <Seq nodes={n.rad} ctx={ctx} wrap={false} />
        </View>
      </View>
    );
  }
  if (n.k === "sup") {
    const inner = { ...ctx, fs: ctx.fs * 0.68 };
    return (
      <View style={[margin, { marginBottom: ctx.fs * 0.75, marginLeft: 0.5 }]}>
        <Seq nodes={n.exp} ctx={inner} wrap={false} />
      </View>
    );
  }
  // bar
  return (
    <View style={[margin, { borderTopWidth: 0.6, borderTopColor: ctx.color, borderTopStyle: "solid", paddingTop: 0.4 }]}>
      <Seq nodes={n.body} ctx={ctx} wrap={false} />
    </View>
  );
}

/**
 * Drop-in for `<Text style={s}>{pdfSafeText(text)}</Text>`. `style` is the
 * same text style; its fontSize and color are used for the math too.
 */
export function PdfMathText({
  text,
  style,
}: {
  text: string | number | null | undefined;
  style: Style | Style[];
}) {
  const styles = (Array.isArray(style) ? style : [style]).filter(Boolean) as Style[];
  if (!needsMathLayout(text)) {
    return (
      <Text style={styles}>{pdfSafeText(text)}</Text>
    );
  }
  const flat = Object.assign({}, ...styles) as Style;
  const fs = typeof flat.fontSize === "number" ? flat.fontSize : 11;
  const color = typeof flat.color === "string" ? flat.color : "#111111";
  // Text-only properties go to each word; box properties stay on the row.
  const { marginBottom, marginTop, marginLeft, marginRight, flex, width, ...textOnly } = flat;
  const ctx: Ctx = { fs, color, style: [textOnly as Style] };
  return (
    <View style={{ marginBottom, marginTop, marginLeft, marginRight, flex, width }}>
      <Seq nodes={parseMath(String(text))} ctx={ctx} wrap />
    </View>
  );
}
