// Pictures the user adds: the one behind the Victory text, and popup icons.
// They're kept in IndexedDB rather than in the project, so undo history and
// autosave stay small.

const DB = "chat-log-maker-images";
const STORE = "images";
const BANNER = "banner";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const blobs = new Map<string, Blob | null>();
const images = new Map<string, Promise<HTMLImageElement | null>>();

// Throws if the file isn't a picture the browser can draw.
export async function setImage(key: string, file: Blob): Promise<void> {
  const img = await decode(file);
  blobs.set(key, file);
  images.set(key, Promise.resolve(img));
  try {
    await run("readwrite", (s) => s.put(file, key));
  } catch {
    // Storage is off (private window). It still works until the page closes.
  }
}

export async function imageBlob(key: string): Promise<Blob | null> {
  if (blobs.has(key)) return blobs.get(key)!;
  let b: Blob | null = null;
  try {
    b = ((await run("readonly", (s) => s.get(key))) as Blob | undefined) ?? null;
  } catch {
    // nothing saved
  }
  blobs.set(key, b);
  return b;
}

export function storedImage(key: string): Promise<HTMLImageElement | null> {
  if (!images.has(key)) images.set(key, imageBlob(key).then((b) => (b ? decode(b).catch(() => null) : null)));
  return images.get(key)!;
}

export const setBannerImage = (file: Blob) => setImage(BANNER, file);
export const bannerImageBlob = () => imageBlob(BANNER);
export const bannerImage = () => storedImage(BANNER);

function decode(b: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(b);
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("not an image"));
    };
    img.src = url;
  });
}

// Project files carry the picture as text so they open anywhere.
export function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });
}

export async function dataUrlToBlob(url: string): Promise<Blob> {
  return (await fetch(url)).blob();
}
