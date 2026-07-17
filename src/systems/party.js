import { classById, derivedStats } from '../data/classes.js';
import { createCombatant } from '../combat/combatant.js';
import { getTree } from '../data/skills.js';

// The party/companion system (Waypoint 5's tutorial mechanic, concept
// doc §8). Kept deliberately simple for this first pass — no per-companion
// equipment or skill-point spending, no formation UI yet ("basic version";
// the fuller system is a later balancing pass). Every companion knows every
// Active skill in their own class's tree at Rank 1, so companionAI.js's
// role-based reactive triggers (Herbmaster healing, Warrior peeling off the
// primary target, etc.) always have real skills to reach for.

export const PARTY_CAP = 4; // player + up to 3 companions (design doc §8's 4-5, basic version)

// Rough analogue of the player's own per-level stat growth (3 stat points
// spent per level) since companions don't have a stat-allocation UI yet —
// a flat proportional bump keeps a level-10 companion meaningfully stronger
// than a level-1 one without inventing a second progression system.
const GROWTH_PER_LEVEL = 0.1;

export function scaledCompanionStats(classId, level) {
  const base = classById(classId).stats;
  const factor = 1 + GROWTH_PER_LEVEL * Math.max(0, level - 1);
  return Object.fromEntries(Object.entries(base).map(([k, v]) => [k, Math.max(1, Math.round(v * factor))]));
}

// The lightweight, saved roster entry — just identity + level. Live combat
// stats are derived fresh each time (see companionCombatant below), the
// same lifecycle every quest already uses for its own enemy combatants.
export function makeCompanion({ id, name, classId, sheet, level }) {
  return { id, name, classId, sheet, level: Math.max(1, level) };
}

export function inParty(state, companionId) {
  return (state.party ?? []).some((c) => c.id === companionId);
}

export function addCompanion(state, comp) {
  state.party ??= [];
  if (inParty(state, comp.id) || state.party.length >= PARTY_CAP - 1) return false;
  state.party.push(comp);
  return true;
}

export function removeCompanion(state, companionId) {
  state.party = (state.party ?? []).filter((c) => c.id !== companionId);
}

// A live combat.js-shaped combatant for one companion — rebuilt fresh every
// time a zone is entered (spawnParty() in WorldScene), so HP/MP/cooldowns
// reset per visit instead of needing their own save/load path.
export function companionCombatant(comp) {
  const stats = derivedStats(scaledCompanionStats(comp.classId, comp.level));
  const c = createCombatant({ id: comp.id, name: comp.name, stats, classId: comp.classId });
  c.skills = Object.fromEntries(
    getTree(comp.classId)
      .filter((s) => s.type === 'active')
      .map((s) => [s.id, 1])
  );
  return c;
}
