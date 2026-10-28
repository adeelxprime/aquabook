import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, 'dist');
const assetsDir = path.join(distDir, 'assets');
const swPath = path.join(distDir, 'sw.js');

try {
  if (fs.existsSync(assetsDir) && fs.existsSync(swPath)) {
    const assetFiles = fs.readdirSync(assetsDir);
    const assetUrls = assetFiles.map((file) => `/assets/${file}`);

    let swContent = fs.readFileSync(swPath, 'utf8');

    // Find STATIC_ASSETS array in sw.js and inject assetUrls
    const baseAssets = [
      '/',
      '/index.html',
      '/manifest.json',
      '/favicon.svg',
      '/pwa-192.png',
      '/pwa-512.png',
      '/apple-touch-icon.png',
      '/icons.svg'
    ];

    const allAssets = Array.from(new Set([...baseAssets, ...assetUrls]));
    const formattedArray = 'const STATIC_ASSETS = [\n  ' + allAssets.map(a => `'${a}'`).join(',\n  ') + '\n];';

    swContent = swContent.replace(/const STATIC_ASSETS = \[[\s\S]*?\];/, formattedArray);

    fs.writeFileSync(swPath, swContent, 'utf8');
    console.log(`[postbuild] Successfully injected ${assetUrls.length} build assets into dist/sw.js for 100% offline support!`);
  } else {
    console.warn('[postbuild] dist or dist/assets not found, skipping sw injection.');
  }
} catch (err) {
  console.error('[postbuild] Error injecting assets into sw.js:', err);
}
