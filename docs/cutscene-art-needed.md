# Cutscene / Scenario Illustrations Needed

Per the build directive, narrative illustrations are **not** generated inside
this project — they are produced externally (Gemini workflow) and fed back
in. This file tracks every moment that needs one. Wired-in illustrations show
full-size in `StoryScene` (`art` parameter); still-missing ones show a clearly
marked `[ illustration planned ]` placeholder frame (`artFlag` parameter).

## Done

### 1. Opening — Cuiviénen under starlight ✅
- **Where**: story card after character creation (`CreationScene.confirm`)
- **File**: `public/assets/art/cuivienen-awakening.jpg`

### 2. The Coming of Oromë ✅
- **Where**: story card after completing "The Vanishing"
  (`VanishingQuest.finishQuest`)
- **File**: `public/assets/art/cuivienen-call-of-orome.jpg`

## Coming with later waypoints (not yet wired)

### 3. Nan Elmoth — the search for Elwë (waypoint 8)
- **Mood**: enchanted, timeless, disquieting stillness
- **Key elements**: colossal dark trees, single shafts of silver light,
  the suggestion of two distant figures (Elwë & Melian) lost in light

### 4. The Shores of Aman (waypoint 10, campaign close)
- **Where**: story card after completing "The Crossing"
  (`TheCrossingQuest.finishQuest`)
- **Mood**: arrival, awe, hope fulfilled — the first sight of the world they
  set out for, after the whole march
- **Key elements**: seen from the islet/boat, low over a dark sea — white
  sand shores catching a light with no single visible source (gold and
  silver both at once, the Two Trees' glow), rising ahead out of the dark

## How to wire finished art in

1. Drop the image into `public/assets/art/` (JPEG is fine — resize to
   ~1400px wide first; see "Adding a new illustration" below for the exact
   command used for the two done above).
2. Add a `this.load.image('art-your-key', 'assets/art/your-file.jpg')` line
   in `BootScene.preload()`.
3. In the corresponding `StoryScene` call, replace `artFlag: '…'` with
   `art: 'art-your-key'`. The placeholder path stays for any still-missing
   pieces, so partially-illustrated builds work fine.
4. Add a line for the file in `CREDITS.md` under "Narrative illustrations".

### Adding a new illustration (resize/compress)

Source images from Gemini tend to be large (2000px+, 300–500KB). Resize to a
web/mobile-friendly size with `sharp` (already a project devDependency):

```bash
node -e "
require('sharp')('/path/to/source.jpg')
  .resize({ width: 1400, withoutEnlargement: true })
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile('public/assets/art/your-file.jpg');
"
```
