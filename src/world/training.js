import Phaser from 'phaser';
import { TILE } from '../config.js';
import { tilesToPx } from './coords.js';

export { tilesToPx };

// Training Grounds — a small practice field reachable from class selection.
// One training dummy, no stakes, every skill unlocked: a place to judge a
// class before committing to it.

export const MAP_W = 22;
export const MAP_H = 14;

export const POINTS = {
  spawn: { x: 7, y: 8 },
  dummy: { x: 13, y: 7 },
  exit: { x: 3, y: 7 },
};

export function build(scene) {
  const rng = new Phaser.Math.RandomDataGenerator(['training']);

  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      scene.add.image(tx * TILE + 16, ty * TILE + 16, 'ground_green', rng.between(0, 1)).setDepth(0);
    }
  }

  const colliders = scene.physics.add.staticGroup();
  // tree ring around the field
  for (let tx = 1; tx < MAP_W - 1; tx += 2) {
    addTree(scene, colliders, tx + rng.realInRange(-0.3, 0.3), 1.6, rng.between(0, 2));
    addTree(scene, colliders, tx + rng.realInRange(-0.3, 0.3), MAP_H - 0.6, rng.between(0, 2));
  }
  for (let ty = 3; ty < MAP_H - 1; ty += 2) {
    addTree(scene, colliders, 0.8, ty, rng.between(0, 2));
    addTree(scene, colliders, MAP_W - 0.8, ty, rng.between(0, 2));
  }

  scene.physics.world.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
  scene.cameras.main.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
  return { colliders, points: POINTS };
}

function addTree(scene, colliders, x, y, frame) {
  const px = x * TILE;
  const py = y * TILE;
  const img = scene.add.image(px, py, 'evergreen', frame).setOrigin(0.5, 1);
  img.setDepth(py);
  const trunk = scene.add.zone(px, py - 10, 26, 18);
  scene.physics.add.existing(trunk, true);
  colliders.add(trunk);
}
