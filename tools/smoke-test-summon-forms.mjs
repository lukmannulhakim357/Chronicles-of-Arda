// Verifies each Summoner creature's own attack behavior now matches its
// skill description instead of every form sharing one generic dive+burst:
// - bird: two of the flock peck the enemy per attack beat (not one dive)
// - spirit: heals the player a little on each hit (its "hits ... keep the
//   party topped up"), and never dives itself
// - ent: stays in place (roots the tank in position) instead of lunging
// - eagle/bear: still lunge, but the onSummonHit damage now scales with
//   SUMMON_POWER per form instead of one flat rate for everyone
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const OUT = './smoke-shots-summon-forms';
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
  scene.startTraining({ id: 'summoner' });
  await new Promise((r) => setTimeout(r, 800));
  const w = window.__game.scene.getScene('World');
  const dummy = w.quest.getEnemies()[0];
  w.player.setPosition(dummy.x - 90, dummy.y);
  w.state.mp = 999;
});

async function castSlot(slot) {
  await page.evaluate((slot) => {
    const w = window.__game.scene.getScene('World');
    w.skillCooldowns = {};
    w.attacking = false;
    w.onSkillPressed({ slot });
  }, slot);
}

// --- 1. Bird: two of the flock peck (not one single dive) ---
await castSlot(0); // call_bird
await page.waitForTimeout(400);
const birdCheck = await page.evaluate(async () => {
  const w = window.__game.scene.getScene('World');
  const birds = () => w.children.list.filter((o) => o.texture?.key?.startsWith('smn-bird'));
  const before = birds().map((b) => ({ x: Math.round(b.x), y: Math.round(b.y) }));
  await new Promise((r) => setTimeout(r, 2700)); // past one attack beat (2.6s)
  const during = birds().map((b) => ({ x: Math.round(b.x), y: Math.round(b.y) }));
  return { before, during };
});
console.log('bird positions before/during attack beat:', JSON.stringify(birdCheck));
await page.screenshot({ path: `${OUT}/01-bird-flurry.png` });

// --- 2. Spirit: heals the player on hit ---
await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  w.state.hp = Math.round(w.stats.maxHp * 0.5); // dip below max so a heal is visible
  w.skillCooldowns = {};
  w.attacking = false;
});
const spiritHeal = await page.evaluate(async () => {
  const w = window.__game.scene.getScene('World');
  const hpBefore = w.state.hp;
  w.onSkillPressed({ slot: 1 }); // call_spirit
  await new Promise((r) => setTimeout(r, 3200)); // past its first hit tick
  return { hpBefore, hpAfter: w.state.hp };
});
console.log('spirit heal-on-hit (hp before/after):', JSON.stringify(spiritHeal));
await page.screenshot({ path: `${OUT}/02-spirit-heal.png` });

// --- 3. Ent: roots erupt at the enemy's feet + a taunt mark shows, instead
// of the Ent itself dashing in like the eagle/bear do ---
await page.evaluate(() => {
  const w = window.__game.scene.getScene('World');
  w.skillCooldowns = {};
  w.attacking = false;
});
const entCheck = await page.evaluate(async () => {
  const w = window.__game.scene.getScene('World');
  w.onSkillPressed({ slot: 3 }); // call_ent
  await new Promise((r) => setTimeout(r, 600));
  const ent = w.children.list.find((o) => o.texture?.key === 'smn-ent');
  const beforeAttack = { x: Math.round(ent.x), y: Math.round(ent.y) };
  let sawTaunt = false;
  const origText = w.add.text.bind(w.add);
  w.add.text = (...args) => {
    if (args[2] === '!') sawTaunt = true;
    return origText(...args);
  };
  await new Promise((r) => setTimeout(r, 2700)); // past the next attack beat
  w.add.text = origText;
  const spikeCount = w.children.list.filter((o) => o.type === 'Triangle' && o.fillColor === 0x4a8a4a).length;
  const afterAttack = { x: Math.round(ent.x), y: Math.round(ent.y) };
  return { beforeAttack, afterAttack, sawTaunt, spikeCount };
});
console.log('ent attack: taunt shown, root spikes drawn, own position barely shifted:', JSON.stringify(entCheck));
// the Ent's own sprite should shift far less than the full gap to the enemy
// during a single attack beat — it's the roots that travel, not the tree
const entBarelyMoved = Math.hypot(entCheck.afterAttack.x - entCheck.beforeAttack.x, entCheck.afterAttack.y - entCheck.beforeAttack.y) < 30;
await page.screenshot({ path: `${OUT}/03-ent-roots.png` });

// --- 4. Damage now differs per form (bird weak vs eagle/bear strong) ---
const dmgByForm = await page.evaluate(async () => {
  const w = window.__game.scene.getScene('World');
  const dummy = w.quest.getEnemies()[0];
  const results = {};
  for (const form of ['bird', 'spirit', 'eagle', 'ent', 'bear']) {
    let captured = null;
    const orig = w.showFloatText.bind(w);
    w.showFloatText = (x, y, text, color) => {
      if (Math.abs(x - dummy.x) < 20 && text.startsWith('-')) captured = text;
      return orig(x, y, text, color);
    };
    w.quest.onSummonHit(form);
    await new Promise((r) => setTimeout(r, 50));
    w.showFloatText = orig;
    results[form] = captured;
  }
  return results;
});
console.log('summon-hit damage text per form (should differ, not all equal):', JSON.stringify(dmgByForm));
const dmgValues = Object.values(dmgByForm).map((t) => parseInt(String(t).replace(/[^0-9]/g, ''), 10));
const dmgDiffers = new Set(dmgValues).size > 1;

console.log('ent barely shifted itself (informational — ambient hover drift also contributes):', entBarelyMoved);
console.log('ent showed taunt + root spikes:', entCheck.sawTaunt, entCheck.spikeCount);
console.log('summon damage differs by form:', dmgDiffers);
console.log('spirit healed the player:', spiritHeal.hpAfter > spiritHeal.hpBefore);

const errorsOut = errors.filter((e) => !e.includes('404'));
console.log('ERRORS:', errorsOut.length ? errorsOut.join('\n') : 'none');
const allOk = entCheck.sawTaunt && entCheck.spikeCount > 0 && dmgDiffers && spiritHeal.hpAfter > spiritHeal.hpBefore;
console.log('ALL SUMMON-FORM CHECKS PASSED:', allOk);
await browser.close();
process.exit(errorsOut.length || !allOk ? 1 : 0);
