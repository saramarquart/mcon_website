/* Margarette Contreras — homepage interactions (no dependencies) */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const pad = n => String(n).padStart(2, '0');

  const IMG = 'assets/img/';
  const src = (name, w) => `${IMG}${name}-${w}.jpg`;
  const srcset = name => `${src(name, 600)} 600w, ${src(name, 1200)} 1200w, ${src(name, 2400)} 2400w`;

  /* ---------- Stories (texts by Margarette Contreras) ---------- */
  const STORIES = {
    light: {
      title: 'Light', series: 'Norway',
      text: 'One of the most magical aspects of film photography is the way it lets us explore the interplay between light and nature. Each photograph becomes a tribute to how these two elements interact, creating a world of texture, shadow and colour that is uniquely its own.',
      frames: [
        ['light-01', 'Two figures on a ridge, silhouetted against a pale sky'],
        ['norway-cover', 'Dark headland catching the last light over a calm sea'],
        ['light-04', 'Rays of light falling into a steep green fjord'],
        ['light-05', 'Shadowed mountain ridges under bright cloud'],
      ],
    },
    inhabits: {
      title: 'Inhabits', series: 'Norway',
      text: '“Inhabits” explores the lives of people in different environments, from the warmth of their homes to the vastness of the sea, all captured in natural light. Through contrasts and composition, it offers a glimpse into the human experiences that inhabit these spaces.',
      frames: [
        ['inhabits-01', 'Golden light on a jagged mountain above a still bay'],
        ['inhabits-03', 'Red fishermen’s cabins on rocks below towering mountains'],
        ['hero', 'White wooden houses and fishing boats along a harbour'],
        ['inhabits-05', 'A woman by the window of a ferry, sea and mountains beyond'],
        ['inhabits-06', 'Harbour with boats and houses under low cloud and a faint rainbow'],
      ],
    },
    water: {
      title: 'Water', series: 'Norway',
      text: 'The interplay between water and light — its fluidity, its reflections, and the way light dances upon its surface.',
      frames: [
        ['water-01', 'Mist rolling over a coastal road and dark water'],
        ['water-03', 'Red cabins on the shore beneath a sunlit, jagged peak'],
        ['water-04', 'A rainbow over a mountain and a red cabin by the water'],
        ['water-05', 'Wide beach with dry grasses and distant mountains under cloud'],
        ['water-06', 'Snow-capped mountains above a winding coastal road'],
      ],
    },
    takipsilim: {
      title: 'Takipsilim', series: 'The Last Frontier — Palawan',
      text: 'Takipsilim — the most awaited period of the day, when the sky dances in a stunning array of colours as the sun goes down.',
      frames: [
        ['takipsilim-01', 'Sun setting over the water, two swimmers in the glittering light'],
        ['takipsilim-02', 'A small island and outrigger boats on calm blue water at dusk'],
        ['takipsilim-03', 'Palm-fringed shore in soft evening light'],
        ['takipsilim-04', 'Pink and orange clouds over a dark sea at sunset'],
        ['takipsilim-05', 'An outrigger boat on a still lavender sea'],
        ['takipsilim-06', 'Golden sunset over a bay, framed by branches'],
      ],
    },
    amos: {
      title: 'Amos', series: 'The Last Frontier — Palawan',
      text: 'Amos is a Cuyunon word for “let’s go”. This album pays homage to growing up in a large family and spending countless weekends at the beach — coconuts, white sand, and a journey down memory lane at the mere mention of the magic word.',
      frames: [
        ['amos-01', 'A leaning palm over a white-sand beach and turquoise water'],
        ['amos-02', 'A small green island beyond a breaking wave'],
        ['amos-03', 'Palm trees against a bright sky'],
        ['amos-04', 'Turquoise sea and a small island seen from a white beach'],
        ['amos-05', 'Waves rolling in under a sky of white clouds'],
        ['amos-06', 'A faint rainbow over the sea, rocks in the foreground'],
      ],
    },
    isla: {
      title: 'Buhay Isla', series: 'The Last Frontier — Palawan',
      text: 'The joy of island living, surrounded by the natural beauty of the ocean and the close-knit community that calls it home.',
      frames: [
        ['isla-01', 'An outrigger boat resting in shallow water at low tide'],
        ['isla-02', 'Outrigger boats on a beach below a jungle-covered hillside'],
        ['isla-03', 'Fishermen pushing an outrigger boat onto the sand'],
        ['isla-04', 'Fishermen and a child sorting the catch on the beach'],
        ['isla-05', 'An outrigger boat on clear turquoise water near a small island'],
      ],
    },
    publications: {
      title: 'Cosmos Coffee', series: 'Publications & exhibitions',
      text: 'Photographs for the book and touring exhibition “Cosmos Coffee” — Deutsches Museum, Munich, and the Starbucks Reserve Roastery, Milan.',
      frames: [
        ['pub-01', 'An open book spread illustrated with a coffee photograph'],
        ['pub-02', 'Cover of the book Cosmos Coffee'],
        ['pub-03', 'The Cosmos Coffee exhibition at the Deutsches Museum, Munich'],
        ['pub-04', 'Framed photograph of a roaster at work, Milan'],
        ['pub-05', 'Framed photograph of drip brewing, Milan'],
      ],
    },
  };

  /* ---------- Split text into masked words / chars ---------- */
  let splitIndex = 0;
  function split(el) {
    const mode = el.dataset.split;
    splitIndex = 0;
    const walk = node => {
      [...node.childNodes].forEach(child => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(' '); return; }
            const w = document.createElement('span');
            w.className = 'w';
            if (mode === 'chars') {
              [...part].forEach(ch => {
                const i = document.createElement('span');
                i.className = 'i';
                i.style.setProperty('--i', splitIndex++);
                i.textContent = ch;
                w.append(i);
              });
            } else {
              const i = document.createElement('span');
              i.className = 'i';
              i.style.setProperty('--i', splitIndex++);
              i.textContent = part;
              w.append(i);
            }
            frag.append(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    };
    walk(el);
  }
  $$('[data-split]').forEach(split);

  /* ---------- Loader / first paint ---------- */
  const heroTitle = $('.hero__title');
  const ready = () => {
    root.classList.add('is-ready');
    heroTitle && heroTitle.classList.add('is-in');
    try { sessionStorage.setItem('mc-seen', '1'); } catch (e) {}
  };
  const loader = $('.loader');
  if (!loader || root.classList.contains('seen') || reduce) {
    if (loader) loader.hidden = true;
    requestAnimationFrame(() => requestAnimationFrame(ready));
  } else {
    const count = $('.loader__count', loader);
    const heroImg = $('.hero__media img');
    const D = 1500;
    const t0 = performance.now();
    const tick = now => {
      const p = Math.min(1, (now - t0) / D);
      count.textContent = pad(Math.round((1 - Math.pow(1 - p, 3)) * 36));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const imgReady = heroImg && heroImg.decode ? heroImg.decode().catch(() => {}) : Promise.resolve();
    Promise.all([
      new Promise(r => setTimeout(r, D + 200)),
      Promise.race([imgReady, new Promise(r => setTimeout(r, 3500))]),
    ]).then(() => {
      loader.classList.add('is-done');
      setTimeout(ready, 250);
      setTimeout(() => { loader.hidden = true; }, 1300);
    });
  }

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -10% 0px' });
  $$('.reveal, .frame, [data-split]').forEach(el => { if (el !== heroTitle) io.observe(el); });

  /* ---------- Parallax ---------- */
  const parallax = $$('[data-speed]');
  if (!reduce && parallax.length) {
    let queued = false;
    const update = () => {
      queued = false;
      const vh = innerHeight;
      parallax.forEach(el => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const offset = (r.top + r.height / 2 - vh / 2) * parseFloat(el.dataset.speed);
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      });
    };
    addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update);
    update();
  }

  /* ---------- Header: hide on scroll down, active section ---------- */
  const header = $('.site-header');
  let lastY = scrollY;
  addEventListener('scroll', () => {
    const y = scrollY;
    const hide = y > lastY && y > innerHeight * 0.5 && !root.classList.contains('menu-open');
    header.classList.toggle('is-hidden', hide);
    lastY = y;
  }, { passive: true });

  // Dark header text while a paper-toned section sits under it
  const lightSections = new Set();
  const lightIO = new IntersectionObserver(entries => {
    entries.forEach(e => e.isIntersecting ? lightSections.add(e.target) : lightSections.delete(e.target));
    header.classList.toggle('is-light', lightSections.size > 0);
  }, { rootMargin: '0px 0px -94% 0px' });
  $$('.theme-bone').forEach(s => lightIO.observe(s));

  const navLinks = $$('.site-nav a');
  const sectionIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === `#${e.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['work', 'index', 'about', 'publications', 'contact'].forEach(id => { const s = document.getElementById(id); s && sectionIO.observe(s); });

  /* ---------- Mobile menu ---------- */
  const menu = $('#menu');
  const menuBtn = $('.menu-btn');
  const setMenu = open => {
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.textContent = open ? 'Close' : 'Menu';
    root.classList.toggle('menu-open', open);
  };
  menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));

  /* ---------- Filmstrip ---------- */
  const track = $('.filmstrip__track');
  if (track) {
    const frames = ['light', 'inhabits', 'water', 'takipsilim', 'amos', 'isla']
      .flatMap(k => STORIES[k].frames.map(f => f[0]));
    const html = frames.map((name, n) =>
      `<div class="filmstrip__frame"><img src="${src(name, 600)}" alt="" loading="lazy" decoding="async" width="600" height="402">` +
      `<span class="filmstrip__code"><span>▸ ${n + 1}</span><span>${n + 1}A</span></span></div>`).join('');
    track.innerHTML = html + html;
  }

  /* ---------- Index hover preview ---------- */
  const list = $('.index__list');
  const preview = $('.index__preview');
  if (fine && list && preview) {
    const imgs = $$('img', preview);
    let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y, raf = 0;
    // Sit beside the cursor (not on top of the hovered title) and stay inside the viewport
    const aim = e => {
      const w = preview.offsetWidth, h = preview.offsetHeight;
      tx = Math.min(e.clientX + 48, innerWidth - w - 24);
      ty = Math.max(24, Math.min(e.clientY - h / 2, innerHeight - h - 24));
    };
    const loop = () => {
      x += (tx - x) * 0.14;
      y += (ty - y) * 0.14;
      const tilt = Math.max(-6, Math.min(6, (tx - x) * 0.03));
      preview.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${tilt.toFixed(2)}deg)`;
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.2 ? requestAnimationFrame(loop) : 0;
    };
    list.addEventListener('pointermove', e => {
      aim(e);
      if (!preview.classList.contains('is-on')) { x = tx; y = ty; }
      if (!raf) raf = requestAnimationFrame(loop);
    });
    $$('.index__row', list).forEach(row => {
      row.addEventListener('pointerenter', () => {
        preview.classList.add('is-on');
        imgs.forEach(im => im.classList.toggle('is-active', im.dataset.key === row.dataset.open));
      });
    });
    list.addEventListener('pointerleave', () => preview.classList.remove('is-on'));
  }

  /* ---------- Custom "View" cursor over images ---------- */
  const cursor = $('.cursor');
  if (fine && cursor) {
    root.classList.add('has-cursor');
    const label = $('span', cursor);
    let cx = -100, cy = -100, mx = -100, my = -100, craf = 0;
    const follow = () => {
      cx += (mx - cx) * 0.22;
      cy += (my - cy) * 0.22;
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      craf = Math.abs(mx - cx) + Math.abs(my - cy) > 0.2 ? requestAnimationFrame(follow) : 0;
    };
    addEventListener('pointermove', e => {
      mx = e.clientX; my = e.clientY;
      if (!cursor.classList.contains('is-on')) { cx = mx; cy = my; }
      if (!craf) craf = requestAnimationFrame(follow);
    }, { passive: true });
    document.addEventListener('pointerover', e => {
      const t = e.target.closest('[data-cursor]');
      if (t) label.textContent = t.dataset.cursor;
      cursor.classList.toggle('is-on', !!t);
    });
    document.addEventListener('pointerleave', () => cursor.classList.remove('is-on'));
  }

  /* ---------- Story viewer ---------- */
  const lb = $('.lightbox');
  const lbImg = $('.lb__img', lb);
  const lbTitle = $('.lb__title', lb);
  const lbSeries = $('.lb__series', lb);
  const lbCount = $('.lb__count', lb);
  const lbText = $('.lb__text', lb);
  const lbThumbs = $('.lb__thumbs', lb);
  const lbClose = $('.lb__close', lb);
  let story = null, at = 0, lastFocus = null;

  const show = i => {
    const n = story.frames.length;
    at = (i + n) % n;
    const [name, alt] = story.frames[at];
    lbImg.classList.remove('is-loaded');
    lbImg.onload = () => lbImg.classList.add('is-loaded');
    lbImg.sizes = '100vw';
    lbImg.srcset = srcset(name);
    lbImg.src = src(name, 1200);
    lbImg.alt = alt;
    if (lbImg.complete) lbImg.classList.add('is-loaded');
    lbCount.textContent = `${pad(at + 1)} / ${pad(n)}`;
    $$('button', lbThumbs).forEach((b, j) => b.setAttribute('aria-current', String(j === at)));
    // warm the next frame
    const next = story.frames[(at + 1) % n][0];
    const pre = new Image(); pre.src = src(next, innerWidth > 1300 ? 2400 : 1200);
  };

  const open = (key, i = 0) => {
    story = STORIES[key];
    if (!story) return;
    lastFocus = document.activeElement;
    lbTitle.textContent = story.title;
    lbSeries.textContent = story.series;
    lbText.textContent = story.text;
    lbThumbs.innerHTML = story.frames.map(([name], j) =>
      `<button type="button" aria-label="Frame ${j + 1}"><img src="${src(name, 600)}" alt=""></button>`).join('');
    $$('button', lbThumbs).forEach((b, j) => b.addEventListener('click', () => show(j)));
    show(i);
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    root.classList.add('lb-open');
    cursor && cursor.classList.remove('is-on');
    lbClose.focus({ preventScroll: true });
  };

  const close = () => {
    lb.classList.remove('is-open');
    lb.setAttribute('aria-hidden', 'true');
    root.classList.remove('lb-open');
    cursor && cursor.classList.remove('is-on');
    lastFocus && lastFocus.focus({ preventScroll: true });
  };

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-open]');
    if (!t) return;
    open(t.dataset.open, parseInt(t.dataset.at || '0', 10));
  });
  lbClose.addEventListener('click', close);
  $('.lb__nav--prev', lb).addEventListener('click', () => show(at - 1));
  $('.lb__nav--next', lb).addEventListener('click', () => show(at + 1));

  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('is-open')) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) setMenu(false);
      return;
    }
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') show(at + 1);
    else if (e.key === 'ArrowLeft') show(at - 1);
    else if (e.key === 'Tab') {
      const focusables = $$('button', lb).filter(b => b.offsetParent !== null);
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  let sx = null;
  lb.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') sx = e.clientX; });
  lb.addEventListener('pointerup', e => {
    if (sx === null) return;
    const dx = e.clientX - sx;
    sx = null;
    if (Math.abs(dx) > 50) show(at + (dx < 0 ? 1 : -1));
  });

  /* ---------- Footer year ---------- */
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();
