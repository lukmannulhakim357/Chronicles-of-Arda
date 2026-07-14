# Credits & Asset Licenses

This project uses free/open game art. **If you redistribute or publish a build,
this file (or an equivalent in-game credits screen) must ship with it** — most
of the art below requires attribution, and the share-alike licenses require
derivatives to stay under the same terms.

## Character spritesheets (`public/assets/characters/*.png`)

The character sheets are **composited derivatives** of layers from the
[Universal LPC Spritesheet Character Generator](https://github.com/sanderfrenken/Universal-LPC-Spritesheet-Character-Generator)
(see `tools/compose-characters.mjs` for the exact layer recipes). They are
distributed under **CC-BY-SA 3.0** (share-alike, as required by the source
layers). Layer-by-layer provenance, from the generator's `CREDITS.csv`:

| Layer | Authors | License(s) | Source |
|---|---|---|---|
| Body (male & female, incl. colors) | bluecarrot16, Benjamin K. Smith (BenCreating), Eliza Wyatt (ElizaWy), Evert, TheraHedwig, MuffinElZangano, Durrani, Pierre Vigier (pvigier), Matthew Krohn (makrohn), Johannes Sjölund (wulax), JaidynReiman, Stephen Challener (Redshrike) | CC-BY-SA 3.0 / GPL 3.0 | [LPC Character Bases](https://opengameart.org/content/lpc-character-bases) |
| Head (human male & female) | bluecarrot16, Benjamin K. Smith (BenCreating), Stephen Challener (Redshrike) | OGA-BY 3.0 / CC-BY-SA 3.0 / GPL 3.0 | [LPC base assets](https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles) |
| Elven ears | JaidynReiman, bluecarrot16, Thane Brimhall (pennomi), Matthew Krohn (makrohn) | CC-BY-SA 3.0 / GPL 3.0 | via ULPC generator |
| Hair — curtains_long | Mandi Paugh, bluecarrot16 | GPL 2.0 / GPL 3.0 / CC-BY 3.0 | [Trevor Overland](https://opengameart.org/content/trevor-overland), [LPC Hair](https://opengameart.org/content/lpc-hair) |
| Hair — braid | Nila122, ElizaWy | OGA-BY 3.0 / CC-BY-SA 3.0 / GPL 3.0 / GPL 2.0 | [3 hairs for LPC](https://opengameart.org/content/3-hairs-for-lpc), [LPC Hair](https://opengameart.org/content/lpc-hair) |
| Torso — longsleeve (male) | JaidynReiman, Johannes Sjölund (wulax) | CC-BY-SA 3.0 / GPL 3.0 | [LPC Medieval Fantasy Character Sprites](https://opengameart.org/content/lpc-medieval-fantasy-character-sprites) |
| Torso — longsleeve (female) | bluecarrot16, ElizaWy, Stephen Challener (Redshrike) | OGA-BY 3.0 / CC-BY-SA 3.0 / GPL 3.0 | [LPC base assets](https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles) |
| Legs — pants (male & female) | bluecarrot16, JaidynReiman, ElizaWy, Joe White, Matthew Krohn (makrohn), Johannes Sjölund (wulax) | OGA-BY 3.0 / CC-BY-SA 3.0 / GPL 3.0 | via ULPC generator |
| Feet — shoes (male & female) | Joe White, Johannes Sjölund (wulax) | OGA-BY 3.0 / CC-BY-SA 3.0 / GPL 3.0 | [LPC Medieval Fantasy Character Sprites](https://opengameart.org/content/lpc-medieval-fantasy-character-sprites) |

## Tiles & decor (`public/assets/tiles/*.png`)

Sourced from the [Stendhal](https://github.com/arianne/stendhal) tileset
collection (per-file provenance from Stendhal's
`doc/sources/graphics-tileset.txt`):

| File | Author(s) | License | Source |
|---|---|---|---|
| `water.png` | Kimmo Rundelin (kiheru) | CC BY-SA 3.0 | Stendhal |
| `grasses.png` | Kimmo Rundelin (kiheru) | CC BY-SA 3.0 | Stendhal |
| `rocks.png`, `rock_cluster.png`, `large_boulder.png`, `large_pebble.png` | Kimmo Rundelin (kiheru) | CC BY-SA 3.0 | Stendhal |
| `pine_tree.png`, `fir_trees.png` | Kimmo Rundelin (kiheru) | CC BY-SA 3.0 | Stendhal |
| `evergreen.png` | Lanea Zimmerman (Sharm) | CC BY-SA 3.0 | [LPC: Sharm's tiles](https://opengameart.org/node/13470) |
| `greenGround2.png` | Rachel J Morris (Moosader) | CC0 | [Public Domain Tiles](https://moosader.deviantart.com/art/Public-Domain-Tiles-210769545) |

## Narrative illustrations (`public/assets/art/*.jpg`)

Per the project's cutscene-art workflow (see
`docs/cutscene-art-needed.md`), these are **not** free/CC-licensed pack
assets — they were generated externally with Google's Gemini by the project
owner specifically for this game, then dropped into the repo.

| File | Used for | Generated with |
|---|---|---|
| `cuivienen-awakening.jpg` | Opening story card (character creation → Cuiviénen) | Gemini |
| `cuivienen-call-of-orome.jpg` | "The Summons of the Valar" card (end of "The Vanishing") | Gemini |

## Engine & tools

- [Phaser 3](https://phaser.io) — MIT
- [Vite](https://vite.dev) — MIT
- [sharp](https://sharp.pixelplumbing.com) — Apache-2.0 (build-time only)

## License summary

- **Game code** (everything in `src/`, `tools/`): MIT (see `LICENSE`).
- **Composited character sheets**: CC-BY-SA 3.0 (derivative of LPC art).
- **Tiles**: license per file as listed above (CC BY-SA 3.0 except where CC0).

CC-BY-SA 3.0: https://creativecommons.org/licenses/by-sa/3.0/
GPL 3.0: https://www.gnu.org/licenses/gpl-3.0.html
OGA-BY 3.0: https://static.opengameart.org/OGA-BY-3.0.txt
