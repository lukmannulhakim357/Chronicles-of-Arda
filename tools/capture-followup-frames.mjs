import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const OUT = './smoke-shots-followup-mid';
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
  }, classId);
}

// Warrior — whirlwind mid-spin, a few timestamps
await enterTraining('warrior');
await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  w.player.setPosition(400, 240);
  w.state.mp = 999;
  w.skillCooldowns = {};
  w.attacking = false;
  w.onSkillPressed({ slot: 4 }); // whirlwind
});
await page.waitForTimeout(150);
await page.screenshot({ path: `${OUT}/01-whirlwind-spin-early.png` });
await page.waitForTimeout(150);
await page.screenshot({ path: `${OUT}/02-whirlwind-spin-late.png` });
await page.waitForTimeout(700);

// Ranger — quick shot (single) vs multi-shot (fan) vs piercing arrow
await enterTraining('ranger');
await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  w.player.setPosition(400, 240);
  w.state.mp = 999;
  w.skillCooldowns = {};
  w.attacking = false;
  w.onSkillPressed({ slot: 0 }); // quick_shot
});
await page.waitForTimeout(480);
await page.screenshot({ path: `${OUT}/03-ranger-quickshot-single.png` });
await page.waitForTimeout(600);

await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  w.skillCooldowns = {};
  w.attacking = false;
  w.onSkillPressed({ slot: 1 }); // multi_shot
});
await page.waitForTimeout(480);
await page.screenshot({ path: `${OUT}/04-ranger-multishot-fan.png` });
await page.waitForTimeout(600);

await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  w.skillCooldowns = {};
  w.attacking = false;
  w.onSkillPressed({ slot: 4 }); // volley
});
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/05-ranger-volley-rain.png` });
await page.waitForTimeout(700);

await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  w.skillCooldowns = {};
  w.attacking = false;
  w.onSkillPressed({ slot: 5 }); // storm of the wild hunt
});
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/06-ranger-storm-wave1.png` });
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/07-ranger-storm-wave2.png` });

console.log('done');
await browser.close();
