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
imprint.html          Impressum & disclaimer
assets/css/style.css  all styles (tokens at the top)
assets/js/main.js     loader, reveals, pinned-scene depth, parallax, video loading, index preview, story viewer
assets/fonts/         woff2 + OFL licences
assets/img/           photographs (© Margarette Contreras)
assets/video/         living stills (looped, muted H.264)
```

Story texts and frame lists live in `STORIES` at the top of `assets/js/main.js`.

## Deploy

Works as-is on GitHub Pages (Settings → Pages → Deploy from branch `main`, root), Netlify or Vercel.

---

All photographs © Margarette Contreras. All rights reserved.
