# Arda RPG — Skill System (Companion Doc)
*Companion to `arda-rpg-concept.md`. Full skill-tree structure and per-class skill lists live here — kept separate because this content is dense, still growing, and will feed a dedicated skill-building implementation pass on its own. The main doc still owns class identity, roles, and unique items (Sections 6, 7, 16.7 there).*

---

## 1. Structure (applies to every class)

- **Linear + capstone:** each class has **7 regular skills unlocked in a fixed order + 1 capstone** (8 total) — no branching/spec choice within a tree. Build variety comes from free race/class combination and Reclass instead, not from tree choices.
- **Unlock gate:** skill *N+1* becomes available once skill *N* is Rank 1+. Once unlocked, points can go into ranking up any already-unlocked skill — no need to fully max one before moving on.
- **Active / Passive split:** of the 7 regular skills, **5 are Active and 2 are Passive** (always-on, no action-bar slot, no MP/cast/cooldown). The capstone is always Active. → **6 Active + 2 Passive per class**, every time — keeps the schema consistent for implementation.
- **Ranks:** regular skills max at **Rank 5**; the capstone maxes at **Rank 3**. Rank 1 sets the skill's core effect; Ranks 2+ scale it numerically (more damage/duration/lower cooldown) — never a different effect. Keeps every skill readable on a small screen.
- **Capstone gate:** unlocks once all 7 regular skills are Rank 1+ (TBD: possibly also a level floor, e.g. Lv30+ — tunable at balancing pass).
- **Point math:** 7×5 + 3 = **38 points to fully max a tree**. Since the level cap (~50-60) grants more skill points than that, points earned after a tree is maxed **auto-convert to bonus stat points** — nothing wasted late-game.

## 2. Action Bar (combat)

- **4 active slots** at a time, drawn from the class's 6 learned Active skills (2 Passives are always on, no slot needed).
- **Loadout freely swappable outside combat** (menu/safe zones, no cost) — every learned skill stays useful, just rotated in by situation.

## 3. Resource Cost, Cast Time & Damage Philosophy

- **Physical skills:** small MP cost + a **short, proportional cast/wind-up time** (roughly 0.2–1.0s, scaled to how "heavy" the skill's animation should feel — a jab is near-instant, a big AoE swing has a beat of wind-up) + cooldown. Never as instant as the basic attack, never as long as a Magic cast.
- **Magic skills:** higher MP cost + **longer cast time** (roughly 1.0–2.5s) + cooldown. To partly offset that extra gate and the deliberately-weak Magic basic attack, Magic cooldowns run comparatively **shorter** than Physical skills of equivalent tier — Physical wins on free/spammable basic-attack tempo, Magic wins on how often its main tool comes back up.
- **Magic damage premium:** every Magic class in the roster leans support/hybrid — there's no pure damage-mage (Loresinger, Herbmaster/Healer, Summoner all split their kit across damage/support/passive). As compensation, **Magic skill damage trends noticeably higher per-hit than Physical skill damage of equivalent tier** — that's the payoff for cast time, a weak basic attack, higher MP cost, and a kit that can't be 100% damage-focused anyway.
- **Passive skills:** no MP, no cast time, no cooldown — permanently on. **One deliberate exception:** Warrior's Ironhide (4.1) has an emergency-heal trigger, which needs its own cooldown to avoid proc-looping at low HP — the only passive in the game with a CD.
- **Party-wide effects have no range limit:** wherever a skill's effect says "party" or "1 party," every current party member gets it, full stop — no proximity requirement, no line-of-sight check.
- **Crit damage baseline:** a normal critical hit deals **+100% damage (double)** unless a skill explicitly overrides it. Skirmisher's Assassinate (4.6) is the one override on record — **+200% (triple)** when its guaranteed crit lands.
- **Capstone active-window standard:** so every class's ultimate feels comparably "worth it," capstone effect durations follow two tiers — **"burst/near-invulnerable" style** (a short window of being hard to kill or hitting far above normal, e.g. Warrior/Captain/Summoner) runs **6–8s**; **"party-wide buff" style** (stat buffs without a bodily invulnerability component, e.g. Loresinger/Smith/Healer) runs a bit longer at **10–12s**, since it's less swingy per second. Instant-burst capstones with no window (e.g. Skirmisher's single big hit) don't need a duration at all.
- **Animation note:** this is not a high-end-graphics game — every skill should read as **one simple beat** (a swing, a flash, a short particle puff), not a multi-stage spectacle. Design the effect description with that single readable animation in mind, not the effect first and the animation as an afterthought.

All specific numbers (MP, cast time, cooldown, damage%) below are **illustrative/shape-only** — real values come at the balancing pass. What matters now is relative weight (cheap+fast vs. expensive+strong) and role fit.

---

## 4. Per-Class Skill Lists

### 4.1 Warrior
*(Physical, STR/DEX, Heavy armor, front-line melee — unique item: Shield)*

| # | Skill | Type | MP | Cast | CD | Effect (Rank 1) |
|---|---|---|---|---|---|---|
| 1 | Bash | Active | 5 | 0.2s | 4s | STR strike, chance to stagger (brief interrupt) |
| 2 | Cleave | Active | 10 | 0.4s | 8s | Frontal-arc hit, multiple enemies |
| 3 | Guard Stance | **Passive** | – | – | – | Always-on: +Physical DEF & threat generation while in melee |
| 4 | Rending Strike | Active | 10 | 0.3s | 10s | Physical bleed (damage over time) |
| 5 | Ironhide | **Passive** | – | – | – | Always-on: +Max HP%. **+ CD 10min:** when HP drops to 5%, instantly heals 25% of Total HP (this skill's one exception to "passives have no CD") |
| 6 | Shield Slam | Active | 15 | 0.5s | 14s | Stun (primary target) + high threat generation. **+** stun now also hits additional enemies in a frontal area |
| 7 | Whirlwind | Active | 20 | 0.8s | 18s | AoE spin, hits all nearby enemies |
| 8 (capstone) | Last Stand | Active | 25 | 0.6s | 60s | Near-unkillable window (8s) + harder-hitting counterattacks |

### 4.2 Ranger
*(Physical, ranged/wilderness/tracking, Light armor — unique item: Quiver)*

| # | Skill | Type | MP | Cast | CD | Effect (Rank 1) |
|---|---|---|---|---|---|---|
| 1 | Quick Shot | Active | 5 | 0.2s | 3s | Fast bow shot, small bonus damage over basic attack |
| 2 | Multi-Shot | Active | 10 | 0.4s | 8s | Arrow spread, hits multiple targets. **+** applies a poison DoT, small damage over 5s |
| 3 | Hawk's Eye | **Passive** | – | – | – | Always-on: +accuracy & crit chance with bow |
| 4 | Piercing Arrow | Active | 12 | 0.5s | 10s | Line-pierce shot, hits target + one behind it |
| 5 | Camouflage | **Passive** | – | – | – | Always-on: +evasion when not attacking for a few seconds (self). **+** same evasion bonus extends to the whole party — Ranger's only party-benefiting skill otherwise |
| 6 | Disabling Shot | Active | 15 | 0.4s | 14s | Leg-shot: roots/slows the target briefly |
| 7 | Volley | Active | 18 | 0.6s | 16s | Arrow rain over an area — good vs. groups |
| 8 (capstone) | Storm of the Wild Hunt | Active | 25 | 0.7s | 60s | Wide-zone arrow barrage (instant) + self attack-rate buff (10s) |

### 4.3 Loresinger
*(Magic, song/lore buff-debuff — not a fireball-mage — Robe armor — unique item: Songbook)*

| # | Skill | Type | MP | Cast | CD | Effect (Rank 1) |
|---|---|---|---|---|---|---|
| 1 | Note of Courage | Active | 15 | 1.0s | 12s | Party-wide small ATK buff (song) |
| 2 | Dissonant Chord | Active | 20 | 1.2s | 10s | Magic damage burst + brief enemy ATK debuff |
| 3 | Lore of Old | **Passive** | – | – | – | Always-on: +Magic ATK%. **+** also +Physical ATK%; applies to self and the whole party |
| 4 | Ballad of Swiftness | Active | 18 | 1.0s | 16s | Party-wide attack-rate/move-speed buff |
| 5 | Harmony's Ward | **Passive** | – | – | – | Always-on: +Magic DEF. **+** also +Physical DEF; applies to self and the whole party |
| 6 | Mocking Verse | Active | 15 | 0.8s | 12s | Single-target DEF/accuracy debuff. **+** also reduces All DEF%, Accuracy%, ATK-Rate%, and Evasion% on that same target |
| 7 | Dirge of Sorrow | Active | 30 | 1.8s | 20s | Strong single-target magic damage + brief weaken |
| 8 (capstone) | Anthem of Valinor | Active | 40 | 2.0s | 75s | Party-wide ATK/DEF/MAG buff (12s) + magic damage pulse to nearby enemies (instant). **+** the buff now raises *every* stat %, no exceptions; adds a HoT for the duration (smaller than Healer's dedicated HoTs); cleanses existing debuffs on cast and grants debuff immunity for the duration — all of it party-wide |

*Note the damage premium in practice: Dirge of Sorrow (30 MP, single-target) hits meaningfully harder than Warrior's Shield Slam or Ranger's Piercing Arrow at a comparable MP/CD tier — that's the Magic-damage payoff described in Section 3.*

### 4.4 Herbmaster / Healer
*(Magic, herb-lore + chant healing, Robe armor — unique item: Herb Pouch)*

| # | Skill | Type | MP | Cast | CD | Effect (Rank 1) |
|---|---|---|---|---|---|---|
| 1 | Athelas Touch | Active | 15 | 1.0s | 8s | Single-target heal — core bread-and-butter skill |
| 2 | Cleansing Chant | Active | 15 | 1.0s | 12s | Removes a debuff/DoT from target |
| 3 | Herbal Wisdom | **Passive** | – | – | – | Always-on: +healing effectiveness% |
| 4 | Regrowth | Active | 18 | 1.2s | 14s | Heal-over-time on a target |
| 5 | Nature's Blessing | **Passive** | – | – | – | Always-on: +HP regen%. **+** applies to the whole party, not just nearby allies |
| 6 | Thorned Ward | Active | 20 | 1.3s | 16s | Barrier on an ally that damages attackers who hit it |
| 7 | Wrath of the Earth | Active | 25 | 1.5s | 14s | Nature-magic damage burst — the class's one real offensive tool, solo self-sufficiency |
| 8 (capstone) | Athelas Bloom | Active | 40 | 2.0s | 70s | Party-wide heal + cleanse (instant) + regen buff (10s). **+** also throws up a short Thorned-Ward-style barrier on the party; once that barrier ends, it leaves a 3s HoT behind — all of it party-wide, no range limit |

### 4.5 Smith / Artificer
*(Physical, Hammer/Mattock, Heavy armor, field crafting + party gear buffs — unique item: Toolkit)*

| # | Skill | Type | MP | Cast | CD | Effect (Rank 1) |
|---|---|---|---|---|---|---|
| 1 | Hammer Strike | Active | 5 | 0.2s | 4s | Empowered melee hit, filler skill |
| 2 | Sunder Armor | Active | 10 | 0.3s | 10s | Reduces target's Physical DEF |
| 3 | Sturdy Build | **Passive** | – | – | – | Always-on: +Physical DEF% (self) |
| 4 | Overcharge Strike | Active | 15 | 0.6s | 12s | Charged heavy hit, big single-target damage |
| 5 | Battle Mending | **Passive** | – | – | – | Always-on: small HP regen aura. **+** applies to the whole party, not just nearby |
| 6 | Forge Blessing | Active | 18 | 0.8s | 16s | Party-wide temporary Physical ATK buff (field-enchant weapons) — no range limit |
| 7 | Ground Slam | Active | 20 | 0.8s | 18s | AoE hammer slam, knockback + damage |
| 8 (capstone) | Artificer's Triumph | Active | 25 | 0.7s | 60s | AoE knockdown (instant) + party-wide ATK/DEF buff (12s). **+** knockdown zone also applies Slow, Slow ATK-Rate, Confuse, and Stun to enemies caught in it; the ATK portion of the party buff now covers both P-ATK and M-ATK |

### 4.6 Skirmisher
*(Physical, Dagger/Sling, Light armor, agility/stealth/traps — unique item: Cloak)*

| # | Skill | Type | MP | Cast | CD | Effect (Rank 1) |
|---|---|---|---|---|---|---|
| 1 | Quick Stab | Active | 5 | 0.15s | 3s | Fast dagger jab, filler skill |
| 2 | Backstab | Active | 10 | 0.3s | 8s | Bonus damage & crit chance from behind/stealth |
| 3 | Shadow Step | Active | 12 | 0.2s | 12s | Short dash behind target or out of danger |
| 4 | Vanish | Active | 15 | 0.2s | 20s | Brief invisibility |
| 5 | Poisoned Blade | **Passive** | – | – | – | Always-on: chance to apply poison DoT on hit |
| 6 | Nimble Reflexes | **Passive** | – | – | – | Always-on: +evasion%. **+** small +ATK-Rate% — assassin archetype should hit fast, not just dodge well |
| 7 | Caltrops | Active | 15 | 0.3s | 14s | Drops a trap that roots/damages enemies who step on it |
| 8 (capstone) | Assassinate | Active | 25 | 0.4s | 60s | Massive single-target burst, guaranteed crit from Vanish/stealth. **+** when it crits, bonus is +200% (triple) instead of the normal +100% (double) — see Section 3 |

### 4.7 Captain
*(Physical, Sword + Horn/Banner, Heavy armor, leadership/party buffs — unique item: Banner)*

| # | Skill | Type | MP | Cast | CD | Effect (Rank 1) |
|---|---|---|---|---|---|---|
| 1 | Rallying Strike | Active | 5 | 0.2s | 5s | Melee hit that also grants a small party ATK buff (party-wide, no range limit) |
| 2 | Battle Cry | Active | 12 | 0.4s | 12s | Party-wide ATK buff shout (no range limit) |
| 3 | Commanding Presence | **Passive** | – | – | – | Always-on: +threat generation; +party accuracy (no range limit) |
| 4 | Banner Plant | Active | 15 | 0.6s | 18s | Plants a banner: grants the whole party (no range limit) an **All DEF%** buff for its duration — Captain's dedicated defense buff, distinct from Battle Cry's ATK and Flanking Order's Crit below |
| 5 | Iron Will | **Passive** | – | – | – | Always-on: +Physical DEF% & crowd-control resistance (self only — this one's a personal survivability tool, not a party buff) |
| 6 | Inspiring Shout | Active | 15 | 0.5s | 16s | Small party heal/cleanse (no range limit) — rallies wounded allies |
| 7 | Flanking Order | Active | 18 | 0.5s | 16s | Party-wide crit chance buff (no range limit) |
| 8 (capstone) | War Horn's Call | Active | 25 | 0.6s | 60s | Self-invuln + party ATK/DEF/Crit/ATK-Rate buff + light-infused weapons + calls 4 Guardsmen — **full breakdown below** |

**War Horn's Call, in full** (grown across a few rounds of design, worth spelling out):
- **Self-invulnerability:** 8s
- **Party-wide buff:** ATK/DEF/Crit/ATK-Rate, 12s, no range limit
- **Light-infused weapons:** for that same 12s, every party member's attack adds a bonus Magic-damage tick worth ~15% of their own ATK, on top of the normal hit
- **Calls 4 Guardsmen** (2 Swordsmen + 2 Archers) — full armor/gear matching the Captain's own race, basic-attack only (no skills), stats = **25% of the Captain's own**, lasting 12s. Weaker and shorter-lived than any Summoner creature by design — a one-shot capstone burst, not a persistent core mechanic like Summoner's roster, so it doesn't step on Summoner's "army of one" identity.
- Guardsmen count as temporary party members for the duration, so they're swept into the buff and light-infusion effects above too.

### 4.8 Summoner
*(Magic, support-via-proxy — Robe armor — unique item: Talisman Pouch)*

#### 4.8.0 Balance Rules

Late-game, a Summoner with 2 active summon slots is effectively **3 bodies on the field** (MC + 2 summons) — so per-unit power has to be kept deliberately low or the class breaks party math. Locked rules:

- **Calling a creature *is* the skill** — with 5 summon types, that's already 5 of the 7 regular skill slots. The Summoner does not additionally have a personal "attack skill"; the standard basic attack (per Section 3, every class has one) covers personal combat, and it's deliberately the weakest basic attack of all 8 classes.
- **No summon's attack value (basic or skill) may ever exceed** the Summoner's own value, any other class's value, or any NPC companion's value. Summons are always the weakest individual unit on the field.
- **Stat derivation — every summon inherits from the Summoner's current stats:**
  - **HP: 50%** of Master's Max HP
  - **ATK: 50%** of Master's **Magic ATK** — for *every* summon, regardless of visual flavor (claw/root/talon/peck/ripple are animation only, not a separate damage pipeline). Deriving physical-flavored summons from Master's Physical ATK instead was considered and dropped: Summoner invests almost nothing in STR as a Magic class, so that pool would sit near-zero and need artificial multi-hundred-percent passive multipliers just to compensate — one consistent M-ATK-based rule is simpler and avoids that hack entirely.
  - **All summon damage counts as Magic-type** for defense/hit purposes (checked against enemy Magic DEF). That also means, per the existing Physical-vs-Magic split (concept doc Section 16.2, "Magic attacks always land"), **summon attacks never miss** — no accuracy roll needed on top of the 50% ATK/HP nerf and 100% DEF/Accuracy already applied. One rule, no separate miss-chance system just for summons.
  - **All DEF (Physical + Magic): 100%** of Master's
  - **Accuracy, Evasion, Crit, etc.: 100%** of Master's
  - Individual summons can further multiply their own HP/ATK/DEF via their own Passive skill (see Ent and Beorning below) — that multiplier applies *after* the base % derivation above.
- **Summons carry no MP** — their skills are gated by Cooldown only, never a resource cost.
- **Every summon effect (damage scaling, heals, buffs, debuffs) is expressed as a percentage**, never a flat number — keeps everything readable and keeps summons scaling cleanly with the Summoner's own growth.
- **Each summon gets exactly 3 fixed skills** — 1 Attack, 1 Support, 1 Passive — auto-scaling with the Summoner's stats. No separate skill-point economy for summons; only the Summoner's own 7+1 tree below spends the player's points.

#### 4.8.1 Summoner's Own Skill Tree

Unlock order runs **weakest → strongest summon** (Bird first). Nicely, this also lines up with lore: Beorning only exists from the mid-Third Age onward anyway (concept doc Section 7), so putting it last means a player usually can't even reach that unlock before an era where it makes sense.

| # | Skill | Type | CD | Effect (Rank 1) |
|---|---|---|---|---|
| 1 | Call Bird | Active | 10s | Summons a Bird |
| 2 | Call Spirit | Active | 12s | Summons a Spirit |
| 3 | Call Great Eagle | Active | 16s | Summons a Great Eagle |
| 4 | Call Ent | Active | 20s | Summons an Ent |
| 5 | Call Beorning | Active | 20s | Summons a Beorning (bear) — *unlock requires mid-Third Age+ campaign* |
| 6 | Kinship Bond | **Passive** | – | Always-on, while ≥1 summon is active: Summoner gains +5% All DEF & +5% Evasion; all active summons heal 3% of their own Max HP every 3s |
| 7 | Wild Bond | **Passive** | – | Sets summon duration (20s baseline) and max simultaneous summons (starts at 1; higher ranks raise both, capping at 2 simultaneous by mid-game) |
| 8 (capstone) | Call of the Wild | Active | 90s | Summons **all 5** creature types at once (whichever are unlocked/era-available) for **8s**, then they vanish |

*MP costs intentionally omitted above — see 4.8.0: summons/calls aren't a place to double up resource gates, so Summoner's whole kit runs on Cooldown alone, same as its summons.*

#### 4.8.2 Summon Skill Lists

*(3 fixed skills each — Attack / Support / Passive — all effects in %, no MP, CD only)*

**Bird** — Support/Singer-lite *(weakest attacker in the roster by design — unlocked first)*

| Slot | Skill | Effect |
|---|---|---|
| Attack | Peck Flurry | Weak multi-peck hit (~50% of Bird's own ATK) |
| Support | Chirping Ward | Party-wide +5% to HP, MP, All DEF, All ATK, Accuracy, Crit, Evasion |
| Passive | Distracting Song | While Bird is active: enemies nearby suffer −5% to the same stat list (mirrors Support, aimed at enemies instead) |

**Spirit** — Healer-lite *(Goldberry-flavored river-spirit, not a named Maia)*

| Slot | Skill | Effect |
|---|---|---|
| Attack | Ripple | Weak magic pulse (~55% of Spirit's own ATK) — on hit, also heals the whole party 5% Max HP |
| Support | Renewing Waters | Heals a target 5% Max HP over 4s |
| Passive | River's Grace | Always-on: party within range regenerates 2% Max HP every 2s, and has debuffs/DoTs auto-cleansed every 8s |

**Great Eagle** — Aerial scout/damage

| Slot | Skill | Effect |
|---|---|---|
| Attack | Talon Dive | High damage (~160% of Eagle's own ATK) + knockback |
| Support | Wind's Eye | Reveals nearby map/hidden enemies, or carries a downed ally to safety |
| Passive | Keen Sight | Party-wide +detection radius & accuracy, +5% Crit chance |

**Ent** — Frontline/Tank

| Slot | Skill | Effect |
|---|---|---|
| Attack | Root Slam | Modest damage (~70% of Ent's own ATK), roots enemies in the area — control over raw damage |
| Support | Unshakeable Guard | Taunts nearby enemies, pulling their attention off the party |
| Passive | Deep Roots | Ent's own HP and All DEF ×120% *(applied after the 50%/100% base derivation in 4.8.0 — e.g. 50% HP → ×1.2 = effectively 60% of Master's HP)* |

**Beorning (bear)** — Bruiser/Warrior-lite *(mid-Third Age onward only, per concept doc Section 7)*

| Slot | Skill | Effect |
|---|---|---|
| Attack | Claw Swipe | High damage (~180% of Beorning's own ATK) — the hardest single hit of any summon |
| Support | Rally Growl | Party-wide +5% ATK |
| Passive | Ursine Fury | Beorning's own ATK ×120%, but All DEF only ×50% *(same "apply after base derivation" math as Ent — trades survivability for being the roster's best attacker; the ATK itself is still Magic-sourced/typed per 4.8.0, "Physical" here is animation flavor only)* |

---

## 5. AI & Combat Behavior

How skills actually get used by non-player entities — companions and enemies. This is what makes the threat-generation language already scattered through Section 4 (Guard Stance, Shield Slam, Commanding Presence) mean something mechanically.

### 5.1 Companion AI — Role-Based Reactive Priority

Every companion (and the Summoner's own summons, at a simplified scale) re-evaluates its action on a short tick using **3 priority tiers, checked top to bottom**:

1. **Emergency** — any ally (including self) below a critical HP threshold (~25-30%) and a heal/cleanse/defensive skill is available → use it now. Overrides everything below.
2. **Role-reactive trigger** — a small set of conditional skills tied to the companion's role (table below). If a trigger condition is currently true, use that skill.
3. **Default rotation** — nothing above applies → use the highest-tier learned Active skill that's off cooldown (capstone counts as top-tier here too, it just naturally comes up less often), falling back to basic attack if everything's on cooldown.

| Class | Role tag | Reactive trigger(s) (tier 2) |
|---|---|---|
| Warrior | Tank | Use a threat skill (Shield Slam/Guard Stance) if not currently the enemy's target |
| Ranger | DPS | — (default rotation covers it) |
| Loresinger | Support/Hybrid | Recast a buff if it's about to expire or inactive; Mocking Verse on the most dangerous enemy target |
| Herbmaster/Healer | Healer | Heal any ally below ~60% HP (non-emergency threshold); Cleanse on debuff |
| Smith/Artificer | Hybrid | Maintain Forge Blessing uptime; otherwise default rotation |
| Skirmisher | DPS | Backstab/Vanish opportunistically on an isolated or high-value target |
| Captain | Tank/Support | Use a threat skill if not currently the target; maintain Battle Cry/Banner Plant uptime |
| Summoner | Unique | Top priority: recast a Call skill whenever no summon is active or one's about to expire. Summons themselves run the same 3-tier logic independently at a simplified scale (their 3 fixed skills only) |

**Nice side effect:** tier-2 "dangerous target" triggers (Mocking Verse, CC-flavored skills) give companions a reason to react specifically to a boss's telegraphed wind-up (5.3) — interrupting or debuffing during that window, not just parsing a fixed rotation blind to what the enemy's about to do.

### 5.2 Threat / Aggro — Simplified Multiplier

No persistent per-enemy threat table. Instead:

- Every combatant has a **Threat Multiplier** stat, default **1.0×**.
- Skills/passives tagged "threat generation" raise it: **Guard Stance** (Warrior passive) ≈ ×2.0 while active; **Shield Slam** (Warrior active) adds a one-time large threat spike; **Commanding Presence** (Captain passive) ≈ ×1.5, self only. *(Illustrative — real values TBD at balancing pass, same as everything else.)*
- **Enemy targeting rule:** an enemy's target = whichever combatant has the highest (recent damage dealt × their Threat Multiplier), ties broken by proximity. No history ledger to maintain — just recent damage × multiplier, recalculated live.
- This is deliberately lighter than a classic MMO aggro table — a tank "pulls ahead" in the weighting without the game needing to track a running score per enemy per party member.

### 5.3 Enemy AI — Trash vs. Boss

- **Trash/regular enemies:** simple loop — mostly basic attack, occasional skill on cooldown, no telegraph beyond the skill's own cast time (Section 3). Targeting follows 5.2.
- **Boss enemies:** two additions on top of the trash baseline:
  - **Telegraph:** before a dangerous skill fires, a visible ~1-2s warning plays first (a wind-up flash, a ground marker) — gives the player/companions a real window to dodge, interrupt, or CC. Keep the telegraph itself simple (one readable cue, per the Section 3 animation note) — it's a warning, not a spectacle.
  - **Phases:** HP thresholds (e.g. 75/50/25%) that swap in a new skill or shorten cooldowns — a simple pool-swap or cooldown-multiplier, not a full separate boss redesign per phase.
- **Resource note:** enemies run on **cooldown only, no MP tracking** — simpler for the backend, and player-side MP management doesn't need an equivalent enemy-side system to matter. NPC companions, by contrast, share the player's own class kit and *do* use the same MP rules, since they're the same classes, just AI-piloted.

---

## 6. Open / Next Steps

- [x] All 8 classes drafted — Warrior, Ranger, Loresinger, Herbmaster/Healer, Smith/Artificer, Skirmisher, Captain (4.1–4.7), Summoner + all 5 summons (4.8)
- [x] Additive skill-detail pass — party-wide/no-range clarified, extra effects layered onto existing skills, Captain's Guardsmen reinforcement, crit-multiplier baseline
- [x] AI & Combat Behavior (Section 5) — companion reactive priority, simplified threat multiplier, trash vs. boss enemy design
- [ ] Numeric balancing pass — every MP/cast/CD/damage/threat-multiplier number in this doc is shape-only, not final; best done after a playable prototype exists, not in the abstract
- [ ] Skill animation references — once art direction (concept doc Section 11) firms up, pair each skill with a simple 1-beat animation cue
- [ ] Elf Legacy titles (concept doc Section 14) — not yet listed out
- [ ] Crafting profession details (concept doc Section 12 mentions Blacksmithing/Tailoring/Alchemy/Cooking as stubs) — not yet designed
