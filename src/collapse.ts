import { el } from "./dom";

// Remembers what's collapsed between visits. Purely a convenience, so a
// browser without storage just starts with everything at its default.
const KEY = "chat-log-maker:collapsed";

function load(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

const saved = load();

export function isCollapsed(id: string, fallback: boolean): boolean {
  return saved[id] ?? fallback;
}

export function setCollapsed(id: string, value: boolean): void {
  saved[id] = value;
  try {
    localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    // not saved, still works for this visit
  }
}

// Turns each panel's heading into a button that folds the panel away.
export function mountCollapsiblePanels(): void {
  for (const panel of document.querySelectorAll<HTMLElement>("[data-collapse]")) {
    const id = `panel:${panel.dataset.collapse}`;
    const heading = panel.querySelector<HTMLHeadingElement>(".panel-head h2")!;
    const button = el("button", { type: "button", className: "collapse-btn" }, [el("span", { className: "chev", "aria-hidden": "true" }), heading.textContent ?? ""]);
    heading.replaceChildren(button);

    const apply = (collapsed: boolean) => {
      panel.classList.toggle("collapsed", collapsed);
      button.setAttribute("aria-expanded", String(!collapsed));
    };
    apply(isCollapsed(id, false));
    button.addEventListener("click", () => {
      const collapsed = !panel.classList.contains("collapsed");
      setCollapsed(id, collapsed);
      apply(collapsed);
    });
  }
}
