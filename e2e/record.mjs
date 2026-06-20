// Record a scripted walkthrough to MP4 for documentation.
//   node e2e/record.mjs <scenario> [theme]
// e.g. node e2e/record.mjs tour dark
//
// Records WebM via Playwright, then transcodes to MP4 with ffmpeg.
// Add new flows to the `scenarios` map below.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { BASE_URL, AUTH_STATE, MEDIA_DIR, ROOT, authStateExists } from './_env.mjs';

const [, , scenarioName = 'tour', theme = 'dark'] = process.argv;

const VIDEO_W = 1280, VIDEO_H = 800;

// A small set of helpers for smooth, legible recordings.
const settle = (page, ms = 1400) => page.waitForTimeout(ms);
async function go(page, route, ms) {
  await page.goto(BASE_URL + route, { waitUntil: 'domcontentloaded' });
  await settle(page, ms);
}

const scenarios = {
  // High-level product tour across the main surfaces.
  async tour(page) {
    await go(page, '/', 2600);                 // dashboard (KPIs count up)
    await page.mouse.wheel(0, 500); await settle(page, 1500);
    await page.mouse.wheel(0, 600); await settle(page, 1800); // recent transactions ledger
    await go(page, '/payments', 2200);
    await go(page, '/deliveries', 2200);
    await go(page, '/vendors', 2200);
    await go(page, '/analytics', 2600);
    await go(page, '/', 1600);
  },
  // Just the dashboard, lingering so count-ups + ledger read well.
  async dashboard(page) {
    await go(page, '/', 3000);
    await page.mouse.wheel(0, 700); await settle(page, 2200);
    await page.mouse.wheel(0, -700); await settle(page, 1200);
  },
};

const scenario = scenarios[scenarioName];
if (!scenario) {
  console.error(`Unknown scenario "${scenarioName}". Available: ${Object.keys(scenarios).join(', ')}`);
  process.exit(1);
}
if (!authStateExists()) {
  console.error('No saved session. Run: node e2e/auth.setup.mjs');
  process.exit(1);
}

const rawDir = path.join(MEDIA_DIR, 'raw');
fs.mkdirSync(rawDir, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: VIDEO_W, height: VIDEO_H },
  storageState: AUTH_STATE,
  recordVideo: { dir: rawDir, size: { width: VIDEO_W, height: VIDEO_H } },
});
const page = await ctx.newPage();
await page.addInitScript((t) => localStorage.setItem('theme', t), theme);

console.log(`Recording scenario "${scenarioName}" (${theme}) ...`);
await scenario(page);

const video = page.video();
await ctx.close(); // finalizes the .webm
await browser.close();

const webm = await video.path();
const outMp4 = path.join(MEDIA_DIR, `${scenarioName}-${theme}.mp4`);

// Prefer system ffmpeg; fall back to Playwright's bundled binary.
let ffmpeg = 'ffmpeg';
try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); }
catch {
  const cache = path.join(process.env.HOME || '', '.cache/ms-playwright');
  const dir = fs.existsSync(cache) ? fs.readdirSync(cache).find((d) => d.startsWith('ffmpeg-')) : null;
  if (dir) ffmpeg = path.join(cache, dir, 'ffmpeg-linux');
}

execFileSync(ffmpeg, [
  '-y', '-i', webm,
  '-movflags', '+faststart',
  '-pix_fmt', 'yuv420p',
  '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', // ensure even dims for h264
  '-c:v', 'libx264', '-crf', '23', '-preset', 'medium',
  outMp4,
], { stdio: 'inherit', cwd: ROOT });

console.log(`✅ ${outMp4}`);
