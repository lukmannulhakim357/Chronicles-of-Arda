// Role-based reactive priority (skill doc §5.1) for companions and (at a
// simplified scale) the Summoner's own summons. Three tiers, checked top to
// bottom; the first one that fires wins.
import { isOnCooldown, hasMp } from './combatant.js';

export const ROLE_TAGS = {
  warrior: 'tank',
  ranger: 'dps',
  loresinger: 'support',
  herbmaster: 'healer',
  smith: 'hybrid',
  skirmisher: 'dps',
  captain: 'tank',
  summoner: 'unique',
};

const EMERGENCY_HP_PCT = 0.3;
const HEALER_HEAL_THRESHOLD = 0.6;

function ready(self, s, now) {
  return !isOnCooldown(self, s.id, now) && (!s.mp || hasMp(self, s.mp));
}

// `tree` = this class's full 8-skill list (data/skills.js getTree output).
// `isPrimaryTarget` = whether `self` is the enemy's current focus (from
// threat.pickTarget) — lets the tank triggers below react correctly.
// `hasActiveSummon` is a caller-maintained flag for the Summoner trigger;
// summon lifecycle bookkeeping itself lives outside this module.
export function decideAction({ self, allies, enemies, now, tree, isPrimaryTarget = false, hasActiveSummon = false }) {
  const learned = tree.filter((s) => s.type === 'active' && (self.skills?.[s.id] ?? 0) >= 1);
  const byId = (id) => learned.find((s) => s.id === id);

  // Tier 1: emergency.
  const pool = [self, ...allies];
  const critical = pool.filter((c) => c.hp / c.maxHp <= EMERGENCY_HP_PCT);
  if (critical.length) {
    const rescue = learned.find((s) => ['heal', 'hot', 'cleanse'].includes(s.kind) && ready(self, s, now));
    if (rescue) {
      const target = critical.slice().sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
      return { type: 'skill', skillId: rescue.id, targetIds: [target.id] };
    }
  }

  // Tier 2: per-class reactive trigger.
  const trigger = roleTrigger({ classId: self.classId, self, allies, enemies, now, learned, byId, isPrimaryTarget, hasActiveSummon });
  if (trigger) return trigger;

  // Tier 3: default rotation — highest-tier learned active off cooldown
  // (capstone counts as top-tier too), falling back to basic attack.
  const ranked = learned.slice().sort((a, b) => tree.indexOf(b) - tree.indexOf(a));
  const pick = ranked.find((s) => ready(self, s, now));
  if (pick) return { type: 'skill', skillId: pick.id, targetIds: enemies.length ? [enemies[0].id] : [] };
  return enemies.length ? { type: 'basic', targetId: enemies[0].id } : { type: 'idle' };
}

function roleTrigger({ classId, self, allies, enemies, now, learned, byId, isPrimaryTarget, hasActiveSummon }) {
  const anyBuffActive = self.buffs?.some((b) => b.pct > 0 && b.expiresAt > now);

  switch (classId) {
    case 'warrior': {
      const s = byId('shield_slam');
      if (s && !isPrimaryTarget && ready(self, s, now) && enemies.length) return { type: 'skill', skillId: s.id, targetIds: [enemies[0].id] };
      return null;
    }
    case 'captain': {
      const threatSkill = byId('rallying_strike') ?? byId('battle_cry');
      if (threatSkill && !isPrimaryTarget && ready(self, threatSkill, now) && enemies.length) {
        return { type: 'skill', skillId: threatSkill.id, targetIds: [enemies[0].id] };
      }
      const uptime = byId('battle_cry') ?? byId('banner_plant');
      if (uptime && !anyBuffActive && ready(self, uptime, now)) return { type: 'skill', skillId: uptime.id, targetIds: [self.id, ...allies.map((a) => a.id)] };
      return null;
    }
    case 'ranger':
      return null; // default rotation covers it
    case 'loresinger': {
      const buffSkill = learned.find((s) => s.kind === 'buff' && ready(self, s, now));
      if (!anyBuffActive && buffSkill) return { type: 'skill', skillId: buffSkill.id, targetIds: [self.id, ...allies.map((a) => a.id)] };
      const mockingVerse = byId('mocking_verse');
      if (mockingVerse && enemies.length && ready(self, mockingVerse, now)) return { type: 'skill', skillId: mockingVerse.id, targetIds: [enemies[0].id] };
      return null;
    }
    case 'herbmaster': {
      const wounded = allies.filter((a) => a.hp / a.maxHp <= HEALER_HEAL_THRESHOLD);
      const healSkill = learned.find((s) => ['heal', 'hot'].includes(s.kind) && ready(self, s, now));
      if (wounded.length && healSkill) {
        const target = wounded.slice().sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp)[0];
        return { type: 'skill', skillId: healSkill.id, targetIds: [target.id] };
      }
      const cleanse = byId('cleansing_chant');
      const debuffed = allies.find((a) => a.dots?.some((d) => d.kind === 'dot') || a.buffs?.some((b) => b.pct < 0));
      if (cleanse && debuffed && ready(self, cleanse, now)) return { type: 'skill', skillId: cleanse.id, targetIds: [debuffed.id] };
      return null;
    }
    case 'smith': {
      const forge = byId('forge_blessing');
      if (forge && !anyBuffActive && ready(self, forge, now)) return { type: 'skill', skillId: forge.id, targetIds: [self.id, ...allies.map((a) => a.id)] };
      return null;
    }
    case 'skirmisher': {
      const backstab = byId('backstab');
      if (backstab && enemies.length === 1 && ready(self, backstab, now)) return { type: 'skill', skillId: backstab.id, targetIds: [enemies[0].id] };
      return null;
    }
    case 'summoner': {
      if (!hasActiveSummon) {
        const call = learned.find((s) => s.kind === 'summon' && ready(self, s, now));
        if (call) return { type: 'skill', skillId: call.id, targetIds: [] };
      }
      return null;
    }
    default:
      return null;
  }
}
