import Phaser from 'phaser';
import { COLORS, FONTS } from '../config.js';
import { makeTextButton } from '../ui/widgets.js';
import { getState, setState } from '../systems/GameState.js';
import { itemById, bonusLine } from '../data/items.js';
import { SaveSystem } from '../systems/SaveSystem.js';

// Launched on top of a paused World (+ paused UI) from the pause menu.
// Tap a carried item to equip it (swapping out whatever's already in that
// slot back to the carry list); tap a filled slot to unequip it. Weapon and
// Trinket stay locked for now — they arrive with Waypoint 3's combat intro.

const SLOTS = [
  { key: 'armor', label: 'Armor' },
  { key: 'weapon', label: 'Weapon' },
  { key: 'trinket', label: 'Trinket' },
];

export default class InventoryScene extends Phaser.Scene {
  constructor() {
    super('Inventory');
  }

  create() {
    this.state = getState(this);
    // defensive defaults for characters saved before this system existed
    this.state.inventory ??= [];
    this.state.equipment ??= { armor: null, weapon: null, trinket: null };
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
      .text(cx, 14, 'Inventory', { fontFamily: FONTS.body, fontSize: Math.min(24, width / 16) + 'px', color: '#d9b968' })
      .setOrigin(0.5, 0);

    const slotW = Math.min(150, (width - 48) / 3);
    const slotH = 92;
    const slotY = 66;
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

    makeTextButton(this, cx, height - 40, 160, 46, 'Close', () => this.close());
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
    this.persist();
    this.build();
  }

  unequip(slotKey) {
    const itemId = this.state.equipment[slotKey];
    if (!itemId) return;
    this.state.equipment[slotKey] = null;
    this.state.inventory.push(itemId);
    this.persist();
    this.build();
  }

  persist() {
    setState(this, this.state);
    SaveSystem.saveActive(this, this.state);
  }

  close() {
    this.scene.stop();
    this.scene.resume('World');
    this.scene.resume('UI');
  }
}
