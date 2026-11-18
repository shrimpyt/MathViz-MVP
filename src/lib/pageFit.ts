// pageFit.ts, plans how a worksheet's problems land on its pages.
//
// Pure: it takes measured heights (points) and returns rows, page breaks
// and extra work room. No React, no PDF. PdfDocument measures the real
// layout once (see pdfFit.tsx), runs this, then prints from the plan.
//
// Rules, in order:
//   1. Never split a problem, a proof table or a diagram across pages
//      (each row is one unbreakable block).
//   2. Use the fewest pages that still give every problem honest room to
//      work. A problem only moves, inside its own section, when moving it
//      saves a page. Problems are renumbered in print order.
//   3. Spread the rows evenly over those pages, so there is no nearly empty
//      last page, then hand each page's leftover space to its problems as
//      extra work room (capped, so a short sheet doesn't print huge boxes).

export interface FitItem {
  /** Natural height with no work room (problem, diagram, answer line, cell padding). */
  h: number;
  /** Work room this problem should get (workSpace.ts, already scaled). */
  ws: number;
  /** Weight for leftover space (workSpace.ts grow, scaled). Defaults to ws. */
  grow?: number;
  /** Runs the full page width (proofs, AP free response) instead of half. */
  full: boolean;
  /** Section index; problems never move between sections. */
  sec: number;
}

export interface FitInput {
  /** Usable height of a page (inside the margins). */
  capacity: number;
  /** Height the header (and word bank) takes on page 1. */
  first: number;
  /** Heading height per section (0 when the section prints no heading). */
  headings: number[];
  /** Hairline between rows. */
  rule: number;
  /** Two-column grid (half-width problems pair up in rows). */
  grid: boolean;
  /** Fewer-per-page accommodation: exactly this many problems per page. */
  perPage?: number | null;
  /** Problems in their original order. */
  items: FitItem[];
}

export interface FitRow {
  /** Indexes into FitInput.items, left to right. */
  items: number[];
  sec: number;
  /** Start a new page with this row. */
  breakBefore: boolean;
  /** First printed row of its section (carries the section heading). */
  firstInSection: boolean;
  /** Row body height before stretch: tallest problem plus its work room. */
  body: number;
  /** Extra work room from spreading the page's leftover space. */
  extra: number;
}

export interface FitPlan {
  rows: FitRow[];
  pages: number;
  /** Some problem prints in a different position than it was generated. */
  reordered: boolean;
  /** Work room multiplier that was used (1, or less to drop a page). */
  roomScale: number;
}

/** Points kept free at the foot of every page so a rounding difference in
 *  the real layout can't push a row onto an extra page. */
export const SAFETY = 8;
/** Extra room per problem is capped at this multiple of its own room... */
export const STRETCH_FACTOR = 1.5;
/** ...and never more than this many points. */
export const STRETCH_MAX = 150;
/** Work room may shrink to this share of the default to save a page. */
export const MIN_ROOM_SCALE = 0.7;
/** A last page this empty (share of a page) is worth trying to remove. */
export const LIGHT_LAST_PAGE = 0.35;

type Row = { items: number[]; sec: number };

// ── Row building ──────────────────────────────────────────────────────────────

/** Rows exactly as the old layout built them: a full-width problem flushes a
 *  waiting half-width one, which then prints alone in its row. */
export function legacyRows(items: FitItem[], grid: boolean): Row[] {
  if (!grid) return items.map((it, i) => ({ items: [i], sec: it.sec }));
  const rows: Row[] = [];
  let pending: number | null = null;
  let sec = -1;
  items.forEach((it, i) => {
    if (it.sec !== sec) {
      if (pending !== null) rows.push({ items: [pending], sec });
      pending = null;
      sec = it.sec;
    }
    if (it.full) {
      if (pending !== null) rows.push({ items: [pending], sec });
      pending = null;
      rows.push({ items: [i], sec });
    } else if (pending !== null) {
      rows.push({ items: [pending, i], sec });
      pending = null;
    } else {
      pending = i;
    }
  });
  if (pending !== null) rows.push({ items: [pending], sec });
  return rows;
}

/** Half-width problems pair with the next half-width one in their section,
 *  even across a proof, so no half row is left empty. Rows keep the order
 *  of their first problem. */
function pairedRows(items: FitItem[], grid: boolean): Row[] {
  if (!grid) return legacyRows(items, grid);
  const rows: Row[] = [];
  const secs = [...new Set(items.map((it) => it.sec))];
  for (const sec of secs) {
    const idx = items.map((it, i) => ({ it, i })).filter((x) => x.it.sec === sec);
    const fulls = idx.filter((x) => x.it.full).map((x) => ({ items: [x.i], sec }));
    const halves = idx.filter((x) => !x.it.full).map((x) => x.i);
    const pairs: Row[] = [];
    for (let k = 0; k < halves.length; k += 2) pairs.push({ items: halves.slice(k, k + 2), sec });
    rows.push(...[...fulls, ...pairs].sort((a, b) => a.items[0] - b.items[0]));
  }
  return rows;
}

// ── Heights ───────────────────────────────────────────────────────────────────

function body(row: Row, items: FitItem[], scale: number): number {
  return Math.max(...row.items.map((i) => items[i].h + items[i].ws * scale));
}

/** Height a row takes on the page, with its heading when it opens its section. */
function rowHeight(row: Row, first: boolean, inp: FitInput, scale: number): number {
  return body(row, inp.items, scale) + (first ? inp.headings[row.sec] ?? 0 : inp.rule);
}

const capOf = (inp: FitInput, page: number) =>
  inp.capacity - SAFETY - (page === 0 ? inp.first : 0);

// ── Pagination ────────────────────────────────────────────────────────────────

/** Rows in the order given, each on the current page if it fits. Returns the
 *  page index of every row. */
function paginate(rows: Row[], inp: FitInput, scale: number): number[] {
  const pageOf: number[] = [];
  let page = 0;
  let used = 0;
  let count = 0;
  rows.forEach((row, r) => {
    const first = r === 0 || rows[r - 1].sec !== row.sec;
    const h = rowHeight(row, first, inp, scale);
    // Fewer-per-page is a most-per-page: a new page after that many, or
    // sooner when the next one doesn't fit.
    const over = used > 0 && used + h > capOf(inp, page);
    const full = inp.perPage && !inp.grid ? count >= inp.perPage || over : over;
    if (full) {
      page++;
      used = 0;
      count = 0;
    }
    used += h;
    count++;
    pageOf.push(page);
  });
  return pageOf;
}

/** Fill each page in order, and when the next row doesn't fit, pull up the
 *  tallest later row of the same section that does. */
function bestFitOrder(rows: Row[], inp: FitInput, scale: number): Row[] {
  const left = [...rows];
  const out: Row[] = [];
  let page = 0;
  let used = 0;
  const seenSec = new Set<number>();
  while (left.length > 0) {
    const sec = left[0].sec;
    const h0 = rowHeight(left[0], !seenSec.has(sec), inp, scale);
    let pick = 0;
    if (used > 0 && used + h0 > capOf(inp, page)) {
      // The next row doesn't fit: look for a later row of this section that does.
      let best = -1;
      let bestH = -1;
      for (let k = 1; k < left.length && left[k].sec === sec; k++) {
        const h = rowHeight(left[k], !seenSec.has(sec), inp, scale);
        if (used + h <= capOf(inp, page) && h > bestH) {
          best = k;
          bestH = h;
        }
      }
      if (best < 0) {
        page++;
        used = 0;
      } else {
        pick = best;
      }
    }
    const row = left.splice(pick, 1)[0];
    used += rowHeight(row, !seenSec.has(row.sec), inp, scale);
    seenSec.add(row.sec);
    out.push(row);
  }
  return out;
}

/** Split rows (kept in order) into exactly `pages` pages so the fullest page
 *  is as empty as possible. A row taller than a page gets a page alone. */
function balance(rows: Row[], inp: FitInput, scale: number, pages: number): number[] | null {
  const n = rows.length;
  const h = rows.map((row, r) =>
    rowHeight(row, r === 0 || rows[r - 1].sec !== row.sec, inp, scale),
  );
  const prefix = [0];
  h.forEach((x) => prefix.push(prefix[prefix.length - 1] + x));
  // cost(p, i, j): fill share of page p holding rows i..j-1, or Infinity.
  const cost = (p: number, i: number, j: number) => {
    const fill = prefix[j] - prefix[i];
    const cap = capOf(inp, p);
    if (fill <= cap) return fill / cap;
    return j - i === 1 ? 1 : Infinity; // oversized single row: its own page
  };
  // best[p][j]: lowest max share for rows 0..j-1 on pages 0..p.
  const best: number[][] = Array.from({ length: pages }, () => Array(n + 1).fill(Infinity));
  const from: number[][] = Array.from({ length: pages }, () => Array(n + 1).fill(-1));
  for (let j = 1; j <= n; j++) best[0][j] = cost(0, 0, j);
  for (let p = 1; p < pages; p++) {
    for (let j = p + 1; j <= n; j++) {
      for (let i = p; i < j; i++) {
        const v = Math.max(best[p - 1][i], cost(p, i, j));
        if (v < best[p][j]) {
          best[p][j] = v;
          from[p][j] = i;
        }
      }
    }
  }
  if (!isFinite(best[pages - 1][n])) return null;
  const pageOf = Array(n).fill(0);
  let j = n;
  for (let p = pages - 1; p >= 0; p--) {
    const i = p === 0 ? 0 : from[p][j];
    for (let r = i; r < j; r++) pageOf[r] = p;
    j = i;
  }
  return pageOf;
}

// ── Plan ──────────────────────────────────────────────────────────────────────

interface Candidate {
  rows: Row[];
  pageOf: number[];
  pages: number;
  scale: number;
}

function candidate(rows: Row[], inp: FitInput, scale: number): Candidate {
  const pageOf = paginate(rows, inp, scale);
  return { rows, pageOf, pages: rows.length ? pageOf[pageOf.length - 1] + 1 : 1, scale };
}

function lastPageShare(c: Candidate, inp: FitInput): number {
  const last = c.pages - 1;
  let used = 0;
  c.rows.forEach((row, r) => {
    if (c.pageOf[r] === last) used += rowHeight(row, r === 0 || c.rows[r - 1].sec !== row.sec, inp, c.scale);
  });
  return used / capOf(inp, last);
}

const sameOrder = (a: Row[], b: Row[]) =>
  a.length === b.length && a.every((row, r) => row.items.join() === b[r].items.join());

/** Choose rows, order and page breaks for one worksheet version. */
export function planPages(inp: FitInput): FitPlan {
  const legacy = legacyRows(inp.items, inp.grid);
  const capped = !!inp.perPage && !inp.grid;

  const options = (scale: number): Candidate[] => {
    const list = [candidate(legacy, inp, scale)];
    if (capped) return list; // fewer-per-page keeps its fixed chunks and order
    const paired = pairedRows(inp.items, inp.grid);
    list.push(candidate(paired, inp, scale));
    list.push(candidate(bestFitOrder(paired, inp, scale), inp, scale));
    return list;
  };
  // Fewest pages wins; on a tie the first (least moved) option stays.
  const pick = (list: Candidate[]) =>
    list.reduce((a, b) => (b.pages < a.pages ? b : a));

  let chosen = pick(options(1));
  // A nearly empty last page: see whether a little less room drops it.
  if (!capped && chosen.pages > 1 && lastPageShare(chosen, inp) < LIGHT_LAST_PAGE) {
    for (const scale of [0.85, MIN_ROOM_SCALE]) {
      const c = pick(options(scale));
      if (c.pages < chosen.pages) {
        chosen = c;
        break;
      }
    }
  }

  // Spread rows over the chosen number of pages.
  const pageOf = capped
    ? chosen.pageOf
    : balance(chosen.rows, inp, chosen.scale, chosen.pages) ?? chosen.pageOf;

  // Hand each page's leftover space to its problems as extra work room.
  const rows: FitRow[] = chosen.rows.map((row, r) => ({
    items: row.items,
    sec: row.sec,
    breakBefore: r > 0 && pageOf[r] !== pageOf[r - 1],
    firstInSection: r === 0 || chosen.rows[r - 1].sec !== row.sec,
    body: body(row, inp.items, chosen.scale),
    extra: 0,
  }));
  const pages = rows.length ? pageOf[pageOf.length - 1] + 1 : 1;
  for (let p = 0; p < pages; p++) {
    const on = rows.map((row, r) => ({ row, r })).filter((x) => pageOf[x.r] === p);
    const used = on.reduce(
      (s, { row }) => s + row.body + (row.firstInSection ? inp.headings[row.sec] ?? 0 : inp.rule),
      0,
    );
    let slack = capOf(inp, p) - used;
    if (slack <= 0) continue;
    // Room each row can take: its problems' grow weight times the stretch factor.
    const roomOf = (row: FitRow) => Math.max(...row.items.map((i) => inp.items[i].grow ?? inp.items[i].ws));
    let open = on.filter(({ row }) => roomOf(row) > 0);
    // Water-fill: share the slack by work room, rows that hit their cap drop out.
    while (slack > 0.5 && open.length > 0) {
      const weight = open.reduce((s, { row }) => s + roomOf(row), 0);
      let given = 0;
      const still: typeof open = [];
      for (const { row, r } of open) {
        const cap = Math.min(roomOf(row) * STRETCH_FACTOR, STRETCH_MAX);
        const want = (slack * roomOf(row)) / weight;
        const add = Math.min(want, cap - row.extra);
        row.extra += add;
        given += add;
        if (row.extra < cap - 0.01) still.push({ row, r });
      }
      slack -= given;
      if (given < 0.01) break;
      open = still;
    }
    for (const { row } of on) row.extra = Math.floor(row.extra);
  }

  return {
    rows,
    pages,
    reordered: !sameOrder(chosen.rows, legacy),
    roomScale: chosen.scale,
  };
}
