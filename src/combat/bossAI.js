// Boss enemies get two additions over the trash baseline (skill doc §5.3):
// a visible telegraph before a dangerous skill fires, and HP-threshold
// phases that swap in a new skill pool / shorten cooldowns. Trash enemies
// just use skillEngine.castSkill directly with no telegraph/phase wrapper.

const DEFAULT_PHASE_THRESHOLDS = [0.75, 0.5, 0.25];
const DEFAULT_TELEGRAPH_MS = 1500;

export function createBossController({ phaseThresholds = DEFAULT_PHASE_THRESHOLDS, phaseSkillPools = [], cdMultiplierPerPhase = [] } = {}) {
  return { phaseThresholds, phaseSkillPools, cdMultiplierPerPhase };
}

// Call once per tick; bumps boss.phase when HP crosses a threshold and
// returns true the tick it changes, so a scene can play a phase-transition
// beat (still just "one simple beat," per the doc's animation note).
export function updatePhase(boss, controller) {
  const hpPct = boss.hp / boss.maxHp;
  const crossed = controller.phaseThresholds.filter((t) => hpPct <= t).length;
  if (crossed !== boss.phase) {
    boss.phase = crossed;
    return true;
  }
  return false;
}

export function currentSkillPool(boss, controller, baseTree) {
  return controller.phaseSkillPools[boss.phase] ?? baseTree;
}

export function currentCdMultiplier(boss, controller) {
  return controller.cdMultiplierPerPhase[boss.phase] ?? 1;
}

// Opens a ~1-2s telegraph window before `skillId` resolves — a real cast
// only actually fires once `isTelegraphReady` is true, giving players and
// companions a window to dodge/interrupt/CC.
export function startTelegraph(boss, skillId, now, ms = DEFAULT_TELEGRAPH_MS) {
  boss.telegraph = { skillId, endsAt: now + ms };
  return boss.telegraph;
}

export function isTelegraphReady(boss, now) {
  return !!boss.telegraph && now >= boss.telegraph.endsAt;
}

export function clearTelegraph(boss) {
  boss.telegraph = null;
}
