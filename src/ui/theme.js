import Phaser from 'phaser';

// A small "material" palette so panels/slots/borders read as an actual
// fantasy UI kit — wood, worn leather, parchment, tempered steel — instead
// of the flat single-tone navy rectangles the whole game used before this
// pass. Everything here is procedural (Graphics-drawn), matching the rest
// of the project's art pipeline (no external asset files are loaded
// anywhere, including character/skill art — see fx/skillicons.js).
export const MATERIALS = {
  wood: { base: 0x7a5230, dark: 0x4a3018, light: 0x9a6c40, edge: 0x2c1c0f },
  leather: { base: 0x6e4a30, dark: 0x452e1c, light: 0x8f6540, edge: 0x2a1c10 },
  parchment: { base: 0xe6d8b0, dark: 0xc7b587, light: 0xf3e8c8, edge: 0x8a7548 },
  slate: { base: 0x232840, dark: 0x141828, light: 0x323a5c, edge: 0x0c0e18 },
};

// Armor "weight class" look — the paperdoll should read at a glance which
// kind of piece sits in a slot even before the name is read: heavy is cold
// tempered steel, light is warm stitched hide, robe is dyed cloth with a
// pale trim. Anything without a recognized armorType falls back to 'light'.
export const ARMOR_STYLES = {
  heavy: { base: 0x6d7480, dark: 0x454b56, light: 0xb9c2d1, border: 0xd7dee8, label: 'Heavy' },
  light: { base: 0x7a5230, dark: 0x4a3018, light: 0xa87c4a, border: 0xd9a35c, label: 'Light' },
  robe: { base: 0x4a3a74, dark: 0x2c2248, light: 0x8672b8, border: 0xc9a8f0, label: 'Robe' },
};

export function armorStyle(armorType) {
  return ARMOR_STYLES[armorType] ?? ARMOR_STYLES.light;
}

// Draws a beveled, grained panel sized to the caller's exact w/h. This is
// intentionally NOT a pre-baked texture stretched to fit — panel sizes vary
// per device/scene throughout this game, and stretching a baked grain
// texture would smear the streaks and corner rivets. Returns a Container;
// destroy it the same as any other display object (every menu scene here
// already tears down and rebuilds its whole child list on layout changes).
export function drawPanel(scene, x, y, w, h, opts = {}) {
  const mat = MATERIALS[opts.material ?? 'wood'];
  const radius = opts.radius ?? 10;
  const cont = scene.add.container(x, y);
  const g = scene.add.graphics();
  // drop-shadow / outer edge
  g.fillStyle(0x000000, 0.28);
  g.fillRoundedRect(-w / 2 - 2, -h / 2 + 1, w + 4, h + 4, radius + 2);
  // base fill
  g.fillStyle(mat.base, opts.alpha ?? 0.97);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
  // grain streaks — skip on tiny panels, where it reads as noise not wood
  if (opts.grain !== false && w > 40 && h > 30) {
    const rows = Math.floor(h / 7);
    for (let i = 0; i < rows; i++) {
      const yy = -h / 2 + 5 + i * 7;
      g.lineStyle(1, i % 2 === 0 ? mat.light : mat.dark, 0.14);
      g.lineBetween(-w / 2 + 5, yy, w / 2 - 5, yy);
    }
  }
  g.lineStyle(2, mat.edge, 1);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
  g.lineStyle(1, mat.light, 0.4);
  g.strokeRoundedRect(-w / 2 + 3, -h / 2 + 3, Math.max(0, w - 6), Math.max(0, h - 6), Math.max(0, radius - 3));
  cont.add(g);
  if (opts.rivets) {
    const inset = 9;
    [
      [-w / 2 + inset, -h / 2 + inset],
      [w / 2 - inset, -h / 2 + inset],
      [-w / 2 + inset, h / 2 - inset],
      [w / 2 - inset, h / 2 - inset],
    ].forEach(([rx, ry]) => cont.add(scene.add.circle(rx, ry, 2.4, 0xd9b968, 0.85)));
  }
  cont.setSize(w, h);
  if (opts.depth != null) cont.setDepth(opts.depth);
  return cont;
}

// The Inventory pack specifically reads as a satchel: a leather panel with
// a stitched flap-and-buckle flourish across the top, per the "tas warna
// coklat" (brown bag) request.
export function drawBagPanel(scene, x, y, w, h, opts = {}) {
  const cont = drawPanel(scene, x, y, w, h, { material: 'leather', radius: 14, rivets: true, ...opts });
  const g = scene.add.graphics();
  const flapW = Math.min(70, w * 0.4);
  g.fillStyle(0x5a3c24, 0.9);
  g.fillRoundedRect(-flapW / 2, -h / 2 - 6, flapW, 16, 6);
  g.lineStyle(2, 0x2a1c10, 1);
  g.strokeRoundedRect(-flapW / 2, -h / 2 - 6, flapW, 16, 6);
  g.fillStyle(0xd9b968, 0.9);
  g.fillCircle(0, -h / 2 + 2, 4);
  g.lineStyle(1.5, 0x2a1c10, 0.8);
  g.strokeCircle(0, -h / 2 + 2, 4);
  cont.add(g);
  return cont;
}

// ---------- item-slot-type silhouette icons ----------
// One glyph per equipment slot (helmet/breastplate/gauntlet/boot/ring/sword)
// so an empty slot still reads as "this is where a Head item goes" instead
// of the plain-text "Empty" label used before. Drawn white so callers can
// setTint() them per state (dim gray when empty/locked, armor-type color or
// gold when filled) — the same technique fx/skillicons.js already uses.
const SLOT_ICON_SIZE = 24;

function ensureSlotIcon(scene, key, draw) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ add: false });
  draw(g);
  g.generateTexture(key, SLOT_ICON_SIZE, SLOT_ICON_SIZE);
  g.destroy();
}

export function ensureItemTypeIcons(scene) {
  const c = SLOT_ICON_SIZE / 2;
  ensureSlotIcon(scene, 'slot-icon-head', (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(c, c - 2, 16, 13); // helmet dome
    g.fillRect(c - 9, c + 2, 18, 4); // brim
    g.fillStyle(0x000000, 0.55);
    g.fillRect(c - 2, c - 5, 4, 6); // visor slit
  });
  ensureSlotIcon(scene, 'slot-icon-chest', (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(c - 8, c - 9, 16, 18, 3); // torso plate
    g.fillTriangle(c - 9, c - 8, c - 1, c - 2, c - 9, c + 3); // left pauldron
    g.fillTriangle(c + 9, c - 8, c + 1, c - 2, c + 9, c + 3); // right pauldron
    g.fillStyle(0x000000, 0.35);
    g.fillRect(c - 1, c - 7, 2, 15); // center seam
  });
  ensureSlotIcon(scene, 'slot-icon-gloves', (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(c - 6, c - 1, 12, 11, 3); // palm
    for (let i = 0; i < 4; i++) g.fillRoundedRect(c - 6 + i * 3.2, c - 9, 2.6, 9, 1.2); // fingers
    g.fillRoundedRect(c + 6, c + 2, 4, 6, 1.5); // thumb
  });
  ensureSlotIcon(scene, 'slot-icon-boots', (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(c - 4, c - 9, 8, 12, 2); // shaft
    g.fillRoundedRect(c - 7, c + 2, 15, 6, 2); // foot
    g.fillStyle(0x000000, 0.3);
    g.fillRect(c - 4, c + 5, 15, 1.5); // sole line
  });
  ensureSlotIcon(scene, 'slot-icon-accessory', (g) => {
    g.lineStyle(3, 0xffffff, 1);
    g.strokeCircle(c, c + 3, 6); // ring band
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(c - 3, c - 5, c + 3, c - 5, c, c - 11); // gem facet
    g.fillTriangle(c - 3, c - 5, c + 3, c - 5, c, c + 1);
  });
  ensureSlotIcon(scene, 'slot-icon-weapon', (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRect(c - 1.5, c - 10, 3, 14); // blade
    g.fillTriangle(c - 1.5, c - 10, c + 1.5, c - 10, c, c - 13); // tip
    g.fillRect(c - 6, c + 3, 12, 2.6); // crossguard
    g.fillRect(c - 1.5, c + 5, 3, 6); // grip
    g.fillCircle(c, c + 11, 2); // pommel
  });
  // trade/crafting goods (Sturdy Hide etc.) aren't equippable, so they get
  // their own bundle-of-goods silhouette instead of a paperdoll-slot icon
  ensureSlotIcon(scene, 'slot-icon-material', (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(c - 7, c - 4, 14, 11, 3); // bundle body
    g.lineStyle(2, 0x000000, 0.35);
    g.lineBetween(c - 7, c - 4, c + 7, c - 4); // fold line across the top
    g.fillTriangle(c - 3, c - 10, c + 3, c - 10, c, c - 4); // tied bunch above the fold
  });
}

export function slotIconTexture(slotKey) {
  return `slot-icon-${slotKey}`;
}
