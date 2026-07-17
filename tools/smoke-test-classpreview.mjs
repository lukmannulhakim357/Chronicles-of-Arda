// Visual check: the class-selection ultimate-preview panel shows the
// capstone's icon above its name/description without overlapping the stage.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const OUT = './smoke-shots-classpreview';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 800, height: 450 }, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

await page.evaluate(() => {
  window.__game.scene.start('Creation');
});
await page.waitForTimeout(500);
await page.evaluate(() => {
  const scene = window.__game.scene.getScene('Creation');
  scene.kindredId = 'vanyar';
});
await page.screenshot({ path: `${OUT}/01-kindred-picked.png` });

// find a class card and tap it — simplest is to call showUltimatePreview
// directly with the captain class (longest capstone description, good stress test)
await page.evaluate(async () => {
  const mod = await import('/src/data/classes.js').catch(() => null);
  const scene = window.__game.scene.getScene('Creation');
  const klass = { id: 'captain', name: 'Captain' };
  scene.showUltimatePreview(klass);
});
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/02-captain-ultimate-preview.png` });

const errorsOut = errors.filter((e) => !e.includes('404'));
console.log('ERRORS:', errorsOut.length ? errorsOut.join('\n') : 'none');
await browser.close();
process.exit(errorsOut.length ? 1 : 0);
