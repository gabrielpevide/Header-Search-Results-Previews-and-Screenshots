// Render an HTML page to a PNG at an exact pixel size (RGB, no alpha).
//
// usage: node render.mjs page.html WIDTH HEIGHT out.png [--guides header|search|SPEC] [--data file.json] [--index N]
//
// --guides  draws dashed boxes for checking a layout. Preview only: never upload a guided render.
//           "header" and "search" draw Apple's areas; SPEC is "x0,x1,y0,y1,color;..." in shares of the canvas.
// --data    JSON exposed to the page as window.SHOT_DATA, with window.SHOT_INDEX = N (default 0),
//           so one template can render a whole screenshot set.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); }
catch { playwright = require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); }

const PRESETS = {
  // iPhone shows x 0.161-0.839; status bar and buttons cover the top 38% beside the safe area.
  header: '0.161,0.839,0,1,#00E0FF;0.161,0.839,0,0.38,#7CFF6B;0.286,0.714,0.3,0.701,#FFE600',
  search: '0.218,0.782,0.299,0.701,#FFE600',
};

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i === -1 ? undefined : args.splice(i, 2)[1]; };
const guidesArg = flag('--guides');
const dataFile = flag('--data');
const index = Number(flag('--index') ?? 0);
const [html, w, h, out] = args;
if (!out) { console.error('usage: node render.mjs page.html WIDTH HEIGHT out.png [--guides ...] [--data f.json] [--index N]'); process.exit(2); }
const width = Number(w), height = Number(h);
const guides = PRESETS[guidesArg] ?? guidesArg;

const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
if (dataFile) {
  const data = JSON.parse(readFileSync(dataFile, 'utf8'));
  // Image paths in the data resolve against the data file's folder.
  data.__base = pathToFileURL(path.dirname(path.resolve(dataFile)) + '/').href;
  await page.addInitScript(([d, i]) => { window.SHOT_DATA = d; window.SHOT_INDEX = i; }, [data, index]);
}
await page.goto(pathToFileURL(path.resolve(html)).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
// Templates that size text to fit expose window.fitText; run it now that the real font is in.
await page.evaluate(() => window.fitText?.());
await page.evaluate(() => Promise.all([...document.images].map(img => img.complete ? null : new Promise(r => { img.onload = img.onerror = r; }))));

// Google Fonts declares one face per unicode subset and only the subsets in use load, so judge per family.
const missingFonts = await page.evaluate(() => {
  const loaded = new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => f.family));
  return [...new Set([...document.fonts].map(f => f.family))].filter(f => !loaded.has(f));
});
const brokenImages = await page.evaluate(() => [...document.images].filter(i => !i.naturalWidth).map(i => i.src));
if (missingFonts.length) console.error('WARN fonts not loaded:', missingFonts.join(', '));
if (brokenImages.length) console.error('WARN images not loaded:', brokenImages.join(', '));

if (guides) {
  await page.evaluate(({ guides, width, height }) => {
    for (const g of guides.split(';')) {
      const [x0, x1, y0, y1, color] = g.split(',');
      const d = document.createElement('div');
      Object.assign(d.style, {
        position: 'fixed', left: x0 * width + 'px', top: y0 * height + 'px',
        width: (x1 - x0) * width + 'px', height: (y1 - y0) * height + 'px',
        border: `8px dashed ${color || '#00E0FF'}`, boxSizing: 'border-box', zIndex: 99,
      });
      document.body.appendChild(d);
    }
  }, { guides, width, height });
}
// An opaque page screenshot comes out RGB with no alpha channel, which is what App Store Connect wants.
await page.screenshot({ path: out, type: 'png', clip: { x: 0, y: 0, width, height } });
await browser.close();
console.log(out);
