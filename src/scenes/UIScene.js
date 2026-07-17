import Phaser from 'phaser';
import { COLORS, FONTS, EV } from '../config.js';
import { makeTextButton } from '../ui/widgets.js';
import { ensureSkillIconTextures, iconTexture } from '../fx/skillicons.js';

// HUD overlay running above WorldScene:
//   - virtual joystick (left half of the screen, appears under the thumb)
//   - contextual action button + attack button (bottom right)
//   - quest tracker + HP (top left), menu (top right)
//   - dialogue bottom-sheet with tap-to-advance and choice buttons
// Keyboard equivalents for desktop testing: WASD/arrows, E (action), Space (attack).

const JOY_RADIUS = 52;
const JOY_DEAD = 8;

export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  create() {
    ensureSkillIconTextures(this);
    this.game.joy = { x: 0, y: 0, active: false };
    this.game.uiBlocking = false;

    this.dialogue = null; // active dialogue payload
    this.dialogueLine = 0;
    this.choiceButtons = [];
    this.pauseItems = null;

    this.buildStatic();
    this.bindEvents();
    this.bindJoystick();

    this.scale.on('resize', () => this.layout());

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      const g = this.game.events;
      g.off(EV.DIALOGUE, this.onDialogue, this);
      g.off(EV.TRACKER, this.onTracker, this);
      g.off(EV.TOAST, this.onToast, this);
      g.off(EV.ACTION_SET, this.onActionSet, this);
      g.off(EV.ATTACK_SET, this.onAttackSet, this);
      g.off(EV.HP, this.onHp, this);
      g.off(EV.MP, this.onMp, this);
      g.off(EV.XP, this.onXp, this);
      g.off(EV.GOLD, this.onGold, this);
      g.off(EV.SKILLBAR, this.onSkillbar, this);
      g.off(EV.ITEM_GET, this.onItemGet, this);
    });
  }

  // ---------- static HUD ----------

  buildStatic() {
    // joystick graphics (hidden until touch)
    this.joyBase = this.add.circle(0, 0, JOY_RADIUS, 0xffffff, 0.08).setStrokeStyle(2, 0xffffff, 0.25).setVisible(false).setDepth(50);
    this.joyKnob = this.add.circle(0, 0, 22, 0xffffff, 0.22).setVisible(false).setDepth(51);

    // action + attack buttons
    this.actionBtn = this.makeRoundButton('', 0xd9b968, () => this.game.events.emit(EV.ACTION_PRESSED));
    this.actionBtn.cont.setVisible(false);
    this.attackBtn = this.makeRoundButton('⚔\nAttack', 0xa03030, () => this.game.events.emit(EV.ATTACK_PRESSED));
    this.attackBtn.cont.setVisible(false);

    // the skill wheel: an 8-slot ring (6 learned skills + HP/MP potions),
    // 4 positions visible at a time, rotated with the ⟳ button so every
    // learned skill stays reachable
    this.ring = [null, null, null, null, null, null, null, null];
    this.ringOffset = 0;
    this.skillBtns = [];
    for (let i = 0; i < 4; i++) {
      const b = this.makeRoundButton('', 0x6a8fd9, () => this.game.events.emit(EV.SKILL_PRESSED, { slot: (this.ringOffset + i) % 8 }), 26);
      b.cont.setVisible(false);
      this.skillBtns.push(b);
    }
    this.rotateBtn = this.makeRoundButton('⟳', 0xd9b968, () => {
      // a clean page-swap between batch A (slots 0-3) and batch B (slots
      // 4-7) — not a sliding window, so nothing from the old view carries over
      this.ringOffset = this.ringOffset === 0 ? 4 : 0;
      this.renderRing();
    }, 18);
    this.rotateBtn.cont.setVisible(false);

    // quest tracker
    this.trackerTitle = this.add.text(12, 10, '', {
      fontFamily: FONTS.body, fontSize: '14px', color: '#d9b968', fontStyle: 'italic',
    }).setDepth(60);
    this.trackerObjective = this.add.text(12, 30, '', {
      fontFamily: FONTS.body, fontSize: '13px', color: COLORS.text, wordWrap: { width: 230 },
    }).setDepth(60);

    // hp bar
    this.hpBg = this.add.rectangle(12, 58, 120, 8, 0x000000, 0.5).setOrigin(0, 0.5).setDepth(60);
    this.hpFill = this.add.rectangle(13, 58, 118, 6, 0x3fae5a, 1).setOrigin(0, 0.5).setDepth(61);
    this.hpBg.setVisible(false);
    this.hpFill.setVisible(false);

    // mp bar
    this.mpBg = this.add.rectangle(12, 70, 120, 6, 0x000000, 0.5).setOrigin(0, 0.5).setDepth(60).setVisible(false);
    this.mpFill = this.add.rectangle(13, 70, 118, 4, 0x4a7fd9, 1).setOrigin(0, 0.5).setDepth(61).setVisible(false);

    // level + xp bar
    this.lvlText = this.add.text(12, 82, '', {
      fontFamily: FONTS.body, fontSize: '11px', color: '#d9b968',
    }).setDepth(60).setVisible(false);
    this.xpBg = this.add.rectangle(12, 98, 120, 5, 0x000000, 0.5).setOrigin(0, 0.5).setDepth(60).setVisible(false);
    this.xpFill = this.add.rectangle(13, 98, 118, 3, 0x6a8fd9, 1).setOrigin(0, 0.5).setDepth(61).setVisible(false);

    // menu button
    this.menuBtn = this.add.text(0, 0, '☰', {
      fontFamily: 'sans-serif', fontSize: '26px', color: '#e8e4d8',
      backgroundColor: 'rgba(16,24,48,0.75)', padding: { x: 12, y: 6 },
    }).setDepth(60).setInteractive({ useHandCursor: true });
    this.menuBtn.on('pointerup', () => this.togglePause());

    // gold, top-right under the menu button
    this.goldText = this.add.text(0, 0, '🪙 0', {
      fontFamily: FONTS.body, fontSize: '13px', color: '#d9b968',
      backgroundColor: 'rgba(16,24,48,0.75)', padding: { x: 8, y: 4 },
    }).setDepth(60).setVisible(false);

    // dialogue bottom sheet
    this.sheet = this.add.container(0, 0).setDepth(80).setVisible(false);
    this.sheetBg = this.add.rectangle(0, 0, 10, 10, COLORS.panel, 0.96).setStrokeStyle(2, COLORS.panelLine);
    this.sheetName = this.add.text(0, 0, '', { fontFamily: FONTS.body, fontSize: '14px', color: '#d9b968', fontStyle: 'italic' });
    this.sheetText = this.add.text(0, 0, '', { fontFamily: FONTS.body, fontSize: '16px', color: COLORS.text, lineSpacing: 4 });
    this.sheetMore = this.add.text(0, 0, '▾ tap', { fontFamily: FONTS.body, fontSize: '11px', color: COLORS.textDim });
    this.sheet.add([this.sheetBg, this.sheetName, this.sheetText, this.sheetMore]);
    this.sheetBg.setInteractive();
    this.sheetBg.on('pointerup', () => this.advanceDialogue());

    // keyboard shortcuts for desktop testing
    this.input.keyboard?.on('keydown-E', () => {
      if (this.dialogue) this.advanceDialogue();
      else if (this.actionBtn.cont.visible) this.game.events.emit(EV.ACTION_PRESSED);
    });
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.dialogue) this.advanceDialogue();
      else if (this.attackBtn.cont.visible) this.game.events.emit(EV.ATTACK_PRESSED);
    });
    this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
    // number keys pick dialogue choices (desktop convenience)
    ['ONE', 'TWO', 'THREE'].forEach((k, i) => {
      this.input.keyboard?.on(`keydown-${k}`, () => {
        const c = this.dialogue?.choices?.[i];
        if (c && this.choiceButtons.length) this.closeDialogue(c.id);
      });
    });

    this.layout();
  }

  makeRoundButton(label, ringColor, onTap, radius = 38) {
    const cont = this.add.container(0, 0).setDepth(55);
    const circle = this.add.circle(0, 0, radius, COLORS.panel, 0.85).setStrokeStyle(3, ringColor, 0.9);
    const txt = this.add.text(0, 0, label, {
      fontFamily: FONTS.body, fontSize: radius < 30 ? '10px' : '14px', color: COLORS.text, align: 'center', wordWrap: { width: radius * 1.7 },
    }).setOrigin(0.5);
    // an optional skill/effect icon — hidden until renderRing() gives it a
    // texture; when shown, the icon takes the upper half of the circle and
    // the label shrinks to a caption underneath it
    const icon = this.add.image(0, -radius * 0.28, iconTexture('bash')).setVisible(false).setDisplaySize(radius * 0.85, radius * 0.85);
    cont.add([circle, txt, icon]);
    cont.setSize(radius * 2, radius * 2);
    // hit-area coords are local with (0,0) at the object's TOP-LEFT, so the
    // circle must be centered at (radius, radius) — centering it at (0,0)
    // leaves only a corner sliver tappable (the old, very stiff-feeling bug)
    circle.setInteractive(new Phaser.Geom.Circle(radius, radius, radius + 6), Phaser.Geom.Circle.Contains);
    circle.on('pointerdown', () => circle.setFillStyle(0x1c2a50, 1));
    circle.on('pointerup', () => { circle.setFillStyle(COLORS.panel, 0.85); onTap(); });
    circle.on('pointerout', () => circle.setFillStyle(COLORS.panel, 0.85));
    return { cont, txt, circle, icon };
  }

  layout() {
    const { width, height } = this.scale;
    this.menuBtn.setPosition(width - this.menuBtn.width - 10, 8);
    this.goldText.setPosition(width - this.goldText.width - 10, this.menuBtn.y + this.menuBtn.height + 6);
    this.actionBtn.cont.setPosition(width - 62, height - 66);
    this.attackBtn.cont.setPosition(width - 62, height - 160);
    // skill wheel arcs up-left from the attack button, rotate hub inside it
    const arc = [
      { x: width - 150, y: height - 176 },
      { x: width - 196, y: height - 128 },
      { x: width - 216, y: height - 64 },
      { x: width - 150, y: height - 40 },
    ];
    this.skillBtns?.forEach((b, i) => b.cont.setPosition(arc[i].x, arc[i].y));
    this.rotateBtn?.cont.setPosition(width - 158, height - 104);
    if (this.dialogue) this.layoutSheet();
  }

  // ---------- event wiring ----------

  bindEvents() {
    const g = this.game.events;
    g.on(EV.DIALOGUE, this.onDialogue, this);
    g.on(EV.TRACKER, this.onTracker, this);
    g.on(EV.TOAST, this.onToast, this);
    g.on(EV.ACTION_SET, this.onActionSet, this);
    g.on(EV.ATTACK_SET, this.onAttackSet, this);
    g.on(EV.HP, this.onHp, this);
    g.on(EV.MP, this.onMp, this);
    g.on(EV.XP, this.onXp, this);
    g.on(EV.GOLD, this.onGold, this);
    g.on(EV.SKILLBAR, this.onSkillbar, this);
    g.on(EV.ITEM_GET, this.onItemGet, this);
  }

  onSkillbar({ slots }) {
    this.ring = slots;
    this.renderRing();
  }

  renderRing() {
    const anyContent = this.ring.some((s) => s);
    this.rotateBtn.cont.setVisible(anyContent);
    this.skillBtns.forEach((b, i) => {
      const s = this.ring[(this.ringOffset + i) % 8];
      if (!s) {
        b.cont.setVisible(false);
        return;
      }
      const isPotion = !!s.potion;
      // skills get their icon glyph up top and a small name caption below
      // it; potions have no icon (their 🧪 emoji name already reads fine)
      if (s.icon) {
        b.icon.setTexture(iconTexture(s.icon)).setTint(s.tint ?? 0xffffff).setVisible(true);
        b.txt.setPosition(0, 15).setFontSize(8);
      } else {
        b.icon.setVisible(false);
        b.txt.setPosition(0, 0).setFontSize(10);
      }
      b.txt.setText(s.name);
      b.circle.setStrokeStyle(3, s.ready ? (isPotion ? (s.potion === 'hp' ? 0x3fae5a : 0x4a7fd9) : 0x6a8fd9) : 0x3a4a5a, 0.9);
      b.txt.setColor(s.ready ? '#e8e4d8' : '#5a6a88');
      b.icon.setAlpha(s.ready ? 1 : 0.45);
      b.cont.setVisible(true);
    });
  }

  // Prominent gold-bordered banner for received items — louder than a
  // toast, so rewards never slip into the pack unnoticed.
  onItemGet({ name, bonus }) {
    const { width, height } = this.scale;
    const w = Math.min(360, width - 60);
    const cont = this.add.container(width / 2, height * 0.32).setDepth(92).setAlpha(0);
    const bg = this.add.rectangle(0, 0, w, 64, 0x101830, 0.96).setStrokeStyle(2, 0xd9b968);
    const t1 = this.add.text(0, -14, `✦ Item diperoleh: ${name}`, {
      fontFamily: FONTS.body, fontSize: '14px', color: '#d9b968',
    }).setOrigin(0.5);
    const t2 = this.add.text(0, 10, bonus ?? '', {
      fontFamily: FONTS.body, fontSize: '12px', color: COLORS.text,
    }).setOrigin(0.5);
    cont.add([bg, t1, t2]);
    this.tweens.add({ targets: cont, alpha: 1, y: cont.y + 8, duration: 250 });
    this.time.delayedCall(2600, () =>
      this.tweens.add({ targets: cont, alpha: 0, duration: 350, onComplete: () => cont.destroy() })
    );
  }

  onTracker(data) {
    this.trackerTitle.setText(data ? data.title : '');
    this.trackerObjective.setText(data ? data.objective : '');
  }

  onToast({ text, duration = 2200 }) {
    const { width, height } = this.scale;
    const t = this.add
      .text(width / 2, height * 0.2, text, {
        fontFamily: FONTS.body, fontSize: '15px', color: '#f5eeda', align: 'center',
        backgroundColor: 'rgba(10,17,40,0.85)', padding: { x: 14, y: 8 }, wordWrap: { width: width - 80 },
      })
      .setOrigin(0.5)
      .setDepth(90)
      .setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, y: t.y + 6, duration: 250 });
    this.time.delayedCall(duration, () =>
      this.tweens.add({ targets: t, alpha: 0, duration: 350, onComplete: () => t.destroy() })
    );
  }

  onActionSet(data) {
    if (data) {
      this.actionBtn.txt.setText(data.label);
      this.actionBtn.cont.setVisible(true);
    } else {
      this.actionBtn.cont.setVisible(false);
    }
  }

  onAttackSet(data) {
    this.attackBtn.cont.setVisible(!!data?.visible);
  }

  onHp({ hp, maxHp }) {
    this.hpBg.setVisible(true);
    this.hpFill.setVisible(true);
    const f = Phaser.Math.Clamp(hp / maxHp, 0, 1);
    this.hpFill.width = 118 * f;
    this.hpFill.setFillStyle(f > 0.5 ? 0x3fae5a : f > 0.25 ? 0xc9a13c : 0xa03030);
  }

  onXp({ level, xp, xpToNext }) {
    this.lvlText.setText(`Lv. ${level}`).setVisible(true);
    this.xpBg.setVisible(true);
    this.xpFill.setVisible(true);
    const f = Phaser.Math.Clamp(xp / xpToNext, 0, 1);
    this.xpFill.width = 118 * f;
  }

  onMp({ mp, maxMp }) {
    this.mpBg.setVisible(true);
    this.mpFill.setVisible(true);
    const f = Phaser.Math.Clamp(mp / maxMp, 0, 1);
    this.mpFill.width = 118 * f;
  }

  onGold({ gold }) {
    this.goldText.setText(`🪙 ${gold}`).setVisible(true);
    this.layout();
  }

  // ---------- dialogue ----------

  onDialogue(payload) {
    this.dialogue = payload;
    this.dialogueLine = 0;
    this.game.uiBlocking = true;
    this.sheet.setVisible(true);
    this.showLine();
  }

  layoutSheet() {
    const { width, height } = this.scale;
    const w = Math.min(620, width - 16);
    const line = this.dialogue.lines[this.dialogueLine];
    this.sheetText.setWordWrapWidth(w - 32);
    this.sheetText.setText(line.text);
    const textH = this.sheetText.height;
    const h = Math.max(96, textH + 52);
    this.sheetBg.setSize(w, h);
    this.sheet.setPosition(width / 2, height - h / 2 - 8);
    this.sheetBg.setPosition(0, 0);
    this.sheetName.setPosition(-w / 2 + 16, -h / 2 + 8);
    this.sheetName.setText(line.speaker ?? '');
    this.sheetText.setPosition(-w / 2 + 16, -h / 2 + (line.speaker ? 30 : 14));
    this.sheetMore.setPosition(w / 2 - 52, h / 2 - 20);
    const last = this.dialogueLine >= this.dialogue.lines.length - 1;
    this.sheetMore.setText(last && this.dialogue.choices?.length ? '' : last ? '▾ close' : '▾ tap');
  }

  showLine() {
    this.clearChoices();
    this.layoutSheet();
    const last = this.dialogueLine >= this.dialogue.lines.length - 1;
    if (last && this.dialogue.choices?.length) this.showChoices();
  }

  showChoices() {
    const { width } = this.scale;
    const w = Math.min(620, width - 16);
    const sheetTop = this.sheet.y - this.sheetBg.height / 2;
    const n = this.dialogue.choices.length;
    this.dialogue.choices.forEach((c, i) => {
      const y = sheetTop - (n - i) * 56 - 6;
      const b = makeTextButton(this, width / 2, y, w, 48, c.label, () => this.closeDialogue(c.id), {
        fill: 0x18244a, fillAlpha: 0.97,
      });
      b.setDepth(85);
      this.choiceButtons.push(b);
    });
  }

  clearChoices() {
    this.choiceButtons.forEach((b) => b.destroy());
    this.choiceButtons = [];
  }

  advanceDialogue() {
    if (!this.dialogue) return;
    const last = this.dialogueLine >= this.dialogue.lines.length - 1;
    if (!last) {
      this.dialogueLine += 1;
      this.showLine();
    } else if (!this.dialogue.choices?.length) {
      this.closeDialogue(null);
    }
    // if choices are showing, sheet taps do nothing — a choice must be made
  }

  closeDialogue(choiceId) {
    const done = this.dialogue?.onDone;
    this.clearChoices();
    this.sheet.setVisible(false);
    this.dialogue = null;
    this.game.uiBlocking = this.pauseItems != null;
    this.game.events.emit(EV.DIALOGUE_CLOSED);
    done?.(choiceId);
  }

  // ---------- pause ----------

  togglePause() {
    if (this.dialogue) return;
    if (this.pauseItems) return this.closePause();
    const { width, height } = this.scale;
    this.game.uiBlocking = true;
    const veil = this.add.rectangle(width / 2, height / 2, width, height, 0x05060f, 0.75).setDepth(95).setInteractive();
    const bw = Math.min(300, width - 60);
    const items = [veil];
    const mk = (i, label, cb) =>
      items.push(makeTextButton(this, width / 2, height / 2 - 118 + i * 52, bw, 48, label, cb).setDepth(96));
    const st = this.registry.get('state');
    const pts = (st?.statPoints ?? 0) + (st?.skillPoints ?? 0);
    mk(0, '▶ Resume', () => this.closePause());
    mk(1, pts > 0 ? `⚔ Character (${pts})` : '⚔ Character', () => {
      this.closePause();
      this.game.events.emit(EV.MENU_CHARACTER);
    });
    mk(2, '💾 Save', () => {
      this.game.events.emit(EV.MENU_SAVE);
      this.closePause();
    });
    mk(3, '🗺 The Road West', () => {
      this.closePause();
      this.game.events.emit(EV.MENU_QUIT, { to: 'Journey' });
    });
    mk(4, '👥 Switch Character', () => {
      this.game.events.emit(EV.MENU_SAVE);
      this.closePause();
      this.game.events.emit(EV.MENU_QUIT, { to: 'CharacterSlot' });
    });
    mk(5, '🏠 Save & Quit to Homepage', () => {
      this.game.events.emit(EV.MENU_SAVE);
      this.closePause();
      this.game.events.emit(EV.MENU_QUIT, { to: 'Title' });
    });
    this.pauseItems = items;
  }

  closePause() {
    this.pauseItems?.forEach((o) => o.destroy());
    this.pauseItems = null;
    this.game.uiBlocking = this.dialogue != null;
  }

  // ---------- joystick ----------

  bindJoystick() {
    this.joyPointerId = null;
    this.joyOrigin = null;

    this.input.on('pointerdown', (pointer, over) => {
      if (this.game.uiBlocking) return;
      if (over.length > 0) return; // touched a UI element
      if (pointer.x > this.scale.width * 0.55) return; // right side = buttons
      if (this.joyPointerId !== null) return;
      this.joyPointerId = pointer.id;
      this.joyOrigin = { x: pointer.x, y: pointer.y };
      this.joyBase.setPosition(pointer.x, pointer.y).setVisible(true);
      this.joyKnob.setPosition(pointer.x, pointer.y).setVisible(true);
      this.game.joy.active = true;
    });

    this.input.on('pointermove', (pointer) => {
      if (pointer.id !== this.joyPointerId || !this.joyOrigin) return;
      let dx = pointer.x - this.joyOrigin.x;
      let dy = pointer.y - this.joyOrigin.y;
      const len = Math.hypot(dx, dy);
      if (len > JOY_RADIUS) {
        dx = (dx / len) * JOY_RADIUS;
        dy = (dy / len) * JOY_RADIUS;
      }
      this.joyKnob.setPosition(this.joyOrigin.x + dx, this.joyOrigin.y + dy);
      if (len < JOY_DEAD) {
        this.game.joy.x = 0;
        this.game.joy.y = 0;
      } else {
        this.game.joy.x = dx / JOY_RADIUS;
        this.game.joy.y = dy / JOY_RADIUS;
      }
    });

    const release = (pointer) => {
      if (pointer.id !== this.joyPointerId) return;
      this.joyPointerId = null;
      this.joyOrigin = null;
      this.joyBase.setVisible(false);
      this.joyKnob.setVisible(false);
      this.game.joy = { x: 0, y: 0, active: false };
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
  }
}
