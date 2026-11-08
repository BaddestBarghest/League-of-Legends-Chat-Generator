import { $, el, toast } from "./dom";
import { FONT_SOURCE, fontAvailable, GAME_FONTS, removeFont, savedFonts } from "./fontStore";
import { GILL, gillInUse } from "./render";
import { SCOREBOARD_FONT } from "./scoreboard";
import { POPUP_FONT } from "./popups";
import { changed, onChange, state } from "./state";
import { loadFontFiles, useLoadedFonts } from "./styleControls";

interface Status {
  ok: boolean;
  text: string;
}

// What each game font slot is drawing with right now.
function chatStatus(): Status {
  const found = gillInUse();
  if (found === "Gill Sans MT Pro") return { ok: true, text: "Loaded" };
  if (found) return { ok: false, text: `Using ${found} from this device` };
  return { ok: false, text: "Not loaded, using Metrophobic" };
}

function scoreboardStatus(): Status {
  return fontAvailable(SCOREBOARD_FONT, "bold") ? { ok: true, text: "Loaded" } : { ok: false, text: "Not loaded, using Spectral" };
}

function popupStatus(): Status {
  return fontAvailable(POPUP_FONT, "bold") ? { ok: true, text: "Loaded" } : { ok: false, text: "Not loaded, using Source Sans 3" };
}

export function mountFontsGuide(): void {
  const dialog = $<HTMLDialogElement>("#fonts-dialog");
  const list = $<HTMLDivElement>("#fonts-list");
  const saved = $<HTMLUListElement>("#fonts-saved");
  const hint = $<HTMLParagraphElement>("#font-hint");
  const dot = $<HTMLSpanElement>("#fonts-dot");

  const render = async () => {
    const statuses = [chatStatus(), scoreboardStatus(), popupStatus()];
    list.replaceChildren(
      ...GAME_FONTS.map((f, i) => {
        const st = statuses[i];
        const link = el("a", { href: FONT_SOURCE + f.file, textContent: "Download", download: f.file });
        link.target = "_blank";
        link.rel = "noopener";
        return el("div", { className: "font-row" }, [
          el("div", {}, [el("strong", { textContent: f.family }), el("span", { className: "font-file", textContent: f.file })]),
          el("span", { className: "font-use", textContent: f.use }),
          el("span", { className: `font-status ${st.ok ? "ok" : "missing"}`, textContent: st.text }),
          link,
        ]);
      }),
    );

    const fonts = await savedFonts();
    saved.replaceChildren(
      ...(fonts.length
        ? fonts.map((f) => {
            const remove = el("button", { type: "button", className: "small", textContent: "Remove" });
            remove.addEventListener("click", async () => {
              await removeFont(f.id);
              for (const face of [...document.fonts]) {
                if (face.family.replace(/"/g, "") === f.family && String(face.weight) === (f.family === "Gill Sans MT Pro" ? "400" : f.weight)) {
                  document.fonts.delete(face);
                }
              }
              toast(`Removed ${f.family}.`);
              changed(true);
            });
            return el("li", {}, [el("span", { textContent: f.fileName }), remove]);
          })
        : [el("li", { className: "font-none", textContent: "None yet" })]),
    );
  };

  // A nudge under the preview when the open tab isn't using the game font.
  const updateHint = () => {
    const view = state.view;
    let st: Status = { ok: true, text: "" };
    let text = "";
    if (view === "popups") {
      st = popupStatus();
      text = "The popups are using Source Sans 3 in place of the game's font.";
    } else if (view !== "chat") {
      // The scoreboard and the Victory screen both use Beaufort.
      st = scoreboardStatus();
      text = `The ${view === "banner" ? "text" : "scoreboard"} is using Spectral in place of the game's font.`;
    } else if (state.settings.fontFamily === GILL) {
      st = chatStatus();
      text = `The chat is using ${gillInUse() ?? "Metrophobic"} in place of the game's font.`;
    }
    hint.hidden = st.ok;
    $<HTMLSpanElement>("#font-hint-text").textContent = text;
    dot.hidden = chatStatus().ok && scoreboardStatus().ok && popupStatus().ok;
  };

  const openGuide = () => {
    void render();
    dialog.showModal();
  };
  $<HTMLButtonElement>("#btn-fonts").addEventListener("click", openGuide);
  $<HTMLButtonElement>("#font-hint-open").addEventListener("click", openGuide);
  $<HTMLButtonElement>("#fonts-close").addEventListener("click", () => dialog.close());
  // Clicking the dimmed area outside closes it too.
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });

  $<HTMLInputElement>("#fonts-file").addEventListener("change", async (e) => {
    const input = e.target as HTMLInputElement;
    const loaded = await loadFontFiles([...(input.files ?? [])]);
    input.value = "";
    useLoadedFonts(loaded);
  });

  onChange((structural) => {
    if (!structural) return;
    updateHint();
    if (dialog.open) void render();
  });
  // The view switch doesn't count as an edit, so check when tabs are clicked too.
  document.querySelectorAll("#tabs button").forEach((b) => b.addEventListener("click", updateHint));
  updateHint();
}
