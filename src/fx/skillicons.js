import Phaser from 'phaser';

// Procedural skill icons — one small (28x28) monochrome shape per skill,
// generated once from Graphics (no external art), then tinted per-kind at
// display time. Used in both the Character screen's skill tree rows and the
// HUD skill wheel, so a player sees the same glyph in both places.

// Color per skill `kind` — matches the tint families already used for the
// in-world skill VFX (fx/skillfx.js's TINT), so an icon's color always
// agrees with the burst/ring/etc. that actually plays when it's cast.
export const KIND_TINT = {
  damage: 0xd9d9e8, // physical — silver-white (magic damage skills override to blue below)
  dot: 0xe86a6a, // bleed/poison — blood red
  heal: 0x7fe89a,
  hot: 0x7fe89a,
  buff: 0xf2d06b,
  debuff: 0xb07fe8,
  cc: 0xe8a05a,
  cleanse: 0xd8f0ff,
  utility: 0xd9d9e8,
  summon: 0x6ad9c8,
  passive: 0x9aa4bc,
};
export const MAGIC_DAMAGE_TINT = 0x7fb4ff;

export function iconTint(def) {
  if ((def.kind === 'damage' || def.kind === 'dot') && def.isMagic) return MAGIC_DAMAGE_TINT;
  return KIND_TINT[def.kind] ?? 0xd9d9e8;
}

export function iconTexture(iconKey) {
  return `skill-icon-${iconKey}`;
}

// ---------- small reusable drawing primitives (all in 0..28 local coords) ----------

function arcLine(g, cx, cy, r, a0, a1, width = 3) {
  g.lineStyle(width, 0xffffff, 1);
  g.beginPath();
  g.arc(cx, cy, r, a0, a1);
  g.strokePath();
}

function burstRays(g, cx, cy, rInner, rOuter, count = 8, width = 2) {
  g.lineStyle(width, 0xffffff, 1);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    g.lineBetween(cx + Math.cos(a) * rInner, cy + Math.sin(a) * rInner, cx + Math.cos(a) * rOuter, cy + Math.sin(a) * rOuter);
  }
}

function arrowGlyph(g, x1, y1, x2, y2, headSize = 5) {
  g.lineStyle(2.5, 0xffffff, 1);
  g.lineBetween(x1, y1, x2, y2);
  const ang = Math.atan2(y2 - y1, x2 - x1);
  g.fillStyle(0xffffff, 1);
  g.fillTriangle(
    x2, y2,
    x2 - Math.cos(ang - 0.5) * headSize, y2 - Math.sin(ang - 0.5) * headSize,
    x2 - Math.cos(ang + 0.5) * headSize, y2 - Math.sin(ang + 0.5) * headSize
  );
}

function noteGlyph(g, x, y, s = 1) {
  g.fillStyle(0xffffff, 1);
  g.fillEllipse(x, y, 6 * s, 4.5 * s);
  g.fillRect(x + 2.6 * s, y - 12 * s, 1.6 * s, 12 * s);
  g.lineStyle(2 * s, 0xffffff, 1);
  g.beginPath();
  g.arc(x + 4.5 * s, y - 12 * s, 4 * s, -1.4, 0.6);
  g.strokePath();
}

function shieldOutline(g, cx, cy, w, h, fill = false) {
  g.lineStyle(2.5, 0xffffff, 1);
  const pts = [
    { x: cx - w / 2, y: cy - h / 2 },
    { x: cx + w / 2, y: cy - h / 2 },
    { x: cx + w / 2, y: cy + h * 0.05 },
    { x: cx, y: cy + h / 2 },
    { x: cx - w / 2, y: cy + h * 0.05 },
  ];
  if (fill) {
    g.fillStyle(0xffffff, 1);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.closePath();
    g.fillPath();
  } else {
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.closePath();
    g.strokePath();
  }
}

function droplet(g, x, y, s = 1) {
  g.fillStyle(0xffffff, 1);
  g.fillCircle(x, y + 3 * s, 4.5 * s);
  g.fillTriangle(x - 3.2 * s, y + 1 * s, x + 3.2 * s, y + 1 * s, x, y - 7 * s);
}

function leaf(g, cx, cy, w = 12, h = 18, rot = -0.5) {
  g.save();
  g.translateCanvas(cx, cy);
  g.rotateCanvas(rot);
  g.fillStyle(0xffffff, 1);
  g.fillEllipse(0, 0, w, h);
  g.lineStyle(1.5, 0x1a2038, 0.6);
  g.lineBetween(0, -h / 2 + 2, 0, h / 2 - 2);
  g.restore();
}

function skull(g, cx, cy, r = 6) {
  g.fillStyle(0xffffff, 1);
  g.fillCircle(cx, cy - 1, r);
  g.fillRect(cx - r * 0.7, cy - 1, r * 1.4, r * 0.9);
  g.fillStyle(0x1a2038, 1);
  g.fillCircle(cx - r * 0.38, cy - 2, r * 0.22);
  g.fillCircle(cx + r * 0.38, cy - 2, r * 0.22);
}

function crown(g, cx, cy, w = 16, h = 9) {
  g.fillStyle(0xffffff, 1);
  g.fillRect(cx - w / 2, cy, w, h * 0.4);
  g.fillTriangle(cx - w / 2, cy, cx - w / 2 + w * 0.2, cy - h, cx - w / 2 + w * 0.4, cy);
  g.fillTriangle(cx - w * 0.15, cy, cx, cy - h * 1.2, cx + w * 0.15, cy);
  g.fillTriangle(cx + w / 2 - w * 0.4, cy, cx + w / 2 - w * 0.2, cy - h, cx + w / 2, cy);
}

function chainLink(g, cx, cy) {
  g.lineStyle(2.5, 0xffffff, 1);
  g.strokeEllipse(cx - 5, cy, 8, 11);
  g.strokeEllipse(cx + 5, cy, 8, 11);
}

function hornGlyph(g, cx, cy) {
  g.fillStyle(0xffffff, 1);
  g.fillTriangle(cx - 10, cy + 7, cx + 9, cy - 6, cx + 9, cy + 8);
  g.fillStyle(0x1a2038, 0.55);
  g.fillCircle(cx - 9, cy + 7, 3.2);
}

function bannerGlyph(g, cx, cy) {
  g.fillStyle(0xffffff, 1);
  g.fillRect(cx - 1, cy - 12, 2, 24);
  g.beginPath();
  g.moveTo(cx + 1, cy - 11);
  g.lineTo(cx + 10, cy - 7);
  g.lineTo(cx + 1, cy + 1);
  g.closePath();
  g.fillPath();
}

function windLines(g, cx, cy) {
  g.lineStyle(2, 0xffffff, 1);
  [-6, 0, 6].forEach((dy, i) => {
    g.beginPath();
    g.arc(cx - 2 + i, cy + dy, 7, -0.6, 0.6);
    g.strokePath();
  });
}

function pawPrint(g, cx, cy, s = 1) {
  g.fillStyle(0xffffff, 1);
  g.fillEllipse(cx, cy + 4 * s, 8 * s, 6 * s);
  [-5, -1.7, 1.7, 5].forEach((dx) => g.fillEllipse(cx + dx * s, cy - 3 * s, 2.6 * s, 3.6 * s));
}

// ---------- the shape registry: iconKey -> draw(g) ----------

const SHAPES = {
  // warrior
  bash: (g) => { arcLine(g, 14, 16, 8, -2.4, -0.3, 3.5); burstRays(g, 14, 14, 3, 6, 6, 1.6); },
  doubleslash: (g) => { arcLine(g, 12, 14, 9, -1.3, 1.1, 3); arcLine(g, 16, 14, 9, 2.0, 4.3, 3); },
  shield: (g) => shieldOutline(g, 14, 15, 16, 20),
  blooddrip: (g) => droplet(g, 14, 15, 1.1),
  heartshield: (g) => { shieldOutline(g, 14, 16, 15, 18); g.fillStyle(0xffffff, 1); g.fillTriangle(14, 15, 10.5, 11.5, 17.5, 11.5); g.fillCircle(11.7, 10.5, 2.2); g.fillCircle(16.3, 10.5, 2.2); },
  spiral: (g) => { for (let i = 0; i < 3; i++) arcLine(g, 14, 14 + i * 0.5, 4 + i * 3.6, 0.3 + i * 0.4, 4.6 + i * 0.4, 2); },
  dome: (g) => { arcLine(g, 14, 20, 11, Math.PI, Math.PI * 2, 3); g.lineStyle(2.5, 0xffffff, 1); g.lineBetween(3, 20, 25, 20); },
  // ranger
  arrow: (g) => arrowGlyph(g, 5, 23, 23, 5, 6),
  arrowfan: (g) => { arrowGlyph(g, 5, 24, 23, 8, 5); arrowGlyph(g, 3, 16, 24, 14, 5); arrowGlyph(g, 5, 5, 21, 20, 5); },
  eye: (g) => { g.lineStyle(2.5, 0xffffff, 1); g.beginPath(); g.arc(14, 14, 9, 0.15, Math.PI - 0.15); g.strokePath(); g.beginPath(); g.arc(14, 14, 9, Math.PI + 0.15, Math.PI * 2 - 0.15); g.strokePath(); g.fillStyle(0xffffff, 1); g.fillCircle(14, 14, 3.4); },
  arrowline: (g) => { arrowGlyph(g, 3, 14, 20, 14, 5); g.lineStyle(2, 0xffffff, 0.9); for (let x = 21; x < 27; x += 3) g.lineBetween(x, 8, x, 20); },
  leafcloak: (g) => leaf(g, 14, 14, 13, 20, -0.4),
  chain: (g) => chainLink(g, 14, 14),
  arrowrain: (g) => { arrowGlyph(g, 6, 4, 3, 18, 4); arrowGlyph(g, 15, 2, 12, 16, 4); arrowGlyph(g, 24, 4, 21, 18, 4); g.lineStyle(2, 0xffffff, 0.7); g.lineBetween(3, 22, 21, 22); },
  stormcloud: (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(14, 9, 18, 8);
    for (let i = 0; i < 3; i++) arcLine(g, 14, 14 + i * 3, 3 + i * 2.6, 0.4, 3.6, 1.8);
    arrowGlyph(g, 6, 24, 4, 20, 3);
    arrowGlyph(g, 22, 24, 24, 20, 3);
  },
  // loresinger
  note: (g) => noteGlyph(g, 11, 22),
  noteup: (g) => { noteGlyph(g, 9, 22); arrowGlyph(g, 20, 22, 20, 8, 4); },
  noteburst: (g) => { noteGlyph(g, 9, 22); burstRays(g, 20, 12, 2, 6, 6, 1.6); },
  notewind: (g) => { noteGlyph(g, 8, 22); windLines(g, 20, 13); },
  noteshield: (g) => { noteGlyph(g, 8, 23); shieldOutline(g, 20, 14, 11, 14); },
  notedown: (g) => { noteGlyph(g, 9, 22); arrowGlyph(g, 20, 8, 20, 22, 4); },
  noteskull: (g) => { noteGlyph(g, 8, 23); skull(g, 20, 13, 5); },
  notecrown: (g) => { noteGlyph(g, 8, 24); crown(g, 19, 15, 15, 8); },
  // herbmaster
  crosshealicon: (g) => { g.fillStyle(0xffffff, 1); g.fillRect(11.5, 5, 5, 18); g.fillRect(5, 11.5, 18, 5); },
  sparklecleanse: (g) => { [[8, 8], [20, 9], [14, 20], [21, 19]].forEach(([x, y]) => burstRays(g, x, y, 0.6, 3, 4, 1.3)); },
  leafplus: (g) => { leaf(g, 10, 16, 11, 16, -0.5); g.fillStyle(0xffffff, 1); g.fillRect(19, 9, 2.4, 10); g.fillRect(15.8, 12.8, 10, 2.4); },
  healwave: (g) => { g.lineStyle(2.5, 0xffffff, 1); g.beginPath(); g.moveTo(4, 20); g.lineTo(9, 13); g.lineTo(14, 20); g.lineTo(19, 9); g.lineTo(24, 16); g.strokePath(); },
  leafaura: (g) => { arcLine(g, 14, 15, 10, 0, Math.PI * 2, 2); leaf(g, 14, 15, 9, 13, -0.3); },
  thornshield: (g) => { shieldOutline(g, 14, 15, 15, 18); g.fillStyle(0xffffff, 1); [0, 1, 2].forEach((i) => g.fillTriangle(9 + i * 5, 10, 11 + i * 5, 6, 13 + i * 5, 10)); },
  earthburst: (g) => { burstRays(g, 14, 16, 2, 9, 8, 2.2); g.lineStyle(2, 0xffffff, 1); g.lineBetween(6, 22, 22, 22); },
  flowerburst: (g) => { for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.fillStyle(0xffffff, 1); g.fillEllipse(14 + Math.cos(a) * 6, 14 + Math.sin(a) * 6, 6, 4); } g.fillStyle(0xffffff, 1); g.fillCircle(14, 14, 3.4); },
  // smith
  hammer: (g) => { g.fillStyle(0xffffff, 1); g.fillRect(8, 4, 12, 7); g.fillRect(12, 11, 4, 15); },
  hammercrack: (g) => { g.fillStyle(0xffffff, 1); g.fillRect(6, 4, 12, 7); g.fillRect(10, 11, 4, 9); g.lineStyle(2, 0xffffff, 1); g.lineBetween(14, 20, 11, 24); g.lineBetween(14, 20, 18, 25); },
  shieldsolid: (g) => shieldOutline(g, 14, 15, 16, 20, true),
  hammerspark: (g) => { g.fillStyle(0xffffff, 1); g.fillRect(7, 3, 12, 7); g.fillRect(11, 10, 4, 10); burstRays(g, 13, 6.5, 7, 11, 6, 1.6); },
  regenaura: (g) => { arcLine(g, 14, 14, 9, 0, Math.PI * 1.6, 2.2); g.fillStyle(0xffffff, 1); g.fillRect(12.8, 10, 2.4, 8); g.fillRect(10, 12.8, 8, 2.4); },
  anvilglow: (g) => { g.fillStyle(0xffffff, 1); g.fillRect(6, 17, 16, 4); g.fillTriangle(6, 17, 22, 17, 16, 12); burstRays(g, 14, 8, 1, 4, 6, 1.4); },
  hammeraoe: (g) => { g.fillStyle(0xffffff, 1); g.fillRect(11, 3, 8, 6); g.fillRect(14, 9, 3, 8); for (let i = 0; i < 2; i++) arcLine(g, 14, 22, 6 + i * 5, Math.PI * 0.15, Math.PI * 0.85, 2); },
  hammerstorm: (g) => { g.fillStyle(0xffffff, 1); g.fillRect(10, 2, 9, 6); g.fillRect(13.5, 8, 3, 8); for (let i = 0; i < 3; i++) arcLine(g, 14, 22, 4 + i * 4, Math.PI * 0.1, Math.PI * 0.9, 2); g.lineStyle(2, 0xffffff, 0.9); g.lineBetween(4, 20, 8, 24); g.lineBetween(24, 20, 20, 24); },
  // skirmisher
  dagger: (g) => { g.fillStyle(0xffffff, 1); g.fillRect(12.5, 4, 3, 12); g.fillRect(9, 15, 10, 2.5); g.fillRect(12.5, 17.5, 3, 7); },
  daggerback: (g) => { g.fillStyle(0xffffff, 1); g.fillRect(9.5, 4, 3, 12); g.fillRect(6, 15, 10, 2.5); g.fillRect(9.5, 17.5, 3, 7); burstRays(g, 20, 9, 2, 5.5, 5, 1.4); },
  dash: (g) => { g.lineStyle(2.5, 0xffffff, 0.9); g.lineBetween(3, 18, 14, 18); g.lineBetween(3, 12, 11, 12); arrowGlyph(g, 14, 22, 25, 8, 5); },
  ghost: (g) => { g.lineStyle(2.2, 0xffffff, 0.85); g.beginPath(); g.arc(14, 13, 8, Math.PI, 0); g.strokePath(); g.lineBetween(6, 13, 6, 22); g.lineBetween(22, 13, 22, 22); [6, 12.5, 19].forEach((x) => { g.beginPath(); g.arc(x + 3.25, 22, 3.25, Math.PI, 0); g.strokePath(); }); },
  poisondrip: (g) => droplet(g, 14, 15, 1),
  featherfast: (g) => { leaf(g, 13, 14, 9, 18, 0.6); windLines(g, 21, 18); },
  trap: (g) => { g.lineStyle(2.2, 0xffffff, 1); g.strokeCircle(14, 15, 8); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.lineBetween(14 + Math.cos(a) * 5, 15 + Math.sin(a) * 5, 14 + Math.cos(a) * 9.5, 15 + Math.sin(a) * 9.5); } },
  skulldagger: (g) => { skull(g, 11, 12, 5.5); g.fillStyle(0xffffff, 1); g.fillRect(18, 6, 2.6, 12); g.fillRect(15.5, 17, 7.6, 2.2); g.fillRect(18, 19, 2.6, 6); },
  // captain
  slashup: (g) => { arcLine(g, 13, 16, 8, -1.2, 1.0, 3); arrowGlyph(g, 22, 20, 22, 7, 4); },
  hornshout: (g) => { hornGlyph(g, 11, 16); windLines(g, 21, 13); },
  crownshield: (g) => { crown(g, 14, 12, 13, 6); shieldOutline(g, 14, 20, 11, 12); },
  banner: (g) => bannerGlyph(g, 12, 14),
  shieldplus: (g) => { shieldOutline(g, 14, 15, 15, 18); g.fillStyle(0xffffff, 1); g.fillRect(12.8, 10, 2.4, 9); g.fillRect(9.5, 13.8, 9, 2.4); },
  hornheal: (g) => { hornGlyph(g, 10, 17); g.fillStyle(0xffffff, 1); g.fillRect(20, 7, 2.4, 9); g.fillRect(16.8, 10.8, 9, 2.4); },
  flagcrit: (g) => { bannerGlyph(g, 10, 14); burstRays(g, 21, 10, 1.5, 5, 5, 1.4); },
  hornarmy: (g) => { hornGlyph(g, 9, 21); [7, 14, 21].forEach((x) => { g.fillStyle(0xffffff, 1); g.fillCircle(x, 8, 2.6); g.fillRect(x - 2, 10, 4, 6); }); },
  // summoner
  bond: (g) => chainLink(g, 14, 14),
  bird: (g) => { g.fillStyle(0xffffff, 1); g.fillTriangle(14, 12, 3, 6, 13, 16); g.fillTriangle(14, 12, 25, 6, 15, 16); g.fillCircle(14, 15, 3); },
  spiritdrop: (g) => { droplet(g, 14, 14, 1.15); g.lineStyle(1.6, 0x1a2038, 0.5); g.beginPath(); g.arc(14, 11, 2, 3.6, 5.8); g.strokePath(); },
  eagle: (g) => { g.fillStyle(0xffffff, 1); g.fillTriangle(14, 10, 2, 18, 13, 15); g.fillTriangle(14, 10, 26, 18, 15, 15); g.fillTriangle(11.5, 14, 16.5, 14, 14, 22); },
  tree: (g) => { g.fillStyle(0xffffff, 1); g.fillRect(12.5, 18, 3, 8); g.fillTriangle(6, 19, 22, 19, 14, 8); g.fillTriangle(8, 15, 20, 15, 14, 5); },
  bear: (g) => { g.fillStyle(0xffffff, 1); g.fillEllipse(14, 17, 15, 11); g.fillCircle(7, 9, 3.4); g.fillCircle(21, 9, 3.4); g.fillEllipse(14, 12, 9, 7); },
  wildburst: (g) => { pawPrint(g, 14, 15, 1.1); burstRays(g, 14, 14, 10, 13, 10, 1.6); },
};

export function skillIconKeys() {
  return Object.keys(SHAPES);
}

export function ensureSkillIconTextures(scene) {
  for (const key of Object.keys(SHAPES)) {
    const tex = iconTexture(key);
    if (scene.textures.exists(tex)) continue;
    const g = scene.make.graphics({ add: false });
    SHAPES[key](g);
    g.generateTexture(tex, 28, 28);
    g.destroy();
  }
}
