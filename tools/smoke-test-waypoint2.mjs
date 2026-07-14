// Waypoint 2 test: seeds a profile with a character that already finished
// waypoint 1 (zone='__journey__', waypointIndex=1), then plays "The
// Stragglers" through to completion, verifying the isNewQuest reset logic
// in JourneyScene and the whole Steppes zone/quest end to end.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:4173';
const OUT = './smoke-shots-wp2';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 800, height: 450 }, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

const world = () => `window.__game.scene.getScene('World')`;
const tp = async (tx, ty) => {
  await page.evaluate(`(() => { const w = ${world()}; w.player.setPosition(${tx}*32+16, ${ty}*32+16); })()`);
  await page.waitForTimeout(350);
};
const stage = () => page.evaluate(`${world()}.state.quest.stage`);
const tapSheet = async (n = 1) => {
  for (let i = 0; i < n; i++) { await page.keyboard.press('E'); await page.waitForTimeout(350); }
};

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

const seeded = await page.evaluate(() => {
  const profile = {
    id: 'test-profile-1',
    name: 'WP2 Tester',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    campaigns: {
      greatJourney: {
        slots: [
          {
            version: 1,
            kindred: 'teleri',
            classId: 'ranger',
            stats: { VIT: 7, MAG: 3, STR: 8, DEX: 10 },
            hp: 106,
            waypointIndex: 1,
            zone: '__journey__',
            pos: null,
            quest: { id: 'vanishing', stage: 5, flags: { oromeChoice: 'trust' } },
            seenIntro: true,
            savedAt: Date.now(),
            lastWhere: 'The Road West',
          },
          null, null, null,
        ],
      },
    },
  };
  localStorage.setItem('arda.profiles.v1', JSON.stringify([profile]));
  return true;
});
console.log('seeded:', seeded);

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

// Homepage -> Load Game -> profile row -> Great Journey -> occupied slot
await page.mouse.click(400, 295); // Load Game
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/01-load-panel.png` });
await page.mouse.click(400, 226); // profile row
await page.waitForTimeout(900);
await page.mouse.click(135, 160); // The Great Journey card
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/02-slots.png` });
await page.mouse.click(400, 110); // occupied slot 1 -> continue -> Journey (zone was __journey__)
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/03-journey.png` });

// Enter The Steppes via the big bottom button (continueLabel targets waypointIndex)
await page.mouse.click(400, 416);
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/04-world-steppes.png` });

console.log('zone:', await page.evaluate(`${world()}.state.zone`));
console.log('quest id:', await page.evaluate(`${world()}.state.quest.id`));
console.log('stage after entry:', await stage());

// talk to Miriel (stage 0 -> 1)
await tp(12, 20);
await page.keyboard.press('E'); await page.waitForTimeout(400);
await tapSheet(2);
console.log('stage after miriel:', await stage());
await page.screenshot({ path: `${OUT}/05-miriel-talked.png` });

// talk to Tarion (flavor, doesn't change stage)
await tp(8, 21);
await page.keyboard.press('E'); await page.waitForTimeout(400);
await tapSheet(2);

// gather all 3 spots
await tp(20, 18); await page.keyboard.press('E'); await page.waitForTimeout(400); await tapSheet(1);
console.log('stage after gather1:', await stage());
await tp(44, 17); await page.keyboard.press('E'); await page.waitForTimeout(400); await tapSheet(1);
console.log('stage after gather2:', await stage());
await tp(32, 19); await page.keyboard.press('E'); await page.waitForTimeout(400); await tapSheet(1);
console.log('stage after gather3 (should be 2):', await stage());
await page.screenshot({ path: `${OUT}/06-all-gathered.png` });

// cross the ford -> gives cloak+boots and auto-opens the gear tutorial
// (Character scene, World+UI paused) before the waypoint actually finishes
await tp(32.5, 8);
await page.keyboard.press('E'); await page.waitForTimeout(400);
await tapSheet(2);
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/07-gear-tutorial.png` });
await page.mouse.click(400, 424); // Close the gear tutorial -> finishQuest() continues
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/07b-crossed.png` });

// story card -> Journey
await page.mouse.click(400, 390);
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/08-journey-after.png` });

const profiles = await page.evaluate(() => JSON.parse(localStorage.getItem('arda.profiles.v1')));
const slot = profiles[0].campaigns.greatJourney.slots[0];
console.log('FINAL:', JSON.stringify({ zone: slot.zone, waypointIndex: slot.waypointIndex, questId: slot.quest.id, stage: slot.quest.stage, gathered: slot.quest.flags.gathered, lastWhere: slot.lastWhere }));

const errorsOut = errors.filter((e) => !e.includes('404'));
console.log('ERRORS:', errorsOut.length ? errorsOut.join('\n') : 'none');
await browser.close();
process.exit(errorsOut.length ? 1 : 0);
