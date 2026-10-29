const APP_VERSION = '8 (' + window.DATA_VERSION + ')';
const view = document.getElementById('view');
const titleEl = document.getElementById('title');
const KEY = 'irpg-favorites';
const sections = window.SECTIONS;
const byId = Object.fromEntries(sections.map(s => [s.id, s]));
const categories = [...new Set(sections.map(s => s.category))];

function loadFavs() {
  try { return (JSON.parse(localStorage.getItem(KEY)) || []).filter(id => byId[id]); } catch (e) { return []; }
}
function saveFavs(f) {
  try { localStorage.setItem(KEY, JSON.stringify(f)); } catch (e) {}
}
const CK = 'irpg-checks';
function loadChecks() {
  try { return JSON.parse(localStorage.getItem(CK)) || {}; } catch (e) { return {}; }
}
function saveChecks(c) {
  try { localStorage.setItem(CK, JSON.stringify(c)); } catch (e) {}
}
const isFav = id => loadFavs().includes(id);
function toggleFav(id) {
  const f = loadFavs();
  const i = f.indexOf(id);
  if (i >= 0) f.splice(i, 1); else f.push(id);
  saveFavs(f);
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const ICONS = {
  'Quick Reference': '📋', 'Operational Leadership': '🧭', 'Operational Engagement': '🔥', 'Specific Hazards': '⚠️',
  'Fire Environment': '🌤️', 'All Hazard Response': '🚨', 'Aviation': '🚁', 'Other References': '📖', 'Emergency Medical Care': '🩺'
};

function itemHtml(s) {
  const on = isFav(s.id);
  return `<li><a class="ico" href="#/p/${s.id}" aria-hidden="true" tabindex="-1">${ICONS[s.category] || '📄'}</a>` +
    `<a class="ttl" href="#/p/${s.id}">${esc(s.title)}</a>` +
    `<button class="star" data-id="${s.id}" aria-label="${on ? 'Remove from' : 'Add to'} favorites: ${esc(s.title)}">${on ? '★' : '☆'}</button></li>`;
}
const listHtml = items => '<ul class="list">' + items.map(itemHtml).join('') + '</ul>';

// Turns the guide's page text into HTML. Bullets/checkboxes/numbers start items, lightly indented lines continue
// the previous item, bold lines (marked \x01 by the build) are headings, and short lines stay separate paragraphs.
const BULLET = /^\s{0,10}([•☐□○\-–]|\d{1,2}\.)\s+(?![\-–]?\s*[a-z])/;
const O_BULLET = /^\s{1,10}o\s+(?=\S)/;  // 'o' used as a sub-bullet glyph
const HEAD_JOIN_WORDS = /\b(in|of|and|or|the|for|to|on|with|a|an|at|by)$/i;
function canJoinHeading(prev, next) {
  return !/[.?!:]$/.test(prev) && !/^\d+[.)]\s/.test(next) && prev !== prev.toUpperCase() &&
    (/^[a-z]/.test(next) || HEAD_JOIN_WORDS.test(prev) || next.split(/\s+/).length <= 1);
}

// Splits text on hollow checkbox glyphs: each ☐ starts a tickable item, anything before the first one is plain text.
function pieces(s) {
  return s.split(/\s*[☐□]\s*/).map((t, i) => ({ t: t.trim(), chk: i > 0 })).filter(p => p.t);
}

function flowHtml(text, sid) {
  const checked = new Set((loadChecks()[sid] || []));
  let n = 0;
  const liHtml = (p, sub) => {
    if (!p.chk) return `<li class="${sub ? 'sub' : ''}">${esc(p.t)}</li>`;
    const i = n++;
    return `<li class="chk${sub ? ' sub' : ''}"><label><input type="checkbox" data-ck="${i}" ${checked.has(i) ? 'checked' : ''}><span>${esc(p.t)}</span></label></li>`;
  };
  const lines = text.split('\n');
  // typical width of a full wrapped line, so we can tell wrapped lines from short stand-alone lines
  const lens = lines.filter(l => l.trim() && l[0] !== '\x01' && l[0] !== '\x02').map(l => l.trim().replace(/\s{2,}/g, ' ').length).sort((x, y) => x - y);
  const full = 0.75 * (lens[Math.floor(lens.length * 0.9)] || 60);
  const out = [], heads = [];
  let cur = null;
  const flush = () => { if (cur) { out.push(cur); cur = null; } };
  const nextIsBullet = i => { for (let k = i + 1; k < lines.length; k++) { if (lines[k].trim()) return BULLET.test(lines[k]) || O_BULLET.test(lines[k]); } return false; };
  for (let i = 0; i < lines.length; i++) {
    let raw = lines[i];
    if (!raw.trim()) { flush(); continue; }
    if (raw[0] === '\x01') {  // bold line in the guide = heading; wrapped heading lines are joined
      const t = raw.slice(1).trim();
      if (cur && cur.t === 'h' && canJoinHeading(cur.s, t)) { cur.s += ' ' + t; continue; }
      if (!cur || cur.t !== 'h') {
        if (/^[a-z]/.test(t)) { raw = '  ' + t; }  // stray bold fragment: ordinary wrapped text
        else { flush(); cur = { t: 'h', s: t }; continue; }
      } else { flush(); cur = { t: 'h', s: t }; continue; }
    }
    if (raw[0] === '\x02') {  // paragraph that starts with a bold label
      flush();
      const t = raw.slice(1).trim();
      cur = { t: 'p', s: t, lead: true, last: t.length };
      continue;
    }
    const indent = raw.length - raw.trimStart().length;
    const line = raw.trim().replace(/\s{2,}/g, ' ');
    if (O_BULLET.test(raw)) {
      flush();
      cur = { t: 'li', s: line.replace(/^o\s+/, ''), sub: true };
    } else if (BULLET.test(raw)) {
      flush();
      cur = { t: 'li', s: line.replace(/^[•○◦\-–]\s+/, ''), sub: /^[○◦\-–]/.test(line) || indent > 2 };
    } else if (cur && cur.t === 'li' && indent >= 1) {
      cur.s += ' ' + line;  // wrapped line of the same bullet
    } else if (cur && cur.t === 'p' && (cur.last >= full || /^[a-z]/.test(line))) {
      cur.s += ' ' + line; cur.last = line.length;  // wrapped line of the same paragraph
    } else {
      flush();
      if (line.length <= 45 && !/[.;,!?]$/.test(line) && nextIsBullet(i)) cur = { t: 'h', s: line };  // unbolded sub-heading above a list
      else cur = { t: 'p', s: line, last: line.length };
    }
  }
  flush();
  let html = '', inList = false;
  for (const b of out) {
    if (b.t !== 'li' && inList) { html += '</ul>'; inList = false; }
    if (b.t === 'li') {
      if (!inList) { html += '<ul class="flow">'; inList = true; }
      // inline markers: extra bullets / sub-bullets
      const parts = b.s.split(/\s*[○◦]\s+/).flatMap((x, k) => k ? [x] : x.split(/\s+•\s+/)).flatMap((x, k) => k ? [x] : x.split(/\s+o\s+(?=[A-Z])/));
      const [first, ...subs] = parts;
      html += pieces(first).map(p => liHtml(p, b.sub)).join('') + subs.flatMap(pieces).map(p => liHtml(p, true)).join('');
    }
    else if (b.t === 'h') {
      if (b.s.length > 80) html += `<p class="callout">${esc(b.s)}</p>`;
      else { html += `<h3>${esc(b.s)}</h3>`; heads.push(b.s); }
    }
    else {
      const m = b.lead && b.s.match(/^([^:]{1,60}:)\s+(.*)$/);
      html += m ? `<p><b>${esc(m[1])}</b> ${esc(m[2])}</p>` : `<p>${esc(b.s)}</p>`;
    }
  }
  return { html: html + (inList ? '</ul>' : ''), heads };
}

function homeHtml(q) {
  q = q.trim().toLowerCase();
  const match = q ? sections.filter(s => (s.title + ' ' + s.text).toLowerCase().includes(q)) : sections;
  let html = `<input id="search" type="search" placeholder="Search procedures…" value="${esc(q)}" aria-label="Search" autocomplete="off">`;
  if (!match.length) return html + '<p class="empty">No matches.</p>';
  const favs = loadFavs().length;
  html += `<p><a class="fav-link" href="#/favorites">★ Favorites (${favs})</a></p>`;
  for (const c of categories) {
    const items = match.filter(s => s.category === c);
    if (items.length) html += `<details ${q ? 'open' : ''}><summary><span class="cico" aria-hidden="true">${ICONS[c] || '📄'}</span>${esc(c)} <span class="count">${items.length}</span></summary>${listHtml(items)}</details>`;
  }
  return html;
}

let homeQuery = '';
function render() {
  const hash = location.hash.replace(/^#\/?/, '');
  if (hash === 'favorites') {
    titleEl.textContent = 'Favorites';
    const favs = loadFavs().map(id => byId[id]);
    view.innerHTML = favs.length ? listHtml(favs) : '<p class="empty">No favorites yet. Tap ☆ next to a procedure to add it.</p>';
  } else if (hash.startsWith('p/')) {
    const s = byId[hash.slice(2)];
    if (!s) { location.hash = '#/'; return; }
    titleEl.textContent = s.title;
    const imgs = (s.images || []).map(src => `<a href="${src}" target="_blank" rel="noopener"><img class="page" loading="lazy" src="${src}" alt="IRPG printed page: ${esc(s.title)}"></a>`).join('');
    const isForm = s.id === 'medical-report' && window.MedForm;
    const pl = s.images.length > 1 ? 's' : '';
    let body, heads = [], tail;
    if (isForm) {  // fill-in form; printed pages collapsed underneath for checking
      body = window.MedForm.html();
      tail = `<details class="orig"><summary>Original printed page${pl} (check against form)</summary>${imgs}</details>`;
    } else if (s.mono) {  // tables / columns: the printed page is the reliable view, extracted text is secondary
      body = `<details class="orig" open><summary>Printed page${pl} (tap a page to zoom)</summary>${imgs}</details>`;
      tail = `<details class="orig"><summary>Text version (columns and tables may not line up)</summary><pre class="mono">${esc(s.text.replace(/[\x01\x02]/g, '').replace(/[○◦]/g, '-'))}</pre></details>`;
    } else {
      const f = flowHtml(s.text, s.id);
      body = f.html; heads = f.heads;
      tail = `<details class="orig" ${s.openImages ? 'open' : ''}><summary>Original printed page${pl} (check against text)</summary>${imgs}</details>`;
    }
    const hasChecks = !s.mono && /[☐□]/.test(s.text);
    const jump = s.images.length >= 3 && heads.length >= 4 ? '<div class="jump">' + heads.slice(1).map(h => `<button class="chip" data-jump="${esc(h)}">${esc(h)}</button>`).join('') + '</div>' : '';
    view.innerHTML = `<button class="fav-btn ${isFav(s.id) ? 'on' : ''}" data-id="${s.id}">${isFav(s.id) ? '★ Remove from Favorites' : '☆ Add to Favorites'}</button>` +
      (hasChecks ? `<button class="clear-btn" data-clear="${s.id}">Clear checkmarks</button>` : '') + jump +
      `<p class="src">${esc(s.category)} · IRPG ${/^(\d+|[ivx]+)(–|$)/.test(s.pages) ? 'p.' : ''} ${esc(s.pages)}</p>` + body + tail;
  } else {
    titleEl.innerHTML = '<img class="logo" src="icons/logo.png" alt="" width="40" height="40"><span>IRPG Companion</span>';
    view.innerHTML = homeHtml(homeQuery) +
      '<footer>Unofficial companion. Content from the NWCG Incident Response Pocket Guide (PMS 461, January 2025), a public domain NWCG publication. Not a substitute for the current guide: confirm at nwcg.gov/publications/pms461.<br>App version ' + APP_VERSION + '</footer>';
  }
  window.scrollTo(0, 0);
}

view.addEventListener('change', e => {
  const box = e.target.closest('input[data-ck]');
  if (!box) return;
  const sid = location.hash.replace(/^#\/?p\//, '');
  const all = loadChecks();
  const set = new Set(all[sid] || []);
  if (box.checked) set.add(+box.dataset.ck); else set.delete(+box.dataset.ck);
  if (set.size) all[sid] = [...set]; else delete all[sid];
  saveChecks(all);
});
view.addEventListener('click', e => {
  const clr = e.target.closest('button[data-clear]');
  if (clr) {
    const all = loadChecks();
    delete all[clr.dataset.clear];
    saveChecks(all);
    view.querySelectorAll('input[data-ck]').forEach(b => { b.checked = false; });
    return;
  }
  const j = e.target.closest('button[data-jump]');
  if (j) {
    const h = [...view.querySelectorAll('h3')].find(x => x.textContent.trim().startsWith(j.dataset.jump.slice(0, 40)));
    if (h) h.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  const b = e.target.closest('button[data-id]');
  if (!b) return;
  toggleFav(b.dataset.id);
  const y = window.scrollY;
  render();
  window.scrollTo(0, y);
});
view.addEventListener('input', e => {
  if (e.target.id !== 'search') return;
  homeQuery = e.target.value;
  view.innerHTML = homeHtml(homeQuery) + '';
  const el = document.getElementById('search');
  el.focus(); el.setSelectionRange(el.value.length, el.value.length);
});
if (window.MedForm) window.MedForm.bind(view);
window.addEventListener('hashchange', render);
render();

if ('serviceWorker' in navigator) {
  // When a new version takes over, reload once so the page and its files are from the same release.
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !reloaded) { reloaded = true; location.reload(); }
  });
  navigator.serviceWorker.register('sw.js').then(r => r.update()).catch(() => {});
}
