import Phaser from 'phaser';
import { TILE } from '../config.js';
import { tilesToPx } from './coords.js';

export { tilesToPx };

// Waypoint 8 — Beleriand & Neldoreth. Nan Elmoth, the forest Elwë walked
// into and never walked out of. Reuses the Great Forest's winding-corridor
// technique (dense tree cover either side of a clear path) but tinted
// deeper and cooler — a forest under Melian's enchantment, not merely dark.

export const MAP_W = 46;
export const MAP_H = 28;

export const POINTS = {
  spawn: { x: 4, y: 14 },
  olwe: { x: 7, y: 14 },
  search1: { x: 15, y: 8 },
  search2: { x: 23, y: 20 },
  search3: { x: 32, y: 13 }, // Elwë's last trace, deepest into Nan Elmoth
  eglath: { x: 7, y: 14 }, // the farewell happens back at the camp, by Olwë
  pathOut: { x: 41, y: 13 },
};

export function build(scene) {
  const rng = new Phaser.Math.RandomDataGenerator(['beleriand']);

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
      // a deeper, cooler green than the Great Forest's — Melian's
      // enchantment reads as something more than ordinary shade
      scene.add.image(tx * TILE + 16, ty * TILE + 16, 'ground_green', rng.between(0, 1)).setDepth(0).setTint(0x5a7f7a);
    }
  }
}

function addTree(scene, colliders, x, y, frame) {
  const px = x * TILE;
  const py = y * TILE;
  const img = scene.add.image(px, py, 'evergreen', frame).setOrigin(0.5, 1).setTint(0x6a8a9a);
  img.setDepth(py);
  const trunk = scene.add.zone(px, py - 10, 26, 18);
  scene.physics.add.existing(trunk, true);
  colliders.add(trunk);
}

function addFirCluster(scene, colliders, x, y, key) {
  const px = x * TILE;
  const py = y * TILE;
  const img = scene.add.image(px, py, key).setOrigin(0.5, 1).setDepth(py).setTint(0x6a8a9a);
  const zone = scene.add.zone(px, py - img.height * 0.3, img.width * 0.7, img.height * 0.4);
  scene.physics.add.existing(zone, true);
  colliders.add(zone);
}

// A winding clear corridor threads the map west→east, same technique as
// the Great Forest — dense enough either side to feel like Nan Elmoth's
// tangled dark, without needing new art.
function corridorHalfWidth(tx) {
  return 4 + Math.sin(tx / 6) * 1.5;
}

function corridorCenter(tx) {
  return 14 + Math.sin(tx / 9) * 3;
}

function buildTreeWalls(scene, colliders, rng) {
  for (let tx = 2; tx < MAP_W - 2; tx += 2) {
    const center = corridorCenter(tx);
    const half = corridorHalfWidth(tx);
    for (let ty = 2; ty < MAP_H - 2; ty += 2) {
      if (Math.abs(ty - center) < half) continue;
      if (rng.frac() > 0.4) continue;
      const jx = tx + rng.realInRange(-0.6, 0.6);
      const jy = ty + rng.realInRange(-0.6, 0.6);
      if (rng.frac() > 0.5) addTree(scene, colliders, jx, jy, rng.between(0, 2));
      else addFirCluster(scene, colliders, jx, jy, rng.frac() > 0.5 ? 'fir_trees' : 'pine_tree');
    }
  }
  for (let tx = 1; tx < MAP_W - 1; tx += 2) {
    addTree(scene, colliders, tx + rng.realInRange(-0.3, 0.3), 1.4, rng.between(0, 2));
    addTree(scene, colliders, tx + rng.realInRange(-0.3, 0.3), MAP_H - 1.4, rng.between(0, 2));
  }
}
