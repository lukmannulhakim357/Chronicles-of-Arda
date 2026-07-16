import { classById, derivedStats } from '../data/classes.js';
import { itemById } from '../data/items.js';

// The per-run game state, stored in the Phaser registry under 'state'
// and serialized as-is by SaveSystem.

export const EQUIPMENT_SLOTS = ['head', 'chest', 'gloves', 'boots', 'accessory', 'weapon'];

export function newGameState(kindredId, classId) {
  const klass = classById(classId);
  const d = derivedStats(klass.stats);
  return {
    version: 1,
    kindred: kindredId,
    classId,
    stats: { ...klass.stats },
    hp: d.maxHp,
    mp: d.maxMp,
    gold: 0,
    waypointIndex: 0, // index into WAYPOINTS — the furthest reached
    zone: 'cuivienen',
    pos: null, // null → use the zone's default spawn
    quest: { id: 'vanishing', stage: 0, flags: {} },
    seenIntro: false,
    equipment: { head: null, chest: null, gloves: null, boots: null, accessory: null, weapon: null },
    inventory: [],
    level: 1,
    xp: 0,
    statPoints: 0,
    skillPoints: 0,
    skills: {},
    actionBar: [null, null, null, null],
    potions: { hp: 2, mp: 2 },
    titles: [],
    seenCards: [],
  };
}

// Migrates the old 3-slot equipment shape (armor/weapon/trinket) to the
// current 6-slot paperdoll, preserving whatever was equipped under 'armor'.
export function normalizeEquipment(equipment) {
  const eq = { ...(equipment ?? {}) };
  if (eq.armor && !eq.chest) eq.chest = eq.armor;
  delete eq.armor;
  delete eq.trinket;
  for (const key of EQUIPMENT_SLOTS) eq[key] = eq[key] ?? null;
  return eq;
}

export function getState(scene) {
  return scene.registry.get('state');
}

// Every write goes through here, so this is the one place old saves get
// migrated/defaulted to whatever shape the current build expects.
export function setState(scene, state) {
  state.equipment = normalizeEquipment(state.equipment);
  state.inventory ??= [];
  state.gold ??= 0;
  state.titles ??= [];
  state.seenCards ??= [];
  state.skills ??= {};
  state.actionBar ??= [null, null, null, null];
  state.potions ??= { hp: 2, mp: 2 };
  if (state.mp == null) state.mp = derivedStats(effectiveStats(state)).maxMp;
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
