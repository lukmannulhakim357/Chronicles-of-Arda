import Phaser from 'phaser';
import { COLORS, FONTS, EV } from '../config.js';
import { makeTextButton, starfield } from '../ui/widgets.js';
import { WAYPOINTS } from '../data/waypoints.js';
import { getState, setState } from '../systems/GameState.js';
import { SaveSystem } from '../systems/SaveSystem.js';

// The Road West — the chain of ten waypoints of the Great Journey.
// East (Cuiviénen) at the bottom, the Sea at the top. This build contains
// waypoint 1 as a playable zone; further waypoints show their story beat
// as a preview card.

export default class JourneyScene extends Phaser.Scene {
  constructor() {
    super('Journey');
  }

  create() {
    this.state = getState(this);
    if (!this.state) {
      this.scene.start('Title');
      return;
    }
    // remember that the player is on the road map
    const s = { ...this.state, zone: '__journey__' };
    setState(this, s);
    this.state = s;
    SaveSystem.saveActive(this, s, { where: 'The Road West' });

    this.cameras.main.setBackgroundColor('#05060f');
    this.build();
  }

  build() {
    const { width, height } = this.scale;
    starfield(this, Math.floor((width * height) / 11000));

    this.add
      .text(width / 2, 18, 'The Road West', {
        fontFamily: FONTS.body,
        fontSize: Math.min(26, width / 15) + 'px',
        color: '#d9b968',
      })
      .setOrigin(0.5, 0);

    this.add
      .text(10, 10, '☰', {
        fontFamily: 'sans-serif',
        fontSize: '24px',
        color: '#e8e4d8',
        backgroundColor: 'rgba(16,24,48,0.75)',
        padding: { x: 10, y: 4 },
      })
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.openMenu());

    const n = WAYPOINTS.length;
    const top = 74;
    const bottom = 84;
    const stepY = (height - top - bottom) / (n - 1);
    const cx = width / 2;
    const amp = Math.min(70, width * 0.16);

    const pts = WAYPOINTS.map((w, i) => {
      const y = height - bottom - i * stepY;
      const x = cx + Math.sin(i * 1.1) * amp;
      return { x, y };
    });

    // the road line
    const g = this.add.graphics();
    g.lineStyle(3, 0x2c3a66, 1);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < n; i++) g.lineTo(pts[i].x, pts[i].y);
    g.strokePath();

    const current = this.state.waypointIndex;

    WAYPOINTS.forEach((w, i) => {
      const { x, y } = pts[i];
      const done = i < current;
      const isCurrent = i === current;
      const locked = i > current;

      const color = done ? 0xd9b968 : isCurrent ? 0xffffff : 0x3a4a7a;
      const node = this.add.circle(x, y, isCurrent ? 11 : 8, color, done || isCurrent ? 1 : 0.5);
      node.setStrokeStyle(2, done ? 0xd9b968 : 0x3a4a7a);
      if (isCurrent) {
        this.tweens.add({ targets: node, scale: 1.35, duration: 800, yoyo: true, repeat: -1 });
      }

      const side = x < cx ? 1 : -1;
      const label = this.add
        .text(x + side * 18, y, `${i + 1}. ${w.name}`, {
          fontFamily: FONTS.body,
          fontSize: '14px',
          color: done ? '#d9b968' : isCurrent ? '#f0ead8' : '#5a6a88',
        })
        .setOrigin(side > 0 ? 0 : 1, 0.5);
      if (locked) label.setAlpha(0.55);

      const hit = this.add.zone(x, y, 200, Math.max(34, stepY * 0.9)).setInteractive({ useHandCursor: !locked });
      hit.on('pointerup', () => this.tapWaypoint(i));
    });

    makeTextButton(this, width / 2, height - 34, Math.min(280, width - 60), 50, this.continueLabel(), () =>
      this.tapWaypoint(Math.min(current, WAYPOINTS.length - 1))
    );
  }

  continueLabel() {
    const i = this.state.waypointIndex;
    if (i >= WAYPOINTS.length) return 'The Journey is complete';
    const w = WAYPOINTS[i];
    return w.built ? `Enter ${w.name}` : `March on: ${w.name}`;
  }

  tapWaypoint(i) {
    if (i > this.state.waypointIndex) {
      this.game.events.emit(EV.TOAST, { text: 'The road has not yet reached so far.' });
      return;
    }
    const w = WAYPOINTS[i];
    if (w.built) {
      const s = { ...this.state, zone: w.id };
      setState(this, s);
      this.scene.start('World');
    } else {
      this.scene.start('Story', {
        title: `${w.name} — ${w.terrain}`,
        paragraphs: [
          w.beat,
          `Planned quest: “${w.quest}”.`,
          'This stretch of the march is not yet built. The journey will continue in a coming build — your progress is saved.',
        ],
        button: 'Back to the Road',
        next: 'Journey',
      });
    }
  }

  openMenu() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;
    const veil = this.add.rectangle(cx, cy, width, height, 0x05060f, 0.82).setInteractive().setDepth(300);
    const bw = Math.min(280, width - 60);
    const items = [veil];
    const mk = (i, label, cb) => items.push(makeTextButton(this, cx, cy - 76 + i * 64, bw, 52, label, cb).setDepth(301));
    mk(0, 'Resume', () => items.forEach((o) => o.destroy()));
    mk(1, 'Switch Character', () => {
      items.forEach((o) => o.destroy());
      this.scene.start('CharacterSlot');
    });
    mk(2, 'Homepage', () => {
      items.forEach((o) => o.destroy());
      this.scene.start('Title');
    });
  }
}
