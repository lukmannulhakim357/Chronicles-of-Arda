// Full-quest end-to-end test: Homepage -> New Game -> profile -> campaign
// select -> character slot -> creation -> plays "The Vanishing" through to
// the Journey map, using keyboard input + test teleports between legs.
// Covers the level-up moment at Oromë's departure (grants XP crossing into
// level 2, opens the Character/Stats screen) and the level/statPoints HUD.
// Then verifies reload -> Load Game -> resume works off the new profile store.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const OUT = './smoke-shots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 800, height: 450 }, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

const world = () => `window.__game.scene.getScene('World')`;
const tp = async (tx, ty) => {
  await page.evaluate(`(() => { const w = ${world()}; w.player.setPosition(${tx}*32+16, ${ty}*32+16); })()`);
  await page.waitForTimeout(350);
};
const stage = () => page.evaluate(`${world()}.state.quest.stage`);
const tapSheet = async (n = 1) => {
  for (let i = 0; i < n; i++) { await page.keyboard.press('E'); await page.waitForTimeout(350); }
};

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(2200);
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(2200);

// Homepage -> New Game -> profile name -> Campaign Select -> Character Slot
await page.mouse.click(400, 225); // New Game
await page.waitForTimeout(600);
await page.fill('input[type="text"]', 'QA Tester');
await page.click('button:has-text("Begin")');
await page.waitForTimeout(900);
await page.mouse.click(135, 160); // The Great Journey card (leftmost, unlocked)
await page.waitForTimeout(900);
await page.mouse.click(400, 110); // empty Slot 1 -> Creation
await page.waitForTimeout(900);

// creation -> Noldor -> Loresinger
await page.mouse.click(400, 262); // Noldor card (2nd)
await page.waitForTimeout(900);
await page.mouse.click(400 - 387 + 93 + 2 * 196, 120); // Loresinger (3rd col)
await page.waitForTimeout(1200);
await page.mouse.click(400, 390); // Wake
await page.waitForTimeout(3200);

// intro dialogue (2 lines)
await tapSheet(2);
console.log('stage after intro:', await stage());

// talk to elder (stage 0 -> 1)
await tp(25, 23);
await page.keyboard.press('E'); await page.waitForTimeout(400);
await tapSheet(3);
console.log('stage after elder:', await stage());
await page.screenshot({ path: `${OUT}/10-stage1.png` });

// clues
await tp(31.5, 18); await page.keyboard.press('E'); await page.waitForTimeout(400); await tapSheet(1);
await tp(37.5, 12); await page.keyboard.press('E'); await page.waitForTimeout(400); await tapSheet(1);
await page.screenshot({ path: `${OUT}/11-clue2.png` });
await page.keyboard.down('w'); await page.keyboard.down('d'); await page.waitForTimeout(1600); await page.keyboard.up('w'); await page.keyboard.up('d'); await page.screenshot({ path: `${OUT}/11b-walk-to-clue3.png` }); await tp(41.5, 7.8); await page.keyboard.press('E'); await page.waitForTimeout(400); await tapSheet(1);
await page.waitForTimeout(600);
console.log('stage after clues:', await stage());
await page.screenshot({ path: `${OUT}/12-encounter.png` });

// fight the shadow: spam space, stay near Náro
for (let i = 0; i < 14; i++) {
  await page.keyboard.press('Space');
  await page.waitForTimeout(650);
  const s = await stage();
  if (s >= 3) break;
}
await page.waitForTimeout(3500); // Oromë rides in
console.log('stage after fight:', await stage());
await page.screenshot({ path: `${OUT}/13-orome.png` });

// approach Oromë and talk
await tp(41, 8.5);
await page.keyboard.press('E'); await page.waitForTimeout(500);
await tapSheet(4); // 4 lines, then choices
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/14-choice.png` });
await page.keyboard.press('1'); // trust
await page.waitForTimeout(600);
await tapSheet(1); // Oromë reply
await page.waitForTimeout(1300); // 700ms scripted delay -> growth/level-up tutorial dialogue
await tapSheet(2); // Oromë's growth lines (this grant crosses into level 2)
await page.waitForTimeout(900); // Character scene opens (World+UI paused)
console.log('level/xp at level-up screen:', await page.evaluate(`${world()}.state.level + '/' + ${world()}.state.xp + '/' + ${world()}.state.statPoints`));
await page.screenshot({ path: `${OUT}/14b-levelup.png` });
await page.mouse.click(400, 410); // Close the level-up/stats screen
await page.waitForTimeout(900); // World resumes -> Náro's dialogue fires
await tapSheet(2); // Náro's two lines
console.log('stage after orome:', await stage());
await page.screenshot({ path: `${OUT}/15-follow.png` });

// walk a bit so Náro follows, then teleport to camp with him
await page.keyboard.down('a'); await page.waitForTimeout(900); await page.keyboard.up('a');
await tp(26, 24);
await page.waitForTimeout(1200);
await page.keyboard.press('E'); await page.waitForTimeout(500); // talk elder -> finish
await tapSheet(3);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/16-summons.png` });
// story card -> Journey
await page.mouse.click(400, 390);
await page.waitForTimeout(1400);
await page.screenshot({ path: `${OUT}/17-journey.png` });

// reload -> Homepage -> Load Game -> resume on Journey map
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(2200);
await page.screenshot({ path: `${OUT}/18-title-continue.png` });
await page.mouse.click(400, 295); // Load Game
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/18b-load-panel.png` });
await page.mouse.click(400, 226); // first (only) profile row
await page.waitForTimeout(900);
await page.mouse.click(135, 160); // The Great Journey card
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/18c-slots-after-reload.png` });
await page.mouse.click(400, 110); // occupied Slot 1 -> continue
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/19-resumed.png` });

const profiles = await page.evaluate(() => JSON.parse(localStorage.getItem('arda.profiles.v1')));
const p = profiles[0];
const slot = p.campaigns.greatJourney.slots[0];
console.log('FINAL SAVE:', JSON.stringify({ zone: slot.zone, waypointIndex: slot.waypointIndex, stage: slot.quest.stage, flags: slot.quest.flags, lastWhere: slot.lastWhere }));
console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
await browser.close();
process.exit(errors.filter((e) => !e.includes('404')).length ? 1 : 0);
