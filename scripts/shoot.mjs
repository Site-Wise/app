// Ad-hoc screenshot helper for design QA. Usage:
//   node scripts/shoot.mjs <path> <width> <height> <theme> <outfile>
import { chromium } from 'playwright';

const [, , path = '/login', w = '1280', h = '900', theme = 'dark', out = '/tmp/shot.png'] = process.argv;
const base = 'http://localhost:5173';

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: Number(w), height: Number(h) },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
// Seed theme before app boots.
await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
await page.goto(base + path, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(900);
await page.screenshot({ path: out, fullPage: false });
const url = page.url();
await browser.close();
console.log(`shot ${path} @${w}x${h} ${theme} -> ${out} (final url: ${url})`);
