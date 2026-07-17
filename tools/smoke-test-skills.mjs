// Verifies the Skill Tree + Action Bar UI (Character screen's Skills tab):
// seed a level-5 character with 5 banked skill points, rank up the first
// skill, confirm the next one unlocks, assign it to the action bar, close,
// reopen, and confirm everything persisted through a save/reload.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const OUT = './smoke-shots-skills';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 800, height: 450 }, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.evaluate(() => {
  const profile = {
    id: 'skill-test', name: 'Skill Tester', createdAt: Date.now(), updatedAt: Date.now(),
    campaigns: { greatJourney: { slots: [
      { version: 1, kindred: 'vanyar', classId: 'warrior', stats: { VIT: 10, MAG: 2, STR: 10, DEX: 6 }, hp: 130, mp: 32, gold: 48,
        waypointIndex: 2, zone: 'steppes', pos: null,
        quest: { id: 'stragglers', stage: 3, flags: {} }, seenIntro: true,
        equipment: { head: null, chest: null, gloves: null, boots: null, accessory: null, weapon: null }, inventory: [],
        level: 5, xp: 10, statPoints: 0, skillPoints: 5, skills: {}, actionBar: [null, null, null, null], titles: [], seenCards: [],
        savedAt: Date.now(), lastWhere: 'The Steppes' },
      null, null, null,
    ] } },
  };
  localStorage.setItem('arda.profiles.v1', JSON.stringify([profile]));
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

await page.mouse.click(400, 295); await page.waitForTimeout(600);
await page.mouse.click(400, 226); await page.waitForTimeout(900);
await page.mouse.click(135, 160); await page.waitForTimeout(900);
await page.mouse.click(400, 110); await page.waitForTimeout(2500);
await page.mouse.click(770, 20); await page.waitForTimeout(400); // pause menu
await page.mouse.click(400, 159); await page.waitForTimeout(700); // Character
await page.mouse.click(308, 32); await page.waitForTimeout(400); // Skills tab
await page.screenshot({ path: `${OUT}/01-skills-tab.png` });

// row 1 (Bash) '+' button sits at (684, 100) for this seeded save/viewport
await page.mouse.click(684, 100); await page.waitForTimeout(300);
let rows = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Character');
  return s.children.list.filter((o) => o.text !== undefined).map((o) => o.text);
});
console.log('Cleave unlocked after ranking Bash:', rows.includes('Locked') && !rows.slice(rows.indexOf('Cleave') + 1, rows.indexOf('Cleave') + 2).includes('Locked'));
console.log('points-spent line:', rows.find((t) => t.includes('spent')));
await page.screenshot({ path: `${OUT}/02-after-rankup.png` });

// close — the HUD skill wheel should now contain Bash (auto-filled from
// learned actives) plus the two potion slots
await page.mouse.click(400, 424); await page.waitForTimeout(700);
const ring = await page.evaluate(() => {
  const ui = window.__game.scene.getScene('UI');
  return { ring: ui.ring.map((s) => (s ? s.name : null)), visibleBtns: ui.skillBtns.filter((b) => b.cont.visible).length };
});
console.log('skill wheel after learning Bash:', JSON.stringify(ring));
await page.screenshot({ path: `${OUT}/03-skill-wheel.png` });

// confirm persistence through a save/reload cycle
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.mouse.click(400, 295); await page.waitForTimeout(600);
await page.mouse.click(400, 226); await page.waitForTimeout(900);
await page.mouse.click(135, 160); await page.waitForTimeout(900);
await page.mouse.click(400, 110); await page.waitForTimeout(2500);
const persisted = await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  return { skills: w.state.skills, potions: w.state.potions, skillPoints: w.state.skillPoints };
});
console.log('persisted after reload:', JSON.stringify(persisted));

const errorsOut = errors.filter((e) => !e.includes('404'));
console.log('ERRORS:', errorsOut.length ? errorsOut.join('\n') : 'none');
await browser.close();
process.exit(errorsOut.length ? 1 : 0);
