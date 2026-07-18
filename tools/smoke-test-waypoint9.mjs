// Full playthrough of Waypoint 9 — "The Falas" / "Shipwright and Sea":
// the shipwright's peaceful lesson, then a 4-enemy ambush (the multi-enemy
// tutorial) where a player skill cast should combo into a companion
// follow-up hit, then the Falathrim's farewell — and exit with
// waypointIndex bumped to 9.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const OUT = './smoke-shots-waypoint9';
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
    id: 'wp9-test', name: 'WP9 Tester', createdAt: Date.now(), updatedAt: Date.now(),
    campaigns: { greatJourney: { slots: [
      {
        version: 1, kindred: 'teleri', classId: 'loresinger', stats: { VIT: 8, MAG: 14, STR: 4, DEX: 6 },
        hp: 100, mp: 110, gold: 50, waypointIndex: 8, zone: '__journey__', pos: null,
        quest: { id: 'the-king-is-lost', stage: 5, flags: {} }, seenIntro: true,
        equipment: { head: null, chest: null, gloves: null, boots: null, accessory: null, weapon: 'travelers_harp' },
        inventory: [], level: 5, xp: 20, statPoints: 0, skillPoints: 3, skills: { mocking_verse: 1 },
        actionBar: ['mocking_verse', null, null, null], potions: { hp: 2, mp: 2 }, titles: ['seeker'], equippedTitle: 'seeker', seenCards: [],
        party: [{ id: 'olwe-guard', name: 'Findor', classId: 'warrior', level: 5, sheet: 'npc_kinsman' }],
        journeyFlags: { anwenStayed: false, calanonStayedWithEglath: true },
        savedAt: Date.now(), lastWhere: 'Beleriand',
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

await page.evaluate(() => window.__game.scene.getScene('Journey').tapWaypoint(8)); // waypoint index 8 = 9th waypoint, the Falas
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
async function clickThrough(n, waitMs = 350) {
  for (let i = 0; i < n; i++) {
    await page.mouse.click(400, 400);
    await page.waitForTimeout(waitMs);
  }
}

// stage 0: the shipwright's lesson (peaceful, no combat)
await advance(() => window.__game.scene.getScene('World').quest.talkShipwright());
await clickThrough(3, 400);
await page.waitForTimeout(1200); // the 900ms delayedCall auto-starts the ambush
const stage1 = await page.evaluate(() => window.__game.scene.getScene('World').quest.stage);
console.log('stage after shipwright lesson (want 1):', stage1);
await page.screenshot({ path: `${OUT}/01-shipwright-lesson.png` });

const enemyCount = await page.evaluate(() => window.__game.scene.getScene('World').quest.enemies.length);
console.log('ambush enemy count (want 4):', enemyCount);
await page.screenshot({ path: `${OUT}/02-ambush.png` });

// player casts a skill — should land a hit and combo a companion follow-up
await advance(() => {
  const w = window.__game.scene.getScene('World');
  const def = { id: 'mocking_verse', name: 'Mocking Verse', damagePct: 1.3, isMagic: true, kind: 'debuff' };
  w.quest.onPlayerSkill(def, 1);
});
await page.waitForTimeout(600);
const afterFirstSkill = await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  return { comboReadyAt: w.quest.comboReadyAt, comboTutorialShown: w.quest.comboTutorialShown };
});
console.log('after first skill cast (combo should be gated on):', JSON.stringify(afterFirstSkill));
await page.screenshot({ path: `${OUT}/03-combo.png` });

// fast-forward the fight by directly resolving damage until all 4 wisps die,
// mixing basic attacks (which don't combo) so the encounter actually ends
for (let i = 0; i < 40; i++) {
  const done = await page.evaluate(() => {
    const w = window.__game.scene.getScene('World');
    if (w.quest.encounterOver) return true;
    w.quest.onPlayerAttack();
    return w.quest.encounterOver;
  });
  await page.waitForTimeout(120);
  if (done) break;
}
await page.waitForTimeout(1600);
const afterEncounter = await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  return { stage: w.quest.stage, encounterOver: w.quest.encounterOver, enemiesLeft: w.quest.enemies.filter((e) => e.sprite?.active).length };
});
console.log('after encounter (want stage 2, encounterOver true):', JSON.stringify(afterEncounter));
await page.screenshot({ path: `${OUT}/04-encounter-won.png` });

// stage 2: the Falathrim farewell
await clickThrough(2, 500); // the shipwright's 2-line farewell announcement
await page.waitForTimeout(3200); // crowd walk + fade
await page.screenshot({ path: `${OUT}/05-falathrim-farewell.png` });

const afterFarewell = await page.evaluate(() => window.__game.scene.getScene('World').quest.stage);
console.log('stage after farewell (want 3):', afterFarewell);

// stage 3: continue along the coast
const pathOutReady = await page.evaluate(() => !!window.__game.scene.getScene('World').quest.pathOutPoint);
console.log('path-out point spawned:', pathOutReady);
await advance(() => window.__game.scene.getScene('World').quest.finishQuest());
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/06-waypoint-complete.png` });

const finalState = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('arda.profiles.v1'))[0].campaigns.greatJourney.slots[0];
  return { waypointIndex: s.waypointIndex, questId: s.quest.id, stage: s.quest.stage, gold: s.gold, seenCards: s.seenCards.map((c) => c.id) };
});
console.log('FINAL SAVE after WP9:', JSON.stringify(finalState));

const errorsOut = errors.filter((e) => !e.includes('404'));
console.log('ERRORS:', errorsOut.length ? errorsOut.join('\n') : 'none');
const allOk =
  zoneCheck.zone === 'falas' &&
  stage1 === 1 &&
  enemyCount === 4 &&
  afterFirstSkill.comboTutorialShown === true &&
  afterFirstSkill.comboReadyAt > 0 &&
  afterEncounter.stage === 2 &&
  afterEncounter.encounterOver === true &&
  afterEncounter.enemiesLeft === 0 &&
  afterFarewell === 3 &&
  pathOutReady &&
  finalState.waypointIndex === 9 &&
  finalState.seenCards.includes('of-the-falathrim');
console.log('ALL WAYPOINT 9 CHECKS PASSED:', allOk);
await browser.close();
process.exit(errorsOut.length || !allOk ? 1 : 0);
