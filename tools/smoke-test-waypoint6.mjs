// Full playthrough of Waypoint 6 — "Rhovanion" / "The Long Road": the
// gold/trading tutorial. Meet Maren, gather 3 Sturdy Hides, sell 2 for
// gold, buy travel supplies (+2 HP/MP potions), keep 1 hide for Waypoint
// 7's crafting recipe, and exit with waypointIndex bumped to 6.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const OUT = './smoke-shots-waypoint6';
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
    id: 'wp6-test', name: 'WP6 Tester', createdAt: Date.now(), updatedAt: Date.now(),
    campaigns: { greatJourney: { slots: [
      {
        version: 1, kindred: 'vanyar', classId: 'warrior', stats: { VIT: 10, MAG: 2, STR: 10, DEX: 6 },
        hp: 130, mp: 32, gold: 5, waypointIndex: 5, zone: '__journey__', pos: null,
        quest: { id: 'the-pass', stage: 5, flags: {} }, seenIntro: true,
        equipment: { head: null, chest: null, gloves: null, boots: null, accessory: null, weapon: 'woodsmans_sword' },
        inventory: [], level: 3, xp: 20, statPoints: 3, skillPoints: 2, skills: { bash: 1 },
        actionBar: [null, null, null, null], potions: { hp: 0, mp: 0 }, titles: [], seenCards: [],
        party: [{ id: 'anwen', name: 'Anwen', classId: 'herbmaster', sheet: 'npc_kinswoman', level: 3 }],
        journeyFlags: { anwenStayed: true },
        savedAt: Date.now(), lastWhere: 'Misty Mountains',
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

await page.evaluate(() => window.__game.scene.getScene('Journey').tapWaypoint(5)); // waypoint index 5 = 6th waypoint, Rhovanion
await page.waitForTimeout(1200);

const zoneCheck = await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  return { zone: w?.state?.zone, stage: w?.quest?.stage, partySize: w?.partyMembers?.length };
});
console.log('entered zone:', JSON.stringify(zoneCheck));

async function advance(fn, waitMs = 900) {
  await page.evaluate(fn);
  await page.waitForTimeout(waitMs);
}
async function clickThroughDialogue(n) {
  for (let i = 0; i < n; i++) { await page.mouse.click(400, 400); await page.waitForTimeout(300); }
}
async function waitForStage(min, timeoutMs = 3000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const stage = await page.evaluate(() => window.__game.scene.getScene('World').quest.stage);
    if (stage >= min) return stage;
    await page.waitForTimeout(150);
  }
  return page.evaluate(() => window.__game.scene.getScene('World').quest.stage);
}

// stage 1: meet Maren — the 0->1 transition is on its own short delayedCall
// (begin()'s auto time-skip beat), so poll instead of a fixed sleep
const stage1 = await waitForStage(1);
console.log('stage after arrival auto-transition (want 1):', stage1);
await advance(() => window.__game.scene.getScene('World').quest.talkTrader());
await clickThroughDialogue(2);
const stage2 = await page.evaluate(() => window.__game.scene.getScene('World').quest.stage);
console.log('stage after first Maren talk (want 2):', stage2);

// stage 2: gather all 3 hides directly (deterministic, not pixel-tap dependent)
await page.evaluate(() => {
  const q = window.__game.scene.getScene('World').quest;
  q.gather('forage1');
});
await page.waitForTimeout(300);
await page.mouse.click(400, 400); // dismiss the "gathered" narration line
await page.waitForTimeout(300);
await page.evaluate(() => window.__game.scene.getScene('World').quest.gather('forage2'));
await page.waitForTimeout(300);
await page.mouse.click(400, 400);
await page.waitForTimeout(300);
await page.evaluate(() => window.__game.scene.getScene('World').quest.gather('forage3'));
await page.waitForTimeout(300);
await page.mouse.click(400, 400);
await page.waitForTimeout(500);

const afterGather = await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  return { stage: w.quest.stage, hideCount: w.state.inventory.filter((id) => id === 'sturdy_hide').length };
});
console.log('after gathering all 3 hides:', JSON.stringify(afterGather));

// stage 3: sell 2 hides, then buy supplies — first real "shop" flow
await advance(() => window.__game.scene.getScene('World').quest.talkTrader());
await page.waitForTimeout(500);
const sellChoicePos = await page.evaluate(() => {
  const b = window.__game.scene.getScene('UI').choiceButtons[0]; // "Trade 2 hides..."
  return { x: b.x, y: b.y };
});
await page.mouse.click(sellChoicePos.x, sellChoicePos.y);
await page.waitForTimeout(600);
const goldAfterSell = await page.evaluate(() => window.__game.scene.getScene('World').state.gold);
console.log('gold after selling 2 hides (want 25 = 5 seed + 20 sell):', goldAfterSell);

await page.waitForTimeout(400);
const buyChoicePos = await page.evaluate(() => {
  const b = window.__game.scene.getScene('UI').choiceButtons[0]; // "Buy travel supplies..."
  return b ? { x: b.x, y: b.y } : null;
});
console.log('buy choice available:', !!buyChoicePos);
if (buyChoicePos) {
  await page.mouse.click(buyChoicePos.x, buyChoicePos.y);
  await page.waitForTimeout(700);
}

const afterBuy = await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  return {
    stage: w.quest.stage,
    gold: w.state.gold,
    potions: w.state.potions,
    hideCount: w.state.inventory.filter((id) => id === 'sturdy_hide').length,
  };
});
console.log('after buying supplies (want stage 4, 1 hide left, potions +2/+2):', JSON.stringify(afterBuy));
await page.screenshot({ path: `${OUT}/01-after-trade.png` });

// stage 4: continue west
await page.waitForTimeout(600);
const pathOutReady = await page.evaluate(() => !!window.__game.scene.getScene('World').quest.pathOutPoint);
console.log('path-out point spawned:', pathOutReady);
await advance(() => window.__game.scene.getScene('World').quest.finishQuest());
await page.waitForTimeout(900);

const finalState = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('arda.profiles.v1'))[0].campaigns.greatJourney.slots[0];
  return { waypointIndex: s.waypointIndex, questId: s.quest.id, stage: s.quest.stage, gold: s.gold, hideCount: s.inventory.filter((id) => id === 'sturdy_hide').length };
});
console.log('FINAL SAVE after WP6:', JSON.stringify(finalState));

const errorsOut = errors.filter((e) => !e.includes('404'));
console.log('ERRORS:', errorsOut.length ? errorsOut.join('\n') : 'none');
const allOk =
  zoneCheck.zone === 'rhovanion' &&
  zoneCheck.partySize === 1 && // Anwen followed along from WP5
  stage1 === 1 &&
  stage2 === 2 &&
  afterGather.stage === 3 &&
  afterGather.hideCount === 3 &&
  goldAfterSell === 25 &&
  !!buyChoicePos &&
  afterBuy.stage === 4 &&
  afterBuy.hideCount === 1 &&
  afterBuy.potions.hp === 2 &&
  afterBuy.potions.mp === 2 &&
  pathOutReady &&
  finalState.waypointIndex === 6 &&
  finalState.hideCount === 1;
console.log('ALL WAYPOINT 6 CHECKS PASSED:', allOk);
await browser.close();
process.exit(errorsOut.length || !allOk ? 1 : 0);
