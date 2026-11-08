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
    let who = "";
    if (line.allChat) who += "[All] ";
    who += line.name;
    if (line.champion.trim()) who += ` (${line.champion.trim()})`;
    if (line.kind === "chat") who += ":";
    segs.push({ text: who + " ", color: nameColor });
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

export function measure(lines: ChatLine[], s: Settings): { width: number; height: number } {
  const ctx = document.createElement("canvas").getContext("2d")!;
  ctx.font = fontString(s);
  let max = 0;
  for (const line of lines) {
    const w = lineSegments(line, s).reduce((acc, seg) => acc + ctx.measureText(seg.text).width, 0);
    max = Math.max(max, w);
  }
  const lh = s.fontSize * s.lineHeight;
  const width = s.fixedWidth > 0 ? s.fixedWidth : Math.ceil(max + s.padding * 2 + s.fontSize * s.outline * 2);
  const height = Math.ceil(lines.length * lh + s.padding * 2);
  return { width: Math.max(1, width), height: Math.max(1, height) };
}

// Lines sit at the bottom like the in-game chat box.
export function render(
  canvas: HTMLCanvasElement,
  lines: ChatLine[],
  s: Settings,
  scale: number,
  opts: RenderOptions = {},
): void {
  const { width, height } = measure(lines, s);
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, width, height);
  if (opts.background) {
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.font = fontString(s);
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;

  const lh = s.fontSize * s.lineHeight;
  const visible = lines.slice(0, opts.visibleCount ?? lines.length);
  const outline = s.fontSize * s.outline;
  const startRow = lines.length - visible.length;
  const baselineOffset = (lh - s.fontSize) / 2 + s.fontSize * 0.8;

  visible.forEach((line, i) => {
    const y = s.padding + (startRow + i) * lh + baselineOffset;
    let x = s.padding + outline;
    for (const seg of lineSegments(line, s)) {
      // Dark outline and shadow first so text reads on any background.
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = s.shadow;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = s.shadow > 0 ? 1 : 0;
      if (outline > 0) {
        ctx.strokeStyle = "rgba(0,0,0,0.78)";
        ctx.lineWidth = outline * 2;
        ctx.strokeText(seg.text, x, y);
      } else {
        ctx.fillStyle = seg.color;
        ctx.fillText(seg.text, x, y);
      }
      ctx.restore();
      // Then the colored text on top.
      ctx.fillStyle = seg.color;
      ctx.fillText(seg.text, x, y);
      x += ctx.measureText(seg.text).width;
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
