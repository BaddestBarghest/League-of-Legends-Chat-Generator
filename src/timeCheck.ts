import type { ChatLine } from "./types";

// Game time looks like 46:59 or 1:02:03. Minutes can go past 59.
// Returns seconds, null for a blank time, or NaN when it can't be read.
export function parseTime(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  const m = /^(?:(\d+):)?(\d+):(\d{2})$/.exec(t);
  if (!m) return NaN;
  const [, h, min, sec] = m;
  if (Number(sec) > 59 || (h !== undefined && Number(min) > 59)) return NaN;
  return Number(h ?? 0) * 3600 + Number(min) * 60 + Number(sec);
}

// Seconds back to game time. Minutes keep counting past 59, like in game.
export function formatTime(secs: number): string {
  const s = Math.max(0, Math.floor(secs));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// Problems keyed by line id. Order in the list wins, so a line can't show
// an earlier time than the last timestamped line above it.
export function findTimeIssues(lines: ChatLine[]): Map<string, string> {
  const issues = new Map<string, string>();
  let last: { secs: number; time: string } | null = null;
  for (const line of lines) {
    const secs = parseTime(line.time);
    if (secs === null) continue;
    if (Number.isNaN(secs)) {
      issues.set(line.id, "Use a time like 23:45");
      continue;
    }
    if (last && secs < last.secs) {
      issues.set(line.id, `Earlier than ${last.time} above it`);
      continue;
    }
    last = { secs, time: line.time.trim() };
  }
  return issues;
}

// Moves each out of order time up to the one above it. Bad formats are left
// alone since there's no way to guess what was meant.
export function fixTimes(lines: ChatLine[]): number {
  let fixed = 0;
  let last: { secs: number; time: string } | null = null;
  for (const line of lines) {
    const secs = parseTime(line.time);
    if (secs === null || Number.isNaN(secs)) continue;
    if (last && secs < last.secs) {
      line.time = last.time;
      fixed++;
      continue;
    }
    last = { secs, time: line.time.trim() };
  }
  return fixed;
}
