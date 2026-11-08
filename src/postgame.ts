import type { Player, Postgame } from "./types";
import { loadImage } from "./icons";
import { augmentRarityOf, challengeTokenUrl, clientAsset, gameDataReady, iconUrl, loadAugments, loadChallenges, loadSkins, splashUrl } from "./gameData";
import { statsOf } from "./state";

// The client's post-game Scoreboard tab. Sizes are the client's own units at
// 1280x720, taken from Riot's stylesheet where it has them and from a 1600x900
// screenshot (1.25x) for the rest. Only the main window is drawn, not the
// friends list beside it.

export const PG_W = 1056;
export const PG_H = 720;
const PLUGIN = "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-postgame/global/default/";
const BACKGROUNDS: Record<Postgame["map"], string> = {
  HA: "/lol-game-data/assets/content/src/LeagueClient/GameModeAssets/ARAM/img/gameflow-background-dark.jpg",
  SR: "/lol-game-data/assets/content/src/LeagueClient/GameModeAssets/Classic_SRU/img/gameflow-background-dark.jpg",
};
const BEAUFORT = '"Beaufort for LOL", Spectral, Georgia, serif';
const SPIEGEL = '"Spiegel", "Source Sans 3", "Segoe UI", sans-serif';

const C = {
  text: "#f0e6d2",
  grey: "#a09b8c",
  gold: "#cdbe91",
  goldDark: "#785a28",
  line: "#3c3c41",
  ally: "#0a96aa",
  allyName: "#0acbe6",
  enemy: "#be1e37",
  local: "#fabe0a",
  bar: "#cdfafa",
  empty: "#1e2328",
  ink: "#010a13",
};
const RARITY: Record<string, [string, string, string]> = {
  // border top, border bottom, icon tint
  kSilver: ["#5b5a56", "#5b5a56", "#a3b9bd"],
  kGold: ["#5b5a56", "#5b5a56", "#e3c49f"],
  kPrismatic: ["#e78fff", "#70008f", "#f2c2ff"],
};

// Rows and columns
const ROW_X = 50.4;
const ROW_W = 956;
const ROW_H = 40;
const TEAM_HEAD_H = 35;
const FIRST_TEAM_Y = 119;
const COL = { kda: 756.8, damage: 845.6, gold: 933.6, challenge: 992.4 };

type Images = Map<string, HTMLImageElement | null>;
export interface PostgameArt {
  images: Images;
}

const cache = new Map<string, Promise<HTMLImageElement | null>>();
function image(url: string | undefined): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  if (!cache.has(url)) cache.set(url, loadImage(url));
  return cache.get(url)!;
}

const ICONS = {
  kda: "scoreboard-kda-icon.svg",
  coins: "scoreboard-coins-icon.svg",
  sword: "scoreboard-sword-icon.svg",
  crystal: "scoreboard-challenge-crystal-icon.svg",
  star: "scoreboard-row-stat-star-icon.svg",
  bullet: "scoreboard-separator-bullet.svg",
  arrow: "scoreboard-stat-switcher-arrow.svg",
  actions: "scoreboard-row-player-actions-button.png",
  playAgain: "button-find-match.png",
};

const crestFile = (pg: Postgame) => `icon-${pg.map.toLowerCase()}-${pg.result}.png`;

export async function loadPostgameArt(pg: Postgame, players: Player[]): Promise<PostgameArt> {
  // Skins need the champion list first.
  await gameDataReady();
  await Promise.all([
    loadAugments(),
    loadChallenges(),
    ...players.map((p) => loadSkins(p.champion)),
    document.fonts.load(`bold 14px ${BEAUFORT}`).catch(() => []),
    document.fonts.load(`12px ${SPIEGEL}`).catch(() => []),
  ]);
  const urls = new Set<string>([
    clientAsset(BACKGROUNDS[pg.map]),
    PLUGIN + crestFile(pg),
    ...Object.values(ICONS).map((f) => PLUGIN + f),
  ]);
  for (const p of players) {
    const s = statsOf(p);
    for (const u of [
      splashUrl(p.champion, s.skin),
      ...s.items.map((i) => (i ? iconUrl("item", i) : undefined)),
      ...s.spells.map((sp) => (sp ? iconUrl("spell", sp) : undefined)),
      ...s.augments.map((a) => (a ? iconUrl("augment", a) : undefined)),
      s.challenge ? challengeTokenUrl(s.challenge, s.challengeTier) : undefined,
    ]) {
      if (u) urls.add(u);
    }
  }
  const images: Images = new Map();
  await Promise.all([...urls].map(async (u) => images.set(u, await image(u))));
  return { images };
}

// ---- drawing helpers

type Ctx = CanvasRenderingContext2D;

function text(ctx: Ctx, s: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = "left", spacing = 0): number {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.letterSpacing = `${spacing}px`;
  ctx.fillText(s, x, y);
  const w = ctx.measureText(s).width;
  ctx.letterSpacing = "0px";
  return w;
}

// Draws an image as a one-color shape, like the client's CSS masks.
const tinted = new Map<string, HTMLCanvasElement>();
function mask(ctx: Ctx, img: HTMLImageElement | null | undefined, x: number, y: number, w: number, h: number, color: string): void {
  if (!img) return;
  const scale = Math.abs(ctx.getTransform().a);
  const pw = Math.max(1, Math.round(w * scale));
  const ph = Math.max(1, Math.round(h * scale));
  const key = `${img.src}|${color}|${pw}x${ph}`;
  let c = tinted.get(key);
  if (!c) {
    c = document.createElement("canvas");
    c.width = pw;
    c.height = ph;
    const g = c.getContext("2d")!;
    // Keep the picture's shape, like CSS mask-size: contain.
    const k = Math.min(pw / (img.naturalWidth || pw), ph / (img.naturalHeight || ph));
    const dw = (img.naturalWidth || pw) * k;
    const dh = (img.naturalHeight || ph) * k;
    g.drawImage(img, (pw - dw) / 2, (ph - dh) / 2, dw, dh);
    g.globalCompositeOperation = "source-in";
    g.fillStyle = color;
    g.fillRect(0, 0, pw, ph);
    tinted.set(key, c);
  }
  ctx.drawImage(c, x, y, w, h);
}

const num = (n: number) => Math.round(n).toLocaleString("en-US");

// Game length as minutes, from "17:00" or "17".
function minutes(duration: string): number {
  const [m, s] = duration.split(":").map((v) => Number(v) || 0);
  return Math.max(1 / 60, m + (s ?? 0) / 60);
}

// ---- the screen

export function renderPostgame(canvas: HTMLCanvasElement, pg: Postgame, players: Player[], scale: number, art: PostgameArt): void {
  canvas.width = Math.round(PG_W * scale);
  canvas.height = Math.round(PG_H * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const img = (u: string | undefined) => (u ? (art.images.get(u) ?? null) : null);
  const icon = (k: keyof typeof ICONS) => img(PLUGIN + ICONS[k]);

  // Background, stretched across the whole client window like the client does.
  const bg = img(clientAsset(BACKGROUNDS[pg.map]));
  ctx.fillStyle = "#010a13";
  ctx.fillRect(0, 0, PG_W, PG_H);
  if (bg) ctx.drawImage(bg, 0, 0, 1280, 720);

  drawHeader(ctx, pg, img);

  const allies = players.filter((p) => p.team === "ally");
  const enemies = players.filter((p) => p.team === "enemy");
  const mins = minutes(pg.duration);
  const everyone = [...allies, ...enemies];
  const topDamage = Math.max(1, ...everyone.map((p) => statsOf(p).damage));
  const ctxRow = { pg, img, icon, mins, topDamage };

  let y = FIRST_TEAM_Y;
  // The local player's team comes first and gets the blue name.
  y = drawTeam(ctx, "TEAM 1", allies, true, y, ctxRow);
  drawTeam(ctx, "TEAM 2", enemies, false, y, ctxRow);

  drawFooter(ctx, pg, icon);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

type ImgFn = (u: string | undefined) => HTMLImageElement | null;
type IconFn = (k: keyof typeof ICONS) => HTMLImageElement | null;

function drawHeader(ctx: Ctx, pg: Postgame, img: ImgFn): void {
  const crest = img(PLUGIN + crestFile(pg));
  // The crest art has a little padding, so it's drawn a bit bigger.
  if (crest) ctx.drawImage(crest, 26.6, 21, 38, 38);
  text(ctx, pg.result === "victory" ? "VICTORY" : "DEFEAT", 79.2, 38.4, `bold 24px ${BEAUFORT}`, C.text, "left", 0.6);

  // Map • mode • record • length • GameID
  const parts = [pg.mapName, pg.mode, pg.record, pg.duration].filter((s) => s.trim());
  if (pg.showGameId) parts.push("GameID");
  let x = 80;
  parts.forEach((part, i) => {
    if (i > 0) {
      ctx.fillStyle = C.line;
      ctx.fillRect(x + 7.6, 53.6, 4, 4);
      x += 19.2;
    }
    x += text(ctx, part, x, 59, `12px ${SPIEGEL}`, C.grey);
    if (part === "GameID" && pg.showGameId) {
      // The copy icon after GameID.
      ctx.fillStyle = C.grey;
      ctx.fillRect(x + 6, 49.6, 6.4, 8);
      ctx.fillRect(x + 8, 48, 6.4, 8);
      ctx.fillStyle = "#0a1a24";
      ctx.fillRect(x + 9, 49, 4.4, 6);
      x += 16;
    }
  });

  // Download and View Advanced Details
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = C.gold;
  ctx.beginPath();
  ctx.arc(760, 37.6, 14.4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(760, 30.4);
  ctx.lineTo(760, 39.6);
  ctx.moveTo(756.4, 36.2);
  ctx.lineTo(760, 39.8);
  ctx.lineTo(763.6, 36.2);
  ctx.moveTo(754.8, 41.6);
  ctx.lineTo(754.8, 44);
  ctx.lineTo(765.2, 44);
  ctx.lineTo(765.2, 41.6);
  ctx.stroke();

  ctx.fillStyle = "rgba(1,10,19,0.6)";
  ctx.fillRect(797.6, 24, 234.4, 32);
  ctx.strokeStyle = "#c8aa6e";
  ctx.lineWidth = 2;
  ctx.strokeRect(798.6, 25, 232.4, 30);
  text(ctx, "VIEW ADVANCED DETAILS", 914.8, 45.6, `bold 14px ${BEAUFORT}`, C.gold, "center", 1.4);

  // Line under the header
  ctx.fillStyle = C.line;
  ctx.fillRect(24, 80, 1008, 0.8);

  // Tabs
  text(ctx, "PROGRESSION", 37.6, 109.6, `bold 12px ${BEAUFORT}`, C.gold, "left", 0.9);
  text(ctx, "SCOREBOARD", 152, 109.6, `bold 12px ${BEAUFORT}`, C.text, "left", 0.9);
  const g = ctx.createLinearGradient(140, 0, 252, 0);
  g.addColorStop(0, "rgba(200,170,110,0)");
  g.addColorStop(0.5, "rgba(200,170,110,0.9)");
  g.addColorStop(1, "rgba(200,170,110,0)");
  ctx.fillStyle = g;
  ctx.fillRect(140, 115.2, 112, 0.8);
}

interface RowCtx {
  pg: Postgame;
  img: ImgFn;
  icon: IconFn;
  mins: number;
  topDamage: number;
}

function drawTeam(ctx: Ctx, title: string, players: Player[], isPlayerTeam: boolean, y: number, r: RowCtx): number {
  // Header: team name • K / D / A • gold, then the column icons on the right.
  const mid = y + TEAM_HEAD_H / 2;
  const nameW = text(ctx, title, 51.2, mid + 6, `bold 18px ${BEAUFORT}`, isPlayerTeam ? C.allyName : C.enemy, "left", 1.1);
  let x = 51.2 + nameW + 16;
  const bullet = r.icon("bullet");
  const dot = (bx: number) => (bullet ? ctx.drawImage(bullet, bx, mid - 4, 8, 8) : null);
  dot(x);
  x += 8 + 16;
  const totals = players.reduce(
    (t, p) => {
      const s = statsOf(p);
      return { k: t.k + s.kills, d: t.d + s.deaths, a: t.a + s.assists, gold: t.gold + s.gold };
    },
    { k: 0, d: 0, a: 0, gold: 0 },
  );
  mask(ctx, r.icon("kda"), x, mid - 8, 16, 16, C.grey);
  x += 20;
  x += text(ctx, `${totals.k} / ${totals.d} / ${totals.a}`, x, mid + 4.6, `bold 14px ${BEAUFORT}`, C.grey, "left", 0.7);
  x += 16;
  dot(x);
  x += 8 + 16;
  mask(ctx, r.icon("coins"), x, mid - 8, 16, 16, C.grey);
  x += 20;
  text(ctx, num(totals.gold), x, mid + 4.6, `bold 14px ${BEAUFORT}`, C.grey, "left", 0.7);

  mask(ctx, r.icon("kda"), COL.kda - 13.6, mid - 10, 20, 20, C.grey);
  const switcher = (cx: number, what: keyof typeof ICONS) => {
    const arrow = r.icon("arrow");
    mask(ctx, arrow, cx - 32, mid - 10, 20, 20, C.grey);
    ctx.save();
    ctx.translate(cx + 32, 0);
    ctx.scale(-1, 1);
    mask(ctx, arrow, 0, mid - 10, 20, 20, C.grey);
    ctx.restore();
    mask(ctx, r.icon(what), cx - 10, mid - 10, 20, 20, C.grey);
  };
  switcher(COL.damage - 2, "sword");
  switcher(COL.gold - 0.4, "coins");
  mask(ctx, r.icon("crystal"), COL.challenge - 10, mid - 10, 20, 20, C.grey);

  let rowY = y + TEAM_HEAD_H;
  separator(ctx, rowY);
  for (const p of players) {
    drawRow(ctx, p, isPlayerTeam, rowY + 1, r);
    rowY += ROW_H + 1;
    separator(ctx, rowY);
  }
  return rowY + 1;
}

function separator(ctx: Ctx, y: number): void {
  const g = ctx.createLinearGradient(ROW_X, 0, ROW_X + ROW_W, 0);
  g.addColorStop(0, C.line);
  g.addColorStop(0.85, C.line);
  g.addColorStop(1, "rgba(60,60,65,0)");
  ctx.fillStyle = g;
  ctx.fillRect(ROW_X, y, ROW_W, 1);
}

function drawRow(ctx: Ctx, p: Player, isAlly: boolean, y: number, r: RowCtx): void {
  const s = statsOf(p);
  const local = r.pg.you === p.id;
  const x0 = ROW_X;

  // Splash art behind the player details, faded out to the right.
  const details = x0 + 3;
  const splash = r.img(splashUrl(p.champion, s.skin));
  if (splash) {
    const w = 247;
    const h = (splash.naturalHeight * w) / splash.naturalWidth;
    const layer = document.createElement("canvas");
    const k = ctx.getTransform().a;
    layer.width = Math.ceil(w * k);
    layer.height = Math.ceil(ROW_H * k);
    const g = layer.getContext("2d")!;
    g.scale(k, k);
    g.filter = "brightness(1.15)";
    g.drawImage(splash, 0, -20, w, h);
    g.filter = "none";
    // The client's mask: faint, then strong, then gone. It starts 25px in,
    // and the strip before that shows the empty end of the repeated mask.
    g.globalCompositeOperation = "destination-in";
    const m = g.createLinearGradient(25, 0, 25 + w, 0);
    m.addColorStop(0, "rgba(0,0,0,0.26)");
    m.addColorStop(0.0834, "rgba(0,0,0,0.26)");
    m.addColorStop(0.3437, "rgba(0,0,0,0.9)");
    m.addColorStop(0.753, "rgba(0,0,0,0)");
    m.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = m;
    g.fillRect(0, 0, w, ROW_H);
    g.clearRect(0, 0, 25, ROW_H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(details, y, 336, ROW_H);
    ctx.clip();
    ctx.drawImage(layer, details - 40, y, w, ROW_H);
    ctx.restore();
  }
  // Dark fade from the left over the art.
  const ov = ctx.createLinearGradient(details, 0, details + 207, 0);
  ov.addColorStop(0, C.ink);
  ov.addColorStop(0.3709, "rgba(1,10,19,0)");
  ctx.fillStyle = ov;
  ctx.fillRect(details, y, 207, ROW_H);

  // Team color bar, gold for you.
  ctx.fillStyle = local ? C.local : isAlly ? C.ally : C.enemy;
  ctx.fillRect(x0, y, 3, ROW_H);

  text(ctx, String(s.level), x0 + 22, y + 26, `bold 18px ${BEAUFORT}`, C.text, "center");
  text(ctx, p.name, x0 + 120, y + 15.2, `bold 12px ${BEAUFORT}`, local ? C.local : C.text, "left", 0.4);
  text(ctx, p.champion, x0 + 120.8, y + 31.6, `12px ${SPIEGEL}`, C.grey);

  // "..." button and the thin line before the spells.
  const actions = r.icon("actions");
  if (actions) ctx.drawImage(actions, 298, y + 10, 20, 20);
  ctx.fillStyle = C.line;
  ctx.fillRect(320, y + 7, 0.8, 26);

  // Summoner spells
  s.spells.forEach((sp, i) => {
    const sy = y + 3.5 + i * 17;
    const im = sp ? r.img(iconUrl("spell", sp)) : null;
    if (im) ctx.drawImage(im, 322.4, sy, 16, 16);
    else {
      ctx.fillStyle = C.empty;
      ctx.fillRect(322.4, sy, 16, 16);
    }
  });

  // Augments: five boxes, tinted by rarity.
  if (r.pg.slots === "augments") {
    s.augments.slice(0, 5).forEach((a, i) => {
      const ax = 346.4 + i * 26;
      const ay = y + 8;
      const rarity = a ? augmentRarityOf(a) : undefined;
      const [top, bottom, tint] = RARITY[rarity ?? "kSilver"];
      const border = ctx.createLinearGradient(0, ay, 0, ay + 24);
      border.addColorStop(0, top);
      border.addColorStop(1, bottom);
      ctx.fillStyle = border;
      ctx.fillRect(ax, ay, 24, 24);
      ctx.fillStyle = a ? C.ink : C.empty;
      ctx.fillRect(ax + 1, ay + 1, 22, 22);
      if (a) mask(ctx, r.img(iconUrl("augment", a)), ax + 1, ay + 1, 22, 22, tint);
    });
  }

  // Items: six and the trinket on one strip.
  const ix = r.pg.slots === "augments" ? 482.4 : 352;
  const iy = y + 8;
  ctx.fillStyle = C.line;
  ctx.fillRect(ix, iy - 0.8, 7 * 24 + 0.8, 24.8);
  s.items.slice(0, 7).forEach((item, i) => {
    const sx = ix + 0.8 + i * 24;
    ctx.fillStyle = "#050d16";
    ctx.fillRect(sx, iy, 23.2, 23.2);
    const im = item ? r.img(iconUrl("item", item)) : null;
    if (im) ctx.drawImage(im, sx + 0.8, iy + 0.8, 21.6, 21.6);
    else {
      ctx.fillStyle = C.empty;
      ctx.fillRect(sx + 0.8, iy + 0.8, 21.6, 21.6);
    }
  });

  // K / D / A and the ratio under it
  text(ctx, `${s.kills} / ${s.deaths} / ${s.assists}`, COL.kda, y + 16.6, `bold 14px ${BEAUFORT}`, C.text, "center", 0.7);
  const ratio = (s.kills + s.assists) / Math.max(1, s.deaths);
  text(ctx, `${ratio.toFixed(1)} KDA`, COL.kda, y + 32.2, `12px ${SPIEGEL}`, C.grey, "center");

  // Damage with its bar, and a star for the most.
  const dmg = num(s.damage);
  ctx.font = `bold 14px ${BEAUFORT}`;
  ctx.letterSpacing = "0.7px";
  const dw = ctx.measureText(dmg).width;
  ctx.letterSpacing = "0px";
  const top = s.damage > 0 && s.damage === r.topDamage;
  text(ctx, dmg, COL.damage + (top ? 8 : 0), y + 16.6, `bold 14px ${BEAUFORT}`, C.text, "center", 0.7);
  if (top) mask(ctx, r.icon("star"), COL.damage + 8 - dw / 2 - 16, y + 5.4, 14, 14, C.text);
  ctx.fillStyle = C.line;
  ctx.fillRect(COL.damage - 26, y + 25.6, 52, 4);
  ctx.fillStyle = local ? C.local : C.bar;
  ctx.fillRect(COL.damage - 26, y + 25.6, 52 * Math.min(1, s.damage / r.topDamage), 4);

  // Gold and gold per minute
  text(ctx, num(s.gold), COL.gold, y + 16.6, `bold 14px ${BEAUFORT}`, C.text, "center", 0.7);
  text(ctx, `${Math.round(s.gold / r.mins)} / min`, COL.gold, y + 32.2, `12px ${SPIEGEL}`, C.grey, "center");

  // Challenge token, or an empty ring.
  const token = s.challenge ? r.img(challengeTokenUrl(s.challenge, s.challengeTier)) : null;
  if (token) ctx.drawImage(token, COL.challenge - 14, y + 6, 28, 28);
  else {
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(COL.challenge, y + 20, 13.5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawFooter(ctx: Ctx, pg: Postgame, icon: IconFn): void {
  if (pg.footer.trim()) text(ctx, pg.footer, 48, 645.6, `bold 12px ${SPIEGEL}`, C.local);

  // Chat box, with the muted chat icon.
  ctx.fillStyle = "rgba(1,10,19,0.85)";
  ctx.fillRect(36.8, 660, 317.6, 31.2);
  ctx.strokeStyle = "#a0864b";
  ctx.lineWidth = 1;
  ctx.strokeRect(37.3, 660.5, 316.6, 30.2);
  ctx.fillStyle = "#8c8566";
  ctx.beginPath();
  ctx.moveTo(48.8, 669.6);
  ctx.lineTo(62.4, 669.6);
  ctx.lineTo(62.4, 679.2);
  ctx.lineTo(57.6, 679.2);
  ctx.lineTo(53.6, 682.4);
  ctx.lineTo(53.6, 679.2);
  ctx.lineTo(48.8, 679.2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(1,10,19,0.95)";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(48.8, 668);
  ctx.lineTo(63.2, 682.4);
  ctx.stroke();
  ctx.fillStyle = C.line;
  ctx.fillRect(72, 668.8, 0.8, 14.4);
  const font = `13px ${SPIEGEL}`;
  let x = 80 + text(ctx, "Click or", 80, 680.4, font, "#6e6c66");
  x += 4;
  ctx.font = font;
  const kw = ctx.measureText("Enter").width + 6.4;
  ctx.fillStyle = "#3c3c41";
  ctx.fillRect(x, 668, kw, 16);
  text(ctx, "Enter", x + 3.2, 680.4, font, C.grey);
  text(ctx, "to View", x + kw + 4, 680.4, font, "#6e6c66");

  // X button and Play Again
  ctx.fillStyle = "rgba(1,10,19,0.8)";
  ctx.beginPath();
  ctx.arc(403.6, 675.6, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#c8aa6e";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(399.6, 671.6);
  ctx.lineTo(407.6, 679.6);
  ctx.moveTo(407.6, 671.6);
  ctx.lineTo(399.6, 679.6);
  ctx.stroke();
  const play = icon("playAgain");
  if (play) ctx.drawImage(play, 434.4, 656, 188, 47);
  text(ctx, "PLAY AGAIN", 528.4, 685, `bold 14px ${BEAUFORT}`, C.text, "center", 1.2);
}
