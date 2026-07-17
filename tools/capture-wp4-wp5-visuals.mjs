import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const OUT = './smoke-shots-wp4-wp5-visuals';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 800, height: 450 }, hasTouch: true });
const page = await ctx.newPage();

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

// WP4 river valley: seed a save standing right at the start of WP4
await page.evaluate(() => {
  const profile = {
    id: 'visual-test', name: 'Visual Tester', createdAt: Date.now(), updatedAt: Date.now(),
    campaigns: { greatJourney: { slots: [
      {
        version: 1, kindred: 'noldor', classId: 'ranger', stats: { VIT: 7, MAG: 3, STR: 8, DEX: 10 },
        hp: 90, mp: 38, gold: 65, waypointIndex: 3, zone: '__journey__', pos: null,
        quest: { id: 'lost-before-nightfall', stage: 5, flags: {} }, seenIntro: true,
        equipment: { head: null, chest: null, gloves: null, boots: null, accessory: null, weapon: 'hunters_bow' },
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
await page.mouse.click(400, 295); await page.waitForTimeout(500);
await page.mouse.click(400, 226); await page.waitForTimeout(700);
await page.mouse.click(135, 160); await page.waitForTimeout(700);
await page.mouse.click(400, 110); await page.waitForTimeout(1000);
await page.evaluate(() => window.__game.scene.getScene('Journey').tapWaypoint(3));
await page.waitForTimeout(1000);

// pan up toward the river band for a clear shot of the valley + river
await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  w.player.setPosition(300, 260);
});
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/01-vales-anduin-valley-river.png` });

// trigger the practice encounter and capture mid-fight
await page.evaluate(() => window.__game.scene.getScene('World').quest.talkLenwe());
await page.waitForTimeout(400);
for (let i = 0; i < 3; i++) { await page.mouse.click(400, 400); await page.waitForTimeout(300); }
await page.evaluate(() => window.__game.scene.getScene('World').quest.talkTrainer());
await page.waitForTimeout(400);
for (let i = 0; i < 2; i++) { await page.mouse.click(400, 400); await page.waitForTimeout(300); }
await page.waitForTimeout(500);
await page.mouse.click(400, 424); // close skills tutorial
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/02-shadow-wisp-encounter.png` });

// WP5 mountain pass corridor — a wider establishing shot
await page.evaluate(() => {
  const profile = {
    id: 'visual-test2', name: 'Visual Tester 2', createdAt: Date.now(), updatedAt: Date.now(),
    campaigns: { greatJourney: { slots: [
      {
        version: 1, kindred: 'teleri', classId: 'loresinger', stats: { VIT: 6, MAG: 12, STR: 4, DEX: 6 },
        hp: 86, mp: 92, gold: 105, waypointIndex: 4, zone: '__journey__', pos: null,
        quest: { id: 'lenwes-choice', stage: 5, flags: {} }, seenIntro: true,
        equipment: { head: null, chest: null, gloves: null, boots: null, accessory: null, weapon: 'travelers_harp' },
        inventory: [], level: 3, xp: 20, statPoints: 3, skillPoints: 2, skills: {},
        actionBar: [null, null, null, null], potions: { hp: 2, mp: 2 }, titles: [], seenCards: [],
        party: [], journeyFlags: { anwenStayed: false },
        savedAt: Date.now(), lastWhere: 'Vales of Anduin',
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
await page.evaluate(() => window.__game.scene.getScene('Journey').tapWaypoint(4));
await page.waitForTimeout(1500); // let the stage-0 auto-transition (Anwen absent -> straight to Calanon) settle
await page.screenshot({ path: `${OUT}/03-misty-mountains-pass.png` });

console.log('done');
await browser.close();
