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
};

export function itemById(id) {
  return ITEMS[id];
}

export function bonusLine(item) {
  return Object.entries(item.bonus)
    .map(([stat, v]) => `+${v} ${stat}`)
    .join('  ');
}
