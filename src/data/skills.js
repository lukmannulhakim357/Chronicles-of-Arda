// Skill system (companion doc: arda-rpg-skills.md). Every class has a fixed
// 7-regular-skill + 1-capstone tree (8 entries), unlocked in order — no
// branching. 5 of the 7 regular skills are Active, 2 are Passive; the
// capstone is always Active (6 Active + 2 Passive per class, every time).
// Regular skills max at Rank 5, the capstone at Rank 3 — 7*5 + 3 = 38 points
// to fully max a tree. All MP/cast/cooldown/damage numbers below are
// illustrative/shape-only per the source doc — real balance comes later.

export const MAX_TREE_POINTS = 38;

// `kind` classifies the *primary* effect for the generic combat engine
// (combat/skillEngine.js) to resolve: 'damage' | 'dot' | 'heal' | 'hot' |
// 'buff' | 'debuff' | 'cc' | 'cleanse' | 'utility' | 'summon'. Several
// skills have secondary effects layered on in the doc (e.g. Shield Slam's
// stun *and* threat spike, Rallying Strike's hit *and* buff) — the engine
// resolves the primary kind only; compound multi-effect resolution is
// exactly the kind of detail the source doc defers to its own balancing
// pass (§6), not something to hand-simulate ahead of a real encounter.
function skill(id, name, type, opts) {
  return {
    id,
    name,
    type, // 'active' | 'passive'
    capstone: !!opts.capstone,
    mp: opts.mp ?? null,
    cast: opts.cast ?? null,
    cd: opts.cd ?? null,
    isMagic: !!opts.isMagic,
    target: opts.target ?? 'single',
    critMult: opts.critMult ?? 2,
    maxRank: opts.capstone ? 3 : 5,
    kind: opts.kind ?? (type === 'passive' ? 'passive' : 'damage'),
    effect: opts.effect,
    icon: opts.icon ?? null,
    damagePct: opts.damagePct ?? null,
  };
}

const a = (id, name, mp, cast, cd, target, effect, extra = {}) =>
  skill(id, name, 'active', { mp, cast, cd, target, effect, ...extra });
const p = (id, name, effect, extra = {}) => skill(id, name, 'passive', { effect, ...extra });
const cap = (id, name, mp, cast, cd, target, effect, extra = {}) =>
  skill(id, name, 'active', { mp, cast, cd, target, effect, capstone: true, ...extra });

export const SKILL_TREES = {
  warrior: [
    a('bash', 'Bash', 5, 0.2, 4, 'single', 'A hard shield-punch that staggers the target — a short white shock flashes on impact. Deals 100% ATK physical damage and briefly staggers the target (a flinch, not a full stun). Fast, cheap, and meant to be thrown often between bigger skills.', { kind: 'damage', icon: 'bash', damagePct: 1.0 }),
    a('cleave', 'Cleave', 10, 0.4, 8, 'frontal', 'A wide horizontal cut, arcing through everyone standing in front of the Warrior — two crossed blade-arcs flash at once. Deals 120% ATK physical damage to each enemy caught in the frontal swing; the tool for thinning a group rather than dueling one target.', { kind: 'damage', icon: 'doubleslash', damagePct: 1.2 }),
    p('guard_stance', 'Guard Stance', 'Always active while the Warrior is in melee range: +15% Physical DEF and +30% threat generation — a steady silver sheen along the shield arm — so hits land softer and enemies stay locked on the Warrior instead of the party behind them. No cast, no cooldown, it simply runs.', { tags: ['threat'], icon: 'shield' }),
    a('rending_strike', 'Rending Strike', 10, 0.3, 10, 'single', "A jagged cut that doesn't close clean — dark red droplets mark the wound. Deals 90% ATK physical damage on the hit, then an extra 3% ATK per second for 5 seconds as the bleed runs its course.", { kind: 'dot', icon: 'blooddrip', damagePct: 0.9, dotPct: 0.03, ticks: 5, tickSeconds: 1 }),
    p('ironhide', 'Ironhide', "Always active: +20% Max HP, worn like a second skin. Its one active trigger stays silent until needed — exception to \"passives have no cooldown\" — the instant HP drops below 5%, a golden flash of borrowed vitality snaps the Warrior back up for 25% of Max HP with no input required. That safety net can only fire once every 10 minutes.", { cd: 600, icon: 'heartshield' }),
    a('shield_slam', 'Shield Slam', 15, 0.5, 14, 'frontal', 'A shoulder-first slam that drives the shield in hard enough to daze anyone standing near the target too — a burst of white sparks on impact. Stuns the primary target and everyone in a small frontal area briefly, while spiking threat hard enough to rip attention off the rest of the party.', { kind: 'cc', tags: ['threat'], icon: 'bash' }),
    a('whirlwind', 'Whirlwind', 20, 0.8, 18, 'aoe', 'The Warrior plants their feet and spins the blade full-circle — a visible funnel of wind and steel whips outward from the swing, like a small tornado tearing through the fight. Deals 130% ATK physical damage to every enemy nearby, hit once per spin.', { kind: 'damage', icon: 'spiral', damagePct: 1.3 }),
    cap('last_stand', 'Last Stand', 25, 0.6, 60, 'self', "For 8 seconds the Warrior becomes almost impossible to put down — a golden dome of light slams down over them with a heavy thud, and three shockwave rings roll outward. While it holds, incoming damage is sharply reduced and every counter-swing hits noticeably harder, letting them anchor a fight nothing else could survive.", { kind: 'buff', icon: 'dome' }),
  ],
  ranger: [
    a('quick_shot', 'Quick Shot', 5, 0.2, 3, 'single', "A snap-draw shot loosed almost before the bow is fully raised — a single pale arrow streaks straight to the target. Deals 100% ATK physical damage; its short cooldown makes it the Ranger's default answer between bigger shots.", { kind: 'damage', icon: 'arrow', damagePct: 1.0 }),
    a('multi_shot', 'Multi-Shot', 10, 0.4, 8, 'aoe', 'Three arrows loose in a fan and a thin green film of poison rides the tips. Deals 80% ATK physical damage to each target hit, then an extra 3% ATK per second for 5 seconds as the poison works through their blood.', { kind: 'dot', icon: 'arrowfan', damagePct: 0.8, dotPct: 0.03, ticks: 5, tickSeconds: 1 }),
    p('hawks_eye', "Hawk's Eye", 'Always active: +10% accuracy and +8% crit chance with the bow — shots simply find their mark more often, no visible effect beyond how rarely they miss.', { icon: 'eye' }),
    a('piercing_arrow', 'Piercing Arrow', 12, 0.5, 10, 'line', "A single heavy-draw shot punches clean through the first body in its path — the arrow doesn't stop, it keeps flying in a straight line. Deals 140% ATK physical damage to the target and to one enemy standing directly behind it.", { kind: 'damage', icon: 'arrowline', damagePct: 1.4 }),
    p('camouflage', 'Camouflage', "Always active: after a few seconds without attacking, the Ranger fades into near-invisibility — +20% evasion — and the same cover extends to the whole party, not just whoever's standing next to them.", { target: 'party', icon: 'leafcloak' }),
    a('disabling_shot', 'Disabling Shot', 15, 0.4, 14, 'single', "A low shot aimed at the leg instead of center-mass — the target visibly staggers and slows on the hit. Roots or heavily slows the target for a few seconds; no damage, purely a lockdown tool.", { kind: 'cc', icon: 'chain' }),
    a('volley', 'Volley', 18, 0.6, 16, 'aoe', 'A short pause, then the sky answers — a dense rain of arrows drops over the target area, each one a thin white streak. Deals 110% ATK physical damage to every enemy caught underneath; best used on a cluster rather than a lone target.', { kind: 'damage', icon: 'arrowrain', damagePct: 1.1 }),
    cap('storm_of_the_wild_hunt', 'Storm of the Wild Hunt', 25, 0.7, 60, 'aoe', "The Ranger calls on the Hunt itself — the air over the target zone visibly churns, a dark funnel of wind gathering just before sixteen arrows punch down out of it all at once, like a tornado made of arrows. Deals 160% ATK physical damage to everything in the wide impact zone (instant, one big hit, not a channel), then the Ranger's own attack rate rises sharply for 10 seconds afterward.", { kind: 'damage', icon: 'stormcloud', damagePct: 1.6 }),
  ],
  loresinger: [
    a('note_of_courage', 'Note of Courage', 15, 1.0, 12, 'party', "A quick, bright verse — a handful of gold musical notes drift out over the party. Raises the whole party's Physical & Magic ATK by 12% for 10 seconds; no range limit, so it reaches the group wherever they're standing.", { isMagic: true, kind: 'buff', icon: 'noteup', buffPct: 0.12, buffDuration: 10, buffStat: 'pAtk' }),
    a('dissonant_chord', 'Dissonant Chord', 20, 1.2, 10, 'single', "A single harsh chord struck to jar the target rather than soothe — a burst of blue notes slams into them. Deals 130% Magic ATK damage and briefly lowers the target's own ATK for a few seconds afterward.", { isMagic: true, kind: 'damage', icon: 'noteburst', damagePct: 1.3 }),
    p('lore_of_old', 'Lore of Old', "Always active: a faint, constant hum of old songs raises the whole party's Magic ATK and Physical ATK by 8% each, no range limit — the Loresinger doesn't have to be actively singing for this one.", { target: 'party', icon: 'note' }),
    a('ballad_of_swiftness', 'Ballad of Swiftness', 18, 1.0, 16, 'party', "An upbeat, driving tune — notes trail behind the whole party like a following wind. Raises the party's attack rate and move speed by roughly 15% for 10 seconds, no range limit.", { isMagic: true, kind: 'buff', icon: 'notewind', buffPct: 0.15, buffDuration: 10, buffStat: 'atkRate' }),
    p('harmonys_ward', "Harmony's Ward", "Always active: a low protective drone runs under everything else the Loresinger plays, raising the whole party's Magic DEF and Physical DEF by 8% each, no range limit.", { target: 'party', icon: 'noteshield' }),
    a('mocking_verse', 'Mocking Verse', 15, 0.8, 12, 'single', 'A cruel, needling verse aimed squarely at one enemy — purple notes needle into them instead of a friendly gold. Lowers that target\'s DEF, accuracy, attack rate and evasion by roughly 15% for 8 seconds.', { isMagic: true, kind: 'debuff', icon: 'notedown', buffPct: -0.15, buffDuration: 8, buffStat: 'pDef' }),
    a('dirge_of_sorrow', 'Dirge of Sorrow', 30, 1.8, 20, 'single', "The Loresinger's heaviest single note — a long, mournful chord that lands with real weight, a dark-blue shockwave rippling out from the target. Deals 200% Magic ATK damage and leaves the target weakened for a few seconds after.", { isMagic: true, kind: 'damage', icon: 'noteskull', damagePct: 2.0 }),
    cap('anthem_of_valinor', 'Anthem of Valinor', 40, 2.0, 75, 'party', "The full anthem — a golden pillar of light rises around the Loresinger, three rings of song roll outward, and every ally lights up in turn as the verse reaches them. Raises the whole party's ATK/DEF/Magic ATK by roughly 20% for 12 seconds, hits nearby enemies with an instant burst of magic damage, heals the party gradually for the duration, and cleanses every debuff on cast while granting debuff immunity until it ends.", { isMagic: true, kind: 'buff', icon: 'notecrown', buffPct: 0.2, buffDuration: 12, buffStat: 'pAtk' }),
  ],
  herbmaster: [
    a('athelas_touch', 'Athelas Touch', 15, 1.0, 8, 'single', "A calm touch and a murmured word — pale green light blooms from the Herbmaster's hand and sinks into the target. Restores roughly 22% of the target's Max HP; the class's bread-and-butter single-target heal.", { isMagic: true, kind: 'heal', icon: 'crosshealicon', healPct: 0.22 }),
    a('cleansing_chant', 'Cleansing Chant', 15, 1.0, 12, 'single', 'A short cleansing verse — a ring of pale blue light passes over the target and a scatter of sparkles rise off them. Instantly removes one debuff or damage-over-time effect currently on the target.', { isMagic: true, kind: 'cleanse', icon: 'sparklecleanse' }),
    p('herbal_wisdom', 'Herbal Wisdom', 'Always active: +15% healing effectiveness on every heal the Herbmaster casts — no visible effect on its own, just noticeably stronger green light whenever they heal.', { icon: 'leafplus' }),
    a('regrowth', 'Regrowth', 18, 1.2, 14, 'single', 'A patch of pale green vines and leaf-light settle over the target and keep working after the cast ends. Heals a small amount immediately, then continues restoring roughly 4% Max HP every 2 seconds for 8 seconds.', { isMagic: true, kind: 'hot', icon: 'healwave', healPct: 0.08, hotPct: 0.04, ticks: 4, tickSeconds: 2 }),
    p('natures_blessing', "Nature's Blessing", 'Always active: the whole party regenerates a small trickle of HP over time — roughly 1.5% Max HP every few seconds — no range limit, so it reaches allies anywhere on the field.', { target: 'party', icon: 'leafaura' }),
    a('thorned_ward', 'Thorned Ward', 20, 1.3, 16, 'single', 'A woven barrier of thorned green light wraps the target, visibly bristling with small thorns. Whoever it\'s cast on takes noticeably less damage for 10 seconds, and anything that hits them is struck back for a small amount of nature damage.', { isMagic: true, kind: 'buff', icon: 'thornshield', buffPct: 0.15, buffDuration: 10, buffStat: 'pDef' }),
    a('wrath_of_the_earth', 'Wrath of the Earth', 25, 1.5, 14, 'single', "The Herbmaster's one real offensive tool — the ground itself answers, a burst of brown-green light and cracked earth erupting under the target. Deals 150% Magic ATK damage, enough for solo self-sufficiency without a party to lean on.", { isMagic: true, kind: 'damage', icon: 'earthburst', damagePct: 1.5 }),
    cap('athelas_bloom', 'Athelas Bloom', 40, 2.0, 70, 'party', 'A full flower of pale green-white light opens outward from the Herbmaster in six spreading petals. Instantly heals and cleanses the whole party (roughly 25% Max HP, no range limit), then leaves a gentle regen buff running for 10 seconds and a short thorned barrier that fades into one last 3-second heal-over-time once it ends.', { isMagic: true, kind: 'heal', icon: 'flowerburst', healPct: 0.25, buffDuration: 10 }),
  ],
  smith: [
    a('hammer_strike', 'Hammer Strike', 5, 0.2, 4, 'single', 'A straightforward, heavy overhead swing — the filler hit the Smith leans on between bigger skills. Deals 100% ATK physical damage; more tool-swing than technique, but it never misses a beat.', { kind: 'damage', icon: 'hammer', damagePct: 1.0 }),
    a('sunder_armor', 'Sunder Armor', 10, 0.3, 10, 'single', "A precise strike aimed at joints and seams rather than center mass — a small crack of white sparks where armor gives. Lowers the target's Physical DEF by roughly 18% for 8 seconds, softening them up for the rest of the party.", { kind: 'debuff', icon: 'hammercrack', buffPct: -0.18, buffDuration: 8, buffStat: 'pDef' }),
    p('sturdy_build', 'Sturdy Build', 'Always active: +12% Physical DEF, simply from armor and stance built around absorbing hits rather than dodging them.', { icon: 'shieldsolid' }),
    a('overcharge_strike', 'Overcharge Strike', 15, 0.6, 12, 'single', 'A charged, two-handed swing held a beat longer than normal — the hammer-head glows faintly with stored force before it lands. Deals 170% ATK physical damage in one heavy hit; slower than Hammer Strike, but hits far harder.', { kind: 'damage', icon: 'hammerspark', damagePct: 1.7 }),
    p('battle_mending', 'Battle Mending', "Always active: a small HP-regen aura, roughly 1.5% Max HP every few seconds, extended to the whole party rather than just whoever's standing close.", { target: 'party', icon: 'regenaura' }),
    a('forge_blessing', 'Forge Blessing', 18, 0.8, 16, 'party', "The Smith taps each ally's weapon with a glowing hammer-touch, field-enchanting it on the spot — a brief golden shimmer runs down the blade or bow. Raises the whole party's Physical ATK by roughly 15% for 12 seconds, no range limit.", { kind: 'buff', icon: 'anvilglow', buffPct: 0.15, buffDuration: 12, buffStat: 'pAtk' }),
    a('ground_slam', 'Ground Slam', 20, 0.8, 18, 'aoe', 'A two-handed hammer drop straight into the ground — the shockwave visibly ripples outward in a rising arc of dust and orange sparks. Deals 130% ATK physical damage to everyone nearby and knocks them back a short distance.', { kind: 'damage', icon: 'hammeraoe', damagePct: 1.3 }),
    cap('artificers_triumph', "Artificer's Triumph", 25, 0.7, 60, 'aoe', "The Smith's masterwork lands once, hard — the hammer drops in a streak of gold light, the screen shudders, three cracking shockwave rings roll out, and a shower of orange sparks rains down. Knocks down everyone in the area instantly (also slowing their action/attack speed and briefly confusing/stunning them), while the whole party gets a 12-second boost to Physical & Magic ATK and DEF.", { kind: 'cc', icon: 'hammerstorm' }),
  ],
  skirmisher: [
    a('quick_stab', 'Quick Stab', 5, 0.15, 3, 'single', "A fast, low-commitment dagger jab — quick in, quick out. Deals 95% ATK physical damage; the Skirmisher's fastest, cheapest attack, meant to be thrown constantly.", { kind: 'damage', icon: 'dagger', damagePct: 0.95 }),
    a('backstab', 'Backstab', 10, 0.3, 8, 'single', "A dagger driven in from an angle the target isn't watching — noticeably flashier than a front-on hit, with a small burst of sparks trailing behind the blade. Deals 130% ATK physical damage, with sharply increased crit chance (crit bonus +150% instead of the usual +100%) when struck from behind or out of stealth.", { kind: 'damage', icon: 'daggerback', damagePct: 1.3, critMult: 2.5 }),
    a('shadow_step', 'Shadow Step', 12, 0.2, 12, 'self', "A short, near-instant dash — the Skirmisher blurs a few steps in a heartbeat, reappearing behind the target or clear of danger. No damage on its own; pure repositioning.", { kind: 'utility', icon: 'dash' }),
    a('vanish', 'Vanish', 15, 0.2, 20, 'self', 'The Skirmisher fades from sight — a translucent afterimage flickers where they stood a half-second earlier. Grants near-total invisibility (a heavy evasion boost) for about 4 seconds, enough to reset a fight or line up Assassinate.', { kind: 'buff', icon: 'ghost', buffPct: 0.4, buffDuration: 4, buffStat: 'evasion' }),
    p('poisoned_blade', 'Poisoned Blade', 'Always active: every hit carries a chance to leave a faint green poison — no cast, no cooldown, it simply rides along on normal attacks and deals a small amount of extra damage over time when it takes.', { icon: 'poisondrip' }),
    p('nimble_reflexes', 'Nimble Reflexes', 'Always active: +12% evasion and a small boost to attack rate, from moving light and staying loose rather than trading blows head-on.', { icon: 'featherfast' }),
    a('caltrops', 'Caltrops', 15, 0.3, 14, 'aoe', 'A handful of small spikes scattered across the ground in a burst — easy to miss until someone steps on them. Roots and damages any enemy who walks into the area, ticking for roughly 3% ATK per second for 5 seconds.', { kind: 'dot', icon: 'trap', dotPct: 0.03, ticks: 5, tickSeconds: 1 }),
    cap('assassinate', 'Assassinate', 25, 0.4, 60, 'single', "Three overlapping shadow-passes converge on the target in the space of a second, then everything goes still before the real strike lands — a guaranteed critical hit worth triple damage (+200%) instead of the usual double, always landing true when cast from Vanish or stealth. Deals a massive 260% ATK burst of physical damage; the single hardest hit any class in the game can land.", { kind: 'damage', icon: 'skulldagger', damagePct: 2.6, critMult: 3 }),
  ],
  captain: [
    a('rallying_strike', 'Rallying Strike', 5, 0.2, 5, 'single', "A confident, shouted strike — the blade connects and the Captain's voice carries with it. Deals 100% ATK physical damage and grants the whole party a small ATK boost for a few seconds, no range limit.", { kind: 'damage', icon: 'slashup', damagePct: 1.0, buffPct: 0.05, buffDuration: 6, buffStat: 'pAtk' }),
    a('battle_cry', 'Battle Cry', 12, 0.4, 12, 'party', "A raised sword and a full-throated shout — a ripple of gold light spreads outward from the Captain as the cry lands. Raises the whole party's ATK by roughly 15% for 10 seconds, no range limit.", { kind: 'buff', icon: 'hornshout', buffPct: 0.15, buffDuration: 10, buffStat: 'pAtk' }),
    p('commanding_presence', 'Commanding Presence', "Always active: +threat generation and a small accuracy boost for the whole party, no range limit — the Captain simply being present on the field sharpens everyone's aim and keeps enemies looking at the person yelling orders.", { tags: ['threat'], target: 'party', icon: 'crownshield' }),
    a('banner_plant', 'Banner Plant', 15, 0.6, 18, 'party', "The Captain drives a banner into the ground — it catches wind that shouldn't be there, glowing faintly gold. While it stands, the whole party gets roughly +15% to all DEF for 14 seconds, no range limit.", { kind: 'buff', icon: 'banner', buffPct: 0.15, buffDuration: 14, buffStat: 'pDef' }),
    p('iron_will', 'Iron Will', "Always active: +15% Physical DEF and meaningfully higher resistance to stuns, roots, and other crowd control — self only, the Captain doesn't waver easily.", { icon: 'shieldplus' }),
    a('inspiring_shout', 'Inspiring Shout', 15, 0.5, 16, 'party', 'A rallying shout aimed at the wounded rather than the strong — a wave of warm gold light washes over the party. Heals and cleanses the whole party for a small amount (roughly 12% Max HP), no range limit.', { kind: 'heal', icon: 'hornheal', healPct: 0.12 }),
    a('flanking_order', 'Flanking Order', 18, 0.5, 16, 'party', "A sharp hand signal, not a shout this time — the party visibly tightens formation. Raises the whole party's crit chance by roughly 15% for 10 seconds, no range limit.", { kind: 'buff', icon: 'flagcrit', buffPct: 0.15, buffDuration: 10, buffStat: 'critPct' }),
    cap('war_horns_call', "War Horn's Call", 25, 0.6, 60, 'party',
      "The horn sounds once, low and long — three rings of gold light roll out from the Captain, and four Guardsmen (2 swordsmen, 2 archers) step out of the light itself to fight at the party's side. For 12 seconds the Captain is untouchable for the first 8 of them, the whole party's ATK/DEF/Crit/Attack-Rate rise together, every hit carries a small bonus tick of Magic damage, and the summoned Guardsmen hold formation and strike the enemy repeatedly before their light fades — the game's biggest single support cooldown.",
      { kind: 'buff', tags: ['threat'], icon: 'hornarmy' }),
  ],
  // Passives come early here by design: Wild Bond leads the tree since it
  // governs summon duration/count the moment the first creature is called,
  // and Kinship Bond lands right after Call Spirit (the healer summon it
  // synergizes with) — unlike other classes, a Summoner's passives ARE the
  // summoning framework, not late-tree stat garnish.
  summoner: [
    p('wild_bond', 'Wild Bond', 'Always active — not a cast, a foundation: sets how long every summon stays out (20 seconds baseline) and how many can be active at once (starts at 1, rising to 2 by mid-game as this passive ranks up).', { icon: 'bond' }),
    a('call_bird', 'Call Bird', null, null, 10, 'summon', 'A ring of teal light gathers at the Summoner\'s side and a small bird steps out of it, already airborne. The weakest attacker in the roster by design — meant as an early support/harassment pick, not a damage tool.', { kind: 'summon', icon: 'bird' }),
    a('call_spirit', 'Call Spirit', null, null, 12, 'summon', 'The teal summoning circle ripples like water this time, and a river-spirit rises out of it — Goldberry-flavored, not a named Maia. A healer-lite summon: weak on offense, but its hits and its own passive keep the party topped up.', { kind: 'summon', icon: 'spiritdrop' }),
    p('kinship_bond', 'Kinship Bond', 'Always active while at least one summon is out: the Summoner gains +5% all DEF and +5% evasion, and every active summon quietly heals 3% of its own Max HP every 3 seconds — the bond runs both ways.', { icon: 'bond' }),
    a('call_great_eagle', 'Call Great Eagle', null, null, 16, 'summon', 'The summoning circle widens and a Great Eagle drops out of it in a rush of wind. An aerial scout/damage pick — hits hard for a summon and can scout ahead or carry a downed ally to safety.', { kind: 'summon', icon: 'eagle' }),
    a('call_ent', 'Call Ent', null, null, 20, 'summon', 'Roots and bark seem to grow directly out of the summoning circle as an Ent unfolds upright. The roster\'s frontline/tank: modest damage, but it roots enemies in place and can taunt them off the party.', { kind: 'summon', icon: 'tree' }),
    a('call_beorning', 'Call Beorning', null, null, 20, 'summon', 'The circle darkens and a Beorning (a were-bear, mid-Third Age content) shoulders its way out. The hardest-hitting summon in the roster — a bruiser that trades some of its own defense for real offense.', { kind: 'summon', icon: 'bear' }),
    cap('call_of_the_wild', 'Call of the Wild', null, null, 90, 'summon', 'Every bond answers at once — five teal summoning circles bloom in a ring around the Summoner and all five creature types (whichever are unlocked) step out together. They fight at full strength for 8 seconds, then fade together — the Summoner\'s whole menagerie, all at once, for one short burst.', { kind: 'summon', icon: 'wildburst' }),
  ],
};

// Skills that generate significant threat (skill doc §5.2's illustrative
// multipliers) — used by companionAI.js's tank role-trigger and by any
// scene wiring up the threat system.
export const THREAT_MULTIPLIER_SKILLS = {
  guard_stance: 2.0,
  shield_slam: 1.5, // one-time spike, modeled here as a sustained multiplier for simplicity
  commanding_presence: 1.5,
};

// MP costs are intentionally absent for the Summoner's own tree (see 4.8.0 in
// the companion doc) — its whole kit runs on cooldown alone, same as its
// summons, so resource gates never double up.

export function classIds() {
  return Object.keys(SKILL_TREES);
}

export function getTree(classId) {
  return SKILL_TREES[classId] ?? [];
}

export function skillDef(classId, skillId) {
  return getTree(classId).find((s) => s.id === skillId);
}

// ---------- unlock / rank helpers ----------

export function rankOf(state, skillId) {
  return state.skills?.[skillId] ?? 0;
}

// Skill N+1 unlocks once skill N is Rank 1+; the capstone unlocks once all
// 7 regular skills are Rank 1+.
export function isUnlocked(state, classId, skillId) {
  const tree = getTree(classId);
  const idx = tree.findIndex((s) => s.id === skillId);
  if (idx <= 0) return true;
  if (tree[idx].capstone) return tree.slice(0, 7).every((s) => rankOf(state, s.id) >= 1);
  return rankOf(state, tree[idx - 1].id) >= 1;
}

export function canRankUp(state, classId, skillId) {
  const def = skillDef(classId, skillId);
  if (!def) return false;
  if (!isUnlocked(state, classId, skillId)) return false;
  if (rankOf(state, skillId) >= def.maxRank) return false;
  return (state.skillPoints ?? 0) > 0;
}

export function rankUp(state, classId, skillId) {
  if (!canRankUp(state, classId, skillId)) return false;
  state.skills ??= {};
  state.skills[skillId] = rankOf(state, skillId) + 1;
  state.skillPoints -= 1;
  return true;
}

// Total points already spent in a class's tree (used to detect a maxed
// tree, at which point further skill-point grants convert to stat points
// instead — see grantXp() in leveling.js).
export function spentSkillPoints(state, classId) {
  return getTree(classId).reduce((sum, s) => sum + rankOf(state, s.id), 0);
}

export function isTreeMaxed(state, classId) {
  return spentSkillPoints(state, classId) >= MAX_TREE_POINTS;
}

// ---------- action bar (4 slots drawn from learned Active skills) ----------

export function learnedActives(state, classId) {
  return getTree(classId).filter((s) => s.type === 'active' && rankOf(state, s.id) >= 1);
}

export function setActionBarSlot(state, slotIndex, skillId) {
  state.actionBar ??= [null, null, null, null];
  state.actionBar[slotIndex] = skillId;
}

// The HUD skill wheel: a fixed 8-slot ring — 6 skill slots (every learned
// Active in tree order; empty until learned) + 2 potion slots (HP & MP).
// The wheel rotates in the HUD, so every learned skill stays reachable —
// no 4-slot loadout cut.
export function skillRing(state) {
  const actives = learnedActives(state, state.classId);
  const ring = [];
  for (let i = 0; i < 6; i++) ring.push(actives[i] ? { type: 'skill', id: actives[i].id } : null);
  ring.push({ type: 'potion', pot: 'hp' });
  ring.push({ type: 'potion', pot: 'mp' });
  return ring;
}

// ---------- Summoner: summon creatures ----------

// Every summon derives its stats from the Summoner's *current* effective
// stats (concept doc-adjacent §4.8.0): HP 50% of Master's Max HP, ATK 50% of
// Master's Magic ATK (all summon damage is Magic-typed regardless of visual
// flavor), All DEF/Accuracy/Evasion/Crit 100% of Master's. A summon's own
// Passive can further multiply its HP/ATK/DEF after that base derivation.
export const SUMMONS = {
  bird: {
    id: 'bird',
    name: 'Bird',
    role: 'Support/Singer-lite — weakest attacker in the roster by design, unlocked first',
    skills: {
      attack: { name: 'Peck Flurry', effect: 'Weak multi-peck hit (~50% of own ATK).', pct: 0.5 },
      support: { name: 'Chirping Ward', effect: 'Party-wide +5% to HP, MP, All DEF, All ATK, Accuracy, Crit, Evasion.', pct: 0.05, target: 'party' },
      passive: { name: 'Distracting Song', effect: 'While active: nearby enemies suffer −5% to the same stat list.', pct: -0.05 },
    },
  },
  spirit: {
    id: 'spirit',
    name: 'Spirit',
    role: 'Healer-lite — a Goldberry-flavored river-spirit, not a named Maia',
    skills: {
      attack: { name: 'Ripple', effect: 'Weak magic pulse (~55% of own ATK); on hit also heals the whole party 5% Max HP.', pct: 0.55 },
      support: { name: 'Renewing Waters', effect: 'Heals a target 5% Max HP over 4s.', pct: 0.05, target: 'single', effectKind: 'hot' },
      passive: { name: "River's Grace", effect: 'Always-on: party within range regenerates 2% Max HP every 2s, debuffs/DoTs auto-cleansed every 8s.' },
    },
  },
  great_eagle: {
    id: 'great_eagle',
    name: 'Great Eagle',
    role: 'Aerial scout/damage',
    skills: {
      attack: { name: 'Talon Dive', effect: 'High damage (~160% of own ATK) + knockback.', pct: 1.6 },
      support: { name: "Wind's Eye", effect: 'Reveals nearby map/hidden enemies, or carries a downed ally to safety.' },
      passive: { name: 'Keen Sight', effect: 'Party-wide +detection radius & accuracy, +5% Crit chance.' },
    },
  },
  ent: {
    id: 'ent',
    name: 'Ent',
    role: 'Frontline/Tank',
    skills: {
      attack: { name: 'Root Slam', effect: 'Modest damage (~70% of own ATK), roots enemies in the area.', pct: 0.7, tags: ['cc'] },
      support: { name: 'Unshakeable Guard', effect: 'Taunts nearby enemies, pulling their attention off the party.', tags: ['threat'] },
      passive: {
        name: 'Deep Roots',
        effect: "Own HP and All DEF ×120% (applied after the 50%/100% base derivation — e.g. 50% HP → ×1.2 = effectively 60% of Master's HP).",
        hpMult: 1.2,
        defMult: 1.2,
      },
    },
  },
  beorning: {
    id: 'beorning',
    name: 'Beorning',
    role: 'Bruiser/Warrior-lite — mid-Third Age onward only',
    skills: {
      attack: { name: 'Claw Swipe', effect: 'High damage (~180% of own ATK) — the hardest single hit of any summon.', pct: 1.8 },
      support: { name: 'Rally Growl', effect: 'Party-wide +5% ATK.', pct: 0.05, target: 'party' },
      passive: {
        name: 'Ursine Fury',
        effect: 'Own ATK ×120%, All DEF only ×50% (trades survivability for being the roster\'s best attacker; still Magic-sourced/typed per §4.8.0 — "Physical" here is animation flavor only).',
        atkMult: 1.2,
        defMult: 0.5,
      },
    },
  },
};

export function summonBaseStats(masterStats) {
  return {
    maxHp: Math.round(masterStats.maxHp * 0.5),
    atk: Math.round(masterStats.mAtk * 0.5), // every summon's damage derives from Master's Magic ATK
    pDef: masterStats.pDef,
    mDef: masterStats.mDef,
    accuracy: masterStats.accuracy,
    evasion: masterStats.evasion,
    critPct: masterStats.critPct,
  };
}

export function summonStats(summonId, masterStats) {
  const def = SUMMONS[summonId];
  const base = summonBaseStats(masterStats);
  const passive = def?.skills?.passive ?? {};
  return {
    ...base,
    maxHp: Math.round(base.maxHp * (passive.hpMult ?? 1)),
    atk: Math.round(base.atk * (passive.atkMult ?? 1)),
    pDef: Math.round(base.pDef * (passive.defMult ?? 1)),
    mDef: Math.round(base.mDef * (passive.defMult ?? 1)),
  };
}
