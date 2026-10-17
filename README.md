# Margarette Contreras — Analog Film Photography

Static homepage rebuild of [margxcontreras.wixsite.com/home](https://margxcontreras.wixsite.com/home): a dark, editorial portfolio for the series *Norway* and *The Last Frontier*.

- **No build step, no dependencies.** It's plain HTML, CSS and JS.
- **Type:** Bodoni Moda (display and text, variable optical size) + Geist Mono (captions). Both are self-hosted from `assets/fonts` (SIL OFL), so no Google Fonts requests are made, which keeps it GDPR-friendly.
- **Images:** `assets/img/<name>-{600,1200,2400}.jpg`, served responsively via `srcset`.

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
assets/js/main.js     loader, reveals, parallax, index preview, story viewer
assets/fonts/         woff2 + OFL licences
assets/img/           photographs (© Margarette Contreras)
```

Story texts and frame lists live in `STORIES` at the top of `assets/js/main.js`.

## Deploy

Works as-is on GitHub Pages (Settings → Pages → Deploy from branch `main`, root), Netlify or Vercel.

---

All photographs © Margarette Contreras. All rights reserved.
