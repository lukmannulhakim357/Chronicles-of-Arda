import Phaser from 'phaser';
import { EV, FONTS } from '../config.js';
import { getState, setState, effectiveStats } from '../systems/GameState.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { kindredById } from '../data/kindreds.js';
import { derivedStats } from '../data/classes.js';
import { WAYPOINTS } from '../data/waypoints.js';
import { ZONES } from '../world/zones.js';
import { tilesToPx } from '../world/coords.js';
import { xpToNextLevel } from '../data/leveling.js';
import { skillDef, rankOf } from '../data/skills.js';

const SPEED = 150;

export default class WorldScene extends Phaser.Scene {
  constructor() {
    super('World');
  }

  create() {
    this.state = getState(this);
    if (!this.state) {
      this.scene.start('Title');
      return;
    }
    this.stats = derivedStats(effectiveStats(this.state));

    const zoneDef = ZONES[this.state.zone];
    if (!zoneDef) {
      this.scene.start('Title');
      return;
    }
    this.zoneName = WAYPOINTS.find((w) => w.id === this.state.zone)?.name ?? this.state.zone;

    // zone
    const zone = zoneDef.build(this);
    this.zoneInfo = zone;

    // player
    const spawn = this.state.pos ?? tilesToPx(zone.points.spawn);
    const sheet = kindredById(this.state.kindred).sheet;
    this.sheet = sheet;
    this.player = this.physics.add.sprite(spawn.x, spawn.y, sheet, 10 * 13);
    this.player.body.setSize(20, 16);
    this.player.body.setOffset(22, 44);
    this.player.setCollideWorldBounds(true);
    this.facing = 'down';
    this.attackCooldown = 0;
    this.attacking = false;

    this.physics.add.collider(this.player, zone.colliders);

    // camera
    const cam = this.cameras.main;
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.setZoom(this.pickZoom());
    this.scale.on('resize', this.onResize, this);

    // starlit night overlay
    this.night = this.add
      .rectangle(0, 0, this.scale.width * 4, this.scale.height * 4, 0x0a1128, 0.42)
      .setScrollFactor(0)
      .setDepth(50000);
    this.nightBaseAlpha = 0.42;

    // zone NPCs + quest
    this.npcs = [];
    this.quest = new zoneDef.Quest(this);
    this.quest.spawnNpcs(zone.points);

    // input
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.wasd = this.input.keyboard?.addKeys('W,A,S,D');

    // UI overlay
    if (this.scene.isActive('UI')) this.scene.stop('UI');
    this.scene.launch('UI');

    const g = this.game.events;
    g.on(EV.ACTION_PRESSED, this.onAction, this);
    g.on(EV.ATTACK_PRESSED, this.onAttack, this);
    g.on(EV.SKILL_PRESSED, this.onSkillPressed, this);
    g.on(EV.MENU_SAVE, this.onMenuSave, this);
    g.on(EV.MENU_QUIT, this.onMenuQuit, this);
    g.on(EV.MENU_CHARACTER, this.onOpenCharacter, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.onResumeFromOverlay, this);
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      g.off(EV.ACTION_PRESSED, this.onAction, this);
      g.off(EV.ATTACK_PRESSED, this.onAttack, this);
      g.off(EV.SKILL_PRESSED, this.onSkillPressed, this);
      g.off(EV.MENU_SAVE, this.onMenuSave, this);
      g.off(EV.MENU_QUIT, this.onMenuQuit, this);
      g.off(EV.MENU_CHARACTER, this.onOpenCharacter, this);
      this.scale.off('resize', this.onResize, this);
    });
    this.skillCooldowns = {}; // skillId -> ready-at timestamp (scene clock)

    this.currentInteractable = null;

    // autosave on zone entry (concept doc §15.3)
    this.time.delayedCall(300, () => {
      SaveSystem.saveActive(this, this.captureState(), { where: this.zoneName });
      this.emitHp();
      this.emitMp();
      this.emitXp();
      this.emitGold();
      this.emitSkillbar();
      this.quest.begin();
    });
  }

  pickZoom() {
    const shorter = Math.min(this.scale.width, this.scale.height);
    if (shorter < 420) return 1.6;
    if (shorter < 760) return 2;
    return 2.4;
  }

  onResize() {
    this.cameras.main?.setZoom(this.pickZoom());
    this.night?.setSize(this.scale.width * 4, this.scale.height * 4);
  }

  addNpc(sheet, tile, name, onTalk) {
    const p = tilesToPx(tile);
    const spr = this.add.sprite(p.x, p.y, sheet, 10 * 13);
    spr.setDepth(p.y);
    const npc = {
      sprite: spr,
      get x() {
        return spr.x;
      },
      get y() {
        return spr.y;
      },
      name,
      label: 'Talk',
      interact: onTalk,
    };
    this.npcs.push(npc);
    return npc;
  }

  // ---------- state / save ----------

  captureState() {
    const s = {
      ...this.state,
      pos: { x: Math.round(this.player.x), y: Math.round(this.player.y) },
      zone: this.state.zone,
    };
    setState(this, s);
    this.state = s;
    return s;
  }

  onMenuSave() {
    SaveSystem.saveActive(this, this.captureState(), { where: this.zoneName });
    this.game.events.emit(EV.TOAST, { text: 'Journey saved.' });
  }

  onMenuQuit({ to }) {
    this.captureState();
    this.scene.stop('UI');
    this.scene.start(to);
  }

  onOpenCharacter(data) {
    this.captureState();
    this.scene.pause();
    this.scene.pause('UI');
    this.scene.launch('Character', data ?? {});
  }

  // scripted tutorial moment (Oromë naming the Eldar) — opens straight to
  // the Gear tab (which also holds Stats) with the level-up banner shown
  openCharacterForLevelUp() {
    this.captureState();
    this.scene.pause();
    this.scene.pause('UI');
    this.scene.launch('Character', { tab: 'gear', levelUp: true });
  }

  // scripted tutorial moment (first waypoint-ending gear reward) — opens
  // the Gear tab with a nudge to equip what was just received
  openCharacterForGearTutorial() {
    this.captureState();
    this.scene.pause();
    this.scene.pause('UI');
    this.scene.launch('Character', { tab: 'gear', gearTutorial: true });
  }

  // equipment/stats may have changed in the Character scene while World
  // was paused — refresh derived stats and clamp HP/MP down if their max dropped
  onResumeFromOverlay() {
    this.state = getState(this);
    this.stats = derivedStats(effectiveStats(this.state));
    if (this.state.hp > this.stats.maxHp) this.state.hp = this.stats.maxHp;
    if (this.state.mp > this.stats.maxMp) this.state.mp = this.stats.maxMp;
    this.emitHp();
    this.emitMp();
    this.emitXp();
    this.emitGold();
    this.emitSkillbar();
  }

  // ---------- hp ----------

  getHp() {
    return this.state.hp;
  }

  getMaxHp() {
    return this.stats.maxHp;
  }

  emitHp() {
    this.game.events.emit(EV.HP, { hp: this.state.hp, maxHp: this.stats.maxHp });
  }

  emitXp() {
    this.game.events.emit(EV.XP, {
      level: this.state.level,
      xp: this.state.xp,
      xpToNext: xpToNextLevel(this.state.level),
    });
  }

  emitMp() {
    this.game.events.emit(EV.MP, { mp: this.state.mp, maxMp: this.stats.maxMp });
  }

  emitGold() {
    this.game.events.emit(EV.GOLD, { gold: this.state.gold ?? 0 });
  }

  damagePlayer(amount) {
    this.state.hp = Math.max(1, this.state.hp - amount);
    this.emitHp();
    this.showFloatText(this.player.x, this.player.y, `-${amount}`, '#e88a8a');
    this.cameras.main.shake(120, 0.004);
    this.player.setTintFill(0xffffff);
    this.time.delayedCall(90, () => this.player.clearTint());
  }

  healPlayer() {
    this.state.hp = this.stats.maxHp;
    this.emitHp();
  }

  // ---------- night mood ----------

  deepenNight(alpha) {
    this.tweens.add({ targets: this.night, fillAlpha: alpha, duration: 900 });
  }

  restoreNight() {
    this.tweens.add({ targets: this.night, fillAlpha: this.nightBaseAlpha, duration: 1400 });
  }

  // ---------- interaction & combat ----------

  onAction() {
    if (this.game.uiBlocking) return;
    this.currentInteractable?.interact();
  }

  onAttack() {
    if (this.game.uiBlocking || this.attacking) return;
    if (this.time.now < this.attackCooldown) return;
    this.attackCooldown = this.time.now + 550;
    this.attacking = true;
    this.player.play(`${this.sheet}-slash-${this.facing}`, true);
    // small forward step so a standing attack still reads as a strike,
    // not a frozen sprite
    const step = { up: [0, -8], down: [0, 8], left: [-8, 0], right: [8, 0] }[this.facing];
    this.tweens.add({ targets: this.player, x: this.player.x + step[0], y: this.player.y + step[1], duration: 110, yoyo: true, ease: 'Sine.easeOut' });
    this.time.delayedCall(160, () => this.quest.onPlayerAttack?.());
    this.player.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.attacking = false;
    });
  }

  // ---------- skills (action-bar slots in the HUD) ----------

  emitSkillbar() {
    const bar = this.state.actionBar ?? [null, null, null, null];
    const slots = bar.map((id) => {
      if (!id) return null;
      const def = skillDef(this.state.classId, id);
      if (!def) return null;
      const ready = (this.skillCooldowns?.[id] ?? 0) <= this.time.now && (this.state.mp ?? 0) >= (def.mp ?? 0);
      return { name: def.name, ready };
    });
    this.game.events.emit(EV.SKILLBAR, { slots });
  }

  onSkillPressed({ slot }) {
    if (this.game.uiBlocking || this.attacking) return;
    const id = this.state.actionBar?.[slot];
    if (!id) return;
    const def = skillDef(this.state.classId, id);
    if (!def) return;
    if ((this.skillCooldowns[id] ?? 0) > this.time.now) {
      this.game.events.emit(EV.TOAST, { text: `${def.name} is still recovering.`, duration: 1200 });
      return;
    }
    if ((this.state.mp ?? 0) < (def.mp ?? 0)) {
      this.game.events.emit(EV.TOAST, { text: 'Not enough MP.', duration: 1200 });
      return;
    }
    this.state.mp -= def.mp ?? 0;
    this.skillCooldowns[id] = this.time.now + (def.cd ?? 0) * 1000;
    this.emitMp();
    this.attacking = true;
    this.player.play(`${this.sheet}-slash-${this.facing}`, true);
    const step = { up: [0, -10], down: [0, 10], left: [-10, 0], right: [10, 0] }[this.facing];
    this.tweens.add({ targets: this.player, x: this.player.x + step[0], y: this.player.y + step[1], duration: 120, yoyo: true, ease: 'Sine.easeOut' });
    const flash = this.add.image(this.player.x, this.player.y - 20, 'glow').setScale(0.7).setDepth(this.player.y + 1).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: flash, scale: 1.1, alpha: 0, duration: 380, onComplete: () => flash.destroy() });
    const rank = rankOf(this.state, id);
    this.time.delayedCall(180, () => this.quest.onPlayerSkill?.(def, rank));
    this.player.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.attacking = false;
    });
    this.emitSkillbar();
    this.time.delayedCall((def.cd ?? 0) * 1000 + 50, () => this.emitSkillbar());
  }

  // floating combat number above a world position (damage, heals, misses)
  showFloatText(x, y, text, color = '#f0e8d8') {
    const t = this.add
      .text(x, y - 28, text, { fontFamily: FONTS.body, fontSize: '14px', color, stroke: '#05060f', strokeThickness: 3 })
      .setOrigin(0.5)
      .setDepth(60000);
    this.tweens.add({ targets: t, y: y - 54, alpha: 0, duration: 850, ease: 'Sine.easeOut', onComplete: () => t.destroy() });
  }

  update() {
    if (!this.player) return;

    // movement — virtual joystick or keyboard
    let vx = 0;
    let vy = 0;
    if (!this.game.uiBlocking) {
      const joy = this.game.joy ?? { x: 0, y: 0 };
      vx = joy.x;
      vy = joy.y;
      if (this.cursors) {
        if (this.cursors.left.isDown || this.wasd.A.isDown) vx = -1;
        else if (this.cursors.right.isDown || this.wasd.D.isDown) vx = 1;
        if (this.cursors.up.isDown || this.wasd.W.isDown) vy = -1;
        else if (this.cursors.down.isDown || this.wasd.S.isDown) vy = 1;
      }
    }

    const len = Math.hypot(vx, vy);
    if (len > 1) {
      vx /= len;
      vy /= len;
    }
    this.player.setVelocity(vx * SPEED, vy * SPEED);

    if (!this.attacking) {
      if (len > 0.01) {
        this.facing = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : vy > 0 ? 'down' : 'up';
        this.player.play(`${this.sheet}-walk-${this.facing}`, true);
      } else if (this.player.anims.currentAnim?.key.includes('-walk-')) {
        this.player.play(`${this.sheet}-idle-${this.facing}`, true);
      }
    }
    this.player.setDepth(this.player.y);

    // nearest interactable (NPCs + quest objects)
    const candidates = [...this.npcs, ...this.quest.getInteractables()];
    let best = null;
    let bestD = 56;
    for (const c of candidates) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x, c.y);
      if (d < bestD) {
        best = c;
        bestD = d;
      }
    }
    if (best !== this.currentInteractable) {
      this.currentInteractable = best;
      this.game.events.emit(EV.ACTION_SET, best ? { label: best.label } : null);
    }

    // quest per-frame logic
    this.quest.update();
  }
}
