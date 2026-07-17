import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const OUT = './smoke-shots-captain-summoner-mid';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 800, height: 450 }, hasTouch: true });
const page = await ctx.newPage();

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

async function enterTraining(classId) {
  await page.evaluate(async (classId) => {
    window.__game.scene.start('Creation');
    await new Promise((r) => setTimeout(r, 300));
    const scene = window.__game.scene.getScene('Creation');
    scene.kindredId = 'vanyar';
    scene.startTraining({ id: classId });
    await new Promise((r) => setTimeout(r, 800));
    const w = window.__game.scene.getScene('World');
    w.player.setPosition(400, 240);
    w.state.mp = 999;
  }, classId);
}

async function castSlot(slot) {
  await page.evaluate((slot) => {
    const w = window.__game.scene.getScene('World');
    w.skillCooldowns = {};
    w.attacking = false;
    w.onSkillPressed({ slot });
  }, slot);
}

// --- Summoner: eagle/ent size + talisman beam ---
await enterTraining('summoner');

// stand back from the dummy so the talisman beam has room to read
await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  const dummy = w.quest.getEnemies()[0];
  w.player.setPosition(dummy.x - 140, dummy.y);
});
await page.evaluate(() => window.__game.scene.getScene('World').onAttack());
await page.waitForTimeout(120);
await page.screenshot({ path: `${OUT}/01-talisman-beam.png` });
await page.waitForTimeout(600);

await castSlot(2); // call_great_eagle
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/02-eagle-size.png` });
await page.waitForTimeout(400);

await castSlot(3); // call_ent
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/03-ent-size.png` });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/04-summons-hover-near-enemy.png` });

// --- Captain: single-enemy convergence ---
await enterTraining('captain');
await castSlot(5); // war_horns_call (capstone)
await page.waitForTimeout(1600);
await page.screenshot({ path: `${OUT}/05-warhorn-single-enemy-converge.png` });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${OUT}/06-warhorn-single-enemy-no-return.png` });
await page.waitForTimeout(3000); // past the 5.2s release/fade window

// --- Captain: multi-enemy spread (synthetic enemies, training grounds only
// ever has the one dummy, so getEnemies is patched here purely to exercise
// the spread-across-targets branch for a screenshot) ---
await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  const cx = w.player.x;
  const cy = w.player.y;
  w.quest.getEnemies = () => [
    { x: cx + 160, y: cy - 60, hp: 999 },
    { x: cx + 170, y: cy + 70, hp: 999 },
    { x: cx - 150, y: cy - 40, hp: 999 },
    { x: cx - 160, y: cy + 60, hp: 999 },
  ];
});
await castSlot(5);
await page.waitForTimeout(1600);
await page.screenshot({ path: `${OUT}/07-warhorn-multi-enemy-spread.png` });

console.log('done');
await browser.close();
