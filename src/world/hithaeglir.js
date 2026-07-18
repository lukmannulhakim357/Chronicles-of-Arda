import Phaser from 'phaser';
import { TILE } from '../config.js';
import { tilesToPx } from './coords.js';

export { tilesToPx };

// Waypoint 5 — Misty Mountains (Hithaeglir). The hardest crossing of the
// march: a narrow, winding pass through grey stone. No snow/mountain tile
// art exists yet (external asset hosts are blocked by this environment's
// network policy), so the pass is built from heavily-tinted variants of
// the existing rock/boulder tiles — the same "clearly-marked placeholder
// via tint" convention already used for the WP1 shadow-servant and the
// WP3 wolf, reskinned here as stacked mountain stone instead of trees.

export const MAP_W = 44;
export const MAP_H = 28;

export const POINTS = {
  spawn: { x: 4, y: 14 },
  herbmasterSpot: { x: 10, y: 13 },
  rangerSpot: { x: 20, y: 16 },
  bossSpot: { x: 32, y: 14 },
  oromeSpot: { x: 38, y: 14 },
  pathOut: { x: 41, y: 14 },
};

export function build(scene) {
  const rng = new Phaser.Math.RandomDataGenerator(['hithaeglir']);

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
      // desaturated toward grey-blue stone/snow
      scene.add.image(tx * TILE + 16, ty * TILE + 16, 'ground_green', rng.between(0, 1)).setDepth(0).setTint(0x9aa4b0);
    }
  }
}

function addBoulder(scene, colliders, x, y, key) {
  const px = x * TILE;
  const py = y * TILE;
  const img = scene.add.image(px, py, key).setOrigin(0.5, 1).setDepth(py).setTint(0xc4ccd6);
  const zone = scene.add.zone(px, py - img.height * 0.25, img.width * 0.7, img.height * 0.4);
  scene.physics.add.existing(zone, true);
  colliders.add(zone);
}

// A winding clear pass (roughly y = 12..18, drifting) threads the map
// west→east; everything outside it is stacked stone — the same technique
// greatforest.js uses for tree cover, reskinned as a mountainside.
function corridorHalfWidth(tx) {
  return 3.5 + Math.sin(tx / 7) * 1.2;
}

function corridorCenter(tx) {
  return 15 + Math.sin(tx / 10) * 2.5;
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
