import Phaser from 'phaser';
import { COLORS, FONTS } from '../config.js';
import { makeTextButton } from '../ui/widgets.js';
import { getState, setState, effectiveStats } from '../systems/GameState.js';
import { itemById, bonusLine } from '../data/items.js';
import { derivedStats, classById } from '../data/classes.js';
import { xpToNextLevel } from '../data/leveling.js';
import { SaveSystem } from '../systems/SaveSystem.js';
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
  { key: 'titles', label: '👑 Titles' },
  { key: 'collection', label: '📜 Tales' },
  { key: 'craft', label: '⚒ Craft' },
];

const SLOT_DEFS = [
  { key: 'head', label: 'Head', locked: true },
  { key: 'chest', label: 'Chest', locked: false },
  { key: 'gloves', label: 'Gloves', locked: false },
  { key: 'boots', label: 'Boots', locked: false },
  { key: 'accessory', label: 'Trinket', locked: true },
  { key: 'weapon', label: 'Weapon', locked: false },
];

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

// Word-initials so near-identical item names (e.g. two "Herder's ...")
// don't collapse into the same two-letter monogram in the pack grid.
function monogram(name) {
  const words = name.replace(/['’]s\b/gi, '').split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default class CharacterScene extends Phaser.Scene {
  constructor() {
    super('Character');
  }

  init(data) {
    this.tab = data?.tab ?? 'gear';
    this.justLeveledUp = !!data?.levelUp;
    this.gearTutorial = !!data?.gearTutorial;
  }

  create() {
    this.state = getState(this);
    // defensive defaults for characters saved before these systems existed
    this.state.inventory ??= [];
    this.state.equipment ??= {};
    this.state.level ??= 1;
    this.state.xp ??= 0;
    this.state.statPoints ??= 0;
    this.state.skillPoints ??= 0;
    this.state.titles ??= [];
    this.state.seenCards ??= [];
    this.pending = { VIT: 0, MAG: 0, STR: 0, DEX: 0 };
    this.inspect = null;
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
      .rectangle(x, y, w, h, active ? COLORS.panel : 0x0a0e1e, active ? 0.96 : 0.6)
      .setStrokeStyle(2, active ? COLORS.gold : COLORS.panelLine);
    box.setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, label, { fontFamily: FONTS.body, fontSize: '11px', color: active ? '#e8e4d8' : COLORS.textDim })
      .setOrigin(0.5);
    box.on('pointerup', () => {
      if (this.tab === key) return;
      this.tab = key;
      this.pending = { VIT: 0, MAG: 0, STR: 0, DEX: 0 };
      this.inspect = null;
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

    const afterDoll = this.renderPaperdoll(leftCx, leftW, y);
    const afterStats = this.renderStatBlock(leftCx, leftW, afterDoll);
    this.renderDerivedList(leftCx, leftW, afterStats);

    this.renderInventoryPanel(rightX0, rightW, y, bottomLimit);
  }

  renderPaperdoll(cx, w, top) {
    const slot = Math.min(46, w / 3 - 8);
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
    const box = this.add.rectangle(x, y, w, h, item ? COLORS.panel : 0x0a0e1e, item ? 0.94 : 0.7);
    box.setStrokeStyle(selected ? 3 : 2, selected ? 0xffffff : item ? COLORS.gold : COLORS.panelLine, item ? 1 : 0.6);
    this.add
      .text(x, y - h / 2 + 2, def.label, { fontFamily: FONTS.body, fontSize: '8px', color: COLORS.textDim })
      .setOrigin(0.5, 0);
    if (item) {
      this.add
        .text(x, y + 4, item.name, {
          fontFamily: FONTS.body,
          fontSize: '8px',
          color: '#e8e4d8',
          align: 'center',
          wordWrap: { width: w - 6 },
        })
        .setOrigin(0.5);
      box.setInteractive({ useHandCursor: true });
      box.on('pointerup', () => {
        this.inspect = { kind: 'slot', slotKey, itemId };
        this.build();
      });
    } else {
      this.add
        .text(x, y + 6, def.locked ? 'Locked' : 'Empty', { fontFamily: FONTS.body, fontSize: '8px', color: '#5a6a88' })
        .setOrigin(0.5);
    }
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

    const rowH = 28;
    Object.keys(STAT_INFO).forEach((stat, i) => {
      const ry = y + i * (rowH + 4) + rowH / 2;
      this.buildStatRow(stat, cx, ry, w, rowH);
    });
    return y + Object.keys(STAT_INFO).length * (rowH + 4) + 6;
  }

  buildStatRow(stat, cx, y, w, h) {
    const base = this.state.stats[stat] ?? 0;
    const pending = this.pending[stat];
    this.add.rectangle(cx, y, w, h, COLORS.panel, 0.9).setStrokeStyle(1, COLORS.panelLine);
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
    DERIVED_ROWS.forEach(([key, label], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = cx - w / 2 + col * colW + colW / 2;
      const y = top + row * 15;
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
      const box = this.add
        .rectangle(cx2, cy2, cell, cell, COLORS.panel, 0.94)
        .setStrokeStyle(selected ? 3 : 2, selected ? 0xffffff : COLORS.panelLine, selected ? 1 : 0.7);
      box.setInteractive({ useHandCursor: true });
      this.add
        .text(cx2, cy2, monogram(item.name), {
          fontFamily: FONTS.body,
          fontSize: '13px',
          color: '#d9b968',
        })
        .setOrigin(0.5);
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
    this.add.rectangle(x0 + w / 2, top + h / 2, w, h, COLORS.panel, 0.9).setStrokeStyle(2, COLORS.panelLine);
    const item = this.inspect ? itemById(this.inspect.itemId) : null;
    if (!this.inspect || !item) {
      this.add
        .text(x0 + w / 2, top + h / 2, 'Tap a slot or pack item to inspect it.', {
          fontFamily: FONTS.body,
          fontSize: '11px',
          color: COLORS.textDim,
          align: 'center',
          wordWrap: { width: w - 20 },
        })
        .setOrigin(0.5);
      return;
    }
    this.add.text(x0 + 10, top + 6, item.name, { fontFamily: FONTS.body, fontSize: '12px', color: '#e8e4d8' }).setOrigin(0, 0);
    this.add
      .text(x0 + 10, top + 22, bonusLine(item), { fontFamily: FONTS.body, fontSize: '11px', color: '#d9b968' })
      .setOrigin(0, 0);
    this.add
      .text(x0 + 10, top + 38, item.flavor ?? '', {
        fontFamily: FONTS.body,
        fontSize: '9px',
        color: COLORS.textDim,
        wordWrap: { width: w - 20 },
        lineSpacing: 2,
      })
      .setOrigin(0, 0);
    const label = this.inspect.kind === 'inv' ? 'Equip' : 'Unequip';
    makeTextButton(this, x0 + w - 46, top + h - 16, 80, 26, label, () => {
      if (this.inspect.kind === 'inv') this.equip(this.inspect.itemId);
      else this.unequip(this.inspect.slotKey);
      this.inspect = null;
    }, { fontSize: '11px' });
  }

  equip(itemId) {
    const item = itemById(itemId);
    if (!item) return;
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

    this.add
      .text(cx, top, `${klass?.name ?? 'Class'} Skill Tree`, { fontFamily: FONTS.body, fontSize: '13px', color: '#d9b968' })
      .setOrigin(0.5, 0);
    this.add
      .text(cx, top + 15, `${spent}/${MAX_TREE_POINTS} points spent  •  ${banked} banked`, {
        fontFamily: FONTS.body,
        fontSize: '10px',
        color: COLORS.textDim,
      })
      .setOrigin(0.5, 0);

    const rowTop = top + 30;
    const rowH = 27;
    const rowW = Math.min(600, width - 24);
    tree.forEach((def, i) => {
      const y = rowTop + i * (rowH + 3) + rowH / 2;
      this.buildSkillRow(classId, def, cx, y, rowW, rowH);
    });

    const barTop = rowTop + tree.length * (rowH + 3) + 8;
    this.renderActionBar(classId, cx, rowW, barTop);
  }

  buildSkillRow(classId, def, cx, y, w, h) {
    const rank = rankOf(this.state, def.id);
    const unlocked = isUnlocked(this.state, classId, def.id);
    this.add.rectangle(cx, y, w, h, COLORS.panel, unlocked ? 0.92 : 0.55).setStrokeStyle(1, COLORS.panelLine);

    const typeTag = def.capstone ? 'CAP' : def.type === 'active' ? 'A' : 'P';
    this.add
      .text(cx - w / 2 + 8, y, typeTag, { fontFamily: FONTS.body, fontSize: '9px', color: '#6a8fd9' })
      .setOrigin(0, 0.5);
    this.add
      .text(cx - w / 2 + 30, y, def.name, {
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

  // The HUD skill wheel auto-fills with every learned Active (6 slots) plus
  // HP/MP potions — no manual loadout to manage, so this is just the note.
  renderActionBar(classId, cx, w, top) {
    const n = learnedActives(this.state, classId).length;
    this.add
      .text(cx, top + 4, `Skill wheel: ${n}/6 skill slot${n === 1 ? '' : 's'} filled + HP/MP potions — rotate it in the HUD with ⟳.`, {
        fontFamily: FONTS.body,
        fontSize: '10px',
        color: COLORS.textDim,
        fontStyle: 'italic',
        align: 'center',
        wordWrap: { width: w - 20 },
      })
      .setOrigin(0.5, 0);
  }

  // ---------- Titles tab (stub) ----------

  renderTitlesTab(top) {
    const { width } = this.scale;
    const cx = width / 2;
    const titles = this.state.titles ?? [];
    this.add.text(cx, top, 'Titles — Upcoming', { fontFamily: FONTS.body, fontSize: '15px', color: '#d9b968' }).setOrigin(0.5, 0);
    this.add
      .text(
        cx,
        top + 26,
        'Earned from major story milestones and campaign completions. Each title will grant bonus stats or stat points once this system ships.',
        {
          fontFamily: FONTS.body,
          fontSize: '13px',
          color: COLORS.textDim,
          align: 'center',
          wordWrap: { width: Math.min(480, width - 40) },
          lineSpacing: 4,
        }
      )
      .setOrigin(0.5, 0);
    if (!titles.length) {
      this.add
        .text(cx, top + 90, 'No titles earned yet.', { fontFamily: FONTS.body, fontSize: '12px', color: COLORS.textDim, fontStyle: 'italic' })
        .setOrigin(0.5, 0);
    }
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
      const box = this.add.rectangle(x, y, cardW, cardH, COLORS.panel, 0.94).setStrokeStyle(2, COLORS.panelLine);
      box.setInteractive({ useHandCursor: true });
      this.add
        .text(x, y, c.title, {
          fontFamily: FONTS.body,
          fontSize: '11px',
          color: '#e8e4d8',
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
