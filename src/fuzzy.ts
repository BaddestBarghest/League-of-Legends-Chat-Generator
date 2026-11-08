// Fuzzy name matching for the champion picker.

// Nicknames people actually type.
const ALIASES: Record<string, string[]> = {
  "Aurelion Sol": ["asol"],
  "Cho'Gath": ["cho"],
  "Dr. Mundo": ["mundo"],
  Fiddlesticks: ["fiddle"],
  Heimerdinger: ["heimer", "donger"],
  "Jarvan IV": ["j4", "jarvan 4"],
  "Kha'Zix": ["kha"],
  "Kog'Maw": ["kog"],
  "Lee Sin": ["lee"],
  LeBlanc: ["lb"],
  "Master Yi": ["yi"],
  "Miss Fortune": ["mf"],
  "Nunu & Willump": ["nunu", "willump"],
  "Renata Glasc": ["renata"],
  "Tahm Kench": ["tahm"],
  "Twisted Fate": ["tf"],
  Wukong: ["monkey king"],
  "Xin Zhao": ["xin"],
};

// Lowercase and drop spaces and punctuation, so "kai sa" and "Kai'Sa" match.
export function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Edit distance where swapping two neighboring letters counts as one typo.
export function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

// Lower is better. Infinity means not a match.
function score(query: string, name: string): number {
  const q = normalize(query);
  if (!q) return Infinity;
  const forms = [name, ...(ALIASES[name] ?? [])].map(normalize);
  const words = name.toLowerCase().split(/[\s'.&]+/).map(normalize).filter(Boolean);

  let best = Infinity;
  for (const n of forms) {
    if (n === q) return 0;
    if (n.startsWith(q)) best = Math.min(best, 1);
    else if (n.includes(q)) best = Math.min(best, 3);
    // Typos: compare against the start of the name and the whole name.
    const typos = Math.min(editDistance(q, n.slice(0, q.length)), editDistance(q, n));
    const allowed = q.length <= 3 ? 1 : q.length <= 6 ? 2 : 3;
    if (typos <= allowed) best = Math.min(best, 4 + typos);
  }
  if (words.some((w) => w.startsWith(q))) best = Math.min(best, 2);
  return best;
}

export function fuzzySearch(query: string, names: string[], limit = 8): string[] {
  return names
    .map((name) => ({ name, s: score(query, name) }))
    .filter((m) => m.s < Infinity)
    .sort((a, b) => a.s - b.s || a.name.length - b.name.length || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((m) => m.name);
}
