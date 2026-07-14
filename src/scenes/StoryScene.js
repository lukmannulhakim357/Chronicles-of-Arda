import Phaser from 'phaser';
import { COLORS, FONTS } from '../config.js';
import { makeTextButton, starfield } from '../ui/widgets.js';

// Reusable narration card. Where a hand-made illustration is planned
// (Gemini workflow — see docs/cutscene-art-needed.md), `artFlag` names it
// and the scene shows a clearly-marked placeholder frame.
//
// init data: { title, paragraphs: [..], artFlag?, next, nextData? }

export default class StoryScene extends Phaser.Scene {
  constructor() {
    super('Story');
  }

  init(data) {
    this.data_ = data;
  }

  create() {
    const { width, height } = this.scale;
    starfield(this, Math.floor((width * height) / 11000));
    const cx = width / 2;
    const d = this.data_;

    let y = height * 0.12;
    this.add
      .text(cx, y, d.title, {
        fontFamily: FONTS.body,
        fontSize: Math.min(28, width / 16) + 'px',
        color: '#d9b968',
        align: 'center',
        wordWrap: { width: width - 60 },
      })
      .setOrigin(0.5, 0);
    y += Math.min(28, width / 16) * 2 + 8;

    if (d.artFlag) {
      const fw = Math.min(420, width - 60);
      const fh = Math.min(fw * 0.42, height * 0.26);
      const frame = this.add.rectangle(cx, y + fh / 2, fw, fh, 0x0d1226, 1).setStrokeStyle(1, COLORS.panelLine);
      this.add
        .text(cx, y + fh / 2, `[ illustration planned ]\n${d.artFlag}`, {
          fontFamily: FONTS.body,
          fontSize: '13px',
          color: COLORS.textDim,
          fontStyle: 'italic',
          align: 'center',
          wordWrap: { width: fw - 30 },
        })
        .setOrigin(0.5);
      y += fh + 18;
      frame.setDepth(1);
    }

    const body = d.paragraphs.join('\n\n');
    const bodyText = this.add
      .text(cx, y, body, {
        fontFamily: FONTS.body,
        fontSize: Math.min(17, width / 24) + 'px',
        color: COLORS.text,
        align: 'center',
        wordWrap: { width: Math.min(560, width - 50) },
        lineSpacing: 5,
      })
      .setOrigin(0.5, 0)
      .setDepth(1);
    // shrink to fit above the continue button on short screens
    let size = Math.min(17, width / 24);
    while (y + bodyText.height > height - 95 && size > 11) {
      size -= 1;
      bodyText.setFontSize(size + 'px');
      bodyText.setLineSpacing(3);
    }

    makeTextButton(this, cx, height - 60, Math.min(260, width - 80), 52, d.button ?? 'Continue', () => {
      this.scene.start(d.next, d.nextData ?? {});
    });
  }
}
