export type Team = "ally" | "enemy" | "system";
export type LineKind = "chat" | "action";
// Tag before the name. Pings and purchases have none.
export type Channel = "" | "team" | "all";

export interface ChatLine {
  id: string;
  time: string;
  team: Team;
  channel: Channel;
  name: string;
  champion: string;
  // Set from how the line was made, never picked by hand. "chat" (typed chat
  // and HUD pings) puts a colon after the name, "action" (map pings and
  // purchases) doesn't. Tagged lines always get the colon.
  kind: LineKind;
  // Message text. Can use color tags like <gold>Infinity Edge</gold>.
  body: string;
}

// Someone in the match, set up once and picked from a list.
export interface Player {
  id: string;
  team: "ally" | "enemy";
  name: string;
  champion: string;
  stats?: PlayerStats;
}

// What the Tab scoreboard shows for a player. Names, not ids, so they read
// well in saves and match what the pickers suggest.
export interface PlayerStats {
  level: number;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  spells: [string, string];
  keystone: string;
  secondary: string;
  items: string[]; // six item slots, then the trinket
  respawn: number; // seconds until respawn, 0 when alive
  bounty: number; // gold shown above the score, 0 for none
  // Post-game screen
  damage: number; // damage dealt to champions
  gold: number; // gold earned
  skin: string; // splash behind the row, "" for the default skin
  augments: string[]; // up to five, ARAM: Mayhem and Arena
  challenge: string; // the token shown at the end of the row, "" for none
  challengeTier: string;
}

export interface Palette {
  ally: string;
  enemy: string;
  gold: string;
  white: string;
  time: string;
  ping: string; // smart ping text, a dim warm gray
  info: string; // statuses and stat names, pale green
  green: string;
  cyan: string;
  yellow: string; // bounty amounts
}

export interface Settings {
  fontFamily: string;
  fontSize: number;
  lineHeight: number; // times the font size
  outline: number; // fraction of the font size
  shadow: number; // drop shadow distance in game pixels (the game uses 1)
  padding: number;
  fixedWidth: number; // 0 fits the content
  scale: number; // PNG export multiplier
  showTime: boolean;
  palette: Palette;
}

// The Victory or Defeat screen. Blank text uses the game's word.
export interface Banner {
  result: "victory" | "defeat";
  text: string;
  background: "plaque" | "none" | "image";
  size: number; // text size, 1 is the game's
  spacing: number; // extra pixels between letters at the game's size
  imageSize: number; // the user's picture, 1 fits the plaque's space
}

export type PopupIcon = "none" | "gold" | "crit" | "critMagic" | "critTrue" | "armor" | "magicResist" | "custom";

// One floating text popup. It starts from a template and every part can be changed.
export interface Popup {
  id: string;
  type: string; // template it moves like
  text: string;
  color: string;
  outlineColor: string;
  icon: PopupIcon;
  iconSide: "left" | "right";
  size: number; // 1 is the game's size
  start: number; // seconds into the clip
  x: number; // offset from the champion, in pixels
  y: number;
  flip: boolean; // damage flies left instead of right
}

// The client's post-game screen. Players come from the Players tab.
export interface Postgame {
  result: "victory" | "defeat";
  map: "HA" | "SR"; // picks the background and crest
  mapName: string;
  mode: string;
  record: string;
  duration: string; // also sets gold per minute
  showGameId: boolean;
  you: string; // player id of the gold row, "" for none
  footer: string; // the line under the scoreboard, like an S rank
  slots: "augments" | "none";
}

// Who's shown in a kill feed slot: a player from the roster, any champion,
// the user's own picture, or nobody.
export interface Portrait {
  kind: "player" | "champion" | "unit" | "custom" | "none";
  value: string; // player id, champion name, or a unit like "turret-blue"
}

export type KillIcon = "normal" | "streak" | "shutdown" | "capture" | "revive" | "custom";

// One row of the kill feed in the top right of the game.
export interface KillEntry {
  id: string;
  team: "ally" | "enemy"; // colors the row
  killer: Portrait;
  victim: Portrait;
  assists: Portrait[]; // up to four
  icon: KillIcon;
  you: string; // slot with the lime frame: "killer", "victim", "a0" to "a3", or "none"
}

export interface Killfeed {
  entries: KillEntry[];
  allyColor: string;
  enemyColor: string;
  borders: "team" | "tint" | "game"; // team color, a dark hint of it, or the game's near black
}

export interface Project {
  version: 1;
  settings: Settings;
  lines: ChatLine[];
  players?: Player[];
  scoreboard?: { allyTurrets: number; enemyTurrets: number };
  banner?: Banner & { imageData?: string };
  popups?: Popup[];
  popupSpeed?: number; // 1 is the game's speed
  postgame?: Postgame;
  killfeed?: Killfeed;
  killfeedImages?: Record<string, string>; // custom pictures as data URLs, by slot key
  popupIcons?: Record<string, string>; // custom icons as data URLs, by popup id
}
