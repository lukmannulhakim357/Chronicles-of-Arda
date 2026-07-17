import Phaser from 'phaser';
import { EV } from '../config.js';
import { tilesToPx, POINTS } from '../world/greatforest.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { grantXp, grantGold } from '../data/leveling.js';
import { WEAPON_BY_CLASS, itemById, bonusLine } from '../data/items.js';
import { effectiveStats } from '../systems/GameState.js';
import { derivedStats } from '../data/classes.js';
import { createCombatant, isAlive, liveStats, damage as dealDamage } from '../combat/combatant.js';
import { computeDamage } from '../combat/formulas.js';
import { SUMMON_POWER } from '../fx/summons.js';

// Quest 3 — "Lost Before Nightfall" (waypoint 3, The Great Forest).
//   0  speak with Randir at the forest's edge
//   1  find Isilmë and Ancalimë, lost among the trees
//   2  follow the clearing east — Randir catches up and arms you
//   3  a wolf out of the dark: the first real fight (uses src/combat/)
//   4  lead everyone the rest of the way to the path
//   5  done — waypoint complete
//
// This is the waypoint that hands the player their first weapon and the
// first taste of basic-attack combat, per the concept doc's own framing of
// what comes after the Steppes' combat-free filler content.

const T = (title, objective) => ({ title, objective });
const TRACKER = [
  T('Lost Before Nightfall', 'Speak with Randir — the host has lost people in these trees.'),
  T('Lost Before Nightfall', 'Find Isilmë and Ancalimë before the dark deepens further.'),
  T('Lost Before Nightfall', 'Follow the clearing east.'),
  T('Lost Before Nightfall', 'Something is in the trees. Fight it off!'),
  T('Lost Before Nightfall', 'Lead everyone the rest of the way to the path.'),
  T('The Great Journey', 'Waypoint complete. Open the menu to take the Road West.'),
];

const WOLF_STATS = { maxHp: 60, maxMp: 0, pAtk: 12, mAtk: 0, pDef: 4, mDef: 2, accuracy: 70, evasion: 15, critPct: 8 };

export default class LostBeforeNightfallQuest {
  constructor(scene) {
    this.scene = scene;
    this.randirNpc = null;
    this.strays = [];
    this.followers = []; // { sprite, key }
    this.clearingPoint = null;
    this.pathOutPoint = null;
    this.wolf = null;
    this.wolfCombatant = null;
    this.playerCombatant = null;
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

  spawnNpcs(points) {
    if (this.stage === 0) {
      this.randirNpc = this.scene.addNpc('npc_elf_hunter', points.randir, 'Randir', () => this.talkRandir());
    }
  }

  update() {
    this.followerUpdate();
    if (this.stage === 3) this.encounterUpdate();
  }

  // ---------- setup on zone entry (fresh or from a save) ----------

  begin() {
    this.updateTracker();
    this.scene.deepenNight(0.7); // stays dark the whole zone — no stars overhead

    if (this.stage === 0 && !this.state.seenIntro) {
      this.state.seenIntro = true;
      this.scene.time.delayedCall(500, () => {
        this.toast('The trees close overhead — no stars, no moon. Someone ahead is calling out.', 2800);
      });
    }
    if (this.stage === 1) {
      this.spawnStrays();
      this.respawnFoundFollowers();
    }
    if (this.stage === 2) {
      this.respawnFoundFollowers();
      this.spawnClearingPoint();
    }
    if (this.stage === 3) {
      this.respawnFoundFollowers();
      this.startEncounter();
    }
    if (this.stage === 4) {
      this.respawnFoundFollowers();
      this.spawnPathOutPoint();
    }
  }

  talkRandir() {
    if (this.stage !== 0) return;
    this.dialogue(
      [
        { speaker: 'Randir', text: 'Star-kindled — good, another pair of eyes. Two of the host wandered from the path when the trees swallowed the light.' },
        { speaker: 'Randir', text: 'Isilmë went north chasing what she swears was a lantern. Ancalimë south, calling for her. Neither has come back.' },
        { speaker: 'Randir', text: 'Find them. I\'ll hold the path here — this wood plays tricks on more than one traveler at once.' },
      ],
      null,
      () => {
        this.setStage(1);
        this.spawnStrays();
        this.autosave('The Great Forest');
      }
    );
  }

  // ---------- stage 1: find the two strays ----------

  spawnStrays() {
    if (this.strays.length) return;
    const defs = [
      { key: 'stray1', point: POINTS.stray1, sheet: 'npc_kinswoman', name: 'Isilmë', found: !!this.state.quest.flags.foundStray1 },
      { key: 'stray2', point: POINTS.stray2, sheet: 'npc_kinsman', name: 'Ancalimë', found: !!this.state.quest.flags.foundStray2 },
    ];
    for (const d of defs) {
      if (d.found) continue;
      const p = tilesToPx(d.point);
      const glow = this.scene.add.image(p.x, p.y, 'glow').setScale(0.55).setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({ targets: glow, scale: 0.68, alpha: 0.6, duration: 900, yoyo: true, repeat: -1 });
      const sprite = this.scene.add.sprite(p.x, p.y, d.sheet, 130);
      sprite.setDepth(p.y);
      this.strays.push({
        key: d.key,
        name: d.name,
        sheet: d.sheet,
        x: p.x,
        y: p.y,
        glow,
        sprite,
        label: 'Approach',
        interact: () => this.findStray(d.key, d.name, d.sheet),
      });
    }
  }

  findStray(key, name, sheet) {
    const stray = this.strays.find((s) => s.key === key);
    if (!stray) return;
    this.strays = this.strays.filter((s) => s.key !== key);
    stray.glow.destroy();
    this.state.quest.flags[`found${key === 'stray1' ? 'Stray1' : 'Stray2'}`] = true;
    this.followers.push({ sprite: stray.sprite, key });
    this.dialogue([
      { speaker: name, text: 'Oh, thank the stars — I couldn\'t tell one tree from a hundred others. Stay close, I\'m not letting you out of sight again.' },
    ]);
    this.autosave('The Great Forest');

    const bothFound = this.state.quest.flags.foundStray1 && this.state.quest.flags.foundStray2;
    if (bothFound) {
      this.setStage(2);
      this.spawnClearingPoint();
    }
  }

  respawnFoundFollowers() {
    const defs = [
      { key: 'stray1', point: POINTS.stray1, sheet: 'npc_kinswoman', found: this.state.quest.flags.foundStray1 },
      { key: 'stray2', point: POINTS.stray2, sheet: 'npc_kinsman', found: this.state.quest.flags.foundStray2 },
    ];
    for (const d of defs) {
      if (!d.found || this.followers.some((f) => f.key === d.key)) continue;
      const p = tilesToPx(POINTS.randir);
      const sprite = this.scene.add.sprite(p.x + 20, p.y, d.sheet, 130);
      sprite.setDepth(p.y);
      this.followers.push({ sprite, key: d.key });
    }
  }

  // ---------- stage 2: the clearing — Randir arms you ----------

  spawnClearingPoint() {
    if (this.clearingPoint) return;
    const p = tilesToPx(POINTS.clearing);
    const glow = this.scene.add.image(p.x, p.y, 'glow').setScale(0.6).setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: glow, scale: 0.72, alpha: 0.55, duration: 1000, yoyo: true, repeat: -1 });
    this.clearingPoint = { x: p.x, y: p.y, glow, label: 'Wait for Randir', interact: () => this.reachClearing() };
  }

  reachClearing() {
    if (this.stage !== 2 || !this.clearingPoint) return;
    this.clearingPoint.glow.destroy();
    this.clearingPoint = null;
    const weaponId = WEAPON_BY_CLASS[this.state.classId];
    const weaponItem = weaponId ? { id: weaponId } : null;
    this.dialogue(
      [
        { speaker: 'Randir', text: 'There — I hear the path\'s edge. But you\'re walking these trees unarmed, and I\'ve heard something bigger than a fox tonight.' },
        { speaker: 'Randir', text: 'Here. Take this — it was mine before I had a better one. Tap Attack when it matters; the rest is nerve.' },
      ],
      null,
      () => {
        if (weaponItem) this.giveWeapon(weaponId);
        this.toast('New: Attack — a button now sits ready when a foe is near.', 3000);
        this.setStage(3);
        this.autosave('The Great Forest');
        this.startEncounter();
      }
    );
  }

  giveWeapon(itemId) {
    if (!this.state.inventory) this.state.inventory = [];
    if (this.state.inventory.includes(itemId) || Object.values(this.state.equipment ?? {}).includes(itemId)) return;
    this.state.inventory.push(itemId);
    const item = itemById(itemId);
    if (item) this.scene.game.events.emit(EV.ITEM_GET, { name: item.name, bonus: bonusLine(item) });
  }

  // ---------- stage 3: the wolf — first real combat, via src/combat/ ----------

  startEncounter() {
    if (this.wolf) return;
    this.scene.game.events.emit(EV.ATTACK_SET, { visible: true });
    this.encounterOver = false;

    const derived = derivedStats(effectiveStats(this.state));
    this.playerCombatant = createCombatant({ id: 'player', name: 'You', stats: derived, classId: this.state.classId });
    this.playerCombatant.hp = this.state.hp;
    this.playerCombatant.mp = this.state.mp ?? derived.maxMp;

    this.wolfCombatant = createCombatant({ id: 'wolf', name: 'Wolf', stats: WOLF_STATS, isEnemy: true });

    const p = tilesToPx(POINTS.ambush);
    // Placeholder sprite: no wolf/beast art exists yet, so npc_shadow's
    // sheet is reused, heavily retinted brown/grey — swap for real
    // creature art once it exists (matches this repo's existing
    // "clearly-marked placeholder" convention for missing art).
    this.wolf = this.scene.physics.add.sprite(p.x, p.y, 'npc_shadow', 130);
    this.wolf.setDepth(9999).setTint(0x6b4a2a).setScale(1.05);
    this.wolf.play('npc_shadow-walk-left');
    this.wolfHpBg = this.scene.add.rectangle(p.x, p.y - 40, 42, 5, 0x000000, 0.6).setDepth(10000);
    this.wolfHpFill = this.scene.add.rectangle(p.x - 20, p.y - 40, 40, 3, 0xa03030, 1).setOrigin(0, 0.5).setDepth(10001);
    this.toast('A wolf, ribs showing, slips out of the dark between the trees.', 2800);

    this.lungeTimer = this.scene.time.addEvent({ delay: 1800, loop: true, callback: () => this.wolfLunge() });
  }

  // Mirrors the Waypoint 1 shadow encounter: the wolf closes distance on
  // the player before its hit is resolved, rather than damaging from
  // anywhere on the map — the player has to actually engage (or keep their
  // distance) for the fight to mean anything.
  wolfLunge() {
    if (this.encounterOver || !this.wolf?.active || !isAlive(this.wolfCombatant)) return;
    const player = this.scene.player;
    const dir = player.x < this.wolf.x ? 'left' : 'right';
    this.wolf.play(`npc_shadow-walk-${dir}`, true);
    this.scene.tweens.add({
      targets: this.wolf,
      x: player.x,
      y: player.y,
      duration: 420,
      ease: 'Sine.easeIn',
      onComplete: () => {
        if (!this.wolf?.active) return;
        this.wolfAttack();
        const p = tilesToPx(POINTS.ambush);
        this.scene.tweens.add({
          targets: this.wolf,
          x: p.x + Phaser.Math.Between(-40, 40),
          y: p.y + Phaser.Math.Between(-20, 20),
          duration: 600,
          ease: 'Sine.easeOut',
        });
      },
    });
  }

  wolfAttack() {
    if (this.encounterOver || !isAlive(this.wolfCombatant)) return;
    const outcome = computeDamage({
      attacker: liveStats(this.wolfCombatant),
      defender: liveStats(this.playerCombatant),
      isMagic: false,
      skillPct: 1,
      rank: 1,
    });
    if (outcome.hit) {
      this.playerCombatant.hp = Math.max(0, this.playerCombatant.hp - outcome.damage);
      this.scene.damagePlayer(outcome.damage);
      if (this.playerCombatant.hp / this.playerCombatant.maxHp <= 0.25) {
        this.endEncounter(true); // Randir steps in before it gets worse
      }
    } else {
      this.toast('The wolf lunges — and misses.', 1200);
    }
  }

  // current enemy position for skill-VFX aiming (WorldScene)
  getEnemyPos() {
    return this.wolf?.active ? { x: this.wolf.x, y: this.wolf.y } : null;
  }

  // enemy list with HP, for auto-aim's lowest-HP targeting
  getEnemies() {
    return this.wolf?.active && this.wolfCombatant
      ? [{ x: this.wolf.x, y: this.wolf.y, hp: this.wolfCombatant.hp }]
      : [];
  }

  // called from WorldScene when the player taps Attack (mirrors onPlayerAttack elsewhere)
  onPlayerAttack() {
    this.strikeWolf({ skillPct: 1, isMagic: false, critMult: 2 });
  }

  // action-bar skills hit through the same live-combat path, harder
  onPlayerSkill(def, rank = 1) {
    this.strikeWolf({ skillPct: def.damagePct ?? 1.4, isMagic: !!def.isMagic, critMult: def.critMult ?? 2, rank, isSkill: true });
  }

  // summon dives resolve as light Magic hits (summon damage is always
  // Magic-typed per the skill doc §4.8.0 — never misses, modest per-hit)
  onSummonHit(form) {
    this.strikeWolf({ skillPct: SUMMON_POWER[form] ?? 0.55, isMagic: true, critMult: 2, skipRange: true });
  }

  strikeWolf({ skillPct, isMagic, critMult, rank = 1, skipRange = false, isSkill = false }) {
    if (this.encounterOver || !this.wolf?.active || !isAlive(this.wolfCombatant)) return;
    const player = this.scene.player;
    const range = this.scene.getAttackRangePx?.(isSkill) ?? 84;
    const d = skipRange ? 0 : Phaser.Math.Distance.Between(player.x, player.y, this.wolf.x, this.wolf.y);
    if (d > range) {
      this.scene.showFloatText(player.x, player.y, 'Too far!', '#9aa4bc');
      return;
    }
    const outcome = computeDamage({
      attacker: liveStats(this.playerCombatant),
      defender: liveStats(this.wolfCombatant),
      isMagic,
      skillPct,
      rank,
      critMult,
    });
    if (!outcome.hit) {
      this.scene.showFloatText(this.wolf.x, this.wolf.y, 'Miss!', '#9aa4bc');
      return;
    }
    dealDamage(this.wolfCombatant, outcome.damage);
    this.scene.showFloatText(this.wolf.x, this.wolf.y, `-${outcome.damage}${outcome.crit ? '!' : ''}`, outcome.crit ? '#f2c14e' : '#f0d8d8');
    this.wolf.setTintFill(0xffffff);
    this.scene.time.delayedCall(90, () => this.wolf?.setTint(0x6b4a2a));
    const kx = this.wolf.x + (this.wolf.x - player.x) * 0.4;
    const ky = this.wolf.y + (this.wolf.y - player.y) * 0.4;
    this.scene.tweens.add({ targets: this.wolf, x: kx, y: ky, duration: 120 });
    if (!isAlive(this.wolfCombatant)) this.endEncounter(false);
  }

  encounterUpdate() {
    // keep the wolf's HP bar tracking its sprite
    if (this.wolf?.active && this.wolfHpBg?.active) {
      this.wolfHpBg.setPosition(this.wolf.x, this.wolf.y - 40);
      this.wolfHpFill.setPosition(this.wolf.x - 20, this.wolf.y - 40);
      this.wolfHpFill.width = 40 * Math.max(0, this.wolfCombatant.hp / this.wolfCombatant.maxHp);
    }
  }

  endEncounter(rescued) {
    if (this.encounterOver) return;
    this.encounterOver = true;
    this.lungeTimer?.remove();
    this.wolfHpBg?.destroy();
    this.wolfHpFill?.destroy();
    this.scene.game.events.emit(EV.ATTACK_SET, { visible: false });

    this.toast(
      rescued
        ? 'Randir\'s blade catches the wolf\'s flank — it yelps and bolts into the dark.'
        : 'The wolf goes still. Whatever else moves in this wood, it\'s further off now.',
      3000
    );
    if (this.wolf?.active) {
      this.scene.tweens.add({
        targets: this.wolf,
        x: this.wolf.x + (rescued ? 400 : 0),
        y: this.wolf.y + (rescued ? -200 : 0),
        alpha: 0,
        duration: 800,
        ease: 'Sine.easeIn',
        onComplete: () => this.wolf?.destroy(),
      });
    }

    this.scene.time.delayedCall(1200, () => {
      this.setStage(4);
      this.scene.healPlayer();
      grantXp(this.state, 20);
      this.scene.emitXp();
      this.spawnPathOutPoint();
      this.autosave('The Great Forest');
    });
  }

  // ---------- follower movement (Isilmë + Ancalimë) ----------

  followerUpdate() {
    if (this.stage < 1 || this.stage >= 5) return;
    const player = this.scene.player;
    for (const f of this.followers) {
      const spr = f.sprite;
      if (!spr?.active) continue;
      const d = Phaser.Math.Distance.Between(player.x, player.y, spr.x, spr.y);
      if (d > 52) {
        const speed = d > 140 ? 150 : 110;
        const angle = Math.atan2(player.y - spr.y, player.x - spr.x);
        const vx = Math.cos(angle) * speed * (this.scene.game.loop.delta / 1000);
        const vy = Math.sin(angle) * speed * (this.scene.game.loop.delta / 1000);
        spr.x += vx;
        spr.y += vy;
        spr.setDepth(spr.y);
        const dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : vy > 0 ? 'down' : 'up';
        spr.play(`${f.sheet ?? spriteSheetOf(spr)}-walk-${dir}`, true);
      } else if (spr.anims.isPlaying) {
        spr.anims.stop();
        spr.setFrame(10 * 13);
      }
    }
  }

  // ---------- stage 4: the path out ----------

  spawnPathOutPoint() {
    if (this.pathOutPoint) return;
    const p = tilesToPx(POINTS.pathOut);
    const glow = this.scene.add.image(p.x, p.y, 'glow').setScale(0.6).setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: glow, scale: 0.72, alpha: 0.55, duration: 1000, yoyo: true, repeat: -1 });
    this.pathOutPoint = { x: p.x, y: p.y, glow, label: 'Rejoin the Path', interact: () => this.finishQuest() };
  }

  finishQuest() {
    if (this.stage !== 4 || !this.pathOutPoint) return;
    this.pathOutPoint.glow.destroy();
    this.pathOutPoint = null;
    this.dialogue(
      [
        { speaker: 'Randir', text: 'There — torchlight. We made it before the deepest dark.' },
        { speaker: 'Isilmë', text: 'Never again. Next time I hear a lantern that isn\'t there, I\'m staying put.' },
      ],
      null,
      () => {
        this.setStage(5);
        this.state.waypointIndex = 3;
        grantXp(this.state, 25);
        grantGold(this.state, 45);
        this.state.potions ??= { hp: 2, mp: 2 };
        this.state.potions.hp += 1;
        this.state.potions.mp += 1;
        this.scene.emitXp();
        this.scene.emitGold();
        this.autosave('The Great Forest — the path west');
        this.scene.time.delayedCall(600, () => {
          this.scene.scene.stop('UI');
          this.scene.scene.start('Story', {
            id: 'lost-before-nightfall',
            title: 'Out of the Dark Trees',
            paragraphs: [
              'Waypoint 3 — The Great Forest: complete.',
              'Isilmë and Ancalimë are safe, and the wolf that stalked the dark has gone to ground. You carry a weapon now, and the memory of the first real fight of the march.',
              'The Vales of Anduin lie ahead — and with them, a choice that isn\'t yours to make alone.',
            ],
            rewards: { xp: 25, gold: 45, items: ['HP Potion ×1', 'MP Potion ×1'] },
            button: 'To the Road West',
            next: 'Journey',
          });
        });
      }
    );
  }

  // ---------- interactables the WorldScene should offer right now ----------

  getInteractables() {
    const list = [...this.strays];
    if (this.clearingPoint) list.push(this.clearingPoint);
    if (this.pathOutPoint) list.push(this.pathOutPoint);
    return list;
  }
}

function spriteSheetOf(sprite) {
  return sprite.texture.key;
}
