import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const OUT = './smoke-shots-ui-overhaul';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 800, height: 450 }, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/01-title.png` });

// Load Game panel — write a profile directly into the same localStorage
// shape SaveSystem uses (dynamic import of /src/... isn't available against
// the built preview bundle, so this mirrors SaveSystem.createProfile())
await page.evaluate(() => {
  const profile = {
    id: 'test-profile-1',
    name: 'Test Profile',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    campaigns: {},
  };
  localStorage.setItem('arda.profiles.v1', JSON.stringify([profile]));
});
await page.evaluate(() => {
  const t = window.__game.scene.getScene('Title');
  t.build();
  t.showLoadGame();
});
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/02-title-loadgame-panel.png` });

// Campaign select — transitions go through each scene's OWN ScenePlugin
// (t.scene.start, not the global manager) so the outgoing scene actually
// stops and tears down its display list, matching how the real game
// navigates (every scene in this codebase calls this.scene.start(...))
await page.evaluate(() => {
  const t = window.__game.scene.getScene('Title');
  t.registry.set('profileId', 'test-profile-1');
  t.scene.start('CampaignSelect');
});
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/03-campaign-select.png` });

// Character slot
await page.evaluate(() => {
  const cs = window.__game.scene.getScene('CampaignSelect');
  cs.registry.set('campaignId', 'greatJourney');
  cs.scene.start('CharacterSlot');
});
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/04-character-slot.png` });

// delete-confirm modal on a slot (need a character in slot 0 first — skip,
// just show the creation flow instead since that's more central)
await page.evaluate(() => {
  const cs = window.__game.scene.getScene('CharacterSlot');
  cs.scene.start('Creation');
});
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/05-creation-kindreds.png` });

await page.evaluate(() => {
  const c = window.__game.scene.getScene('Creation');
  c.kindredId = 'vanyar';
  c.showClasses();
});
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/06-creation-classes.png` });

// Ultimate preview modal — only .id/.name are read directly off the object
// (everything else is looked up by id via getTree()/WEAPON_BY_CLASS inside
// showUltimatePreview), so a minimal stand-in is enough here
await page.evaluate(() => {
  const c = window.__game.scene.getScene('Creation');
  c.kindredId = 'vanyar';
  c.showUltimatePreview({ id: 'warrior', name: 'Warrior' });
});
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/07-creation-ultimate-preview.png` });

// Training grounds World + Gear tab (paperdoll with armor types)
await page.evaluate(async () => {
  const c = window.__game.scene.getScene('Creation');
  c.scene.start('Creation');
  await new Promise((r) => setTimeout(r, 300));
  const scene = window.__game.scene.getScene('Creation');
  scene.kindredId = 'vanyar';
  scene.startTraining({ id: 'warrior' });
});
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/08-world-hud.png` });

// open Character -> Gear tab
await page.evaluate(() => {
  window.__game.scene.pause('World');
  window.__game.scene.pause('UI');
  window.__game.scene.start('Character', { tab: 'gear' });
});
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/09-gear-tab-empty.png` });

// equip one item of each armor type into chest slot sequentially for a
// side-by-side comparison (screenshot each state)
async function equipAndShot(itemId, shotName) {
  await page.evaluate((itemId) => {
    const ch = window.__game.scene.getScene('Character');
    const idx = ch.state.inventory.indexOf(itemId);
    if (idx === -1) return;
    ch.inspect = { kind: 'inv', index: idx, itemId };
    ch.equip(itemId);
  }, itemId);
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/${shotName}` });
}
await equipAndShot('steppe_cloak', '10-gear-chest-light.png');
await equipAndShot('trial_iron_cuirass', '11-gear-chest-heavy.png');
await equipAndShot('trial_woven_robe', '12-gear-chest-robe.png');

// tap the equipped slot to see the parchment inspect panel
await page.evaluate(() => {
  const ch = window.__game.scene.getScene('Character');
  ch.inspect = { kind: 'slot', slotKey: 'chest', itemId: ch.state.equipment.chest };
  ch.build();
});
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}/13-gear-inspect-panel.png` });

// Skills tab
await page.evaluate(() => {
  const ch = window.__game.scene.getScene('Character');
  ch.tab = 'skills';
  ch.inspectSkill = null;
  ch.build();
});
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/14-skills-tab.png` });

await page.evaluate(() => {
  const ch = window.__game.scene.getScene('Character');
  ch.inspectSkill = { classId: ch.state.classId, skillId: 'shield_slam' };
  ch.build();
});
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}/15-skills-tab-inspect.png` });

// back to world to show HUD + skill wheel + dialogue
await page.evaluate(() => {
  window.__game.scene.stop('Character');
  window.__game.scene.resume('World');
  window.__game.scene.resume('UI');
});
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/16-world-hud-2.png` });

await page.evaluate(() => {
  window.__game.events.emit('ui:dialogue', {
    lines: [{ speaker: 'Randir', text: 'The road west is long, but the Valar watch over it.' }],
    choices: [{ id: 'ok', label: 'Understood.' }],
  });
});
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/17-dialogue-scroll.png` });

console.log('done');
const errorsOut = errors.filter((e) => !e.includes('404'));
console.log('ERRORS:', errorsOut.length ? errorsOut.join('\n') : 'none');
await browser.close();
