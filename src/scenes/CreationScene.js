import Phaser from 'phaser';
import { COLORS, FONTS, ROW, SHEET_COLS } from '../config.js';
import { makeTextButton, starfield } from '../ui/widgets.js';
import { MATERIALS, drawPanel } from '../ui/theme.js';
import { KINDREDS } from '../data/kindreds.js';
import { CLASSES } from '../data/classes.js';
import { newGameState, setState } from '../systems/GameState.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { getTree } from '../data/skills.js';
import { playUltimate } from '../fx/skillfx.js';
import { playWeaponSwing, animFamilyOf } from '../fx/weapons.js';
import { WEAPON_BY_CLASS, ALT_WEAPON_BY_CLASS } from '../data/items.js';
import { ensureSkillIconTextures, iconTexture, iconTint } from '../fx/skillicons.js';
import { derivedStats } from '../data/classes.js';

// classes whose capstone is party-support — their preview adds a companion
// so the party-wide effect actually reads as party-wide
const SUPPORT_ULTIMATES = ['loresinger', 'herbmaster', 'smith', 'captain'];

// Character creation: pick a kindred (whom do you follow?) then a class.
// Touch-first: big cards, one decision per screen.

export default class CreationScene extends Phaser.Scene {
  constructor() {
    super('Creation');
  }

  create() {
    ensureSkillIconTextures(this);
    this.kindredId = null;
    this.showKindreds();
  }

  clear() {
    this.children.removeAll();
    starfield(this, Math.floor((this.scale.width * this.scale.height) / 12000));
  }

  showKindreds() {
    this.clear();
    const { width, height } = this.scale;
    const cx = width / 2;

    this.add
      .text(cx, 26, 'Whom do you follow?', {
        fontFamily: FONTS.body,
        fontSize: Math.min(24, width / 17) + 'px',
        color: '#d9b968',
      })
      .setOrigin(0.5, 0);
    this.add
      .text(cx, 26 + Math.min(24, width / 17) * 1.5, 'Three hosts set out from Cuiviénen. One is yours.', {
        fontFamily: FONTS.body,
        fontSize: '13px',
        color: COLORS.textDim,
        fontStyle: 'italic',
      })
      .setOrigin(0.5, 0);

    const top = 96;
    const gap = 12;
    const bottomReserve = 66;
    const ch = Math.min(118, (height - top - bottomReserve - gap * 2) / 3);
    const cw = Math.min(520, width - 24);

    KINDREDS.forEach((k, i) => {
      const y = top + ch / 2 + i * (ch + gap);
      const card = this.add.rectangle(cx, y, cw, ch, MATERIALS.wood.base, 0.94).setStrokeStyle(2, COLORS.gold);
      card.setInteractive({ useHandCursor: true });

      // walking preview sprite
      const spr = this.add.sprite(cx - cw / 2 + 44, y, k.sheet, ROW.walkDown * SHEET_COLS);
      spr.play(`${k.sheet}-walk-down`);
      spr.setScale(Math.min(1.6, ch / 72));

      this.add
        .text(cx - cw / 2 + 88, y - ch / 2 + 10, `${k.name} — ${k.epithet}`, {
          fontFamily: FONTS.body,
          fontSize: '17px',
          color: '#e8e4d8',
        })
        .setOrigin(0, 0);
      this.add
        .text(cx - cw / 2 + 88, y - ch / 2 + 32, `Led by ${k.leader}`, {
          fontFamily: FONTS.body,
          fontSize: '12px',
          color: '#d9b968',
          fontStyle: 'italic',
        })
        .setOrigin(0, 0);
      this.add
        .text(cx - cw / 2 + 88, y - ch / 2 + 50, k.blurb, {
          fontFamily: FONTS.body,
          fontSize: '12px',
          color: COLORS.textDim,
          wordWrap: { width: cw - 104 },
        })
        .setOrigin(0, 0);

      card.on('pointerup', () => {
        this.kindredId = k.id;
        this.showClasses();
      });
    });

    makeTextButton(this, cx, height - 30, 160, 42, '← Back', () => this.scene.start('CharacterSlot'));
  }

  showClasses() {
    this.clear();
    const { width, height } = this.scale;
    const cx = width / 2;
    const kindred = KINDREDS.find((k) => k.id === this.kindredId);

    this.add
      .text(cx, 20, `${kindred.name} — choose your calling`, {
        fontFamily: FONTS.body,
        fontSize: Math.min(22, width / 18) + 'px',
        color: '#d9b968',
      })
      .setOrigin(0.5, 0);

    const cols = width > 560 ? 4 : 2;
    const rows = Math.ceil(CLASSES.length / cols);
    const gap = 10;
    const top = 64;
    const bottom = 76;
    const cw = Math.min(240, (width - 24 - gap * (cols - 1)) / cols);
    const ch = Math.min(112, (height - top - bottom - gap * (rows - 1)) / rows);
    const gridW = cols * cw + (cols - 1) * gap;

    CLASSES.forEach((c, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = cx - gridW / 2 + cw / 2 + col * (cw + gap);
      const y = top + ch / 2 + row * (ch + gap);
      const card = this.add.rectangle(x, y, cw, ch, MATERIALS.wood.base, 0.94).setStrokeStyle(2, COLORS.gold);
      card.setInteractive({ useHandCursor: true });
      this.add
        .text(x, y - ch / 2 + 8, c.name, { fontFamily: FONTS.body, fontSize: '16px', color: '#e8e4d8' })
        .setOrigin(0.5, 0);
      this.add
        .text(x, y - ch / 2 + 30, c.weapon, {
          fontFamily: FONTS.body,
          fontSize: '11px',
          color: '#d9b968',
          fontStyle: 'italic',
        })
        .setOrigin(0.5, 0);
      this.add
        .text(x, y - ch / 2 + 47, c.role, {
          fontFamily: FONTS.body,
          fontSize: '11px',
          color: COLORS.textDim,
          align: 'center',
          wordWrap: { width: cw - 14 },
        })
        .setOrigin(0.5, 0);
      const s = c.stats;
      this.add
        .text(x, y + ch / 2 - 8, `VIT ${s.VIT}  MAG ${s.MAG}  STR ${s.STR}  DEX ${s.DEX}`, {
          fontFamily: FONTS.body,
          fontSize: '10px',
          color: '#7f8db0',
        })
        .setOrigin(0.5, 1);
      card.on('pointerup', () => this.showUltimatePreview(c));
    });

    makeTextButton(this, cx, height - 38, 180, 46, '← Back', () => this.showKindreds());
  }

  // Tapping a class opens a live preview of its ultimate before committing:
  // the kindred's own sprite on a small stage, capstone VFX looping, plus a
  // companion for the party-support ultimates so the party effect shows.
  showUltimatePreview(klass) {
    const { width, height } = this.scale;
    const cx = width / 2;
    const kindred = KINDREDS.find((k) => k.id === this.kindredId);
    const capstone = getTree(klass.id).find((s) => s.capstone);

    const items = [];
    const veil = this.add.rectangle(cx, height / 2, width, height, 0x05060f, 0.88).setInteractive().setDepth(300);
    items.push(veil);

    const panelW = Math.min(520, width - 24);
    const panel = drawPanel(this, cx, height / 2, panelW, Math.min(360, height - 20), { material: 'wood', radius: 12, rivets: true, depth: 301 });
    items.push(panel);
    const panelTop = height / 2 - panel.height / 2;

    if (capstone?.icon) {
      items.push(
        this.add.image(cx, panelTop + 10, iconTexture(capstone.icon)).setDisplaySize(20, 20).setTint(iconTint(capstone)).setDepth(302)
      );
    }
    items.push(
      this.add.text(cx, panelTop + (capstone?.icon ? 24 : 10), `${klass.name} — Ultimate: ${capstone?.name ?? ''}`, {
        fontFamily: FONTS.body, fontSize: '15px', color: '#d9b968',
      }).setOrigin(0.5, 0).setDepth(302)
    );
    items.push(
      this.add.text(cx, panelTop + (capstone?.icon ? 46 : 32), capstone?.effect ?? '', {
        fontFamily: FONTS.body, fontSize: '10px', color: COLORS.textDim, align: 'center',
        wordWrap: { width: panelW - 40 }, lineSpacing: 2,
      }).setOrigin(0.5, 0).setDepth(302)
    );

    // the little stage
    const stageY = height / 2 + 26;
    const stage = this.add.rectangle(cx, stageY, panelW - 40, 120, MATERIALS.slate.dark, 0.9).setStrokeStyle(1, MATERIALS.slate.light).setDepth(301);
    items.push(stage);
    const caster = this.add.sprite(cx - 40, stageY + 30, kindred.sheet, ROW.walkDown * SHEET_COLS).setDepth(303);
    caster.play(`${kindred.sheet}-idle-down`);
    items.push(caster);
    const allies = [];
    if (SUPPORT_ULTIMATES.includes(klass.id)) {
      const ally = this.add.sprite(cx + 55, stageY + 30, 'npc_kinswoman', ROW.walkDown * SHEET_COLS).setDepth(303);
      ally.play('npc_kinswoman-idle-down');
      items.push(ally);
      allies.push({ x: ally.x, y: ally.y });
    }

    // loop the ultimate until the player decides — the caster swings their
    // class's own weapon and plays the strike animation, same as in-game
    let dead = false;
    const family = animFamilyOf(WEAPON_BY_CLASS[klass.id]);
    const loop = () => {
      if (dead) return;
      caster.play(`${kindred.sheet}-${family}-down`, true);
      playWeaponSwing(this, caster, WEAPON_BY_CLASS[klass.id], 'down', { skill: true });
      caster.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (!dead) caster.play(`${kindred.sheet}-idle-down`);
      });
      const dur = playUltimate(this, klass.id, { x: caster.x, y: caster.y }, allies, { x: cx + 55, y: stageY + 20 });
      this.previewTimer = this.time.delayedCall(dur + 700, loop);
    };
    loop();

    const cleanup = () => {
      dead = true;
      this.previewTimer?.remove();
      items.forEach((o) => o.destroy());
      btnBack.destroy();
      btnTry.destroy();
      btnGo.destroy();
    };
    const by = panelTop + panel.height - 30;
    const btnBack = makeTextButton(this, cx - 168, by, 150, 42, '← Back', () => cleanup()).setDepth(302);
    const btnTry = makeTextButton(this, cx, by, 150, 42, '⚔ Try skills', () => {
      cleanup();
      this.startTraining(klass);
    }).setDepth(302);
    const btnGo = makeTextButton(this, cx + 168, by, 150, 42, `Begin as ${klass.name}`, () => {
      cleanup();
      this.confirm(klass);
    }, { stroke: 0xd9b968 }).setDepth(302);
  }

  // Throwaway trial run on the Training Grounds: every skill unlocked, the
  // class weapon equipped, deep MP/potion pockets — and state.training set,
  // so SaveSystem refuses to persist any of it.
  startTraining(klass) {
    const state = newGameState(this.kindredId, klass.id);
    state.training = true;
    state.zone = 'training';
    state.quest = { id: 'training', stage: 0, flags: {} };
    state.seenIntro = true;
    state.level = 40;
    for (const s of getTree(klass.id)) state.skills[s.id] = 1;
    state.stats.MAG += 10; // MP headroom so magic kits can chain-cast
    const d = derivedStats(state.stats);
    state.hp = d.maxHp;
    state.mp = d.maxMp;
    state.equipment.weapon = WEAPON_BY_CLASS[klass.id] ?? null;
    // classes with a second listed weapon (e.g. Skirmisher's "Dagger &
    // sling") get it in the pack too, so both can be equipped and compared
    const alt = ALT_WEAPON_BY_CLASS[klass.id];
    if (alt) state.inventory.push(alt);
    // a full chest/gloves/boots set per armor weight class, so the
    // heavy/light/robe paperdoll looks (src/ui/theme.js ARMOR_STYLES) can be
    // tried on and compared side by side
    state.inventory.push(
      'steppe_cloak', 'herders_bracers', 'steppe_boots',
      'trial_iron_cuirass', 'trial_iron_gauntlets', 'trial_iron_greaves',
      'trial_woven_robe', 'trial_sleeve_wraps', 'trial_cloth_slippers'
    );
    state.potions = { hp: 9, mp: 9 };
    setState(this, state);
    this.scene.start('World');
  }

  confirm(klass) {
    const state = newGameState(this.kindredId, klass.id);
    setState(this, state);
    const profileId = this.registry.get('profileId');
    const campaignId = this.registry.get('campaignId');
    const slotIndex = this.registry.get('slotIndex');
    SaveSystem.setSlot(profileId, campaignId, slotIndex, {
      ...state,
      savedAt: Date.now(),
      lastWhere: 'The shores of Cuiviénen',
    });
    this.scene.start('Story', {
      id: 'awakening-at-cuivienen',
      title: 'Cuiviénen, the Waters of Awakening',
      art: 'art-cuivienen-awakening',
      paragraphs: [
        'Before Sun, before Moon, there is only starlight — and the mere of Cuiviénen, where your people woke beneath it.',
        'But of late, those who wander far from the water do not come back. The hunters speak of a Rider in the dark, and of shadows that are not shadows.',
        'Tonight, another of your kin has not returned.',
      ],
      button: 'Wake',
      next: 'World',
    });
  }
}
