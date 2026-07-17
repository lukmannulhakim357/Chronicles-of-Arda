import Phaser from 'phaser';
import { EV } from '../config.js';
import { tilesToPx, POINTS } from '../world/valesanduin.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { grantXp, grantGold } from '../data/leveling.js';
import { effectiveStats } from '../systems/GameState.js';
import { derivedStats } from '../data/classes.js';
import { createCombatant, isAlive, liveStats, damage as dealDamage } from '../combat/combatant.js';
import { computeDamage } from '../combat/formulas.js';
import { SUMMON_POWER } from '../fx/summons.js';

// Quest 4 — "Lenwë's Choice" (waypoint 4, Vales of Anduin).
//   0  speak with Lenwë at the river's edge — he doubts the mountain crossing
//   1  find the trainer — learn to use a skill, not just the basic attack
//   2  a shadow-wisp in the reeds: practice encounter, skill use encouraged
//   3  find Anwen before the host moves on — a personal choice, not a
//      historical one (stay with the host, or go south with Lenwë)
//   4  the parting: Lenwë's people turn south, becoming the Nandor
//   5  done — waypoint complete
//
// Canon-lock: Lenwë's people turning south is fixed. Anwen's fate and every
// line of dialogue around it are not — she's a generic, non-canon flavor
// character, the same rule as every other companion candidate in this design.

const T = (title, objective) => ({ title, objective });
const TRACKER = [
  T("Lenwë's Choice", "Speak with Lenwë at the river's edge."),
  T("Lenwë's Choice", 'Find the trainer — time to learn your first skill.'),
  T("Lenwë's Choice", 'A shadow lurks in the reeds. Drive it off — try your new skill.'),
  T("Lenwë's Choice", 'Find Anwen before the host moves on.'),
  T("Lenwë's Choice", 'Watch the parting, then continue west.'),
  T('The Great Journey', 'Waypoint complete. Open the menu to take the Road West.'),
];

const WISP_STATS = { maxHp: 38, maxMp: 0, pAtk: 7, mAtk: 9, pDef: 2, mDef: 3, accuracy: 68, evasion: 18, critPct: 6 };

export default class LenwesChoiceQuest {
  constructor(scene) {
    this.scene = scene;
    this.lenweNpc = null;
    this.trainerNpc = null;
    this.anwenNpc = null;
    this.wisp = null;
    this.wispCombatant = null;
    this.playerCombatant = null;
    this.farewellStarted = false;
    this.pathOutPoint = null;
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
    if (this.stage === 0) this.spawnLenwe();
    if (this.stage === 1) this.spawnTrainer();
    if (this.stage === 3) this.spawnAnwen();
  }

  // Each spawn* is idempotent and called from two places: spawnNpcs() above
  // (covers a fresh WorldScene.create() — a new visit or a save reload) and
  // directly from whichever stage-transition callback advances into that
  // stage live, mid-session — spawnNpcs() itself only runs once, at scene
  // creation, so a live transition needs its own explicit spawn call too.
  spawnLenwe() {
    if (this.lenweNpc) return;
    this.lenweNpc = this.scene.addNpc('npc_elder', POINTS.lenwe, 'Lenwë', () => this.talkLenwe());
  }

  spawnTrainer() {
    if (this.trainerNpc) return;
    this.trainerNpc = this.scene.addNpc('npc_kinsman', POINTS.trainer, 'Faelon', () => this.talkTrainer());
  }

  spawnAnwen() {
    if (this.anwenNpc) return;
    this.anwenNpc = this.scene.addNpc('npc_kinswoman', POINTS.kenalan, 'Anwen', () => this.talkAnwen());
  }

  update() {
    if (this.stage === 2) this.encounterUpdate();
  }

  // ---------- setup on zone entry (fresh or from a save) ----------

  begin() {
    this.updateTracker();
    if (this.stage === 0 && !this.state.seenIntro) {
      this.state.seenIntro = true;
      this.scene.time.delayedCall(500, () => {
        this.toast("The Anduin runs wide and grey below the mountains. Lenwë stands at the water's edge, watching the peaks.", 2800);
      });
    }
    if (this.stage === 2) this.startEncounter();
    if (this.stage === 4) {
      if (this.state.quest.flags.farewellDone) this.spawnPathOutPoint();
      else this.spawnFarewell();
    }
  }

  // ---------- stage 0: Lenwë's doubt ----------

  talkLenwe() {
    if (this.stage !== 0) return;
    this.dialogue(
      [
        { speaker: 'Lenwë', text: "Look at them. Peaks that eat the sky, and Oromë says we're to climb through them." },
        { speaker: 'Lenwë', text: "I've led my people this far on trust alone. I'm not sure I have enough left over for that." },
        { speaker: 'Lenwë', text: "Go on, if you're not afraid of it. Someone in this host ought to learn to fight properly before the mountains ask it of them." },
      ],
      null,
      () => {
        this.setStage(1);
        this.spawnTrainer();
        this.autosave('Vales of Anduin');
      }
    );
  }

  // ---------- stage 1: the trainer — first skill ----------

  talkTrainer() {
    if (this.stage !== 1) return;
    this.dialogue(
      [
        { speaker: 'Faelon', text: "A blade got you this far, but a blade alone won't get you over those peaks. Every one of us carries something more than a swing." },
        { speaker: 'Faelon', text: "Here — call on it once, properly. You'll feel the difference." },
      ],
      null,
      () => {
        this.state.skillPoints = (this.state.skillPoints ?? 0) + 1;
        this.toast('New: a skill point to spend — open Skills and learn your first one.', 3000);
        this.scene.events.once(Phaser.Scenes.Events.RESUME, () => {
          this.setStage(2);
          this.autosave('Vales of Anduin');
          this.startEncounter();
        });
        this.scene.openCharacterForSkillTutorial();
      }
    );
  }

  // ---------- stage 2: the shadow-wisp — practice with a skill ----------

  startEncounter() {
    if (this.wisp) return;
    this.scene.game.events.emit(EV.ATTACK_SET, { visible: true });
    this.encounterOver = false;

    const derived = derivedStats(effectiveStats(this.state));
    this.playerCombatant = createCombatant({ id: 'player', name: 'You', stats: derived, classId: this.state.classId });
    this.playerCombatant.hp = this.state.hp;
    this.playerCombatant.mp = this.state.mp ?? derived.maxMp;
    this.wispCombatant = createCombatant({ id: 'wisp', name: 'Shadow-wisp', stats: WISP_STATS, isEnemy: true });

    const p = tilesToPx(POINTS.practiceSpot);
    // Same placeholder convention as the WP3 wolf and WP1 shadow-servant —
    // this wisp is explicitly a minor scout of that same shadow-servant
    // thread (concept doc's "thread villain"), not a new one-off monster.
    this.wisp = this.scene.physics.add.sprite(p.x, p.y, 'npc_shadow', 130);
    this.wisp.setDepth(9999).setAlpha(0.85).setTint(0x4a3a6a).setScale(0.9);
    this.scene.tweens.add({ targets: this.wisp, alpha: 0.6, duration: 700, yoyo: true, repeat: -1 });
    this.wispHpBg = this.scene.add.rectangle(p.x, p.y - 36, 40, 5, 0x000000, 0.6).setDepth(10000);
    this.wispHpFill = this.scene.add.rectangle(p.x - 20, p.y - 36, 38, 3, 0xa03030, 1).setOrigin(0, 0.5).setDepth(10001);
    this.toast("Something flickers at the reeds' edge — not quite shadow, not quite alive. A good chance to test that skill.", 3000);

    this.lungeTimer = this.scene.time.addEvent({ delay: 2000, loop: true, callback: () => this.wispLunge() });
  }

  wispLunge() {
    if (this.encounterOver || !this.wisp?.active || !isAlive(this.wispCombatant)) return;
    const player = this.scene.player;
    this.scene.tweens.add({
      targets: this.wisp,
      x: player.x,
      y: player.y,
      duration: 400,
      ease: 'Sine.easeIn',
      onComplete: () => {
        if (!this.wisp?.active) return;
        this.wispAttack();
        const p = tilesToPx(POINTS.practiceSpot);
        this.scene.tweens.add({
          targets: this.wisp,
          x: p.x + Phaser.Math.Between(-40, 40),
          y: p.y + Phaser.Math.Between(-20, 20),
          duration: 550,
          ease: 'Sine.easeOut',
        });
      },
    });
  }

  wispAttack() {
    if (this.encounterOver || !isAlive(this.wispCombatant)) return;
    const outcome = computeDamage({ attacker: liveStats(this.wispCombatant), defender: liveStats(this.playerCombatant), isMagic: true, skillPct: 0.8, rank: 1 });
    if (outcome.hit) {
      this.playerCombatant.hp = Math.max(0, this.playerCombatant.hp - outcome.damage);
      this.scene.damagePlayer(outcome.damage);
      if (this.playerCombatant.hp / this.playerCombatant.maxHp <= 0.25) this.endEncounter();
    } else {
      this.toast('It lashes out — and passes right through you.', 1200);
    }
  }

  getEnemyPos() {
    return this.wisp?.active ? { x: this.wisp.x, y: this.wisp.y } : null;
  }

  getEnemies() {
    return this.wisp?.active && this.wispCombatant ? [{ x: this.wisp.x, y: this.wisp.y, hp: this.wispCombatant.hp }] : [];
  }

  onPlayerAttack() {
    this.strikeWisp({ skillPct: 1, isMagic: false, critMult: 2 });
  }

  onPlayerSkill(def, rank = 1) {
    this.strikeWisp({ skillPct: def.damagePct ?? 1.4, isMagic: !!def.isMagic, critMult: def.critMult ?? 2, rank, isSkill: true });
  }

  onSummonHit(form) {
    this.strikeWisp({ skillPct: SUMMON_POWER[form] ?? 0.55, isMagic: true, critMult: 2, skipRange: true });
  }

  strikeWisp({ skillPct, isMagic, critMult, rank = 1, skipRange = false, isSkill = false }) {
    if (this.encounterOver || !this.wisp?.active || !isAlive(this.wispCombatant)) return;
    const player = this.scene.player;
    const range = this.scene.getAttackRangePx?.(isSkill) ?? 84;
    const d = skipRange ? 0 : Phaser.Math.Distance.Between(player.x, player.y, this.wisp.x, this.wisp.y);
    if (d > range) {
      this.scene.showFloatText(player.x, player.y, 'Too far!', '#9aa4bc');
      return;
    }
    const outcome = computeDamage({ attacker: liveStats(this.playerCombatant), defender: liveStats(this.wispCombatant), isMagic, skillPct, rank, critMult });
    if (!outcome.hit) {
      this.scene.showFloatText(this.wisp.x, this.wisp.y, 'Miss!', '#9aa4bc');
      return;
    }
    dealDamage(this.wispCombatant, outcome.damage);
    this.scene.showFloatText(this.wisp.x, this.wisp.y, `-${outcome.damage}${outcome.crit ? '!' : ''}`, outcome.crit ? '#f2c14e' : '#f0d8d8');
    this.wisp.setTintFill(0xffffff);
    this.scene.time.delayedCall(90, () => this.wisp?.setTint(0x4a3a6a));
    if (isSkill) this.toast('That landed harder than a plain swing would have.', 1400);
    if (!isAlive(this.wispCombatant)) this.endEncounter();
  }

  encounterUpdate() {
    if (this.wisp?.active && this.wispHpBg?.active) {
      this.wispHpBg.setPosition(this.wisp.x, this.wisp.y - 36);
      this.wispHpFill.setPosition(this.wisp.x - 20, this.wisp.y - 36);
      this.wispHpFill.width = 38 * Math.max(0, this.wispCombatant.hp / this.wispCombatant.maxHp);
    }
  }

  endEncounter() {
    if (this.encounterOver) return;
    this.encounterOver = true;
    this.lungeTimer?.remove();
    this.wispHpBg?.destroy();
    this.wispHpFill?.destroy();
    this.scene.game.events.emit(EV.ATTACK_SET, { visible: false });
    this.toast('The wisp scatters into the reeds and is gone.', 2400);
    if (this.wisp?.active) {
      this.scene.tweens.add({ targets: this.wisp, alpha: 0, duration: 700, ease: 'Sine.easeIn', onComplete: () => this.wisp?.destroy() });
    }
    this.scene.time.delayedCall(1000, () => {
      this.setStage(3);
      this.spawnAnwen();
      this.scene.healPlayer();
      grantXp(this.state, 20);
      this.scene.emitXp();
      this.autosave('Vales of Anduin');
    });
  }

  // ---------- stage 3: Anwen's choice (first real branching dialogue) ----------

  talkAnwen() {
    if (this.stage !== 3) return;
    this.dialogue(
      [
        { speaker: 'Anwen', text: "You've known me since the water at Cuiviénen, so I won't pretend with you." },
        { speaker: 'Anwen', text: "Lenwë's people are turning south, along the river. No mountains, no unknown sea after — just more of what we already know." },
        { speaker: 'Anwen', text: "I don't know which of us is right to be afraid. What do you think I should do?" },
      ],
      [
        { id: 'stay', label: 'Come with us over the mountains.' },
        { id: 'go', label: "Go with Lenwë, if that's where your heart is." },
      ],
      (choiceId) => {
        const staying = choiceId !== 'go';
        this.state.journeyFlags ??= {};
        this.state.journeyFlags.anwenStayed = staying;
        this.dialogue(
          [
            {
              speaker: 'Anwen',
              text: staying
                ? '...Over the mountains, then. Stars help us both.'
                : "South, I think. Whatever's ahead of you, I hope it's kinder than it looks from here.",
            },
          ],
          null,
          () => {
            this.setStage(4);
            this.spawnFarewell();
            this.autosave('Vales of Anduin');
          }
        );
      }
    );
  }

  // ---------- stage 4: the parting ----------

  spawnFarewell() {
    if (this.farewellStarted) return;
    this.farewellStarted = true;
    const anwenLeaving = this.state.journeyFlags?.anwenStayed === false;
    const p = tilesToPx(POINTS.lenwe);
    const crowd = [];
    const lenweSprite = this.lenweNpc?.sprite ?? this.scene.add.sprite(p.x, p.y, 'npc_elder', 130);
    lenweSprite.setDepth(p.y);
    crowd.push(lenweSprite);
    for (let i = 0; i < 4; i++) {
      const sheet = i % 2 === 0 ? 'npc_kinsman' : 'npc_kinswoman';
      const spr = this.scene.add.sprite(p.x + Phaser.Math.Between(-30, 30), p.y + Phaser.Math.Between(-16, 16), sheet, 130);
      spr.setDepth(spr.y);
      crowd.push(spr);
    }
    if (anwenLeaving && this.anwenNpc?.sprite) crowd.push(this.anwenNpc.sprite);

    // drop the departing NPCs from WorldScene's interactable list before
    // their sprites animate away and get destroyed — a stale entry there
    // would crash the per-frame nearest-interactable distance check once
    // its sprite is gone
    this.scene.npcs = this.scene.npcs.filter((n) => n !== this.lenweNpc && n !== this.anwenNpc);

    this.toast(
      anwenLeaving
        ? "Lenwë's people turn south along the Anduin — Anwen among them."
        : "Lenwë's people turn south along the Anduin, into a story of their own.",
      3400
    );
    crowd.forEach((spr, i) => {
      spr.play(`${spr.texture.key}-walk-down`, true);
      this.scene.tweens.add({
        targets: spr,
        y: spr.y + 240,
        x: spr.x + Phaser.Math.Between(-20, 20),
        alpha: 0,
        duration: 3000 + i * 100,
        ease: 'Sine.easeIn',
        onComplete: () => spr.destroy(),
      });
    });

    this.scene.time.delayedCall(3200, () => {
      this.state.quest.flags.farewellDone = true;
      this.autosave('Vales of Anduin');
      this.spawnPathOutPoint();
    });
  }

  spawnPathOutPoint() {
    if (this.pathOutPoint) return;
    const p = tilesToPx(POINTS.pathOut);
    const glow = this.scene.add.image(p.x, p.y, 'glow').setScale(0.6).setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: glow, scale: 0.72, alpha: 0.55, duration: 1000, yoyo: true, repeat: -1 });
    this.pathOutPoint = { x: p.x, y: p.y, glow, label: 'Continue West', interact: () => this.finishQuest() };
  }

  finishQuest() {
    if (this.stage !== 4 || !this.pathOutPoint) return;
    this.pathOutPoint.glow.destroy();
    this.pathOutPoint = null;
    this.dialogue(
      [{ speaker: null, text: 'Of the Nandor, the songs would later say: they who loved the water more than the stars, and stayed by it.' }],
      null,
      () => {
        this.setStage(5);
        this.state.waypointIndex = 4;
        grantXp(this.state, 25);
        grantGold(this.state, 40);
        this.scene.emitXp();
        this.scene.emitGold();
        this.autosave('Vales of Anduin — the mountain road');
        this.scene.time.delayedCall(600, () => {
          this.scene.scene.stop('UI');
          this.scene.scene.start('Story', {
            id: 'of-the-nandor',
            title: 'Of the Nandor',
            paragraphs: [
              'Waypoint 4 — Vales of Anduin: complete.',
              "Lenwë turned south along the Anduin, and with him went those who feared the mountains more than they trusted the road. In the songs sung long after, his people would be called the Nandor — those who came late, or not at all, to the light beyond the Sea.",
              this.state.journeyFlags?.anwenStayed
                ? "Anwen chose to climb. Whatever waits in the pass, she'll meet it beside you."
                : "Anwen chose the river. You won't see her again on this road — but perhaps on another, one day.",
              'The Misty Mountains rise ahead — the hardest crossing of the march.',
            ],
            rewards: { xp: 25, gold: 40 },
            button: 'To the Road West',
            next: 'Journey',
          });
        });
      }
    );
  }

  // ---------- interactables the WorldScene should offer right now ----------

  getInteractables() {
    const list = [];
    if (this.pathOutPoint) list.push(this.pathOutPoint);
    return list;
  }
}
