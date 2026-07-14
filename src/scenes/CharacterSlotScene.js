import Phaser from 'phaser';
import { COLORS, FONTS, ROW, SHEET_COLS } from '../config.js';
import { makeTextButton, starfield } from '../ui/widgets.js';
import { campaignById } from '../data/campaigns.js';
import { kindredById } from '../data/kindreds.js';
import { classById } from '../data/classes.js';
import { WAYPOINTS } from '../data/waypoints.js';
import { SaveSystem, SLOT_COUNT } from '../systems/SaveSystem.js';
import { setState } from '../systems/GameState.js';

// 4 character slots per campaign. An empty slot creates a new character
// (kindred + class); an occupied one resumes it. Mortal races reroll each
// campaign and Elves persist (concept doc §4, §9) — this build only has
// one campaign, so that carry-over becomes relevant once a second one ships.

export default class CharacterSlotScene extends Phaser.Scene {
  constructor() {
    super('CharacterSlot');
  }

  create() {
    this.profileId = this.registry.get('profileId');
    this.campaignId = this.registry.get('campaignId');
    this.profile = SaveSystem.getProfile(this.profileId);
    this.campaign = campaignById(this.campaignId);
    if (!this.profile || !this.campaign) {
      this.scene.start('Title');
      return;
    }
    this.build();
    this.resizeHandler = () => this.build();
    this.scale.on('resize', this.resizeHandler);
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.resizeHandler));
  }

  slots() {
    return SaveSystem.getCampaignSlots(this.profileId, this.campaignId);
  }

  build() {
    this.children.removeAll();
    const { width, height } = this.scale;
    starfield(this, Math.floor((width * height) / 11000));
    const cx = width / 2;
    const titleSize = Math.min(22, width / 18);

    this.add
      .text(cx, 12, this.campaign.name, { fontFamily: FONTS.body, fontSize: titleSize + 'px', color: '#d9b968' })
      .setOrigin(0.5, 0);
    this.add
      .text(cx, 12 + titleSize * 1.5, 'Choose a character', {
        fontFamily: FONTS.body,
        fontSize: '13px',
        color: COLORS.textDim,
        fontStyle: 'italic',
      })
      .setOrigin(0.5, 0);

    const top = 66;
    const bottom = 76;
    const gap = 10;
    const ch = Math.min(112, (height - top - bottom - gap * (SLOT_COUNT - 1)) / SLOT_COUNT);
    const cw = Math.min(520, width - 24);
    const slotData = this.slots();

    for (let i = 0; i < SLOT_COUNT; i++) {
      const y = top + ch / 2 + i * (ch + gap);
      this.buildSlotCard(slotData[i], i, cx, y, cw, ch);
    }

    makeTextButton(this, cx, height - 38, 180, 46, '← Campaigns', () => this.scene.start('CampaignSelect'));
  }

  buildSlotCard(character, index, cx, y, w, h) {
    if (!character) {
      const card = this.add.rectangle(cx, y, w, h, 0x0a0e1e, 0.7).setStrokeStyle(2, COLORS.panelLine, 0.6);
      card.setInteractive({ useHandCursor: true });
      this.add.text(cx, y - 6, '+  Create Character', { fontFamily: FONTS.body, fontSize: '16px', color: '#9aa4bc' }).setOrigin(0.5);
      this.add
        .text(cx, y + h / 2 - 14, `Slot ${index + 1}`, { fontFamily: FONTS.body, fontSize: '11px', color: '#5a6a88' })
        .setOrigin(0.5, 1);
      card.on('pointerup', () => {
        this.registry.set('slotIndex', index);
        this.scene.start('Creation');
      });
      return;
    }

    const kindred = kindredById(character.kindred);
    const klass = classById(character.classId);
    const card = this.add.rectangle(cx, y, w, h, COLORS.panel, 0.94).setStrokeStyle(2, COLORS.panelLine);
    card.setInteractive({ useHandCursor: true });

    const spr = this.add.sprite(cx - w / 2 + 40, y, kindred.sheet, ROW.walkDown * SHEET_COLS);
    spr.play(`${kindred.sheet}-idle-down`);
    spr.setScale(Math.min(1.4, h / 78));

    this.add
      .text(cx - w / 2 + 80, y - h / 2 + 10, `${kindred.name} ${klass.name}`, {
        fontFamily: FONTS.body,
        fontSize: '16px',
        color: '#e8e4d8',
      })
      .setOrigin(0, 0);
    this.add
      .text(cx - w / 2 + 80, y - h / 2 + 32, this.progressLine(character), {
        fontFamily: FONTS.body,
        fontSize: '12px',
        color: '#d9b968',
        fontStyle: 'italic',
      })
      .setOrigin(0, 0);
    if (character.lastWhere) {
      this.add
        .text(cx - w / 2 + 80, y - h / 2 + 50, `Last seen: ${character.lastWhere}`, {
          fontFamily: FONTS.body,
          fontSize: '11px',
          color: COLORS.textDim,
          wordWrap: { width: w - 170 },
        })
        .setOrigin(0, 0);
    }

    const del = this.add
      .text(cx + w / 2 - 14, y - h / 2 + 10, '🗑', { fontFamily: 'sans-serif', fontSize: '16px', color: '#c98080' })
      .setOrigin(1, 0)
      .setDepth(2)
      .setInteractive({ useHandCursor: true });
    del.on('pointerup', () => this.confirmDelete(index, kindred, klass));

    card.on('pointerup', () => this.continueSlot(index, character));
  }

  progressLine(character) {
    if (character.zone === '__journey__') return 'On the Road West';
    const wp = WAYPOINTS.find((w) => w.id === character.zone);
    return wp ? `At ${wp.name}` : 'The Great Journey';
  }

  continueSlot(index, character) {
    this.registry.set('slotIndex', index);
    setState(this, character);
    this.scene.start(character.zone === '__journey__' ? 'Journey' : 'World');
  }

  confirmDelete(index, kindred, klass) {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;
    const veil = this.add.rectangle(cx, cy, width, height, 0x05060f, 0.88).setInteractive().setDepth(300);
    const panel = this.add
      .rectangle(cx, cy, Math.min(340, width - 40), 170, COLORS.panel, 0.98)
      .setStrokeStyle(2, COLORS.panelLine)
      .setDepth(301);
    const t = this.add
      .text(cx, cy - 38, `Release ${kindred.name} ${klass.name}?\nThis character and all progress will be lost.`, {
        fontFamily: FONTS.body,
        fontSize: '14px',
        color: COLORS.text,
        align: 'center',
        wordWrap: { width: Math.min(300, width - 70) },
      })
      .setOrigin(0.5)
      .setDepth(302);
    const yes = makeTextButton(
      this,
      cx - 78,
      cy + 42,
      130,
      46,
      'Delete',
      () => {
        SaveSystem.setSlot(this.profileId, this.campaignId, index, null);
        [veil, panel, t, yes, no].forEach((o) => o.destroy());
        this.build();
      },
      { stroke: COLORS.danger }
    ).setDepth(302);
    const no = makeTextButton(this, cx + 78, cy + 42, 130, 46, 'Keep', () => {
      [veil, panel, t, yes, no].forEach((o) => o.destroy());
    }).setDepth(302);
  }
}
