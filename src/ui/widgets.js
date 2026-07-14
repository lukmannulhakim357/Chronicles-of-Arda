import Phaser from 'phaser';
import { COLORS, FONTS } from '../config.js';

// Small touch-friendly UI helpers shared by menu/creation/UI scenes.
// All hit areas are at least 44px tall.

export function makeTextButton(scene, x, y, width, height, label, onTap, opts = {}) {
  const g = scene.add.container(x, y);
  const bg = scene.add.rectangle(0, 0, width, height, opts.fill ?? COLORS.panel, opts.fillAlpha ?? 0.92);
  bg.setStrokeStyle(2, opts.stroke ?? COLORS.panelLine);
  const txt = scene.add
    .text(0, 0, label, {
      fontFamily: FONTS.body,
      fontSize: opts.fontSize ?? '18px',
      color: opts.color ?? COLORS.text,
      align: 'center',
      wordWrap: opts.wrap ? { width: width - 24 } : undefined,
    })
    .setOrigin(0.5);
  g.add([bg, txt]);
  g.setSize(width, height);
  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerdown', () => {
    bg.setFillStyle(opts.fillDown ?? 0x1c2a50, 1);
  });
  bg.on('pointerup', () => {
    bg.setFillStyle(opts.fill ?? COLORS.panel, opts.fillAlpha ?? 0.92);
    onTap?.();
  });
  bg.on('pointerout', () => {
    bg.setFillStyle(opts.fill ?? COLORS.panel, opts.fillAlpha ?? 0.92);
  });
  g.bg = bg;
  g.label = txt;
  return g;
}

export function starfield(scene, count = 90) {
  // little twinkling stars for menu/story backgrounds
  if (!scene.textures.exists('px-star')) {
    const gr = scene.make.graphics({ x: 0, y: 0, add: false });
    gr.fillStyle(0xffffff, 1);
    gr.fillRect(0, 0, 2, 2);
    gr.generateTexture('px-star', 2, 2);
    gr.destroy();
  }
  const { width, height } = scene.scale;
  const stars = [];
  for (let i = 0; i < count; i++) {
    const s = scene.add
      .image(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height), 'px-star')
      .setAlpha(Phaser.Math.FloatBetween(0.15, 0.95))
      .setScale(Phaser.Math.Between(1, 2));
    scene.tweens.add({
      targets: s,
      alpha: Phaser.Math.FloatBetween(0.05, 0.4),
      duration: Phaser.Math.Between(900, 2600),
      yoyo: true,
      repeat: -1,
      delay: Phaser.Math.Between(0, 2000),
    });
    stars.push(s);
  }
  return stars;
}
