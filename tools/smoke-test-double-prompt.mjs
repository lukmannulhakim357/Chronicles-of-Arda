// Regression test for the "ghost Name Your Profile overlay" bug: a stray
// double-tap on "New Game" used to stack two promptText() DOM overlays;
// submitting the top one only closed that one, leaving the older overlay
// sitting on top of Campaign Select, blocking it until Cancel was tapped.
// promptText() now tears down any existing overlay before opening a new
// one, so only one can ever exist — this drives that exact double-tap path
// and confirms no leftover overlay blocks the next screen.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const OUT = './smoke-shots-double-prompt';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 800, height: 450 }, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

// simulate a stray double-tap on "New Game" — two rapid clicks on the same
// spot, mirroring what a mobile browser's touch+synthetic-mouse duplication
// (or an impatient double-tap) does to an interactive Phaser zone
await page.mouse.click(400, 225);
await page.mouse.click(400, 225);
await page.waitForTimeout(500);

const overlayCountAfterDoubleTap = await page.evaluate(() => document.querySelectorAll('[data-arda-text-prompt]').length);
console.log('overlay count after double-tap on New Game (want 1, not 2):', overlayCountAfterDoubleTap);
await page.screenshot({ path: `${OUT}/00-after-double-tap.png` });

// fill and submit the (single, topmost) prompt
await page.fill('input[type="text"]', 'QA Tester');
await page.click('button:has-text("Begin")');
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/01-after-submit.png` });

const overlayCountAfterSubmit = await page.evaluate(() => document.querySelectorAll('[data-arda-text-prompt]').length);
console.log('overlay count after submit (want 0 — Campaign Select must not be blocked):', overlayCountAfterSubmit);

// Campaign Select should actually be interactive now — tap the unlocked
// "The Great Journey" card and confirm it navigates (proves nothing is
// covering the screen and eating the click)
await page.mouse.click(135, 160);
await page.waitForTimeout(900);
const zoneAfterCardTap = await page.evaluate(() => window.__game.scene.isActive('CharacterSlot'));
console.log('Character Slot scene active after tapping the campaign card (want true):', zoneAfterCardTap);
await page.screenshot({ path: `${OUT}/02-campaign-card-tapped.png` });

const errorsOut = errors.filter((e) => !e.includes('404'));
console.log('ERRORS:', errorsOut.length ? errorsOut.join('\n') : 'none');
const allOk = overlayCountAfterDoubleTap === 1 && overlayCountAfterSubmit === 0 && zoneAfterCardTap === true;
console.log('ALL DOUBLE-PROMPT CHECKS PASSED:', allOk);
await browser.close();
process.exit(errorsOut.length || !allOk ? 1 : 0);
