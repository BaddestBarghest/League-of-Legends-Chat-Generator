import { getOpenLineId, openLine } from "./editor";
import { ensureFont, lineAt, measure, render } from "./render";
import { onChange, state } from "./state";

export function mountPreview(): void {
  const canvas = document.querySelector<HTMLCanvasElement>("#preview")!;
  const stage = document.querySelector<HTMLDivElement>("#stage")!;
  const dims = document.querySelector<HTMLParagraphElement>("#dims")!;

  let frame = 0;
  const draw = async () => {
    await ensureFont(state.settings);
    const { settings, lines } = state;
    // Draw at screen density so the preview stays sharp.
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    const open = lines.findIndex((l) => l.id === getOpenLineId());
    render(canvas, lines, settings, dpr, { highlight: open });
    const { width, height } = measure(lines, settings);
    canvas.style.width = `${width}px`;
    const s = settings.scale;
    dims.textContent = `${width} × ${height} px · exports at ${Math.round(width * s)} × ${Math.round(height * s)} px`;
  };
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => void draw());
  };

  document.querySelectorAll<HTMLButtonElement>("#bg-seg button").forEach((b) =>
    b.addEventListener("click", () => {
      document.querySelectorAll("#bg-seg button").forEach((x) => x.classList.toggle("on", x === b));
      stage.className = `stage bg-${b.dataset.bg}`;
    }),
  );

  // Click a line in the preview to edit it.
  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const { height } = measure(state.lines, state.settings);
    const y = ((e.clientY - rect.top) / rect.height) * height;
    const index = lineAt(state.lines, state.settings, y);
    if (index >= 0) openLine(state.lines[index].id);
  });

  onChange(schedule);
  void document.fonts.ready.then(schedule);
  schedule();
}
