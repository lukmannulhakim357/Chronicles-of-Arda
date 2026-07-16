import Phaser from 'phaser';

// Visible held weapons — small procedural sprites (generated once from
// graphics, no external art) attached to the player's hand during basic
// attacks and skills. Each weapon family swings differently, and a skill
// swing is bigger/brighter than a basic attack.

const SHAPES = {
  woodsmans_sword: 'sword',
  hunters_bow: 'bow',
  travelers_harp: 'harp',
  woodland_staff: 'staff',
  travelers_hammer: 'hammer',
  ranging_dagger: 'dagger',
  travelers_talisman: 'talisman',
};

export function weaponShapeOf(itemId) {
  return SHAPES[itemId] ?? null;
}

export function ensureWeaponTextures(scene) {
  const mk = (key, w, h, draw) => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ add: false });
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  };
  mk('fxw-sword', 8, 30, (g) => {
    g.fillStyle(0xcdd6e4, 1);
    g.fillRect(3, 0, 2, 20); // blade
    g.fillStyle(0xd9b968, 1);
    g.fillRect(0, 20, 8, 3); // crossguard
    g.fillStyle(0x6b4a2a, 1);
    g.fillRect(3, 23, 2, 7); // grip
  });
  mk('fxw-dagger', 6, 18, (g) => {
    g.fillStyle(0xcdd6e4, 1);
    g.fillRect(2, 0, 2, 10);
    g.fillStyle(0x6b4a2a, 1);
    g.fillRect(1, 10, 4, 2);
    g.fillRect(2, 12, 2, 6);
  });
  mk('fxw-hammer', 16, 26, (g) => {
    g.fillStyle(0x8a93a6, 1);
    g.fillRect(1, 0, 14, 8); // head
    g.fillStyle(0x6b4a2a, 1);
    g.fillRect(7, 8, 2, 18); // haft
  });
  mk('fxw-bow', 14, 30, (g) => {
    g.lineStyle(2, 0x8a6a3a, 1);
    g.beginPath();
    g.arc(2, 15, 13, -1.2, 1.2);
    g.strokePath();
    g.lineStyle(1, 0xd8d8d8, 1);
    g.lineBetween(6, 3, 6, 27); // string
  });
  mk('fxw-staff', 8, 34, (g) => {
    g.fillStyle(0x6b4a2a, 1);
    g.fillRect(3, 4, 2, 30);
    g.fillStyle(0x7fb4ff, 1);
    g.fillCircle(4, 4, 4); // focus orb
  });
  mk('fxw-harp', 18, 22, (g) => {
    g.lineStyle(2, 0xd9b968, 1);
    g.strokeTriangle(2, 20, 16, 20, 14, 2);
    g.lineStyle(1, 0xf0e8d8, 0.9);
    for (let i = 0; i < 4; i++) g.lineBetween(5 + i * 3, 19, 12 + i, 5);
  });
  mk('fxw-talisman', 12, 20, (g) => {
    g.lineStyle(1, 0x8a6a3a, 1);
    g.lineBetween(6, 0, 6, 8);
    g.fillStyle(0xb07fe8, 1);
    g.fillTriangle(6, 8, 1, 14, 11, 14);
    g.fillTriangle(1, 14, 11, 14, 6, 20);
  });
}

const HAND = {
  right: { x: 12, y: -2, flip: false },
  left: { x: -12, y: -2, flip: true },
  down: { x: 10, y: 2, flip: false },
  up: { x: -10, y: -6, flip: true },
};

// One weapon swing at the player's hand. Melee arcs, bows draw, magic
// implements raise + tip-glow — and a skill swing is larger and tinted.
export function playWeaponSwing(scene, player, itemId, facing, { skill = false } = {}) {
  const shape = weaponShapeOf(itemId);
  if (!shape) return;
  ensureWeaponTextures(scene);
  const hand = HAND[facing] ?? HAND.down;
  const x = player.x + hand.x;
  const y = player.y + hand.y;
  const img = scene.add
    .image(x, y, `fxw-${shape}`)
    .setOrigin(0.5, 0.95)
    .setDepth(facing === 'up' ? player.y - 1 : player.y + 1)
    .setFlipX(hand.flip);
  if (skill) img.setTint(0xfff2c8).setScale(1.2);

  const dir = hand.flip ? -1 : 1;
  if (shape === 'sword' || shape === 'dagger' || shape === 'hammer') {
    img.rotation = dir * -1.3;
    scene.tweens.add({
      targets: img,
      rotation: dir * (skill ? 1.3 : 0.9),
      duration: skill ? 260 : 200,
      ease: 'Back.easeOut',
      onComplete: () => scene.tweens.add({ targets: img, alpha: 0, duration: 90, onComplete: () => img.destroy() }),
    });
  } else if (shape === 'bow') {
    img.rotation = dir * 0.2;
    scene.tweens.add({
      targets: img,
      x: x - dir * 3,
      duration: 130,
      yoyo: true,
      onComplete: () => scene.tweens.add({ targets: img, alpha: 0, duration: 120, onComplete: () => img.destroy() }),
    });
  } else {
    // staff / harp / talisman — raise it, let the focus flare
    scene.tweens.add({
      targets: img,
      y: y - (skill ? 14 : 8),
      duration: 200,
      ease: 'Sine.easeOut',
      onComplete: () => {
        const tip = scene.add
          .image(img.x, img.y - 16, 'glow')
          .setScale(skill ? 0.5 : 0.3)
          .setTint(0x9ac8ff)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(img.depth + 1);
        scene.tweens.add({ targets: tip, scale: 0, alpha: 0, duration: 260, onComplete: () => tip.destroy() });
        scene.tweens.add({ targets: img, alpha: 0, duration: 220, onComplete: () => img.destroy() });
      },
    });
  }
}
