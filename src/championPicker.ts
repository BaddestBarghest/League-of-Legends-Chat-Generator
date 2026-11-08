import { getChampions } from "./champions";
import { el } from "./dom";
import { fuzzySearch } from "./fuzzy";

let uid = 0;

// Wraps a text input with a champion suggestion list. Put the returned
// element in the page where the input would have gone. Picking a name
// fires a normal input event, so existing listeners still see the change.
export function championPicker(input: HTMLInputElement): HTMLElement {
  const listId = `champ-list-${uid++}`;
  const list = el("ul", { className: "cb-list", id: listId, role: "listbox", hidden: true });
  const wrap = el("span", { className: `cb ${input.className}` }, [input, list]);
  input.className = "";
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-controls", listId);
  input.autocomplete = "off";

  let matches: string[] = [];
  let active = 0;
  let picking = false;

  const close = () => {
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  };

  const draw = () => {
    list.replaceChildren(
      ...matches.map((name, i) => {
        const li = el("li", { role: "option", id: `${listId}-${i}`, textContent: name, "aria-selected": String(i === active) });
        // mousedown so the input keeps focus
        li.addEventListener("mousedown", (e) => {
          e.preventDefault();
          pick(name);
        });
        return li;
      }),
    );
    list.hidden = matches.length === 0;
    input.setAttribute("aria-expanded", String(!list.hidden));
    if (!list.hidden) {
      input.setAttribute("aria-activedescendant", `${listId}-${active}`);
      list.children[active]?.scrollIntoView({ block: "nearest" });
    }
  };

  const pick = (name: string) => {
    picking = true;
    input.value = name;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    picking = false;
    close();
  };

  input.addEventListener("input", () => {
    if (picking) return;
    matches = fuzzySearch(input.value, getChampions());
    // Don't suggest when it's already spelled right.
    if (matches.length === 1 && matches[0] === input.value) matches = [];
    active = 0;
    draw();
  });

  input.addEventListener("keydown", (e) => {
    if (list.hidden) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      active = (active + step + matches.length) % matches.length;
      draw();
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (e.key === "Enter") e.preventDefault();
      pick(matches[active]);
    } else if (e.key === "Escape") {
      close();
    }
  });

  input.addEventListener("blur", close);
  return wrap;
}
