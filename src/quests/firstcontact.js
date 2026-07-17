import Phaser from 'phaser';
import { EV } from '../config.js';
import { tilesToPx, POINTS } from '../world/eredluin.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { grantXp, grantGold } from '../data/leveling.js';
import { itemById, bonusLine, CRAFT_ITEM_BY_CLASS } from '../data/items.js';

// Quest 7 — "First Contact" (waypoint 7, Ered Luin).
//   0  a Dwarf patrol blocks the pass — tense, resolved by words, not blades
//   1  Norrik the smith teaches the crafting station's one fixed recipe
//   2  continue west, beyond the mountains
//   3  done — waypoint complete
//
// Canon-lock: First Contact between Elves and Dwarves at Ered Luin is
// historically real and ends at peace — that macro outcome is fixed.
// Bruntar and Norrik are generic, non-canon Dwarves; the dialogue around
// them (including the patrol's opening choice) is not canon-bound at all.
//
// No Dwarf spritesheet exists in this build (only Elf-styled character
// sheets are loaded) and external asset hosts are blocked by this
// environment's network policy — Bruntar/Norrik reuse existing Elf sheets,
// retinted bronze, the same "clearly-marked placeholder" convention
// already used for the WP1 shadow-servant and WP3 wolf.

const T = (title, objective) => ({ title, objective });
const TRACKER = [
  T('First Contact', 'A Dwarf patrol blocks the pass ahead.'),
  T('First Contact', 'Find Norrik, the smith, at the forge-light.'),
  T('First Contact', 'Continue west, beyond the mountains.'),
  T('The Great Journey', 'Waypoint complete. Open the menu to take the Road West.'),
];

const DWARF_TINT = 0xd9a86a;
const CRAFT_GOLD_COST = 10;

export default class FirstContactQuest {
  constructor(scene) {
    this.scene = scene;
    this.patrolNpc = null;
    this.smithNpc = null;
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
    if (this.stage === 0) this.spawnPatrol();
    if (this.stage === 1) this.spawnSmith();
  }

  // scene.addNpc() doesn't expose a tint, and these two specifically need
  // one (see the placeholder-art note above), so they're built directly
  // here instead — same object shape scene.addNpc() returns.
  addTintedNpc(sheet, tile, name, onTalk) {
    const p = tilesToPx(tile);
    const spr = this.scene.add.sprite(p.x, p.y, sheet, 10 * 13);
    spr.setDepth(p.y).setTint(DWARF_TINT);
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
    this.scene.npcs.push(npc);
    return npc;
  }

  spawnPatrol() {
    if (this.patrolNpc) return;
    this.patrolNpc = this.addTintedNpc('npc_elf_hunter', POINTS.patrolSpot, 'Bruntar', () => this.talkPatrol());
  }

  spawnSmith() {
    if (this.smithNpc) return;
    this.smithNpc = this.addTintedNpc('npc_kinsman', POINTS.smithSpot, 'Norrik', () => this.talkSmith());
  }

  update() {}

  // ---------- setup on zone entry (fresh or from a save) ----------

  begin() {
    this.updateTracker();
    if (this.stage === 0 && !this.state.seenIntro) {
      this.state.seenIntro = true;
      this.scene.time.delayedCall(500, () => {
        this.toast('Stone-cut steps and worked rock, deep in the Blue Mountains — this pass was made by hands, not weather.', 3000);
      });
    }
  }

  // ---------- stage 0: the patrol ----------

  talkPatrol() {
    if (this.stage !== 0) return;
    this.dialogue(
      [{ speaker: 'Bruntar', text: '(He raises a hand — not in greeting.) Far enough. State your business in Dwarf-country, Elf.' }],
      [
        { id: 'peace', label: 'We mean no harm. We only wish to pass.' },
        { id: 'proud', label: "We've crossed worse than a mountain patrol to get here." },
      ],
      (choiceId) => {
        const reply =
          choiceId === 'proud'
            ? { speaker: 'Bruntar', text: "Bold word for someone with an empty scabbard where a shield should be. ...Still. Bold's not the same as lying." }
            : { speaker: 'Bruntar', text: 'Plain speech. I can work with plain speech.' };
        this.dialogue(
          [
            reply,
            { speaker: 'Bruntar', text: 'No host of your kind has ever come this far before. My kin will want words with whoever leads you — but no blades today. Follow the forge-light; ask for Norrik.' },
          ],
          null,
          () => {
            this.setStage(1);
            this.spawnSmith();
            this.autosave('Ered Luin');
          }
        );
      }
    );
  }

  // ---------- stage 1: the smith — the crafting station's one fixed recipe ----------

  talkSmith() {
    if (this.stage !== 1) return;
    if (!this.state.quest.flags.smithIntroduced) {
      this.state.quest.flags.smithIntroduced = true;
      this.dialogue(
        [
          { speaker: 'Norrik', text: "Bruntar's message reached me before you did — first of your kind through this pass, they tell me. Huh." },
          { speaker: 'Norrik', text: "I don't shake a hand without giving something for it. Bring me a hide off the road and enough gold for the work, and I'll make something worth carrying." },
        ],
        null,
        () => this.offerCraft()
      );
      return;
    }
    this.offerCraft();
  }

  offerCraft() {
    const itemId = CRAFT_ITEM_BY_CLASS[this.state.classId];
    const item = itemById(itemId);
    const hasHide = (this.state.inventory ?? []).includes('sturdy_hide');
    const canCraft = hasHide && (this.state.gold ?? 0) >= CRAFT_GOLD_COST;
    this.dialogue(
      [
        {
          speaker: 'Norrik',
          text: canCraft
            ? `A ${item.name.toLowerCase()}, then — that suits what I've seen of your kind's fighting.`
            : `Come back with a hide off the road and ${CRAFT_GOLD_COST} gold, and I'll still be at the forge.`,
        },
      ],
      canCraft
        ? [
            { id: 'craft', label: `Craft the ${item.name} (${CRAFT_GOLD_COST} gold + 1 Sturdy Hide)` },
            { id: 'no', label: 'Not yet.' },
          ]
        : null,
      (choiceId) => {
        if (choiceId !== 'craft') return; // declined or can't afford — stays at stage 1, Norrik waits
        const idx = this.state.inventory.indexOf('sturdy_hide');
        if (idx !== -1) this.state.inventory.splice(idx, 1);
        this.state.gold -= CRAFT_GOLD_COST;
        this.state.inventory.push(itemId);
        this.scene.emitGold();
        this.scene.game.events.emit(EV.ITEM_GET, { name: item.name, bonus: bonusLine(item) });
        this.toast("Norrik works fast, and doesn't look up once until it's done.", 2400);
        this.setStage(2);
        this.spawnPathOutPoint();
        this.autosave('Ered Luin');
      }
    );
  }

  // ---------- stage 2: the path onward ----------

  spawnPathOutPoint() {
    if (this.pathOutPoint) return;
    const p = tilesToPx(POINTS.pathOut);
    const glow = this.scene.add.image(p.x, p.y, 'glow').setScale(0.6).setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: glow, scale: 0.72, alpha: 0.55, duration: 1000, yoyo: true, repeat: -1 });
    this.pathOutPoint = { x: p.x, y: p.y, glow, label: 'Continue West', interact: () => this.finishQuest() };
  }

  finishQuest() {
    if (this.stage !== 2 || !this.pathOutPoint) return;
    this.pathOutPoint.glow.destroy();
    this.pathOutPoint = null;
    const item = itemById(CRAFT_ITEM_BY_CLASS[this.state.classId]);
    this.setStage(3);
    this.state.waypointIndex = 7;
    grantXp(this.state, 30);
    grantGold(this.state, 25);
    this.scene.emitXp();
    this.scene.emitGold();
    this.autosave('Ered Luin — beyond the forge-light');
    this.scene.time.delayedCall(400, () => {
      this.scene.scene.stop('UI');
      this.scene.scene.start('Story', {
        id: 'first-contact-naugrim',
        title: 'First Contact with the Naugrim',
        paragraphs: [
          'Waypoint 7 — Ered Luin: complete.',
          "No Elf has walked this deep into the Blue Mountains before — and none has left carrying a Dwarf-made gift, either. Norrik's work sits strange and new among your things, but it will not be the last such gift, in the ages still to come.",
          "Beyond Ered Luin, the march turns toward Beleriand — and toward Elwë, whose road home does not end the way anyone expects.",
        ],
        rewards: { xp: 30, gold: 25, items: [item?.name ?? 'a Dwarf-made trinket'] },
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
