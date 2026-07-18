// Full playthrough of Waypoint 8 — "Beleriand & Neldoreth" / "The King Is
// Lost": search Nan Elmoth for three Tales (the first opens the Collection
// tab tutorial), report back to Olwë for the first Title (Seeker, +
// Titles tab tutorial), then the Eglath's farewell where Calanon chooses
// to stay behind — and exit with waypointIndex bumped to 8.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const OUT = './smoke-shots-waypoint8';
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
    id: 'wp8-test', name: 'WP8 Tester', createdAt: Date.now(), updatedAt: Date.now(),
    campaigns: { greatJourney: { slots: [
      {
        version: 1, kindred: 'teleri', classId: 'ranger', stats: { VIT: 8, MAG: 4, STR: 8, DEX: 12 },
        hp: 96, mp: 40, gold: 40, waypointIndex: 7, zone: '__journey__', pos: null,
        quest: { id: 'first-contact', stage: 3, flags: {} }, seenIntro: true,
        equipment: { head: null, chest: null, gloves: null, boots: null, accessory: null, weapon: null },
        inventory: [], level: 4, xp: 20, statPoints: 0, skillPoints: 0, skills: {},
        actionBar: [null, null, null, null], potions: { hp: 2, mp: 2 }, titles: [], equippedTitle: null, seenCards: [],
        party: [{ id: 'calanon', name: 'Calanon', classId: 'ranger', level: 4 }],
        journeyFlags: { anwenStayed: false },
        savedAt: Date.now(), lastWhere: 'Ered Luin',
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

await page.evaluate(() => window.__game.scene.getScene('Journey').tapWaypoint(7)); // waypoint index 7 = 8th waypoint, Beleriand
await page.waitForTimeout(1200);

const zoneCheck = await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  return { zone: w?.state?.zone, stage: w?.quest?.stage, partyLen: w?.state?.party?.length, partyMembersLen: w?.partyMembers?.length };
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

// stage 0: Olwë's news
await advance(() => window.__game.scene.getScene('World').quest.talkOlwe());
await clickThrough(3, 400);
await page.waitForTimeout(500);
const stage1 = await page.evaluate(() => window.__game.scene.getScene('World').quest.stage);
console.log('stage after Olwe intro (want 1):', stage1);
await page.screenshot({ path: `${OUT}/01-olwe-intro.png` });

// stage 1: search the 3 points — first one opens the Collection tutorial
const searchKeys = await page.evaluate(() => window.__game.scene.getScene('World').quest.searchPoints.map((s) => s.key));
console.log('search points spawned:', JSON.stringify(searchKeys));

await advance(() => window.__game.scene.getScene('World').quest.searchAt('search1'));
await clickThrough(1, 400);
await page.waitForTimeout(600);
// this should have opened the Character scene (Collection tutorial) — close it
const collectionTutorialOpen = await page.evaluate(() => {
  const ch = window.__game.scene.getScene('Character');
  return ch?.scene.isActive() && ch.tab === 'collection' && ch.collectionTutorial;
});
console.log('Collection tab tutorial opened after first Tale:', collectionTutorialOpen);
await page.screenshot({ path: `${OUT}/02-collection-tutorial.png` });
await page.evaluate(() => window.__game.scene.getScene('Character').close());
await page.waitForTimeout(500);

await advance(() => window.__game.scene.getScene('World').quest.searchAt('search2'));
await clickThrough(1, 400);
await page.waitForTimeout(500);
await advance(() => window.__game.scene.getScene('World').quest.searchAt('search3'));
await clickThrough(1, 400);
await page.waitForTimeout(700);

const afterSearch = await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  return { stage: w.quest.stage, cardIds: w.state.seenCards.map((c) => c.id) };
});
console.log('after all 3 searches (want stage 2, 3 tale cards):', JSON.stringify(afterSearch));
await page.screenshot({ path: `${OUT}/03-all-searched.png` });

// stage 2: report to Olwe — first Title + Titles tutorial
await advance(() => window.__game.scene.getScene('World').quest.talkOlwe());
await clickThrough(4, 400);
await page.waitForTimeout(600);
const titlesTutorialOpen = await page.evaluate(() => {
  const ch = window.__game.scene.getScene('Character');
  return ch?.scene.isActive() && ch.tab === 'titles' && ch.titlesTutorial;
});
console.log('Titles tab tutorial opened after report:', titlesTutorialOpen);
await page.screenshot({ path: `${OUT}/04-titles-tutorial.png` });

// equip the Seeker title while the tutorial screen is open
await page.evaluate(() => {
  const ch = window.__game.scene.getScene('Character');
  ch.state.equippedTitle = 'seeker';
  ch.persistGear();
  ch.build();
});
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/05-title-equipped.png` });
await page.evaluate(() => window.__game.scene.getScene('Character').close());
await page.waitForTimeout(700);

const afterTitle = await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  return { stage: w.quest.stage, titles: w.state.titles, equippedTitle: w.state.equippedTitle };
});
console.log('after title granted+equipped (want stage 3):', JSON.stringify(afterTitle));

// stage 3: the Eglath farewell — Calanon's choice (stay)
await page.waitForTimeout(600);
await page.mouse.click(400, 400); // Calanon's 2-line intro; choices show after the 2nd
await page.waitForTimeout(400);
const calanonChoicePos = await page.evaluate(() => {
  const b = window.__game.scene.getScene('UI').choiceButtons?.[0]; // "Stay with your people, Calanon..."
  return b ? { x: b.x, y: b.y } : null;
});
console.log('Calanon choice offered:', !!calanonChoicePos);
if (calanonChoicePos) {
  await page.mouse.click(calanonChoicePos.x, calanonChoicePos.y);
  await page.waitForTimeout(500);
  await page.mouse.click(400, 400); // Calanon's farewell line
  await page.waitForTimeout(500);
  await page.mouse.click(400, 400); // the Eglath's line, kicks off the crowd departure
  await page.waitForTimeout(4000); // crowd walk + fade
}
await page.screenshot({ path: `${OUT}/06-eglath-farewell.png` });

const afterFarewell = await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  return {
    stage: w.quest.stage,
    partyLen: w.state.party.length,
    partyMembersLen: w.partyMembers.length,
    calanonStayed: w.state.journeyFlags?.calanonStayedWithEglath,
  };
});
console.log('after farewell (want stage 4, party emptied of Calanon):', JSON.stringify(afterFarewell));

// stage 4: continue east
const pathOutReady = await page.evaluate(() => !!window.__game.scene.getScene('World').quest.pathOutPoint);
console.log('path-out point spawned after farewell:', pathOutReady);
await advance(() => window.__game.scene.getScene('World').quest.finishQuest());
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/07-waypoint-complete.png` });

const finalState = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('arda.profiles.v1'))[0].campaigns.greatJourney.slots[0];
  return {
    waypointIndex: s.waypointIndex, questId: s.quest.id, stage: s.quest.stage, gold: s.gold,
    seenCards: s.seenCards.map((c) => c.id), titles: s.titles, equippedTitle: s.equippedTitle, party: s.party,
  };
});
console.log('FINAL SAVE after WP8:', JSON.stringify(finalState));

const errorsOut = errors.filter((e) => !e.includes('404'));
console.log('ERRORS:', errorsOut.length ? errorsOut.join('\n') : 'none');
const allOk =
  zoneCheck.zone === 'beleriand' &&
  stage1 === 1 &&
  searchKeys.length === 3 &&
  collectionTutorialOpen &&
  afterSearch.stage === 2 &&
  afterSearch.cardIds.includes('tale-torn-cloak') &&
  afterSearch.cardIds.includes('tale-starlit-hush') &&
  afterSearch.cardIds.includes('tale-last-trace-elwe') &&
  titlesTutorialOpen &&
  afterTitle.stage === 3 &&
  afterTitle.titles.includes('seeker') &&
  afterTitle.equippedTitle === 'seeker' &&
  !!calanonChoicePos &&
  afterFarewell.stage === 4 &&
  afterFarewell.partyLen === 0 &&
  afterFarewell.partyMembersLen === 0 &&
  afterFarewell.calanonStayed === true &&
  pathOutReady &&
  finalState.waypointIndex === 8 &&
  finalState.seenCards.includes('of-the-sindar') &&
  finalState.titles.includes('seeker') &&
  finalState.party.length === 0;
console.log('ALL WAYPOINT 8 CHECKS PASSED:', allOk);
await browser.close();
process.exit(errorsOut.length || !allOk ? 1 : 0);
