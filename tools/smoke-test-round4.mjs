// Verifies round-4 playtest feedback: range tier values, harp/sling/spear/horn
// tier fixes, alt-weapon in Training Grounds inventory, new weapon fx firing
// without error, and the skill wheel's rotate button doing a clean
// batch-A/batch-B page swap instead of a shuffle.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const OUT = './smoke-shots-round4';
mkdirSync(OUT, { recursive: true });

// --- 1. RANGE_PX values + tier assignments + class flavor text, read
// straight from source (pure data, no Phaser dependency) ---
const itemsMod = await import('../src/data/items.js');
const classesMod = await import('../src/data/classes.js');
const ranges = {
  RANGE_PX: itemsMod.RANGE_PX,
  tiers: {
    travelers_harp: itemsMod.ITEMS.travelers_harp.range,
    hunters_sling: itemsMod.ITEMS.hunters_sling.range,
    ash_spear: itemsMod.ITEMS.ash_spear.range,
    captains_horn: itemsMod.ITEMS.captains_horn.range,
    summoners_horn: itemsMod.ITEMS.summoners_horn.range,
  },
  altByClass: itemsMod.ALT_WEAPON_BY_CLASS,
};
const skirmisherFlavor = classesMod.CLASSES.find((c) => c.id === 'skirmisher').weapon;
console.log('RANGE_PX:', JSON.stringify(ranges.RANGE_PX));
console.log('tiers:', JSON.stringify(ranges.tiers));
console.log('altByClass:', JSON.stringify(ranges.altByClass));
console.log('skirmisher weapon flavor:', skirmisherFlavor);

const rangeOk = ranges.RANGE_PX.short === 50 && ranges.RANGE_PX.mediumShort === 100 && ranges.RANGE_PX.medium === 160 && ranges.RANGE_PX.long === 250;
const tiersOk = ranges.tiers.travelers_harp === 'medium' && ranges.tiers.hunters_sling === 'medium'
  && ranges.tiers.ash_spear === 'mediumShort' && ranges.tiers.captains_horn === 'mediumShort'
  && ranges.tiers.summoners_horn === 'mediumShort';
console.log('range values correct:', rangeOk);
console.log('tier reassignments correct:', tiersOk);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 800, height: 450 }, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// --- 2. Training Grounds: skirmisher should get BOTH ranging_dagger
// (default, equipped) and hunters_sling (alt, in pack) ---
const trainingInv = await page.evaluate(async () => {
  window.__game.scene.start('Creation');
  await new Promise((r) => setTimeout(r, 300));
  const scene = window.__game.scene.getScene('Creation');
  scene.kindredId = 'vanyar';
  scene.startTraining({ id: 'skirmisher' });
  await new Promise((r) => setTimeout(r, 800));
  const world = window.__game.scene.getScene('World');
  return { inventory: world.state.inventory, equipment: world.state.equipment };
});
console.log('skirmisher training inventory:', JSON.stringify(trainingInv));
const skirmisherOk = trainingInv.equipment.weapon === 'ranging_dagger' && trainingInv.inventory.includes('hunters_sling');
console.log('skirmisher has both dagger (equipped) + sling (inventory):', skirmisherOk);
await page.screenshot({ path: `${OUT}/01-training-world.png` });

// --- 3. New weapon fx (spear/sling/horn) fire without error via the real
// attack button, at the training dummy ---
const weaponFxOk = await page.evaluate(async () => {
  const world = window.__game.scene.getScene('World');
  const results = [];
  for (const itemId of ['ash_spear', 'hunters_sling', 'captains_horn', 'summoners_horn']) {
    world.state.equipment.weapon = itemId;
    world.attackCooldown = 0;
    world.attacking = false;
    try {
      world.game.events.emit('ui:attack-pressed');
      results.push({ itemId, ok: true });
    } catch (e) {
      results.push({ itemId, ok: false, err: e.message });
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return results;
});
console.log('weapon fx results:', JSON.stringify(weaponFxOk));
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/02-weapon-fx.png` });
const weaponFxAllOk = weaponFxOk.every((r) => r.ok);

// --- 4. Skill wheel rotate: binary batch swap, no carryover ---
const ringTest = await page.evaluate(() => {
  const ui = window.__game.scene.getScene('UI');
  ui.ring = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'PotHP', 'PotMP'].map((n) => ({ name: n, ready: true }));
  ui.ringOffset = 0;
  ui.renderRing();
  return { batchA: ui.skillBtns.map((b) => b.txt.text) };
});
await page.screenshot({ path: `${OUT}/03-ring-batchA.png` });
// invoke the rotate button's actual click handler (not a re-implementation)
const afterFirstClick = await page.evaluate(() => {
  const ui = window.__game.scene.getScene('UI');
  ui.rotateBtn.circle.emit('pointerup');
  return { offset: ui.ringOffset, batchB: ui.skillBtns.map((b) => b.txt.text) };
});
await page.screenshot({ path: `${OUT}/04-ring-batchB.png` });
const afterSecondClick = await page.evaluate(() => {
  const ui = window.__game.scene.getScene('UI');
  ui.rotateBtn.circle.emit('pointerup');
  return { offset: ui.ringOffset, backToA: ui.skillBtns.map((b) => b.txt.text) };
});
console.log('batch A:', JSON.stringify(ringTest.batchA));
console.log('batch B (after 1 click):', JSON.stringify(afterFirstClick.batchB), 'offset:', afterFirstClick.offset);
console.log('back to A (after 2nd click):', JSON.stringify(afterSecondClick.backToA), 'offset:', afterSecondClick.offset);
const noOverlap = ringTest.batchA.every((n) => !afterFirstClick.batchB.includes(n));
const roundTrips = JSON.stringify(ringTest.batchA) === JSON.stringify(afterSecondClick.backToA);
console.log('zero carryover between batches:', noOverlap);
console.log('toggle round-trips back to batch A:', roundTrips);

const allOk = rangeOk && tiersOk && skirmisherOk && weaponFxAllOk && noOverlap && roundTrips;
console.log('ALL ROUND-4 CHECKS PASSED:', allOk);

const errorsOut = errors.filter((e) => !e.includes('404'));
console.log('ERRORS:', errorsOut.length ? errorsOut.join('\n') : 'none');
await browser.close();
process.exit(errorsOut.length || !allOk ? 1 : 0);
