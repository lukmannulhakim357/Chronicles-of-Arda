// Runtime combat entity — wraps a derived-stats block (from
// data/classes.js's derivedStats()) with the mutable state combat needs:
// current HP/MP, cooldowns, buffs/debuffs, DoTs/HoTs, and (for enemies)
// per-attacker threat taken. Engine-agnostic: a real scene drives ticks off
// its own clock (scene.time), a test harness drives them with a fake clock.

export function createCombatant({ id, name, stats, classId = null, isEnemy = false, threatMultiplier = 1 }) {
  return {
    id,
    name,
    classId,
    isEnemy,
    baseStats: stats,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    mp: stats.maxMp ?? 0,
    maxMp: stats.maxMp ?? 0,
    threatMultiplier,
    cooldowns: {}, // skillId -> readyAt (ms)
    buffs: [], // { stat, pct, expiresAt }
    dots: [], // { kind:'dot'|'hot', pctPerTick, tickMs, nextTickAt, ticksRemaining, sourceId }
    threatTaken: {}, // attackerId -> accumulated threat (enemies only)
    phase: 0, // boss phase index, if any
    telegraph: null, // { skillId, endsAt } while a boss skill is winding up
  };
}

export function isAlive(c) {
  return c.hp > 0;
}

export function isOnCooldown(c, skillId, now) {
  return (c.cooldowns[skillId] ?? 0) > now;
}

export function setCooldown(c, skillId, now, cdSeconds) {
  c.cooldowns[skillId] = now + cdSeconds * 1000;
}

export function hasMp(c, cost) {
  return c.mp >= (cost ?? 0);
}

export function spendMp(c, cost) {
  c.mp = Math.max(0, c.mp - (cost ?? 0));
}

// Buffs/debuffs stack as a flat sum of percentages per stat, applied on top
// of baseStats. A negative pct is a debuff — same mechanism, opposite sign.
export function applyBuff(c, { stat, pct, durationSeconds, now }) {
  c.buffs.push({ stat, pct, expiresAt: now + durationSeconds * 1000 });
}

export function tickBuffs(c, now) {
  c.buffs = c.buffs.filter((b) => b.expiresAt > now);
}

export function effectiveStat(c, stat) {
  const base = c.baseStats[stat] ?? 0;
  const bonusPct = c.buffs.filter((b) => b.stat === stat).reduce((sum, b) => sum + b.pct, 0);
  return Math.round(base * (1 + bonusPct));
}

// Snapshot of every combat-relevant stat with buffs applied — what
// formulas.js's computeDamage/computeHeal should be given as attacker/defender.
export function liveStats(c) {
  const out = {};
  for (const stat of ['pAtk', 'mAtk', 'pDef', 'mDef', 'accuracy', 'evasion', 'critPct', 'atkRate']) {
    out[stat] = effectiveStat(c, stat);
  }
  return out;
}

export function applyDot(c, { kind, pctPerTick, tickSeconds, ticks, sourceId, now }) {
  c.dots.push({ kind, pctPerTick, tickMs: tickSeconds * 1000, nextTickAt: now + tickSeconds * 1000, ticksRemaining: ticks, sourceId });
}

// Advances all DoTs/HoTs by one tick where due; returns the list of
// { kind, amount, sourceId } effects that fired this call so a caller can
// apply them (damage or heal) and show floating text/animation.
export function tickDots(c, now) {
  const fired = [];
  c.dots = c.dots.filter((d) => {
    if (now < d.nextTickAt) return true;
    const amount = Math.round(c.maxHp * d.pctPerTick);
    fired.push({ kind: d.kind, amount, sourceId: d.sourceId });
    d.ticksRemaining -= 1;
    d.nextTickAt = now + d.tickMs;
    return d.ticksRemaining > 0;
  });
  return fired;
}

export function damage(c, amount) {
  c.hp = Math.max(0, c.hp - amount);
}

export function heal(c, amount) {
  c.hp = Math.min(c.maxHp, c.hp + amount);
}
