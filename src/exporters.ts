import JSZip from "jszip";
import { $, download, stamp, toast } from "./dom";
import { canvasToBlob, ensureFont, render, toPlainText } from "./render";
import { loadScoreboardArt, renderScoreboard } from "./scoreboard";
import { bannerWord, loadBannerArt, renderBanner } from "./banner";
import { clipLength, loadPopupArt, popupFrame, renderPopups } from "./popups";
import { clipNow, playback } from "./popupPanel";
import { picture, state } from "./state";

async function exportPng(): Promise<void> {
  await ensureFont(state.settings);
  const c = document.createElement("canvas");
  if (picture() === "scoreboard") {
    const art = await loadScoreboardArt(state.players);
    renderScoreboard(c, state.players, state.settings, state.settings.scale, art, state.scoreboard);
    download(await canvasToBlob(c), `scoreboard-${stamp()}.png`);
    toast("Scoreboard PNG downloaded.");
    return;
  }
  if (state.view === "popups") {
    if (!state.popups.length) return toast("Add a popup first.");
    renderPopups(c, state.popups, clipNow(), state.settings.scale, await loadPopupArt(state.popups));
    download(await canvasToBlob(c), `popups-${stamp()}.png`);
    toast(`PNG of ${playback.time.toFixed(2)}s downloaded.`);
    return;
  }
  if (state.view === "banner") {
    renderBanner(c, state.banner, state.settings.scale, await loadBannerArt(state.banner));
    const name = bannerWord(state.banner).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "banner";
    download(await canvasToBlob(c), `${name}-${stamp()}.png`);
    toast("PNG downloaded.");
    return;
  }
  if (!state.lines.length) return toast("Add a line first.");
  render(c, state.lines, state.settings, state.settings.scale);
  download(await canvasToBlob(c), `chat-${stamp()}.png`);
  toast("PNG downloaded.");
}

export const POPUP_FPS = 60;

// The whole popup clip, one PNG per frame, all the same size.
async function exportPopupFrames(): Promise<void> {
  const { popups, settings } = state;
  if (!popups.length) return toast("Add a popup first.");
  toast("Building frames...");
  const art = await loadPopupArt(popups);
  const frame = popupFrame(popups, art);
  const count = Math.ceil(clipLength(popups, state.popupSpeed) * POPUP_FPS) + 1;
  const zip = new JSZip();
  const c = document.createElement("canvas");
  for (let i = 0; i < count; i++) {
    renderPopups(c, popups, (i / POPUP_FPS) * state.popupSpeed, settings.scale, art, frame);
    zip.file(`frame-${String(i + 1).padStart(4, "0")}.png`, await canvasToBlob(c));
  }
  download(await zip.generateAsync({ type: "blob" }), `popups-frames-${stamp()}.zip`);
  toast(`${count} frames at ${POPUP_FPS} fps downloaded.`);
}

// The popup clip as a WebM video. The browser's encoder can't keep
// transparency itself, so Mediabunny encodes it as a second picture beside
// each frame, which is how WebM stores alpha. Loaded only when used.
async function exportPopupWebm(): Promise<void> {
  const { popups, settings } = state;
  if (!popups.length) return toast("Add a popup first.");
  if (typeof VideoEncoder === "undefined") return toast("This browser can't make videos. Try Chrome, Edge or Firefox, or use Frames .zip.");
  toast("Making the video...");
  try {
    const { Output, WebMOutputFormat, BufferTarget, CanvasSource, QUALITY_VERY_HIGH } = await import("mediabunny");
    const art = await loadPopupArt(popups);
    const frame = popupFrame(popups, art);
    // Video sizes must be even.
    const even = (n: number) => Math.ceil((n * settings.scale) / 2) * 2;
    const c = document.createElement("canvas");
    const out = document.createElement("canvas");
    out.width = even(frame.width);
    out.height = even(frame.height);
    const ctx = out.getContext("2d")!;
    const output = new Output({ format: new WebMOutputFormat(), target: new BufferTarget() });
    const source = new CanvasSource(out, { codec: "vp9", bitrate: QUALITY_VERY_HIGH, alpha: "keep" });
    output.addVideoTrack(source, { frameRate: POPUP_FPS });
    await output.start();
    const count = Math.ceil(clipLength(popups, state.popupSpeed) * POPUP_FPS) + 1;
    for (let i = 0; i < count; i++) {
      renderPopups(c, popups, (i / POPUP_FPS) * state.popupSpeed, settings.scale, art, frame);
      ctx.clearRect(0, 0, out.width, out.height);
      ctx.drawImage(c, 0, 0);
      // The last frame is a full keyframe, so nothing from the fade lingers on it.
      await source.add(i / POPUP_FPS, 1 / POPUP_FPS, { keyFrame: i === count - 1 });
    }
    await output.finalize();
    download(new Blob([output.target.buffer!], { type: "video/webm" }), `popups-${stamp()}.webm`);
    toast("WebM downloaded.");
  } catch (err) {
    toast(`Couldn't make the video: ${(err as Error).message}. Frames .zip still works.`);
  }
}

// One PNG per line, each showing one more message. Same size so they stack in an editor.
async function exportFrames(): Promise<void> {
  if (state.view === "popups") return exportPopupFrames();
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
  $<HTMLButtonElement>("#btn-webm").addEventListener("click", () => void exportPopupWebm());
  $<HTMLButtonElement>("#btn-copy").addEventListener("click", () => void copyText());
  $<HTMLButtonElement>("#btn-txt").addEventListener("click", () =>
    download(new Blob([toPlainText(state.lines, state.settings)], { type: "text/plain" }), `chat-${stamp()}.txt`),
  );
}
