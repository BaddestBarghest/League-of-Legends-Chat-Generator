# League of Legends Chat Generator

Make League style in-game chat logs and export them as transparent PNGs for videos, thumbnails and memes.

## Features

- Players panel: set up each team once, then pick who's talking from a list. Renaming a player updates every line they wrote
- One composer for chat and pings. Type a message and press Enter, or pick a ping and its targets from your players
- New lines go after the line you're editing, or at the end
- Compact line list that shows each line in its real colors. Click a line, here or in the preview, to edit it
- Team chat, all chat, action lines and system lines
- Pings, kills, streaks, objectives and announcements, worded and colored like the game's own text
- Autocomplete for champions, items, runes, summoner spells and abilities, with typo-tolerant search
- Tab scoreboard: switch the preview to Scoreboard to draw both teams with champion portraits, spells, items, level, CS, K/D/A, bounties and respawn timers. Set each player's stats with the Stats button in Players
- Timestamps you can turn off, and a warning when a line's time goes back in time
- Color tags in messages: `<gold>`, `<red>`, `<blue>`, `<ping>`, `<info>`, `<b>` for bold, or any hex like `<#ff66cc>text</>`
- Transparent PNG export at 1x, 2x or 3x, with optional line wrapping
- Frames export: a zip with one PNG per line, all the same size, for line by line animation
- Copy or download the log as plain text
- Adjustable font, size, spacing, outline, shadow and colors
- Load your own font file (it stays in your browser)
- Save and open logs as JSON, plus autosave

## Running locally

```bash
npm install
npm run dev
```

## Checking the wording against the game

The chat lines come from the League Wiki and in-game screenshots. To compare them with the game's own text, run:

```bash
npm run strings
```

It downloads League's English string table from CommunityDragon (about 30 MB, cached after the first run) and lists every string that contains each chat phrase, plus any color tags found in them. Add your own words to search for more, like `npm run strings -- "first blood"`. Use `--lang de_de` for another language and `--fresh` to download again. Results are also saved to `scripts/strings-found.json`. Needs Node 18 or newer.

## Deploying

Pushing to `main` builds the site and deploys it with GitHub Actions. In the repo settings, go to Pages and set the source to **GitHub Actions** once.

## About the font

The in-game chat uses Gill Sans. It isn't free to share, so the site uses the copy that comes with macOS, or with Microsoft Office on Windows ("Gill Sans MT"), when it's installed. Without it, the site falls back to Metrophobic, a close free match. Convergence, Quattrocento Sans and Imprima are also bundled as options. If you own the real font, use "Load my own font" in the Style panel.

## Legal

Fan made. Not endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and League of Legends are trademarks or registered trademarks of Riot Games, Inc.
