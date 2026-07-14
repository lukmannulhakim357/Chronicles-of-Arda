// Verifies the Inventory/Armor system introduced in Waypoint 2: seed a
// character mid-quest (stage 2, about to cross the ford), cross to get the
// cloak, talk to Tarion for the jerkin, open Inventory from the pause menu,
// equip/swap gear, and confirm stats + persistence all behave.
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
      { version: 1, kindred: 'vanyar', classId: 'warrior', stats: { VIT: 10, MAG: 2, STR: 10, DEX: 6 }, hp: 130,
        waypointIndex: 1, zone: 'steppes', pos: null,
        quest: { id: 'stragglers', stage: 2, flags: { gathered: { forage1: true, forage2: true, hunt1: true } } },
        seenIntro: true, equipment: { armor: null, weapon: null, trinket: null }, inventory: [],
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

// cross the ford -> get the cloak
await tp(32.5, 8);
await page.keyboard.press('E'); await page.waitForTimeout(400);
await tapSheet(2); // Miriel's 2 lines, onDone gives cloak + finishQuest
await page.waitForTimeout(1000);
let s = await readState();
console.log('after crossing — inventory:', JSON.stringify(s.inventory), 'stage:', s.quest.stage);
await page.screenshot({ path: `${OUT}/01-got-cloak-toast.png` });

// wait out the toast, then the story card should appear -> continue to Journey
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/02-story-card.png` });
await page.mouse.click(400, 390); // "To the Road West"
await page.waitForTimeout(1200);

// re-enter The Steppes (now at stage 3, done, waypointIndex=2 so the road's
// frontier button points at Great Forest instead) — tap Steppes' own node
await page.mouse.click(462, 334);
await page.waitForTimeout(2500);
await tp(8, 21);
await page.keyboard.press('E'); await page.waitForTimeout(400);
await tapSheet(2); // Tarion's 2 lines -> gives jerkin
await page.waitForTimeout(1000);
s = await readState();
console.log('after Tarion — inventory:', JSON.stringify(s.inventory), 'equipment:', JSON.stringify(s.equipment));
await page.screenshot({ path: `${OUT}/03-got-jerkin.png` });

// dismiss the inventory-tip toast, then open pause menu -> Inventory
await page.waitForTimeout(2000);
await page.mouse.click(770, 20); // hamburger
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/04-pause-menu.png` });
// Inventory is item index 1: y = height/2-118+1*52 = 225-118+52 = 159
await page.mouse.click(400, 159);
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/05-inventory-open.png` });

const baseMaxHp = await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  return w.stats.maxHp;
});
console.log('maxHp before equip:', baseMaxHp);

// equip the first carried item (Gear tab under the Gear/Stats tab row):
// bodyTop = tabY(42)+30=72; slotY = bodyTop+slotH/2(46)+6=124; listTop = slotY+46+24=194; y0 = listTop+26=220; row0 center = y0+rowH/2(28)=248
await page.mouse.click(400, 248);
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/06-after-equip.png` });

s = await readState();
console.log('after equip 1 — equipment:', JSON.stringify(s.equipment), 'inventory:', JSON.stringify(s.inventory));

// equip the second carried item (now sitting at slot 0 again since equip() swaps)
await page.mouse.click(400, 248);
await page.waitForTimeout(500);
s = await readState();
console.log('after equip 2 (swap) — equipment:', JSON.stringify(s.equipment), 'inventory:', JSON.stringify(s.inventory));
await page.screenshot({ path: `${OUT}/07-after-swap.png` });

// close inventory, verify World resumed and maxHp reflects the swapped armor bonus
await page.mouse.click(400, 410); // Close button
await page.waitForTimeout(700);
const maxHpAfter = await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  return w.stats.maxHp;
});
console.log('maxHp after equip+close:', maxHpAfter);
await page.screenshot({ path: `${OUT}/08-resumed-world.png` });

const errorsOut = errors.filter((e) => !e.includes('404'));
console.log('ERRORS:', errorsOut.length ? errorsOut.join('\n') : 'none');
await browser.close();
process.exit(errorsOut.length ? 1 : 0);
