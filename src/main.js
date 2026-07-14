import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import CampaignSelectScene from './scenes/CampaignSelectScene.js';
import CharacterSlotScene from './scenes/CharacterSlotScene.js';
import CreationScene from './scenes/CreationScene.js';
import StoryScene from './scenes/StoryScene.js';
import WorldScene from './scenes/WorldScene.js';
import JourneyScene from './scenes/JourneyScene.js';
import UIScene from './scenes/UIScene.js';
import CharacterScene from './scenes/CharacterScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#05060f',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  input: {
    activePointers: 3, // joystick + action button + one spare
  },
  scene: [
    BootScene,
    TitleScene,
    CampaignSelectScene,
    CharacterSlotScene,
    CreationScene,
    StoryScene,
    WorldScene,
    JourneyScene,
    UIScene,
    CharacterScene,
  ],
};

const game = new Phaser.Game(config);
// handle for debugging / automated smoke tests
window.__game = game;
