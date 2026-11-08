# League of Legends Chat Generator

Make League style in-game chat logs and export them as transparent PNGs for videos, thumbnails and memes.

## Features

- Team chat, all chat, action lines and system lines
- Ping builder with map pings, vision, objectives, enemy timers, abilities, items and system messages
- Color tags in messages: `<gold>`, `<red>`, `<blue>` or any hex like `<#ff66cc>text</>`
- Transparent PNG export at 1x, 2x or 3x
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

## Deploying

Pushing to `main` builds the site and deploys it with GitHub Actions. In the repo settings, go to Pages and set the source to **GitHub Actions** once.

## About the font

The in-game chat font isn't free to share, so the site ships with Metrophobic as a close free match, plus Convergence, Quattrocento Sans and Imprima. The fonts are bundled with the site. If you own the real font, use "Load my own font" in the Style panel.

## Legal

Fan made. Not endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and League of Legends are trademarks or registered trademarks of Riot Games, Inc.
