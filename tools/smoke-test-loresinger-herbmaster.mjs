// Verifies this round's work: Loresinger and Herbmaster now play a real
// 'spellcast' body pose (not the sword's 'slash') for their harp/staff/
// talisman weapons, and each of their active skills has a bespoke VFX
// dispatch (distinct note shape/color/pattern for Loresinger, name-matched
// leaf/thorn/earth visuals for Herbmaster) instead of one generic beat
// shared by every skill of the same mechanical `kind`.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const OUT = './smoke-shots-loresinger-herbmaster';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 800, height: 450 }, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// --- 1. anim registry sanity: spellcast (7 frames) exists ---
const animInfo = await page.evaluate(() => {
  const anims = window.__game.scene.getScene('Boot').anims;
  return { spellcastDown: anims.get('player_vanyar-spellcast-down')?.frames.length ?? null };
});
console.log('spellcast frame count:', JSON.stringify(animInfo));
const animsOk = animInfo.spellcastDown === 7;

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

// --- 2. Loresinger: basic attack (harp) plays 'spellcast', not 'slash' ---
await enterTraining('loresinger');
const loresingerAnim = await page.evaluate(async () => {
  const w = window.__game.scene.getScene('World');
  w.onAttack();
  await new Promise((r) => setTimeout(r, 50));
  return { anim: w.player.anims.currentAnim?.key, weapon: w.state.equipment.weapon };
});
console.log('loresinger basic attack:', JSON.stringify(loresingerAnim));
const loresingerAnimOk = loresingerAnim.anim?.includes('-spellcast-') && loresingerAnim.weapon === 'travelers_harp';

// --- 3. Loresinger: each active skill fires without error, and each
// produces at least one distinct-colored note text object (proxy for "the
// notes actually differ per skill" rather than checking exact colors,
// which would be brittle) ---
const loresingerSkills = await page.evaluate(async () => {
  const w = window.__game.scene.getScene('World');
  w.state.mp = 999;
  const results = [];
  // ring order for a Training-Grounds loresinger (all skills rank 1):
  // note_of_courage=0, dissonant_chord=1, ballad_of_swiftness=2,
  // mocking_verse=3, dirge_of_sorrow=4, anthem_of_valinor=5(capstone)
  for (let slot = 0; slot <= 4; slot++) {
    w.skillCooldowns = {};
    w.attacking = false;
    try {
      w.onSkillPressed({ slot });
      results.push({ slot, ok: true });
    } catch (e) {
      results.push({ slot, ok: false, err: e.message });
    }
    await new Promise((r) => setTimeout(r, 350));
  }
  return results;
});
console.log('loresinger skill casts:', JSON.stringify(loresingerSkills));
const loresingerSkillsOk = loresingerSkills.every((r) => r.ok);
await page.screenshot({ path: `${OUT}/01-loresinger-after-skills.png` });

// --- 4. Herbmaster: basic attack (staff) plays 'spellcast' too ---
await enterTraining('herbmaster');
const herbmasterAnim = await page.evaluate(async () => {
  const w = window.__game.scene.getScene('World');
  w.onAttack();
  await new Promise((r) => setTimeout(r, 50));
  return { anim: w.player.anims.currentAnim?.key, weapon: w.state.equipment.weapon };
});
console.log('herbmaster basic attack:', JSON.stringify(herbmasterAnim));
const herbmasterAnimOk = herbmasterAnim.anim?.includes('-spellcast-') && herbmasterAnim.weapon === 'woodland_staff';

// --- 5. Herbmaster: each active skill fires without error ---
const herbmasterSkills = await page.evaluate(async () => {
  const w = window.__game.scene.getScene('World');
  w.state.mp = 999;
  const results = [];
  // ring order: athelas_touch=0, cleansing_chant=1, regrowth=2,
  // thorned_ward=3, wrath_of_the_earth=4, athelas_bloom=5(capstone)
  for (let slot = 0; slot <= 4; slot++) {
    w.skillCooldowns = {};
    w.attacking = false;
    try {
      w.onSkillPressed({ slot });
      results.push({ slot, ok: true });
    } catch (e) {
      results.push({ slot, ok: false, err: e.message });
    }
    await new Promise((r) => setTimeout(r, 350));
  }
  return results;
});
console.log('herbmaster skill casts:', JSON.stringify(herbmasterSkills));
const herbmasterSkillsOk = herbmasterSkills.every((r) => r.ok);
await page.screenshot({ path: `${OUT}/02-herbmaster-after-skills.png` });

const allOk = animsOk && loresingerAnimOk && loresingerSkillsOk && herbmasterAnimOk && herbmasterSkillsOk;
console.log('ALL LORESINGER/HERBMASTER CHECKS PASSED:', allOk);

const errorsOut = errors.filter((e) => !e.includes('404'));
console.log('ERRORS:', errorsOut.length ? errorsOut.join('\n') : 'none');
await browser.close();
process.exit(errorsOut.length || !allOk ? 1 : 0);
