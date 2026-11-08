import type { Player } from "./types";
import { $, el } from "./dom";
import { championPicker } from "./namePicker";
import { changed, newId, onChange, state } from "./state";

// The Players panel. Set each player up once, then pick them anywhere.
export function mountRoster(): void {
  const panel = $<HTMLElement>("#roster");

  const render = () => {
    const column = (team: Player["team"], title: string) => {
      const players = state.players.filter((p) => p.team === team);
      const add = el("button", { type: "button", className: "small", textContent: `+ ${team === "ally" ? "Ally" : "Enemy"}` });
      add.addEventListener("click", () => {
        state.players.push({ id: newId(), team, name: "", champion: "" });
        changed(true);
        // Focus the new player's name so it can be typed straight away.
        const names = panel.querySelectorAll<HTMLInputElement>(`.roster-col[data-team="${team}"] .p-name`);
        names[names.length - 1]?.focus();
      });
      return el("div", { className: "roster-col", "data-team": team }, [
        el("div", { className: "roster-head" }, [el("h3", { textContent: title }), add]),
        ...players.map(playerRow),
        ...(players.length ? [] : [el("p", { className: "roster-empty", textContent: "No one yet" })]),
      ]);
    };
    panel.replaceChildren(column("ally", "Allies"), column("enemy", "Enemies"));
  };

  onChange((structural) => {
    // Don't rebuild while someone is typing in here, they'd lose their place.
    if (structural && !panel.contains(document.activeElement)) render();
  });
  render();
}

function playerRow(p: Player): HTMLElement {
  // Renaming a player renames them on every line they wrote.
  const update = (patch: Partial<Player>) => {
    for (const line of state.lines) {
      if (line.team === p.team && line.name === p.name && line.champion === p.champion) {
        if (patch.name !== undefined) line.name = patch.name;
        if (patch.champion !== undefined) line.champion = patch.champion;
      }
    }
    Object.assign(p, patch);
    changed(true);
  };

  const name = el("input", { type: "text", className: "p-name", value: p.name, placeholder: "Name", "aria-label": "Player name" });
  name.addEventListener("input", () => update({ name: name.value }));
  const champ = el("input", { type: "text", value: p.champion, placeholder: "Champion", "aria-label": "Champion" });
  champ.addEventListener("input", () => update({ champion: champ.value }));

  const remove = el("button", { type: "button", className: "p-del", textContent: "✕", title: "Remove player", "aria-label": "Remove player" });
  remove.addEventListener("click", () => {
    // Their lines stay. They just stop being linked to a roster entry.
    state.players = state.players.filter((x) => x !== p);
    changed(true);
  });

  return el("div", { className: "roster-row" }, [name, championPicker(champ), remove]);
}
