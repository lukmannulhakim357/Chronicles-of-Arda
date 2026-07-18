import Phaser from 'phaser';
import { EV } from '../config.js';
import { tilesToPx, POINTS } from '../world/beleriand.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { grantXp, grantGold } from '../data/leveling.js';
import { inParty, removeCompanion } from '../systems/party.js';

// Quest 8 — "The King Is Lost" (waypoint 8, Beleriand & Neldoreth).
//   0  Olwë, at the camp — his brother Elwë walked into Nan Elmoth and
//      never came back
//   1  search Nan Elmoth for some trace of him (3 spots; each turns up a
//      Tale — the Collection tab tutorial fires on the first one found)
//   2  return to Olwë with what was found — no Elwë, only his last trace;
//      Olwë names you Seeker for the search (first Title, + its tutorial)
//   3  the Eglath — those who will not go on without their king — take
//      their leave; Calanon, if still with the party, may choose to stay
//      with them
//   4  continue east, beyond Neldoreth
//   5  done — waypoint complete
//
// Canon-lock: Elwë meeting Melian and being lost to the march, and the
// Eglath's refusal to continue without him, are both historically fixed —
// the player can never actually find Elwë here, only his last trace (he
// resurfaces, in canon, only much later as King of Doriath). Everything
// else — Olwë's words, the Eglath's names, Calanon's choice — is flavor.

const T = (title, objective) => ({ title, objective });
const TRACKER = [
  T('The King Is Lost', 'Speak with Olwë — something is wrong at the edge of Nan Elmoth.'),
  T('The King Is Lost', 'Search Nan Elmoth for some trace of Elwë.'),
  T('The King Is Lost', 'Return to Olwë with what you found.'),
  T('The King Is Lost', 'The Eglath will go no further. Watch the parting.'),
  T('The King Is Lost', 'Continue east, beyond Neldoreth.'),
  T('The Great Journey', 'Waypoint complete. Open the menu to take the Road West.'),
];

const SEARCH_INFO = {
  search1: {
    point: 'search1',
    lines: [
      { speaker: null, text: 'Scraps of green cloth, snagged on a thorn — torn from a cloak, and not long ago.' },
    ],
    card: {
      id: 'tale-torn-cloak',
      title: 'A Torn Cloak',
      paragraphs: [
        'Thorns had caught at green cloth and held it, the way thorns hold whatever passes carelessly. Whoever wore it had not stopped to free it.',
        'Elwë always walked as if the forest would part for him. Perhaps, this once, it hadn’t.',
      ],
      artFlag: 'Nan Elmoth — a scrap of torn cloak on a thorn bush',
    },
  },
  search2: {
    point: 'search2',
    lines: [
      { speaker: null, text: 'A hollow beneath the oldest trees, and a silence so complete even the wind seems to walk around it.' },
    ],
    card: {
      id: 'tale-starlit-hush',
      title: 'A Silence Under the Trees',
      paragraphs: [
        'No bird called here. No branch moved. And yet the hush did not feel empty — it felt attended, as though the forest itself were listening back.',
        'Somewhere close, a nightingale sang once, and stopped, as if it had said too much already.',
      ],
      artFlag: 'Nan Elmoth — an unnaturally still hollow beneath ancient trees',
    },
  },
  search3: {
    point: 'search3',
    lines: [
      { speaker: null, text: "A circlet of silver, half-sunk in moss beneath a low bough — and footprints beside it that simply end, mid-stride, and do not begin again." },
    ],
    card: {
      id: 'tale-last-trace-elwe',
      title: "Elwë's Last Trace",
      paragraphs: [
        'His circlet lay where it had fallen, or been set down, or simply forgotten — no one left to say which. The footprints beside it end without continuing, without turning back, without any sign of struggle at all.',
        'Whatever became of him here, it did not look like harm. It looked like he had simply stopped walking toward the host, and started walking toward something else.',
      ],
      artFlag: 'Nan Elmoth — a silver circlet in the moss, and footprints that end',
    },
  },
};

export default class TheKingIsLostQuest {
  constructor(scene) {
    this.scene = scene;
    this.olweNpc = null;
    this.searchPoints = [];
    this.pathOutPoint = null;
    this.farewellStarted = false;
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

  get foundSearches() {
    this.state.quest.flags.foundSearches ??= [];
    return this.state.quest.flags.foundSearches;
  }

  // ---------- NPCs ----------

  spawnNpcs() {
    if (this.stage <= 2) this.spawnOlwe();
    if (this.stage === 1) this.spawnSearchPoints();
    if (this.stage === 3 && !this.state.quest.flags.farewellDone) this.spawnFarewell();
  }

  // Idempotent, called both from spawnNpcs() above (a fresh WorldScene
  // create — new visit or save reload) and directly from whichever stage
  // transition advances into that stage live, mid-session.
  spawnOlwe() {
    if (this.olweNpc) return;
    this.olweNpc = this.scene.addNpc('npc_elder', POINTS.olwe, 'Olwë', () => this.talkOlwe());
  }

  spawnSearchPoints() {
    if (this.searchPoints.length) return;
    for (const key of Object.keys(SEARCH_INFO)) {
      if (this.foundSearches.includes(key)) continue;
      const p = tilesToPx(POINTS[SEARCH_INFO[key].point]);
      const glow = this.scene.add.image(p.x, p.y, 'glow').setScale(0.5).setDepth(3).setBlendMode(Phaser.BlendModes.ADD).setTint(0x8ac0c0);
      this.scene.tweens.add({ targets: glow, scale: 0.62, alpha: 0.55, duration: 1100, yoyo: true, repeat: -1 });
      this.searchPoints.push({ key, x: p.x, y: p.y, glow, label: 'Search', interact: () => this.searchAt(key) });
    }
  }

  removeSearchPoint(key) {
    const idx = this.searchPoints.findIndex((s) => s.key === key);
    if (idx === -1) return;
    this.searchPoints[idx].glow.destroy();
    this.searchPoints.splice(idx, 1);
  }

  update() {}

  // ---------- setup on zone entry (fresh or from a save) ----------

  begin() {
    this.updateTracker();
    if (this.stage === 0 && !this.state.seenIntro) {
      this.state.seenIntro = true;
      this.scene.time.delayedCall(500, () => {
        this.toast('Nan Elmoth stands ahead, dark even by the standards of this march. Olwë waits at its edge, and something is wrong in the way he stands.', 3200);
      });
    }
  }

  // ---------- stage 0: Olwë's news ----------

  talkOlwe() {
    if (this.stage === 0) {
      this.dialogue(
        [
          { speaker: 'Olwë', text: 'My brother walked into that wood three nights past, alone, and has not come out again.' },
          { speaker: 'Olwë', text: "Elwë always walked ahead of the rest of us. I told myself that's all this was, at first." },
          { speaker: 'Olwë', text: "I can't say that to myself any longer. Search the wood with me — or without me, if that's what it takes. Find something. Find him." },
        ],
        null,
        () => {
          this.setStage(1);
          this.spawnSearchPoints();
          this.autosave('Nan Elmoth');
        }
      );
      return;
    }
    if (this.stage === 2) {
      this.reportToOlwe();
    }
  }

  // ---------- stage 1: the search ----------

  searchAt(key) {
    if (this.stage !== 1 || this.foundSearches.includes(key)) return;
    const info = SEARCH_INFO[key];
    this.dialogue(info.lines, null, () => {
      this.foundSearches.push(key);
      this.pushCard(info.card);
      this.removeSearchPoint(key);
      if (this.foundSearches.length === 1) {
        this.afterFirstCard(() => this.checkSearchComplete());
      } else {
        this.checkSearchComplete();
      }
    });
  }

  pushCard(card) {
    this.state.seenCards ??= [];
    if (this.state.seenCards.some((c) => c.id === card.id)) return;
    this.state.seenCards.push({ ...card, seenAt: Date.now() });
  }

  // The first Tale found this quest opens the Collection tab as a scripted
  // tutorial moment, same pattern as every other first-use tutorial this
  // march — the tab itself has worked since Waypoint 1, this only points
  // the player at it the first time it's actually worth checking mid-quest.
  afterFirstCard(proceed) {
    this.scene.events.once(Phaser.Scenes.Events.RESUME, proceed);
    this.scene.openCharacterForCollectionTutorial();
  }

  checkSearchComplete() {
    if (this.foundSearches.length >= Object.keys(SEARCH_INFO).length) {
      this.setStage(2);
      this.toast("Nothing more to find here. Best to bring this back to Olwë.", 2600);
    }
    this.autosave('Nan Elmoth');
  }

  // ---------- stage 2: reporting back, and the first Title ----------

  reportToOlwe() {
    if (this.stage !== 2) return;
    this.dialogue(
      [
        { speaker: null, text: 'You lay the circlet in Olwë’s hands and tell him the rest — the cloak, the hush, the footprints that simply end.' },
        { speaker: 'Olwë', text: '...No blood. No sign of any beast, or any blade. He did not fall here.' },
        { speaker: 'Olwë', text: 'Then wherever he’s gone, he went on his own feet, toward something. That will have to be enough of an answer, for now.' },
        { speaker: 'Olwë', text: "You searched that wood harder than any of us would have asked. Seeker, then — that's what I'll call you, if you'll wear the name." },
      ],
      null,
      () => {
        this.state.titles ??= [];
        if (!this.state.titles.includes('seeker')) this.state.titles.push('seeker');
        this.toast('New Title: Seeker — open Titles to equip it.', 3000);
        this.scene.events.once(Phaser.Scenes.Events.RESUME, () => {
          this.setStage(3);
          this.spawnFarewell();
          this.autosave('Nan Elmoth');
        });
        this.scene.openCharacterForTitlesTutorial();
      }
    );
  }

  // ---------- stage 3: the Eglath's farewell ----------

  spawnFarewell() {
    if (this.farewellStarted) return;
    this.farewellStarted = true;
    if (inParty(this.state, 'calanon')) {
      this.offerCalanonChoice(() => this.runFarewellCrowd());
    } else {
      this.runFarewellCrowd();
    }
  }

  offerCalanonChoice(proceed) {
    this.dialogue(
      [
        { speaker: 'Calanon', text: "My own kin are among those who won't take another step without their king found." },
        { speaker: 'Calanon', text: "I've walked this whole march at your side. I don't know how to say this and have it sound like anything but what it is." },
      ],
      [
        { id: 'stay', label: 'Stay with your people, Calanon. Go, with our thanks.' },
        { id: 'go', label: 'Come with us still — your kin will understand.' },
      ],
      (choiceId) => {
        if (choiceId === 'stay') {
          this.state.journeyFlags ??= {};
          this.state.journeyFlags.calanonStayedWithEglath = true;
          removeCompanion(this.state, 'calanon');
          this.scene.removeCompanionFromWorld('calanon');
          this.dialogue(
            [{ speaker: 'Calanon', text: "Thank you for that. Whatever road you're on now, I hope it circles back one day." }],
            null,
            () => proceed()
          );
        } else {
          this.dialogue(
            [{ speaker: 'Calanon', text: "...Some other time, then. I won't forget you offered me the choice." }],
            null,
            () => proceed()
          );
        }
      }
    );
  }

  runFarewellCrowd() {
    const p = tilesToPx(POINTS.eglath);
    const crowd = [];
    for (let i = 0; i < 6; i++) {
      const sheet = i % 2 === 0 ? 'npc_kinsman' : 'npc_kinswoman';
      const spr = this.scene.add.sprite(p.x + Phaser.Math.Between(-40, 40), p.y + Phaser.Math.Between(-20, 20), sheet, 130);
      spr.setDepth(spr.y);
      crowd.push(spr);
    }

    this.toast(
      'Those who will not leave without their king turn back into the wood — the Eglath, the ones left behind. Olwë leads the rest of you on.',
      3600
    );
    this.dialogue(
      [
        { speaker: null, text: "“We stay,” one elder says, for all of them. “Until he is found, or until the stars themselves go out. This is not goodbye — only a parting of roads.”" },
      ],
      null,
      () => {
        crowd.forEach((spr, i) => {
          spr.play(`${spr.texture.key}-walk-left`, true);
          this.scene.tweens.add({
            targets: spr,
            x: spr.x - 220,
            y: spr.y + Phaser.Math.Between(-20, 20),
            alpha: 0,
            duration: 3000 + i * 100,
            ease: 'Sine.easeIn',
            onComplete: () => spr.destroy(),
          });
        });
        this.scene.time.delayedCall(3200, () => {
          this.setStage(4);
          this.state.quest.flags.farewellDone = true;
          this.spawnPathOutPoint();
          this.autosave('Nan Elmoth');
        });
      }
    );
  }

  // ---------- stage 4: the road onward ----------

  spawnPathOutPoint() {
    if (this.pathOutPoint) return;
    const p = tilesToPx(POINTS.pathOut);
    const glow = this.scene.add.image(p.x, p.y, 'glow').setScale(0.6).setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: glow, scale: 0.72, alpha: 0.55, duration: 1000, yoyo: true, repeat: -1 });
    this.pathOutPoint = { x: p.x, y: p.y, glow, label: 'Continue East', interact: () => this.finishQuest() };
  }

  finishQuest() {
    if (this.stage !== 4 || !this.pathOutPoint) return;
    this.pathOutPoint.glow.destroy();
    this.pathOutPoint = null;
    this.setStage(5);
    this.state.waypointIndex = 8;
    grantXp(this.state, 35);
    grantGold(this.state, 30);
    this.scene.emitXp();
    this.scene.emitGold();
    this.autosave('Beleriand — beyond Neldoreth');
    this.scene.time.delayedCall(400, () => {
      this.scene.scene.stop('UI');
      this.scene.scene.start('Story', {
        id: 'of-the-sindar',
        title: 'Of the Sindar',
        paragraphs: [
          'Waypoint 8 — Beleriand & Neldoreth: complete.',
          'No trace of Elwë was ever found beyond the moss and the circlet and the footprints that simply ended. Olwë led the rest of the host onward, but the Eglath — those left behind — would not take another step without their king.',
          'In the ages after, the songs would call them the Sindar, the Grey-elves, and their wood would not stay dark for long — but that is a tale for later than this one.',
          this.state.journeyFlags?.calanonStayedWithEglath
            ? "Calanon stayed with his own kin, among the Eglath. You won't see him again on this road — but perhaps on another, one day."
            : 'The road ahead turns toward the sea — and toward a shore none of you have ever set eyes on.',
        ],
        rewards: { xp: 35, gold: 30 },
        button: 'To the Road West',
        next: 'Journey',
      });
    });
  }

  // ---------- interactables the WorldScene should offer right now ----------

  getInteractables() {
    const list = [...this.searchPoints];
    if (this.pathOutPoint) list.push(this.pathOutPoint);
    return list;
  }
}
