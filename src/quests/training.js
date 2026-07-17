import Phaser from 'phaser';
import { EV } from '../config.js';
import { tilesToPx, POINTS } from '../world/training.js';
import { effectiveStats } from '../systems/GameState.js';
import { derivedStats } from '../data/classes.js';
import { computeDamage } from '../combat/formulas.js';
import { SUMMON_POWER } from '../fx/summons.js';

// The Training Grounds "quest" — no story, no saves (state.training guards
// SaveSystem). One straw dummy that soaks every hit and never loses HP, so
// each class's full kit (unlocked for the trial) can be judged freely.

const DUMMY_STATS = { pDef: 4, mDef: 4, evasion: 0, critPct: 0 };

export default class TrainingQuest {
  constructor(scene) {
    this.scene = scene;
    this.dummy = null;
  }

  get state() {
    return this.scene.state;
  }

  spawnNpcs() {}

  begin() {
    this.scene.game.events.emit(EV.TRACKER, {
      title: 'Training Grounds',
      objective: 'Strike the dummy — every skill is unlocked here. Leave by the western glow when done.',
    });
    this.scene.game.events.emit(EV.ATTACK_SET, { visible: true });

    // the straw dummy: post + crossbar + sack head
    if (!this.scene.textures.exists('training-dummy')) {
      const g = this.scene.make.graphics({ add: false });
      g.fillStyle(0x6b4a2a, 1);
      g.fillRect(13, 12, 6, 34); // post
      g.fillRect(2, 16, 28, 5); // crossbar
      g.fillStyle(0xd9c084, 1);
      g.fillCircle(16, 8, 8); // sack head
      g.lineStyle(1, 0x8a6a3a, 1);
      g.lineBetween(11, 6, 21, 10);
      g.lineBetween(11, 10, 21, 6);
      g.generateTexture('training-dummy', 32, 48);
      g.destroy();
    }
    const p = tilesToPx(POINTS.dummy);
    this.dummy = this.scene.add.image(p.x, p.y, 'training-dummy').setOrigin(0.5, 0.85).setDepth(p.y);
    // an always-full HP bar — it's a dummy, it never goes down
    this.scene.add.rectangle(p.x, p.y - 46, 42, 5, 0x000000, 0.6).setDepth(10000);
    this.scene.add.rectangle(p.x - 20, p.y - 46, 40, 3, 0x3fae5a, 1).setOrigin(0, 0.5).setDepth(10001);

    const e = tilesToPx(POINTS.exit);
    const glow = this.scene.add.image(e.x, e.y, 'glow').setScale(0.7).setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: glow, scale: 0.85, alpha: 0.55, duration: 1000, yoyo: true, repeat: -1 });
    this.exitPoint = { x: e.x, y: e.y, label: 'Leave Training', interact: () => this.leave() };
  }

  update() {}

  getEnemyPos() {
    return this.dummy ? { x: this.dummy.x, y: this.dummy.y - 14 } : null;
  }

  getEnemies() {
    return this.dummy ? [{ x: this.dummy.x, y: this.dummy.y - 14, hp: 999 }] : [];
  }

  onPlayerAttack() {
    this.hitDummy({ skillPct: 1, isMagic: false, critMult: 2 });
  }

  onPlayerSkill(def, rank = 1) {
    this.hitDummy({ skillPct: def.damagePct ?? 1.4, isMagic: !!def.isMagic, critMult: def.critMult ?? 2, rank, isSkill: true });
  }

  onSummonHit(form) {
    this.hitDummy({ skillPct: SUMMON_POWER[form] ?? 0.55, isMagic: true, critMult: 2, skipRange: true });
  }

  hitDummy({ skillPct, isMagic, critMult, rank = 1, skipRange = false, isSkill = false }) {
    if (!this.dummy) return;
    const player = this.scene.player;
    const range = this.scene.getAttackRangePx?.(isSkill) ?? 84;
    const d = skipRange ? 0 : Phaser.Math.Distance.Between(player.x, player.y, this.dummy.x, this.dummy.y);
    if (d > range) {
      this.scene.showFloatText(player.x, player.y, 'Too far!', '#9aa4bc');
      return;
    }
    const attacker = derivedStats(effectiveStats(this.state));
    const outcome = computeDamage({ attacker, defender: DUMMY_STATS, isMagic, skillPct, rank, critMult });
    // dummy has no evasion, so misses can't happen — show the real number
    this.scene.showFloatText(this.dummy.x, this.dummy.y - 10, `-${outcome.damage}${outcome.crit ? '!' : ''}`, outcome.crit ? '#f2c14e' : '#f0d8d8');
    this.scene.tweens.add({ targets: this.dummy, angle: { from: -6, to: 0 }, duration: 220, ease: 'Sine.easeOut' });
  }

  leave() {
    this.scene.scene.stop('UI');
    this.scene.scene.start('Creation');
  }

  getInteractables() {
    return this.exitPoint ? [this.exitPoint] : [];
  }
}
