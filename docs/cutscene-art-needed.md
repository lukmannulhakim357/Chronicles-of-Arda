# Cutscene / Scenario Illustrations Needed

Per the build directive, narrative illustrations are **not** generated inside
this project — they are produced externally (Gemini workflow) and fed back in.
This file tracks every moment that needs one. In-game, each spot currently
shows a clearly marked `[ illustration planned ]` placeholder frame
(`StoryScene`, `artFlag` parameter).

## Needed now (wired into this build)

### 1. Opening — Cuiviénen under starlight
- **Where**: story card after character creation (`CreationScene.confirm`)
- **Mood**: hushed, primeval night; no sun or moon has ever risen
- **Key elements**: dark mere reflecting dense stars, silver light on reeds and
  rocks, distant figures of newly-woken Elves by the shore; no fire, no
  buildings — the world before civilization

### 2. The Coming of Oromë
- **Where**: story card after completing "The Vanishing"
  (`VanishingQuest.finishQuest`)
- **Mood**: awe and terror resolving into wonder — the first light of Aman
  breaking into Middle-earth's night
- **Key elements**: Oromë the huntsman on Nahar (white horse), a golden glow
  that the starlit plain has never seen, wisps of fleeing shadow at the edges,
  small elven figures shielding their eyes

## Coming with later waypoints (not yet wired)

### 3. Nan Elmoth — the search for Elwë (waypoint 8)
- **Mood**: enchanted, timeless, disquieting stillness
- **Key elements**: colossal dark trees, single shafts of silver light,
  the suggestion of two distant figures (Elwë & Melian) lost in light

### 4. The Crossing to Aman (waypoint 10, campaign close)
- **Mood**: departure, longing, hope — leaving the only world they've known
- **Key elements**: the island-ferry of Tol Eressëa on a dark sea, swan-prowed
  silhouettes, the light of the Two Trees as a glow on the western horizon

## How to wire finished art in

1. Drop the image into `public/assets/art/` (e.g. `opening-cuivienen.png`).
2. In the corresponding `StoryScene` call, replace `artFlag: '…'` with
   `art: 'assets/art/opening-cuivienen.png'` (and add an `this.load.image`
   entry in `BootScene`), then render it in `StoryScene` instead of the
   placeholder frame. The placeholder code path stays for any still-missing
   pieces.
