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
  // Bird — a real bird silhouette: plump body, head with beak, tail, and
  // proper curved wings in two flap frames (up / down) so it flies alive
  const drawBirdBody = (g) => {
    g.fillStyle(0xf0f0f8, 1);
    g.fillEllipse(8, 8, 9, 6); // body
    g.fillCircle(12, 6, 3); // head
    g.fillStyle(0xf2a44e, 1);
    g.fillTriangle(14, 6, 17, 7, 14, 8); // beak
    g.fillStyle(0xd8d8e4, 1);
    g.fillTriangle(4, 8, 0, 5, 1, 10); // tail
  };
  mk('smn-bird-a', 18, 14, (g) => {
    drawBirdBody(g);
    g.fillStyle(0xe4e4f0, 1);
    g.fillTriangle(7, 7, 3, 0, 11, 5); // wing raised
  });
  mk('smn-bird-b', 18, 14, (g) => {
    drawBirdBody(g);
    g.fillStyle(0xe4e4f0, 1);
    g.fillTriangle(7, 8, 3, 14, 11, 10); // wing swept down
  });
  // Great Eagle — broad fingered wings, golden head, fanned tail
  const drawEagleBody = (g) => {
    g.fillStyle(0x6b4a2a, 1);
    g.fillEllipse(17, 11, 14, 8);
    g.fillStyle(0xe8d8a0, 1);
    g.fillCircle(24, 8, 4); // pale head
    g.fillStyle(0xf2a44e, 1);
    g.fillTriangle(27, 8, 31, 9, 27, 11); // hooked beak
    g.fillStyle(0x8a6a3a, 1);
    g.fillTriangle(10, 11, 3, 8, 3, 15); // tail fan
  };
  mk('smn-eagle-a', 34, 22, (g) => {
    drawEagleBody(g);
    g.fillStyle(0x7a5a34, 1);
    g.fillTriangle(15, 9, 2, 0, 20, 6); // left wing up
    g.fillTriangle(19, 9, 32, 0, 24, 6); // right wing up
    g.lineStyle(1, 0x5a4224, 1);
    g.lineBetween(4, 2, 9, 6);
    g.lineBetween(30, 2, 25, 6);
  });
  mk('smn-eagle-b', 34, 22, (g) => {
    drawEagleBody(g);
    g.fillStyle(0x7a5a34, 1);
    g.fillTriangle(15, 12, 2, 21, 20, 15); // left wing down
    g.fillTriangle(19, 12, 32, 21, 24, 15); // right wing down
    g.lineStyle(1, 0x5a4224, 1);
    g.lineBetween(4, 19, 9, 15);
    g.lineBetween(30, 19, 25, 15);
  });
  // Ent — a walking tree: gnarled trunk legs, branch arms, layered canopy
  mk('smn-ent', 26, 36, (g) => {
    g.fillStyle(0x5a4224, 1);
    g.fillRect(10, 16, 6, 14); // trunk
    g.fillRect(7, 26, 4, 10); // left leg
    g.fillRect(15, 26, 4, 10); // right leg
    g.lineStyle(3, 0x5a4224, 1);
    g.lineBetween(11, 20, 2, 14); // left arm branch
    g.lineBetween(15, 20, 24, 13);
    g.fillStyle(0x3a6a3a, 1);
    g.fillCircle(13, 10, 9); // canopy
    g.fillStyle(0x4a8a4a, 1);
    g.fillCircle(9, 8, 5);
    g.fillCircle(17, 8, 5);
    g.fillStyle(0xf2d06b, 1);
    g.fillRect(11, 13, 2, 2); // eyes glinting under the leaves
    g.fillRect(15, 13, 2, 2);
  });
  // Beorning — a proper bear: humped back, snout, ears, four legs
  mk('smn-bear', 30, 20, (g) => {
    g.fillStyle(0x6b4a2a, 1);
    g.fillEllipse(13, 10, 20, 11); // body with hump
    g.fillCircle(23, 8, 5); // head
    g.fillStyle(0x8a5a2a, 1);
    g.fillEllipse(26, 10, 6, 4); // snout
    g.fillStyle(0x6b4a2a, 1);
    g.fillCircle(20, 4, 2); // ear
    g.fillCircle(25, 4, 2);
    g.fillRect(5, 14, 4, 6); // legs
    g.fillRect(11, 15, 4, 5);
    g.fillRect(17, 15, 4, 5);
    g.fillStyle(0x1a0e06, 1);
    g.fillCircle(28, 9, 1); // nose
  });
}

const FORM_DEF = {
  bird: { tint: 0xffffff, count: 5, texture: 'smn-bird-a', flap: ['smn-bird-a', 'smn-bird-b'], bob: 10 },
  spirit: { tint: 0x8ae8e8, count: 1, texture: 'glow', scale: 0.35, bob: 6 },
  eagle: { tint: 0xffffff, count: 1, texture: 'smn-eagle-a', flap: ['smn-eagle-a', 'smn-eagle-b'], bob: 14, scale: 1.35 },
  ent: { tint: 0xffffff, count: 1, texture: 'smn-ent', bob: 2, scale: 1.3 },
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

  // Once an enemy is around, the summon loiters near IT instead of trailing
  // the master — it's loose now, not on a leash. Only falls back to
  // following the player when there's nothing nearby to fight.
  const followTimer = scene.time.addEvent({
    delay: 140,
    loop: true,
    callback: () => {
      const enemy = getEnemyPos?.();
      const anchor = enemy ?? player;
      const lerp = enemy ? 0.1 : 0.25; // ease into the enemy-side hover, don't snap
      for (const s of sprites) {
        if (!s.active) continue;
        const targetX = anchor.x + s.followOff.x;
        s.x += (targetX - s.x) * lerp;
        s.x += Math.sin(scene.time.now / 300 + s.followOff.x) * 0.6;
        s.setFlipX(targetX < s.x); // face the way it's drifting
      }
    },
  });

  // wing-flap for the flyers: alternate between the two flap frames
  let flapTimer = null;
  if (def.flap) {
    let frame = 0;
    flapTimer = scene.time.addEvent({
      delay: 160,
      loop: true,
      callback: () => {
        frame = 1 - frame;
        for (const s of sprites) if (s.active) s.setTexture(def.flap[frame]);
      },
    });
  }

  const atkTimer = scene.time.addEvent({
    delay: 2600,
    loop: true,
    callback: () => {
      const enemy = getEnemyPos?.();
      if (!enemy || !sprites[0]?.active) return;
      const attacker = sprites[0];
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
          // no trip back to the master — the ambient follow-timer above
          // eases it right back into its hover spot beside the enemy
        },
      });
    },
  });

  const handle = {
    destroy() {
      followTimer.remove();
      atkTimer.remove();
      flapTimer?.remove();
      sprites.forEach((s) =>
        scene.tweens.add({ targets: s, alpha: 0, duration: 350, onComplete: () => s.destroy() })
      );
    },
  };
  scene.time.delayedCall(durationMs, () => handle.destroy());
  return handle;
}
