// The eight classes (concept doc §6). Race and class are free axes.
// Base stats follow the 4-stat model of §16.1 (VIT / MAG / STR / DEX).
// Every class starts with the same total (28), spread to fit its role.

export const CLASSES = [
  {
    id: 'warrior',
    name: 'Warrior',
    weapon: 'Sword & shield',
    role: 'Front-line melee',
    stats: { VIT: 10, MAG: 2, STR: 10, DEX: 6 },
  },
  {
    id: 'ranger',
    name: 'Ranger',
    weapon: 'Bow',
    role: 'Tracking, stealth, ranged',
    stats: { VIT: 7, MAG: 3, STR: 8, DEX: 10 },
  },
  {
    id: 'loresinger',
    name: 'Loresinger',
    weapon: 'Harp or staff',
    role: 'Song-magic: buff & debuff',
    stats: { VIT: 6, MAG: 12, STR: 4, DEX: 6 },
  },
  {
    id: 'herbmaster',
    name: 'Herbmaster',
    weapon: 'Staff, backup dagger',
    role: 'Healing through herb-lore',
    stats: { VIT: 8, MAG: 11, STR: 4, DEX: 5 },
  },
  {
    id: 'smith',
    name: 'Smith',
    weapon: 'Hammer',
    role: 'Crafting, gear buffs, solid melee',
    stats: { VIT: 9, MAG: 4, STR: 10, DEX: 5 },
  },
  {
    id: 'skirmisher',
    name: 'Skirmisher',
    weapon: 'Dagger & sling',
    role: 'Agility, stealth, traps',
    stats: { VIT: 6, MAG: 3, STR: 7, DEX: 12 },
  },
  {
    id: 'captain',
    name: 'Captain',
    weapon: 'Sword & horn',
    role: 'Leadership, party-wide buffs',
    stats: { VIT: 9, MAG: 6, STR: 8, DEX: 5 },
  },
  {
    id: 'summoner',
    name: 'Summoner',
    weapon: 'Horn & talisman',
    role: 'Support through summoned allies',
    stats: { VIT: 6, MAG: 12, STR: 3, DEX: 7 },
  },
];

export function classById(id) {
  return CLASSES.find((c) => c.id === id);
}

export function derivedStats(stats) {
  return {
    maxHp: 50 + stats.VIT * 8,
    maxMp: 20 + stats.MAG * 6,
    attack: 5 + stats.STR * 2,
    critPct: Math.min(40, 2 + stats.DEX),
  };
}
