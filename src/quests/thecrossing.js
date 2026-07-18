import { EV } from '../config.js';
import Phaser from 'phaser';
import { tilesToPx, POINTS } from '../world/crossing.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { grantXp, grantGold } from '../data/leveling.js';

// Quest 10 — "The Crossing" (waypoint 10, Crossing to Aman). The closing
// event of the Great Journey campaign (concept doc §13.1, row 10) — no new
// gameplay system, just the campaign's capstone: the sea crossing itself,
// and a personalized epilogue.
//   0  the elder, on Tol Eressëa — the last farewell to Middle-earth
//   1  the water's edge — Ulmo's presence rises to guide the isle onward
//   2  the horizon — the first light of Aman, glimpsed at last
//   3  done — the Great Journey is complete
//
// Canon-lock: Ulmo ferrying the remaining host to Aman via Tol Eressëa is
// historically fixed. Ulmo is a Vala — never a companion, never fully
// seen; he manifests only as a voice and a light in the water, the same
// register Oromë's arrival used for a lesser being, taken one step further
// for one of the Valar themselves.

const T = (title, objective) => ({ title, objective });
const TRACKER = [
  T('The Crossing', 'Speak with the elder before the isle sets out.'),
  T('The Crossing', 'Something ancient stirs beneath the waves. Go to the water’s edge.'),
  T('The Crossing', 'The crossing continues. Watch the horizon for the first light of Aman.'),
  T('The Great Journey', 'The Great Journey is complete.'),
];

export default class TheCrossingQuest {
  constructor(scene) {
    this.scene = scene;
    this.elderNpc = null;
    this.ulmoPoint = null;
    this.lookoutPoint = null;
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
    if (this.stage === 0) this.spawnElder();
    if (this.stage === 1) this.spawnUlmoPoint();
    if (this.stage === 2) this.spawnLookoutPoint();
  }

  spawnElder() {
    if (this.elderNpc) return;
    this.elderNpc = this.scene.addNpc('npc_elder', POINTS.elder, 'the elder', () => this.talkElder());
  }

  spawnUlmoPoint() {
    if (this.ulmoPoint) return;
    const p = tilesToPx(POINTS.ulmo);
    const glow = this.scene.add.image(p.x, p.y, 'glow').setScale(1.1).setDepth(3).setBlendMode(Phaser.BlendModes.ADD).setTint(0x6ab4d8).setAlpha(0.7);
    this.scene.tweens.add({ targets: glow, scale: 1.35, alpha: 0.45, duration: 1400, yoyo: true, repeat: -1 });
    this.ulmoPoint = { x: p.x, y: p.y, glow, label: 'The Water’s Edge', interact: () => this.talkUlmo() };
  }

  spawnLookoutPoint() {
    if (this.lookoutPoint) return;
    const p = tilesToPx(POINTS.lookout);
    const glow = this.scene.add.image(p.x, p.y, 'glow').setScale(0.6).setDepth(3).setBlendMode(Phaser.BlendModes.ADD).setTint(0xf2e6b0);
    this.scene.tweens.add({ targets: glow, scale: 0.75, alpha: 0.55, duration: 1000, yoyo: true, repeat: -1 });
    this.lookoutPoint = { x: p.x, y: p.y, glow, label: 'Look West', interact: () => this.finishQuest() };
  }

  update() {}

  // ---------- setup on zone entry (fresh or from a save) ----------

  begin() {
    this.updateTracker();
    if (this.stage === 0 && !this.state.seenIntro) {
      this.state.seenIntro = true;
      this.scene.time.delayedCall(500, () => {
        this.toast('Tol Eressëa rides low in the water beneath you — a whole islet, and it does not so much as rock. Something vast is carrying it.', 3400);
      });
    }
  }

  // ---------- shared: a personalized line for whoever made it this far ----------

  partyRosterLine() {
    const names = (this.state.party ?? []).map((c) => c.name);
    if (!names.length) return null;
    if (names.length === 1) return names[0];
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  }

  partedWaysLine() {
    const lines = [];
    if (this.state.journeyFlags?.anwenStayed === false) lines.push('Anwen, who chose the river with Lenwë');
    if (this.state.journeyFlags?.calanonStayedWithEglath) lines.push('Calanon, who stayed with the Eglath');
    if (!lines.length) return null;
    if (lines.length === 1) return lines[0];
    return `${lines.slice(0, -1).join(', ')} and ${lines[lines.length - 1]}`;
  }

  // ---------- stage 0: farewell to Middle-earth ----------

  talkElder() {
    if (this.stage !== 0) return;
    const roster = this.partyRosterLine();
    const parted = this.partedWaysLine();
    const lines = [
      { speaker: 'the elder', text: "This little island is the last piece of ground between us and everything we set out for. Whatever is carrying it does not need our help — only our patience." },
    ];
    if (roster) lines.push({ speaker: 'the elder', text: `${roster} made it this far with you. Not everyone did — but you already know that.` });
    if (parted) lines.push({ speaker: null, text: `Somewhere behind you, ${parted} chose a different road. That doesn't make this one less true.` });
    lines.push({ speaker: 'the elder', text: 'Go to the water. I think it wants to be spoken to as much as we do.' });
    this.dialogue(lines, null, () => {
      this.setStage(1);
      this.spawnUlmoPoint();
      this.autosave('Tol Eressëa');
    });
  }

  // ---------- stage 1: Ulmo, unseen ----------

  talkUlmo() {
    if (this.stage !== 1) return;
    this.dialogue(
      [
        { speaker: null, text: "There is no shape to see here — only the water, moving against a current that isn't wind, and a voice that seems to rise up out of it rather than speak." },
        { speaker: 'Ulmo', text: "Long have I watched this march from beneath the waves, Eldar. The Sea remembers every step of it, even the ones you do not." },
        { speaker: 'Ulmo', text: "You do not need to see me to be carried. Rest, if you can. The crossing asks nothing further of you." },
      ],
      null,
      () => {
        this.toast('Days pass with no stars to steer by — only trust, and the slow certainty of being carried somewhere on purpose.', 3400);
        this.setStage(2);
        this.spawnLookoutPoint();
        this.autosave('Tol Eressëa');
      }
    );
  }

  // ---------- stage 2: first light ----------

  finishQuest() {
    if (this.stage !== 2 || !this.lookoutPoint) return;
    this.lookoutPoint.glow.destroy();
    this.lookoutPoint = null;
    this.dialogue(
      [
        { speaker: null, text: 'Far off, low against the dark, a light that isn’t a star at all — steady, gold and silver both at once, the way no single flame has ever burned.' },
        { speaker: 'the elder', text: "There. That's it. That's Aman." },
      ],
      null,
      () => {
        this.setStage(3);
        this.state.waypointIndex = 10;
        this.state.titles ??= [];
        if (!this.state.titles.includes('westward')) this.state.titles.push('westward');
        this.state.statPoints = (this.state.statPoints ?? 0) + 3;
        grantXp(this.state, 50);
        grantGold(this.state, 60);
        this.scene.emitXp();
        this.scene.emitGold();
        this.autosave('Tol Eressëa — landfall');
        this.scene.time.delayedCall(500, () => {
          this.scene.scene.stop('UI');
          this.scene.scene.start('Story', {
            id: 'the-great-journey-complete',
            title: 'The Great Journey — Complete',
            paragraphs: [
              'Waypoint 10 — Crossing to Aman: complete.',
              'From the dark water of Cuiviénen to the light on this horizon, the march is over. Not everyone who set out is still walking it — Lenwë turned south, the Eglath stayed with their lost King, the Falathrim stayed with the Sea itself — but you crossed the whole of it, and Aman rises ahead now, real.',
              this.partyRosterLine()
                ? `${this.partyRosterLine()} crossed with you, all the way to the end.`
                : 'You crossed alone, in the end — and that is its own kind of story.',
              'Valinor waits beyond this shore: Valmar, Tirion, Alqualondë, and the light of the Two Trees. That homecoming is a story for another day.',
            ],
            artFlag: 'The Shores of Aman — seen from the islet: white sand catching a light with no single source, gold and silver both at once, rising out of the dark sea ahead',
            rewards: { xp: 50, gold: 60, items: ['Traveler of the Uttermost West (Title)', '+3 Stat Points'] },
            button: 'The Journey Is Complete',
            next: 'Journey',
          });
        });
      }
    );
  }

  // ---------- interactables the WorldScene should offer right now ----------

  getInteractables() {
    const list = [];
    if (this.ulmoPoint) list.push(this.ulmoPoint);
    if (this.lookoutPoint) list.push(this.lookoutPoint);
    return list;
  }
}
