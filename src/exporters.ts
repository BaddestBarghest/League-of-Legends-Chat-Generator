import JSZip from "jszip";
import { $, download, stamp, toast } from "./dom";
import { canvasToBlob, ensureFont, render, toPlainText } from "./render";
import { state } from "./state";

async function exportPng(): Promise<void> {
  if (!state.lines.length) return toast("Add a line first.");
  await ensureFont(state.settings);
  const c = document.createElement("canvas");
  render(c, state.lines, state.settings, state.settings.scale);
  download(await canvasToBlob(c), `chat-${stamp()}.png`);
  toast("PNG downloaded.");
}

// One PNG per line, each showing one more message. Same size so they stack in an editor.
async function exportFrames(): Promise<void> {
  const { lines, settings } = state;
  if (!lines.length) return toast("Add a line first.");
  await ensureFont(settings);
  toast("Building frames...");
  const zip = new JSZip();
  const c = document.createElement("canvas");
  for (let n = 1; n <= lines.length; n++) {
    render(c, lines, settings, settings.scale, { visibleCount: n });
    zip.file(`frame-${String(n).padStart(3, "0")}.png`, await canvasToBlob(c));
  }
  download(await zip.generateAsync({ type: "blob" }), `chat-frames-${stamp()}.zip`);
  toast(`${lines.length} frames downloaded.`);
}

async function copyText(): Promise<void> {
  try {
    await navigator.clipboard.writeText(toPlainText(state.lines, state.settings));
    toast("Copied to clipboard.");
  } catch {
    toast("Clipboard is blocked here. Try Download .txt instead.");
  }
}

export function mountExporters(): void {
  $<HTMLButtonElement>("#btn-png").addEventListener("click", () => void exportPng());
  $<HTMLButtonElement>("#btn-frames").addEventListener("click", () => void exportFrames());
  $<HTMLButtonElement>("#btn-copy").addEventListener("click", () => void copyText());
  $<HTMLButtonElement>("#btn-txt").addEventListener("click", () =>
    download(new Blob([toPlainText(state.lines, state.settings)], { type: "text/plain" }), `chat-${stamp()}.txt`),
  );
}
