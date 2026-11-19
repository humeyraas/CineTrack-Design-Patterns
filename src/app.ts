import { Media, MediaDetails, WatchStatus } from './core/models.js';
import { MovieFactory, SeriesFactory, MediaFactorySelector } from './core/factory.js';
import { TmdbCatalogAdapter, RawTmdbClient } from './services/tmdb-adapter.js';
import { WatchlistStore } from './core/watchlist.js';
import { ActivityLogObserver, StatisticsObserver } from './core/observer.js';
import { WatchlistSorter, NewestFirstStrategy, PersonalRatingStrategy, TitleAZStrategy } from './core/strategy.js';

/** CineTrack UI - 4 GoF kalıbı hazır araçlarla değil, src/core ve src/services altında uygulandı. */
const $ = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`HTML öğesi bulunamadı: ${id}`);
  return element as T;
};
const catalog = new TmdbCatalogAdapter(new RawTmdbClient()); // Adapter: Target + Adapter + Adaptee
const factory = new MediaFactorySelector(new MovieFactory(), new SeriesFactory()); // Factory Method
const watchlist = new WatchlistStore(localStorage); // Observer: ConcreteSubject
const sorter = new WatchlistSorter(new NewestFirstStrategy()); // Strategy: Context
const stats = new StatisticsObserver(renderStats);
const activity = new ActivityLogObserver(renderActivity);
watchlist.attach(stats);
watchlist.attach(activity);
let searchResults: MediaDetails[] = [];
let currentPage = 1;
let totalPages = 1;
let searchRequestId = 0;
let activeFilter = 'all';
let activeView: 'discover' | 'watchlist' | 'stats' = 'discover';
let toastTimeout = 0;
const escapeHTML = (value: string): string => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char);
const labelStatus = (v: WatchStatus): string => ({ planned: 'İzleyeceğim', watching: 'İzliyorum', completed: 'Tamamladım' })[v];
const toKey = (m: MediaDetails): string => `${m.kind}:${m.id}`;
const imgUrl = (path: string | null): string | null => path && /^\/[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp)$/i.test(path) ? `https://image.tmdb.org/t/p/w500${path}` : null;
const year = (date: string): string => /^\d{4}/.test(date) ? date.slice(0, 4) : 'Yıl bilinmiyor';

function notice(message: string): void {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('visible');
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => el.classList.remove('visible'), 2700);
}

function mediaCard(details: MediaDetails, listMode: boolean): string {
  const media: Media = factory.create(details); // Factory Method oluşturma süreci aktif kullanılır
  const item = watchlist.getByKey(media.key);
  const poster = imgUrl(details.posterPath);
  const color = media.kind === 'movie' ? 'movie' : 'series';
  const image = poster
    ? `<img class="poster-image" src="${poster}" alt="${escapeHTML(media.title)} afişi" loading="lazy" referrerpolicy="no-referrer" />`
    : `<div class="poster-fallback ${color}"><span>${media.kind === 'movie' ? '◈' : '▣'}</span><strong>${escapeHTML(media.title)}</strong></div>`;
  const actions = listMode
    ? `<div class="card-actions"><select aria-label="${escapeHTML(media.title)} izleme durumu" data-action="status" data-key="${media.key}"><option value="planned" ${item?.status === 'planned' ? 'selected' : ''}>İzleyeceğim</option><option value="watching" ${item?.status === 'watching' ? 'selected' : ''}>İzliyorum</option><option value="completed" ${item?.status === 'completed' ? 'selected' : ''}>Tamamladım</option></select>
      <select aria-label="${escapeHTML(media.title)} kişisel puanı" data-action="rating" data-key="${media.key}"><option value="">Puan ver</option>${Array.from({ length: 10 }, (_, index) => `<option value="${index + 1}" ${item?.personalRating === index + 1 ? 'selected' : ''}>${index + 1}/10</option>`).join('')}</select>
      <button class="remove-btn" data-action="remove" data-key="${media.key}" title="Listeden çıkar" aria-label="Listeden çıkar">✕</button></div>`
    : `<button class="add-btn ${item ? 'already' : ''}" data-action="add" data-key="${media.key}" ${item ? 'disabled' : ''}>${item ? '✓ Listemde' : '+ Listeme ekle'}</button>`;
  return `<article class="media-card" data-key="${media.key}">
    <button class="poster-click" data-action="details" data-key="${media.key}" aria-label="${escapeHTML(media.title)} detayları"><div class="poster">${image}<span class="kind-pill">${media.getTypeLabel()}</span></div></button>
    <div class="card-body"><div class="card-meta"><span>${escapeHTML(year(details.releaseDate))}</span><span class="rating">★ ${Number.isFinite(details.voteAverage) ? details.voteAverage.toFixed(1) : '–'}</span></div>
    <button class="title-click" data-action="details" data-key="${media.key}">${escapeHTML(media.title)}</button><p>${escapeHTML(details.overview || 'Açıklama yok.')}</p>${actions}</div></article>`;
}

function renderDiscover(): void {
  const filtered = searchResults.filter(m => activeFilter === 'all' || m.kind === activeFilter);
  $('catalog-grid').innerHTML = filtered.length ? filtered.map(m => mediaCard(m, false)).join('') : '<div class="empty-state"><span>⌕</span><h3>Sonuç bulunamadı</h3><p>Başka bir film veya dizi aramayı dene.</p></div>';
  $('pager').classList.toggle('hidden', totalPages <= 1);
  $<HTMLButtonElement>('page-prev').disabled = currentPage <= 1;
  $<HTMLButtonElement>('page-next').disabled = currentPage >= totalPages;
  $('page-indicator').textContent = `${currentPage} / ${totalPages}`;
}
function renderWatchlist(): void {
  const items = sorter.sort(watchlist.getItems()); // Strategy, davranışın çalışma anında değiştirilmesi
  $('watchlist-grid').innerHTML = items.length ? items.map(item => mediaCard(item.media, true)).join('') : '<div class="empty-state"><span>☆</span><h3>Listen henüz boş</h3><p>Keşfet bölümünden ilk filmini veya dizini ekle.</p><button class="secondary-btn" id="empty-discover">Keşfete git</button></div>';
  $('nav-count').textContent = String(items.length);
}
function renderStats(values: { total: number; planned: number; watching: number; completed: number }): void {
  for (const key of ['total', 'planned', 'watching', 'completed'] as const) $(`count-${key}`).textContent = String(values[key]);
  const bars = ([['planned', 'İzleyeceğim'], ['watching', 'İzliyorum'], ['completed', 'Tamamladım']] as const)
    .map(([key, name]) => `<div class="bar-label"><span>${name}</span><strong>${values[key]}</strong></div><div class="bar-track"><div class="bar-fill ${key}" style="width: ${values.total ? 100 * values[key] / values.total : 0}%"></div></div>`).join('');
  $('status-bars').innerHTML = bars;
  renderWatchlist();
  renderDiscover();
}
function renderActivity(entries: readonly { message: string; createdAt: string }[]): void {
  $('activity-feed').innerHTML = entries.length ? entries.map(entry => `<div class="activity-row"><span class="activity-dot"></span><div><p>${escapeHTML(entry.message)}</p><small>${escapeHTML(entry.createdAt)}</small></div></div>`).join('') : '<p class="empty-small">Henüz işlem yok. İzleme listene bir yapım ekle.</p>';
}
function setView(view: typeof activeView): void {
  activeView = view;
  for (const name of ['discover', 'watchlist', 'stats'] as const) {
    $(`${name}-section`).classList.toggle('hidden', name !== view);
  }
  document.querySelectorAll<HTMLButtonElement>('.nav-link').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
  $('hero').classList.toggle('hidden', view !== 'discover');
  if (view === 'watchlist') renderWatchlist();
  if (view === 'stats') { stats.recalculate(watchlist.getItems()); renderActivity(activity.getEntries()); }
}
async function runSearch(page = 1): Promise<void> {
  const requestId = ++searchRequestId;
  const query = ($<HTMLInputElement>('search-input').value || '').trim();
  $('catalog-message').textContent = 'Yapımlar yükleniyor…';
  try {
    const response = await catalog.searchPage(query, page); // Adapter: dış API -> ortak model
    if (requestId !== searchRequestId) return;
    searchResults = response.items;
    currentPage = response.page;
    totalPages = response.totalPages;
    $('catalog-message').textContent = query
      ? `“${query}” araması · ${searchResults.length} yapım · Sayfa ${currentPage}`
      : `Bu haftanın öne çıkan film ve dizileri · Sayfa ${currentPage}`;
    renderDiscover();
    if (page > 1) $('discover-section').scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    if (requestId !== searchRequestId) return;
    searchResults = [];
    currentPage = 1;
    totalPages = 1;
    $('catalog-message').textContent = error instanceof Error ? error.message : 'Veriler alınamadı.';
    renderDiscover();
    console.error(error);
  }
}
function locate(key: string): MediaDetails | undefined {
  return searchResults.find(item => toKey(item) === key) ?? watchlist.getByKey(key)?.media;
}
async function showDetails(key: string): Promise<void> {
  const details = locate(key);
  if (!details) return notice('Yapım bulunamadı.');
  const poster = imgUrl(details.posterPath);
  const isListed = !!watchlist.getByKey(key);
  const media = factory.create(details);
  $('details-content').innerHTML = `<div class="detail-layout"><div class="detail-poster">${poster ? `<img src="${poster}" alt="${escapeHTML(media.title)} afişi" />` : `<div class="poster-fallback ${media.kind === 'movie' ? 'movie' : 'series'}"><span>◈</span><strong>${escapeHTML(media.title)}</strong></div>`}</div><div class="detail-text"><span class="eyebrow">${media.getTypeLabel().toUpperCase()} · ${media.getDateLabel().toUpperCase()} ${escapeHTML(year(details.releaseDate))}</span><h2>${escapeHTML(media.title)}</h2><span class="detail-rating">★ ${details.voteAverage.toFixed(1)} / 10</span><p>${escapeHTML(details.overview)}</p><h3>Oyuncular</h3><div id="cast-list" class="cast-list">Oyuncular yükleniyor…</div><button class="primary-btn" data-action="add" data-key="${key}" ${isListed ? 'disabled' : ''}>${isListed ? '✓ Listemde' : '+ Listeme ekle'}</button></div></div>`;
  const dialog = $<HTMLDialogElement>('details-modal');
  if (!dialog.open) dialog.showModal();
  try {
    const cast = await catalog.getCastMembers(details.kind, details.id);
    // API'den gelen metinler escapeHTML ile korunur; profil yolları doğrulanır.
    $('cast-list').innerHTML = cast.length
      ? `<div class="cast-grid">${cast.map(actor => {
          const photo = actor.profilePath && /^\/[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp)$/i.test(actor.profilePath)
            ? `https://image.tmdb.org/t/p/w185${actor.profilePath}` : null;
          return `<div class="cast-member">${photo ? `<img src="${photo}" alt="${escapeHTML(actor.name)}" loading="lazy" />` : '<div class="cast-placeholder">★</div>'}<strong>${escapeHTML(actor.name)}</strong><small>${escapeHTML(actor.character)}</small></div>`;
        }).join('')}</div>`
      : 'Oyuncu bilgisi bulunamadı.';
  } catch { $('cast-list').textContent = 'Oyuncu bilgisi alınamadı.'; }
}

// Butonlar dinamik oluşturulduğundan olay delegasyonu kullanılıyor.
document.addEventListener('click', event => {
  const target = event.target as HTMLElement;
  const nav = target.closest<HTMLButtonElement>('[data-view]');
  if (nav?.dataset.view && ['discover', 'watchlist', 'stats'].includes(nav.dataset.view)) {
    setView(nav.dataset.view as typeof activeView); return;
  }
  const action = target.closest<HTMLElement>('[data-action]');
  const key = action?.dataset.key;
  if (action && key) {
    if (action.dataset.action === 'details') void showDetails(key);
    if (action.dataset.action === 'remove') { if (watchlist.remove(key)) notice('Listeden kaldırıldı.'); }
    if (action.dataset.action === 'add') {
      const item = locate(key);
      if (item && watchlist.add(item)) { notice(`${item.title} listene eklendi.`); renderWatchlist(); }
    }
  }
  if (target.closest('#empty-discover')) setView('discover');
});
document.addEventListener('change', event => {
  const target = event.target as HTMLSelectElement;
  const action = target.dataset.action;
  const key = target.dataset.key;
  if (!key) return;
  if (action === 'status') {
    if (watchlist.setStatus(key, target.value as WatchStatus)) notice('İzleme durumu güncellendi.');
  }
  if (action === 'rating') {
    const score = target.value ? Number(target.value) : null;
    if (watchlist.setRating(key, score)) notice('Puanın kaydedildi.');
  }
});
$('search-button').addEventListener('click', () => void runSearch(1));
$<HTMLInputElement>('search-input').addEventListener('keydown', event => { if (event.key === 'Enter') void runSearch(1); });
$('page-prev').addEventListener('click', () => { if (currentPage > 1) void runSearch(currentPage - 1); });
$('page-next').addEventListener('click', () => { if (currentPage < totalPages) void runSearch(currentPage + 1); });
$<HTMLSelectElement>('media-filter').addEventListener('change', event => {
  activeFilter = (event.currentTarget as HTMLSelectElement).value;
  renderDiscover();
});
$<HTMLSelectElement>('sort-select').addEventListener('change', event => {
  const value = (event.currentTarget as HTMLSelectElement).value;
  sorter.setStrategy(value === 'rating' ? new PersonalRatingStrategy() : value === 'title' ? new TitleAZStrategy() : new NewestFirstStrategy());
  renderWatchlist();
});
$('hero-button').addEventListener('click', () => { setView('discover'); $<HTMLInputElement>('search-input').focus(); });
$('close-modal').addEventListener('click', () => $<HTMLDialogElement>('details-modal').close());
$<HTMLDialogElement>('details-modal').addEventListener('click', event => {
  if (event.target === $('details-modal')) $<HTMLDialogElement>('details-modal').close();
});

async function bootstrap(): Promise<void> {
  try {
    const mode = await catalog.getMode();
    $('mode-badge').textContent = mode === 'demo' ? '● Demo mod' : '● TMDB canlı';
    // Boş arama canlı modda haftalık öne çıkan yapımları getirir.
  } catch { $('mode-badge').textContent = '● Bağlantı kontrol ediliyor'; }
  setView('discover');
  await runSearch();
}
// UI yardımcıları tanımlandıktan sonra ilk istatistikleri çiz.
// Başlangıçta kayıtlı izleme listesi varsa erken çağrı TDZ hatasına yol açıyordu.
stats.recalculate(watchlist.getItems());
void bootstrap();
