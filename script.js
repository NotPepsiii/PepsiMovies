// script.js — robust automatic series player (drop in, overwrite existing)

// CONFIG
const TMDB_API_KEY = "35ee82bcad013e6a6237a0a087d7eb32";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p/w300";

// Hosts and path variants to try (ordered). We try multiple hostnames and path shapes.
const HOSTS = [
  "https://embedmaster.link",
  "https://embedmaster.com",
  "https://player.embedmaster.link",
  "https://player.embedmaster.com"
];

const PATH_PATTERNS = [
  "/player/tv/{imdb}/{s}/{e}?player_id={player_id}",
  "/tv/{imdb}/season/{s}/episode/{e}?player_id={player_id}",
  "/player/tv/{imdb}/{s}/{e}",
  "/tv/{imdb}/season/{s}/episode/{e}",
  "/player/tv/{tmdb}/{s}/{e}?player_id={player_id}",
  "/tv/{tmdb}/season/{s}/episode/{e}?player_id={player_id}",
  "/player/tv/{tmdb}/{s}/{e}",
  "/tv/{tmdb}/season/{s}/episode/{e}",
  "/watch/{tmdb}?season={s}&episode={e}&player_id={player_id}",
  "/watch/{imdb}?season={s}&episode={e}&player_id={player_id}"
];

// LocalStorage key
const TV_PATTERN_KEY = "pepsi_saved_series_pattern_v3";

// DOM
const player = document.getElementById("player");
const playerStatus = document.getElementById("playerStatus");
const patternInfo = document.getElementById("patternInfo");
const seriesError = document.getElementById("seriesError");

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");

const popularRow = document.getElementById("popularRow");
const topRatedRow = document.getElementById("topRatedRow");
const actionRow = document.getElementById("actionRow");
const horrorRow = document.getElementById("horrorRow");
const comedyRow = document.getElementById("comedyRow");
const seriesRow = document.getElementById("seriesRow");

const tabMovies = document.getElementById("tabMovies");
const tabSeries = document.getElementById("tabSeries");
const moviesView = document.getElementById("moviesView");
const seriesView = document.getElementById("seriesView");

const seriesPanel = document.getElementById("seriesPanel");
const closeSeriesPanel = document.getElementById("closeSeriesPanel");
const seriesTitle = document.getElementById("seriesTitle");
const seriesOverview = document.getElementById("seriesOverview");
const seasonSelect = document.getElementById("seasonSelect");
const episodeSelect = document.getElementById("episodeSelect");
const playEpisodeBtn = document.getElementById("playEpisodeBtn");
const episodeList = document.getElementById("episodeList");

// STATE
let currentTmdbId = null;
let currentImdbId = null;
let currentSeasons = [];
let currentEpisodes = [];
let trying = false;

// INIT
document.addEventListener("DOMContentLoaded", () => {
  wireUI();
  loadInitialRows();
  const saved = localStorage.getItem(TV_PATTERN_KEY);
  if (saved) patternInfo.textContent = `Saved pattern: ${saved}`;
});

// UI wiring
function wireUI() {
  tabMovies.addEventListener("click", () => {
    tabMovies.classList.add("active");
    tabSeries.classList.remove("active");
    moviesView.style.display = "";
    seriesView.style.display = "none";
    seriesPanel.style.display = "none";
  });
  tabSeries.addEventListener("click", () => {
    tabSeries.classList.add("active");
    tabMovies.classList.remove("active");
    moviesView.style.display = "none";
    seriesView.style.display = "";
    seriesPanel.style.display = "none";
  });

  searchBtn.addEventListener("click", () => {
    const q = searchInput.value.trim();
    if (!q) return;
    searchAll(q);
  });
  searchInput.addEventListener("keydown", (e) => { if (e.key === "Enter") searchBtn.click(); });

  closeSeriesPanel.addEventListener("click", () => { seriesPanel.style.display = "none"; });

  playEpisodeBtn.addEventListener("click", async () => {
    if (trying) return;
    const seasonRaw = seasonSelect.value;
    const episodeRaw = episodeSelect.value;
    await detectAndPlay({ seasonRaw, episodeRaw });
  });
}

// Load initial rows
async function loadInitialRows() {
  loadPopularMovies();
  loadTopRatedMovies();
  loadGenreMovies(28, actionRow);
  loadGenreMovies(27, horrorRow);
  loadGenreMovies(35, comedyRow);
  loadPopularSeries();
}

// Fetch helper
async function fetchJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("fetchJson error", err, url);
    return null;
  }
}

// Loaders
async function loadPopularMovies() {
  const data = await fetchJson(`${TMDB_BASE}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`);
  renderRow(data?.results || [], popularRow, false);
}
async function loadTopRatedMovies() {
  const data = await fetchJson(`${TMDB_BASE}/movie/top_rated?api_key=${TMDB_API_KEY}&language=en-US&page=1`);
  renderRow(data?.results || [], topRatedRow, false);
}
async function loadGenreMovies(genreId, container) {
  const data = await fetchJson(`${TMDB_BASE}/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&with_genres=${genreId}&page=1`);
  renderRow(data?.results || [], container, false);
}
async function loadPopularSeries() {
  const data = await fetchJson(`${TMDB_BASE}/tv/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`);
  renderRow(data?.results || [], seriesRow, true);
}

// Search
async function searchAll(query) {
  const searchSection = document.getElementById("searchSection");
  const searchRow = document.getElementById("searchRow");
  searchSection.style.display = "block";
  searchRow.innerHTML = `<p>Searching for "${escapeHtml(query)}"…</p>`;
  const [movies, tv] = await Promise.all([
    fetchJson(`${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1&include_adult=false`),
    fetchJson(`${TMDB_BASE}/search/tv?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1&include_adult=false`)
  ]);
  const movieResults = (movies?.results || []).map(m => ({ ...m, _isTv: false }));
  const tvResults = (tv?.results || []).map(t => ({ ...t, _isTv: true }));
  const combined = [...movieResults, ...tvResults];
  renderRow(combined, searchRow, null);
  tabMovies.classList.add("active");
  tabSeries.classList.remove("active");
  moviesView.style.display = "";
  seriesView.style.display = "none";
  searchSection.scrollIntoView({ behavior: "smooth" });
}

// Render rows
function renderRow(items, container, isTvFlag) {
  container.innerHTML = "";
  if (!items || items.length === 0) { container.innerHTML = "<p>No items.</p>"; return; }
  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "movie-card";
    const posterPath = item.poster_path || item.backdrop_path || "";
    const poster = posterPath ? `${TMDB_IMG}${posterPath}` : "https://via.placeholder.com/300x450?text=No+Image";
    const title = item.title || item.name || "Untitled";
    const year = (item.release_date || item.first_air_date || "N/A").slice(0,4);
    const rating = item.vote_average ? item.vote_average.toFixed(1) : "N/A";
    card.innerHTML = `<img src="${poster}" alt="${escapeHtml(title)}"><div class="movie-info"><div class="movie-title">${escapeHtml(title)}</div><div class="movie-meta">${year} • ⭐ ${rating}</div></div>`;
    card.addEventListener("click", () => {
      const tmdbId = item.id;
      const tvFlag = (typeof isTvFlag === "boolean") ? isTvFlag : !!item._isTv;
      if (tvFlag) {
        openSeriesPanel(tmdbId);
        tabSeries.classList.add("active");
        tabMovies.classList.remove("active");
        moviesView.style.display = "none";
        seriesView.style.display = "";
      } else {
        const embedUrl = `${HOSTS[0]}/movie/${tmdbId}`;
        setPlayerSrc(embedUrl);
      }
    });
    container.appendChild(card);
  });
}

// Open series panel: fetch details + external ids (IMDb)
async function openSeriesPanel(tvId) {
  seriesError.style.display = "none";
  episodeList.innerHTML = "";
  seasonSelect.innerHTML = "";
  episodeSelect.innerHTML = "";
  seriesPanel.style.display = "block";
  currentTmdbId = tvId;
  currentImdbId = null;

  const [details, external] = await Promise.all([
    fetchJson(`${TMDB_BASE}/tv/${tvId}?api_key=${TMDB_API_KEY}&language=en-US`),
    fetchJson(`${TMDB_BASE}/tv/${tvId}/external_ids?api_key=${TMDB_API_KEY}`)
  ]);

  if (!details) {
    showSeriesError("Failed to load series details.");
    return;
  }

  seriesTitle.textContent = details.name || details.original_name || "Series";
  seriesOverview.textContent = details.overview || "";

  if (external && external.imdb_id) {
    currentImdbId = external.imdb_id; // e.g., tt0903747
    patternInfo.textContent = `IMDb id: ${currentImdbId}`;
  } else {
    currentImdbId = null;
    patternInfo.textContent = `No IMDb id found; will try TMDB patterns.`;
  }

  currentSeasons = (details.seasons || []).filter(s => typeof s.season_number === "number");
  currentSeasons.sort((a,b) => a.season_number - b.season_number);
  seasonSelect.innerHTML = "";
  currentSeasons.forEach(s => {
    const opt = document.createElement("option");
    opt.value = String(Number(s.season_number));
    opt.textContent = `Season ${s.season_number}${s.name ? ` - ${s.name}` : ""}`;
    seasonSelect.appendChild(opt);
  });

  if (currentSeasons.length === 0) {
    showSeriesError("No seasons available for this series.");
    return;
  }

  await loadSeasonEpisodes(tvId, currentSeasons[0].season_number);
}

// Load episodes
async function loadSeasonEpisodes(tvId, seasonNumber) {
  seriesError.style.display = "none";
  episodeList.innerHTML = "<p>Loading episodes…</p>";
  episodeSelect.innerHTML = "";

  const seasonNum = normalizeNumber(seasonNumber);
  if (seasonNum === null) { episodeList.innerHTML = ""; return; }

  const data = await fetchJson(`${TMDB_BASE}/tv/${tvId}/season/${seasonNum}?api_key=${TMDB_API_KEY}&language=en-US`);
  if (!data) {
    showSeriesError("Failed to load season data.");
    episodeList.innerHTML = "";
    return;
  }

  currentEpisodes = data.episodes || [];
  episodeList.innerHTML = "";
  episodeSelect.innerHTML = "";

  if (!currentEpisodes.length) {
    episodeList.innerHTML = "<p>No episodes found for this season.</p>";
    return;
  }

  currentEpisodes.forEach(ep => {
    const epNum = Number(ep.episode_number);
    const opt = document.createElement("option");
    opt.value = String(epNum);
    opt.textContent = `${epNum}. ${ep.name || `Episode ${epNum}`}`;
    episodeSelect.appendChild(opt);

    const item = document.createElement("div");
    item.className = "episode-item";
    item.innerHTML = `<strong>${epNum}. ${escapeHtml(ep.name || `Episode ${epNum}`)}</strong><div class="muted">${escapeHtml(ep.overview || "")}</div>`;
    item.addEventListener("click", () => {
      seasonSelect.value = String(seasonNum);
      episodeSelect.value = String(epNum);
      // preview only
      const preview = currentImdbId ? `${HOSTS[0]}/tv/${currentImdbId}/season/${seasonNum}/episode/${epNum}` : `${HOSTS[0]}/tv/${tvId}/season/${seasonNum}/episode/${epNum}`;
      setPlayerSrc(preview);
      playerStatus.textContent = "Preview set — press Play to auto-detect and save.";
    });
    episodeList.appendChild(item);
  });

  episodeSelect.selectedIndex = 0;
  episodeList.scrollTop = 0;
}

// Normalize season/episode input (accepts S01, Season 1, 01, 1, 0)
function normalizeNumber(val) {
  if (val === undefined || val === null) return null;
  const raw = String(val).trim();
  const m = raw.match(/(\d+)/);
  if (!m) return null;
  let digits = m[1].replace(/^0+(?=\d)/, "");
  if (digits === "") digits = "0";
  const n = Number(digits);
  if (!Number.isInteger(n) || n < 0 || n > 9999) return null;
  return String(n);
}

// Main detection: tries saved pattern first, then host+path combos
async function detectAndPlay({ seasonRaw, episodeRaw }) {
  trying = true;
  seriesError.style.display = "none";
  playerStatus.textContent = "Resolving player pattern…";

  const s = normalizeNumber(seasonRaw);
  const e = normalizeNumber(episodeRaw);
  if (s === null) { showSeriesError("Invalid season. Use Season 1, S01, 1 or 0."); trying = false; return; }
  if (e === null) { showSeriesError("Invalid episode. Use Episode 1, 01 or 1."); trying = false; return; }

  // saved pattern (string with placeholders)
  const saved = localStorage.getItem(TV_PATTERN_KEY);
  if (saved) {
    const url = buildFromPatternString(saved, { imdb: currentImdbId, tmdb: currentTmdbId, s, e });
    setPlayerSrc(url);
    patternInfo.textContent = `Using saved pattern: ${saved}`;
    trying = false;
    return;
  }

  // try host + path patterns
  for (const host of HOSTS) {
    for (const pathPattern of PATH_PATTERNS) {
      // skip imdb patterns if no imdb id
      if (pathPattern.includes("{imdb}") && !currentImdbId) continue;
      // skip tmdb patterns if no tmdb id
      if (pathPattern.includes("{tmdb}") && !currentTmdbId) continue;
      const url = buildUrl(host, pathPattern, { imdb: currentImdbId, tmdb: currentTmdbId, s, e });
      setPlayerSrc(url);
      playerStatus.textContent = `Trying ${host}${pathPattern}`;
      const ok = await waitForIframeLoadOrDetect(3000);
      if (ok) {
        // save the pattern string (host + path with placeholders)
        const savedPattern = host + pathPattern;
        localStorage.setItem(TV_PATTERN_KEY, savedPattern);
        patternInfo.textContent = `Saved working pattern: ${savedPattern}`;
        playerStatus.textContent = `Pattern matched and saved.`;
        trying = false;
        return;
      }
    }
  }

  // nothing matched
  const fallback = `${HOSTS[0]}/tv/${currentTmdbId || currentImdbId}/season/${s}/episode/${e}`;
  setPlayerSrc(fallback);
  showSeriesError(`Auto-detection failed. iframe src: ${player.src}`);
  playerStatus.textContent = "Auto-detection failed — copy iframe src and paste it here.";
  trying = false;
}

// Build URL from host + path pattern
function buildUrl(host, pathPattern, { imdb, tmdb, s, e }) {
  const player_id = generatePlayerId();
  let path = pathPattern.replace(/{imdb}/g, imdb || "").replace(/{tmdb}/g, tmdb || "").replace(/{s}/g, s || "").replace(/{e}/g, e || "").replace(/{player_id}/g, player_id);
  if (!path.startsWith("/")) path = "/" + path;
  let url = host + path;
  if (/\/player\/tv\/[^\/]+\/\d+\/\d+/.test(url) && !/player_id=/.test(url)) {
    url += (url.includes("?") ? "&" : "?") + "player_id=" + player_id;
  }
  return url;
}

// Build from saved pattern string (host + path placeholders)
function buildFromPatternString(patternString, { imdb, tmdb, s, e }) {
  const player_id = generatePlayerId();
  let url = patternString.replace(/{imdb}/g, imdb || "").replace(/{tmdb}/g, tmdb || "").replace(/{s}/g, s || "").replace(/{e}/g, e || "").replace(/{player_id}/g, player_id);
  if (!/^https?:\/\//i.test(url)) {
    // if saved pattern was only a path, prefix first host
    if (url.startsWith("/")) url = HOSTS[0] + url;
    else url = HOSTS[0] + "/" + url;
  }
  if (/\/player\/tv\/[^\/]+\/\d+\/\d+/.test(url) && !/player_id=/.test(url)) {
    url += (url.includes("?") ? "&" : "?") + "player_id=" + player_id;
  }
  return url;
}

// Wait for iframe load or cross-origin detection
function waitForIframeLoadOrDetect(timeoutMs = 2500) {
  return new Promise(resolve => {
    let resolved = false;
    const onLoad = () => {
      if (resolved) return;
      try {
        const doc = player.contentDocument || player.contentWindow.document;
        const title = (doc && doc.title) ? doc.title.toLowerCase() : "";
        if (title.includes("404") || title.includes("not found") || title.includes("page not found")) {
          resolved = true; resolve(false);
        } else { resolved = true; resolve(true); }
      } catch (err) {
        // cross-origin -> treat as success
        resolved = true; resolve(true);
      }
    };
    const onError = () => { if (resolved) return; resolved = true; resolve(false); };

    player.addEventListener("load", onLoad, { once: true });
    player.addEventListener("error", onError, { once: true });

    setTimeout(() => {
      if (resolved) return;
      try {
        const doc = player.contentDocument || player.contentWindow.document;
        const title = (doc && doc.title) ? doc.title.toLowerCase() : "";
        if (title.includes("404") || title.includes("not found") || title.includes("page not found")) {
          resolved = true; resolve(false);
        } else { resolved = true; resolve(true); }
      } catch (err) {
        resolved = true; resolve(true);
      }
    }, timeoutMs);
  });
}

// Generate 16-char alphanumeric player_id
function generatePlayerId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 16; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
  return id;
}

// Set iframe src safely
function setPlayerSrc(url) {
  try { player.src = url; } catch (e) { console.error("setPlayerSrc error", e); }
}

// Show error
function showSeriesError(msg) {
  seriesError.textContent = msg;
  seriesError.style.display = "block";
}

// Escape HTML
function escapeHtml(s) { return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

// Expose openSeriesPanel for compatibility
window.openSeriesPanel = openSeriesPanel;
