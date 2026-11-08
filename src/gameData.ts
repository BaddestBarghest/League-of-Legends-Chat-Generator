// Item, rune, summoner spell and ability names from Riot's Data Dragon.
// Lists load in the background and are cached per patch. Until they arrive,
// or if the site can't reach Riot, fields still accept any text.

const DDRAGON = "https://ddragon.leagueoflegends.com";
const CACHE_PREFIX = "chat-log-maker:dd:";

let versionPromise: Promise<string> | null = null;
function latestVersion(): Promise<string> {
  versionPromise ??= fetch(`${DDRAGON}/api/versions.json`)
    .then((r) => r.json())
    .then((v: string[]) => v[0]);
  return versionPromise;
}

async function getJson(path: string): Promise<any> {
  const version = await latestVersion();
  const res = await fetch(`${DDRAGON}/cdn/${version}/data/en_US/${path}`);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

// Uses the cached copy when it's from the current patch.
async function cached<T>(kind: string, load: () => Promise<T>): Promise<T> {
  const version = await latestVersion();
  try {
    const hit = JSON.parse(localStorage.getItem(CACHE_PREFIX + kind) ?? "null");
    if (hit?.version === version) return hit.data as T;
  } catch {
    // no storage, just fetch
  }
  const data = await load();
  try {
    localStorage.setItem(CACHE_PREFIX + kind, JSON.stringify({ version, data }));
  } catch {
    // fine, we'll fetch again next time
  }
  return data;
}

const clean = (s: string) => s.replace(/<[^>]+>/g, "").trim();
const unique = (names: string[]) => [...new Set(names.map(clean).filter(Boolean))].sort((a, b) => a.localeCompare(b));

let items: string[] = [];
// Bundled so the trinket slot works before Riot's list arrives.
let trinkets: string[] = ["Farsight Alteration", "Oracle Lens", "Poro-Snax", "Stealth Ward"];
let runes: string[] = [];
// Bundled so the most common field works offline.
let spells: string[] = ["Barrier", "Cleanse", "Exhaust", "Flash", "Ghost", "Heal", "Ignite", "Smite", "Teleport"];
let championIds: Record<string, string> = {};
const abilities = new Map<string, string[]>();

// Image paths by name, relative to Data Dragon's cdn folder.
type Images = Record<string, string>;
const images: Record<IconKind, Images> = { champion: {}, item: {}, spell: {}, rune: {} };
export type IconKind = "champion" | "item" | "spell" | "rune";
let patch = "";

export const getItems = () => items;
export const getTrinkets = () => trinkets;
export const getRunes = () => runes;
export const getSpells = () => spells;
export const getAbilities = (champion: string) => abilities.get(champion) ?? [];

// Full icon URL for a name, or undefined when it isn't known (yet).
export function iconUrl(kind: IconKind, name: string): string | undefined {
  const path = images[kind][clean(name)];
  if (!path) return undefined;
  // Rune icons live outside the versioned folder.
  return kind === "rune" ? `${DDRAGON}/cdn/img/${path}` : `${DDRAGON}/cdn/${patch}/img/${path}`;
}

interface RiotItem {
  name: string;
  image: { full: string };
  gold?: { purchasable?: boolean };
  maps?: Record<string, boolean>;
  inStore?: boolean;
  hideFromAll?: boolean;
  requiredChampion?: string;
  tags?: string[];
}

const isTrinket = (i: RiotItem) => clean(i.name) === "Poro-Snax" || Boolean(i.tags?.includes("Trinket"));

// Riot's item list also has Arena and Swarm entries named after abilities,
// champion upgrades like Gangplank's ult, quests and hidden helpers. Only
// keep items you can buy in the shop on Summoner's Rift (map 11) or ARAM
// (map 12). Poro-Snax is kept because it fills the ARAM trinket slot.
function isShopItem(i: RiotItem): boolean {
  if (clean(i.name) === "Poro-Snax") return true;
  if (!i.gold?.purchasable || i.inStore === false || i.hideFromAll || i.requiredChampion) return false;
  return Boolean(i.maps?.["11"] || i.maps?.["12"]);
}

interface Listed {
  names: string[];
  images: Images;
  trinkets?: string[];
}

export async function loadGameData(): Promise<void> {
  patch = await latestVersion().catch(() => "");
  const jobs: Promise<void>[] = [
    cached<Listed>("items:v4", async () => {
      const data = await getJson("item.json");
      const list = Object.values(data.data as Record<string, RiotItem>);
      const imgs: Images = {};
      for (const i of list) imgs[clean(i.name)] ??= `item/${i.image.full}`;
      // Trinkets get their own slot, so they're kept out of the item list.
      const shop = list.filter(isShopItem);
      const tr = list.filter((i) => isTrinket(i) && !i.hideFromAll && (i.maps?.["11"] || i.maps?.["12"]));
      return { names: unique(shop.filter((i) => !isTrinket(i)).map((i) => i.name)), images: imgs, trinkets: unique(tr.map((i) => i.name)) };
    }).then((v) => {
      items = v.names;
      if (v.trinkets?.length) trinkets = v.trinkets;
      images.item = v.images;
    }),
    cached<Listed>("runes:v2", async () => {
      type Rune = { name: string; icon: string };
      const trees = (await getJson("runesReforged.json")) as (Rune & { slots: { runes: Rune[] }[] })[];
      const all = trees.flatMap((t) => [t, ...t.slots.flatMap((s) => s.runes)]);
      const imgs: Images = {};
      for (const r of all) imgs[clean(r.name)] = r.icon;
      return { names: unique(all.map((r) => r.name)), images: imgs };
    }).then((v) => {
      runes = v.names;
      images.rune = v.images;
    }),
    cached<Listed>("spells:v3", async () => {
      const data = await getJson("summoner.json");
      const list = Object.values(data.data as Record<string, { name: string; image: { full: string }; modes?: string[] }>);
      const imgs: Images = {};
      for (const s of list) imgs[clean(s.name)] ??= `spell/${s.image.full}`;
      // Only spells from normal games and ARAM. Others are mode-only abilities.
      const usable = list.filter((s) => s.modes?.some((m) => m === "CLASSIC" || m === "ARAM") && !/placeholder/i.test(s.name));
      return { names: unique(usable.map((s) => s.name)), images: imgs };
    }).then((v) => {
      spells = v.names;
      images.spell = v.images;
    }),
    cached("champions:v2", async () => {
      const data = await getJson("champion.json");
      const ids: Record<string, string> = {};
      const imgs: Images = {};
      for (const c of Object.values(data.data as Record<string, { id: string; name: string; image: { full: string } }>)) {
        ids[c.name] = c.id;
        imgs[c.name] = `champion/${c.image.full}`;
      }
      return { ids, images: imgs };
    }).then((v) => {
      championIds = v.ids;
      images.champion = v.images;
    }),
  ];
  // One failing list shouldn't stop the others.
  await Promise.allSettled(jobs);
}

// Ability names (passive first, then Q, W, E, R) for one champion, loaded on demand.
export async function loadAbilities(champion: string): Promise<void> {
  const id = championIds[champion];
  if (!id || abilities.has(champion)) return;
  try {
    const list = await cached(`abilities:${id}`, async () => {
      const data = await getJson(`champion/${id}.json`);
      const c = data.data[id] as { passive: { name: string }; spells: { name: string }[] };
      return [c.passive.name, ...c.spells.map((s) => s.name)].map(clean);
    });
    abilities.set(champion, list);
  } catch {
    // leave it as free text
  }
}
