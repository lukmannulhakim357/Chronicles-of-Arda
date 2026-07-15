// Pure-logic verification of the skill system + combat engine — no browser
// needed since none of this touches Phaser. Run: node tools/logic-test-combat.mjs
import {
  MAX_TREE_POINTS,
  getTree,
  classIds,
  isUnlocked,
  canRankUp,
  rankUp,
  rankOf,
  spentSkillPoints,
  learnedActives,
  setActionBarSlot,
  summonStats,
} from '../src/data/skills.js';
import { grantXp } from '../src/data/leveling.js';
import { createCombatant, liveStats, applyBuff, tickBuffs, applyDot, tickDots } from '../src/combat/combatant.js';
import { castSkill } from '../src/combat/skillEngine.js';
import { computeDamage, mitigate, rollHit } from '../src/combat/formulas.js';
import { addThreat, pickTarget } from '../src/combat/threat.js';
import { decideAction } from '../src/combat/companionAI.js';
import { createBossController, updatePhase, startTelegraph, isTelegraphReady } from '../src/combat/bossAI.js';

let failures = 0;
function assert(cond, label) {
  if (!cond) {
    console.log('FAIL:', label);
    failures += 1;
  } else {
    console.log('ok:', label);
  }
}

// ---------- 1. skill data integrity ----------
for (const classId of classIds()) {
  const tree = getTree(classId);
  assert(tree.length === 8, `${classId}: 8 skills total`);
  const actives = tree.filter((s) => s.type === 'active');
  const passives = tree.filter((s) => s.type === 'passive');
  assert(actives.length === 6, `${classId}: 6 active skills (got ${actives.length})`);
  assert(passives.length === 2, `${classId}: 2 passive skills (got ${passives.length})`);
  assert(tree[7].capstone === true, `${classId}: 8th skill is the capstone`);
  assert(tree[7].maxRank === 3, `${classId}: capstone maxRank 3`);
  assert(tree.slice(0, 7).every((s) => s.maxRank === 5), `${classId}: regular skills maxRank 5`);
  const totalPoints = tree.slice(0, 7).reduce((s, sk) => s + sk.maxRank, 0) + tree[7].maxRank;
  assert(totalPoints === MAX_TREE_POINTS, `${classId}: tree totals ${MAX_TREE_POINTS} points (got ${totalPoints})`);
}
assert(classIds().length === 8, 'exactly 8 classes');

// ---------- 2. unlock gating ----------
{
  const state = { classId: 'warrior', skills: {}, skillPoints: 10 };
  const tree = getTree('warrior');
  assert(isUnlocked(state, 'warrior', tree[0].id), 'skill 1 always unlocked');
  assert(!isUnlocked(state, 'warrior', tree[1].id), 'skill 2 locked before skill 1 ranked');
  rankUp(state, 'warrior', tree[0].id);
  assert(isUnlocked(state, 'warrior', tree[1].id), 'skill 2 unlocks once skill 1 is rank 1');
  assert(!isUnlocked(state, 'warrior', tree[7].id), 'capstone locked before all 7 regulars ranked');
  for (let i = 1; i < 7; i++) rankUp(state, 'warrior', tree[i].id);
  assert(isUnlocked(state, 'warrior', tree[7].id), 'capstone unlocks once all 7 regulars are rank 1+');
  assert(state.skillPoints === 3, `10 points - 7 spent = 3 left (got ${state.skillPoints})`);
}

// ---------- 3. rank caps + point gating ----------
{
  const state = { classId: 'warrior', skills: {}, skillPoints: 100 };
  const tree = getTree('warrior');
  for (let i = 0; i < 20; i++) rankUp(state, 'warrior', tree[0].id);
  assert(rankOf(state, tree[0].id) === 5, `skill maxes at rank 5 (got ${rankOf(state, tree[0].id)})`);
  assert(!canRankUp(state, 'warrior', tree[0].id), 'cannot rank past max');
  const stateNoPoints = { classId: 'warrior', skills: {}, skillPoints: 0 };
  assert(!canRankUp(stateNoPoints, 'warrior', tree[0].id), 'cannot rank up with 0 banked points');
}

// ---------- 4. spentSkillPoints + overflow-to-stat-points via grantXp ----------
{
  const state = { classId: 'warrior', level: 1, xp: 0, statPoints: 0, skillPoints: 0, skills: {} };
  // max the whole tree by hand (38 points) using a huge banked pool
  state.skillPoints = 38;
  for (const s of getTree('warrior')) for (let i = 0; i < s.maxRank; i++) rankUp(state, 'warrior', s.id);
  assert(spentSkillPoints(state, 'warrior') === 38, 'tree fully maxed at 38 spent points');
  assert(state.skillPoints === 0, 'no banked points left after maxing');
  const statBefore = state.statPoints;
  // simulate one more level-up worth of XP — should convert to a stat point instead of banking a useless skill point
  state.xp = 999999;
  state.level = 1;
  grantXp(state, 0); // amount 0, but xp already huge so the while-loop still rolls a level
  assert(state.statPoints > statBefore, `overflow skill point converted to a stat point (before=${statBefore}, after=${state.statPoints})`);
  assert(state.skillPoints === 0, 'still no banked skill points after overflow conversion');
}

// ---------- 5. action bar ----------
{
  const state = { classId: 'warrior', skills: {}, skillPoints: 5, actionBar: [null, null, null, null] };
  const tree = getTree('warrior');
  rankUp(state, 'warrior', tree[0].id);
  const actives = learnedActives(state, 'warrior');
  assert(actives.length === 1 && actives[0].id === tree[0].id, 'only rank1+ actives are "learned"');
  setActionBarSlot(state, 0, tree[0].id);
  assert(state.actionBar[0] === tree[0].id, 'action bar slot assignment works');
}

// ---------- 6. combat formulas ----------
{
  const attacker = { pAtk: 100, mAtk: 50, accuracy: 90, evasion: 0, critPct: 0 };
  const defender = { pAtk: 0, mAtk: 0, pDef: 0, mDef: 0, accuracy: 0, evasion: 90 };
  const alwaysHit = () => 0;
  const neverHit = () => 0.999;
  assert(rollHit(attacker, defender, false, alwaysHit) === true, 'physical hit rolls true under a favorable rng');
  assert(rollHit(attacker, defender, false, neverHit) === false, 'physical hit rolls false under an unfavorable rng');
  assert(rollHit(attacker, defender, true, neverHit) === true, 'magic always hits regardless of rng');
  assert(mitigate(100, 0) === 100, 'zero defense = no mitigation');
  assert(mitigate(100, 100) === 50, '100 def halves 100 raw damage (100/(100+100))');
  // critPct:0 still has a 5% floor (clampPct) — use rng=0.5 so the crit
  // roll (the only rng() draw a magic skill makes; hit itself is automatic)
  // reliably misses, isolating the base-damage assertion from crit.
  const noCritRng = () => 0.5;
  const dmg = computeDamage({ attacker, defender: { ...defender, mDef: 0 }, isMagic: true, skillPct: 1, rank: 1, rng: noCritRng });
  assert(dmg.hit && dmg.damage === 50, `magic damage = mAtk*skillPct fully unmitigated (got ${dmg.damage}, expected 50)`);
}

// ---------- 7. combatant + skillEngine integration ----------
{
  const casterStats = { maxHp: 100, maxMp: 50, pAtk: 100, mAtk: 20, pDef: 10, mDef: 10, accuracy: 90, evasion: 5, critPct: 0 };
  const targetStats = { maxHp: 100, maxMp: 20, pAtk: 10, mAtk: 10, pDef: 0, mDef: 0, accuracy: 50, evasion: 0, critPct: 0 };
  const caster = createCombatant({ id: 'p1', name: 'Warrior', stats: casterStats, classId: 'warrior' });
  const target = createCombatant({ id: 'e1', name: 'Shadow', stats: targetStats, isEnemy: true });
  const bashDef = getTree('warrior')[0]; // Bash, 5 MP, cd 4s
  const now = 1000;
  const res = castSkill({ caster, targets: [target], skillDef: bashDef, rank: 1, now, rng: () => 0.5 });
  assert(res.ok === true, 'castSkill succeeds when MP available and off cooldown');
  assert(caster.mp === casterStats.maxMp - bashDef.mp, `MP deducted correctly (${caster.mp} === ${casterStats.maxMp - bashDef.mp})`);
  assert(target.hp < target.maxHp, 'target took damage from Bash');
  const res2 = castSkill({ caster, targets: [target], skillDef: bashDef, rank: 1, now: now + 100, rng: () => 0.5 });
  assert(res2.ok === false && res2.reason === 'cooldown', 'recasting immediately is blocked by cooldown');
  const res3 = castSkill({ caster, targets: [target], skillDef: bashDef, rank: 1, now: now + bashDef.cd * 1000 + 1, rng: () => 0.5 });
  assert(res3.ok === true, 'casting again succeeds once the cooldown has elapsed');
}

// ---------- 8. buffs/dots tick correctly ----------
{
  const stats = { maxHp: 100, maxMp: 50, pAtk: 100, mAtk: 20, pDef: 10, mDef: 10, accuracy: 90, evasion: 5, critPct: 0 };
  const c = createCombatant({ id: 'p1', name: 'Test', stats });
  applyBuff(c, { stat: 'pAtk', pct: 0.5, durationSeconds: 5, now: 0 });
  assert(liveStats(c).pAtk === 150, `buff raises pAtk by 50% (got ${liveStats(c).pAtk})`);
  tickBuffs(c, 6000);
  assert(liveStats(c).pAtk === 100, 'buff expires after its duration');

  const target = createCombatant({ id: 'e1', name: 'Target', stats, isEnemy: true });
  applyDot(target, { kind: 'dot', pctPerTick: 0.1, tickSeconds: 1, ticks: 3, sourceId: 'p1', now: 0 });
  let totalTicked = 0;
  for (const t of [1000, 2000, 3000]) totalTicked += tickDots(target, t).length;
  assert(totalTicked === 3, `dot fires exactly 3 times over its duration (got ${totalTicked})`);
  assert(target.dots.length === 0, 'dot list empties once all ticks are consumed');
}

// ---------- 9. threat targeting ----------
{
  const enemy = createCombatant({ id: 'e1', name: 'Boss', stats: { maxHp: 500, maxMp: 0, pAtk: 0, mAtk: 0, pDef: 0, mDef: 0, accuracy: 0, evasion: 0, critPct: 0 }, isEnemy: true });
  const tank = { id: 'tank', threatMultiplier: 2.0 };
  const dps = { id: 'dps', threatMultiplier: 1.0 };
  addThreat(enemy, dps.id, 100, dps.threatMultiplier); // 100 threat
  addThreat(enemy, tank.id, 60, tank.threatMultiplier); // 120 threat — should out-threat the dps's raw damage
  const target = pickTarget(enemy, [tank, dps]);
  assert(target.id === 'tank', `tank (60dmg x2.0=120 threat) out-aggros dps (100dmg x1.0=100 threat) — picked ${target.id}`);
}

// ---------- 10. companion AI 3-tier priority ----------
{
  const tree = getTree('herbmaster');
  const healerStats = { maxHp: 100, maxMp: 100, pAtk: 5, mAtk: 50, pDef: 5, mDef: 20, accuracy: 80, evasion: 5, critPct: 5 };
  const healer = createCombatant({ id: 'healer', name: 'Herbmaster', stats: healerStats, classId: 'herbmaster' });
  healer.skills = { athelas_touch: 1 };
  const woundedAlly = createCombatant({ id: 'ally1', name: 'Wounded', stats: { ...healerStats }, classId: 'warrior' });
  woundedAlly.hp = 20; // 20% — below the 30% emergency threshold
  const enemy = createCombatant({ id: 'e1', name: 'Wolf', stats: { maxHp: 50, maxMp: 0, pAtk: 10, mAtk: 0, pDef: 0, mDef: 0, accuracy: 50, evasion: 0, critPct: 0 }, isEnemy: true });
  const action = decideAction({ self: healer, allies: [woundedAlly], enemies: [enemy], now: 0, tree });
  assert(action.type === 'skill' && action.skillId === 'athelas_touch' && action.targetIds[0] === 'ally1', `emergency tier heals the critical ally (got ${JSON.stringify(action)})`);

  const warTree = getTree('warrior');
  const warrior = createCombatant({ id: 'w1', name: 'Warrior', stats: healerStats, classId: 'warrior' });
  warrior.skills = { bash: 1, cleave: 1, guard_stance: 1, rending_strike: 1, ironhide: 1, shield_slam: 1 };
  const enemy2 = createCombatant({ id: 'e2', name: 'Orc', stats: { maxHp: 80, maxMp: 0, pAtk: 10, mAtk: 0, pDef: 0, mDef: 0, accuracy: 50, evasion: 0, critPct: 0 }, isEnemy: true });
  const tankAction = decideAction({ self: warrior, allies: [], enemies: [enemy2], now: 0, tree: warTree, isPrimaryTarget: false });
  assert(tankAction.type === 'skill' && tankAction.skillId === 'shield_slam', `tank uses Shield Slam to pull threat when not the current target (got ${JSON.stringify(tankAction)})`);
}

// ---------- 11. boss phases + telegraph ----------
{
  const boss = createCombatant({ id: 'boss', name: 'Boss', stats: { maxHp: 1000, maxMp: 0, pAtk: 0, mAtk: 0, pDef: 0, mDef: 0, accuracy: 0, evasion: 0, critPct: 0 }, isEnemy: true });
  const controller = createBossController();
  boss.hp = 1000;
  assert(updatePhase(boss, controller) === false, 'no phase change at full HP');
  boss.hp = 740;
  assert(updatePhase(boss, controller) === true, 'phase changes when crossing the 75% threshold');
  assert(boss.phase === 1, `boss.phase becomes 1 after crossing one threshold (got ${boss.phase})`);
  boss.hp = 100;
  assert(updatePhase(boss, controller) === true && boss.phase === 3, `boss.phase becomes 3 after crossing all three thresholds (got ${boss.phase})`);

  startTelegraph(boss, 'some_big_skill', 1000, 1500);
  assert(isTelegraphReady(boss, 1000) === false, 'telegraph not ready immediately');
  assert(isTelegraphReady(boss, 2600) === true, 'telegraph ready after its window elapses');
}

// ---------- 12. Summoner stat derivation ----------
{
  const masterStats = { maxHp: 200, mAtk: 100, pDef: 20, mDef: 30, accuracy: 90, evasion: 10, critPct: 8 };
  const bird = summonStats('bird', masterStats);
  assert(bird.maxHp === 100, `bird HP = 50% of master's Max HP (got ${bird.maxHp})`);
  assert(bird.atk === 50, `bird ATK = 50% of master's Magic ATK (got ${bird.atk})`);
  const ent = summonStats('ent', masterStats);
  assert(ent.maxHp === 120, `ent HP = 50%*1.2 (Deep Roots) = 60% of master's HP (got ${ent.maxHp}, expected 120)`);
  const beorning = summonStats('beorning', masterStats);
  assert(beorning.atk === Math.round(100 * 0.5 * 1.2), `beorning ATK = 50%*1.2 (Ursine Fury) (got ${beorning.atk})`);
  assert(beorning.pDef === Math.round(20 * 0.5), `beorning DEF = 100%*0.5 (Ursine Fury trade-off) (got ${beorning.pDef})`);
}

console.log('\n' + (failures === 0 ? 'ALL PASSED' : `${failures} FAILURE(S)`));
process.exit(failures === 0 ? 0 : 1);
