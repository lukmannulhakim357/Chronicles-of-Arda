# Chronicles of Arda

A top-down pixel-art RPG set across the history of Arda, built mobile-first
with [Phaser 3](https://phaser.io) + [Vite](https://vite.dev).

**This build: the Elf origin campaign — “The Great Journey”** (vertical
slice). Design source of truth: [`arda-rpg-concept.md`](arda-rpg-concept.md);
build directives: [`docs/great-journey-build-prompt.md`](docs/great-journey-build-prompt.md).

## What's playable

- **Character creation** — choose a kindred (Vanyar / Noldor / Teleri, each
  with lore-correct hair & garb) and one of the 8 classes (4-stat model:
  VIT / MAG / STR / DEX).
- **Waypoint 1 — Cuiviénen**, fully playable: a starlit lakeshore zone with
  the camp of the host, and the quest **“The Vanishing”** end-to-end:
  1. Speak with Elder Alassë — a kinsman has gone missing
  2. Track his trail north-east through three clues
  3. Drive off (or survive) a shadow-servant of Melkor
  4. The coming of Oromë — dialogue with a choice that's saved to your story
  5. Walk Náro home; the summons West ends the waypoint
- **The Road West** — the fixed 10-waypoint journey map. Waypoints 2–10 are
  scaffolded (name, terrain, story beat, planned quest) and show preview
  cards; they'll become playable zones in future builds.
- **Save system** — free save anywhere from the pause menu, plus autosave on
  zone entry and at every quest milestone. One tap to continue from the title.

## Controls

- **Touch (primary)**: virtual joystick — touch and drag anywhere on the left
  half of the screen; contextual button (Talk / Examine / Approach) and Attack
  button bottom-right; ☰ opens the pause menu (Save / Road West / Quit).
- **Keyboard (desktop testing)**: WASD/arrows to move, `E` action / advance
  dialogue, `Space` attack, `1`–`3` pick dialogue choices, `Esc` pause.

## Main di HP / Play on mobile

Panduan lengkap (GitHub Pages, PC + WiFi, atau Termux di Android):
**[docs/cara-main-di-hp.md](docs/cara-main-di-hp.md)**. Versi singkat: aktifkan
GitHub Pages (Settings → Pages → Source: *GitHub Actions*), lalu buka
`https://lukmannulhakim357.github.io/Chronicles-of-Arda/` di browser HP —
tidak perlu install aplikasi apa pun.

## Run it

```bash
npm install
npm run dev        # dev server (add --host to test on a phone on your LAN)
npm run build      # production build to dist/
npm run preview    # serve the production build
```

## Project layout

```
public/assets/characters/  composed LPC character spritesheets (see tools/)
public/assets/tiles/       terrain & decor tiles (see CREDITS.md)
src/scenes/                Boot, Title, Creation, Story, World, Journey, UI
src/world/                 zone builders (cuivienen)
src/quests/                quest scripts (vanishing)
src/systems/               save system, game state
src/data/                  kindreds, classes, waypoints
tools/compose-characters.mjs  rebuilds character sheets from LPC layers
```

## Asset pipeline & licensing

Character art is composited from the
[Universal LPC Spritesheet](https://github.com/sanderfrenken/Universal-LPC-Spritesheet-Character-Generator)
layers; tiles come from [Stendhal](https://github.com/arianne/stendhal)'s
CC-BY-SA tileset collection (plus CC0 pieces). **Full per-asset attribution
is in [`CREDITS.md`](CREDITS.md)** — ship it with any distributed build.
Game code is MIT.

Narrative illustrations (campaign opening, the coming of Oromë, …) are
produced externally and slotted in later — the needed pieces are tracked in
[`docs/cutscene-art-needed.md`](docs/cutscene-art-needed.md); the game shows
marked placeholder frames until then.

## Roadmap (next builds)

1. Waypoint 2 — The Steppes (escort + hunting/foraging quest)
2. Class kit differentiation (weapon sprites, first skills per class)
3. Waypoints 3–10 following the chain in `src/data/waypoints.js`
4. Valinor as an explorable hub + persistent teleport (post-campaign scope)
