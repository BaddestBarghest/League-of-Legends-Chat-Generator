import { $, el, toast } from "./dom";
import { GILL, hasLocalGill } from "./render";
import { changed, DEFAULT_SETTINGS, state } from "./state";

type NumKey = "fontSize" | "lineHeight" | "outline" | "shadow" | "padding";

const RANGES: [string, NumKey, (v: number) => string][] = [
  ["size", "fontSize", (v) => `${v}px`],
  ["lh", "lineHeight", (v) => v.toFixed(2)],
  ["outline", "outline", (v) => (v === 0 ? "off" : v.toFixed(2))],
  ["shadow", "shadow", (v) => (v === 0 ? "off" : `${v}`)],
  ["pad", "padding", (v) => `${v}px`],
];
const COLORS = ["ally", "enemy", "gold", "white", "time"] as const;

// Puts the current settings back into the inputs.
export function syncStyleControls(): void {
  const s = state.settings;
  for (const [id, key, fmt] of RANGES) {
    $<HTMLInputElement>(`#s-${id}`).value = String(s[key]);
    $<HTMLOutputElement>(`#o-${id}`).textContent = fmt(s[key]);
  }
  const font = $<HTMLSelectElement>("#s-font");
  if (![...font.options].some((o) => o.value === s.fontFamily)) {
    font.append(el("option", { value: s.fontFamily, textContent: `${s.fontFamily} (yours)` }));
  }
  font.value = s.fontFamily;
  updateFontNote();
  $<HTMLInputElement>("#s-width").value = String(s.fixedWidth);
  $<HTMLSelectElement>("#s-scale").value = String(s.scale);
  $<HTMLInputElement>("#s-time").checked = s.showTime;
  for (const c of COLORS) $<HTMLInputElement>(`#c-${c}`).value = s.palette[c];
}

// Says which font is really being drawn when Gill Sans is picked.
function updateFontNote(): void {
  const note = $<HTMLParagraphElement>("#font-note");
  if (state.settings.fontFamily !== GILL) {
    note.textContent = "";
  } else if (hasLocalGill()) {
    note.textContent = "Gill Sans found on this device. Exports will match the game.";
  } else {
    note.textContent = "Gill Sans isn't installed here, so Metrophobic is used instead.";
  }
}

export function mountStyleControls(): void {
  const s = () => state.settings;

  for (const [id, key, fmt] of RANGES) {
    const input = $<HTMLInputElement>(`#s-${id}`);
    input.addEventListener("input", () => {
      s()[key] = Number(input.value);
      $<HTMLOutputElement>(`#o-${id}`).textContent = fmt(s()[key]);
      changed();
    });
  }

  const on = <T extends HTMLElement>(sel: string, evt: string, fn: (node: T) => void) => {
    const node = $<T>(sel);
    node.addEventListener(evt, () => {
      fn(node);
      changed();
    });
  };
  on<HTMLSelectElement>("#s-font", "change", (n) => {
    s().fontFamily = n.value;
    updateFontNote();
  });
  on<HTMLInputElement>("#s-width", "input", (n) => (s().fixedWidth = Math.max(0, Number(n.value) || 0)));
  on<HTMLSelectElement>("#s-scale", "change", (n) => (s().scale = Number(n.value)));
  on<HTMLInputElement>("#s-time", "change", (n) => (s().showTime = n.checked));
  for (const c of COLORS) on<HTMLInputElement>(`#c-${c}`, "input", (n) => (s().palette[c] = n.value));

  $<HTMLButtonElement>("#btn-reset-style").addEventListener("click", () => {
    const font = s().fontFamily;
    state.settings = structuredClone(DEFAULT_SETTINGS);
    // Keep a font the user loaded, it's a pain to pick again.
    if (document.fonts.check(`12px "${font}"`)) state.settings.fontFamily = font;
    syncStyleControls();
    changed();
  });

  // The font file stays in the browser. Nothing gets uploaded.
  $<HTMLInputElement>("#file-font").addEventListener("change", async (e) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const family = file.name.replace(/\.[^.]+$/, "").replace(/[^\w -]/g, "").trim() || "CustomFont";
      const face = new FontFace(family, await file.arrayBuffer());
      await face.load();
      document.fonts.add(face);
      s().fontFamily = family;
      syncStyleControls();
      changed();
      toast(`Using ${family}. You'll need to load it again after a refresh.`);
    } catch {
      toast("Couldn't read that font file.");
    }
    input.value = "";
  });

  syncStyleControls();
}
