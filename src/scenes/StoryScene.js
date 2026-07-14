import Phaser from 'phaser';
import { COLORS, FONTS } from '../config.js';
import { makeTextButton, starfield } from '../ui/widgets.js';

// Reusable narration card. Two art states:
//   - `art`: a texture key already loaded in BootScene — shown full-size,
//     framed, aspect-preserved (finished Gemini-generated illustrations).
//   - `artFlag`: no illustration yet — shows a clearly-marked placeholder
//     frame naming what's needed (see docs/cutscene-art-needed.md).
//
// Layout is measured bottom-up: the body text's minimum size is worked out
// first (against the no-image budget), then whatever vertical space is left
// goes to the illustration — so short/landscape phone screens shrink or drop
// the image before they ever let text collide with the button.
//
// init data: { title, paragraphs: [..], art?, artFlag?, next, nextData? }

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
    const BOTTOM_RESERVE = 90; // button + margin
    const GAP = 14;

    let y = Math.max(14, height * 0.08);
    const titleSize = Math.min(28, width / 16, height / 13);
    const title = this.add
      .text(cx, y, d.title, {
        fontFamily: FONTS.body,
        fontSize: titleSize + 'px',
        color: '#d9b968',
        align: 'center',
        wordWrap: { width: width - 60 },
      })
      .setOrigin(0.5, 0);
    y += title.height + 8;

    // 1. Work out the body text's minimum footprint against the no-image
    // budget, shrinking the font until it fits (or hits the readability floor).
    const maxTextWidth = Math.min(560, width - 50);
    const body = d.paragraphs.join('\n\n');
    let fsize = Math.min(17, width / 24);
    const bodyText = this.add
      .text(0, 0, body, {
        fontFamily: FONTS.body,
        fontSize: fsize + 'px',
        color: COLORS.text,
        align: 'center',
        wordWrap: { width: maxTextWidth },
        lineSpacing: 5,
      })
      .setOrigin(0.5, 0)
      .setDepth(1)
      .setVisible(false);
    const availableNoImage = height - y - BOTTOM_RESERVE;
    while (bodyText.height > availableNoImage && fsize > 10) {
      fsize -= 1;
      bodyText.setFontSize(fsize + 'px');
      bodyText.setLineSpacing(fsize < 14 ? 3 : 5);
    }
    const textH = bodyText.height;

    // 2. Whatever vertical space remains goes to the illustration.
    const imgAreaH = height - y - textH - BOTTOM_RESERVE - GAP;

    if (d.art && imgAreaH > 40) {
      const tex = this.textures.exists(d.art) ? this.textures.get(d.art) : null;
      const src = tex?.source?.[0];
      const imgAspect = src && src.height ? src.width / src.height : 16 / 9;
      const maxW = Math.min(720, width - 40);
      let fw = maxW;
      let fh = fw / imgAspect;
      if (fh > imgAreaH) {
        fh = imgAreaH;
        fw = fh * imgAspect;
      }
      this.add.image(cx, y + fh / 2, d.art).setDisplaySize(fw, fh).setDepth(1);
      this.add.rectangle(cx, y + fh / 2, fw, fh).setStrokeStyle(2, COLORS.panelLine).setDepth(2);
      y += fh + GAP;
    } else if (d.artFlag && imgAreaH > 40) {
      const fw = Math.min(420, width - 60);
      const fh = Math.min(fw * 0.42, imgAreaH);
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
      y += fh + GAP;
      frame.setDepth(1);
    }

    bodyText.setPosition(cx, y).setVisible(true);

    makeTextButton(this, cx, height - 46, Math.min(260, width - 80), 52, d.button ?? 'Continue', () => {
      this.scene.start(d.next, d.nextData ?? {});
    });
  }
}
