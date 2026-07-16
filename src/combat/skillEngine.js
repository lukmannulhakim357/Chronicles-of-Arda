// Generic skill executor: gates a cast on MP/cooldown, then resolves the
// skill's primary `kind` (data/skills.js) against one or more targets using
// the formulas in formulas.js. Cast time itself is not simulated here with a
// real clock — a scene wraps castSkill() in a scene.time.delayedCall(castMs,
// ...) for the felt wind-up; the engine only needs `now` to gate cooldowns.
import { isOnCooldown, setCooldown, hasMp, spendMp, applyBuff, applyDot, damage, heal, liveStats } from './combatant.js';
import { computeDamage, computeHeal } from './formulas.js';
import { addThreat } from './threat.js';

export function canCast(caster, skillDef, now) {
  if (skillDef.type !== 'active') return false;
  if (isOnCooldown(caster, skillDef.id, now)) return false;
  if (skillDef.mp && !hasMp(caster, skillDef.mp)) return false;
  return true;
}

// `targets` should already be whichever combatants the skill's `target`
// scope resolves to (single/frontal/aoe/party, etc.) — picking that set is
// the caller's job (it depends on positions/party rosters a pure engine
// shouldn't assume).
export function castSkill({ caster, targets, skillDef, rank = 1, now, rng = Math.random }) {
  if (!canCast(caster, skillDef, now)) return { ok: false, reason: isOnCooldown(caster, skillDef.id, now) ? 'cooldown' : 'mp' };
  if (skillDef.mp) spendMp(caster, skillDef.mp);
  setCooldown(caster, skillDef.id, now, skillDef.cd ?? 0);

  const casterStats = liveStats(caster);
  const results = targets.map((target) => ({
    targetId: target.id,
    ...resolveEffect({ caster, casterStats, target, skillDef, rank, now, rng }),
  }));
  return { ok: true, results };
}

function resolveEffect({ caster, casterStats, target, skillDef, rank, now, rng }) {
  switch (skillDef.kind) {
    case 'heal':
    case 'hot': {
      const amount = computeHeal({ targetMaxHp: target.maxHp, healPct: skillDef.healPct ?? 0.2, rank });
      heal(target, amount);
      if (skillDef.kind === 'hot') {
        applyDot(target, {
          kind: 'hot',
          pctPerTick: skillDef.hotPct ?? 0.05,
          tickSeconds: skillDef.tickSeconds ?? 2,
          ticks: skillDef.ticks ?? 3,
          sourceId: caster.id,
          now,
        });
      }
      return { kind: skillDef.kind, amount };
    }
    case 'cleanse': {
      target.dots = target.dots.filter((d) => d.kind !== 'dot');
      target.buffs = target.buffs.filter((b) => b.pct >= 0);
      return { kind: 'cleanse' };
    }
    case 'buff': {
      applyBuff(target, {
        stat: skillDef.buffStat ?? 'pAtk',
        pct: skillDef.buffPct ?? 0.15,
        durationSeconds: skillDef.buffDuration ?? 10,
        now,
      });
      return { kind: 'buff' };
    }
    case 'debuff':
    case 'cc': {
      applyBuff(target, {
        stat: skillDef.buffStat ?? 'pDef',
        pct: skillDef.buffPct ?? -0.15,
        durationSeconds: skillDef.buffDuration ?? 6,
        now,
      });
      return { kind: skillDef.kind };
    }
    case 'utility':
    case 'summon':
    case 'passive':
      return { kind: skillDef.kind }; // handled by higher-level systems (mobility, summon manager) not modeled here
    case 'dot':
    case 'damage':
    default: {
      const targetStats = liveStats(target);
      const outcome = computeDamage({
        attacker: casterStats,
        defender: targetStats,
        isMagic: !!skillDef.isMagic,
        skillPct: skillDef.damagePct ?? 1,
        rank,
        critMult: skillDef.critMult ?? 2,
        rng,
      });
      if (outcome.hit) {
        damage(target, outcome.damage);
        if (target.isEnemy) addThreat(target, caster.id, outcome.damage, caster.threatMultiplier);
        if (skillDef.kind === 'dot') {
          applyDot(target, {
            kind: 'dot',
            pctPerTick: skillDef.dotPct ?? 0.03,
            tickSeconds: skillDef.tickSeconds ?? 1,
            ticks: skillDef.ticks ?? 5,
            sourceId: caster.id,
            now,
          });
        }
      }
      return { kind: 'damage', ...outcome };
    }
  }
}
