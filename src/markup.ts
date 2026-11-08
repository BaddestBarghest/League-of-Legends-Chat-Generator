import type { Palette } from "./types";

export interface Segment {
  text: string;
  color: string;
}

const NAMED: Record<string, keyof Palette> = {
  gold: "gold",
  yellow: "gold",
  red: "enemy",
  enemy: "enemy",
  blue: "ally",
  ally: "ally",
  white: "white",
  ping: "ping",
  info: "info",
  green: "green",
  cyan: "cyan",
};

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const TAG = /<(\/?)([#\w]*)>/g;

// Splits a message into colored pieces. Tags look like <gold>X</gold>,
// <red>X</red> or <#ff66cc>X</>. Unknown tags stay as plain text, and any
// closing tag closes the last one opened.
export function parseMarkup(input: string, palette: Palette, base: string): Segment[] {
  const out: Segment[] = [];
  const stack: string[] = [base];
  let last = 0;

  const push = (text: string) => {
    if (!text) return;
    const color = stack[stack.length - 1];
    const prev = out[out.length - 1];
    if (prev && prev.color === color) prev.text += text;
    else out.push({ text, color });
  };

  for (const m of input.matchAll(TAG)) {
    const [whole, slash, name] = m;
    const idx = m.index ?? 0;
    const lower = name.toLowerCase();
    let handled = false;

    if (slash) {
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
