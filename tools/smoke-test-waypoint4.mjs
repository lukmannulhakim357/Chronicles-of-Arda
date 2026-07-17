// Full playthrough of Waypoint 4 — "Vales of Anduin" / "Lenwë's Choice":
// talk to Lenwë, talk to the trainer (grants a skill point + opens the
// Skills tutorial), fight the practice shadow-wisp, make Anwen's choice
// (first real branching dialogue in the game), watch the farewell, and
// exit to the Story completion card with waypointIndex bumped to 4.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const OUT = './smoke-shots-waypoint4';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 800, height: 450 }, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

// Seed a save that's already finished Waypoint 3 and standing at the start
// of Waypoint 4, so this test doesn't need to replay WP1-3 first.
await page.evaluate(() => {
  const profile = {
    id: 'wp4-test', name: 'WP4 Tester', createdAt: Date.now(), updatedAt: Date.now(),
    campaigns: { greatJourney: { slots: [
      {
        version: 1, kindred: 'vanyar', classId: 'warrior', stats: { VIT: 10, MAG: 2, STR: 10, DEX: 6 },
        hp: 130, mp: 32, gold: 65, waypointIndex: 3, zone: '__journey__', pos: null,
        quest: { id: 'lost-before-nightfall', stage: 5, flags: {} }, seenIntro: true,
        equipment: { head: null, chest: null, gloves: null, boots: null, accessory: null, weapon: 'woodsmans_sword' },
        inventory: [], level: 2, xp: 40, statPoints: 0, skillPoints: 1, skills: {},
        actionBar: [null, null, null, null], potions: { hp: 2, mp: 2 }, titles: [], seenCards: [],
        party: [], journeyFlags: {},
        savedAt: Date.now(), lastWhere: 'The Great Forest',
      },
      null, null, null,
    ] } },
  };
  localStorage.setItem('arda.profiles.v1', JSON.stringify([profile]));
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

// Load Game -> profile -> campaign -> slot 1 -> Journey -> waypoint 4
await page.mouse.click(400, 295); await page.waitForTimeout(500); // Load Game
await page.mouse.click(400, 226); await page.waitForTimeout(700); // profile row
await page.mouse.click(135, 160); await page.waitForTimeout(700); // The Great Journey card
await page.mouse.click(400, 110); await page.waitForTimeout(1000); // occupied slot -> Journey (zone was __journey__)

const journeyState = await page.evaluate(() => {
  const j = window.__game.scene.getScene('Journey');
  return { waypointIndex: j.state.waypointIndex };
});
console.log('arrived at Journey with waypointIndex:', journeyState.waypointIndex);

// tap waypoint 4 (index 3, "Vales of Anduin") on the road
await page.evaluate(() => {
  const j = window.__game.scene.getScene('Journey');
  j.tapWaypoint(3);
});
await page.waitForTimeout(1200);

const zoneCheck = await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  return { zone: w?.state?.zone, stage: w?.quest?.stage, points: Object.keys(w?.zoneInfo?.points ?? {}) };
});
console.log('entered zone:', JSON.stringify(zoneCheck));

// drive the quest programmatically (deterministic, not pixel-coordinate
// dependent) — call each stage's dialogue-trigger method directly, the
// same way the World scene calls it when the player taps the NPC
async function advance(fn, waitMs = 900) {
  await page.evaluate(fn);
  await page.waitForTimeout(waitMs);
}

// stage 0 -> 1: talk to Lenwë
await advance(() => window.__game.scene.getScene('World').quest.talkLenwe());
// advance past the 3-line dialogue by tapping the sheet
for (let i = 0; i < 3; i++) { await page.mouse.click(400, 400); await page.waitForTimeout(300); }

let stage1 = await page.evaluate(() => window.__game.scene.getScene('World').quest.stage);
console.log('stage after talking to Lenwe (want 1):', stage1);

// stage 1 -> 2: talk to the trainer (grants skill point, opens Skills tutorial)
await advance(() => window.__game.scene.getScene('World').quest.talkTrainer());
for (let i = 0; i < 2; i++) { await page.mouse.click(400, 400); await page.waitForTimeout(300); }
// the Skills tutorial screen should now be open (World paused)
await page.waitForTimeout(500);
const skillsTutorialOpen = await page.evaluate(() => {
  const c = window.__game.scene.getScene('Character');
  return { active: window.__game.scene.isActive('Character'), tab: c?.tab, skillsTutorial: c?.skillsTutorial };
});
console.log('skills tutorial state:', JSON.stringify(skillsTutorialOpen));
// close it (Close button)
await page.mouse.click(400, 424);
await page.waitForTimeout(700);
const stage2 = await page.evaluate(() => window.__game.scene.getScene('World').quest.stage);
console.log('stage after trainer + closing tutorial (want 2):', stage2);
const skillPoints = await page.evaluate(() => window.__game.scene.getScene('World').state.skillPoints);
console.log('skillPoints granted (want >= 1):', skillPoints);

// stage 2: practice encounter — teleport next to the wisp (it spawns far
// from the entry point in this open valley map) then cast basic attacks
await page.waitForTimeout(600);
const wispPresent = await page.evaluate(() => !!window.__game.scene.getScene('World').quest.wisp);
console.log('practice wisp spawned:', wispPresent);
await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  const wisp = w.quest.wisp;
  w.player.setPosition(wisp.x - 20, wisp.y);
});
for (let i = 0; i < 12; i++) {
  await page.evaluate(() => window.__game.scene.getScene('World').onAttack());
  await page.waitForTimeout(650);
  const done = await page.evaluate(() => window.__game.scene.getScene('World').quest.stage >= 3);
  if (done) break;
}
const stage3 = await page.evaluate(() => window.__game.scene.getScene('World').quest.stage);
console.log('stage after defeating the wisp (want 3):', stage3);

// stage 3: Anwen's choice — first real branching dialogue in the game
await advance(() => window.__game.scene.getScene('World').quest.talkAnwen());
for (let i = 0; i < 3; i++) { await page.mouse.click(400, 400); await page.waitForTimeout(300); }
// choices should now be showing — click "Come with us over the mountains."
// (the actual button, at its real rendered position, not a guessed coordinate)
await page.waitForTimeout(400);
const choiceButtonsVisible = await page.evaluate(() => window.__game.scene.getScene('UI').choiceButtons.length);
console.log('choice buttons rendered (want 2):', choiceButtonsVisible);
const firstChoicePos = await page.evaluate(() => {
  const b = window.__game.scene.getScene('UI').choiceButtons[0];
  return { x: b.x, y: b.y };
});
await page.mouse.click(firstChoicePos.x, firstChoicePos.y); // "Come with us over the mountains."
await page.waitForTimeout(500);
await page.mouse.click(400, 400); // the follow-up single-line reply
await page.waitForTimeout(700);

const anwenFlag = await page.evaluate(() => window.__game.scene.getScene('World').state.journeyFlags.anwenStayed);
console.log('anwenStayed flag after choosing "stay" (want true):', anwenFlag);
const stage4 = await page.evaluate(() => window.__game.scene.getScene('World').quest.stage);
console.log('stage after Anwen choice (want 4):', stage4);

// stage 4: the farewell — wait for it to play out and the path-out point to spawn
await page.waitForTimeout(4200);
const pathOutReady = await page.evaluate(() => !!window.__game.scene.getScene('World').quest.pathOutPoint);
console.log('path-out point spawned after farewell:', pathOutReady);
await page.screenshot({ path: `${OUT}/01-farewell-done.png` });

await advance(() => window.__game.scene.getScene('World').quest.finishQuest());
await page.mouse.click(400, 400); // the single narration line
await page.waitForTimeout(900);

const finalState = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('arda.profiles.v1'))[0].campaigns.greatJourney.slots[0];
  return { waypointIndex: s.waypointIndex, questId: s.quest.id, stage: s.quest.stage, level: s.level, xp: s.xp, gold: s.gold };
});
console.log('FINAL SAVE after WP4:', JSON.stringify(finalState));

const errorsOut = errors.filter((e) => !e.includes('404'));
console.log('ERRORS:', errorsOut.length ? errorsOut.join('\n') : 'none');
const allOk =
  zoneCheck.zone === 'vales-anduin' &&
  stage1 === 1 &&
  stage2 === 2 &&
  skillPoints >= 1 &&
  wispPresent &&
  stage3 === 3 &&
  choiceButtonsVisible === 2 &&
  anwenFlag === true &&
  stage4 === 4 &&
  pathOutReady &&
  finalState.waypointIndex === 4;
console.log('ALL WAYPOINT 4 CHECKS PASSED:', allOk);
await browser.close();
process.exit(errorsOut.length || !allOk ? 1 : 0);
