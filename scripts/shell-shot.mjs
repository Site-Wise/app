// Forge a client-side PocketBase session (valid JWT exp only) so the router guard
// passes and the authenticated shell renders for visual QA. Data calls will 401 —
// we only need the layout/navbar/dashboard chrome.
import { chromium } from 'playwright';

const b64url = (o) => Buffer.from(JSON.stringify(o)).toString('base64')
  .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const exp = Math.floor(Date.now() / 1000) + 365 * 24 * 3600;
const token = `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({
  id: 'qauser0000000001', type: 'authRecord', collectionId: '_pb_users_auth_',
  exp,
})}.sig`;
const record = {
  id: 'qauser0000000001', collectionId: '_pb_users_auth_', collectionName: 'users',
  email: 'qa@sitewise.test', name: 'QA Tester', verified: true,
};
const authPayload = JSON.stringify({ token, record, model: record });

const [, , path = '/', w = '1280', h = '900', out = '/tmp/shell.png'] = process.argv;
const base = 'http://localhost:5173';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: Number(w), height: Number(h) } });
const page = await ctx.newPage();
await page.addInitScript(({ authPayload }) => {
  localStorage.setItem('theme', 'dark');
  localStorage.setItem('pocketbase_auth', authPayload);
  localStorage.setItem('currentSiteId', 'seedsite00000001');
  localStorage.setItem('currentUserRole', 'owner');
}, { authPayload });
await page.goto(base + path, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await page.screenshot({ path: out });
console.log(`shell ${path} @${w}x${h} -> ${out} (url: ${page.url()})`);
await browser.close();
