/* Visitors page: frame counter, contact sheet, dot map, rankings.
   Numbers come from the Apps Script web app (window.mcApi, set by count.js). */
(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const root = $('.stats');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = n => Number(n).toLocaleString('en-US');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const BASELINE = 2149;

  const country = (() => {
    try {
      const dn = new Intl.DisplayNames(['en'], { type: 'region' });
      return cc => { try { return dn.of(cc) || cc; } catch (e) { return cc; } };
    } catch (e) { return cc => cc; }
  })();
  const zoneCity = tz => tz.split('/').pop().replace(/_/g, ' ');

  // Album titles and covers; replaced by assets/data/stories.json when it loads
  let STORY = {
    light: ['Light', 'light-01'], inhabits: ['Inhabits', 'inhabits-01'], water: ['Water', 'water-03'],
    takipsilim: ['Takipsilim', 'takipsilim-06'], amos: ['Amos', 'amos-01'], isla: ['Buhay Isla', 'isla-03'],
    venice: ['Venice', 'venice-01'], publications: ['Cosmos Coffee', 'pub-02'],
  };
  const FRAMES = ['light-01', 'norway-cover', 'light-04', 'light-05', 'inhabits-01', 'inhabits-03', 'hero', 'inhabits-05',
    'inhabits-06', 'water-01', 'water-03', 'water-04', 'water-05', 'water-06', 'takipsilim-01', 'takipsilim-02',
    'takipsilim-03', 'takipsilim-04', 'takipsilim-05', 'takipsilim-06', 'amos-01', 'amos-02', 'amos-03', 'amos-04',
    'amos-05', 'amos-06', 'isla-01', 'isla-02', 'isla-03', 'isla-04', 'isla-05',
    'venice-01', 'venice-02', 'venice-03', 'venice-04', 'venice-05', 'venice-06', 'venice-07', 'venice-08', 'venice-09'];
  const REFS = { instagram: 'Instagram', google: 'Google', search: 'Other search engines', facebook: 'Facebook',
    pinterest: 'Pinterest', direct: 'Direct or bookmark', other: 'Other websites' };

  // Frame number handed over by the footer link: stats.html#you=2154&new=DE
  const hash = new URLSearchParams(location.hash.slice(1));
  let you = Number(hash.get('you')) || 0;
  let isNew = (hash.get('new') || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
  const myTz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; } })();

  /* ---------- Tooltip ---------- */
  const tip = $('[data-tip]');
  const showTip = (html, x, y) => {
    tip.innerHTML = html;
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    tip.style.transform = `translate(${Math.min(Math.max(8, x - r.width / 2), innerWidth - r.width - 8)}px, ${Math.max(8, y - r.height - 14)}px)`;
  };
  const hideTip = () => { tip.hidden = true; };
  const bindTip = (el, html) => {
    el.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') showTip(html, e.clientX, e.clientY); });
    el.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') showTip(html, e.clientX, e.clientY); });
    el.addEventListener('pointerleave', hideTip);
    el.addEventListener('focus', () => { const r = el.getBoundingClientRect(); showTip(html, r.left + r.width / 2, r.top); });
    el.addEventListener('blur', hideTip);
  };
  addEventListener('scroll', hideTip, { passive: true });

  /* ---------- Frame counter ---------- */
  const countEl = $('[data-count]');
  let shown = BASELINE;
  const animateCount = to => {
    const from = shown;
    shown = to;
    if (reduce || to <= from) { countEl.textContent = fmt(to); return; }
    const t0 = performance.now(), D = 1800;
    const step = now => {
      const p = Math.min(1, (now - t0) / D);
      countEl.textContent = fmt(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const renderYou = () => {
    const el = $('[data-you]');
    if (!you) return;
    let html = `You’re frame <em>N° ${fmt(you)}.</em>`;
    if (you % 36 === 0) html += ` You finished roll ${fmt(you / 36)}.`;
    if (isNew) html += ` You put ${esc(country(isNew))} on the map.`;
    el.innerHTML = html;
    el.hidden = false;
  };

  /* ---------- Contact sheet: 36 frames per roll ---------- */
  const renderSheet = total => {
    const roll = Math.ceil(total / 36);
    const inRoll = total - (roll - 1) * 36;
    const first = (roll - 1) * 36 + 1;
    $('[data-roll-label]').textContent = `Roll ${fmt(roll)} · ${inRoll} of 36 · ${fmt(roll - 1)} developed`;
    let html = '';
    for (let s = 0; s < 6; s++) {
      html += '<div class="cs__strip">';
      for (let f = 0; f < 6; f++) {
        const k = s * 6 + f + 1;
        const n = first + k - 1;
        const exposed = k <= inRoll;
        const mine = you && n === you;
        html += `<div class="cs__frame${exposed ? ' is-exposed' : ''}${mine ? ' is-you' : ''}" style="--k:${k}">` +
          (exposed ? `<img src="assets/img/${FRAMES[(n - 1) % FRAMES.length]}-600.jpg" alt="" loading="lazy" decoding="async">` : '') +
          `<span class="cs__num">${mine ? 'You' : `▸ ${k}`}</span></div>`;
      }
      html += '</div>';
    }
    const sheet = $('[data-sheet]');
    sheet.innerHTML = html;
    sheet.setAttribute('role', 'img');
    sheet.setAttribute('aria-label', `Roll ${roll}: ${inRoll} of 36 frames exposed`);
    requestAnimationFrame(() => sheet.classList.add('is-in'));
  };

  /* ---------- Map ---------- */
  const mapEl = $('[data-map]');
  const pinsEl = $('[data-pins]');
  let land = null, zones = null;

  const drawDots = () => {
    if (!land) return;
    const canvas = $('canvas', mapEl);
    const w = mapEl.clientWidth;
    const h = Math.round(w * land.rows / land.cols);
    mapEl.style.height = `${h}px`;
    const dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cw = w / land.cols, ch = h / land.rows;
    const r = Math.max(0.6, Math.min(cw, ch) * 0.3);
    ctx.fillStyle = 'rgba(236, 231, 222, 0.2)';
    ctx.beginPath();
    land.mask.forEach((hex, row) => {
      for (let i = 0; i < hex.length; i++) {
        const nib = parseInt(hex[i], 16);
        if (!nib) continue;
        for (let b = 0; b < 4; b++) {
          if (!(nib & (8 >> b))) continue;
          const col = i * 4 + b;
          if (col >= land.cols) continue;
          const x = (col + 0.5) * cw, y = (row + 0.5) * ch;
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, Math.PI * 2);
        }
      }
    });
    ctx.fill();
  };
  const place = (lat, lon) => ({
    left: ((lon - land.lon0) / 360) * 100,
    top: (((land.lat0 - lat) / land.step + 0.5) / land.rows) * 100,
  });

  const buildPins = data => {
    const mainZone = {};
    Object.keys(zones).forEach(z => { const cc = zones[z][0]; if (!mainZone[cc]) mainZone[cc] = z; });
    const pins = {};
    const shownInCountry = {};
    Object.entries(data.regions || {}).forEach(([tz, v]) => {
      if (!zones[tz]) return;
      const cc = zones[tz][0];
      pins[tz] = { tz, cc, v };
      shownInCountry[cc] = (shownInCountry[cc] || 0) + v;
    });
    Object.entries(data.countries || {}).forEach(([cc, c]) => {
      const rest = c.v - (shownInCountry[cc] || 0);
      if (rest <= 0) return;
      const own = Object.values(pins).filter(p => p.cc === cc).sort((a, b) => b.v - a.v)[0];
      if (own) own.v += rest;
      else if (mainZone[cc]) pins[mainZone[cc]] = { tz: mainZone[cc], cc, v: rest };
    });
    return Object.values(pins).sort((a, b) => b.v - a.v);
  };

  let selectCountry = () => {};
  const renderMap = data => {
    const pins = buildPins(data);
    const max = Math.max(1, ...pins.map(p => p.v));
    const recentCc = data.recent && data.recent[0] && data.recent[0].cc;
    const multi = {};
    pins.forEach(p => { multi[p.cc] = (multi[p.cc] || 0) + 1; });
    pinsEl.innerHTML = '';
    pins.forEach((p, i) => {
      const [, lat, lon] = zones[p.tz];
      const pos = place(lat, lon);
      const size = 8 + 18 * Math.sqrt(p.v / max);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `mpin${p.cc === recentCc && i === pins.findIndex(q => q.cc === recentCc) ? ' is-recent' : ''}`;
      b.style.cssText = `left:${pos.left}%;top:${pos.top}%;--s:${size.toFixed(1)}px;--i:${i}`;
      const where = multi[p.cc] > 1 ? `${country(p.cc)}, ${zoneCity(p.tz)}` : country(p.cc);
      b.setAttribute('aria-label', `${where}: ${p.v} visits`);
      b.dataset.cc = p.cc;
      bindTip(b, `${esc(where)} · ${fmt(p.v)}`);
      b.addEventListener('click', () => selectCountry(p.cc));
      pinsEl.appendChild(b);
    });
    // "You are here", from this browser's own time zone (nothing is sent for this)
    if (zones[myTz]) {
      const pos = place(zones[myTz][1], zones[myTz][2]);
      const me = document.createElement('span');
      me.className = 'mpin-you mono';
      me.style.cssText = `left:${pos.left}%;top:${pos.top}%`;
      me.textContent = 'You';
      me.setAttribute('aria-hidden', 'true');
      pinsEl.appendChild(me);
    }
    // On narrow screens the map scrolls sideways: start on the busiest point
    const scroller = $('[data-map-scroll]');
    if (pins[0] && scroller.scrollWidth > scroller.clientWidth) {
      const pos = place(zones[pins[0].tz][1], zones[pins[0].tz][2]);
      scroller.scrollLeft = (pos.left / 100) * scroller.scrollWidth - scroller.clientWidth / 2;
    }
    requestAnimationFrame(() => mapEl.classList.add('is-in'));
  };

  /* ---------- Lists ---------- */
  const bar = (v, max) => `<span class="bar" aria-hidden="true"><span style="width:${max ? Math.max(1.5, (v / max) * 100) : 0}%"></span></span>`;

  const renderCountries = data => {
    const list = $('[data-countries-list]');
    const tracked = Object.values(data.countries || {}).reduce((s, c) => s + c.v, 0);
    const rows = Object.entries(data.countries || {}).sort((a, b) => b[1].v - a[1].v);
    const max = rows.length ? rows[0][1].v : 0;
    list.innerHTML = rows.map(([cc, c], i) =>
      `<li><button type="button" class="rank__row" data-cc="${esc(cc)}">` +
      `<span class="rank__n">${String(i + 1).padStart(2, '0')}</span>` +
      `<span class="rank__name">${esc(country(cc))}</span>${bar(c.v, max)}` +
      `<span class="rank__v">${fmt(c.v)}</span></button></li>`).join('') ||
      '<li class="mono label">No visits with a known location yet.</li>';
    list.querySelectorAll('[data-cc]').forEach(b => b.addEventListener('click', () => selectCountry(b.dataset.cc, true)));
    $('[data-countries]').textContent = fmt(rows.length);

    const panel = $('[data-panel]');
    selectCountry = (cc, fromList) => {
      const c = data.countries[cc];
      if (!c) return;
      const tzs = Object.entries(data.regions || {}).filter(([tz]) => zones[tz] && zones[tz][0] === cc).sort((a, b) => b[1] - a[1]);
      const first = new Date(c.first).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      panel.innerHTML =
        `<h3 class="panel__title">${esc(country(cc))}</h3>` +
        `<dl class="mono panel__facts">` +
        `<dt>Visits</dt><dd>${fmt(c.v)}${tracked ? ` · ${Math.round((c.v / tracked) * 100)}%` : ''}</dd>` +
        `<dt>First visit</dt><dd>${esc(first)}</dd>` +
        (c.top && STORY[c.top] ? `<dt>Most opened</dt><dd>${esc(STORY[c.top][0])}</dd>` : '') +
        (tzs.length > 1 ? `<dt>Regions</dt><dd>${tzs.map(([tz, v]) => `${esc(zoneCity(tz))} ${fmt(v)}`).join(', ')}</dd>` : '') +
        `</dl>`;
      pinsEl.querySelectorAll('.mpin').forEach(p => p.classList.toggle('is-active', p.dataset.cc === cc));
      list.querySelectorAll('.rank__row').forEach(r => r.setAttribute('aria-pressed', String(r.dataset.cc === cc)));
      if (fromList) panel.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    };
  };

  const renderStories = data => {
    const s = data.stories || {};
    const rows = Object.keys(STORY).map(k => [k, s[k] || 0]).sort((a, b) => b[1] - a[1]);
    const max = rows[0][1];
    $('[data-stories]').innerHTML = rows.map(([k, v], i) =>
      `<li class="board__row${i === 0 && v ? ' is-top' : ''}">` +
      `<span class="rank__n">${String(i + 1).padStart(2, '0')}</span>` +
      (STORY[k][1] ? `<img src="assets/img/${esc(STORY[k][1])}-600.jpg" alt="" loading="lazy" decoding="async">` : '<span></span>') +
      `<span class="board__title">${esc(STORY[k][0])}</span>` +
      `<span class="rank__v">${fmt(v)}</span>${bar(v, max)}</li>`).join('');
  };

  const renderRefs = data => {
    const refs = data.refs || {};
    const rows = Object.entries(refs).sort((a, b) => b[1] - a[1]);
    const sum = rows.reduce((t, r) => t + r[1], 0);
    const max = rows.length ? rows[0][1] : 0;
    $('[data-refs]').innerHTML = rows.map(([k, v]) =>
      `<li class="rank__row"><span class="rank__name">${esc(REFS[k] || k)}</span>${bar(v, max)}` +
      `<span class="rank__v">${sum ? Math.round((v / sum) * 100) : 0}%</span></li>`).join('') ||
      '<li class="mono label">Nothing yet.</li>';
    const d = data.devices || {};
    const all = (d.mobile || 0) + (d.desktop || 0);
    $('[data-devices]').textContent = all
      ? `${Math.round((d.mobile / all) * 100)}% on a phone, ${Math.round((d.desktop / all) * 100)}% on a computer`
      : '';
  };

  const renderDays = data => {
    const days = data.days || [];
    const max = Math.max(1, ...days.map(d => d.v));
    const sum = days.reduce((t, d) => t + d.v, 0);
    $('[data-days-total]').textContent = `${fmt(sum)} visits`;
    const label = d => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const chart = $('[data-days]');
    chart.setAttribute('aria-label', `Visits per day over the last 30 days, ${fmt(sum)} in total. A table version follows.`);
    chart.innerHTML =
      `<span class="days__max mono">${fmt(max)}</span>` +
      `<div class="days__bars">${days.map((d, i) =>
        `<span class="days__bar${i === days.length - 1 ? ' is-today' : ''}" data-i="${i}"><span style="height:${(d.v / max) * 100}%"></span></span>`).join('')}</div>` +
      `<div class="days__axis mono"><span>${esc(label(days[0].d))}</span><span>Today</span></div>`;
    chart.querySelectorAll('.days__bar').forEach(b => {
      const d = days[Number(b.dataset.i)];
      bindTip(b, `${esc(label(d.d))} · ${fmt(d.v)} ${d.v === 1 ? 'visit' : 'visits'}`);
    });
    $('[data-days-table]').innerHTML = days.slice().reverse().map(d => `<tr><td>${esc(label(d.d))}</td><td>${fmt(d.v)}</td></tr>`).join('');
  };

  const renderRecent = data => {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const ago = t => {
      const s = (new Date(t).getTime() - Date.now()) / 1000;
      const units = [['day', 86400], ['hour', 3600], ['minute', 60]];
      for (const [u, n] of units) if (Math.abs(s) >= n) return rtf.format(Math.round(s / n), u);
      return 'just now';
    };
    $('[data-recent]').innerHTML = (data.recent || []).map(r =>
      `<li><span>${esc(r.cc ? country(r.cc) : 'Somewhere')}</span><span class="mono label">${esc(ago(r.t))}</span></li>`).join('') ||
      '<li class="mono label">No visits recorded yet.</li>';
  };

  const renderMilestone = total => {
    const steps = [2500, 3000, 4000, 5000, 7500, 10000, 15000, 20000, 25000, 50000, 100000, 250000, 500000, 1000000];
    const next = steps.find(s => s > total) || Math.ceil((total + 1) / 1e6) * 1e6;
    const prev = steps.filter(s => s <= total).pop() || BASELINE;
    $('[data-milestone]').textContent = fmt(next);
    $('[data-milestone-note]').textContent = `${fmt(next - total)} visits to go`;
    requestAnimationFrame(() => { $('[data-progress]').style.width = `${Math.min(100, ((total - prev) / (next - prev)) * 100)}%`; });
  };

  /* ---------- Load ---------- */
  const getJSON = url => fetch(url, { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
  const status = $('[data-status]');
  const assets = Promise.all([
    getJSON('assets/data/land.json'),
    getJSON('assets/data/tz.json'),
    getJSON('assets/data/stories.json').catch(() => null),
  ]).then(([l, t, st]) => {
    land = l; zones = t.zones; drawDots();
    if (st && Array.isArray(st.stories) && st.stories.length) {
      STORY = {};
      st.stories.forEach(a => { if (a.key && a.title) STORY[a.key] = [a.title, a.cover || '']; });
    }
  });

  renderSheet(Math.max(BASELINE, you));
  renderYou();
  renderMilestone(Math.max(BASELINE, you));

  const API = window.mcApi;
  if (!API) {
    root.dataset.state = 'offline';
    status.textContent = 'Live numbers are not connected yet.';
    assets.catch(() => {});
    return;
  }

  Promise.all([
    assets,
    (window.mcVisit || Promise.resolve(null)).then(v => {
      if (v && v.frame && !you) you = v.frame;
      if (v && v.firstFrom && !isNew) isNew = v.firstFrom;
      return getJSON(`${API}?q=stats`);
    }),
  ]).then(([, data]) => {
    const total = Math.max(data.total || BASELINE, you);
    root.dataset.state = 'ready';
    status.textContent = `Updated ${new Date(data.updated || Date.now()).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
    animateCount(total);
    renderYou();
    renderSheet(total);
    renderMap(data);
    renderCountries(data);
    renderStories(data);
    renderRefs(data);
    renderDays(data);
    renderRecent(data);
    renderMilestone(total);
    const top = Object.entries(data.countries || {}).sort((a, b) => b[1].v - a[1].v)[0];
    if (top) selectCountry(top[0]);
  }).catch(() => {
    root.dataset.state = 'error';
    status.textContent = 'Could not load the numbers right now.';
  });

  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(drawDots, 150); });
})();
