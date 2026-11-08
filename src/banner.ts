import type { Banner } from "./types";
import { loadImage } from "./icons";
import { FINISH, finishLetters } from "./bannerShade";

// The Victory and Defeat screen. The plaques are the game's own art from
// CommunityDragon. The word is drawn live in Beaufort for LOL Bold so any text
// works, with colors, edges and shadow measured from Riot's word art.

const ART = "https://raw.communitydragon.org/latest/game/assets/ux/endofgame/";
const W = 512;
const H = 256;
const MAX_WIDTH = 440; // widest a word can be before it's shrunk to fit
const FONT_STACK = '"Beaufort for LOL", Spectral, Georgia, serif';

type Stop = [number, string];

interface Look {
  plaque: string;
  word: string; // the default text
  cap: number; // capital height in the art
  middle: number; // where the middle of the capitals sits
  face: Stop[]; // color from the top of the capitals down
  edge: Stop[]; // the border has its own gleam, out of step with the face
  shadow: [number, number]; // opacity and how many times it's drawn. Victory's is much heavier
}

// Stops are a share of the capital height. Past 1 is the bigger end letters.
const LOOKS: Record<Banner["result"], Look> = {
  victory: {
    plaque: "eog_base.png",
    word: "Victory",
    cap: 63,
    middle: 127.5,
    shadow: [0.9, 2],
    face: [
      [0.032, "#8c6842"], [0.079, "#a38154"], [0.127, "#bea673"], [0.175, "#dcc28b"], [0.222, "#ead9a0"],
      [0.27, "#f2e0a5"], [0.317, "#edda9c"], [0.365, "#d7c28a"], [0.413, "#bda36e"], [0.46, "#a58357"],
      [0.508, "#8b6439"], [0.556, "#7b5330"], [0.603, "#754f29"], [0.651, "#8b6236"], [0.698, "#a27c4a"],
      [0.746, "#a58552"], [0.794, "#a5824f"], [0.841, "#a17e4a"], [0.889, "#987545"], [0.937, "#947142"],
      [0.984, "#8d663b"], [1.032, "#845d35"], [1.079, "#7b5531"],
    ],
    edge: [
      [-0.016, "#fffce4"], [0.016, "#ecdec0"], [0.048, "#a38a69"], [0.079, "#af9065"], [0.111, "#a17e53"],
      [0.143, "#b39465"], [0.175, "#bda071"], [0.206, "#ccae7a"], [0.238, "#cdb07d"], [0.27, "#d6b981"],
      [0.302, "#d7ba83"], [0.333, "#ddbd83"], [0.365, "#ddbb82"], [0.397, "#d9b77e"], [0.429, "#d1b07a"],
      [0.46, "#d3ae75"], [0.492, "#ceaa75"], [0.524, "#ba925e"], [0.556, "#ab8453"], [0.587, "#8e663c"],
      [0.619, "#865f37"], [0.651, "#815a33"], [0.683, "#89633b"], [0.714, "#936f44"], [0.746, "#9b774a"],
      [0.778, "#a68153"], [0.81, "#ab8859"], [0.841, "#bb9561"], [0.873, "#bf9b68"], [0.905, "#be9760"],
      [0.937, "#c19961"], [0.968, "#d7aa6e"], [1.0, "#d5ab6e"], [1.032, "#c49a63"], [1.063, "#b9905a"],
      [1.095, "#aa8252"], [1.127, "#c2975d"],
    ],
  },
  defeat: {
    plaque: "eog_defeat_base.png",
    word: "Defeat",
    cap: 67,
    middle: 125.5,
    shadow: [0.7, 1],
    face: [
      [0.06, "#9c5d33"], [0.104, "#b48151"], [0.149, "#cca169"], [0.194, "#e6c083"], [0.239, "#fad896"],
      [0.284, "#ffdb9c"], [0.328, "#f4d091"], [0.373, "#e1b87d"], [0.418, "#ce9962"], [0.463, "#ad794a"],
      [0.507, "#975a35"], [0.552, "#884824"], [0.597, "#844120"], [0.642, "#935028"], [0.687, "#a76a39"],
      [0.731, "#b57942"], [0.776, "#b57842"], [0.821, "#af7542"], [0.866, "#aa6e3e"], [0.91, "#a16536"],
      [0.955, "#9b5c31"], [1.0, "#95562b"], [1.045, "#8f4f27"], [1.09, "#8b4821"],
    ],
    edge: [
      [0.015, "#ffefc8"], [0.045, "#ab8464"], [0.075, "#b27c51"], [0.104, "#ad774c"], [0.134, "#aa7346"],
      [0.164, "#b98254"], [0.194, "#c7905f"], [0.224, "#d39e6b"], [0.254, "#e0ab73"], [0.284, "#dfaa74"],
      [0.313, "#eab176"], [0.343, "#ecb177"], [0.373, "#e9af74"], [0.403, "#e9b076"], [0.433, "#f4bf84"],
      [0.463, "#e1a36a"], [0.493, "#df9b61"], [0.522, "#b07143"], [0.552, "#ba7443"], [0.582, "#9f6037"],
      [0.612, "#8f512c"], [0.642, "#9d633f"], [0.672, "#8f522c"], [0.701, "#985b33"], [0.731, "#a16438"],
      [0.761, "#ab6c3e"], [0.791, "#ba7b49"], [0.821, "#c1814e"], [0.851, "#d18e57"], [0.881, "#da9a65"],
      [0.91, "#d28f57"], [0.94, "#d6945c"], [0.97, "#efa664"], [1.0, "#dfa16c"], [1.03, "#c9834d"],
      [1.06, "#c6814c"], [1.09, "#b67241"], [1.119, "#cf864d"],
    ],
  },
};

const BIG = 1.157; // the first and last letters are this much taller
const TRACK = 0.012; // extra space between letters, as a share of the capital height
const BORDER = 4; // width of the gleaming border stroke, half of it lands inside
const SPAN = 1.2; // the gradients run this many capital heights

export interface BannerArt {
  plaque: HTMLImageElement | null;
}

const plaques = new Map<string, Promise<HTMLImageElement | null>>();

export async function loadBannerArt(b: Banner): Promise<BannerArt> {
  const file = LOOKS[b.result].plaque;
  if (!plaques.has(file)) plaques.set(file, loadImage(ART + file));
  const [plaque] = await Promise.all([plaques.get(file)!, document.fonts.load(`bold 64px ${FONT_STACK}`).catch(() => [])]);
  return { plaque };
}

export const bannerSize = () => ({ width: W, height: H });
export const bannerWord = (b: Banner) => b.text.trim() || LOOKS[b.result].word;

function gradient(ctx: CanvasRenderingContext2D, stops: Stop[], top: number, cap: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, top, 0, top + cap * SPAN);
  for (const [t, c] of stops) g.addColorStop(Math.min(1, Math.max(0, t / SPAN)), c);
  return g;
}

function layer(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d", { willReadFrequently: true })!];
}

interface Glyph {
  ch: string;
  font: string;
  x: number;
  y: number; // baseline
}

// Places each letter. They're drawn one at a time because the end letters are
// bigger, so kerning is measured from the font and added back.
function layout(ctx: CanvasRenderingContext2D, text: string, look: Look, s: number): { glyphs: Glyph[]; top: number; cap: number } {
  const chars = [...text.toUpperCase()];
  const font = (size: number) => `bold ${size}px ${FONT_STACK}`;
  ctx.font = font(100);
  const capShare = (ctx.measureText("H").actualBoundingBoxAscent || 66.6) / 100;

  const build = (cap: number) => {
    const size = cap / capShare;
    const ends = chars.length > 1 && chars[0] !== " " && chars[chars.length - 1] !== " ";
    const sizes = chars.map((_, i) => (ends && (i === 0 || i === chars.length - 1) ? size * BIG : size));
    const widths = chars.map((c, i) => {
      ctx.font = font(sizes[i]);
      return ctx.measureText(c).width;
    });
    ctx.font = font(size);
    const kern = chars.map((c, i) => {
      const n = chars[i + 1];
      return n ? ctx.measureText(c + n).width - ctx.measureText(c).width - ctx.measureText(n).width : 0;
    });
    const steps = chars.map((_, i) => widths[i] + kern[i] + TRACK * cap);
    const total = steps.slice(0, -1).reduce((a, b) => a + b, 0) + (widths[widths.length - 1] ?? 0);
    return { size, sizes, steps, total };
  };

  let cap = look.cap;
  let fit = build(cap);
  if (fit.total > MAX_WIDTH) {
    cap *= MAX_WIDTH / fit.total;
    fit = build(cap);
  }
  const top = look.middle - cap / 2;
  let x = (W - fit.total) / 2;
  const glyphs = chars.map((ch, i) => {
    const g = { ch, font: font(fit.sizes[i] * s), x: x * s, y: (top + fit.sizes[i] * capShare) * s };
    x += fit.steps[i];
    return g;
  });
  return { glyphs, top: top * s, cap: cap * s };
}

export function renderBanner(canvas: HTMLCanvasElement, b: Banner, scale: number, art: BannerArt): void {
  const look = LOOKS[b.result];
  const w = Math.round(W * scale);
  const h = Math.round(H * scale);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);
  if (b.plaque && art.plaque) ctx.drawImage(art.plaque, 0, 0, w, h);

  const text = bannerWord(b);
  const { glyphs, top, cap } = layout(ctx, text, look, scale);
  const each = (g: CanvasRenderingContext2D, paint: (gl: Glyph) => void) =>
    glyphs.forEach((gl) => {
      g.font = gl.font;
      paint(gl);
    });

  // The letters' shape, used for the shadow and as a mask.
  const [shape, sc] = layer(w, h);
  sc.fillStyle = "#000";
  each(sc, (gl) => sc.fillText(gl.ch, gl.x, gl.y));

  // A big soft shadow. Canvas caps a shadow at the color's opacity, so a
  // heavier one is drawn twice. The shape itself is drawn off canvas.
  ctx.save();
  const [opacity, times] = look.shadow;
  ctx.shadowColor = `rgba(0,0,0,${opacity})`;
  ctx.shadowBlur = 28 * scale;
  ctx.shadowOffsetY = 3 * scale;
  ctx.shadowOffsetX = w * 2;
  for (let i = 0; i < times; i++) ctx.drawImage(shape, -w * 2, 0);
  ctx.restore();

  // The face, then the border on top, both kept inside the letters.
  const [body, bc] = layer(w, h);
  bc.drawImage(shape, 0, 0);
  bc.globalCompositeOperation = "source-in";
  bc.fillStyle = gradient(bc, look.face, top, cap);
  bc.fillRect(0, 0, w, h);
  bc.globalCompositeOperation = "source-atop";
  bc.lineJoin = "round";
  bc.lineWidth = BORDER * scale;
  bc.strokeStyle = gradient(bc, look.edge, top, cap);
  each(bc, (gl) => bc.strokeText(gl.ch, gl.x, gl.y));
  bc.globalCompositeOperation = "source-over";

  const img = bc.getImageData(0, 0, w, h);
  // Shrunk text gets a finer finish, like the art at that size would have.
  finishLetters(img, FINISH, cap / look.cap);
  bc.putImageData(img, 0, 0);
  ctx.drawImage(body, 0, 0);
}
