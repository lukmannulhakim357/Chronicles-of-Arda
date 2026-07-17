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
import { skillDef, rankOf, skillRing } from '../data/skills.js';
import { playSkillFx, playUltimate } from '../fx/skillfx.js';
import { playWeaponSwing, animFamilyOf, playShieldBash, playWhirlwindSpin, playArrowRain } from '../fx/weapons.js';
import { WEAPON_BY_CLASS, weaponRangePx } from '../data/items.js';
import { spawnSummon, SUMMON_FORMS } from '../fx/summons.js';
import { iconTint } from '../fx/skillicons.js';

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

  // Attack reach follows the wielded weapon's range tier (bow longest,
  // staff/talisman mid, melee short); bare hands fight at melee reach.
  getAttackRangePx(forSkill = false) {
    const wid = this.state.equipment?.weapon ?? (forSkill ? WEAPON_BY_CLASS[this.state.classId] : null);
    return weaponRangePx(wid);
  }

  // Auto-aim: any enemy inside weapon range is a valid target from any
  // angle — no need to line up. With several enemies, the lowest-HP one
  // is picked first.
  pickEnemyTarget(rangePx) {
    const list = this.quest.getEnemies?.() ?? (this.quest.getEnemyPos?.() ? [this.quest.getEnemyPos()] : []);
    const inRange = list.filter(
      (e) => e && Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y) <= rangePx
    );
    if (!inRange.length) return null;
    inRange.sort((a, b) => (a.hp ?? Infinity) - (b.hp ?? Infinity));
    return inRange[0];
  }

  faceToward(target) {
    const dx = target.x - this.player.x;
    const dy = target.y - this.player.y;
    this.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
  }

  onAttack() {
    if (this.game.uiBlocking || this.attacking) return;
    if (this.time.now < this.attackCooldown) return;
    this.attackCooldown = this.time.now + 550;
    this.attacking = true;
    const target = this.pickEnemyTarget(this.getAttackRangePx(false));
    if (target) this.faceToward(target); // snap toward the auto-aimed enemy
    // the body plays the pose the equipped weapon actually calls for — a
    // bow draws and looses, a spear lunges, everything else still swings
    const family = animFamilyOf(this.state.equipment?.weapon);
    this.player.play(`${this.sheet}-${family}-${this.facing}`, true);
    // equipped weapon appears in hand and swings with the attack; ranged
    // shots streak straight at the target, whatever the angle
    if (this.state.equipment?.weapon)
      playWeaponSwing(this, this.player, this.state.equipment.weapon, this.facing, { skill: false, targetPos: target });
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
    const slots = skillRing(this.state).map((entry) => {
      if (!entry) return null;
      if (entry.type === 'potion') {
        const count = this.state.potions?.[entry.pot] ?? 0;
        return { name: `🧪${entry.pot.toUpperCase()}\n×${count}`, ready: count > 0, potion: entry.pot };
      }
      const def = skillDef(this.state.classId, entry.id);
      if (!def) return null;
      const ready = (this.skillCooldowns?.[entry.id] ?? 0) <= this.time.now && (this.state.mp ?? 0) >= (def.mp ?? 0);
      return { name: def.name, ready, icon: def.icon, tint: iconTint(def) };
    });
    this.game.events.emit(EV.SKILLBAR, { slots });
  }

  onSkillPressed({ slot }) {
    if (this.game.uiBlocking || this.attacking) return;
    const entry = skillRing(this.state)[slot];
    if (!entry) return;
    if (entry.type === 'potion') return this.usePotion(entry.pot);

    const id = entry.id;
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
    // a skill is never a bare-handed shrug, even before the first weapon
    // drop — fall back to the class's signature weapon so there's always a
    // pose to play. Shield Slam always lunges (it's a bash, not a cut)
    // regardless of what's actually equipped.
    const skillWeapon = this.state.equipment?.weapon ?? WEAPON_BY_CLASS[this.state.classId];
    const family = id === 'shield_slam' ? 'thrust' : animFamilyOf(skillWeapon);
    this.player.play(`${this.sheet}-${family}-${this.facing}`, true);
    const step = { up: [0, -10], down: [0, 10], left: [-10, 0], right: [10, 0] }[this.facing];
    this.tweens.add({ targets: this.player, x: this.player.x + step[0], y: this.player.y + step[1], duration: 120, yoyo: true, ease: 'Sine.easeOut' });

    // auto-aim first, so the target is known before any weapon action or
    // VFX needs to aim at it
    const aimed = this.pickEnemyTarget(this.getAttackRangePx(true));
    if (aimed) this.faceToward(aimed);
    const facingOffset = { up: [0, -50], down: [0, 50], left: [-50, 0], right: [50, 0] }[this.facing];
    const target = aimed ?? this.quest.getEnemyPos?.() ?? { x: this.player.x + facingOffset[0], y: this.player.y + facingOffset[1] };

    // the skill's weapon action — most skills just play the equipped/class
    // weapon's normal skill motion, but several have their own distinct
    // motion instead of reusing one generic swing/shot for everything:
    //   Shield Slam   — a shield bashes forward, not the equipped weapon
    //   Whirlwind     — the character (weapon in hand) spins a full circle
    //   Quick Shot / Piercing Arrow / Disabling Shot — one shot, not a fan
    //   Piercing Arrow — that one shot punches through, further and brighter
    //   Volley        — an arrow rain drops on the target, not a hand-fired fan
    if (id === 'shield_slam') playShieldBash(this, this.player, this.facing, { targetPos: aimed });
    else if (id === 'whirlwind') playWhirlwindSpin(this, this.player, skillWeapon, this.facing);
    else if (id === 'quick_shot') playWeaponSwing(this, this.player, skillWeapon, this.facing, { skill: true, targetPos: aimed, shots: 1 });
    else if (id === 'piercing_arrow') playWeaponSwing(this, this.player, skillWeapon, this.facing, { skill: true, targetPos: aimed, shots: 1, pierce: true, arrowTint: 0xd8f0ff });
    else if (id === 'disabling_shot') playWeaponSwing(this, this.player, skillWeapon, this.facing, { skill: true, targetPos: aimed, shots: 1, arrowTint: 0xe8a05a });
    else if (id === 'multi_shot') playWeaponSwing(this, this.player, skillWeapon, this.facing, { skill: true, targetPos: aimed, arrowTint: 0xb8e88a });
    else if (id === 'volley') {
      playWeaponSwing(this, this.player, skillWeapon, this.facing, { skill: true, targetPos: aimed, shots: 1 });
      playArrowRain(this, target);
    } else if (skillWeapon) playWeaponSwing(this, this.player, skillWeapon, this.facing, { skill: true, targetPos: aimed });

    // skill VFX: capstones get their full class ultimate, everything else
    // a kind-matched beat, aimed at the current enemy if there is one
    if (def.capstone) playUltimate(this, this.state.classId, { x: this.player.x, y: this.player.y }, [], target);
    else playSkillFx(this, def, { x: this.player.x, y: this.player.y }, target, this.state.classId);

    // Summoner calls manifest an actual creature that follows and fights
    if (def.kind === 'summon') this.manifestSummon(def);

    // Captain's War Horn: the four Guardsmen linger and strike on their own
    // beat over the buff window — real hits, not just the visual charge
    if (def.capstone && this.state.classId === 'captain') {
      for (let i = 0; i < 6; i++) {
        this.time.delayedCall(1400 + i * 700, () => {
          if (this.quest.getEnemyPos?.()) this.quest.onSummonHit?.('guardsman');
        });
      }
    }

    const rank = rankOf(this.state, id);
    // Storm of the Wild Hunt: the barrage drops three times over about a
    // second (the attack-rate buff from playUltimate still just applies
    // once, per its own duration) instead of resolving as a single instant hit
    if (id === 'storm_of_the_wild_hunt') {
      for (let i = 0; i < 3; i++) this.time.delayedCall(180 + i * 400, () => this.quest.onPlayerSkill?.(def, rank));
    } else {
      this.time.delayedCall(180, () => this.quest.onPlayerSkill?.(def, rank));
    }
    this.player.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.attacking = false;
    });
    this.emitSkillbar();
    this.time.delayedCall((def.cd ?? 0) * 1000 + 50, () => this.emitSkillbar());
  }

  // spawn the creature form(s) for a Summoner call — Call of the Wild
  // brings every unlocked creature at once for its short 8s window
  manifestSummon(def) {
    this.activeSummons ??= [];
    const getEnemy = () => this.quest.getEnemyPos?.() ?? null;
    const onHit = (form) => this.quest.onSummonHit?.(form);
    if (def.capstone) {
      const unlocked = Object.entries(SUMMON_FORMS).filter(([skillId]) => (this.state.skills?.[skillId] ?? 0) >= 1);
      unlocked.forEach(([, form], i) => {
        this.time.delayedCall(i * 220, () => {
          this.activeSummons.push(spawnSummon(this, form, this.player, getEnemy, onHit, 8000));
        });
      });
      return;
    }
    const form = SUMMON_FORMS[def.id];
    if (form) this.activeSummons.push(spawnSummon(this, form, this.player, getEnemy, onHit, 20000));
  }

  usePotion(pot) {
    const now = this.time.now;
    if ((this.potionCooldown ?? 0) > now) {
      this.game.events.emit(EV.TOAST, { text: 'Catch your breath first.', duration: 1100 });
      return;
    }
    if ((this.state.potions?.[pot] ?? 0) <= 0) {
      this.game.events.emit(EV.TOAST, { text: `No ${pot.toUpperCase()} potions left.`, duration: 1400 });
      return;
    }
    if (pot === 'hp' && this.state.hp >= this.stats.maxHp) return;
    if (pot === 'mp' && (this.state.mp ?? 0) >= this.stats.maxMp) return;
    this.state.potions[pot] -= 1;
    this.potionCooldown = now + 8000;
    if (pot === 'hp') {
      const amount = Math.round(this.stats.maxHp * 0.5);
      this.state.hp = Math.min(this.stats.maxHp, this.state.hp + amount);
      this.emitHp();
      this.showFloatText(this.player.x, this.player.y, `+${amount}`, '#7fe89a');
    } else {
      const amount = Math.round(this.stats.maxMp * 0.5);
      this.state.mp = Math.min(this.stats.maxMp, (this.state.mp ?? 0) + amount);
      this.emitMp();
      this.showFloatText(this.player.x, this.player.y, `+${amount} MP`, '#7fb4ff');
    }
    playSkillFx(this, { kind: 'heal' }, { x: this.player.x, y: this.player.y });
    this.emitSkillbar();
    this.time.delayedCall(8050, () => this.emitSkillbar());
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
