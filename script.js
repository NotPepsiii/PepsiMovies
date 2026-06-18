const TMDB_API_KEY = "35ee82bcad013e6a6237a0a087d7eb32";

const moviesContainer = document.getElementById("movies");
const player = document.getElementById("player");
const sectionTitle = document.getElementById("sectionTitle");

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p/w300";

/* INIT */
document.addEventListener("DOMContentLoaded", () => {
  loadPopularMovies();

  loadCategory(28, "actionRow");  // Action
  loadCategory(35, "comedyRow");  // Comedy
  loadCategory(18, "dramaRow");   // Drama
  loadCategory(27, "horrorRow");  // Horror
});

/* SEARCH */
searchBtn.addEventListener("click", () => {
  const query = searchInput.value.trim();
  if (!query) return;
  searchMovies(query);
});

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchBtn.click();
});

/* POPULAR */
function loadPopularMovies() {
  sectionTitle.textContent = "Popular Movies";

  fetch(`${TMDB_BASE}/movie/popular?api_key=${TMDB_API_KEY}`)
    .then(res => res.json())
    .then(data => renderMovies(data.results, moviesContainer))
    .catch(console.error);
}

/* SEARCH */
function searchMovies(query) {
  sectionTitle.textContent = `Search: ${query}`;

  fetch(`${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`)
    .then(res => res.json())
    .then(data => renderMovies(data.results, moviesContainer))
    .catch(console.error);
}

/* CATEGORY LOADER */
function loadCategory(genreId, elementId) {
  fetch(`${TMDB_BASE}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreId}`)
    .then(res => res.json())
    .then(data => renderMovies(data.results, document.getElementById(elementId)))
    .catch(console.error);
}

/* RENDER */
function renderMovies(movies, container) {
  container.innerHTML = "";

  if (!movies) return;

  movies.forEach(movie => {
    const card = document.createElement("div");
    card.className = "movie-card";

    const poster = movie.poster_path
      ? `${TMDB_IMG}${movie.poster_path}`
      : "https://via.placeholder.com/300x450?text=No+Image";

    card.innerHTML = `
      <img src="${poster}" alt="${escapeHtml(movie.title)}">
      <div class="movie-info">
        <div class="movie-title">${escapeHtml(movie.title)}</div>
      </div>
    `;

    card.addEventListener("click", () => {
      player.src = `https://embedmaster.link/movie/${movie.id}`;
    });

    container.appendChild(card);
  });
}

/* SAFE TEXT */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
