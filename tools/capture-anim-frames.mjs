// Grabs mid-animation screenshots (not settled-back-to-idle) so the actual
// pose + weapon FX can be reviewed visually.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const OUT = './smoke-shots-anims-mid';
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

// Warrior — sword slash mid-swing
await enterTraining('warrior');
await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  w.player.setPosition(400, 240);
  w.facing = 'down';
  w.onAttack();
});
await page.waitForTimeout(140);
await page.screenshot({ path: `${OUT}/01-warrior-sword-slash-mid.png` });
await page.waitForTimeout(600);

// Warrior — spear thrust mid-lunge
await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  w.state.equipment.weapon = 'ash_spear';
  w.attackCooldown = 0;
  w.attacking = false;
  w.onAttack();
});
await page.waitForTimeout(140);
await page.screenshot({ path: `${OUT}/02-warrior-spear-thrust-mid.png` });
await page.waitForTimeout(600);

// Warrior — Shield Slam mid-bash (ring slot 3 for a Training-Grounds warrior)
await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  w.state.equipment.weapon = 'woodsmans_sword';
  w.state.mp = 999;
  w.skillCooldowns = {};
  w.attacking = false;
  w.onSkillPressed({ slot: 3 });
});
await page.waitForTimeout(160);
await page.screenshot({ path: `${OUT}/03-warrior-shieldslam-mid.png` });
await page.waitForTimeout(700);

// Warrior — Whirlwind mid-spin (ring slot 4)
await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  w.skillCooldowns = {};
  w.attacking = false;
  w.onSkillPressed({ slot: 4 });
});
await page.waitForTimeout(280);
await page.screenshot({ path: `${OUT}/04-warrior-whirlwind-mid.png` });
await page.waitForTimeout(700);

// Ranger — bow draw (early) and release (late) poses
await enterTraining('ranger');
await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  w.player.setPosition(400, 240);
  w.facing = 'right';
  w.onAttack();
});
await page.waitForTimeout(160);
await page.screenshot({ path: `${OUT}/05-ranger-bow-draw-early.png` });
await page.waitForTimeout(220);
await page.screenshot({ path: `${OUT}/06-ranger-bow-release.png` });
await page.waitForTimeout(700);

// Ranger facing down, for a second angle
await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  w.attackCooldown = 0;
  w.attacking = false;
  w.facing = 'down';
  w.onAttack();
});
await page.waitForTimeout(160);
await page.screenshot({ path: `${OUT}/07-ranger-bow-draw-down.png` });

console.log('done');
await browser.close();
