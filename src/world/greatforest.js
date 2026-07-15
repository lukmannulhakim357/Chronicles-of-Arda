import Phaser from 'phaser';
import { TILE } from '../config.js';
import { tilesToPx } from './coords.js';

export { tilesToPx };

// Waypoint 3 — The Great Forest.
// Dense, dark woodland — "a wood with no stars overhead" (concept doc
// §13.1). A single winding clearing threads west→east through heavy tree
// cover; quest "Lost Before Nightfall" plays out here.

export const MAP_W = 48;
export const MAP_H = 30;

export const POINTS = {
  spawn: { x: 4, y: 15 },
  randir: { x: 7, y: 14 },
  stray1: { x: 16, y: 9 }, // Isilmë
  stray2: { x: 28, y: 21 }, // Ancalimë
  clearing: { x: 36, y: 15 }, // Randir catches up, gives the weapon
  ambush: { x: 40, y: 15 }, // the wolf
  pathOut: { x: 44, y: 15 },
};

export function build(scene) {
  const rng = new Phaser.Math.RandomDataGenerator(['greatforest']);

  buildGround(scene, rng);
  const colliders = scene.physics.add.staticGroup();
  buildTreeWalls(scene, colliders, rng);

  scene.physics.world.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
  scene.cameras.main.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);

  return { colliders, points: POINTS };
}

function buildGround(scene, rng) {
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      scene.add.image(tx * TILE + 16, ty * TILE + 16, 'ground_green', rng.between(0, 1)).setDepth(0).setTint(0x7fa27f);
    }
  }
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

function addFirCluster(scene, colliders, x, y, key) {
  const px = x * TILE;
  const py = y * TILE;
  const img = scene.add.image(px, py, key).setOrigin(0.5, 1).setDepth(py);
  const zone = scene.add.zone(px, py - img.height * 0.3, img.width * 0.7, img.height * 0.4);
  scene.physics.add.existing(zone, true);
  colliders.add(zone);
}

// A winding clear corridor (roughly y = 12..18, drifting) threads the map
// west→east; everything outside it is thick tree cover, dense enough that
// the game reads as "no stars overhead" even before night deepens further.
function corridorHalfWidth(tx) {
  return 4 + Math.sin(tx / 6) * 1.5;
}

function corridorCenter(tx) {
  return 15 + Math.sin(tx / 9) * 3;
}

function buildTreeWalls(scene, colliders, rng) {
  for (let tx = 2; tx < MAP_W - 2; tx += 2) {
    const center = corridorCenter(tx);
    const half = corridorHalfWidth(tx);
    for (let ty = 2; ty < MAP_H - 2; ty += 2) {
      if (Math.abs(ty - center) < half) continue; // keep the corridor clear
      if (rng.frac() > 0.35) continue; // still leave some breathing room
      const jx = tx + rng.realInRange(-0.6, 0.6);
      const jy = ty + rng.realInRange(-0.6, 0.6);
      if (rng.frac() > 0.5) addTree(scene, colliders, jx, jy, rng.between(0, 2));
      else addFirCluster(scene, colliders, jx, jy, rng.frac() > 0.5 ? 'fir_trees' : 'pine_tree');
    }
  }
  // a denser fringe right along both map edges, so the corridor never
  // opens onto open ground
  for (let tx = 1; tx < MAP_W - 1; tx += 2) {
    addTree(scene, colliders, tx + rng.realInRange(-0.3, 0.3), 1.4, rng.between(0, 2));
    addTree(scene, colliders, tx + rng.realInRange(-0.3, 0.3), MAP_H - 1.4, rng.between(0, 2));
  }
}
