import { getChampions } from "./champions";
import { el } from "./dom";
import { fuzzySearch } from "./fuzzy";
import { getItems, getSpells, getTrinkets, iconUrl, type IconKind } from "./gameData";

let uid = 0;

export interface PickerOptions {
  // Clicking an empty field lists everything, so you can browse.
  showAllWhenEmpty?: boolean;
  // Shows each name's icon in the list, and the chosen one in the field
  // unless fieldIcon is false.
  icons?: IconKind;
  fieldIcon?: boolean;
  onFocus?: () => Promise<void>;
}

// Wraps a text input with a suggestion list drawn from getNames, matched with
// typo-tolerant search. Put the returned element where the input would have
// gone. Picking a name fires a normal input event, so existing listeners
// still see the change.
export function namePicker(input: HTMLInputElement, getNames: () => string[], opts: PickerOptions = {}): HTMLElement {
  const listId = `name-list-${uid++}`;
  const list = el("ul", { className: "cb-list", id: listId, role: "listbox", hidden: true });
  const chosen = el("img", { className: "cb-icon", alt: "", hidden: true });
  chosen.addEventListener("error", () => {
    chosen.hidden = true;
    chosen.parentElement?.classList.remove("has-icon");
  });
  const inField = Boolean(opts.icons) && opts.fieldIcon !== false;
  const wrap = el("span", { className: `cb${opts.icons ? " with-icon" : ""} ${input.className}` }, [
    ...(inField ? [chosen] : []),
    input,
    list,
  ]);
  input.className = "";
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-controls", listId);
  input.autocomplete = "off";

  // The icon for the current value sits inside the field.
  const showChosen = () => {
    if (!inField) return;
    const url = input.value.trim() ? iconUrl(opts.icons!, input.value) : undefined;
    chosen.hidden = !url;
    if (url && chosen.src !== url) chosen.src = url;
    // Only make room for the icon when there is one.
    wrap.classList.toggle("has-icon", Boolean(url));
  };
  showChosen();

  let matches: string[] = [];
  let active = 0;
  let picking = false;

  const close = () => {
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  };

  const option = (name: string, i: number) => {
    const url = opts.icons ? iconUrl(opts.icons, name) : undefined;
    const li = el("li", { role: "option", id: `${listId}-${i}`, "aria-selected": String(i === active) }, [
      ...(opts.icons
        ? [url ? el("img", { src: url, alt: "", loading: "lazy" }) : el("span", { className: "cb-noicon" })]
        : []),
      el("span", { textContent: name }),
    ]);
    // mousedown so the input keeps focus
    li.addEventListener("mousedown", (e) => {
      e.preventDefault();
      pick(name);
    });
    return li;
  };

  const draw = () => {
    list.replaceChildren(...matches.map(option));
    list.hidden = matches.length === 0;
    input.setAttribute("aria-expanded", String(!list.hidden));
    if (!list.hidden) {
      input.setAttribute("aria-activedescendant", `${listId}-${active}`);
      list.children[active]?.scrollIntoView({ block: "nearest" });
    }
  };

  // Moves the highlight without rebuilding the list, so icons don't reload.
  const highlight = (next: number) => {
    list.children[active]?.setAttribute("aria-selected", "false");
    active = next;
    list.children[active]?.setAttribute("aria-selected", "true");
    input.setAttribute("aria-activedescendant", `${listId}-${active}`);
    list.children[active]?.scrollIntoView({ block: "nearest" });
  };

  const pick = (name: string) => {
    picking = true;
    input.value = name;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    picking = false;
    showChosen();
    close();
  };

  // Opening a field (fromOpen) shows the whole list when it's empty or holds
  // a known name, with that name highlighted. Typing filters it.
  const suggest = (fromOpen = false) => {
    const names = getNames();
    const known = names.indexOf(input.value);
    const browsing = opts.showAllWhenEmpty && (!input.value.trim() || (fromOpen && known >= 0));
    // Icon lists are easy to scan, so they show more at once.
    matches = browsing ? names : fuzzySearch(input.value, names, opts.icons ? 30 : 8);
    // Don't suggest when it's already spelled right.
    if (!browsing && matches.length === 1 && matches[0] === input.value) matches = [];
    active = browsing && known >= 0 ? known : 0;
    draw();
  };

  input.addEventListener("input", () => {
    showChosen();
    if (!picking) suggest();
  });
  const open = async () => {
    await opts.onFocus?.();
    if (opts.showAllWhenEmpty && document.activeElement === input && list.hidden) suggest(true);
  };
  // Selecting the text means typing replaces it straight away.
  input.addEventListener("focus", () => {
    if (opts.showAllWhenEmpty) input.select();
    void open();
  });
  // Clicking a field that's already focused opens the list again.
  input.addEventListener("click", () => void open());

  input.addEventListener("keydown", (e) => {
    if (list.hidden) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        suggest(true);
      }
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      highlight((active + (e.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length);
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

// Players already show a portrait beside the field, so no icon inside it.
export const championPicker = (input: HTMLInputElement) =>
  namePicker(input, getChampions, { icons: "champion", fieldIcon: false, showAllWhenEmpty: true });
export const itemPicker = (input: HTMLInputElement) => namePicker(input, getItems, { icons: "item", showAllWhenEmpty: true });
export const trinketPicker = (input: HTMLInputElement) => namePicker(input, getTrinkets, { icons: "item", showAllWhenEmpty: true });
export const spellPicker = (input: HTMLInputElement) => namePicker(input, getSpells, { icons: "spell", showAllWhenEmpty: true });
