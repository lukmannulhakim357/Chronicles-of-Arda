import Phaser from 'phaser';
import { EV } from '../config.js';
import { tilesToPx, POINTS } from '../world/falas.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { grantXp, grantGold } from '../data/leveling.js';
import { effectiveStats } from '../systems/GameState.js';
import { derivedStats } from '../data/classes.js';
import { createCombatant, isAlive, liveStats, damage as dealDamage } from '../combat/combatant.js';
import { computeDamage } from '../combat/formulas.js';
import { SUMMON_POWER } from '../fx/summons.js';

// Quest 9 — "Shipwright and Sea" (waypoint 9, The Falas).
//   0  the shipwright elder, at the shore camp — Ossë's lessons in
//      shipcraft, a peaceful beat, no gameplay attached
//   1  the shadow-servant thread reaches the coast: 3-4 shadow-wisps rush
//      the camp at once — the multi-enemy tutorial, and the moment a
//      player skill cast first "combos" into a companion follow-up hit
//   2  the farewell — some of the Teleri choose to stay by this shore and
//      learn shipcraft, becoming the Falathrim
//   3  continue along the coast
//   4  done — waypoint complete
//
// Canon-lock: Ossë teaching the Teleri to love the Sea, and some of them
// staying behind to become the Falathrim, are both historically fixed.
// The elder who leads them is written to stand in for Círdan's *role*
// (shipwright, leader of those who stay) without ever naming him — Círdan
// is a major named figure in later Ages and must never appear as a
// recruitable or summonable companion, per the design doc's rule for
// every such figure.

const T = (title, objective) => ({ title, objective });
const TRACKER = [
  T('Shipwright and Sea', 'Speak with the shipwright — Ossë has much to teach this camp.'),
  T('Shipwright and Sea', 'Shapes move in the dark past the firelight. Defend the camp.'),
  T('Shipwright and Sea', 'Watch the Falathrim make their choice, then continue.'),
  T('Shipwright and Sea', 'Continue along the coast.'),
  T('The Great Journey', 'Waypoint complete. Open the menu to take the Road West.'),
];

// Four at once, so each is individually weaker than a solo boss fight —
// the tutorial is about handling several threats together, not attrition.
const WISP_STATS = { maxHp: 46, maxMp: 0, pAtk: 8, mAtk: 8, pDef: 2, mDef: 2, accuracy: 65, evasion: 14, critPct: 5 };
const WISP_COUNT = 4;
const WISP_TINT = 0x4a3a6a;
const COMBO_COOLDOWN_MS = 3500;

export default class ShipwrightAndSeaQuest {
  constructor(scene) {
    this.scene = scene;
    this.shipwrightNpc = null;
    this.enemies = [];
    this.playerCombatant = null;
    this.farewellStarted = false;
    this.pathOutPoint = null;
    this.comboReadyAt = 0;
    this.comboTutorialShown = false;
  }

  get state() {
    return this.scene.state;
  }

  get stage() {
    return this.state.quest.stage;
  }

  setStage(n) {
    this.state.quest.stage = n;
    this.updateTracker();
  }

  updateTracker() {
    this.scene.game.events.emit(EV.TRACKER, TRACKER[Math.min(this.stage, TRACKER.length - 1)]);
  }

  dialogue(lines, choices, onDone) {
    this.scene.game.events.emit(EV.DIALOGUE, { lines, choices, onDone });
  }

  toast(text, duration) {
    this.scene.game.events.emit(EV.TOAST, { text, duration });
  }

  autosave(where) {
    const s = this.scene.captureState();
    SaveSystem.saveActive(this.scene, s, { where });
  }

  // ---------- NPCs ----------

  spawnNpcs() {
    if (this.stage <= 0) this.spawnShipwright();
    if (this.stage === 1) this.startEncounter();
  }

  spawnShipwright() {
    if (this.shipwrightNpc) return;
    this.shipwrightNpc = this.scene.addNpc('npc_elder', POINTS.shipwright, 'the shipwright', () => this.talkShipwright());
  }

  update() {
    if (this.stage === 1) this.encounterUpdate();
  }

  // ---------- setup on zone entry (fresh or from a save) ----------

  begin() {
    this.updateTracker();
    if (this.stage === 0 && !this.state.seenIntro) {
      this.state.seenIntro = true;
      this.scene.time.delayedCall(500, () => {
        this.toast('The trees give way at last to open sky and open water — the Sea, wider than the march has ever imagined it.', 3200);
      });
    }
    if (this.stage === 1) this.startEncounter();
    if (this.stage === 3) this.spawnPathOutPoint();
  }

  // ---------- stage 0: the shipwright's lesson (pure lore, no gameplay) ----------

  talkShipwright() {
    if (this.stage !== 0) return;
    this.dialogue(
      [
        { speaker: 'the shipwright', text: 'A voice out of the water spoke to me last night — Ossë, the Teleri who came ahead of us call him. He loves this Sea the way Oromë loves open country.' },
        { speaker: 'the shipwright', text: "He showed me how the waves take a shape, over and over, and how a hull might learn to take that same shape and not fight it. I don't have the words yet. My hands might, given time." },
        { speaker: 'the shipwright', text: 'Rest here tonight. Tomorrow the march goes on — but something about this shore already feels like it wants to keep some of us.' },
      ],
      null,
      () => {
        this.setStage(1);
        this.autosave('The Falas');
        this.scene.time.delayedCall(900, () => this.startEncounter());
      }
    );
  }

  // ---------- stage 1: the ambush — multi-enemy + companion combo tutorial ----------

  startEncounter() {
    if (this.enemies.length) return;
    this.scene.game.events.emit(EV.ATTACK_SET, { visible: true });
    this.encounterOver = false;

    const derived = derivedStats(effectiveStats(this.state));
    this.playerCombatant = createCombatant({ id: 'player', name: 'You', stats: derived, classId: this.state.classId });
    this.playerCombatant.hp = this.state.hp;
    this.playerCombatant.mp = this.state.mp ?? derived.maxMp;

    const base = tilesToPx(POINTS.ambush);
    for (let i = 0; i < WISP_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / WISP_COUNT;
      const spawnX = base.x + Math.cos(angle) * 70;
      const spawnY = base.y + Math.sin(angle) * 50;
      // same placeholder shadow-servant thread as every prior encounter
      // this march (WP1's shadow, WP3's wolf, WP4's wisp, WP5's frost-shade)
      const sprite = this.scene.physics.add.sprite(spawnX, spawnY, 'npc_shadow', 130);
      sprite.setDepth(9999).setAlpha(0.85).setTint(WISP_TINT).setScale(0.85);
      this.scene.tweens.add({ targets: sprite, alpha: 0.6, duration: 700, yoyo: true, repeat: -1 });
      const hpBg = this.scene.add.rectangle(spawnX, spawnY - 32, 36, 5, 0x000000, 0.6).setDepth(10000);
      const hpFill = this.scene.add.rectangle(spawnX - 18, spawnY - 32, 34, 3, 0xa03030, 1).setOrigin(0, 0.5).setDepth(10001);
      const combatant = createCombatant({ id: `wisp${i}`, name: 'Shadow-wisp', stats: WISP_STATS, isEnemy: true });
      const enemy = { sprite, hpBg, hpFill, combatant, homeX: spawnX, homeY: spawnY };
      enemy.lungeTimer = this.scene.time.addEvent({ delay: Phaser.Math.Between(1800, 2400), loop: true, callback: () => this.enemyLunge(enemy) });
      this.enemies.push(enemy);
    }

    this.toast('Shadow-shapes surge out of the dark and into the firelight — the same darkness that has dogged this march since Cuiviénen.', 3400);
  }

  enemyLunge(e) {
    if (this.encounterOver || !e.sprite?.active || !isAlive(e.combatant)) return;
    const player = this.scene.player;
    const companions = (this.scene.partyMembers ?? []).filter((p) => p.sprite?.active && isAlive(p.combatant));
    const pool = [{ kind: 'player', x: player.x, y: player.y }, ...companions.map((p) => ({ kind: 'companion', p, x: p.sprite.x, y: p.sprite.y }))];
    const target = Phaser.Utils.Array.GetRandom(pool);
    this.scene.tweens.add({
      targets: e.sprite,
      x: target.x,
      y: target.y,
      duration: 380,
      ease: 'Sine.easeIn',
      onComplete: () => {
        if (!e.sprite?.active) return;
        this.enemyAttack(e, target);
        this.scene.tweens.add({ targets: e.sprite, x: e.homeX + Phaser.Math.Between(-30, 30), y: e.homeY + Phaser.Math.Between(-20, 20), duration: 500, ease: 'Sine.easeOut' });
      },
    });
  }

  enemyAttack(e, target) {
    if (this.encounterOver || !isAlive(e.combatant)) return;
    if (target.kind === 'player') {
      const outcome = computeDamage({ attacker: liveStats(e.combatant), defender: liveStats(this.playerCombatant), isMagic: true, skillPct: 0.75, rank: 1 });
      if (outcome.hit) {
        this.playerCombatant.hp = Math.max(0, this.playerCombatant.hp - outcome.damage);
        this.scene.damagePlayer(outcome.damage);
        if (this.playerCombatant.hp / this.playerCombatant.maxHp <= 0.2) this.endEncounter(true);
      } else {
        this.toast('It lashes out — and passes right through you.', 1100);
      }
      return;
    }
    const combatant = target.p.combatant;
    const outcome = computeDamage({ attacker: liveStats(e.combatant), defender: liveStats(combatant), isMagic: true, skillPct: 0.75, rank: 1 });
    if (outcome.hit) {
      dealDamage(combatant, outcome.damage);
      this.scene.showFloatText(target.p.sprite.x, target.p.sprite.y, `-${outcome.damage}`, '#e88a8a');
      target.p.sprite.setTintFill(0xffffff);
      this.scene.time.delayedCall(90, () => target.p.sprite?.clearTint());
    }
  }

  // Lowest-HP alive wisp — same "auto-aim, weakest first" convention the
  // WorldScene itself already uses for the player's basic-attack targeting.
  pickTarget() {
    const alive = this.enemies.filter((e) => e.sprite?.active && isAlive(e.combatant));
    if (!alive.length) return null;
    alive.sort((a, b) => a.combatant.hp - b.combatant.hp);
    return alive[0];
  }

  getEnemyPos() {
    const e = this.pickTarget();
    return e ? { x: e.sprite.x, y: e.sprite.y } : null;
  }

  getEnemies() {
    return this.enemies.filter((e) => e.sprite?.active && isAlive(e.combatant)).map((e) => ({ x: e.sprite.x, y: e.sprite.y, hp: e.combatant.hp }));
  }

  onPlayerAttack() {
    this.strikeTarget({ skillPct: 1, isMagic: false, critMult: 2 });
  }

  onPlayerSkill(def, rank = 1) {
    this.strikeTarget({ skillPct: def.damagePct ?? 1.4, isMagic: !!def.isMagic, critMult: def.critMult ?? 2, rank, isSkill: true });
    this.maybeTriggerCombo();
  }

  onSummonHit(form) {
    this.strikeTarget({ skillPct: SUMMON_POWER[form] ?? 0.55, isMagic: true, critMult: 2, skipRange: true });
  }

  strikeTarget({ skillPct, isMagic, critMult, rank = 1, skipRange = false, isSkill = false }) {
    if (this.encounterOver) return;
    const e = this.pickTarget();
    if (!e) return;
    const player = this.scene.player;
    const range = this.scene.getAttackRangePx?.(isSkill) ?? 84;
    const d = skipRange ? 0 : Phaser.Math.Distance.Between(player.x, player.y, e.sprite.x, e.sprite.y);
    if (d > range) {
      this.scene.showFloatText(player.x, player.y, 'Too far!', '#9aa4bc');
      return;
    }
    const outcome = computeDamage({ attacker: liveStats(this.playerCombatant), defender: liveStats(e.combatant), isMagic, skillPct, rank, critMult });
    if (!outcome.hit) {
      this.scene.showFloatText(e.sprite.x, e.sprite.y, 'Miss!', '#9aa4bc');
      return;
    }
    dealDamage(e.combatant, outcome.damage);
    this.scene.showFloatText(e.sprite.x, e.sprite.y, `-${outcome.damage}${outcome.crit ? '!' : ''}`, outcome.crit ? '#f2c14e' : '#f0d8d8');
    e.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(90, () => e.sprite?.setTint(WISP_TINT));
    this.lastHitEnemy = e;
    if (!isAlive(e.combatant)) this.defeatEnemy(e);
    this.checkEncounterEnd();
  }

  // Companions resolve their own attacks/skills through this (same path
  // every prior waypoint's onCompanionAttack uses), picking their own
  // target rather than always mirroring the player's.
  onCompanionAttack(comp, combatant, { skillPct, isMagic, rank = 1 }) {
    if (this.encounterOver) return;
    const e = this.pickTarget();
    if (!e) return;
    const outcome = computeDamage({ attacker: liveStats(combatant), defender: liveStats(e.combatant), isMagic, skillPct, rank, critMult: 2 });
    if (!outcome.hit) {
      this.scene.showFloatText(e.sprite.x, e.sprite.y, 'Miss!', '#9aa4bc');
      return;
    }
    dealDamage(e.combatant, outcome.damage);
    this.scene.showFloatText(e.sprite.x, e.sprite.y, `-${outcome.damage}${outcome.crit ? '!' : ''}`, outcome.crit ? '#f2c14e' : '#c8d8ff');
    e.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(90, () => e.sprite?.setTint(WISP_TINT));
    if (!isAlive(e.combatant)) this.defeatEnemy(e);
    this.checkEncounterEnd();
  }

  // The combo tutorial (design doc §15): a basic version, one fixed trigger
  // pair rather than a full combo system — any player skill cast (not
  // gated to a specific skill "kind", since only half the classes even
  // have a cc/debuff-kind skill) has a chance, on an internal cooldown, to
  // pull an immediate follow-up hit from a companion on the same target.
  maybeTriggerCombo() {
    if (this.encounterOver) return;
    const now = this.scene.time.now;
    if (now < this.comboReadyAt) return;
    const alive = (this.scene.partyMembers ?? []).filter((p) => p.sprite?.active && isAlive(p.combatant));
    if (!alive.length) return;
    const target = this.lastHitEnemy?.sprite?.active && isAlive(this.lastHitEnemy.combatant) ? this.lastHitEnemy : this.pickTarget();
    if (!target) return;
    this.comboReadyAt = now + COMBO_COOLDOWN_MS;
    const p = Phaser.Utils.Array.GetRandom(alive);
    if (!this.comboTutorialShown) {
      this.comboTutorialShown = true;
      this.toast(`${p.comp.name} reads your strike and follows through — a combo!`, 2800);
    }
    this.scene.time.delayedCall(240, () => {
      if (this.encounterOver || !target.sprite?.active || !isAlive(target.combatant)) return;
      const outcome = computeDamage({ attacker: liveStats(p.combatant), defender: liveStats(target.combatant), isMagic: false, skillPct: 1.2, rank: 1, critMult: 2 });
      if (!outcome.hit) return;
      dealDamage(target.combatant, outcome.damage);
      this.scene.showFloatText(target.sprite.x, target.sprite.y - 14, `Combo! -${outcome.damage}`, '#ffd76a');
      target.sprite.setTintFill(0xffffff);
      this.scene.time.delayedCall(90, () => target.sprite?.setTint(WISP_TINT));
      if (!isAlive(target.combatant)) this.defeatEnemy(target);
      this.checkEncounterEnd();
    });
  }

  defeatEnemy(e) {
    e.lungeTimer?.remove();
    e.hpBg?.destroy();
    e.hpFill?.destroy();
    if (e.sprite?.active) {
      this.scene.tweens.add({ targets: e.sprite, alpha: 0, duration: 600, ease: 'Sine.easeIn', onComplete: () => e.sprite?.destroy() });
    }
  }

  checkEncounterEnd() {
    if (this.enemies.length && this.enemies.every((e) => !isAlive(e.combatant))) this.endEncounter(false);
  }

  encounterUpdate() {
    for (const e of this.enemies) {
      if (!e.sprite?.active || !e.hpBg?.active) continue;
      e.hpBg.setPosition(e.sprite.x, e.sprite.y - 32);
      e.hpFill.setPosition(e.sprite.x - 18, e.sprite.y - 32);
      e.hpFill.width = 34 * Math.max(0, e.combatant.hp / e.combatant.maxHp);
    }
  }

  endEncounter(rescued = false) {
    if (this.encounterOver) return;
    this.encounterOver = true;
    for (const e of this.enemies) {
      e.lungeTimer?.remove();
      e.hpBg?.destroy();
      e.hpFill?.destroy();
      if (e.sprite?.active) {
        this.scene.tweens.add({ targets: e.sprite, alpha: 0, duration: 700, ease: 'Sine.easeIn', onComplete: () => e.sprite?.destroy() });
      }
    }
    this.scene.game.events.emit(EV.ATTACK_SET, { visible: false });
    this.toast(
      rescued
        ? 'A wave rears up out of nowhere and swallows the dark shapes whole — the Sea itself seems to have taken a side tonight.'
        : 'The shadow-shapes thin to smoke and scatter along the sand, gone as quickly as they came.',
      3200
    );
    this.scene.time.delayedCall(1200, () => {
      this.setStage(2);
      this.spawnFarewell();
      this.scene.healPlayer();
      grantXp(this.state, 30);
      this.scene.emitXp();
      this.autosave('The Falas');
    });
  }

  // ---------- stage 2: the Falathrim's farewell ----------

  spawnFarewell() {
    if (this.farewellStarted) return;
    this.farewellStarted = true;
    this.dialogue(
      [
        { speaker: 'the shipwright', text: "Some of us will go no further along this shore than here. The Sea taught me things tonight I don't think I could unlearn, even if I wanted to." },
        { speaker: 'the shipwright', text: "Others feel it too. We'll stay, and build, and learn to shape wood the way the waves shape stone. Someone has to be first." },
      ],
      null,
      () => this.runFarewellCrowd()
    );
  }

  runFarewellCrowd() {
    const from = tilesToPx(POINTS.shipwright);
    const to = tilesToPx(POINTS.farewell);
    const crowd = [];
    const leadSprite = this.shipwrightNpc?.sprite ?? this.scene.add.sprite(from.x, from.y, 'npc_elder', 130);
    leadSprite.setDepth(from.y);
    crowd.push(leadSprite);
    for (let i = 0; i < 4; i++) {
      const sheet = i % 2 === 0 ? 'npc_kinsman' : 'npc_kinswoman';
      const spr = this.scene.add.sprite(from.x + Phaser.Math.Between(-30, 30), from.y + Phaser.Math.Between(-16, 16), sheet, 130);
      spr.setDepth(spr.y);
      crowd.push(spr);
    }

    this.scene.npcs = this.scene.npcs.filter((n) => n !== this.shipwrightNpc);

    this.toast('Those who choose to stay walk down toward the water, already talking of keels and oars — the first of the Falathrim.', 3400);
    crowd.forEach((spr, i) => {
      spr.play(`${spr.texture.key}-walk-left`, true);
      this.scene.tweens.add({
        targets: spr,
        x: to.x + Phaser.Math.Between(-20, 20),
        y: to.y + Phaser.Math.Between(-16, 16),
        alpha: 0,
        duration: 2600 + i * 100,
        ease: 'Sine.easeIn',
        onComplete: () => spr.destroy(),
      });
    });

    this.scene.time.delayedCall(2900, () => {
      this.setStage(3);
      this.spawnPathOutPoint();
      this.autosave('The Falas');
    });
  }

  // ---------- stage 3: the road onward ----------

  spawnPathOutPoint() {
    if (this.pathOutPoint) return;
    const p = tilesToPx(POINTS.pathOut);
    const glow = this.scene.add.image(p.x, p.y, 'glow').setScale(0.6).setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: glow, scale: 0.72, alpha: 0.55, duration: 1000, yoyo: true, repeat: -1 });
    this.pathOutPoint = { x: p.x, y: p.y, glow, label: 'Continue Along the Coast', interact: () => this.finishQuest() };
  }

  finishQuest() {
    if (this.stage !== 3 || !this.pathOutPoint) return;
    this.pathOutPoint.glow.destroy();
    this.pathOutPoint = null;
    this.setStage(4);
    this.state.waypointIndex = 9;
    grantXp(this.state, 35);
    grantGold(this.state, 35);
    this.scene.emitXp();
    this.scene.emitGold();
    this.autosave('The Falas — along the shore');
    this.scene.time.delayedCall(400, () => {
      this.scene.scene.stop('UI');
      this.scene.scene.start('Story', {
        id: 'of-the-falathrim',
        title: 'Of the Falathrim',
        paragraphs: [
          'Waypoint 9 — The Falas: complete.',
          'Ossë taught the Teleri to love the Sea, and some of them could not bring themselves to leave it. Under a shipwright who would not give his craft a name, they stayed on that shore to learn what the waves already knew.',
          'In the songs sung long after, they would be called the Falathrim, the people of the shore — and their ships, when at last they were built, would matter more than anyone standing on that beach could have guessed.',
          'Beyond the Falas, the Sea itself still waits — wider than any river, and with no ford across it that any of you can see yet.',
        ],
        rewards: { xp: 35, gold: 35 },
        button: 'To the Road West',
        next: 'Journey',
      });
    });
  }

  // ---------- interactables the WorldScene should offer right now ----------

  getInteractables() {
    const list = [];
    if (this.pathOutPoint) list.push(this.pathOutPoint);
    return list;
  }
}
