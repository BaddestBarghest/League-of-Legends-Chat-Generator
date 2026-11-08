import type { Channel, ChatLine, Team } from "./types";
import { championPicker } from "./namePicker";
import { $, el } from "./dom";
import { changed, newId, onChange, playerOf, state } from "./state";
import { findTimeIssues, fixTimes } from "./timeCheck";
import { lineSegments } from "./render";

// The line being edited. Everything else shows as a one-row summary.
let openId: string | null = null;

export function getOpenLineId(): string | null {
  return openId;
}

// Opens a line's editor and moves focus to its message.
export function openLine(id: string | null, focus = true): void {
  openId = id;
  changed(true);
  if (!id || !focus) return;
  const li = document.querySelector<HTMLLIElement>(`.line[data-id="${id}"]`);
  li?.scrollIntoView({ block: "nearest" });
  li?.querySelector<HTMLInputElement>(".f-body")?.focus();
}

export function mountEditor(): void {
  const list = $<HTMLOListElement>("#lines");

  const renderList = () => {
    list.replaceChildren();
    if (state.lines.length === 0) {
      list.append(el("li", { className: "empty" }, ["No lines yet."]));
      return;
    }
    if (openId && !state.lines.some((l) => l.id === openId)) openId = null;
    state.lines.forEach((l, i) => list.append(l.id === openId ? lineCard(l, i) : compactRow(l, i)));
  };

  $<HTMLButtonElement>("#btn-fix-times").addEventListener("click", () => {
    fixTimes(state.lines);
    changed(true);
  });

  onChange((structural) => {
    if (structural) renderList();
    else refreshSummaries(list);
    markTimeIssues(list);
  });
  renderList();
  markTimeIssues(list);
}

// Colored text for a line, the way it will render, without the time.
function summary(l: ChatLine): HTMLElement {
  const segs = lineSegments({ ...l, time: "" }, state.settings);
  const span = el(
    "span",
    { className: "sum-text" },
    segs.map((s) => {
      const part = el("span", { textContent: s.text });
      part.style.color = s.color;
      if (s.bold) part.style.fontWeight = "600";
      return part;
    }),
  );
  if (!segs.length) span.append(el("span", { className: "sum-empty", textContent: "Empty line" }));
  return span;
}

function refreshSummaries(list: HTMLElement): void {
  for (const li of list.querySelectorAll<HTMLLIElement>(".line.compact")) {
    const line = state.lines.find((l) => l.id === li.dataset.id);
    if (!line) continue;
    li.querySelector(".sum-text")?.replaceWith(summary(line));
    const time = li.querySelector(".sum-time");
    if (time) time.textContent = line.time || "--:--";
  }
}

function toolButtons(l: ChatLine, index: number): HTMLElement {
  const tool = (label: string, title: string, fn: () => void, cls = "") => {
    const b = el("button", { type: "button", textContent: label, title, className: cls, "aria-label": title });
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      fn();
    });
    return b;
  };
  return el("div", { className: "tools" }, [
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
}

// One row per line: time and the colored text. Click to edit.
function compactRow(l: ChatLine, index: number): HTMLLIElement {
  const li = el("li", { className: "line compact", "data-team": l.team, "data-id": l.id });
  const open = el("button", { type: "button", className: "sum", "aria-label": "Edit line" }, [
    el("span", { className: "sum-time", textContent: l.time || "--:--" }),
    summary(l),
  ]);
  open.addEventListener("click", () => openLine(l.id));
  li.append(el("div", { className: "row" }, [open, toolButtons(l, index)]), el("p", { className: "time-note", "aria-live": "polite" }));
  return li;
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

// Lines whose speaker is being typed in by hand rather than picked.
const customSpeaker = new Set<string>();

// "Who" menu: roster players by team, system, or someone typed by hand.
function speakerSelect(l: ChatLine): HTMLSelectElement {
  const group = (team: "ally" | "enemy", label: string) =>
    el(
      "optgroup",
      { label },
      state.players
        .filter((p) => p.team === team)
        .map((p) => el("option", { value: p.id, textContent: p.champion ? `${p.name || "(no name)"} (${p.champion})` : p.name || "(no name)" })),
    );
  const select = el("select", { className: "f-who", "aria-label": "Who" }, [
    group("ally", "Allies"),
    group("enemy", "Enemies"),
    el("option", { value: "system", textContent: "System message" }),
    el("option", { value: "custom", textContent: "Someone else..." }),
  ]);
  const player = playerOf(l);
  select.value = l.team === "system" ? "system" : player && !customSpeaker.has(l.id) ? player.id : "custom";

  select.addEventListener("change", () => {
    customSpeaker.delete(l.id);
    const picked = state.players.find((p) => p.id === select.value);
    if (picked) Object.assign(l, { team: picked.team, name: picked.name, champion: picked.champion });
    else if (select.value === "system") Object.assign(l, { team: "system", channel: "" });
    else {
      customSpeaker.add(l.id);
      if (l.team === "system") l.team = "ally";
    }
    changed(true);
  });
  return select;
}

function lineCard(l: ChatLine, index: number): HTMLLIElement {
  const li = el("li", { className: "line open", "data-team": l.team, "data-id": l.id });
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
  ]);
  team.value = l.team;
  team.addEventListener("change", () => {
    set({ team: team.value as Team });
    li.dataset.team = team.value;
  });

  // Typed chat is either team or all chat. Pings have no tag, so they don't
  // get this menu at all.
  const channel = el("select", { className: "f-channel", "aria-label": "Chat tag" }, [
    el("option", { value: "team", textContent: "[Team]" }),
    el("option", { value: "all", textContent: "[All]" }),
  ]);
  channel.value = l.channel;
  channel.addEventListener("change", () => set({ channel: channel.value as Channel }));
  const isChat = l.channel !== "";

  const done = el("button", { type: "button", className: "small done", textContent: "Done" });
  done.addEventListener("click", () => openLine(null));
  const tools = el("div", { className: "tools" }, [toolButtons(l, index), done]);
  // Escape closes the editor.
  li.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !(e.target as HTMLElement).closest(".cb")) openLine(null);
  });

  const who = speakerSelect(l);
  const typedByHand = who.value === "custom";

  li.append(
    el("div", { className: "row" }, [time, who, ...(isChat ? [channel] : []), tools]),
    ...(typedByHand ? [el("div", { className: "row" }, [team, name, championPicker(champ)])] : []),
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
