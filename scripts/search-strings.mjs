#!/usr/bin/env node
// Searches League's own text (the client string table, mirrored by
// CommunityDragon) for the chat lines this tool makes, so the wording and
// any color tags can be checked against the real thing.
//
//   npm run strings                    search for the built-in phrases
//   npm run strings -- "first blood"   also search for your own words
//   npm run strings -- --lang de_de    another language
//   npm run strings -- --fresh         download again instead of using the cache
//   npm run strings -- --file x.json   use a string table you already have
//
// Needs Node 18 or newer. The download is about 30 MB and is cached in
// scripts/.cache, so later runs are instant.

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const PHRASES = [
  "signals that enemies are missing",
  "has vision here",
  "signals to retreat",
  "push forward",
  "is on the way",
  "signals to all in",
  "asking for assistance",
  "asking for vision",
  "is defending the",
  "has targeted",
  "to be cautious",
  "fall back",
  "back away from",
  "has slain",
  "has shut down",
  "Bonus Bounty",
  "double kill",
  "killing spree",
  "unstoppable",
  "scored an ace",
  "first turret",
  "Surrender vote",
  "purchased",
  "Can purchase",
  "Not learned yet",
  "towards Level",
  "Respawning",
  "Spawning in",
  "Gold Bounty",
  "Type to Team",
];

// ---- arguments

const args = process.argv.slice(2);
let lang = "en_us";
let file = null;
let fresh = false;
const extra = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--lang") lang = args[++i];
  else if (a === "--file") file = args[++i];
  else if (a === "--fresh") fresh = true;
  else if (a === "--help" || a === "-h") {
    console.log("Usage: npm run strings -- [words to find] [--lang en_us] [--fresh] [--file path]");
    process.exit(0);
  } else extra.push(a);
}
const terms = [...new Set([...extra, ...PHRASES])];


// ---- get the string table

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function download(url, dest) {
  console.log(`Downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  const total = Number(res.headers.get("content-length")) || 0;
  const chunks = [];
  let got = 0;
  for await (const chunk of res.body) {
    chunks.push(chunk);
    got += chunk.length;
    if (total) process.stdout.write(`\r  ${((got / total) * 100).toFixed(0)}% of ${(total / 1e6).toFixed(1)} MB`);
  }
  process.stdout.write("\n");
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, Buffer.concat(chunks));
}

async function loadTable() {
  if (file) return JSON.parse(await readFile(file, "utf8"));
  const url = `https://raw.communitydragon.org/latest/game/${lang}/data/menu/${lang}/lol.stringtable.json`;
  const cache = join(here, ".cache", `lol.stringtable.${lang}.json`);
  if (fresh || !(await exists(cache))) await download(url, cache);
  else console.log(`Using cached ${cache} (add --fresh to download again)`);
  return JSON.parse(await readFile(cache, "utf8"));
}

// ---- search

// The file's layout has changed over the years, so just collect every string
// in it along with where it sits.
function* strings(node, path = "") {
  if (typeof node === "string") yield [path, node];
  else if (Array.isArray(node)) for (let i = 0; i < node.length; i++) yield* strings(node[i], `${path}[${i}]`);
  else if (node && typeof node === "object") for (const [k, v] of Object.entries(node)) yield* strings(v, path ? `${path}.${k}` : k);
}

function shorten(s, max = 240) {
  const one = s.replace(/\s+/g, " ");
  return one.length > max ? one.slice(0, max) + "..." : one;
}

const table = await loadTable();
const all = [...strings(table)];
console.log(`Searching ${all.length.toLocaleString()} strings for ${terms.length} phrases\n`);

const found = {};
const tags = new Map();
for (const term of terms) {
  const needle = term.toLowerCase();
  const hits = all.filter(([, text]) => text.toLowerCase().includes(needle));
  found[term] = hits.map(([key, text]) => ({ key, text }));

  console.log(`## ${term}  (${hits.length} ${hits.length === 1 ? "match" : "matches"})`);
  for (const [key, text] of hits.slice(0, 8)) console.log(`  ${key}\n    ${shorten(text)}`);
  if (hits.length > 8) console.log(`  ...and ${hits.length - 8} more in strings-found.json`);
  console.log("");

  // Tags inside matching strings are how the game marks colors, if it does.
  for (const [, text] of hits) for (const tag of text.match(/<[^<>]{1,80}>/g) ?? []) tags.set(tag, (tags.get(tag) ?? 0) + 1);
}

if (tags.size) {
  console.log("## Tags seen in the matching strings (may show the game's colors)");
  for (const [tag, n] of [...tags].sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log(`  ${n}x  ${tag}`);
  console.log("");
}

const out = join(here, "strings-found.json");
await writeFile(out, JSON.stringify({ lang, tags: Object.fromEntries(tags), found }, null, 2));
console.log(`Full results saved to ${out}`);
