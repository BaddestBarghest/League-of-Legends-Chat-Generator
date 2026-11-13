import type { Popup } from "./types";
import { loadImage } from "./icons";
import { storedImage } from "./imageStore";
import { ICONS, lifeOf, POPUP_TYPES, type PopupType } from "./popupTypes";

// Draws floating text popups at a moment in time. Everything is placed around
// the champion, the point the popups rise from. The picture is sized to hold
// every popup for the whole clip, so frames line up when exported.

export const POPUP_FONT = "Spiegel";
const FONT_STACK = '"Spiegel", "Source Sans 3", "Segoe UI", sans-serif';
const ART = "https://raw.communitydragon.org/latest/game/assets/ux/floatingtext/";
const PAD = 12;
const MIN_W = 240;
const MIN_H = 160;

export interface PopupArt {
  icons: Map<string, HTMLImageElement | null>;
}

export const customIconKey = (id: string) => `popup:${id}`;

export async function loadPopupArt(popups: Popup[]): Promise<PopupArt> {
  const icons = new Map<string, HTMLImageElement | null>();
  await Promise.all([
    document.fonts.load(`bold 20px ${FONT_STACK}`).catch(() => []),
    ...popups.map(async (p) => {
      if (p.icon === "none") return;
      if (p.icon === "custom") {
        icons.set(customIconKey(p.id), await storedImage(customIconKey(p.id)));
        return;
      }
      icons.set(p.icon, await loadImage(ART + ICONS[p.icon].file));
    }),
  ]);
  return { icons };
}

const typeOf = (p: Popup): PopupType => POPUP_TYPES[p.type] ?? POPUP_TYPES.gold;

// How long the whole clip runs at the game's speed.
export const popupsDuration = (popups: Popup[]) => Math.max(0.5, ...popups.map((p) => p.start + lifeOf(typeOf(p))));

// The speed slider stretches the clip. Times on the timeline and in exports
// are real seconds, popups are drawn at real time × speed.
export const clipLength = (popups: Popup[], speed: number) => popupsDuration(popups) / speed;

interface Pose {
  x: number; // from the champion, right is positive
  y: number; // from the champion, up is negative like the canvas
  alpha: number;
  scale: number;
}

// Where a popup is at time t, or null when it isn't showing.
export function poseAt(p: Popup, t: number): Pose | null {
  const type = typeOf(p);
  const mo = type.motion;
  const age = t - p.start;
  if (age < 0 || age > lifeOf(type)) return null;
  // Rises at vy and is pulled back by force. Some stop at the top.
  let rise = age;
  if (mo.noFall && mo.force > 0) rise = Math.min(age, mo.vy / mo.force);
  const up = mo.startY + mo.vy * rise - 0.5 * mo.force * rise * rise;
  const side = mo.alternate ? (p.flip ? -1 : 1) : 0;
  const alpha = age < mo.hold ? 1 : Math.max(0, 1 - (age - mo.hold) / mo.fade);
  // A quick pop: starts bigger and settles to its size.
  let scale = mo.scale;
  if (mo.shrinkTime > 0 && age < mo.shrinkTime) {
    const k = age / mo.shrinkTime;
    scale *= 2 - mo.shrinkScale + (mo.shrinkScale - 1) * k;
  }
  return { x: p.x + side * mo.vx * age, y: p.y - up, alpha, scale: scale * p.size };
}

const scratch = document.createElement("canvas").getContext("2d")!;

// The text and icon around a pose's point, at 1x.
function pieces(ctx: CanvasRenderingContext2D, p: Popup, pose: Pose, art: PopupArt) {
  const type = typeOf(p);
  const size = type.size * pose.scale;
  ctx.font = `bold ${size}px ${FONT_STACK}`;
  const textW = ctx.measureText(p.text).width;
  const icon = p.icon === "none" ? null : (art.icons.get(p.icon === "custom" ? customIconKey(p.id) : p.icon) ?? null);
  // Icon sizes are set directly, so the type's own scale doesn't apply to them.
  const iconH = icon ? (type.iconSize || type.size * 1.1) * (pose.scale / type.motion.scale) : 0;
  const iconW = icon ? (iconH * icon.naturalWidth) / icon.naturalHeight : 0;
  const gap = icon ? size * 0.12 : 0;
  const total = textW + gap + iconW;
  const left = pose.x - total / 2;
  const textX = p.iconSide === "left" ? left + iconW + gap : left;
  const iconX = p.iconSide === "left" ? left : left + textW + gap;
  return { type, size, textW, textX, icon, iconW, iconH, iconX, total, left };
}

// The box that holds every popup over the whole clip, around the champion.
function bounds(popups: Popup[], art: PopupArt) {
  let l = -MIN_W / 2;
  let r = MIN_W / 2;
  let top = -MIN_H + 20;
  let bottom = 20;
  const end = popupsDuration(popups);
  for (const p of popups) {
    for (let t = 0; t <= end; t += 1 / 60) {
      const pose = poseAt(p, t);
      if (!pose) continue;
      const pc = pieces(scratch, p, pose, art);
      const h = Math.max(pc.size, pc.iconH);
      l = Math.min(l, pc.left - PAD);
      r = Math.max(r, pc.left + pc.total + PAD);
      top = Math.min(top, pose.y - h / 2 - PAD);
      bottom = Math.max(bottom, pose.y + h / 2 + PAD);
    }
  }
  return { width: Math.ceil(r - l), height: Math.ceil(bottom - top), cx: -l, cy: -top };
}

export function popupsSize(popups: Popup[], art: PopupArt): { width: number; height: number } {
  const b = bounds(popups, art);
  return { width: b.width, height: b.height };
}

// Frame size is worked out once per draw call so a whole export shares it.
export function renderPopups(canvas: HTMLCanvasElement, popups: Popup[], t: number, scale: number, art: PopupArt, frame = bounds(popups, art)): void {
  canvas.width = Math.round(frame.width * scale);
  canvas.height = Math.round(frame.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(scale, 0, 0, scale, frame.cx * scale, frame.cy * scale);
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";

  for (const p of popups) {
    const pose = poseAt(p, t);
    if (!pose || pose.alpha <= 0) continue;
    const pc = pieces(ctx, p, pose, art);
    ctx.globalAlpha = pose.alpha;
    if (pc.icon) {
      ctx.drawImage(pc.icon, pc.iconX, pose.y - pc.iconH / 2, pc.iconW, pc.iconH);
    }
    const sh = pc.type.shadow * pose.scale;
    // Shadow, then the outline, then the fill, like the game's font renderer.
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fillText(p.text, pc.textX + sh, pose.y + sh);
    if (pc.type.outline > 0) {
      ctx.lineWidth = pc.type.outline * 2 * pose.scale;
      ctx.strokeStyle = p.outlineColor;
      ctx.strokeText(p.text, pc.textX, pose.y);
    }
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, pc.textX, pose.y);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
}

export const popupFrame = bounds;
