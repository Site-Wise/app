# Self-Hosting SiteWise

SiteWise has two deployable pieces:

| Piece | What it is | Image / build |
|---|---|---|
| **Backend** | PocketBase (single Go binary, SQLite) bundled with SiteWise hooks | `external_services/pocketbase/Dockerfile` |
| **Frontend** | Vue 3 SPA served by nginx | root `Dockerfile` |

The frontend is a static bundle that talks to the backend over REST + realtime.
The backend holds all of your data. You can host them on one box or two.

---

## 1. Backend (PocketBase)

The backend is the source of truth — start here. Everything you need is in
[`external_services/pocketbase/`](../external_services/pocketbase/), which has
its own [README](../external_services/pocketbase/README.md) with the full
matrix of environment variables.

### Standard build

```bash
cd external_services/pocketbase
TURNSTILE_SECRET_KEY=your-secret docker compose up -d --build
```

This builds an image on a pinned PocketBase release with the SiteWise hooks
baked in, serves on port `8090`, and persists data in the `pb_data` volume.

First-run setup:

1. Open `http://YOUR_HOST:8090/_/` and create the first superuser.
2. **Settings → Import collections** → paste/upload
   [`pb_schema.json`](../external_services/pocketbase/pb_schema.json).
3. (Optional) Set `TURNSTILE_SECRET_KEY` so the signup/login bot-protection
   hooks can verify Cloudflare Turnstile tokens.

> You can skip the manual superuser step by setting `PB_SUPERUSER_EMAIL` and
> `PB_SUPERUSER_PASSWORD` — the entrypoint upserts the superuser on boot.

### ONCE build

If you deploy with the [ONCE](https://once.com/) app server (or any platform
that expects the ONCE contract — HTTP on port `80`, readiness at `/up`, data in
`/storage`), build the ONCE flavour instead:

```bash
docker build -f external_services/pocketbase/Dockerfile.once \
  -t sitewise-backend-once external_services/pocketbase

docker run -d --name sitewise-backend \
  -p 80:80 -v sitewise_storage:/storage \
  -e TURNSTILE_SECRET_KEY=your-secret \
  sitewise-backend-once
```

---

## 2. Frontend (Vue + nginx)

The frontend reads `VITE_POCKETBASE_URL` **at build time** (Vite inlines env
vars into the static bundle), so point it at your backend before building.

```bash
# from the repo root
docker build \
  --build-arg VITE_POCKETBASE_URL=https://api.your-domain.com \
  -t sitewise-frontend .

docker run -d --name sitewise-frontend -p 8080:8080 sitewise-frontend
```

Supported build args: `VITE_POCKETBASE_URL`, `VITE_APP_NAME`, `VITE_APP_ENV`,
`VITE_TURNSTILE_SITE_KEY`. They default to development-friendly values, so
**always** set at least `VITE_POCKETBASE_URL` when self-hosting.

> The CSP in `nginx.conf` allow-lists the API origin in `connect-src` — update
> it if your backend lives on a host other than the default `app.sitewise.in`.

---

## 3. Put a reverse proxy in front

For anything internet-facing, terminate TLS at a reverse proxy (Caddy, nginx,
Traefik) and route:

- `https://your-domain.com` → frontend (`:8080`)
- `https://api.your-domain.com` → backend (`:8090`)

PocketBase docs recommend exposing the backend **only** through the proxy
(don't publish `8090` directly). With ONCE, the platform provides the proxy and
TLS for you — you only supply the image.

---

## Production checklist

- [ ] Pin the PocketBase version (`--build-arg PB_VERSION=...`) and bump
      deliberately.
- [ ] Back up the data volume (`pb_data` / `/storage`) regularly — it holds the
      SQLite DB **and** uploaded delivery photos.
- [ ] Set a strong superuser password; never expose the `_/` admin UI without
      TLS.
- [ ] Provide `TURNSTILE_SECRET_KEY` in production so auth hooks enforce bot
      protection.
- [ ] Keep secrets out of the image — pass them as runtime env vars / Docker
      secrets, never `COPY` an `.env` into the backend image.
- [ ] Run the backend behind a reverse proxy with TLS; restrict direct access to
      the PocketBase port.

---

## Why PocketBase is a good fit for self-hosting

It's a single binary with embedded SQLite, so there's no separate database
server to operate, and the entire backend — schema, files, settings — lives in
one directory you can snapshot. That's also what makes the **ONCE** build so
clean: one image, one volume, one port.
