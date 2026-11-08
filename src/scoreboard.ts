import type { Player, PlayerStats, Settings } from "./types";
import type { IconKind } from "./gameData";
import { loadIcon } from "./icons";
import { fontString } from "./render";
import { statsOf } from "./state";

// The Tab scoreboard. Sizes, positions and colors were measured from an
// in-game screenshot, at the size it shows on a 1080p screen.

const W = 1070; // panel width
const HALF = W / 2;
const HEADER = 64;
const ROW = 69;

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

type Icons = Map<string, HTMLImageElement | null>;
const key = (kind: IconKind, name: string) => `${kind}:${name.trim()}`;

// Every icon the scoreboard needs, loaded before drawing.
export async function loadScoreboardIcons(players: Player[]): Promise<Icons> {
  const wanted: [IconKind, string][] = [];
  for (const p of players) {
    const s = statsOf(p);
    wanted.push(["champion", p.champion], ["spell", s.spells[0]], ["spell", s.spells[1]]);
    for (const item of s.items) wanted.push(["item", item]);
  }
  const icons: Icons = new Map();
  await Promise.all(wanted.map(async ([kind, name]) => icons.set(key(kind, name), await loadIcon(kind, name))));
  return icons;
}

export function scoreboardSize(players: Player[]): { width: number; height: number } {
  const rows = Math.max(5, ...(["ally", "enemy"] as const).map((t) => players.filter((p) => p.team === t).length));
  return { width: W, height: HEADER + rows * ROW + 14 };
}

export function renderScoreboard(
  canvas: HTMLCanvasElement,
  players: Player[],
  s: Settings,
  scale: number,
  icons: Icons,
  opts: ScoreboardOptions,
): void {
  const { width, height } = scoreboardSize(players);
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const font = (px: number, bold = false) => fontString({ ...s, fontSize: px }, 1, bold);
  const text = (str: string, x: number, y: number, color: string, px: number, align: CanvasTextAlign = "left", bold = false) => {
    ctx.font = font(px, bold);
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.lineWidth = Math.max(2, px * 0.12);
    ctx.strokeText(str, x, y);
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  };

  // Panel with its gold and teal edge.
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, C.panelTop);
  bg.addColorStop(1, C.panelBottom);
  ctx.fillStyle = bg;
  roundRect(ctx, 1, 1, width - 2, height - 2, 6);
  ctx.fill();
  ctx.strokeStyle = C.teal;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Header: turrets on the outside, kills in the middle.
  const allyKills = sum(players, "ally", "kills");
  const enemyKills = sum(players, "enemy", "kills");
  const mid = HEADER / 2 + 4;
  text(String(allyKills), HALF - 14, mid, C.allyKills, 26, "right", true);
  text(String(enemyKills), HALF + 14, mid, C.enemyKills, 26, "left", true);
  sword(ctx, HALF, mid);
  turret(ctx, HALF - 108, mid);
  text(String(opts.allyTurrets), HALF - 94, mid, C.allyKills, 16, "left");
  turret(ctx, HALF + 92, mid);
  text(String(opts.enemyTurrets), HALF + 106, mid, C.enemyKills, 16, "left");

  // The divider between the teams, with its notch at the top.
  ctx.strokeStyle = C.divider;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(HALF - 9, HEADER - 4);
  ctx.lineTo(HALF, HEADER + 5);
  ctx.lineTo(HALF + 9, HEADER - 4);
  ctx.moveTo(HALF, HEADER + 5);
  ctx.lineTo(HALF, height - 10);
  ctx.stroke();

  // Allies on the left with their ping buttons first, enemies on the right
  // with the buttons last, like the game.
  drawTeam(players.filter((p) => p.team === "ally"), 4, 31, true);
  drawTeam(players.filter((p) => p.team === "enemy"), HALF + 2, 0, false);

  function drawTeam(team: Player[], x0: number, inset: number, buttonsFirst: boolean) {
    team.forEach((p, i) => {
      const top = HEADER + i * ROW;
      const cy = top + ROW / 2;
      const st = statsOf(p);
      const dead = st.respawn > 0;
      const w = HALF - 6;

      // Row background, red from the left when dead.
      if (dead) {
        const g = ctx.createLinearGradient(x0, 0, x0 + w, 0);
        g.addColorStop(0, C.rowDead);
        g.addColorStop(0.75, C.rowAlive);
        ctx.fillStyle = g;
      } else ctx.fillStyle = C.rowAlive;
      ctx.fillRect(x0, top + 2, w, ROW - 4);

      const o = x0 + inset;
      if (buttonsFirst) buttons(ctx, x0 + 8, cy);
      else buttons(ctx, x0 + w - 26, cy);

      // Summoner spells, stacked.
      tile(ctx, icons.get(key("spell", st.spells[0])), o + 8, cy - 25, 22);
      tile(ctx, icons.get(key("spell", st.spells[1])), o + 8, cy + 1, 22);

      // Portrait, grey with a red timer when dead, plus ult and level badges.
      const px = o + 87;
      const py = cy - 2;
      portrait(ctx, icons.get(key("champion", p.champion)), px, py, 23, dead);
      if (dead) text(String(st.respawn), px, py + 1, C.respawn, 22, "center", true);
      const rim = dead ? C.rimDead : C.rimAlive;
      badge(ctx, px - 16, py + 17, 9, p.team === "ally" ? "#0b1a2a" : "#3a0606", rim);
      badge(ctx, px + 16, py + 17, 9, C.badge, rim);
      text(String(st.level), px + 16, py + 17.5, C.badgeText, 11, "center", true);

      // Creep score and K/D/A, with the bounty above when there is one.
      text(String(st.cs), o + 158, cy, C.cs, 16, "center", true);
      text(`${st.kills}/${st.deaths}/${st.assists}`, o + 221, cy, C.kda, 16, "center", true);
      if (st.bounty > 0) text(`${st.bounty}G`, o + 228, cy - 19, C.bounty, 12, "center");

      // Name, then six item slots and the trinket.
      text(p.name, o + 271, cy - 23, dead ? C.nameDead : C.nameAlive, 12, "left", true);
      for (let slot = 0; slot < 6; slot++) tile(ctx, icons.get(key("item", st.items[slot])), o + 271 + slot * 31, cy - 10, 28);
      tile(ctx, icons.get(key("item", st.items[6])), o + 460, cy - 10, 28);
    });
  }
}

function sum(players: Player[], team: Player["team"], stat: keyof Pick<PlayerStats, "kills">): number {
  return players.filter((p) => p.team === team).reduce((n, p) => n + statsOf(p)[stat], 0);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
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

function portrait(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null | undefined, x: number, y: number, r: number, grey: boolean) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  if (img) {
    // Champion icons have a border baked in, so zoom past it a little.
    if (grey) ctx.filter = "grayscale(1) brightness(0.8)";
    ctx.drawImage(img, x - r * 1.15, y - r * 1.15, r * 2.3, r * 2.3);
  } else {
    ctx.fillStyle = "#1b2228";
    ctx.fill();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = grey ? C.rimDead : C.rimAlive;
  ctx.lineWidth = 2;
  ctx.stroke();
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
  ctx.fillStyle = "#c8aa6e";
  ctx.fillRect(-1.5, -10, 3, 14);
  ctx.fillRect(-5, 3, 10, 2.5);
  ctx.fillRect(-1.5, 5, 3, 4);
  ctx.restore();
}

// Turret glyph next to each team's turret count.
function turret(ctx: CanvasRenderingContext2D, x: number, y: number) {
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
