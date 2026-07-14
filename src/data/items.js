// Equipment, introduced starting Waypoint 2 — this campaign doubles as a
// tutorial for the account-wide gear systems used across every future
// campaign (concept doc §3, §16.7). Weapon/trinket slots exist in the
// schema now so it doesn't need to change again once Waypoint 3 adds real
// weapons and a first taste of combat.

export const ITEMS = {
  steppe_cloak: {
    id: 'steppe_cloak',
    name: 'Woven Steppe Cloak',
    slot: 'armor',
    armorType: 'light',
    bonus: { DEX: 2 },
    flavor: 'Rough-spun wool, still warm from Míriel’s hands. Light enough to run in.',
  },
  herders_jerkin: {
    id: 'herders_jerkin',
    name: "Herder's Jerkin",
    slot: 'armor',
    armorType: 'light',
    bonus: { VIT: 3 },
    flavor: 'Tarion’s own spare hide vest, worn soft by years on the steppe.',
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
