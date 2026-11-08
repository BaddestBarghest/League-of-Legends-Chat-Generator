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
  // "chat" adds a colon after the name, "action" doesn't (like "purchased X").
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
  shadow: number; // blur in px
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
}
