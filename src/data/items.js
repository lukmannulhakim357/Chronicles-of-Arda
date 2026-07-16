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

  // First weapons — granted in Waypoint 3 ("The Great Forest"), one per
  // class, matching each class's weapon in data/classes.js. Concept doc
  // §16.4 models weapons with their own Attack/Attack-Rate stats separate
  // from the 4-stat system; that's a bigger pipeline change than this
  // waypoint needs, so — like every item so far — these use the same
  // bonus-map schema as armor (a documented simplification, not the final
  // weapon-stat system).
  woodsmans_sword: {
    id: 'woodsmans_sword',
    name: "Woodsman's Sword",
    slot: 'weapon',
    weaponType: 'physical',
    bonus: { STR: 3 },
    flavor: 'Plain, well-balanced steel. Randir says it has seen more wolves than words.',
  },
  hunters_bow: {
    id: 'hunters_bow',
    name: "Hunter's Bow",
    slot: 'weapon',
    weaponType: 'physical',
    bonus: { DEX: 3 },
    flavor: 'Yew and sinew, strung tight. Quiet in the draw, per the old forest habit.',
  },
  travelers_harp: {
    id: 'travelers_harp',
    name: "Traveler's Harp",
    slot: 'weapon',
    weaponType: 'magic',
    bonus: { MAG: 3 },
    flavor: 'Small enough for the road, strong enough to carry a working song.',
  },
  woodland_staff: {
    id: 'woodland_staff',
    name: 'Woodland Staff',
    slot: 'weapon',
    weaponType: 'magic',
    bonus: { MAG: 3 },
    flavor: 'A walking-staff first, a caster\'s focus second — half the herb-lore trade carries one.',
  },
  travelers_hammer: {
    id: 'travelers_hammer',
    name: "Traveler's Hammer",
    slot: 'weapon',
    weaponType: 'physical',
    bonus: { STR: 3 },
    flavor: 'A field hammer, more tool than weapon until it has to be both.',
  },
  ranging_dagger: {
    id: 'ranging_dagger',
    name: 'Ranging Dagger',
    slot: 'weapon',
    weaponType: 'physical',
    bonus: { DEX: 3 },
    flavor: 'Short, light, and fast — made for someone who moves before they\'re seen.',
  },
  travelers_talisman: {
    id: 'travelers_talisman',
    name: "Traveler's Talisman",
    slot: 'weapon',
    weaponType: 'magic',
    bonus: { MAG: 3 },
    flavor: 'Carved bone and old knots — a focus for calling things that aren\'t there yet.',
  },
};

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

export function itemById(id) {
  return ITEMS[id];
}

export function bonusLine(item) {
  return Object.entries(item.bonus)
    .map(([stat, v]) => `+${v} ${stat}`)
    .join('  ');
}
