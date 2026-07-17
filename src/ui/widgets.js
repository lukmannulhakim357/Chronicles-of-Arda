import Phaser from 'phaser';
import { COLORS, FONTS } from '../config.js';
import { MATERIALS } from './theme.js';

// Small touch-friendly UI helpers shared by menu/creation/UI scenes.
// All hit areas are at least 44px tall.

// A warm wood-grain button (drop-shadow + bevel highlight) instead of the
// flat navy rectangle every button in the game used before — since every
// menu/dialogue/pause button already goes through this one helper, this
// single change reskins the whole game's buttons at once.
export function makeTextButton(scene, x, y, width, height, label, onTap, opts = {}) {
  const fill = opts.fill ?? MATERIALS.wood.base;
  const fillDown = opts.fillDown ?? MATERIALS.wood.dark;
  const g = scene.add.container(x, y);
  const shadow = scene.add.rectangle(2, 3, width, height, 0x000000, 0.32);
  const bg = scene.add.rectangle(0, 0, width, height, fill, opts.fillAlpha ?? 0.95);
  bg.setStrokeStyle(2, opts.stroke ?? MATERIALS.wood.edge);
  const sheen = scene.add.rectangle(0, -height / 2 + Math.max(2, height * 0.16), width - 6, Math.max(2, height * 0.3), 0xffffff, 0.12);
  const txt = scene.add
    .text(0, 0, label, {
      fontFamily: FONTS.body,
      fontSize: opts.fontSize ?? '18px',
      color: opts.color ?? COLORS.text,
      align: 'center',
      wordWrap: opts.wrap ? { width: width - 24 } : undefined,
    })
    .setOrigin(0.5);
  g.add([shadow, bg, sheen, txt]);
  g.setSize(width, height);
  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerdown', () => {
    bg.setFillStyle(fillDown, 1);
    sheen.setVisible(false);
  });
  bg.on('pointerup', () => {
    bg.setFillStyle(fill, opts.fillAlpha ?? 0.95);
    sheen.setVisible(true);
    onTap?.();
  });
  bg.on('pointerout', () => {
    bg.setFillStyle(fill, opts.fillAlpha ?? 0.95);
    sheen.setVisible(true);
  });
  g.bg = bg;
  g.label = txt;
  return g;
}

// Standalone toast for menu scenes that don't run UIScene (Title,
// CampaignSelect, CharacterSlot). WorldScene uses the EV.TOAST event into
// UIScene instead — this is the same look, self-contained.
export function toast(scene, text, duration = 2400) {
  const { width, height } = scene.scale;
  const t = scene.add
    .text(width / 2, height * 0.12, text, {
      fontFamily: FONTS.body,
      fontSize: '14px',
      color: '#f5eeda',
      align: 'center',
      backgroundColor: 'rgba(10,17,40,0.88)',
      padding: { x: 14, y: 8 },
      wordWrap: { width: width - 80 },
    })
    .setOrigin(0.5)
    .setDepth(500)
    .setAlpha(0);
  scene.tweens.add({ targets: t, alpha: 1, y: t.y + 6, duration: 220 });
  scene.time.delayedCall(duration, () =>
    scene.tweens.add({ targets: t, alpha: 0, duration: 300, onComplete: () => t.destroy() })
  );
  return t;
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
