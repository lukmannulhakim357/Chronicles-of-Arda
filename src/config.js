// Shared constants and cross-scene event names.

export const TILE = 32;
export const FRAME = 64; // LPC frame size

// LPC universal sheet layout: 13 columns per row.
export const SHEET_COLS = 13;
export const ROW = {
  spellcastUp: 0,
  spellcastLeft: 1,
  spellcastDown: 2,
  spellcastRight: 3,
  thrustUp: 4,
  thrustLeft: 5,
  thrustDown: 6,
  thrustRight: 7,
  walkUp: 8,
  walkLeft: 9,
  walkDown: 10,
  walkRight: 11,
  slashUp: 12,
  slashLeft: 13,
  slashDown: 14,
  slashRight: 15,
  hurt: 20,
};

export const DIRS = ['up', 'left', 'down', 'right'];

// Global event bus names (game.events)
export const EV = {
  DIALOGUE: 'ui:dialogue', // { lines:[{speaker,text}], choices:[{id,label}], onDone(choiceId) }
  DIALOGUE_CLOSED: 'ui:dialogue-closed',
  TRACKER: 'ui:tracker', // { title, objective } | null
  TOAST: 'ui:toast', // { text, duration? }
  ACTION_SET: 'ui:action-set', // { label } | null  (contextual action button)
  ACTION_PRESSED: 'ui:action-pressed',
  ATTACK_SET: 'ui:attack-set', // { visible:boolean }
  ATTACK_PRESSED: 'ui:attack-pressed',
  SKILL_PRESSED: 'ui:skill-pressed', // { slot } — action-bar slot tapped
  SKILLBAR: 'ui:skillbar', // { slots: [{ name, ready }|null x4] } — refresh HUD skill buttons
  ITEM_GET: 'ui:item-get', // { name, bonus } — prominent item-received banner
  HP: 'ui:hp', // { hp, maxHp }
  MP: 'ui:mp', // { mp, maxMp }
  XP: 'ui:xp', // { level, xp, xpToNext }
  GOLD: 'ui:gold', // { gold }
  MENU_SAVE: 'menu:save',
  MENU_QUIT: 'menu:quit',
  MENU_CHARACTER: 'menu:character',
  PAUSE_OPEN: 'ui:pause-open',
  PAUSE_CLOSED: 'ui:pause-closed',
};

export const COLORS = {
  night: 0x0a1128,
  panel: 0x101830,
  panelLine: 0x3a4a7a,
  gold: 0xd9b968,
  silver: 0xbcc8de,
  text: '#e8e4d8',
  textDim: '#9aa4bc',
  danger: 0xa03030,
};

export const FONTS = {
  body: 'Georgia, "Times New Roman", serif',
};
