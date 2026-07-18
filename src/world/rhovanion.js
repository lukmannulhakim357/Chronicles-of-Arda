import Phaser from 'phaser';
import { TILE } from '../config.js';
import { tilesToPx } from './coords.js';

export { tilesToPx };

// Waypoint 6 — Rhovanion. Open wild lands the host crosses over years of
// the march — no maze, no single dramatic landmark, just wide country.
// Reuses the same open-valley build technique as Vales of Anduin, tinted
// warmer/wilder and without the river.

export const MAP_W = 40;
export const MAP_H = 26;

export const POINTS = {
  spawn: { x: 4, y: 14 },
  trader: { x: 14, y: 12 },
  forage1: { x: 22, y: 8 },
  forage2: { x: 28, y: 18 },
  forage3: { x: 18, y: 20 },
  pathOut: { x: 37, y: 14 },
};

export function build(scene) {
  const rng = new Phaser.Math.RandomDataGenerator(['rhovanion']);

  buildGround(scene, rng);
  const colliders = scene.physics.add.staticGroup();
  scatterTerrain(scene, colliders, rng);

  scene.physics.world.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
  scene.cameras.main.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);

  return { colliders, points: POINTS };
}

function buildGround(scene, rng) {
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      // a warmer, wilder tint than the Vales' cool river-valley green
      scene.add.image(tx * TILE + 16, ty * TILE + 16, 'ground_green', rng.between(0, 1)).setDepth(0).setTint(0xa89a6a);
    }
  }
  for (let i = 0; i < 260; i++) {
    const tx = rng.between(0, MAP_W - 1);
    const ty = rng.between(0, MAP_H - 1);
    scene.add
      .image(tx * TILE + rng.between(-8, 8), ty * TILE + rng.between(-8, 8), 'grasses', rng.between(0, 3))
      .setDepth(1)
      .setAlpha(0.8)
      .setTint(0xd8c88a);
  }
}

// Sparse rocks and the odd lone tree — open country, not a wall of cover.
function scatterTerrain(scene, colliders, rng) {
  for (let i = 0; i < 16; i++) {
    const tx = rng.between(2, MAP_W - 2);
    const ty = rng.between(2, MAP_H - 2);
    const px = tx * TILE;
    const py = ty * TILE;
    const key = rng.frac() > 0.5 ? 'rocks' : 'rock_cluster';
    const img = scene.add.image(px, py, key).setOrigin(0.5, 1).setDepth(py);
    const zone = scene.add.zone(px, py - img.height * 0.2, img.width * 0.6, img.height * 0.3);
    scene.physics.add.existing(zone, true);
    colliders.add(zone);
  }
  for (let i = 0; i < 6; i++) {
    const tx = rng.between(2, MAP_W - 2);
    const ty = rng.between(2, MAP_H - 2);
    const px = tx * TILE;
    const py = ty * TILE;
    const img = scene.add.image(px, py, 'pine_tree').setOrigin(0.5, 1).setDepth(py);
    const zone = scene.add.zone(px, py - img.height * 0.25, img.width * 0.6, img.height * 0.35);
    scene.physics.add.existing(zone, true);
    colliders.add(zone);
  }
}
