import type { KillEntry, KillIcon, Portrait } from "./types";
import { $, el, toast } from "./dom";
import { setImage } from "./imageStore";
import { KILL_ICONS, killImageKey } from "./killfeed";
import { championPicker } from "./namePicker";
import { changed, defaultKillfeed, makeKill, onChange, state } from "./state";

// Asks for a picture and saves it under key.
function pickImage(key: string): void {
  const input = el("input", { type: "file", accept: "image/*" });
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      await setImage(key, file);
      changed(true);
    } catch {
      toast(`Couldn't open ${file.name} as an image.`);
    }
  });
  input.click();
}

// A chooser for one portrait: a player, any champion, your own picture, or none.
function portraitField(label: string, p: Portrait, imageKey: string, allowNone: boolean, onRemove?: () => void): HTMLElement {
  const kind = el("select", { "aria-label": `${label} source` }, [
    el(
      "optgroup",
      { label: "Players" },
      state.players.map((pl) =>
        el("option", {
          value: `player:${pl.id}`,
          textContent: `${pl.name || "(no name)"}${pl.champion ? ` (${pl.champion})` : ""}`,
          selected: p.kind === "player" && p.value === pl.id,
        }),
      ),
    ),
    el("option", { value: "champion", textContent: "Any champion...", selected: p.kind === "champion" }),
    el("option", { value: "custom", textContent: "Your image...", selected: p.kind === "custom" }),
    ...(allowNone ? [el("option", { value: "none", textContent: "Nobody", selected: p.kind === "none" })] : []),
  ]);
  const parts: HTMLElement[] = [kind];
  if (p.kind === "champion") {
    const input = el("input", { type: "text", value: p.value, placeholder: "Champion", "aria-label": `${label} champion` });
    input.addEventListener("input", () => {
      p.value = input.value;
      changed();
    });
    parts.push(championPicker(input));
  } else if (p.kind === "custom") {
    const choose = el("button", { type: "button", className: "small", textContent: "Choose picture" });
    choose.addEventListener("click", () => pickImage(imageKey));
    parts.push(choose);
  }
  if (onRemove) {
    const remove = el("button", { type: "button", className: "icon-btn", textContent: "✕", title: `Remove ${label.toLowerCase()}`, "aria-label": `Remove ${label.toLowerCase()}` });
    remove.addEventListener("click", onRemove);
    parts.push(remove);
  }
  kind.addEventListener("change", () => {
    const v = kind.value;
    if (v.startsWith("player:")) Object.assign(p, { kind: "player", value: v.slice(7) });
    else if (v === "champion") Object.assign(p, { kind: "champion", value: "" });
    else Object.assign(p, { kind: v, value: "" });
    changed(true);
    if (v === "custom") pickImage(imageKey);
  });
  return el("div", { className: "kf-portrait" }, [el("span", { className: "kf-label", textContent: label }), ...parts]);
}

const ICON_CHOICES: [KillIcon, string][] = [
  ...(Object.entries(KILL_ICONS) as [KillIcon, { label: string }][]).map(([k, v]): [KillIcon, string] => [k, v.label]),
  ["custom", "Your image"],
];

export function mountKillfeedPanel(): void {
  const list = $<HTMLDivElement>("#kf-list");
  const ally = $<HTMLInputElement>("#kf-ally");
  const enemy = $<HTMLInputElement>("#kf-enemy");

  ally.addEventListener("input", () => {
    state.killfeed.allyColor = ally.value;
    changed();
  });
  enemy.addEventListener("input", () => {
    state.killfeed.enemyColor = enemy.value;
    changed();
  });
  $<HTMLButtonElement>("#kf-colors-reset").addEventListener("click", () => {
    const d = defaultKillfeed();
    Object.assign(state.killfeed, { allyColor: d.allyColor, enemyColor: d.enemyColor });
    changed(true);
  });
  $<HTMLButtonElement>("#kf-add").addEventListener("click", () => {
    const last = state.killfeed.entries[state.killfeed.entries.length - 1];
    state.killfeed.entries.push(makeKill(last ? { team: last.team } : {}));
    changed(true);
  });

  const card = (e: KillEntry, index: number) => {
    const entries = state.killfeed.entries;
    const team = el("div", { className: "seg small-seg", role: "group", "aria-label": "Whose kill" }, [
      el("button", { type: "button", textContent: "Ally kill", className: e.team === "ally" ? "on" : "" }),
      el("button", { type: "button", textContent: "Enemy kill", className: e.team === "enemy" ? "on" : "" }),
    ]);
    team.querySelectorAll("button").forEach((b, i) =>
      b.addEventListener("click", () => {
        e.team = i === 0 ? "ally" : "enemy";
        changed(true);
      }),
    );

    const icon = el(
      "select",
      { "aria-label": "Kill icon" },
      ICON_CHOICES.map(([v, label]) => el("option", { value: v, textContent: label, selected: v === e.icon })),
    );
    icon.addEventListener("change", () => {
      e.icon = icon.value as KillIcon;
      changed(true);
      if (e.icon === "custom") pickImage(killImageKey(e.id, "icon"));
    });
    const iconPart: HTMLElement[] = [icon];
    if (e.icon === "custom") {
      const choose = el("button", { type: "button", className: "small", textContent: "Choose icon" });
      choose.addEventListener("click", () => pickImage(killImageKey(e.id, "icon")));
      iconPart.push(choose);
    }

    const move = (d: number) => {
      const j = index + d;
      if (j < 0 || j >= entries.length) return;
      [entries[index], entries[j]] = [entries[j], entries[index]];
      changed(true);
    };
    const up = el("button", { type: "button", className: "icon-btn", textContent: "↑", title: "Move up", "aria-label": "Move up", disabled: index === 0 });
    up.addEventListener("click", () => move(-1));
    const down = el("button", { type: "button", className: "icon-btn", textContent: "↓", title: "Move down", "aria-label": "Move down", disabled: index === entries.length - 1 });
    down.addEventListener("click", () => move(1));
    const remove = el("button", { type: "button", className: "icon-btn", textContent: "✕", title: "Remove row", "aria-label": "Remove row" });
    remove.addEventListener("click", () => {
      state.killfeed.entries = entries.filter((x) => x !== e);
      changed(true);
    });

    const assists = e.assists.map((a, i) =>
      portraitField(`Assist ${i + 1}`, a, killImageKey(e.id, `a${i}`), true, () => {
        e.assists.splice(i, 1);
        changed(true);
      }),
    );
    const addAssist = el("button", { type: "button", className: "small", textContent: "Add assist", disabled: e.assists.length >= 4 });
    addAssist.addEventListener("click", () => {
      e.assists.push({ kind: "champion", value: "" });
      changed(true);
    });

    return el("div", { className: "kf-card" }, [
      el("div", { className: "kf-row" }, [team, ...iconPart, el("span", { className: "kf-spacer" }), up, down, remove]),
      portraitField("Killer", e.killer, killImageKey(e.id, "killer"), false),
      portraitField("Victim", e.victim, killImageKey(e.id, "victim"), false),
      ...assists,
      el("div", { className: "kf-row" }, [addAssist]),
    ]);
  };

  const render = () => {
    if (list.contains(document.activeElement) && document.activeElement?.matches("input[type=text]")) return;
    list.replaceChildren(...state.killfeed.entries.map(card));
    if (!state.killfeed.entries.length) list.append(el("p", { className: "hint", textContent: "No kills yet. Add one above." }));
  };
  const sync = () => {
    if (document.activeElement !== ally) ally.value = state.killfeed.allyColor;
    if (document.activeElement !== enemy) enemy.value = state.killfeed.enemyColor;
  };
  onChange((structural) => {
    if (structural) render();
    sync();
  });
  render();
  sync();
}
