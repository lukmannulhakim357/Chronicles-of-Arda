// Verifies this round's sling-specific animations for Skirmisher: equipping
// the sling (the class's alt weapon, available via Training Grounds) gives
// Quick Stab and Backstab their own distinct sling behavior — a single
// stone for Quick Stab, two released stones for Backstab — instead of
// reusing the dagger's jab motion or one generic sling throw for everything.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const OUT = './smoke-shots-skirmisher-sling';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 800, height: 450 }, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

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
  // switch to the sling (the Skirmisher's alt weapon, in the Training
  // Grounds pack per ALT_WEAPON_BY_CLASS)
  w.state.equipment.weapon = 'hunters_sling';
});

// count pebble (radius-3 circle) projectiles spawned by each skill over the
// whole window — a snapshot at one instant would miss short-lived pebbles
// that already flew and self-destroyed before the check ran
async function countPebbles(slot, waitMs) {
  return page.evaluate(async ({ slot, waitMs }) => {
    const w = window.__game.scene.getScene('World');
    w.skillCooldowns = {};
    w.attacking = false;
    let spawned = 0;
    const origCircle = w.add.circle.bind(w.add);
    w.add.circle = (...args) => {
      const c = origCircle(...args);
      if (args[2] === 3) spawned++; // radius arg — pebbles are drawn at radius 3
      return c;
    };
    w.onSkillPressed({ slot });
    await new Promise((r) => setTimeout(r, waitMs));
    w.add.circle = origCircle;
    return spawned;
  }, { slot, waitMs });
}

// ring order for a Training-Grounds skirmisher (all skills rank 1):
// quick_stab=0, backstab=1, shadow_step=2, vanish=3, caltrops=4
const quickStabPebbles = await countPebbles(0, 700);
console.log('quick_stab (sling) pebbles released:', quickStabPebbles);
await page.waitForTimeout(500);

const backstabPebbles = await countPebbles(1, 700);
console.log('backstab (sling) pebbles released:', backstabPebbles);
const shotsOk = quickStabPebbles === 1 && backstabPebbles === 2;
console.log('quick_stab fires exactly 1, backstab fires exactly 2:', shotsOk);

// --- weapon shape sanity: sling equipped, no errors from any skill ---
const allSkillsOk = await page.evaluate(async () => {
  const w = window.__game.scene.getScene('World');
  w.state.mp = 999;
  const results = [];
  for (let slot = 0; slot <= 4; slot++) {
    w.skillCooldowns = {};
    w.attacking = false;
    try {
      w.onSkillPressed({ slot });
      results.push(true);
    } catch (e) {
      results.push(false);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return results;
});
console.log('all skirmisher skills with sling equipped, ok:', JSON.stringify(allSkillsOk));

await page.screenshot({ path: `${OUT}/01-sling-after-skills.png` });

const allOk = allSkillsOk.every(Boolean) && shotsOk;
console.log('ALL SLING CHECKS PASSED:', allOk);

const errorsOut = errors.filter((e) => !e.includes('404'));
console.log('ERRORS:', errorsOut.length ? errorsOut.join('\n') : 'none');
await browser.close();
process.exit(errorsOut.length || !allOk ? 1 : 0);
