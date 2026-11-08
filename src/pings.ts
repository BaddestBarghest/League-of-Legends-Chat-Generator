import type { ChatLine } from "./types";

// Ping chat text, matched to in-game screenshots and the League Wiki ping page.
// Colors were measured from screenshots: smart pings use the dim ping color,
// pings on things in the world are gold, statuses are pale green.

export type ParamKey =
  | "enemyPlayer"
  | "enemy"
  | "allyPlayer"
  | "ally"
  | "turret"
  | "structure"
  | "monster"
  | "monsterStatus"
  | "buff"
  | "champStatus"
  | "ability"
  | "abilityStatus"
  | "spell"
  | "spellStatus"
  | "item"
  | "itemStatus"
  | "percent"
  | "level"
  | "stat"
  | "statValue"
  | "rune"
  | "gold"
  | "ms"
  | "text"
  | "multikill"
  | "spree";

export interface ParamDef {
  label: string;
  placeholder: string;
  options?: string[];
}

export const PARAMS: Record<ParamKey, ParamDef> = {
  enemyPlayer: { label: "Enemy player", placeholder: "balacero" },
  enemy: { label: "Enemy champion", placeholder: "Draven" },
  allyPlayer: { label: "Ally player", placeholder: "Viejo Petardo" },
  ally: { label: "Ally champion", placeholder: "Irelia" },
  turret: {
    label: "Turret",
    placeholder: "Inner Turret",
    options: ["Outer Turret", "Inner Turret", "Inhibitor Turret", "Nexus Turret"],
  },
  structure: { label: "Structure", placeholder: "Inhibitor", options: ["Inhibitor", "Nexus"] },
  monster: {
    label: "Monster",
    placeholder: "Baron Nashor",
    options: [
      "Baron Nashor", "Elder Dragon", "Infernal Drake", "Ocean Drake", "Mountain Drake", "Cloud Drake",
      "Hextech Drake", "Chemtech Drake", "Rift Herald", "Voidgrubs", "Atakhan", "Rift Scuttler",
      "Blue Sentinel", "Red Brambleback", "Gromp", "Murk Wolf", "Raptor", "Krug",
    ],
  },
  monsterStatus: { label: "Status", placeholder: "Spawning in 3:45", options: ["Alive", "Spawning in 1:00"] },
  buff: {
    label: "Buff",
    placeholder: "Enemy Red Buff",
    options: ["Allied Red Buff", "Allied Blue Buff", "Enemy Red Buff", "Enemy Blue Buff"],
  },
  champStatus: { label: "Status", placeholder: "Respawning in 23s", options: ["Alive", "Respawning in 10s"] },
  ability: { label: "Ability", placeholder: "Mystic Shot" },
  abilityStatus: { label: "Status", placeholder: "Ready", options: ["Ready", "Not learned yet", "Not enough mana"] },
  spell: {
    label: "Summoner spell",
    placeholder: "Flash",
    options: ["Flash", "Ignite", "Teleport", "Heal", "Barrier", "Exhaust", "Cleanse", "Ghost", "Smite"],
  },
  spellStatus: { label: "Cooldown", placeholder: "Ready", options: ["Ready", "2 Charges"] },
  item: { label: "Item", placeholder: "Zhonya's Hourglass" },
  itemStatus: { label: "Status", placeholder: "Can purchase", options: ["Can purchase", "Ready", "2 Charges"] },
  percent: { label: "Percent", placeholder: "45" },
  level: { label: "Level", placeholder: "11" },
  stat: {
    label: "Stat",
    placeholder: "Attack Damage",
    options: ["Attack Damage", "Ability Power", "Armor", "Magic Resist", "Attack Speed", "Critical Strike", "Movement Speed", "Ability Haste"],
  },
  statValue: { label: "Value", placeholder: "210" },
  rune: { label: "Rune", placeholder: "Conqueror" },
  gold: { label: "Gold", placeholder: "1250" },
  ms: { label: "Milliseconds", placeholder: "35" },
  text: { label: "Message", placeholder: "Ally team has destroyed the first turret!" },
  multikill: {
    label: "Multikill",
    placeholder: "none",
    options: ["for a double kill!", "for a triple kill!", "for a quadra kill!", "for a penta kill!"],
  },
  spree: {
    label: "Streak",
    placeholder: "is on a killing spree!",
    options: ["is on a killing spree!", "is on a rampage!", "is unstoppable!", "is dominating!", "is godlike!", "is legendary!"],
  },
};

export interface PingDef {
  id: string;
  group: string;
  label: string;
  // chat adds "Name:", action leaves the colon off, system has no name.
  kind: "chat" | "action" | "system";
  params: ParamKey[];
  build: (p: Record<ParamKey, string>) => string;
}

const g = (s: string) => `<gold>${s}</gold>`;
const r = (s: string) => `<red>${s}</red>`;
const b = (s: string) => `<blue>${s}</blue>`;
const ping = (s: string) => `<ping>${s}</ping>`;
const info = (s: string) => `<info>${s}</info>`;
const y = (s: string) => `<yellow>${s}</yellow>`;
const who = (player: string, champ: string) => `${player} (${champ})`;

// Attack Speed shows its value in green and Attack Damage in teal. Other
// stats weren't in the screenshots, so they use teal too.
// "has slain" and the multikill text are gold, like the game.
const killLine = (killer: string, victim: string, multi: string) =>
  `${killer} ${g("has slain")} ${victim}` + (multi && multi !== "none" ? ` ${g(multi)}` : "");

// "has shut down Runa (Heimerdinger)! (Bonus Bounty: 409G)" with the amount in yellow.
const shutdownLine = (killer: string, victim: string, bounty: string) =>
  `${killer} ${g("has shut down")} ${victim}${g("! (Bonus Bounty: ")}${y(`${bounty.replace(/g$/i, "")}G`)}${g(")")}`;

const statValue = (stat: string, value: string) =>
  stat.toLowerCase() === "attack speed" ? `<green>${value}</green>` : `<cyan>${value}</cyan>`;

const SMART = "Smart pings";
const TARGET = "Generic pings on targets";
const CAUTION = "Caution pings";
const HUD = "HUD and scoreboard pings";
const KILLS = "Kills and streaks";
const OTHER = "Shop and system";

export const PINGS: PingDef[] = [
  // Ping wheel. Plain white text.
  { id: "enemy-missing", group: SMART, label: "Enemy missing", kind: "action", params: [], build: () => ping("signals that enemies are missing") },
  { id: "enemy-vision", group: SMART, label: "Enemy vision", kind: "action", params: [], build: () => ping("signals enemy has vision here") },
  { id: "retreat", group: SMART, label: "Retreat", kind: "action", params: [], build: () => ping("signals to retreat") },
  { id: "push", group: SMART, label: "Push", kind: "action", params: [], build: () => ping("wants to push forward") },
  { id: "omw", group: SMART, label: "On my way", kind: "action", params: [], build: () => ping("is on the way") },
  { id: "all-in", group: SMART, label: "All in", kind: "action", params: [], build: () => ping("signals to all in") },
  { id: "assist", group: SMART, label: "Assist me", kind: "action", params: [], build: () => ping("is asking for assistance") },
  { id: "need-vision", group: SMART, label: "Need vision", kind: "action", params: [], build: () => ping("is asking for vision") },

  // Generic ping on something. Ground pings don't show in chat.
  { id: "defend-turret", group: TARGET, label: "Defending allied turret", kind: "action", params: ["turret"], build: (p) => g(`is defending the ${p.turret}`) },
  { id: "defend-structure", group: TARGET, label: "Defending allied structure", kind: "action", params: ["structure"], build: (p) => g(`is defending the ${p.structure}`) },
  { id: "target-champ", group: TARGET, label: "Targeted enemy champion", kind: "action", params: ["enemyPlayer", "enemy"], build: (p) => g(`has targeted ${p.enemyPlayer} - (${p.enemy})`) },
  { id: "target-turret", group: TARGET, label: "Targeted enemy turret", kind: "action", params: ["turret"], build: (p) => g(`has targeted the ${p.turret}`) },
  { id: "target-structure", group: TARGET, label: "Targeted enemy structure", kind: "action", params: ["structure"], build: (p) => g(`has targeted the ${p.structure}`) },
  { id: "target-monster", group: TARGET, label: "Targeted monster", kind: "action", params: ["monster"], build: (p) => g(`has targeted the ${p.monster}`) },

  // Caution ping, on the ground or on something.
  { id: "caution", group: CAUTION, label: "Be cautious", kind: "action", params: [], build: () => g("signals to be cautious") },
  { id: "caution-ally", group: CAUTION, label: "Ally should fall back", kind: "action", params: ["allyPlayer", "ally"], build: (p) => g(`signals ${p.allyPlayer} - (${p.ally}) to fall back`) },
  { id: "caution-own-turret", group: CAUTION, label: "Falling back from allied turret", kind: "action", params: ["turret"], build: (p) => g(`is falling back from the ${p.turret}`) },
  { id: "caution-enemy", group: CAUTION, label: "Back away from enemy champion", kind: "action", params: ["enemyPlayer", "enemy"], build: (p) => g(`signals everyone to back away from ${p.enemyPlayer} - (${p.enemy})`) },
  { id: "caution-turret", group: CAUTION, label: "Fall back from enemy turret", kind: "action", params: ["turret"], build: (p) => g(`signals everyone to fall back from the ${p.turret}`) },
  { id: "caution-structure", group: CAUTION, label: "Fall back from enemy structure", kind: "action", params: ["structure"], build: (p) => g(`signals everyone to fall back from the ${p.structure}`) },
  { id: "caution-monster", group: CAUTION, label: "Fall back from monster", kind: "action", params: ["monster"], build: (p) => g(`signals everyone to fall back from the ${p.monster}`) },

  // Clicking HUD or scoreboard elements.
  { id: "hud-enemy-ult", group: HUD, label: "Enemy ultimate", kind: "chat", params: ["enemy"], build: (p) => `${r(p.enemy)} ${g("R")}` },
  { id: "hud-ally-ult", group: HUD, label: "Ally ultimate", kind: "chat", params: ["ally", "abilityStatus"], build: (p) => `${b(p.ally)}${info(` - ${p.abilityStatus}`)}` },
  { id: "hud-own-ult", group: HUD, label: "Your ultimate", kind: "chat", params: ["abilityStatus"], build: (p) => `${g("R")}${info(` - ${p.abilityStatus}`)}` },
  { id: "hud-ability", group: HUD, label: "Your ability", kind: "chat", params: ["ability", "abilityStatus"], build: (p) => `${g(p.ability)}${info(` - ${p.abilityStatus}`)}` },
  { id: "hud-spell", group: HUD, label: "Your summoner spell", kind: "chat", params: ["spell", "spellStatus"], build: (p) => `${g(p.spell)}${info(` - ${p.spellStatus}`)}` },
  { id: "hud-item", group: HUD, label: "Your item", kind: "chat", params: ["item", "itemStatus"], build: (p) => `${g(p.item)}${info(` - ${p.itemStatus}`)}` },
  { id: "hud-ally-item", group: HUD, label: "Ally item", kind: "chat", params: ["ally", "item", "itemStatus"], build: (p) => `${b(p.ally)} ${g(p.item)}${info(` - ${p.itemStatus}`)}` },
  { id: "hud-enemy-item", group: HUD, label: "Enemy item, rune or augment", kind: "chat", params: ["enemy", "item"], build: (p) => `${r(p.enemy)} ${g(p.item)}` },
  { id: "hud-health", group: HUD, label: "Health", kind: "chat", params: ["percent"], build: (p) => info(`Health ${p.percent}%`) },
  { id: "hud-mana", group: HUD, label: "Mana", kind: "chat", params: ["percent"], build: (p) => info(`Mana ${p.percent}%`) },
  { id: "hud-xp", group: HUD, label: "Experience", kind: "chat", params: ["percent", "level"], build: (p) => info(`${p.percent}% towards Level ${p.level}`) },
  { id: "hud-champ-level", group: HUD, label: "Champion level", kind: "chat", params: ["enemy", "level"], build: (p) => `${r(p.enemy)}${info(` - Level ${p.level}`)}` },
  { id: "hud-portrait", group: HUD, label: "Champion alive or respawning", kind: "chat", params: ["enemy", "champStatus"], build: (p) => `${r(p.enemy)}${info(` - ${p.champStatus}`)}` },
  { id: "hud-stat", group: HUD, label: "Champion stat", kind: "chat", params: ["stat", "statValue"], build: (p) => `${info(p.stat)} ${statValue(p.stat, p.statValue)}` },
  { id: "hud-rune", group: HUD, label: "Rune", kind: "chat", params: ["rune"], build: (p) => g(p.rune) },
  { id: "hud-buff", group: HUD, label: "Buff timer", kind: "chat", params: ["buff", "monsterStatus"], build: (p) => `${g(p.buff)}${info(` - ${p.monsterStatus}`)}` },
  { id: "hud-epic", group: HUD, label: "Epic monster timer", kind: "chat", params: ["monster", "monsterStatus"], build: (p) => `${g(p.monster)}${info(` - ${p.monsterStatus}`)}` },
  { id: "hud-recall", group: HUD, label: "Recall", kind: "chat", params: [], build: () => "Recall" },
  { id: "hud-gold", group: HUD, label: "Gold", kind: "chat", params: ["gold"], build: (p) => `${g(`${p.gold} Gold`)}` },
  { id: "hud-bounty", group: HUD, label: "Champion bounty", kind: "chat", params: ["enemy", "gold"], build: (p) => `${r(p.enemy)} ${g("has a")} ${y(`${p.gold}G`)} ${g("bounty")}` },
  { id: "hud-latency", group: HUD, label: "Server ping", kind: "chat", params: ["ms"], build: (p) => `Ping is ${p.ms}ms` },

  // Kills and announcements. Killer and victim keep their team color.
  { id: "kill-by-enemy", group: KILLS, label: "Enemy killed ally", kind: "system", params: ["enemyPlayer", "enemy", "allyPlayer", "ally", "multikill"],
    build: (p) => killLine(r(who(p.enemyPlayer, p.enemy)), b(who(p.allyPlayer, p.ally)), p.multikill) },
  { id: "kill-by-ally", group: KILLS, label: "Ally killed enemy", kind: "system", params: ["allyPlayer", "ally", "enemyPlayer", "enemy", "multikill"],
    build: (p) => killLine(b(who(p.allyPlayer, p.ally)), r(who(p.enemyPlayer, p.enemy)), p.multikill) },
  { id: "spree-enemy", group: KILLS, label: "Enemy killing streak", kind: "system", params: ["enemyPlayer", "enemy", "spree"],
    build: (p) => `${r(who(p.enemyPlayer, p.enemy))} ${g(p.spree)}` },
  { id: "spree-ally", group: KILLS, label: "Ally killing streak", kind: "system", params: ["allyPlayer", "ally", "spree"],
    build: (p) => `${b(who(p.allyPlayer, p.ally))} ${g(p.spree)}` },
  { id: "shutdown-by-ally", group: KILLS, label: "Ally shut down enemy", kind: "system", params: ["allyPlayer", "ally", "enemyPlayer", "enemy", "gold"],
    build: (p) => shutdownLine(b(who(p.allyPlayer, p.ally)), r(who(p.enemyPlayer, p.enemy)), p.gold) },
  { id: "shutdown-by-enemy", group: KILLS, label: "Enemy shut down ally", kind: "system", params: ["enemyPlayer", "enemy", "allyPlayer", "ally", "gold"],
    build: (p) => shutdownLine(r(who(p.enemyPlayer, p.enemy)), b(who(p.allyPlayer, p.ally)), p.gold) },
  { id: "ace-enemy", group: KILLS, label: "Enemy team ace", kind: "system", params: [], build: () => `${r("Enemy team")} ${g("has scored an ace!")}` },
  { id: "ace-ally", group: KILLS, label: "Ally team ace", kind: "system", params: [], build: () => `${b("Ally team")} ${g("has scored an ace!")}` },

  // Not pings, but they show up in the same chat box.
  { id: "purchase", group: OTHER, label: "Purchased item", kind: "action", params: ["item"], build: (p) => `purchased ${g(p.item)}` },
  { id: "sys-first-turret", group: OTHER, label: "Ally team destroyed first turret", kind: "system", params: [], build: () => g("Ally team has destroyed the first turret!") },
  { id: "sys-surrender-failed", group: OTHER, label: "Surrender vote failed", kind: "system", params: [], build: () => g("Surrender vote failed for your team 2 / 1.") },
  { id: "sys-custom", group: OTHER, label: "Other system message", kind: "system", params: ["text"], build: (p) => g(p.text) },
];

export function pingToLine(def: PingDef, values: Partial<Record<ParamKey, string>>): Partial<ChatLine> {
  const filled = {} as Record<ParamKey, string>;
  for (const k of Object.keys(PARAMS) as ParamKey[]) {
    filled[k] = (values[k] ?? "").trim() || PARAMS[k].placeholder;
  }
  const body = def.build(filled);
  if (def.kind === "system") return { team: "system", body };
  return { kind: def.kind, body };
}
