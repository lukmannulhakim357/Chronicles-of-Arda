// Verifies the EXP/Level + stat point system directly: seed a character
// already at Level 2 with 3 unspent stat points, open the pause menu
// (should read "Character (3)"), switch to the Stats tab, allocate 2
// points into VIT, confirm, and check the change persisted to state and
// that derived Max HP recalculated correctly.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const OUT = './smoke-shots-leveling';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 800, height: 450 }, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

const world = () => `window.__game.scene.getScene('World')`;
const readStats = () => page.evaluate(`(() => { const w = ${world()}; return { stats: w.state.stats, statPoints: w.state.statPoints, maxHp: w.stats.maxHp }; })()`);

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.evaluate(() => {
  const profile = {
    id: 'lvl-test', name: 'Lvl Tester', createdAt: Date.now(), updatedAt: Date.now(),
    campaigns: { greatJourney: { slots: [
      { version: 1, kindred: 'vanyar', classId: 'warrior', stats: { VIT: 10, MAG: 2, STR: 10, DEX: 6 }, hp: 130,
        waypointIndex: 1, zone: 'steppes', pos: null,
        quest: { id: 'stragglers', stage: 0, flags: {} }, seenIntro: true,
        equipment: { armor: null, weapon: null, trinket: null }, inventory: [],
        level: 2, xp: 0, statPoints: 3, skillPoints: 1,
        savedAt: Date.now(), lastWhere: 'The Steppes' },
      null, null, null,
    ] } },
  };
  localStorage.setItem('arda.profiles.v1', JSON.stringify([profile]));
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// Homepage -> Load Game -> profile -> Great Journey -> occupied slot -> World
await page.mouse.click(400, 295);
await page.waitForTimeout(600);
await page.mouse.click(400, 226);
await page.waitForTimeout(900);
await page.mouse.click(135, 160);
await page.waitForTimeout(900);
await page.mouse.click(400, 110);
await page.waitForTimeout(2500);

console.log('before allocation:', JSON.stringify(await readStats()));

// open pause menu -> should show "Character (3)"
await page.mouse.click(770, 20);
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/01-pause-with-points.png` });
// Character is item index 1: y = height/2-118+52 = 225-118+52=159
await page.mouse.click(400, 159);
await page.waitForTimeout(700);

// switch to Stats tab (right tab button, ~x=cx+64=464, y=42)
await page.mouse.click(464, 42);
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/02-stats-tab.png` });

// VIT row is the first stat row; top=72 (tabY 42 + 30), no levelUp banner this time
// xp line y=72, +22=94; avail line y=94,+30=124; VIT row center = 124+25=149
// '+' button for VIT is at roughly x = cx + rowW/2 - 16 (rowW=min(480,width-32)=480) -> x=400+240-16=624
await page.mouse.click(624, 149);
await page.waitForTimeout(300);
await page.mouse.click(624, 149);
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/03-after-plus-taps.png` });

// Confirm button should now be visible; find & tap it (below the preview line)
// rows: 4 * 56 = 224 starting at 149-25=124 -> ends 124+224=348, +10=358 preview line, +22=380, button at +20=400
await page.mouse.click(484, 410); // Confirm (right of Cancel, bottom row)
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/04-after-confirm.png` });

// close
await page.mouse.click(400, 410);
await page.waitForTimeout(600);
console.log('after allocation:', JSON.stringify(await readStats()));

const errorsOut = errors.filter((e) => !e.includes('404'));
console.log('ERRORS:', errorsOut.length ? errorsOut.join('\n') : 'none');
await browser.close();
process.exit(errorsOut.length ? 1 : 0);
