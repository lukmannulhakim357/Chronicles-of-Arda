import Phaser from 'phaser';
import { TILE } from '../config.js';
import { tilesToPx } from './coords.js';

export { tilesToPx };

// Waypoint 10 — Crossing to Aman. Tol Eressëa itself: a small islet, towed
// across the Great Sea by Ulmo, with open water on every side rather than
// just one edge (unlike every prior waypoint's single river/sea band).
// Reuses the same ground/water tile pair as every other zone, just walled
// in on all four sides instead of one.

export const MAP_W = 30;
export const MAP_H = 20;
const BORDER = 3; // tiles of open sea framing the islet on every side

export const POINTS = {
  spawn: { x: BORDER + 3, y: MAP_H / 2 },
  elder: { x: BORDER + 5, y: MAP_H / 2 },
  ulmo: { x: MAP_W / 2, y: MAP_H / 2 },
  lookout: { x: MAP_W - BORDER - 3, y: MAP_H / 2 },
};

export function build(scene) {
  const rng = new Phaser.Math.RandomDataGenerator(['crossing']);

  buildGround(scene, rng);

  scene.physics.world.setBounds(BORDER * TILE, BORDER * TILE, (MAP_W - BORDER * 2) * TILE, (MAP_H - BORDER * 2) * TILE);
  scene.cameras.main.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);

  return { colliders: scene.physics.add.staticGroup(), points: POINTS };
}

function buildGround(scene, rng) {
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const onIslet = tx >= BORDER && tx < MAP_W - BORDER && ty >= BORDER && ty < MAP_H - BORDER;
      if (onIslet) {
        // pale, starlit ground — Tol Eressëa reads as somewhere between
        // Middle-earth and Aman, not quite either
        scene.add.image(tx * TILE + 16, ty * TILE + 16, 'ground_green', rng.between(0, 1)).setDepth(0).setTint(0xd8e6dc);
      } else {
        scene.add.image(tx * TILE + 16, ty * TILE + 16, 'water', 0).setDepth(2);
      }
    }
  }
  for (let i = 0; i < 60; i++) {
    const tx = rng.between(BORDER + 1, MAP_W - BORDER - 2);
    const ty = rng.between(BORDER + 1, MAP_H - BORDER - 2);
    scene.add
      .image(tx * TILE + rng.between(-8, 8), ty * TILE + rng.between(-8, 8), 'grasses', rng.between(0, 3))
      .setDepth(1)
      .setAlpha(0.7)
      .setTint(0xe8f0e0);
  }
}
