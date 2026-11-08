import type { ChatLine, LineKind, Team } from "./types";
import { $, el } from "./dom";
import { changed, makeLine, newId, onChange, state } from "./state";

export function mountEditor(): void {
  const list = $<HTMLOListElement>("#lines");

  const renderList = () => {
    list.replaceChildren();
    if (state.lines.length === 0) {
      list.append(el("li", { className: "empty" }, ["No lines yet."]));
      return;
    }
    state.lines.forEach((l, i) => list.append(lineCard(l, i)));
  };

  $<HTMLButtonElement>("#btn-add-chat").addEventListener("click", () => addLine(list, { body: "on my way" }));
  $<HTMLButtonElement>("#btn-add-all").addEventListener("click", () => addLine(list, { allChat: true, body: "gg" }));

  onChange((structural) => {
    if (structural) renderList();
  });
  renderList();
}

// New lines copy the player from the last line, since chats usually come in runs.
export function addLine(list: HTMLElement, patch: Partial<ChatLine>): void {
  const prev = state.lines[state.lines.length - 1];
  const base: Partial<ChatLine> = prev
    ? { time: prev.time, team: prev.team === "system" ? "ally" : prev.team, name: prev.name, champion: prev.champion }
    : {};
  state.lines.push(makeLine({ ...base, ...patch }));
  changed(true);
  const bodies = list.querySelectorAll<HTMLInputElement>(".f-body");
  bodies[bodies.length - 1]?.focus();
}

function lineCard(l: ChatLine, index: number): HTMLLIElement {
  const li = el("li", { className: "line", "data-team": l.team });
  const set = (patch: Partial<ChatLine>) => {
    Object.assign(l, patch);
    changed();
  };

  const text = (cls: string, value: string, placeholder: string, label: string, key: keyof ChatLine) => {
    const input = el("input", { type: "text", className: cls, value, placeholder, "aria-label": label });
    input.addEventListener("input", () => set({ [key]: input.value }));
    return input;
  };

  const time = text("f-time", l.time, "00:00", "Timestamp", "time");
  const name = text("f-name", l.name, "Name", "Player name", "name");
  const champ = text("f-champ", l.champion, "Champion", "Champion", "champion");
  const body = text("f-body", l.body, "Message, e.g. purchased <gold>Infinity Edge</gold>", "Message", "body");

  const team = el("select", { "aria-label": "Team" }, [
    el("option", { value: "ally", textContent: "Ally" }),
    el("option", { value: "enemy", textContent: "Enemy" }),
    el("option", { value: "system", textContent: "System" }),
  ]);
  team.value = l.team;
  team.addEventListener("change", () => {
    set({ team: team.value as Team });
    li.dataset.team = team.value;
  });

  const kind = el("select", { className: "f-kind", "aria-label": "Line type" }, [
    el("option", { value: "chat", textContent: "Name:" }),
    el("option", { value: "action", textContent: "Name (no colon)" }),
  ]);
  kind.value = l.kind;
  kind.addEventListener("change", () => set({ kind: kind.value as LineKind }));

  const all = el("input", { type: "checkbox", checked: l.allChat });
  all.addEventListener("change", () => set({ allChat: all.checked }));

  const tool = (label: string, title: string, fn: () => void, cls = "") => {
    const b = el("button", { type: "button", textContent: label, title, className: cls, "aria-label": title });
    b.addEventListener("click", fn);
    return b;
  };
  const tools = el("div", { className: "tools" }, [
    tool("↑", "Move up", () => move(index, -1)),
    tool("↓", "Move down", () => move(index, 1)),
    tool("⧉", "Duplicate", () => {
      state.lines.splice(index + 1, 0, { ...structuredClone(l), id: newId() });
      changed(true);
    }),
    tool("✕", "Delete", () => {
      state.lines.splice(index, 1);
      changed(true);
    }, "del"),
  ]);

  li.append(
    el("div", { className: "row" }, [time, team, el("label", { className: "all-wrap" }, [all, "[All]"]), kind, tools]),
    el("div", { className: "row" }, [name, champ]),
    el("div", { className: "row" }, [body]),
  );
  return li;
}

function move(index: number, dir: number): void {
  const j = index + dir;
  if (j < 0 || j >= state.lines.length) return;
  [state.lines[index], state.lines[j]] = [state.lines[j], state.lines[index]];
  changed(true);
}
