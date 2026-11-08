import type { ChatLine, Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  fontFamily: "Gill Sans",
  fontSize: 28,
  lineHeight: 1.45,
  outline: 0.045,
  shadow: 2,
  padding: 10,
  fixedWidth: 0,
  scale: 2,
  showTime: true,
  // Team, ping and status colors come from the game's own strings.
  // Gold, white, green, cyan and yellow were measured from screenshots.
  palette: {
    ally: "#40c0fe",
    enemy: "#fe3333",
    gold: "#eb9a0a",
    white: "#e4e2e6",
    time: "#dcdcdc",
    ping: "#eecccc",
    info: "#c1ffaf",
    green: "#10e010",
    cyan: "#50aec4",
    yellow: "#dcdc04",
  },
};

// Earlier default palettes. Saves that still use one of these colors get
// the current default instead.
export const OLD_DEFAULT_PALETTES: Record<string, string>[] = [
  { ally: "#6ab4e4", enemy: "#e5525a", gold: "#e8c46a", white: "#e8eef0", time: "#dde2e6" },
  { ally: "#42b0e8", enemy: "#ee3434", ping: "#ccb0ae", info: "#b0e4a0" },
];

let uid = 0;
export const newId = () => `l${Date.now().toString(36)}${(uid++).toString(36)}`;

export function makeLine(partial: Partial<ChatLine> = {}): ChatLine {
  return {
    time: "00:00",
    team: "ally",
    channel: "",
    name: "Summoner",
    champion: "",
    kind: "chat",
    body: "",
    ...partial,
    id: partial.id ?? newId(),
  };
}

const SAMPLE: Partial<ChatLine>[] = [
  { time: "23:29", name: "Crowbar", champion: "Malzahar", kind: "action", body: "<gold>is defending the Inner Turret</gold>" },
  { time: "23:31", team: "enemy", name: "ElBosque", champion: "Yorick", kind: "action", body: "purchased <gold>Last Whisper</gold>" },
  { time: "23:34", name: "Nessie", champion: "Ezreal", body: "<red>Draven</red> <gold>R</gold>" },
  { time: "23:35", name: "Nessie", champion: "Ezreal", body: "<red>Jax</red> <gold>R</gold>" },
  { time: "23:42", team: "enemy", channel: "all", name: "Balcony", champion: "Jax", body: "aram?" },
  { time: "23:58", name: "OldSparky", champion: "Irelia", kind: "action", body: "purchased <gold>Immortal Shieldbow</gold>" },
  { time: "24:10", channel: "all", name: "Nessie", champion: "Ezreal", body: "hungry" },
];

// Everything the app edits lives here. Call changed() after any edit.
export const state = {
  settings: structuredClone(DEFAULT_SETTINGS),
  lines: SAMPLE.map(makeLine),
};

type Listener = (structural: boolean) => void;
const listeners: Listener[] = [];

export function onChange(fn: Listener): void {
  listeners.push(fn);
}

// structural means lines were added, removed or reordered.
export function changed(structural = false): void {
  for (const fn of listeners) fn(structural);
}
