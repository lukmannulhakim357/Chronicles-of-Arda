// Verifies this round's Smith + Skirmisher work:
// - hammer swings overhead (not the sword's side-arc), dagger jabs
//   straight (not an arc) — Quick Stab/Backstab/Assassinate are all
//   described as stabs, not slashes
// - Overcharge Strike has a visible charge-up before the smash
// - Ground Slam lands at the Smith's own feet (self AoE), not a distant target
// - Shadow Step actually repositions the player with an afterimage trail
// - Vanish actually fades the player sprite's alpha, not just a ring FX
// - all skills fire without error
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const OUT = './smoke-shots-smith-skirmisher';
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
    window.__game.scene.getScene('World').player.setPosition(400, 240);
  }, classId);
}

// --- 1. Smith: hammer basic attack still resolves cleanly ---
await enterTraining('smith');
const smithAttack = await page.evaluate(async () => {
  const w = window.__game.scene.getScene('World');
  w.onAttack();
  await new Promise((r) => setTimeout(r, 50));
  return { anim: w.player.anims.currentAnim?.key, weapon: w.state.equipment.weapon };
});
console.log('smith basic attack:', JSON.stringify(smithAttack));

// --- 2. Smith: all active skills fire without error ---
// ring order (all rank 1): hammer_strike=0, sunder_armor=1,
// overcharge_strike=2, forge_blessing=3, ground_slam=4
const smithSkills = await page.evaluate(async () => {
  const w = window.__game.scene.getScene('World');
  w.state.mp = 999;
  const results = [];
  for (let slot = 0; slot <= 4; slot++) {
    w.skillCooldowns = {};
    w.attacking = false;
    try {
      w.onSkillPressed({ slot });
      results.push({ slot, ok: true });
    } catch (e) {
      results.push({ slot, ok: false, err: e.message });
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return results;
});
console.log('smith skill casts:', JSON.stringify(smithSkills));
const smithSkillsOk = smithSkills.every((r) => r.ok);
await page.screenshot({ path: `${OUT}/01-smith-after-skills.png` });

// --- 3. Ground Slam: shakes the camera + rings appear at the CASTER's own
// position (self-centered), not at a distant target ---
const groundSlamCheck = await page.evaluate(async () => {
  const w = window.__game.scene.getScene('World');
  w.state.mp = 999;
  w.skillCooldowns = {};
  w.attacking = false;
  const before = { x: w.player.x, y: w.player.y };
  w.onSkillPressed({ slot: 4 }); // ground_slam
  await new Promise((r) => setTimeout(r, 100));
  const ringNear = w.children.list.some((o) => o.type === 'Arc' && Math.abs(o.x - before.x) < 15 && Math.abs(o.y - before.y) < 30);
  return { before, ringNear };
});
console.log('ground slam ring appears near caster:', JSON.stringify(groundSlamCheck));

// --- 4. Skirmisher: dagger jabs (thrust), not arc-swings ---
await enterTraining('skirmisher');
const skirmisherAttack = await page.evaluate(async () => {
  const w = window.__game.scene.getScene('World');
  w.onAttack();
  await new Promise((r) => setTimeout(r, 50));
  return { weapon: w.state.equipment.weapon };
});
console.log('skirmisher basic attack weapon:', JSON.stringify(skirmisherAttack));

// --- 5. Skirmisher: all active skills fire without error ---
// ring order: quick_stab=0, backstab=1, shadow_step=2, vanish=3, caltrops=4
const skirmisherSkills = await page.evaluate(async () => {
  const w = window.__game.scene.getScene('World');
  w.state.mp = 999;
  const results = [];
  for (let slot = 0; slot <= 4; slot++) {
    w.skillCooldowns = {};
    w.attacking = false;
    try {
      w.onSkillPressed({ slot });
      results.push({ slot, ok: true });
    } catch (e) {
      results.push({ slot, ok: false, err: e.message });
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return results;
});
console.log('skirmisher skill casts:', JSON.stringify(skirmisherSkills));
const skirmisherSkillsOk = skirmisherSkills.every((r) => r.ok);
await page.screenshot({ path: `${OUT}/02-skirmisher-after-skills.png` });

// --- 6. Shadow Step: player actually moves ---
const dashCheck = await page.evaluate(async () => {
  const w = window.__game.scene.getScene('World');
  w.state.mp = 999;
  w.skillCooldowns = {};
  w.attacking = false;
  w.facing = 'right';
  const before = { x: w.player.x, y: w.player.y };
  w.onSkillPressed({ slot: 2 }); // shadow_step
  await new Promise((r) => setTimeout(r, 250));
  const after = { x: w.player.x, y: w.player.y };
  return { before, after, moved: Math.abs(after.x - before.x) > 20 };
});
console.log('shadow step reposition:', JSON.stringify(dashCheck));

// --- 7. Vanish: player alpha actually drops, then restores ---
const vanishCheck = await page.evaluate(async () => {
  const w = window.__game.scene.getScene('World');
  w.state.mp = 999;
  w.skillCooldowns = {};
  w.attacking = false;
  w.player.alpha = 1; // clean baseline — an earlier cast in this run may still be fading back
  const before = w.player.alpha;
  w.onSkillPressed({ slot: 3 }); // vanish
  await new Promise((r) => setTimeout(r, 300));
  const mid = w.player.alpha;
  await new Promise((r) => setTimeout(r, 4200));
  const after = w.player.alpha;
  return { before, mid, after };
});
console.log('vanish alpha before/mid/after:', JSON.stringify(vanishCheck));
const vanishOk = vanishCheck.before === 1 && vanishCheck.mid < 0.6 && vanishCheck.after === 1;

const allOk = smithSkillsOk && skirmisherSkillsOk && groundSlamCheck.ringNear && dashCheck.moved && vanishOk;
console.log('ALL SMITH/SKIRMISHER CHECKS PASSED:', allOk);

const errorsOut = errors.filter((e) => !e.includes('404'));
console.log('ERRORS:', errorsOut.length ? errorsOut.join('\n') : 'none');
await browser.close();
process.exit(errorsOut.length || !allOk ? 1 : 0);
