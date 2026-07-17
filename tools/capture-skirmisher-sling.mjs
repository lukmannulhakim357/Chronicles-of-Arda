import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const OUT = './smoke-shots-skirmisher-sling-mid';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 800, height: 450 }, hasTouch: true });
const page = await ctx.newPage();

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

await page.evaluate(async () => {
  window.__game.scene.start('Creation');
  await new Promise((r) => setTimeout(r, 300));
  const scene = window.__game.scene.getScene('Creation');
  scene.kindredId = 'vanyar';
  scene.startTraining({ id: 'skirmisher' });
  await new Promise((r) => setTimeout(r, 800));
  const w = window.__game.scene.getScene('World');
  w.player.setPosition(400, 240);
  w.state.mp = 999;
  w.state.equipment.weapon = 'hunters_sling';
});

async function castSlot(slot) {
  await page.evaluate((slot) => {
    const w = window.__game.scene.getScene('World');
    w.skillCooldowns = {};
    w.attacking = false;
    w.onSkillPressed({ slot });
  }, slot);
}

// mid-windup (the sling should be visibly whirling)
await castSlot(0); // quick_stab
await page.waitForTimeout(150);
await page.screenshot({ path: `${OUT}/01-quickstab-windup.png` });
await page.waitForTimeout(500);

await castSlot(1); // backstab — longer windup + 2 releases
await page.waitForTimeout(220);
await page.screenshot({ path: `${OUT}/02-backstab-windup.png` });
await page.waitForTimeout(150);
await page.screenshot({ path: `${OUT}/03-backstab-release.png` });

console.log('done');
await browser.close();
