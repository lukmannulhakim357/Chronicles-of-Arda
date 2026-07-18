import Phaser from 'phaser';
import { TILE } from '../config.js';
import { tilesToPx } from './coords.js';

export { tilesToPx };

// Waypoint 9 — The Falas, the western shore. Open sandy ground reusing
// Rhovanion's scatter technique (no dedicated beach tile exists, so
// ground_green gets a warm sand tint instead), with the Sea itself as an
// impassable water band along the western edge — the literal end of the
// road on foot, same "water" tile/collider technique Vales of Anduin's
// river already established.

export const MAP_W = 40;
export const MAP_H = 26;

export const POINTS = {
  spawn: { x: 34, y: 14 },
  shipwright: { x: 14, y: 14 },
  ambush: { x: 20, y: 14 },
  farewell: { x: 9, y: 14 },
  pathOut: { x: 36, y: 22 },
};

const SEA_WIDTH_TILES = 6;

export function build(scene) {
  const rng = new Phaser.Math.RandomDataGenerator(['falas']);

  buildGround(scene, rng);
  const colliders = scene.physics.add.staticGroup();
  buildSea(scene, colliders);
  scatterShore(scene, colliders, rng);

  scene.physics.world.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
  scene.cameras.main.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);

  return { colliders, points: POINTS };
}

function buildGround(scene, rng) {
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      scene.add.image(tx * TILE + 16, ty * TILE + 16, 'ground_green', rng.between(0, 1)).setDepth(0).setTint(0xd9c48a);
    }
  }
  for (let i = 0; i < 180; i++) {
    const tx = rng.between(SEA_WIDTH_TILES, MAP_W - 1);
    const ty = rng.between(0, MAP_H - 1);
    scene.add
      .image(tx * TILE + rng.between(-8, 8), ty * TILE + rng.between(-8, 8), 'grasses', rng.between(0, 3))
      .setDepth(1)
      .setAlpha(0.75)
      .setTint(0xc8d89a);
  }
}

// The Great Sea itself — an impassable band along the western edge. This
// is the actual end of the road on foot; the Crossing (Waypoint 10) is a
// separate cutscene-driven step, not a walk-out point from this zone.
function buildSea(scene, colliders) {
  for (let tx = 0; tx < SEA_WIDTH_TILES; tx++) {
    for (let ty = 0; ty < MAP_H; ty++) {
      scene.add.image(tx * TILE + 16, ty * TILE + 16, 'water', 0).setDepth(2);
    }
  }
  const band = scene.add.zone((SEA_WIDTH_TILES * TILE) / 2, (MAP_H * TILE) / 2, SEA_WIDTH_TILES * TILE, MAP_H * TILE);
  scene.physics.add.existing(band, true);
  colliders.add(band);
}

// Driftwood-sparse dunes rather than a forest — a handful of rocks and
// lone pines near the tree line on the eastern edge (where the host just
// came from), thinning out toward the water.
function scatterShore(scene, colliders, rng) {
  for (let i = 0; i < 10; i++) {
    const tx = rng.between(SEA_WIDTH_TILES + 1, MAP_W - 2);
    const ty = rng.between(2, MAP_H - 2);
    const px = tx * TILE;
    const py = ty * TILE;
    const key = rng.frac() > 0.5 ? 'rocks' : 'rock_cluster';
    const img = scene.add.image(px, py, key).setOrigin(0.5, 1).setDepth(py);
    const zone = scene.add.zone(px, py - img.height * 0.2, img.width * 0.6, img.height * 0.3);
    scene.physics.add.existing(zone, true);
    colliders.add(zone);
  }
  for (let i = 0; i < 8; i++) {
    const tx = rng.between(MAP_W - 10, MAP_W - 2);
    const ty = rng.between(2, MAP_H - 2);
    const px = tx * TILE;
    const py = ty * TILE;
    const img = scene.add.image(px, py, 'pine_tree').setOrigin(0.5, 1).setDepth(py);
    const zone = scene.add.zone(px, py - img.height * 0.25, img.width * 0.6, img.height * 0.35);
    scene.physics.add.existing(zone, true);
    colliders.add(zone);
  }
}
