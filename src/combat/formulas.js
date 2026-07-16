// Core combat math (skill doc §3, concept doc §16.2). Kept as pure functions
// so the engine is unit-testable without a running Phaser scene — a real
// battle scene (Waypoint 3+) drives these off its own tick loop.

// Physical attacks can miss (accuracy vs evasion); Magic attacks always
// land — the tradeoff is cast-time/cooldown instead of a miss chance.
export function rollHit(attacker, defender, isMagic, rng = Math.random) {
  if (isMagic) return true;
  const chance = clampPct(80 + (attacker.accuracy - defender.evasion));
  return rng() * 100 < chance;
}

export function rollCrit(attacker, critMult = 2, rng = Math.random) {
  const chance = clampPct(attacker.critPct);
  return rng() * 100 < chance ? critMult : 1;
}

function clampPct(v) {
  return Math.max(5, Math.min(99, v));
}

// Diminishing-returns mitigation: def=0 → no reduction, higher def
// asymptotically approaches (but never reaches) 100% reduction.
export function mitigate(rawDamage, def) {
  return rawDamage * (100 / (100 + Math.max(0, def)));
}

// A skill's Rank 1 sets the effect; each rank after that scales the same
// effect numerically (never a different effect) — skill doc §1. Real growth
// curves come at the balancing pass; this is a flat, illustrative +15%/rank.
export function scaleByRank(base, rank, growthPerRank = 0.15) {
  return base * (1 + Math.max(0, rank - 1) * growthPerRank);
}

// Computes one hit's outcome. `skillPct` is the skill's damage multiplier
// against the relevant ATK stat (e.g. 1.6 = 160% of Magic ATK, per the
// Great Eagle's Talon Dive). Returns { hit, crit, damage } — damage is 0
// when hit is false.
export function computeDamage({ attacker, defender, isMagic, skillPct, rank = 1, critMult = 2, rng = Math.random }) {
  const hit = rollHit(attacker, defender, isMagic, rng);
  if (!hit) return { hit: false, crit: false, damage: 0 };
  const atkStat = isMagic ? attacker.mAtk : attacker.pAtk;
  const defStat = isMagic ? defender.mDef : defender.pDef;
  const base = scaleByRank(atkStat * skillPct, rank);
  const mitigated = mitigate(base, defStat);
  const critFactor = rollCrit(attacker, critMult, rng);
  return { hit: true, crit: critFactor > 1, damage: Math.max(1, Math.round(mitigated * critFactor)) };
}

export function computeHeal({ caster, targetMaxHp, healPct, rank = 1 }) {
  // Heals scale off the target's own Max HP (%), the standard Perfect
  // World-style convention, boosted by the caster's healing-effectiveness
  // passives where present (see effectivenessMult).
  return Math.round(scaleByRank(targetMaxHp * healPct, rank));
}
