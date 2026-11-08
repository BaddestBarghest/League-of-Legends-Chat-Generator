import type { ChatLine, Settings } from "./types";
import { parseMarkup, stripMarkup, type Segment } from "./markup";

// The game chat uses Gill Sans. It can't be bundled, so we use the copy that
// ships with macOS or Office when it's there, and Metrophobic when it isn't.
export const GILL = "Gill Sans";
const GILL_NAMES = ['"Gill Sans"', "GillSans", '"Gill Sans MT"'];
const FALLBACK = 'Metrophobic, "Trebuchet MS", sans-serif';

export function fontString(s: Settings, scale = 1): string {
  const family = s.fontFamily === GILL ? GILL_NAMES.join(", ") : quoteFamily(s.fontFamily);
  return `${s.fontSize * scale}px ${family}, ${FALLBACK}`;
}

// A font that isn't installed renders at the fallback's width, so a width
// change against two different fallbacks means it's really there.
export function hasLocalGill(): boolean {
  const ctx = document.createElement("canvas").getContext("2d")!;
  const sample = "NesoDarling (Ezreal): 23:34 Jax";
  const width = (font: string) => {
    ctx.font = font;
    return ctx.measureText(sample).width;
  };
  return GILL_NAMES.some((name) =>
    ["monospace", "serif"].every((base) => width(`40px ${name}, ${base}`) !== width(`40px ${base}`)),
  );
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
    if (who && line.kind === "chat") who += ":";
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
}

// Wait for the font so we don't draw with a fallback.
export async function ensureFont(s: Settings): Promise<void> {
  try {
    await document.fonts.load(fontString(s), "Aa[]():0123456789");
  } catch {
    // fallback font is fine
  }
}

interface Piece {
  text: string;
  color: string;
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
    const put = (text: string, color: string) => {
      rows[rows.length - 1].push({ text, color, x });
      x += ctx.measureText(text).width;
    };
    const newRow = () => {
      rows.push([]);
      x = left;
    };

    for (const seg of lineSegments(line, s)) {
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

function rowWidth(row: Piece[], ctx: CanvasRenderingContext2D): number {
  const last = row[row.length - 1];
  return last ? last.x + ctx.measureText(last.text.trimEnd()).width : 0;
}

function measureWith(ctx: CanvasRenderingContext2D, lines: ChatLine[], s: Settings) {
  ctx.font = fontString(s);
  const laid = layout(ctx, lines, s);
  const rows = laid.reduce((n, l) => n + l.length, 0);
  const outline = s.fontSize * s.outline;
  const widest = Math.max(0, ...laid.flat().map((row) => rowWidth(row, ctx)));
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

  rows.forEach((row, i) => {
    const y = s.padding + (startRow + i) * lh + baselineOffset;
    for (const piece of row) {
      // Dark outline and shadow first so text reads on any background.
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = s.shadow;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = s.shadow > 0 ? 1 : 0;
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
