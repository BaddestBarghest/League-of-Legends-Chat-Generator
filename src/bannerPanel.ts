import { $ } from "./dom";
import { changed, onChange, state } from "./state";

// The controls for the Victory or Defeat screen.
export function mountBannerPanel(): void {
  const results = document.querySelectorAll<HTMLButtonElement>("#bn-result button");
  const text = $<HTMLInputElement>("#bn-text");
  const plaque = $<HTMLInputElement>("#bn-plaque");

  const sync = () => {
    const b = state.banner;
    results.forEach((x) => x.classList.toggle("on", x.dataset.result === b.result));
    text.placeholder = b.result === "victory" ? "Victory" : "Defeat";
    if (document.activeElement !== text) text.value = b.text;
    plaque.checked = b.plaque;
  };

  results.forEach((x) =>
    x.addEventListener("click", () => {
      state.banner.result = x.dataset.result as typeof state.banner.result;
      changed(true);
    }),
  );
  text.addEventListener("input", () => {
    state.banner.text = text.value;
    changed();
  });
  plaque.addEventListener("change", () => {
    state.banner.plaque = plaque.checked;
    changed(true);
  });

  onChange(sync);
  sync();
}
