import type { Palette } from "./types";

export interface Segment {
  text: string;
  color: string;
  bold?: boolean;
}

const NAMED: Record<string, keyof Palette> = {
  gold: "gold",
  red: "enemy",
  enemy: "enemy",
  blue: "ally",
  ally: "ally",
  white: "white",
  ping: "ping",
  info: "info",
  green: "green",
  cyan: "cyan",
  yellow: "yellow",
};

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const TAG = /<(\/?)([#\w]*)>/g;

// Splits a message into colored pieces. Tags look like <gold>X</gold>,
// <red>X</red> or <#ff66cc>X</>, and <b>X</b> makes text bold. Unknown tags
// stay as plain text, and any other closing tag closes the last color opened.
export function parseMarkup(input: string, palette: Palette, base: string): Segment[] {
  const out: Segment[] = [];
  const stack: string[] = [base];
  let bold = 0;
  let last = 0;

  const push = (text: string) => {
    if (!text) return;
    const color = stack[stack.length - 1];
    const prev = out[out.length - 1];
    if (prev && prev.color === color && Boolean(prev.bold) === bold > 0) prev.text += text;
    else out.push(bold > 0 ? { text, color, bold: true } : { text, color });
  };

  for (const m of input.matchAll(TAG)) {
    const [whole, slash, name] = m;
    const idx = m.index ?? 0;
    const lower = name.toLowerCase();
    let handled = false;

    if (lower === "b") {
      if (!slash || bold > 0) {
        push(input.slice(last, idx));
        bold += slash ? -1 : 1;
        handled = true;
      }
    } else if (slash) {
      if (stack.length > 1) {
        push(input.slice(last, idx));
        stack.pop();
        handled = true;
      }
    } else if (lower in NAMED) {
      push(input.slice(last, idx));
      stack.push(palette[NAMED[lower]]);
      handled = true;
    } else if (HEX.test(name)) {
      push(input.slice(last, idx));
      stack.push(name);
      handled = true;
    }

    if (handled) last = idx + whole.length;
  }
  push(input.slice(last));
  return out;
}

// Same text with the tags removed.
export function stripMarkup(input: string, palette: Palette): string {
  return parseMarkup(input, palette, "#fff").map((s) => s.text).join("");
}
