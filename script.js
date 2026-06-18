// 🔑 Your TMDB API key
const TMDB_API_KEY = "35ee82bcad013e6a6237a0a087d7eb32";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p/w300";

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

// Load everything on start
document.addEventListener("DOMContentLoaded", () => {
  loadPopularMovies();
  loadTopRatedMovies();
  loadGenreMovies(28, actionRow);   // Action
  loadGenreMovies(27, horrorRow);   // Horror
  loadGenreMovies(35, comedyRow);   // Comedy
  loadPopularSeries();
});

searchBtn.addEventListener("click", () => {
  const query = searchInput.value.trim();
  if (!query) return;
  searchAll(query);
});

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchBtn.click();
});

// ---- Movies ----

function loadPopularMovies() {
  fetch(`${TMDB_BASE}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`)
    .then(res => res.json())
    .then(data => renderRow(data.results, popularRow, false))
    .catch(err => console.error("Popular movies error:", err));
}

function loadTopRatedMovies() {
  fetch(`${TMDB_BASE}/movie/top_rated?api_key=${TMDB_API_KEY}&language=en-US&page=1`)
    .then(res => res.json())
    .then(data => renderRow(data.results, topRatedRow, false))
    .catch(err => console.error("Top rated error:", err));
}

function loadGenreMovies(genreId, container) {
  fetch(`${TMDB_BASE}/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&with_genres=${genreId}&page=1`)
    .then(res => res.json())
    .then(data => renderRow(data.results, container, false))
    .catch(err => console.error("Genre error:", err));
}

// ---- TV Series ----

function loadPopularSeries() {
  fetch(`${TMDB_BASE}/tv/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`)
    .then(res => res.json())
    .then(data => renderRow(data.results, seriesRow, true))
    .catch(err => console.error("Series error:", err));
}

// ---- Search ----

function searchAll(query) {
  Promise.all([
    fetch(`${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1&include_adult=false`).then(r => r.json()),
    fetch(`${TMDB_BASE}/search/tv?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1&include_adult=false`).then(r => r.json())
  ])
    .then(([movieData, tvData]) => {
      searchRow.innerHTML = "";
      const combined = [
        ...(movieData.results || []).map(m => ({ ...m, _isTv: false })),
        ...(tvData.results || []).map(t => ({ ...t, _isTv: true }))
      ];
      if (combined.length === 0) {
        searchRow.innerHTML = "<p>No results.</p>";
      } else {
        renderRow(combined, searchRow, null); // mixed
      }
      searchSection.style.display = "block";
      searchSection.scrollIntoView({ behavior: "smooth" });
    })
    .catch(err => console.error("Search error:", err));
}

// ---- Render ----

function renderRow(items, container, isTv) {
  container.innerHTML = "";

  if (!items || items.length === 0) {
    container.innerHTML = "<p>No items.</p>";
    return;
  }

  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "movie-card";

    const posterPath = item.poster_path || item.backdrop_path;
    const poster = posterPath
      ? `${TMDB_IMG}${posterPath}`
      : "https://via.placeholder.com/300x450?text=No+Image";

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
      const tvFlag = typeof isTv === "boolean" ? isTv : !!item._isTv;

      // Movies vs TV series
      const embedUrl = tvFlag
        ? `https://embedmaster.link/tv/${tmdbId}`
        : `https://embedmaster.link/movie/${tmdbId}`;

      player.src = embedUrl;
    });

    container.appendChild(card);
  });
}

// ---- Utils ----

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
