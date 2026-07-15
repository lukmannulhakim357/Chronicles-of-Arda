// Simplified threat/aggro (skill doc §5.2) — no persistent per-enemy table.
// An enemy's target is whichever combatant has the highest
// (recent damage dealt × that attacker's Threat Multiplier), recalculated
// live rather than tracked as a running score.

export function addThreat(enemy, attackerId, damageDealt, attackerThreatMultiplier = 1) {
  enemy.threatTaken[attackerId] = (enemy.threatTaken[attackerId] ?? 0) + damageDealt * attackerThreatMultiplier;
}

// `combatants` is the live roster the enemy could target; ties broken by
// whatever order they're given in (a real scene would pass proximity-sorted
// order — this stays a pure function so the tie-break rule is the caller's
// choice, not baked in here).
export function pickTarget(enemy, combatants) {
  let best = null;
  let bestScore = -Infinity;
  for (const c of combatants) {
    const score = enemy.threatTaken[c.id] ?? 0;
    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }
  return best ?? combatants[0] ?? null;
}
