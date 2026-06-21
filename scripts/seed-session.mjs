// Register a throwaway user through the real UI to obtain an authenticated session,
// then dump localStorage so other shots can reuse it. Prints final URL + storage.
import { chromium } from 'playwright';

const base = 'http://localhost:5173';
const stamp = Date.now();
const email = `qa+${stamp}@sitewise.test`;
const password = 'Password123!';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('console', m => { if (m.type() === 'error') console.log('PAGE ERR:', m.text().slice(0, 200)); });

await page.addInitScript((t) => localStorage.setItem('theme', t), 'dark');
await page.goto(base + '/register', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#reg-name', { timeout: 15000 });
await page.fill('#reg-name', 'QA Tester');
await page.fill('#reg-email', email);
await page.fill('#reg-phone', '9876543210');
await page.fill('#reg-password', password);
await page.fill('#reg-confirm-password', password);
await page.check('input[type=checkbox]');
// Wait for the dev turnstile token to populate (button enables).
await page.waitForFunction(() => {
  const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('Create Account') && x.type === 'submit');
  return b && !b.disabled;
}, { timeout: 15000 }).catch(() => console.log('turnstile did not enable in time'));
await page.click('button[type=submit]');
await page.waitForTimeout(4000);
console.log('after register url:', page.url());
await page.screenshot({ path: '/tmp/after-register.png' });

const storage = await page.evaluate(() => JSON.stringify({
  auth: localStorage.getItem('pocketbase_auth'),
  siteId: localStorage.getItem('currentSiteId'),
  role: localStorage.getItem('currentUserRole'),
}));
console.log('STORAGE:', storage);
await browser.close();
