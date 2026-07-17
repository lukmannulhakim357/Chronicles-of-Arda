// Verifies this round's follow-up: Anthem of Valinor and Athelas Bloom now
// keep performing (harp strums / staff pulses) for their real buff
// duration instead of stopping after one ~2.4s flourish, and the harp/
// staff basic-attack hold animations are distinct from the old generic
// raise-and-flare (harp strums with a note pop, staff swings forward).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const OUT = './smoke-shots-sustained-ultimates';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 800, height: 450 }, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

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

// --- Loresinger: cast Anthem of Valinor (ring slot 5, the capstone), then
// count how many times the harp-strum FX fires over ~4 real seconds —
// should be multiple beats (buffDuration 12s / 1.1s beat), not just the
// one initial flourish ---
await enterTraining('loresinger');
const anthemBeats = await page.evaluate(async () => {
  const w = window.__game.scene.getScene('World');
  w.state.mp = 999;
  w.skillCooldowns = {};
  w.attacking = false;
  let harpSwings = 0;
  const origAdd = w.add.image.bind(w.add);
  // count fxw-harp image spawns as a proxy for "the harp is still playing"
  w.add.image = (...args) => {
    const img = origAdd(...args);
    if (typeof args[2] === 'string' && args[2] === 'fxw-harp') harpSwings++;
    return img;
  };
  w.onSkillPressed({ slot: 5 }); // anthem_of_valinor (capstone)
  await new Promise((r) => setTimeout(r, 4000));
  w.add.image = origAdd;
  return harpSwings;
});
console.log('harp-strum spawns within 4s of casting Anthem of Valinor:', anthemBeats);
// initial flourish doesn't spawn fxw-harp itself (it's particle/text based);
// each sustain beat calls playWeaponSwing which spawns exactly one fxw-harp
// image, so >=2 beats confirms the sustain loop is really firing repeatedly
const anthemOk = anthemBeats >= 2;

// --- Herbmaster: same check for Athelas Bloom (buffDuration 10s, 1.5s beat) ---
await enterTraining('herbmaster');
const bloomBeats = await page.evaluate(async () => {
  const w = window.__game.scene.getScene('World');
  w.state.mp = 999;
  w.skillCooldowns = {};
  w.attacking = false;
  let staffSwings = 0;
  const origAdd = w.add.image.bind(w.add);
  w.add.image = (...args) => {
    const img = origAdd(...args);
    if (typeof args[2] === 'string' && args[2] === 'fxw-staff') staffSwings++;
    return img;
  };
  w.onSkillPressed({ slot: 5 }); // athelas_bloom (capstone)
  await new Promise((r) => setTimeout(r, 4000));
  w.add.image = origAdd;
  return staffSwings;
});
console.log('staff-raise spawns within 4s of casting Athelas Bloom:', bloomBeats);
const bloomOk = bloomBeats >= 2;

// --- visual check: harp/staff basic attacks look distinct now ---
await enterTraining('loresinger');
await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  w.player.setPosition(400, 240);
});
await page.evaluate(() => window.__game.scene.getScene('World').onAttack());
await page.waitForTimeout(140);
await page.screenshot({ path: `${OUT}/01-harp-strum-mid.png` });
await page.waitForTimeout(600);

await enterTraining('herbmaster');
await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  w.player.setPosition(400, 240);
});
await page.evaluate(() => window.__game.scene.getScene('World').onAttack());
await page.waitForTimeout(140);
await page.screenshot({ path: `${OUT}/02-staff-swing-mid.png` });

const allOk = anthemOk && bloomOk;
console.log('ALL SUSTAINED-ULTIMATE CHECKS PASSED:', allOk);

const errorsOut = errors.filter((e) => !e.includes('404'));
console.log('ERRORS:', errorsOut.length ? errorsOut.join('\n') : 'none');
await browser.close();
process.exit(errorsOut.length || !allOk ? 1 : 0);
