import { chooseLanguage, translate } from './i18n.js';
import { assess, buildReport, detectHardware, detectWebRTC } from './diagnostics.js';

const $ = id => document.getElementById(id);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
let saved;
try { saved = localStorage.getItem('envguard-language'); } catch {}
let lang = chooseLanguage(location.search, saved, navigator.language);
const ref = new URLSearchParams(location.search).get('ref') || 'organic';
const t = (key, vars) => translate(lang, key, vars);
const CARD_IDS = ['ip', 'rtc', 'timezone', 'hardware'];
const TITLES = { ip: 'ipTitle', rtc: 'rtcTitle', timezone: 'timezoneTitle', hardware: 'hardwareTitle' };
const CODES = { proxy: 'GXQVUA_081067', adspower: 'YtPJkN' };

// snapshot.ip / snapshot.rtc stay `undefined` until their check returns; that is what "pending" means.
let snapshot = null, result = null, scanning = false, hiddenAt = 0, shownScore = null, countFrame = 0, dialogIsReport = false, rescanQueued = false;
const openDetails = new Map(); // card id -> the user's own open/closed choice
const signatures = new Map();

function node(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}
function canAnimate() { return !reduceMotion.matches && document.visibilityState === 'visible'; }
function transition(update) {
  if (canAnimate() && document.startViewTransition) document.startViewTransition(update);
  else update();
}

/* ---------- Feedback ---------- */
function announce(text) { $('sr-status').textContent = ''; requestAnimationFrame(() => { $('sr-status').textContent = text; }); }
function flashDone(button) {
  clearTimeout(button._doneTimer);
  button.classList.add('done');
  announce(t('copied'));
  button._doneTimer = setTimeout(() => button.classList.remove('done'), 1600);
}
function labelled(button, idleKey, altClass, altKey, vars) {
  const label = node('span', 'label');
  const idle = node('span', 'idle', t(idleKey, vars));
  const alt = node('span', altClass, t(altKey));
  alt.setAttribute('aria-hidden', 'true');
  label.append(idle, alt);
  button.replaceChildren(label);
  return button;
}
function legacyCopy(text) {
  const area = node('textarea');
  area.value = text; area.setAttribute('readonly', ''); area.className = 'sr-only';
  document.body.append(area); area.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch {}
  area.remove();
  return ok;
}
// Every copy works the same way: the pressed button says "Copied"; if the browser refuses,
// the text opens already selected so one more keystroke finishes the job.
async function copy(text, button, { report = false } = {}) {
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch { ok = legacyCopy(text); }
  if (ok) { flashDone(button); return true; }
  dialogIsReport = report;
  $('report-text').value = text;
  $('report-text').rows = report ? 12 : 2;
  $('report-dialog').showModal();
  $('report-text').focus();
  $('report-text').select();
  return false;
}
function track(action) {
  fetch('/api/event', { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ref }) }).catch(() => {});
}
function promoUrl(target, from) { return `/go/${target}?${new URLSearchParams({ from, ref })}`; }

/* ---------- Score ---------- */
function animateScore(to) {
  cancelAnimationFrame(countFrame);
  const el = $('score-num');
  if (to === null) { shownScore = null; el.textContent = '—'; return; }
  const from = shownScore ?? 0;
  shownScore = to;
  if (!canAnimate() || from === to) { el.textContent = String(to); return; }
  const start = performance.now(), duration = from === 0 ? 600 : 300;
  const step = now => {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = String(Math.round(from + (to - from) * eased));
    if (p < 1) countFrame = requestAnimationFrame(step);
  };
  countFrame = requestAnimationFrame(step);
}

/* ---------- Cards ---------- */
function friendly(value) { return value && value !== 'Unknown' && value !== 'Unknown ISP' && value !== 'unknown' ? String(value) : t('unknownValue'); }
function pendingIds() {
  if (!snapshot) return new Set(CARD_IDS);
  const p = new Set();
  if (snapshot.ip === undefined) { p.add('ip'); p.add('timezone'); p.add('rtc'); }
  if (snapshot.rtc === undefined) p.add('rtc');
  return p;
}
function detail(card) {
  const { ip, rtc, hardware: h, timezone, languages } = snapshot;
  if (card.id === 'ip') return ip && card.level !== 'unknown' ? t('ipDetail', { type: ip.ipType === 'hosting' ? t('hostingType') : ip.ipType === 'isp' ? t('ispType') : friendly(ip.ipType) }) : '';
  if (card.id === 'rtc') return card.level !== 'unknown' && card.extraIps.length ? t('rtcDetail', { ips: card.extraIps.join(', ') }) : '';
  if (card.id === 'timezone') return t('timezoneDetail', { remote: friendly(ip?.timezone), local: friendly(timezone), languages: friendly(languages) });
  const data = t('hardwareDetail', { vendor: friendly(h.vendor), renderer: friendly(h.renderer), cores: h.cores || t('unknownValue'), webdriver: h.webdriver === true ? t('yes') : h.webdriver === false ? t('no') : t('unknownValue') });
  return data;
}
function resultText(card) {
  const base = card.id === 'hardware' && card.signals?.length ? `${t(card.result)}: ${card.signals.map(x => t(x)).join(' · ')}` : t(card.result);
  return base + (card.points ? ` · ${t('pointLoss', { points: card.points })}` : '');
}
function cardBody(card, pending, showCta) {
  if (pending) {
    const head = node('div', 'card-head');
    head.append(node('h3', '', t(TITLES[card.id])), node('span', 'badge'));
    return { level: 'pending', parts: [head, node('p', 'result', t('scanning'))] };
  }
  const parts = [];
  const head = node('div', 'card-head');
  head.append(node('h3', '', t(card.title)), node('span', 'badge', t(card.level)));
  parts.push(head, node('p', 'result', resultText(card)));
  if (card.level !== 'ok' && card.advice) parts.push(node('p', 'advice', t(card.advice)));
  const info = detail(card);
  if (info) {
    const more = node('details', 'more');
    // Problems show their evidence; passing checks keep it folded. A manual toggle wins.
    more.open = openDetails.get(card.id) ?? (card.level === 'warn' || card.level === 'danger');
    const summary = node('summary');
    // Only a real click is the user's choice; setting `open` in code also fires `toggle`.
    summary.addEventListener('click', () => openDetails.set(card.id, !more.open));
    summary.append(node('span', 'when-closed', t('details')), node('span', 'when-open', t('hideDetails')));
    more.append(summary, node('p', 'detail', info));
    parts.push(more);
  }
  if (showCta) {
    const cta = node('div', 'cta');
    const code = CODES[card.target];
    const button = labelled(node('button', 'button'), 'copyCode', 'done-text', 'copied', { code });
    button.type = 'button';
    button.addEventListener('click', async () => { if (await copy(code, button)) track(`copy_${card.target}_${code}`); });
    const link = node('a', 'button offer', t(card.target === 'proxy' ? 'proxyOffer' : 'browserOffer'));
    link.href = promoUrl(card.target, card.id); link.target = '_blank'; link.rel = 'noopener sponsored';
    // Opening the offer also copies its code, and the code button next to it confirms that.
    link.addEventListener('click', () => {
      navigator.clipboard?.writeText(code).then(() => { flashDone(button); track(`copy_${card.target}_${code}`); }, () => {});
    });
    cta.append(link, button);
    parts.push(cta);
  }
  return { level: card.level, parts };
}
function renderCards() {
  const pending = pendingIds();
  const cards = snapshot ? assess({ ...snapshot, ip: snapshot.ip ?? null, rtc: snapshot.rtc ?? { status: 'pending', ips: [] } }).cards : [];
  const container = $('cards');
  // One offer per product: if several checks point to the same fix, only the first shows it.
  const offered = new Set();
  for (const id of CARD_IDS) {
    const card = cards.find(c => c.id === id) || { id };
    const isPending = pending.has(id);
    const showCta = !isPending && (card.level === 'warn' || card.level === 'danger') && !offered.has(card.target);
    if (showCta) offered.add(card.target);
    const sig = isPending ? `${lang}|pending` : `${lang}|${showCta}|${JSON.stringify({ ...card, detail: detail(card) })}`;
    let article = container.querySelector(`[data-check="${id}"]`);
    if (!article) {
      article = node('article', 'card');
      article.dataset.check = id;
      article.style.viewTransitionName = `card-${id}`;
      article.style.viewTransitionClass = 'card';
      container.append(article);
    }
    article.style.viewTransitionClass = 'card';
    if (signatures.get(id) === sig) continue;
    const wasPending = article.classList.contains('pending');
    signatures.set(id, sig);
    const { level, parts } = cardBody(card, isPending, showCta);
    article.className = `card ${level}`;
    // Without View Transitions, new content still fades up instead of snapping in.
    if (wasPending && !isPending && !document.startViewTransition) parts.slice(1).forEach(p => p.classList.add('enter'));
    article.replaceChildren(...parts);
  }
}

/* ---------- Summary ---------- */
function renderSummary() {
  const pending = pendingIds();
  const done = snapshot && pending.size === 0 && !scanning;
  const ring = $('score');
  if (done) result = assess(snapshot);
  const score = done ? result.score : null;
  const tone = !done ? (result ? ring.dataset.tone : '') : score === null ? '' : score < 60 ? 'danger' : score < 100 ? 'warn' : 'ok';
  ring.dataset.tone = tone;
  ring.className = `score ${tone} ${done ? '' : 'checking'}`.trim();
  if (done) {
    animateScore(score);
    $('score-arc').style.strokeDashoffset = String(100 - (score ?? 0));
    $('score-arc').style.opacity = score === null ? '0' : '1';
  } else if (!result) {
    $('score-num').textContent = '—';
  } else {
    $('score-arc').style.opacity = '.3';
  }
  $('verdict').textContent = done ? t(result.verdict) : t('scanning');
  $('coverage').textContent = done && score === null ? `${t('coverage', { count: result.completed })} · ${t('partialScore')}` : '';
  $('coverage').hidden = !$('coverage').textContent;
  const ip = snapshot?.ip;
  $('ip-summary').textContent = ip ? t('ipSummary', { ip: friendly(ip.ip), country: friendly(ip.country), asn: friendly(ip.asn), org: friendly(ip.org) }) : ip === null ? t('ipUnknown') : '';
  $('scan-btn').classList.toggle('busy', scanning);
  $('scan-btn').setAttribute('aria-busy', String(scanning));
  $('report-btn').disabled = !result;
  // Once there is a score, the next likely step is sharing it, so that becomes the main button.
  const reportFirst = Boolean(result && result.score !== null);
  $('report-btn').classList.toggle('primary', reportFirst);
  $('scan-btn').classList.toggle('primary', !reportFirst);
  $('cards').classList.toggle('stale', scanning && Boolean(result));
}
function render() { renderSummary(); renderCards(); }

/* ---------- Scan ---------- */
// A network change in the middle of a scan would mix two networks; run once more when this one ends.
async function runScan({ queue = false } = {}) {
  if (scanning) { if (queue) rescanQueued = true; return; }
  scanning = true;
  rescanQueued = false;
  const rescan = Boolean(result);
  const hardware = detectHardware();
  let timezone = '';
  try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch {}
  const fresh = { ip: undefined, rtc: undefined, hardware, timezone, languages: (navigator.languages || [navigator.language]).join(', ') };
  // First scan fills cards in as each check returns. A rescan keeps the old answers on screen
  // (dimmed) and swaps once, so nothing blinks when the result is unchanged.
  if (!rescan) snapshot = fresh;
  render();
  const ipPromise = fetch('/api/ip-check', { cache: 'no-store', signal: AbortSignal.timeout(7000) })
    .then(r => { if (!r.ok) throw Error('IP check unavailable'); return r.json(); }).catch(() => null)
    .then(ip => { fresh.ip = ip; if (!rescan) transition(render); });
  const rtcPromise = detectWebRTC().then(value => { fresh.rtc = value; });
  await Promise.all([ipPromise, rtcPromise]);
  snapshot = fresh;
  scanning = false;
  if (rescanQueued) { runScan(); return; }
  transition(render);
}
const autoScan = () => runScan({ queue: true });

/* ---------- Wiring ---------- */
function applyLanguage() {
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  document.title = t('pageTitle');
  document.querySelector('meta[name="description"]').content = t('description');
  for (const s of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) document.querySelector(s).content = t('pageTitle');
  for (const s of ['meta[property="og:description"]', 'meta[name="twitter:description"]']) document.querySelector(s).content = t('description');
  document.querySelector('meta[property="og:locale"]').content = lang === 'zh' ? 'zh_CN' : 'en_US';
  document.querySelector('meta[property="og:locale:alternate"]').content = lang === 'zh' ? 'en_US' : 'zh_CN';
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  $('lang-btn').textContent = lang === 'en' ? '中文' : 'English';
  $('lang-btn').setAttribute('aria-label', t('switchLabel'));
  $('cards').setAttribute('aria-label', t('checks'));
  $('report-text').setAttribute('aria-label', t('reportTitle'));
  $('github-link').href = promoUrl('github', 'footer');
  if ($('report-dialog').open && dialogIsReport && result) $('report-text').value = buildReport(result, lang);
  render();
}
$('lang-btn').addEventListener('click', () => {
  lang = lang === 'en' ? 'zh' : 'en';
  try { localStorage.setItem('envguard-language', lang); } catch {}
  const url = new URL(location.href); url.searchParams.set('lang', lang); history.replaceState(null, '', url);
  transition(applyLanguage);
});
$('scan-btn').addEventListener('click', () => runScan());
$('report-btn').addEventListener('click', () => { if (result) copy(buildReport(result, lang), $('report-btn'), { report: true }); });
$('close-dialog').addEventListener('click', () => $('report-dialog').close());
// Clicking the dimmed backdrop closes the dialog; clicks on the dialog's own padding do not.
$('report-dialog').addEventListener('click', e => {
  const r = $('report-dialog').getBoundingClientRect();
  if (e.target === $('report-dialog') && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) $('report-dialog').close();
});

// People switch VPN or proxy in another app and come back: recheck for them.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') hiddenAt = Date.now();
  else if (hiddenAt && Date.now() - hiddenAt > 5000) autoScan();
});
addEventListener('online', autoScan);
navigator.connection?.addEventListener?.('change', () => { if (document.visibilityState === 'visible') autoScan(); });

applyLanguage();
runScan();
