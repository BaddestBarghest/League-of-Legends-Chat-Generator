import type { Project } from "./types";
import { $, download, stamp, toast } from "./dom";
import { changed, DEFAULT_SETTINGS, makeLine, onChange, state } from "./state";
import { syncStyleControls } from "./styleControls";

const STORAGE_KEY = "chat-log-maker:v1";

function snapshot(): Project {
  return { version: 1, settings: state.settings, lines: state.lines };
}

// Fills in anything missing so older or hand-edited files still load.
function apply(data: unknown): void {
  if (!data || typeof data !== "object") throw new Error("not a project file");
  const p = data as Partial<Project>;
  if (!Array.isArray(p.lines)) throw new Error("no lines in file");
  state.settings = {
    ...DEFAULT_SETTINGS,
    ...(p.settings ?? {}),
    palette: { ...DEFAULT_SETTINGS.palette, ...(p.settings?.palette ?? {}) },
  };
  state.lines = p.lines.map((l) => makeLine({ ...l, id: undefined }));
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
