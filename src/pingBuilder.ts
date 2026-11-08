import { $, el } from "./dom";
import { addLine } from "./editor";
import { PARAMS, PINGS, pingToLine, type ParamKey } from "./pings";

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

  // Fields keep their values when switching pings, so you can fire off a few in a row.
  const renderParams = () => {
    params.replaceChildren(
      ...current().params.map((key) => {
        const def = PARAMS[key];
        const input = el("input", { type: "text", value: values[key] ?? "", placeholder: def.placeholder });
        if (def.options) input.setAttribute("list", `dl-${key}`);
        input.addEventListener("input", () => (values[key] = input.value));
        return el("label", {}, [def.label, input]);
      }),
    );
  };

  select.addEventListener("change", renderParams);
  $<HTMLButtonElement>("#btn-add-ping").addEventListener("click", () =>
    addLine($<HTMLOListElement>("#lines"), pingToLine(current(), values)),
  );
  renderParams();
}
