// Full playthrough of Waypoint 10 — "Crossing to Aman" / "The Crossing":
// the campaign's closing event. The elder's farewell (personalized by the
// surviving party roster and who parted ways earlier), Ulmo's unseen
// manifestation at the water's edge, and the first light of Aman — ending
// with waypointIndex bumped to 10 (the full WAYPOINTS length, so the Road
// West correctly reads "The Journey is complete"), the capstone Title, and
// bonus stat points.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const OUT = './smoke-shots-waypoint10';
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
    id: 'wp10-test', name: 'WP10 Tester', createdAt: Date.now(), updatedAt: Date.now(),
    campaigns: { greatJourney: { slots: [
      {
        version: 1, kindred: 'teleri', classId: 'warrior', stats: { VIT: 12, MAG: 2, STR: 12, DEX: 6 },
        hp: 140, mp: 20, gold: 60, waypointIndex: 9, zone: '__journey__', pos: null,
        quest: { id: 'shipwright-and-sea', stage: 4, flags: {} }, seenIntro: true,
        equipment: { head: null, chest: null, gloves: null, boots: null, accessory: null, weapon: null },
        inventory: [], level: 6, xp: 20, statPoints: 0, skillPoints: 0, skills: {},
        actionBar: [null, null, null, null], potions: { hp: 2, mp: 2 }, titles: ['seeker'], equippedTitle: 'seeker', seenCards: [],
        party: [{ id: 'anwen', name: 'Anwen', classId: 'herbmaster', level: 6, sheet: 'npc_kinswoman' }],
        journeyFlags: { anwenStayed: true, calanonStayedWithEglath: true },
        savedAt: Date.now(), lastWhere: 'The Falas',
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

await page.evaluate(() => window.__game.scene.getScene('Journey').tapWaypoint(9)); // waypoint index 9 = 10th waypoint, Crossing to Aman
await page.waitForTimeout(1200);

const zoneCheck = await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  return { zone: w?.state?.zone, stage: w?.quest?.stage, partyMembersLen: w?.partyMembers?.length };
});
console.log('entered zone:', JSON.stringify(zoneCheck));
await page.screenshot({ path: `${OUT}/00-entered.png` });

async function advance(fn, waitMs = 900) {
  await page.evaluate(fn);
  await page.waitForTimeout(waitMs);
}
async function clickThrough(n, waitMs = 400) {
  for (let i = 0; i < n; i++) {
    await page.mouse.click(400, 400);
    await page.waitForTimeout(waitMs);
  }
}

// stage 0: the elder's farewell — personalized with Anwen (party) + Calanon (parted ways)
await advance(() => window.__game.scene.getScene('World').quest.talkElder());
await page.waitForTimeout(300);
const elderLineCount = await page.evaluate(() => window.__game.scene.getScene('UI').dialogue.lines.length);
console.log('elder dialogue line count (want 4: base+roster+parted+closing):', elderLineCount);
await page.screenshot({ path: `${OUT}/01-elder-farewell.png` });
await clickThrough(elderLineCount, 400);
await page.waitForTimeout(500);
const stage1 = await page.evaluate(() => window.__game.scene.getScene('World').quest.stage);
console.log('stage after elder farewell (want 1):', stage1);

// stage 1: Ulmo's unseen manifestation
const ulmoReady = await page.evaluate(() => !!window.__game.scene.getScene('World').quest.ulmoPoint);
console.log('Ulmo point spawned:', ulmoReady);
await advance(() => window.__game.scene.getScene('World').quest.talkUlmo());
await page.screenshot({ path: `${OUT}/02-ulmo.png` });
await clickThrough(3, 400);
await page.waitForTimeout(500);
const stage2 = await page.evaluate(() => window.__game.scene.getScene('World').quest.stage);
console.log('stage after Ulmo (want 2):', stage2);

// stage 2: the horizon — first light of Aman
const lookoutReady = await page.evaluate(() => !!window.__game.scene.getScene('World').quest.lookoutPoint);
console.log('lookout point spawned:', lookoutReady);
await advance(() => window.__game.scene.getScene('World').quest.finishQuest());
await page.screenshot({ path: `${OUT}/03-first-light.png` });
await clickThrough(2, 400);
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/04-journey-complete.png` });

const finalState = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('arda.profiles.v1'))[0].campaigns.greatJourney.slots[0];
  return {
    waypointIndex: s.waypointIndex, questId: s.quest.id, stage: s.quest.stage, gold: s.gold,
    seenCards: s.seenCards.map((c) => c.id), titles: s.titles, statPoints: s.statPoints,
  };
});
console.log('FINAL SAVE after WP10:', JSON.stringify(finalState));

// the Road West should now read "The Journey is complete"
await page.evaluate(() => window.__game.scene.getScene('World').scene.stop('UI'));
await page.evaluate(() => window.__game.scene.getScene('World').captureState());
await page.evaluate(() => window.__game.scene.start('Journey'));
await page.waitForTimeout(1000);
const journeyLabel = await page.evaluate(() => window.__game.scene.getScene('Journey').continueLabel());
console.log('Road West continue-label (want "The Journey is complete"):', journeyLabel);
await page.screenshot({ path: `${OUT}/05-road-complete.png` });

const errorsOut = errors.filter((e) => !e.includes('404'));
console.log('ERRORS:', errorsOut.length ? errorsOut.join('\n') : 'none');
const allOk =
  zoneCheck.zone === 'crossing' &&
  elderLineCount === 4 &&
  stage1 === 1 &&
  ulmoReady &&
  stage2 === 2 &&
  lookoutReady &&
  finalState.waypointIndex === 10 &&
  finalState.seenCards.includes('the-great-journey-complete') &&
  finalState.titles.includes('westward') &&
  finalState.statPoints === 3 &&
  journeyLabel === 'The Journey is complete';
console.log('ALL WAYPOINT 10 CHECKS PASSED:', allOk);
await browser.close();
process.exit(errorsOut.length || !allOk ? 1 : 0);
