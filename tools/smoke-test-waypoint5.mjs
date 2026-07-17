// Full playthrough of Waypoint 5 — "Misty Mountains" / "The Pass": Anwen
// (recruited here because she stayed at Waypoint 4) joins as the party
// system's actual unlock moment, Calanon joins after a small favor, the
// frost-shade boss fight exercises real companion combat AI (not just
// following), and Oromë opens the way down to waypointIndex 5.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const OUT = './smoke-shots-waypoint5';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 800, height: 450 }, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

// Seed a save already finished with Waypoint 4, with Anwen flagged as
// having stayed with the host (journeyFlags.anwenStayed = true), standing
// at the start of Waypoint 5.
await page.evaluate(() => {
  const profile = {
    id: 'wp5-test', name: 'WP5 Tester', createdAt: Date.now(), updatedAt: Date.now(),
    campaigns: { greatJourney: { slots: [
      {
        version: 1, kindred: 'vanyar', classId: 'warrior', stats: { VIT: 10, MAG: 2, STR: 10, DEX: 6 },
        hp: 130, mp: 32, gold: 105, waypointIndex: 4, zone: '__journey__', pos: null,
        quest: { id: 'lenwes-choice', stage: 5, flags: {} }, seenIntro: true,
        equipment: { head: null, chest: null, gloves: null, boots: null, accessory: null, weapon: 'woodsmans_sword' },
        inventory: [], level: 3, xp: 20, statPoints: 3, skillPoints: 2, skills: { bash: 1 },
        actionBar: [null, null, null, null], potions: { hp: 2, mp: 2 }, titles: [], seenCards: [],
        party: [], journeyFlags: { anwenStayed: true },
        savedAt: Date.now(), lastWhere: 'Vales of Anduin',
      },
      null, null, null,
    ] } },
  };
  localStorage.setItem('arda.profiles.v1', JSON.stringify([profile]));
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

await page.mouse.click(400, 295); await page.waitForTimeout(500); // Load Game
await page.mouse.click(400, 226); await page.waitForTimeout(700); // profile row
await page.mouse.click(135, 160); await page.waitForTimeout(700); // The Great Journey card
await page.mouse.click(400, 110); await page.waitForTimeout(1000); // occupied slot -> Journey

await page.evaluate(() => {
  const j = window.__game.scene.getScene('Journey');
  j.tapWaypoint(4); // waypoint index 4 = the 5th waypoint, "Misty Mountains"
});
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
async function clickThroughDialogue(n) {
  for (let i = 0; i < n; i++) { await page.mouse.click(400, 400); await page.waitForTimeout(300); }
}

// stage 1: Anwen joins — the actual party-system unlock moment
const anwenPresent = await page.evaluate(() => !!window.__game.scene.getScene('World').quest.anwenNpc);
console.log('Anwen present at stage 1 (eligible since she stayed at WP4):', anwenPresent);
await advance(() => window.__game.scene.getScene('World').quest.talkAnwen());
await clickThroughDialogue(2);
await page.waitForTimeout(500);
// the Party tutorial should now be open (World paused) since Anwen is the first recruit
const partyTutorialOpen = await page.evaluate(() => {
  const c = window.__game.scene.getScene('Character');
  return { active: window.__game.scene.isActive('Character'), tab: c?.tab, partyTutorial: c?.partyTutorial };
});
console.log('party tutorial state:', JSON.stringify(partyTutorialOpen));
await page.screenshot({ path: `${OUT}/01-party-tab-tutorial.png` });
await page.mouse.click(400, 424); // Close
await page.waitForTimeout(700);

const afterAnwen = await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  return { stage: w.quest.stage, party: w.state.party, partyMembersInWorld: w.partyMembers?.length };
});
console.log('after Anwen recruit:', JSON.stringify(afterAnwen));

// stage 2: Calanon — a small favor, then he joins
await advance(() => window.__game.scene.getScene('World').quest.talkCalanon());
await clickThroughDialogue(2);
await page.waitForTimeout(500);
await advance(() => window.__game.scene.getScene('World').quest.talkCalanon()); // second visit — completes the recruit
await clickThroughDialogue(1);
await page.waitForTimeout(700);

const afterCalanon = await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  return { stage: w.quest.stage, partyNames: w.state.party.map((c) => c.name), partyMembersInWorld: w.partyMembers?.length };
});
console.log('after Calanon recruit:', JSON.stringify(afterCalanon));
await page.screenshot({ path: `${OUT}/02-full-party.png` });

// stage 3: the frost-shade boss fight — teleport near it, then let both the
// player's own attacks AND the companion AI (real decideAction() calls, not
// just following) whittle it down
await page.waitForTimeout(600);
const bossPresent = await page.evaluate(() => !!window.__game.scene.getScene('World').quest.boss);
console.log('boss spawned:', bossPresent);
await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  const boss = w.quest.boss;
  w.player.setPosition(boss.x - 20, boss.y);
});
let bossHpSamples = [];
for (let i = 0; i < 20; i++) {
  await page.evaluate(() => window.__game.scene.getScene('World').onAttack());
  await page.waitForTimeout(700);
  const hp = await page.evaluate(() => window.__game.scene.getScene('World').quest.bossCombatant?.hp);
  bossHpSamples.push(hp);
  const done = await page.evaluate(() => window.__game.scene.getScene('World').quest.stage >= 4);
  if (done) break;
}
console.log('boss HP samples over the fight (should trend down, companions contribute too):', JSON.stringify(bossHpSamples));
const stage4 = await page.evaluate(() => window.__game.scene.getScene('World').quest.stage);
console.log('stage after boss defeated (want 4):', stage4);
await page.screenshot({ path: `${OUT}/03-boss-fight.png` });

// stage 4: Oromë opens the way
await page.waitForTimeout(600);
const oromePresent = await page.evaluate(() => !!window.__game.scene.getScene('World').quest.oromeNpc);
console.log('Orome present at stage 4:', oromePresent);
await advance(() => window.__game.scene.getScene('World').quest.talkOrome());
await clickThroughDialogue(2);
await page.waitForTimeout(500);
const pathOutReady = await page.evaluate(() => !!window.__game.scene.getScene('World').quest.pathOutPoint);
console.log('path-out point spawned after Orome:', pathOutReady);

await advance(() => window.__game.scene.getScene('World').quest.finishQuest());
await page.waitForTimeout(900);

const finalState = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('arda.profiles.v1'))[0].campaigns.greatJourney.slots[0];
  return { waypointIndex: s.waypointIndex, questId: s.quest.id, stage: s.quest.stage, party: s.party.map((c) => `${c.name}(${c.classId} Lv.${c.level})`) };
});
console.log('FINAL SAVE after WP5:', JSON.stringify(finalState));

const errorsOut = errors.filter((e) => !e.includes('404'));
console.log('ERRORS:', errorsOut.length ? errorsOut.join('\n') : 'none');
const bossDamaged = bossHpSamples.some((hp) => hp != null && hp < 150);
const allOk =
  zoneCheck.zone === 'hithaeglir' &&
  anwenPresent &&
  partyTutorialOpen.active && partyTutorialOpen.tab === 'party' &&
  afterAnwen.party.length === 1 &&
  afterAnwen.partyMembersInWorld === 1 &&
  afterCalanon.partyNames.length === 2 &&
  afterCalanon.partyMembersInWorld === 2 &&
  bossPresent &&
  bossDamaged &&
  stage4 === 4 &&
  oromePresent &&
  pathOutReady &&
  finalState.waypointIndex === 5 &&
  finalState.party.length === 2;
console.log('ALL WAYPOINT 5 CHECKS PASSED:', allOk);
await browser.close();
process.exit(errorsOut.length || !allOk ? 1 : 0);
