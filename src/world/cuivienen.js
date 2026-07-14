import Phaser from 'phaser';
import { TILE } from '../config.js';

// Waypoint 1 — Cuiviénen, the Waters of Awakening.
// A starlit lakeshore: grass plain, the mere along the eastern edge,
// the camp of the host near the water, and a rocky trail to the north-east
// where the quest "The Vanishing" plays out.

export const MAP_W = 60; // tiles
export const MAP_H = 40;

// key positions (in tiles)
export const POINTS = {
  spawn: { x: 22, y: 26 },
  camp: { x: 24, y: 24 },
  elder: { x: 26, y: 23 },
  kinswoman: { x: 23, y: 22 },
  hunter: { x: 21, y: 25 },
  clue1: { x: 32, y: 18 },
  clue2: { x: 38, y: 12 },
  clue3: { x: 42, y: 7.5 },
  naro: { x: 44, y: 6 },
  oromeEntry: { x: 30, y: 38 },
};

const SHORE_COL = 46; // water from this tile column eastwards

export function tilesToPx(p) {
  return { x: p.x * TILE + TILE / 2, y: p.y * TILE + TILE / 2 };
}

export function build(scene) {
  const rng = new Phaser.Math.RandomDataGenerator(['cuivienen']);

  buildGround(scene, rng);
  const colliders = scene.physics.add.staticGroup();
  buildWater(scene, colliders, rng);
  buildDecor(scene, colliders, rng);

  scene.physics.world.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
  scene.cameras.main.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);

  return { colliders, points: POINTS, shoreCol: SHORE_COL };
}

function buildGround(scene, rng) {
  // plain night-grass fill (solid CC0 tiles — dark green reads well under
  // the starlight overlay)
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx <= SHORE_COL; tx++) {
      scene.add.image(tx * TILE + 16, ty * TILE + 16, 'ground_green', rng.between(0, 1)).setDepth(0);
    }
  }
}

function buildWater(scene, colliders, rng) {
  // the mere: eastern strip; flat fill frames come from the calm rows of
  // water.png (3 cols x 8 rows), the wavy row-4 tiles (frames 12-14) become
  // the vertical shoreline by rotating them 90° CCW so the crest faces land
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = SHORE_COL + 1; tx < MAP_W; tx++) {
      const f = 3 + rng.between(0, 2); // medium-blue calm row
      scene.add.image(tx * TILE + 16, ty * TILE + 16, 'water', f).setDepth(0);
    }
    const edge = scene.add.image((SHORE_COL + 0.5) * TILE, ty * TILE + 16, 'water', 12 + rng.between(0, 2));
    edge.setRotation(-Math.PI / 2).setDepth(0);

    // star reflections twinkling on the water
    if (ty % 2 === 0) {
      const sx = (SHORE_COL + 2 + rng.between(0, MAP_W - SHORE_COL - 4)) * TILE;
      const sy = ty * TILE + rng.between(0, TILE);
      const star = scene.add.image(sx, sy, 'px-star').setAlpha(rng.realInRange(0.2, 0.8)).setDepth(1);
      scene.tweens.add({
        targets: star,
        alpha: 0.05,
        duration: rng.between(800, 2400),
        yoyo: true,
        repeat: -1,
        delay: rng.between(0, 1500),
      });
    }
  }
  // one collider for the whole mere
  const water = scene.add.zone(
    ((SHORE_COL + MAP_W) / 2 + 0.25) * TILE,
    (MAP_H / 2) * TILE,
    (MAP_W - SHORE_COL - 0.5) * TILE,
    MAP_H * TILE
  );
  scene.physics.add.existing(water, true);
  colliders.add(water);
}

function addTree(scene, colliders, x, y, kind, frame) {
  const px = x * TILE;
  const py = y * TILE;
  const img =
    kind === 'evergreen'
      ? scene.add.image(px, py, 'evergreen', frame)
      : scene.add.image(px, py, kind);
  img.setOrigin(0.5, 1); // stand on its base
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
  // forests hemming the plain: west edge and north-west
  const treeSpots = [];
  for (let y = 3; y < MAP_H - 2; y += 2) {
    treeSpots.push([1 + rng.realInRange(0, 1.6), y + rng.realInRange(-0.5, 0.5)]);
    if (rng.frac() > 0.45) treeSpots.push([3.5 + rng.realInRange(0, 1.6), y + rng.realInRange(0, 1)]);
  }
  for (let x = 6; x < 34; x += 2) {
    treeSpots.push([x + rng.realInRange(-0.5, 0.5), 2.4 + rng.realInRange(0, 1.4)]);
  }
  // southern scattered trees
  for (let x = 8; x < 42; x += 5) {
    if (rng.frac() > 0.35) treeSpots.push([x + rng.realInRange(-1, 1), MAP_H - 2 + rng.realInRange(-1.2, 0)]);
  }
  for (const [x, y] of treeSpots) {
    addTree(scene, colliders, x, y, 'evergreen', rng.between(0, 2));
  }
  // a few pines up by the rocky trail
  addTree(scene, colliders, POINTS.clue2.x - 3, POINTS.clue2.y - 1, 'pine_tree');
  addTree(scene, colliders, POINTS.clue3.x - 4, POINTS.clue3.y - 2, 'pine_tree');
  addTree(scene, colliders, 10, 8, 'fir_trees');
  addTree(scene, colliders, 15, 6, 'fir_trees');

  // rocky ground near the north-east trail & shoreline stones
  addRock(scene, colliders, POINTS.clue3.x - 3, POINTS.clue3.y + 2, 'rock_cluster');
  addRock(scene, colliders, POINTS.naro.x - 1.5, POINTS.naro.y - 1.5, 'large_boulder');
  addRock(scene, colliders, POINTS.clue2.x + 2, POINTS.clue2.y - 2, 'rocks');
  addRock(scene, colliders, POINTS.clue1.x - 2, POINTS.clue1.y - 3, 'rocks');
  addRock(scene, colliders, 44, 20, 'large_boulder');
  addRock(scene, colliders, 36, 30, 'rock_cluster');

  // camp ring of pebbles
  const camp = tilesToPx(POINTS.camp);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    scene.add
      .image(camp.x + Math.cos(a) * 90, camp.y + Math.sin(a) * 64, 'large_pebble')
      .setDepth(2)
      .setScale(0.8);
  }

  // grass tufts scattered on the plain
  for (let i = 0; i < 90; i++) {
    const x = rng.between(6, SHORE_COL - 2) * TILE;
    const y = rng.between(4, MAP_H - 3) * TILE;
    scene.add.image(x, y, 'grasses', rng.between(0, 5)).setDepth(1).setAlpha(0.9);
  }
}
