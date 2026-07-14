import Phaser from 'phaser';
import { COLORS, FONTS } from '../config.js';
import { makeTextButton } from '../ui/widgets.js';
import { getState, setState, effectiveStats } from '../systems/GameState.js';
import { itemById, bonusLine } from '../data/items.js';
import { derivedStats } from '../data/classes.js';
import { xpToNextLevel } from '../data/leveling.js';
import { SaveSystem } from '../systems/SaveSystem.js';

// Launched on top of a paused World (+ paused UI) from the pause menu, or
// straight into the Stats tab as a scripted level-up moment. Two tabs:
//   Gear  — equip/unequip Armor / Weapon / Trinket (Weapon & Trinket stay
//           locked until Waypoint 3 introduces weapons and combat)
//   Stats — spend banked stat points across VIT/MAG/STR/DEX

const SLOTS = [
  { key: 'armor', label: 'Armor' },
  { key: 'weapon', label: 'Weapon' },
  { key: 'trinket', label: 'Trinket' },
];

const STAT_INFO = {
  VIT: 'Max HP, HP regen',
  MAG: 'Max MP, magic power',
  STR: 'Physical power & defense',
  DEX: 'Crit, accuracy, evasion',
};

export default class CharacterScene extends Phaser.Scene {
  constructor() {
    super('Character');
  }

  init(data) {
    this.tab = data?.tab ?? 'gear';
    this.justLeveledUp = !!data?.levelUp;
  }

  create() {
    this.state = getState(this);
    // defensive defaults for characters saved before these systems existed
    this.state.inventory ??= [];
    this.state.equipment ??= { armor: null, weapon: null, trinket: null };
    this.state.level ??= 1;
    this.state.xp ??= 0;
    this.state.statPoints ??= 0;
    this.pending = { VIT: 0, MAG: 0, STR: 0, DEX: 0 };
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
    this.add
      .text(cx, 12, 'Character', { fontFamily: FONTS.body, fontSize: Math.min(22, width / 18) + 'px', color: '#d9b968' })
      .setOrigin(0.5, 0);

    // tabs
    const tabW = 120;
    const tabY = 42;
    this.buildTab('gear', 'Gear', cx - tabW / 2 - 4, tabY, tabW);
    this.buildTab('stats', 'Stats', cx + tabW / 2 + 4, tabY, tabW);

    const bodyTop = tabY + 30;
    if (this.tab === 'gear') this.renderGear(bodyTop);
    else this.renderStats(bodyTop);

    if (this.tab === 'stats' && this.spentPending() > 0) {
      makeTextButton(this, cx - 84, height - 40, 150, 46, 'Cancel', () => {
        this.pending = { VIT: 0, MAG: 0, STR: 0, DEX: 0 };
        this.build();
      });
      makeTextButton(this, cx + 84, height - 40, 150, 46, 'Confirm', () => this.confirmStats());
    } else {
      makeTextButton(this, cx, height - 40, 160, 46, 'Close', () => this.close());
    }
  }

  buildTab(key, label, x, y, w) {
    const active = this.tab === key;
    const box = this.add
      .rectangle(x, y, w, 34, active ? COLORS.panel : 0x0a0e1e, active ? 0.96 : 0.6)
      .setStrokeStyle(2, active ? COLORS.gold : COLORS.panelLine);
    box.setInteractive({ useHandCursor: true });
    this.add
      .text(x, y, label, { fontFamily: FONTS.body, fontSize: '14px', color: active ? '#e8e4d8' : COLORS.textDim })
      .setOrigin(0.5);
    box.on('pointerup', () => {
      this.tab = key;
      this.pending = { VIT: 0, MAG: 0, STR: 0, DEX: 0 };
      this.build();
    });
  }

  // ---------- Gear tab ----------

  renderGear(top) {
    const { width } = this.scale;
    const cx = width / 2;

    const slotW = Math.min(150, (width - 48) / 3);
    const slotH = 92;
    const slotY = top + slotH / 2 + 6;
    const gap = 12;
    const totalW = SLOTS.length * slotW + (SLOTS.length - 1) * gap;
    let x = cx - totalW / 2 + slotW / 2;
    for (const s of SLOTS) {
      this.buildSlotBox(s, x, slotY, slotW, slotH);
      x += slotW + gap;
    }

    const listTop = slotY + slotH / 2 + 24;
    this.add
      .text(cx, listTop, 'Carried', { fontFamily: FONTS.body, fontSize: '14px', color: COLORS.textDim, fontStyle: 'italic' })
      .setOrigin(0.5, 0);

    const items = this.state.inventory ?? [];
    const rowH = 56;
    const rowGap = 8;
    const rowW = Math.min(480, width - 32);
    const y0 = listTop + 26;

    if (!items.length) {
      this.add
        .text(cx, y0 + 10, 'Nothing carried right now.', { fontFamily: FONTS.body, fontSize: '13px', color: COLORS.textDim })
        .setOrigin(0.5, 0);
    }

    items.forEach((itemId, i) => {
      const item = itemById(itemId);
      if (!item) return;
      const ry = y0 + i * (rowH + rowGap) + rowH / 2;
      const row = this.add.rectangle(cx, ry, rowW, rowH, COLORS.panel, 0.94).setStrokeStyle(2, COLORS.panelLine);
      row.setInteractive({ useHandCursor: true });
      this.add
        .text(cx - rowW / 2 + 14, ry - 15, item.name, { fontFamily: FONTS.body, fontSize: '15px', color: '#e8e4d8' })
        .setOrigin(0, 0.5);
      this.add
        .text(cx - rowW / 2 + 14, ry + 9, bonusLine(item), { fontFamily: FONTS.body, fontSize: '12px', color: '#d9b968' })
        .setOrigin(0, 0.5);
      this.add
        .text(cx + rowW / 2 - 14, ry, 'Equip', { fontFamily: FONTS.body, fontSize: '13px', color: COLORS.textDim })
        .setOrigin(1, 0.5);
      row.on('pointerup', () => this.equip(itemId));
    });
  }

  buildSlotBox(slotDef, x, y, w, h) {
    const itemId = this.state.equipment?.[slotDef.key];
    const item = itemId ? itemById(itemId) : null;
    const box = this.add.rectangle(x, y, w, h, item ? COLORS.panel : 0x0a0e1e, item ? 0.94 : 0.7);
    box.setStrokeStyle(2, item ? COLORS.gold : COLORS.panelLine, item ? 1 : 0.6);
    this.add
      .text(x, y - h / 2 + 8, slotDef.label, { fontFamily: FONTS.body, fontSize: '11px', color: COLORS.textDim, fontStyle: 'italic' })
      .setOrigin(0.5, 0);

    if (item) {
      this.add
        .text(x, y + 2, item.name, {
          fontFamily: FONTS.body,
          fontSize: '12px',
          color: '#e8e4d8',
          align: 'center',
          wordWrap: { width: w - 14 },
        })
        .setOrigin(0.5);
      this.add
        .text(x, y + h / 2 - 14, bonusLine(item), { fontFamily: FONTS.body, fontSize: '11px', color: '#d9b968' })
        .setOrigin(0.5);
      box.setInteractive({ useHandCursor: true });
      box.on('pointerup', () => this.unequip(slotDef.key));
    } else {
      const label = slotDef.key === 'armor' ? 'Empty' : 'Unlocks later\nin the Journey';
      this.add
        .text(x, y, label, { fontFamily: FONTS.body, fontSize: '11px', color: '#5a6a88', align: 'center' })
        .setOrigin(0.5);
    }
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

  // ---------- Stats tab ----------

  spentPending() {
    return Object.values(this.pending).reduce((a, b) => a + b, 0);
  }

  availablePoints() {
    return (this.state.statPoints ?? 0) - this.spentPending();
  }

  renderStats(top) {
    const { width } = this.scale;
    const cx = width / 2;
    let y = top;

    if (this.justLeveledUp) {
      this.add
        .text(cx, y, `Level Up! You are now Level ${this.state.level}.`, {
          fontFamily: FONTS.body,
          fontSize: '16px',
          color: '#d9b968',
          align: 'center',
          wordWrap: { width: width - 60 },
        })
        .setOrigin(0.5, 0);
      y += 30;
    }

    const xpNext = xpToNextLevel(this.state.level);
    this.add
      .text(cx, y, `Level ${this.state.level}  •  ${this.state.xp}/${xpNext} EXP`, {
        fontFamily: FONTS.body,
        fontSize: '13px',
        color: COLORS.textDim,
      })
      .setOrigin(0.5, 0);
    y += 22;

    const avail = this.availablePoints();
    this.add
      .text(cx, y, avail > 0 ? `${avail} stat point${avail === 1 ? '' : 's'} to spend` : 'No points to spend right now', {
        fontFamily: FONTS.body,
        fontSize: '14px',
        color: avail > 0 ? '#d9b968' : COLORS.textDim,
        fontStyle: avail > 0 ? 'italic' : 'normal',
      })
      .setOrigin(0.5, 0);
    y += 30;

    const rowW = Math.min(480, width - 32);
    const rowH = 50;
    Object.keys(STAT_INFO).forEach((stat, i) => {
      const ry = y + i * (rowH + 6) + rowH / 2;
      this.buildStatRow(stat, cx, ry, rowW, rowH);
    });
    y += Object.keys(STAT_INFO).length * (rowH + 6) + 10;

    if (this.spentPending() > 0) {
      const base = derivedStats(effectiveStats(this.state));
      const preview = derivedStats(this.addPending(effectiveStats(this.state)));
      this.add
        .text(
          cx,
          y,
          `Max HP: ${base.maxHp} → ${preview.maxHp}    Max MP: ${base.maxMp} → ${preview.maxMp}`,
          { fontFamily: FONTS.body, fontSize: '12px', color: '#9aa4bc' }
        )
        .setOrigin(0.5, 0);
    }
  }

  addPending(stats) {
    const out = { ...stats };
    for (const [k, v] of Object.entries(this.pending)) out[k] = (out[k] ?? 0) + v;
    return out;
  }

  buildStatRow(stat, cx, y, w, h) {
    const base = this.state.stats[stat] ?? 0;
    const pending = this.pending[stat];
    const row = this.add.rectangle(cx, y, w, h, COLORS.panel, 0.9).setStrokeStyle(2, COLORS.panelLine);
    this.add
      .text(cx - w / 2 + 14, y - 10, stat, { fontFamily: FONTS.body, fontSize: '16px', color: '#e8e4d8' })
      .setOrigin(0, 0.5);
    this.add
      .text(cx - w / 2 + 14, y + 12, STAT_INFO[stat], { fontFamily: FONTS.body, fontSize: '10px', color: COLORS.textDim })
      .setOrigin(0, 0.5);

    const valueText = pending > 0 ? `${base} +${pending}` : `${base}`;
    this.add
      .text(cx + w / 2 - 78, y, valueText, { fontFamily: FONTS.body, fontSize: '15px', color: pending > 0 ? '#d9b968' : '#e8e4d8' })
      .setOrigin(0.5);

    const minus = this.add
      .text(cx + w / 2 - 48, y, '−', { fontFamily: FONTS.body, fontSize: '20px', color: pending > 0 ? '#e8e4d8' : '#3a4a5a' })
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
      .text(cx + w / 2 - 16, y, '+', { fontFamily: FONTS.body, fontSize: '20px', color: canAdd ? '#e8e4d8' : '#3a4a5a' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: canAdd });
    plus.on('pointerup', () => {
      if (this.availablePoints() > 0) {
        this.pending[stat] += 1;
        this.build();
      }
    });
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

  close() {
    this.scene.stop();
    this.scene.resume('World');
    this.scene.resume('UI');
  }
}
