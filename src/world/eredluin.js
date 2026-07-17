import Phaser from 'phaser';
import { TILE } from '../config.js';
import { tilesToPx } from './coords.js';

export { tilesToPx };

// Waypoint 7 — Ered Luin (the Blue Mountains). First contact with the
// Dwarves of Nogrod and Belegost. Reuses the Misty Mountains' corridor
// technique (rock walls, no snow/mountain tile art exists to download —
// same placeholder-via-tint convention), tinted warmer and less icy than
// Hithaeglir's pass to read as a different, more "settled" range.

export const MAP_W = 40;
export const MAP_H = 26;

export const POINTS = {
  spawn: { x: 3, y: 13 },
  patrolSpot: { x: 14, y: 13 },
  smithSpot: { x: 27, y: 13 },
  pathOut: { x: 37, y: 13 },
};

export function build(scene) {
  const rng = new Phaser.Math.RandomDataGenerator(['eredluin']);

  buildGround(scene, rng);
  const colliders = scene.physics.add.staticGroup();
  buildRockWalls(scene, colliders, rng);

  scene.physics.world.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
  scene.cameras.main.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);

  return { colliders, points: POINTS };
}

function buildGround(scene, rng) {
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      // a warmer slate tone than Hithaeglir's icy blue-grey
      scene.add.image(tx * TILE + 16, ty * TILE + 16, 'ground_green', rng.between(0, 1)).setDepth(0).setTint(0x8a8478);
    }
  }
}

function addBoulder(scene, colliders, x, y, key) {
  const px = x * TILE;
  const py = y * TILE;
  const img = scene.add.image(px, py, key).setOrigin(0.5, 1).setDepth(py).setTint(0xb0a894);
  const zone = scene.add.zone(px, py - img.height * 0.25, img.width * 0.7, img.height * 0.4);
  scene.physics.add.existing(zone, true);
  colliders.add(zone);
}

function corridorHalfWidth(tx) {
  return 3.5 + Math.sin(tx / 7) * 1.2;
}

function corridorCenter(tx) {
  return 13 + Math.sin(tx / 10) * 2.2;
}

function buildRockWalls(scene, colliders, rng) {
  for (let tx = 2; tx < MAP_W - 2; tx += 2) {
    const center = corridorCenter(tx);
    const half = corridorHalfWidth(tx);
    for (let ty = 2; ty < MAP_H - 2; ty += 2) {
      if (Math.abs(ty - center) < half) continue;
      if (rng.frac() > 0.4) continue;
      const jx = tx + rng.realInRange(-0.5, 0.5);
      const jy = ty + rng.realInRange(-0.5, 0.5);
      addBoulder(scene, colliders, jx, jy, rng.frac() > 0.5 ? 'large_boulder' : 'rock_cluster');
    }
  }
  for (let tx = 1; tx < MAP_W - 1; tx += 2) {
    addBoulder(scene, colliders, tx + rng.realInRange(-0.3, 0.3), 1.4, 'large_boulder');
    addBoulder(scene, colliders, tx + rng.realInRange(-0.3, 0.3), MAP_H - 1.4, 'large_boulder');
  }
}
