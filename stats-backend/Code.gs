/**
 * Visitor statistics for palawanbeachclub.com
 *
 * A Google Apps Script web app that lives inside a Google Sheet. It stores anonymous
 * visit events as rows in the sheet and serves aggregated numbers to the public
 * stats page (stats.html).
 *
 * Setup (once):
 *   1. Create a new Google Sheet.
 *   2. Extensions → Apps Script. Replace everything in Code.gs with this file. Save.
 *   3. Deploy → New deployment → type "Web app".
 *      Execute as: Me.  Who has access: Anyone.  → Deploy, allow access.
 *   4. Copy the web app URL (ends in /exec) into the site's <meta name="mc-stats">.
 *   After editing this file later: Deploy → Manage deployments → edit → Version: New version.
 *
 * Stored per event: time, type, page, detail (story or link), time zone, country
 * (derived from the time zone), browser language, referring domain, device type.
 * No IP addresses, no cookies, no personal identifiers.
 *
 * Warm-up: besides real visits, the script mixes in simulated background visits
 * (see SIM_PER_DAY and SIM_PLACES below). They are marked "sim" in the last column.
 * Set SIM_PER_DAY = 0 to stop them.
 *
 * Albums come from the site's album list (assets/data/stories.json). Albums that existed on
 * the old site get a share of OLD_SITE_OPEN_RATE × BASELINE story opens; newer albums start
 * at 0 and grow with (simulated) visits. Set OLD_SITE_OPEN_RATE = 0 to remove the starting counts.
 */

const BASELINE = 2149;       // visits counted on the old site before the move
const KEEP_DAYS = 730;       // raw events older than this are deleted
const MIN_REGION = 3;        // a time-zone region is only shown publicly from this many visits
const MAX_PER_MINUTE = 120;  // simple flood protection
const SHEET_NAME = 'events';
const HEADER = ['time', 'type', 'page', 'detail', 'timezone', 'country', 'language', 'referrer', 'device', 'source'];

const TYPES = { visit: 1, view: 1, story: 1, out: 1 };
const SITE = 'https://www.palawanbeachclub.com/';
const MOVED_ON = '2026-10-17';      // albums added before this date existed on the old site
const OLD_SITE_OPEN_RATE = 0.28;    // share of old-site visits that opened an album
// Fallback if the album list can't be loaded
const DEFAULT_ALBUMS = [
  { key: 'light', place: 'Norway', added: '2023-01-01', weight: 1.1 },
  { key: 'inhabits', place: 'Norway', added: '2023-01-01', weight: 1 },
  { key: 'water', place: 'Norway', added: '2023-01-01', weight: 1.05 },
  { key: 'takipsilim', place: 'Palawan', added: '2023-01-01', weight: 1.3 },
  { key: 'amos', place: 'Palawan', added: '2023-01-01', weight: 1.45 },
  { key: 'isla', place: 'Palawan', added: '2023-01-01', weight: 1.2 },
  { key: 'venice', place: 'Italy', added: '2026-10-17', weight: 1.15 },
  { key: 'azure', place: 'Greece', added: '2026-10-17', weight: 1.1 },
  { key: 'publications', place: 'Publications', added: '2023-01-01', weight: 0.55 },
];
const LINKS = { email: 1, instagram: 1, amazon: 1 };
const PAGES = { '/': 1, '/imprint.html': 1, '/privacy.html': 1, '/stats.html': 1 };

/* ---------- Web app endpoints ---------- */

function doPost(e) {
  let d;
  try {
    d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false });
  }
  const type = TYPES[d.t] ? d.t : '';
  if (!type || !allow_()) return json_({ ok: false });

  const tz = normTz_(d.tz);
  const cc = tz ? TZ_CC[tz] : '';
  const page = PAGES[d.page] ? d.page : 'other';
  const detail = type === 'story' ? (albumKeys_()[d.d] ? d.d : '')
    : type === 'out' ? (LINKS[d.d] ? d.d : '') : '';
  const lang = /^[a-z]{2,3}$/.test(d.lang || '') ? d.lang : '';
  const ref = refDomain_(d.ref);
  const device = d.device === 'mobile' ? 'mobile' : 'desktop';

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    simulate_();
    sheet_().appendRow([new Date(), type, page, detail, tz, cc, lang, ref, device, '']);
    const out = { ok: true };
    if (type === 'visit') {
      const props = PropertiesService.getScriptProperties();
      const n = Number(props.getProperty('visits') || 0) + 1;
      props.setProperty('visits', String(n));
      out.frame = BASELINE + n;
      if (cc) {
        const seen = (props.getProperty('countries') || '').split(',').filter(String);
        if (seen.indexOf(cc) === -1) {
          seen.push(cc);
          props.setProperty('countries', seen.join(','));
          out.firstFrom = cc;
        }
      }
    }
    if (Math.random() < 0.02) prune_();
    return json_(out);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  if (simDue_()) {
    const lock = LockService.getScriptLock();
    if (lock.tryLock(10000)) {
      try { simulate_(); } finally { lock.releaseLock(); }
    }
  }
  const q = (e && e.parameter && e.parameter.q) || 'total';
  if (q === 'stats') {
    const cache = CacheService.getScriptCache();
    const hit = cache.get('stats');
    if (hit) return text_(hit);
    const body = JSON.stringify(stats_());
    cache.put('stats', body, 60);
    return text_(body);
  }
  return json_({ total: BASELINE + visits_() });
}

/* ---------- Aggregation for the public stats page ---------- */

function stats_() {
  const sh = sheet_();
  const n = sh.getLastRow() - 1;
  const rows = n > 0 ? sh.getRange(2, 1, n, HEADER.length).getValues() : [];
  const now = new Date();

  const countries = {};
  const regions = {};
  const stories = {};
  const refs = {};
  const devices = { mobile: 0, desktop: 0 };
  const perDay = {};
  const recent = [];
  let tracked = 0;

  rows.forEach(r => {
    const time = new Date(r[0]);
    const type = r[1], detail = r[3], tz = r[4], cc = r[5], ref = r[7], device = r[8];
    if (type === 'visit') {
      tracked++;
      const day = Utilities.formatDate(time, 'UTC', 'yyyy-MM-dd');
      perDay[day] = (perDay[day] || 0) + 1;
      if (cc) {
        const c = countries[cc] || (countries[cc] = { v: 0, first: time.toISOString(), opens: {} });
        c.v++;
      }
      if (tz) regions[tz] = (regions[tz] || 0) + 1;
      const g = refGroup_(ref);
      refs[g] = (refs[g] || 0) + 1;
      devices[device === 'mobile' ? 'mobile' : 'desktop']++;
      recent.push({ cc: cc || '', t: Utilities.formatDate(time, 'UTC', "yyyy-MM-dd'T'HH:mm':00Z'") });
    } else if (type === 'story' && detail) {
      stories[detail] = (stories[detail] || 0) + 1;
      if (cc && countries[cc]) countries[cc].opens[detail] = (countries[cc].opens[detail] || 0) + 1;
    }
  });

  Object.keys(countries).forEach(cc => {
    const opens = countries[cc].opens;
    const top = Object.keys(opens).sort((a, b) => opens[b] - opens[a])[0];
    countries[cc].top = top || '';
    delete countries[cc].opens;
  });
  Object.keys(regions).forEach(tz => { if (regions[tz] < MIN_REGION) delete regions[tz]; });
  const base = albumBaseline_();
  Object.keys(base).forEach(k => { stories[k] = (stories[k] || 0) + base[k]; });

  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = Utilities.formatDate(new Date(now.getTime() - i * 864e5), 'UTC', 'yyyy-MM-dd');
    days.push({ d: d, v: perDay[d] || 0 });
  }

  return {
    total: BASELINE + visits_(),
    baseline: BASELINE,
    tracked: tracked,
    countries: countries,
    regions: regions,
    stories: stories,
    refs: refs,
    devices: devices,
    days: days,
    recent: recent.slice(-8).reverse(),
    updated: now.toISOString()
  };
}

/* ---------- Warm-up: simulated background visits ---------- */

const SIM_PER_DAY = 1.75;          // average simulated visits per day; 0 switches them off
// [time zone or place, share in %, browser language, share on phones]
const SIM_PLACES = [
  ['Europe/Berlin', 50, 'de', 0.55],
  ['Asia/Manila/Puerto_Princesa', 20, 'en', 0.78],
  ['Asia/Manila', 20, 'en', 0.75],
  ['America/Los_Angeles/San_Francisco', 3.4, 'en', 0.6],
  ['America/Los_Angeles', 1, 'en', 0.6],
  ['America/Los_Angeles/Seattle', 0.6, 'en', 0.6],
  ['America/New_York', 1.2, 'en', 0.6],
  ['America/Toronto', 0.5, 'en', 0.6],
  ['America/Vancouver', 0.3, 'en', 0.6],
  ['Asia/Dubai', 1.5, 'en', 0.7],
  ['Asia/Riyadh', 0.8, 'ar', 0.7],
  ['Asia/Qatar', 0.7, 'en', 0.7],
];
const SIM_CC = { 'Asia/Manila/Puerto_Princesa': 'PH', 'America/Los_Angeles/San_Francisco': 'US', 'America/Los_Angeles/Seattle': 'US' };
// how likely a visit is at each local hour (0–23)
const SIM_HOURS = [0.12, 0.08, 0.05, 0.05, 0.05, 0.1, 0.25, 0.5, 0.7, 0.8, 0.85, 0.9,
  0.95, 0.9, 0.85, 0.85, 0.9, 0.95, 1, 1, 1, 0.95, 0.7, 0.35];

function simDue_() {
  if (!(SIM_PER_DAY > 0)) return false;
  const last = Number(PropertiesService.getScriptProperties().getProperty('simLast') || 0);
  return !last || Date.now() - last >= 15 * 60000;
}

// Catch up on the simulated visits since the last call. The caller holds the script lock.
function simulate_() {
  if (!simDue_()) return;
  const props = PropertiesService.getScriptProperties();
  const now = Date.now();
  const last = Number(props.getProperty('simLast') || 0);
  props.setProperty('simLast', String(now));
  if (!last) return;

  const n = poisson_(SIM_PER_DAY * (now - last) / 864e5);
  if (!n) return;
  const rows = [];
  const seen = (props.getProperty('countries') || '').split(',').filter(String);
  for (let i = 0; i < n; i++) {
    const place = weighted_(SIM_PLACES.map(p => [p, p[1]]));
    const tz = place[0];
    const cc = SIM_CC[tz] || TZ_CC[tz] || '';
    const t = simTime_(last, now, tz);
    const device = Math.random() < place[3] ? 'mobile' : 'desktop';
    rows.push([new Date(t), 'visit', '/', '', tz, cc, place[2], simRef_(cc), device, 'sim']);
    const opens = weighted_([[0, 40], [1, 35], [2, 20], [3, 5]]);
    for (let k = 0; k < opens; k++) {
      const ts = Math.min(now, t + (k + 1) * (40000 + Math.random() * 150000));
      const story = simStory_(cc, ts);
      if (story) rows.push([new Date(ts), 'story', '/', story, tz, cc, place[2], '', device, 'sim']);
    }
    if (cc && seen.indexOf(cc) === -1) seen.push(cc);
  }
  const sh = sheet_();
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, HEADER.length).setValues(rows);
  sh.getRange(2, 1, sh.getLastRow() - 1, HEADER.length).sort(1);
  props.setProperty('visits', String(visits_() + n));
  props.setProperty('countries', seen.join(','));
  CacheService.getScriptCache().remove('stats');
}

function simTime_(from, to, tz) {
  const zone = tz.split('/').slice(0, 2).join('/');
  let t = from + Math.random() * (to - from);
  for (let i = 0; i < 12; i++) {
    const hour = Number(Utilities.formatDate(new Date(t), zone, 'H'));
    if (Math.random() < (SIM_HOURS[hour] || 0.5)) return t;
    t = from + Math.random() * (to - from);
  }
  return t;
}

function simRef_(cc) {
  const google = cc === 'DE' ? 'google.de' : cc === 'PH' ? 'google.com.ph' : 'google.com';
  return weighted_([['l.instagram.com', 45], ['', 33], [google, 14], ['m.facebook.com', cc === 'PH' ? 12 : 4]]);
}

// Visitors lean towards albums from their own region; albums are a bit more popular in their first 60 days
function simStory_(cc, at) {
  const pairs = albums_().map(a => {
    let w = Number(a.weight) || 1;
    if (cc === 'PH' && a.place === 'Palawan') w *= 3;
    if (cc === 'DE' && a.place === 'Norway') w *= 2;
    const age = (at - new Date(a.added).getTime()) / 864e5;
    if (age >= 0 && age < 60) w *= 1.5;
    if (age < 0) w = 0;   // not published yet at that time
    return [a.key, w];
  }).filter(p => p[1] > 0);
  return pairs.length ? weighted_(pairs) : '';
}

/* ---------- Albums (from the site's assets/data/stories.json) ---------- */

function albums_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('albums');
  if (hit) return JSON.parse(hit);
  let list = DEFAULT_ALBUMS;
  try {
    const res = UrlFetchApp.fetch(SITE + 'assets/data/stories.json', { muteHttpExceptions: true });
    if (res.getResponseCode() === 200) {
      const data = JSON.parse(res.getContentText());
      const ok = (data.stories || []).filter(a => /^[a-z][a-z0-9-]{1,30}$/.test(a.key || ''));
      if (ok.length) list = ok.map(a => ({ key: a.key, place: a.place || '', added: a.added || MOVED_ON, weight: Number(a.weight) || 1 }));
    }
  } catch (err) {}
  cache.put('albums', JSON.stringify(list), 21600);
  return list;
}

function albumKeys_() {
  const keys = {};
  albums_().forEach(a => { keys[a.key] = 1; });
  return keys;
}

// Story opens attributed to the visits on the old site, shared by album weight
function albumBaseline_() {
  const old = albums_().filter(a => a.added < MOVED_ON);
  const sum = old.reduce((t, a) => t + a.weight, 0) || 1;
  const total = Math.round(BASELINE * OLD_SITE_OPEN_RATE);
  const out = {};
  old.forEach(a => { out[a.key] = Math.round(total * a.weight / sum); });
  return out;
}

function weighted_(pairs) {
  const sum = pairs.reduce((s, p) => s + p[1], 0);
  let r = Math.random() * sum;
  for (let i = 0; i < pairs.length; i++) { r -= pairs[i][1]; if (r <= 0) return pairs[i][0]; }
  return pairs[pairs.length - 1][0];
}

function poisson_(lambda) {
  if (lambda > 30) {
    const g = Math.sqrt(-2 * Math.log(Math.random() || 1e-9)) * Math.cos(2 * Math.PI * Math.random());
    return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * g));
  }
  const limit = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > limit);
  return k - 1;
}

/* ---------- Helpers ---------- */

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADER);
    sh.setFrozenRows(1);
  }
  return sh;
}

function visits_() {
  return Number(PropertiesService.getScriptProperties().getProperty('visits') || 0);
}

function normTz_(tz) {
  tz = String(tz || '');
  if (TZ_CC[tz]) return tz;
  if (TZ_ALIAS[tz]) return TZ_ALIAS[tz];
  return '';
}

function refDomain_(ref) {
  const host = String(ref || '').toLowerCase().replace(/^www\./, '');
  if (!/^[a-z0-9][a-z0-9.-]{0,79}$/.test(host)) return '';
  return host;
}

function refGroup_(host) {
  if (!host) return 'direct';
  if (/instagram/.test(host)) return 'instagram';
  if (/(^|\.)google\./.test(host)) return 'google';
  if (/facebook|(^|\.)fb\./.test(host)) return 'facebook';
  if (/bing\.|duckduckgo|ecosia|yahoo|qwant|startpage|brave/.test(host)) return 'search';
  if (/pinterest/.test(host)) return 'pinterest';
  return 'other';
}

function allow_() {
  const cache = CacheService.getScriptCache();
  const key = 'rl' + Math.floor(Date.now() / 60000);
  const n = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(n), 120);
  return n <= MAX_PER_MINUTE;
}

function prune_() {
  const sh = sheet_();
  const n = sh.getLastRow() - 1;
  if (n < 1) return;
  const cutoff = Date.now() - KEEP_DAYS * 864e5;
  const times = sh.getRange(2, 1, n, 1).getValues();
  let old = 0;
  while (old < n && new Date(times[old][0]).getTime() < cutoff) old++;
  if (old > 0) sh.deleteRows(2, old);
}

function json_(o) {
  return text_(JSON.stringify(o));
}

function text_(s) {
  return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- Time zone → country (generated from the IANA tz database) ---------- */
const TZ_CC = {"Africa/Abidjan":"CI","Africa/Accra":"GH","Africa/Addis_Ababa":"ET","Africa/Algiers":"DZ","Africa/Asmara":"ER","Africa/Bamako":"ML","Africa/Bangui":"CF","Africa/Banjul":"GM","Africa/Bissau":"GW","Africa/Blantyre":"MW","Africa/Brazzaville":"CG","Africa/Bujumbura":"BI","Africa/Cairo":"EG","Africa/Casablanca":"MA","Africa/Ceuta":"ES","Africa/Conakry":"GN","Africa/Dakar":"SN","Africa/Dar_es_Salaam":"TZ","Africa/Djibouti":"DJ","Africa/Douala":"CM","Africa/El_Aaiun":"EH","Africa/Freetown":"SL","Africa/Gaborone":"BW","Africa/Harare":"ZW","Africa/Johannesburg":"ZA","Africa/Juba":"SS","Africa/Kampala":"UG","Africa/Khartoum":"SD","Africa/Kigali":"RW","Africa/Kinshasa":"CD","Africa/Lagos":"NG","Africa/Libreville":"GA","Africa/Lome":"TG","Africa/Luanda":"AO","Africa/Lubumbashi":"CD","Africa/Lusaka":"ZM","Africa/Malabo":"GQ","Africa/Maputo":"MZ","Africa/Maseru":"LS","Africa/Mbabane":"SZ","Africa/Mogadishu":"SO","Africa/Monrovia":"LR","Africa/Nairobi":"KE","Africa/Ndjamena":"TD","Africa/Niamey":"NE","Africa/Nouakchott":"MR","Africa/Ouagadougou":"BF","Africa/Porto-Novo":"BJ","Africa/Sao_Tome":"ST","Africa/Tripoli":"LY","Africa/Tunis":"TN","Africa/Windhoek":"NA","America/Adak":"US","America/Anchorage":"US","America/Anguilla":"AI","America/Antigua":"AG","America/Araguaina":"BR","America/Argentina/Buenos_Aires":"AR","America/Argentina/Catamarca":"AR","America/Argentina/Cordoba":"AR","America/Argentina/Jujuy":"AR","America/Argentina/La_Rioja":"AR","America/Argentina/Mendoza":"AR","America/Argentina/Rio_Gallegos":"AR","America/Argentina/Salta":"AR","America/Argentina/San_Juan":"AR","America/Argentina/San_Luis":"AR","America/Argentina/Tucuman":"AR","America/Argentina/Ushuaia":"AR","America/Aruba":"AW","America/Asuncion":"PY","America/Atikokan":"CA","America/Bahia":"BR","America/Bahia_Banderas":"MX","America/Barbados":"BB","America/Belem":"BR","America/Belize":"BZ","America/Blanc-Sablon":"CA","America/Boa_Vista":"BR","America/Bogota":"CO","America/Boise":"US","America/Cambridge_Bay":"CA","America/Campo_Grande":"BR","America/Cancun":"MX","America/Caracas":"VE","America/Cayenne":"GF","America/Cayman":"KY","America/Chicago":"US","America/Chihuahua":"MX","America/Ciudad_Juarez":"MX","America/Costa_Rica":"CR","America/Coyhaique":"CL","America/Creston":"CA","America/Cuiaba":"BR","America/Curacao":"CW","America/Danmarkshavn":"GL","America/Dawson":"CA","America/Dawson_Creek":"CA","America/Denver":"US","America/Detroit":"US","America/Dominica":"DM","America/Edmonton":"CA","America/Eirunepe":"BR","America/El_Salvador":"SV","America/Fort_Nelson":"CA","America/Fortaleza":"BR","America/Glace_Bay":"CA","America/Goose_Bay":"CA","America/Grand_Turk":"TC","America/Grenada":"GD","America/Guadeloupe":"GP","America/Guatemala":"GT","America/Guayaquil":"EC","America/Guyana":"GY","America/Halifax":"CA","America/Havana":"CU","America/Hermosillo":"MX","America/Indiana/Indianapolis":"US","America/Indiana/Knox":"US","America/Indiana/Marengo":"US","America/Indiana/Petersburg":"US","America/Indiana/Tell_City":"US","America/Indiana/Vevay":"US","America/Indiana/Vincennes":"US","America/Indiana/Winamac":"US","America/Inuvik":"CA","America/Iqaluit":"CA","America/Jamaica":"JM","America/Juneau":"US","America/Kentucky/Louisville":"US","America/Kentucky/Monticello":"US","America/Kralendijk":"BQ","America/La_Paz":"BO","America/Lima":"PE","America/Los_Angeles":"US","America/Lower_Princes":"SX","America/Maceio":"BR","America/Managua":"NI","America/Manaus":"BR","America/Marigot":"MF","America/Martinique":"MQ","America/Matamoros":"MX","America/Mazatlan":"MX","America/Menominee":"US","America/Merida":"MX","America/Metlakatla":"US","America/Mexico_City":"MX","America/Miquelon":"PM","America/Moncton":"CA","America/Monterrey":"MX","America/Montevideo":"UY","America/Montserrat":"MS","America/Nassau":"BS","America/New_York":"US","America/Nome":"US","America/Noronha":"BR","America/North_Dakota/Beulah":"US","America/North_Dakota/Center":"US","America/North_Dakota/New_Salem":"US","America/Nuuk":"GL","America/Ojinaga":"MX","America/Panama":"PA","America/Paramaribo":"SR","America/Phoenix":"US","America/Port-au-Prince":"HT","America/Port_of_Spain":"TT","America/Porto_Velho":"BR","America/Puerto_Rico":"PR","America/Punta_Arenas":"CL","America/Rankin_Inlet":"CA","America/Recife":"BR","America/Regina":"CA","America/Resolute":"CA","America/Rio_Branco":"BR","America/Santarem":"BR","America/Santiago":"CL","America/Santo_Domingo":"DO","America/Sao_Paulo":"BR","America/Scoresbysund":"GL","America/Sitka":"US","America/St_Barthelemy":"BL","America/St_Johns":"CA","America/St_Kitts":"KN","America/St_Lucia":"LC","America/St_Thomas":"VI","America/St_Vincent":"VC","America/Swift_Current":"CA","America/Tegucigalpa":"HN","America/Thule":"GL","America/Tijuana":"MX","America/Toronto":"CA","America/Tortola":"VG","America/Vancouver":"CA","America/Whitehorse":"CA","America/Winnipeg":"CA","America/Yakutat":"US","Antarctica/Casey":"AQ","Antarctica/Davis":"AQ","Antarctica/DumontDUrville":"AQ","Antarctica/Macquarie":"AU","Antarctica/Mawson":"AQ","Antarctica/McMurdo":"AQ","Antarctica/Palmer":"AQ","Antarctica/Rothera":"AQ","Antarctica/Syowa":"AQ","Antarctica/Troll":"AQ","Antarctica/Vostok":"AQ","Arctic/Longyearbyen":"SJ","Asia/Aden":"YE","Asia/Almaty":"KZ","Asia/Amman":"JO","Asia/Anadyr":"RU","Asia/Aqtau":"KZ","Asia/Aqtobe":"KZ","Asia/Ashgabat":"TM","Asia/Atyrau":"KZ","Asia/Baghdad":"IQ","Asia/Bahrain":"BH","Asia/Baku":"AZ","Asia/Bangkok":"TH","Asia/Barnaul":"RU","Asia/Beirut":"LB","Asia/Bishkek":"KG","Asia/Brunei":"BN","Asia/Chita":"RU","Asia/Colombo":"LK","Asia/Damascus":"SY","Asia/Dhaka":"BD","Asia/Dili":"TL","Asia/Dubai":"AE","Asia/Dushanbe":"TJ","Asia/Famagusta":"CY","Asia/Gaza":"PS","Asia/Hebron":"PS","Asia/Ho_Chi_Minh":"VN","Asia/Hong_Kong":"HK","Asia/Hovd":"MN","Asia/Irkutsk":"RU","Asia/Jakarta":"ID","Asia/Jayapura":"ID","Asia/Jerusalem":"IL","Asia/Kabul":"AF","Asia/Kamchatka":"RU","Asia/Karachi":"PK","Asia/Kathmandu":"NP","Asia/Khandyga":"RU","Asia/Kolkata":"IN","Asia/Krasnoyarsk":"RU","Asia/Kuala_Lumpur":"MY","Asia/Kuching":"MY","Asia/Kuwait":"KW","Asia/Macau":"MO","Asia/Magadan":"RU","Asia/Makassar":"ID","Asia/Manila":"PH","Asia/Muscat":"OM","Asia/Nicosia":"CY","Asia/Novokuznetsk":"RU","Asia/Novosibirsk":"RU","Asia/Omsk":"RU","Asia/Oral":"KZ","Asia/Phnom_Penh":"KH","Asia/Pontianak":"ID","Asia/Pyongyang":"KP","Asia/Qatar":"QA","Asia/Qostanay":"KZ","Asia/Qyzylorda":"KZ","Asia/Riyadh":"SA","Asia/Sakhalin":"RU","Asia/Samarkand":"UZ","Asia/Seoul":"KR","Asia/Shanghai":"CN","Asia/Singapore":"SG","Asia/Srednekolymsk":"RU","Asia/Taipei":"TW","Asia/Tashkent":"UZ","Asia/Tbilisi":"GE","Asia/Tehran":"IR","Asia/Thimphu":"BT","Asia/Tokyo":"JP","Asia/Tomsk":"RU","Asia/Ulaanbaatar":"MN","Asia/Urumqi":"CN","Asia/Ust-Nera":"RU","Asia/Vientiane":"LA","Asia/Vladivostok":"RU","Asia/Yakutsk":"RU","Asia/Yangon":"MM","Asia/Yekaterinburg":"RU","Asia/Yerevan":"AM","Atlantic/Azores":"PT","Atlantic/Bermuda":"BM","Atlantic/Canary":"ES","Atlantic/Cape_Verde":"CV","Atlantic/Faroe":"FO","Atlantic/Madeira":"PT","Atlantic/Reykjavik":"IS","Atlantic/South_Georgia":"GS","Atlantic/St_Helena":"SH","Atlantic/Stanley":"FK","Australia/Adelaide":"AU","Australia/Brisbane":"AU","Australia/Broken_Hill":"AU","Australia/Darwin":"AU","Australia/Eucla":"AU","Australia/Hobart":"AU","Australia/Lindeman":"AU","Australia/Lord_Howe":"AU","Australia/Melbourne":"AU","Australia/Perth":"AU","Australia/Sydney":"AU","Europe/Amsterdam":"NL","Europe/Andorra":"AD","Europe/Astrakhan":"RU","Europe/Athens":"GR","Europe/Belgrade":"RS","Europe/Berlin":"DE","Europe/Bratislava":"SK","Europe/Brussels":"BE","Europe/Bucharest":"RO","Europe/Budapest":"HU","Europe/Busingen":"DE","Europe/Chisinau":"MD","Europe/Copenhagen":"DK","Europe/Dublin":"IE","Europe/Gibraltar":"GI","Europe/Guernsey":"GG","Europe/Helsinki":"FI","Europe/Isle_of_Man":"IM","Europe/Istanbul":"TR","Europe/Jersey":"JE","Europe/Kaliningrad":"RU","Europe/Kirov":"RU","Europe/Kyiv":"UA","Europe/Lisbon":"PT","Europe/Ljubljana":"SI","Europe/London":"GB","Europe/Luxembourg":"LU","Europe/Madrid":"ES","Europe/Malta":"MT","Europe/Mariehamn":"AX","Europe/Minsk":"BY","Europe/Monaco":"MC","Europe/Moscow":"RU","Europe/Oslo":"NO","Europe/Paris":"FR","Europe/Podgorica":"ME","Europe/Prague":"CZ","Europe/Riga":"LV","Europe/Rome":"IT","Europe/Samara":"RU","Europe/San_Marino":"SM","Europe/Sarajevo":"BA","Europe/Saratov":"RU","Europe/Simferopol":"UA","Europe/Skopje":"MK","Europe/Sofia":"BG","Europe/Stockholm":"SE","Europe/Tallinn":"EE","Europe/Tirane":"AL","Europe/Ulyanovsk":"RU","Europe/Vaduz":"LI","Europe/Vatican":"VA","Europe/Vienna":"AT","Europe/Vilnius":"LT","Europe/Volgograd":"RU","Europe/Warsaw":"PL","Europe/Zagreb":"HR","Europe/Zurich":"CH","Indian/Antananarivo":"MG","Indian/Chagos":"IO","Indian/Christmas":"CX","Indian/Cocos":"CC","Indian/Comoro":"KM","Indian/Kerguelen":"TF","Indian/Mahe":"SC","Indian/Maldives":"MV","Indian/Mauritius":"MU","Indian/Mayotte":"YT","Indian/Reunion":"RE","Pacific/Apia":"WS","Pacific/Auckland":"NZ","Pacific/Bougainville":"PG","Pacific/Chatham":"NZ","Pacific/Chuuk":"FM","Pacific/Easter":"CL","Pacific/Efate":"VU","Pacific/Fakaofo":"TK","Pacific/Fiji":"FJ","Pacific/Funafuti":"TV","Pacific/Galapagos":"EC","Pacific/Gambier":"PF","Pacific/Guadalcanal":"SB","Pacific/Guam":"GU","Pacific/Honolulu":"US","Pacific/Kanton":"KI","Pacific/Kiritimati":"KI","Pacific/Kosrae":"FM","Pacific/Kwajalein":"MH","Pacific/Majuro":"MH","Pacific/Marquesas":"PF","Pacific/Midway":"UM","Pacific/Nauru":"NR","Pacific/Niue":"NU","Pacific/Norfolk":"NF","Pacific/Noumea":"NC","Pacific/Pago_Pago":"AS","Pacific/Palau":"PW","Pacific/Pitcairn":"PN","Pacific/Pohnpei":"FM","Pacific/Port_Moresby":"PG","Pacific/Rarotonga":"CK","Pacific/Saipan":"MP","Pacific/Tahiti":"PF","Pacific/Tarawa":"KI","Pacific/Tongatapu":"TO","Pacific/Wake":"UM","Pacific/Wallis":"WF"};
const TZ_ALIAS = {"Africa/Asmera":"Africa/Nairobi","Africa/Timbuktu":"Africa/Abidjan","America/Argentina/ComodRivadavia":"America/Argentina/Catamarca","America/Atka":"America/Adak","America/Buenos_Aires":"America/Argentina/Buenos_Aires","America/Catamarca":"America/Argentina/Catamarca","America/Coral_Harbour":"America/Panama","America/Cordoba":"America/Argentina/Cordoba","America/Ensenada":"America/Tijuana","America/Fort_Wayne":"America/Indiana/Indianapolis","America/Godthab":"America/Nuuk","America/Indianapolis":"America/Indiana/Indianapolis","America/Jujuy":"America/Argentina/Jujuy","America/Knox_IN":"America/Indiana/Knox","America/Louisville":"America/Kentucky/Louisville","America/Mendoza":"America/Argentina/Mendoza","America/Montreal":"America/Toronto","America/Nipigon":"America/Toronto","America/Pangnirtung":"America/Iqaluit","America/Porto_Acre":"America/Rio_Branco","America/Rainy_River":"America/Winnipeg","America/Rosario":"America/Argentina/Cordoba","America/Santa_Isabel":"America/Tijuana","America/Shiprock":"America/Denver","America/Thunder_Bay":"America/Toronto","America/Virgin":"America/Puerto_Rico","America/Yellowknife":"America/Edmonton","Antarctica/South_Pole":"Pacific/Auckland","Asia/Ashkhabad":"Asia/Ashgabat","Asia/Calcutta":"Asia/Kolkata","Asia/Choibalsan":"Asia/Ulaanbaatar","Asia/Chongqing":"Asia/Shanghai","Asia/Chungking":"Asia/Shanghai","Asia/Dacca":"Asia/Dhaka","Asia/Harbin":"Asia/Shanghai","Asia/Istanbul":"Europe/Istanbul","Asia/Kashgar":"Asia/Urumqi","Asia/Katmandu":"Asia/Kathmandu","Asia/Macao":"Asia/Macau","Asia/Rangoon":"Asia/Yangon","Asia/Saigon":"Asia/Ho_Chi_Minh","Asia/Tel_Aviv":"Asia/Jerusalem","Asia/Thimbu":"Asia/Thimphu","Asia/Ujung_Pandang":"Asia/Makassar","Asia/Ulan_Bator":"Asia/Ulaanbaatar","Atlantic/Faeroe":"Atlantic/Faroe","Atlantic/Jan_Mayen":"Europe/Berlin","Australia/ACT":"Australia/Sydney","Australia/Canberra":"Australia/Sydney","Australia/Currie":"Australia/Hobart","Australia/LHI":"Australia/Lord_Howe","Australia/NSW":"Australia/Sydney","Australia/North":"Australia/Darwin","Australia/Queensland":"Australia/Brisbane","Australia/South":"Australia/Adelaide","Australia/Tasmania":"Australia/Hobart","Australia/Victoria":"Australia/Melbourne","Australia/West":"Australia/Perth","Australia/Yancowinna":"Australia/Broken_Hill","Brazil/Acre":"America/Rio_Branco","Brazil/DeNoronha":"America/Noronha","Brazil/East":"America/Sao_Paulo","Brazil/West":"America/Manaus","CET":"Europe/Brussels","Canada/Atlantic":"America/Halifax","Canada/Central":"America/Winnipeg","Canada/Eastern":"America/Toronto","Canada/Mountain":"America/Edmonton","Canada/Newfoundland":"America/St_Johns","Canada/Pacific":"America/Vancouver","Canada/Saskatchewan":"America/Regina","Canada/Yukon":"America/Whitehorse","Chile/Continental":"America/Santiago","Chile/EasterIsland":"Pacific/Easter","Cuba":"America/Havana","EET":"Europe/Athens","EST":"America/Panama","Egypt":"Africa/Cairo","Eire":"Europe/Dublin","Europe/Belfast":"Europe/London","Europe/Kiev":"Europe/Kyiv","Europe/Nicosia":"Asia/Nicosia","Europe/Tiraspol":"Europe/Chisinau","Europe/Uzhgorod":"Europe/Kyiv","Europe/Zaporozhye":"Europe/Kyiv","GB":"Europe/London","GB-Eire":"Europe/London","HST":"Pacific/Honolulu","Hongkong":"Asia/Hong_Kong","Iceland":"Africa/Abidjan","Iran":"Asia/Tehran","Israel":"Asia/Jerusalem","Jamaica":"America/Jamaica","Japan":"Asia/Tokyo","Kwajalein":"Pacific/Kwajalein","Libya":"Africa/Tripoli","MET":"Europe/Brussels","MST":"America/Phoenix","Mexico/BajaNorte":"America/Tijuana","Mexico/BajaSur":"America/Mazatlan","Mexico/General":"America/Mexico_City","NZ":"Pacific/Auckland","NZ-CHAT":"Pacific/Chatham","Navajo":"America/Denver","PRC":"Asia/Shanghai","Pacific/Enderbury":"Pacific/Kanton","Pacific/Johnston":"Pacific/Honolulu","Pacific/Ponape":"Pacific/Guadalcanal","Pacific/Samoa":"Pacific/Pago_Pago","Pacific/Truk":"Pacific/Port_Moresby","Pacific/Yap":"Pacific/Port_Moresby","Poland":"Europe/Warsaw","Portugal":"Europe/Lisbon","ROC":"Asia/Taipei","ROK":"Asia/Seoul","Singapore":"Asia/Singapore","Turkey":"Europe/Istanbul","US/Alaska":"America/Anchorage","US/Aleutian":"America/Adak","US/Arizona":"America/Phoenix","US/Central":"America/Chicago","US/East-Indiana":"America/Indiana/Indianapolis","US/Eastern":"America/New_York","US/Hawaii":"Pacific/Honolulu","US/Indiana-Starke":"America/Indiana/Knox","US/Michigan":"America/Detroit","US/Mountain":"America/Denver","US/Pacific":"America/Los_Angeles","US/Samoa":"Pacific/Pago_Pago","W-SU":"Europe/Moscow","WET":"Europe/Lisbon"};
