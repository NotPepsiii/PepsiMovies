const TMDB_API_KEY = "35ee82bcad013e6a6237a0a087d7eb32";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p/w500";
const YT_EMBED = "https://www.youtube.com/embed/";

const LS_PROFILE = "pm_profile";
const LS_CONTINUE = "pm_continue_";
const LS_LIST = "pm_list_";
const LS_HERO = "pm_hero_movie";

let currentProfile = localStorage.getItem(LS_PROFILE) || "";
let currentHeroMovie = null;
let currentModalMovie = null;
let trailerCache = new Map();
let rowsLoaded = false;

const dom = {
  profileScreen: document.getElementById("profileScreen"),
  app: document.getElementById("app"),
  profileName: document.getElementById("profileName"),

  player: document.getElementById("player"),
  playerStatus: document.getElementById("playerStatus"),
  heroTitle: document.getElementById("heroTitle"),
  heroOverview: document.getElementById("heroOverview"),
  heroPlayBtn: document.getElementById("heroPlayBtn"),
  heroListBtn: document.getElementById("heroListBtn"),
  heroDetailsBtn: document.getElementById("heroDetailsBtn"),

  searchInput: document.getElementById("searchInput"),
  searchBtn: document.getElementById("searchBtn"),
  myListNavBtn: document.getElementById("myListNavBtn"),

  searchSection: document.getElementById("searchSection"),
  searchRow: document.getElementById("searchRow"),
  continueRow: document.getElementById("continueRow"),
  myListRow: document.getElementById("myListRow"),
  popularRow: document.getElementById("popularRow"),
  topRatedRow: document.getElementById("topRatedRow"),
  actionRow: document.getElementById("actionRow"),
  horrorRow: document.getElementById("horrorRow"),
  comedyRow: document.getElementById("comedyRow"),

  modal: document.getElementById("detailsModal"),
  modalPoster: document.getElementById("modalPoster"),
  modalTitle: document.getElementById("modalTitle"),
  modalMeta: document.getElementById("modalMeta"),
  modalOverview: document.getElementById("modalOverview"),
  modalPlayBtn: document.getElementById("modalPlayBtn"),
  modalListBtn: document.getElementById("modalListBtn"),
  closeModalBtn: document.getElementById("closeModalBtn")
};

document.addEventListener("DOMContentLoaded", () => {
  wireUI();

  if (currentProfile) {
    showApp();
    boot();
  } else {
    showProfileScreen();
  }
});

window.selectProfile = function selectProfile(name) {
  currentProfile = name;
  localStorage.setItem(LS_PROFILE, name);
  showApp();
  boot();
};

function wireUI() {
  dom.searchBtn.addEventListener("click", () => {
    const q = dom.searchInput.value.trim();
    if (!q) return;
    searchMovies(q);
  });

  dom.searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") dom.searchBtn.click();
  });

  dom.myListNavBtn.addEventListener("click", () => {
    document.getElementById("myListSection").scrollIntoView({ behavior: "smooth" });
  });

  dom.heroPlayBtn.addEventListener("click", () => {
    if (currentHeroMovie) playTrailer(currentHeroMovie);
  });

  dom.heroListBtn.addEventListener("click", () => {
    if (currentHeroMovie) toggleMyList(currentHeroMovie);
  });

  dom.heroDetailsBtn.addEventListener("click", () => {
    if (currentHeroMovie) openModal(currentHeroMovie);
  });

  dom.modalPlayBtn.addEventListener("click", () => {
    if (currentModalMovie) playTrailer(currentModalMovie);
  });

  dom.modalListBtn.addEventListener("click", () => {
    if (currentModalMovie) toggleMyList(currentModalMovie);
  });

  dom.closeModalBtn.addEventListener("click", closeModal);

  dom.modal.addEventListener("click", (e) => {
    if (e.target === dom.modal) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
}

function showProfileScreen() {
  dom.profileScreen.style.display = "grid";
  dom.app.style.display = "none";
}

function showApp() {
  dom.profileScreen.style.display = "none";
  dom.app.style.display = "block";
  dom.profileName.textContent = currentProfile;
}

async function boot() {
  if (!rowsLoaded) {
    rowsLoaded = true;
    await loadAllRows();
  }

  loadContinue();
  loadMyList();

  if (!currentHeroMovie) {
    const savedHero = safeParse(localStorage.getItem(LS_HERO));
    if (savedHero?.id) {
      setHeroMovie(savedHero, false);
    }
  }

  if (!currentHeroMovie) {
    const popular = await fetchMovies("/movie/popular");
    if (popular.length) setHeroMovie(popular[0], true);
  }
}

async function fetchJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(err);
    return null;
  }
}

function tmdb(path) {
  const joiner = path.includes("?") ? "&" : "?";
  return `${TMDB_BASE}${path}${joiner}api_key=${TMDB_API_KEY}&language=en-US`;
}

async function fetchMovies(path) {
  const data = await fetchJson(tmdb(path));
  return data?.results || [];
}

async function loadAllRows() {
  const [popular, topRated, action, horror, comedy] = await Promise.all([
    fetchMovies("/movie/popular?page=1"),
    fetchMovies("/movie/top_rated?page=1"),
    fetchMovies("/discover/movie?with_genres=28&page=1"),
    fetchMovies("/discover/movie?with_genres=27&page=1"),
    fetchMovies("/discover/movie?with_genres=35&page=1")
  ]);

  renderRow(popular, dom.popularRow);
  renderRow(topRated, dom.topRatedRow);
  renderRow(action, dom.actionRow);
  renderRow(horror, dom.horrorRow);
  renderRow(comedy, dom.comedyRow);
}

async function searchMovies(query) {
  const data = await fetchJson(
    tmdb(`/search/movie?query=${encodeURIComponent(query)}&page=1&include_adult=false`)
  );

  const items = data?.results || [];
  dom.searchSection.style.display = "block";
  renderRow(items, dom.searchRow, { searchMode: true });

  dom.searchSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderRow(items, container, options = {}) {
  container.innerHTML = "";

  if (!items || items.length === 0) {
    container.innerHTML = `<p class="empty-state">${options.emptyText || "No results."}</p>`;
    return;
  }

  const list = items.slice(0, 20);
  const myListIds = getMyListIds();

  list.forEach((movie) => {
    const card = document.createElement("article");
    card.className = "card";

    const posterPath = movie.poster_path || movie.backdrop_path;
    const poster = posterPath ? `${TMDB_IMG}${posterPath}` : "https://via.placeholder.com/500x750?text=No+Image";

    const title = movie.title || movie.name || "Untitled";
    const year = (movie.release_date || movie.first_air_date || "").slice(0, 4) || "N/A";
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "N/A";

    const inList = myListIds.includes(movie.id);

    card.innerHTML = `
      <button class="card-fav ${inList ? "active" : ""}" aria-label="Toggle My List">${inList ? "♥" : "+"}</button>
      <img src="${poster}" alt="${escapeHtml(title)}">
      <div class="card-info">
        <div class="card-title">${escapeHtml(title)}</div>
        <div class="card-meta">${year} • ⭐ ${rating}</div>
      </div>
    `;

    card.querySelector(".card-fav").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMyList(movie);
      loadMyList();
      renderVisibleRows();
    });

    card.addEventListener("click", () => {
      openMovie(movie);
    });

    card.addEventListener("mouseenter", () => {
      if (window.matchMedia("(pointer:fine)").matches) {
        scheduleHeroPreview(movie, false);
      }
    });

    container.appendChild(card);
  });
}

function renderVisibleRows() {
  const sections = [
    [dom.searchRow, dom.searchSection],
    [dom.continueRow, document.getElementById("continueSection")],
    [dom.myListRow, document.getElementById("myListSection")]
  ];

  sections.forEach(([row]) => {
    if (row === dom.myListRow) loadMyList();
    if (row === dom.continueRow) loadContinue();
  });
}

async function openMovie(movie) {
  setHeroMovie(movie, true);
  saveContinue(movie);
  openModal(movie);
  await playTrailer(movie);
}

function setHeroMovie(movie, save = true) {
  currentHeroMovie = movie;
  dom.heroTitle.textContent = movie.title || "Untitled";
  dom.heroOverview.textContent = movie.overview || "No description available.";

  if (save) {
    localStorage.setItem(LS_HERO, JSON.stringify(movie));
  }

  updateHeroListButton();
  scheduleHeroPreview(movie, true);
}

function scheduleHeroPreview(movie, play = true) {
  if (!movie?.id) return;
  if (!play) {
    return;
  }
  playTrailer(movie);
}

async function playTrailer(movie) {
  const trailer = await getTrailer(movie.id);
  if (trailer) {
    dom.player.src = `${YT_EMBED}${trailer}?autoplay=1&mute=1&rel=0&modestbranding=1`;
    dom.playerStatus.textContent = "Playing trailer";
  } else {
    dom.player.removeAttribute("src");
    dom.playerStatus.textContent = "Trailer not available";
  }
}

async function getTrailer(movieId) {
  if (trailerCache.has(movieId)) return trailerCache.get(movieId);

  const data = await fetchJson(tmdb(`/movie/${movieId}/videos`));
  const videos = data?.results || [];
  const preferred =
    videos.find(v => v.site === "YouTube" && v.type === "Trailer") ||
    videos.find(v => v.site === "YouTube" && v.type === "Teaser") ||
    videos.find(v => v.site === "YouTube");

  const key = preferred?.key || null;
  trailerCache.set(movieId, key);
  return key;
}

function openModal(movie) {
  currentModalMovie = movie;

  const poster = movie.poster_path || movie.backdrop_path
    ? `${TMDB_IMG}${movie.poster_path || movie.backdrop_path}`
    : "https://via.placeholder.com/500x750?text=No+Image";

  dom.modalPoster.src = poster;
  dom.modalPoster.alt = movie.title || "Movie poster";
  dom.modalTitle.textContent = movie.title || "Untitled";
  dom.modalMeta.textContent = buildMeta(movie);
  dom.modalOverview.textContent = movie.overview || "No overview available.";

  updateModalListButton();
  dom.modal.style.display = "grid";
}

function closeModal() {
  dom.modal.style.display = "none";
  currentModalMovie = null;
}

function buildMeta(movie) {
  const parts = [];
  const year = (movie.release_date || "").slice(0, 4);
  if (year) parts.push(year);
  if (typeof movie.vote_average === "number") parts.push(`⭐ ${movie.vote_average.toFixed(1)}`);
  if (movie.runtime) parts.push(`${movie.runtime} min`);
  return parts.join(" • ");
}

function getContinueKey() {
  return LS_CONTINUE + currentProfile;
}

function getListKey() {
  return LS_LIST + currentProfile;
}

function readList(key) {
  return safeParse(localStorage.getItem(key), []);
}

function getContinue() {
  return readList(getContinueKey());
}

function getMyList() {
  return readList(getListKey());
}

function getMyListIds() {
  return getMyList().map(m => m.id);
}

function saveContinue(movie) {
  if (!currentProfile) return;
  let list = getContinue().filter(m => m.id !== movie.id);
  list.unshift(compactMovie(movie));
  list = list.slice(0, 12);
  localStorage.setItem(getContinueKey(), JSON.stringify(list));
  loadContinue();
}

function toggleMyList(movie) {
  if (!currentProfile) return;
  let list = getMyList();
  const exists = list.some(m => m.id === movie.id);

  if (exists) {
    list = list.filter(m => m.id !== movie.id);
  } else {
    list.unshift(compactMovie(movie));
  }

  localStorage.setItem(getListKey(), JSON.stringify(list.slice(0, 20)));
  updateHeroListButton();
  updateModalListButton();
}

function loadContinue() {
  const list = getContinue();
  renderRow(list, dom.continueRow, { emptyText: "Nothing here yet." });
}

function loadMyList() {
  const list = getMyList();
  renderRow(list, dom.myListRow, { emptyText: "Add movies to your list." });
}

function compactMovie(movie) {
  return {
    id: movie.id,
    title: movie.title,
    overview: movie.overview,
    poster_path: movie.poster_path,
    backdrop_path: movie.backdrop_path,
    release_date: movie.release_date,
    vote_average: movie.vote_average
  };
}

function updateHeroListButton() {
  if (!currentHeroMovie) return;
  const exists = getMyListIds().includes(currentHeroMovie.id);
  dom.heroListBtn.textContent = exists ? "✓ In My List" : "+ My List";
}

function updateModalListButton() {
  if (!currentModalMovie) return;
  const exists = getMyListIds().includes(currentModalMovie.id);
  dom.modalListBtn.textContent = exists ? "✓ In My List" : "+ My List";
}

function safeParse(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
