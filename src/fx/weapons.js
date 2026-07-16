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
  right: { x: 12, y: -2, flip: false, dx: 1, dy: 0 },
  left: { x: -12, y: -2, flip: true, dx: -1, dy: 0 },
  down: { x: 10, y: 2, flip: false, dx: 0, dy: 1 },
  up: { x: -10, y: -6, flip: true, dx: 0, dy: -1 },
};

function arrow(scene, x, y, dx, dy, delay = 0, dist = 68) {
  const a = scene.add
    .rectangle(x, y, 14, 2, 0xe8dcc0, 1)
    .setDepth(59006)
    .setRotation(Math.atan2(dy, dx))
    .setAlpha(0);
  scene.tweens.add({
    targets: a,
    delay,
    alpha: { from: 1, to: 0.4 },
    x: x + dx * dist,
    y: y + dy * dist,
    duration: 120 + dist * 0.7,
    ease: 'Sine.easeIn',
    onComplete: () => a.destroy(),
  });
}

function spawnWeapon(scene, player, shape, hand, skill) {
  const img = scene.add
    .image(player.x + hand.x, player.y + hand.y, `fxw-${shape}`)
    .setOrigin(0.5, 0.95)
    .setDepth(hand.dy < 0 ? player.y - 1 : player.y + 1)
    .setFlipX(hand.flip);
  if (skill) img.setTint(0xfff2c8).setScale(1.2);
  return img;
}

// One weapon action at the player's hand. Basic attacks and skills move
// differently per family: melee arcs (skills double-swing), bows loose a
// visible arrow (skills a fanned volley), magic foci raise with a flare
// (skills add a spell ring at the tip).
export function playWeaponSwing(scene, player, itemId, facing, { skill = false, targetPos = null } = {}) {
  const shape = weaponShapeOf(itemId);
  if (!shape) return;
  ensureWeaponTextures(scene);
  const hand = HAND[facing] ?? HAND.down;
  const img = spawnWeapon(scene, player, shape, hand, skill);
  const x = img.x;
  const y = img.y;
  const dir = hand.flip ? -1 : 1;

  // with an auto-aimed target, projectiles fly straight at it from any
  // angle — no need to stand in line with the enemy
  let aim = { dx: hand.dx, dy: hand.dy, dist: 68 };
  if (targetPos) {
    const ang = Math.atan2(targetPos.y - y, targetPos.x - x);
    aim = { dx: Math.cos(ang), dy: Math.sin(ang), dist: Phaser.Math.Distance.Between(x, y, targetPos.x, targetPos.y) };
  }

  if (shape === 'sword' || shape === 'dagger' || shape === 'hammer') {
    img.rotation = dir * -1.3;
    scene.tweens.add({
      targets: img,
      rotation: dir * (skill ? 1.4 : 0.9),
      duration: skill ? 240 : 200,
      ease: 'Back.easeOut',
      onComplete: () => scene.tweens.add({ targets: img, alpha: 0, duration: 90, onComplete: () => img.destroy() }),
    });
    if (skill) {
      // second reversed swing — a skill is a combination, not one chop
      const img2 = spawnWeapon(scene, player, shape, hand, true);
      img2.setAlpha(0);
      img2.rotation = dir * 1.4;
      scene.tweens.add({
        targets: img2,
        delay: 220,
        alpha: { from: 0.9, to: 0 },
        rotation: dir * -1.2,
        duration: 260,
        ease: 'Sine.easeOut',
        onComplete: () => img2.destroy(),
      });
    }
  } else if (shape === 'bow') {
    img.rotation = Math.atan2(hand.dy, hand.dx) * 0.5;
    scene.tweens.add({
      targets: img,
      x: x - hand.dx * 3,
      y: y - hand.dy * 3,
      duration: 130,
      yoyo: true,
      onComplete: () => scene.tweens.add({ targets: img, alpha: 0, duration: 140, onComplete: () => img.destroy() }),
    });
    if (skill) {
      // volley: three arrows fanned out around the aim line
      arrow(scene, x, y, aim.dx, aim.dy, 90, aim.dist);
      arrow(scene, x + aim.dy * 8, y + aim.dx * 8, aim.dx * 0.94 - aim.dy * 0.25, aim.dy * 0.94 + aim.dx * 0.25, 170, aim.dist);
      arrow(scene, x - aim.dy * 8, y - aim.dx * 8, aim.dx * 0.94 + aim.dy * 0.25, aim.dy * 0.94 - aim.dx * 0.25, 250, aim.dist);
    } else {
      arrow(scene, x, y, aim.dx, aim.dy, 90, aim.dist); // every shot looses an arrow
    }
  } else {
    // staff / harp / talisman — raise it, let the focus answer
    scene.tweens.add({
      targets: img,
      y: y - (skill ? 14 : 8),
      duration: 200,
      ease: 'Sine.easeOut',
      onComplete: () => {
        const tip = scene.add
          .image(img.x, img.y - 16, 'glow')
          .setScale(skill ? 0.55 : 0.3)
          .setTint(0x9ac8ff)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(img.depth + 1);
        scene.tweens.add({ targets: tip, scale: 0, alpha: 0, duration: 280, onComplete: () => tip.destroy() });
        if (skill) {
          // spell ring blooms from the focus on skill casts
          const ringC = scene.add.circle(img.x, img.y - 16, 6).setStrokeStyle(2, 0x9ac8ff, 0.9).setDepth(img.depth + 1).setBlendMode(Phaser.BlendModes.ADD);
          scene.tweens.add({
            targets: ringC,
            radius: 26,
            alpha: 0,
            duration: 380,
            ease: 'Sine.easeOut',
            onUpdate: () => ringC.setStrokeStyle(2, 0x9ac8ff, ringC.alpha),
            onComplete: () => ringC.destroy(),
          });
        }
        scene.tweens.add({ targets: img, alpha: 0, duration: 240, onComplete: () => img.destroy() });
      },
    });
  }
}
