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
  };
}

const a = (id, name, mp, cast, cd, target, effect, extra = {}) =>
  skill(id, name, 'active', { mp, cast, cd, target, effect, ...extra });
const p = (id, name, effect, extra = {}) => skill(id, name, 'passive', { effect, ...extra });
const cap = (id, name, mp, cast, cd, target, effect, extra = {}) =>
  skill(id, name, 'active', { mp, cast, cd, target, effect, capstone: true, ...extra });

export const SKILL_TREES = {
  warrior: [
    a('bash', 'Bash', 5, 0.2, 4, 'single', 'STR strike, chance to stagger (brief interrupt).', { kind: 'damage' }),
    a('cleave', 'Cleave', 10, 0.4, 8, 'frontal', 'Frontal-arc hit, multiple enemies.', { kind: 'damage' }),
    p('guard_stance', 'Guard Stance', 'Always-on: +Physical DEF & threat generation while in melee.', { tags: ['threat'] }),
    a('rending_strike', 'Rending Strike', 10, 0.3, 10, 'single', 'Physical bleed (damage over time).', { kind: 'dot' }),
    p('ironhide', 'Ironhide', "Always-on: +Max HP%. Exception to \"passives have no CD\" — at 5% HP, instantly heals 25% of Total HP (10min CD).", { cd: 600 }),
    a('shield_slam', 'Shield Slam', 15, 0.5, 14, 'frontal', 'Stun (primary target) + high threat generation; stun also hits additional enemies in a frontal area.', { kind: 'cc', tags: ['threat'] }),
    a('whirlwind', 'Whirlwind', 20, 0.8, 18, 'aoe', 'AoE spin, hits all nearby enemies.', { kind: 'damage' }),
    cap('last_stand', 'Last Stand', 25, 0.6, 60, 'self', 'Near-unkillable window (8s) + harder-hitting counterattacks.', { kind: 'buff' }),
  ],
  ranger: [
    a('quick_shot', 'Quick Shot', 5, 0.2, 3, 'single', 'Fast bow shot, small bonus damage over basic attack.', { kind: 'damage' }),
    a('multi_shot', 'Multi-Shot', 10, 0.4, 8, 'aoe', 'Arrow spread hitting multiple targets; applies a poison DoT (small damage over 5s).', { kind: 'dot' }),
    p('hawks_eye', "Hawk's Eye", 'Always-on: +accuracy & crit chance with bow.'),
    a('piercing_arrow', 'Piercing Arrow', 12, 0.5, 10, 'line', 'Line-pierce shot, hits target + one behind it.', { kind: 'damage' }),
    p('camouflage', 'Camouflage', 'Always-on: +evasion when not attacking for a few seconds (self); same bonus extends to the whole party.', { target: 'party' }),
    a('disabling_shot', 'Disabling Shot', 15, 0.4, 14, 'single', "Leg-shot: roots/slows the target briefly.", { kind: 'cc' }),
    a('volley', 'Volley', 18, 0.6, 16, 'aoe', 'Arrow rain over an area — good vs. groups.', { kind: 'damage' }),
    cap('storm_of_the_wild_hunt', 'Storm of the Wild Hunt', 25, 0.7, 60, 'aoe', 'Wide-zone arrow barrage (instant) + self attack-rate buff (10s).', { kind: 'damage' }),
  ],
  loresinger: [
    a('note_of_courage', 'Note of Courage', 15, 1.0, 12, 'party', 'Party-wide small ATK buff (song).', { isMagic: true, kind: 'buff' }),
    a('dissonant_chord', 'Dissonant Chord', 20, 1.2, 10, 'single', 'Magic damage burst + brief enemy ATK debuff.', { isMagic: true, kind: 'damage' }),
    p('lore_of_old', 'Lore of Old', 'Always-on: +Magic ATK% and +Physical ATK%; applies to self and the whole party.', { target: 'party' }),
    a('ballad_of_swiftness', 'Ballad of Swiftness', 18, 1.0, 16, 'party', 'Party-wide attack-rate/move-speed buff.', { isMagic: true, kind: 'buff' }),
    p('harmonys_ward', "Harmony's Ward", 'Always-on: +Magic DEF and +Physical DEF; applies to self and the whole party.', { target: 'party' }),
    a('mocking_verse', 'Mocking Verse', 15, 0.8, 12, 'single', 'Single-target DEF/accuracy debuff; also reduces All DEF%, Accuracy%, ATK-Rate% and Evasion% on that target.', { isMagic: true, kind: 'debuff' }),
    a('dirge_of_sorrow', 'Dirge of Sorrow', 30, 1.8, 20, 'single', 'Strong single-target magic damage + brief weaken.', { isMagic: true, kind: 'damage' }),
    cap('anthem_of_valinor', 'Anthem of Valinor', 40, 2.0, 75, 'party', 'Party-wide ATK/DEF/MAG buff (12s, every stat %) + magic damage pulse to nearby enemies (instant) + HoT for the duration + cleanses existing debuffs on cast and grants debuff immunity for the duration.', { isMagic: true, kind: 'buff' }),
  ],
  herbmaster: [
    a('athelas_touch', 'Athelas Touch', 15, 1.0, 8, 'single', 'Single-target heal — core bread-and-butter skill.', { isMagic: true, kind: 'heal' }),
    a('cleansing_chant', 'Cleansing Chant', 15, 1.0, 12, 'single', 'Removes a debuff/DoT from target.', { isMagic: true, kind: 'cleanse' }),
    p('herbal_wisdom', 'Herbal Wisdom', 'Always-on: +healing effectiveness%.'),
    a('regrowth', 'Regrowth', 18, 1.2, 14, 'single', 'Heal-over-time on a target.', { isMagic: true, kind: 'hot' }),
    p('natures_blessing', "Nature's Blessing", 'Always-on: +HP regen%; applies to the whole party, not just nearby allies.', { target: 'party' }),
    a('thorned_ward', 'Thorned Ward', 20, 1.3, 16, 'single', 'Barrier on an ally that damages attackers who hit it.', { isMagic: true, kind: 'buff' }),
    a('wrath_of_the_earth', 'Wrath of the Earth', 25, 1.5, 14, 'single', "Nature-magic damage burst — the class's one real offensive tool, solo self-sufficiency.", { isMagic: true, kind: 'damage' }),
    cap('athelas_bloom', 'Athelas Bloom', 40, 2.0, 70, 'party', 'Party-wide heal + cleanse (instant) + regen buff (10s) + short Thorned-Ward-style barrier, leaving a 3s HoT once it ends — all party-wide, no range limit.', { isMagic: true, kind: 'heal' }),
  ],
  smith: [
    a('hammer_strike', 'Hammer Strike', 5, 0.2, 4, 'single', 'Empowered melee hit, filler skill.', { kind: 'damage' }),
    a('sunder_armor', 'Sunder Armor', 10, 0.3, 10, 'single', "Reduces target's Physical DEF.", { kind: 'debuff' }),
    p('sturdy_build', 'Sturdy Build', 'Always-on: +Physical DEF% (self).'),
    a('overcharge_strike', 'Overcharge Strike', 15, 0.6, 12, 'single', 'Charged heavy hit, big single-target damage.', { kind: 'damage' }),
    p('battle_mending', 'Battle Mending', 'Always-on: small HP regen aura, applies to the whole party, not just nearby.', { target: 'party' }),
    a('forge_blessing', 'Forge Blessing', 18, 0.8, 16, 'party', 'Party-wide temporary Physical ATK buff (field-enchant weapons) — no range limit.', { kind: 'buff' }),
    a('ground_slam', 'Ground Slam', 20, 0.8, 18, 'aoe', 'AoE hammer slam, knockback + damage.', { kind: 'damage' }),
    cap('artificers_triumph', "Artificer's Triumph", 25, 0.7, 60, 'aoe', 'AoE knockdown (instant, also applies Slow/Slow ATK-Rate/Confuse/Stun) + party-wide P-ATK & M-ATK / DEF buff (12s).', { kind: 'cc' }),
  ],
  skirmisher: [
    a('quick_stab', 'Quick Stab', 5, 0.15, 3, 'single', 'Fast dagger jab, filler skill.', { kind: 'damage' }),
    a('backstab', 'Backstab', 10, 0.3, 8, 'single', 'Bonus damage & crit chance from behind/stealth.', { kind: 'damage' }),
    a('shadow_step', 'Shadow Step', 12, 0.2, 12, 'self', 'Short dash behind target or out of danger.', { kind: 'utility' }),
    a('vanish', 'Vanish', 15, 0.2, 20, 'self', 'Brief invisibility.', { kind: 'buff' }),
    p('poisoned_blade', 'Poisoned Blade', 'Always-on: chance to apply poison DoT on hit.'),
    p('nimble_reflexes', 'Nimble Reflexes', 'Always-on: +evasion%; small +ATK-Rate%.'),
    a('caltrops', 'Caltrops', 15, 0.3, 14, 'aoe', 'Drops a trap that roots/damages enemies who step on it.', { kind: 'dot' }),
    cap('assassinate', 'Assassinate', 25, 0.4, 60, 'single', 'Massive single-target burst, guaranteed crit from Vanish/stealth — crit bonus is +200% (triple) instead of the normal +100%.', { kind: 'damage', critMult: 3 }),
  ],
  captain: [
    a('rallying_strike', 'Rallying Strike', 5, 0.2, 5, 'single', 'Melee hit that also grants a small party ATK buff (party-wide, no range limit).', { kind: 'damage' }),
    a('battle_cry', 'Battle Cry', 12, 0.4, 12, 'party', 'Party-wide ATK buff shout (no range limit).', { kind: 'buff' }),
    p('commanding_presence', 'Commanding Presence', 'Always-on: +threat generation; +party accuracy (no range limit).', { tags: ['threat'], target: 'party' }),
    a('banner_plant', 'Banner Plant', 15, 0.6, 18, 'party', 'Plants a banner: grants the whole party (no range limit) an All DEF% buff for its duration.', { kind: 'buff' }),
    p('iron_will', 'Iron Will', 'Always-on: +Physical DEF% & crowd-control resistance (self only).'),
    a('inspiring_shout', 'Inspiring Shout', 15, 0.5, 16, 'party', 'Small party heal/cleanse (no range limit) — rallies wounded allies.', { kind: 'heal' }),
    a('flanking_order', 'Flanking Order', 18, 0.5, 16, 'party', 'Party-wide crit chance buff (no range limit).', { kind: 'buff' }),
    cap('war_horns_call', "War Horn's Call", 25, 0.6, 60, 'party',
      'Self-invuln (8s) + party ATK/DEF/Crit/ATK-Rate buff (12s, no range limit) + light-infused weapons (bonus Magic-damage tick ~15% of own ATK per hit) + calls 4 Guardsmen (2 Swordsmen + 2 Archers, race-matched gear, basic-attack only, stats = 25% of the Captain\'s own, 12s) who count as temporary party members for the buff/infusion duration.',
      { kind: 'buff', tags: ['threat'] }),
  ],
  // Passives come early here by design: Wild Bond leads the tree since it
  // governs summon duration/count the moment the first creature is called,
  // and Kinship Bond lands right after Call Spirit (the healer summon it
  // synergizes with) — unlike other classes, a Summoner's passives ARE the
  // summoning framework, not late-tree stat garnish.
  summoner: [
    p('wild_bond', 'Wild Bond', 'Sets summon duration (20s baseline) and max simultaneous summons (starts at 1, raises with rank, capping at 2 by mid-game).'),
    a('call_bird', 'Call Bird', null, null, 10, 'summon', 'Summons a Bird.', { kind: 'summon' }),
    a('call_spirit', 'Call Spirit', null, null, 12, 'summon', 'Summons a Spirit.', { kind: 'summon' }),
    p('kinship_bond', 'Kinship Bond', 'Always-on while ≥1 summon is active: Summoner gains +5% All DEF & +5% Evasion; all active summons heal 3% of their own Max HP every 3s.'),
    a('call_great_eagle', 'Call Great Eagle', null, null, 16, 'summon', 'Summons a Great Eagle.', { kind: 'summon' }),
    a('call_ent', 'Call Ent', null, null, 20, 'summon', 'Summons an Ent.', { kind: 'summon' }),
    a('call_beorning', 'Call Beorning', null, null, 20, 'summon', 'Summons a Beorning (bear) — unlock requires a mid-Third Age+ campaign.', { kind: 'summon' }),
    cap('call_of_the_wild', 'Call of the Wild', null, null, 90, 'summon', 'Summons all 5 creature types at once (whichever are unlocked/era-available) for 8s, then they vanish.', { kind: 'summon' }),
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
