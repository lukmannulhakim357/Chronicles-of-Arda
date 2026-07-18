// Titles (Waypoint 8's tutorial mechanic, concept doc §14). Basic version:
// one equip slot, one small flat passive bonus per title — the same
// bonus-map schema equipment already uses, so effectiveStats() in
// GameState.js can fold a title in with one more loop, no new stat model.
// Multiple equip slots and Legacy-linked unlocks are a later system.

export const TITLES = {
  seeker: {
    id: 'seeker',
    name: 'Seeker',
    bonus: { DEX: 2 },
    flavor: 'Earned searching Nan Elmoth for a King who could not be found — the search itself sharpened something.',
  },
  westward: {
    id: 'westward',
    name: 'Traveler of the Uttermost West',
    bonus: { VIT: 1, MAG: 1, STR: 1, DEX: 1 },
    flavor: 'Earned completing the Great Journey — every league of it, from the waters of Cuiviénen to the shores of Aman.',
  },
};

export function titleById(id) {
  return TITLES[id];
}
