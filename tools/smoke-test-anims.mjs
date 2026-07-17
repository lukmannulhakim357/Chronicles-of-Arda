// Verifies this round's animation-family work for Warrior + Ranger:
// - a bow-equipped attacker plays the 'shoot' body row, not 'slash'
// - a spear-equipped attacker plays the 'thrust' row
// - Shield Slam always plays 'thrust' (a bash) regardless of equipped weapon
// - Whirlwind still plays a real body animation, and its weapon FX runs
//   through the actual game code path without error
// - the new thrust/shoot anims exist with the expected frame counts
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const OUT = './smoke-shots-anims';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 800, height: 450 }, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// --- 1. anim registry sanity: thrust (8 frames) and shoot (13 frames) exist ---
const animInfo = await page.evaluate(() => {
  const anims = window.__game.scene.getScene('Boot').anims;
  const get = (key) => anims.get(key)?.frames.length ?? null;
  return {
    thrustDown: get('player_vanyar-thrust-down'),
    shootDown: get('player_vanyar-shoot-down'),
    slashDown: get('player_vanyar-slash-down'),
  };
});
console.log('anim frame counts:', JSON.stringify(animInfo));
const animsOk = animInfo.thrustDown === 8 && animInfo.shootDown === 13 && animInfo.slashDown === 6;

// --- 2. Training Grounds: Warrior — sword attack plays slash, spear plays thrust ---
const warriorFamilies = await page.evaluate(async () => {
  window.__game.scene.start('Creation');
  await new Promise((r) => setTimeout(r, 300));
  const scene = window.__game.scene.getScene('Creation');
  scene.kindredId = 'vanyar';
  scene.startTraining({ id: 'warrior' });
  await new Promise((r) => setTimeout(r, 800));
  const world = window.__game.scene.getScene('World');

  const results = {};
  world.onAttack();
  await new Promise((r) => setTimeout(r, 50));
  results.swordAttackAnim = world.player.anims.currentAnim?.key;
  await new Promise((r) => setTimeout(r, 600));

  world.state.equipment.weapon = 'ash_spear'; // the Warrior's alt weapon
  world.attackCooldown = 0;
  world.onAttack();
  await new Promise((r) => setTimeout(r, 50));
  results.spearAttackAnim = world.player.anims.currentAnim?.key;
  await new Promise((r) => setTimeout(r, 600));
  return results;
});
console.log('warrior animation families:', JSON.stringify(warriorFamilies));
const warriorOk = warriorFamilies.swordAttackAnim?.includes('-slash-') && warriorFamilies.spearAttackAnim?.includes('-thrust-');
await page.screenshot({ path: `${OUT}/01-warrior-thrust-pose.png` });

// --- 3. Shield Slam (ring slot 3 for a Training-Grounds Warrior, all
// skills rank 1) always plays thrust even with the sword equipped; slot 4
// is Whirlwind — confirm it runs through the real onSkillPressed path with
// no error and still plays a real body animation ---
const skillAnims = await page.evaluate(async () => {
  const world = window.__game.scene.getScene('World');
  world.state.equipment.weapon = 'woodsmans_sword';
  world.state.mp = 999;
  world.skillCooldowns = {};
  world.attacking = false;
  world.onSkillPressed({ slot: 3 }); // shield_slam
  await new Promise((r) => setTimeout(r, 50));
  const shieldSlamAnim = world.player.anims.currentAnim?.key;
  await new Promise((r) => setTimeout(r, 700));

  world.skillCooldowns = {};
  world.attacking = false;
  world.onSkillPressed({ slot: 4 }); // whirlwind
  await new Promise((r) => setTimeout(r, 50));
  const whirlwindAnim = world.player.anims.currentAnim?.key;
  return { shieldSlamAnim, whirlwindAnim };
});
console.log('skill anims:', JSON.stringify(skillAnims));
const shieldSlamOk = skillAnims.shieldSlamAnim?.includes('-thrust-');
const whirlwindOk = !!skillAnims.whirlwindAnim; // just needs to be a real, non-null anim
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/02-warrior-shield-whirlwind.png` });

// --- 4. Ranger: bow attack plays 'shoot' ---
const rangerResult = await page.evaluate(async () => {
  window.__game.scene.start('Creation');
  await new Promise((r) => setTimeout(r, 300));
  const scene = window.__game.scene.getScene('Creation');
  scene.kindredId = 'vanyar';
  scene.startTraining({ id: 'ranger' });
  await new Promise((r) => setTimeout(r, 800));
  const world = window.__game.scene.getScene('World');
  world.onAttack();
  await new Promise((r) => setTimeout(r, 50));
  const anim = world.player.anims.currentAnim?.key;
  await new Promise((r) => setTimeout(r, 900));
  return { anim, equipment: world.state.equipment };
});
console.log('ranger basic attack anim + equipment:', JSON.stringify(rangerResult));
const rangerOk = rangerResult.anim?.includes('-shoot-') && rangerResult.equipment.weapon === 'hunters_bow';
await page.screenshot({ path: `${OUT}/03-ranger-shoot-pose.png` });

const allOk = animsOk && warriorOk && shieldSlamOk && whirlwindOk && rangerOk;
console.log('ALL ANIMATION CHECKS PASSED:', allOk);

const errorsOut = errors.filter((e) => !e.includes('404'));
console.log('ERRORS:', errorsOut.length ? errorsOut.join('\n') : 'none');
await browser.close();
process.exit(errorsOut.length || !allOk ? 1 : 0);
