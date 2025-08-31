const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const publicDir = path.join(__dirname, '..', 'public');
const assetsDir = path.join(publicDir, 'assets');
const srcHtml = path.join(publicDir, 'index.html');
const outHtml = path.join(publicDir, 'replica.html');
const partialsDir = path.join(publicDir, 'partials');

// If a full captured index.html is not present, fall back to existing partials (head, header, content)
if (!fs.existsSync(srcHtml)) {
  console.log('public/index.html not found — will scan available partials for font URLs and proceed');
}

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

;(async () => {
  let raw = '';
  if (fs.existsSync(srcHtml)) {
    raw = fs.readFileSync(srcHtml, 'utf8');
  } else {
    // compose raw from existing partials (head/header/content/footer)
    const headPath = path.join(partialsDir, 'head.html');
    const headerPath = path.join(partialsDir, 'header.html');
    const contentPath = path.join(partialsDir, 'content.html');
    const footerPath = path.join(partialsDir, 'footer.html');
    if (fs.existsSync(headPath)) raw += fs.readFileSync(headPath, 'utf8');
    if (fs.existsSync(headerPath)) raw += fs.readFileSync(headerPath, 'utf8');
    if (fs.existsSync(contentPath)) raw += fs.readFileSync(contentPath, 'utf8');
    if (fs.existsSync(footerPath)) raw += fs.readFileSync(footerPath, 'utf8');
  }

  // Helper to download URLs (http/https) to a file
  const http = require('http');
  const https = require('https');

  function downloadTo(urlStr, dest) {
    return new Promise((resolve, reject) => {
      try {
        const urlObj = new URL(urlStr);
        const get = urlObj.protocol === 'http:' ? http.get : https.get;
        const req = get(urlStr, (res) => {
          if (res.statusCode && res.statusCode >= 400) return reject(new Error('HTTP ' + res.statusCode));
          const file = fs.createWriteStream(dest);
          res.pipe(file);
          file.on('finish', () => file.close(resolve));
          file.on('error', reject);
        });
        req.on('error', reject);
      } catch (e) { reject(e); }
    });
  }

  ensureDir(assetsDir);

  // Find font URLs inside CSS url(...) patterns in the captured HTML (head/style or inline CSS)
  const urlRegex = /url\((['"]?)([^'"\)]+)\1\)/g;
  const fontExts = new Set(['.woff', '.woff2', '.ttf', '.otf', '.eot', '.svg']);
  const foundFonts = new Set();
  let m;
  while ((m = urlRegex.exec(raw)) !== null) {
    const candidate = m[2];
    if (!candidate || candidate.startsWith('data:')) continue;
    try {
      const abs = new URL(candidate, 'https://demos.reytheme.com').toString();
      const ext = path.extname(new URL(abs).pathname).toLowerCase();
      if (fontExts.has(ext)) foundFonts.add(abs);
    } catch (e) {
      // ignore invalid URLs
    }
  }

  const mapping = {}; // abs -> local path (assets/name)
  for (const fontUrl of foundFonts) {
    try {
      const uobj = new URL(fontUrl);
      const name = path.basename(uobj.pathname);
      const destPath = path.join(assetsDir, name);
      if (!fs.existsSync(destPath)) {
        console.log('Downloading font', fontUrl, '->', destPath);
        try {
          // download (await-like via Promise)
          await downloadTo(fontUrl, destPath);
          console.log('Saved font', destPath);
        } catch (e) {
          console.log('Failed to download font', fontUrl, e && e.message);
          continue;
        }
      } else {
        console.log('Font already exists', destPath);
      }
      mapping[fontUrl] = `assets/${name}`;
    } catch (e) {
      console.log('Skipping font', fontUrl, e && e.message);
    }
  }

  // Replace font URLs in raw HTML/CSS to point to local assets where available
  // Helper: process a block of CSS text, download any font url(...) references and
  // rewrite them to local asset paths. Returns the rewritten CSS text.
  async function processCssAndDownloadFonts(cssText, baseUrl) {
    if (!cssText) return cssText;
    let out = '';
    let lastIndex = 0;
    let m2;
    // reset regex state
    urlRegex.lastIndex = 0;
    while ((m2 = urlRegex.exec(cssText)) !== null) {
      const full = m2[0];
      const quote = m2[1];
      const inner = m2[2];
      out += cssText.slice(lastIndex, m2.index);
      if (!inner || inner.startsWith('data:')) {
        out += full;
        lastIndex = urlRegex.lastIndex;
        continue;
      }
      try {
        const absInner = new URL(inner, baseUrl).toString();
        const ext = path.extname(new URL(absInner).pathname).toLowerCase();
        if (fontExts.has(ext)) {
          const name = path.basename(new URL(absInner).pathname);
          const destPath = path.join(assetsDir, name);
          if (!fs.existsSync(destPath)) {
            try {
              console.log('Downloading font from CSS', absInner, '->', destPath);
              await downloadTo(absInner, destPath);
              console.log('Saved font', destPath);
            } catch (e) {
              console.log('Failed to download font', absInner, e && e.message);
            }
          }
          mapping[absInner] = `assets/${name}`;
          out += `url(${quote}${mapping[absInner]}${quote})`;
        } else {
          // not a font extension; leave unchanged
          out += full;
        }
      } catch (e) {
        out += full;
      }
      lastIndex = urlRegex.lastIndex;
    }
    out += cssText.slice(lastIndex);
    return out;
  }

  // First pass: load the DOM and then process style tags (inline CSS) and link'ed CSS
  const $ = cheerio.load(raw);

// Remove script tags. For stylesheet links, try to fetch the CSS, download referenced fonts,
// rewrite url(...) references to local assets and inline the CSS as a <style> tag.
$('script').each((i, el) => { $(el).remove(); });
// helper to fetch text from remote URL
async function fetchText(urlStr) {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(urlStr);
      const get = urlObj.protocol === 'http:' ? require('http').get : require('https').get;
      const req = get(urlStr, (res) => {
        if (res.statusCode && res.statusCode >= 400) return reject(new Error('HTTP ' + res.statusCode));
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (c) => body += c);
        res.on('end', () => resolve(body));
      });
      req.on('error', reject);
    } catch (e) { reject(e); }
  });
}

const linkEls = $('link[rel="stylesheet"]').toArray();
for (const el of linkEls) {
  const href = $(el).attr('href') || '';
  if (!href) { $(el).remove(); continue; }
  try {
    const abs = new URL(href, 'https://demos.reytheme.com').toString();
    let cssText = '';
    try {
      cssText = await fetchText(abs);
    } catch (e) {
      // could not fetch remote css; remove link and continue
      $(el).remove();
      continue;
    }
    // find fonts in fetched css and download/replace using the helper
    cssText = await processCssAndDownloadFonts(cssText, abs);
    // Inline the CSS by replacing the link element with a style tag
    $(el).replaceWith(`<style>${cssText}</style>`);
  } catch (e) {
    $(el).remove();
  }
}
// remove preload links
$('link[rel="preload"]').each((i, el) => { $(el).remove(); });

// Process inline <style> tags (they may contain minified @font-face rules)
const styleEls = $('style').toArray();
for (const el of styleEls) {
  const cssText = $(el).html() || '';
  try {
    const rewritten = await processCssAndDownloadFonts(cssText, 'https://demos.reytheme.com');
    $(el).text(rewritten);
  } catch (e) {
    // leave unchanged on error
  }
}

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

// Prepare partials
ensureDir(partialsDir);

// Head partial (keep title/meta/style elements inside head)
const headHtml = $('head').html() || '';
fs.writeFileSync(path.join(partialsDir, 'head.html'), headHtml, 'utf8');

// Try to extract semantic header, main, footer. If missing, fallback to body as content.
let headerHtml = '';
let mainHtml = '';
let footerHtml = '';

if ($('header').first().length) headerHtml = $.html($('header').first());
if ($('main').first().length) mainHtml = $.html($('main').first());
if ($('footer').first().length) footerHtml = $.html($('footer').first());

if (!headerHtml && !mainHtml && !footerHtml) {
  // fallback: dump entire body into content
  mainHtml = $('body').html() || '';
}

// If some parts empty but body has other top-level containers, try a simple split
if (!mainHtml && $('body').children().length) {
  // attempt: select the largest single child as main
  const children = $('body').children().toArray();
  let largest = null;
  let largestLen = 0;
  children.forEach((c) => {
    const len = $(c).html() ? $(c).html().length : 0;
    if (len > largestLen) { largestLen = len; largest = c; }
  });
  if (largest) mainHtml = $.html(largest);
}

// Write partials (header/content/footer). Empty strings are allowed.
fs.writeFileSync(path.join(partialsDir, 'header.html'), headerHtml, 'utf8');
fs.writeFileSync(path.join(partialsDir, 'content.html'), mainHtml, 'utf8');
fs.writeFileSync(path.join(partialsDir, 'footer.html'), footerHtml, 'utf8');

// Write a small shell replica that loads the partials and injects them into the document.
const shell = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Replica (split)</title>
  <script>
    async function loadPartials(){
      try{
        // load head partial and append its nodes
        const headResp = await fetch('partials/head.html');
        if (headResp.ok) {
          const headHtml = await headResp.text();
          // append headHtml to document.head
          const tmp = document.createElement('div');
          tmp.innerHTML = headHtml;
          // move children to head
          while(tmp.firstChild) document.head.appendChild(tmp.firstChild);
        }

        // load header, content, footer
        const [hRes, cRes, fRes] = await Promise.all([
          fetch('partials/header.html'),
          fetch('partials/content.html'),
          fetch('partials/footer.html')
        ]);
        const headerHtml = hRes.ok ? await hRes.text() : '';
        const contentHtml = cRes.ok ? await cRes.text() : '';
        const footerHtml = fRes.ok ? await fRes.text() : '';

        // inject into body preserving order
        document.body.innerHTML = headerHtml + contentHtml + footerHtml;
      } catch (e) {
        console.error('Failed to load partials', e);
      }
    }
    document.addEventListener('DOMContentLoaded', loadPartials);
  </script>
</head>
<body>
  <p>Loading…</p>
</body>
</html>`;

fs.writeFileSync(outHtml, shell, 'utf8');
console.log('Wrote partials to', partialsDir, 'and replica shell to', outHtml);

})();
