export type Team = "ally" | "enemy" | "system";
export type LineKind = "chat" | "action";

export interface ChatLine {
  id: string;
  time: string;
  team: Team;
  allChat: boolean;
  name: string;
  champion: string;
  // "chat" adds a colon after the name, "action" doesn't (like "purchased X").
  kind: LineKind;
  // Message text. Can use color tags like <gold>Infinity Edge</gold>.
  body: string;
}

export interface Palette {
  ally: string;
  enemy: string;
  gold: string;
  white: string;
  time: string;
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
}
