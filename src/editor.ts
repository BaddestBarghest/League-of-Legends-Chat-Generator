import type { Channel, ChatLine, LineKind, Team } from "./types";
import { championPicker } from "./championPicker";
import { $, el } from "./dom";
import { changed, makeLine, newId, onChange, state } from "./state";
import { findTimeIssues, fixTimes } from "./timeCheck";

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

  $<HTMLButtonElement>("#btn-add-chat").addEventListener("click", () => addLine(list, { channel: "team", body: "on my way" }));
  $<HTMLButtonElement>("#btn-add-all").addEventListener("click", () => addLine(list, { channel: "all", body: "gg" }));

  $<HTMLButtonElement>("#btn-fix-times").addEventListener("click", () => {
    fixTimes(state.lines);
    changed(true);
  });

  onChange((structural) => {
    if (structural) renderList();
    markTimeIssues(list);
  });
  renderList();
  markTimeIssues(list);
}

// Highlights lines whose time is out of order and shows the fix button.
function markTimeIssues(list: HTMLElement): void {
  const issues = findTimeIssues(state.lines);
  for (const li of list.querySelectorAll<HTMLLIElement>(".line")) {
    const problem = issues.get(li.dataset.id ?? "");
    li.classList.toggle("time-bad", Boolean(problem));
    const note = li.querySelector<HTMLElement>(".time-note");
    if (note) note.textContent = problem ?? "";
  }
  const order = [...issues.values()].filter((m) => m.startsWith("Earlier")).length;
  const format = issues.size - order;
  const parts = [];
  if (order) parts.push(`${order} ${order === 1 ? "time is" : "times are"} earlier than the line above`);
  if (format) parts.push(`${format} ${format === 1 ? "time isn't" : "times aren't"} in mm:ss`);
  $<HTMLDivElement>("#time-warning").hidden = issues.size === 0;
  $<HTMLSpanElement>("#time-warning-text").textContent = parts.join(", ") + ".";
  $<HTMLButtonElement>("#btn-fix-times").hidden = order === 0;
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
  const li = el("li", { className: "line", "data-team": l.team, "data-id": l.id });
  const set = (patch: Partial<ChatLine>) => {
    Object.assign(l, patch);
    changed();
  };

  const text = (cls: string, value: string, placeholder: string, label: string, key: keyof ChatLine) => {
    const input = el("input", { type: "text", className: cls, value, placeholder, "aria-label": label });
    input.addEventListener("input", () => set({ [key]: input.value }));
    return input;
  };

  const time = text("f-time", l.time, "none", "Timestamp", "time");
  time.title = "Leave blank to hide the timestamp on this line";
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

  const channel = el("select", { className: "f-channel", "aria-label": "Chat tag" }, [
    el("option", { value: "", textContent: "No tag" }),
    el("option", { value: "team", textContent: "[Team]" }),
    el("option", { value: "all", textContent: "[All]" }),
  ]);
  channel.value = l.channel;
  channel.addEventListener("change", () => set({ channel: channel.value as Channel }));

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
    el("div", { className: "row" }, [time, team, channel, kind, tools]),
    el("div", { className: "row" }, [name, championPicker(champ)]),
    el("div", { className: "row" }, [body]),
    el("p", { className: "time-note", "aria-live": "polite" }),
  );
  return li;
}

function move(index: number, dir: number): void {
  const j = index + dir;
  if (j < 0 || j >= state.lines.length) return;
  [state.lines[index], state.lines[j]] = [state.lines[j], state.lines[index]];
  changed(true);
}
