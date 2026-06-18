// 🔑 Put your TMDB API key here
const TMDB_API_KEY = "REPLACE_WITH_YOUR_KEY";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const heroTitle = document.getElementById("heroTitle");
const heroOverview = document.getElementById("heroOverview");
const heroArt = document.querySelector(".hero-art");
const popularRail = document.getElementById("popularRail");
const trendingRail = document.getElementById("trendingRail");
const continueRail = document.getElementById("continueRail");
const playerModal = document.getElementById("playerModal");
const playerContainer = document.getElementById("playerContainer");

let debounceTimer = null;
const DEBOUNCE_MS = 350;

// Basic helper: escape text for DOM
function escapeHtml(str){
  return String(str || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// Fetch wrapper with basic error handling and caching
async function fetchJson(url){
  const cacheKey = `cache:${url}`;
  try{
    const cached = sessionStorage.getItem(cacheKey);
    if(cached) return JSON.parse(cached);
    const res = await fetch(url);
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    sessionStorage.setItem(cacheKey, JSON.stringify(data));
    return data;
  }catch(err){
    console.error("Fetch error:", err);
    throw err;
  }
}

// Render a rail of movies
function renderRail(container, movies){
  container.innerHTML = "";
  if(!movies || movies.length === 0){
    container.innerHTML = `<div class="card"><div class="meta"><div class="title">No items</div></div></div>`;
    return;
  }
  movies.forEach(m => {
    const card = document.createElement("button");
    card.className = "card";
    card.setAttribute("aria-label", `${m.title || m.name} — ${m.release_date ? m.release_date.slice(0,4) : ''}`);
    card.innerHTML = `
      <img loading="lazy" src="${m.poster_path ? TMDB_IMG + m.poster_path : 'https://via.placeholder.com/500x750?text=No+Image'}" alt="${escapeHtml(m.title || m.name)} poster">
      <div class="meta">
        <div class="title">${escapeHtml(m.title || m.name)}</div>
        <div class="sub">${m.release_date ? m.release_date.slice(0,4) : 'N/A'} • ⭐ ${m.vote_average?.toFixed(1) ?? 'N/A'}</div>
      </div>
    `;
    card.addEventListener("click", () => openPlayerFor(m));
    container.appendChild(card);
  });
}

// Open player modal (user-initiated). For safety, only embed when user clicks.
function openPlayerFor(movie){
  // Prefer official trailer from YouTube via TMDB videos endpoint
  playerContainer.innerHTML = `<div style="padding:24px;color:var(--muted)">Loading player…</div>`;
  playerModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  fetchJson(`${TMDB_BASE}/movie/${movie.id}/videos?api_key=${TMDB_API_KEY}&language=en-US`)
    .then(data => {
      const trailer = (data.results || []).find(v => v.type === "Trailer" && v.site === "YouTube") || data.results?.[0];
      if(trailer && trailer.site === "YouTube"){
        const src = `https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0`;
        playerContainer.innerHTML = `<iframe src="${src}" title="${escapeHtml(movie.title)} trailer" allow="autoplay; encrypted-media" frameborder="0" allowfullscreen></iframe>`;
      } else {
        playerContainer.innerHTML = `<div style="padding:24px;color:var(--muted)">Trailer not available. Open details page instead.</div>`;
      }
    })
    .catch(err => {
      playerContainer.innerHTML = `<div style="padding:24px;color:var(--muted)">Unable to load trailer.</div>`;
    });
}

// Close modal
function closeModal(){
  playerModal.setAttribute("aria-hidden", "true");
  playerContainer.innerHTML = "";
  document.body.style.overflow = "";
}

// Load hero (pick a featured movie)
async function loadHero(){
  try{
    const data = await fetchJson(`${TMDB_BASE}/movie/now_playing?api_key=${TMDB_API_KEY}&language=en-US&page=1`);
    const pick = data.results?.[0];
    if(!pick) return;
    heroTitle.textContent = pick.title || pick.name;
    heroOverview.textContent = pick.overview || "";
    heroArt.style.backgroundImage = `url(${pick.backdrop_path ? TMDB_IMG.replace('/w500','/w780') + pick.backdrop_path : 'https://via.placeholder.com/1280x720'})`;
    document.getElementById("playHero").onclick = () => openPlayerFor(pick);
    document.getElementById("moreHero").onclick = () => openDetails(pick);
  }catch(err){
    console.warn("Hero load failed", err);
  }
}

// Open details (fallback to TMDB page)
function openDetails(movie){
  const url = `https://www.themoviedb.org/movie/${movie.id}`;
  window.open(url, "_blank", "noopener");
}

// Load rails
async function loadRails(){
  try{
    const [popular, trending] = await Promise.all([
      fetchJson(`${TMDB_BASE}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`),
      fetchJson(`${TMDB_BASE}/trending/movie/week?api_key=${TMDB_API_KEY}`)
    ]);
    renderRail(popularRail, popular.results || []);
    renderRail(trendingRail, trending.results || []);
    // continueRail can be user-specific; for demo, reuse popular
    renderRail(continueRail, (popular.results || []).slice(0,8));
  }catch(err){
    console.error("Rail load error", err);
    popularRail.innerHTML = `<div class="card"><div class="meta"><div class="title">Unable to load content</div></div></div>`;
  }
}

// Search with debounce
function doSearch(query){
  if(!query) return loadRails();
  fetchJson(`${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1&include_adult=false`)
    .then(data => {
      renderRail(popularRail, data.results || []);
      heroTitle.textContent = `Search: ${query}`;
      heroOverview.textContent = `Results for "${query}"`;
      heroArt.style.backgroundImage = `linear-gradient(90deg, rgba(0,0,0,0.6), rgba(0,0,0,0.6))`;
    })
    .catch(err => console.error("Search failed", err));
}

// Event wiring
searchBtn.addEventListener("click", () => {
  const q = searchInput.value.trim();
  doSearch(q);
});
searchInput.addEventListener("input", (e) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const q = e.target.value.trim();
    if(q) doSearch(q);
  }, DEBOUNCE_MS);
});

// Modal close handlers
playerModal.addEventListener("click", (e) => {
  if(e.target.matches("[data-dismiss], .modal-backdrop")) closeModal();
});
playerModal.querySelector(".modal-close").addEventListener("click", closeModal);

// Keyboard: Esc to close modal
document.addEventListener("keydown", (e) => {
  if(e.key === "Escape" && playerModal.getAttribute("aria-hidden") === "false") closeModal();
});

// Init
document.addEventListener("DOMContentLoaded", () => {
  if(!TMDB_API_KEY || TMDB_API_KEY === "REPLACE_WITH_YOUR_KEY"){
    console.warn("TMDB API key missing. Replace TMDB_API_KEY in script.js");
  }
  loadHero();
  loadRails();
});
