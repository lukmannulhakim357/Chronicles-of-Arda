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
};

export function titleById(id) {
  return TITLES[id];
}
