// Disney UI v2 — hero plays full embed (if enabled), cards play trailers
// 🔑 Put your TMDB API key here
const TMDB_API_KEY = "35ee82bcad013e6a6237a0a087d7eb32";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

// Toggle: hero Play attempts full embed provider; cards always show trailer.
// WARNING: embedding full movies may require licensing. Only enable if you have rights.
const HERO_FULL_EMBED = true;
const FULL_EMBED_TEMPLATE = "https://embedmaster.link/movie/{tmdbId}";

const DEBOUNCE_MS = 350;
let debounceTimer = null;

// Helpers
function $id(id){ return document.getElementById(id); }
function safeQuery(sel, root = document){ try { return root.querySelector(sel); } catch(e){ return null; } }
function escapeHtml(s){ return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;"); }

async function fetchJson(url){
  const cacheKey = `cache:${url}`;
  try{
    const cached = sessionStorage.getItem(cacheKey);
    if(cached) return JSON.parse(cached);
    const res = await fetch(url);
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    try { sessionStorage.setItem(cacheKey, JSON.stringify(data)); } catch(e){ /* ignore */ }
    return data;
  }catch(err){
    console.warn("fetchJson failed:", err, url);
    return null;
  }
}

function makeCard(movie){
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "card";
  btn.dataset.movieId = movie.id;
  btn.dataset.movieTitle = movie.title || movie.name || "";
  btn.innerHTML = `
    <img loading="lazy" src="${movie.poster_path ? TMDB_IMG + movie.poster_path : 'https://via.placeholder.com/500x750?text=No+Image'}" alt="${escapeHtml(movie.title || movie.name)} poster">
    <div class="meta">
      <div class="title">${escapeHtml(movie.title || movie.name)}</div>
      <div class="sub">${movie.release_date ? movie.release_date.slice(0,4) : 'N/A'} • ⭐ ${movie.vote_average?.toFixed(1) ?? 'N/A'}</div>
    </div>
  `;
  return btn;
}

function renderRail(container, movies){
  try{
    container.innerHTML = "";
    if(!movies || movies.length === 0){
      container.innerHTML = `<div class="card"><div class="meta"><div class="title">No items</div></div></div>`;
      return;
    }
    movies.forEach(m => container.appendChild(makeCard(m)));
  }catch(e){
    console.error("renderRail error:", e);
    container.innerHTML = `<div class="card"><div class="meta"><div class="title">Render error</div></div></div>`;
  }
}

function openModal(){
  const modal = $id("playerModal");
  if(!modal) return;
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
function closeModal(){
  const modal = $id("playerModal");
  if(!modal) return;
  modal.setAttribute("aria-hidden", "true");
  const container = $id("playerContainer");
  if(container) container.innerHTML = "";
  document.body.style.overflow = "";
}

function tryFullEmbed(container, tmdbId, title){
  if(!HERO_FULL_EMBED) return false;
  if(!FULL_EMBED_TEMPLATE) return false;
  try{
    const embedUrl = FULL_EMBED_TEMPLATE.replace("{tmdbId}", encodeURIComponent(String(tmdbId)));
    container.innerHTML = `<iframe src="${embedUrl}" title="${escapeHtml(title)} full" allow="autoplay; encrypted-media" frameborder="0" allowfullscreen style="width:100%;height:60vh;border-radius:8px;border:0"></iframe>`;
    return true;
  }catch(e){
    console.warn("Full embed insertion failed", e);
    return false;
  }
}

async function loadTrailer(container, movieId, title){
  container.innerHTML = `<div style="padding:24px;color:var(--muted)">Loading trailer…</div>`;
  const data = await fetchJson(`${TMDB_BASE}/movie/${movieId}/videos?api_key=${TMDB_API_KEY}&language=en-US`);
  if(!data || !data.results || data.results.length === 0){
    container.innerHTML = `<div style="padding:24px;color:var(--muted)">Trailer not available.</div>`;
    return;
  }
  const trailer = data.results.find(v => v.type === "Trailer" && v.site === "YouTube") || data.results[0];
  if(trailer && trailer.site === "YouTube"){
    const src = `https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0`;
    container.innerHTML = `<iframe src="${src}" title="${escapeHtml(title)} trailer" allow="autoplay; encrypted-media" frameborder="0" allowfullscreen style="width:100%;height:60vh;border-radius:8px;border:0"></iframe>`;
  } else {
    container.innerHTML = `<div style="padding:24px;color:var(--muted)">Trailer not available.</div>`;
  }
}

// Primary: hero uses full embed attempt; cards always show trailer
async function openPlayerFor(movie, options = { preferFull: false }){
  const container = $id("playerContainer");
  if(!container) return console.warn("playerContainer missing");
  openModal();

  if(options.preferFull){
    const ok = tryFullEmbed(container, movie.id, movie.title || movie.name || "");
    if(ok) return;
  }

  await loadTrailer(container, movie.id, movie.title || movie.name || "");
}

async function loadHero(){
  const heroTitle = $id("heroTitle");
  const heroOverview = $id("heroOverview");
  const heroArt = safeQuery(".hero-art");
  try{
    const data = await fetchJson(`${TMDB_BASE}/movie/now_playing?api_key=${TMDB_API_KEY}&language=en-US&page=1`);
    const pick = data?.results?.[0];
    if(!pick) return;
    if(heroTitle) heroTitle.textContent = pick.title || pick.name;
    if(heroOverview) heroOverview.textContent = pick.overview || "";
    if(heroArt) heroArt.style.backgroundImage = `url(${pick.backdrop_path ? TMDB_IMG.replace('/w500','/w780') + pick.backdrop_path : 'https://via.placeholder.com/1280x720'})`;
    const playHero = $id("playHero");
    if(playHero) playHero.onclick = () => openPlayerFor(pick, { preferFull: true });
    const moreHero = $id("moreHero");
    if(moreHero) moreHero.onclick = () => window.open(`https://www.themoviedb.org/movie/${pick.id}`, "_blank", "noopener");
  }catch(e){
    console.warn("loadHero failed", e);
  }
}

async function loadRails(){
  const popularRail = $id("popularRail");
  const trendingRail = $id("trendingRail");
  const continueRail = $id("continueRail");
  if(!popularRail || !trendingRail || !continueRail) return console.warn("One or more rails missing");
  try{
    const [popular, trending] = await Promise.all([
      fetchJson(`${TMDB_BASE}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`),
      fetchJson(`${TMDB_BASE}/trending/movie/week?api_key=${TMDB_API_KEY}`)
    ]);
    renderRail(popularRail, popular?.results || []);
    renderRail(trendingRail, trending?.results || []);
    renderRail(continueRail, (popular?.results || []).slice(0,8));
  }catch(e){
    console.error("loadRails error", e);
    popularRail.innerHTML = `<div class="card"><div class="meta"><div class="title">Unable to load content</div></div></div>`;
  }
}

function renderRail(container, movies){
  try{
    container.innerHTML = "";
    if(!movies || movies.length === 0){
      container.innerHTML = `<div class="card"><div class="meta"><div class="title">No items</div></div></div>`;
      return;
    }
    movies.forEach(m => container.appendChild(makeCard(m)));
  }catch(e){
    console.error("renderRail error:", e);
    container.innerHTML = `<div class="card"><div class="meta"><div class="title">Render error</div></div></div>`;
  }
}

function makeCard(movie){
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "card";
  btn.dataset.movieId = movie.id;
  btn.dataset.movieTitle = movie.title || movie.name || "";
  btn.innerHTML = `
    <img loading="lazy" src="${movie.poster_path ? TMDB_IMG + movie.poster_path : 'https://via.placeholder.com/500x750?text=No+Image'}" alt="${escapeHtml(movie.title || movie.name)} poster">
    <div class="meta">
      <div class="title">${escapeHtml(movie.title || movie.name)}</div>
      <div class="sub">${movie.release_date ? movie.release_date.slice(0,4) : 'N/A'} • ⭐ ${movie.vote_average?.toFixed(1) ?? 'N/A'}</div>
    </div>
  `;
  return btn;
}

// Search
function doSearch(query){
  if(!query) return loadRails();
  fetchJson(`${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1&include_adult=false`)
    .then(data => {
      const popularRail = $id("popularRail");
      if(popularRail) renderRail(popularRail, data?.results || []);
      const heroTitle = $id("heroTitle");
      const heroOverview = $id("heroOverview");
      if(heroTitle) heroTitle.textContent = `Search: ${query}`;
      if(heroOverview) heroOverview.textContent = `Results for "${query}"`;
    })
    .catch(err => console.error("Search failed", err));
}

// Delegation
function attachDelegation(){
  document.addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if(card && card.dataset && card.dataset.movieId){
      const id = card.dataset.movieId;
      const title = card.dataset.movieTitle || "";
      fetchJson(`${TMDB_BASE}/movie/${id}?api_key=${TMDB_API_KEY}&language=en-US`)
        .then(movie => {
          if(movie) openPlayerFor(movie, { preferFull: false });
          else openPlayerFor({ id, title }, { preferFull: false });
        });
      return;
    }

    if(e.target && e.target.id === "searchBtn"){
      const q = ($id("searchInput")?.value || "").trim();
      doSearch(q);
      return;
    }

    if(e.target && (e.target.matches(".modal-backdrop") || e.target.classList.contains("modal-close") || e.target.dataset.dismiss === "modal")){
      closeModal();
      return;
    }
  });
}

function attachKeyboard(){
  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape" && $id("playerModal")?.getAttribute("aria-hidden") === "false"){
      closeModal();
    }
  });
}

function init(){
  try{
    attachDelegation();
    attachKeyboard();

    const searchInput = $id("searchInput");
    if(searchInput){
      searchInput.addEventListener("input", (ev) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const q = ev.target.value.trim();
          if(q) doSearch(q);
        }, DEBOUNCE_MS);
      });
      searchInput.addEventListener("keydown", (ev) => {
        if(ev.key === "Enter") {
          const q = ev.target.value.trim();
          doSearch(q);
        }
      });
    }

    const modalClose = safeQuery(".modal-close");
    if(modalClose) modalClose.addEventListener("click", closeModal);

    loadHero();
    loadRails();

    console.info("UI initialized. TMDB key present:", !!TMDB_API_KEY && TMDB_API_KEY !== "REPLACE_WITH_YOUR_KEY");
  }catch(e){
    console.error("Init error:", e);
  }
}

if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
