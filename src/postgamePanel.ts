import type { Postgame } from "./types";
import { $, el } from "./dom";
import { changed, onChange, state } from "./state";

// The options for the post-game screen. Player details live on the Players tab.
export function mountPostgamePanel(): void {
  const pg = () => state.postgame;
  const segs = (id: string, key: "result" | "map", attr: string) => {
    const buttons = document.querySelectorAll<HTMLButtonElement>(`#${id} button`);
    buttons.forEach((b) =>
      b.addEventListener("click", () => {
        const value = b.dataset[attr]!;
        if (key === "map") {
          // Switching maps fills in its usual name and mode if they weren't changed.
          const was = pg().map;
          const names: Record<string, [string, string]> = { HA: ["Howling Abyss", "ARAM: Mayhem"], SR: ["Summoner's Rift", "Ranked Solo/Duo"] };
          if (pg().mapName === names[was][0]) pg().mapName = names[value][0];
          if (pg().mode === names[was][1]) pg().mode = names[value][1];
          if (value === "SR" && pg().slots === "augments") pg().slots = "none";
          if (value === "HA" && pg().slots === "none") pg().slots = "augments";
        }
        (pg() as unknown as Record<string, string>)[key] = value;
        changed(true);
      }),
    );
    return () => buttons.forEach((b) => b.classList.toggle("on", b.dataset[attr] === pg()[key]));
  };
  const syncResult = segs("pg-result", "result", "result");
  const syncMap = segs("pg-map", "map", "map");

  const texts: (keyof Postgame)[] = ["mapName", "mode", "record", "duration", "footer"];
  for (const key of texts) {
    const input = $<HTMLInputElement>(`#pg-${key}`);
    input.addEventListener("input", () => {
      (pg() as unknown as Record<string, string>)[key] = input.value;
      changed();
    });
  }
  const you = $<HTMLSelectElement>("#pg-you");
  you.addEventListener("change", () => {
    pg().you = you.value;
    changed(true);
  });
  const slots = $<HTMLSelectElement>("#pg-slots");
  slots.addEventListener("change", () => {
    pg().slots = slots.value as Postgame["slots"];
    changed(true);
  });
  const gameId = $<HTMLInputElement>("#pg-gameid");
  gameId.addEventListener("change", () => {
    pg().showGameId = gameId.checked;
    changed(true);
  });

  const sync = () => {
    syncResult();
    syncMap();
    for (const key of texts) {
      const input = $<HTMLInputElement>(`#pg-${key}`);
      if (document.activeElement !== input) input.value = String(pg()[key]);
    }
    you.replaceChildren(
      el("option", { value: "", textContent: "No one" }),
      ...state.players.map((p) => el("option", { value: p.id, textContent: `${p.name || "(no name)"}${p.champion ? ` (${p.champion})` : ""}` })),
    );
    you.value = state.players.some((p) => p.id === pg().you) ? pg().you : "";
    slots.value = pg().slots;
    gameId.checked = pg().showGameId;
  };
  onChange(sync);
  sync();
}
