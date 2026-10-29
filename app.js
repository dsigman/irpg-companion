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
const BULLET = /^\s{0,2}([•☐□○\-–]|\d{1,2}\.)\s+/;
function flowHtml(text) {
  const out = [];
  let cur = null;
  const flush = () => { if (cur) { out.push(cur); cur = null; } };
  for (const raw of text.split('\n')) {
    if (!raw.trim()) { flush(); continue; }
    const indent = raw.length - raw.trimStart().length;
    const line = raw.trim();
    if (BULLET.test(raw)) {
      flush();
      cur = { t: 'li', s: line.replace(/^[•○\-–]\s+/, ''), sub: /^[○\-–]/.test(line) || indent > 1 };
    } else if (cur && cur.t === 'li' && indent >= 1 && indent <= 6) {
      cur.s += ' ' + line;
    } else if (cur && cur.t === 'p' && indent < 6 && !(line.length < 45 && !/[.!?:]$/.test(line) && /[.!?:]$/.test(cur.s))) {
      cur.s += ' ' + line;
    } else {
      flush();
      cur = { t: line.length < 60 && !/[.:]$/.test(line) && indent >= 0 ? 'h' : 'p', s: line };
      if (cur.t === 'h') { out.push(cur); cur = null; }
    }
  }
  flush();
  let html = '', inList = false;
  for (const b of out) {
    if (b.t !== 'li' && inList) { html += '</ul>'; inList = false; }
    if (b.t === 'li') { if (!inList) { html += '<ul class="flow">'; inList = true; } html += `<li class="${b.sub ? 'sub' : ''}">${esc(b.s)}</li>`; }
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
    const body = s.mono ? `<pre class="mono">${esc(s.text)}</pre>` : flowHtml(s.text);
    view.innerHTML = `<button class="fav-btn ${isFav(s.id) ? 'on' : ''}" data-id="${s.id}">${isFav(s.id) ? '★ Remove from Favorites' : '☆ Add to Favorites'}</button>` +
      `<p class="src">${esc(s.category)} · IRPG PDF page${s.pages.includes('–') ? 's' : ''} ${esc(s.pages)}</p>` + body +
      `<details class="orig" ${s.openImages ? 'open' : ''}><summary>Original printed page${s.images.length > 1 ? 's' : ''} (check against text)</summary>${imgs}</details>`;
  } else {
    titleEl.textContent = 'IRPG Companion';
    view.innerHTML = homeHtml(homeQuery) +
      '<footer>Unofficial companion. Content from the NWCG Incident Response Pocket Guide (PMS 461, January 2025), a public domain NWCG publication. Not a substitute for the current guide: confirm at nwcg.gov/publications/pms461.</footer>';
  }
  window.scrollTo(0, 0);
}

view.addEventListener('click', e => {
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
window.addEventListener('hashchange', render);
render();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
