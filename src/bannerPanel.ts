import type { Banner } from "./types";
import { $, toast } from "./dom";
import { setBannerImage } from "./imageStore";
import { changed, defaultBanner, onChange, state } from "./state";

// The controls for the Victory or Defeat screen.
export function mountBannerPanel(): void {
  const results = document.querySelectorAll<HTMLButtonElement>("#bn-result button");
  const backs = document.querySelectorAll<HTMLButtonElement>("#bn-bg button");
  const text = $<HTMLInputElement>("#bn-text");
  const imageOpts = $<HTMLDivElement>("#bn-image-opts");

  type Num = "size" | "spacing" | "imageSize";
  const sliders: [string, Num, (v: number) => string][] = [
    ["size", "size", (v) => `${Math.round(v * 100)}%`],
    ["spacing", "spacing", (v) => (v > 0 ? `+${v}px` : `${v}px`)],
    ["image-size", "imageSize", (v) => `${Math.round(v * 100)}%`],
  ];

  const sync = () => {
    const b = state.banner;
    results.forEach((x) => x.classList.toggle("on", x.dataset.result === b.result));
    backs.forEach((x) => x.classList.toggle("on", x.dataset.bg === b.background));
    imageOpts.hidden = b.background !== "image";
    text.placeholder = b.result === "victory" ? "Victory" : "Defeat";
    if (document.activeElement !== text) text.value = b.text;
    for (const [id, key, fmt] of sliders) {
      const input = $<HTMLInputElement>(`#bn-${id}`);
      if (document.activeElement !== input) input.value = String(b[key]);
      $<HTMLOutputElement>(`#o-bn-${id}`).textContent = fmt(b[key]);
    }
  };

  results.forEach((x) =>
    x.addEventListener("click", () => {
      state.banner.result = x.dataset.result as Banner["result"];
      changed(true);
    }),
  );
  backs.forEach((x) =>
    x.addEventListener("click", () => {
      state.banner.background = x.dataset.bg as Banner["background"];
      changed(true);
    }),
  );
  text.addEventListener("input", () => {
    state.banner.text = text.value;
    changed();
  });
  for (const [id, key, fmt] of sliders) {
    const input = $<HTMLInputElement>(`#bn-${id}`);
    input.addEventListener("input", () => {
      state.banner[key] = Number(input.value);
      $<HTMLOutputElement>(`#o-bn-${id}`).textContent = fmt(state.banner[key]);
      changed();
    });
  }
  $<HTMLButtonElement>("#bn-reset").addEventListener("click", () => {
    const d = defaultBanner();
    Object.assign(state.banner, { size: d.size, spacing: d.spacing });
    changed(true);
  });

  $<HTMLInputElement>("#bn-image").addEventListener("change", async (e) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    try {
      await setBannerImage(file);
      state.banner.background = "image";
      changed(true);
      toast("Image added. It's saved in this browser for next time.");
    } catch {
      toast(`Couldn't open ${file.name} as an image.`);
    }
  });

  onChange(sync);
  sync();
}
