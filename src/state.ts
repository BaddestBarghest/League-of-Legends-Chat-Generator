import type { ChatLine, Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  fontFamily: "Marcellus",
  fontSize: 28,
  lineHeight: 1.45,
  outline: 0.06,
  shadow: 3,
  padding: 10,
  fixedWidth: 0,
  scale: 2,
  showTime: true,
  palette: {
    ally: "#6ab4e4",
    enemy: "#e5525a",
    gold: "#e8c46a",
    white: "#e8eef0",
    time: "#dde2e6",
  },
};

let uid = 0;
export const newId = () => `l${Date.now().toString(36)}${(uid++).toString(36)}`;

export function makeLine(partial: Partial<ChatLine> = {}): ChatLine {
  return {
    time: "00:00",
    team: "ally",
    allChat: false,
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
  { time: "23:02", team: "enemy", allChat: true, name: "Balcony", champion: "Jax", body: "aram?" },
  { time: "22:25", name: "OldSparky", champion: "Irelia", kind: "action", body: "purchased <gold>Immortal Shieldbow</gold>" },
  { time: "21:34", allChat: true, name: "Nessie", champion: "Ezreal", body: "hungry" },
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
