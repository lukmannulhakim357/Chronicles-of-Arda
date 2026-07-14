import Phaser from 'phaser';
import { COLORS, FONTS } from '../config.js';
import { makeTextButton, starfield, toast } from '../ui/widgets.js';
import { CAMPAIGNS, isCampaignUnlocked } from '../data/campaigns.js';
import { SaveSystem } from '../systems/SaveSystem.js';

// The campaign list for the active profile. Unlocked campaigns (available
// to play, or already played) show clearly; campaigns still gated behind an
// earlier one show dim, with their real name hidden behind "Locked".

export default class CampaignSelectScene extends Phaser.Scene {
  constructor() {
    super('CampaignSelect');
  }

  create() {
    this.profileId = this.registry.get('profileId');
    this.profile = SaveSystem.getProfile(this.profileId);
    if (!this.profile) {
      this.scene.start('Title');
      return;
    }
    this.build();
    this.resizeHandler = () => this.build();
    this.scale.on('resize', this.resizeHandler);
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.resizeHandler));
  }

  build() {
    this.children.removeAll();
    const { width, height } = this.scale;
    starfield(this, Math.floor((width * height) / 11000));
    const cx = width / 2;
    const titleSize = Math.min(22, width / 18);

    this.add
      .text(cx, 14, this.profile.name, { fontFamily: FONTS.body, fontSize: titleSize + 'px', color: '#d9b968' })
      .setOrigin(0.5, 0);
    this.add
      .text(cx, 14 + titleSize * 1.5, 'Choose a campaign', {
        fontFamily: FONTS.body,
        fontSize: '13px',
        color: COLORS.textDim,
        fontStyle: 'italic',
      })
      .setOrigin(0.5, 0);

    const top = 74;
    const bottom = 80;
    const gap = 14;
    const n = CAMPAIGNS.length;
    const cols = width > 700 ? 3 : width > 440 ? 2 : 1;
    const rows = Math.ceil(n / cols);
    const cw = Math.min(260, (width - 24 - gap * (cols - 1)) / cols);
    const ch = Math.max(150, Math.min(220, (height - top - bottom - gap * (rows - 1)) / rows));
    const gridW = cols * cw + (cols - 1) * gap;

    CAMPAIGNS.forEach((c, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = cx - gridW / 2 + cw / 2 + col * (cw + gap);
      const y = top + ch / 2 + row * (ch + gap);
      const unlocked = isCampaignUnlocked(this.profile, i);
      this.buildCampaignCard(c, i, unlocked, x, y, cw, ch);
    });

    makeTextButton(this, cx, height - 40, 200, 46, '← Switch Profile', () => this.scene.start('Title'));
  }

  buildCampaignCard(c, index, unlocked, x, y, w, h) {
    const bg = this.add.rectangle(x, y, w, h, unlocked ? COLORS.panel : 0x0a0a12, unlocked ? 0.94 : 0.72);
    bg.setStrokeStyle(2, unlocked ? COLORS.gold : 0x22283a);

    if (unlocked) {
      this.add
        .text(x, y - h / 2 + 16, c.era, {
          fontFamily: FONTS.body,
          fontSize: '11px',
          color: '#9aa4bc',
          fontStyle: 'italic',
          align: 'center',
          wordWrap: { width: w - 24 },
        })
        .setOrigin(0.5, 0);
      this.add
        .text(x, y - h / 2 + 36, c.name, {
          fontFamily: FONTS.body,
          fontSize: '16px',
          color: '#e8e4d8',
          align: 'center',
          wordWrap: { width: w - 24 },
        })
        .setOrigin(0.5, 0);
      this.add
        .text(x, y + 6, c.blurb, {
          fontFamily: FONTS.body,
          fontSize: '11px',
          color: COLORS.textDim,
          align: 'center',
          wordWrap: { width: w - 28 },
        })
        .setOrigin(0.5, 0);
      if (!c.built) {
        this.add
          .text(x, y + h / 2 - 20, 'Coming soon', { fontFamily: FONTS.body, fontSize: '11px', color: '#7f8db0', fontStyle: 'italic' })
          .setOrigin(0.5);
      }
    } else {
      this.add
        .text(x, y, '🔒\nLocked', { fontFamily: FONTS.body, fontSize: '16px', color: '#4a5578', align: 'center' })
        .setOrigin(0.5);
    }

    bg.setInteractive({ useHandCursor: unlocked && c.built });
    bg.on('pointerup', () => {
      if (!unlocked) {
        toast(this, 'Complete the previous campaign to unlock this one.');
        return;
      }
      if (!c.built) {
        toast(this, `${c.name} isn't built yet — check back in a future update.`);
        return;
      }
      this.registry.set('campaignId', c.id);
      this.scene.start('CharacterSlot');
    });
  }
}
