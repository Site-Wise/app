// Shared config for the e2e / docs-video harness.
// Reads .env.e2e (gitignored) so the test login never enters the repo or chat.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, '.env.e2e');

function parseEnvFile(p) {
  const out = {};
  if (!fs.existsSync(p)) return out;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

const fileEnv = parseEnvFile(envPath);
const get = (k, d) => process.env[k] ?? fileEnv[k] ?? d;

export const ROOT = root;
export const BASE_URL = get('E2E_BASE_URL', 'http://localhost:5173');
export const EMAIL = get('E2E_EMAIL');
export const PASSWORD = get('E2E_PASSWORD');
export const AUTH_STATE = path.join(root, 'e2e', '.auth', 'state.json');
export const MEDIA_DIR = path.join(root, 'e2e', '.media');

export function requireCreds() {
  if (!EMAIL || !PASSWORD) {
    console.error(
      `Missing creds. Create ${envPath} with:\n` +
      `  E2E_EMAIL=you@example.com\n  E2E_PASSWORD=secret\n  E2E_BASE_URL=${BASE_URL}`
    );
    process.exit(1);
  }
}

export function authStateExists() {
  return fs.existsSync(AUTH_STATE);
}
