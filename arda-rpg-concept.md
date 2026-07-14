# Arda RPG — Concept Document (Working Title)
*Living document — update incrementally as design evolves.*

---

## 1. Pitch

A non-linear, top-down pixel-art RPG set across the full history of Arda — from the Awakening of the Elves under the stars to the peace of the Fourth Age. Explore Tolkien's world as a persistent Elf who lives through every era, or as a mortal who is reborn — new name, new race option, new class — into each age's story. Recruit an AI-controlled party of up to 5, fast-travel between explored locations, delve into caves and ruins for treasure and boss fights, raid Orc strongholds, and take part in the great wars of Arda's history.

## 2. Core Pillars

- **Lore-first**: every system (race, spawn point, era, world event) is grounded in Tolkien's actual history of Arda.
- **Persistent choice, replayable history**: one meta-progression profile spans many separate campaigns.
- **Mortality as a mechanic**: immortality (Elves) vs. reincarnation (everyone else) is a core gameplay axis, not just flavor.
- **Solo game, full party feel**: no co-op — the party is filled out by recruitable AI companions.
- **Mobile-first**: built for phone and tablet — UI, HUD, and controls must be touch-friendly throughout, not a scaled-down desktop layout.

## 3. World & Campaign Structure

- The game is **not one continuous open-world save** — each **Age**, and each major historical **war event**, is its own separate, replayable campaign/scenario. Finished campaigns can be replayed freely.
- **Free save** anywhere via menu (no fixed checkpoints).
- **One account-level profile** persists across all campaigns and carries forward:
  - Wealth
  - Armor / weapons
  - Knowledge / lore codex
  - Items
  - Stat points and skill points (see **Reclass System**, Section 9)
- **Identity is per-campaign.** At the start of each new campaign, the player chooses: continue an existing character, or roll a new identity (name / race sub-culture / class).
  - **Elves are the exception**: because they are immortal, an Elf character is a single persistent identity that can, in principle, appear across every campaign from its founding onward — they never "reroll." They *can*, however, change **class** between campaigns via Reclass.
  - Mortal races (Men, Dwarves, Hobbits) must take a new identity each time they enter a new campaign, since their prior character has died of old age between eras. Their race and class are free to change with the new identity, also via Reclass.

## 4. Character Origins

### 4.1 Elves — "The Great Journey" (unique origin arc)

Because an Elf is one persistent character for the whole game, their origin is a full campaign in itself — not a side story.

- **Shared start:** Awakening at Cuiviénen, under starlight (before Sun and Moon exist).
- **Choice:** follow Ingwë (→ **Vanyar**), Finwë (→ **Noldor**), or Elwë/Olwë (→ **Teleri**). These are the only three playable starting kindreds.
- **All three end the campaign by reaching Valinor.** Elves who historically didn't complete the crossing (Avari, Nandor, Sindar) are **not** playable starts — they appear as NPCs and narrative color encountered along the way (e.g. meeting Avari who chose to stay, or the story beat of Elwë going missing in Nan Elmoth).
- **Home city per kindred** (sets your starting base and default culture):
  | Kindred | Home city |
  |---|---|
  | Vanyar | Valmar / slopes of Taniquetil |
  | Noldor | Tirion, on the hill of Túna |
  | Teleri | Alqualondë (via Avallónë) |
- **Valinor is open, not gated** — once there, any Elf can freely travel to and explore all the Elven cities regardless of starting kindred (a Noldor can visit Valmar and Alqualondë and vice versa). Home city is a narrative starting point, not a lock.

### 4.2 Other Races — Direct Spawn (no origin arc)

Men, Dwarves, and Hobbits **skip an awakening/origin campaign**. Since they reincarnate every campaign anyway, a deep one-time origin story would just be repeated content. Instead they spawn directly into a settlement appropriate to their race, tied to whatever campaign/era is currently running.

## 5. Playable Races

| Race | Mortality | Era availability | Sub-cultures (playable) |
|---|---|---|---|
| **Elf** | Immortal — one persistent character | From the very beginning (pre-Sun/Moon) | Vanyar, Noldor, Teleri |
| **Dwarf** | Long-lived, not immortal — reincarnates | From First Age onward (same as Men) | Longbeards (Durin's Folk — Khazad-dûm, Erebor); Firebeards & Broadbeams (Nogrod/Belegost) optional |
| **Man** | Mortal — reincarnates, identity changes each campaign | From First Age onward, sub-culture shifts hard by era | First Age: Edain (Houses of Bëor, Hador, Haleth). Second Age: Númenórean. Third Age: Dúnedain (Gondor/Arnor), Rohirrim |
| **Hobbit** | Mortal — reincarnates | Only from mid-Third Age onward | Harfoot, Stoor, Fallohide |

**Trimmed by design (too little individual lore to build content around):** the four Eastern Dwarf-houses of Orocarni; undifferentiated early/"primeval" Men; unnamed Southern Men; Woodmen. These stay as background NPCs/lore color, not playable options.

**Orcs / evil-aligned factions: confirmed as enemies and mission targets / storyline only — not playable.**

## 6. Classes

| Class | Weapon | Role |
|---|---|---|
| Warrior | Sword/spear/axe + shield | Front-line melee |
| Ranger | Bow | Tracking, stealth, ranged, wilderness |
| Loresinger | Staff or harp/horn | Song/lore-based magic — buff/debuff, not fireball-mage (Lúthien/Finrod-flavored) |
| Herbmaster / Healer | Staff, backup dagger | Healing via herb-lore (athelas-style) + chant |
| Smith / Artificer | Hammer/mattock | Field crafting, party gear buffs, decent melee |
| Skirmisher | Dagger/sling | Agility, stealth, traps |
| Captain | Sword, horn/banner | Leadership, party-wide buffs |
| **Summoner** | Horn/talisman/staff + light self-defense weapon | Flex/support-via-proxy — see Section 7 |

Race and class are independent axes for the **player** (free combination); some pairings have natural flavor (Dwarf-Smith, Hobbit-Skirmisher, Man-Captain, Elf-Loresinger) but nothing is hard-locked. NPC companions lean into these affinities more strongly — see Section 8.

## 7. Summoner — Detail

The most balanced class: doesn't fill a role itself, but covers other roles through summoned creatures at reduced power relative to a dedicated human party member.

- **Base kit:** one active summon slot. A second slot unlocks at a later level/campaign milestone.
- **Unlock pacing:** the summon roster unlocks gradually across progression — not all creatures available from the start. (This staged-unlock approach also applies to other classes' abilities generally, not just Summoner.)

**Summon roster (common species, not named individuals):**

| Summon | Primary role | Notes |
|---|---|---|
| Ent | Frontline/Tank | Slow, high HP/defense, area control (root/knockback) |
| Beorning (bear) | Bruiser / Captain-lite | Rally buff on bear-shift; only valid from mid-Third Age onward (Beorn's line) |
| Great Eagle | Aerial scout/damage | Reveal map, extract downed ally |
| Bird | Support/Singer-lite | Minor buffs, minor enemy debuffs |
| Spirit | Healer-lite | HoT, cleanse — inspired by Goldberry (the River-woman's daughter, Tom Bombadil's wife); a nature/river-spirit archetype rather than a named Maia |

**Design rule:** unique, named legendary beings (Thorondor, Gwaihir, Shadowfax, Huan, etc.) are **not** part of the base summon kit — making them regular summonable units would break their "one of a kind" status in the lore. They appear instead as one-time companions or quest rewards.

## 8. NPC Companions & Recruitment

This is a **solo game** — the "party" is you plus AI/auto-controlled NPC followers, not human co-op.

- Recruitable NPCs are placed at distinct locations across the world per campaign, and are met naturally during play rather than all being available at once.
- Some companions require a **recruitment quest** first — help them, complete a task, resolve their problem — before they'll join, rather than being recruitable on first contact.
- Party cap: up to 4-5 members (player included).
- **Race-class affinity** — NPC companions should skew toward stereotype-appropriate class combos so the roster feels lore-authentic; the player's own race/class stays fully free (Section 6), this table only shapes what's *common in the recruitable NPC pool* (off-stereotype NPCs can still exist as rare/named exceptions):

| Race | Strong / common fit | Weak / rare fit | Notes |
|---|---|---|---|
| Dwarf | Warrior, Smith/Artificer, Captain, Skirmisher | Loresinger, Summoner, Healer/Herbmaster | Ranger is a middling fit — plausible, not a specialty |
| Elf | Loresinger, Ranger, Healer/Herbmaster, Captain | Smith (except Noldor) | Noldor specifically are a strong Smith fit — Fëanor/Celebrimbor's craft-lineage |
| Man | All roles plausible | — | Adaptable/generalist race by design; Captain, Warrior, Ranger (Dúnedain), Healer lean slightly stronger |
| Hobbit | Skirmisher, Herbmaster/Healer, Ranger (sling) | Warrior, Captain, Loresinger, Summoner, Smith | Stealth and herblore are hobbit signatures; combat-leadership and high-magic/craft roles are rare exceptions |

**Companion persistence across campaigns:**
- **Mortal companions (Man, Dwarf, Hobbit)** are fully campaign-scoped — same rule as the player's own mortal identities (Section 4.2). Recruited fresh each campaign, don't carry over; a new roster generates from the affinity table each time.
- **Elf companions can persist**, mirroring the player's own Elf mechanic. An Elf NPC recruited in an earlier campaign, if they survived it, can reappear as recruitable again in a later campaign/Age — older, changed, but with your shared history intact (an abbreviated "reunion" beat rather than a full fresh recruitment quest, since they already know and trust you).
- **If an Elf companion dies:** not necessarily permanent — Tolkien's Elves who die can eventually return from the Halls of Mandos after a period (the way Glorfindel does, canonically, between the First and Second Age). A slain Elf companion is unavailable for the remainder of that campaign and likely the next, but can resurface in a later Age. Mortal companion deaths stay final.

## 9. Reclass System

Because campaigns are long-form and the profile is shared, players can try a different class (and, via a new mortal identity, a different race) in a later campaign without losing everything they've built.

- Triggered when starting a new campaign: keep your current class, or **Reclass** into a new one (paired with a new identity for mortals; same persistent identity for Elves).
- **Conversion on Reclass:**
  - **Stat points** — carried as a shared pool, freely reallocated to suit the new class.
  - **Skill points** — fully refunded and reallocated into the new class's skill tree.
  - **Weapons/Armor** — gear that doesn't fit the new class is converted via **Reforge** (an in-world Smith service) into equivalent-tier gear for the new class, or banked as crafting materials/currency if there's no direct equivalent.
- Example: an Elf Loresinger reclasses into a Summoner for the next campaign — same Elf, new toolkit, stats/skills/gear converted rather than lost. A Man Warrior's next mortal identity reclasses as a Dwarf Smith — new race+class, but the account's accumulated progression still converts in.

## 10. War-Event Design

Major historical wars (War of Wrath, War of the Ring, etc.) can be entered as their own replayable campaigns. Macro-outcomes stay canon-locked (they have to, since the same shared timeline underpins every character/campaign); personal-scale consequences and side content stay flexible and replayable.

## 11. Visual Direction (early notes)

- Reference anchor: top-down pixel art with dramatic environmental lighting (light shafts through trees, torch/campfire as focal point, night scenes) — matches the mood needed for scenes like Cuiviénen under starlight or Valmar lit by the Two Trees.
- Each Elf-kindred home city should read as visually distinct (e.g., Valmar's light/bells motif vs. Tirion's white hill-city vs. Alqualondë's coastal swan-haven).
- Full art direction pass (palette, tile style, character proportions) — TBD, pending more reference material.

## 12. Technical & Asset Production Notes

**Platform: mobile (phone & tablet).** Controls and UI need to be mobile-friendly from the start — touch movement (virtual joystick or tap-to-move), touch-sized buttons for the skill bar/inventory/dialogue choices, and a layout that scales sensibly between phone-size and tablet-size screens rather than being designed mouse-and-keyboard-first and retrofitted later.

**Engine:** not yet locked. Two realistic paths for a top-down pixel-art game:
- Three.js with an orthographic camera + billboarded/flat sprites (keeps the door open for later 3D/lighting flourishes).
- A simpler 2D canvas approach (e.g., Phaser.js) — more natural fit for pure top-down pixel art, less overhead than 3D math for something that's visually 2D anyway, and has solid built-in touch-input support.

**Free asset sourcing:**
- **Liberated Pixel Cup (LPC)** assets are the strongest fit available for this exact genre — CC-BY-SA/GPL-licensed modular top-down RPG character sprites (race/gear/weapon/animation combinations) and matching tilesets, built for games like this one. Multiple LPC asset repositories are mirrored on GitHub, which is directly reachable from this environment.
- Other CC0 packs mirrored on GitHub can also be pulled directly the same way.
- **Licensing note:** LPC assets are typically CC-BY-SA/GPL, which requires attribution (and share-alike for GPL-derived art) — needs a credits section wherever this ships.
- **AI-generated custom assets** (already available as a connected tool in this workspace) are the better option specifically for Tolkien-accurate content that no generic free pack will have — e.g. Valmar's architecture, specific named creatures, kindred-specific armor silhouettes.
- **Claude.ai chat here:** can fetch assets from GitHub-hosted sources during creation and embed them directly into the file (works, but bloats file size/tokens if assets are numerous or large) — the in-browser preview itself can't live-fetch from arbitrary external sites due to sandbox restrictions.
- **Claude Code, run locally:** has your machine's full internet access — can pull directly from itch.io, OpenGameArt.org, Kenney.nl, Sketchfab, etc. without the GitHub-mirror limitation, and supports a real multi-file project with a build step (Vite/npm).

**Scenario/cutscene illustrations:** for narrative art (campaign intros/outros, narrated interludes like the Stay-Behind Track's "News from the North," key story-beat splash art), Claude flags when one would be useful rather than skipping it. The user generates it externally via Gemini and feeds the result into Claude Code — this is the intended workflow for that specific asset type, separate from the sprite/tileset sourcing above.

## 13. World Map & Locations

### 13.0 Location Design Principles

Named lore locations are the backbone, but they're sparse on their own — most Ages don't have enough named sites alone to fill a full game. Every campaign map also includes:
- **Wilderness pockets** — unnamed wild zones around hubs, routes, and dungeons: wildlife/monster hunting, gathering, small skirmishes. No lore-attested location required.
- **In-hub quests** — everyday, low-stakes quests inside cities/settlements themselves (errands, local disputes, small favors), not just epic hooks.
- The overarching **story stays complex**; individual filler locations/quests can and should stay simple. Complexity lives in the narrative thread connecting locations, not in every single POI.

### 13.1 The Great Journey (Elf origin campaign)

Middle-earth at this point has no settlements or cities yet — this is the Elder Days, effectively "Stone Age." The map is a chain of wilderness waypoints along the westward march, not a hub layout. Quests and events are defined directly per waypoint (design approach used for all Ages going forward, rather than a separate abstract quest system).

| # | Waypoint | Terrain | Story beat | Key Quest / Event |
|---|---|---|---|---|
| 1 | Cuiviénen (Waters of Awakening) | Lakeshore, starlit plain | Elves already going missing nearby (Melkor's servants) — the reason the Valar summon them away | **"The Vanishing"** — track a missing kinsman, glimpse Melkor's shadow-servants; ends with Oromë's arrival |
| 2 | The Steppes | Open grassland, river fords | First open-wilderness stretch | Escort a straggling family while hunting/foraging along the way |
| 3 | The Great Forest | Dense, dark woodland | "Lost in the dark forest" content | Guide stray members of the host back to the path before nightfall |
| 4 | Vales of Anduin *(Split #1)* | River valley at the mountains' feet | **Nandor:** part of the Teleri host, led by Lenwë, refuse to cross the mountains and turn south instead | **"Lenwë's Choice"** — try to persuade them to continue; the historical outcome is fixed, but a personal companion NPC's choice can shift |
| 5 | Misty Mountains (Hithaeglir) | Mountain pass | Hardest physical crossing of the march, guided by Oromë | Signature boss-tier encounter blocking the pass |
| 6 | Rhovanion | Open wild lands | Long stretch emphasizing just how many years the march took | Long-haul foraging/supply quest spanning "years" narratively |
| 7 | Ered Luin (Blue Mountains) | Mountain crossing | First contact with the Dwarves, already dwelling here (Nogrod/Belegost) | **"First Contact"** — wary first meeting with a Dwarf patrol, resolves into cautious respect |
| 8 | Beleriand — Region & Neldoreth | River Sirion valley, forest | **Split #2 (proto-Sindar):** Elwë wanders into Nan Elmoth, meets Melian, and is lost; the Eglath remnant refuse to leave without their king | **"The King Is Lost"** — search Nan Elmoth for Elwë; farewell to a Sindar-remnant companion who chooses to stay behind |
| 9 | The Falas (western shore) | Coastline | Ossë teaches the Teleri to love the sea and shipbuilding — **Split #3 (proto-Falathrim):** part of the host stays on this coast | Learn shipbuilding basics from Ossë; optional dialogue on staying vs. continuing |
| 10 | Crossing to Aman | Sea passage via Tol Eressëa | Ulmo ferries the remaining host across the Sea | Closing event — the sea crossing itself; campaign ends on arrival in Valinor |

*(Splits 1-3 are narrative/NPC outcomes only, consistent with Section 5 — only the three kindreds who complete the full journey are player-selectable.)*

#### Valinor — Standing Hub (unlocked after the Great Journey)

Once an Elf character finishes the Great Journey, Valinor doesn't stay locked inside that one campaign — it becomes a **permanent teleport destination**, reachable from any other campaign that same persistent Elf is playing, at any time. (Replaying the Great Journey campaign itself is still available separately for a fresh run of the origin story, but visiting home doesn't require that.)

Protected behind the Pelóri mountains and outside Morgoth's reach, Valinor plays differently from Middle-earth hubs — closer to a peaceful home base and sightseeing/social space than an adventure zone. Light quests and vignettes here, not dungeons or raids.

- **Valmar** — the Vanyar's city, the "City of Bells," beside the Two Trees
  - *Ezellohar (the Green Mound)* — where Telperion (silver) and Laurelin (gold) grow; arguably the single most beautiful sight in the whole game
  - *Máhanaxar (the Ring of Doom)* — where the Valar hold council
- **Tirion upon Túna** — the Noldor's white city on the hill of Túna, overlooking the pass of Calacirya; the tower Mindon Eldaliéva, lit by Telperion's light
- **Alqualondë** — the Teleri's Haven of the Swans: pearl-white buildings, swan-shaped ships, coastal light
- **Avallónë** (on Tol Eressëa) — the Teleri's first landfall city, the point of Aman nearest to Middle-earth; becomes a notable ship-haven again in later Ages
- **Taniquetil** — the tallest mountain in Arda, seat of Manwë and Varda (their halls, Ilmarin); the single highest, most awe-inspiring vista in the setting
- **Gardens of Lórien** — Irmo's domain of rest and dreams; quiet, contemplative beauty
- **Formenos** — Fëanor's fortress-treasury, built after his exile from Tirion — the one place in Valinor that isn't purely idyllic, quietly foreshadowing the tragedy to come

### 13.2 The Silmarils & the Exile of the Noldor (bridge campaign)

The direct sequel to the Great Journey and the direct prequel to the First Age — explains how the Noldor end up back in Middle-earth at all. Elf-only content (other races don't exist yet), and the one campaign where **kindred matters most**: Vanyar, Noldor, and Teleri experience it from very different angles. Macro-outcomes are canon-locked (Section 10); which path *your* character personally takes is the flexible part.

| # | Location / Beat | Story beat | Key Quest / Event |
|---|---|---|---|
| 1 | Tirion / Formenos | Melkor is released from Mandos; Fëanor forges the Silmarils; Melkor's lies sow discord between Fëanor and Fingolfin | Witness the assembly where Fëanor draws his sword on Fingolfin — first violence among the Eldar in Aman; reaction branches by the player's own kindred |
| 2 | Ezellohar (Valmar) | Melkor and Ungoliant destroy the Two Trees — the Darkening of Valinor | Defend/witness the attack; fails regardless (canon-locked) — the light of Arda is diminished forever |
| 3 | Formenos | Melkor murders Finwë and steals the three Silmarils, then flees Aman | Arrive too late to save Finwë — first kin-death among the Noldor |
| 4 | Tirion | Fëanor swears the Oath and calls the Noldor to leave Valinor in pursuit | **Choice point:** join the rebellion, or refuse and stay (natural exit for Vanyar and reluctant Noldor/Teleri) |
| 5 | Alqualondë | **The Kinslaying** — Fëanor's host tries to seize the Teleri's ships by force | Playable from multiple angles by kindred: fight, refuse to fight, or defend (Teleri); canon outcome (many Teleri slain, ships seized) stays fixed |
| 6 | Araman (northern wastes) | The Herald of Mandos delivers the Doom of the Noldor (prophecy of doom) | **Choice point:** Finarfin and part of the host turn back and are pardoned — a real branch for the player's own path |
| 7 | Losgar | Fëanor burns the ships, abandoning Fingolfin's host on the wrong shore | Witness/react to the betrayal |
| 8 | The Helcaraxë (Grinding Ice) | Fingolfin's host crosses the deadly ice on foot | Survival-trek content, high attrition; canon losses (e.g. Elenwë) stay fixed |
| 9 | Mithrim / Drengist (Middle-earth) | Landing in Middle-earth; Dagor-nuin-Giliath (Battle Under Stars) — Fëanor dies fighting Balrogs | Campaign closes; feeds directly into the First Age map (13.3) |

**Kindred availability, resolved:** Vanyar (and any Noldor/Teleri who take the "stay behind" or "turn back with Finarfin" branch at beats 4 and 6) don't follow the exile into Middle-earth — which is canon-accurate, not a gap. Their First Age plays out almost entirely inside the Valinor hub (13.1): Beleriand's wars and tragedies reach them only as news — messenger quests, lore-codex entries, narrated interludes — never as personally-fought battles. This isn't a lesser track: it converges with everyone else at the true climax. Both the Vanyar/loyalist Noldor (as the **Host of Valinor**) and the Teleri (lending their ships — still the only people with the fleet to do it) get a real, active, canon-accurate role in the **War of Wrath** campaign — that's when the two tracks reunite and everyone crosses to Middle-earth together. See 13.3 for what the stay-behind track looks like in practice.

### 13.3 First Age — Beleriand

**Hub Cities**
- Doriath (Menegroth) — Thingol & Melian's hidden kingdom, protected by the Girdle of Melian
  *Quest: "Girdle's Edge" — investigate a weakening point in Melian's protective barrier at the border*
- Nargothrond — Finrod's underground city on the river Narog
  *Quest: defend the hidden entrance after Angband scouts pick up its trail*
- Gondolin — Turgon's hidden city, within the Echoriath (Encircling Mountains)
  *Quest: deal with an outsider who's stumbled onto the secret path in*
- Hithlum — Noldor territory: Barad Eithel (Fingolfin/Fingon) & Dor-lómin (House of Hador)
  *Quest: repel a raiding party testing the border defenses*
- Havens of the Falas — Brithombar & Eglarest, Círdan's ports
  *Quest: aid refugees arriving by ship / assist Círdan's shipwrights*
- Himring — Maedhros's hill-fortress, East Beleriand
  *Quest: scout Easterling movement along the eastern march*
- Nogrod & Belegost — Dwarf cities in Ered Luin
  *Quest: commission a weapon/armor piece from a Dwarf-smith (ties into the Smith class & Reforge system, Section 9)*

**Wilderness / Dungeon (named)**
- Nan Dungortheb (Valley of Dreadful Death) — giant-spider territory near Doriath's northern border
  *Quest: clear/thin a spider-brood threatening a trade route*
- Taur-nu-Fuin (formerly Dorthonion) — corrupted forest after the Dagor Bragollach
  *Quest: rescue a traveler lost in the corrupted woods*
- Amon Rûdh — Túrin's outlaw hideout (Bar-en-Danwedh)
  *Quest: assist, or clash with, Túrin's outlaw band*
- **+ generic wilderness pockets** around every hub and route (per 13.0) for hunting/gathering/small quests

**Orc/Evil Stronghold**
- Angband — Morgoth's main fortress
  *Quest: the era's ultimate raid — endgame dungeon*
- Thangorodrim — the peaks above Angband
  *Quest: high-risk climb, extension of the Angband raid*
- Tol-in-Gaurhoth — the werewolf island, formerly Finrod's watchtower Minas Tirith, seized by Sauron
  *Quest: rescue captives held on the island (echoes the fall of Finrod's watchtower without overwriting his own canon fate)*

**Signature war-event**: War of Wrath (with the Dagor Bragollach and Nirnaeth Arnoediad as build-up story beats) — its own replayable campaign per Section 10; ends with the drowning of Beleriand.

**The Stay-Behind Track (Vanyar / loyalist Noldor / Teleri, playing the same "First Age" period from Valinor):**
- *"News from the North"* — a recurring messenger-quest chain relaying major Beleriand events (Dagor Bragollach, Nirnaeth Arnoediad, the Fall of Gondolin) as narrated interludes; the player isn't present for them, but always returns to their own Valinor-based task afterward
- *"Tending the Exiles' Kin"* — small in-hub quests comforting/aiding those in Valinor with kin fighting in Middle-earth
- *"The Petition"* — late campaign: supporting the diplomatic effort that eventually moves the Valar to act (built around, but not usurping, Eärendil's own named journey)
- *"The Host of Valinor"* — closing quest of this track: boarding the (Teleri-crewed) fleet, the transition directly into the War of Wrath campaign, where both tracks reunite

## 14. Elf Legacy System

Because an Elf is the same persistent character for the whole game, staying "just a common soldier/citizen" forever across four Ages would undersell that. This mechanic is Elf-exclusive — mortals get their equivalent through the Reclass/account-profile carryover (Section 9), since they don't persist as one identity.

**How it's earned:** completing campaigns, taking part in signature war-events, and specific personal story choices (which side of the Kinslaying you were on, whether you sailed with the Host of Valinor, etc.) all feed a cumulative **Legacy** track tied to that one persistent Elf identity — separate from the account-wide profile in Section 3, since it belongs to the character, not the account.

**Rewards:**
- **Titles + stat points** — completing each campaign or major event grants both a Title (flavor name + small permanent passive bonus — e.g. *"The Wise"* for accumulated knowledge across ages → utility bonus, *"Unstained"* for never taking part in the Kinslaying → standing with Teleri NPCs, *"Veteran of the Wrath"* for fighting in the War of Wrath → combat bonus) **and** allocatable stat points, on top of normal level-up progression
- **Standing** — high Legacy unlocks unique dialogue with named canon lords and exclusive quest access
- **Capstone questline — "High King of the Elves in Middle-earth":** a real lore distinction makes this work without breaking canon-lock. Gil-galad's actual title is *High King of the Noldor* (in Middle-earth specifically) — the true *High King of all the Elves*, everywhere, is Ingwë, who never leaves Valinor and never relinquishes it. No named figure ever holds an overarching title uniting *all* Middle-earth's Elven realms (Lindon, Rivendell, the Woodland Realm, Lothlórien) as one — after Gil-galad falls at the Last Alliance, Elrond, Círdan, Thranduil, and Galadriel/Celeborn each simply remain independent rulers of their own domain. That gap is real, and it's where the capstone lives:
  - **While Gil-galad lives (Second Age):** highest attainable rank is **Wakil/Deputy** — his most trusted lieutenant, acting on his authority, without holding his title.
  - **After Gil-galad falls:** a high-Legacy character can pursue being acknowledged, across the scattered Elven realms, as **High King of the Elves in Middle-earth** — a paramount, respected figure earned through accumulated Legacy, not an administrative ruler replacing Elrond/Thranduil/Galadriel-Celeborn in their own domains. They keep their thrones; this is recognition *above* the fragmented landscape, not control *over* it.
- **Elf-exclusive titles:** Titles earned from Elf-only content (the Great Journey, 13.1; the Silmarils & Exile, 13.2 — both set before other races exist) are naturally restricted to Elf characters, since no other race could have been present for them.

**Playing Vanyar and never leaving Valinor, the whole game:** a completely legitimate, even lore-fitting choice — Vanyar are characteristically the most content of the Eldar, least restless, closest to the Valar. A long peaceful life at Valmar isn't a lesser playthrough, it's in-character. Legacy still accrues, just along a different flavor (wisdom/art/spiritual rather than combat/political) — the Vanyar-specific titles and the Stay-Behind Track (13.3) are built around exactly this.

**Playing Vanyar or Teleri and wanting Middle-earth adventures anyway:** the **War of Wrath** campaign is the entry point — after it, the character can simply choose to remain in Middle-earth for Second/Third/Fourth Age content (the same choice many Noldor and Sindar historically made rather than sailing back West), instead of returning home. Valinor stays available the whole time as the Standing Hub (13.1) — a teleport away, any time, purely to rest and enjoy the view — without that being the only option.

## 15. Character Select, Save Slots & Death/Respawn

### 15.1 Character Select UI: Continue or Fresh Start

At the campaign-transition prompt, there are two options — not three:

- **Continue** — the same account-profile thread keeps going. Auto-rename suggested (e.g. "Lukman" → "Lukman II"), appearance carried over, both editable. Here you also choose to keep the same race/class, or **Reclass** into a different one (Section 9). If you Reclass — e.g. Man → Hobbit — every accumulated achievement, stat, and piece of gear converts into the new race/class, and the old race identity is simply gone; it isn't kept anywhere as a separate copy. Wanting to be a Man again later means starting a Fresh Start instead, not reviving the old one.
- **Fresh Start** — a genuinely new, independent slot from zero, no relation to the continuing thread at all (Section 15.2).

### 15.2 Multiple Character Slots

The account can hold several independent character slots side by side, not just the one continuous "persistent Elf across every Age" playthrough. Each slot has its own self-contained profile, progression, and campaign history (Section 3), fully separate from the others — no shared wealth, gear, or Legacy between slots. This is how you'd run, say, a parallel "what if I played a Dwarf in the First Age" story alongside your main Elf run, without the two touching each other. Exact slot cap TBD (a handful, not unlimited, is the usual convention).

### 15.3 Death & Respawn

Free save-anywhere (Section 3) is the primary safety net — reloading a manual save only costs the time since that save, nothing more. On top of that:
- **Autosave** triggers on entering a new hub, wilderness zone, or dungeon — a fallback for anyone who forgot to save manually.
- **Respawn point on death:**
  - Open wilderness → the nearest hub/settlement, or the zone's entry waypoint if no hub is close by
  - Cave/dungeon → the dungeon's entrance, not deep inside — forces a re-approach without wiping the whole zone's progress
- **No permanent penalty** — death costs time (whatever happened since the last save/autosave), not items, stats, or XP. Keeps the game story-forward rather than punishing.

## 16. Combat, Stats & Equipment (Perfect World-style)

Defines the stat points, skill points, and combat math referenced in Sections 6, 9, and 14.

### 16.1 Core Stats — four, not six

| Stat | Effects |
|---|---|
| **VIT** | Max HP, HP regen |
| **MAG** | Max MP, magic attack power, magic defense |
| **STR** | Physical attack power, physical defense |
| **DEX** | Critical hit chance, accuracy, evasion, small attack-rate bonus |

*(Revised down from the earlier 6-stat draft — Wisdom/Charisma/Perception are dropped; their jobs fold into MAG, DEX, and class skills/Legacy instead.)*

### 16.2 Physical vs. Magic — the core split

Every class, weapon, and enemy is fundamentally Physical or Magic.

- **Basic/regular attacks are always Physical** — governed by STR (power, defense) and DEX (crit, accuracy, evasion, minor attack-rate), using the weapon's Physical Attack value. True even for casters wielding magic weapons: spamming the basic attack with a staff or harp still deals physical damage.
- **Skill damage follows the class/weapon, not a universal rule.** Physical classes' skills (Warrior, Ranger, Smith, Skirmisher, Captain) are Physical damage too — same STR/DEX pipeline as their basic attack, nothing about them is magic. Only Magic classes' skills (Loresinger, Herbmaster/Healer, Summoner), cast with a magic weapon, produce Magic damage. "Magic only comes from skills" describes where magic damage originates — it doesn't mean skills are magic by default.
- **Magic damage** (Magic-class skills only) is governed by MAG, using the weapon's Magic Attack value, and always requires a cast time + cooldown — never spammable.
- **Hit/miss:** only Physical attacks can miss — accuracy (DEX) vs. evasion (DEX/armor). Magic attacks always land — no accuracy roll, just its Magic Attack value — the tradeoff is the cast-time/cooldown gate instead of a miss chance.
- **Crit:** both Physical and Magic attacks can critically hit.
- **Why Heavy-armor tanks hold up against magic enemies despite low Magic DEF:** every enemy's basic attack is Physical too, whatever the enemy's own type — magic damage only lands when that enemy fires a skill, which is cooldown-gated. A tank eats mostly physical chip damage with occasional magic bursts, not a constant magic barrage.

### 16.3 Armor — 3 types

| Armor | Physical DEF | Magic DEF | Bonus | Fits |
|---|---|---|---|---|
| Heavy | High | Low | Small VIT bonus | Warrior, Smith, Captain |
| Light | Medium | Medium | Small evasion + speed bonus | Ranger, Skirmisher |
| Robe | Low | High | Small MAG bonus | Loresinger, Herbmaster/Healer, Summoner |

*(On a stat-panel: "Element Resistance" from a typical MMO reference sheet just becomes Magic Defense here — no separate elemental-resist layer.)*

### 16.4 Weapons

Every weapon has exactly two stats — an **Attack value (range)** and an **Attack Rate** — nothing else. Crit, accuracy, evasion, and defense all come from character stats and armor, never from the weapon itself.

**Two categories:**
- **Physical weapons** (melee & ranged) — Physical Attack value only. **No Magic Attack field exists on these at all** — Physical classes never deal magic damage, not even through skills (16.2), so there's nothing for a second value to do.
- **Magic weapons** (staff, harp/horn, talisman) — carry *both* values, but asymmetrically: **Physical Attack is minimal** on every magic weapon regardless of archetype (it only exists to make the basic attack function, not to compete), while **Magic Attack is high** — that's where all of a magic weapon's real power sits.

**Speed archetypes** (apply within either category):

| Archetype | Attack range (example) | Attack rate (example) | Feel |
|---|---|---|---|
| Heavy/slow | 100–500 | 0.8/sec | Big hits, high variance, burst |
| Balanced | 200–300 | 1.0/sec | Even, no strong tradeoff |
| Fast/light | 150–200 | 1.25/sec | Frequent, low-variance, sustained |

*(For magic weapons, the archetype's range/rate numbers describe the Magic Attack value — the Physical Attack side stays minimal across all three archetypes, per above.)*

**Basic weapon types & class access** (first pass — the full unique-weapon list comes later):

| Weapon | Category | Archetype | Classes |
|---|---|---|---|
| Sword | Physical | Balanced | Warrior, Captain |
| Spear | Physical | Heavy/slow | Warrior |
| Axe | Physical | Heavy/slow | Warrior |
| Hammer | Physical | Heavy/slow | Smith |
| Mattock | Physical | Heavy/slow | Smith |
| Dagger | Physical | Fast/light | Skirmisher, Herbmaster (backup) |
| Sling | Physical (ranged) | Fast/light | Skirmisher |
| Bow | Physical (ranged) | Balanced | Ranger |
| Staff | Magic | Balanced | Loresinger, Herbmaster/Healer, Summoner |
| Harp/Horn | Magic | Fast/light | Loresinger |
| Talisman | Magic | Fast/light | Summoner |

### 16.5 Enemies

Every enemy is base-typed Physical or Magic the same way classes are (16.2) — basic attacks Physical, with each enemy's unique kit (special/skill attacks) layered on top of that base, whether it's a common wilderness beast or a named boss.

### 16.6 Leveling

- Every level grants **3 stat points**, freely distributed across the four stats above, plus **1 skill point** spent in the character's class tree (staged unlock, per Section 7). Manual allocation, not automatic — consistent with race/class staying a free choice throughout this design.
- **Legacy-granted stat points** (Section 14) feed into this same pool — a bonus source, not a separate currency.
- Soft level cap: TBD during actual build/playtesting; a range like 50-60 is a reasonable starting target, tunable.

**EXP curve:** required EXP increases with level — flat growth makes late levels trivial once EXP income scales up, so it should ramp smoothly rather than jump arbitrarily:

`EXP to reach level (L+1) = BaseXP × L^1.5` (rounded to a clean number)

**Quest/kill EXP rewards scale with content tier, not a flat amount** — a Great Journey wilderness skirmish and an Angband raid boss shouldn't pay the same. Rewards are pegged roughly to the level a location/quest is designed around (matching the location tiers already mapped in Section 13), so grinding low-tier content stays progressively less efficient than tackling content at your current tier, keeping quests worth doing at every stage rather than trivial once over-leveled.

### 16.7 Accessories & Unique Items

**General slots (any class):**
- **2× Ring** — small flat bonuses: physical/magic attack, critical rate, etc.
- **1× Necklace** — accuracy, evasion, small physical & magic defense, etc.

**1× Unique Item slot (class-specific, one signature item per class):**

| Class | Unique Item | Effect |
|---|---|---|
| Warrior | Shield | Extra VIT, generates aggro/threat |
| Ranger | Quiver | Bonus DEX/crit on ranged attacks |
| Loresinger | Songbook | Boosts song-skill potency/radius |
| Herbmaster/Healer | Herb Pouch | Boosts healing output/cleanse potency |
| Smith/Artificer | Toolkit | Boosts Reforge effectiveness (Section 9), field-repair |
| Skirmisher | Cloak | Bonus stealth/evasion, crit from stealth |
| Captain | Banner | Team-wide buff |
| Summoner | Talisman Pouch | Extra summon capacity or summon stat boost |

## 17. Open Questions / Next Steps

- [ ] World map & locations, with quests/events attached per-location — Great Journey + First Age done; Second/Third/Fourth Age pending
- [ ] Lock engine choice (leaning Phaser/canvas, not yet final)
- [ ] Project name (seeds proposed, not yet picked)
