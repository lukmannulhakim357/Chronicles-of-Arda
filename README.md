# Chronicles of Arda

A top-down pixel art RPG set across the full history of Arda (Tolkien's
Middle-earth), built mobile-first with [Phaser 3](https://phaser.io) +
[Vite](https://vite.dev) — no app install required, it runs straight in the
browser. Play it live: **https://lukmannulhakim357.github.io/Chronicles-of-Arda/**

**Current build: the Elf origin campaign — “The Great Journey”** (vertical
slice, Waypoints 1–2 of 10 fully playable). Design source of truth:
[`arda-rpg-concept.md`](arda-rpg-concept.md) + the skill-system companion doc
[`arda-rpg-skills.md`](arda-rpg-skills.md); build directives:
[`docs/great-journey-build-prompt.md`](docs/great-journey-build-prompt.md).

> 📌 Repo "About" (top-right of the GitHub page) isn't editable from here —
> paste this in **Settings → General → Description**: *"Top-down pixel-art
> RPG across the history of Arda — mobile-first, browser-playable. Current:
> the Elf origin campaign 'The Great Journey'."* and set **Website** to the
> Pages URL above.

## Progress

| Waypoint | Status |
|---|---|
| 1. Cuiviénen — "The Vanishing" | ✅ playable end-to-end |
| 2. The Steppes — "The Stragglers" | ✅ playable end-to-end |
| 3. The Great Forest | 📋 planned (next up) |
| 4. Vales of Anduin — "Lenwë's Choice" | 📋 planned |
| 5. Misty Mountains | 📋 planned |
| 6. Rhovanion | 📋 planned |
| 7. Ered Luin — "First Contact" | 📋 planned |
| 8. Beleriand & Neldoreth — "The King Is Lost" | 📋 planned |
| 9. The Falas | 📋 planned |
| 10. Crossing to Aman | 📋 planned |

Core systems already in: character creation, save/autosave, touch controls,
the Road West journey map, and narrative illustrations (2 of 4 planned pieces
done — see [`docs/cutscene-art-needed.md`](docs/cutscene-art-needed.md)).

## What's playable

- **Homepage → Profile → Campaign → Character** menu flow:
  1. **New Game** prompts for a profile name (the save file's name — not an
     in-game character nickname) or **Load Game** lists existing profiles.
  2. **Campaign select** shows every campaign as a card: unlocked ones (playable
     now, or already played) are clear and bright; campaigns still gated
     behind an earlier one show dim with just "🔒 Locked" — no title revealed.
  3. Each campaign has **4 character slots**. An empty slot creates a
     character (kindred + class); an occupied one shows its progress and
     resumes with one tap. Mortal races would reroll each new campaign while
     Elves persist as the same character (concept doc §4, §9) — this build
     ships a single campaign, so that carry-over becomes visible once a
     second one exists.
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
- **Waypoint 2 — The Steppes**, fully playable: open grassland split by a
  river, and the quest **“The Stragglers”** end-to-end — no combat, per the
  concept doc's own framing of this waypoint as simpler filler content:
  1. Speak with Míriel, fallen behind the host
  2. Escort her west; forage and hunt three supply spots along the way
  3. Lead her across the ford and rejoin the host — she gifts you a cloak
     and boots, which now pauses on a **gear tutorial** (the Character
     screen opens automatically, nudging you to equip your reward) before
     the waypoint actually finishes. Tarion gifts a jerkin and bracers too.
- **EXP & Leveling** — introduced at the very moment Oromë names you one of
  the Eldar: surviving the shadow-servant and his departure together grant
  exactly enough EXP to level up on the spot (concept doc §16.6 formula),
  and Oromë's own dialogue doubles as the in-fiction tutorial for spending
  the 3 stat points you gain each level. The HUD gains a level + XP bar
  under the HP/MP bars, and the pause menu shows "Character (N)" whenever
  points are unspent.
- **Gear & Stats, redesigned as one screen** — the **Character** menu's
  **Gear** tab is now a proper RPG paperdoll: 6 equipment slots (Head /
  Chest / Gloves / Boots / Trinket / Weapon — Head, Trinket and Weapon stay
  locked until later content fills them), with stat-point spending and the
  full derived combat block (HP, MP, P-ATK, M-ATK, ATK-RATE, P-DEF, M-DEF,
  Accuracy, Evasion, CRIT%) directly underneath, so equipping or unequipping
  gear shows the real number change immediately. A pack grid sits alongside
  it — tap an item to see its name/description/bonus, then Equip or Unequip
  from the detail panel.
- **Gold** — quests, waypoints and the odd "defeated something in the dark"
  moment now pay out gold alongside EXP; the HUD shows a running total
  top-right. Treasure chests and per-kill drops in future dungeons/wilds
  hook into the same `grantGold()` system.
- **Story Collection ("Tales" tab)** — every story card you've seen (waypoint
  completions, major beats) is archived and replayable from the Character
  screen, so you can revisit *Chronicles of Arda* as you go.
- **Skill Trees & Action Bar** (design: [`arda-rpg-skills.md`](arda-rpg-skills.md))
  — the Character menu's **Skills** tab is a real progression screen: every
  class has its own fixed 8-skill tree (7 regular + 1 capstone, 6 Active + 2
  Passive, 38 points to fully max — `src/data/skills.js`), unlocked in order
  as you spend banked skill points, with a live points-spent counter. Once a
  tree is fully maxed, further skill points auto-convert to bonus stat
  points instead of banking uselessly. Below the tree, a 4-slot Action Bar
  lets you assign any of your learned Active skills — tap a slot to cycle
  through them, swappable anytime outside combat.
- **Combat engine** (`src/combat/`) — damage/mitigation/accuracy/crit
  formulas, MP/cast-time/cooldown gating, buffs/debuffs/DoTs/HoTs, simplified
  threat/aggro targeting, a 3-tier companion-AI decision function (emergency
  → role-reactive trigger → default rotation), and a boss controller
  (HP-threshold phases + attack telegraphs) — all implemented as pure,
  engine-agnostic logic and covered by `tools/logic-test-combat.mjs`. There's
  no playable battle yet to plug it into (Waypoint 3 is where basic-attack
  combat first appears in the world) — this is the tested foundation ready
  to wire in once that content ships, not a placeholder.
- **Titles, Crafting** — stub tabs for systems that don't exist yet:
  milestone titles that will grant bonus stats, and crafting professions
  (Blacksmithing / Tailoring / Alchemy / Cooking). Clearly marked "Upcoming"
  rather than hidden, so the shape of the full game is visible.
- **The Road West** — the fixed 10-waypoint journey map. Waypoints 3–10 are
  scaffolded (name, terrain, story beat, planned quest) and show preview
  cards; they'll become playable zones in future builds.
- **Save system** — a profile can hold up to 4 characters per campaign; free
  save anywhere from the pause menu, plus autosave on zone entry and at every
  quest milestone.

## Controls

- **Touch (primary)**: virtual joystick — touch and drag anywhere on the left
  half of the screen; contextual button (Talk / Examine / Approach) and Attack
  button bottom-right; ☰ opens the menu (Character / Save / Road West /
  Switch Character / Homepage).
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
public/assets/art/         narrative illustrations (see CREDITS.md)
src/scenes/                Boot, Title, CampaignSelect, CharacterSlot,
                            Creation, Story, World, Journey, UI, Character
src/world/                 zone builders (cuivienen, steppes) + the zone registry
src/quests/                quest scripts (vanishing, stragglers)
src/systems/               save system (profiles/campaigns/slots), game state
src/data/                  campaigns, kindreds, classes, waypoints, items,
                           leveling, skills (skill trees + summon data)
src/combat/                damage/threat/AI/boss-phase engine (not yet wired
                           into a playable battle — see README below)
src/ui/                    shared widgets + the DOM text-input modal
tools/compose-characters.mjs  rebuilds character sheets from LPC layers
tools/logic-test-combat.mjs   pure Node test for the skill/combat engine
```

## Asset pipeline & licensing

Character art is composited from the
[Universal LPC Spritesheet](https://github.com/sanderfrenken/Universal-LPC-Spritesheet-Character-Generator)
layers; tiles come from [Stendhal](https://github.com/arianne/stendhal)'s
CC-BY-SA tileset collection (plus CC0 pieces). **Full per-asset attribution
is in [`CREDITS.md`](CREDITS.md)** — ship it with any distributed build.
Game code is MIT.

Narrative illustrations are produced externally (Gemini) and slotted in —
the opening (Cuiviénen) and the coming of Oromë are done; two more (Nan
Elmoth, the Crossing to Aman) are tracked in
[`docs/cutscene-art-needed.md`](docs/cutscene-art-needed.md) and show a
marked placeholder frame in-game until they're ready.

## Roadmap (next builds)

1. Waypoint 3 — The Great Forest (guide stragglers back to the path by night;
   introduces weapons + basic-attack combat, unlocking the Weapon slot and
   giving the `src/combat/` engine its first real battle to run)
2. Class kit differentiation (weapon sprites + skill animation cues — the
   trees themselves are already fully built, see the Skill Trees section)
3. Waypoints 4–10 following the chain in `src/data/waypoints.js`
4. Milestone titles, crafting professions, and richer treasure/monster gold
   drops as dungeons/wilderness content ships
5. Real paperdoll/item-icon art to replace the current vector/monogram
   placeholders in the Gear tab
6. Valinor as an explorable hub + persistent teleport (post-campaign scope)
