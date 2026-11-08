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

export interface Project {
  version: 1;
  settings: Settings;
  lines: ChatLine[];
  players?: Player[];
  scoreboard?: { allyTurrets: number; enemyTurrets: number };
}
