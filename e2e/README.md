# e2e / docs harness

Headless-browser tooling (Playwright) for **authenticated visual debugging** and
**documentation videos** against the local dev server.

## Setup (once)

1. Dev server running on `http://localhost:5173` (`npm run dev`).
2. Create `.env.e2e` in the repo root (gitignored):
   ```
   E2E_EMAIL=test@yoursite.in
   E2E_PASSWORD=••••••••
   E2E_BASE_URL=http://localhost:5173
   ```
3. Save a session (logs in via the real form; dev turnstile auto-passes):
   ```
   npm run e2e:auth
   ```
   This writes `e2e/.auth/state.json` (gitignored). Re-run whenever the session expires.

## Screenshot any route (debug loop)

```
npm run e2e:shot -- /payments 1280 900 dark e2e/.media/payments.png
node e2e/shoot.mjs /          390 844 dark e2e/.media/dash-mobile.png
```
Args: `<path> <width> <height> <theme(dark|light)> <outfile>`.

## Record a documentation video (MP4)

```
npm run e2e:rec -- tour dark
npm run e2e:rec -- dashboard dark
```
Outputs `e2e/.media/<scenario>-<theme>.mp4`. Add flows to the `scenarios` map in
`record.mjs`.

## Notes
- `.env.e2e`, `e2e/.auth/`, and `e2e/.media/` are gitignored — secrets and the
  live session token never get committed.
- Real *registration* is blocked locally (backend verifies the turnstile token
  server-side); *login* with a valid account works.
