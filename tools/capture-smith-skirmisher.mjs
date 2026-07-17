import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const OUT = './smoke-shots-smith-skirmisher-mid';
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

async function castSlot(slot, waitMs) {
  await page.evaluate((slot) => {
    const w = window.__game.scene.getScene('World');
    w.skillCooldowns = {};
    w.attacking = false;
    w.onSkillPressed({ slot });
  }, slot);
  await page.waitForTimeout(waitMs);
}

// Smith: hammer_strike=0 (basic overhead), overcharge_strike=2 (charge-up)
await enterTraining('smith');
await page.evaluate(() => window.__game.scene.getScene('World').onAttack());
await page.waitForTimeout(90);
await page.screenshot({ path: `${OUT}/01-hammer-basic-overhead.png` });
await page.waitForTimeout(500);

await castSlot(2, 250); // overcharge_strike mid charge-up
await page.screenshot({ path: `${OUT}/02-overcharge-chargeup.png` });
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/03-overcharge-smash.png` });
await page.waitForTimeout(600);

// Skirmisher: quick_stab basic (jab), backstab=1 (flash from angle)
await enterTraining('skirmisher');
await page.evaluate(() => window.__game.scene.getScene('World').onAttack());
await page.waitForTimeout(60);
await page.screenshot({ path: `${OUT}/04-dagger-basic-jab.png` });
await page.waitForTimeout(400);

await castSlot(1, 90); // backstab mid-flash
await page.screenshot({ path: `${OUT}/05-backstab-flash.png` });

console.log('done');
await browser.close();
