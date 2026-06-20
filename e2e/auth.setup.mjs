// Log in once via the real form and persist the session (storageState) so every
// other e2e/docs script reuses it. The dev Cloudflare turnstile widget auto-passes.
//   node e2e/auth.setup.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { BASE_URL, EMAIL, PASSWORD, AUTH_STATE, requireCreds } from './_env.mjs';

requireCreds();
fs.mkdirSync(path.dirname(AUTH_STATE), { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('PAGE ERR:', m.text().slice(0, 200)); });

// Default the app to dark mode before it boots.
await page.addInitScript(() => localStorage.setItem('theme', 'dark'));

console.log(`Logging in as ${EMAIL} at ${BASE_URL} ...`);
await page.goto(BASE_URL + '/login', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#email', { timeout: 15000 });
await page.fill('#email', EMAIL);
await page.fill('#password', PASSWORD);

// Submit enables once the turnstile token is present (auto in dev).
await page.waitForFunction(() => {
  const b = [...document.querySelectorAll('button[type=submit]')].find((x) => /sign/i.test(x.textContent || ''));
  return b && !b.disabled;
}, { timeout: 20000 }).catch(() => console.log('warning: submit never enabled (turnstile?) — trying anyway'));

await page.click('button[type=submit]');

// Wait until we leave /login (dashboard or site-selection).
await page.waitForFunction(() => !location.pathname.startsWith('/login'), { timeout: 20000 })
  .catch(() => {});
await page.waitForTimeout(1500);

const url = page.url();
await page.screenshot({ path: path.join(path.dirname(AUTH_STATE), 'login-result.png') });

if (url.includes('/login')) {
  console.error(`Still on /login — login failed. Check creds / turnstile. (url: ${url})`);
  await browser.close();
  process.exit(2);
}

await ctx.storageState({ path: AUTH_STATE });
console.log(`✅ Session saved to ${AUTH_STATE}`);
console.log(`   Landed on: ${url}`);
if (url.includes('/select-site')) {
  console.log('   Note: account has no site selected yet — pick/create a site to see dashboard data.');
}
await browser.close();
