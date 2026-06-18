const TMDB_API_KEY = "35ee82bcad013e6a6237a0a087d7eb32";

const moviesContainer = document.getElementById("movies");
const player = document.getElementById("player");
const sectionTitle = document.getElementById("sectionTitle");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");

const infoBtn = document.getElementById("infoBtn");
const infoModal = document.getElementById("infoModal");
const closeModal = document.getElementById("closeModal");

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p/w300";

document.addEventListener("DOMContentLoaded", () => {
  loadPopularMovies();
});

searchBtn.addEventListener("click", () => {
  const query = searchInput.value.trim();
  if (!query) return;
  searchMovies(query);
});

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchBtn.click();
});

/* INFO MODAL */
infoBtn.addEventListener("click", () => {
  infoModal.classList.remove("hidden");
});

closeModal.addEventListener("click", () => {
  infoModal.classList.add("hidden");
});

/* MOVIES */
function loadPopularMovies() {
  sectionTitle.textContent = "Popular Movies";

  fetch(`${TMDB_BASE}/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=1`)
    .then(res => res.json())
    .then(data => renderMovies(data.results))
    .catch(err => console.error(err));
}

function searchMovies(query) {
  sectionTitle.textContent = `Search: ${query}`;

  fetch(`${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1&include_adult=false`)
    .then(res => res.json())
    .then(data => renderMovies(data.results))
    .catch(err => console.error(err));
}

function renderMovies(movies) {
  moviesContainer.innerHTML = "";

  if (!movies || movies.length === 0) {
    moviesContainer.innerHTML = "<p>No movies found.</p>";
    return;
  }

  movies.forEach(movie => {
    const card = document.createElement("div");
    card.className = "movie-card";

    const poster = movie.poster_path
      ? `${TMDB_IMG}${movie.poster_path}`
      : "https://via.placeholder.com/300x450?text=No+Image";

    card.innerHTML = `
      <img src="${poster}">
      <div class="movie-info">
        <div class="movie-title">${escapeHtml(movie.title)}</div>
        <div class="movie-meta">
          ${movie.release_date ? movie.release_date.slice(0, 4) : "N/A"}
          • ⭐ ${movie.vote_average?.toFixed(1) ?? "N/A"}
        </div>
      </div>
    `;

    card.addEventListener("click", () => {
      const tmdbId = movie.id;
      const embedUrl = `https://embedmaster.link/movie/${tmdbId}`;
      player.src = embedUrl;
    });

    moviesContainer.appendChild(card);
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
