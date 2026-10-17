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

  /* ---------- Stories ---------- */
  const STORIES = {
    light: {
      title: 'Light', series: 'Norway',
      text: 'What I love most about film is how it handles light. These frames are about light meeting the landscape: the last sun on a ridge, rays falling into a fjord, and the texture and shadow in between.',
      frames: [
        ['light-01', 'Two figures on a ridge, silhouetted against a pale sky'],
        ['norway-cover', 'Dark headland catching the last light over a calm sea'],
        ['light-04', 'Rays of light falling into a steep green fjord'],
        ['light-05', 'Shadowed mountain ridges under bright cloud'],
      ],
    },
    inhabits: {
      title: 'Inhabits', series: 'Norway',
      text: 'Inhabits is about people and the places they live in, from the warmth of a house to the open sea. Harbours, red cabins and a ferry ride, all in natural light.',
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
      text: 'Water does something different with light every time. Fog rolling in over the coast, a rainbow over the fjord, snow on the mountains above a still bay.',
      frames: [
        ['water-01', 'Mist rolling over a coastal road and dark water'],
        ['water-03', 'Red cabins on the shore beneath a sunlit, jagged peak'],
        ['water-04', 'A rainbow over a mountain and a red cabin by the water'],
        ['water-05', 'Wide beach with dry grasses and distant mountains under cloud'],
        ['water-06', 'Snow-capped mountains above a winding coastal road'],
      ],
    },
    takipsilim: {
      title: 'Takipsilim', series: 'Palawan',
      text: 'Takipsilim is Tagalog for dusk, the time of day everyone waits for. The sun goes down and the sky over Palawan turns gold, pink and violet.',
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
      title: 'Amos', series: 'Palawan',
      text: 'Amos is a Cuyunon word for “let’s go”. Growing up in a big family, it meant we were heading to the beach for the weekend. Coconuts, white sand, and that one word still brings it all back.',
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
      title: 'Buhay Isla', series: 'Palawan',
      text: 'Buhay isla means island life. Fishermen bringing in the catch, boats pulled up on the sand, and the close-knit community that calls the island home.',
      frames: [
        ['isla-01', 'An outrigger boat resting in shallow water at low tide'],
        ['isla-02', 'Outrigger boats on a beach below a jungle-covered hillside'],
        ['isla-03', 'Fishermen pushing an outrigger boat onto the sand'],
        ['isla-04', 'Fishermen and a child sorting the catch on the beach'],
        ['isla-05', 'An outrigger boat on clear turquoise water near a small island'],
      ],
    },
    venice: {
      title: 'Venice', series: 'Italy',
      text: 'Two rolls of film in Venice: the Grand Canal from the Rialto bridge, the Bridge of Sighs, gondolas facing San Giorgio Maggiore, and the quieter side canals, some of them from a gondola. And yes, that bell tower really does lean.',
      frames: [
        ['venice-01', 'Gondolas moored in front of San Giorgio Maggiore'],
        ['venice-02', 'Vaporetto, gondola and water taxi on the Grand Canal, seen from the Rialto bridge'],
        ['venice-03', 'Boats and red awnings along the Grand Canal'],
        ['venice-04', 'Gondolas passing under the Bridge of Sighs'],
        ['venice-05', 'A side canal with a leaning bell tower and the wake of a boat'],
        ['venice-06', 'A narrow canal seen from the bow of a gondola'],
        ['venice-07', 'A narrow canal with striped mooring poles'],
        ['venice-08', 'A weathered facade with gothic windows above a moored boat'],
        ['venice-09', 'A gothic staircase and arcades under a skylight'],
      ],
    },
    publications: {
      title: 'Cosmos Coffee', series: 'Publications & exhibitions',
      text: 'Photographs for the book and the touring exhibition “Cosmos Coffee” at the Deutsches Museum in Munich, including two taken at the Starbucks Reserve Roastery in Milan.',
      frames: [
        ['pub-01', 'An open book spread illustrated with a coffee photograph'],
        ['pub-02', 'Cover of the book Cosmos Coffee'],
        ['pub-03', 'The Cosmos Coffee exhibition at the Deutsches Museum, Munich'],
        ['pub-04', 'Framed photograph of a roaster at work, Milan'],
        ['pub-05', 'Framed photograph of drip brewing, Milan'],
      ],
    },
  };

  /* ---------- Visit counter events (assets/js/count.js; no-op when not connected) ---------- */
  const trackEvent = (type, detail) => {
    try { if (typeof window.mcTrack === 'function') window.mcTrack(type, detail); } catch (e) {}
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
    const heroImg = $('.hero img');
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
        // Measure the element's untransformed position by removing the offset applied last frame
        const r = el.getBoundingClientRect();
        const prev = el._offset || 0;
        const top = r.top - prev;
        if (top + r.height < -200 || top > vh + 200) return;
        const offset = (top + r.height / 2 - vh / 2) * parseFloat(el.dataset.speed);
        el._offset = offset;
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      });
    };
    addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update);
    update();
  }

  /* ---------- Depth: pinned scenes recede as the next sheet slides over them ---------- */
  const pins = $$('.pin').map(pin => ({ pin, sheet: pin.nextElementSibling, videos: $$('video.living', pin), p: -1 }));
  if (pins.length) {
    let queued = false;
    const updatePins = () => {
      queued = false;
      const vh = innerHeight;
      pins.forEach(o => {
        if (!o.sheet) return;
        const p = Math.min(1, Math.max(0, (vh - o.sheet.getBoundingClientRect().top) / vh));
        if (p === o.p) return;
        o.p = p;
        if (!reduce) o.pin.style.setProperty('--p', p.toFixed(3));
        // Nothing to see once fully covered: stop decoding video behind the sheet
        o.videos.forEach(v => {
          if (p >= 0.999) v.pause();
          else if (v.dataset.loaded && v.dataset.visible && v.paused) v.play().catch(() => {});
        });
      });
    };
    addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(updatePins); } }, { passive: true });
    addEventListener('resize', updatePins);
    updatePins();
  }

  /* ---------- Living stills: load and play only while on screen ---------- */
  const conn = navigator.connection || {};
  // Skip the motion on data-saver or slow mobile connections; the photographs remain
  const saveData = conn.saveData || /(^|-)2g|3g/.test(conn.effectiveType || '');
  const videos = $$('video.living');
  if (!reduce && !saveData && videos.length) {
    const pick = v => {
      const sizes = (v.dataset.sizes || '1080,720').split(',').map(Number);
      const need = v.parentElement.getBoundingClientRect().width * (devicePixelRatio || 1);
      return `${v.dataset.video}-${sizes.includes(1080) && need > 1400 ? 1080 : 720}.mp4`;
    };
    const vio = new IntersectionObserver(entries => entries.forEach(e => {
      const v = e.target;
      v.dataset.visible = e.isIntersecting ? '1' : '';
      if (e.isIntersecting) {
        if (!v.dataset.loaded) { v.muted = true; v.src = pick(v); v.dataset.loaded = '1'; }
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    }), { rootMargin: '200px 0px' });
    videos.forEach(v => {
      v.addEventListener('playing', () => v.classList.add('is-playing'), { once: true });
      v.addEventListener('error', () => v.remove());
      vio.observe(v);
    });
  }

  /* ---------- Header: hide on scroll down, active section ---------- */
  const header = $('.site-header');
  let lastY = scrollY;
  addEventListener('scroll', () => {
    const y = scrollY;
    const hide = y > lastY && y > innerHeight * 0.5 && !root.classList.contains('menu-open');
    header.classList.toggle('is-hidden', hide);
    header.classList.toggle('is-scrolled', y > innerHeight * 0.85);
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
    const frames = ['light', 'inhabits', 'water', 'takipsilim', 'amos', 'isla', 'venice']
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
    trackEvent('story', key);
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
  $('.lb__prev', lb).addEventListener('click', () => show(at - 1));
  $('.lb__next', lb).addEventListener('click', () => show(at + 1));

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

  /* Outbound clicks: email, Instagram, Amazon */
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    const to = href.startsWith('mailto:') ? 'email' : /instagram\.com/.test(href) ? 'instagram' : /amazon\./.test(href) ? 'amazon' : '';
    if (to) trackEvent('out', to);
  });

  /* ---------- Footer year ---------- */
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();
