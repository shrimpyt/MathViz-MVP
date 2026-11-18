// pdfFit.tsx, measure-then-print for worksheet PDFs.
//
// react-pdf can't move a problem to fill a gap or tell us how tall a
// problem prints, so a worksheet is laid out twice:
//   1. Measure: the same document renders with FitContext in 'measure'
//      mode. Each PdfVersionPages prints its header, section headings and
//      every problem (with no work room) on a tall scratch page, each block
//      tagged with a `data-fit` prop.
//   2. Plan: the tagged heights from the layout go through planPages()
//      (src/lib/pageFit.ts), which picks rows, order, page breaks and extra
//      work room for each version.
//   3. Print: the document renders again with the plans in FitContext.
//
// The heights come from react-pdf's own layout of the real fonts, diagrams
// and math, so the plan matches what prints. If the layout can't be read
// (a react-pdf upgrade renamed it), fitDocument returns the document
// unchanged and it prints with the plain flow layout.

import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { planPages, type FitInput, type FitPlan } from '../lib/pageFit';

export type FitState =
  | { mode: 'measure' }
  | { mode: 'final'; plans: Map<string, FitPlan> };

export const FitContext = React.createContext<FitState | null>(null);

/** One tagged block in the measuring pass. */
export type FitTag =
  | {
      v: string;
      k: 'meta';
      capacity: number;
      rule: number;
      grid: boolean;
      perPage: number | null;
      sections: number;
      count: number;
    }
  | { v: string; k: 'header' }
  | { v: string; k: 'heading'; sec: number }
  | { v: string; k: 'item'; i: number; ws: number; grow: number; full: boolean; sec: number };

/** Props that tag a View for the measuring pass. */
export const fitTag = (tag: FitTag) => ({ 'data-fit': JSON.stringify(tag) }) as Record<string, string>;

interface LayoutNode {
  props?: Record<string, unknown>;
  box?: { height: number; marginTop?: number; marginBottom?: number };
  children?: LayoutNode[];
}

/** Turn the measuring pass's layout into one planner input per version. */
export function inputsFromLayout(root: LayoutNode): Map<string, FitInput> {
  const tags: { tag: FitTag; h: number }[] = [];
  const walk = (n: LayoutNode) => {
    const raw = n.props?.['data-fit'];
    if (typeof raw === 'string' && n.box) {
      const b = n.box;
      tags.push({ tag: JSON.parse(raw) as FitTag, h: b.height + (b.marginTop ?? 0) + (b.marginBottom ?? 0) });
    }
    (n.children ?? []).forEach(walk);
  };
  walk(root);

  const out = new Map<string, FitInput>();
  for (const { tag } of tags) {
    if (tag.k !== 'meta' || out.has(tag.v)) continue;
    out.set(tag.v, {
      capacity: tag.capacity,
      rule: tag.rule,
      grid: tag.grid,
      perPage: tag.perPage,
      first: 0,
      headings: Array(tag.sections).fill(0),
      items: Array.from({ length: tag.count }, () => ({ h: 0, ws: 0, full: false, sec: 0 })),
    });
  }
  const seen = new Set<string>();
  for (const { tag, h } of tags) {
    const inp = out.get(tag.v);
    if (!inp) continue;
    // A block is measured once; skip a second fragment of the same block.
    const id = JSON.stringify(tag);
    if (seen.has(id)) continue;
    seen.add(id);
    if (tag.k === 'header') inp.first = h;
    else if (tag.k === 'heading') inp.headings[tag.sec] = h;
    else if (tag.k === 'item') inp.items[tag.i] = { h, ws: tag.ws, grow: tag.grow, full: tag.full, sec: tag.sec };
  }
  return out;
}

async function measure(doc: React.ReactElement): Promise<LayoutNode | null> {
  let layout: LayoutNode | null = null;
  const el = <FitContext.Provider value={{ mode: 'measure' }}>{doc}</FitContext.Provider>;
  const inst = pdf(el as unknown as Parameters<typeof pdf>[0]);
  // The root may be a component that renders <Document> itself, so hook the
  // document node's onRender rather than a prop on the element.
  const node = (inst as unknown as { container?: { document?: { props?: Record<string, unknown> } } })
    .container?.document;
  if (!node?.props) return null;
  node.props = {
    ...node.props,
    onRender: (params: { _INTERNAL__LAYOUT__DATA_?: LayoutNode }) => {
      layout = params?._INTERNAL__LAYOUT__DATA_ ?? null;
    },
  };
  await inst.toBuffer();
  return layout;
}

/** Plans for every worksheet version in a document, keyed by version. */
export async function planDocument(doc: React.ReactElement): Promise<Map<string, FitPlan> | null> {
  try {
    const layout = await measure(doc);
    if (!layout) return null;
    const plans = new Map<string, FitPlan>();
    for (const [v, inp] of inputsFromLayout(layout)) plans.set(v, planPages(inp));
    return plans;
  } catch (e) {
    console.error('Page fitting failed, printing the plain layout:', e);
    return null;
  }
}

/** The document, ready to print with best-fit spacing. Pass it to pdf(),
 *  renderToBuffer() or PDFDownloadLink in place of the original. */
export async function fitDocument(doc: React.ReactElement): Promise<React.ReactElement> {
  const plans = await planDocument(doc);
  if (!plans) return doc;
  return <FitContext.Provider value={{ mode: 'final', plans }}>{doc}</FitContext.Provider>;
}

/** The fitted version of `doc` once it is ready, null while it is being
 *  measured. For download links that render the document themselves. */
export function useFittedDocument(doc: React.ReactElement | null): React.ReactElement | null {
  const [fitted, setFitted] = React.useState<{ src: React.ReactElement; out: React.ReactElement } | null>(null);
  React.useEffect(() => {
    if (!doc) return;
    let live = true;
    fitDocument(doc).then((out) => {
      if (live) setFitted({ src: doc, out });
    });
    return () => {
      live = false;
    };
  }, [doc]);
  return doc && fitted?.src === doc ? fitted.out : null;
}
