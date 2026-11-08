import type { ChatLine } from "./types";

// Every ping the builder can make. Wording can drift between patches,
// so the lines they create stay editable.

export type ParamKey =
  | "enemy"
  | "ally"
  | "location"
  | "lane"
  | "structure"
  | "objective"
  | "ability"
  | "spell"
  | "item"
  | "ward"
  | "time"
  | "seconds";

export interface ParamDef {
  label: string;
  placeholder: string;
  options?: string[];
}

export const PARAMS: Record<ParamKey, ParamDef> = {
  enemy: { label: "Enemy champion", placeholder: "Draven" },
  ally: { label: "Ally champion", placeholder: "Leona" },
  location: {
    label: "Location",
    placeholder: "Dragon pit",
    options: ["Top lane", "Mid lane", "Bot lane", "Top river", "Bot river", "Dragon pit", "Baron pit", "Blue buff", "Red buff", "Enemy jungle", "Our jungle", "Base"],
  },
  lane: { label: "Lane", placeholder: "Bot lane", options: ["Top lane", "Mid lane", "Bot lane"] },
  structure: {
    label: "Structure",
    placeholder: "Inner Turret",
    options: ["Outer Turret", "Inner Turret", "Inhibitor Turret", "Inhibitor", "Nexus Turret", "Nexus"],
  },
  objective: {
    label: "Objective",
    placeholder: "Baron Nashor",
    options: ["Baron Nashor", "Elder Dragon", "Infernal Drake", "Ocean Drake", "Mountain Drake", "Cloud Drake", "Hextech Drake", "Chemtech Drake", "Rift Herald", "Voidgrubs", "Atakhan", "Scuttle Crab", "Blue Sentinel", "Red Brambleback"],
  },
  ability: { label: "Ability", placeholder: "Trueshot Barrage" },
  spell: {
    label: "Summoner spell",
    placeholder: "Flash",
    options: ["Flash", "Ignite", "Teleport", "Heal", "Barrier", "Exhaust", "Cleanse", "Ghost", "Smite"],
  },
  item: { label: "Item", placeholder: "Zhonya's Hourglass" },
  ward: { label: "Ward", placeholder: "Control Ward", options: ["Stealth Ward", "Control Ward", "Farsight Ward", "Zombie Ward"] },
  time: { label: "Game time", placeholder: "25:30" },
  seconds: { label: "Seconds", placeholder: "12" },
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

export const PINGS: PingDef[] = [
  // ---- Ping wheel / map pings
  { id: "generic", group: "Map pings", label: "Generic (look here)", kind: "action", params: [], build: () => `pinged ${g("here")}` },
  { id: "generic-at", group: "Map pings", label: "Generic at location", kind: "action", params: ["location"], build: (p) => `pinged ${g(p.location)}` },
  { id: "danger", group: "Map pings", label: "Danger / retreat", kind: "action", params: [], build: () => `signals ${g("Danger")}` },
  { id: "danger-at", group: "Map pings", label: "Danger at location", kind: "action", params: ["location"], build: (p) => `signals ${g("Danger")} at ${g(p.location)}` },
  { id: "missing", group: "Map pings", label: "Enemy missing", kind: "action", params: [], build: () => `says an ${g("enemy is missing")}` },
  { id: "missing-champ", group: "Map pings", label: "Specific enemy missing", kind: "action", params: ["enemy"], build: (p) => `says ${r(p.enemy)} ${g("is missing")}` },
  { id: "omw", group: "Map pings", label: "On my way", kind: "action", params: [], build: () => `is ${g("on the way")}` },
  { id: "omw-at", group: "Map pings", label: "On my way to location", kind: "action", params: ["location"], build: (p) => `is ${g("on the way")} to ${g(p.location)}` },
  { id: "assist", group: "Map pings", label: "Assist me / need help", kind: "action", params: [], build: () => `${g("needs assistance")}` },
  { id: "allin", group: "Map pings", label: "All in / engage", kind: "action", params: [], build: () => `wants to ${g("engage")}` },
  { id: "allin-champ", group: "Map pings", label: "Engage a champion", kind: "action", params: ["enemy"], build: (p) => `wants to ${g("engage")} ${r(p.enemy)}` },
  { id: "push", group: "Map pings", label: "Push", kind: "action", params: [], build: () => `wants to ${g("push")}` },
  { id: "push-lane", group: "Map pings", label: "Push a lane", kind: "action", params: ["lane"], build: (p) => `wants to ${g("push")} ${g(p.lane)}` },
  { id: "hold", group: "Map pings", label: "Hold", kind: "action", params: [], build: () => `wants to ${g("hold")}` },
  { id: "bait", group: "Map pings", label: "Bait", kind: "action", params: [], build: () => `wants to ${g("bait")}` },
  { id: "retreat", group: "Map pings", label: "Retreat / fall back", kind: "action", params: [], build: () => `wants to ${g("retreat")}` },
  { id: "group", group: "Map pings", label: "Group up", kind: "action", params: ["location"], build: (p) => `wants to ${g("group")} at ${g(p.location)}` },

  // ---- Vision
  { id: "need-vision", group: "Vision", label: "Need vision", kind: "action", params: [], build: () => `${g("needs vision")} here` },
  { id: "need-vision-at", group: "Vision", label: "Need vision at location", kind: "action", params: ["location"], build: (p) => `${g("needs vision")} at ${g(p.location)}` },
  { id: "enemy-vision", group: "Vision", label: "Enemy has vision", kind: "action", params: [], build: () => `says the ${g("enemy has vision")} here` },
  { id: "enemy-ward", group: "Vision", label: "Enemy ward spotted", kind: "action", params: ["ward"], build: (p) => `spotted an enemy ${g(p.ward)}` },
  { id: "clear-ward", group: "Vision", label: "Clearing a ward", kind: "action", params: ["ward"], build: (p) => `is clearing an enemy ${g(p.ward)}` },
  { id: "placed-ward", group: "Vision", label: "Ward placed", kind: "action", params: ["ward", "location"], build: (p) => `placed a ${g(p.ward)} at ${g(p.location)}` },

  // ---- Targets & objectives
  { id: "attack-champ", group: "Targets & objectives", label: "Attack enemy champion", kind: "action", params: ["enemy"], build: (p) => `wants to attack ${r(p.enemy)}` },
  { id: "protect-ally", group: "Targets & objectives", label: "Protect ally", kind: "action", params: ["ally"], build: (p) => `wants to protect ${b(p.ally)}` },
  { id: "attack-structure", group: "Targets & objectives", label: "Attack structure", kind: "action", params: ["structure"], build: (p) => `${g(`is attacking the ${p.structure}`)}` },
  { id: "defend-structure", group: "Targets & objectives", label: "Defend structure", kind: "action", params: ["structure"], build: (p) => `${g(`is defending the ${p.structure}`)}` },
  { id: "take-objective", group: "Targets & objectives", label: "Take objective", kind: "action", params: ["objective"], build: (p) => `wants to take ${g(p.objective)}` },
  { id: "defend-objective", group: "Targets & objectives", label: "Defend objective", kind: "action", params: ["objective"], build: (p) => `wants to defend ${g(p.objective)}` },
  { id: "objective-spawn", group: "Targets & objectives", label: "Objective spawn timer", kind: "chat", params: ["objective", "time"], build: (p) => `${g(p.objective)} spawns at ${g(p.time)}` },
  { id: "objective-respawn", group: "Targets & objectives", label: "Objective respawn timer", kind: "chat", params: ["objective", "time"], build: (p) => `${g(p.objective)} respawns at ${g(p.time)}` },
  { id: "objective-health", group: "Targets & objectives", label: "Objective health", kind: "chat", params: ["objective", "seconds"], build: (p) => `${g(p.objective)} - ${g(`${p.seconds}% health`)}` },

  // ---- Enemy timers (scoreboard pings)
  { id: "enemy-ult", group: "Enemy timers", label: "Enemy ultimate", kind: "chat", params: ["enemy"], build: (p) => `${r(p.enemy)} ${g("R")}` },
  { id: "enemy-ult-time", group: "Enemy timers", label: "Enemy ultimate back at", kind: "chat", params: ["enemy", "time"], build: (p) => `${r(p.enemy)} ${g("R")} ${g(p.time)}` },
  { id: "enemy-ult-ready", group: "Enemy timers", label: "Enemy ultimate ready", kind: "chat", params: ["enemy"], build: (p) => `${r(p.enemy)} ${g("R")} - ${g("Ready")}` },
  { id: "enemy-spell", group: "Enemy timers", label: "Enemy summoner spell", kind: "chat", params: ["enemy", "spell"], build: (p) => `${r(p.enemy)} ${g(p.spell)}` },
  { id: "enemy-spell-time", group: "Enemy timers", label: "Enemy summoner back at", kind: "chat", params: ["enemy", "spell", "time"], build: (p) => `${r(p.enemy)} ${g(p.spell)} ${g(p.time)}` },
  { id: "enemy-no-spell", group: "Enemy timers", label: "Enemy has no summoner", kind: "chat", params: ["enemy", "spell"], build: (p) => `${r(p.enemy)} no ${g(p.spell)}` },
  { id: "enemy-item", group: "Enemy timers", label: "Enemy item", kind: "chat", params: ["enemy", "item"], build: (p) => `${r(p.enemy)} has ${g(p.item)}` },

  // ---- Own abilities & items (HUD pings)
  { id: "ability-ready", group: "Abilities & items", label: "Ability ready", kind: "chat", params: ["ability"], build: (p) => `${g(p.ability)} - Ready` },
  { id: "ability-cd", group: "Abilities & items", label: "Ability on cooldown", kind: "chat", params: ["ability", "seconds"], build: (p) => `${g(p.ability)} - Cooldown ${g(`${p.seconds}s`)}` },
  { id: "ability-mana", group: "Abilities & items", label: "Not enough mana", kind: "chat", params: ["ability"], build: (p) => `${g(p.ability)} - Not enough mana` },
  { id: "ability-unlearned", group: "Abilities & items", label: "Ability not learned", kind: "chat", params: ["ability"], build: (p) => `${g(p.ability)} - Not learned` },
  { id: "spell-ready", group: "Abilities & items", label: "Summoner spell ready", kind: "chat", params: ["spell"], build: (p) => `${g(p.spell)} - Ready` },
  { id: "spell-cd", group: "Abilities & items", label: "Summoner spell cooldown", kind: "chat", params: ["spell", "seconds"], build: (p) => `${g(p.spell)} - Cooldown ${g(`${p.seconds}s`)}` },
  { id: "item-ready", group: "Abilities & items", label: "Item active ready", kind: "chat", params: ["item"], build: (p) => `${g(p.item)} - Ready` },
  { id: "item-cd", group: "Abilities & items", label: "Item active cooldown", kind: "chat", params: ["item", "seconds"], build: (p) => `${g(p.item)} - Cooldown ${g(`${p.seconds}s`)}` },
  { id: "purchase", group: "Abilities & items", label: "Purchased item", kind: "action", params: ["item"], build: (p) => `purchased ${g(p.item)}` },
  { id: "gold-to-item", group: "Abilities & items", label: "Gold needed for item", kind: "chat", params: ["item", "seconds"], build: (p) => `${g(p.item)} - ${g(`${p.seconds} gold`)} needed` },

  // ---- System lines (no player name)
  { id: "sys-ally-slain", group: "System", label: "An ally has been slain", kind: "system", params: [], build: () => g("An ally has been slain!") },
  { id: "sys-enemy-slain", group: "System", label: "An enemy has been slain", kind: "system", params: [], build: () => g("An enemy has been slain!") },
  { id: "sys-kill", group: "System", label: "Ally killed enemy", kind: "system", params: ["ally", "enemy"], build: (p) => `${b(p.ally)} has slain ${r(p.enemy)}` },
  { id: "sys-death", group: "System", label: "Enemy killed ally", kind: "system", params: ["enemy", "ally"], build: (p) => `${r(p.enemy)} has slain ${b(p.ally)}` },
  { id: "sys-objective", group: "System", label: "Team took objective", kind: "system", params: ["objective"], build: (p) => `Your team has slain ${g(p.objective)}` },
  { id: "sys-enemy-objective", group: "System", label: "Enemy took objective", kind: "system", params: ["objective"], build: (p) => `The enemy team has slain ${r(p.objective)}` },
  { id: "sys-structure", group: "System", label: "Structure destroyed", kind: "system", params: ["structure"], build: (p) => `${g(`Your team has destroyed a ${p.structure}`)}` },
  { id: "sys-disconnect", group: "System", label: "Player disconnected", kind: "system", params: ["ally"], build: (p) => `${b(p.ally)} has disconnected.` },
  { id: "sys-reconnect", group: "System", label: "Player reconnected", kind: "system", params: ["ally"], build: (p) => `${b(p.ally)} has reconnected.` },
  { id: "sys-surrender", group: "System", label: "Surrender vote", kind: "system", params: [], build: () => g("Your team voted to surrender.") },
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
