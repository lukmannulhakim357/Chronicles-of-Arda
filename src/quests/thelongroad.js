import Phaser from 'phaser';
import { EV } from '../config.js';
import { tilesToPx, POINTS } from '../world/rhovanion.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { grantXp, grantGold } from '../data/leveling.js';

// Quest 6 — "The Long Road" (waypoint 6, Rhovanion).
//   0  arrival — years of open country, no single dramatic event
//   1  meet Maren, a nomad trader — the game's first gold/trading tutorial
//   2  gather 3 Sturdy Hides along the trail
//   3  return to Maren: sell some for gold, maybe buy travel supplies
//   4  continue west, toward the Blue Mountains
//   5  done — waypoint complete
//
// Canon-lock: none — Rhovanion has no major historical event at this point
// in the march (concept doc's own note), so this is a pure gameplay-system
// waypoint. Maren is a generic, non-canon nomad trader.

const T = (title, objective) => ({ title, objective });
const TRACKER = [
  T('The Long Road', 'Wide country, and years of it, stretch out ahead.'),
  T('The Long Road', "Speak with the trader — trail goods are worth something out here."),
  T('The Long Road', 'Gather hides along the trail.'),
  T('The Long Road', 'Return to Maren with what you gathered.'),
  T('The Long Road', 'Continue west, toward the Blue Mountains.'),
  T('The Great Journey', 'Waypoint complete. Open the menu to take the Road West.'),
];

const GATHER_DEFS = [
  { key: 'forage1', point: POINTS.forage1, label: 'Gather', text: 'A hide stretched to dry on a frame, half-forgotten by whoever passed through before you.' },
  { key: 'forage2', point: POINTS.forage2, label: 'Gather', text: 'Good, thick hide, already cured — someone here knew their trade.' },
  { key: 'forage3', point: POINTS.forage3, label: 'Gather', text: "One more hide, a little rough at the edges, but Maren won't mind." },
];

const BUY_PRICE = 15;
const SELL_GOLD = 20;

export default class TheLongRoadQuest {
  constructor(scene) {
    this.scene = scene;
    this.traderNpc = null;
    this.gatherSpots = null;
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
    let t = TRACKER[Math.min(this.stage, TRACKER.length - 1)];
    if (this.stage === 2) {
      const done = this.gatherSpots ? this.gatherSpots.filter((s) => s.done).length : Object.keys(this.state.quest.flags.gathered ?? {}).length;
      t = { ...t, objective: `${t.objective} (${done}/${GATHER_DEFS.length})` };
    }
    this.scene.game.events.emit(EV.TRACKER, t);
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
    if (this.stage === 1 || this.stage === 3) this.spawnTrader();
  }

  spawnTrader() {
    if (this.traderNpc) return;
    this.traderNpc = this.scene.addNpc('npc_kinsman', POINTS.trader, 'Maren', () => this.talkTrader());
  }

  update() {}

  // ---------- setup on zone entry (fresh or from a save) ----------

  begin() {
    this.updateTracker();
    if (this.stage === 0) {
      if (!this.state.seenIntro) {
        this.state.seenIntro = true;
        this.scene.time.delayedCall(500, () => {
          this.toast('Seasons turn into years underfoot. The host has crossed more open country than anyone can easily count anymore.', 3200);
        });
      }
      // stage 0 is a pure time-skip beat, not a dialogue gate
      this.scene.time.delayedCall(700, () => {
        this.setStage(1);
        this.spawnTrader();
        this.autosave('Rhovanion');
      });
    }
    if (this.stage === 2) this.spawnGatherSpots();
  }

  // ---------- the trader — covers both the stage-1 ask and the stage-3 trade ----------

  talkTrader() {
    if (this.stage === 1) {
      this.dialogue(
        [
          { speaker: 'Maren', text: "Another wanderer off the mountain road. Sit a while — the road's long enough for talk." },
          { speaker: 'Maren', text: "Gold's the only tongue every camp speaks, east or west of anywhere. Bring me a few good hides from the trail and I'll show you how it works." },
        ],
        null,
        () => {
          this.setStage(2);
          this.spawnGatherSpots();
          this.autosave('Rhovanion');
        }
      );
      return;
    }
    if (this.stage === 3) {
      this.dialogue(
        [{ speaker: 'Maren', text: "Three hides, is it? Good, thick ones too. I'll give you fair gold for what you don't need out here." }],
        [
          { id: 'sell', label: `Trade 2 hides for ${SELL_GOLD} gold.` },
          { id: 'keep', label: 'Keep them all, for now.' },
        ],
        (choiceId) => {
          if (choiceId === 'sell') {
            let removed = 0;
            this.state.inventory = this.state.inventory.filter((id) => {
              if (id === 'sturdy_hide' && removed < 2) {
                removed += 1;
                return false;
              }
              return true;
            });
            grantGold(this.state, SELL_GOLD);
            this.scene.emitGold();
            this.toast(`Maren counts out ${SELL_GOLD} gold, unhurried, and tucks the hides away.`, 2400);
          }
          this.offerSupplies();
        }
      );
      return;
    }
  }

  offerSupplies() {
    const canAfford = (this.state.gold ?? 0) >= BUY_PRICE;
    this.dialogue(
      [
        {
          speaker: 'Maren',
          text: canAfford
            ? "I've a few oddments left, if coin's burning a hole in your pack."
            : `Come back once you've got ${BUY_PRICE} gold to spare — I'll still be here.`,
        },
      ],
      canAfford ? [
        { id: 'buy', label: `Buy travel supplies (${BUY_PRICE} gold) — +2 HP, +2 MP potions` },
        { id: 'no', label: 'Not today.' },
      ] : null,
      (choiceId) => {
        if (choiceId === 'buy') {
          this.state.gold -= BUY_PRICE;
          this.state.potions ??= { hp: 2, mp: 2 };
          this.state.potions.hp += 2;
          this.state.potions.mp += 2;
          this.scene.emitGold();
          this.toast('Maren counts the gold twice, out of old habit, then hands over two skins and a small pouch.', 2600);
        }
        this.setStage(4);
        this.spawnPathOutPoint();
        this.autosave('Rhovanion');
      }
    );
  }

  // ---------- stage 2: gathering ----------

  spawnGatherSpots() {
    if (this.gatherSpots) return;
    this.gatherSpots = GATHER_DEFS.map((d) => {
      const p = tilesToPx(d.point);
      const done = !!this.state.quest.flags.gathered?.[d.key];
      const glow = this.scene.add.image(p.x, p.y, 'glow').setScale(0.5).setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
      glow.setVisible(!done);
      this.scene.tweens.add({ targets: glow, scale: 0.62, alpha: 0.6, duration: 900, yoyo: true, repeat: -1 });
      return { x: p.x, y: p.y, glow, key: d.key, label: d.label, text: d.text, done, interact: () => this.gather(d.key) };
    });
  }

  gather(key) {
    const spot = this.gatherSpots?.find((s) => s.key === key);
    if (!spot || spot.done) return;
    spot.done = true;
    spot.glow.destroy();
    this.state.quest.flags.gathered ??= {};
    this.state.quest.flags.gathered[key] = true;
    this.state.inventory ??= [];
    this.state.inventory.push('sturdy_hide');
    this.dialogue([{ speaker: null, text: spot.text }]);
    this.updateTracker();

    const doneCount = this.gatherSpots.filter((s) => s.done).length;
    if (doneCount >= this.gatherSpots.length) this.setStage(3);
    this.autosave('Rhovanion');
  }

  // ---------- stage 4: the path onward ----------

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
    this.setStage(5);
    this.state.waypointIndex = 6;
    grantXp(this.state, 25);
    grantGold(this.state, 20);
    this.scene.emitXp();
    this.scene.emitGold();
    this.autosave('Rhovanion — the road toward Ered Luin');
    this.scene.time.delayedCall(400, () => {
      this.scene.scene.stop('UI');
      this.scene.scene.start('Story', {
        id: 'the-long-road',
        title: 'Years on the Long Road',
        paragraphs: [
          'Waypoint 6 — Rhovanion: complete.',
          'There is no single day the crossing of Rhovanion ends — only, one morning, the realization that the peaks behind are a memory, and new mountains, blue with distance, have risen ahead.',
          'The Blue Mountains hold something the march has never met before: people who were never part of the Awakening at all.',
        ],
        rewards: { xp: 25, gold: 20 },
        button: 'To the Road West',
        next: 'Journey',
      });
    });
  }

  // ---------- interactables the WorldScene should offer right now ----------

  getInteractables() {
    const list = [...(this.gatherSpots ?? [])].filter((s) => !s.done);
    if (this.pathOutPoint) list.push(this.pathOutPoint);
    return list;
  }
}
