import { getOpenLineId, openLine } from "./editor";
import { $ } from "./dom";
import { ensureFont, lineAt, measure, render } from "./render";
import { loadScoreboardArt, renderScoreboard, scoreboardSize } from "./scoreboard";
import { bannerSize, loadBannerArt, renderBanner } from "./banner";
import { loadPopupArt, popupsSize, renderPopups } from "./popups";
import { clipNow, onPlayback } from "./popupPanel";
import { loadPostgameArt, PG_H, PG_W, renderPostgame } from "./postgame";
import { changed, onChange, picture, state } from "./state";

export function mountPreview(): void {
  const canvas = $<HTMLCanvasElement>("#preview");
  const stage = $<HTMLDivElement>("#stage");
  const dims = $<HTMLParagraphElement>("#dims");

  let frame = 0;
  let drawing = 0;
  const draw = async () => {
    const ticket = ++drawing;
    await ensureFont(state.settings);
    const { settings, lines } = state;
    // Draw at screen density so the preview stays sharp.
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    let size;
    if (picture() === "scoreboard") {
      const art = await loadScoreboardArt(state.players);
      // A newer draw started while icons loaded, let that one win.
      if (ticket !== drawing) return;
      renderScoreboard(canvas, state.players, settings, dpr, art, state.scoreboard);
      size = scoreboardSize(state.players);
    } else if (picture() === "postgame") {
      const art = await loadPostgameArt(state.postgame, state.players);
      if (ticket !== drawing) return;
      renderPostgame(canvas, state.postgame, state.players, dpr, art);
      size = { width: PG_W, height: PG_H };
    } else if (state.view === "popups") {
      const art = await loadPopupArt(state.popups);
      if (ticket !== drawing) return;
      renderPopups(canvas, state.popups, clipNow(), dpr, art);
      size = popupsSize(state.popups, art);
    } else if (state.view === "banner") {
      const art = await loadBannerArt(state.banner);
      if (ticket !== drawing) return;
      renderBanner(canvas, state.banner, dpr, art);
      size = bannerSize(state.banner, art);
    } else {
      const open = lines.findIndex((l) => l.id === getOpenLineId());
      render(canvas, lines, settings, dpr, { highlight: open });
      size = measure(lines, settings);
    }
    canvas.style.width = `${size.width}px`;
    const s = settings.scale;
    dims.textContent = `${size.width} × ${size.height} px · exports at ${Math.round(size.width * s)} × ${Math.round(size.height * s)} px`;
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

  // The tabs. The preview shows the open tab's picture, and chat-only
  // controls hide on the others.
  const setView = (view: typeof state.view) => {
    state.view = view;
    document.querySelectorAll<HTMLButtonElement>("#tabs button").forEach((x) => {
      x.classList.toggle("on", x.dataset.tab === view);
      x.setAttribute("aria-selected", String(x.dataset.tab === view));
    });
    document.querySelectorAll<HTMLElement>(".column[data-tab]").forEach((c) => (c.hidden = c.dataset.tab !== view));
    try {
      localStorage.setItem("chat-log-maker:tab", view);
    } catch {
      // only a convenience
    }
    const chat = view === "chat";
    for (const id of ["#btn-copy", "#btn-txt"]) $<HTMLButtonElement>(id).hidden = !chat;
    $<HTMLButtonElement>("#btn-frames").hidden = !chat && view !== "popups";
    $<HTMLButtonElement>("#btn-webm").hidden = view !== "popups";
    // The players editor has many fields, so it gets the wider column.
    $<HTMLElement>(".layout").classList.toggle("sb", view === "players");
    // Style and timestamps only change the chat.
    $<HTMLElement>(".settings").hidden = !chat;
    $<HTMLElement>("#s-time").closest("label")!.hidden = !chat;
    canvas.title = view === "chat" ? "Click a line to edit it" : "";
    schedule();
  };
  document.querySelectorAll<HTMLButtonElement>("#tabs button").forEach((b) =>
    b.addEventListener("click", () => setView(b.dataset.tab as typeof state.view)),
  );

  const turrets = (id: string, key: "allyTurrets" | "enemyTurrets") => {
    const input = $<HTMLInputElement>(id);
    input.value = String(state.scoreboard[key]);
    input.addEventListener("input", () => {
      state.scoreboard[key] = Math.max(0, Math.min(11, Math.floor(Number(input.value) || 0)));
      changed();
    });
    onChange(() => {
      if (document.activeElement !== input) input.value = String(state.scoreboard[key]);
    });
  };
  turrets("#sb-ally-turrets", "allyTurrets");
  turrets("#sb-enemy-turrets", "enemyTurrets");

  // Click a line in the preview to edit it.
  canvas.addEventListener("click", (e) => {
    if (state.view !== "chat") return;
    const rect = canvas.getBoundingClientRect();
    const { height } = measure(state.lines, state.settings);
    const y = ((e.clientY - rect.top) / rect.height) * height;
    const index = lineAt(state.lines, state.settings, y);
    if (index >= 0) openLine(state.lines[index].id);
  });

  onChange(schedule);
  void document.fonts.ready.then(schedule);
  // Reopen the tab that was open last time.
  let last: string | null = null;
  try {
    last = localStorage.getItem("chat-log-maker:tab");
  } catch {
    // start on chat
  }
  onPlayback(schedule);
  const tabs = ["players", "chat", "scoreboard", "postgame", "banner", "popups"];
  setView((tabs.includes(last ?? "") ? last : "chat") as typeof state.view);
}
