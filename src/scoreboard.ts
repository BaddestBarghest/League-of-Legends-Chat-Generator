import type { Player, PlayerStats, Settings } from "./types";
import type { IconKind } from "./gameData";
import { loadIcon, loadImage } from "./icons";
import { statsOf } from "./state";

// The Tab scoreboard, drawn with the game's own scoreboard art from
// CommunityDragon. Positions were measured against an in-game screenshot at
// 1080p. If the art can't be loaded, a hand drawn version is used instead.

const ATLAS_URL = "https://raw.communitydragon.org/latest/game/assets/ux/scoreboard/scoreboardatlas.png";

// Where each piece sits in the atlas: x, y, width, height.
type Rect = [number, number, number, number];
const SPRITE: Record<string, Rect> = {
  frame: [6, 23, 1124, 452],
  deadGlow: [1145, 107, 415, 66],
  ringAlive: [1461, 404, 64, 61],
  ringDead: [1530, 404, 64, 61],
  orbGreen: [1577, 475, 18, 18],
  orbRed: [1605, 475, 18, 18],
  orbBlue: [1632, 475, 18, 18],
  unknown: [1634, 214, 49, 40],
  bag: [1797, 486, 11, 12],
  turret: [1838, 15, 32, 48],
};

// The scoreboard's text is Beaufort for LOL Bold. It can't be shared, so it's
// used when the user loads it (see Fonts), with Spectral as a free stand-in.
export const SCOREBOARD_FONT = "Beaufort for LOL";
const FONT_STACK = '"Beaufort for LOL", Spectral, Georgia, serif';
const CAP = 0.666; // Beaufort's digit and capital height, as a share of the size

const FRAME_SCALE = 0.95; // the game draws the frame at 95%
const RING_SCALE = 0.87; // and the portrait rings at 87%
const W = Math.round(SPRITE.frame[2] * FRAME_SCALE);
const HALF = W / 2;
const HEADER = 66; // first row starts here
const ROW = 69;
const BOTTOM = 14;

const C = {
  panelTop: "#0a1d28",
  panelBottom: "#111b26",
  gold: "#655a43",
  teal: "#11404e",
  divider: "#362e1d",
  rowAlive: "#120f14",
  rowDead: "#3d0709",
  slot: "#0a141c",
  slotEdge: "#1c2a33",
  button: "#082f39",
  cs: "#f2ea84",
  kda: "#bfbfbf",
  nameAlive: "#bebebe",
  nameDead: "#e10101",
  respawn: "#ff1a1a",
  bounty: "#b69b65",
  allyKills: "#51a2e6",
  enemyKills: "#e83d32",
  sword: "#af9755",
  badge: "#0b0b0b",
  badgeText: "#d8d8d8",
  // Rims on the portrait and its two badges: bronze when alive, silver when dead.
  rimAlive: "#7f6c44",
  rimDead: "#6b6b6b",
};

export interface ScoreboardOptions {
  allyTurrets: number;
  enemyTurrets: number;
}

export interface ScoreboardArt {
  icons: Map<string, HTMLImageElement | null>;
  atlas: HTMLImageElement | null;
}

const key = (kind: IconKind, name: string) => `${kind}:${name.trim()}`;

let atlasPromise: Promise<HTMLImageElement | null> | null = null;

// The atlas is only used if it still has the layout these positions were
// measured from. A different layout after a patch falls back to drawing.
function loadAtlas(): Promise<HTMLImageElement | null> {
  atlasPromise ??= loadImage(ATLAS_URL).then((img) => {
    if (!img) {
      atlasPromise = null; // try again on the next draw
      return null;
    }
    if (img.naturalWidth !== 2048 || img.naturalHeight !== 512) return null;
    try {
      const c = document.createElement("canvas");
      c.width = 2048;
      c.height = 512;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const alpha = (x: number, y: number) => ctx.getImageData(x, y, 1, 1).data[3];
      const looksRight =
        alpha(306, 223) > 200 && // inside the frame
        alpha(1461 + 5, 404 + 24) > 60 && // edge of the alive ring
        alpha(1461 + 31, 404 + 20) < 40 && // hollow middle of the ring
        alpha(1300, 250) < 40; // a gap between sprites
      return looksRight ? img : null;
    } catch {
      // Reading pixels fails when the image isn't export safe. Don't use it.
      return null;
    }
  });
  return atlasPromise;
}

// Everything the scoreboard needs, loaded before drawing.
export async function loadScoreboardArt(players: Player[]): Promise<ScoreboardArt> {
  const wanted: [IconKind, string][] = [];
  for (const p of players) {
    const s = statsOf(p);
    wanted.push(["champion", p.champion], ["spell", s.spells[0]], ["spell", s.spells[1]]);
    for (const item of s.items) wanted.push(["item", item]);
  }
  const icons = new Map<string, HTMLImageElement | null>();
  const [atlas] = await Promise.all([
    loadAtlas(),
    document.fonts.load(`bold 16px ${FONT_STACK}`).catch(() => []),
    ...wanted.map(async ([kind, name]) => icons.set(key(kind, name), await loadIcon(kind, name))),
  ]);
  return { icons, atlas };
}

export function scoreboardSize(players: Player[]): { width: number; height: number } {
  const rows = Math.max(5, ...(["ally", "enemy"] as const).map((t) => players.filter((p) => p.team === t).length));
  return { width: W, height: HEADER + rows * ROW + BOTTOM };
}

export function renderScoreboard(
  canvas: HTMLCanvasElement,
  players: Player[],
  s: Settings,
  scale: number,
  art: ScoreboardArt,
  opts: ScoreboardOptions,
): void {
  const { width, height } = scoreboardSize(players);
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingQuality = "high";
  const { atlas, icons } = art;

  const sprite = (name: keyof typeof SPRITE, dx: number, dy: number, dw: number, dh: number) => {
    const [sx, sy, sw, sh] = SPRITE[name];
    ctx.drawImage(atlas!, sx, sy, sw, sh, dx, dy, dw, dh);
  };

  // Text is placed by the middle of its digits and capitals, the way the
  // positions were measured, so any font lines up the same.
  const text = (str: string, x: number, y: number, color: string, px: number, align: CanvasTextAlign = "left") => {
    ctx.font = `bold ${px}px ${FONT_STACK}`;
    ctx.textAlign = align;
    ctx.textBaseline = "alphabetic";
    y += (px * CAP) / 2;
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.lineWidth = Math.max(2, px * 0.12);
    ctx.strokeText(str, x, y);
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  };
  void s;

  if (atlas) drawFrame(height);
  else drawPlainFrame(height);

  // Header: turrets on the outside, kills in the middle.
  const mid = 32.5;
  text(String(sum(players, "ally", "kills")), HALF - 24, mid, C.allyKills, 23, "right");
  text(String(sum(players, "enemy", "kills")), HALF + 13, mid, C.enemyKills, 23, "left");
  sword(ctx, HALF - 5, mid);
  turretIcon(HALF - 106, mid + 1.5);
  text(String(opts.allyTurrets), HALF - 85, mid + 1, C.allyKills, 16, "center");
  turretIcon(HALF + 96, mid + 1.5);
  text(String(opts.enemyTurrets), HALF + 114, mid + 1, C.enemyKills, 16, "center");

  // Allies on the left with their ping buttons first, enemies on the right
  // with the buttons last, like the game.
  drawTeam(players.filter((p) => p.team === "ally"), 35, 4);
  drawTeam(players.filter((p) => p.team === "enemy"), HALF - 1, HALF + 2);

  // ---- pieces

  // The frame stretches in the middle so any number of rows fits, while the
  // header and bottom edge keep their shape.
  function drawFrame(h: number) {
    const [sx, sy, sw, sh] = SPRITE.frame;
    const topSrc = 90;
    const bottomSrc = 16;
    const top = topSrc * FRAME_SCALE;
    const bottom = bottomSrc * FRAME_SCALE;
    ctx.drawImage(atlas!, sx, sy, sw, topSrc, 0, 0, W, top);
    ctx.drawImage(atlas!, sx, sy + topSrc, sw, sh - topSrc - bottomSrc, 0, top, W, h - top - bottom);
    ctx.drawImage(atlas!, sx, sy + sh - bottomSrc, sw, bottomSrc, 0, h - bottom, W, bottom);
  }

  function drawPlainFrame(h: number) {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, C.panelTop);
    bg.addColorStop(1, C.panelBottom);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(1, 1, W - 2, h - 2, 6);
    ctx.fill();
    ctx.strokeStyle = C.teal;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = C.divider;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(HALF - 9, HEADER - 6);
    ctx.lineTo(HALF, HEADER + 3);
    ctx.lineTo(HALF + 9, HEADER - 6);
    ctx.moveTo(HALF, HEADER + 3);
    ctx.lineTo(HALF, h - 10);
    ctx.stroke();
  }

  function turretIcon(cx: number, cy: number) {
    if (atlas) sprite("turret", cx - 6, cy - 9, 12, 18);
    else turretShape(ctx, cx, cy);
  }

  function drawTeam(team: Player[], o: number, rowLeft: number) {
    const ally = rowLeft < HALF;
    team.forEach((p, i) => {
      const top = HEADER + i * ROW;
      const cy = top + ROW / 2;
      const st = statsOf(p);
      const dead = st.respawn > 0;

      // Dead players get a red glow from the left of their row.
      if (dead) {
        if (atlas) sprite("deadGlow", rowLeft, top + 1, 450, ROW - 2);
        else {
          const g = ctx.createLinearGradient(rowLeft, 0, rowLeft + 450, 0);
          g.addColorStop(0, C.rowDead);
          g.addColorStop(1, "rgba(61,7,9,0)");
          ctx.fillStyle = g;
          ctx.fillRect(rowLeft, top + 2, 450, ROW - 4);
        }
      } else if (!atlas) {
        ctx.fillStyle = C.rowAlive;
        ctx.fillRect(rowLeft, top + 2, HALF - 6, ROW - 4);
      }

      buttons(ctx, ally ? 15 : W - 32, cy);

      // Summoner spells, stacked.
      tile(ctx, icons.get(key("spell", st.spells[0])), o + 8, cy - 25, 22);
      tile(ctx, icons.get(key("spell", st.spells[1])), o + 8, cy + 1, 22);

      portraitWithBadges(icons.get(key("champion", p.champion)), o + 87.4, cy, dead, st);

      // Creep score and K/D/A, with the bounty above when there is one.
      text(String(st.cs), o + 159, cy + 2.5, C.cs, 16, "center");
      text(`${st.kills}/${st.deaths}/${st.assists}`, o + 221.5, cy + 2.5, C.kda, 16, "center");
      if (st.bounty > 0) {
        if (atlas) sprite("bag", o + 192, cy - 23, 11, 12);
        text(`${st.bounty}G`, o + 233, cy - 16.5, C.bounty, 12, "center");
      }

      // Name, then six item slots and the trinket.
      text(p.name, o + 272, cy - 22, dead ? C.nameDead : C.nameAlive, 12, "left");
      for (let slot = 0; slot < 6; slot++) tile(ctx, icons.get(key("item", st.items[slot])), o + 272 + slot * 31, cy - 10.5, 28);
      tile(ctx, icons.get(key("item", st.items[6])), o + 464, cy - 10.5, 28);
    });
  }

  // Round portrait with the ult badge on the left and the level badge on
  // the right. Grey with a red respawn timer when dead.
  function portraitWithBadges(img: HTMLImageElement | null | undefined, px: number, py: number, dead: boolean, st: PlayerStats) {
    const r = 21.5;
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#14191d";
    ctx.fill();
    if (img) {
      // Champion icons have a border baked in, so zoom past it a little.
      if (dead) ctx.filter = "grayscale(1) brightness(0.8)";
      ctx.drawImage(img, px - r * 1.15, py - r * 1.15, r * 2.3, r * 2.3);
    } else if (atlas) {
      const [, , uw, uh] = SPRITE.unknown;
      sprite("unknown", px - uw / 2, py - uh / 2, uw, uh);
    }
    ctx.restore();

    const left = { x: px - 17, y: py + 18.3 };
    const right = { x: px + 17.4, y: py + 18.3 };
    if (atlas) {
      const [, , rw, rh] = SPRITE.ringAlive;
      const w = rw * RING_SCALE;
      const h = rh * RING_SCALE;
      sprite(dead ? "ringDead" : "ringAlive", px - 31.5 * RING_SCALE, py - 27 * RING_SCALE, w, h);
      const orb = 18 * RING_SCALE;
      // The ult badge is red for everyone. The game's blue is a cooldown
      // overlay drawn on top of it, not a team color.
      sprite("orbRed", left.x - orb / 2, left.y - orb / 2, orb, orb);
    } else {
      const rim = dead ? C.rimDead : C.rimAlive;
      ctx.beginPath();
      ctx.arc(px, py, r + 1, 0, Math.PI * 2);
      ctx.strokeStyle = rim;
      ctx.lineWidth = 2;
      ctx.stroke();
      badge(ctx, left.x, left.y, 9, "#3a0606", rim);
      badge(ctx, right.x, right.y, 9, C.badge, rim);
    }
    text(String(st.level), right.x, right.y, C.badgeText, 11, "center");
    if (dead) text(String(st.respawn), px, py + 2, C.respawn, 26, "center");
  }
}

function sum(players: Player[], team: Player["team"], stat: keyof Pick<PlayerStats, "kills">): number {
  return players.filter((p) => p.team === team).reduce((n, p) => n + statsOf(p)[stat], 0);
}

// An icon tile, or an empty slot when there's no icon.
function tile(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null | undefined, x: number, y: number, size: number) {
  if (img) ctx.drawImage(img, x, y, size, size);
  else {
    ctx.fillStyle = C.slot;
    ctx.fillRect(x, y, size, size);
  }
  ctx.strokeStyle = C.slotEdge;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
}

function badge(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, edge: string) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// The ping and mute-chat buttons beside each row.
function buttons(ctx: CanvasRenderingContext2D, x: number, cy: number) {
  for (const [dy, glyph] of [[-22, "!"], [4, "chat"]] as const) {
    const y = cy + dy;
    ctx.fillStyle = C.button;
    ctx.fillRect(x, y, 18, 18);
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, 17, 17);
    ctx.fillStyle = "#c8aa6e";
    if (glyph === "!") {
      ctx.fillRect(x + 8, y + 4, 2, 7);
      ctx.fillRect(x + 8, y + 12.5, 2, 2);
    } else {
      ctx.fillRect(x + 4, y + 5, 10, 6);
      ctx.beginPath();
      ctx.moveTo(x + 6, y + 11);
      ctx.lineTo(x + 6, y + 14);
      ctx.lineTo(x + 9, y + 11);
      ctx.fill();
    }
  }
}

// Small gold sword between the kill counts.
function sword(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = C.sword;
  ctx.fillRect(-1.5, -9, 3, 12);
  ctx.fillRect(-4.5, 3, 9, 2.5);
  ctx.fillRect(-1.5, 5, 3, 3.5);
  ctx.restore();
}

// Fallback turret glyph when the atlas isn't available.
function turretShape(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#9aa3a8";
  ctx.beginPath();
  ctx.moveTo(x, y - 9);
  ctx.lineTo(x + 6, y - 4);
  ctx.lineTo(x + 3, y - 2);
  ctx.lineTo(x + 4, y + 8);
  ctx.lineTo(x - 4, y + 8);
  ctx.lineTo(x - 3, y - 2);
  ctx.lineTo(x - 6, y - 4);
  ctx.closePath();
  ctx.fill();
}
