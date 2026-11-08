import type { PopupIcon } from "./types";

// The floating text the game shows over champions: gold, experience, level
// ups, heals and damage. Looks and motion come from the game's floating text
// and font tables on CommunityDragon. Sizes are pixels at 1080p.

export interface Motion {
  vx: number; // sideways speed, only for types that alternate left and right
  vy: number; // starting upward speed
  startY: number; // how far above the champion it starts
  force: number; // pull back down, slows the rise
  hold: number; // seconds before it starts fading
  fade: number; // seconds to fade out
  shrinkTime: number; // a quick pop at the start, settling over this time
  shrinkScale: number;
  scale: number; // overall size on top of the font size
  alternate: boolean; // damage numbers fly left and right in turn
  noFall: boolean; // stops at the top instead of dropping back down
}

export interface PopupType {
  label: string;
  group: string;
  text: string; // example text, users change it
  size: number;
  outline: number;
  shadow: number;
  color: string;
  outlineColor: string;
  icon: PopupIcon;
  iconSide: "left" | "right";
  iconSize: number; // icon height at 1x
  motion: Motion;
}

const m = (p: Partial<Motion>): Motion => ({
  vx: 0,
  vy: 0,
  startY: 0,
  force: 0,
  hold: 0.55,
  fade: 0.45,
  shrinkTime: 0,
  shrinkScale: 1,
  scale: 1,
  alternate: false,
  noFall: false,
  ...p,
});

const DAMAGE = m({ vx: 57.5, vy: 165, force: 500, hold: 0.4, shrinkTime: 0.15, shrinkScale: 0.5, alternate: true });
const CRIT = m({ vx: 97.5, vy: 200, startY: 10, force: 625, hold: 0.4, shrinkTime: 0.1, shrinkScale: 0.35, scale: 1.75, alternate: true });
const RISE = m({ vy: 46, startY: 25, shrinkTime: 0.1, shrinkScale: 0.7, noFall: true });

const t = (p: Partial<PopupType> & Pick<PopupType, "label" | "group" | "text" | "size" | "color" | "outlineColor" | "motion">): PopupType => ({
  outline: 1,
  shadow: 2,
  icon: "none",
  iconSide: "left",
  iconSize: 0,
  ...p,
});

export const POPUP_TYPES: Record<string, PopupType> = {
  gold: t({
    label: "Gold",
    group: "Rewards",
    text: "+21",
    size: 20,
    color: "#fdd22e",
    outlineColor: "#463600",
    icon: "gold",
    iconSide: "right",
    iconSize: 22,
    motion: m({ vy: 300, startY: 40, force: 550, hold: 0.7, fade: 0.25 }),
  }),
  xp: t({ label: "Experience", group: "Rewards", text: "+62xp", size: 19, color: "#afafaf", outlineColor: "#0a0a0a", motion: { ...RISE, startY: 80 } }),
  level: t({ label: "Level up", group: "Rewards", text: "LEVEL UP!", size: 24, color: "#26faff", outlineColor: "#000032", motion: RISE }),
  heal: t({
    label: "Heal",
    group: "Healing",
    text: "+85",
    size: 24,
    color: "#4cf854",
    outlineColor: "#232323",
    motion: m({ vy: 110, startY: 40, hold: 0.3, shrinkTime: 0.15, shrinkScale: 0.5, scale: 0.9, alternate: true }),
  }),
  manaHeal: t({ label: "Mana restore", group: "Healing", text: "+40", size: 9, shadow: 1, color: "#4e79f0", outlineColor: "#042241", motion: RISE }),
  manaDamage: t({ label: "Mana loss", group: "Healing", text: "30", size: 12, shadow: 1, color: "#4e79f0", outlineColor: "#042241", motion: DAMAGE }),
  physical: t({ label: "Physical damage", group: "Damage", text: "184", size: 27, color: "#ff8c34", outlineColor: "#190d05", motion: DAMAGE }),
  physicalCrit: t({ label: "Physical crit", group: "Damage", text: "412", size: 27, color: "#ff8c34", outlineColor: "#190d05", icon: "crit", iconSize: 36, motion: CRIT }),
  magic: t({ label: "Magic damage", group: "Damage", text: "156", size: 27, color: "#00b0f0", outlineColor: "#001219", motion: DAMAGE }),
  magicCrit: t({ label: "Magic crit", group: "Damage", text: "377", size: 27, color: "#00b0f0", outlineColor: "#001219", icon: "critMagic", iconSize: 36, motion: CRIT }),
  true: t({ label: "True damage", group: "Damage", text: "95", size: 27, color: "#ffffff", outlineColor: "#191919", motion: DAMAGE }),
  trueCrit: t({ label: "True crit", group: "Damage", text: "230", size: 27, color: "#ffffff", outlineColor: "#191919", icon: "critTrue", iconSize: 36, motion: CRIT }),
  taken: t({ label: "Damage taken", group: "Damage", text: "97", size: 19, color: "#ff8c34", outlineColor: "#190d05", motion: DAMAGE }),
  absorbed: t({ label: "Shield absorbed", group: "Other", text: "-60", size: 24, color: "#e6e6eb", outlineColor: "#232323", motion: RISE }),
  dodge: t({ label: "Dodge", group: "Other", text: "Dodge!", size: 16, color: "#e6e6e6", outlineColor: "#0a1432", motion: RISE }),
  special: t({ label: "Special", group: "Other", text: "Special", size: 24, color: "#ffff26", outlineColor: "#000000", outline: 0, motion: RISE }),
};

// Game icons on CommunityDragon. Custom pictures are kept per popup.
export const ICONS: Record<Exclude<PopupIcon, "none" | "custom">, { label: string; file: string }> = {
  gold: { label: "Gold coin", file: "goldicon.png" },
  crit: { label: "Crit", file: "criticon.png" },
  critMagic: { label: "Magic crit", file: "criticonmagic.png" },
  critTrue: { label: "True crit", file: "criticontrue.png" },
  armor: { label: "Armor", file: "armor.png" },
  magicResist: { label: "Magic resist", file: "magicresist.png" },
};

export const lifeOf = (type: PopupType) => type.motion.hold + type.motion.fade;
