import type { Popup, PopupIcon } from "./types";
import { $, el, toast } from "./dom";
import { setImage } from "./imageStore";
import { customIconKey, popupsDuration } from "./popups";
import { ICONS, POPUP_TYPES } from "./popupTypes";
import { changed, makePopup, onChange, state } from "./state";

// Playback is shared with the preview, which reads the time from here.
export const playback = { time: 0.35, playing: false };
const listeners = new Set<() => void>();
export const onPlayback = (fn: () => void) => listeners.add(fn);
const tick = () => listeners.forEach((fn) => fn());

function typeOptions(selected: string): HTMLOptGroupElement[] {
  const groups = new Map<string, HTMLOptGroupElement>();
  for (const [id, t] of Object.entries(POPUP_TYPES)) {
    if (!groups.has(t.group)) groups.set(t.group, el("optgroup", { label: t.group }));
    groups.get(t.group)!.append(el("option", { value: id, textContent: t.label, selected: id === selected }));
  }
  return [...groups.values()];
}

const ICON_CHOICES: [PopupIcon, string][] = [
  ["none", "No icon"],
  ...(Object.entries(ICONS) as [PopupIcon, { label: string }][]).map(([k, v]): [PopupIcon, string] => [k, v.label]),
  ["custom", "Your image"],
];

export function mountPopupPanel(): void {
  const list = $<HTMLDivElement>("#pp-list");
  const addType = $<HTMLSelectElement>("#pp-add-type");
  const play = $<HTMLButtonElement>("#pp-play");
  const scrub = $<HTMLInputElement>("#pp-time");
  const clock = $<HTMLOutputElement>("#pp-clock");
  addType.replaceChildren(...typeOptions("gold"));

  const card = (p: Popup) => {
    const type = POPUP_TYPES[p.type] ?? POPUP_TYPES.gold;
    const edit = (patch: Partial<Popup>, structural = false) => {
      Object.assign(p, patch);
      changed(structural);
    };
    const num = (label: string, key: "start" | "x" | "y", step: number, hint: string) => {
      const input = el("input", { type: "number", step: String(step), value: String(p[key]), title: hint });
      input.addEventListener("input", () => edit({ [key]: Number(input.value) || 0 }));
      return el("label", { className: "pp-num" }, [label, input]);
    };

    const kind = el("select", { "aria-label": "Popup type", title: "Moves like this type. Picking one also resets the colors and icon." }, typeOptions(p.type));
    kind.addEventListener("change", () => {
      const fresh = makePopup(kind.value);
      edit({ type: kind.value, text: fresh.text, color: fresh.color, outlineColor: fresh.outlineColor, icon: fresh.icon, iconSide: fresh.iconSide }, true);
    });
    const text = el("input", { type: "text", value: p.text, "aria-label": "Popup text", className: "pp-text" });
    text.addEventListener("input", () => edit({ text: text.value }));
    const remove = el("button", { type: "button", className: "icon-btn", textContent: "✕", title: "Remove popup", "aria-label": "Remove popup" });
    remove.addEventListener("click", () => {
      state.popups = state.popups.filter((x) => x !== p);
      changed(true);
    });

    const color = el("input", { type: "color", value: p.color, title: "Text color" });
    color.addEventListener("input", () => edit({ color: color.value }));
    const outline = el("input", { type: "color", value: p.outlineColor, title: "Outline color" });
    outline.addEventListener("input", () => edit({ outlineColor: outline.value }));

    const icon = el(
      "select",
      { "aria-label": "Icon" },
      ICON_CHOICES.map(([v, label]) => el("option", { value: v, textContent: label, selected: v === p.icon })),
    );
    const upload = el("input", { type: "file", accept: "image/*", hidden: true });
    const uploadBtn = el("label", { className: "file-btn small", textContent: "Choose", hidden: p.icon !== "custom" }, [upload]);
    icon.addEventListener("change", () => {
      edit({ icon: icon.value as PopupIcon }, true);
      if (icon.value === "custom") upload.click();
    });
    upload.addEventListener("change", async () => {
      const file = upload.files?.[0];
      upload.value = "";
      if (!file) return;
      try {
        await setImage(customIconKey(p.id), file);
        changed(true);
      } catch {
        toast(`Couldn't open ${file.name} as an image.`);
      }
    });
    const side = el("select", { "aria-label": "Icon side", hidden: p.icon === "none" }, [
      el("option", { value: "left", textContent: "Left", selected: p.iconSide === "left" }),
      el("option", { value: "right", textContent: "Right", selected: p.iconSide === "right" }),
    ]);
    side.addEventListener("change", () => edit({ iconSide: side.value as Popup["iconSide"] }, true));

    const size = el("input", { type: "range", min: "0.5", max: "3", step: "0.05", value: String(p.size), "aria-label": "Size" });
    const sizeOut = el("output", { textContent: `${Math.round(p.size * 100)}%` });
    size.addEventListener("input", () => {
      sizeOut.textContent = `${Math.round(Number(size.value) * 100)}%`;
      edit({ size: Number(size.value) });
    });

    const extras: HTMLElement[] = [];
    if (type.motion.alternate && type.motion.vx > 0) {
      const flip = el("input", { type: "checkbox", checked: p.flip });
      flip.addEventListener("change", () => edit({ flip: flip.checked }, true));
      extras.push(el("label", { className: "toggle", title: "Damage numbers fly to either side" }, [flip, " Fly left"]));
    }
    const reset = el("button", { type: "button", className: "small", textContent: "Game look", title: "Put back this type's colors and icon" });
    reset.addEventListener("click", () => {
      const fresh = makePopup(p.type);
      edit({ color: fresh.color, outlineColor: fresh.outlineColor, icon: fresh.icon, iconSide: fresh.iconSide, size: 1 }, true);
    });

    return el("div", { className: "pp-card" }, [
      el("div", { className: "pp-row" }, [kind, text, remove]),
      el("div", { className: "pp-row" }, [
        el("label", { className: "pp-color" }, [color, "Text"]),
        el("label", { className: "pp-color" }, [outline, "Outline"]),
        icon,
        uploadBtn,
        side,
        reset,
      ]),
      el("div", { className: "pp-row" }, [
        el("label", { className: "pp-size" }, ["Size", size, sizeOut]),
        num("Start", "start", 0.05, "Seconds into the clip"),
        num("X", "x", 1, "Pixels right of the champion"),
        num("Y", "y", 1, "Pixels below the champion. Negative is higher."),
        ...extras,
      ]),
    ]);
  };

  // Cards are rebuilt on structural changes, not while typing in them.
  const render = () => {
    if (list.contains(document.activeElement) && document.activeElement?.matches("input[type=text], input[type=number]")) return;
    list.replaceChildren(...state.popups.map(card));
    if (!state.popups.length) list.append(el("p", { className: "hint", textContent: "No popups yet. Add one above." }));
  };

  $<HTMLButtonElement>("#pp-add").addEventListener("click", () => {
    const last = state.popups[state.popups.length - 1];
    // New ones start a moment after the last, so they don't sit on top of each other.
    state.popups.push(makePopup(addType.value, { start: last ? Math.round((last.start + 0.2) * 100) / 100 : 0 }));
    changed(true);
  });

  // Playback
  const showTime = () => {
    const end = popupsDuration(state.popups);
    scrub.max = String(end);
    scrub.value = String(playback.time);
    clock.textContent = `${playback.time.toFixed(2)}s / ${end.toFixed(2)}s`;
    play.textContent = playback.playing ? "Pause" : "Play";
  };
  let last = 0;
  const step = (now: number) => {
    if (!playback.playing) return;
    const end = popupsDuration(state.popups);
    playback.time += (now - last) / 1000;
    last = now;
    if (playback.time > end + 0.4) playback.time = 0; // a short pause, then loop
    showTime();
    tick();
    requestAnimationFrame(step);
  };
  play.addEventListener("click", () => {
    playback.playing = !playback.playing;
    if (playback.playing) {
      last = performance.now();
      requestAnimationFrame(step);
    }
    showTime();
  });
  scrub.addEventListener("input", () => {
    playback.playing = false;
    playback.time = Number(scrub.value);
    showTime();
    tick();
  });

  onChange((structural) => {
    if (structural) render();
    showTime();
  });
  render();
  showTime();
}
