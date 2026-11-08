import { getChampions } from "./champions";
import { $, el } from "./dom";
import { addLine } from "./editor";
import { getAbilities, getItems, getRunes, getSpells, loadAbilities } from "./gameData";
import { namePicker } from "./namePicker";
import { PARAMS, PINGS, pingToLine, type ParamKey } from "./pings";
import { state } from "./state";

export function mountPingBuilder(): void {
  const select = $<HTMLSelectElement>("#ping-type");
  const params = $<HTMLDivElement>("#ping-params");
  const values: Partial<Record<ParamKey, string>> = {};

  // Group the dropdown the same way the catalog is grouped.
  const groups = new Map<string, HTMLOptGroupElement>();
  for (const p of PINGS) {
    if (!groups.has(p.group)) groups.set(p.group, el("optgroup", { label: p.group }));
    groups.get(p.group)!.append(el("option", { value: p.id, textContent: p.label }));
  }
  select.append(...groups.values());

  // Suggestions for fields that have a known set of answers.
  for (const [key, def] of Object.entries(PARAMS)) {
    if (!def.options) continue;
    document.body.append(el("datalist", { id: `dl-${key}` }, def.options.map((o) => el("option", { value: o }))));
  }

  const current = () => PINGS.find((p) => p.id === select.value) ?? PINGS[0];

  // Pings are added as the player on the last line, so their abilities are the ones to suggest.
  const pingChampion = () =>
    [...state.lines].reverse().find((l) => l.team !== "system")?.champion.trim() ?? "";

  const withPicker = (key: ParamKey, input: HTMLInputElement): HTMLElement => {
    switch (key) {
      case "enemy":
      case "ally":
        return namePicker(input, getChampions);
      case "item":
        return namePicker(input, getItems);
      case "rune":
        return namePicker(input, getRunes);
      case "spell":
        return namePicker(input, getSpells, { showAllWhenEmpty: true });
      case "ability":
        return namePicker(input, () => getAbilities(pingChampion()), {
          showAllWhenEmpty: true,
          onFocus: () => loadAbilities(pingChampion()),
        });
      default:
        if (PARAMS[key].options) input.setAttribute("list", `dl-${key}`);
        return input;
    }
  };

  // Fields keep their values when switching pings, so you can fire off a few in a row.
  const renderParams = () => {
    params.replaceChildren(
      ...current().params.map((key) => {
        const def = PARAMS[key];
        const input = el("input", { type: "text", value: values[key] ?? "", placeholder: def.placeholder });
        input.addEventListener("input", () => (values[key] = input.value));
        return el("label", {}, [def.label, withPicker(key, input)]);
      }),
    );
  };

  select.addEventListener("change", renderParams);
  $<HTMLButtonElement>("#btn-add-ping").addEventListener("click", () =>
    addLine($<HTMLOListElement>("#lines"), pingToLine(current(), values)),
  );
  renderParams();
}
