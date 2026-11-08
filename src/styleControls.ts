import { $, el, toast } from "./dom";
import { GILL, gillInUse } from "./render";
import { addFontFile, GAME_FONTS } from "./fontStore";
import { changed, DEFAULT_SETTINGS, onChange, state } from "./state";

type NumKey = "fontSize" | "lineHeight" | "outline" | "shadow" | "padding";

const RANGES: [string, NumKey, (v: number) => string][] = [
  ["size", "fontSize", (v) => `${v}px`],
  ["lh", "lineHeight", (v) => v.toFixed(2)],
  ["outline", "outline", (v) => (v === 0 ? "off" : v.toFixed(2))],
  ["shadow", "shadow", (v) => (v === 0 ? "off" : `${v}px`)],
  ["pad", "padding", (v) => `${v}px`],
];
const COLORS = ["ally", "enemy", "gold", "white", "time", "ping", "info", "green", "cyan", "yellow"] as const;

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

// Loads font files and says how it went. Returns the families loaded.
export async function loadFontFiles(files: File[]): Promise<string[]> {
  const done: string[] = [];
  const failed: string[] = [];
  for (const file of files) {
    try {
      done.push((await addFontFile(file)).family);
    } catch {
      failed.push(file.name);
    }
  }
  const parts = [];
  if (done.length) parts.push(`Loaded ${[...new Set(done)].join(", ")}. It's saved in this browser for next time.`);
  if (failed.length) parts.push(`Couldn't read ${failed.join(", ")}.`);
  if (parts.length) toast(parts.join(" "));
  return done;
}

// After loading fonts: a custom font becomes the chat font, and game fonts go
// where they belong.
export function useLoadedFonts(loaded: string[]): void {
  const custom = loaded.find((f) => !GAME_FONTS.some((g) => g.family === f));
  if (custom) state.settings.fontFamily = custom;
  else if (loaded.includes("Gill Sans MT Pro")) state.settings.fontFamily = GILL;
  syncStyleControls();
  changed(true);
}

// Says which font is really being drawn when Gill Sans is picked.
function updateFontNote(): void {
  const note = $<HTMLParagraphElement>("#font-note");
  if (state.settings.fontFamily !== GILL) {
    note.textContent = "";
  } else {
    const found = gillInUse();
    note.textContent =
      found === "Gill Sans MT Pro"
        ? "Using Gill Sans MT Pro, the game's chat font."
        : found
          ? `Using ${found} from this device. Gill Sans MT Pro is a closer match, see Fonts.`
          : "No Gill Sans here, so Metrophobic is used. See Fonts to get the game font.";
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

  // Fonts are loaded in one place, the Fonts window.
  $<HTMLButtonElement>("#style-fonts").addEventListener("click", () => $<HTMLButtonElement>("#btn-fonts").click());

  // Fonts can finish loading after this runs, so keep the note current.
  onChange((structural) => {
    if (structural) updateFontNote();
  });
  syncStyleControls();
}
