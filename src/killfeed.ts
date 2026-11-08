import type { KillEntry, Killfeed, Player, Portrait } from "./types";
import { loadImage } from "./icons";
import { gameDataReady, iconUrl } from "./gameData";
import { storedImage } from "./imageStore";

// The kill feed in the top right of the game. Positions come from the game's
// KillCallout layout, made for a 1600x1200 screen and anchored to the right
// edge. Each row sits in a 70px slot.

const ATLAS = "https://raw.communitydragon.org/latest/game/assets/ux/popups/killcalloutatlas.png";
const SLOT = 70;
const RIGHT = 1600; // layout x values are measured from the left of a 1600 wide screen
const SLOT_TOP = 264;
const PAD = 6;

type Rect = [number, number, number, number]; // x, y, w, h in layout units
type UV = [number, number, number, number]; // x0, y0, x1, y1 in the atlas

const L = {
  background: { rect: [1395, 267, 205, 64] as Rect, uv: [51, 0, 256, 64] as UV },
  killerFrame: [1457, 274, 50, 50] as Rect,
  killer: [1459, 276, 46, 46] as Rect,
  victimFrame: [1545, 274, 50, 50] as Rect,
  victim: [1547, 276, 46, 46] as Rect,
  assistFrames: [1420, 1383, 1346, 1309].map((x) => [x, 291, 33, 33] as Rect),
  assists: [1422, 1385, 1348, 1311].map((x) => [x, 293, 29, 29] as Rect),
  frameUV: [206, 66, 256, 116] as UV,
};

export const KILL_ICONS: Record<Exclude<KillEntry["icon"], "custom">, { label: string; rect: Rect; uv: UV }> = {
  normal: { label: "Kill", rect: [1513, 286, 28, 29], uv: [5, 96, 33, 125] },
  streak: { label: "Kill streak", rect: [1510, 284, 31, 32], uv: [40, 94, 71, 126] },
  shutdown: { label: "Shutdown", rect: [1511, 284, 32, 32], uv: [77, 94, 109, 126] },
  capture: { label: "Objective", rect: [1511, 284, 32, 32], uv: [114, 94, 145, 126] },
  revive: { label: "Revive", rect: [1513, 286, 28, 29], uv: [150, 96, 178, 125] },
};
const CUSTOM_ICON: Rect = [1511, 284, 32, 32];

export const killImageKey = (entryId: string, slot: string) => `kill:${entryId}:${slot}`;

export interface KillfeedArt {
  atlas: HTMLImageElement | null;
  images: Map<string, HTMLImageElement | null>;
}

const cache = new Map<string, Promise<HTMLImageElement | null>>();
const image = (url: string) => {
  if (!cache.has(url)) cache.set(url, loadImage(url));
  return cache.get(url)!;
};

// Where a portrait's picture comes from, or null for none.
function source(p: Portrait, entryId: string, slot: string, players: Player[]): { url?: string; key?: string } | null {
  if (p.kind === "none") return null;
  if (p.kind === "custom") return { key: killImageKey(entryId, slot) };
  const champion = p.kind === "player" ? players.find((x) => x.id === p.value)?.champion : p.value;
  const url = champion ? iconUrl("champion", champion) : undefined;
  return url ? { url } : null;
}

const slots = (e: KillEntry): [string, Portrait][] => [
  ["killer", e.killer],
  ["victim", e.victim],
  ...e.assists.slice(0, 4).map((a, i): [string, Portrait] => [`a${i}`, a]),
];

export async function loadKillfeedArt(feed: Killfeed, players: Player[]): Promise<KillfeedArt> {
  await gameDataReady();
  const images = new Map<string, HTMLImageElement | null>();
  const jobs: Promise<unknown>[] = [];
  for (const e of feed.entries) {
    for (const [slot, p] of slots(e)) {
      const src = source(p, e.id, slot, players);
      if (src?.url) jobs.push(image(src.url).then((im) => images.set(src.url!, im)));
      if (src?.key) jobs.push(storedImage(src.key).then((im) => images.set(src.key!, im)));
    }
    if (e.icon === "custom") {
      const key = killImageKey(e.id, "icon");
      jobs.push(storedImage(key).then((im) => images.set(key, im)));
    }
  }
  const [atlas] = await Promise.all([image(ATLAS), ...jobs]);
  return { atlas, images };
}

// The leftmost thing in a row decides how wide the picture is.
function leftEdge(e: KillEntry): number {
  const n = Math.min(4, e.assists.filter((a) => a.kind !== "none").length);
  return n ? L.assistFrames[n - 1][0] : L.background.rect[0];
}

export function killfeedSize(feed: Killfeed): { width: number; height: number } {
  const left = Math.min(L.background.rect[0], ...feed.entries.map(leftEdge));
  return { width: RIGHT - left + PAD * 2, height: Math.max(1, feed.entries.length) * SLOT + PAD };
}

// Grey and white art tinted with a team color, keeping its own shading.
const tints = new Map<string, HTMLCanvasElement>();
function tinted(atlas: HTMLImageElement, uv: UV, color: string): HTMLCanvasElement {
  const key = `${uv.join(",")}|${color}`;
  let c = tints.get(key);
  if (c) return c;
  const [x0, y0, x1, y1] = uv;
  c = document.createElement("canvas");
  c.width = x1 - x0;
  c.height = y1 - y0;
  const g = c.getContext("2d")!;
  g.drawImage(atlas, x0, y0, c.width, c.height, 0, 0, c.width, c.height);
  g.globalCompositeOperation = "multiply";
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = "destination-in";
  g.drawImage(atlas, x0, y0, c.width, c.height, 0, 0, c.width, c.height);
  tints.set(key, c);
  return c;
}

export function renderKillfeed(canvas: HTMLCanvasElement, feed: Killfeed, players: Player[], scale: number, art: KillfeedArt): void {
  const size = killfeedSize(feed);
  canvas.width = Math.round(size.width * scale);
  canvas.height = Math.round(size.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = "high";
  const atlas = art.atlas;
  // Layout x values become canvas x, right edge at the right of the picture.
  const ox = size.width - PAD - RIGHT;

  feed.entries.forEach((e, row) => {
    const oy = PAD / 2 + row * SLOT - SLOT_TOP;
    const at = (r: Rect): Rect => [(r[0] + ox) * scale, (r[1] + oy) * scale, r[2] * scale, r[3] * scale];
    const color = e.team === "ally" ? feed.allyColor : feed.enemyColor;

    if (atlas) ctx.drawImage(tinted(atlas, L.background.uv, color), ...at(L.background.rect));

    const portrait = (p: Portrait, slot: string, rect: Rect, frame: Rect) => {
      const src = source(p, e.id, slot, players);
      if (!src) return;
      const im = art.images.get((src.url ?? src.key)!) ?? null;
      const [x, y, w, h] = at(rect);
      if (im) {
        // Square crop from the middle, so any picture fills the slot.
        const s = Math.min(im.naturalWidth, im.naturalHeight);
        ctx.drawImage(im, (im.naturalWidth - s) / 2, (im.naturalHeight - s) / 2, s, s, x, y, w, h);
      } else {
        ctx.fillStyle = "#0a0f14";
        ctx.fillRect(x, y, w, h);
      }
      if (atlas) ctx.drawImage(tinted(atlas, L.frameUV, color), ...at(frame));
    };

    e.assists.slice(0, 4).forEach((a, i) => portrait(a, `a${i}`, L.assists[i], L.assistFrames[i]));
    portrait(e.killer, "killer", L.killer, L.killerFrame);
    portrait(e.victim, "victim", L.victim, L.victimFrame);

    if (e.icon === "custom") {
      const im = art.images.get(killImageKey(e.id, "icon"));
      if (im) {
        const [x, y, w, h] = at(CUSTOM_ICON);
        const k = Math.min(w / im.naturalWidth, h / im.naturalHeight);
        ctx.drawImage(im, x + (w - im.naturalWidth * k) / 2, y + (h - im.naturalHeight * k) / 2, im.naturalWidth * k, im.naturalHeight * k);
      }
    } else if (atlas) {
      const ic = KILL_ICONS[e.icon];
      const [u0, v0, u1, v1] = ic.uv;
      ctx.drawImage(atlas, u0, v0, u1 - u0, v1 - v0, ...at(ic.rect));
    }
  });
}
