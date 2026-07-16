// Verifies the Inventory/Equipment system: seed a character mid-quest (stage
// 2, about to cross the ford), cross to get the cloak+boots (which now opens
// a gear tutorial before the waypoint finishes), inspect+equip from the pack
// grid, confirm the waypoint-completion flow still continues correctly, then
// re-enter to get Tarion's jerkin+bracers and swap gear from the pause menu.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const OUT = './smoke-shots-inventory';
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
const tapSheet = async (n = 1) => {
  for (let i = 0; i < n; i++) { await page.keyboard.press('E'); await page.waitForTimeout(350); }
};
const readState = () => page.evaluate(`${world()}.state`);

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await page.evaluate(() => {
  const profile = {
    id: 'inv-test', name: 'Gear Tester', createdAt: Date.now(), updatedAt: Date.now(),
    campaigns: { greatJourney: { slots: [
      { version: 1, kindred: 'vanyar', classId: 'warrior', stats: { VIT: 10, MAG: 2, STR: 10, DEX: 6 }, hp: 130, mp: 32, gold: 0,
        waypointIndex: 1, zone: 'steppes', pos: null,
        quest: { id: 'stragglers', stage: 2, flags: { gathered: { forage1: true, forage2: true, hunt1: true } } },
        seenIntro: true, equipment: { head: null, chest: null, gloves: null, boots: null, accessory: null, weapon: null }, inventory: [],
        level: 1, xp: 0, statPoints: 0, skillPoints: 0, titles: [], seenCards: [],
        savedAt: Date.now(), lastWhere: 'The open steppe' },
      null, null, null,
    ] } },
  };
  localStorage.setItem('arda.profiles.v1', JSON.stringify([profile]));
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

// Load Game -> profile -> Great Journey -> occupied slot -> World (stage 2, steppes)
await page.mouse.click(400, 295);
await page.waitForTimeout(600);
await page.mouse.click(400, 226);
await page.waitForTimeout(900);
await page.mouse.click(135, 160);
await page.waitForTimeout(900);
await page.mouse.click(400, 110);
await page.waitForTimeout(2500);

// cross the ford -> get the cloak + boots -> gear tutorial auto-opens the
// Character scene (World+UI paused) before the waypoint actually finishes
await tp(32.5, 8);
await page.keyboard.press('E'); await page.waitForTimeout(400);
await tapSheet(2); // Míriel's 2 lines, onDone gives both items + opens tutorial
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/01-gear-tutorial.png` });

let s = await page.evaluate(() => {
  const c = window.__game.scene.getScene('Character');
  return { inventory: c.state.inventory, equipment: c.state.equipment };
});
console.log('gear tutorial open — inventory:', JSON.stringify(s.inventory), 'equipment:', JSON.stringify(s.equipment));

// inspect the cloak in the pack grid (first cell), then tap Equip
await page.mouse.click(277, 116);
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/02-inspecting-cloak.png` });
await page.mouse.click(742, 360); // Equip button in the detail panel
await page.waitForTimeout(500);
s = await page.evaluate(() => {
  const c = window.__game.scene.getScene('Character');
  return { inventory: c.state.inventory, equipment: c.state.equipment };
});
console.log('after equip cloak:', JSON.stringify(s));
await page.screenshot({ path: `${OUT}/03-after-equip-cloak.png` });

// close the tutorial -> World/UI resume -> waypoint finishes -> Story scene
await page.mouse.click(400, 424);
await page.waitForTimeout(1200);
const active1 = await page.evaluate(() => window.__game.scene.getScenes(true).map((sc) => sc.scene.key));
console.log('active scenes after closing gear tutorial:', JSON.stringify(active1));
await page.screenshot({ path: `${OUT}/04-story-card.png` });

// story card -> Journey
await page.mouse.click(400, 390);
await page.waitForTimeout(1200);

// re-enter The Steppes (stage 3, done) to get Tarion's jerkin+bracers
await page.mouse.click(462, 334);
await page.waitForTimeout(2500);
await tp(8, 21);
await page.keyboard.press('E'); await page.waitForTimeout(400);
await tapSheet(2); // Tarion's 2 lines -> gives jerkin + bracers
await page.waitForTimeout(1000);
s = await readState();
console.log('after Tarion — inventory:', JSON.stringify(s.inventory), 'equipment:', JSON.stringify(s.equipment));
await page.screenshot({ path: `${OUT}/05-got-jerkin-bracers.png` });

// dismiss the inventory-tip toast, then open pause menu -> Character
await page.waitForTimeout(2000);
await page.mouse.click(770, 20);
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/06-pause-menu.png` });
await page.mouse.click(400, 159); // Character
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/07-gear-tab.png` });

const baseMaxHp = await page.evaluate(() => window.__game.scene.getScene('World').stats.maxHp);
console.log('maxHp before jerkin swap:', baseMaxHp);

// inspect+equip the jerkin (2nd pack cell, swaps out the cloak) then close
await page.mouse.click(329, 116);
await page.waitForTimeout(400);
await page.mouse.click(742, 360);
await page.waitForTimeout(500);
s = await page.evaluate(() => {
  const c = window.__game.scene.getScene('Character');
  return { inventory: c.state.inventory, equipment: c.state.equipment };
});
console.log('after equip jerkin (swap) — equipment:', JSON.stringify(s.equipment), 'inventory:', JSON.stringify(s.inventory));
await page.screenshot({ path: `${OUT}/08-after-swap.png` });

await page.mouse.click(400, 424); // Close
await page.waitForTimeout(700);
const maxHpAfter = await page.evaluate(() => window.__game.scene.getScene('World').stats.maxHp);
console.log('maxHp after jerkin equip+close:', maxHpAfter);
await page.screenshot({ path: `${OUT}/09-resumed-world.png` });

const errorsOut = errors.filter((e) => !e.includes('404'));
console.log('ERRORS:', errorsOut.length ? errorsOut.join('\n') : 'none');
await browser.close();
process.exit(errorsOut.length ? 1 : 0);
