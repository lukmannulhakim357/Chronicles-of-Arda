import Phaser from 'phaser';
import { EV } from '../config.js';
import { tilesToPx, POINTS } from '../world/hithaeglir.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { grantXp, grantGold } from '../data/leveling.js';
import { effectiveStats } from '../systems/GameState.js';
import { derivedStats } from '../data/classes.js';
import { createCombatant, isAlive, liveStats, damage as dealDamage } from '../combat/combatant.js';
import { computeDamage } from '../combat/formulas.js';
import { SUMMON_POWER } from '../fx/summons.js';
import { makeCompanion, addCompanion, inParty } from '../systems/party.js';

// Quest 5 — "The Pass" (waypoint 5, Misty Mountains).
//   0  arrival — the climb begins, guided (distantly) by Oromë
//   1  Anwen, if she stayed at Waypoint 4, joins properly as a companion —
//      this is the party system's actual unlock moment
//   2  Calanon, a mountain scout, asks a small favor before joining
//   3  the frost-shade: a signature fight, the party's first real test
//   4  Oromë appears and opens the way down
//   5  done — waypoint complete
//
// Canon-lock: Oromë guiding this crossing is fixed — he is a narrative
// guide here, never a recruitable companion (same rule the concept doc
// applies to every named legendary). Anwen/Calanon are generic, non-canon
// companions; which of them join and in what order depends entirely on
// Waypoint 4's choice, never on any historical fact.

const T = (title, objective) => ({ title, objective });
const TRACKER = [
  T('The Pass', 'The climb into the Misty Mountains begins.'),
  T('The Pass', "Anwen is still with the host — see if she'll fight at your side."),
  T('The Pass', 'Something is tracking the host. Find Calanon.'),
  T('The Pass', 'The cold thing is close. Stand and fight — you will not stand alone.'),
  T('The Pass', 'Find Oromë before the descent.'),
  T('The Great Journey', 'Waypoint complete. Open the menu to take the Road West.'),
];

const FROST_SHADE_STATS = { maxHp: 150, maxMp: 0, pAtk: 16, mAtk: 14, pDef: 6, mDef: 5, accuracy: 75, evasion: 12, critPct: 10 };
const BOSS_TINT = 0x3a4a6a;

export default class ThePassQuest {
  constructor(scene) {
    this.scene = scene;
    this.anwenNpc = null;
    this.calanonNpc = null;
    this.oromeNpc = null;
    this.boss = null;
    this.bossCombatant = null;
    this.playerCombatant = null;
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

  eligibleForAnwen() {
    return this.state.journeyFlags?.anwenStayed === true && !inParty(this.state, 'anwen');
  }

  // ---------- NPCs ----------

  spawnNpcs() {
    if (this.stage === 1 && this.eligibleForAnwen()) this.spawnAnwen();
    if (this.stage === 2) this.spawnCalanon();
    if (this.stage === 4 && !this.state.quest.flags.oromeTalked) this.spawnOrome();
  }

  // Each spawn* is idempotent and called from two places: spawnNpcs() above
  // (a fresh WorldScene.create() — new visit or save reload) and directly
  // from whichever stage-transition callback advances into that stage
  // live, mid-session — spawnNpcs() only ever runs once, at scene creation.
  spawnAnwen() {
    if (this.anwenNpc) return;
    this.anwenNpc = this.scene.addNpc('npc_kinswoman', POINTS.herbmasterSpot, 'Anwen', () => this.talkAnwen());
  }

  spawnCalanon() {
    if (this.calanonNpc) return;
    this.calanonNpc = this.scene.addNpc('npc_elf_hunter', POINTS.rangerSpot, 'Calanon', () => this.talkCalanon());
  }

  spawnOrome() {
    if (this.oromeNpc) return;
    this.oromeNpc = this.scene.addNpc('npc_orome', POINTS.oromeSpot, 'Oromë', () => this.talkOrome());
  }

  update() {
    if (this.stage === 3) this.encounterUpdate();
  }

  // ---------- setup on zone entry (fresh or from a save) ----------

  begin() {
    this.updateTracker();
    if (this.stage === 0) {
      if (!this.state.seenIntro) {
        this.state.seenIntro = true;
        this.scene.time.delayedCall(500, () => {
          this.toast('The pass climbs into cloud and cold wind. Oromë rides somewhere ahead, they say, though the host can no longer see him.', 3000);
        });
      }
      // stage 0 is a pure establishing beat, not a dialogue gate — it moves
      // itself along into whichever recruit is actually available
      this.scene.time.delayedCall(700, () => {
        if (this.eligibleForAnwen()) {
          this.setStage(1);
          this.spawnAnwen();
        } else {
          this.setStage(2);
          this.spawnCalanon();
        }
        this.autosave('Misty Mountains');
      });
    }
    if (this.stage === 1 && !this.eligibleForAnwen()) {
      this.setStage(2);
      this.spawnCalanon();
    }
    if (this.stage === 3) this.startEncounter();
    if (this.stage === 4 && this.state.quest.flags.oromeTalked) this.spawnPathOutPoint();
  }

  // ---------- stage 1: Anwen joins properly (party system unlock) ----------

  talkAnwen() {
    if (this.stage !== 1) return;
    this.dialogue(
      [
        { speaker: 'Anwen', text: "Still with you, see? Though my legs have opinions about these mountains I won't repeat." },
        { speaker: 'Anwen', text: "I've picked up enough herb-lore now to be worth something in a fight. Let me stand with you properly, not just walk behind." },
      ],
      null,
      () => {
        this.recruitCompanion({ id: 'anwen', name: 'Anwen', classId: 'herbmaster', sheet: 'npc_kinswoman' });
        this.scene.npcs = this.scene.npcs.filter((n) => n !== this.anwenNpc);
        this.anwenNpc = null;
        this.toast('Anwen joins your party.', 2200);
        this.afterFirstRecruit(() => {
          this.setStage(2);
          this.spawnCalanon();
          this.autosave('Misty Mountains');
        });
      }
    );
  }

  // ---------- stage 2: Calanon — a small favor before he joins ----------

  talkCalanon() {
    if (this.stage !== 2) return;
    if (!this.state.quest.flags.calanonAsked) {
      this.dialogue(
        [
          { speaker: 'Calanon', text: "Careful — something's moved through here that isn't wind or stone-fall. I've been tracking it two days now." },
          { speaker: 'Calanon', text: "Help me get a proper look at it, and I'll owe you more than thanks. I'm no use to my own kin chasing shadows alone." },
        ],
        null,
        () => {
          this.state.quest.flags.calanonAsked = true;
          this.toast('Calanon watches the pass ahead with you a moment longer, then nods.', 2200);
          this.autosave('Misty Mountains');
        }
      );
      return;
    }
    this.dialogue(
      [{ speaker: 'Calanon', text: "Whatever it is, it's close now. I'm coming with you — you'll want the extra eyes, and the extra arrows." }],
      null,
      () => {
        this.recruitCompanion({ id: 'calanon', name: 'Calanon', classId: 'ranger', sheet: 'npc_elf_hunter' });
        this.scene.npcs = this.scene.npcs.filter((n) => n !== this.calanonNpc);
        this.calanonNpc = null;
        this.toast('Calanon joins your party.', 2200);
        this.afterFirstRecruit(() => {
          this.setStage(3);
          this.autosave('Misty Mountains');
          this.startEncounter();
        });
      }
    );
  }

  recruitCompanion({ id, name, classId, sheet }) {
    const comp = makeCompanion({ id, name, classId, sheet, level: this.state.level ?? 1 });
    addCompanion(this.state, comp);
    this.scene.addCompanionToWorld(comp);
  }

  // The first companion to join opens the Party tab as a scripted tutorial
  // moment — same pattern as the Gear/Skills tutorials from earlier
  // waypoints. Whichever recruit happens to come first (Anwen or Calanon,
  // depending on Waypoint 4's outcome) triggers it; the second doesn't.
  afterFirstRecruit(proceed) {
    if ((this.state.party ?? []).length === 1) {
      this.scene.events.once(Phaser.Scenes.Events.RESUME, proceed);
      this.scene.openCharacterForPartyTutorial();
    } else {
      proceed();
    }
  }

  // ---------- stage 3: the frost-shade — the party's first real test ----------

  startEncounter() {
    if (this.boss) return;
    this.scene.game.events.emit(EV.ATTACK_SET, { visible: true });
    this.encounterOver = false;

    const derived = derivedStats(effectiveStats(this.state));
    this.playerCombatant = createCombatant({ id: 'player', name: 'You', stats: derived, classId: this.state.classId });
    this.playerCombatant.hp = this.state.hp;
    this.playerCombatant.mp = this.state.mp ?? derived.maxMp;
    this.bossCombatant = createCombatant({ id: 'frost-shade', name: 'Frost-shade', stats: FROST_SHADE_STATS, isEnemy: true });

    const p = tilesToPx(POINTS.bossSpot);
    // Same placeholder convention as every other encounter this march —
    // and explicitly the same shadow-servant thread first met at Waypoint
    // 1, grown larger and colder in the high pass.
    this.boss = this.scene.physics.add.sprite(p.x, p.y, 'npc_shadow', 130);
    this.boss.setDepth(9999).setTint(BOSS_TINT).setScale(1.3);
    this.boss.play('npc_shadow-walk-left');
    this.bossHpBg = this.scene.add.rectangle(p.x, p.y - 46, 48, 6, 0x000000, 0.6).setDepth(10000);
    this.bossHpFill = this.scene.add.rectangle(p.x - 23, p.y - 46, 46, 4, 0x6a8fd9, 1).setOrigin(0, 0.5).setDepth(10001);
    this.toast('The cold thing Calanon tracked rises out of the rock itself — the same darkness that has dogged this march since Cuiviénen.', 3400);

    this.lungeTimer = this.scene.time.addEvent({ delay: 1700, loop: true, callback: () => this.bossLunge() });
  }

  // Unlike the smaller fights earlier in the march, the frost-shade doesn't
  // only ever go after the player — it picks any fighter in the party, so
  // a companion (Anwen's healer trigger especially) actually has something
  // to react to.
  bossLunge() {
    if (this.encounterOver || !this.boss?.active || !isAlive(this.bossCombatant)) return;
    const player = this.scene.player;
    const companions = (this.scene.partyMembers ?? []).filter((p) => p.sprite?.active && isAlive(p.combatant));
    const pool = [{ kind: 'player', x: player.x, y: player.y }, ...companions.map((p) => ({ kind: 'companion', p, x: p.sprite.x, y: p.sprite.y }))];
    const target = Phaser.Utils.Array.GetRandom(pool);
    this.scene.tweens.add({
      targets: this.boss,
      x: target.x,
      y: target.y,
      duration: 420,
      ease: 'Sine.easeIn',
      onComplete: () => {
        if (!this.boss?.active) return;
        this.bossAttack(target);
        const p = tilesToPx(POINTS.bossSpot);
        this.scene.tweens.add({ targets: this.boss, x: p.x + Phaser.Math.Between(-40, 40), y: p.y + Phaser.Math.Between(-20, 20), duration: 600, ease: 'Sine.easeOut' });
      },
    });
  }

  bossAttack(target) {
    if (this.encounterOver || !isAlive(this.bossCombatant)) return;
    if (target.kind === 'player') {
      const outcome = computeDamage({ attacker: liveStats(this.bossCombatant), defender: liveStats(this.playerCombatant), isMagic: false, skillPct: 1, rank: 1 });
      if (outcome.hit) {
        this.playerCombatant.hp = Math.max(0, this.playerCombatant.hp - outcome.damage);
        this.scene.damagePlayer(outcome.damage);
        if (this.playerCombatant.hp / this.playerCombatant.maxHp <= 0.2) this.endEncounter(true);
      } else {
        this.toast('The cold claws pass through empty air.', 1200);
      }
      return;
    }
    const combatant = target.p.combatant;
    const outcome = computeDamage({ attacker: liveStats(this.bossCombatant), defender: liveStats(combatant), isMagic: false, skillPct: 1, rank: 1 });
    if (outcome.hit) {
      dealDamage(combatant, outcome.damage);
      this.scene.showFloatText(target.p.sprite.x, target.p.sprite.y, `-${outcome.damage}`, '#e88a8a');
      target.p.sprite.setTintFill(0xffffff);
      this.scene.time.delayedCall(90, () => target.p.sprite?.clearTint());
    }
  }

  getEnemyPos() {
    return this.boss?.active ? { x: this.boss.x, y: this.boss.y } : null;
  }

  getEnemies() {
    return this.boss?.active && this.bossCombatant ? [{ x: this.boss.x, y: this.boss.y, hp: this.bossCombatant.hp }] : [];
  }

  onPlayerAttack() {
    this.strikeBoss({ skillPct: 1, isMagic: false, critMult: 2 });
  }

  onPlayerSkill(def, rank = 1) {
    this.strikeBoss({ skillPct: def.damagePct ?? 1.4, isMagic: !!def.isMagic, critMult: def.critMult ?? 2, rank, isSkill: true });
  }

  onSummonHit(form) {
    this.strikeBoss({ skillPct: SUMMON_POWER[form] ?? 0.55, isMagic: true, critMult: 2, skipRange: true });
  }

  // Companions resolve their own attacks/skills through this same path
  // (WorldScene.resolvePartyAction -> here), attributed to their own live
  // combat stats rather than the player's.
  onCompanionAttack(comp, combatant, { skillPct, isMagic, rank = 1 }) {
    if (this.encounterOver || !this.boss?.active || !isAlive(this.bossCombatant)) return;
    const outcome = computeDamage({ attacker: liveStats(combatant), defender: liveStats(this.bossCombatant), isMagic, skillPct, rank, critMult: 2 });
    if (!outcome.hit) {
      this.scene.showFloatText(this.boss.x, this.boss.y, 'Miss!', '#9aa4bc');
      return;
    }
    dealDamage(this.bossCombatant, outcome.damage);
    this.scene.showFloatText(this.boss.x, this.boss.y, `-${outcome.damage}${outcome.crit ? '!' : ''}`, outcome.crit ? '#f2c14e' : '#c8d8ff');
    this.boss.setTintFill(0xffffff);
    this.scene.time.delayedCall(90, () => this.boss?.setTint(BOSS_TINT));
    if (!isAlive(this.bossCombatant)) this.endEncounter(false);
  }

  strikeBoss({ skillPct, isMagic, critMult, rank = 1, skipRange = false, isSkill = false }) {
    if (this.encounterOver || !this.boss?.active || !isAlive(this.bossCombatant)) return;
    const player = this.scene.player;
    const range = this.scene.getAttackRangePx?.(isSkill) ?? 84;
    const d = skipRange ? 0 : Phaser.Math.Distance.Between(player.x, player.y, this.boss.x, this.boss.y);
    if (d > range) {
      this.scene.showFloatText(player.x, player.y, 'Too far!', '#9aa4bc');
      return;
    }
    const outcome = computeDamage({ attacker: liveStats(this.playerCombatant), defender: liveStats(this.bossCombatant), isMagic, skillPct, rank, critMult });
    if (!outcome.hit) {
      this.scene.showFloatText(this.boss.x, this.boss.y, 'Miss!', '#9aa4bc');
      return;
    }
    dealDamage(this.bossCombatant, outcome.damage);
    this.scene.showFloatText(this.boss.x, this.boss.y, `-${outcome.damage}${outcome.crit ? '!' : ''}`, outcome.crit ? '#f2c14e' : '#f0d8d8');
    this.boss.setTintFill(0xffffff);
    this.scene.time.delayedCall(90, () => this.boss?.setTint(BOSS_TINT));
    if (!isAlive(this.bossCombatant)) this.endEncounter(false);
  }

  encounterUpdate() {
    if (this.boss?.active && this.bossHpBg?.active) {
      this.bossHpBg.setPosition(this.boss.x, this.boss.y - 46);
      this.bossHpFill.setPosition(this.boss.x - 23, this.boss.y - 46);
      this.bossHpFill.width = 46 * Math.max(0, this.bossCombatant.hp / this.bossCombatant.maxHp);
    }
  }

  endEncounter(rescued = false) {
    if (this.encounterOver) return;
    this.encounterOver = true;
    this.lungeTimer?.remove();
    this.bossHpBg?.destroy();
    this.bossHpFill?.destroy();
    this.scene.game.events.emit(EV.ATTACK_SET, { visible: false });
    this.toast(
      rescued
        ? 'A horn sounds impossibly close, and the cold thing flinches back into the rock — Oromë has not left you as alone as it seemed.'
        : "The frost-shade shudders, thins to mist, and is gone. Whatever else serves that old darkness, it isn't following any further today.",
      3200
    );
    if (this.boss?.active) {
      this.scene.tweens.add({ targets: this.boss, alpha: 0, duration: 800, ease: 'Sine.easeIn', onComplete: () => this.boss?.destroy() });
    }
    this.scene.time.delayedCall(1300, () => {
      this.setStage(4);
      this.spawnOrome();
      this.scene.healPlayer();
      grantXp(this.state, 30);
      this.scene.emitXp();
      this.autosave('Misty Mountains');
    });
  }

  // ---------- stage 4: Oromë opens the way down ----------

  talkOrome() {
    if (this.stage !== 4 || this.state.quest.flags.oromeTalked) return;
    this.state.quest.flags.oromeTalked = true;
    this.dialogue(
      [
        { speaker: 'Oromë', text: 'The worst of the climb is behind you now. I did not say it would be easy — only that it could be done.' },
        { speaker: 'Oromë', text: 'Rhovanion opens beyond this ridge: wild country, but honest country. Walk it well — and walk it together.' },
      ],
      null,
      () => {
        this.spawnPathOutPoint();
        this.autosave('Misty Mountains');
      }
    );
  }

  spawnPathOutPoint() {
    if (this.pathOutPoint) return;
    const p = tilesToPx(POINTS.pathOut);
    const glow = this.scene.add.image(p.x, p.y, 'glow').setScale(0.6).setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: glow, scale: 0.72, alpha: 0.55, duration: 1000, yoyo: true, repeat: -1 });
    this.pathOutPoint = { x: p.x, y: p.y, glow, label: 'Descend the Far Slope', interact: () => this.finishQuest() };
  }

  finishQuest() {
    if (this.stage !== 4 || !this.pathOutPoint) return;
    this.pathOutPoint.glow.destroy();
    this.pathOutPoint = null;
    this.setStage(5);
    this.state.waypointIndex = 5;
    grantXp(this.state, 30);
    grantGold(this.state, 55);
    this.scene.emitXp();
    this.scene.emitGold();
    this.autosave('Misty Mountains — the far slope');
    this.scene.time.delayedCall(400, () => {
      this.scene.scene.stop('UI');
      this.scene.scene.start('Story', {
        id: 'the-pass',
        title: 'Over the Misty Mountains',
        paragraphs: [
          'Waypoint 5 — Misty Mountains: complete.',
          `The hardest crossing of the march is behind you now, and you did not make it alone — ${this.partyRosterLine()} walked it at your side.`,
          'Rhovanion waits beyond the last ridge: open country, and years of walking still ahead.',
        ],
        rewards: { xp: 30, gold: 55 },
        button: 'To the Road West',
        next: 'Journey',
      });
    });
  }

  partyRosterLine() {
    const names = (this.state.party ?? []).map((c) => c.name);
    if (!names.length) return 'no one else';
    if (names.length === 1) return names[0];
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  }

  // ---------- interactables the WorldScene should offer right now ----------

  getInteractables() {
    const list = [];
    if (this.pathOutPoint) list.push(this.pathOutPoint);
    return list;
  }
}
