import Phaser from 'phaser';
import { COLORS, FONTS } from '../config.js';
import { makeTextButton, starfield, toast } from '../ui/widgets.js';
import { MATERIALS, drawPanel } from '../ui/theme.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { promptText } from '../ui/textPrompt.js';

// Homepage: New Game / Load Game. New Game asks for a profile name (the
// account-level save name — not an in-game character nickname, concept doc
// §3) then drops into the campaign list. Load Game lists existing profiles.

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    this.build();
    this.scale.on('resize', () => this.build());
  }

  build() {
    this.children.removeAll();
    const { width, height } = this.scale;
    starfield(this, Math.floor((width * height) / 9000));

    const cx = width / 2;
    this.add
      .text(cx, height * 0.22, 'CHRONICLES OF ARDA', {
        fontFamily: FONTS.body,
        fontSize: Math.min(40, width / 12) + 'px',
        color: '#d9b968',
        letterSpacing: 3,
      })
      .setOrigin(0.5);
    this.add
      .text(cx, height * 0.22 + Math.min(40, width / 12) * 0.95, 'A History of Middle-earth', {
        fontFamily: FONTS.body,
        fontSize: Math.min(20, width / 22) + 'px',
        color: COLORS.text,
        fontStyle: 'italic',
      })
      .setOrigin(0.5);

    const bw = Math.min(300, width - 60);
    let y = height * 0.5;

    makeTextButton(this, cx, y, bw, 54, 'New Game', () => this.startNewGame());
    y += 70;
    makeTextButton(this, cx, y, bw, 54, 'Load Game', () => this.showLoadGame());

    this.add
      .text(cx, height - 18, 'Free & open-source art — see CREDITS.md', {
        fontFamily: FONTS.body,
        fontSize: '12px',
        color: COLORS.textDim,
      })
      .setOrigin(0.5);
  }

  startNewGame() {
    promptText({
      title: 'Name Your Profile',
      subtitle: 'This names your save file — not your character.',
      placeholder: 'e.g. Lukman',
      maxLength: 24,
      confirmLabel: 'Begin',
      onSubmit: (name) => {
        const profile = SaveSystem.createProfile(name);
        this.registry.set('profileId', profile.id);
        this.scene.start('CampaignSelect');
      },
    });
  }

  showLoadGame() {
    const profiles = SaveSystem.listProfiles();
    if (!profiles.length) {
      toast(this, 'No saved profiles yet — start a New Game.');
      return;
    }
    this.openProfilePanel(profiles);
  }

  openProfilePanel(profiles) {
    const { width, height } = this.scale;
    const cx = width / 2;
    const panelW = Math.min(420, width - 40);
    const rowH = 62;
    const rowGap = 10;
    const panelH = Math.min(height - 70, 96 + profiles.length * (rowH + rowGap));

    const veil = this.add.rectangle(cx, height / 2, width, height, 0x05060f, 0.85).setInteractive().setDepth(200);
    const panel = drawPanel(this, cx, height / 2, panelW, panelH, { material: 'wood', radius: 12, rivets: true, depth: 201 });
    const items = [veil, panel];

    const top = height / 2 - panelH / 2;
    items.push(
      this.add
        .text(cx, top + 16, 'Load Game', { fontFamily: FONTS.body, fontSize: '20px', color: '#d9b968' })
        .setOrigin(0.5, 0)
        .setDepth(202)
    );

    let y = top + 54;
    profiles.forEach((p) => {
      const row = this.add
        .rectangle(cx, y + rowH / 2, panelW - 24, rowH, MATERIALS.slate.base, 0.92)
        .setStrokeStyle(1, MATERIALS.slate.light)
        .setDepth(202);
      row.setInteractive({ useHandCursor: true });
      const name = this.add
        .text(cx - panelW / 2 + 24, y + 10, p.name, { fontFamily: FONTS.body, fontSize: '16px', color: COLORS.text })
        .setDepth(203);
      const sub = this.add
        .text(cx - panelW / 2 + 24, y + 34, this.profileSummary(p), {
          fontFamily: FONTS.body,
          fontSize: '11px',
          color: COLORS.textDim,
        })
        .setDepth(203);
      const del = this.add
        .text(cx + panelW / 2 - 22, y + rowH / 2, '🗑', { fontFamily: 'sans-serif', fontSize: '18px', color: '#c98080' })
        .setOrigin(1, 0.5)
        .setDepth(204)
        .setInteractive({ useHandCursor: true });

      row.on('pointerup', () => {
        this.registry.set('profileId', p.id);
        this.scene.start('CampaignSelect');
      });
      del.on('pointerup', () => this.confirmDeleteProfile(p, items));

      items.push(row, name, sub, del);
      y += rowH + rowGap;
    });

    const closeBtn = makeTextButton(this, cx, top + panelH - 30, 140, 44, 'Close', () => {
      items.forEach((o) => o.destroy());
    });
    closeBtn.setDepth(202);
    items.push(closeBtn);
  }

  profileSummary(p) {
    const gj = p.campaigns?.greatJourney;
    const count = gj?.slots?.filter(Boolean).length ?? 0;
    const when = new Date(p.updatedAt || p.createdAt).toLocaleDateString();
    return `${count} character${count === 1 ? '' : 's'} · last played ${when}`;
  }

  confirmDeleteProfile(p, parentItems) {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;
    const veil = this.add.rectangle(cx, cy, width, height, 0x05060f, 0.9).setInteractive().setDepth(300);
    const panel = drawPanel(this, cx, cy, Math.min(340, width - 40), 170, { material: 'wood', radius: 10, depth: 301 });
    const t = this.add
      .text(cx, cy - 40, `Delete profile "${p.name}"?\nAll its characters & progress will be lost.`, {
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
        SaveSystem.deleteProfile(p.id);
        [veil, panel, t, yes, no].forEach((o) => o.destroy());
        parentItems.forEach((o) => o.destroy());
        this.showLoadGame();
      },
      { stroke: COLORS.danger }
    ).setDepth(302);
    const no = makeTextButton(this, cx + 78, cy + 42, 130, 46, 'Keep it', () => {
      [veil, panel, t, yes, no].forEach((o) => o.destroy());
    }).setDepth(302);
  }
}
