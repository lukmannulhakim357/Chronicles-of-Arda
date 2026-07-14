import Phaser from 'phaser';
import { COLORS, FONTS } from '../config.js';
import { makeTextButton, starfield } from '../ui/widgets.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { setState } from '../systems/GameState.js';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    this.build();
    this.scale.on('resize', () => this.build());
  }

  build() {
    this.children.removeAll();
    const { width, height } = this.scale;
    starfield(this, Math.floor((width * height) / 9000));

    const cx = width / 2;
    this.add
      .text(cx, height * 0.22, 'CHRONICLES OF ARDA', {
        fontFamily: FONTS.body,
        fontSize: Math.min(40, width / 12) + 'px',
        color: '#d9b968',
        letterSpacing: 3,
      })
      .setOrigin(0.5);
    this.add
      .text(cx, height * 0.22 + Math.min(40, width / 12) * 0.95, '— The Great Journey —', {
        fontFamily: FONTS.body,
        fontSize: Math.min(20, width / 22) + 'px',
        color: COLORS.text,
        fontStyle: 'italic',
      })
      .setOrigin(0.5);

    const bw = Math.min(300, width - 60);
    let y = height * 0.5;

    if (SaveSystem.has()) {
      makeTextButton(this, cx, y, bw, 54, 'Continue the Journey', () => {
        const save = SaveSystem.load();
        if (!save) return;
        setState(this, save);
        this.scene.start(save.zone === '__journey__' ? 'Journey' : 'World');
      });
      y += 70;
    }

    makeTextButton(this, cx, y, bw, 54, 'New Journey', () => {
      if (SaveSystem.has()) {
        this.confirmNew(cx, y, bw);
      } else {
        this.scene.start('Creation');
      }
    });

    this.add
      .text(cx, height - 18, 'Free & open-source art — see CREDITS.md', {
        fontFamily: FONTS.body,
        fontSize: '12px',
        color: COLORS.textDim,
      })
      .setOrigin(0.5);
  }

  confirmNew(cx, y, bw) {
    const { width, height } = this.scale;
    const veil = this.add.rectangle(width / 2, height / 2, width, height, 0x05060f, 0.8).setInteractive();
    const panel = this.add.rectangle(width / 2, height / 2, Math.min(360, width - 40), 170, COLORS.panel, 0.98);
    panel.setStrokeStyle(2, COLORS.panelLine);
    const t = this.add
      .text(width / 2, height / 2 - 45, 'Begin anew?\nYour current journey will be erased.', {
        fontFamily: FONTS.body,
        fontSize: '16px',
        color: COLORS.text,
        align: 'center',
      })
      .setOrigin(0.5);
    const yes = makeTextButton(this, width / 2 - 80, height / 2 + 35, 140, 48, 'Begin anew', () => {
      SaveSystem.clear();
      this.scene.start('Creation');
    });
    const no = makeTextButton(this, width / 2 + 80, height / 2 + 35, 140, 48, 'Keep it', () => {
      [veil, panel, t, yes, no].forEach((o) => o.destroy());
    });
  }
}
