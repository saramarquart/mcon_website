/* Visit counter. Cookieless and storage-free; does nothing until <meta name="mc-stats"> holds the
   Google Apps Script web app URL (see stats-backend/Code.gs). */
(() => {
  'use strict';

  const meta = document.querySelector('meta[name="mc-stats"]');
  const API = meta ? meta.content.trim() : '';
  window.mcTrack = () => {};
  window.mcVisit = Promise.resolve(null);
  window.mcApi = API;
  if (!API) return;

  // Respect "Do Not Track" and "Global Privacy Control"
  const optOut = navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1';

  const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; } })();
  const lang = (navigator.language || '').slice(0, 2).toLowerCase();
  const device = matchMedia('(pointer: coarse)').matches ? 'mobile' : 'desktop';
  const page = (() => {
    const last = location.pathname.slice(location.pathname.lastIndexOf('/'));
    return last === '/' || last === '/index.html' ? '/' : last;
  })();
  // A visit starts when someone arrives from outside; clicks between pages are page views
  const refHost = (() => { try { return new URL(document.referrer).hostname; } catch (e) { return ''; } })();
  const internal = refHost && refHost === location.hostname;

  // Plain POST (text/plain, no preflight). If it fails, e.g. on a browser that trips over the
  // Apps Script redirect, fall back to a one-way beacon so the visit is still counted.
  const post = body => {
    const payload = JSON.stringify(Object.assign({ tz, lang, device, page }, body));
    return fetch(API, { method: 'POST', body: payload })
      .then(r => r.json())
      .catch(() => {
        try { if (navigator.sendBeacon) navigator.sendBeacon(API, payload); } catch (e) {}
        return null;
      });
  };

  if (!optOut) {
    window.mcTrack = (t, d) => { post({ t, d }); };
    window.mcVisit = post(internal ? { t: 'view' } : { t: 'visit', ref: refHost });
  }

  // Tiny footer counter, linking to the stats page with this visitor's frame number
  const links = document.querySelectorAll('a.visitors');
  if (!links.length) return;
  window.mcVisit
    .then(res => (res && res.frame ? res : fetch(API + '?q=total').then(r => r.json()).catch(() => null)))
    .then(res => {
      const total = res && (res.frame || res.total);
      if (!total) return;
      links.forEach(a => {
        const n = a.querySelector('[data-visitors]');
        if (n) n.textContent = Number(total).toLocaleString('en-US');
        if (res.frame) a.href = `stats.html#you=${res.frame}${res.firstFrom ? `&new=${res.firstFrom}` : ''}`;
        a.hidden = false;
      });
    });
})();
