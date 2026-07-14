import Phaser from 'phaser';
import { FRAME, SHEET_COLS, ROW, DIRS, COLORS, FONTS } from '../config.js';

const CHARACTERS = [
  'player_vanyar',
  'player_noldor',
  'player_teleri',
  'npc_elder',
  'npc_kinswoman',
  'npc_kinsman',
  'npc_elf_hunter',
  'npc_orome',
  'npc_shadow',
];

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2 - 30, 'Chronicles of Arda', {
        fontFamily: FONTS.body,
        fontSize: '26px',
        color: COLORS.text,
      })
      .setOrigin(0.5);
    const barBg = this.add.rectangle(width / 2, height / 2 + 14, 240, 10, 0x1a2138).setOrigin(0.5);
    const bar = this.add.rectangle(width / 2 - 118, height / 2 + 14, 4, 6, 0xd9b968).setOrigin(0, 0.5);
    this.load.on('progress', (v) => {
      bar.width = 4 + 232 * v;
    });
    this.load.on('complete', () => {
      barBg.destroy();
      bar.destroy();
    });

    for (const key of CHARACTERS) {
      this.load.spritesheet(key, `assets/characters/${key}.png`, {
        frameWidth: FRAME,
        frameHeight: FRAME,
      });
    }

    // tiles (32px grids / decor images)
    this.load.spritesheet('ground_green', 'assets/tiles/greenGround2.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('water', 'assets/tiles/water.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('grasses', 'assets/tiles/grasses.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('evergreen', 'assets/tiles/evergreen.png', { frameWidth: 96, frameHeight: 128 });
    this.load.image('fir_trees', 'assets/tiles/fir_trees.png');
    this.load.image('pine_tree', 'assets/tiles/pine_tree.png');
    this.load.image('rocks', 'assets/tiles/rocks.png');
    this.load.image('rock_cluster', 'assets/tiles/rock_cluster.png');
    this.load.image('large_boulder', 'assets/tiles/large_boulder.png');
    this.load.image('large_pebble', 'assets/tiles/large_pebble.png');
  }

  create() {
    this.createCharacterAnims();
    this.createGeneratedTextures();
    this.scene.start('Title');
  }

  createCharacterAnims() {
    const mk = (key, animKey, row, frames, frameRate, repeat) => {
      if (this.anims.exists(animKey)) return;
      this.anims.create({
        key: animKey,
        frames: this.anims.generateFrameNumbers(key, {
          start: row * SHEET_COLS,
          end: row * SHEET_COLS + frames - 1,
        }),
        frameRate,
        repeat,
      });
    };

    for (const key of CHARACTERS) {
      const walkRows = { up: ROW.walkUp, left: ROW.walkLeft, down: ROW.walkDown, right: ROW.walkRight };
      const slashRows = { up: ROW.slashUp, left: ROW.slashLeft, down: ROW.slashDown, right: ROW.slashRight };
      for (const d of DIRS) {
        mk(key, `${key}-walk-${d}`, walkRows[d], 9, 12, -1);
        mk(key, `${key}-slash-${d}`, slashRows[d], 6, 14, 0);
        if (!this.anims.exists(`${key}-idle-${d}`)) {
          this.anims.create({
            key: `${key}-idle-${d}`,
            frames: [{ key, frame: walkRows[d] * SHEET_COLS }],
            frameRate: 1,
          });
        }
      }
      mk(key, `${key}-hurt`, ROW.hurt, 6, 10, 0);
    }
  }

  createGeneratedTextures() {
    // 2px star / sparkle dot
    if (!this.textures.exists('px-star')) {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 2, 2);
      g.generateTexture('px-star', 2, 2);
      g.destroy();
    }
    // soft radial glow (for Oromë's light, clue sparkles)
    if (!this.textures.exists('glow')) {
      const size = 128;
      const cnv = this.textures.createCanvas('glow', size, size);
      const ctx = cnv.getContext();
      const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
      grad.addColorStop(0, 'rgba(255,240,200,0.9)');
      grad.addColorStop(0.4, 'rgba(255,230,170,0.35)');
      grad.addColorStop(1, 'rgba(255,230,170,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      cnv.refresh();
    }
  }
}
