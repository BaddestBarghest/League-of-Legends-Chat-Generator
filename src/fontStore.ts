// Font files the user loads are kept in this browser's IndexedDB so they're
// still there on the next visit. They never leave the browser.

export interface SavedFont {
  id: string; // family + weight + style
  family: string;
  weight: string;
  style: string;
  fileName: string;
  data: ArrayBuffer;
}

// The game fonts the tool knows how to use. Loaded files are matched to these
// by file name, so the downloads work as they are.
export const GAME_FONTS = [
  {
    family: "Gill Sans MT Pro",
    file: "gillsansmtpro-medium.otf",
    use: "Chat",
    match: /gill.?sans/i,
  },
  {
    family: "Beaufort for LOL",
    file: "beaufortforlol-bold.otf",
    use: "Scoreboard and Victory",
    match: /beaufort/i,
  },
] as const;

export const FONT_SOURCE = "https://raw.communitydragon.org/latest/game/assets/ux/fonts/";

const DB = "chat-log-maker";
const STORE = "fonts";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Works out the family, weight and style for a font file from its name.
// Game fonts get the family the tool looks for, anything else is a custom font.
export function describeFile(fileName: string): Pick<SavedFont, "family" | "weight" | "style"> {
  const base = fileName.replace(/\.[^.]+$/, "");
  const lower = base.toLowerCase();
  const weights: [RegExp, string][] = [
    [/heavy|black/, "900"],
    [/bold/, "700"],
    [/semibold|demibold/, "600"],
    [/medium/, "500"],
    [/light/, "300"],
  ];
  const game = GAME_FONTS.find((f) => f.match.test(lower));
  return {
    family: game?.family ?? (base.replace(/[^\w -]/g, "").trim() || "Custom font"),
    weight: game ? (weights.find(([re]) => re.test(lower))?.[1] ?? "400") : "400",
    style: game && /italic/.test(lower) ? "italic" : "normal",
  };
}

// Registers a font with the page so canvas text can use it.
async function register(f: Pick<SavedFont, "family" | "weight" | "style" | "data">): Promise<void> {
  // Gill Sans only ships one weight, so use it for normal text whatever it is.
  const weight = f.family === "Gill Sans MT Pro" ? "400" : f.weight;
  const face = new FontFace(f.family, f.data.slice(0), { weight, style: f.style });
  await face.load();
  document.fonts.add(face);
}

// Loads a font file, saves it for next time, and returns how it was registered.
export async function addFontFile(file: File): Promise<SavedFont> {
  const data = await file.arrayBuffer();
  const desc = describeFile(file.name);
  const font: SavedFont = { id: `${desc.family}|${desc.weight}|${desc.style}`, ...desc, fileName: file.name, data };
  await register(font); // throws if the file isn't a font
  try {
    await run("readwrite", (s) => s.put(font));
  } catch {
    // Storage is off (private window). It still works until the page closes.
  }
  return font;
}

export async function savedFonts(): Promise<SavedFont[]> {
  try {
    return await run("readonly", (s) => s.getAll() as IDBRequest<SavedFont[]>);
  } catch {
    return [];
  }
}

export async function removeFont(id: string): Promise<void> {
  try {
    await run("readwrite", (s) => s.delete(id));
  } catch {
    // nothing saved to remove
  }
}

// Registers every saved font. Run once at startup.
export async function restoreFonts(): Promise<void> {
  for (const f of await savedFonts()) {
    try {
      await register(f);
    } catch {
      // A file that no longer loads is skipped.
    }
  }
}

// True when a family really draws, either installed or loaded. A missing
// font falls back, so its text measures the same as the fallback's.
export function fontAvailable(family: string, weight = "normal"): boolean {
  const ctx = document.createElement("canvas").getContext("2d")!;
  const sample = "NesoDarling (Ezreal): 23:34 Jax 7/5/11";
  const width = (font: string) => {
    ctx.font = font;
    return ctx.measureText(sample).width;
  };
  return ["monospace", "serif"].every((base) => width(`${weight} 40px "${family}", ${base}`) !== width(`${weight} 40px ${base}`));
}
