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
  ash_spear: 'spear',
  hunters_sling: 'sling',
  captains_horn: 'horn',
  summoners_horn: 'talisman', // a magic-flavored horn — reuses the raise+flare family
};

export function weaponShapeOf(itemId) {
  return SHAPES[itemId] ?? null;
}

// Which body-sheet animation row a weapon's holder should play — the sheet
// already has real thrust (spear-lunge) and shoot (bow draw-and-loose) rows
// (BootScene.js), so a weapon's *shape* decides which pose the character
// actually plays instead of every attack reusing the sword's slash.
const ANIM_FAMILY = {
  spear: 'thrust',
  bow: 'shoot',
  staff: 'spellcast',
  harp: 'spellcast',
  talisman: 'spellcast',
};

export function animFamilyOf(itemId) {
  return ANIM_FAMILY[weaponShapeOf(itemId)] ?? 'slash';
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
  mk('fxw-spear', 6, 40, (g) => {
    g.fillStyle(0x6b4a2a, 1);
    g.fillRect(2, 6, 2, 34); // haft, longer reach than the sword
    g.fillStyle(0xcdd6e4, 1);
    g.fillTriangle(0, 6, 6, 6, 3, 0); // iron tip
  });
  mk('fxw-sling', 12, 16, (g) => {
    g.lineStyle(2, 0x6b4a2a, 1);
    g.lineBetween(1, 2, 5, 10);
    g.lineBetween(11, 2, 7, 10);
    g.fillStyle(0x8a6a3a, 1);
    g.fillEllipse(6, 12, 6, 4); // leather cradle
  });
  mk('fxw-horn', 16, 14, (g) => {
    g.fillStyle(0xd9b968, 1);
    g.fillTriangle(0, 10, 14, 2, 14, 12); // curved brass body (flattened)
    g.fillStyle(0xf2d06b, 1);
    g.fillCircle(2, 10, 3); // bell mouth
  });
  mk('fxw-shield', 24, 24, (g) => {
    g.fillStyle(0x6b4a2a, 1);
    g.fillCircle(12, 12, 11); // wooden face
    g.fillStyle(0x8a93a6, 1);
    g.fillCircle(12, 12, 8); // iron rim-band
    g.fillStyle(0xd9b968, 1);
    g.fillCircle(12, 12, 3); // boss
    g.lineStyle(2, 0x2a1f14, 1);
    g.strokeCircle(12, 12, 11);
  });
}

// One hand-offset table per body pose — the slash/thrust/shoot animations
// hold the arm very differently, so a single fixed offset (the old
// approach) only ever looked "attached" for the slash pose and left every
// other weapon floating in a generic spot regardless of the actual pose.
const HAND_SLASH = {
  right: { x: 12, y: -2, flip: false, dx: 1, dy: 0 },
  left: { x: -12, y: -2, flip: true, dx: -1, dy: 0 },
  down: { x: 10, y: 2, flip: false, dx: 0, dy: 1 },
  up: { x: -10, y: -6, flip: true, dx: 0, dy: -1 },
};
const HAND_THRUST = {
  right: { x: 20, y: -3, flip: false, dx: 1, dy: 0 },
  left: { x: -20, y: -3, flip: true, dx: -1, dy: 0 },
  down: { x: 4, y: 15, flip: false, dx: 0, dy: 1 },
  up: { x: -4, y: -17, flip: true, dx: 0, dy: -1 },
};
const HAND_SHOOT = {
  right: { x: 13, y: -5, flip: false, dx: 1, dy: 0 },
  left: { x: -13, y: -5, flip: true, dx: -1, dy: 0 },
  down: { x: 0, y: 8, flip: false, dx: 0, dy: 1 },
  up: { x: 0, y: -11, flip: true, dx: 0, dy: -1 },
};
const HAND_SPELLCAST = {
  right: { x: 11, y: -9, flip: false, dx: 1, dy: 0 },
  left: { x: -11, y: -9, flip: true, dx: -1, dy: 0 },
  down: { x: 0, y: 3, flip: false, dx: 0, dy: 1 },
  up: { x: 0, y: -15, flip: true, dx: 0, dy: -1 },
};
function handTableFor(family) {
  if (family === 'thrust') return HAND_THRUST;
  if (family === 'shoot') return HAND_SHOOT;
  if (family === 'spellcast') return HAND_SPELLCAST;
  return HAND_SLASH;
}

function arrow(scene, x, y, dx, dy, delay = 0, dist = 68, tint = 0xe8dcc0, thick = false) {
  const a = scene.add
    .rectangle(x, y, thick ? 20 : 14, thick ? 3 : 2, tint, 1)
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

// Volley — a rain of arrows dropping out of the sky onto the target area,
// not the bow's own hand-fired shot. Distinct from every other Ranger
// skill, which all fire from the bow itself.
export function playArrowRain(scene, targetPos, { count = 10, radius = 50 } = {}) {
  for (let i = 0; i < count; i++) {
    const ox = targetPos.x + Phaser.Math.Between(-radius, radius);
    const oy = targetPos.y + Phaser.Math.Between(-radius, radius);
    const a = scene.add
      .rectangle(ox, oy - 140, 3, 16, 0xe8dcc0, 1)
      .setDepth(59006)
      .setRotation(Math.PI / 2 + 0.15)
      .setAlpha(0);
    scene.tweens.add({
      targets: a,
      delay: Phaser.Math.Between(0, 260),
      alpha: { from: 1, to: 0.7 },
      y: oy,
      duration: 260 + Phaser.Math.Between(0, 120),
      ease: 'Quad.easeIn',
      onComplete: () => {
        a.destroy();
        const spark = scene.add.circle(ox, oy, 2, 0xe8dcc0, 0.9).setDepth(59007);
        scene.tweens.add({ targets: spark, radius: 8, alpha: 0, duration: 180, onComplete: () => spark.destroy() });
      },
    });
  }
}

function pebble(scene, x, y, dx, dy, delay = 0, dist = 68, tint = 0x8a8a8a) {
  const p = scene.add.circle(x, y, 3, tint, 1).setDepth(59006).setAlpha(0);
  scene.tweens.add({
    targets: p,
    delay,
    alpha: { from: 1, to: 0.5 },
    x: x + dx * dist,
    y: y + dy * dist,
    duration: 100 + dist * 0.55,
    ease: 'Sine.easeIn',
    onComplete: () => p.destroy(),
  });
}

// the focus-tip glow + spell ring shared by every magic-focus weapon
// (talisman, staff, and harp's skill-only chord resolution)
function flareTip(scene, x, y, depth, skill = false) {
  const tip = scene.add.image(x, y, 'glow').setScale(skill ? 0.55 : 0.3).setTint(0x9ac8ff).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth);
  scene.tweens.add({ targets: tip, scale: 0, alpha: 0, duration: 280, onComplete: () => tip.destroy() });
  if (skill) {
    const ringC = scene.add.circle(x, y, 6).setStrokeStyle(2, 0x9ac8ff, 0.9).setDepth(depth).setBlendMode(Phaser.BlendModes.ADD);
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
export function playWeaponSwing(scene, player, itemId, facing, { skill = false, targetPos = null, shots = null, pierce = false, arrowTint = null, jabs = null } = {}) {
  const shape = weaponShapeOf(itemId);
  if (!shape) return;
  ensureWeaponTextures(scene);
  const handTable = handTableFor(animFamilyOf(itemId));
  const hand = handTable[facing] ?? handTable.down;
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

  if (shape === 'sword' || shape === 'horn') {
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
  } else if (shape === 'dagger') {
    // a quick stab straight down the aim line — every Skirmisher skill
    // (Quick Stab, Backstab, Assassinate) describes a jab, not a sword arc.
    // Quick Stab is one poke ("quick in, quick out"); Backstab is a flurry.
    const jabCount = jabs ?? (skill ? 2 : 1);
    img.rotation = Math.atan2(aim.dy, aim.dx) + Math.PI / 2;
    scene.tweens.add({
      targets: img,
      x: x + aim.dx * (skill ? 20 : 14),
      y: y + aim.dy * (skill ? 20 : 14),
      duration: skill ? 130 : 100,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => scene.tweens.add({ targets: img, alpha: 0, duration: 90, onComplete: () => img.destroy() }),
    });
    if (jabCount >= 2) {
      // a second, faster stab — Backstab reads as a flurry, not one poke
      const img2 = spawnWeapon(scene, player, shape, hand, true);
      img2.setAlpha(0);
      img2.rotation = img.rotation;
      scene.tweens.add({
        targets: img2,
        delay: 140,
        alpha: { from: 0.9, to: 0 },
        x: img2.x + aim.dx * 26,
        y: img2.y + aim.dy * 26,
        duration: 160,
        ease: 'Quad.easeOut',
        onComplete: () => img2.destroy(),
      });
    }
  } else if (shape === 'hammer') {
    // an overhead smash, not a side-arc — the hammer winds up behind the
    // shoulder then comes down hard, with impact dust where it lands
    img.rotation = dir * -0.5;
    scene.tweens.add({
      targets: img,
      rotation: dir * 1.7,
      duration: skill ? 280 : 210,
      ease: 'Back.easeIn',
      onComplete: () => {
        const dust = scene.add.circle(img.x, img.y, 4, 0x8a7a5a, 0.8).setDepth(img.depth);
        scene.tweens.add({ targets: dust, radius: 20, alpha: 0, duration: 220, onComplete: () => dust.destroy() });
        scene.tweens.add({ targets: img, alpha: 0, duration: 90, onComplete: () => img.destroy() });
      },
    });
  } else if (shape === 'spear') {
    // a straight thrust down the aim line, not an arc — the texture's tip
    // points "up" at rotation 0, so it has to turn to actually face the aim
    img.rotation = Math.atan2(aim.dy, aim.dx) + Math.PI / 2;
    scene.tweens.add({
      targets: img,
      x: x + aim.dx * (skill ? 26 : 16),
      y: y + aim.dy * (skill ? 26 : 16),
      duration: skill ? 160 : 130,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => scene.tweens.add({ targets: img, alpha: 0, duration: 110, onComplete: () => img.destroy() }),
    });
    if (skill) {
      // a second, deeper thrust — the skill is two jabs, not one
      const img2 = spawnWeapon(scene, player, shape, hand, true);
      img2.setAlpha(0);
      img2.rotation = img.rotation;
      scene.tweens.add({
        targets: img2,
        delay: 200,
        alpha: { from: 0.9, to: 0 },
        x: img2.x + aim.dx * 34,
        y: img2.y + aim.dy * 34,
        duration: 220,
        ease: 'Quad.easeOut',
        onComplete: () => img2.destroy(),
      });
    }
  } else if (shape === 'bow') {
    // held steady in both hands, stave perpendicular to the aim line, while
    // the shoot animation plays; the nocked arrow visibly draws back before
    // it looses — not a swing, a hold-and-release. Different Ranger skills
    // fire a different number/style of shot (Quick Shot and Piercing Arrow
    // loose one, Multi-Shot fans three, Disabling Shot roots instead of
    // hurting) instead of every skill looking like the same 3-shot volley.
    const shotCount = shots ?? (skill ? 3 : 1);
    const tint = arrowTint ?? 0xe8dcc0;
    const dist = pierce ? aim.dist + 26 : aim.dist;
    img.setOrigin(0.5, 0.5).setPosition(x, y).setRotation(Math.atan2(aim.dy, aim.dx) + Math.PI / 2);
    const drawDist = skill ? 12 : 8;
    const drawMs = skill ? 420 : 300;
    const nock = scene.add
      .rectangle(x, y, 12, 2, 0xe8dcc0, 1)
      .setDepth(img.depth + 1)
      .setRotation(Math.atan2(aim.dy, aim.dx));
    scene.tweens.add({ targets: nock, x: x - aim.dx * drawDist, y: y - aim.dy * drawDist, duration: drawMs, ease: 'Sine.easeIn' });
    scene.tweens.add({ targets: img, scaleX: 1.1, scaleY: 0.92, duration: drawMs, ease: 'Sine.easeIn' });
    scene.time.delayedCall(drawMs, () => {
      nock.destroy();
      scene.tweens.add({ targets: img, scaleX: 1, scaleY: 1, duration: 100, ease: 'Back.easeOut' });
      if (shotCount >= 3) {
        // a fan of three shots around the aim line
        arrow(scene, x, y, aim.dx, aim.dy, 0, dist, tint, pierce);
        arrow(scene, x + aim.dy * 8, y + aim.dx * 8, aim.dx * 0.94 - aim.dy * 0.25, aim.dy * 0.94 + aim.dx * 0.25, 80, dist, tint, pierce);
        arrow(scene, x - aim.dy * 8, y - aim.dx * 8, aim.dx * 0.94 + aim.dy * 0.25, aim.dy * 0.94 - aim.dx * 0.25, 160, dist, tint, pierce);
      } else {
        arrow(scene, x, y, aim.dx, aim.dy, 0, dist, tint, pierce);
      }
    });
    scene.time.delayedCall(drawMs + 260, () => scene.tweens.add({ targets: img, alpha: 0, duration: 160, onComplete: () => img.destroy() }));
  } else if (shape === 'sling') {
    // whirled in a circle before the release — a sling is wound up, not
    // just flicked, and how many stones fly differs per Skirmisher skill
    // just like the dagger's jab count does
    const shotCount = shots ?? (skill ? 3 : 1);
    const tint = arrowTint ?? 0x8a8a8a;
    const spinTurns = skill ? 1.6 : 1;
    const spinMs = skill ? 320 : 210;
    const spin = { a: 0 };
    scene.tweens.add({
      targets: spin,
      a: Math.PI * 2 * spinTurns,
      duration: spinMs,
      ease: 'Quad.easeIn',
      onUpdate: () => {
        img.x = x + Math.cos(spin.a) * 9;
        img.y = y + Math.sin(spin.a) * 6;
        img.rotation = spin.a;
      },
      onComplete: () => {
        img.x = x;
        img.y = y;
        const release = (ox, oy, ddx, ddy, delay) => pebble(scene, ox, oy, ddx, ddy, delay, aim.dist, tint);
        if (shotCount >= 3) {
          release(x, y, aim.dx, aim.dy, 0);
          release(x + aim.dy * 8, y + aim.dx * 8, aim.dx * 0.94 - aim.dy * 0.25, aim.dy * 0.94 + aim.dx * 0.25, 90);
          release(x - aim.dy * 8, y - aim.dx * 8, aim.dx * 0.94 + aim.dy * 0.25, aim.dy * 0.94 - aim.dx * 0.25, 180);
        } else if (shotCount === 2) {
          release(x, y, aim.dx, aim.dy, 0);
          release(x, y, aim.dx, aim.dy, 130);
        } else {
          release(x, y, aim.dx, aim.dy, 0);
        }
        scene.tweens.add({ targets: img, alpha: 0, duration: 140, onComplete: () => img.destroy() });
      },
    });
  } else if (shape === 'harp') {
    // played, not swung — a quick strum (the strings wobble), a note pops
    // off with it, and on a skill the chord resolves into a blast at the
    // target instead of just fading
    const baseRot = img.rotation;
    scene.tweens.add({
      targets: img,
      rotation: baseRot + (hand.flip ? -0.22 : 0.22),
      duration: 90,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        const note = scene.add
          .text(img.x, img.y - 8, '♪', { fontFamily: 'serif', fontSize: '13px', color: '#f2d06b', stroke: '#05060f', strokeThickness: 2 })
          .setOrigin(0.5)
          .setDepth(img.depth + 1)
          .setAlpha(0);
        scene.tweens.add({ targets: note, alpha: { from: 0.9, to: 0 }, y: note.y - 20, duration: 500, ease: 'Sine.easeOut', onComplete: () => note.destroy() });
        if (skill) flareTip(scene, img.x, img.y - 16, img.depth + 1, true);
        scene.tweens.add({ targets: img, alpha: 0, duration: 240, onComplete: () => img.destroy() });
      },
    });
  } else if (shape === 'staff') {
    // raised, then swung forward like pointing the staff at the target —
    // not just held up in place
    scene.tweens.add({
      targets: img,
      y: y - (skill ? 12 : 7),
      duration: 160,
      ease: 'Sine.easeOut',
      onComplete: () => {
        scene.tweens.add({
          targets: img,
          rotation: img.rotation + (hand.flip ? -0.5 : 0.5),
          duration: skill ? 220 : 160,
          ease: 'Back.easeOut',
          onComplete: () => {
            flareTip(scene, img.x, img.y - 16, img.depth + 1, skill);
            scene.tweens.add({ targets: img, alpha: 0, duration: 240, onComplete: () => img.destroy() });
          },
        });
      },
    });
  } else {
    // talisman (and the magic-flavored horn) — raise it, let the focus answer
    scene.tweens.add({
      targets: img,
      y: y - (skill ? 14 : 8),
      duration: 200,
      ease: 'Sine.easeOut',
      onComplete: () => {
        flareTip(scene, img.x, img.y - 16, img.depth + 1, skill);
        scene.tweens.add({ targets: img, alpha: 0, duration: 240, onComplete: () => img.destroy() });
      },
    });
  }
}

// Shield Slam — a shield, not the equipped sword, drives forward into the
// target. Uses the thrust pose/hand offset (the body is lunging forward,
// same mechanic as a spear jab) so it reads as a bash, not another swing.
export function playShieldBash(scene, player, facing, { targetPos = null } = {}) {
  ensureWeaponTextures(scene);
  const hand = HAND_THRUST[facing] ?? HAND_THRUST.down;
  const x = player.x + hand.x;
  const y = player.y + hand.y;
  let aim = { dx: hand.dx, dy: hand.dy };
  if (targetPos) {
    const ang = Math.atan2(targetPos.y - y, targetPos.x - x);
    aim = { dx: Math.cos(ang), dy: Math.sin(ang) };
  }
  const img = scene.add
    .image(x, y, 'fxw-shield')
    .setOrigin(0.5, 0.5)
    .setDepth(hand.dy < 0 ? player.y - 1 : player.y + 1)
    .setTint(0xfff2c8)
    .setScale(1.15);
  scene.tweens.add({
    targets: img,
    x: x + aim.dx * 30,
    y: y + aim.dy * 30,
    duration: 180,
    ease: 'Quad.easeIn',
    onComplete: () => {
      // a hard flat burst where the shield lands — a bash, not a cut
      const spark = scene.add.circle(img.x, img.y, 4, 0xffffff, 0.9).setDepth(img.depth + 1).setBlendMode(Phaser.BlendModes.ADD);
      scene.tweens.add({ targets: spark, radius: 22, alpha: 0, duration: 260, onComplete: () => spark.destroy() });
      scene.tweens.add({
        targets: img,
        x: img.x + aim.dx * 14,
        y: img.y + aim.dy * 14,
        alpha: 0,
        duration: 220,
        delay: 40,
        onComplete: () => img.destroy(),
      });
    },
  });
}

// Whirlwind — the equipped weapon actually orbits the player in a full
// circle instead of a single-direction crescent, so the description's "spin
// hits everyone nearby" reads true instead of looking like one more swing.
// A top-down character sprite is drawn front/three-quarter-on — literally
// rotating the whole sprite (an earlier attempt at this) makes it look like
// the character keels over sideways instead of turning around. Real
// top-down spins fake it by cycling the character's own facing frames, so
// the body stays upright and just faces a new direction each beat, with the
// weapon swinging along with each turn.
const SPIN_ORDER = ['down', 'left', 'up', 'right'];
function spinSequence(facing) {
  const start = SPIN_ORDER.indexOf(facing);
  const seq = [];
  for (let i = 1; i <= 4; i++) seq.push(SPIN_ORDER[(start + i) % 4]);
  return seq; // 4 steps, ending back on the character's actual facing
}

export function playWhirlwindSpin(scene, player, itemId, facing) {
  const shape = weaponShapeOf(itemId) ?? 'sword';
  ensureWeaponTextures(scene);
  const sheet = player.texture.key;
  const stepMs = 130;
  spinSequence(facing).forEach((dir, i) => {
    scene.time.delayedCall(i * stepMs, () => {
      if (!player.active) return;
      player.play(`${sheet}-slash-${dir}`, true);
      const hand = HAND_SLASH[dir];
      const img = scene.add
        .image(player.x + hand.x, player.y + hand.y, `fxw-${shape}`)
        .setOrigin(0.5, 0.95)
        .setDepth(hand.dy < 0 ? player.y - 1 : player.y + 1)
        .setFlipX(hand.flip)
        .setTint(0xfff2c8)
        .setScale(1.15);
      const d = hand.flip ? -1 : 1;
      img.rotation = d * -1.3;
      scene.tweens.add({
        targets: img,
        rotation: d * 1.1,
        duration: stepMs + 30,
        ease: 'Sine.easeOut',
        onComplete: () => scene.tweens.add({ targets: img, alpha: 0, duration: 80, onComplete: () => img.destroy() }),
      });
    });
  });
  // a full ring visibly sweeps outward across the whole turn — everyone
  // nearby takes the hit, not just whatever was standing in one direction
  const ring = scene.add.circle(player.x, player.y, 6).setStrokeStyle(3, 0xd9d9e8, 0.9).setDepth(player.y + 2).setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({
    targets: ring,
    radius: 34,
    alpha: 0,
    duration: stepMs * 4 + 40,
    ease: 'Sine.easeOut',
    onUpdate: () => ring.setStrokeStyle(3, 0xd9d9e8, ring.alpha),
    onComplete: () => ring.destroy(),
  });
}

// Overcharge Strike — "the hammer-head glows faintly with stored force
// before it lands": a visible charge-up beat before the overhead smash,
// distinguishing it from Hammer Strike's plain quick swing.
export function playChargedSmash(scene, player, facing) {
  ensureWeaponTextures(scene);
  const hand = HAND_SLASH[facing] ?? HAND_SLASH.down;
  const img = spawnWeapon(scene, player, 'hammer', hand, true);
  const dir = hand.flip ? -1 : 1;
  img.rotation = dir * -0.5;
  const glow = scene.add.image(img.x, img.y, 'glow').setScale(0.1).setTint(0xf2c14e).setBlendMode(Phaser.BlendModes.ADD).setDepth(img.depth + 1);
  scene.tweens.add({
    targets: glow,
    scale: 0.5,
    duration: 340,
    ease: 'Sine.easeIn',
    onUpdate: () => { glow.x = img.x; glow.y = img.y; },
  });
  scene.time.delayedCall(340, () => {
    scene.tweens.add({
      targets: img,
      rotation: dir * 1.8,
      duration: 260,
      ease: 'Back.easeIn',
      onComplete: () => {
        glow.destroy();
        const dust = scene.add.circle(img.x, img.y, 5, 0x8a7a5a, 0.85).setDepth(img.depth);
        scene.tweens.add({ targets: dust, radius: 30, alpha: 0, duration: 300, onComplete: () => dust.destroy() });
        const spark = scene.add.circle(img.x, img.y, 3, 0xf2c14e, 1).setDepth(img.depth + 1).setBlendMode(Phaser.BlendModes.ADD);
        scene.tweens.add({ targets: spark, radius: 16, alpha: 0, duration: 220, onComplete: () => spark.destroy() });
        scene.tweens.add({ targets: img, alpha: 0, duration: 90, onComplete: () => img.destroy() });
      },
    });
  });
}

// Ground Slam — the hammer drops at the Smith's own feet (it's a
// self-centered AoE, not an attack on a distant target), with the
// shockwave rippling outward in dust and orange sparks.
export function playGroundSlam(scene, player) {
  ensureWeaponTextures(scene);
  const hand = HAND_SLASH.down;
  const img = spawnWeapon(scene, player, 'hammer', hand, true);
  img.rotation = -0.6;
  scene.tweens.add({
    targets: img,
    rotation: 1.9,
    y: img.y + 6,
    duration: 260,
    ease: 'Back.easeIn',
    onComplete: () => {
      scene.tweens.add({ targets: img, alpha: 0, duration: 100, onComplete: () => img.destroy() });
      scene.cameras.main.shake(160, 0.004);
      for (let i = 0; i < 3; i++) {
        const ring = scene.add.circle(player.x, player.y + 10, 8).setStrokeStyle(3, 0xe8a05a, 0.9).setDepth(player.y - 1).setBlendMode(Phaser.BlendModes.ADD);
        scene.tweens.add({
          targets: ring,
          delay: i * 90,
          radius: 46 + i * 14,
          alpha: 0,
          duration: 420,
          ease: 'Sine.easeOut',
          onUpdate: () => ring.setStrokeStyle(3, 0xe8a05a, ring.alpha),
          onComplete: () => ring.destroy(),
        });
      }
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const spark = scene.add.circle(player.x, player.y + 10, 2, 0xf2c14e, 1).setDepth(player.y).setBlendMode(Phaser.BlendModes.ADD);
        scene.tweens.add({
          targets: spark,
          x: player.x + Math.cos(a) * 40,
          y: player.y + 10 + Math.sin(a) * 26,
          alpha: 0,
          duration: 320,
          ease: 'Quad.easeOut',
          onComplete: () => spark.destroy(),
        });
      }
    },
  });
}

// Shadow Step — "blurs a few steps... reappearing" — an actual short dash
// with fading afterimage copies trailing behind, not just a static streak.
export function playShadowDash(scene, player, facing, dist = 56) {
  const vec = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[facing] ?? [0, 1];
  const texKey = player.texture.key;
  const frameKey = player.frame.name;
  const flip = player.flipX;
  const steps = 4;
  for (let i = 1; i <= steps; i++) {
    const gx = player.x - vec[0] * (dist / steps) * (steps - i);
    const gy = player.y - vec[1] * (dist / steps) * (steps - i);
    scene.time.delayedCall(i * 25, () => {
      const ghost = scene.add.image(gx, gy, texKey, frameKey).setAlpha(0.45).setTint(0x8ab4e8).setDepth(player.depth - 1).setFlipX(flip);
      scene.tweens.add({ targets: ghost, alpha: 0, duration: 220, onComplete: () => ghost.destroy() });
    });
  }
  scene.tweens.add({ targets: player, x: player.x + vec[0] * dist, y: player.y + vec[1] * dist, duration: 160, ease: 'Quad.easeOut' });
}

// Vanish — "fades from sight... a translucent afterimage flickers" — the
// player sprite itself goes semi-transparent for the buff's duration,
// snapping back to full opacity once it ends, instead of just a colored
// ring appearing over an otherwise fully-visible character.
export function playVanishFx(scene, player, durationMs = 4000) {
  const texKey = player.texture.key;
  const frameKey = player.frame.name;
  const ghost = scene.add.image(player.x, player.y, texKey, frameKey).setAlpha(0.5).setTint(0xb8c8e8).setDepth(player.depth - 1).setFlipX(player.flipX);
  scene.tweens.add({ targets: ghost, alpha: 0, duration: 400, onComplete: () => ghost.destroy() });
  scene.tweens.add({ targets: player, alpha: 0.35, duration: 250, ease: 'Sine.easeOut' });
  scene.time.delayedCall(durationMs, () => {
    if (player.active) scene.tweens.add({ targets: player, alpha: 1, duration: 300 });
  });
}
