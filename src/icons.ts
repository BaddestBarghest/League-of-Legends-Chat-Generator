import { iconUrl, type IconKind } from "./gameData";

// Loaded icons, shared by everything that draws them. Each loads once.
const cache = new Map<string, Promise<HTMLImageElement | null>>();

// Loads an image the canvas is allowed to export. A failed or blocked image
// resolves to null so callers can draw a plain tile instead.
export function loadImage(url: string): Promise<HTMLImageElement | null> {
  let pending = cache.get(url);
  if (!pending) {
    pending = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
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
