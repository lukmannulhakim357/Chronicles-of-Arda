// Equipment, introduced starting Waypoint 2 — this campaign doubles as a
// tutorial for the account-wide gear systems used across every future
// campaign (concept doc §3, §16.7). The full 6-slot paperdoll (Head / Chest
// / Gloves / Boots / Accessory / Weapon) exists in the schema now so it
// doesn't need to change again as later waypoints fill the empty slots —
// Head, Accessory and Weapon stay locked until content grants them.

export const ITEMS = {
  steppe_cloak: {
    id: 'steppe_cloak',
    name: 'Woven Steppe Cloak',
    slot: 'chest',
    armorType: 'light',
    bonus: { DEX: 2 },
    flavor: 'Rough-spun wool, still warm from Míriel’s hands. Light enough to run in.',
  },
  herders_jerkin: {
    id: 'herders_jerkin',
    name: "Herder's Jerkin",
    slot: 'chest',
    armorType: 'light',
    bonus: { VIT: 3 },
    flavor: 'Tarion’s own spare hide vest, worn soft by years on the steppe.',
  },
  steppe_boots: {
    id: 'steppe_boots',
    name: 'Steppe-worn Boots',
    slot: 'boots',
    armorType: 'light',
    bonus: { DEX: 1 },
    flavor: 'Soft-soled and quiet in tall grass — a hunter’s boots, handed down.',
  },
  herders_bracers: {
    id: 'herders_bracers',
    name: "Herder's Bracers",
    slot: 'gloves',
    armorType: 'light',
    bonus: { STR: 2 },
    flavor: 'Worn leather bracers, stiff from years of hauling and herding.',
  },

  // Trial armor — one full chest/gloves/boots set per weight class (heavy
  // plate, light hide, robe cloth), granted only in the Training Grounds so
  // the three armorType looks (src/ui/theme.js ARMOR_STYLES) can actually be
  // tried on and compared side by side. Not tied to any quest.
  trial_iron_cuirass: {
    id: 'trial_iron_cuirass',
    name: 'Trial Iron Cuirass',
    slot: 'chest',
    armorType: 'heavy',
    bonus: { VIT: 4 },
    flavor: 'Riveted plate, cold and heavy — built to stop a blade, not to run in.',
  },
  trial_iron_gauntlets: {
    id: 'trial_iron_gauntlets',
    name: 'Trial Iron Gauntlets',
    slot: 'gloves',
    armorType: 'heavy',
    bonus: { STR: 3 },
    flavor: 'Articulated steel plates over mail — a smith\'s idea of a glove.',
  },
  trial_iron_greaves: {
    id: 'trial_iron_greaves',
    name: 'Trial Iron Greaves',
    slot: 'boots',
    armorType: 'heavy',
    bonus: { VIT: 2 },
    flavor: 'Solid steel shin-guards, buckled over the boot proper.',
  },
  trial_woven_robe: {
    id: 'trial_woven_robe',
    name: 'Trial Woven Robe',
    slot: 'chest',
    armorType: 'robe',
    bonus: { MAG: 4 },
    flavor: 'Dyed cloth and old knotwork — meant to hold a working, not a blow.',
  },
  trial_sleeve_wraps: {
    id: 'trial_sleeve_wraps',
    name: 'Trial Sleeve Wraps',
    slot: 'gloves',
    armorType: 'robe',
    bonus: { MAG: 2 },
    flavor: 'Loose cloth wraps, light enough not to fumble a casting gesture.',
  },
  trial_cloth_slippers: {
    id: 'trial_cloth_slippers',
    name: 'Trial Cloth Slippers',
    slot: 'boots',
    armorType: 'robe',
    bonus: { MAG: 1, DEX: 1 },
    flavor: 'Soft-soled and silent — no caster wants their footsteps heard.',
  },

  // Trade/crafting good — gathered in Waypoint 6 ("Rhovanion"), some sold
  // to the nomad trader there for gold, the rest carried on to Waypoint 7
  // ("Ered Luin") as the Dwarf smith's crafting ingredient. Not equippable
  // (no `slot` among the 6 paperdoll slots — see CharacterScene.js's
  // EQUIPPABLE_SLOTS guard) and carries no stat bonus.
  sturdy_hide: {
    id: 'sturdy_hide',
    name: 'Sturdy Hide',
    slot: 'material',
    bonus: {},
    flavor: 'Cured and supple — good trade goods, or good crafting stock, depending who you ask.',
  },

  // Crafted trinkets — Waypoint 7's reward, one per class, each a Dwarf
  // smith's first attempt at reading what a traveling Elf actually needs.
  // The first content ever granted for the Trinket slot (locked until now
  // — see SLOT_DEFS in CharacterScene.js).
  dwarven_strength_band: {
    id: 'dwarven_strength_band',
    name: 'Dwarven Strength-band',
    slot: 'accessory',
    bonus: { STR: 3 },
    flavor: 'A plain iron band, hammered tight to the wrist. Norrik swore it would outlast the arm wearing it.',
  },
  dwarven_hunters_charm: {
    id: 'dwarven_hunters_charm',
    name: "Dwarven Hunter's Charm",
    slot: 'accessory',
    bonus: { DEX: 3 },
    flavor: 'A knot of fine chain, balanced to not so much as click against a quiver.',
  },
  dwarven_songbead: {
    id: 'dwarven_songbead',
    name: 'Dwarven Songbead',
    slot: 'accessory',
    bonus: { MAG: 3 },
    flavor: 'Hollow, and strung to hum faintly in a strong wind — the Naugrim have their own songs too, it turns out.',
  },
  dwarven_healers_locket: {
    id: 'dwarven_healers_locket',
    name: "Dwarven Healer's Locket",
    slot: 'accessory',
    bonus: { VIT: 3 },
    flavor: 'Small enough to fit a pinch of dried herb inside — practical, Norrik insisted, not sentimental.',
  },
  dwarven_foremans_ring: {
    id: 'dwarven_foremans_ring',
    name: "Dwarven Foreman's Ring",
    slot: 'accessory',
    bonus: { STR: 3 },
    flavor: 'A guild-mark ring, resized without complaint. "Wear it like you earned it," Norrik said, and meant it kindly.',
  },
  dwarven_snare_ring: {
    id: 'dwarven_snare_ring',
    name: 'Dwarven Snare-ring',
    slot: 'accessory',
    bonus: { DEX: 3 },
    flavor: 'A thin wire ring, notched for grip — as much tool as jewelry.',
  },
  dwarven_captains_seal: {
    id: 'dwarven_captains_seal',
    name: "Dwarven Captain's Seal",
    slot: 'accessory',
    bonus: { VIT: 3 },
    flavor: 'A stamped signet, more Dwarvish in style than any Elf-lord would wear — and given all the same.',
  },
  dwarven_binding_talisman: {
    id: 'dwarven_binding_talisman',
    name: 'Dwarven Binding Talisman',
    slot: 'accessory',
    bonus: { MAG: 3 },
    flavor: "Old binding-work, the kind the Naugrim don't usually share. Norrik shrugged it off as 'scrap-work, nothing clever.'",
  },

  // First weapons — granted in Waypoint 3 ("The Great Forest"), one per
  // class, matching each class's weapon in data/classes.js. Concept doc
  // §16.4 models weapons with their own Attack/Attack-Rate stats separate
  // from the 4-stat system; that's a bigger pipeline change than this
  // waypoint needs, so — like every item so far — these use the same
  // bonus-map schema as armor (a documented simplification, not the final
  // weapon-stat system).
  woodsmans_sword: {
    id: 'woodsmans_sword',
    range: 'short',
    name: "Woodsman's Sword",
    slot: 'weapon',
    weaponType: 'physical',
    bonus: { STR: 3 },
    flavor: 'Plain, well-balanced steel. Randir says it has seen more wolves than words.',
  },
  hunters_bow: {
    id: 'hunters_bow',
    range: 'long',
    name: "Hunter's Bow",
    slot: 'weapon',
    weaponType: 'physical',
    bonus: { DEX: 3 },
    flavor: 'Yew and sinew, strung tight. Quiet in the draw, per the old forest habit.',
  },
  travelers_harp: {
    id: 'travelers_harp',
    range: 'medium',
    name: "Traveler's Harp",
    slot: 'weapon',
    weaponType: 'magic',
    bonus: { MAG: 3 },
    flavor: 'Small enough for the road, strong enough to carry a working song.',
  },
  woodland_staff: {
    id: 'woodland_staff',
    range: 'medium',
    name: 'Woodland Staff',
    slot: 'weapon',
    weaponType: 'magic',
    bonus: { MAG: 3 },
    flavor: 'A walking-staff first, a caster\'s focus second — half the herb-lore trade carries one.',
  },
  travelers_hammer: {
    id: 'travelers_hammer',
    range: 'short',
    name: "Traveler's Hammer",
    slot: 'weapon',
    weaponType: 'physical',
    bonus: { STR: 3 },
    flavor: 'A field hammer, more tool than weapon until it has to be both.',
  },
  ranging_dagger: {
    id: 'ranging_dagger',
    range: 'short',
    name: 'Ranging Dagger',
    slot: 'weapon',
    weaponType: 'physical',
    bonus: { DEX: 3 },
    flavor: 'Short, light, and fast — made for someone who moves before they\'re seen.',
  },
  travelers_talisman: {
    id: 'travelers_talisman',
    range: 'medium',
    name: "Traveler's Talisman",
    slot: 'weapon',
    weaponType: 'magic',
    bonus: { MAG: 3 },
    flavor: 'Carved bone and old knots — a focus for calling things that aren\'t there yet.',
  },

  // Alternate weapons — classes.js lists a second weapon for several
  // classes (e.g. Skirmisher's "Dagger & sling"); these fill that second
  // slot so each class's full weapon range can actually be tried, not just
  // its Waypoint-3 default. Not granted by any quest yet — available for
  // fitting/testing via the Training Grounds (src/scenes/CreationScene.js).
  ash_spear: {
    id: 'ash_spear',
    range: 'mediumShort',
    name: 'Ash Spear',
    slot: 'weapon',
    weaponType: 'physical',
    bonus: { STR: 3 },
    flavor: 'A long haft of ash wood, iron-tipped — reach over a sword\'s, weight over a dagger\'s.',
  },
  hunters_sling: {
    id: 'hunters_sling',
    range: 'medium',
    name: "Hunter's Sling",
    slot: 'weapon',
    weaponType: 'physical',
    bonus: { DEX: 3 },
    flavor: 'A worn leather cradle and cord — a shepherd\'s tool turned to war.',
  },
  captains_horn: {
    id: 'captains_horn',
    range: 'mediumShort',
    name: "Captain's Horn",
    slot: 'weapon',
    weaponType: 'physical',
    bonus: { STR: 2 },
    flavor: 'Banded brass, dented from use as both signal and cudgel.',
  },
  summoners_horn: {
    id: 'summoners_horn',
    range: 'mediumShort',
    name: "Summoner's Horn",
    slot: 'weapon',
    weaponType: 'magic',
    bonus: { MAG: 2 },
    flavor: 'Carved with old bindings — its call reaches further than its sound should carry.',
  },
};

// Attack-range tiers, in world pixels — Ranger's bow is the longest reach in
// the game; sling/staff/harp/talisman sit mid-range; spear/horn are
// medium-short; every other weapon (sword, dagger, hammer) fights at
// close melee reach.
export const RANGE_PX = { short: 50, mediumShort: 100, medium: 160, long: 250 };

export function weaponRangePx(itemId) {
  const item = itemId ? ITEMS[itemId] : null;
  return RANGE_PX[item?.range] ?? RANGE_PX.short;
}

// Which first-weapon each class receives in Waypoint 3 (matches the
// `weapon` flavor text on each class in data/classes.js).
export const WEAPON_BY_CLASS = {
  warrior: 'woodsmans_sword',
  ranger: 'hunters_bow',
  loresinger: 'travelers_harp',
  herbmaster: 'woodland_staff',
  smith: 'travelers_hammer',
  skirmisher: 'ranging_dagger',
  captain: 'woodsmans_sword',
  summoner: 'travelers_talisman',
};

// The second weapon classes.js lists for a class (e.g. Herbmaster's "Staff,
// backup dagger"), for the Training Grounds to hand out alongside the
// default so both can be tried. null where a class only has the one.
export const ALT_WEAPON_BY_CLASS = {
  warrior: 'ash_spear',
  ranger: null,
  loresinger: 'woodland_staff',
  herbmaster: 'ranging_dagger',
  smith: null,
  skirmisher: 'hunters_sling',
  captain: 'captains_horn',
  summoner: 'summoners_horn',
};

// The 6 real paperdoll slots — everything else (e.g. 'material') is
// inventory-only and never equippable. CharacterScene.js uses this to
// decide whether an inventory item's detail panel should even offer Equip.
export const EQUIPPABLE_SLOTS = ['head', 'chest', 'gloves', 'boots', 'accessory', 'weapon'];

// The Dwarf smith's one fixed recipe per class (Waypoint 7's "basic
// version" crafting station) — one accessory each, the first content the
// previously-locked Trinket slot ever gets.
export const CRAFT_ITEM_BY_CLASS = {
  warrior: 'dwarven_strength_band',
  ranger: 'dwarven_hunters_charm',
  loresinger: 'dwarven_songbead',
  herbmaster: 'dwarven_healers_locket',
  smith: 'dwarven_foremans_ring',
  skirmisher: 'dwarven_snare_ring',
  captain: 'dwarven_captains_seal',
  summoner: 'dwarven_binding_talisman',
};

export function itemById(id) {
  return ITEMS[id];
}

export function bonusLine(item) {
  return Object.entries(item.bonus)
    .map(([stat, v]) => `+${v} ${stat}`)
    .join('  ');
}
