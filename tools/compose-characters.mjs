// Composites LPC character layers into single universal spritesheets (832x1344).
//
// Layer sources are the Universal LPC Spritesheet Character Generator repo:
//   https://github.com/sanderfrenken/Universal-LPC-Spritesheet-Character-Generator
// (see CREDITS.md at the repo root for per-layer authors and licenses).
//
// Usage:
//   node tools/compose-characters.mjs /path/to/Universal-LPC-Spritesheet-Character-Generator
//
// Output: public/assets/characters/<name>.png
// The composed sheets keep the classic LPC universal layout (21 rows of 64px):
//   rows 0-3 spellcast, 4-7 thrust, 8-11 walk, 12-15 slash, 16-19 shoot, 20 hurt
//   (each 4-row group is ordered up, left, down, right)

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const SRC = process.argv[2];
if (!SRC) {
  console.error('usage: node tools/compose-characters.mjs <path-to-lpc-generator-repo>');
  process.exit(1);
}

const W = 832;
const H = 1344; // classic universal sheet height; source layers may be taller

const L = {
  bodyMaleLight: 'spritesheets/body/bodies/male/light.png',
  bodyMaleBronze: 'spritesheets/body/bodies/male/bronze.png',
  bodyMaleBlack: 'spritesheets/body/bodies/male/black.png',
  bodyFemaleLight: 'spritesheets/body/bodies/female/light.png',
  headMaleLight: 'spritesheets/head/heads/human/male/light.png',
  headMaleBronze: 'spritesheets/head/heads/human/male/bronze.png',
  headMaleBlack: 'spritesheets/head/heads/human/male/black.png',
  headFemaleLight: 'spritesheets/head/heads/human/female/light.png',
  earsElvenLight: 'spritesheets/head/ears/elven/adult/light.png',
  hairBlonde: 'spritesheets/hair/curtains_long/male/blonde.png',
  hairBlack: 'spritesheets/hair/curtains_long/male/black.png',
  hairPlatinum: 'spritesheets/hair/curtains_long/male/platinum.png',
  hairBrown: 'spritesheets/hair/curtains_long/male/dark_brown.png',
  hairBraidBlack: 'spritesheets/hair/braid/female/black.png',
  hairBraidPlatinum: 'spritesheets/hair/braid/female/platinum.png',
  torsoWhite: 'spritesheets/torso/clothes/longsleeve/longsleeve/male/white.png',
  torsoNavy: 'spritesheets/torso/clothes/longsleeve/longsleeve/male/navy.png',
  torsoBluegray: 'spritesheets/torso/clothes/longsleeve/longsleeve/male/bluegray.png',
  torsoMaroon: 'spritesheets/torso/clothes/longsleeve/longsleeve/male/maroon.png',
  torsoLeather: 'spritesheets/torso/clothes/longsleeve/longsleeve/male/leather.png',
  torsoForest: 'spritesheets/torso/clothes/longsleeve/longsleeve/male/forest.png',
  torsoFBlue: 'spritesheets/torso/clothes/longsleeve/longsleeve/female/blue.png',
  torsoFMaroon: 'spritesheets/torso/clothes/longsleeve/longsleeve/female/maroon.png',
  legsGray: 'spritesheets/legs/pants/male/gray.png',
  legsBrown: 'spritesheets/legs/pants/male/brown.png',
  legsNavy: 'spritesheets/legs/pants/male/navy.png',
  legsBlack: 'spritesheets/legs/pants/male/black.png',
  legsFBlack: 'spritesheets/legs/pants/female/black.png',
  feetBrown: 'spritesheets/feet/shoes/male/brown.png',
  feetBlack: 'spritesheets/feet/shoes/male/black.png',
  feetGray: 'spritesheets/feet/shoes/male/gray.png',
  feetFBlack: 'spritesheets/feet/shoes/female/black.png',
};

// draw order: body -> feet -> legs -> torso -> head -> ears -> hair
const characters = {
  // Player, one sheet per kindred (hair color follows lore: golden Vanyar,
  // dark Noldor, silver Teleri).
  player_vanyar: ['bodyMaleLight', 'feetBrown', 'legsGray', 'torsoWhite', 'headMaleLight', 'earsElvenLight', 'hairBlonde'],
  player_noldor: ['bodyMaleLight', 'feetBlack', 'legsBlack', 'torsoNavy', 'headMaleLight', 'earsElvenLight', 'hairBlack'],
  player_teleri: ['bodyMaleLight', 'feetGray', 'legsNavy', 'torsoBluegray', 'headMaleLight', 'earsElvenLight', 'hairPlatinum'],
  // Quest NPCs (waypoint 1)
  npc_elder: ['bodyFemaleLight', 'feetFBlack', 'legsFBlack', 'torsoFBlue', 'headFemaleLight', 'earsElvenLight', 'hairBraidBlack'],
  npc_kinswoman: ['bodyFemaleLight', 'feetFBlack', 'legsFBlack', 'torsoFMaroon', 'headFemaleLight', 'earsElvenLight', 'hairBraidPlatinum'],
  npc_kinsman: ['bodyMaleLight', 'feetBrown', 'legsBrown', 'torsoMaroon', 'headMaleLight', 'earsElvenLight', 'hairBrown'],
  npc_elf_hunter: ['bodyMaleLight', 'feetBlack', 'legsBrown', 'torsoForest', 'headMaleLight', 'earsElvenLight', 'hairBrown'],
  // Oromë the Vala — bronze skin, hunter's leathers; scaled up in-engine.
  npc_orome: ['bodyMaleBronze', 'feetBlack', 'legsBrown', 'torsoLeather', 'headMaleBronze', 'hairBrown'],
  // Shadow-servant of Melkor — bare black body/head, tinted further in-engine.
  npc_shadow: ['bodyMaleBlack', 'headMaleBlack'],
};

const OUT = path.resolve('public/assets/characters');
await mkdir(OUT, { recursive: true });

async function layerTop(rel) {
  // crop each source layer to the classic 832x1344 region
  const img = sharp(path.join(SRC, rel));
  const meta = await img.metadata();
  if (meta.width !== W) throw new Error(`${rel}: unexpected width ${meta.width}`);
  const h = Math.min(meta.height, H);
  return img.extract({ left: 0, top: 0, width: W, height: h }).png().toBuffer();
}

for (const [name, layerNames] of Object.entries(characters)) {
  const buffers = [];
  for (const ln of layerNames) {
    if (!L[ln]) throw new Error(`unknown layer ${ln}`);
    buffers.push(await layerTop(L[ln]));
  }
  const base = sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  const out = path.join(OUT, `${name}.png`);
  await base.composite(buffers.map((input) => ({ input, left: 0, top: 0 }))).png().toFile(out);
  console.log('composed', out);
}
console.log('done');
