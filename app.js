const view = document.getElementById('view');
const titleEl = document.getElementById('title');
const KEY = 'irpg-favorites';
const procs = window.PROCEDURES;

function loadFavs() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
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

function listHtml(items) {
  return '<ul class="list">' + items.map(p =>
    `<li><a href="#/p/${p.id}">${esc(p.title)}</a>` +
    `<button class="star" data-id="${p.id}" aria-label="${isFav(p.id) ? 'Remove from' : 'Add to'} favorites">${isFav(p.id) ? '★' : '☆'}</button></li>`
  ).join('') + '</ul>';
}

function render() {
  const hash = location.hash.replace(/^#\/?/, '');
  if (hash === 'favorites') {
    titleEl.textContent = 'Favorites';
    const favs = loadFavs().map(id => procs.find(p => p.id === id)).filter(Boolean);
    view.innerHTML = favs.length ? listHtml(favs) : '<p class="empty">No favorites yet. Tap ☆ next to a procedure to add it.</p>';
  } else if (hash.startsWith('p/')) {
    const p = procs.find(x => x.id === hash.slice(2));
    if (!p) { location.hash = '#/'; return; }
    titleEl.textContent = p.title;
    const body = p.steps.length
      ? '<ol class="steps">' + p.steps.map(s => `<li>${esc(s)}</li>`).join('') + '</ol>'
      : '<p class="notice">IRPG text for this procedure has not been added yet. Always use the current printed IRPG (PMS 461).</p>';
    view.innerHTML = `<button class="fav-btn ${isFav(p.id) ? 'on' : ''}" data-id="${p.id}">${isFav(p.id) ? '★ Remove from Favorites' : '☆ Add to Favorites'}</button>` +
      (p.page ? `<p class="empty">IRPG page ${esc(p.page)}</p>` : '') + body;
  } else {
    titleEl.textContent = 'IRPG Companion';
    view.innerHTML = listHtml(procs) +
      '<footer>Unofficial companion. Not a substitute for the current NWCG Incident Response Pocket Guide (PMS 461).</footer>';
  }
  window.scrollTo(0, 0);
}

view.addEventListener('click', e => {
  const b = e.target.closest('[data-id]');
  if (!b || !(b.matches('button'))) return;
  toggleFav(b.dataset.id);
  const y = window.scrollY;
  render();
  window.scrollTo(0, y);
});
window.addEventListener('hashchange', render);
render();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
