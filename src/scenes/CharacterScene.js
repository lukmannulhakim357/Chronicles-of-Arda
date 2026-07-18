import Phaser from 'phaser';
import { COLORS, FONTS, ROW, SHEET_COLS } from '../config.js';
import { makeTextButton } from '../ui/widgets.js';
import { MATERIALS, armorStyle, drawPanel, drawBagPanel, ensureItemTypeIcons, slotIconTexture } from '../ui/theme.js';
import { getState, setState, effectiveStats } from '../systems/GameState.js';
import { itemById, bonusLine, EQUIPPABLE_SLOTS } from '../data/items.js';
import { derivedStats, classById } from '../data/classes.js';
import { kindredById } from '../data/kindreds.js';
import { xpToNextLevel } from '../data/leveling.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { PARTY_CAP } from '../systems/party.js';
import { titleById } from '../data/titles.js';
import {
  MAX_TREE_POINTS,
  getTree,
  isUnlocked,
  rankOf,
  canRankUp,
  rankUp,
  spentSkillPoints,
  learnedActives,
} from '../data/skills.js';
import { ensureSkillIconTextures, iconTexture, iconTint } from '../fx/skillicons.js';

// Launched on top of a paused World (+ paused UI) from the pause menu, or
// straight into a scripted tutorial moment (level-up, first gear reward).
// Tabs:
//   Gear       — paperdoll (6 slots) + stat point spending + full derived
//                stat block, side by side with a pack grid you tap to
//                inspect before equipping (Waypoint 3 unlocks Weapon)
//   Skills     — stub: class skill trees are a future system
//   Titles     — stub: milestone titles are a future system
//   Collection — every story card seen so far, replayable
//   Craft      — stub: crafting professions are a future system

const TABS = [
  { key: 'gear', label: '⚔ Gear' },
  { key: 'skills', label: '✦ Skills' },
  { key: 'party', label: '👥 Party' },
  { key: 'titles', label: '👑 Titles' },
  { key: 'collection', label: '📜 Tales' },
  { key: 'craft', label: '⚒ Craft' },
];

const SLOT_DEFS = [
  { key: 'head', label: 'Head', locked: true },
  { key: 'chest', label: 'Chest', locked: false },
  { key: 'gloves', label: 'Gloves', locked: false },
  { key: 'boots', label: 'Boots', locked: false },
  { key: 'accessory', label: 'Trinket', locked: false }, // unlocked by Waypoint 7's crafted trinkets
  { key: 'weapon', label: 'Weapon', locked: false },
];

// Only true armor (chest/gloves/boots) gets the heavy/light/robe weight-
// class styling — weapons, trinkets, and trade goods stay a neutral gold
// look, the same way weapons already did before trinkets/materials existed.
const ARMOR_SLOTS = ['chest', 'gloves', 'boots'];

const STAT_INFO = {
  VIT: 'Max HP, HP regen',
  MAG: 'Max MP, magic power',
  STR: 'Physical power & defense',
  DEX: 'Crit, accuracy, evasion',
};

const DERIVED_ROWS = [
  ['maxHp', 'HP'],
  ['maxMp', 'MP'],
  ['pAtk', 'P-ATK'],
  ['mAtk', 'M-ATK'],
  ['atkRate', 'ATK-RATE'],
  ['pDef', 'P-DEF'],
  ['mDef', 'M-DEF'],
  ['accuracy', 'ACC'],
  ['evasion', 'EVA'],
  ['critPct', 'CRIT%'],
];

const CRAFTS = ['Blacksmithing', 'Tailoring', 'Alchemy', 'Cooking'];

export default class CharacterScene extends Phaser.Scene {
  constructor() {
    super('Character');
  }

  init(data) {
    this.tab = data?.tab ?? 'gear';
    this.justLeveledUp = !!data?.levelUp;
    this.gearTutorial = !!data?.gearTutorial;
    this.skillsTutorial = !!data?.skillsTutorial;
    this.partyTutorial = !!data?.partyTutorial;
    this.titlesTutorial = !!data?.titlesTutorial;
    this.collectionTutorial = !!data?.collectionTutorial;
  }

  create() {
    ensureSkillIconTextures(this);
    ensureItemTypeIcons(this);
    this.state = getState(this);
    // defensive defaults for characters saved before these systems existed
    this.state.inventory ??= [];
    this.state.equipment ??= {};
    this.state.level ??= 1;
    this.state.xp ??= 0;
    this.state.statPoints ??= 0;
    this.state.skillPoints ??= 0;
    this.state.titles ??= [];
    this.state.equippedTitle ??= null;
    this.state.seenCards ??= [];
    this.state.party ??= [];
    this.pending = { VIT: 0, MAG: 0, STR: 0, DEX: 0 };
    this.inspect = null;
    this.inspectSkill = null;
    this.viewingCard = null;
    this.build();
    this.resizeHandler = () => this.build();
    this.scale.on('resize', this.resizeHandler);
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.resizeHandler));
  }

  build() {
    this.children.removeAll();
    const { width, height } = this.scale;
    const cx = width / 2;

    this.add.rectangle(cx, height / 2, width, height, 0x05060f, 0.94);

    if (this.viewingCard) {
      this.renderCardViewer();
      return;
    }

    this.add
      .text(cx, 6, 'Character', { fontFamily: FONTS.body, fontSize: Math.min(20, width / 20) + 'px', color: '#d9b968' })
      .setOrigin(0.5, 0);

    const tabY = 32;
    const tabH = 26;
    const tabW = Math.min(92, (width - 16) / TABS.length);
    let tx = cx - (tabW * TABS.length) / 2 + tabW / 2;
    for (const t of TABS) {
      this.buildTab(t.key, t.label, tx, tabY, tabW, tabH);
      tx += tabW;
    }

    const bodyTop = tabY + tabH / 2 + 12;
    if (this.tab === 'gear') this.renderGearTab(bodyTop);
    else if (this.tab === 'skills') this.renderSkillsTab(bodyTop);
    else if (this.tab === 'party') this.renderPartyTab(bodyTop);
    else if (this.tab === 'titles') this.renderTitlesTab(bodyTop);
    else if (this.tab === 'collection') this.renderCollectionTab(bodyTop);
    else if (this.tab === 'craft') this.renderCraftTab(bodyTop);

    if (this.tab === 'gear' && this.spentPending() > 0) {
      makeTextButton(this, cx - 84, height - 26, 150, 38, 'Cancel', () => {
        this.pending = { VIT: 0, MAG: 0, STR: 0, DEX: 0 };
        this.build();
      });
      makeTextButton(this, cx + 84, height - 26, 150, 38, 'Confirm', () => this.confirmStats());
    } else {
      makeTextButton(this, cx, height - 26, 160, 38, 'Close', () => this.close());
    }
  }

  buildTab(key, label, x, y, w, h) {
    const active = this.tab === key;
    const box = this.add
      .rectangle(x, y, w, h, active ? MATERIALS.wood.base : MATERIALS.slate.dark, active ? 0.96 : 0.75)
      .setStrokeStyle(2, active ? COLORS.gold : MATERIALS.slate.light);
    box.setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, label, { fontFamily: FONTS.body, fontSize: '11px', color: active ? '#f5ecd8' : COLORS.textDim })
      .setOrigin(0.5);
    box.on('pointerup', () => {
      if (this.tab === key) return;
      this.tab = key;
      this.pending = { VIT: 0, MAG: 0, STR: 0, DEX: 0 };
      this.inspect = null;
      this.inspectSkill = null;
      this.viewingCard = null;
      this.build();
    });
  }

  // ---------- Gear tab: paperdoll + stats (left) / pack (right) ----------

  renderGearTab(top) {
    const { width, height } = this.scale;
    const cx = width / 2;
    let y = top;

    if (this.justLeveledUp) {
      this.add
        .text(cx, y, `Level Up! You are now Level ${this.state.level}.`, {
          fontFamily: FONTS.body,
          fontSize: '13px',
          color: '#d9b968',
          align: 'center',
          wordWrap: { width: width - 32 },
        })
        .setOrigin(0.5, 0);
      y += 20;
    }
    if (this.gearTutorial) {
      this.add
        .text(cx, y, 'New gear! Tap an item in your pack, then Equip.', {
          fontFamily: FONTS.body,
          fontSize: '12px',
          color: '#d9b968',
          fontStyle: 'italic',
          align: 'center',
          wordWrap: { width: width - 32 },
        })
        .setOrigin(0.5, 0);
      y += 18;
    }

    const leftW = Math.min(230, width * 0.44);
    const leftX0 = 12;
    const leftCx = leftX0 + leftW / 2;
    const rightX0 = leftX0 + leftW + 12;
    const rightW = Math.max(140, width - rightX0 - 12);
    const bottomLimit = height - 74;

    // an "armory board" backing behind the paperdoll/stats, and a satchel
    // behind the pack — two distinct materials so the two halves of the
    // Gear tab read as separate pieces of furniture, not one flat sheet
    drawPanel(this, leftCx, (y + bottomLimit) / 2, leftW + 8, bottomLimit - y + 4, { material: 'slate', radius: 10 });
    drawBagPanel(this, rightX0 + rightW / 2, (y + bottomLimit) / 2, rightW + 8, bottomLimit - y + 4);

    const afterDoll = this.renderPaperdoll(leftCx, leftW, y);
    const afterStats = this.renderStatBlock(leftCx, leftW, afterDoll);
    this.renderDerivedList(leftCx, leftW, afterStats);

    this.renderInventoryPanel(rightX0, rightW, y, bottomLimit);
  }

  renderPaperdoll(cx, w, top) {
    // short phone screens get a tighter paperdoll so the stat block and
    // derived list below still fit above the Close button
    const slot = Math.min(46, w / 3 - 8, this.scale.height * 0.105);
    const gap = 6;
    const row1Y = top + slot / 2 + 2;
    this.buildSlotBox('head', cx, row1Y, slot, slot);
    const row2Y = row1Y + slot + gap;
    this.buildSlotBox('gloves', cx - slot - gap, row2Y, slot, slot);
    this.buildSlotBox('chest', cx, row2Y, slot, slot);
    this.buildSlotBox('accessory', cx + slot + gap, row2Y, slot, slot);
    const row3Y = row2Y + slot + gap;
    this.buildSlotBox('boots', cx - (slot + gap) / 2, row3Y, slot, slot);
    this.buildSlotBox('weapon', cx + (slot + gap) / 2, row3Y, slot, slot);
    return row3Y + slot / 2 + 10;
  }

  buildSlotBox(slotKey, x, y, w, h) {
    const def = SLOT_DEFS.find((s) => s.key === slotKey);
    const itemId = this.state.equipment?.[slotKey];
    const item = itemId ? itemById(itemId) : null;
    const selected = this.inspect?.kind === 'slot' && this.inspect.slotKey === slotKey;
    // armor slots pick up their weight-class color (heavy/light/robe);
    // weapon and trinket keep a neutral gold look; empty/locked slots stay dark
    const style = item && ARMOR_SLOTS.includes(slotKey) ? armorStyle(item.armorType) : null;
    const fill = item ? (style ? style.base : MATERIALS.slate.light) : MATERIALS.slate.dark;
    const border = item ? (style ? style.border : COLORS.gold) : MATERIALS.slate.light;
    const box = this.add.rectangle(x, y, w, h, fill, item ? 0.92 : 0.6);
    box.setStrokeStyle(selected ? 3 : 2, selected ? 0xffffff : border, item ? 1 : 0.55);
    this.add
      .text(x, y - h / 2 + 2, def.label, { fontFamily: FONTS.body, fontSize: '8px', color: COLORS.textDim })
      .setOrigin(0.5, 0);

    // the item-type silhouette always shows — full color when filled, a
    // faint hint of "what goes here" when the slot is empty
    const icon = this.add
      .image(x, y - h * 0.12, slotIconTexture(slotKey))
      .setDisplaySize(Math.min(20, w * 0.4), Math.min(20, w * 0.4))
      .setTint(item ? 0xf5ecd8 : 0x3a4a5a)
      .setAlpha(item ? 0.95 : def.locked ? 0.35 : 0.55);

    if (item) {
      this.add
        .text(x, y + h * 0.28, item.name, {
          fontFamily: FONTS.body,
          fontSize: '7px',
          color: '#e8e4d8',
          align: 'center',
          wordWrap: { width: w - 6 },
        })
        .setOrigin(0.5);
      if (style) {
        this.add
          .text(x + w / 2 - 2, y + h / 2 - 2, style.label, {
            fontFamily: FONTS.body,
            fontSize: '6px',
            color: '#' + style.border.toString(16).padStart(6, '0'),
            fontStyle: 'italic',
          })
          .setOrigin(1, 1);
      }
      box.setInteractive({ useHandCursor: true });
      box.on('pointerup', () => {
        this.inspect = { kind: 'slot', slotKey, itemId };
        this.build();
      });
    } else {
      this.add
        .text(x, y + h * 0.28, def.locked ? 'Locked' : 'Empty', { fontFamily: FONTS.body, fontSize: '8px', color: '#5a6a88' })
        .setOrigin(0.5);
    }
    return icon;
  }

  renderStatBlock(cx, w, top) {
    let y = top + 4;
    const avail = this.availablePoints();
    this.add
      .text(cx, y, avail > 0 ? `${avail} point${avail === 1 ? '' : 's'} to spend` : 'Stat points', {
        fontFamily: FONTS.body,
        fontSize: '11px',
        color: avail > 0 ? '#d9b968' : COLORS.textDim,
        fontStyle: avail > 0 ? 'italic' : 'normal',
      })
      .setOrigin(0.5, 0);
    y += 16;

    const compact = this.scale.height < 430;
    const rowH = compact ? 22 : 28;
    const gap = compact ? 3 : 4;
    Object.keys(STAT_INFO).forEach((stat, i) => {
      const ry = y + i * (rowH + gap) + rowH / 2;
      this.buildStatRow(stat, cx, ry, w, rowH);
    });
    return y + Object.keys(STAT_INFO).length * (rowH + gap) + (compact ? 3 : 6);
  }

  buildStatRow(stat, cx, y, w, h) {
    const base = this.state.stats[stat] ?? 0;
    const pending = this.pending[stat];
    this.add.rectangle(cx, y, w, h, MATERIALS.slate.base, 0.85).setStrokeStyle(1, MATERIALS.slate.light);
    this.add
      .text(cx - w / 2 + 8, y, stat, { fontFamily: FONTS.body, fontSize: '11px', color: '#e8e4d8' })
      .setOrigin(0, 0.5);

    const valueText = pending > 0 ? `${base} +${pending}` : `${base}`;
    this.add
      .text(cx + w / 2 - 68, y, valueText, {
        fontFamily: FONTS.body,
        fontSize: '11px',
        color: pending > 0 ? '#d9b968' : '#e8e4d8',
      })
      .setOrigin(0.5);

    const minus = this.add
      .text(cx + w / 2 - 40, y, '−', { fontFamily: FONTS.body, fontSize: '15px', color: pending > 0 ? '#e8e4d8' : '#3a4a5a' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: pending > 0 });
    minus.on('pointerup', () => {
      if (this.pending[stat] > 0) {
        this.pending[stat] -= 1;
        this.build();
      }
    });

    const canAdd = this.availablePoints() > 0;
    const plus = this.add
      .text(cx + w / 2 - 14, y, '+', { fontFamily: FONTS.body, fontSize: '15px', color: canAdd ? '#e8e4d8' : '#3a4a5a' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: canAdd });
    plus.on('pointerup', () => {
      if (this.availablePoints() > 0) {
        this.pending[stat] += 1;
        this.build();
      }
    });
  }

  renderDerivedList(cx, w, top) {
    const base = derivedStats(effectiveStats(this.state));
    const preview = this.spentPending() > 0 ? derivedStats(this.addPending(effectiveStats(this.state))) : base;
    const colW = w / 2;
    const lineH = this.scale.height < 430 ? 12 : 15;
    DERIVED_ROWS.forEach(([key, label], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = cx - w / 2 + col * colW + colW / 2;
      const y = top + row * lineH;
      const changed = preview[key] !== base[key];
      const text = changed ? `${label} ${base[key]}→${preview[key]}` : `${label} ${base[key]}`;
      this.add
        .text(x, y, text, { fontFamily: FONTS.body, fontSize: '9px', color: changed ? '#d9b968' : COLORS.textDim })
        .setOrigin(0.5, 0);
    });
  }

  addPending(stats) {
    const out = { ...stats };
    for (const [k, v] of Object.entries(this.pending)) out[k] = (out[k] ?? 0) + v;
    return out;
  }

  spentPending() {
    return Object.values(this.pending).reduce((a, b) => a + b, 0);
  }

  availablePoints() {
    return (this.state.statPoints ?? 0) - this.spentPending();
  }

  confirmStats() {
    for (const [k, v] of Object.entries(this.pending)) {
      this.state.stats[k] = (this.state.stats[k] ?? 0) + v;
    }
    this.state.statPoints -= this.spentPending();
    this.pending = { VIT: 0, MAG: 0, STR: 0, DEX: 0 };
    setState(this, this.state);
    SaveSystem.saveActive(this, this.state);
    this.build();
  }

  // ---------- pack grid + inspect panel ----------

  renderInventoryPanel(x0, w, top, bottomLimit) {
    this.add
      .text(x0 + w / 2, top, 'Pack', { fontFamily: FONTS.body, fontSize: '12px', color: COLORS.textDim, fontStyle: 'italic' })
      .setOrigin(0.5, 0);
    const gridTop = top + 18;
    const items = this.state.inventory ?? [];
    const gap = 6;
    const cell = Math.min(46, (w - gap * 3) / 4);
    const cols = Math.max(2, Math.floor((w + gap) / (cell + gap)));

    if (!items.length) {
      this.add
        .text(x0 + w / 2, gridTop + 10, 'Nothing carried right now.', {
          fontFamily: FONTS.body,
          fontSize: '11px',
          color: COLORS.textDim,
          align: 'center',
          wordWrap: { width: w - 10 },
        })
        .setOrigin(0.5, 0);
    }

    items.forEach((itemId, i) => {
      const item = itemById(itemId);
      if (!item) return;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx2 = x0 + col * (cell + gap) + cell / 2;
      const cy2 = gridTop + row * (cell + gap) + cell / 2;
      const selected = this.inspect?.kind === 'inv' && this.inspect.index === i;
      const style = ARMOR_SLOTS.includes(item.slot) ? armorStyle(item.armorType) : null;
      const box = this.add
        .rectangle(cx2, cy2, cell, cell, style ? style.base : MATERIALS.slate.light, 0.92)
        .setStrokeStyle(selected ? 3 : 2, selected ? 0xffffff : style ? style.border : COLORS.gold, selected ? 1 : 0.85);
      box.setInteractive({ useHandCursor: true });
      this.add
        .image(cx2, cy2, slotIconTexture(item.slot))
        .setDisplaySize(cell * 0.55, cell * 0.55)
        .setTint(0xf5ecd8);
      box.on('pointerup', () => {
        this.inspect = { kind: 'inv', index: i, itemId };
        this.build();
      });
    });

    const rows = Math.max(1, Math.ceil(items.length / cols));
    const gridBottom = gridTop + rows * (cell + gap);
    this.renderDetailPanel(x0, w, gridBottom + 6, Math.max(70, bottomLimit - gridBottom - 6));
  }

  renderDetailPanel(x0, w, top, h) {
    drawPanel(this, x0 + w / 2, top + h / 2, w, h, { material: 'parchment', radius: 8, grain: false });
    const item = this.inspect ? itemById(this.inspect.itemId) : null;
    if (!this.inspect || !item) {
      this.add
        .text(x0 + w / 2, top + h / 2, 'Tap a slot or pack item to inspect it.', {
          fontFamily: FONTS.body,
          fontSize: '11px',
          color: '#5a4c34',
          fontStyle: 'italic',
          align: 'center',
          wordWrap: { width: w - 20 },
        })
        .setOrigin(0.5);
      return;
    }
    const style = ARMOR_SLOTS.includes(item.slot) ? armorStyle(item.armorType) : null;
    const iconX = x0 + 20;
    this.add
      .rectangle(iconX, top + 18, 28, 28, style ? style.base : MATERIALS.slate.light, 1)
      .setStrokeStyle(2, style ? style.border : COLORS.gold);
    this.add.image(iconX, top + 18, slotIconTexture(item.slot)).setDisplaySize(18, 18).setTint(0xf5ecd8);
    const textX = x0 + 40;
    this.add.text(textX, top + 4, item.name, { fontFamily: FONTS.body, fontSize: '12px', color: '#2c2010' }).setOrigin(0, 0);
    this.add
      .text(textX, top + 20, style ? `${style.label} armor  •  ${bonusLine(item)}` : bonusLine(item), {
        fontFamily: FONTS.body,
        fontSize: '10px',
        color: '#7a4a1c',
      })
      .setOrigin(0, 0);
    this.add
      .text(x0 + 10, top + 40, item.flavor ?? '', {
        fontFamily: FONTS.body,
        fontSize: '9px',
        color: '#5a4c34',
        fontStyle: 'italic',
        wordWrap: { width: w - 20 },
        lineSpacing: 2,
      })
      .setOrigin(0, 0);
    // trade/crafting goods (e.g. Sturdy Hide) aren't equippable at all —
    // no Equip button for those, just the inspect view
    if (this.inspect.kind === 'inv' && !EQUIPPABLE_SLOTS.includes(item.slot)) return;
    const label = this.inspect.kind === 'inv' ? 'Equip' : 'Unequip';
    makeTextButton(this, x0 + w - 46, top + h - 16, 80, 26, label, () => {
      if (this.inspect.kind === 'inv') this.equip(this.inspect.itemId);
      else this.unequip(this.inspect.slotKey);
      this.inspect = null;
    }, { fontSize: '11px' });
  }

  equip(itemId) {
    const item = itemById(itemId);
    if (!item || !EQUIPPABLE_SLOTS.includes(item.slot)) return;
    const idx = this.state.inventory.indexOf(itemId);
    if (idx === -1) return;
    this.state.inventory.splice(idx, 1);
    const prev = this.state.equipment[item.slot];
    if (prev) this.state.inventory.push(prev);
    this.state.equipment[item.slot] = itemId;
    this.persistGear();
    this.build();
  }

  unequip(slotKey) {
    const itemId = this.state.equipment[slotKey];
    if (!itemId) return;
    this.state.equipment[slotKey] = null;
    this.state.inventory.push(itemId);
    this.persistGear();
    this.build();
  }

  persistGear() {
    setState(this, this.state);
    SaveSystem.saveActive(this, this.state);
  }

  // ---------- Skills tab: real skill tree + action bar ----------

  renderSkillsTab(top) {
    const { width } = this.scale;
    const cx = width / 2;
    const classId = this.state.classId;
    const klass = classById(classId);
    const tree = getTree(classId);
    const spent = spentSkillPoints(this.state, classId);
    const banked = this.state.skillPoints ?? 0;
    const wheelFilled = learnedActives(this.state, classId).length;

    this.add
      .text(cx, top, `${klass?.name ?? 'Class'} Skill Tree`, { fontFamily: FONTS.body, fontSize: '13px', color: '#d9b968' })
      .setOrigin(0.5, 0);
    this.add
      .text(cx, top + 15, `${spent}/${MAX_TREE_POINTS} spent  •  ${banked} banked  •  wheel ${wheelFilled}/6 filled`, {
        fontFamily: FONTS.body,
        fontSize: '10px',
        color: COLORS.textDim,
      })
      .setOrigin(0.5, 0);
    if (this.skillsTutorial) {
      this.add
        .text(cx, top + 28, `Tap + next to a skill to spend a point — you have ${banked} to spend.`, {
          fontFamily: FONTS.body, fontSize: '10px', color: '#d9b968', fontStyle: 'italic',
        })
        .setOrigin(0.5, 0);
    }

    const rowTop = top + (this.skillsTutorial ? 42 : 30);
    const rowH = 22;
    const rowW = Math.min(600, width - 24);
    const detailH = 100;
    const detailTop = rowTop + tree.length * (rowH + 2) + 6;
    drawPanel(this, cx, (rowTop + detailTop + detailH) / 2, rowW + 10, detailTop + detailH - rowTop + 8, { material: 'slate', radius: 10 });

    tree.forEach((def, i) => {
      const y = rowTop + i * (rowH + 2) + rowH / 2;
      this.buildSkillRow(classId, def, cx, y, rowW, rowH);
    });

    this.renderSkillDetail(classId, cx, rowW, detailTop);
  }

  buildSkillRow(classId, def, cx, y, w, h) {
    const rank = rankOf(this.state, def.id);
    const unlocked = isUnlocked(this.state, classId, def.id);
    const selected = this.inspectSkill?.skillId === def.id;
    const row = this.add
      .rectangle(cx, y, w, h, def.capstone ? MATERIALS.wood.base : MATERIALS.slate.base, unlocked ? 0.94 : 0.55)
      .setStrokeStyle(selected ? 2 : 1, selected ? 0xffffff : def.capstone ? COLORS.gold : MATERIALS.slate.light);
    row.setInteractive({ useHandCursor: true });
    row.on('pointerup', () => {
      this.inspectSkill = { classId, skillId: def.id };
      this.build();
    });

    const typeTag = def.capstone ? 'CAP' : def.type === 'active' ? 'A' : 'P';
    this.add
      .text(cx - w / 2 + 8, y, typeTag, { fontFamily: FONTS.body, fontSize: '9px', color: '#6a8fd9' })
      .setOrigin(0, 0.5);
    if (def.icon) {
      this.add.image(cx - w / 2 + 30, y, iconTexture(def.icon)).setDisplaySize(15, 15).setTint(iconTint(def)).setAlpha(unlocked ? 1 : 0.4);
    }
    this.add
      .text(cx - w / 2 + 42, y, def.name, {
        fontFamily: FONTS.body,
        fontSize: '11px',
        color: unlocked ? '#e8e4d8' : '#5a6a88',
      })
      .setOrigin(0, 0.5);

    if (!unlocked) {
      this.add
        .text(cx + w / 2 - 8, y, 'Locked', { fontFamily: FONTS.body, fontSize: '10px', color: '#5a6a88' })
        .setOrigin(1, 0.5);
      return;
    }

    this.add
      .text(cx + w / 2 - 56, y, `${rank}/${def.maxRank}`, { fontFamily: FONTS.body, fontSize: '11px', color: rank > 0 ? '#d9b968' : COLORS.textDim })
      .setOrigin(0.5);

    const can = canRankUp(this.state, classId, def.id);
    const plus = this.add
      .text(cx + w / 2 - 16, y, '+', { fontFamily: FONTS.body, fontSize: '16px', color: can ? '#e8e4d8' : '#3a4a5a' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: can });
    plus.on('pointerup', () => {
      if (!canRankUp(this.state, classId, def.id)) return;
      rankUp(this.state, classId, def.id);
      this.persistGear();
      this.build();
    });
  }

  // Tap a row above to inspect it here: icon, rank, MP/cast/cooldown, and
  // the full description (attack shape, visual, damage/heal %, effects,
  // duration) — mirrors the Gear tab's tap-to-inspect detail panel.
  renderSkillDetail(classId, cx, w, top) {
    const h = 100;
    drawPanel(this, cx, top + h / 2, w, h, { material: 'parchment', radius: 8, grain: false });
    const def = this.inspectSkill?.classId === classId ? getTree(classId).find((s) => s.id === this.inspectSkill.skillId) : null;
    const x0 = cx - w / 2 + 10;
    if (!def) {
      this.add
        .text(cx, top + h / 2, 'Tap a skill above to see its full description.', {
          fontFamily: FONTS.body, fontSize: '11px', color: '#5a4c34', fontStyle: 'italic', align: 'center', wordWrap: { width: w - 20 },
        })
        .setOrigin(0.5);
      return h;
    }
    if (def.icon) {
      this.add.image(x0 + 14, top + 20, iconTexture(def.icon)).setDisplaySize(26, 26).setTint(iconTint(def));
    }
    this.add.text(x0 + 32, top + 8, def.name, { fontFamily: FONTS.body, fontSize: '12px', color: '#2c2010' }).setOrigin(0, 0);
    const rank = rankOf(this.state, def.id);
    const statLine = def.type === 'passive'
      ? 'Passive — always active'
      : [
          `Rank ${rank}/${def.maxRank}`,
          def.mp ? `${def.mp} MP` : null,
          def.cast ? `${def.cast}s cast` : null,
          def.cd ? `${def.cd}s cooldown` : null,
        ].filter(Boolean).join('  •  ');
    this.add.text(x0 + 32, top + 23, statLine, { fontFamily: FONTS.body, fontSize: '9px', color: '#7a4a1c' }).setOrigin(0, 0);
    this.add
      .text(x0, top + 38, def.effect ?? '', {
        fontFamily: FONTS.body,
        fontSize: '9px',
        color: '#5a4c34',
        wordWrap: { width: w - 20 },
        lineSpacing: 2,
      })
      .setOrigin(0, 0);
    return h;
  }

  // ---------- Party tab: recruited companions (Waypoint 5 on) ----------
  // Read-only roster for now — no formation swap yet, per the design doc's
  // own "basic version first" note; companions fight automatically via
  // WorldScene.updateParty()/companionAI.js, they're not manually piloted.

  renderPartyTab(top) {
    const { width, height } = this.scale;
    const cx = width / 2;
    const party = this.state.party ?? [];

    this.add
      .text(cx, top, `Party (${party.length + 1}/${PARTY_CAP})`, { fontFamily: FONTS.body, fontSize: '13px', color: '#d9b968' })
      .setOrigin(0.5, 0);
    let y = top + 16;
    if (this.partyTutorial) {
      this.add
        .text(cx, y, 'Companions fight alongside you automatically — no piloting needed. Recruit more as the journey continues.', {
          fontFamily: FONTS.body, fontSize: '10px', color: '#d9b968', fontStyle: 'italic', align: 'center', wordWrap: { width: width - 32 },
        })
        .setOrigin(0.5, 0);
      y += 26;
    }
    y += 4;

    const cardW = Math.min(500, width - 24);
    const cardH = Math.min(58, (height - y - 46) / Math.max(1, party.length + 1));

    const kindred = kindredById(this.state.kindred);
    this.renderPartyCard(cx, y + cardH / 2, cardW, cardH, {
      name: kindred?.name ?? 'You',
      classId: this.state.classId,
      level: this.state.level ?? 1,
      sheet: kindred?.sheet,
      isPlayer: true,
    });
    y += cardH + 6;

    party.forEach((comp) => {
      this.renderPartyCard(cx, y + cardH / 2, cardW, cardH, comp);
      y += cardH + 6;
    });

    if (!party.length) {
      this.add
        .text(cx, y + 10, 'No companions recruited yet — the road ahead will bring some.', {
          fontFamily: FONTS.body, fontSize: '11px', color: COLORS.textDim, fontStyle: 'italic', align: 'center', wordWrap: { width: width - 40 },
        })
        .setOrigin(0.5, 0);
    }
  }

  renderPartyCard(cx, y, w, h, comp) {
    drawPanel(this, cx, y, w, h, { material: comp.isPlayer ? 'wood' : 'slate', radius: 8 });
    const klass = classById(comp.classId);
    if (comp.sheet && this.textures.exists(comp.sheet)) {
      const spr = this.add.sprite(cx - w / 2 + 24, y, comp.sheet, ROW.walkDown * SHEET_COLS);
      spr.play(`${comp.sheet}-idle-down`);
      spr.setScale(Math.min(1, (h - 6) / 64));
    }
    this.add
      .text(cx - w / 2 + 48, y - h * 0.22, comp.name, { fontFamily: FONTS.body, fontSize: '13px', color: '#f5ecd8' })
      .setOrigin(0, 0.5);
    this.add
      .text(cx - w / 2 + 48, y + h * 0.22, `${klass?.name ?? comp.classId} • Lv. ${comp.level}`, {
        fontFamily: FONTS.body, fontSize: '10px', color: '#d9b968',
      })
      .setOrigin(0, 0.5);
    if (comp.isPlayer) {
      this.add.text(cx + w / 2 - 8, y, 'You', { fontFamily: FONTS.body, fontSize: '9px', color: COLORS.textDim, fontStyle: 'italic' }).setOrigin(1, 0.5);
    }
  }

  // ---------- Titles tab: earned milestone titles (Waypoint 8 on) ----------
  // Basic version, per the design doc: one equip slot, one flat passive
  // bonus per title — same bonus-map shape as equipment (data/titles.js).

  renderTitlesTab(top) {
    const { width, height } = this.scale;
    const cx = width / 2;
    const titleIds = this.state.titles ?? [];

    this.add.text(cx, top, 'Titles', { fontFamily: FONTS.body, fontSize: '15px', color: '#d9b968' }).setOrigin(0.5, 0);
    let y = top + 16;
    if (this.titlesTutorial) {
      this.add
        .text(cx, y, 'Equip one title at a time for its passive bonus. Earn more from major story milestones.', {
          fontFamily: FONTS.body, fontSize: '10px', color: '#d9b968', fontStyle: 'italic', align: 'center', wordWrap: { width: width - 32 },
        })
        .setOrigin(0.5, 0);
      y += 26;
    }
    y += 8;

    if (!titleIds.length) {
      this.add
        .text(cx, y + 10, 'No titles earned yet — the road ahead will bring some.', {
          fontFamily: FONTS.body, fontSize: '11px', color: COLORS.textDim, fontStyle: 'italic', align: 'center', wordWrap: { width: width - 40 },
        })
        .setOrigin(0.5, 0);
      return;
    }

    const cardW = Math.min(500, width - 24);
    const cardH = Math.min(74, (height - y - 46) / titleIds.length);

    titleIds.forEach((id) => {
      const def = titleById(id);
      if (!def) return;
      this.renderTitleCard(cx, y + cardH / 2, cardW, cardH, def);
      y += cardH + 6;
    });
  }

  renderTitleCard(cx, y, w, h, def) {
    const equipped = this.state.equippedTitle === def.id;
    drawPanel(this, cx, y, w, h, { material: equipped ? 'wood' : 'slate', radius: 8 });
    this.add
      .text(cx - w / 2 + 12, y - h * 0.32, def.name, { fontFamily: FONTS.body, fontSize: '13px', color: '#f5ecd8' })
      .setOrigin(0, 0.5);
    this.add
      .text(cx - w / 2 + 12, y - h * 0.06, bonusLine(def), { fontFamily: FONTS.body, fontSize: '10px', color: '#d9b968' })
      .setOrigin(0, 0.5);
    this.add
      .text(cx - w / 2 + 12, y + h * 0.28, def.flavor, {
        fontFamily: FONTS.body, fontSize: '9px', color: COLORS.textDim, fontStyle: 'italic',
        wordWrap: { width: w - 110 }, lineSpacing: 2,
      })
      .setOrigin(0, 0.5);
    makeTextButton(this, cx + w / 2 - 44, y, 78, 28, equipped ? 'Unequip' : 'Equip', () => {
      this.state.equippedTitle = equipped ? null : def.id;
      this.persistGear();
      this.build();
    });
  }

  // ---------- Craft tab (stub) ----------

  renderCraftTab(top) {
    const { width } = this.scale;
    const cx = width / 2;
    this.add.text(cx, top, 'Crafting — Upcoming', { fontFamily: FONTS.body, fontSize: '15px', color: '#d9b968' }).setOrigin(0.5, 0);
    this.add
      .text(cx, top + 24, 'Planned professions:', { fontFamily: FONTS.body, fontSize: '12px', color: COLORS.textDim, fontStyle: 'italic' })
      .setOrigin(0.5, 0);
    CRAFTS.forEach((name, i) => {
      this.add
        .text(cx, top + 46 + i * 20, `${name} — Upcoming`, { fontFamily: FONTS.body, fontSize: '13px', color: '#e8e4d8' })
        .setOrigin(0.5, 0);
    });
  }

  // ---------- Collection tab: story cards seen so far ----------

  renderCollectionTab(top) {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cards = this.state.seenCards ?? [];
    if (this.collectionTutorial) {
      this.add
        .text(cx, top, 'Tap a card to relive that moment of the story — your Tales collect here as you journey.', {
          fontFamily: FONTS.body, fontSize: '10px', color: '#d9b968', fontStyle: 'italic', align: 'center', wordWrap: { width: width - 32 },
        })
        .setOrigin(0.5, 0);
      top += 26;
    }
    if (!cards.length) {
      this.add
        .text(cx, top + 16, 'Nothing recorded yet — your story will appear here as you progress.', {
          fontFamily: FONTS.body,
          fontSize: '13px',
          color: COLORS.textDim,
          align: 'center',
          wordWrap: { width: Math.min(480, width - 40) },
        })
        .setOrigin(0.5, 0);
      return;
    }
    const gap = 10;
    const cardW = Math.min(170, (width - 24 - gap) / 2);
    const cardH = 56;
    const cols = Math.max(1, Math.floor((width - 12 + gap) / (cardW + gap)));
    const maxRows = Math.max(1, Math.floor((height - top - 40) / (cardH + gap)));
    cards.slice(0, cols * maxRows).forEach((c, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 12 + col * (cardW + gap) + cardW / 2;
      const y = top + row * (cardH + gap) + cardH / 2;
      const box = this.add.rectangle(x, y, cardW, cardH, MATERIALS.parchment.base, 0.94).setStrokeStyle(2, MATERIALS.parchment.edge);
      box.setInteractive({ useHandCursor: true });
      this.add
        .text(x, y, c.title, {
          fontFamily: FONTS.body,
          fontSize: '11px',
          color: '#2c2010',
          align: 'center',
          wordWrap: { width: cardW - 14 },
        })
        .setOrigin(0.5);
      box.on('pointerup', () => {
        this.viewingCard = c;
        this.build();
      });
    });
  }

  renderCardViewer() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const c = this.viewingCard;
    this.add
      .text(cx, 14, c.title, {
        fontFamily: FONTS.body,
        fontSize: Math.min(20, width / 20) + 'px',
        color: '#d9b968',
        align: 'center',
        wordWrap: { width: width - 60 },
      })
      .setOrigin(0.5, 0);
    let bodyTop = 56;
    // replay the card's illustration too, not just its words
    if (c.art && this.textures.exists(c.art)) {
      const src = this.textures.get(c.art).source?.[0];
      const aspect = src?.height ? src.width / src.height : 16 / 9;
      const fh = Math.min(height * 0.36, (width - 80) / aspect);
      const fw = fh * aspect;
      this.add.image(cx, bodyTop + fh / 2, c.art).setDisplaySize(fw, fh);
      this.add.rectangle(cx, bodyTop + fh / 2, fw, fh).setStrokeStyle(2, COLORS.panelLine);
      bodyTop += fh + 12;
    }
    this.add
      .text(cx, bodyTop, (c.paragraphs ?? []).join('\n\n'), {
        fontFamily: FONTS.body,
        fontSize: '13px',
        color: COLORS.text,
        align: 'center',
        wordWrap: { width: Math.min(560, width - 50) },
        lineSpacing: 4,
      })
      .setOrigin(0.5, 0);
    makeTextButton(this, cx, height - 30, 160, 40, 'Close', () => {
      this.viewingCard = null;
      this.build();
    });
  }

  close() {
    this.scene.stop();
    this.scene.resume('World');
    this.scene.resume('UI');
  }
}
