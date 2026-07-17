// Full playthrough of Waypoint 7 — "Ered Luin" / "First Contact": the
// Dwarf patrol resolved peacefully via a real dialogue choice, then Norrik
// the smith crafts the fixed per-class recipe (gold + 1 Sturdy Hide ->
// an accessory item — the first content the previously-locked Trinket
// slot ever gets), and exit with waypointIndex bumped to 7.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const OUT = './smoke-shots-waypoint7';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 800, height: 450 }, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

await page.evaluate(() => {
  const profile = {
    id: 'wp7-test', name: 'WP7 Tester', createdAt: Date.now(), updatedAt: Date.now(),
    campaigns: { greatJourney: { slots: [
      {
        version: 1, kindred: 'noldor', classId: 'loresinger', stats: { VIT: 6, MAG: 12, STR: 4, DEX: 6 },
        hp: 86, mp: 92, gold: 30, waypointIndex: 6, zone: '__journey__', pos: null,
        quest: { id: 'the-long-road', stage: 5, flags: {} }, seenIntro: true,
        equipment: { head: null, chest: null, gloves: null, boots: null, accessory: null, weapon: 'travelers_harp' },
        inventory: ['sturdy_hide'], level: 3, xp: 20, statPoints: 3, skillPoints: 2, skills: {},
        actionBar: [null, null, null, null], potions: { hp: 2, mp: 2 }, titles: [], seenCards: [],
        party: [], journeyFlags: { anwenStayed: false },
        savedAt: Date.now(), lastWhere: 'Rhovanion',
      },
      null, null, null,
    ] } },
  };
  localStorage.setItem('arda.profiles.v1', JSON.stringify([profile]));
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

await page.mouse.click(400, 295); await page.waitForTimeout(500);
await page.mouse.click(400, 226); await page.waitForTimeout(700);
await page.mouse.click(135, 160); await page.waitForTimeout(700);
await page.mouse.click(400, 110); await page.waitForTimeout(1000);

await page.evaluate(() => window.__game.scene.getScene('Journey').tapWaypoint(6)); // waypoint index 6 = 7th waypoint, Ered Luin
await page.waitForTimeout(1200);

const zoneCheck = await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  return { zone: w?.state?.zone, stage: w?.quest?.stage };
});
console.log('entered zone:', JSON.stringify(zoneCheck));

async function advance(fn, waitMs = 900) {
  await page.evaluate(fn);
  await page.waitForTimeout(waitMs);
}

// stage 0: the Dwarf patrol — a real dialogue choice, flavor-only (outcome fixed)
await advance(() => window.__game.scene.getScene('World').quest.talkPatrol());
await page.waitForTimeout(400);
const choicePos = await page.evaluate(() => {
  const b = window.__game.scene.getScene('UI').choiceButtons[1]; // "We've crossed worse..."
  return { x: b.x, y: b.y };
});
await page.mouse.click(choicePos.x, choicePos.y);
await page.waitForTimeout(500);
await page.mouse.click(400, 400); // the two-line follow-up
await page.waitForTimeout(300);
await page.mouse.click(400, 400);
await page.waitForTimeout(700);

const stage1 = await page.evaluate(() => window.__game.scene.getScene('World').quest.stage);
console.log('stage after patrol resolved peacefully (want 1):', stage1);
await page.screenshot({ path: `${OUT}/01-patrol-resolved.png` });

// stage 1: Norrik the smith — crafting tutorial
await advance(() => window.__game.scene.getScene('World').quest.talkSmith());
await page.waitForTimeout(400);
await page.mouse.click(400, 400); // intro line 1
await page.waitForTimeout(300);
await page.mouse.click(400, 400); // intro line 2
await page.waitForTimeout(700);

const craftPreview = await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  return { hasHide: w.state.inventory.includes('sturdy_hide'), gold: w.state.gold };
});
console.log('before crafting — has hide + enough gold:', JSON.stringify(craftPreview));

await page.waitForTimeout(400);
const craftChoicePos = await page.evaluate(() => {
  const b = window.__game.scene.getScene('UI').choiceButtons[0]; // "Craft the ..."
  return b ? { x: b.x, y: b.y } : null;
});
console.log('craft choice available:', !!craftChoicePos);
if (craftChoicePos) {
  await page.mouse.click(craftChoicePos.x, craftChoicePos.y);
  await page.waitForTimeout(700);
}
await page.screenshot({ path: `${OUT}/02-item-crafted.png` });

const afterCraft = await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  return {
    stage: w.quest.stage,
    gold: w.state.gold,
    hasHide: w.state.inventory.includes('sturdy_hide'),
    craftedItem: w.state.inventory.find((id) => id.startsWith('dwarven_')),
  };
});
console.log('after crafting (want stage 2, hide consumed, gold spent, item in inventory):', JSON.stringify(afterCraft));

// equip the crafted trinket and confirm the Trinket slot actually accepts it
await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  w.captureState();
  w.scene.pause();
  w.scene.pause('UI');
  w.scene.launch('Character', { tab: 'gear' });
});
await page.waitForTimeout(500);
await page.evaluate((itemId) => {
  const ch = window.__game.scene.getScene('Character');
  const idx = ch.state.inventory.indexOf(itemId);
  ch.inspect = { kind: 'inv', index: idx, itemId };
  ch.equip(itemId);
}, afterCraft.craftedItem);
await page.waitForTimeout(300);
const equippedAccessory = await page.evaluate(() => window.__game.scene.getScene('Character').state.equipment.accessory);
console.log('crafted trinket equipped into the Trinket slot:', equippedAccessory);
await page.screenshot({ path: `${OUT}/03-trinket-equipped.png` });
await page.evaluate(() => {
  window.__game.scene.stop('Character');
  window.__game.scene.resume('World');
  window.__game.scene.resume('UI');
});
await page.waitForTimeout(500);

// stage 2: continue west
const pathOutReady = await page.evaluate(() => !!window.__game.scene.getScene('World').quest.pathOutPoint);
console.log('path-out point spawned after crafting:', pathOutReady);
await advance(() => window.__game.scene.getScene('World').quest.finishQuest());
await page.waitForTimeout(900);

const finalState = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('arda.profiles.v1'))[0].campaigns.greatJourney.slots[0];
  return { waypointIndex: s.waypointIndex, questId: s.quest.id, stage: s.quest.stage, gold: s.gold, equipment: s.equipment.accessory, seenCards: s.seenCards.map((c) => c.id) };
});
console.log('FINAL SAVE after WP7:', JSON.stringify(finalState));

const errorsOut = errors.filter((e) => !e.includes('404'));
console.log('ERRORS:', errorsOut.length ? errorsOut.join('\n') : 'none');
const allOk =
  zoneCheck.zone === 'ered-luin' &&
  stage1 === 1 &&
  craftPreview.hasHide &&
  !!craftChoicePos &&
  afterCraft.stage === 2 &&
  !afterCraft.hasHide &&
  !!afterCraft.craftedItem &&
  equippedAccessory === afterCraft.craftedItem &&
  pathOutReady &&
  finalState.waypointIndex === 7 &&
  finalState.equipment === afterCraft.craftedItem &&
  finalState.seenCards.includes('first-contact-naugrim');
console.log('ALL WAYPOINT 7 CHECKS PASSED:', allOk);
await browser.close();
process.exit(errorsOut.length || !allOk ? 1 : 0);
