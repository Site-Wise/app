// Authenticated screenshot of any route — the visual debug loop.
//   node e2e/shoot.mjs <path> <width> <height> <theme> <outfile>
// e.g. node e2e/shoot.mjs /payments 1280 900 dark e2e/.media/payments.png
import { chromium } from 'playwright';
import fs from 'node:fs';
import { BASE_URL, AUTH_STATE, MEDIA_DIR, authStateExists } from './_env.mjs';

const [, , routePath = '/', w = '1280', h = '900', theme = 'dark', out = `${MEDIA_DIR}/shot.png`] = process.argv;
fs.mkdirSync(MEDIA_DIR, { recursive: true });

if (!authStateExists()) {
  console.error('No saved session. Run: node e2e/auth.setup.mjs');
  process.exit(1);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: Number(w), height: Number(h) },
  storageState: AUTH_STATE,
});
const page = await ctx.newPage();
await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
await page.goto(BASE_URL + routePath, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1800); // let data + count-ups settle
await page.screenshot({ path: out, fullPage: false });
console.log(`shot ${routePath} @${w}x${h} ${theme} -> ${out} (url: ${page.url()})`);
await browser.close();
