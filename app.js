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

function itemHtml(s) {
  const on = isFav(s.id);
  return `<li><a href="#/p/${s.id}">${esc(s.title)}</a>` +
    `<button class="star" data-id="${s.id}" aria-label="${on ? 'Remove from' : 'Add to'} favorites: ${esc(s.title)}">${on ? '★' : '☆'}</button></li>`;
}
const listHtml = items => '<ul class="list">' + items.map(itemHtml).join('') + '</ul>';

// Turns the guide's page text into HTML. Bullets/checkboxes/numbers start items, lightly indented lines continue
// the previous item, and anything else is a heading or paragraph line.
const BULLET = /^\s{0,10}([•☐□○\-–]|\d{1,2}\.)\s+/;
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
  const out = [];
  let cur = null;
  const flush = () => { if (cur) { out.push(cur); cur = null; } };
  for (const raw of text.split('\n')) {
    if (!raw.trim()) { flush(); continue; }
    if (raw[0] === '\x01') {  // bold line in the guide = heading; consecutive heading lines are one heading
      const t = raw.slice(1).trim();
      if (cur && cur.t === 'h' && cur.s !== cur.s.toUpperCase()) cur.s += ' ' + t; else { flush(); cur = { t: 'h', s: t }; }
      continue;
    }
    const indent = raw.length - raw.trimStart().length;
    const line = raw.trim();
    if (BULLET.test(raw)) {
      flush();
      cur = { t: 'li', s: line.replace(/^[•○◦\-–]\s+/, ''), sub: /^[○◦\-–]/.test(line) || indent > 2 };
    } else if (cur && (cur.t === 'p' || (cur.t === 'li' && indent >= 1))) {
      cur.s += ' ' + line;  // wrapped line of the same bullet (indented) or paragraph
    } else {
      flush();
      cur = { t: 'p', s: line };
    }
  }
  flush();
  let html = '', inList = false;
  for (const b of out) {
    if (b.t !== 'li' && inList) { html += '</ul>'; inList = false; }
    if (b.t === 'li') {
      if (!inList) { html += '<ul class="flow">'; inList = true; }
      const [first, ...subs] = b.s.split(/\s*[○◦]\s+/);  // inline hollow-circle markers are sub-bullets
      html += pieces(first).map(p => liHtml(p, b.sub)).join('') + subs.flatMap(pieces).map(p => liHtml(p, true)).join('');
    }
    else if (b.t === 'h') html += `<h3>${esc(b.s)}</h3>`;
    else html += `<p>${esc(b.s)}</p>`;
  }
  return html + (inList ? '</ul>' : '');
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
    if (items.length) html += `<details ${q ? 'open' : ''}><summary>${esc(c)} <span class="count">${items.length}</span></summary>${listHtml(items)}</details>`;
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
    const imgs = (s.images || []).map(src => `<img class="page" loading="lazy" src="${src}" alt="IRPG page image: ${esc(s.title)}">`).join('');
    const heads = s.mono ? [] : s.text.split('\n').filter(l => l[0] === '\x01').map(l => l.slice(1).trim());
    const jump = s.images.length >= 3 && heads.length >= 4 ? '<div class="jump">' + heads.slice(1).map((h, i) => `<button class="chip" data-jump="${esc(h)}">${esc(h)}</button>`).join('') + '</div>' : '';
    const isForm = s.id === 'medical-report' && window.MedForm;
    const body = isForm ? window.MedForm.html() : s.mono ? `<pre class="mono">${esc(s.text.replace(/[○◦]/g, '-'))}</pre>` : flowHtml(s.text, s.id);
    const hasChecks = !s.mono && /[☐□]/.test(s.text);
    view.innerHTML = `<button class="fav-btn ${isFav(s.id) ? 'on' : ''}" data-id="${s.id}">${isFav(s.id) ? '★ Remove from Favorites' : '☆ Add to Favorites'}</button>` +
      (hasChecks ? `<button class="clear-btn" data-clear="${s.id}">Clear checkmarks</button>` : '') + jump + `<p class="src">${esc(s.category)} · IRPG ${/^(\d+|[ivx]+)(–|$)/.test(s.pages) ? 'p.' : ''} ${esc(s.pages)}</p>` + body +
      `<details class="orig" ${s.openImages && !isForm ? 'open' : ''}><summary>Original printed page${s.images.length > 1 ? 's' : ''} (check against ${isForm ? 'form' : 'text'})</summary>${imgs}</details>`;
  } else {
    titleEl.textContent = 'IRPG Companion';
    view.innerHTML = homeHtml(homeQuery) +
      '<footer>Unofficial companion. Content from the NWCG Incident Response Pocket Guide (PMS 461, January 2025), a public domain NWCG publication. Not a substitute for the current guide: confirm at nwcg.gov/publications/pms461.</footer>';
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

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
