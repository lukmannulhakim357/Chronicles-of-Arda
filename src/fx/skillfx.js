import Phaser from 'phaser';
import { ensureWeaponTextures } from './weapons.js';

// Skill & ultimate visual effects — all procedural (tweens, particles,
// graphics) over the tiny 'glow'/'px-star' textures BootScene already
// generates, so no new art assets are needed. One readable beat per
// regular skill; capstones get a full multi-beat sequence per class.

const TINT = {
  phys: 0xd9d9e8,
  magic: 0x7fb4ff,
  heal: 0x7fe89a,
  buff: 0xf2d06b,
  debuff: 0xb07fe8,
  blood: 0xe86a6a,
  gold: 0xd9b968,
};

function burst(scene, x, y, { tint = 0xffffff, count = 10, speed = 90, lifespan = 450, scale = 0.35 } = {}) {
  const p = scene.add.particles(x, y, 'glow', {
    speed: { min: speed * 0.4, max: speed },
    lifespan,
    scale: { start: scale, end: 0 },
    tint,
    blendMode: 'ADD',
    emitting: false,
  });
  p.setDepth(59000);
  p.explode(count);
  scene.time.delayedCall(lifespan + 200, () => p.destroy());
}

function rain(scene, x, y, { tint = 0xffffff, count = 8, lifespan = 700, gravity = 260, scale = 0.22 } = {}) {
  const p = scene.add.particles(x, y, 'px-star', {
    speedX: { min: -30, max: 30 },
    speedY: { min: -40, max: 10 },
    gravityY: gravity,
    lifespan,
    scale: { start: scale * 4, end: 0 },
    tint,
    blendMode: 'ADD',
    emitting: false,
  });
  p.setDepth(59000);
  p.explode(count);
  scene.time.delayedCall(lifespan + 200, () => p.destroy());
}

function rise(scene, x, y, { tint = TINT.heal, count = 12, lifespan = 900, spread = 26 } = {}) {
  const p = scene.add.particles(x, y, 'px-star', {
    x: { min: -spread, max: spread },
    speedY: { min: -80, max: -30 },
    speedX: { min: -12, max: 12 },
    lifespan,
    scale: { start: 1.4, end: 0 },
    tint,
    blendMode: 'ADD',
    emitting: false,
  });
  p.setDepth(59000);
  p.explode(count);
  scene.time.delayedCall(lifespan + 200, () => p.destroy());
}

function ring(scene, x, y, { tint = 0xffffff, radius = 60, duration = 500, width = 3, delay = 0 } = {}) {
  const c = scene.add.circle(x, y, 12).setStrokeStyle(width, tint, 0.9).setDepth(59000).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
  scene.tweens.add({
    targets: c,
    delay,
    alpha: { from: 0.9, to: 0 },
    radius,
    duration,
    ease: 'Sine.easeOut',
    onUpdate: () => c.setStrokeStyle(width, tint, c.alpha),
    onComplete: () => c.destroy(),
  });
}

function pillar(scene, x, y, { tint = TINT.gold, h = 90, w = 26, duration = 800, delay = 0 } = {}) {
  const img = scene.add.image(x, y, 'glow').setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setDepth(58990);
  img.setDisplaySize(w, 10).setOrigin(0.5, 1).setAlpha(0);
  scene.tweens.add({
    targets: img,
    delay,
    alpha: { from: 0.9, to: 0 },
    displayHeight: h,
    duration,
    ease: 'Sine.easeOut',
    onComplete: () => img.destroy(),
  });
}

function crescent(scene, x, y, { tint = TINT.phys, rotation = 0, radius = 26, duration = 260, delay = 0 } = {}) {
  const g = scene.add.graphics({ x, y }).setDepth(59010).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
  g.lineStyle(5, tint, 1);
  g.beginPath();
  g.arc(0, 0, radius, -0.9, 0.9);
  g.strokePath();
  g.rotation = rotation;
  scene.tweens.add({
    targets: g,
    delay,
    alpha: { from: 1, to: 0 },
    rotation: rotation + 1.6,
    scale: 1.35,
    duration,
    ease: 'Sine.easeOut',
    onComplete: () => g.destroy(),
  });
}

function streak(scene, x1, y1, x2, y2, { tint = 0xffffff, duration = 220, delay = 0, thickness = 3, length = 26 } = {}) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const r = scene.add.rectangle(x1, y1, length, thickness, tint, 1).setDepth(59005).setBlendMode(Phaser.BlendModes.ADD).setRotation(angle).setAlpha(0);
  scene.tweens.add({
    targets: r,
    delay,
    alpha: { from: 1, to: 0.2 },
    x: x2,
    y: y2,
    duration,
    ease: 'Sine.easeIn',
    onComplete: () => {
      burst(scene, x2, y2, { tint, count: 4, speed: 60, lifespan: 300, scale: 0.2 });
      r.destroy();
    },
  });
}

function ghost(scene, x, y, sheet, { tint = 0x9ac8ff, duration = 900, delay = 0, toX = x, toY = y, scale = 1, weapon = null } = {}) {
  const parts = [scene.add.sprite(x, y, sheet, 10 * 13).setTint(tint).setAlpha(0).setDepth(59000).setScale(scale)];
  if (weapon) {
    ensureWeaponTextures(scene);
    parts.push(
      scene.add.image(x + 9, y + 2, `fxw-${weapon}`).setTint(tint).setAlpha(0).setDepth(59001).setScale(scale).setRotation(0.5)
    );
  }
  const dx = toX - x;
  const dy = toY - y;
  scene.tweens.add({
    targets: parts,
    delay,
    alpha: { from: 0, to: 0.85 },
    duration: duration * 0.3,
    onComplete: () => {
      scene.tweens.add({
        targets: parts,
        x: `+=${dx}`,
        y: `+=${dy}`,
        alpha: 0,
        duration: duration * 0.7,
        ease: 'Sine.easeIn',
        onComplete: () => parts.forEach((p) => p.destroy()),
      });
    },
  });
}

function magicCircle(scene, x, y, { tint = TINT.magic, radius = 26, duration = 900, delay = 0 } = {}) {
  const g = scene.add.graphics({ x, y }).setDepth(58995).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setScale(0.3);
  g.lineStyle(2, tint, 1);
  g.strokeCircle(0, 0, radius);
  g.lineStyle(1, tint, 0.8);
  g.strokeCircle(0, 0, radius * 0.65);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    g.lineBetween(Math.cos(a) * radius * 0.65, Math.sin(a) * radius * 0.65, Math.cos(a + Math.PI) * radius * 0.65, Math.sin(a + Math.PI) * radius * 0.65);
  }
  scene.tweens.add({
    targets: g,
    delay,
    alpha: { from: 1, to: 0 },
    scale: 1.15,
    rotation: 1.2,
    duration,
    ease: 'Sine.easeOut',
    onComplete: () => g.destroy(),
  });
}

// floating music glyphs — the Loresinger's whole kit is song, so its
// skills carry visible notes, not generic sparkles
export function musicNotes(scene, x, y, { count = 5, tint = '#f2d06b', delay = 0, spread = 30 } = {}) {
  const glyphs = ['♪', '♫', '♩', '♬'];
  for (let i = 0; i < count; i++) {
    const t = scene.add
      .text(x + Phaser.Math.Between(-spread, spread), y + Phaser.Math.Between(-8, 8), glyphs[i % glyphs.length], {
        fontFamily: 'serif',
        fontSize: `${Phaser.Math.Between(12, 18)}px`,
        color: tint,
        stroke: '#05060f',
        strokeThickness: 2,
      })
      .setOrigin(0.5)
      .setDepth(59020)
      .setAlpha(0);
    scene.tweens.add({
      targets: t,
      delay: delay + i * 110,
      alpha: { from: 0.95, to: 0 },
      y: t.y - Phaser.Math.Between(34, 58),
      x: t.x + Phaser.Math.Between(-14, 14),
      angle: Phaser.Math.Between(-25, 25),
      duration: 950,
      ease: 'Sine.easeOut',
      onComplete: () => t.destroy(),
    });
  }
}

function cracks(scene, x, y, { tint = 0xf2b06b, count = 8, length = 55, duration = 700 } = {}) {
  const g = scene.add.graphics({ x, y }).setDepth(58990).setAlpha(1);
  g.lineStyle(2, tint, 0.9);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.2, 0.2);
    let px = 0;
    let py = 0;
    g.beginPath();
    g.moveTo(0, 0);
    for (let seg = 1; seg <= 3; seg++) {
      const r = (length / 3) * seg;
      px = Math.cos(a) * r + Phaser.Math.Between(-6, 6);
      py = Math.sin(a) * r * 0.6 + Phaser.Math.Between(-4, 4);
      g.lineTo(px, py);
    }
    g.strokePath();
  }
  scene.tweens.add({ targets: g, alpha: 0, duration, delay: 250, onComplete: () => g.destroy() });
}

function flashVeil(scene, { tint = 0x05060f, alpha = 0.55, duration = 260 } = {}) {
  const cam = scene.cameras.main;
  const r = scene.add
    .rectangle(cam.midPoint.x, cam.midPoint.y, cam.width / cam.zoom + 40, cam.height / cam.zoom + 40, tint, alpha)
    .setDepth(59900);
  scene.tweens.add({ targets: r, alpha: 0, duration, onComplete: () => r.destroy() });
}

// ---------- regular skills: one readable beat per kind ----------

export function playSkillFx(scene, def, caster, target, classId = null) {
  const t = target ?? caster;
  // every Loresinger skill is a song — notes fly on all of them
  if (classId === 'loresinger') musicNotes(scene, caster.x, caster.y - 14, { count: 4 });
  switch (def.kind) {
    case 'heal':
    case 'hot':
      pillar(scene, t.x, t.y + 12, { tint: TINT.heal, h: 70 });
      rise(scene, t.x, t.y, { tint: TINT.heal });
      return;
    case 'cleanse':
      ring(scene, t.x, t.y, { tint: 0xd8f0ff, radius: 44 });
      rise(scene, t.x, t.y, { tint: 0xd8f0ff, count: 8 });
      return;
    case 'buff':
      ring(scene, t.x, t.y, { tint: TINT.buff, radius: 40 });
      rise(scene, t.x, t.y, { tint: TINT.buff, count: 10 });
      return;
    case 'debuff':
    case 'cc':
      burst(scene, t.x, t.y, { tint: TINT.debuff, count: 8, speed: 60 });
      rain(scene, t.x, t.y - 10, { tint: TINT.debuff, count: 6 });
      return;
    case 'summon':
      magicCircle(scene, caster.x, caster.y + 8, { tint: TINT.magic, radius: 30 });
      burst(scene, caster.x, caster.y, { tint: TINT.magic, count: 8 });
      return;
    case 'utility':
      streak(scene, caster.x - 20, caster.y, caster.x + 20, caster.y, { tint: 0xffffff, duration: 160 });
      return;
    case 'dot':
      crescent(scene, t.x, t.y, { tint: TINT.blood });
      rain(scene, t.x, t.y - 6, { tint: TINT.blood, count: 7 });
      return;
    case 'damage':
    default:
      crescent(scene, t.x, t.y, { tint: def.isMagic ? TINT.magic : TINT.phys, rotation: Phaser.Math.FloatBetween(-0.6, 0.6) });
      burst(scene, t.x, t.y, { tint: def.isMagic ? TINT.magic : TINT.phys, count: 8 });
      return;
  }
}

// ---------- capstones: one epic multi-beat sequence per class ----------
// Returns the sequence's rough duration (ms) so callers can loop previews.

export function playUltimate(scene, classId, caster, allies = [], target = null) {
  const t = target ?? { x: caster.x + 70, y: caster.y };
  const everyone = [caster, ...allies];
  switch (classId) {
    case 'warrior': {
      // Last Stand — a golden dome slams down; nothing gets through
      burst(scene, caster.x, caster.y, { tint: TINT.gold, count: 18, speed: 130 });
      const dome = scene.add.circle(caster.x, caster.y + 4, 46, TINT.gold, 0.12).setStrokeStyle(3, TINT.gold, 0.9).setDepth(58995).setScale(0.2);
      scene.tweens.add({ targets: dome, scale: 1, duration: 380, ease: 'Back.easeOut' });
      scene.tweens.add({ targets: dome, alpha: 0, delay: 1500, duration: 500, onComplete: () => dome.destroy() });
      for (let i = 0; i < 3; i++) ring(scene, caster.x, caster.y, { tint: 0xe8a05a, radius: 80 + i * 18, duration: 600, delay: 300 + i * 420 });
      scene.cameras.main.shake(280, 0.006);
      return 2200;
    }
    case 'ranger': {
      // Storm of the Wild Hunt — the sky answers with arrows in three
      // distinct volleys over about a second, matching the three real hits
      // the barrage now lands (WorldScene.onSkillPressed), not one big
      // simultaneous drop
      ring(scene, caster.x, caster.y, { tint: 0x9ae8b4, radius: 60, duration: 400 });
      const waveDelays = [180, 580, 980];
      waveDelays.forEach((waveDelay) => {
        for (let i = 0; i < 6; i++) {
          const dx = Phaser.Math.Between(-80, 80);
          streak(scene, t.x + dx + 60, t.y - 130, t.x + dx, t.y + Phaser.Math.Between(-30, 30), {
            tint: 0xd8f0c8,
            duration: 220,
            delay: waveDelay + i * 30,
            length: 30,
          });
        }
        scene.time.delayedCall(waveDelay + 160, () => ring(scene, t.x, t.y, { tint: 0x9ae8b4, radius: 60, duration: 350 }));
      });
      ring(scene, t.x, t.y, { tint: 0x9ae8b4, radius: 110, duration: 700, delay: 1500 });
      return 2400;
    }
    case 'loresinger': {
      // Anthem of Valinor — the song of the West made visible
      pillar(scene, caster.x, caster.y + 12, { tint: TINT.gold, h: 120, w: 34 });
      for (let i = 0; i < 3; i++) ring(scene, caster.x, caster.y, { tint: TINT.gold, radius: 90 + i * 35, duration: 800, delay: i * 260 });
      musicNotes(scene, caster.x, caster.y - 20, { count: 8, spread: 44 });
      everyone.forEach((m, i) => {
        pillar(scene, m.x, m.y + 12, { tint: TINT.buff, h: 84, delay: 500 + i * 140 });
        rise(scene, m.x, m.y, { tint: TINT.buff, count: 14, lifespan: 1100 });
        musicNotes(scene, m.x, m.y - 16, { count: 4, delay: 600 + i * 160 });
      });
      burst(scene, caster.x, caster.y - 60, { tint: 0xfff2c8, count: 16, speed: 110 });
      return 2400;
    }
    case 'herbmaster': {
      // Athelas Bloom — the healing flower opens over the whole party
      burst(scene, caster.x, caster.y, { tint: TINT.heal, count: 12, speed: 80 });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        streak(scene, caster.x, caster.y, caster.x + Math.cos(a) * 60, caster.y + Math.sin(a) * 40, {
          tint: 0xc8f0d0,
          duration: 420,
          delay: 200,
          thickness: 6,
          length: 18,
        });
      }
      everyone.forEach((m, i) => {
        pillar(scene, m.x, m.y + 12, { tint: TINT.heal, h: 90, delay: 600 + i * 150 });
        rise(scene, m.x, m.y, { tint: 0xc8f0d0, count: 14, lifespan: 1200 });
      });
      ring(scene, caster.x, caster.y, { tint: TINT.heal, radius: 120, duration: 900, delay: 700 });
      return 2400;
    }
    case 'smith': {
      // Artificer's Triumph — one hammerfall, and the earth remembers it
      const hammer = scene.add.image(caster.x + 26, caster.y - 70, 'glow').setTint(0xf2c14e).setDisplaySize(30, 30).setDepth(59010).setBlendMode(Phaser.BlendModes.ADD);
      scene.tweens.add({
        targets: hammer,
        y: t.y,
        x: t.x,
        duration: 300,
        delay: 200,
        ease: 'Quad.easeIn',
        onComplete: () => {
          hammer.destroy();
          flashVeil(scene, { tint: 0xf2c14e, alpha: 0.28, duration: 220 });
          scene.cameras.main.shake(380, 0.01);
          ring(scene, t.x, t.y, { tint: 0xf2b06b, radius: 100, duration: 550 });
          cracks(scene, t.x, t.y + 6, {});
          rain(scene, t.x, t.y - 10, { tint: 0xf2c14e, count: 16, gravity: 320, lifespan: 900 });
        },
      });
      return 2200;
    }
    case 'skirmisher': {
      // Assassinate — three shadows, one killing stroke
      flashVeil(scene, { alpha: 0.5, duration: 500 });
      const passes = [
        [t.x - 90, t.y - 20, t.x + 90, t.y + 10],
        [t.x + 90, t.y - 26, t.x - 90, t.y + 16],
        [t.x - 70, t.y + 30, t.x + 70, t.y - 30],
      ];
      passes.forEach((p, i) => streak(scene, p[0], p[1], p[2], p[3], { tint: 0xc8c8e8, duration: 160, delay: 200 + i * 180, thickness: 4, length: 40 }));
      scene.time.delayedCall(850, () => {
        crescent(scene, t.x, t.y, { tint: TINT.blood, rotation: -0.8, radius: 34, duration: 380 });
        crescent(scene, t.x, t.y, { tint: TINT.blood, rotation: 2.3, radius: 34, duration: 380 });
        burst(scene, t.x, t.y, { tint: TINT.blood, count: 18, speed: 150 });
        scene.cameras.main.shake(220, 0.008);
      });
      return 1800;
    }
    case 'captain': {
      // War Horn's Call — the horn sounds, and the Guard answers, STAYS,
      // and fights: 2 swordsmen + 2 archers hold formation for ~5s, each
      // striking at the target repeatedly before the light releases them
      ensureWeaponTextures(scene);
      for (let i = 0; i < 3; i++) ring(scene, caster.x, caster.y - 10, { tint: 0xf2d06b, radius: 70 + i * 25, duration: 500, delay: i * 160 });
      const spots = [
        [-46, -20],
        [46, -20],
        [-46, 26],
        [46, 26],
      ];
      spots.forEach((s, i) => {
        const gx = caster.x + s[0];
        const gy = caster.y + s[1];
        const weaponKey = i < 2 ? 'sword' : 'bow';
        const spr = scene.add.sprite(gx, gy, 'npc_elf_hunter', 10 * 13).setTint(0xaac8f0).setAlpha(0).setDepth(59000);
        const wpn = scene.add.image(gx + 9, gy + 2, `fxw-${weaponKey}`).setTint(0xd8e8ff).setAlpha(0).setDepth(59001).setRotation(0.5);
        const parts = [spr, wpn];
        scene.tweens.add({ targets: parts, delay: 450 + i * 130, alpha: 0.9, duration: 300 });
        // each guardsman lunges at the target twice, swinging, then returns
        for (let strike = 0; strike < 2; strike++) {
          scene.time.delayedCall(1300 + i * 350 + strike * 1600, () => {
            if (!spr.active) return;
            spr.play(`npc_elf_hunter-slash-right`, true);
            scene.tweens.add({
              targets: parts,
              x: `+=${(t.x - spr.x) * 0.55}`,
              y: `+=${(t.y - spr.y) * 0.55}`,
              duration: 240,
              ease: 'Quad.easeIn',
              yoyo: true,
              onYoyo: () => burst(scene, t.x, t.y, { tint: 0xd8e8ff, count: 5, speed: 70, lifespan: 300, scale: 0.22 }),
            });
          });
        }
        // released after their ~5s of service
        scene.time.delayedCall(5200 + i * 130, () => {
          scene.tweens.add({ targets: parts, alpha: 0, duration: 450, onComplete: () => parts.forEach((p) => p.destroy()) });
        });
      });
      everyone.forEach((m, i) => pillar(scene, m.x, m.y + 12, { tint: TINT.buff, h: 80, delay: 700 + i * 120 }));
      return 5600; // the Guard's full tour of duty — previews wait for it
    }
    case 'summoner': {
      // Call of the Wild — every bond answers at once
      const creatures = [
        { tint: 0xf0f0ff }, // bird
        { tint: 0x8ae8e8 }, // spirit
        { tint: 0xf2d06b }, // great eagle
        { tint: 0x8ae89a }, // ent
        { tint: 0xd9a06b }, // beorning
      ];
      creatures.forEach((c, i) => {
        const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
        const cxp = caster.x + Math.cos(a) * 55;
        const cyp = caster.y + Math.sin(a) * 38;
        magicCircle(scene, cxp, cyp, { tint: c.tint, radius: 22, duration: 1100, delay: i * 190 });
        burst(scene, cxp, cyp, { tint: c.tint, count: 8, speed: 70 });
        ghost(scene, cxp, cyp, 'npc_shadow', { tint: c.tint, delay: 220 + i * 190, duration: 900, scale: 0.8 });
      });
      ring(scene, caster.x, caster.y, { tint: TINT.magic, radius: 110, duration: 800, delay: 1200 });
      burst(scene, caster.x, caster.y, { tint: TINT.magic, count: 16, speed: 120 });
      return 2500;
    }
    default:
      burst(scene, caster.x, caster.y, { tint: TINT.gold, count: 14 });
      return 1200;
  }
}
