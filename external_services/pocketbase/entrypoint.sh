#!/bin/sh
#
# Shared entrypoint for the SiteWise PocketBase backend image.
#
# Behaviour is controlled entirely through environment variables so the same
# image/entrypoint serves both the standard build and the ONCE build:
#
#   PB_HTTP             Address PocketBase binds to        (default 0.0.0.0:8090)
#   PB_DATA_DIR         Persistent data directory          (default /pb/pb_data)
#   PB_HOOKS_DIR        JS hooks directory                 (default /pb/pb_hooks)
#   PB_MIGRATIONS_DIR   JS migrations directory            (default /pb/pb_migrations)
#   PB_PUBLIC_DIR       Static files directory             (default /pb/pb_public)
#   PB_ENCRYPTION_ENV   Name of the env var holding the    (optional)
#                       settings encryption key
#   PB_SUPERUSER_EMAIL  Bootstrap a superuser on start     (optional)
#   PB_SUPERUSER_PASSWORD                                  (optional)
#
# Any extra arguments passed to the container are forwarded to
# `pocketbase serve` verbatim.
set -eu

PB_HTTP="${PB_HTTP:-0.0.0.0:8090}"
PB_DATA_DIR="${PB_DATA_DIR:-/pb/pb_data}"
PB_HOOKS_DIR="${PB_HOOKS_DIR:-/pb/pb_hooks}"
PB_MIGRATIONS_DIR="${PB_MIGRATIONS_DIR:-/pb/pb_migrations}"
PB_PUBLIC_DIR="${PB_PUBLIC_DIR:-/pb/pb_public}"

# Ensure the persistent directory exists (it is usually a mounted volume).
mkdir -p "$PB_DATA_DIR"

set -- serve \
  --http="$PB_HTTP" \
  --dir="$PB_DATA_DIR" \
  --hooksDir="$PB_HOOKS_DIR" \
  --migrationsDir="$PB_MIGRATIONS_DIR" \
  --publicDir="$PB_PUBLIC_DIR" \
  "$@"

if [ -n "${PB_ENCRYPTION_ENV:-}" ]; then
  set -- "$@" --encryptionEnv="$PB_ENCRYPTION_ENV"
fi

# Optionally create/update a superuser before serving so the instance is
# immediately usable in automated/headless deployments.
if [ -n "${PB_SUPERUSER_EMAIL:-}" ] && [ -n "${PB_SUPERUSER_PASSWORD:-}" ]; then
  echo "[entrypoint] Upserting superuser ${PB_SUPERUSER_EMAIL}"
  pocketbase superuser upsert "$PB_SUPERUSER_EMAIL" "$PB_SUPERUSER_PASSWORD" \
    --dir="$PB_DATA_DIR" || echo "[entrypoint] superuser upsert skipped/failed (continuing)"
fi

echo "[entrypoint] Starting PocketBase: pocketbase $*"
exec pocketbase "$@"
