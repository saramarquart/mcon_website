# Margarette Contreras — Analog Film Photography

Static homepage rebuild of [margxcontreras.wixsite.com/home](https://margxcontreras.wixsite.com/home): a dark, editorial portfolio for the series *Norway* and *The Last Frontier*.

- **No build step, no dependencies.** It's plain HTML, CSS and JS.
- **Type:** Bodoni Moda (display and text, variable optical size) + Geist Mono (captions). Both are self-hosted from `assets/fonts` (SIL OFL), so no Google Fonts requests are made, which keeps it GDPR-friendly.
- **Images:** `assets/img/<name>-{600,1200,2400}.jpg`, served responsively via `srcset`. `-wide` / `-tall` files are 16:9 / 9:16 crops that match the videos exactly.
- **Living stills:** `assets/video/<name>-{1080,720}.mp4` are seamless 7–16 s loops generated with Google Veo 3.1 (image-to-video, locked-off camera) from the original film scans, audio stripped. They load only when on screen, pause when covered, and are skipped for reduced-motion and data-saver users. The photo underneath is always the fallback.
- **Depth:** the hero, the Palawan scene and the "On film" scene are `position: sticky` pins; the following section (`.sheet`) slides over them while the pinned scene scales back and dims (`--p`, set in `main.js`).

## Run locally

```sh
python3 -m http.server 4173
# open http://localhost:4173
```

## Structure

```
index.html            homepage
imprint.html          Impressum / legal notice (DE + EN)
privacy.html          Datenschutzerklärung / privacy policy (DE + EN)
404.html              not-found page (served automatically by GitHub Pages)
site.webmanifest      home-screen icon + colours for Android / iOS
robots.txt
assets/css/style.css  all styles (tokens at the top)
assets/js/main.js     loader, reveals, pinned-scene depth, parallax, video loading, index preview, story viewer
assets/fonts/         woff2 + OFL licences
assets/img/           photographs (© Margarette Contreras)
assets/video/         living stills (looped, muted H.264)
```

Story texts and frame lists live in `STORIES` at the top of `assets/js/main.js`.

## Visitor statistics

A cookieless counter built on a Google Sheet + Apps Script (no third-party analytics account).

- `stats-backend/Code.gs`: the Apps Script web app. It stores anonymous events (time, page / story, time zone → country, language, referring domain, device) and serves aggregated numbers. No IP addresses, no identifiers; raw rows are deleted after two years; a time-zone region is only shown publicly from 3 visits. The count starts at `BASELINE = 2149` (visits on the old site).
- `assets/js/count.js`: sends events, respects Do Not Track / Global Privacy Control, and shows the tiny "N° … visitors" link in the footer.
- `stats.html` + `assets/js/stats-page.js`: the public Visitors page (frame counter, contact sheet of the current roll, dot map, rankings, last 30 days).
- `assets/data/tz.json`, `assets/data/land.json`: generated from the IANA tz database and Natural Earth (world-atlas).

**Connect it:** create a Google Sheet → Extensions → Apps Script → paste `stats-backend/Code.gs` → Deploy → New deployment → Web app, *Execute as: Me*, *Who has access: Anyone* → copy the `/exec` URL into `<meta name="mc-stats" content="…">` in `index.html`, `imprint.html`, `privacy.html` and `stats.html`. Until then everything stays switched off.

## Before going live

- This is a private, non-commercial site, so the legal notice lists name, email and Instagram only (no address); both legal pages are `noindex`.
- If the site ever becomes commercial (paid shoots, print sales, ads), add a serviceable address to `imprint.html` per § 5 DDG. It does not have to be a home address: a c/o address service works, a P.O. box does not.
- If the site is hosted somewhere other than GitHub Pages, update the hosting section in `privacy.html`.

## Responsive notes

Tested at 360×780 (Android), 375×667 (iPhone SE), 430×932 (iPhone Pro Max), 844×390 (phone landscape), 820×1180 (iPad), 1280×720 and 1366×768 (laptops), 1440×900. Safe-area insets are respected for notches and home indicators; touch devices get story thumbnails in the index, Prev/Next buttons in the viewer and a static grain layer for smoother scrolling.

## Deploy

Works as-is on GitHub Pages (Settings → Pages → Deploy from branch `main`, root), Netlify or Vercel.

---

All photographs © Margarette Contreras. All rights reserved.
