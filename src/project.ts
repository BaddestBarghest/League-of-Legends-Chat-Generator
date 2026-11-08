import type { ChatLine, Palette, Project } from "./types";
import { $, download, stamp, toast } from "./dom";
import { changed, DEFAULT_SETTINGS, defaultBanner, makeLine, newId, OLD_DEFAULT_PALETTES, OLD_DEFAULT_TEXT, onChange, playersFromLines, state } from "./state";
import { syncStyleControls } from "./styleControls";

const STORAGE_KEY = "chat-log-maker:v1";

function snapshot(): Project {
  return { version: 1, settings: state.settings, lines: state.lines, players: state.players, scoreboard: state.scoreboard, banner: state.banner };
}

// Keeps colors the user picked, but swaps untouched old defaults for the new ones.
function upgradePalette(saved: Partial<Palette>): Palette {
  const palette = { ...DEFAULT_SETTINGS.palette };
  for (const [key, value] of Object.entries(saved) as [keyof Palette, string][]) {
    const wasDefault = OLD_DEFAULT_PALETTES.some((old) => old[key] === value);
    if (key in palette && !wasDefault) palette[key] = value;
  }
  return palette;
}

// Fills in anything missing so older or hand-edited files still load.
function apply(data: unknown): void {
  if (!data || typeof data !== "object") throw new Error("not a project file");
  const p = data as Partial<Project>;
  if (!Array.isArray(p.lines)) throw new Error("no lines in file");
  state.settings = {
    ...DEFAULT_SETTINGS,
    ...(p.settings ?? {}),
    palette: upgradePalette(p.settings?.palette ?? {}),
  };
  for (const [key, olds] of Object.entries(OLD_DEFAULT_TEXT)) {
    const k = key as "lineHeight" | "outline" | "shadow";
    if (olds.includes(state.settings[k])) state.settings[k] = DEFAULT_SETTINGS[k];
  }
  // Older saves had an allChat checkbox instead of a channel.
  state.lines = p.lines.map((l) => {
    const old = l as ChatLine & { allChat?: boolean };
    const channel = old.channel ?? (old.allChat ? "all" : "");
    return makeLine({ ...old, channel, id: undefined });
  });
  state.scoreboard = { allyTurrets: 0, enemyTurrets: 0, ...(p.scoreboard ?? {}) };
  state.banner = { ...defaultBanner(), ...(p.banner ?? {}) };
  // Saves from before the roster existed get one built from their lines.
  state.players = Array.isArray(p.players)
    ? p.players.map((pl) => ({ ...pl, id: newId() }))
    : playersFromLines(state.lines);
}

// Run before the UI mounts so it starts from the saved log.
export function restoreAutosave(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) apply(JSON.parse(raw));
  } catch {
    // Storage is off or the data is bad. Start fresh.
  }
}

export function mountProjectFiles(): void {
  onChange(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot()));
    } catch {
      // Private mode or storage full. Not worth bothering the user.
    }
  });

  $<HTMLButtonElement>("#btn-save").addEventListener("click", () =>
    download(new Blob([JSON.stringify(snapshot(), null, 2)], { type: "application/json" }), `chat-${stamp()}.json`),
  );

  $<HTMLInputElement>("#file-load").addEventListener("change", async (e) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      apply(JSON.parse(await file.text()));
      syncStyleControls();
      changed(true);
      toast(`Loaded ${state.lines.length} lines.`);
    } catch (err) {
      toast(`Couldn't load that file: ${(err as Error).message}.`);
    }
    input.value = "";
  });
}
