import Phaser from 'phaser';
import { EV, TILE } from '../config.js';
import { getState, setState } from '../systems/GameState.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { kindredById } from '../data/kindreds.js';
import { derivedStats } from '../data/classes.js';
import * as cuivienen from '../world/cuivienen.js';
import VanishingQuest from '../quests/vanishing.js';

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
    this.stats = derivedStats(this.state.stats);

    // zone
    const zone = cuivienen.build(this);
    this.zoneInfo = zone;

    // player
    const spawn = this.state.pos ?? cuivienen.tilesToPx(zone.points.spawn);
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

    // NPCs at camp
    this.npcs = [];
    this.quest = new VanishingQuest(this);
    this.addNpc('npc_elder', zone.points.elder, 'Elder Alassë', () => this.quest.talkElder());
    this.addNpc('npc_kinswoman', zone.points.kinswoman, 'Nettë', () => this.quest.talkKinswoman());
    this.addNpc('npc_elf_hunter', zone.points.hunter, 'Herenion', () => this.quest.talkHunter());

    // input
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.wasd = this.input.keyboard?.addKeys('W,A,S,D');

    // UI overlay
    if (this.scene.isActive('UI')) this.scene.stop('UI');
    this.scene.launch('UI');

    const g = this.game.events;
    g.on(EV.ACTION_PRESSED, this.onAction, this);
    g.on(EV.ATTACK_PRESSED, this.onAttack, this);
    g.on(EV.MENU_SAVE, this.onMenuSave, this);
    g.on(EV.MENU_QUIT, this.onMenuQuit, this);
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      g.off(EV.ACTION_PRESSED, this.onAction, this);
      g.off(EV.ATTACK_PRESSED, this.onAttack, this);
      g.off(EV.MENU_SAVE, this.onMenuSave, this);
      g.off(EV.MENU_QUIT, this.onMenuQuit, this);
      this.scale.off('resize', this.onResize, this);
    });

    this.currentInteractable = null;

    // autosave on zone entry (concept doc §15.3)
    this.time.delayedCall(300, () => {
      SaveSystem.saveActive(this, this.captureState(), { where: 'Cuiviénen' });
      this.emitHp();
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
    const p = cuivienen.tilesToPx(tile);
    const spr = this.add.sprite(p.x, p.y, sheet, 10 * 13);
    spr.setDepth(p.y);
    const npc = { sprite: spr, x: p.x, y: p.y, name, label: 'Talk', interact: onTalk };
    this.npcs.push(npc);
    return npc;
  }

  // ---------- state / save ----------

  captureState() {
    const s = { ...this.state, pos: { x: Math.round(this.player.x), y: Math.round(this.player.y) }, zone: 'cuivienen' };
    setState(this, s);
    this.state = s;
    return s;
  }

  onMenuSave() {
    SaveSystem.saveActive(this, this.captureState(), { where: 'Cuiviénen' });
    this.game.events.emit(EV.TOAST, { text: 'Journey saved.' });
  }

  onMenuQuit({ to }) {
    this.captureState();
    this.scene.stop('UI');
    this.scene.start(to);
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

  damagePlayer(amount) {
    this.state.hp = Math.max(1, this.state.hp - amount);
    this.emitHp();
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
    this.time.delayedCall(160, () => this.quest.tryHitShadow());
    this.player.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.attacking = false;
    });
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
    if (this.state.quest.stage === 2) this.quest.encounterUpdate();
    if (this.state.quest.stage === 4) this.quest.followerUpdate();
  }
}
