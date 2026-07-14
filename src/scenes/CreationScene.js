import Phaser from 'phaser';
import { COLORS, FONTS, ROW, SHEET_COLS } from '../config.js';
import { makeTextButton, starfield } from '../ui/widgets.js';
import { KINDREDS } from '../data/kindreds.js';
import { CLASSES } from '../data/classes.js';
import { newGameState, setState } from '../systems/GameState.js';
import { SaveSystem } from '../systems/SaveSystem.js';

// Character creation: pick a kindred (whom do you follow?) then a class.
// Touch-first: big cards, one decision per screen.

export default class CreationScene extends Phaser.Scene {
  constructor() {
    super('Creation');
  }

  create() {
    this.kindredId = null;
    this.showKindreds();
  }

  clear() {
    this.children.removeAll();
    starfield(this, Math.floor((this.scale.width * this.scale.height) / 12000));
  }

  showKindreds() {
    this.clear();
    const { width, height } = this.scale;
    const cx = width / 2;

    this.add
      .text(cx, 26, 'Whom do you follow?', {
        fontFamily: FONTS.body,
        fontSize: Math.min(24, width / 17) + 'px',
        color: '#d9b968',
      })
      .setOrigin(0.5, 0);
    this.add
      .text(cx, 26 + Math.min(24, width / 17) * 1.5, 'Three hosts set out from Cuiviénen. One is yours.', {
        fontFamily: FONTS.body,
        fontSize: '13px',
        color: COLORS.textDim,
        fontStyle: 'italic',
      })
      .setOrigin(0.5, 0);

    const top = 96;
    const gap = 12;
    const bottomReserve = 66;
    const ch = Math.min(118, (height - top - bottomReserve - gap * 2) / 3);
    const cw = Math.min(520, width - 24);

    KINDREDS.forEach((k, i) => {
      const y = top + ch / 2 + i * (ch + gap);
      const card = this.add.rectangle(cx, y, cw, ch, COLORS.panel, 0.94).setStrokeStyle(2, COLORS.panelLine);
      card.setInteractive({ useHandCursor: true });

      // walking preview sprite
      const spr = this.add.sprite(cx - cw / 2 + 44, y, k.sheet, ROW.walkDown * SHEET_COLS);
      spr.play(`${k.sheet}-walk-down`);
      spr.setScale(Math.min(1.6, ch / 72));

      this.add
        .text(cx - cw / 2 + 88, y - ch / 2 + 10, `${k.name} — ${k.epithet}`, {
          fontFamily: FONTS.body,
          fontSize: '17px',
          color: '#e8e4d8',
        })
        .setOrigin(0, 0);
      this.add
        .text(cx - cw / 2 + 88, y - ch / 2 + 32, `Led by ${k.leader}`, {
          fontFamily: FONTS.body,
          fontSize: '12px',
          color: '#d9b968',
          fontStyle: 'italic',
        })
        .setOrigin(0, 0);
      this.add
        .text(cx - cw / 2 + 88, y - ch / 2 + 50, k.blurb, {
          fontFamily: FONTS.body,
          fontSize: '12px',
          color: COLORS.textDim,
          wordWrap: { width: cw - 104 },
        })
        .setOrigin(0, 0);

      card.on('pointerup', () => {
        this.kindredId = k.id;
        this.showClasses();
      });
    });

    makeTextButton(this, cx, height - 30, 160, 42, '← Back', () => this.scene.start('CharacterSlot'));
  }

  showClasses() {
    this.clear();
    const { width, height } = this.scale;
    const cx = width / 2;
    const kindred = KINDREDS.find((k) => k.id === this.kindredId);

    this.add
      .text(cx, 20, `${kindred.name} — choose your calling`, {
        fontFamily: FONTS.body,
        fontSize: Math.min(22, width / 18) + 'px',
        color: '#d9b968',
      })
      .setOrigin(0.5, 0);

    const cols = width > 560 ? 4 : 2;
    const rows = Math.ceil(CLASSES.length / cols);
    const gap = 10;
    const top = 64;
    const bottom = 76;
    const cw = Math.min(240, (width - 24 - gap * (cols - 1)) / cols);
    const ch = Math.min(112, (height - top - bottom - gap * (rows - 1)) / rows);
    const gridW = cols * cw + (cols - 1) * gap;

    CLASSES.forEach((c, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = cx - gridW / 2 + cw / 2 + col * (cw + gap);
      const y = top + ch / 2 + row * (ch + gap);
      const card = this.add.rectangle(x, y, cw, ch, COLORS.panel, 0.94).setStrokeStyle(2, COLORS.panelLine);
      card.setInteractive({ useHandCursor: true });
      this.add
        .text(x, y - ch / 2 + 8, c.name, { fontFamily: FONTS.body, fontSize: '16px', color: '#e8e4d8' })
        .setOrigin(0.5, 0);
      this.add
        .text(x, y - ch / 2 + 30, c.weapon, {
          fontFamily: FONTS.body,
          fontSize: '11px',
          color: '#d9b968',
          fontStyle: 'italic',
        })
        .setOrigin(0.5, 0);
      this.add
        .text(x, y - ch / 2 + 47, c.role, {
          fontFamily: FONTS.body,
          fontSize: '11px',
          color: COLORS.textDim,
          align: 'center',
          wordWrap: { width: cw - 14 },
        })
        .setOrigin(0.5, 0);
      const s = c.stats;
      this.add
        .text(x, y + ch / 2 - 8, `VIT ${s.VIT}  MAG ${s.MAG}  STR ${s.STR}  DEX ${s.DEX}`, {
          fontFamily: FONTS.body,
          fontSize: '10px',
          color: '#7f8db0',
        })
        .setOrigin(0.5, 1);
      card.on('pointerup', () => this.confirm(c));
    });

    makeTextButton(this, cx, height - 38, 180, 46, '← Back', () => this.showKindreds());
  }

  confirm(klass) {
    const state = newGameState(this.kindredId, klass.id);
    setState(this, state);
    const profileId = this.registry.get('profileId');
    const campaignId = this.registry.get('campaignId');
    const slotIndex = this.registry.get('slotIndex');
    SaveSystem.setSlot(profileId, campaignId, slotIndex, {
      ...state,
      savedAt: Date.now(),
      lastWhere: 'The shores of Cuiviénen',
    });
    this.scene.start('Story', {
      title: 'Cuiviénen, the Waters of Awakening',
      art: 'art-cuivienen-awakening',
      paragraphs: [
        'Before Sun, before Moon, there is only starlight — and the mere of Cuiviénen, where your people woke beneath it.',
        'But of late, those who wander far from the water do not come back. The hunters speak of a Rider in the dark, and of shadows that are not shadows.',
        'Tonight, another of your kin has not returned.',
      ],
      button: 'Wake',
      next: 'World',
    });
  }
}
