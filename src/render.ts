import type { ChatLine, Settings } from "./types";
import { parseMarkup, stripMarkup, type Segment } from "./markup";
import { fontAvailable } from "./fontStore";

// The game chat uses Gill Sans MT Pro Medium. It can't be bundled, so we use
// a copy the user loaded, or the Gill Sans that ships with macOS or Office,
// and Metrophobic when there's none.
export const GILL = "Gill Sans";
const GILL_NAMES = ['"Gill Sans MT Pro"', '"Gill Sans"', "GillSans", '"Gill Sans MT"'];
const FALLBACK = 'Metrophobic, "Trebuchet MS", sans-serif';

export function fontString(s: Settings, scale = 1, bold = false): string {
  const family = s.fontFamily === GILL ? GILL_NAMES.join(", ") : quoteFamily(s.fontFamily);
  return `${bold ? "bold " : ""}${s.fontSize * scale}px ${family}, ${FALLBACK}`;
}

// Which Gill Sans will draw the chat, if any.
export function gillInUse(): string | null {
  const name = GILL_NAMES.map((n) => n.replace(/"/g, "")).find((n) => fontAvailable(n));
  return name ?? null;
}

function quoteFamily(f: string): string {
  return /^[\w-]+$/.test(f) ? f : `"${f.replace(/"/g, "")}"`;
}

// Turns a line into colored pieces in the order the game shows them.
export function lineSegments(line: ChatLine, s: Settings): Segment[] {
  const p = s.palette;
  const segs: Segment[] = [];
  if (s.showTime && line.time.trim()) segs.push({ text: line.time.trim() + " ", color: p.time });

  if (line.team !== "system") {
    const nameColor = line.team === "ally" ? p.ally : p.enemy;
    // Only join the parts that are filled in, so a blank name doesn't leave a double space.
    const tag = line.channel === "team" ? "[Team]" : line.channel === "all" ? "[All]" : "";
    const champ = line.champion.trim();
    let who = [tag, line.name.trim(), champ && `(${champ})`].filter(Boolean).join(" ");
    // Same rule as the game: typed chat and HUD pings put a colon after the
    // name, map pings and purchases don't.
    if (who && (line.channel !== "" || line.kind === "chat")) who += ":";
    if (who) segs.push({ text: who + " ", color: nameColor });
  }

  segs.push(...parseMarkup(line.body, p, p.white));
  return segs.filter((x) => x.text.length > 0);
}

export interface RenderOptions {
  // Draw only the first N lines. Size stays the same so frames line up.
  visibleCount?: number;
  // Leave out for a transparent background.
  background?: string;
  // Preview only: a faint band behind this line, the one being edited.
  highlight?: number;
}

// Which line sits at a y position (in unscaled px), for clicking the preview.
export function lineAt(lines: ChatLine[], s: Settings, y: number): number {
  const { laid } = measureWith(document.createElement("canvas").getContext("2d")!, lines, s);
  const row = Math.floor((y - s.padding) / (s.fontSize * s.lineHeight));
  let seen = 0;
  for (let i = 0; i < laid.length; i++) {
    seen += laid[i].length;
    if (row < seen) return row < 0 ? -1 : i;
  }
  return -1;
}

// Wait for the font so we don't draw with a fallback.
export async function ensureFont(s: Settings): Promise<void> {
  try {
    await document.fonts.load(fontString(s), "Aa[]():0123456789");
    await document.fonts.load(fontString(s, 1, true), "Aa[]():0123456789");
  } catch {
    // fallback font is fine
  }
}

interface Piece {
  text: string;
  color: string;
  bold: boolean;
  x: number;
}

// Each chat line becomes one or more rows. With a width set, long lines wrap
// and carry on from the left edge, like the game does.
function layout(ctx: CanvasRenderingContext2D, lines: ChatLine[], s: Settings): Piece[][][] {
  const outline = s.fontSize * s.outline;
  const left = s.padding + outline;
  const maxX = s.fixedWidth > 0 ? s.fixedWidth - s.padding - outline : Infinity;

  return lines.map((line) => {
    const rows: Piece[][] = [[]];
    let x = left;
    let bold = false;
    const put = (text: string, color: string) => {
      rows[rows.length - 1].push({ text, color, bold, x });
      x += ctx.measureText(text).width;
    };
    const newRow = () => {
      rows.push([]);
      x = left;
    };

    for (const seg of lineSegments(line, s)) {
      bold = Boolean(seg.bold);
      ctx.font = fontString(s, 1, bold);
      for (const token of seg.text.split(/(\s+)/)) {
        if (!token) continue;
        const w = ctx.measureText(token).width;
        if (/^\s+$/.test(token)) {
          // Spaces at the start of a wrapped row are dropped.
          if (x > left) put(token, seg.color);
          continue;
        }
        if (x + w > maxX && x > left) newRow();
        if (left + w <= maxX) {
          put(token, seg.color);
          continue;
        }
        // A word wider than the whole box gets split by letter.
        let chunk = "";
        for (const ch of token) {
          if (x + ctx.measureText(chunk + ch).width > maxX && chunk) {
            put(chunk, seg.color);
            newRow();
            chunk = "";
          }
          chunk += ch;
        }
        if (chunk) put(chunk, seg.color);
      }
    }
    return rows;
  });
}

function rowWidth(row: Piece[], ctx: CanvasRenderingContext2D, s: Settings): number {
  const last = row[row.length - 1];
  if (!last) return 0;
  ctx.font = fontString(s, 1, last.bold);
  return last.x + ctx.measureText(last.text.trimEnd()).width;
}

function measureWith(ctx: CanvasRenderingContext2D, lines: ChatLine[], s: Settings) {
  ctx.font = fontString(s);
  const laid = layout(ctx, lines, s);
  const rows = laid.reduce((n, l) => n + l.length, 0);
  const outline = s.fontSize * s.outline;
  const widest = Math.max(0, ...laid.flat().map((row) => rowWidth(row, ctx, s)));
  const width = s.fixedWidth > 0 ? s.fixedWidth : Math.ceil(widest + s.padding + outline);
  const height = Math.ceil(rows * s.fontSize * s.lineHeight + s.padding * 2);
  return { laid, width: Math.max(1, width), height: Math.max(1, height) };
}

export function measure(lines: ChatLine[], s: Settings): { width: number; height: number } {
  const { width, height } = measureWith(document.createElement("canvas").getContext("2d")!, lines, s);
  return { width, height };
}

// Lines sit at the bottom like the in-game chat box.
export function render(
  canvas: HTMLCanvasElement,
  lines: ChatLine[],
  s: Settings,
  scale: number,
  opts: RenderOptions = {},
): void {
  const ctx = canvas.getContext("2d")!;
  const { laid, width, height } = measureWith(ctx, lines, s);
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, width, height);
  if (opts.background) {
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, width, height);
  }

  // Resizing the canvas resets its state, so set the font again.
  ctx.font = fontString(s);
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;

  const lh = s.fontSize * s.lineHeight;
  const outline = s.fontSize * s.outline;
  const baselineOffset = (lh - s.fontSize) / 2 + s.fontSize * 0.8;
  const rows = laid.slice(0, opts.visibleCount ?? laid.length).flat();
  const totalRows = laid.reduce((n, l) => n + l.length, 0);
  const startRow = totalRows - rows.length;

  if (opts.highlight !== undefined && opts.highlight >= 0 && opts.highlight < laid.length) {
    const before = laid.slice(0, opts.highlight).reduce((n, l) => n + l.length, 0);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(0, s.padding + (startRow + before) * lh, width, laid[opts.highlight].length * lh);
  }

  rows.forEach((row, i) => {
    const y = s.padding + (startRow + i) * lh + baselineOffset;
    for (const piece of row) {
      ctx.font = fontString(s, 1, piece.bold);
      // The game draws a hard dark copy 1px right and down at its 14px
      // chat size. Scale that with the text. Canvas shadows ignore the
      // transform, so multiply by the export scale too.
      ctx.save();
      const offset = s.shadow * (s.fontSize / 14) * scale;
      if (offset > 0) {
        ctx.shadowColor = "rgba(0,0,0,0.85)";
        ctx.shadowBlur = offset * 0.35;
        ctx.shadowOffsetX = offset;
        ctx.shadowOffsetY = offset;
      }
      if (outline > 0) {
        ctx.strokeStyle = "rgba(0,0,0,0.78)";
        ctx.lineWidth = outline * 2;
        ctx.strokeText(piece.text, piece.x, y);
      } else {
        ctx.fillStyle = piece.color;
        ctx.fillText(piece.text, piece.x, y);
      }
      ctx.restore();
      // Then the colored text on top.
      ctx.fillStyle = piece.color;
      ctx.fillText(piece.text, piece.x, y);
    }
  });
}

export function toPlainText(lines: ChatLine[], s: Settings): string {
  return lines
    .map((line) => {
      const body = stripMarkup(line.body, s.palette);
      if (line.team === "system") return `${s.showTime ? line.time + " " : ""}${body}`.trim();
      return lineSegments({ ...line, body: "" }, s)
        .map((x) => x.text)
        .join("")
        .concat(body)
        .trim();
    })
    .join("\n");
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG export failed"))), "image/png"),
  );
}
