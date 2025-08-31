const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const url = process.argv[2] || 'https://demos.reytheme.com/san-francisco/';
const outDir = path.resolve(__dirname, '..', 'public');
const assetsDir = path.join(outDir, 'assets');

async function downloadAsset(page, src, destPath) {
  try {
    const resp = await page.request.get(src);
    if (resp.ok()) {
      const buffer = await resp.body();
      fs.writeFileSync(destPath, buffer);
      console.log('Saved asset', destPath);
    } else {
      console.log('Failed to fetch', src, resp.status());
    }
  } catch (e) {
    console.log('Error downloading', src, e.message);
  }
}

async function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

(async ()=>{
  ensureDir(outDir);
  ensureDir(assetsDir);

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Opening', url);
  await page.goto(url, { waitUntil: 'networkidle' });

  // Auto-scroll to load lazy content
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let total = 0;
      const distance = 400;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        total += distance;
        if (total > document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  });

  // wait a bit for lazy loads
  await page.waitForTimeout(1000);

  // get full HTML after render
  const html = await page.content();
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  console.log('Saved rendered HTML to public/index.html');

  // find image sources and download a subset
  const imgs = await page.$$eval('img', imgs => imgs.map(i => i.src).filter(Boolean));
  const unique = Array.from(new Set(imgs)).slice(0, 100);
  for (const src of unique) {
    try {
      const urlObj = new URL(src, page.url());
      const name = path.basename(urlObj.pathname);
      const dest = path.join(assetsDir, name);
      await downloadAsset(page, urlObj.toString(), dest);
    } catch (e) {
      console.log('skip', src, e.message);
    }
  }

  await browser.close();
  console.log('Done. Check public/index.html and public/assets/');
})();
