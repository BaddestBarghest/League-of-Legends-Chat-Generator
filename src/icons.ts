import { iconUrl, type IconKind } from "./gameData";

// Loaded icons, shared by everything that draws them. Each loads once.
const cache = new Map<string, Promise<HTMLImageElement | null>>();

// Called when a slow image shows up after a draw already gave up on it.
const arrivals = new Set<() => void>();
export const onImageArrived = (fn: () => void) => arrivals.add(fn);

// How long a draw waits for one image before going on without it.
const PATIENCE = 4000;

// Loads an image the canvas is allowed to export. A failed, blocked or slow
// image resolves to null so callers can draw a plain tile instead. A slow one
// still lands later and asks for a redraw, and a failed one is tried again
// next time, so a hiccup on the art server doesn't stick.
export function loadImage(url: string): Promise<HTMLImageElement | null> {
  let pending = cache.get(url);
  if (!pending) {
    pending = new Promise((resolve) => {
      let late = false;
      const timer = setTimeout(() => {
        late = true;
        resolve(null);
      }, PATIENCE);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        clearTimeout(timer);
        if (!late) return resolve(img);
        cache.set(url, Promise.resolve(img));
        arrivals.forEach((fn) => fn());
      };
      img.onerror = () => {
        clearTimeout(timer);
        cache.delete(url);
        resolve(null);
      };
      img.src = url;
    });
    cache.set(url, pending);
  }
  return pending;
}

export function loadIcon(kind: IconKind, name: string): Promise<HTMLImageElement | null> {
  const url = name.trim() ? iconUrl(kind, name) : undefined;
  return url ? loadImage(url) : Promise.resolve(null);
}
