import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const OUT = './smoke-shots-loresinger-herbmaster-mid';
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
    w.player.setPosition(400, 240); // right by the dummy
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

// Loresinger: note_of_courage=0, dissonant_chord=1, ballad_of_swiftness=2,
// mocking_verse=3, dirge_of_sorrow=4
await enterTraining('loresinger');
await castSlot(0, 260);
await page.screenshot({ path: `${OUT}/01-note-of-courage.png` });
await page.waitForTimeout(500);
await castSlot(1, 180);
await page.screenshot({ path: `${OUT}/02-dissonant-chord.png` });
await page.waitForTimeout(500);
await castSlot(2, 260);
await page.screenshot({ path: `${OUT}/03-ballad-of-swiftness.png` });
await page.waitForTimeout(500);
await castSlot(3, 300);
await page.screenshot({ path: `${OUT}/04-mocking-verse.png` });
await page.waitForTimeout(500);
await castSlot(4, 220);
await page.screenshot({ path: `${OUT}/05-dirge-of-sorrow.png` });
await page.waitForTimeout(600);

// Herbmaster: athelas_touch=0, cleansing_chant=1, regrowth=2,
// thorned_ward=3, wrath_of_the_earth=4
await enterTraining('herbmaster');
await castSlot(0, 260);
await page.screenshot({ path: `${OUT}/06-athelas-touch.png` });
await page.waitForTimeout(500);
await castSlot(2, 260);
await page.screenshot({ path: `${OUT}/07-regrowth.png` });
await page.waitForTimeout(500);
await castSlot(3, 220);
await page.screenshot({ path: `${OUT}/08-thorned-ward.png` });
await page.waitForTimeout(500);
await castSlot(4, 220);
await page.screenshot({ path: `${OUT}/09-wrath-of-the-earth.png` });

console.log('done');
await browser.close();
