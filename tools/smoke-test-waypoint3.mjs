// Waypoint 3 test: seeds a profile that just finished Waypoint 2, enters
// The Great Forest, and plays "Lost Before Nightfall" through to
// completion — Randir, both strays, the first-weapon moment, the wolf
// fight (verifies src/combat/ is actually wired into the encounter), and
// the walk out to the path.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const OUT = './smoke-shots-wp3';
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
await page.waitForTimeout(2000);
await page.evaluate(() => {
  const profile = {
    id: 'wp3-test', name: 'WP3 Tester', createdAt: Date.now(), updatedAt: Date.now(),
    campaigns: { greatJourney: { slots: [
      { version: 1, kindred: 'vanyar', classId: 'warrior', stats: { VIT: 10, MAG: 2, STR: 10, DEX: 6 }, hp: 130, mp: 32, gold: 20,
        waypointIndex: 2, zone: '__journey__', pos: null,
        quest: { id: 'stragglers', stage: 3, flags: {} }, seenIntro: true,
        equipment: { head: null, chest: null, gloves: null, boots: null, accessory: null, weapon: null }, inventory: [],
        level: 3, xp: 0, statPoints: 0, skillPoints: 0, skills: {}, actionBar: [null, null, null, null], titles: [], seenCards: [],
        savedAt: Date.now(), lastWhere: 'The Road West' },
      null, null, null,
    ] } },
  };
  localStorage.setItem('arda.profiles.v1', JSON.stringify([profile]));
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

// Load Game -> profile -> Great Journey -> occupied slot -> Journey map
await page.mouse.click(400, 295); await page.waitForTimeout(600);
await page.mouse.click(400, 226); await page.waitForTimeout(900);
await page.mouse.click(135, 160); await page.waitForTimeout(900);
await page.mouse.click(400, 110); await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/01-journey.png` });

// enter The Great Forest via the continue button
await page.mouse.click(400, 416);
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/02-forest-entry.png` });
console.log('zone:', await page.evaluate(`${world()}.state.zone`));
console.log('quest id:', await page.evaluate(`${world()}.state.quest.id`));
console.log('stage after entry:', await stage());

// talk to Randir (stage 0 -> 1)
await tp(7, 14);
await page.keyboard.press('E'); await page.waitForTimeout(400);
await tapSheet(3);
console.log('stage after Randir:', await stage());
await page.screenshot({ path: `${OUT}/03-randir.png` });

// find Isilmë
await tp(16, 9);
await page.keyboard.press('E'); await page.waitForTimeout(400);
await tapSheet(1);
console.log('stage after Isilmë (should still be 1):', await stage());

// find Ancalimë -> both found -> stage 2
await tp(28, 21);
await page.keyboard.press('E'); await page.waitForTimeout(400);
await tapSheet(1);
console.log('stage after Ancalimë (should be 2):', await stage());
await page.screenshot({ path: `${OUT}/04-both-found.png` });

// reach the clearing -> Randir arms you -> wolf fight starts
await tp(36, 15);
await page.keyboard.press('E'); await page.waitForTimeout(400);
await tapSheet(2);
await page.waitForTimeout(600);
console.log('stage after clearing (should be 3):', await stage());
const inv1 = await page.evaluate(`${world()}.state.inventory`);
console.log('inventory after weapon grant:', JSON.stringify(inv1));
await page.screenshot({ path: `${OUT}/05-wolf-fight-start.png` });

// fight the wolf: stay near its spawn point (ambush=40,15) so its lunges
// stay in reach both ways, spam attack
await tp(40, 15);
for (let i = 0; i < 20; i++) {
  await page.keyboard.press('Space');
  await page.waitForTimeout(650);
  const s = await stage();
  if (s >= 4) break;
}
await page.waitForTimeout(1500);
console.log('stage after fight (should be 4):', await stage());
await page.screenshot({ path: `${OUT}/06-after-fight.png` });
const hpAfter = await page.evaluate(`${world()}.state.hp`);
console.log('player hp after fight (healed):', hpAfter);

// path out -> finish
await tp(44, 15);
await page.keyboard.press('E'); await page.waitForTimeout(400);
await tapSheet(2);
await page.waitForTimeout(1400);
console.log('stage after finishQuest (should be 5):', await stage());
await page.screenshot({ path: `${OUT}/07-story-card.png` });

// story card -> Journey
await page.mouse.click(400, 390);
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/08-journey-after.png` });

const profiles = await page.evaluate(() => JSON.parse(localStorage.getItem('arda.profiles.v1')));
const slot = profiles[0].campaigns.greatJourney.slots[0];
console.log('FINAL:', JSON.stringify({ zone: slot.zone, waypointIndex: slot.waypointIndex, questId: slot.quest.id, stage: slot.quest.stage, gold: slot.gold, level: slot.level, xp: slot.xp, inventory: slot.inventory, lastWhere: slot.lastWhere }));

const errorsOut = errors.filter((e) => !e.includes('404'));
console.log('ERRORS:', errorsOut.length ? errorsOut.join('\n') : 'none');
await browser.close();
process.exit(errorsOut.length ? 1 : 0);
