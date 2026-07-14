import Phaser from 'phaser';
import { EV } from '../config.js';
import { tilesToPx, POINTS } from '../world/steppes.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { grantXp, grantGold } from '../data/leveling.js';

// Quest 2 — "The Stragglers" (waypoint 2, The Steppes).
//   0  speak with Míriel, a straggler fallen behind the host
//   1  escort her west, foraging/hunting three supply spots along the way
//   2  lead her to the ford and cross
//   3  done — waypoint complete
//
// Deliberately simpler than "The Vanishing" — no combat, per the concept
// doc's own framing of this waypoint as filler content along the march
// (§13.0: "individual filler locations/quests can and should stay simple").

const T = (title, objective) => ({ title, objective });
const TRACKER = [
  T('The Stragglers', 'Speak with Míriel — she has fallen behind the host.'),
  T('The Stragglers', 'Escort Míriel west. Forage and hunt as you go.'),
  T('The Stragglers', 'Lead Míriel across the ford.'),
  T('The Great Journey', 'Waypoint complete. Open the menu to take the Road West.'),
];

const GATHER_DEFS = [
  { key: 'forage1', point: POINTS.forage1, label: 'Gather', text: 'Sweetroot grows thick in the tall grass here — enough to fill a satchel.' },
  { key: 'forage2', point: POINTS.forage2, label: 'Gather', text: 'Wild oats, heavy with grain. Míriel’s eyes light up at the sight.' },
  { key: 'hunt1', point: POINTS.hunt1, label: 'Track', text: 'Fresh tracks in the soft earth — a hare, maybe two. You need only a little patience.' },
];

export default class StragglersQuest {
  constructor(scene) {
    this.scene = scene;
    this.gatherSpots = null;
    this.crossPoint = null;
    this.mirielNpc = null;
    this.tarionNpc = null;
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
    if (this.stage === 1) {
      const done = this.gatherSpots
        ? this.gatherSpots.filter((s) => s.done).length
        : Object.keys(this.state.quest.flags.gathered ?? {}).length;
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

  // ---------- NPCs (always present, talkable at any stage) ----------

  spawnNpcs(points) {
    this.mirielNpc = this.scene.addNpc('npc_kinswoman', points.miriel, 'Míriel', () => this.talkMiriel());
    this.tarionNpc = this.scene.addNpc('npc_elf_hunter', points.tarion, 'Tarion', () => this.talkTarion());
  }

  // ---------- setup on zone entry (fresh or from a save) ----------

  begin() {
    this.updateTracker();
    if (this.stage === 1) this.spawnGatherSpots();
    if (this.stage === 2) this.spawnCrossPoint();
    if (this.stage === 0 && !this.state.seenIntro) {
      this.state.seenIntro = true;
      this.scene.time.delayedCall(500, () => {
        this.toast('The host’s fires are gone from view. Only grass, and someone’s voice on the wind.', 2800);
      });
    }
  }

  update() {
    this.followerUpdate();
  }

  // ---------- dialogue ----------

  talkMiriel() {
    if (this.stage === 0) {
      this.dialogue(
        [
          {
            speaker: 'Míriel',
            text: 'Oh — thank the stars, someone still walking behind. I stopped to gather what I could, and now I can’t see the host’s fires anywhere ahead.',
          },
          {
            speaker: 'Míriel',
            text: 'Will you walk with me? I don’t ask for much — just eyes sharper than mine, and someone to watch the grass.',
          },
        ],
        null,
        () => {
          this.setStage(1);
          this.spawnGatherSpots();
          this.autosave('The open steppe');
        }
      );
    } else if (this.stage === 1) {
      this.dialogue([
        { speaker: 'Míriel', text: 'The grass stretches so far... I keep thinking I hear the host ahead, but it’s only the wind.' },
      ]);
    } else if (this.stage === 2) {
      this.dialogue([{ speaker: 'Míriel', text: 'The water isn’t deep here, is it? I can already see stone underfoot.' }]);
    } else {
      this.dialogue([{ speaker: 'Míriel', text: 'I still think of that crossing. You have my thanks, truly.' }]);
    }
  }

  talkTarion() {
    if (this.stage < 3) {
      this.dialogue([
        { speaker: 'Tarion', text: 'Wide country, this. Good for the eye, hard on the feet. There’s a shallow crossing north of here — follow the reeds.' },
        { speaker: 'Tarion', text: 'Mind the grass — it moves on its own sometimes. Not all of it is wind.' },
      ]);
    } else if (!this.state.quest.flags.tarionGaveJerkin) {
      this.dialogue(
        [
          { speaker: 'Tarion', text: 'Good. One less family lost to the grass. The host will remember that.' },
          { speaker: 'Tarion', text: 'Here — take my spare jerkin, and these old bracers too. Hide’s tougher than it looks. Wear them well.' },
        ],
        null,
        () => {
          this.state.quest.flags.tarionGaveJerkin = true;
          this.giveItem('herders_jerkin', "Herder's Jerkin");
          this.giveItem('herders_bracers', "Herder's Bracers");
          this.autosave('The Steppes — the far bank');
        }
      );
    } else {
      this.dialogue([{ speaker: 'Tarion', text: 'Good. One less family lost to the grass. The host will remember that.' }]);
    }
  }

  // ---------- stage 1: forage/hunt ----------

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
    if (!this.state.quest.flags.gathered) this.state.quest.flags.gathered = {};
    this.state.quest.flags.gathered[key] = true;
    this.dialogue([{ speaker: null, text: spot.text }]);
    this.updateTracker();

    const doneCount = this.gatherSpots.filter((s) => s.done).length;
    if (doneCount >= this.gatherSpots.length) {
      this.setStage(2);
      this.spawnCrossPoint();
    }
    this.autosave('The open steppe');
  }

  // ---------- stage 2: the ford ----------

  spawnCrossPoint() {
    if (this.crossPoint) return;
    const p = tilesToPx(POINTS.crossing);
    const glow = this.scene.add.image(p.x, p.y, 'glow').setScale(0.6).setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: glow, scale: 0.72, alpha: 0.55, duration: 1000, yoyo: true, repeat: -1 });
    this.crossPoint = { x: p.x, y: p.y, glow, label: 'Rejoin the Host', interact: () => this.crossFord() };
  }

  crossFord() {
    if (this.stage !== 2 || !this.crossPoint) return;
    this.crossPoint.glow.destroy();
    this.crossPoint = null;
    this.dialogue(
      [
        { speaker: 'Míriel', text: 'There — I can see them! The fires, the standards... we made it.' },
        { speaker: 'Míriel', text: 'Here — take this. I wove it myself; it kept me warm the whole march. And boots too — you’ve more than earned them both.' },
      ],
      null,
      () => {
        this.giveItem('steppe_cloak', 'Woven Steppe Cloak');
        this.giveItem('steppe_boots', 'Steppe-worn Boots');
        this.scene.events.once(Phaser.Scenes.Events.RESUME, () => this.finishQuest());
        this.scene.openCharacterForGearTutorial();
      }
    );
  }

  // ---------- follower (Míriel walks with the player from stage 1 to 2) ----------

  followerUpdate() {
    if (this.stage < 1 || this.stage >= 3 || !this.mirielNpc) return;
    const spr = this.mirielNpc.sprite;
    const player = this.scene.player;
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
      spr.play(`npc_kinswoman-walk-${dir}`, true);
    } else if (spr.anims.isPlaying) {
      spr.anims.stop();
      spr.setFrame(10 * 13);
    }
  }

  finishQuest() {
    this.setStage(3);
    this.state.waypointIndex = 2;
    grantXp(this.state, 25);
    grantGold(this.state, 40);
    this.scene.emitXp();
    this.scene.emitGold();
    this.autosave('The Steppes — the far bank');
    this.scene.time.delayedCall(600, () => {
      this.scene.scene.stop('UI');
      this.scene.scene.start('Story', {
        id: 'across-the-steppe',
        title: 'Across the Steppe',
        paragraphs: [
          'Waypoint 2 — The Steppes: complete.',
          'Míriel and her gathered stores rejoin the host safely. The march west continues — grass gives way, ahead, to darker trees.',
          'The Great Forest waits beyond the plain.',
        ],
        button: 'To the Road West',
        next: 'Journey',
      });
    });
  }

  autosave(where) {
    const s = this.scene.captureState();
    SaveSystem.saveActive(this.scene, s, { where });
  }

  // ---------- gear (Inventory is introduced this waypoint) ----------

  giveItem(itemId, label) {
    if (!this.state.inventory) this.state.inventory = [];
    if (this.state.inventory.includes(itemId) || Object.values(this.state.equipment ?? {}).includes(itemId)) return;
    this.state.inventory.push(itemId);
    this.toast(`Received: ${label}`, 2600);
    if (!this.state.quest.flags.seenInventoryTip) {
      this.state.quest.flags.seenInventoryTip = true;
      this.scene.time.delayedCall(1400, () => this.toast('New: Inventory — open the menu (☰) to equip your gear.', 3200));
    }
  }

  // ---------- interactables the WorldScene should offer right now ----------

  getInteractables() {
    const list = [];
    if (this.stage === 1 && this.gatherSpots) {
      for (const s of this.gatherSpots) if (!s.done) list.push(s);
    }
    if (this.stage === 2 && this.crossPoint) list.push(this.crossPoint);
    return list;
  }
}
