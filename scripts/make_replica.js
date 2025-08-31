const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const publicDir = path.join(__dirname, '..', 'public');
const assetsDir = path.join(publicDir, 'assets');
const srcHtml = path.join(publicDir, 'index.html');
const outHtml = path.join(publicDir, 'replica.html');

if (!fs.existsSync(srcHtml)) {
  console.error('Please run capture first to create public/index.html');
  process.exit(1);
}

const raw = fs.readFileSync(srcHtml, 'utf8');
const $ = cheerio.load(raw);

// Remove script and link tags that load external assets (keep inline styles)
$('script').each((i, el) => { $(el).remove(); });
$('link[rel="stylesheet"]').each((i, el) => { $(el).remove(); });
$('link[rel="preload"]').each((i, el) => { $(el).remove(); });

// Rewrite img src to local asset if downloaded
$('img').each((i, el) => {
  const src = $(el).attr('src') || '';
  try {
    if (!src) return;
    const u = new URL(src, 'https://demos.reytheme.com');
    const name = path.basename(u.pathname);
    const localPath = fs.existsSync(path.join(assetsDir, name)) ? `assets/${name}` : src;
    $(el).attr('src', localPath);
    // remove srcset to avoid external requests
    $(el).removeAttr('srcset');
  } catch (e) {
    // ignore data: or invalid URLs
  }
});

// Fix anchor tags to not navigate away
$('a').each((i, el) => { $(el).attr('href', '#'); });

// Write out replica
fs.writeFileSync(outHtml, $.html());
console.log('Wrote', outHtml);
