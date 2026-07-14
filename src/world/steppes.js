import Phaser from 'phaser';
import { TILE } from '../config.js';
import { tilesToPx } from './coords.js';

export { tilesToPx };

// Waypoint 2 — The Steppes.
// Open grassland split by a river; a single ford crossing leads to the
// far bank where the host has moved on. Quest "The Stragglers" plays out
// here — escort Míriel, forage/hunt along the way, then cross.

export const MAP_W = 64;
export const MAP_H = 28;

const RIVER_TOP = 12;
const RIVER_BOTTOM = 16; // rows RIVER_TOP..RIVER_BOTTOM-1 are river
const FORD_LEFT = 30;
const FORD_RIGHT = 36; // columns FORD_LEFT..FORD_RIGHT-1 are the fordable gap

export const POINTS = {
  spawn: { x: 10, y: 22 },
  miriel: { x: 12, y: 20 },
  tarion: { x: 8, y: 21 },
  forage1: { x: 20, y: 18 },
  forage2: { x: 44, y: 17 },
  hunt1: { x: 32, y: 19 },
  crossing: { x: 32.5, y: 8 },
};

export function build(scene) {
  const rng = new Phaser.Math.RandomDataGenerator(['steppes']);

  buildGround(scene, rng);
  const colliders = scene.physics.add.staticGroup();
  buildRiver(scene, colliders, rng);
  buildDecor(scene, colliders, rng);

  scene.physics.world.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
  scene.cameras.main.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);

  return { colliders, points: POINTS };
}

function buildGround(scene, rng) {
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      scene.add.image(tx * TILE + 16, ty * TILE + 16, 'ground_green', rng.between(0, 1)).setDepth(0);
    }
  }
}

function buildRiver(scene, colliders, rng) {
  for (let ty = RIVER_TOP; ty < RIVER_BOTTOM; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const f = 3 + rng.between(0, 2); // calm-water row
      scene.add.image(tx * TILE + 16, ty * TILE + 16, 'water', f).setDepth(1);
    }
  }

  // block the river except the ford gap in the middle
  const midY = ((RIVER_TOP + RIVER_BOTTOM) / 2) * TILE;
  const h = (RIVER_BOTTOM - RIVER_TOP) * TILE;
  if (FORD_LEFT > 0) {
    const zoneLeft = scene.add.zone((FORD_LEFT / 2) * TILE, midY, FORD_LEFT * TILE, h);
    scene.physics.add.existing(zoneLeft, true);
    colliders.add(zoneLeft);
  }
  if (MAP_W - FORD_RIGHT > 0) {
    const w = (MAP_W - FORD_RIGHT) * TILE;
    const zoneRight = scene.add.zone(FORD_RIGHT * TILE + w / 2, midY, w, h);
    scene.physics.add.existing(zoneRight, true);
    colliders.add(zoneRight);
  }

  // stepping stones marking the safe crossing
  for (let i = 0; i < 6; i++) {
    const x = (FORD_LEFT + rng.realInRange(0.5, FORD_RIGHT - FORD_LEFT - 0.5)) * TILE;
    const y = (RIVER_TOP + rng.realInRange(0.4, RIVER_BOTTOM - RIVER_TOP - 0.4)) * TILE;
    scene.add.image(x, y, 'large_pebble').setDepth(2).setScale(0.85);
  }
}

function addTree(scene, colliders, x, y, kind, frame) {
  const px = x * TILE;
  const py = y * TILE;
  const img = kind === 'evergreen' ? scene.add.image(px, py, 'evergreen', frame) : scene.add.image(px, py, kind);
  img.setOrigin(0.5, 1);
  img.setDepth(py);
  const trunk = scene.add.zone(px, py - 10, 26, 18);
  scene.physics.add.existing(trunk, true);
  colliders.add(trunk);
}

function addRock(scene, colliders, x, y, key) {
  const px = x * TILE;
  const py = y * TILE;
  const img = scene.add.image(px, py, key).setOrigin(0.5, 0.75);
  img.setDepth(py - 8);
  const zone = scene.add.zone(px, py - 4, img.width * 0.8, img.height * 0.5);
  scene.physics.add.existing(zone, true);
  colliders.add(zone);
}

function buildDecor(scene, colliders, rng) {
  // sparse tree clusters at the far north and south edges only — the
  // steppe itself stays open, per "open grassland" (concept doc §13.1)
  for (let x = 4; x < MAP_W - 4; x += 4) {
    if (rng.frac() > 0.55) addTree(scene, colliders, x + rng.realInRange(-1, 1), rng.realInRange(1, 2.6), 'evergreen', rng.between(0, 2));
    if (rng.frac() > 0.6) addTree(scene, colliders, x + rng.realInRange(-1, 1), MAP_H - rng.realInRange(1, 2.6), 'evergreen', rng.between(0, 2));
  }
  addTree(scene, colliders, 6, 2, 'fir_trees');
  addTree(scene, colliders, MAP_W - 8, 2.5, 'pine_tree');

  // rocks scattered near the ford
  addRock(scene, colliders, FORD_LEFT - 2, RIVER_TOP - 2, 'rocks');
  addRock(scene, colliders, FORD_RIGHT + 2, RIVER_BOTTOM + 2, 'rock_cluster');

  // tall grass tufts across the open plain
  for (let i = 0; i < 160; i++) {
    const x = rng.between(2, MAP_W - 2) * TILE;
    const y = rng.between(2, MAP_H - 2) * TILE;
    if (y > RIVER_TOP * TILE - 16 && y < RIVER_BOTTOM * TILE + 16) continue; // keep the river clear
    scene.add.image(x, y, 'grasses', rng.between(0, 5)).setDepth(1).setAlpha(0.9);
  }
}
