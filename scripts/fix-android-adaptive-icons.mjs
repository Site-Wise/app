// Re-apply the safe-zone Android adaptive-icon foregrounds.
//
// `npx tauri icon` regenerates every launcher asset from `icons/icon.png`,
// but it copies that source into the adaptive-icon foreground (`ic_launcher_foreground.png`)
// edge-to-edge. Android's launcher then masks the outer ~1/3 of an adaptive
// icon, which crops the SiteWise mark and makes the app icon look wrong.
//
// We keep mark-only foregrounds (the SiteWise mark sized within the
// adaptive-icon safe zone, on transparency) committed under
// `src-tauri/icons/android/mipmap-*/`, plus the brand-dark adaptive background
// colour in `values/ic_launcher_background.xml`. This script copies both over
// the freshly regenerated source icons and into the generated Android project's
// resources, so the installed app shows the correct, uncropped icon on the dark
// brand background.
//
// Run it AFTER `npx tauri icon` (see .github/workflows/android-build.yml).

import { existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DENSITIES = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
const FOREGROUND = 'ic_launcher_foreground.png';
const BACKGROUND_XML = 'ic_launcher_background.xml';

const sourceDir = join(root, 'src-tauri', 'icons', 'android');

// Locate the generated Android res directory (git-ignored, created by
// `tauri android init`). Be tolerant of layout differences across Tauri versions.
function findGeneratedResDirs() {
  const candidates = [
    join(root, 'src-tauri', 'gen', 'android', 'app', 'src', 'main', 'res'),
  ];
  return candidates.filter((dir) => existsSync(dir));
}

let copied = 0;
let missingSources = 0;

const resDirs = findGeneratedResDirs();
if (resDirs.length === 0) {
  console.warn(
    '[fix-android-adaptive-icons] No generated Android res directory found. ' +
      'Run `tauri android init` first; skipping.'
  );
}

for (const density of DENSITIES) {
  const src = join(sourceDir, `mipmap-${density}`, FOREGROUND);
  if (!existsSync(src)) {
    console.warn(`[fix-android-adaptive-icons] Missing committed foreground: ${src}`);
    missingSources++;
    continue;
  }

  for (const resDir of resDirs) {
    const destDir = join(resDir, `mipmap-${density}`);
    if (!existsSync(destDir)) continue;
    const dest = join(destDir, FOREGROUND);
    copyFileSync(src, dest);
    copied++;
    console.log(`[fix-android-adaptive-icons] ${dest}`);
  }
}

// Apply the brand-dark adaptive background colour. `tauri icon` does not manage
// this file, so copy our committed version into the generated res/values dir.
const bgSrc = join(sourceDir, 'values', BACKGROUND_XML);
if (!existsSync(bgSrc)) {
  console.warn(`[fix-android-adaptive-icons] Missing committed background: ${bgSrc}`);
  missingSources++;
} else {
  for (const resDir of resDirs) {
    const destDir = join(resDir, 'values');
    mkdirSync(destDir, { recursive: true });
    const dest = join(destDir, BACKGROUND_XML);
    copyFileSync(bgSrc, dest);
    copied++;
    console.log(`[fix-android-adaptive-icons] ${dest}`);
  }
}

if (missingSources > 0) {
  console.error(
    `[fix-android-adaptive-icons] ${missingSources} source asset(s) missing — ` +
      'the committed safe-zone icons are required.'
  );
  process.exit(1);
}

console.log(`[fix-android-adaptive-icons] Applied ${copied} icon asset(s).`);
