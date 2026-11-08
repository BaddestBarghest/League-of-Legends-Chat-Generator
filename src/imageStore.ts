// The picture a user puts behind the Victory text. It's kept in IndexedDB
// rather than in the project, so undo history and autosave stay small.

const DB = "chat-log-maker-images";
const STORE = "images";
const KEY = "banner";

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

let blob: Blob | null = null;
let image: Promise<HTMLImageElement | null> | null = null;

// Throws if the file isn't a picture the browser can draw.
export async function setBannerImage(file: Blob): Promise<void> {
  const img = await decode(file);
  blob = file;
  image = Promise.resolve(img);
  try {
    await run("readwrite", (s) => s.put(file, KEY));
  } catch {
    // Storage is off (private window). It still works until the page closes.
  }
}

export async function bannerImageBlob(): Promise<Blob | null> {
  if (blob) return blob;
  try {
    blob = ((await run("readonly", (s) => s.get(KEY))) as Blob | undefined) ?? null;
  } catch {
    blob = null;
  }
  return blob;
}

export function bannerImage(): Promise<HTMLImageElement | null> {
  image ??= bannerImageBlob().then((b) => (b ? decode(b).catch(() => null) : null));
  return image;
}

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
