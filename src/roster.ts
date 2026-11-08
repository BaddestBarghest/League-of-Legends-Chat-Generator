import type { Player } from "./types";
import { $, el } from "./dom";
import { iconUrl } from "./gameData";
import { championPicker, itemPicker, spellPicker, trinketPicker } from "./namePicker";
import { changed, newId, onChange, state, statsOf } from "./state";
import { isCollapsed, setCollapsed } from "./collapse";

// A list of both teams' players. The Chat tab shows names and champions,
// the Scoreboard tab shows the same players with their stats underneath.
// Both edit the same players.
export function mountRoster(selector: string, withStats: boolean): void {
  const panel = $<HTMLElement>(selector);

  const render = () => {
    const column = (team: Player["team"], title: string) => {
      const players = state.players.filter((p) => p.team === team);
      const add = el("button", { type: "button", className: "small", textContent: `+ ${team === "ally" ? "Ally" : "Enemy"}` });
      add.addEventListener("click", () => {
        state.players.push({ id: newId(), team, name: "", champion: "" });
        changed(true);
        render();
        // Focus the new player's name so it can be typed straight away.
        const names = panel.querySelectorAll<HTMLInputElement>(`.roster-col[data-team="${team}"] .p-name`);
        names[names.length - 1]?.focus();
      });
      return el("div", { className: "roster-col", "data-team": team }, [
        el("div", { className: "roster-head" }, [el("h3", { textContent: title }), add]),
        ...players.map((p) => playerRow(p, render, withStats)),
        ...(players.length ? [] : [el("p", { className: "roster-empty", textContent: "No one yet" })]),
      ]);
    };
    panel.replaceChildren(column("ally", "Allies"), column("enemy", "Enemies"));
  };

  onChange((structural) => {
    // Don't rebuild while a name is being typed here, it would lose its place.
    // A focused button (like + Ally) is fine to rebuild.
    const typing = document.activeElement instanceof HTMLInputElement && panel.contains(document.activeElement);
    if (structural && !typing) render();
    // The other list may have renamed someone, so refresh names even while typing stats.
    else if (structural && withStats) refreshNames(panel);
  });
  render();
}

function playerRow(p: Player, render: () => void, withStats: boolean): HTMLElement {
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
  const portrait = el("span", { className: "p-icon", "aria-hidden": "true" });
  const showPortrait = () => {
    const url = iconUrl("champion", p.champion);
    const img = url ? el("img", { src: url, alt: "", crossOrigin: "anonymous" }) : null;
    // A blocked or missing icon leaves the empty tile, not a broken image.
    img?.addEventListener("error", () => img.remove());
    portrait.replaceChildren(...(img ? [img] : []));
  };
  showPortrait();

  const champ = el("input", { type: "text", value: p.champion, placeholder: "Champion", "aria-label": "Champion" });
  champ.addEventListener("input", () => {
    update({ champion: champ.value });
    showPortrait();
  });

  const remove = el("button", { type: "button", className: "p-del", textContent: "✕", title: "Remove player", "aria-label": "Remove player" });
  remove.addEventListener("click", () => {
    // Their lines stay. They just stop being linked to a roster entry.
    state.players = state.players.filter((x) => x !== p);
    changed(true);
    render();
  });

  if (!withStats) return el("div", { className: "roster-row", "data-id": p.id }, [portrait, name, championPicker(champ), remove]);

  // On the scoreboard each player folds down to one summary line.
  const id = `player:${p.id}`;
  const toggle = el("button", { type: "button", className: "collapse-btn p-toggle", "aria-label": "Show stats" }, [
    el("span", { className: "chev", "aria-hidden": "true" }),
  ]);
  const summary = el("p", { className: "stats-summary" });
  const showSummary = () => (summary.textContent = statsSummary(p));
  showSummary();
  const row = el("div", { className: "roster-row with-toggle", "data-id": p.id }, [toggle, portrait, name, championPicker(champ), remove]);
  const entry = el("div", { className: "roster-entry" }, [row, summary, statsPanel(p, showSummary)]);
  const apply = (collapsed: boolean) => {
    entry.classList.toggle("collapsed", collapsed);
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.title = collapsed ? "Show stats" : "Hide stats";
    toggle.setAttribute("aria-label", toggle.title);
  };
  apply(isCollapsed(id, false));
  toggle.addEventListener("click", () => {
    const collapsed = !entry.classList.contains("collapsed");
    setCollapsed(id, collapsed);
    apply(collapsed);
  });
  return entry;
}

// One line describing a player's scoreboard stats, for the folded view.
function statsSummary(p: Player): string {
  const s = statsOf(p);
  const parts = [`Lv ${s.level}`, `${s.kills}/${s.deaths}/${s.assists}`, `${s.cs} CS`];
  const items = s.items.slice(0, 6).filter((i) => i.trim()).length;
  parts.push(`${items} item${items === 1 ? "" : "s"}`);
  if (s.respawn > 0) parts.push(`dead ${s.respawn}s`);
  if (s.bounty > 0) parts.push(`${s.bounty}G bounty`);
  return parts.join(" · ");
}

// Opens or folds every player on the scoreboard tab at once.
export function setAllPlayersCollapsed(collapsed: boolean): void {
  for (const p of state.players) setCollapsed(`player:${p.id}`, collapsed);
  for (const entry of document.querySelectorAll<HTMLElement>("#sb-roster .roster-entry")) {
    entry.classList.toggle("collapsed", collapsed);
    const toggle = entry.querySelector<HTMLButtonElement>(".p-toggle");
    toggle?.setAttribute("aria-expanded", String(!collapsed));
    if (toggle) toggle.title = collapsed ? "Show stats" : "Hide stats";
  }
}

// Brings name and champion fields up to date without rebuilding the list.
function refreshNames(panel: HTMLElement): void {
  for (const row of panel.querySelectorAll<HTMLElement>(".roster-row")) {
    const p = state.players.find((x) => x.id === row.dataset.id);
    const [name, champ] = row.querySelectorAll<HTMLInputElement>("input");
    if (!p || !name || !champ) continue;
    if (document.activeElement !== name) name.value = p.name;
    if (document.activeElement !== champ) champ.value = p.champion;
  }
}

// Level, score, spells, runes and items, as the Tab scoreboard shows them.
function statsPanel(p: Player, onEdit: () => void): HTMLElement {
  const s = statsOf(p);
  const save = () => {
    onEdit();
    changed();
  };

  const num = (label: string, key: "level" | "kills" | "deaths" | "assists" | "cs" | "respawn" | "bounty", max: number) => {
    const input = el("input", { type: "number", min: "0", max: String(max), value: String(s[key]), "aria-label": label });
    input.addEventListener("input", () => {
      s[key] = Math.max(0, Math.min(max, Math.floor(Number(input.value) || 0)));
      save();
    });
    return el("label", {}, [label, input]);
  };

  const pick = (label: string, value: string, picker: (i: HTMLInputElement) => HTMLElement, onSet: (v: string) => void) => {
    const input = el("input", { type: "text", value, placeholder: "None", "aria-label": label });
    input.addEventListener("input", () => {
      onSet(input.value);
      save();
    });
    return el("label", {}, [label, picker(input)]);
  };

  const setSpell = (i: 0 | 1) => (v: string) => (s.spells[i] = v);
  const setItem = (i: number) => (v: string) => (s.items[i] = v);

  // Keystone and secondary rune stay in the data but aren't on the Tab
  // scoreboard, so they don't get fields here.
  return el("div", { className: "stats" }, [
    el("div", { className: "stats-nums" }, [num("Level", "level", 18), num("K", "kills", 999), num("D", "deaths", 999), num("A", "assists", 999), num("CS", "cs", 9999)]),
    el("div", { className: "stats-four" }, [
      num("Dead (s)", "respawn", 999),
      num("Bounty", "bounty", 9999),
      pick("Spell 1", s.spells[0], spellPicker, setSpell(0)),
      pick("Spell 2", s.spells[1], spellPicker, setSpell(1)),
    ]),
    el(
      "div",
      { className: "stats-four" },
      s.items.map((item, i) => (i === 6 ? pick("Trinket", item, trinketPicker, setItem(i)) : pick(`Item ${i + 1}`, item, itemPicker, setItem(i)))),
    ),
  ]);
}
