import { classById, derivedStats } from '../data/classes.js';
import { itemById } from '../data/items.js';

// The per-run game state, stored in the Phaser registry under 'state'
// and serialized as-is by SaveSystem.

export function newGameState(kindredId, classId) {
  const klass = classById(classId);
  const d = derivedStats(klass.stats);
  return {
    version: 1,
    kindred: kindredId,
    classId,
    stats: { ...klass.stats },
    hp: d.maxHp,
    waypointIndex: 0, // index into WAYPOINTS — the furthest reached
    zone: 'cuivienen',
    pos: null, // null → use the zone's default spawn
    quest: { id: 'vanishing', stage: 0, flags: {} },
    seenIntro: false,
    equipment: { armor: null, weapon: null, trinket: null },
    inventory: [],
  };
}

export function getState(scene) {
  return scene.registry.get('state');
}

export function setState(scene, state) {
  scene.registry.set('state', state);
}

// Base class stats plus whatever's currently equipped (concept doc §16.3) —
// this is what combat/HP math should use, not the raw base stats.
export function effectiveStats(state) {
  const stats = { ...state.stats };
  for (const itemId of Object.values(state.equipment ?? {})) {
    if (!itemId) continue;
    const item = itemById(itemId);
    if (!item) continue;
    for (const [stat, v] of Object.entries(item.bonus)) {
      stats[stat] = (stats[stat] ?? 0) + v;
    }
  }
  return stats;
}
