import Phaser from 'phaser';

// Visible summon creatures for the Summoner — procedural forms (generated
// textures, no external art) that follow the caster, and periodically dive
// at the current enemy with their own attack beat. Bird arrives as a whole
// flock, per its Support/flock identity.

export const SUMMON_FORMS = {
  call_bird: 'bird',
  call_spirit: 'spirit',
  call_great_eagle: 'eagle',
  call_ent: 'ent',
  call_beorning: 'bear',
};

export function ensureSummonTextures(scene) {
  const mk = (key, w, h, draw) => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ add: false });
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  };
  mk('smn-bird', 12, 8, (g) => {
    g.lineStyle(2, 0xf0f0ff, 1);
    g.lineBetween(0, 6, 6, 1);
    g.lineBetween(6, 1, 12, 6);
  });
  mk('smn-eagle', 24, 14, (g) => {
    g.lineStyle(3, 0xd9b968, 1);
    g.lineBetween(0, 12, 12, 2);
    g.lineBetween(12, 2, 24, 12);
    g.fillStyle(0x8a6a3a, 1);
    g.fillCircle(12, 6, 3);
  });
  mk('smn-ent', 18, 30, (g) => {
    g.fillStyle(0x6b4a2a, 1);
    g.fillRect(7, 12, 4, 18);
    g.fillRect(3, 18, 3, 10);
    g.fillRect(12, 18, 3, 10);
    g.fillStyle(0x4a8a4a, 1);
    g.fillCircle(9, 9, 8);
  });
  mk('smn-bear', 24, 16, (g) => {
    g.fillStyle(0x8a5a2a, 1);
    g.fillEllipse(11, 10, 18, 11);
    g.fillCircle(20, 7, 4);
    g.fillRect(4, 13, 3, 3);
    g.fillRect(14, 13, 3, 3);
  });
}

const FORM_DEF = {
  bird: { tint: 0xf0f0ff, count: 5, texture: 'smn-bird', bob: 10, atkPct: 'flurry' },
  spirit: { tint: 0x8ae8e8, count: 1, texture: 'glow', scale: 0.35, bob: 6 },
  eagle: { tint: 0xffffff, count: 1, texture: 'smn-eagle', bob: 14 },
  ent: { tint: 0xffffff, count: 1, texture: 'smn-ent', bob: 2 },
  bear: { tint: 0xffffff, count: 1, texture: 'smn-bear', bob: 3 },
};

// Spawns a summon that follows the player and attacks on a beat.
// getEnemyPos()/onHit(form) come from the scene's quest; durationMs from
// Wild Bond (20s baseline). Returns a handle with .destroy().
export function spawnSummon(scene, form, player, getEnemyPos, onHit, durationMs = 20000) {
  ensureSummonTextures(scene);
  const def = FORM_DEF[form] ?? FORM_DEF.spirit;
  const sprites = [];
  for (let i = 0; i < def.count; i++) {
    const off = {
      x: Phaser.Math.Between(-34, 34),
      y: Phaser.Math.Between(-40, -14),
    };
    const s = scene.add
      .image(player.x + off.x, player.y + off.y, def.texture)
      .setTint(def.tint)
      .setDepth(59500)
      .setScale(def.scale ?? 1)
      .setAlpha(0);
    if (def.texture === 'glow') s.setBlendMode(Phaser.BlendModes.ADD);
    s.followOff = off;
    scene.tweens.add({ targets: s, alpha: 0.95, duration: 300 });
    // idle bobbing so the creature reads as alive
    scene.tweens.add({
      targets: s,
      y: `+=${def.bob}`,
      duration: Phaser.Math.Between(500, 800),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    sprites.push(s);
  }

  const followTimer = scene.time.addEvent({
    delay: 140,
    loop: true,
    callback: () => {
      for (const s of sprites) {
        if (!s.active) continue;
        s.x += (player.x + s.followOff.x - s.x) * 0.25;
        // y handled loosely so the bob tween isn't fought too hard
        s.x += Math.sin(scene.time.now / 300 + s.followOff.x) * 0.6;
      }
    },
  });

  const atkTimer = scene.time.addEvent({
    delay: 2600,
    loop: true,
    callback: () => {
      const enemy = getEnemyPos?.();
      if (!enemy || !sprites[0]?.active) return;
      const attacker = sprites[0];
      const fromX = attacker.x;
      const fromY = attacker.y;
      scene.tweens.add({
        targets: attacker,
        x: enemy.x,
        y: enemy.y - 8,
        duration: 260,
        ease: 'Quad.easeIn',
        onComplete: () => {
          const p = scene.add.particles(enemy.x, enemy.y, 'glow', {
            speed: 70,
            lifespan: 350,
            scale: { start: 0.3, end: 0 },
            tint: def.tint,
            blendMode: 'ADD',
            emitting: false,
          });
          p.setDepth(59000);
          p.explode(6);
          scene.time.delayedCall(500, () => p.destroy());
          onHit?.(form);
          scene.tweens.add({ targets: attacker, x: fromX, y: fromY, duration: 420, ease: 'Sine.easeOut' });
        },
      });
    },
  });

  const handle = {
    destroy() {
      followTimer.remove();
      atkTimer.remove();
      sprites.forEach((s) =>
        scene.tweens.add({ targets: s, alpha: 0, duration: 350, onComplete: () => s.destroy() })
      );
    },
  };
  scene.time.delayedCall(durationMs, () => handle.destroy());
  return handle;
}
