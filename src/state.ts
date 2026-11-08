import type { ChatLine, Player, PlayerStats, Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  fontFamily: "Gill Sans",
  fontSize: 28,
  lineHeight: 1.26,
  outline: 0,
  shadow: 1,
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

// Earlier defaults for text spacing and effects, before they were matched to
// the game. Saves still on one of these get the current default.
export const OLD_DEFAULT_TEXT: Record<string, number[]> = {
  lineHeight: [1.45],
  outline: [0.06, 0.045],
  shadow: [3, 2],
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

// Builds a roster from whoever already speaks in the lines.
export function playersFromLines(lines: ChatLine[]): Player[] {
  const seen = new Map<string, Player>();
  for (const l of lines) {
    if (l.team === "system" || !l.name.trim()) continue;
    const key = `${l.team}|${l.name}|${l.champion}`;
    if (!seen.has(key)) seen.set(key, { id: newId(), team: l.team, name: l.name, champion: l.champion });
  }
  return [...seen.values()];
}

const sampleLines = SAMPLE.map(makeLine);

// Everything the app edits lives here. Call changed() after any edit.
export const state = {
  settings: structuredClone(DEFAULT_SETTINGS),
  lines: sampleLines,
  players: playersFromLines(sampleLines),
  scoreboard: { allyTurrets: 0, enemyTurrets: 0 },
  // Which picture the preview and PNG export show.
  view: "chat" as "chat" | "scoreboard",
};

export function defaultStats(): PlayerStats {
  return { level: 1, kills: 0, deaths: 0, assists: 0, cs: 0, spells: ["Flash", ""], keystone: "", secondary: "", items: ["", "", "", "", "", "", ""], respawn: 0, bounty: 0 };
}

// A player's stats, filled in with defaults for anything missing. Fills in
// the existing object rather than replacing it, so editors holding on to it
// keep editing what gets saved and drawn.
export function statsOf(p: Player): PlayerStats {
  const s = (p.stats ??= defaultStats());
  for (const [k, v] of Object.entries(defaultStats()) as [keyof PlayerStats, never][]) {
    if (s[k] === undefined) s[k] = v;
  }
  while (s.items.length < 7) s.items.push("");
  if (s.spells.length < 2) s.spells = [s.spells[0] ?? "", s.spells[1] ?? ""];
  return s;
}

// The roster entry a line was written by, if any.
export function playerOf(line: ChatLine): Player | undefined {
  return state.players.find((p) => p.team === line.team && p.name === line.name && p.champion === line.champion);
}

type Listener = (structural: boolean) => void;
const listeners: Listener[] = [];

export function onChange(fn: Listener): void {
  listeners.push(fn);
}

// structural means lines were added, removed or reordered.
export function changed(structural = false): void {
  for (const fn of listeners) fn(structural);
}
