import Phaser from 'phaser';
import { EV, TILE } from '../config.js';
import { tilesToPx, POINTS } from '../world/cuivienen.js';
import { SaveSystem } from '../systems/SaveSystem.js';

// Quest 1 — "The Vanishing" (waypoint 1, Cuiviénen).
//   0  speak with Elder Alassë at the camp
//   1  follow the trail of clues north-east
//   2  the shadow-servant: drive it off / survive until the horn sounds
//   3  the coming of Oromë (dialogue + choice, then story card)
//   4  walk Náro back to the camp
//   5  done — the summons west; Journey map unlocks
//
// Stage numbers are saved in state.quest.stage, so a reload resumes cleanly.

const T = (title, objective) => ({ title, objective });
const TRACKER = [
  T('The Vanishing', 'Speak with Elder Alassë at the camp.'),
  T('The Vanishing', 'Follow the trail of your missing kinsman, north-east along the rocks.'),
  T('The Vanishing', 'Something is here. Protect Náro!'),
  T('The Vanishing', 'Speak with the shining Rider.'),
  T('The Vanishing', 'Walk with Náro back to the camp.'),
  T('The Great Journey', 'The Valar have summoned your people west. Open the menu to take the Road West.'),
];

export default class VanishingQuest {
  constructor(scene) {
    this.scene = scene;
    this.clues = [];
    this.shadow = null;
    this.naro = null;
    this.orome = null;
    this.naroFollowing = false;
  }

  // always read the scene's live state object — captureState() replaces it,
  // so holding a reference from construction time would go stale
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
    const t = TRACKER[Math.min(this.stage, TRACKER.length - 1)];
    this.scene.game.events.emit(EV.TRACKER, t);
  }

  dialogue(lines, choices, onDone) {
    this.scene.game.events.emit(EV.DIALOGUE, { lines, choices, onDone });
  }

  toast(text, duration) {
    this.scene.game.events.emit(EV.TOAST, { text, duration });
  }

  // ---------- setup on zone entry (fresh or from a save) ----------

  begin() {
    this.updateTracker();
    if (this.stage >= 1 && this.stage <= 1) this.spawnClues();
    if (this.stage === 2) {
      this.spawnNaro();
      this.startEncounter();
    }
    if (this.stage === 3) {
      this.spawnNaro();
      this.spawnOrome(true);
    }
    if (this.stage === 4) {
      this.spawnNaro();
      this.naro.setFrame(130); // standing again (walk-down rest frame)
      this.naroFollowing = true;
    }
    if (this.stage === 0 && !this.state.seenIntro) {
      this.state.seenIntro = true;
      this.scene.time.delayedCall(600, () => {
        this.dialogue([
          { speaker: 'Nettë', text: 'You are awake. Good. My brother Náro went east along the rocks to gather — before the last sleep. He has not come back.' },
          { speaker: 'Nettë', text: 'Elder Alassë is asking for you. Please — she is by the ring of stones.' },
        ]);
      });
    }
  }

  // ---------- NPC dialogue hooks (wired by WorldScene) ----------

  talkElder() {
    if (this.stage === 0) {
      this.dialogue(
        [
          { speaker: 'Elder Alassë', text: 'Star-kindled, listen. Náro is the third to vanish since the waters last stirred. The others… we never found.' },
          { speaker: 'Elder Alassë', text: 'The hunters whisper of a Rider in the dark — and of shapes that crawl where the starlight fails.' },
          { speaker: 'Elder Alassë', text: 'You have sharper eyes than most. Follow his trail — he went north-east, along the rocks above the mere. Bring him home.' },
        ],
        null,
        () => {
          this.setStage(1);
          this.spawnClues();
          this.autosave('The shores of Cuiviénen');
        }
      );
    } else if (this.stage < 4) {
      this.dialogue([{ speaker: 'Elder Alassë', text: 'The trail runs north-east, along the rocks. Go carefully, and come back to us.' }]);
    } else if (this.stage === 4) {
      this.finishQuest();
    } else {
      this.dialogue([{ speaker: 'Elder Alassë', text: 'The Rider named us Eldar — the People of the Stars. Whatever road comes, we walked out of the dark to meet it.' }]);
    }
  }

  talkKinswoman() {
    if (this.stage < 4) {
      this.dialogue([{ speaker: 'Nettë', text: 'Náro sings when he forages — you will hear him before you see him. Unless… no. Find him. Please.' }]);
    } else {
      this.dialogue([{ speaker: 'Nettë', text: 'You brought him back. I will not forget this — not in a hundred years of stars, not ever.' }]);
    }
  }

  talkHunter() {
    if (this.stage < 3) {
      this.dialogue([
        { speaker: 'Herenion', text: 'I saw it once — the great Rider, far off. Hoofbeats like slow thunder. The others say I dreamed it.' },
        { speaker: 'Herenion', text: 'But something else moves out there too. Something that hates the starlight. Keep your knife close.' },
      ]);
    } else {
      this.dialogue([{ speaker: 'Herenion', text: 'So I did not dream it. A Rider out of the West… and it was the shadows that fled him.' }]);
    }
  }

  // ---------- stage 1: the trail ----------

  spawnClues() {
    if (this.clues.length) return;
    const texts = [
      'A forager’s basket, dropped. Berries scattered in the grass — no one gathered them up.',
      'Long scores in the earth, like claws. And Náro’s bootprints — running now.',
      'His knife, snapped in two. The starlight feels thin here… and cold.',
    ];
    [POINTS.clue1, POINTS.clue2, POINTS.clue3].forEach((pt, i) => {
      const p = tilesToPx(pt);
      const glow = this.scene.add.image(p.x, p.y, 'glow').setScale(0.5).setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({ targets: glow, scale: 0.62, alpha: 0.6, duration: 900, yoyo: true, repeat: -1 });
      this.clues.push({
        x: p.x,
        y: p.y,
        glow,
        index: i,
        text: texts[i],
        found: false,
        label: 'Examine',
        interact: () => this.examineClue(i),
      });
    });
  }

  examineClue(i) {
    const clue = this.clues[i];
    if (!clue || clue.found) return;
    clue.found = true;
    clue.glow.destroy();
    if (i < 2) {
      this.dialogue([{ speaker: null, text: clue.text }]);
      this.toast('The trail continues north-east…');
    } else {
      this.dialogue([{ speaker: null, text: clue.text }], null, () => {
        this.setStage(2);
        this.spawnNaro();
        this.startEncounter();
        this.autosave('The rocks above the mere');
      });
    }
  }

  cluesAsInteractables() {
    return this.clues.filter((c) => !c.found && Math.abs(c.index - this.nextClueIndex()) < 1.5);
  }

  nextClueIndex() {
    return this.clues.findIndex((c) => !c.found);
  }

  // ---------- stage 2: the shadow ----------

  spawnNaro() {
    if (this.naro) return;
    const p = tilesToPx(POINTS.naro);
    this.naro = this.scene.add.sprite(p.x, p.y, 'npc_kinsman', 265); // hurt row, lying frame
    this.naro.setDepth(p.y);
    if (this.stage <= 2) this.naro.setFrame(20 * 13 + 5); // collapsed
  }

  startEncounter() {
    const p = tilesToPx(POINTS.naro);
    this.scene.deepenNight(0.62);
    this.scene.game.events.emit(EV.ATTACK_SET, { visible: true });

    this.shadow = this.scene.physics.add.sprite(p.x - 40, p.y + 55, 'npc_shadow', 130);
    this.shadow.setDepth(9999).setAlpha(0.9).setTint(0x4a3a6a);
    this.shadow.hp = 5;
    this.shadow.lunging = false;
    this.shadow.hitThisLunge = false;
    this.shadow.body.setSize(28, 34);
    this.shadow.play('npc_shadow-walk-down');
    this.scene.tweens.add({ targets: this.shadow, alpha: 0.65, duration: 700, yoyo: true, repeat: -1 });

    this.toast('Something crawls out of the dark!', 2600);

    this.lungeTimer = this.scene.time.addEvent({
      delay: 2400,
      loop: true,
      callback: () => this.shadowLunge(),
    });
  }

  shadowLunge() {
    if (!this.shadow || !this.shadow.active || this.scene.game.uiBlocking) return;
    const player = this.scene.player;
    this.shadow.lunging = true;
    this.shadow.hitThisLunge = false;
    const dir = player.x < this.shadow.x ? 'left' : 'right';
    this.shadow.play(`npc_shadow-walk-${dir}`, true);
    this.scene.tweens.add({
      targets: this.shadow,
      x: player.x,
      y: player.y,
      duration: 460,
      ease: 'Sine.easeIn',
      onComplete: () => {
        if (!this.shadow?.active) return;
        this.shadow.lunging = false;
        const anchor = tilesToPx(POINTS.naro);
        this.scene.tweens.add({
          targets: this.shadow,
          x: anchor.x + Phaser.Math.Between(-80, 25),
          y: anchor.y + Phaser.Math.Between(20, 70),
          duration: 700,
          ease: 'Sine.easeOut',
        });
      },
    });
  }

  // called from WorldScene.update during stage 2
  encounterUpdate() {
    if (!this.shadow?.active) return;
    const player = this.scene.player;
    const d = Phaser.Math.Distance.Between(player.x, player.y, this.shadow.x, this.shadow.y);
    if (this.shadow.lunging && !this.shadow.hitThisLunge && d < 30) {
      this.shadow.hitThisLunge = true;
      this.scene.damagePlayer(8);
      // if the player is being overwhelmed, the horn sounds early — no dying here
      if (this.scene.getHp() <= this.scene.getMaxHp() * 0.25) {
        this.endEncounter(true);
      }
    }
  }

  // called when the player attacks (from WorldScene)
  tryHitShadow() {
    if (!this.shadow?.active) return;
    const player = this.scene.player;
    const d = Phaser.Math.Distance.Between(player.x, player.y, this.shadow.x, this.shadow.y);
    if (d > 64) return;
    this.shadow.hp -= 1;
    this.shadow.setTintFill(0xccccff);
    this.scene.time.delayedCall(90, () => this.shadow?.setTint(0x4a3a6a));
    const kx = this.shadow.x + (this.shadow.x - player.x) * 0.4;
    const ky = this.shadow.y + (this.shadow.y - player.y) * 0.4;
    this.scene.tweens.add({ targets: this.shadow, x: kx, y: ky, duration: 120 });
    if (this.shadow.hp <= 0) this.endEncounter(false);
  }

  endEncounter(rescued) {
    if (this.encounterOver) return;
    this.encounterOver = true;
    this.lungeTimer?.remove();
    this.scene.game.events.emit(EV.ATTACK_SET, { visible: false });

    const horn = rescued
      ? 'A horn rings out across the plain — vast, golden, older than the stars feel.'
      : 'The thing recoils from you — and then a horn rings out across the plain, vast and golden.';
    this.toast(horn, 3200);

    if (this.shadow?.active) {
      this.scene.tweens.add({
        targets: this.shadow,
        x: this.shadow.x + 500,
        y: this.shadow.y - 260,
        alpha: 0,
        duration: 900,
        ease: 'Sine.easeIn',
        onComplete: () => this.shadow?.destroy(),
      });
    }
    this.scene.time.delayedCall(1400, () => {
      this.setStage(3);
      this.scene.healPlayer();
      this.spawnOrome(false);
      this.autosave('The rocks above the mere');
    });
  }

  // ---------- stage 3: Oromë ----------

  spawnOrome(instant) {
    if (this.orome) return;
    const target = tilesToPx({ x: POINTS.naro.x - 2.5, y: POINTS.naro.y + 2 });
    const from = instant ? target : tilesToPx(POINTS.oromeEntry);

    const glow = this.scene.add.image(from.x, from.y, 'glow').setScale(1.6).setBlendMode(Phaser.BlendModes.ADD).setDepth(9998).setAlpha(0.8);
    this.orome = this.scene.add.sprite(from.x, from.y, 'npc_orome', 130);
    this.orome.setScale(1.25).setDepth(9999);
    this.orome.glow = glow;
    this.oromeInteractable = {
      get x() { return target.x; },
      get y() { return target.y; },
      label: 'Approach',
      interact: () => this.talkOrome(),
    };

    if (!instant) {
      this.scene.restoreNight();
      this.orome.play('npc_orome-walk-up');
      this.scene.tweens.add({
        targets: [this.orome, glow],
        x: target.x,
        y: target.y,
        duration: 2600,
        ease: 'Sine.easeOut',
        onComplete: () => {
          this.orome.play('npc_orome-idle-right');
          this.toast('The Rider has come. Approach him.', 2800);
        },
      });
    } else {
      this.orome.play('npc_orome-idle-right');
    }
  }

  talkOrome() {
    if (this.stage !== 3) return;
    this.dialogue(
      [
        { speaker: null, text: 'Light clings to him like morning that has never yet been. The horse at his side stands taller than any deer of the plain.' },
        { speaker: 'The Rider', text: 'Be not afraid. I am Oromë, a huntsman of the West, and long have I sought the source of your people’s singing.' },
        { speaker: 'Oromë', text: 'The dark things that stalk you are not of this land’s making. They are sent — by a power that would see you caged before you are even counted.' },
        { speaker: 'Oromë', text: 'I name you Eldar — People of the Stars. Take up your kinsman; he breathes. I will watch the dark until you reach your camp.' },
      ],
      [
        { id: 'trust', label: '“You saved us. I will trust you, Rider.”' },
        { id: 'wary', label: '“The dark also came as something new. I will watch you, huntsman.”' },
      ],
      (choiceId) => {
        this.state.quest.flags.oromeChoice = choiceId ?? 'trust';
        this.dialogue(
          [
            {
              speaker: 'Oromë',
              text:
                choiceId === 'wary'
                  ? 'Wariness kept your people alive in the dark. Keep it — but aim it well.'
                  : 'Then trust will be the first bridge between your people and the West.',
            },
          ],
          null,
          () => this.oromeDeparts()
        );
      }
    );
  }

  oromeDeparts() {
    this.setStage(4);
    this.naroFollowing = true;
    if (this.naro) {
      this.naro.setFrame(10 * 13); // back on his feet
    }
    if (this.orome) {
      this.scene.tweens.add({
        targets: [this.orome, this.orome.glow],
        x: this.orome.x - 700,
        y: this.orome.y + 500,
        alpha: 0.0,
        duration: 2200,
        ease: 'Sine.easeIn',
        onComplete: () => {
          this.orome?.glow?.destroy();
          this.orome?.destroy();
          this.orome = null;
        },
      });
    }
    this.oromeInteractable = null;
    this.autosave('The rocks above the mere');
    this.dialogueNaro();
  }

  dialogueNaro() {
    this.scene.time.delayedCall(400, () => {
      this.dialogue([
        { speaker: 'Náro', text: 'I saw it… it had no face, and it was cold, so cold. Then the horn — I thought the stars themselves had sounded it.' },
        { speaker: 'Náro', text: 'Take me home. Nettë will be worried past all singing.' },
      ]);
    });
  }

  // stage 4: Náro follows; WorldScene calls this each frame
  followerUpdate() {
    if (!this.naroFollowing || !this.naro) return;
    const player = this.scene.player;
    const d = Phaser.Math.Distance.Between(player.x, player.y, this.naro.x, this.naro.y);
    if (d > 52) {
      const speed = d > 140 ? 150 : 110;
      const angle = Math.atan2(player.y - this.naro.y, player.x - this.naro.x);
      const vx = Math.cos(angle) * speed * (this.scene.game.loop.delta / 1000);
      const vy = Math.sin(angle) * speed * (this.scene.game.loop.delta / 1000);
      this.naro.x += vx;
      this.naro.y += vy;
      this.naro.setDepth(this.naro.y);
      const dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : vy > 0 ? 'down' : 'up';
      this.naro.play(`npc_kinsman-walk-${dir}`, true);
    } else if (this.naro.anims.isPlaying) {
      this.naro.anims.stop();
      this.naro.setFrame(10 * 13);
    }
  }

  finishQuest() {
    this.dialogue(
      [
        { speaker: 'Elder Alassë', text: 'Náro! Come, sit — Nettë, he is here, he is whole!' },
        { speaker: 'Elder Alassë', text: 'And you… you have seen the Rider, and lived to tell it plainly. Then the whispers are true. The West is calling us.' },
        { speaker: 'Elder Alassë', text: 'The lords of the three kindreds have seen the light of the Trees, and they say we must go — a journey of years beyond counting. The host gathers. You will walk at the front of it.' },
      ],
      null,
      () => {
        this.setStage(5);
        this.naroFollowing = false;
        this.state.waypointIndex = 1;
        this.autosave('The shores of Cuiviénen — the eve of the Great Journey');
        this.scene.time.delayedCall(600, () => {
          this.scene.scene.stop('UI');
          this.scene.scene.start('Story', {
            title: 'The Summons of the Valar',
            art: 'art-call-of-orome',
            paragraphs: [
              'Waypoint 1 — Cuiviénen: complete.',
              'The Quest of “The Vanishing” is ended. Náro is home, and the name Eldar now belongs to your people.',
              'Westward lies a march of years: steppes and forests, mountains and wide wild lands, until the Sea itself — and beyond it, the Light.',
            ],
            button: 'To the Road West',
            next: 'Journey',
          });
        });
      }
    );
  }

  autosave(where) {
    const s = this.scene.captureState();
    SaveSystem.save(s, { where });
  }

  // interactables the WorldScene should offer right now
  getInteractables() {
    const list = [];
    if (this.stage === 1) {
      const next = this.clues.find((c) => !c.found);
      if (next) list.push(next);
    }
    if (this.stage === 3 && this.oromeInteractable) list.push(this.oromeInteractable);
    return list;
  }
}
