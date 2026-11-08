import { $, toast } from "./dom";
import { changed, onChange, state } from "./state";
import { syncStyleControls } from "./styleControls";

// Undo and redo for everything the app edits. Adding, deleting, moving and
// loading are recorded right away. Typing is recorded once it pauses, so one
// undo takes back a whole word or name, not a single letter.

const LIMIT = 100;
const TYPING_PAUSE = 700;

const take = () => JSON.stringify({ lines: state.lines, players: state.players, scoreboard: state.scoreboard, banner: state.banner, popups: state.popups, popupSpeed: state.popupSpeed, settings: state.settings });

let stack: string[] = [];
let index = -1;
let restoring = false;
let timer = 0;

function record(): void {
  clearTimeout(timer);
  const snap = take();
  if (snap === stack[index]) return;
  stack = stack.slice(0, index + 1);
  stack.push(snap);
  if (stack.length > LIMIT) stack.shift();
  index = stack.length - 1;
  updateButtons();
}

function restore(snap: string): void {
  const data = JSON.parse(snap);
  restoring = true;
  state.lines = data.lines;
  state.players = data.players;
  state.scoreboard = data.scoreboard;
  state.banner = data.banner;
  state.popups = data.popups;
  state.popupSpeed = data.popupSpeed ?? 1;
  state.settings = data.settings;
  syncStyleControls();
  changed(true);
  restoring = false;
  updateButtons();
}

export function undo(): void {
  // Save any typing in progress first, so it can be undone too.
  if (timer) record();
  if (index <= 0) return toast("Nothing to undo.");
  index--;
  restore(stack[index]);
}

export function redo(): void {
  if (index >= stack.length - 1) return toast("Nothing to redo.");
  index++;
  restore(stack[index]);
}

function updateButtons(): void {
  $<HTMLButtonElement>("#btn-undo").disabled = index <= 0 && !timer;
  $<HTMLButtonElement>("#btn-redo").disabled = index >= stack.length - 1;
}

export function mountHistory(): void {
  onChange((structural) => {
    if (restoring) return;
    // Changes made while a text field has focus are typing, even when they
    // reshape other things (renaming a player renames their lines).
    const typing = document.activeElement?.matches("input[type=text], input[type=number], textarea");
    if (structural && !typing) record();
    else {
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = 0;
        record();
      }, TYPING_PAUSE);
      updateButtons();
    }
  });

  $<HTMLButtonElement>("#btn-undo").addEventListener("click", undo);
  $<HTMLButtonElement>("#btn-redo").addEventListener("click", redo);

  // Ctrl+Z and Ctrl+Shift+Z (or Ctrl+Y). Inside a text box the browser's own
  // text undo keeps working instead.
  document.addEventListener("keydown", (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const target = e.target as HTMLElement;
    if (target.closest("input[type=text], input[type=number], textarea")) return;
    const key = e.key.toLowerCase();
    if (key === "z" && !e.shiftKey) undo();
    else if ((key === "z" && e.shiftKey) || key === "y") redo();
    else return;
    e.preventDefault();
  });

  record();
}
