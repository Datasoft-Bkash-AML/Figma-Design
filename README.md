# San Francisco Demo — Crawl & Replicate

This repository contains a small Node-based toolset to crawl the ReyTheme San Francisco demo page, capture the fully-rendered DOM (after lazy-loading), download image assets, and produce a static single-page replica you can preview locally.

Files of interest
- `scripts/capture.js` — Playwright crawler that loads the page, auto-scrolls to trigger lazy content, saves rendered HTML to `public/index.html`, and downloads `img` assets to `public/assets/`.
- `scripts/make_replica.js` — Cleans the captured HTML by removing external scripts/styles, rewrites image `src` to local copies (when available), and writes `public/replica.html`.
- `server.js` — Minimal static server to preview files in `public/`.
- `public/index.html` — The rendered HTML captured from the live site (created by `npm run capture`).
- `public/replica.html` — Cleaned single-file replica (created by `npm run replica`).

Prerequisites
- Node.js (v16+ recommended; project tested on Node 22)
- npm
- Network access to fetch the target site and assets

Quickstart

1. Install dependencies

```bash
npm install
```

2. (Playwright browsers) If you hit browser errors, run:

```bash
npx playwright install
# or, on some Linux containers where dependencies are needed:
npx playwright install --with-deps
```

3. Capture the live page (this will create `public/index.html` and download images to `public/assets/`):

```bash
npm run capture
```

4. Create a cleaned, static replica (`public/replica.html`) that rewrites `img` src to local assets and removes scripts/styles:

```bash
npm run replica
```

5. Preview the replica locally:

```bash
npm start
# then open http://localhost:3000/replica.html
```

What the scripts do
- `capture.js` uses Playwright to fully render the page (waits for `networkidle` and performs an auto-scroll to trigger lazy-loading). It saves the rendered DOM and downloads the visible image assets.
- `make_replica.js` uses Cheerio to load the captured HTML and remove `<script>` and external `<link rel="stylesheet">` tags to produce a safer static file; it rewrites image `src` attributes to local files in `public/assets/` when available.

Notes & caveats
- `.h2d` Polypane session files are proprietary to the Polypane desktop app; this project does not open `.h2d` files — it reproduces the page DOM by visiting the live URL.
- The replica intentionally strips external JS/CSS to keep a single-file preview; the resulting layout may differ visually from the live site. If you want a pixel-perfect replica, consider downloading external CSS files and linking them in `replica.html` (I can add this step if desired).
- Some images are embedded as `data:` URIs or generated SVG placeholders; they cannot be downloaded via HTTP and are left untouched.
- If Playwright fails due to missing browser binaries, run `npx playwright install`.

Extending the project
- To create a componentized frontend (React/Vue), use `public/index.html` or `public/replica.html` as a reference DOM and scaffold components accordingly.
- To capture multiple pages, adapt `scripts/capture.js` to iterate list of URLs, store per-page directories, and produce a manifest (JSON) describing element counts, IDs, and classes.

Git workflow (branch, push, maintain)

Use this recommended workflow to create a branch for the feature, commit, and push to the remote:

```bash
# create and switch to a new branch
git checkout -b feature/crawl-replica

# stage changes (only the files you want) — example adds README and scripts
git add README.md scripts/ server.js package.json package-lock.json scripts/ capture.js scripts/make_replica.js

# commit
git commit -m "Add crawler, replica generator and README for site replication"

# push branch to origin and set upstream
git push -u origin feature/crawl-replica
```

Maintenance tips
- Keep `playwright` and `cheerio` up-to-date. Run `npm outdated` from time to time and update with `npm update` or by editing `package.json`.
- Review `public/assets/` for large files; consider selectively downloading or compressing assets to keep repo size small. Prefer committing only the replica (`replica.html`) and a small set of assets; store large assets in a release or artifact storage.
- If you plan to run captures frequently, consider adding a timestamped output folder (e.g., `public/captures/2025-08-31/`) so historical captures are preserved.

Troubleshooting
- Capture script exits with errors about missing browser: run `npx playwright install`.
- Capture downloads fail (network errors): ensure the Codespace/container has outbound network access and the target site allows scraping.
- `replica.html` looks broken: external CSS was removed; to improve visuals, download CSS referenced in `index.html` into `public/assets/` and update `<link>` tags in `replica.html` accordingly.

License
MIT

---

If you'd like, I can:
- Automatically download linked CSS and inline it into `replica.html`.
- Convert the captured DOM into a React app skeleton with JSX components mirroring the DOM structure.
- Add a Playwright test that verifies the replica contains the same count of `div` elements and basic structure checks.

Tell me which of those you'd like next and I'll implement it.
