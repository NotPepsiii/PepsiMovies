// ---------------------------
// CONFIG
// ---------------------------
const TMDB_API_KEY = "35ee82bcad013e6a6237a0a087d7eb32";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p/w300";
const EMBED_BASE = "https://embedmaster.link"; // confirmed working domain for movies

// ---------------------------
// DOM
// ---------------------------
const player = document.getElementById("player");

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
const episodeList = document.getElementById("episodeList");

// Try buttons (delegated)
const tryButtonsSelector = ".try-btn";

// ---------------------------
// INIT
// ---------------------------
document.addEventListener("DOMContentLoaded", () => {
  loadPopularMovies();
  loadTopRatedMovies();
  loadGenreMovies(28, actionRow);   // Action
  loadGenreMovies(27, horrorRow);   // Horror
  loadGenreMovies(35, comedyRow);   // Comedy
  loadPopularSeries();

  // delegate try button clicks inside series panel
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.matches && t.matches(tryButtonsSelector)) {
      handleTryPattern(t.getAttribute("data-pattern"));
    }
  });
});

// ---------------------------
// Tabs
// ---------------------------
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

// ---------------------------
// SEARCH
// ---------------------------
searchBtn.addEventListener("click", () => {
  const q = searchInput.value.trim();
  if (!q) return;
  searchAll(q);
});
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchBtn.click();
});

// ---------------------------
// FETCH HELPERS
// ---------------------------
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

// ---------------------------
// LOADERS
// ---------------------------
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

// ---------------------------
// SEARCH (movies + tv)
// ---------------------------
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
  renderRow(combined, searchRow, null); // mixed
  tabMovies.classList.add("active");
  tabSeries.classList.remove("active");
  moviesView.style.display = "";
  seriesView.style.display = "none";
  searchSection.scrollIntoView({ behavior: "smooth" });
}

// ---------------------------
// RENDER
// ---------------------------
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

    // click handler: determine movie vs tv
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
        player.src = embedUrl;
        if (window.innerWidth < 900) document.querySelector(".player-section").scrollIntoView({ behavior: "smooth" });
      }
    });

    container.appendChild(card);
  });
}

// ---------------------------
// SERIES PANEL / SEASONS / EPISODES
// ---------------------------
let currentSeriesId = null;
let currentSeasons = [];
let currentEpisodes = [];

async function openSeriesPanel(tvId) {
  seriesError.style.display = "none";
  episodeList.innerHTML = "";
  seasonSelect.innerHTML = "";
  episodeSelect.innerHTML = "";
  seriesPanel.style.display = "block";
  currentSeriesId = tvId;

  const details = await fetchJson(`${TMDB_BASE}/tv/${tvId}?api_key=${TMDB_API_KEY}&language=en-US`);
  if (!details) {
    seriesError.textContent = "Failed to load series details.";
    seriesError.style.display = "block";
    return;
  }

  seriesTitle.textContent = details.name || details.original_name || "Series";
  seriesOverview.textContent = details.overview || "";

  currentSeasons = (details.seasons || []).filter(s => typeof s.season_number === "number");
  currentSeasons.sort((a,b) => a.season_number - b.season_number);
  seasonSelect.innerHTML = "";
  currentSeasons.forEach(s => {
    const opt = document.createElement("option");
    opt.value = String(s.season_number);
    opt.textContent = `Season ${s.season_number} ${s.name ? `- ${s.name}` : ""}`;
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

episodeSelect.addEventListener("change", () => {});

playEpisodeBtn.addEventListener("click", () => {
  const seasonVal = seasonSelect.value;
  const episodeVal = episodeSelect.value;
  const seasonNum = normalizeSeason(seasonVal);
  const episodeNum = normalizeEpisode(episodeVal);
  if (seasonNum === null || episodeNum === null) return;

  // default pattern we try first
  const embedUrl = `${EMBED_BASE}/tv/${currentSeriesId}/season/${seasonNum}/episode/${episodeNum}`;
  player.src = embedUrl;
  if (window.innerWidth < 900) document.querySelector(".player-section").scrollIntoView({ behavior: "smooth" });
});

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
    const epNum = ep.episode_number;
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
      const embedUrl = `${EMBED_BASE}/tv/${tvId}/season/${seasonNum}/episode/${epNum}`;
      player.src = embedUrl;
      if (window.innerWidth < 900) document.querySelector(".player-section").scrollIntoView({ behavior: "smooth" });
    });
    episodeList.appendChild(item);
  });

  episodeSelect.selectedIndex = 0;
  episodeList.scrollTop = 0;
}

// ---------------------------
// TRY EMBED PATTERN HANDLER
// ---------------------------
// When user clicks a Try button, we substitute placeholders and set iframe src.
// This lets the user test which pattern actually loads in their browser.
function handleTryPattern(pattern) {
  if (!currentSeriesId) {
    seriesError.textContent = "No series selected.";
    seriesError.style.display = "block";
    return;
  }

  // choose season/episode values to test: prefer selected, else first available
  const seasonVal = seasonSelect.value || (currentSeasons[0] && String(currentSeasons[0].season_number)) || "1";
  const episodeVal = episodeSelect.value || (currentEpisodes[0] && String(currentEpisodes[0].episode_number)) || "1";

  const replacements = {
    "{id}": String(currentSeriesId),
    "{s}": String(seasonVal),
    "{e}": String(episodeVal)
  };

  let url = pattern;
  Object.keys(replacements).forEach(k => {
    url = url.replace(new RegExp(k, "g"), replacements[k]);
  });

  // if pattern starts with slash, prefix embed base
  if (url.startsWith("/")) url = EMBED_BASE + url;

  // set iframe src so user can see whether it loads
  seriesError.style.display = "none";
  player.src = url;

  // show a small hint to user
  seriesError.textContent = `Testing: ${url}`;
  seriesError.style.display = "block";
  setTimeout(() => {
    seriesError.style.display = "none";
  }, 4000);
}

// ---------------------------
// VALIDATION / NORMALIZATION
// ---------------------------
function normalizeSeason(val) {
  if (val === undefined || val === null) {
    showSeriesError("Season is required.");
    return null;
  }
  const s = String(val).trim();
  if (!/^\d+$/.test(s)) {
    showSeriesError("Invalid season (must be numeric).");
    return null;
  }
  if (s.length > 1 && s.startsWith("0")) {
    showSeriesError("Invalid season (no leading zeros).");
    return null;
  }
  const n = Number(s);
  if (n < 0 || n > 9999) {
    showSeriesError("Invalid season (must be 0-9999).");
    return null;
  }
  seriesError.style.display = "none";
  return String(n);
}

function normalizeEpisode(val) {
  if (val === undefined || val === null) {
    showSeriesError("Episode is required.");
    return null;
  }
  const s = String(val).trim();
  if (!/^\d+$/.test(s)) {
    showSeriesError("Invalid episode (must be numeric).");
    return null;
  }
  if (s.length > 1 && s.startsWith("0")) {
    showSeriesError("Invalid episode (no leading zeros).");
    return null;
  }
  const n = Number(s);
  if (n < 0 || n > 9999) {
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

// ---------------------------
// UTIL
// ---------------------------
function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
