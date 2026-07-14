import { classById, derivedStats } from '../data/classes.js';

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
  };
}

export function getState(scene) {
  return scene.registry.get('state');
}

export function setState(scene, state) {
  scene.registry.set('state', state);
}
