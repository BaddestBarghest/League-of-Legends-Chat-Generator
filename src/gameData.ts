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
let runes: string[] = [];
// Bundled so the most common field works offline.
let spells: string[] = ["Barrier", "Cleanse", "Exhaust", "Flash", "Ghost", "Heal", "Ignite", "Smite", "Teleport"];
let championIds: Record<string, string> = {};
const abilities = new Map<string, string[]>();

export const getItems = () => items;
export const getRunes = () => runes;
export const getSpells = () => spells;
export const getAbilities = (champion: string) => abilities.get(champion) ?? [];

export async function loadGameData(): Promise<void> {
  const jobs: Promise<void>[] = [
    cached("items", async () => {
      const data = await getJson("item.json");
      const list = Object.values(data.data as Record<string, { name: string; gold?: { purchasable?: boolean } }>);
      return unique(list.filter((i) => i.gold?.purchasable).map((i) => i.name));
    }).then((v) => void (items = v)),
    cached("runes", async () => {
      const trees = (await getJson("runesReforged.json")) as { name: string; slots: { runes: { name: string }[] }[] }[];
      return unique(trees.flatMap((t) => [t.name, ...t.slots.flatMap((s) => s.runes.map((r) => r.name))]));
    }).then((v) => void (runes = v)),
    cached("spells", async () => {
      const data = await getJson("summoner.json");
      return unique(Object.values(data.data as Record<string, { name: string }>).map((s) => s.name));
    }).then((v) => void (spells = v)),
    cached("champion-ids", async () => {
      const data = await getJson("champion.json");
      const ids: Record<string, string> = {};
      for (const c of Object.values(data.data as Record<string, { id: string; name: string }>)) ids[c.name] = c.id;
      return ids;
    }).then((v) => void (championIds = v)),
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
