// Champion names for the picker. The list below is bundled so it works offline,
// and refreshChampions() swaps in Riot's latest list from Data Dragon when it can.

let champions: string[] = [
  "Aatrox", "Ahri", "Akali", "Akshan", "Alistar", "Ambessa", "Amumu", "Anivia", "Annie",
  "Aphelios", "Ashe", "Aurelion Sol", "Aurora", "Azir", "Bard", "Bel'Veth", "Blitzcrank", "Brand",
  "Braum", "Briar", "Caitlyn", "Camille", "Cassiopeia", "Cho'Gath", "Corki", "Darius", "Diana",
  "Dr. Mundo", "Draven", "Ekko", "Elise", "Evelynn", "Ezreal", "Fiddlesticks", "Fiora", "Fizz",
  "Galio", "Gangplank", "Garen", "Gnar", "Gragas", "Graves", "Gwen", "Hecarim", "Heimerdinger",
  "Hwei", "Illaoi", "Irelia", "Ivern", "Janna", "Jarvan IV", "Jax", "Jayce", "Jhin", "Jinx",
  "K'Sante", "Kai'Sa", "Kalista", "Karma", "Karthus", "Kassadin", "Katarina", "Kayle", "Kayn",
  "Kennen", "Kha'Zix", "Kindred", "Kled", "Kog'Maw", "LeBlanc", "Lee Sin", "Leona", "Lillia",
  "Lissandra", "Locke", "Lucian", "Lulu", "Lux", "Malphite", "Malzahar", "Maokai", "Master Yi",
  "Mel", "Milio", "Miss Fortune", "Mordekaiser", "Morgana", "Naafiri", "Nami", "Nasus", "Nautilus",
  "Neeko", "Nidalee", "Nilah", "Nocturne", "Nunu & Willump", "Olaf", "Orianna", "Ornn", "Pantheon",
  "Poppy", "Pyke", "Qiyana", "Quinn", "Rakan", "Rammus", "Rek'Sai", "Rell", "Renata Glasc",
  "Renekton", "Rengar", "Riven", "Rumble", "Ryze", "Samira", "Sejuani", "Senna", "Seraphine",
  "Sett", "Shaco", "Shen", "Shyvana", "Singed", "Sion", "Sivir", "Skarner", "Smolder", "Sona",
  "Soraka", "Swain", "Sylas", "Syndra", "Tahm Kench", "Taliyah", "Talon", "Taric", "Teemo",
  "Thresh", "Tristana", "Trundle", "Tryndamere", "Twisted Fate", "Twitch", "Udyr", "Urgot",
  "Varus", "Vayne", "Veigar", "Vel'Koz", "Vex", "Vi", "Viego", "Viktor", "Vladimir", "Volibear",
  "Warwick", "Wukong", "Xayah", "Xerath", "Xin Zhao", "Yasuo", "Yone", "Yorick", "Yunara", "Yuumi",
  "Zaahen", "Zac", "Zed", "Zeri", "Ziggs", "Zilean", "Zoe", "Zyra",
];

export function getChampions(): string[] {
  return champions;
}

const CACHE_KEY = "chat-log-maker:champions";
const DDRAGON = "https://ddragon.leagueoflegends.com";

export async function refreshChampions(): Promise<void> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) champions = JSON.parse(cached).names ?? champions;
  } catch {
    // no storage, keep the bundled list
  }
  try {
    const [version] = (await (await fetch(`${DDRAGON}/api/versions.json`)).json()) as string[];
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}");
    if (cached.version === version) return;
    const data = await (await fetch(`${DDRAGON}/cdn/${version}/data/en_US/champion.json`)).json();
    const names = Object.values(data.data as Record<string, { name: string }>)
      .map((c) => c.name)
      .sort((a, b) => a.localeCompare(b));
    if (names.length < 100) return;
    champions = names;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ version, names }));
    } catch {
      // fine, we'll fetch again next time
    }
  } catch {
    // offline or blocked, the bundled list still works
  }
}
