import Phaser from 'phaser';
import { TILE } from '../config.js';
import { tilesToPx } from './coords.js';

export { tilesToPx };

// Waypoint 4 — Vales of Anduin. An open river valley below the Misty
// Mountains: the Anduin runs along the northern edge, the mountains'
// foothills rise along the western edge (where the path west, toward
// Waypoint 5, begins). Much more open than the Great Forest's winding
// corridor — this is a valley, not a maze.

export const MAP_W = 40;
export const MAP_H = 26;

export const POINTS = {
  spawn: { x: 36, y: 16 },
  lenwe: { x: 10, y: 9 },
  trainer: { x: 19, y: 14 },
  kenalan: { x: 23, y: 18 },
  practiceSpot: { x: 13, y: 19 },
  pathOut: { x: 2, y: 15 },
};

export function build(scene) {
  const rng = new Phaser.Math.RandomDataGenerator(['valesanduin']);

  buildGround(scene, rng);
  const colliders = scene.physics.add.staticGroup();
  buildRiver(scene, colliders);
  buildFoothills(scene, colliders, rng);
  scatterRocks(scene, colliders, rng);

  scene.physics.world.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
  scene.cameras.main.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);

  return { colliders, points: POINTS };
}

function buildGround(scene, rng) {
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      scene.add.image(tx * TILE + 16, ty * TILE + 16, 'ground_green', rng.between(0, 1)).setDepth(0).setTint(0x8fae8a);
    }
  }
  for (let i = 0; i < 200; i++) {
    const tx = rng.between(0, MAP_W - 1);
    const ty = rng.between(9, MAP_H - 1);
    scene.add
      .image(tx * TILE + rng.between(-8, 8), ty * TILE + rng.between(-8, 8), 'grasses', rng.between(0, 3))
      .setDepth(1)
      .setAlpha(0.85);
  }
}

// The Anduin: a wide, impassable water band along the northern edge — the
// host walks the southern bank, same technique the world/tile inventory
// already supports (no new art needed).
function buildRiver(scene, colliders) {
  for (let tx = 0; tx < MAP_W; tx++) {
    for (let ty = 4; ty <= 8; ty++) {
      scene.add.image(tx * TILE + 16, ty * TILE + 16, 'water', 0).setDepth(2);
    }
  }
  const band = scene.add.zone((MAP_W * TILE) / 2, 6.5 * TILE, MAP_W * TILE, 5 * TILE);
  scene.physics.add.existing(band, true);
  colliders.add(band);
}

// The Misty Mountains' foothills, rising along the western edge — where
// the path west (toward Waypoint 5) begins.
function buildFoothills(scene, colliders, rng) {
  for (let ty = 10; ty < MAP_H - 1; ty += 2) {
    for (let tx = 0; tx < 3; tx++) {
      if (rng.frac() > 0.55) continue;
      addBoulder(scene, colliders, tx + rng.realInRange(-0.2, 0.2), ty + rng.realInRange(-0.2, 0.2));
    }
  }
}

function addBoulder(scene, colliders, x, y) {
  const px = x * TILE;
  const py = y * TILE;
  const img = scene.add.image(px, py, 'large_boulder').setOrigin(0.5, 1).setDepth(py);
  const zone = scene.add.zone(px, py - img.height * 0.25, img.width * 0.7, img.height * 0.4);
  scene.physics.add.existing(zone, true);
  colliders.add(zone);
}

function scatterRocks(scene, colliders, rng) {
  for (let i = 0; i < 12; i++) {
    const tx = rng.between(5, MAP_W - 2);
    const ty = rng.between(11, MAP_H - 2);
    const px = tx * TILE;
    const py = ty * TILE;
    const key = rng.frac() > 0.5 ? 'rocks' : 'rock_cluster';
    const img = scene.add.image(px, py, key).setOrigin(0.5, 1).setDepth(py);
    const zone = scene.add.zone(px, py - img.height * 0.2, img.width * 0.6, img.height * 0.3);
    scene.physics.add.existing(zone, true);
    colliders.add(zone);
  }
}
