// script.js - Replace your existing file with this

// CONFIG
const TMDB_API_KEY = "35ee82bcad013e6a6237a0a087d7eb32";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p/w300";

// Embed host that worked for movies
const EMBED_BASE = "https://embedmaster.link";

// LocalStorage key for saved TV pattern
const TV_PATTERN_KEY = "pepsi_tv_embed_pattern";

// Fallback TMDB patterns (used only if IMDb pattern fails)
const FALLBACK_PATTERNS = [
  "/player/tv/{id}/{s}/{e}?player_id={player_id}",
  "/tv/{id}/season/{s}/episode/{e}?player_id={player_id}",
  "/watch/{id}?season={s}&episode={e}&player_id={player_id}"
];

// DOM
const player = document.getElementById("player");
const playerStatus = document.getElementById("playerStatus");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const searchSection = document.getElementById("searchSection");
const searchRow = document.getElementById("searchRow");

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
const seriesError = document.getElementById("seriesError");
const patternInfo = document.getElementById("patternInfo");
const episodeList = document.getElementById("episodeList");

// STATE
let currentSeriesId = null;   // TMDB id
let currentImdbId = null;     // IMDb id like "tt0903747"
let currentSeasons = [];
let currentEpisodes = [];
let trying = false;

// INIT
document.addEventListener("DOMContentLoaded", () => {
  loadPopularMovies();
  loadTopRatedMovies();
  loadGenreMovies(28, actionRow);
  loadGenreMovies(27, horrorRow);
  loadGenreMovies(35, comedyRow);
  loadPopularSeries();

  const saved = localStorage.getItem(TV_PATTERN_KEY);
  if (saved) patternInfo.textContent = `Saved series pattern: ${saved}`;
});

// TABS
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

// SEARCH
searchBtn.addEventListener("click", () => {
  const q = searchInput.value.trim();
  if (!q) return;
  searchAll(q);
});
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchBtn.click();
});

// FETCH helper
async function fetchJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("Fetch error:", err, url);
    return null;
  }
}

// LOADERS
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

// SEARCH (movies + tv)
async function searchAll(query) {
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

// RENDER
function renderRow(items, container, isTvFlag) {
  container.innerHTML = "";
  if (!items || items.length === 0) {
    container.innerHTML = "<p>No items.</p>";
    return;
  }

  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "movie-card";

    const posterPath = item.poster_path || item.backdrop_path || "";
    const poster = posterPath ? `${TMDB_IMG}${posterPath}` : "https://via.placeholder.com/300x450?text=No+Image";

    const title = item.title || item.name || "Untitled";
    const year = (item.release_date || item.first_air_date || "N/A").slice(0, 4);
    const rating = item.vote_average ? item.vote_average.toFixed(1) : "N/A";

    card.innerHTML = `
      <img src="${poster}" alt="${escapeHtml(title)}">
      <div class="movie-info">
        <div class="movie-title">${escapeHtml(title)}</div>
        <div class="movie-meta">${year} • ⭐ ${rating}</div>
      </div>
    `;

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
        const embedUrl = `${EMBED_BASE}/movie/${tmdbId}`;
        setPlayerSrc(embedUrl);
        playerStatus.textContent = `Playing movie ${tmdbId}`;
        if (window.innerWidth < 900) document.querySelector(".player-section").scrollIntoView({ behavior: "smooth" });
      }
    });

    container.appendChild(card);
  });
}

// SERIES PANEL
async function openSeriesPanel(tvId) {
  seriesError.style.display = "none";
  episodeList.innerHTML = "";
  seasonSelect.innerHTML = "";
  episodeSelect.innerHTML = "";
  seriesPanel.style.display = "block";
  currentSeriesId = tvId;
  currentImdbId = null;

  // fetch details and external ids (to get imdb_id)
  const [details, external] = await Promise.all([
    fetchJson(`${TMDB_BASE}/tv/${tvId}?api_key=${TMDB_API_KEY}&language=en-US`),
    fetchJson(`${TMDB_BASE}/tv/${tvId}/external_ids?api_key=${TMDB_API_KEY}`)
  ]);

  if (!details) {
    seriesError.textContent = "Failed to load series details.";
    seriesError.style.display = "block";
    return;
  }

  seriesTitle.textContent = details.name || details.original_name || "Series";
  seriesOverview.textContent = details.overview || "";

  // store imdb id if available
  if (external && external.imdb_id) {
    currentImdbId = external.imdb_id; // e.g., "tt0903747"
    patternInfo.textContent = `Using IMDb id: ${currentImdbId}`;
  } else {
    currentImdbId = null;
    patternInfo.textContent = `No IMDb id found; will try TMDB-based patterns.`;
  }

  currentSeasons = (details.seasons || []).filter(s => typeof s.season_number === "number");
  currentSeasons.sort((a,b) => a.season_number - b.season_number);
  seasonSelect.innerHTML = "";
  currentSeasons.forEach(s => {
    // ensure option value is numeric string
    const opt = document.createElement("option");
    opt.value = String(Number(s.season_number));
    opt.textContent = `Season ${s.season_number}${s.name ? ` - ${s.name}` : ""}`;
    seasonSelect.appendChild(opt);
  });

  if (currentSeasons.length === 0) {
    seriesError.textContent = "No seasons available for this series.";
    seriesError.style.display = "block";
    return;
  }

  const firstSeason = currentSeasons[0].season_number;
  await loadSeasonEpisodes(tvId, firstSeason);
}

closeSeriesPanel.addEventListener("click", () => {
  seriesPanel.style.display = "none";
});

seasonSelect.addEventListener("change", async () => {
  const seasonVal = seasonSelect.value;
  const seasonNum = normalizeSeason(seasonVal);
  if (seasonNum === null) return;
  await loadSeasonEpisodes(currentSeriesId, seasonNum);
});

// PLAY: try IMDb-based pattern first, then fallbacks
playEpisodeBtn.addEventListener("click", async () => {
  if (trying) return;
  const seasonVal = seasonSelect.value;
  const episodeVal = episodeSelect.value;
  const seasonNum = normalizeSeason(seasonVal);
  const episodeNum = normalizeEpisode(episodeVal);
  if (seasonNum === null || episodeNum === null) return;

  playerStatus.textContent = "Resolving series player pattern…";
  trying = true;

  // If user previously saved a working pattern, use it immediately
  const savedPattern = localStorage.getItem(TV_PATTERN_KEY);
  if (savedPattern) {
    const url = buildUrlFromPattern(savedPattern, { id: currentSeriesId, imdb: currentImdbId, s: seasonNum, e: episodeNum });
    setPlayerSrc(url);
    patternInfo.textContent = `Using saved pattern: ${savedPattern}`;
    trying = false;
    return;
  }

  // 1) Try IMDb-based pattern if we have an IMDb id
  if (currentImdbId) {
    const playerId = generatePlayerId();
    const imdbUrl = `${EMBED_BASE}/player/tv/${currentImdbId}/${seasonNum}/${episodeNum}?player_id=${playerId}`;
    playerStatus.textContent = `Trying IMDb-based pattern with ${currentImdbId}…`;
    setPlayerSrc(imdbUrl);
    const ok = await waitForIframeLoadOrDetect(imdbUrl, 3000);
    if (ok) {
      // save pattern string so future plays use it
      const saved = "/player/tv/{imdb}/{s}/{e}?player_id={player_id}";
      localStorage.setItem(TV_PATTERN_KEY, saved);
      patternInfo.textContent = `Saved series pattern (IMDb): ${saved}`;
      playerStatus.textContent = `Pattern matched (IMDb).`;
      trying = false;
      return;
    }
  }

  // 2) Try TMDB fallback patterns
  for (const pattern of FALLBACK_PATTERNS) {
    const url = buildUrlFromPattern(pattern, { id: currentSeriesId, imdb: currentImdbId, s: seasonNum, e: episodeNum });
    playerStatus.textContent = `Trying fallback pattern: ${pattern}`;
    setPlayerSrc(url);
    const ok = await waitForIframeLoadOrDetect(url, 2500);
    if (ok) {
      localStorage.setItem(TV_PATTERN_KEY, pattern);
      patternInfo.textContent = `Saved series pattern: ${pattern}`;
      playerStatus.textContent = `Pattern matched (fallback).`;
      trying = false;
      return;
    }
  }

  // 3) final fallback: set a reasonable URL and show debug info
  const fallbackUrl = `${EMBED_BASE}/tv/${currentSeriesId}/season/${seasonNum}/episode/${episodeNum}`;
  setPlayerSrc(fallbackUrl);
  playerStatus.textContent = `Auto-detection failed; fallback set.`;
  seriesError.style.display = "block";
  seriesError.textContent = `Auto-detection failed. iframe src: ${player.src}`;
  trying = false;
});

// load episodes for a season
async function loadSeasonEpisodes(tvId, seasonNumber) {
  seriesError.style.display = "none";
  episodeList.innerHTML = "<p>Loading episodes…</p>";
  episodeSelect.innerHTML = "";

  const seasonNum = normalizeSeason(seasonNumber);
  if (seasonNum === null) {
    episodeList.innerHTML = "";
    return;
  }

  const data = await fetchJson(`${TMDB_BASE}/tv/${tvId}/season/${seasonNum}?api_key=${TMDB_API_KEY}&language=en-US`);
  if (!data) {
    seriesError.textContent = "Failed to load season data.";
    seriesError.style.display = "block";
    episodeList.innerHTML = "";
    return;
  }

  currentEpisodes = data.episodes || [];
  episodeList.innerHTML = "";

  if (!currentEpisodes.length) {
    episodeList.innerHTML = "<p>No episodes found for this season.</p>";
    return;
  }

  episodeSelect.innerHTML = "";
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
      // preview: set iframe to IMDb-based if available, else TMDB preview
      if (currentImdbId) {
        const preview = `${EMBED_BASE}/tv/${currentImdbId}/season/${seasonNum}/episode/${epNum}`;
        setPlayerSrc(preview);
        playerStatus.textContent = `Preview set for IMDb id ${currentImdbId}. Press Play to auto-detect and save.`;
      } else {
        const preview = `${EMBED_BASE}/tv/${tvId}/season/${seasonNum}/episode/${epNum}`;
        setPlayerSrc(preview);
        playerStatus.textContent = `Preview set. Press Play to auto-detect and save.`;
      }
      if (window.innerWidth < 900) document.querySelector(".player-section").scrollIntoView({ behavior: "smooth" });
    });
    episodeList.appendChild(item);
  });

  episodeSelect.selectedIndex = 0;
  episodeList.scrollTop = 0;
}

// Set iframe src and update status
function setPlayerSrc(url) {
  try {
    player.src = url;
  } catch (e) {
    console.error("Failed to set iframe src", e);
  }
}

// Build URL from pattern and placeholders. Supports {id}, {imdb}, {s}, {e}, {player_id}
function buildUrlFromPattern(pattern, { id, imdb, s, e }) {
  const playerId = generatePlayerId();
  let url = pattern.replace(/{id}/g, String(id || "")).replace(/{imdb}/g, String(imdb || "")).replace(/{s}/g, String(s || "")).replace(/{e}/g, String(e || "")).replace(/{player_id}/g, playerId);
  if (url.startsWith("/")) url = EMBED_BASE + url;
  if (!/^https?:\/\//i.test(url) && !url.startsWith(EMBED_BASE)) {
    url = EMBED_BASE + (url.startsWith("/") ? url : "/" + url);
  }
  // ensure /player/tv/... has player_id
  if (/\/player\/tv\/[^\/]+\/\d+\/\d+/.test(url) && !/player_id=/.test(url)) {
    const sep = url.includes("?") ? "&" : "?";
    url = `${url}${sep}player_id=${playerId}`;
  }
  return url;
}

// Wait for iframe load or detect cross-origin access as success
function waitForIframeLoadOrDetect(testUrl, timeoutMs = 2500) {
  return new Promise(resolve => {
    let resolved = false;
    const onLoad = () => {
      if (resolved) return;
      try {
        const doc = player.contentDocument || player.contentWindow.document;
        const title = (doc && doc.title) ? doc.title.toLowerCase() : "";
        if (title.includes("404") || title.includes("page not found") || title.includes("not found")) {
          resolved = true;
          resolve(false);
        } else {
          resolved = true;
          resolve(true);
        }
      } catch (err) {
        // Cross-origin access error — usually indicates a real player page (not our 404), treat as success
        resolved = true;
        resolve(true);
      }
    };

    const onError = () => {
      if (resolved) return;
      resolved = true;
      resolve(false);
    };

    player.addEventListener("load", onLoad, { once: true });
    player.addEventListener("error", onError, { once: true });

    setTimeout(() => {
      if (resolved) return;
      try {
        const doc = player.contentDocument || player.contentWindow.document;
        const title = (doc && doc.title) ? doc.title.toLowerCase() : "";
        if (title.includes("404") || title.includes("page not found") || title.includes("not found")) {
          resolved = true;
          resolve(false);
        } else {
          resolved = true;
          resolve(true);
        }
      } catch (err) {
        resolved = true;
        resolve(true);
      }
    }, timeoutMs);
  });
}

// Generate a valid 16-character alphanumeric player_id
function generatePlayerId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 16; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
  return id;
}

// -----------------
// Robust validators
// -----------------

// Accepts numeric strings, "Season 1", "S01", "01", "0", numbers.
// Returns normalized string number (no leading zeros except "0"), or null on invalid.
function normalizeSeason(val) {
  if (val === undefined || val === null) {
    showSeriesError("Season is required.");
    return null;
  }
  const sRaw = String(val).trim();

  // Extract first number sequence from the string
  const m = sRaw.match(/(\d+)/);
  if (!m) {
    showSeriesError("Invalid season (no numeric value found).");
    return null;
  }
  let s = m[1]; // digits only

  // Remove leading zeros unless the number is exactly "0"
  if (s.length > 1 && s.startsWith("0")) {
    s = s.replace(/^0+/, "");
    if (s === "") s = "0";
  }

  // Convert and validate range
  const n = Number(s);
  if (!Number.isInteger(n) || n < 0 || n > 9999) {
    showSeriesError("Invalid season (must be 0-9999).");
    return null;
  }

  seriesError.style.display = "none";
  return String(n);
}

// Similar robust episode parser
function normalizeEpisode(val) {
  if (val === undefined || val === null) {
    showSeriesError("Episode is required.");
    return null;
  }
  const sRaw = String(val).trim();
  const m = sRaw.match(/(\d+)/);
  if (!m) {
    showSeriesError("Invalid episode (no numeric value found).");
    return null;
  }
  let s = m[1];
  if (s.length > 1 && s.startsWith("0")) {
    s = s.replace(/^0+/, "");
    if (s === "") s = "0";
  }
  const n = Number(s);
  if (!Number.isInteger(n) || n < 0 || n > 9999) {
    showSeriesError("Invalid episode (must be 0-9999).");
    return null;
  }
  seriesError.style.display = "none";
  return String(n);
}

function showSeriesError(msg) {
  seriesError.textContent = msg;
  seriesError.style.display = "block";
}

// UTIL
function escapeHtml(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
