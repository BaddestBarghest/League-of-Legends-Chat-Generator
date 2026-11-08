import type { ChatLine, Channel, Player } from "./types";
import { $, el } from "./dom";
import { getOpenLineId, openLine } from "./editor";
import { getAbilities, getRunes, loadAbilities } from "./gameData";
import { championPicker, itemPicker, namePicker, spellPicker } from "./namePicker";
import { PARAMS, PINGS, pingText, pingToLine, type ParamKey } from "./pings";
import { changed, makeLine, onChange, playerOf, state } from "./state";

// The box for adding lines: pick who's talking, then type a chat message or
// build a ping. New lines go after the line being edited, or at the end.
export function mountComposer(): void {
  const from = $<HTMLSelectElement>("#cmp-from");
  const time = $<HTMLInputElement>("#cmp-time");
  const message = $<HTMLInputElement>("#cmp-msg");
  const tag = $<HTMLSelectElement>("#cmp-tag");
  const pingSearch = $<HTMLInputElement>("#ping-type");
  const params = $<HTMLDivElement>("#ping-params");
  const values: Partial<Record<ParamKey, string>> = {};

  // ---- who's talking

  const speaker = (): Player | undefined => state.players.find((p) => p.id === from.value);

  const fillFrom = () => {
    const keep = from.value;
    const group = (team: Player["team"], label: string) =>
      el(
        "optgroup",
        { label },
        state.players.filter((p) => p.team === team).map((p) => el("option", { value: p.id, textContent: playerLabel(p) })),
      );
    from.replaceChildren(group("ally", "Allies"), group("enemy", "Enemies"), el("option", { value: "system", textContent: "System message" }));
    if ([...from.options].some((o) => o.value === keep)) from.value = keep;
    else {
      // Start with whoever spoke last.
      const last = [...state.lines].reverse().find((l) => l.team !== "system");
      from.value = (last && playerOf(last)?.id) ?? state.players[0]?.id ?? "system";
    }
  };

  // ---- adding

  const insert = (patch: Partial<ChatLine>) => {
    const openId = getOpenLineId();
    const at = openId ? state.lines.findIndex((l) => l.id === openId) + 1 : state.lines.length;
    const prev = state.lines[at - 1];
    const p = speaker();
    const who: Partial<ChatLine> = p ? { team: p.team, name: p.name, champion: p.champion } : { team: "system" };
    const line = makeLine({ time: time.value.trim() || prev?.time || "00:00", ...who, ...patch });
    state.lines.splice(at, 0, line);
    // Keep adding in the same spot by moving the selection to the new line.
    if (openId) openLine(line.id, false);
    else changed(true);
  };

  const addChat = () => {
    if (!message.value.trim()) return message.focus();
    // System messages never go to team or all chat.
    const system = from.value === "system";
    insert({ kind: "chat", channel: system ? "" : (tag.value as Channel), body: message.value });
    message.value = "";
    message.focus();
  };
  $<HTMLButtonElement>("#cmp-add").addEventListener("click", addChat);

  // The [Team]/[All] menu only applies to players.
  const syncTag = () => (tag.hidden = from.value === "system");
  from.addEventListener("change", syncTag);
  message.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addChat();
    }
  });

  // ---- chat or ping

  const modes = document.querySelectorAll<HTMLButtonElement>("#cmp-mode button");
  const addPing = $<HTMLButtonElement>("#btn-add-ping");
  modes.forEach((b) =>
    b.addEventListener("click", () => {
      modes.forEach((x) => x.classList.toggle("on", x === b));
      $<HTMLElement>("#cmp-chat").hidden = b.dataset.mode !== "chat";
      $<HTMLElement>("#cmp-ping").hidden = b.dataset.mode !== "ping";
    }),
  );

  // ---- pings

  // Pings are picked by searching their names. Clicking the empty field lists
  // them all. The field always ends up showing a real ping.
  let pingId = PINGS[0].id;
  pingSearch.value = PINGS[0].label;
  pingSearch.className = "ping-search";
  const slot = pingSearch.nextSibling;
  const row = pingSearch.parentElement!;
  const searchText = Object.fromEntries(PINGS.map((p) => [p.label, [pingText(p), p.group]]));
  row.insertBefore(namePicker(pingSearch, () => PINGS.map((p) => p.label), { showAllWhenEmpty: true, limit: 12, searchText }), slot);
  // Leaving without a choice puts the current ping back.
  pingSearch.addEventListener("input", () => {
    const found = PINGS.find((p) => p.label === pingSearch.value);
    if (found && found.id !== pingId) {
      pingId = found.id;
      renderParams();
    }
  });
  pingSearch.addEventListener("blur", () => (pingSearch.value = current().label));

  for (const [key, def] of Object.entries(PARAMS)) {
    if (!def.options) continue;
    document.body.append(el("datalist", { id: `dl-${key}` }, def.options.map((o) => el("option", { value: o }))));
  }

  const current = () => PINGS.find((p) => p.id === pingId) ?? PINGS[0];
  const pingChampion = () => speaker()?.champion.trim() ?? "";

  const textField = (key: ParamKey) => {
    const def = PARAMS[key];
    const input = el("input", { type: "text", value: values[key] ?? "", placeholder: def.placeholder });
    input.addEventListener("input", () => (values[key] = input.value));
    let field: HTMLElement = input;
    if (key === "enemy" || key === "ally") field = championPicker(input);
    else if (key === "item") field = itemPicker(input);
    else if (key === "rune") field = namePicker(input, getRunes, { icons: "rune" });
    else if (key === "spell") field = spellPicker(input);
    else if (key === "ability")
      field = namePicker(input, () => getAbilities(pingChampion()), {
        showAllWhenEmpty: true,
        onFocus: () => loadAbilities(pingChampion()),
      });
    else if (def.options) input.setAttribute("list", `dl-${key}`);
    return el("label", {}, [def.label, field]);
  };

  // Ping targets come from the roster. "Someone else" falls back to typing.
  const custom = new Set<string>();
  const rosterField = (team: Player["team"], playerKey: ParamKey | null, champKey: ParamKey) => {
    const players = state.players.filter((p) => p.team === team);
    const id = `${team}-${playerKey ? "player" : "champ"}`;
    const pick = el("select", { "aria-label": team === "ally" ? "Ally" : "Enemy" }, [
      ...players.map((p) => el("option", { value: p.id, textContent: playerKey ? playerLabel(p) : p.champion || p.name })),
      el("option", { value: "custom", textContent: "Someone else..." }),
    ]);
    const chosen = players.find((p) => (values[champKey] ?? "") === p.champion && (!playerKey || values[playerKey] === p.name));
    pick.value = custom.has(id) || !players.length ? "custom" : (chosen ?? players[0]).id;

    const apply = () => {
      const p = players.find((x) => x.id === pick.value);
      if (p) {
        custom.delete(id);
        values[champKey] = p.champion;
        if (playerKey) values[playerKey] = p.name;
      } else custom.add(id);
    };
    apply();
    pick.addEventListener("change", () => {
      apply();
      renderParams();
    });

    const label = el("label", {}, [team === "ally" ? "Ally" : "Enemy", pick]);
    if (pick.value !== "custom") return [label];
    return [label, ...(playerKey ? [textField(playerKey)] : []), textField(champKey)];
  };

  // Fields keep their values when switching pings, so you can fire off a few in a row.
  const renderParams = () => {
    const keys = current().params;
    const fields: HTMLElement[] = [];
    for (const key of keys) {
      if (key === "enemyPlayer" || key === "allyPlayer") continue;
      if (key === "enemy") fields.push(...rosterField("enemy", keys.includes("enemyPlayer") ? "enemyPlayer" : null, "enemy"));
      else if (key === "ally") fields.push(...rosterField("ally", keys.includes("allyPlayer") ? "allyPlayer" : null, "ally"));
      else fields.push(textField(key));
    }
    params.replaceChildren(...fields);
  };

  addPing.addEventListener("click", () => insert(pingToLine(current(), values)));

  onChange((structural) => {
    if (!structural) return;
    fillFrom();
    syncTag();
    // Roster edits change the target lists, unless a field here is being typed in.
    if (!params.contains(document.activeElement)) renderParams();
  });
  fillFrom();
  syncTag();
  renderParams();
}

function playerLabel(p: Player): string {
  const name = p.name || "(no name)";
  return p.champion ? `${name} (${p.champion})` : name;
}
